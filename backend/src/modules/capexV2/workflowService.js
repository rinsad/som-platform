const { HttpError } = require('./http');
const { databaseUserId } = require('./audit');
const { normalizeMoney, compareMoney } = require('./money');

function confirmedValueBand(value) {
  const normalized = normalizeMoney(value, { positive: true });
  if (compareMoney(normalized, '25000.000') < 0) return 'LOW';
  if (compareMoney(normalized, '300000.000') <= 0) return 'MEDIUM';
  return 'HIGH';
}

async function listWorkflowConfiguration(client) {
  const { rows } = await client.query(
    `SELECT d.id AS "definitionId", d.code, d.name, d.workflow_type AS "workflowType",
            v.id AS "versionId", v.version_number AS "versionNumber", v.status,
            v.authority_mode AS "authorityMode", v.source_artifact_reference AS "sourceArtifactReference",
            v.signed_artifact_reference AS "signedArtifactReference",
            v.business_signoff_reference AS "businessSignoffReference",
            v.simulation_snapshot AS "simulationSnapshot", v.simulated_at AS "simulatedAt", v.settings,
            v.effective_from AS "effectiveFrom", v.effective_to AS "effectiveTo",
            COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', r.id,
                'ruleOrder', r.rule_order,
                'label', r.label,
                'valueBand', r.value_band,
                'minAmount', r.min_amount::text,
                'maxAmount', CASE WHEN r.max_amount IS NULL THEN NULL ELSE r.max_amount::text END,
                'minQuoteCount', r.min_quote_count,
                'maxQuoteCount', r.max_quote_count,
                'allowQuoteWaiver', r.allow_quote_waiver,
                'steps', (
                  SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'stepOrder', s.step_order,
                    'stepKey', s.step_key,
                    'label', s.label,
                    'approverRole', s.approver_role,
                    'scopeResolution', s.scope_resolution,
                    'slaBusinessDays', s.sla_business_days
                  ) ORDER BY s.step_order), '[]'::jsonb)
                  FROM capex_v2.workflow_rule_steps s WHERE s.workflow_rule_id = r.id
                )
              ) ORDER BY r.rule_order
            ) FILTER (WHERE r.id IS NOT NULL), '[]'::jsonb) AS rules
       FROM capex_v2.workflow_definitions d
       LEFT JOIN capex_v2.workflow_versions v ON v.workflow_definition_id = d.id
       LEFT JOIN capex_v2.workflow_rules r ON r.workflow_version_id = v.id
      GROUP BY d.id, v.id
      ORDER BY d.name, v.version_number DESC NULLS LAST`
  );
  return rows;
}

async function createDefinition(client, payload, user) {
  if (!payload.code?.trim() || !payload.name?.trim()) {
    throw new HttpError(400, 'INVALID_WORKFLOW_DEFINITION', 'Workflow code and name are required');
  }
  const { rows: [row] } = await client.query(
    `INSERT INTO capex_v2.workflow_definitions (code, name, workflow_type, created_by)
     VALUES ($1,$2,$3,$4)
     RETURNING id, code, name, workflow_type AS "workflowType"`,
    [payload.code.trim().toUpperCase(), payload.name.trim(), payload.workflowType || 'CAPEX_REQUEST', databaseUserId(user)]
  );
  return row;
}

async function createVersion(client, definitionId, payload, user) {
  if (!payload.sourceArtifactReference?.trim()) {
    throw new HttpError(400, 'MISSING_SOURCE_ARTIFACT', 'A source policy or MOA artifact reference is required');
  }
  if (!Array.isArray(payload.rules) || payload.rules.length === 0) {
    throw new HttpError(400, 'MISSING_WORKFLOW_RULES', 'At least one explicit workflow rule is required');
  }

  await client.query('BEGIN');
  try {
    const { rows: [versionNumberRow] } = await client.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next
         FROM capex_v2.workflow_versions WHERE workflow_definition_id = $1`,
      [definitionId]
    );
    const { rows: [version] } = await client.query(
      `INSERT INTO capex_v2.workflow_versions
         (workflow_definition_id, version_number, authority_mode, source_artifact_reference,
          settings, effective_from, effective_to, created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::date,$7::date,$8)
       RETURNING id, version_number AS "versionNumber", status, authority_mode AS "authorityMode"`,
      [
        definitionId,
        versionNumberRow.next,
        payload.authorityMode || 'PILOT',
        payload.sourceArtifactReference.trim(),
        JSON.stringify(payload.settings || {}),
        payload.effectiveFrom || null,
        payload.effectiveTo || null,
        databaseUserId(user),
      ]
    );

    for (let index = 0; index < payload.rules.length; index += 1) {
      const rule = payload.rules[index];
      if (!rule.label?.trim() || !Array.isArray(rule.steps) || rule.steps.length === 0) {
        throw new HttpError(400, 'INVALID_WORKFLOW_RULE', `Rule ${index + 1} needs a label and at least one approval step`);
      }
      const { rows: [savedRule] } = await client.query(
        `INSERT INTO capex_v2.workflow_rules
           (workflow_version_id, rule_order, label, value_band, min_amount, max_amount,
            min_quote_count, max_quote_count, allow_quote_waiver, conditions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
         RETURNING id`,
        [
          version.id,
          rule.ruleOrder || index + 1,
          rule.label.trim(),
          rule.valueBand || 'CUSTOM',
          normalizeMoney(rule.minAmount ?? '0.000'),
          rule.maxAmount === null || rule.maxAmount === undefined || rule.maxAmount === ''
            ? null
            : normalizeMoney(rule.maxAmount),
          Number(rule.minQuoteCount || 0),
          rule.maxQuoteCount === null || rule.maxQuoteCount === undefined || rule.maxQuoteCount === ''
            ? null
            : Number(rule.maxQuoteCount),
          Boolean(rule.allowQuoteWaiver),
          JSON.stringify(rule.conditions || {}),
        ]
      );

      for (let stepIndex = 0; stepIndex < rule.steps.length; stepIndex += 1) {
        const step = rule.steps[stepIndex];
        if (!step.stepKey?.trim() || !step.label?.trim() || !step.approverRole?.trim()) {
          throw new HttpError(400, 'INVALID_WORKFLOW_STEP', `Rule ${index + 1}, step ${stepIndex + 1} is incomplete`);
        }
        await client.query(
          `INSERT INTO capex_v2.workflow_rule_steps
             (workflow_rule_id, step_order, step_key, label, approver_role,
              scope_resolution, sla_business_days)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            savedRule.id,
            step.stepOrder || stepIndex + 1,
            step.stepKey.trim(),
            step.label.trim(),
            step.approverRole.trim(),
            step.scopeResolution || 'REQUEST_ORG',
            step.slaBusinessDays || null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return version;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function activateVersion(client, versionId, payload, user) {
  if (!payload.signedArtifactReference?.trim()) {
    throw new HttpError(400, 'MISSING_SIGNED_ARTIFACT', 'Signed MOA or policy reference is required before activation');
  }
  if (!payload.businessSignoffReference?.trim()) {
    throw new HttpError(400, 'MISSING_BUSINESS_SIGNOFF', 'Business sign-off reference is required before activation');
  }
  const { rows: [version] } = await client.query(
    `SELECT v.*, d.workflow_type
       FROM capex_v2.workflow_versions v
       JOIN capex_v2.workflow_definitions d ON d.id = v.workflow_definition_id
      WHERE v.id = $1 FOR UPDATE`,
    [versionId]
  );
  if (!version) throw new HttpError(404, 'WORKFLOW_VERSION_NOT_FOUND', 'Workflow version not found');
  if (version.status !== 'DRAFT') throw new HttpError(409, 'WORKFLOW_NOT_DRAFT', 'Only draft workflow versions can be activated');
  if (version.authority_mode === 'BINDING' && process.env.CAPEX_V2_SSO_READY !== 'true') {
    throw new HttpError(409, 'SSO_NOT_READY', 'Binding workflows require CAPEX_V2_SSO_READY=true');
  }
  const effectiveFrom = payload.effectiveFrom || version.effective_from;
  if (!effectiveFrom) {
    throw new HttpError(400, 'MISSING_EFFECTIVE_DATE', 'An explicit workflow effective date is required before activation');
  }

  const { rows: [coverage] } = await client.query(
    `SELECT COUNT(*)::int AS rules,
            COUNT(*) FILTER (WHERE step_count = 0)::int AS rules_without_steps,
            COUNT(*) FILTER (WHERE ready_simulation = FALSE)::int AS rules_without_ready_simulation
       FROM (
         SELECT r.id, COUNT(DISTINCT s.id)::int AS step_count,
                COALESCE(BOOL_OR(sim.ready), FALSE) AS ready_simulation
           FROM capex_v2.workflow_rules r
           LEFT JOIN capex_v2.workflow_rule_steps s ON s.workflow_rule_id = r.id
           LEFT JOIN capex_v2.workflow_simulations sim
             ON sim.workflow_rule_id = r.id AND sim.workflow_version_id = r.workflow_version_id
          WHERE r.workflow_version_id = $1 AND r.is_active = TRUE
          GROUP BY r.id
       ) rule_coverage`,
    [versionId]
  );
  if (!coverage.rules || coverage.rules_without_steps) {
    throw new HttpError(409, 'WORKFLOW_INCOMPLETE', 'Every active rule must contain at least one approval step');
  }
  if (coverage.rules_without_ready_simulation) {
    throw new HttpError(409, 'WORKFLOW_SIMULATION_REQUIRED', 'Every active rule must have a successful named-assignee simulation before activation');
  }

  await client.query(
    `UPDATE capex_v2.workflow_versions
        SET status = 'RETIRED', effective_to = COALESCE(effective_to, CURRENT_DATE - 1)
      WHERE workflow_definition_id = $1 AND status = 'ACTIVE'`,
    [version.workflow_definition_id]
  );
  const { rows: [activated] } = await client.query(
    `UPDATE capex_v2.workflow_versions
        SET status = 'ACTIVE', signed_artifact_reference = $2,
            business_signoff_reference = $3, approved_by = $4, activated_at = NOW(),
            effective_from = $5::date
      WHERE id = $1
      RETURNING id, version_number AS "versionNumber", status, authority_mode AS "authorityMode",
                effective_from AS "effectiveFrom", signed_artifact_reference AS "signedArtifactReference",
                business_signoff_reference AS "businessSignoffReference"`,
    [
      versionId,
      payload.signedArtifactReference.trim(),
      payload.businessSignoffReference.trim(),
      databaseUserId(user),
      effectiveFrom,
    ]
  );
  return activated;
}

async function findMatchingRule(client, { amount, quoteCount, versionId = null, quoteWaiver = false }) {
  const normalized = normalizeMoney(amount, { positive: true });
  const params = [normalized, Number(quoteCount || 0), Boolean(quoteWaiver)];
  let versionClause = `v.status = 'ACTIVE'
    AND v.effective_from <= CURRENT_DATE
    AND (v.effective_to IS NULL OR v.effective_to >= CURRENT_DATE)`;
  if (versionId) {
    params.push(versionId);
    versionClause = `v.id = $4`;
  }

  const { rows: [match] } = await client.query(
    `SELECT r.id AS "ruleId", r.label AS "ruleLabel", r.value_band AS "valueBand",
            r.min_quote_count AS "minQuoteCount", r.max_quote_count AS "maxQuoteCount",
            r.allow_quote_waiver AS "allowQuoteWaiver", r.conditions,
            v.id AS "versionId", v.version_number AS "versionNumber",
            v.authority_mode AS "authorityMode", v.settings,
            d.id AS "definitionId", d.name AS "definitionName"
       FROM capex_v2.workflow_rules r
       JOIN capex_v2.workflow_versions v ON v.id = r.workflow_version_id
       JOIN capex_v2.workflow_definitions d ON d.id = v.workflow_definition_id
      WHERE d.workflow_type = 'CAPEX_REQUEST'
        AND ${versionClause}
        AND r.is_active = TRUE
        AND r.min_amount <= $1::numeric
        AND (r.max_amount IS NULL OR r.max_amount >= $1::numeric)
        AND (r.min_quote_count <= $2 OR (r.allow_quote_waiver = TRUE AND $3::boolean = TRUE))
        AND (r.max_quote_count IS NULL OR r.max_quote_count >= $2)
      ORDER BY r.rule_order
      LIMIT 1`,
    params
  );
  return match || null;
}

async function loadRuleSteps(client, ruleId) {
  const { rows } = await client.query(
    `SELECT step_order AS "stepOrder", step_key AS "stepKey", label,
            approver_role AS "approverRole", scope_resolution AS "scopeResolution",
            sla_business_days AS "slaBusinessDays"
       FROM capex_v2.workflow_rule_steps
      WHERE workflow_rule_id = $1
      ORDER BY step_order`,
    [ruleId]
  );
  return rows;
}

async function resolveAssignee(client, { roleName, organizationUnitId, scopeResolution }) {
  // DISTINCT ON collapses multiple matching assignments for the same person to
  // one candidate. A user can legitimately hold both a hand-made assignment and
  // one derived from their profile for the same role and business; without this
  // they would count twice and trip the ambiguity check below.
  const { rows } = await client.query(
    `SELECT * FROM (
       SELECT DISTINCT ON (a.user_id) a.user_id, u.full_name, a.scope_type
         FROM capex_v2.user_scope_assignments a
         JOIN public.som_users u ON u.id = a.user_id AND u.is_active = TRUE
        WHERE a.role_name = $1
          AND a.is_active = TRUE
          AND a.effective_from <= CURRENT_DATE
          AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
          AND (
            ($3 = 'PORTFOLIO' AND a.scope_type = 'PORTFOLIO')
            OR ($3 = 'REQUEST_ORG' AND (
              a.scope_type = 'PORTFOLIO'
              OR (a.scope_type = 'BUSINESS_UNIT' AND a.organization_unit_id = $2)
            ))
          )
        ORDER BY a.user_id, CASE a.scope_type WHEN 'BUSINESS_UNIT' THEN 0 ELSE 1 END
     ) candidates
     ORDER BY CASE scope_type WHEN 'BUSINESS_UNIT' THEN 0 ELSE 1 END, full_name`,
    [roleName, organizationUnitId, scopeResolution]
  );
  if (rows.length !== 1) {
    throw new HttpError(
      409,
      rows.length ? 'AMBIGUOUS_WORKFLOW_ASSIGNEE' : 'MISSING_WORKFLOW_ASSIGNEE',
      rows.length
        ? `Multiple active '${roleName}' assignees match this scope`
        : `No active '${roleName}' assignee matches this scope`,
      { roleName, organizationUnitId, candidateCount: rows.length }
    );
  }
  return { userId: rows[0].user_id, fullName: rows[0].full_name };
}

async function simulateRoute(client, payload, user) {
  const match = await findMatchingRule(client, {
    amount: payload.amount,
    quoteCount: payload.quoteCount,
    versionId: payload.versionId || null,
  });
  if (!match) {
    throw new HttpError(409, 'NO_WORKFLOW_RULE', 'No workflow rule matches this value and quotation count');
  }
  const configured = await loadRuleSteps(client, match.ruleId);
  const steps = [
    { stepOrder: 1, stepKey: 'HSSE_SCREENING', label: 'Mandatory HSSE and Worker Welfare screening', approverRole: 'HSSE Focal', scopeResolution: 'REQUEST_ORG' },
    ...configured.map((step, index) => ({ ...step, stepOrder: index + 2 })),
  ];

  const resolved = [];
  for (const step of steps) {
    try {
      const assignee = await resolveAssignee(client, {
        roleName: step.approverRole,
        organizationUnitId: payload.organizationUnitId,
        scopeResolution: step.scopeResolution || 'REQUEST_ORG',
      });
      resolved.push({ ...step, assignedUserId: assignee.userId, assignedUserName: assignee.fullName, resolution: 'RESOLVED' });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      resolved.push({ ...step, assignedUserId: null, resolution: error.code, error: error.message });
    }
  }

  const result = {
    ...match,
    confirmedValueBand: confirmedValueBand(payload.amount),
    amount: normalizeMoney(payload.amount, { positive: true }),
    quoteCount: Number(payload.quoteCount || 0),
    ready: resolved.every((step) => step.resolution === 'RESOLVED'),
    steps: resolved,
  };
  if (payload.versionId) {
    const actorId = databaseUserId(user);
    const { rowCount } = await client.query(
      `UPDATE capex_v2.workflow_versions
          SET simulation_snapshot=$2::jsonb, simulated_by=$3, simulated_at=NOW()
        WHERE id=$1 AND status='DRAFT'`,
      [payload.versionId, JSON.stringify(result), actorId]
    );
    if (rowCount) {
      await client.query(
        `INSERT INTO capex_v2.workflow_simulations
           (workflow_version_id, workflow_rule_id, simulation_input, simulation_result, ready, simulated_by)
         VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6)`,
        [payload.versionId, match.ruleId, JSON.stringify(payload), JSON.stringify(result), result.ready, actorId]
      );
      result.recordedForActivation = true;
    }
  }
  return result;
}

module.exports = {
  confirmedValueBand,
  listWorkflowConfiguration,
  createDefinition,
  createVersion,
  activateVersion,
  findMatchingRule,
  loadRuleSteps,
  resolveAssignee,
  simulateRoute,
};
