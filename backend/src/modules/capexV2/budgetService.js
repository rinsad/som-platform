const { createHash } = require('crypto');
const { HttpError } = require('./http');
const { databaseUserId } = require('./audit');
const { normalizeMoney, toMills, fromMills } = require('./money');
const { canAccessOrganization } = require('./access');

async function listBudgetCycles(client, context) {
  const orgIds = context.isAdmin || context.scopes.some((scope) => scope.type === 'PORTFOLIO')
    ? null
    : context.scopes.filter((scope) => scope.organizationUnitId).map((scope) => scope.organizationUnitId);
  const { rows } = await client.query(
      `SELECT c.id, c.fiscal_year AS "fiscalYear", c.currency, c.status,
            c.source_system AS "sourceSystem", c.board_approval_reference AS "boardApprovalReference",
            c.board_approved_at AS "boardApprovedAt",
            COALESCE((
              SELECT SUM(original_entry.amount)
                FROM capex_v2.budget_ledger_entries original_entry
                JOIN capex_v2.budget_allocations original_allocation ON original_allocation.id=original_entry.allocation_id
                JOIN capex_v2.budget_versions original_version ON original_version.id=original_allocation.budget_version_id
               WHERE original_entry.budget_cycle_id=c.id AND original_version.version_number=1
                 AND original_entry.entry_type='BASELINE'
                 AND ($1::uuid[] IS NULL OR original_allocation.organization_unit_id=ANY($1::uuid[]))
            ),0)::text AS "originalBudget",
            COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')), 0)::text AS "authorizedBudget",
            COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('COMMITMENT','COMMITMENT_REVERSAL')), 0)::text AS commitments,
            COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('ACTUAL','ACTUAL_REVERSAL')), 0)::text AS actuals,
            COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type='FORECAST'), 0)::text AS forecast,
            (COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')), 0)
             - COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type='FORECAST'), 0))::text AS variance,
            COUNT(DISTINCT a.id)::int AS "allocationCount"
       FROM capex_v2.budget_cycles c
       LEFT JOIN capex_v2.budget_versions v ON v.budget_cycle_id = c.id AND v.status = 'POSTED'
       LEFT JOIN capex_v2.budget_allocations a ON a.budget_version_id = v.id
         AND ($1::uuid[] IS NULL OR a.organization_unit_id = ANY($1::uuid[]))
       LEFT JOIN capex_v2.budget_ledger_entries l ON l.budget_cycle_id = c.id
         AND (l.allocation_id = a.id OR (a.id IS NULL AND $1::uuid[] IS NULL))
      GROUP BY c.id
      ORDER BY c.fiscal_year DESC`,
    [orgIds]
  );
  return rows;
}

async function createBudgetCycle(client, payload, user) {
  const year = Number(payload.fiscalYear);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new HttpError(400, 'INVALID_FISCAL_YEAR', 'A valid fiscal year is required');
  }
  if (!payload.boardApprovalReference?.trim() || !payload.boardApprovedAt) {
    throw new HttpError(400, 'BOARD_APPROVAL_REQUIRED', 'Board approval reference and approval date are required');
  }
  const { rows: [row] } = await client.query(
    `INSERT INTO capex_v2.budget_cycles
       (fiscal_year, currency, status, source_system, board_approval_reference,
        board_approved_at, created_by)
     VALUES ($1,'OMR','DRAFT','SAC',$2,$3::date,$4)
     RETURNING id, fiscal_year AS "fiscalYear", currency, status,
               board_approval_reference AS "boardApprovalReference", board_approved_at AS "boardApprovedAt"`,
    [year, payload.boardApprovalReference.trim(), payload.boardApprovedAt, databaseUserId(user)]
  );
  return row;
}

function importContentHash(rows) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

async function createImportBatch(client, payload, user) {
  if (!payload.budgetCycleId || !Array.isArray(payload.rows) || payload.rows.length === 0) {
    throw new HttpError(400, 'INVALID_IMPORT', 'Budget cycle and at least one import row are required');
  }
  const importType = payload.importType || 'APPROVED_BUDGET';
  const sourceSystem = payload.sourceSystem || (importType === 'APPROVED_BUDGET' ? 'SAC' : 'GSAP');

  await client.query('BEGIN');
  try {
    const { rows: [batch] } = await client.query(
      `INSERT INTO capex_v2.budget_import_batches
         (budget_cycle_id, source_system, import_type, source_reference,
          original_filename, original_content, content_sha256, row_count, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, status, row_count AS "rowCount", created_at AS "createdAt"`,
      [
        payload.budgetCycleId,
        sourceSystem,
        importType,
        payload.sourceReference || null,
        payload.originalFilename || null,
        payload.originalContent || null,
        importContentHash(payload.rows),
        payload.rows.length,
        databaseUserId(user),
      ]
    );

    for (let index = 0; index < payload.rows.length; index += 1) {
      const source = payload.rows[index] || {};
      let amount = null;
      try { amount = normalizeMoney(source.amount); } catch { /* validation records the error later */ }
      await client.query(
        `INSERT INTO capex_v2.budget_import_rows
           (batch_id, row_number, organization_code, cost_centre_code,
            external_project_reference, description, amount, currency, source_date, raw_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10::jsonb)`,
        [
          batch.id,
          index + 1,
          source.business_function || source.businessFunction
            || source.business_function_name || source.businessFunctionName
            || source.business_function_code || source.businessFunctionCode
            || source.organization_code || source.organizationCode || null,
          null,
          source.external_project_reference || source.externalProjectReference || null,
          source.description || null,
          amount,
          source.currency || 'OMR',
          source.source_date || source.sourceDate || null,
          JSON.stringify(source),
        ]
      );
    }
    await client.query('COMMIT');
    return batch;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function validateImportBatch(client, batchId, user) {
  await client.query('BEGIN');
  try {
    const { rows: [batch] } = await client.query(
      `SELECT * FROM capex_v2.budget_import_batches WHERE id = $1 FOR UPDATE`,
      [batchId]
    );
    if (!batch) throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import batch not found');
    if (batch.status === 'POSTED') throw new HttpError(409, 'IMPORT_ALREADY_POSTED', 'Posted imports cannot be revalidated');

    const { rows } = await client.query(
      `SELECT * FROM capex_v2.budget_import_rows WHERE batch_id = $1 ORDER BY row_number`,
      [batchId]
    );
    let valid = 0;
    let invalid = 0;
    let controlTotal = 0n;

    for (const row of rows) {
      const errors = [];
      if (row.currency !== 'OMR') errors.push('Currency must be OMR');
      if (row.amount === null) errors.push('Amount must have at most 3 decimal places');
      else {
        try {
          const mills = toMills(row.amount);
          if (batch.import_type === 'APPROVED_BUDGET' && mills <= 0n) errors.push('Approved budget amount must be greater than zero');
          if (!errors.length) controlTotal += mills;
        } catch (error) {
          errors.push(error.message);
        }
      }

      if (batch.import_type === 'APPROVED_BUDGET') {
        if (!row.organization_code) errors.push('Business / Function name is required');
        if (!row.description) errors.push('Description is required');
        if (row.organization_code) {
          const { rowCount } = await client.query(
            `SELECT 1 FROM capex_v2.organization_units
              WHERE (LOWER(name) = LOWER($1) OR UPPER(code) = UPPER($1))
                AND is_active = TRUE
                AND effective_from <= CURRENT_DATE
                AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`,
            [row.organization_code.trim()]
          );
          if (!rowCount) errors.push(`Unknown or inactive Business / Function '${row.organization_code}'`);
          else if (rowCount > 1) errors.push(`Business / Function '${row.organization_code}' is ambiguous in master data`);
        }
      } else if (!row.external_project_reference) {
        errors.push('External project reference is required for GSAP financial imports');
      }

      const status = errors.length ? 'INVALID' : 'VALID';
      if (errors.length) invalid += 1;
      else valid += 1;
      await client.query(
        `UPDATE capex_v2.budget_import_rows
            SET validation_status = $2, validation_errors = $3::jsonb
          WHERE id = $1`,
        [row.id, status, JSON.stringify(errors)]
      );
    }

    const status = invalid ? 'REJECTED' : 'VALIDATED';
    const { rows: [updated] } = await client.query(
      `UPDATE capex_v2.budget_import_batches
          SET status = $2, valid_row_count = $3, invalid_row_count = $4,
              control_total = $5, validation_summary = $6::jsonb,
              validated_by = $7, validated_at = NOW()
        WHERE id = $1
        RETURNING id, status, row_count AS "rowCount", valid_row_count AS "validRowCount",
                  invalid_row_count AS "invalidRowCount", control_total::text AS "controlTotal",
                  validation_summary AS "validationSummary"`,
      [
        batchId,
        status,
        valid,
        invalid,
        fromMills(controlTotal),
        JSON.stringify({ validRows: valid, invalidRows: invalid }),
        databaseUserId(user),
      ]
    );
    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function postImportBatch(client, batchId, user) {
  await client.query('BEGIN');
  try {
    const { rows: [batch] } = await client.query(
      `SELECT * FROM capex_v2.budget_import_batches WHERE id = $1 FOR UPDATE`,
      [batchId]
    );
    if (!batch) throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import batch not found');
    if (batch.status !== 'VALIDATED') {
      throw new HttpError(409, 'IMPORT_NOT_VALIDATED', 'Only a fully validated import can be posted');
    }
    const { rows: [cycle] } = await client.query(
      `SELECT board_approval_reference, board_approved_at
         FROM capex_v2.budget_cycles WHERE id=$1 FOR UPDATE`,
      [batch.budget_cycle_id]
    );
    if (!cycle?.board_approval_reference || !cycle?.board_approved_at) {
      throw new HttpError(409, 'BOARD_APPROVAL_REQUIRED', 'Approved baseline posting requires Board approval evidence');
    }
    const { rows } = await client.query(
      `SELECT * FROM capex_v2.budget_import_rows
        WHERE batch_id = $1 AND validation_status = 'VALID' ORDER BY row_number`,
      [batchId]
    );
    const actorId = databaseUserId(user);

    if (batch.import_type === 'APPROVED_BUDGET') {
      const { rows: [versionNumber] } = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next
           FROM capex_v2.budget_versions WHERE budget_cycle_id = $1`,
        [batch.budget_cycle_id]
      );
      const type = Number(versionNumber.next) === 1 ? 'BASELINE' : 'CORRECTION';
      if (type === 'CORRECTION') {
        await client.query(
          `UPDATE capex_v2.budget_versions SET status = 'SUPERSEDED'
            WHERE budget_cycle_id = $1 AND status = 'POSTED'`,
          [batch.budget_cycle_id]
        );
        await client.query(
          `UPDATE capex_v2.budget_allocations SET status='FROZEN'
            WHERE budget_version_id IN (
              SELECT id FROM capex_v2.budget_versions
               WHERE budget_cycle_id=$1 AND status='SUPERSEDED'
            )`,
          [batch.budget_cycle_id]
        );
      }
      const { rows: [version] } = await client.query(
        `INSERT INTO capex_v2.budget_versions
           (budget_cycle_id, import_batch_id, version_number, version_type, status,
            source_reference, posted_by, posted_at)
         VALUES ($1,$2,$3,$4,'POSTED',$5,$6,NOW()) RETURNING id`,
        [batch.budget_cycle_id, batch.id, versionNumber.next, type, batch.source_reference, actorId]
      );

      for (const row of rows) {
        const { rows: [refs] } = await client.query(
          `SELECT o.id AS organization_unit_id
             FROM capex_v2.organization_units o
            WHERE (LOWER(o.name) = LOWER($1) OR UPPER(o.code) = UPPER($1))
              AND o.is_active = TRUE
              AND o.effective_from <= CURRENT_DATE
              AND (o.effective_to IS NULL OR o.effective_to >= CURRENT_DATE)
            LIMIT 1`,
          [row.organization_code.trim()]
        );
        const { rows: [allocation] } = await client.query(
          `INSERT INTO capex_v2.budget_allocations
             (budget_version_id, organization_unit_id, cost_centre_id, external_reference, description)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [version.id, refs.organization_unit_id, null, row.external_project_reference, row.description]
        );
        await client.query(
          `INSERT INTO capex_v2.budget_ledger_entries
             (budget_cycle_id, allocation_id, import_batch_id, entry_type, amount,
              effective_date, external_reference, description, created_by)
           VALUES ($1,$2,$3,'BASELINE',$4,COALESCE($5::date,CURRENT_DATE),$6,$7,$8)`,
          [
            batch.budget_cycle_id,
            allocation.id,
            batch.id,
            row.amount,
            row.source_date,
            row.external_project_reference,
            row.description,
            actorId,
          ]
        );
      }
      await client.query(
        `UPDATE capex_v2.budget_cycles
            SET status = 'OPEN', updated_at = NOW()
          WHERE id = $1 AND status = 'DRAFT'`,
        [batch.budget_cycle_id]
      );
    } else {
      const entryTypes = {
        PO_COMMITMENT: 'COMMITMENT',
        ACTUAL: 'ACTUAL',
        AUC: 'AUC',
        ASSET: 'CAPITALIZED',
      };
      for (const row of rows) {
        const { rows: [allocation] } = await client.query(
          `SELECT a.id
             FROM capex_v2.budget_allocations a
             JOIN capex_v2.budget_versions v ON v.id = a.budget_version_id
            WHERE v.budget_cycle_id = $1 AND v.status = 'POSTED'
              AND a.external_reference = $2
            LIMIT 1`,
          [batch.budget_cycle_id, row.external_project_reference]
        );
        await client.query(
          `INSERT INTO capex_v2.budget_ledger_entries
             (budget_cycle_id, allocation_id, import_batch_id, entry_type, amount,
              effective_date, external_reference, description, created_by)
           VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7,$8,$9)`,
          [
            batch.budget_cycle_id,
            allocation?.id || null,
            batch.id,
            entryTypes[batch.import_type],
            row.amount,
            row.source_date,
            row.external_project_reference,
            row.description,
            actorId,
          ]
        );
      }
    }

    const { rows: [posted] } = await client.query(
      `UPDATE capex_v2.budget_import_batches
          SET status = 'POSTED', posted_by = $2, posted_at = NOW()
        WHERE id = $1
        RETURNING id, status, control_total::text AS "controlTotal", posted_at AS "postedAt"`,
      [batchId, actorId]
    );
    await client.query('COMMIT');
    return posted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function listAllocations(client, cycleId, context) {
  const orgIds = context.isAdmin || context.scopes.some((scope) => scope.type === 'PORTFOLIO')
    ? null
    : context.scopes.filter((scope) => scope.organizationUnitId).map((scope) => scope.organizationUnitId);
  const { rows } = await client.query(
    `SELECT a.id, a.organization_unit_id AS "organizationUnitId", o.code AS "organizationCode",
            o.name AS "organizationName", a.cost_centre_id AS "costCentreId", c.code AS "costCentreCode",
            c.name AS "costCentreName", a.external_reference AS "externalReference", a.description, a.status,
            COALESCE((
              SELECT SUM(original_entry.amount)
                FROM capex_v2.budget_ledger_entries original_entry
                JOIN capex_v2.budget_allocations original_allocation ON original_allocation.id=original_entry.allocation_id
                JOIN capex_v2.budget_versions original_version ON original_version.id=original_allocation.budget_version_id
               WHERE original_version.budget_cycle_id=$1 AND original_version.version_number=1
                 AND original_entry.entry_type='BASELINE'
                 AND original_allocation.organization_unit_id=a.organization_unit_id
                 AND (
                   (a.external_reference IS NOT NULL AND original_allocation.external_reference=a.external_reference)
                   OR (
                     a.external_reference IS NULL AND original_allocation.external_reference IS NULL
                     AND original_allocation.cost_centre_id IS NOT DISTINCT FROM a.cost_centre_id
                     AND original_allocation.description=a.description
                   )
                 )
            ),0)::text AS "originalBudget",
            COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)::text AS "authorizedBudget",
            COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('COMMITMENT','COMMITMENT_REVERSAL')),0)::text AS commitments,
            COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('ACTUAL','ACTUAL_REVERSAL')),0)::text AS actuals,
            COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type='FORECAST'),0)::text AS forecast,
            (COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)
             - COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type='FORECAST'),0))::text AS variance,
            (COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)
             - COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('COMMITMENT','COMMITMENT_REVERSAL','ACTUAL','ACTUAL_REVERSAL')),0))::text AS available
       FROM capex_v2.budget_allocations a
       JOIN capex_v2.budget_versions v ON v.id = a.budget_version_id AND v.status = 'POSTED'
       JOIN capex_v2.organization_units o ON o.id = a.organization_unit_id
       LEFT JOIN capex_v2.cost_centres c ON c.id = a.cost_centre_id
       LEFT JOIN capex_v2.budget_ledger_entries l ON l.allocation_id = a.id
      WHERE v.budget_cycle_id = $1
        AND ($2::uuid[] IS NULL OR a.organization_unit_id = ANY($2::uuid[]))
      GROUP BY a.id, o.id, c.id
      ORDER BY o.name, c.code NULLS FIRST, a.description`,
    [cycleId, orgIds]
  );
  return rows;
}

async function listImportBatches(client, cycleId) {
  const { rows } = await client.query(
    `SELECT id, budget_cycle_id AS "budgetCycleId", source_system AS "sourceSystem",
            import_type AS "importType", source_reference AS "sourceReference",
            original_filename AS "originalFilename", status, row_count AS "rowCount",
            valid_row_count AS "validRowCount", invalid_row_count AS "invalidRowCount",
            control_total::text AS "controlTotal", validation_summary AS "validationSummary",
            created_at AS "createdAt", validated_at AS "validatedAt", posted_at AS "postedAt"
       FROM capex_v2.budget_import_batches
      WHERE ($1::uuid IS NULL OR budget_cycle_id=$1)
      ORDER BY created_at DESC`,
    [cycleId || null]
  );
  return rows;
}

async function getImportBatchDetail(client, batchId) {
  const { rows: [batch] } = await client.query(
    `SELECT id, budget_cycle_id AS "budgetCycleId", source_system AS "sourceSystem",
            import_type AS "importType", source_reference AS "sourceReference",
            original_filename AS "originalFilename", (original_content IS NOT NULL) AS "hasOriginalFile",
            status, row_count AS "rowCount", valid_row_count AS "validRowCount",
            invalid_row_count AS "invalidRowCount", control_total::text AS "controlTotal",
            validation_summary AS "validationSummary", created_at AS "createdAt",
            validated_at AS "validatedAt", posted_at AS "postedAt"
       FROM capex_v2.budget_import_batches
      WHERE id = $1`,
    [batchId]
  );
  if (!batch) throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import batch not found');

  const { rows } = await client.query(
    `SELECT id, row_number AS "rowNumber", organization_code AS "businessFunction",
            external_project_reference AS "externalProjectReference",
            description, amount::text, currency, source_date AS "sourceDate",
            raw_payload AS "rawPayload", validation_status AS "validationStatus",
            validation_errors AS "validationErrors"
       FROM capex_v2.budget_import_rows
      WHERE batch_id = $1
      ORDER BY row_number`,
    [batchId]
  );
  return { ...batch, rows };
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function serializeImportRows(rows) {
  const header = [
    'business_function',
    'external_project_reference',
    'description',
    'amount',
    'currency',
    'source_date',
  ];
  const data = rows.map((row) => [
    row.organization_code,
    row.external_project_reference,
    row.description,
    row.amount,
    row.currency,
    row.source_date,
  ]);
  return Buffer.from([header, ...data].map((values) => values.map(csvCell).join(',')).join('\r\n'), 'utf8');
}

async function getImportBatchDownload(client, batchId) {
  const { rows: [batch] } = await client.query(
    `SELECT original_filename, original_content
       FROM capex_v2.budget_import_batches
      WHERE id = $1`,
    [batchId]
  );
  if (!batch) throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import batch not found');
  if (batch.original_content) {
    return {
      filename: batch.original_filename || `capex-import-${batchId}.csv`,
      content: batch.original_content,
      mode: 'original',
    };
  }
  const { rows } = await client.query(
    `SELECT organization_code, external_project_reference,
            description, amount::text AS amount, currency, source_date
       FROM capex_v2.budget_import_rows
      WHERE batch_id = $1
      ORDER BY row_number`,
    [batchId]
  );
  return {
    filename: batch.original_filename || `capex-import-${batchId}.csv`,
    content: serializeImportRows(rows),
    mode: 'reconstructed',
  };
}

async function listTransfers(client, cycleId, context) {
  const orgIds = context.isAdmin || context.scopes.some((scope) => scope.type === 'PORTFOLIO')
    ? null
    : context.scopes.filter((scope) => scope.organizationUnitId).map((scope) => scope.organizationUnitId);
  const { rows } = await client.query(
    `SELECT t.id, t.budget_cycle_id AS "budgetCycleId", t.from_allocation_id AS "fromAllocationId",
            source.description AS "fromAllocation", source_org.name AS "fromOrganization",
            t.to_allocation_id AS "toAllocationId", target.description AS "toAllocation",
            target_org.name AS "toOrganization", t.amount::text, t.reason, t.status,
            requester.full_name AS "requestedByName", t.requested_at AS "requestedAt",
            decider.full_name AS "decidedByName", t.decided_at AS "decidedAt",
            t.decision_comment AS "decisionComment"
       FROM capex_v2.budget_transfers t
       JOIN capex_v2.budget_allocations source ON source.id=t.from_allocation_id
       JOIN capex_v2.organization_units source_org ON source_org.id=source.organization_unit_id
       JOIN capex_v2.budget_allocations target ON target.id=t.to_allocation_id
       JOIN capex_v2.organization_units target_org ON target_org.id=target.organization_unit_id
       JOIN public.som_users requester ON requester.id=t.requested_by
       LEFT JOIN public.som_users decider ON decider.id=t.decided_by
      WHERE ($1::uuid IS NULL OR t.budget_cycle_id=$1)
        AND ($2::uuid[] IS NULL OR source.organization_unit_id=ANY($2::uuid[]) OR target.organization_unit_id=ANY($2::uuid[]))
      ORDER BY t.requested_at DESC`,
    [cycleId || null, orgIds]
  );
  return rows;
}

async function createTransfer(client, payload, user, context) {
  const amount = normalizeMoney(payload.amount, { positive: true });
  if (!payload.fromAllocationId || !payload.toAllocationId || !payload.reason?.trim()) {
    throw new HttpError(400, 'INVALID_TRANSFER', 'Source, destination, amount, and reason are required');
  }
  if (payload.fromAllocationId === payload.toAllocationId) {
    throw new HttpError(400, 'INVALID_TRANSFER_ALLOCATIONS', 'Source and destination allocations must be different');
  }
  const { rows: allocations } = await client.query(
    `SELECT a.id, a.organization_unit_id, v.budget_cycle_id
       FROM capex_v2.budget_allocations a
       JOIN capex_v2.budget_versions v ON v.id = a.budget_version_id
      WHERE a.id = ANY($1::uuid[]) AND a.status='ACTIVE' AND v.status='POSTED'`,
    [[payload.fromAllocationId, payload.toAllocationId]]
  );
  const cycleIds = new Set(allocations.map((allocation) => allocation.budget_cycle_id));
  if (allocations.length !== 2 || cycleIds.size !== 1) {
    throw new HttpError(400, 'INVALID_TRANSFER_ALLOCATIONS', 'Both allocations must exist in the same budget cycle');
  }
  if (allocations.some((allocation) => !canAccessOrganization(context, allocation.organization_unit_id))) {
    throw new HttpError(403, 'TRANSFER_SCOPE_FORBIDDEN', 'Both transfer allocations must be within your effective-dated scope');
  }
  const cycleId = allocations[0].budget_cycle_id;
  const { rows: [row] } = await client.query(
    `INSERT INTO capex_v2.budget_transfers
       (budget_cycle_id, from_allocation_id, to_allocation_id, amount, reason, requested_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, budget_cycle_id AS "budgetCycleId", from_allocation_id AS "fromAllocationId",
               to_allocation_id AS "toAllocationId", amount::text, reason, status, requested_at AS "requestedAt"`,
    [cycleId, payload.fromAllocationId, payload.toAllocationId, amount, payload.reason.trim(), databaseUserId(user)]
  );
  return row;
}

async function decideTransfer(client, transferId, payload, user) {
  const decision = String(payload.decision || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    throw new HttpError(400, 'INVALID_TRANSFER_DECISION', 'Decision must be APPROVED or REJECTED');
  }
  await client.query('BEGIN');
  try {
    const { rows: [transfer] } = await client.query(
      `SELECT * FROM capex_v2.budget_transfers WHERE id = $1 FOR UPDATE`,
      [transferId]
    );
    if (!transfer) throw new HttpError(404, 'TRANSFER_NOT_FOUND', 'Budget transfer not found');
    if (transfer.status !== 'PENDING_APPROVAL') throw new HttpError(409, 'TRANSFER_ALREADY_DECIDED', 'Budget transfer is no longer pending');

    if (decision === 'APPROVED') {
      const { rows: [balance] } = await client.query(
        `SELECT COALESCE(SUM(amount) FILTER (WHERE entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)
                - COALESCE(SUM(amount) FILTER (WHERE entry_type IN ('COMMITMENT','COMMITMENT_REVERSAL','ACTUAL','ACTUAL_REVERSAL')),0) AS available
           FROM capex_v2.budget_ledger_entries WHERE allocation_id = $1`,
        [transfer.from_allocation_id]
      );
      if (toMills(balance.available) < toMills(transfer.amount)) {
        throw new HttpError(409, 'INSUFFICIENT_BUDGET', 'Source allocation has insufficient available budget');
      }
      const actorId = databaseUserId(user);
      await client.query(
        `INSERT INTO capex_v2.budget_ledger_entries
           (budget_cycle_id, allocation_id, entry_type, amount, effective_date, description, created_by)
         VALUES
           ($1,$2,'TRANSFER_OUT',-$4,CURRENT_DATE,$5,$6),
           ($1,$3,'TRANSFER_IN',$4,CURRENT_DATE,$5,$6)`,
        [transfer.budget_cycle_id, transfer.from_allocation_id, transfer.to_allocation_id, transfer.amount, transfer.reason, actorId]
      );
    }
    const { rows: [updated] } = await client.query(
      `UPDATE capex_v2.budget_transfers
          SET status = $2, decided_by = $3, decision_comment = $4, decided_at = NOW()
        WHERE id = $1
        RETURNING id, status, decided_at AS "decidedAt"`,
      [transferId, decision, databaseUserId(user), payload.comment || null]
    );
    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

module.exports = {
  listBudgetCycles,
  createBudgetCycle,
  createImportBatch,
  validateImportBatch,
  postImportBatch,
  listAllocations,
  listImportBatches,
  getImportBatchDetail,
  getImportBatchDownload,
  listTransfers,
  createTransfer,
  decideTransfer,
};
