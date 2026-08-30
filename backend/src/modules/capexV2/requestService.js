const { HttpError } = require('./http');
const { databaseUserId } = require('./audit');
const { normalizeMoney, subtractMoney, compareMoney } = require('./money');
const { requestScopePredicate, requireOrganizationAccess } = require('./access');
const {
  confirmedValueBand,
  findMatchingRule,
  loadRuleSteps,
  resolveAssignee,
} = require('./workflowService');

function ensurePersistentUser(user) {
  const id = databaseUserId(user);
  if (!id) throw new HttpError(409, 'PERSISTENT_IDENTITY_REQUIRED', 'CAPEX v2 requires a persistent user identity');
  return id;
}

async function assertRequestReferences(client, payload) {
  const fiscalYear = Number(payload.fiscalYear);
  const { rowCount: organizationCount } = await client.query(
    `SELECT 1 FROM capex_v2.organization_units
      WHERE id=$1 AND is_active=TRUE AND effective_from<=CURRENT_DATE
        AND (effective_to IS NULL OR effective_to>=CURRENT_DATE)`,
    [payload.organizationUnitId]
  );
  if (!organizationCount) throw new HttpError(400, 'INVALID_ORGANIZATION', 'Select an active organization from authoritative master data');

  if (payload.budgetAllocationId) {
    const { rowCount } = await client.query(
      `SELECT 1
         FROM capex_v2.budget_allocations a
         JOIN capex_v2.budget_versions v ON v.id=a.budget_version_id AND v.status='POSTED'
         JOIN capex_v2.budget_cycles c ON c.id=v.budget_cycle_id AND c.status='OPEN'
        WHERE a.id=$1 AND a.organization_unit_id=$2 AND c.fiscal_year=$3 AND a.status='ACTIVE'`,
      [payload.budgetAllocationId, payload.organizationUnitId, fiscalYear]
    );
    if (!rowCount) throw new HttpError(400, 'INVALID_BUDGET_ALLOCATION', 'Budget allocation is not active for the selected organization and fiscal year');
  }
}

function baseRequestSelect(alias = 'r') {
  return `SELECT ${alias}.id, ${alias}.request_number AS "requestNumber", ${alias}.title,
      ${alias}.organization_unit_id AS "organizationUnitId", o.code AS "organizationCode", o.name AS "organizationName",
      ${alias}.budget_allocation_id AS "budgetAllocationId", ${alias}.fiscal_year AS "fiscalYear",
      ${alias}.owner_user_id AS "ownerUserId", owner.full_name AS "ownerName",
      ${alias}.estimated_value::text AS "estimatedValue", ${alias}.currency,
      ${alias}.project_description AS "projectDescription", ${alias}.business_case AS "businessCase",
      ${alias}.roi_summary AS "roiSummary", ${alias}.urgent, ${alias}.status,
      ${alias}.value_band AS "valueBand", ${alias}.quote_waiver_reason AS "quoteWaiverReason",
      ${alias}.version, ${alias}.submitted_at AS "submittedAt", ${alias}.approved_at AS "approvedAt",
      ${alias}.created_at AS "createdAt", ${alias}.updated_at AS "updatedAt"
    FROM capex_v2.requests ${alias}
    JOIN capex_v2.organization_units o ON o.id = ${alias}.organization_unit_id
    JOIN public.som_users owner ON owner.id = ${alias}.owner_user_id`;
}

async function listRequests(client, context, filters = {}) {
  const scope = requestScopePredicate(context, { startIndex: 1 });
  const params = [...scope.params];
  const where = [scope.sql];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.status) where.push(`r.status = ${add(filters.status)}`);
  if (filters.organizationUnitId) where.push(`r.organization_unit_id = ${add(filters.organizationUnitId)}`);
  if (filters.urgency === 'URGENT') where.push('r.urgent = TRUE');
  if (filters.urgency === 'STANDARD') where.push('r.urgent = FALSE');
  if (filters.search?.trim()) {
    const token = add(`%${filters.search.trim()}%`);
    where.push(`(r.request_number ILIKE ${token} OR r.title ILIKE ${token} OR r.project_description ILIKE ${token})`);
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 25));
  const countParams = [...params];
  const { rows: [count] } = await client.query(
    `SELECT COUNT(*)::int AS total FROM capex_v2.requests r WHERE ${where.join(' AND ')}`,
    countParams
  );
  params.push(pageSize, (page - 1) * pageSize);
  const { rows } = await client.query(
    `${baseRequestSelect('r')}
      WHERE ${where.join(' AND ')}
      ORDER BY r.created_at DESC, r.request_number DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { items: rows, total: count.total, page, pageSize };
}

async function assertRequestAccess(client, requestId, context, { forUpdate = false } = {}) {
  const scope = requestScopePredicate(context, { startIndex: 2 });
  const { rows: [request] } = await client.query(
    `${baseRequestSelect('r')}
      WHERE r.id = $1 AND ${scope.sql}
      ${forUpdate ? 'FOR UPDATE OF r' : ''}`,
    [requestId, ...scope.params]
  );
  if (!request) throw new HttpError(404, 'REQUEST_NOT_FOUND', 'CAPEX request not found');
  return request;
}

async function getRequestDetail(client, requestId, context) {
  const request = await assertRequestAccess(client, requestId, context);
  const quotes = await client.query(
      `SELECT q.id, q.supplier_name AS "supplierName", q.quoted_value::text AS "quotedValue",
              q.currency, q.payment_terms AS "paymentTerms", q.quotation_date AS "quotationDate",
              q.valid_until AS "validUntil", q.is_proposed AS "isProposed",
              vs.non_lowest_justification AS "nonLowestJustification",
              vs.budget_savings::text AS "budgetSavings"
         FROM capex_v2.quotations q
         LEFT JOIN capex_v2.vendor_selections vs ON vs.quotation_id = q.id
        WHERE q.request_id = $1 ORDER BY q.quoted_value, q.created_at`,
      [requestId]
    );
  const documents = await client.query(
      `SELECT d.id, d.original_filename AS "filename", d.media_type AS "mediaType",
              d.byte_size AS "byteSize", d.sha256, d.scan_status AS "scanStatus",
              ed.document_kind AS "documentKind", d.created_at AS "createdAt"
         FROM capex_v2.entity_documents ed
         JOIN capex_v2.documents d ON d.id = ed.document_id
        WHERE ed.entity_type = 'REQUEST' AND ed.entity_id = $1 AND ed.is_current = TRUE
        ORDER BY d.created_at`,
      [requestId]
    );
  const quotationDocuments = await client.query(
      `SELECT d.id, d.original_filename AS "filename", d.media_type AS "mediaType",
              d.byte_size AS "byteSize", d.sha256, d.scan_status AS "scanStatus",
              ed.entity_id AS "quotationId", d.created_at AS "createdAt"
         FROM capex_v2.entity_documents ed
         JOIN capex_v2.documents d ON d.id=ed.document_id
         JOIN capex_v2.quotations q ON q.id=ed.entity_id AND q.request_id=$1
        WHERE ed.entity_type='QUOTATION' AND ed.is_current=TRUE
        ORDER BY d.created_at`,
      [requestId]
    );
  const assessments = await client.query(
      `SELECT id, assessment_round AS "assessmentRound", status,
              hsse_risk AS "hsseRisk", worker_welfare_risk AS "workerWelfareRisk",
              comments, assessed_by AS "assessedBy", assessed_at AS "assessedAt"
         FROM capex_v2.hsse_assessments WHERE request_id = $1
        ORDER BY assessment_round DESC`,
      [requestId]
    );
  const workflow = await client.query(
      `SELECT wi.id AS "instanceId", wi.submission_round AS "submissionRound",
              wi.authority_mode AS "authorityMode", wi.status AS "instanceStatus",
              wi.route_snapshot AS "routeSnapshot", wi.started_at AS "startedAt",
              wis.id AS "stepId", wis.step_order AS "stepOrder", wis.step_key AS "stepKey",
              wis.label, wis.approver_role AS "approverRole", wis.assigned_user_id AS "assignedUserId",
              assignee.full_name AS "assignedUserName", wis.status, wis.due_at AS "dueAt",
              wis.started_at AS "stepStartedAt", wis.decided_at AS "decidedAt",
              wd.decision, wd.comment AS "decisionComment", decider.full_name AS "decidedByName"
         FROM capex_v2.workflow_instances wi
         JOIN capex_v2.workflow_instance_steps wis ON wis.workflow_instance_id = wi.id
         JOIN public.som_users assignee ON assignee.id = wis.assigned_user_id
         LEFT JOIN capex_v2.workflow_decisions wd ON wd.workflow_step_id = wis.id
         LEFT JOIN public.som_users decider ON decider.id = wd.decided_by
        WHERE wi.request_id = $1
        ORDER BY wi.submission_round, wis.step_order`,
      [requestId]
    );
  const budget = request.budgetAllocationId
      ? await client.query(
          `SELECT a.id, a.description,
                  COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)::text AS "authorizedBudget",
                  COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('COMMITMENT','COMMITMENT_REVERSAL')),0)::text AS commitments,
                  COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('ACTUAL','ACTUAL_REVERSAL')),0)::text AS actuals,
                  (COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)
                    - COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('COMMITMENT','COMMITMENT_REVERSAL','ACTUAL','ACTUAL_REVERSAL')),0))::text AS available
             FROM capex_v2.budget_allocations a
             LEFT JOIN capex_v2.budget_ledger_entries l ON l.allocation_id = a.id
            WHERE a.id = $1 GROUP BY a.id`,
          [request.budgetAllocationId]
        )
      : { rows: [] };
  const project = await client.query(
      `SELECT id, project_number AS "projectNumber", execution_status AS "executionStatus",
              procurement_status AS "procurementStatus", closure_status AS "closureStatus",
              capitalization_status AS "capitalizationStatus", benefits_status AS "benefitsStatus"
         FROM capex_v2.projects WHERE request_id = $1`,
      [requestId]
    );

  return {
    ...request,
    quotations: quotes.rows,
    documents: documents.rows,
    quotationDocuments: quotationDocuments.rows,
    hsseAssessments: assessments.rows,
    workflowSteps: workflow.rows,
    budgetPosition: budget.rows[0] || null,
    project: project.rows[0] || null,
  };
}

async function createRequest(client, payload, user, context) {
  const actorId = ensurePersistentUser(user);
  const required = ['title', 'organizationUnitId', 'fiscalYear', 'estimatedValue', 'projectDescription'];
  const missing = required.filter((key) => payload[key] === undefined || payload[key] === null || String(payload[key]).trim() === '');
  if (missing.length) throw new HttpError(400, 'MISSING_REQUEST_FIELDS', 'Required request fields are missing', { fields: missing });
  const estimatedValue = normalizeMoney(payload.estimatedValue, { positive: true });
  requireOrganizationAccess(context, payload.organizationUnitId);
  await assertRequestReferences(client, payload);

  const { rows: [sequence] } = await client.query(`SELECT nextval('capex_v2.request_number_seq') AS next`);
  const number = `CAPEXV2-${Number(payload.fiscalYear)}-${String(sequence.next).padStart(6, '0')}`;
  const { rows: [request] } = await client.query(
    `INSERT INTO capex_v2.requests
       (request_number, title, organization_unit_id, budget_allocation_id,
        fiscal_year, owner_user_id, estimated_value, project_description,
        business_case, roi_summary, urgent, quote_waiver_reason, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$6)
     RETURNING id, request_number AS "requestNumber", status, version, created_at AS "createdAt"`,
    [
      number,
      payload.title.trim(),
      payload.organizationUnitId,
      payload.budgetAllocationId || null,
      Number(payload.fiscalYear),
      actorId,
      estimatedValue,
      payload.projectDescription.trim(),
      payload.businessCase?.trim() || null,
      payload.roiSummary?.trim() || null,
      Boolean(payload.urgent),
      payload.quoteWaiverReason?.trim() || null,
    ]
  );
  return request;
}

async function updateRequest(client, requestId, payload, user, context) {
  const request = await assertRequestAccess(client, requestId, context, { forUpdate: true });
  const actorId = ensurePersistentUser(user);
  if (!context.isAdmin && request.ownerUserId !== actorId) {
    throw new HttpError(403, 'REQUEST_OWNER_REQUIRED', 'Only the requester may edit this request');
  }
  if (!['DRAFT', 'RETURNED'].includes(request.status)) {
    throw new HttpError(409, 'REQUEST_NOT_EDITABLE', 'Only draft or returned requests can be edited');
  }
  const expectedVersion = Number(payload.version);
  if (!Number.isInteger(expectedVersion)) throw new HttpError(400, 'VERSION_REQUIRED', 'The current request version is required');

  const next = {
    title: payload.title ?? request.title,
    organizationUnitId: payload.organizationUnitId ?? request.organizationUnitId,
    budgetAllocationId: payload.budgetAllocationId === undefined ? request.budgetAllocationId : payload.budgetAllocationId,
    fiscalYear: payload.fiscalYear ?? request.fiscalYear,
    estimatedValue: payload.estimatedValue === undefined ? request.estimatedValue : normalizeMoney(payload.estimatedValue, { positive: true }),
    projectDescription: payload.projectDescription ?? request.projectDescription,
    businessCase: payload.businessCase === undefined ? request.businessCase : payload.businessCase,
    roiSummary: payload.roiSummary === undefined ? request.roiSummary : payload.roiSummary,
    urgent: payload.urgent === undefined ? request.urgent : Boolean(payload.urgent),
    quoteWaiverReason: payload.quoteWaiverReason === undefined ? request.quoteWaiverReason : payload.quoteWaiverReason,
  };
  if (!String(next.title || '').trim() || !String(next.projectDescription || '').trim()) {
    throw new HttpError(400, 'MISSING_REQUEST_FIELDS', 'Request title and project description are required');
  }
  requireOrganizationAccess(context, next.organizationUnitId);
  await assertRequestReferences(client, next);
  const { rows: [updated] } = await client.query(
    `UPDATE capex_v2.requests SET
       title=$3, organization_unit_id=$4, budget_allocation_id=$5,
       fiscal_year=$6, estimated_value=$7, project_description=$8,
       business_case=$9, roi_summary=$10, urgent=$11,
       quote_waiver_reason=$12, version=version+1, updated_at=NOW()
     WHERE id=$1 AND version=$2
     RETURNING id, request_number AS "requestNumber", status, version, updated_at AS "updatedAt"`,
    [
      requestId, expectedVersion, next.title.trim(), next.organizationUnitId,
      next.budgetAllocationId, Number(next.fiscalYear), next.estimatedValue,
      next.projectDescription.trim(), next.businessCase?.trim() || null,
      next.roiSummary?.trim() || null, next.urgent, next.quoteWaiverReason?.trim() || null,
    ]
  );
  if (!updated) throw new HttpError(409, 'STALE_REQUEST_VERSION', 'The request was changed by another user; refresh and try again');
  return updated;
}

async function addQuotation(client, requestId, payload, user, context) {
  const actorId = ensurePersistentUser(user);
  if (!payload.supplierName?.trim()) throw new HttpError(400, 'SUPPLIER_REQUIRED', 'Supplier name is required');
  const amount = normalizeMoney(payload.quotedValue, { positive: true });

  await client.query('BEGIN');
  try {
    const request = await assertRequestAccess(client, requestId, context, { forUpdate: true });
    if (!context.isAdmin && request.ownerUserId !== actorId) throw new HttpError(403, 'REQUEST_OWNER_REQUIRED', 'Only the requester may edit quotations');
    if (!['DRAFT', 'RETURNED'].includes(request.status)) throw new HttpError(409, 'QUOTATIONS_LOCKED', 'Quotations are locked while the request is under review');
    if (payload.isProposed) {
      await client.query(`UPDATE capex_v2.quotations SET is_proposed = FALSE WHERE request_id = $1`, [requestId]);
      await client.query(`DELETE FROM capex_v2.vendor_selections WHERE request_id = $1`, [requestId]);
    }
    const { rows: [quote] } = await client.query(
      `INSERT INTO capex_v2.quotations
         (request_id, supplier_name, quoted_value, payment_terms, quotation_date, valid_until,
          is_proposed, created_by)
       VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8)
       RETURNING id, supplier_name AS "supplierName", quoted_value::text AS "quotedValue",
                 payment_terms AS "paymentTerms", is_proposed AS "isProposed"`,
      [
        requestId, payload.supplierName.trim(), amount, payload.paymentTerms?.trim() || null,
        payload.quotationDate || null, payload.validUntil || null, Boolean(payload.isProposed), actorId,
      ]
    );
    if (payload.isProposed) {
      const { rows: [lowest] } = await client.query(
        `SELECT MIN(quoted_value)::text AS value FROM capex_v2.quotations WHERE request_id = $1`,
        [requestId]
      );
      if (compareMoney(amount, lowest.value) > 0 && !payload.nonLowestJustification?.trim()) {
        throw new HttpError(400, 'NON_LOWEST_JUSTIFICATION_REQUIRED', 'Selecting a non-lowest quotation requires a justification');
      }
      await client.query(
        `INSERT INTO capex_v2.vendor_selections
           (request_id, quotation_id, budget_savings, non_lowest_justification, selected_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [requestId, quote.id, subtractMoney(request.estimatedValue, amount), payload.nonLowestJustification?.trim() || null, actorId]
      );
    }
    await client.query(`UPDATE capex_v2.requests SET version=version+1, updated_at=NOW() WHERE id=$1`, [requestId]);
    await client.query('COMMIT');
    return quote;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function deleteQuotation(client, requestId, quotationId, user, context) {
  const actorId = ensurePersistentUser(user);

  await client.query('BEGIN');
  try {
    const request = await assertRequestAccess(client, requestId, context, { forUpdate: true });
    if (!context.isAdmin && request.ownerUserId !== actorId) throw new HttpError(403, 'REQUEST_OWNER_REQUIRED', 'Only the requester may edit quotations');
    if (!['DRAFT', 'RETURNED'].includes(request.status)) throw new HttpError(409, 'QUOTATIONS_LOCKED', 'Quotations are locked while the request is under review');
    const { rows: [quotation] } = await client.query(
      `SELECT id, supplier_name AS "supplierName", quoted_value::text AS "quotedValue",
              is_proposed AS "isProposed"
         FROM capex_v2.quotations
        WHERE id=$1 AND request_id=$2
        FOR UPDATE`,
      [quotationId, requestId]
    );
    if (!quotation) throw new HttpError(404, 'QUOTATION_NOT_FOUND', 'Quotation not found');

    await client.query(`DELETE FROM capex_v2.vendor_selections WHERE quotation_id=$1`, [quotationId]);
    await client.query(
      `UPDATE capex_v2.entity_documents
          SET is_current=FALSE
        WHERE entity_type='QUOTATION' AND entity_id=$1 AND is_current=TRUE`,
      [quotationId]
    );
    await client.query(`DELETE FROM capex_v2.quotations WHERE id=$1`, [quotationId]);
    await client.query(`UPDATE capex_v2.requests SET version=version+1, updated_at=NOW() WHERE id=$1`, [requestId]);
    await client.query('COMMIT');
    return quotation;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

function dueAt(businessDays) {
  if (!businessDays) return null;
  const date = new Date();
  let remaining = Number(businessDays);
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (![0, 6].includes(date.getUTCDay())) remaining -= 1;
  }
  return date.toISOString();
}

async function submitRequest(client, requestId, user, context) {
  await client.query('BEGIN');
  try {
    const request = await assertRequestAccess(client, requestId, context, { forUpdate: true });
    const actorId = ensurePersistentUser(user);
    if (!context.isAdmin && request.ownerUserId !== actorId) throw new HttpError(403, 'REQUEST_OWNER_REQUIRED', 'Only the requester may submit this request');
    if (!['DRAFT', 'RETURNED'].includes(request.status)) throw new HttpError(409, 'REQUEST_NOT_SUBMITTABLE', 'Only draft or returned requests can be submitted');
    if (!request.budgetAllocationId) throw new HttpError(400, 'BUDGET_ALLOCATION_REQUIRED', 'Select a budget allocation imported from SAC before submission');
    await assertRequestReferences(client, request);

    const { rows: [evidence] } = await client.query(
        `SELECT COUNT(*) FILTER (WHERE d.scan_status IN ('CLEAN','NOT_CONFIGURED'))::int AS usable,
                COUNT(*) FILTER (WHERE d.scan_status='PENDING')::int AS pending
           FROM capex_v2.entity_documents ed
           JOIN capex_v2.documents d ON d.id=ed.document_id
          WHERE ed.entity_type='REQUEST' AND ed.entity_id=$1
            AND ed.document_kind='PROJECT_EVIDENCE' AND ed.is_current=TRUE`,
        [requestId]
      );
    const { rows: [quoteSummary] } = await client.query(
        `SELECT COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE q.is_proposed)::int AS proposed,
                MIN(q.quoted_value)::text AS "lowestValue",
                MAX(q.quoted_value) FILTER (WHERE q.is_proposed)::text AS "proposedValue",
                MAX(vs.non_lowest_justification) FILTER (WHERE q.is_proposed) AS "nonLowestJustification",
                COUNT(*) FILTER (WHERE EXISTS (
                  SELECT 1
                    FROM capex_v2.entity_documents ed
                    JOIN capex_v2.documents d ON d.id=ed.document_id
                   WHERE ed.entity_type='QUOTATION' AND ed.entity_id=q.id AND ed.is_current=TRUE
                     AND d.scan_status IN ('CLEAN','NOT_CONFIGURED')
                ))::int AS documented
           FROM capex_v2.quotations q
           LEFT JOIN capex_v2.vendor_selections vs ON vs.quotation_id=q.id
          WHERE q.request_id=$1`,
        [requestId]
      );
    if (evidence.pending) throw new HttpError(409, 'DOCUMENT_SCAN_PENDING', 'Project evidence is still awaiting malware scanning');
    if (!evidence.usable) throw new HttpError(400, 'PROJECT_EVIDENCE_REQUIRED', 'Upload at least one project document or presentation');
    if (!quoteSummary.proposed) throw new HttpError(400, 'PROPOSED_QUOTATION_REQUIRED', 'Select one proposed supplier quotation');
    if (compareMoney(quoteSummary.proposedValue, quoteSummary.lowestValue) > 0 && !quoteSummary.nonLowestJustification?.trim()) {
      throw new HttpError(400, 'NON_LOWEST_JUSTIFICATION_REQUIRED', 'Selecting a non-lowest quotation requires a justification');
    }
    if (quoteSummary.documented !== quoteSummary.count) {
      throw new HttpError(400, 'QUOTATION_EVIDENCE_REQUIRED', 'Every quotation requires a usable supporting document');
    }

    let match = await findMatchingRule(client, { amount: request.estimatedValue, quoteCount: quoteSummary.count });
    if (!match && request.quoteWaiverReason) {
      match = await findMatchingRule(client, { amount: request.estimatedValue, quoteCount: 0, quoteWaiver: true });
    }
    if (!match) throw new HttpError(409, 'NO_ACTIVE_WORKFLOW', 'No signed active MOA rule matches this value and quotation count');
    if (quoteSummary.count < match.minQuoteCount && !(match.allowQuoteWaiver && request.quoteWaiverReason)) {
      throw new HttpError(400, 'QUOTATION_REQUIREMENT_NOT_MET', `This route requires at least ${match.minQuoteCount} quotations`);
    }

    const configuredSteps = await loadRuleSteps(client, match.ruleId);
    const hsseAssignee = await resolveAssignee(client, {
      roleName: 'HSSE Focal',
      organizationUnitId: request.organizationUnitId,
      scopeResolution: 'REQUEST_ORG',
    });
    const steps = [
      {
        stepOrder: 1, stepKey: 'HSSE_SCREENING', label: 'Mandatory HSSE and Worker Welfare screening',
        approverRole: 'HSSE Focal', assignedUserId: hsseAssignee.userId, slaBusinessDays: null,
      },
    ];
    for (let index = 0; index < configuredSteps.length; index += 1) {
      const step = configuredSteps[index];
      const assignee = await resolveAssignee(client, {
        roleName: step.approverRole,
        organizationUnitId: request.organizationUnitId,
        scopeResolution: step.scopeResolution,
      });
      steps.push({ ...step, stepOrder: index + 2, assignedUserId: assignee.userId, assignedUserName: assignee.fullName });
    }

    const { rows: [round] } = await client.query(
      `SELECT COALESCE(MAX(submission_round),0)+1 AS next
         FROM capex_v2.workflow_instances WHERE request_id=$1`,
      [requestId]
    );
    const snapshot = {
      workflowVersionId: match.versionId,
      workflowVersionNumber: match.versionNumber,
      workflowRuleId: match.ruleId,
      workflowRuleLabel: match.ruleLabel,
      valueBand: match.valueBand,
      authorityMode: match.authorityMode,
      amount: request.estimatedValue,
      quoteCount: quoteSummary.count,
      steps,
    };
    const { rows: [instance] } = await client.query(
      `INSERT INTO capex_v2.workflow_instances
         (request_id, workflow_version_id, workflow_rule_id, submission_round,
          authority_mode, route_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`,
      [requestId, match.versionId, match.ruleId, round.next, match.authorityMode, JSON.stringify(snapshot)]
    );
    for (const step of steps) {
      await client.query(
        `INSERT INTO capex_v2.workflow_instance_steps
           (workflow_instance_id, step_order, step_key, label, approver_role,
            assigned_user_id, status, due_at, started_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz)`,
        [
          instance.id, step.stepOrder, step.stepKey, step.label, step.approverRole,
          step.assignedUserId, step.stepOrder === 1 ? 'PENDING' : 'WAITING',
          step.stepOrder === 1 ? dueAt(step.slaBusinessDays) : null,
          step.stepOrder === 1 ? new Date().toISOString() : null,
        ]
      );
    }
    await client.query(
      `INSERT INTO capex_v2.hsse_assessments (request_id, assessment_round)
       VALUES ($1,$2)`,
      [requestId, round.next]
    );
    const { rows: [updated] } = await client.query(
      `UPDATE capex_v2.requests
          SET status='IN_REVIEW', value_band=$2, submitted_at=NOW(), version=version+1, updated_at=NOW()
        WHERE id=$1
        RETURNING id, request_number AS "requestNumber", status, value_band AS "valueBand",
                  version, submitted_at AS "submittedAt"`,
      [requestId, match.valueBand || confirmedValueBand(request.estimatedValue)]
    );
    await client.query('COMMIT');
    return { ...updated, workflowInstanceId: instance.id, authorityMode: match.authorityMode };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function decideRequestStep(client, requestId, payload, user, context) {
  const actorId = ensurePersistentUser(user);
  const decision = String(payload.decision || '').toUpperCase();
  if (!['APPROVED', 'RETURNED', 'REJECTED'].includes(decision)) {
    throw new HttpError(400, 'INVALID_DECISION', 'Decision must be APPROVED, RETURNED, or REJECTED');
  }
  await client.query('BEGIN');
  try {
    await assertRequestAccess(client, requestId, context, { forUpdate: true });
    const { rows: [current] } = await client.query(
      `SELECT wi.id AS instance_id, wi.authority_mode, wi.submission_round,
              wi.route_snapshot,
              wis.id AS step_id, wis.step_order, wis.step_key, wis.label,
              wis.approver_role, wis.assigned_user_id
         FROM capex_v2.workflow_instances wi
         JOIN capex_v2.workflow_instance_steps wis ON wis.workflow_instance_id=wi.id
        WHERE wi.request_id=$1 AND wi.status='ACTIVE' AND wis.status='PENDING'
        FOR UPDATE OF wi, wis`,
      [requestId]
    );
    if (!current) throw new HttpError(409, 'NO_PENDING_APPROVAL', 'This request has no pending approval step');
    if (current.assigned_user_id !== actorId) throw new HttpError(403, 'STEP_ASSIGNEE_REQUIRED', 'Only the assigned approver may decide this step');

    if (current.step_key === 'HSSE_SCREENING' && decision === 'APPROVED') {
      const hsseRisk = String(payload.hsseRisk || '').toUpperCase();
      const workerWelfareRisk = String(payload.workerWelfareRisk || '').toUpperCase();
      const allowed = ['LOW', 'MEDIUM', 'HIGH'];
      if (!allowed.includes(hsseRisk) || !allowed.includes(workerWelfareRisk)) {
        throw new HttpError(400, 'HSSE_RATINGS_REQUIRED', 'Both HSSE and Worker Welfare ratings are required');
      }
      await client.query(
        `UPDATE capex_v2.hsse_assessments
            SET status='COMPLETED', hsse_risk=$3, worker_welfare_risk=$4,
                comments=$5, assessed_by=$6, assessed_at=NOW()
          WHERE request_id=$1 AND assessment_round=$2`,
        [requestId, current.submission_round, hsseRisk, workerWelfareRisk, payload.comment || null, actorId]
      );
    } else if (current.step_key === 'HSSE_SCREENING' && decision === 'RETURNED') {
      await client.query(
        `UPDATE capex_v2.hsse_assessments
            SET status='RETURNED', comments=$3, assessed_by=$4, assessed_at=NOW()
          WHERE request_id=$1 AND assessment_round=$2`,
        [requestId, current.submission_round, payload.comment || null, actorId]
      );
    }

    await client.query(
      `INSERT INTO capex_v2.workflow_decisions (workflow_step_id, decision, comment, decided_by)
       VALUES ($1,$2,$3,$4)`,
      [current.step_id, decision, payload.comment || null, actorId]
    );
    await client.query(
      `UPDATE capex_v2.workflow_instance_steps SET status=$2, decided_at=NOW() WHERE id=$1`,
      [current.step_id, decision]
    );

    let requestStatus = 'IN_REVIEW';
    let project = null;
    if (decision === 'RETURNED' || decision === 'REJECTED') {
      await client.query(
        `UPDATE capex_v2.workflow_instances SET status=$2, completed_at=NOW() WHERE id=$1`,
        [current.instance_id, decision]
      );
      await client.query(
        `UPDATE capex_v2.workflow_instance_steps SET status='CANCELLED'
          WHERE workflow_instance_id=$1 AND status='WAITING'`,
        [current.instance_id]
      );
      requestStatus = decision;
    } else {
      const { rows: [next] } = await client.query(
        `SELECT id, step_order
           FROM capex_v2.workflow_instance_steps
          WHERE workflow_instance_id=$1 AND status='WAITING'
          ORDER BY step_order LIMIT 1`,
        [current.instance_id]
      );
      if (next) {
        const nextDefinition = current.route_snapshot?.steps?.find(
          (step) => Number(step.stepOrder) === Number(next.step_order)
        );
        await client.query(
          `UPDATE capex_v2.workflow_instance_steps
              SET status='PENDING', started_at=NOW(), due_at=$2::timestamptz
            WHERE id=$1`,
          [next.id, dueAt(nextDefinition?.slaBusinessDays)]
        );
      } else {
        await client.query(
          `UPDATE capex_v2.workflow_instances SET status='COMPLETED', completed_at=NOW() WHERE id=$1`,
          [current.instance_id]
        );
        requestStatus = 'APPROVED';
        const { rows: [request] } = await client.query(
          `SELECT organization_unit_id, owner_user_id, fiscal_year FROM capex_v2.requests WHERE id=$1`,
          [requestId]
        );
        const { rows: [sequence] } = await client.query(`SELECT nextval('capex_v2.project_number_seq') AS next`);
        const projectNumber = `CAPEX-${request.fiscal_year}-${String(sequence.next).padStart(6, '0')}`;
        const { rows: [created] } = await client.query(
          `INSERT INTO capex_v2.projects
             (project_number, request_id, organization_unit_id, owner_user_id)
           VALUES ($1,$2,$3,$4)
           RETURNING id, project_number AS "projectNumber"`,
          [projectNumber, requestId, request.organization_unit_id, request.owner_user_id]
        );
        project = created;
      }
    }
    const { rows: [updated] } = await client.query(
      `UPDATE capex_v2.requests
          SET status=$2::varchar(24),
              approved_at=CASE WHEN $3::boolean THEN NOW() ELSE approved_at END,
              version=version+1, updated_at=NOW()
        WHERE id=$1
        RETURNING id, request_number AS "requestNumber", status, version, approved_at AS "approvedAt"`,
      [requestId, requestStatus, requestStatus === 'APPROVED']
    );
    await client.query('COMMIT');
    return { ...updated, project, authorityMode: current.authority_mode };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function withdrawRequest(client, requestId, user, context) {
  const request = await assertRequestAccess(client, requestId, context, { forUpdate: true });
  const actorId = ensurePersistentUser(user);
  if (!context.isAdmin && request.ownerUserId !== actorId) throw new HttpError(403, 'REQUEST_OWNER_REQUIRED', 'Only the requester may withdraw this request');
  if (!['DRAFT', 'RETURNED'].includes(request.status)) throw new HttpError(409, 'REQUEST_NOT_WITHDRAWABLE', 'Only draft or returned requests can be withdrawn');
  const { rows: [updated] } = await client.query(
    `UPDATE capex_v2.requests SET status='WITHDRAWN', version=version+1, updated_at=NOW()
      WHERE id=$1 RETURNING id, request_number AS "requestNumber", status, version`,
    [requestId]
  );
  return updated;
}

async function getApprovalInbox(client, user) {
  const actorId = ensurePersistentUser(user);
  const { rows } = await client.query(
    `SELECT wis.id AS "stepId", wis.label, wis.approver_role AS "approverRole",
            wis.started_at AS "startedAt", wis.due_at AS "dueAt",
            r.id AS "requestId", r.request_number AS "requestNumber", r.title,
            r.estimated_value::text AS "estimatedValue", r.currency, r.urgent,
            r.organization_unit_id AS "organizationUnitId", o.name AS "organizationName",
            owner.full_name AS "ownerName", wi.authority_mode AS "authorityMode"
       FROM capex_v2.workflow_instance_steps wis
       JOIN capex_v2.workflow_instances wi ON wi.id=wis.workflow_instance_id AND wi.status='ACTIVE'
       JOIN capex_v2.requests r ON r.id=wi.request_id
       JOIN capex_v2.organization_units o ON o.id=r.organization_unit_id
       JOIN public.som_users owner ON owner.id=r.owner_user_id
      WHERE wis.assigned_user_id=$1 AND wis.status='PENDING'
      ORDER BY wis.started_at, r.created_at`,
    [actorId]
  );
  return rows;
}

module.exports = {
  listRequests,
  getRequestDetail,
  assertRequestAccess,
  createRequest,
  updateRequest,
  addQuotation,
  deleteQuotation,
  submitRequest,
  decideRequestStep,
  withdrawRequest,
  getApprovalInbox,
};
