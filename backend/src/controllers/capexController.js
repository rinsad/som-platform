const pool   = require('../database/db');
const multer = require('multer');
const {
  LEGACY_STATUS_MAP,
  APPROVED_OR_LATER_STATUSES,
  canonicalStatus,
  canEditProcurement,
  canCreateMilestone,
  canUpdateMilestone,
  canResubmit,
  decisionAuthority,
  requestStatusForStep,
} = require('../config/capexStateMachine');
const { getValueThresholds, calcValueBandWithThresholds } = require('../config/capexThresholds');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);
const ALLOWED_PERMISSION_ACTIONS = new Set(['can_view', 'can_create', 'can_edit', 'can_delete']);

const _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.csvUploadMiddleware = _upload.single('file');
exports.attachmentUploadMiddleware = _upload.single('file');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const WORKFLOW_ROLE_ALIASES = {
  'Line Manager': 'Manager',
  'Contract Holder / Owner': 'Project Owner',
  FiB: 'Finance in Business',
  'Head of CP': 'CP Manager',
  'CP Manager / Head of CP': 'CP Manager',
  CP: 'CP Manager',
  EMT: 'CEO/Board',
  'Contract Board': 'CEO/Board',
};

function workflowRoleLookupKeys(role) {
  const original = String(role || '').trim();
  const canonical = WORKFLOW_ROLE_ALIASES[original] || original;
  return [...new Set([canonical, original].filter(Boolean))];
}

function permissionParentKeys(resourceKey) {
  const parts = String(resourceKey || '').split('.');
  const keys = [];
  for (let i = parts.length; i >= 1; i -= 1) {
    keys.push(parts.slice(0, i).join('.'));
  }
  return keys;
}

async function userHasPermission(user, resourceKey, action = 'can_view') {
  if (!ALLOWED_PERMISSION_ACTIONS.has(action)) {
    throw new Error(`Unsupported permission action: ${action}`);
  }
  if (user?.role === 'Admin') return true;
  if (!user?.id) return false;

  const { rows } = await pool.query(
    `SELECT ${action}
     FROM som_permissions
     WHERE user_id = $1 AND resource_key = ANY($2::text[])`,
    [user.id, permissionParentKeys(resourceKey)]
  );
  return rows.some((row) => row[action]);
}

// The approval route for a band, derived from the actual executable workflow
// config (the same rows that generate a request's approval steps). This is the
// single source of truth for MOA matrix validation — previously a separate
// hardcoded summary that never matched the real chain.
async function approvalRouteForBandFromConfig(db, valueBand) {
  const { rows } = await db.query(
    `SELECT approver_role FROM capex_workflow_config
     WHERE is_active = true AND value_band IN ('ALL', $1) AND condition_key = 'standard'
     ORDER BY CASE WHEN value_band = 'ALL' THEN 0 ELSE 1 END, step_order`,
    [valueBand]
  );
  if (!rows.length) return null;
  return rows.map(r => r.approver_role).join(' → ');
}

function approvalRouteForBand(valueBand) {
  if (valueBand === 'LOW') return 'Project Lead + GM';
  if (valueBand === 'MEDIUM') return 'GM + CFO + EMT';
  return 'Contract Board';
}

function buildCapexWorkflow({ valueBand, quoteCount, hsseRisk, workerWelfareRisk }) {
  const steps = [];
  const add = (role, label) => steps.push({ role, label });
  const needsHsse = ['Medium', 'High'].includes(hsseRisk) || ['Medium', 'High'].includes(workerWelfareRisk);
  const fewerThan3 = Number(quoteCount || 0) < 3;

  add('Manager', 'Line Manager Endorsement');
  if (needsHsse) add('HSSE Focal', 'HSSE Focal Review');

  if (valueBand === 'LOW') {
    add('Finance in Business', 'FiB Validation');
    add('CP Lead', 'CP Lead Pre-support');
    if (fewerThan3) add('CP Manager', 'CP Manager Approval for Fewer than 3 Quotations');
    add('Business GM', 'Business GM Approval');
  } else if (valueBand === 'MEDIUM') {
    add('Project Owner', 'Project Owner Pre-support');
    add('Finance in Business', 'FiB Validation');
    add('CP Manager', 'CP Governance Approval');
    if (fewerThan3) add('CFO', 'CFO Approval for Fewer than 3 Quotations');
    add('CEO/Board', 'EMT Approval');
  } else {
    add('CP Manager', 'CP Review');
    add('Finance in Business', 'FiB Validation');
    add('CEO/Board', 'Contract Board Approval');
  }

  return steps;
}

function displayWorkflowLabel(row) {
  if (row.approver_role === 'HSSE Focal' && row.label === 'HSSE / Worker Welfare Approval') {
    return 'HSSE Focal Review';
  }
  return row.label;
}

async function buildConfiguredCapexWorkflow(db, { valueBand, quoteCount, hsseRisk, workerWelfareRisk }) {
  try {
    const needsHsse = ['Medium', 'High'].includes(hsseRisk) || ['Medium', 'High'].includes(workerWelfareRisk);
    const fewerThan3 = Number(quoteCount || 0) < 3;
    const conditions = ['standard'];
    if (needsHsse) conditions.push('hsse_required');
    if (fewerThan3) conditions.push('fewer_than_3');

    const { rows } = await db.query(
      `SELECT value_band, condition_key, step_order, approver_role, label
       FROM capex_workflow_config
       WHERE is_active = true
         AND value_band IN ('ALL', $1)
         AND condition_key = ANY($2)
       ORDER BY
         CASE WHEN value_band = 'ALL' THEN 0 ELSE 1 END,
         step_order`,
      [valueBand, conditions]
    );

    if (!rows.length) return buildCapexWorkflow({ valueBand, quoteCount, hsseRisk, workerWelfareRisk });

    return rows.map(r => ({ role: r.approver_role, label: displayWorkflowLabel(r) }));
  } catch {
    return buildCapexWorkflow({ valueBand, quoteCount, hsseRisk, workerWelfareRisk });
  }
}

function nextOpenStep(steps) {
  return steps.find(s => s.status === 'Pending') || null;
}

async function addAuditLog(client, requestId, eventType, message, actor) {
  await client.query(
    `INSERT INTO capex_audit_logs (request_id, event_type, message, actor)
     VALUES ($1,$2,$3,$4)`,
    [requestId, eventType, message, actor || 'System']
  );
}

function userName(req) {
  return req.user?.full_name || req.user?.email || 'Unknown';
}

function userRole(req) {
  return req.user?.role || 'Unknown';
}

function hasPoUploadRequirements(data) {
  return !!(data.poNumber && Number(data.poValue) > 0 && data.poAttachmentName);
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // Guard against spreadsheet formula injection when the CSV is opened in Excel.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const DEFAULT_CLOSURE_CHECKLIST = [
  ['project_completed', 'Project physically completed'],
  ['technical_completion_confirmed', 'Technical completion confirmed'],
  ['final_contractor_acceptance', 'Final contractor acceptance completed'],
  ['completion_certificate_uploaded', 'Completion certificate uploaded'],
  ['final_invoice_received', 'Final vendor invoice received'],
  ['goods_receipt_completed', 'Goods receipt completed'],
  ['po_closed', 'All POs closed'],
  ['contract_closure_completed', 'Contract closure completed'],
  ['retention_release_completed', 'Retention release completed'],
  ['auc_transferred', 'AUC transferred to fixed assets'],
  ['capitalization_completed', 'Asset capitalization completed'],
  ['asset_handover_completed', 'Asset handover completed'],
  ['operational_acceptance_completed', 'Operational acceptance completed'],
  ['documents_uploaded', 'Supporting documents uploaded'],
  ['hse_documentation_closed', 'HSE documentation closed'],
  ['lessons_learned_captured', 'Lessons learned captured'],
  ['finance_validated', 'Finance validation completed'],
  ['owner_signed_off', 'Project owner sign-off completed'],
  ['audit_verified', 'Internal audit compliance verification'],
];

const DEFAULT_DECISION_GATES = [
  ['gate_1_budget', 'Gate 1 - Budget Approval'],
  ['gate_2_capex', 'Gate 2 - CAPEX Approval'],
  ['gate_3_procurement', 'Gate 3 - Procurement Approval'],
  ['gate_4_cost_schedule', 'Gate 4 - Cost & Schedule Review'],
  ['gate_5_completion', 'Gate 5 - Completion & Acceptance'],
  ['gate_6_auc', 'Gate 6 - AUC Review'],
  ['gate_7_asset_acceptance', 'Gate 7 - Asset Acceptance'],
  ['gate_8_benefits', 'Gate 8 - Benefits Realization'],
];

const DECISION_GATE_RULES = {
  gate_1_budget: {
    ownerRoles: ['Finance in Business', 'Finance Manager', 'CFO'],
    ownerLabel: 'FiB / Finance',
  },
  gate_2_capex: {
    ownerRoles: [],
    ownerLabel: 'Approval workflow',
    autoManaged: true,
  },
  gate_3_procurement: {
    ownerRoles: ['CP Manager', 'CP Lead', 'Project Engineer'],
    ownerLabel: 'CP / Project Engineer',
  },
  gate_4_cost_schedule: {
    ownerRoles: ['Project Engineer'],
    ownerLabel: 'Project Engineer',
  },
  gate_5_completion: {
    ownerRoles: ['Project Engineer', 'Project Owner'],
    ownerLabel: 'Project Engineer / Project Owner',
  },
  gate_6_auc: {
    ownerRoles: ['Finance in Business', 'Finance Manager', 'CFO'],
    ownerLabel: 'Finance',
  },
  gate_7_asset_acceptance: {
    ownerRoles: ['Asset Team', 'Project Engineer'],
    ownerLabel: 'Asset Team / Project Engineer',
  },
  gate_8_benefits: {
    ownerRoles: ['Finance in Business', 'Finance Manager', 'CFO'],
    ownerLabel: 'Finance',
  },
};

function gateRule(gateKey) {
  return DECISION_GATE_RULES[gateKey] || { ownerRoles: [], ownerLabel: 'Assigned owner', autoManaged: false };
}

function canUserReviewDecisionGate(user, gateKey) {
  if (user?.role === 'Admin') return true;
  const rule = gateRule(gateKey);
  if (rule.autoManaged) return false;
  return rule.ownerRoles.includes(user?.role || '');
}

function gate2AutoPassed(request) {
  const blockedStatuses = new Set(['Draft', 'Returned for correction', 'Rejected']);
  return !request?.current_step_id && !blockedStatuses.has(request?.status);
}

async function syncCapexApprovalDecisionGate(client, request, reviewer) {
  await insertDefaultDecisionGates(client, request.id, reviewer);
  const status = gate2AutoPassed(request) ? 'Passed' : 'Pending';
  await client.query(
    `UPDATE capex_decision_gate_reviews
     SET status = $1::text,
         reviewer = CASE WHEN $1::text = 'Passed' THEN $2 ELSE NULL END,
         reviewed_at = CASE WHEN $1::text = 'Passed' THEN NOW() ELSE NULL END,
         comments = CASE WHEN $1::text = 'Passed' THEN comments ELSE NULL END,
         evidence = CASE WHEN $1::text = 'Passed' THEN evidence ELSE NULL END,
         updated_at = NOW()
     WHERE request_id = $3 AND gate_key = 'gate_2_capex'`,
    [status, reviewer || 'System', request.id]
  );
}

async function ensureCapexRequest(client, requestId) {
  const { rows: [request] } = await client.query(`SELECT * FROM capex_requests WHERE id = $1 FOR UPDATE`, [requestId]);
  return request || null;
}

async function insertDefaultClosureChecklist(client, requestId, owner) {
  for (const [itemKey, label] of DEFAULT_CLOSURE_CHECKLIST) {
    await client.query(
      `INSERT INTO capex_closure_checklist_items
       (request_id, item_key, label, responsible_owner, updated_by)
       VALUES ($1,$2,$3,$4,$4)
       ON CONFLICT (request_id, item_key) DO NOTHING`,
      [requestId, itemKey, label, owner || 'System']
    );
  }
}

async function insertDefaultDecisionGates(client, requestId, reviewer) {
  for (const [gateKey, gateName] of DEFAULT_DECISION_GATES) {
    await client.query(
      `INSERT INTO capex_decision_gate_reviews
       (request_id, gate_key, gate_name, reviewer)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (request_id, gate_key) DO NOTHING`,
      [requestId, gateKey, gateName, reviewer || 'System']
    );
  }
}

function decorateDecisionGateForUser(gate, request, user) {
  const rule = gateRule(gate.gateKey);
  const autoPassed = gate.gateKey === 'gate_2_capex' && gate2AutoPassed(request);
  const status = autoPassed ? 'Passed' : gate.status;
  return {
    ...gate,
    status,
    ownerLabel: rule.ownerLabel,
    ownerRoles: rule.ownerRoles,
    autoManaged: !!rule.autoManaged,
    canAct: canUserReviewDecisionGate(user, gate.gateKey) && status !== 'Passed',
  };
}

// ── GET /api/capex/summary ────────────────────────────────────────────────────
exports.getSummary = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, total_budget, committed, actual,
              (total_budget - committed - actual) AS remaining,
              ROUND((actual / NULLIF(total_budget,0)) * 100) AS percent_used
       FROM capex_departments
       ORDER BY name`
    );
    res.json(rows.map(r => ({
      id:          r.id,
      name:        r.name,
      totalBudget: Number(r.total_budget),
      committed:   Number(r.committed),
      actual:      Number(r.actual),
      remaining:   Number(r.remaining),
      percentUsed: Number(r.percent_used),
    })));
  } catch (err) { next(err); }
};

// ── GET /api/capex/departments ────────────────────────────────────────────────
exports.getDepartmentsList = async (req, res, next) => {
  try {
    const { rows: depts } = await pool.query(
      `SELECT id, name, total_budget, committed, actual,
              (total_budget - committed - actual) AS remaining,
              ROUND((actual / NULLIF(total_budget,0)) * 100) AS percent_used
       FROM capex_departments ORDER BY name`
    );
    const result = await Promise.all(depts.map(async (dept) => {
      const { rows: monthly } = await pool.query(
        `SELECT month_label AS month, budgeted, actual
         FROM capex_department_monthly WHERE department_id = $1 ORDER BY id`,
        [dept.id]
      );
      return {
        name:        dept.name,
        totalBudget: Number(dept.total_budget),
        committed:   Number(dept.committed),
        actual:      Number(dept.actual),
        remaining:   Number(dept.remaining),
        percentUsed: Number(dept.percent_used),
        monthlyData: monthly.map(m => ({
          month:    m.month,
          budgeted: Number(m.budgeted),
          actual:   Number(m.actual),
        })),
      };
    }));
    res.json(result);
  } catch (err) { next(err); }
};

// ── GET /api/capex/department/:name ───────────────────────────────────────────
exports.getDepartment = async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const { rows: [dept] } = await pool.query(
      `SELECT id, name, total_budget, committed, actual,
              (total_budget - committed - actual) AS remaining,
              ROUND((actual / NULLIF(total_budget,0)) * 100) AS percent_used
       FROM capex_departments WHERE LOWER(name) = LOWER($1)`,
      [name]
    );
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    const { rows: monthly } = await pool.query(
      `SELECT month_label AS month, budgeted, actual
       FROM capex_department_monthly WHERE department_id = $1
       ORDER BY id`,
      [dept.id]
    );

    res.json({
      name:        dept.name,
      totalBudget: Number(dept.total_budget),
      committed:   Number(dept.committed),
      actual:      Number(dept.actual),
      remaining:   Number(dept.remaining),
      percentUsed: Number(dept.percent_used),
      monthlyData: monthly.map(m => ({
        month:    m.month,
        budgeted: Number(m.budgeted),
        actual:   Number(m.actual),
      })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/capex/sync-status ────────────────────────────────────────────────
// GSAP stub — returns manual mode until SAP maintenance is complete
exports.getSyncStatus = async (req, res, next) => {
  try {
    const { rows: [row] } = await pool.query('SELECT * FROM gsap_sync_status WHERE id = 1');
    res.json({
      mode:       row?.mode       ?? 'manual',
      source:     row?.source     ?? 'Manual Entry',
      lastSynced: row?.last_synced ?? null,
      status:     row?.mode === 'gsap' ? 'success' : 'manual',
      message:    row?.message    ?? 'GSAP connection pending — SAP undergoing maintenance.',
    });
  } catch (err) { next(err); }
};

// ── GET /api/capex/gsap-data ──────────────────────────────────────────────────
// GSAP stub — reads from gsap_approved_budgets (manually seeded, GSAP will overwrite)
exports.getGsapData = async (req, res, next) => {
  try {
    const [statusResult, budgetsResult] = await Promise.all([
      pool.query('SELECT * FROM gsap_sync_status WHERE id = 1'),
      pool.query(`SELECT wbs_code, description, department, approved_amount, posted_amount, source, updated_at
                  FROM gsap_approved_budgets ORDER BY department, wbs_code`),
    ]);
    const sync = statusResult.rows[0];
    res.json({
      mode:       sync?.mode ?? 'manual',
      lastSynced: sync?.last_synced ?? null,
      status:     sync?.mode === 'gsap' ? 'success' : 'manual',
      source:     sync?.source ?? 'Manual Entry',
      message:    sync?.message ?? 'GSAP connection pending — SAP undergoing maintenance.',
      approvedBudgets: budgetsResult.rows.map(b => ({
        wbsCode:        b.wbs_code,
        description:    b.description,
        department:     b.department,
        approvedAmount: Number(b.approved_amount),
        postedAmount:   Number(b.posted_amount),
        source:         b.source,
      })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/capex/initiations ────────────────────────────────────────────────
exports.getInitiations = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, department, initiator, project_type, estimated_budget,
              priority, status, start_date, end_date, stakeholders, justification, created_at
       FROM capex_initiations ORDER BY created_at DESC`
    );
    res.json(rows.map(mapInitiation));
  } catch (err) { next(err); }
};

// ── POST /api/capex/initiations ───────────────────────────────────────────────
exports.createInitiation = async (req, res, next) => {
  try {
    const { title, department, estimatedBudget, description, initiator, projectType, priority, startDate, endDate, stakeholders, justification } = req.body;
    if (!title || !department || !estimatedBudget) {
      return res.status(400).json({ error: 'title, department, and estimatedBudget are required' });
    }

    const year = new Date().getFullYear();
    const { rows: [{ maxseq }] } = await pool.query(
      `SELECT COALESCE(MAX(NULLIF(split_part(id, '-', 3), '')::int), 0) AS maxseq
       FROM capex_initiations WHERE id LIKE $1`,
      [`CINIT-${year}-%`]
    );
    const seq = String(Number(maxseq) + 1).padStart(3, '0');
    const id  = `CINIT-${year}-${seq}`;

    const { rows: [row] } = await pool.query(
      `INSERT INTO capex_initiations
         (id, title, description, department, initiator, project_type, estimated_budget, priority, status, start_date, end_date, stakeholders, justification, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending Approval',$9,$10,$11,$12,$13)
       RETURNING *`,
      [id, title, description||'', department, initiator||req.user?.full_name||'Unknown', projectType||'New',
       Number(estimatedBudget), priority||'Medium', startDate||null, endDate||null,
       stakeholders||'', justification||'', toUuid(req.user?.id)]
    );
    res.status(201).json(mapInitiation(row));
  } catch (err) { next(err); }
};

// ── GET /api/capex/manual-entries ─────────────────────────────────────────────
exports.getManualEntries = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, entry_type, department, period, amount, description, reference_number, entered_by, entered_at, status
       FROM capex_manual_entries ORDER BY entered_at DESC, id DESC`
    );
    res.json(rows.map(mapManualEntry));
  } catch (err) { next(err); }
};

// ── POST /api/capex/manual-entries ────────────────────────────────────────────
// A manual entry both records the transaction and posts to the department
// financials so the budget dashboards reflect it:
//   Actual         -> department.actual (+ the month's actual)
//   PO Commitment  -> department.committed
//   Budget Adjustment -> department.total_budget
exports.createManualEntry = async (req, res, next) => {
  let client;
  try {
    const { entryType, department, period, amount, description, referenceNumber } = req.body;
    if (!entryType || !department || !amount) {
      return res.status(400).json({ error: 'entryType, department, and amount are required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const year = new Date().getFullYear();
    const { rows: [{ maxseq }] } = await client.query(
      `SELECT COALESCE(MAX(NULLIF(split_part(id, '-', 3), '')::int), 0) AS maxseq
       FROM capex_manual_entries WHERE id LIKE $1`,
      [`ME-${year}-%`]
    );
    const seq = String(Number(maxseq) + 1).padStart(3, '0');
    const id  = `ME-${year}-${seq}`;
    const enteredBy = req.user?.full_name || req.user?.email || 'Unknown';
    const periodValue = period || new Date().toISOString().slice(0, 7);
    const value = Number(amount);

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_manual_entries
         (id, entry_type, department, period, amount, description, reference_number, entered_by, entered_by_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Posted')
       RETURNING *`,
      [id, entryType, department, periodValue,
       value, description||'', referenceNumber||'', enteredBy, toUuid(req.user?.id)]
    );

    // Post to the department financials (case-insensitive match; skip if the
    // department name is not in the CAPEX department master).
    const { rows: [dept] } = await client.query(
      `SELECT id FROM capex_departments WHERE LOWER(name) = LOWER($1)`, [department]
    );
    if (dept) {
      if (entryType === 'Actual') {
        await client.query(`UPDATE capex_departments SET actual = actual + $1, updated_at = NOW() WHERE id = $2`, [value, dept.id]);
        const monthLabel = MONTHS[Number(periodValue.slice(5, 7)) - 1];
        if (monthLabel) {
          await client.query(
            `INSERT INTO capex_department_monthly (department_id, month_label, budgeted, actual)
             VALUES ($1, $2, 0, $3)
             ON CONFLICT (department_id, month_label) DO UPDATE SET actual = capex_department_monthly.actual + EXCLUDED.actual`,
            [dept.id, monthLabel, value]
          );
        }
      } else if (entryType === 'PO Commitment') {
        await client.query(`UPDATE capex_departments SET committed = committed + $1, updated_at = NOW() WHERE id = $2`, [value, dept.id]);
      } else if (entryType === 'Budget Adjustment') {
        await client.query(`UPDATE capex_departments SET total_budget = total_budget + $1, updated_at = NOW() WHERE id = $2`, [value, dept.id]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(mapManualEntry(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

// ── GET /api/capex/budget-uploads  (Admin only) ───────────────────────────────
exports.getBudgetUploads = async (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { rows } = await pool.query(
      `SELECT id, fiscal_year AS "fiscalYear", filename, rows_imported AS "rowsImported",
              uploaded_by AS "uploadedBy", uploaded_at AS "uploadedAt"
       FROM capex_budget_uploads ORDER BY uploaded_at DESC LIMIT 20`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// ── POST /api/capex/budget-upload  (Admin only, multipart CSV) ────────────────
exports.uploadBudget = async (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

  try {
    const { fiscalYear } = req.body;
    if (!fiscalYear || isNaN(Number(fiscalYear))) {
      return res.status(400).json({ error: 'fiscalYear is required' });
    }
    const year = Number(fiscalYear);

    // ── Parse CSV ──────────────────────────────────────────────────────────────
    const lines = req.file.buffer.toString('utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return res.status(400).json({ error: 'CSV has no data rows' });

    const headers = lines[0].split(',').map(h => h.trim());
    const deptIdx  = headers.indexOf('department');
    const wbsIdx   = headers.indexOf('wbs_code');
    const descIdx  = headers.indexOf('description');
    const budgIdx  = headers.indexOf('total_budget');

    if (deptIdx < 0 || budgIdx < 0) {
      return res.status(400).json({ error: 'CSV must have department and total_budget columns' });
    }

    const monthIdxMap = {};
    for (const m of MONTHS) {
      const i = headers.indexOf(m);
      if (i >= 0) monthIdxMap[m] = i;
    }

    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      const entry = {
        department:  cols[deptIdx] || '',
        wbsCode:     wbsIdx >= 0 ? cols[wbsIdx] : '',
        description: descIdx >= 0 ? cols[descIdx] : '',
        totalBudget: parseFloat(cols[budgIdx]) || 0,
        monthly:     {},
      };
      for (const [m, i] of Object.entries(monthIdxMap)) {
        const v = parseFloat(cols[i]);
        if (!isNaN(v)) entry.monthly[m] = v;
      }
      return entry;
    }).filter(r => r.department && r.totalBudget > 0);

    if (rows.length === 0) return res.status(400).json({ error: 'No valid data rows found' });

    const uploader = req.user?.full_name || req.user?.email || 'Unknown';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const row of rows) {
        // Upsert department total budget
        await client.query(
          `INSERT INTO capex_departments (name, total_budget)
           VALUES ($1, $2)
           ON CONFLICT (name) DO UPDATE SET total_budget = EXCLUDED.total_budget, updated_at = NOW()`,
          [row.department, row.totalBudget]
        );

        // Get department id
        const { rows: [dept] } = await client.query(
          'SELECT id FROM capex_departments WHERE LOWER(name) = LOWER($1)', [row.department]
        );

        // Upsert monthly budgeted amounts
        for (const [month, budgeted] of Object.entries(row.monthly)) {
          await client.query(
            `INSERT INTO capex_department_monthly (department_id, month_label, budgeted, actual)
             VALUES ($1, $2, $3, 0)
             ON CONFLICT (department_id, month_label) DO UPDATE SET budgeted = EXCLUDED.budgeted`,
            [dept.id, month, budgeted]
          );
        }

        // Upsert WBS / gsap_approved_budgets
        if (row.wbsCode) {
          await client.query(
            `INSERT INTO gsap_approved_budgets (wbs_code, description, department, approved_amount, posted_amount, source)
             VALUES ($1, $2, $3, $4, 0, 'upload')
             ON CONFLICT (wbs_code) DO UPDATE
               SET description = EXCLUDED.description,
                   department = EXCLUDED.department,
                   approved_amount = EXCLUDED.approved_amount,
                   source = 'upload',
                   updated_at = NOW()`,
            [row.wbsCode, row.description || row.department, row.department, row.totalBudget]
          );
        }
      }

      // Record upload history
      await client.query(
        `INSERT INTO capex_budget_uploads (fiscal_year, filename, rows_imported, uploaded_by)
         VALUES ($1, $2, $3, $4)`,
        [year, req.file.originalname, rows.length, uploader]
      );

      await client.query('COMMIT');
      res.status(201).json({
        message:      `Imported ${rows.length} department budget row${rows.length !== 1 ? 's' : ''} for FY ${year}`,
        rowsImported: rows.length,
        fiscalYear:   year,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
};

// ── Mappers ───────────────────────────────────────────────────────────────────
// CAPEX request workflow endpoints.
exports.getRequests = async (req, res, next) => {
  try {
    // ?status= accepts comma-separated canonical or legacy status names.
    const statuses = typeof req.query.status === 'string' && req.query.status.trim()
      ? req.query.status.split(',').map(s => canonicalStatus(s.trim())).filter(Boolean)
      : null;
    const { rows } = await pool.query(
      `SELECT r.*,
              COUNT(q.id)::int AS quote_count,
              COALESCE(AVG(q.quote_value),0) AS average_quote,
              s.approver_role AS current_approver_role,
              s.label AS current_step_label
       FROM capex_requests r
       LEFT JOIN capex_supplier_quotations q ON q.request_id = r.id
       LEFT JOIN capex_approval_steps s ON s.id = r.current_step_id
       WHERE ($1::text[] IS NULL OR r.status = ANY($1))
       GROUP BY r.id, s.approver_role, s.label
       ORDER BY r.created_at DESC`,
      [statuses]
    );
    res.json(rows.map(mapCapexRequestSummary));
  } catch (err) { next(err); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const { rows: [request] } = await pool.query(`SELECT * FROM capex_requests WHERE id = $1`, [req.params.id]);
    if (!request) return res.status(404).json({ error: 'CAPEX request not found' });
    await syncCapexApprovalDecisionGate(pool, request, userName(req));

    const [quotes, steps, actions, procurement, milestones, closure, attachments, auc, capitalization, poClosure, checklist, benefits, risks, alerts, moa, docVersions, signatures, variations, procurementPerformance, gates] = await Promise.all([
      pool.query(`SELECT * FROM capex_supplier_quotations WHERE request_id = $1 ORDER BY id`, [request.id]),
      pool.query(`SELECT * FROM capex_approval_steps WHERE request_id = $1 ORDER BY step_order`, [request.id]),
      pool.query(`SELECT * FROM capex_approval_actions WHERE request_id = $1 ORDER BY created_at, id`, [request.id]),
      pool.query(`SELECT * FROM capex_procurement_tracking WHERE request_id = $1`, [request.id]),
      pool.query(`SELECT * FROM capex_project_milestones WHERE request_id = $1 ORDER BY id`, [request.id]),
      pool.query(`SELECT * FROM capex_financial_closure WHERE request_id = $1`, [request.id]),
      pool.query(`SELECT * FROM capex_attachments WHERE request_id = $1 ORDER BY uploaded_at, id`, [request.id]),
      pool.query(`SELECT * FROM capex_auc_tracking WHERE request_id = $1`, [request.id]),
      pool.query(`SELECT * FROM capex_capitalization_tracking WHERE request_id = $1`, [request.id]),
      pool.query(`SELECT * FROM capex_po_closure_tracking WHERE request_id = $1`, [request.id]),
      pool.query(`SELECT * FROM capex_closure_checklist_items WHERE request_id = $1 ORDER BY id`, [request.id]),
      pool.query(`SELECT * FROM capex_benefit_reviews WHERE request_id = $1 ORDER BY review_period_months`, [request.id]),
      pool.query(`SELECT * FROM capex_risks WHERE request_id = $1 ORDER BY created_at DESC, id DESC`, [request.id]),
      pool.query(`SELECT * FROM capex_governance_alerts WHERE request_id = $1 ORDER BY triggered_at DESC, id DESC`, [request.id]),
      pool.query(`SELECT * FROM capex_moa_records WHERE request_id = $1 ORDER BY created_at DESC, id DESC`, [request.id]),
      pool.query(`SELECT * FROM capex_document_versions WHERE request_id = $1 ORDER BY uploaded_at DESC, id DESC`, [request.id]),
      pool.query(`SELECT * FROM capex_electronic_signatures WHERE request_id = $1 ORDER BY signed_at DESC, id DESC`, [request.id]),
      pool.query(`SELECT * FROM capex_budget_variations WHERE request_id = $1 ORDER BY requested_at DESC, id DESC`, [request.id]),
      pool.query(`SELECT * FROM capex_procurement_performance WHERE request_id = $1`, [request.id]),
      pool.query(`SELECT * FROM capex_decision_gate_reviews WHERE request_id = $1 ORDER BY id`, [request.id]),
    ]);

    res.json({
      ...mapCapexRequest(request),
      quotations: quotes.rows.map(mapCapexQuotation),
      approvalSteps: steps.rows.map(mapCapexApprovalStep),
      approvalActions: actions.rows.map(mapCapexApprovalAction),
      procurement: procurement.rows[0] ? mapCapexProcurement(procurement.rows[0]) : null,
      milestones: milestones.rows.map(mapCapexMilestone),
      financialClosure: closure.rows[0] ? mapCapexClosure(closure.rows[0]) : null,
      attachments: attachments.rows.map(mapCapexAttachment),
      auc: auc.rows[0] ? mapCapexAuc(auc.rows[0]) : null,
      capitalization: capitalization.rows[0] ? mapCapexCapitalization(capitalization.rows[0]) : null,
      poClosure: poClosure.rows[0] ? mapCapexPoClosure(poClosure.rows[0]) : null,
      closureChecklist: checklist.rows.map(mapCapexClosureChecklistItem),
      benefitReviews: benefits.rows.map(mapCapexBenefitReview),
      risks: risks.rows.map(mapCapexRisk),
      governanceAlerts: alerts.rows.map(mapCapexGovernanceAlert),
      moaRecords: moa.rows.map(mapCapexMoaRecord),
      documentVersions: docVersions.rows.map(mapCapexDocumentVersion),
      electronicSignatures: signatures.rows.map(mapCapexElectronicSignature),
      budgetVariations: variations.rows.map(mapCapexBudgetVariation),
      procurementPerformance: procurementPerformance.rows[0] ? mapCapexProcurementPerformance(procurementPerformance.rows[0]) : null,
      decisionGates: gates.rows.map(mapCapexDecisionGate).map(gate => decorateDecisionGateForUser(gate, request, req.user)),
    });
  } catch (err) { next(err); }
};

exports.createRequest = async (req, res, next) => {
  let client;
  try {
    const {
      title, department, businessFunction, budgetHolder, financialYear,
      currentCostBudget, estimatedValue, acvPoValue, currency, urgent,
      scopeDetails, frequency, volumePerYear, hsseRisk, workerWelfareRisk,
      paymentTermsAgreed, paymentTerms, fewerThan3Justification, savings, roi,
      quotations = [],
    } = req.body;

    if (!title || !department || !estimatedValue || !scopeDetails) {
      return res.status(400).json({ error: 'title, department, estimatedValue, and scopeDetails are required' });
    }
    if (!Array.isArray(quotations) || quotations.length === 0) {
      return res.status(400).json({ error: 'At least one quotation is required' });
    }
    if (quotations.length < 3 && !fewerThan3Justification) {
      return res.status(400).json({ error: 'Justification is required when fewer than 3 quotations are provided' });
    }
    if (!quotations.some(q => q.isSelected)) {
      return res.status(400).json({ error: 'One selected supplier quotation is required' });
    }

    const year = new Date().getFullYear();
    const requesterName = req.user?.full_name || req.user?.email || 'Unknown';

    client = await pool.connect();
    await client.query('BEGIN');
    const thresholds = await getValueThresholds(client);
    const band = calcValueBandWithThresholds(acvPoValue || estimatedValue, thresholds);

    // Numeric max, not lexicographic ORDER BY id (which sorts CAPEX-…-1000
    // before CAPEX-…-999 and would reissue a used number).
    const { rows: [{ maxseq }] } = await client.query(
      `SELECT COALESCE(MAX(NULLIF(split_part(id, '-', 3), '')::int), 0) AS maxseq
       FROM capex_requests WHERE id LIKE $1`,
      [`CAPEX-${year}-%`]
    );
    const seq = String(Number(maxseq) + 1).padStart(3, '0');
    const id = `CAPEX-${year}-${seq}`;

    const { rows: [request] } = await client.query(
      `INSERT INTO capex_requests
       (id, title, requester_name, requester_id, department, business_function, budget_holder,
        financial_year, current_cost_budget, estimated_value, acv_po_value, currency, value_band,
        urgent, scope_details, frequency, volume_per_year, hsse_risk, worker_welfare_risk,
        payment_terms_agreed, payment_terms, fewer_than_3_justification, savings, roi, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'Submitted',NOW())
       RETURNING *`,
      [
        id, title, requesterName, toUuid(req.user?.id), department, businessFunction || department, budgetHolder || '',
        financialYear || year, Number(currentCostBudget || 0), Number(estimatedValue), acvPoValue ? Number(acvPoValue) : null,
        currency || 'OMR', band, !!urgent, scopeDetails, frequency || '', volumePerYear || '',
        hsseRisk || 'Low', workerWelfareRisk || 'Low', !!paymentTermsAgreed, paymentTerms || '',
        fewerThan3Justification || '', savings === undefined || savings === '' ? null : Number(savings), roi || '',
      ]
    );

    for (const q of quotations) {
      await client.query(
        `INSERT INTO capex_supplier_quotations
         (request_id, supplier_name, quote_value, currency, payment_terms, is_selected, attachment_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, q.supplierName, Number(q.quoteValue), q.currency || 'OMR', q.paymentTerms || '', !!q.isSelected, q.attachmentName || '']
      );
    }

    const workflow = await buildConfiguredCapexWorkflow(client, {
      valueBand: band,
      quoteCount: quotations.length,
      hsseRisk: hsseRisk || 'Low',
      workerWelfareRisk: workerWelfareRisk || 'Low',
    });

    let firstStepId = null;
    for (const [index, step] of workflow.entries()) {
      const { rows: [insertedStep] } = await client.query(
        `INSERT INTO capex_approval_steps (request_id, step_order, approver_role, label, status)
         VALUES ($1,$2,$3,$4,'Pending') RETURNING *`,
        [id, index + 1, step.role, step.label]
      );
      if (index === 0) firstStepId = insertedStep.id;
    }

    await client.query(`INSERT INTO capex_procurement_tracking (request_id) VALUES ($1)`, [id]);
    await insertDefaultClosureChecklist(client, id, requesterName);
    await insertDefaultDecisionGates(client, id, requesterName);

    const nextStatus = requestStatusForStep(workflow[0]);
    const { rows: [updated] } = await client.query(
      `UPDATE capex_requests SET current_step_id = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [firstStepId, nextStatus, id]
    );
    await syncCapexApprovalDecisionGate(client, updated, requesterName);
    await addAuditLog(client, id, 'REQUEST_SUBMITTED', `CAPEX request submitted and routed to ${workflow[0]?.role || 'procurement'}.`, requesterName);

    await client.query('COMMIT');
    res.status(201).json(mapCapexRequestSummary({
      ...updated,
      quote_count: quotations.length,
      average_quote: 0,
      current_approver_role: workflow[0]?.role,
      current_step_label: workflow[0]?.label,
    }));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.decideRequest = async (req, res, next) => {
  let client;
  try {
    const { decision, comment } = req.body;
    const valid = ['APPROVED', 'REJECTED', 'RETURNED'];
    if (!valid.includes(decision)) {
      return res.status(400).json({ error: `decision must be one of: ${valid.join(', ')}` });
    }
    if ((decision === 'REJECTED' || decision === 'RETURNED') && !comment) {
      return res.status(400).json({ error: 'comment is required for reject or return' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [request] } = await client.query(
      `SELECT * FROM capex_requests WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [step] } = await client.query(
      `SELECT * FROM capex_approval_steps WHERE id = $1 FOR UPDATE`,
      [request.current_step_id]
    );
    if (!step) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Request has no pending approval step' });
    }

    const roleLookupKeys = workflowRoleLookupKeys(step.approver_role);
    const { rows: cfg } = await client.query(
      `SELECT allowed_user_roles FROM capex_workflow_config
       WHERE approver_role = ANY($1) AND is_active = true
       ORDER BY
         CASE WHEN approver_role = $2 THEN 0 ELSE 1 END,
         cardinality(allowed_user_roles) DESC,
         id
       LIMIT 1`,
      [roleLookupKeys, roleLookupKeys[0]]
    );
    const authority = decisionAuthority(req.user, step, cfg[0]?.allowed_user_roles);
    if (authority === 'denied' || authority === 'unconfigured') {
      await client.query('ROLLBACK');
      const required = (cfg[0]?.allowed_user_roles || []).filter(Boolean);
      return res.status(403).json({
        error: authority === 'unconfigured'
          ? `Approval step '${step.label}' has no authorised user roles configured`
          : `Role '${req.user?.role || 'Unknown'}' is not authorised to decide step '${step.label}'` +
            (required.length ? ` (requires: ${required.join(', ')})` : (step.assigned_to ? ` (assigned to: ${step.assigned_to})` : '')),
      });
    }

    const approverName = req.user?.full_name || req.user?.email || 'Unknown';
    if (authority === 'admin-override') {
      await addAuditLog(client, request.id, 'APPROVAL_OVERRIDE',
        `Admin override: decided step '${step.label}' in place of ${step.approver_role}.`, approverName);
    }
    await client.query(
      `INSERT INTO capex_approval_actions
       (request_id, step_id, approver_name, approver_role, decision, comment)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [request.id, step?.id || null, approverName, req.user?.role || step?.approver_role || 'Unknown', decision, comment || '']
    );

    if (decision === 'REJECTED') {
      if (step) await client.query(`UPDATE capex_approval_steps SET status = 'Rejected', decided_at = NOW() WHERE id = $1`, [step.id]);
      await client.query(`UPDATE capex_requests SET status = 'Rejected', current_step_id = NULL, updated_at = NOW() WHERE id = $1`, [request.id]);
      await addAuditLog(
        client,
        request.id,
        'REQUEST_REJECTED',
        `Step '${step.label}' rejected.${comment ? ` Comment: ${comment}` : ''}`,
        approverName
      );
    } else if (decision === 'RETURNED') {
      if (step) await client.query(`UPDATE capex_approval_steps SET status = 'Returned', decided_at = NOW() WHERE id = $1`, [step.id]);
      await client.query(`UPDATE capex_requests SET status = 'Returned for correction', current_step_id = NULL, updated_at = NOW() WHERE id = $1`, [request.id]);
      await addAuditLog(
        client,
        request.id,
        'REQUEST_RETURNED',
        `Step '${step.label}' returned for correction.${comment ? ` Comment: ${comment}` : ''}`,
        approverName
      );
    } else {
      await client.query(`UPDATE capex_approval_steps SET status = 'Approved', decided_at = NOW() WHERE id = $1`, [step.id]);
      const { rows: steps } = await client.query(
        `SELECT * FROM capex_approval_steps WHERE request_id = $1 ORDER BY step_order`,
        [request.id]
      );
      const open = nextOpenStep(steps);
      await client.query(
        `UPDATE capex_requests SET status = $1, current_step_id = $2, updated_at = NOW() WHERE id = $3`,
        [requestStatusForStep(open), open?.id || null, request.id]
      );
      const { rows: [updatedRequest] } = await client.query(
        `SELECT * FROM capex_requests WHERE id = $1`,
        [request.id]
      );
      await syncCapexApprovalDecisionGate(client, updatedRequest, approverName);
      await addAuditLog(client, request.id, 'APPROVAL_STEP_APPROVED', `${step.approver_role} approved ${step.label}.`, approverName);
    }

    await client.query('COMMIT');
    req.params.id = request.id;
    return exports.getRequestById(req, res, next);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

// ── Step delegation & escalation (PRD-FR-016) ────────────────────────────────
exports.getDelegateCandidates = async (req, res, next) => {
  try {
    const { rows: [request] } = await pool.query(
      `SELECT id, current_step_id FROM capex_requests WHERE id = $1`,
      [req.params.id]
    );
    if (!request) return res.status(404).json({ error: 'CAPEX request not found' });
    if (String(request.current_step_id) !== String(req.params.stepId)) {
      return res.status(409).json({ error: 'Only the current pending step can be delegated' });
    }

    const { rows: [step] } = await pool.query(
      `SELECT * FROM capex_approval_steps WHERE id = $1 AND request_id = $2 AND status = 'Pending'`,
      [req.params.stepId, req.params.id]
    );
    if (!step) return res.status(404).json({ error: 'Pending approval step not found' });

    const roleLookupKeys = workflowRoleLookupKeys(step.approver_role);
    const { rows: cfg } = await pool.query(
      `SELECT allowed_user_roles FROM capex_workflow_config
       WHERE approver_role = ANY($1) AND is_active = true
       ORDER BY
         CASE WHEN approver_role = $2 THEN 0 ELSE 1 END,
         cardinality(allowed_user_roles) DESC,
         id
       LIMIT 1`,
      [roleLookupKeys, roleLookupKeys[0]]
    );
    const allowedRoles = (cfg[0]?.allowed_user_roles || []).filter(Boolean);
    const candidateRoles = allowedRoles.length ? allowedRoles : roleLookupKeys;

    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, department
       FROM som_users
       WHERE is_active = true
         AND role = ANY($1)
         AND id::text <> $2
       ORDER BY full_name, email`,
      [candidateRoles, String(req.user.id)]
    );

    res.json(rows.map(row => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      department: row.department,
    })));
  } catch (err) {
    next(err);
  }
};

exports.delegateStep = async (req, res, next) => {
  let client;
  try {
    const { delegateTo } = req.body;
    if (!delegateTo || !String(delegateTo).trim()) {
      return res.status(400).json({ error: 'delegateTo is required' });
    }
    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    if (String(request.current_step_id) !== String(req.params.stepId)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only the current pending step can be delegated' });
    }
    const { rows: [pendingStep] } = await client.query(
      `SELECT * FROM capex_approval_steps WHERE id = $1 AND request_id = $2 AND status = 'Pending'`,
      [req.params.stepId, req.params.id]
    );
    if (!pendingStep) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending approval step not found' });
    }

    const roleLookupKeys = workflowRoleLookupKeys(pendingStep.approver_role);
    const { rows: cfg } = await client.query(
      `SELECT allowed_user_roles FROM capex_workflow_config
       WHERE approver_role = ANY($1) AND is_active = true
       ORDER BY
         CASE WHEN approver_role = $2 THEN 0 ELSE 1 END,
         cardinality(allowed_user_roles) DESC,
         id
       LIMIT 1`,
      [roleLookupKeys, roleLookupKeys[0]]
    );
    const allowedRoles = (cfg[0]?.allowed_user_roles || []).filter(Boolean);
    const candidateRoles = allowedRoles.length ? allowedRoles : roleLookupKeys;
    const delegateValue = String(delegateTo).trim().toLowerCase();
    const { rows: [delegateUser] } = await client.query(
      `SELECT full_name, email
       FROM som_users
       WHERE is_active = true
         AND role = ANY($1)
         AND (LOWER(email) = $2 OR LOWER(full_name) = $2)
       LIMIT 1`,
      [candidateRoles, delegateValue]
    );
    if (!delegateUser) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Delegate must be an active eligible user for this approval step' });
    }

    const { rows: [step] } = await client.query(
      `UPDATE capex_approval_steps SET assigned_to = $1
       WHERE id = $2 AND request_id = $3
       RETURNING *`,
      [delegateUser.email || delegateUser.full_name, req.params.stepId, req.params.id]
    );
    await addAuditLog(client, req.params.id, 'STEP_DELEGATED',
      `Step '${step.label}' delegated to ${step.assigned_to}.`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexApprovalStep(step));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.escalateStep = async (req, res, next) => {
  let client;
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'reason is required' });
    }
    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    const { rows: [step] } = await client.query(
      `SELECT * FROM capex_approval_steps WHERE id = $1 AND request_id = $2`,
      [req.params.stepId, req.params.id]
    );
    if (!step) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Approval step not found' });
    }
    await client.query(
      `INSERT INTO capex_governance_alerts (request_id, alert_type, severity, message, triggered_at)
       VALUES ($1, 'Approval Escalation', 'Amber', $2, NOW())`,
      [req.params.id, `Step '${step.label}' escalated: ${String(reason).trim()}`]
    );
    await addAuditLog(client, req.params.id, 'STEP_ESCALATED',
      `Step '${step.label}' escalated: ${String(reason).trim()}`, userName(req));
    await client.query('COMMIT');
    res.status(201).json({ escalated: true, stepId: step.id, label: step.label });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

// Requests returned for correction may be edited by their requester (or Admin)
// and resubmitted, which regenerates the approval chain. Legacy rows with a
// NULL requester_id are Admin-only editable.
function canActOnReturnedRequest(req, request) {
  if (req.user?.role === 'Admin') return true;
  const userId = toUuid(req.user?.id);
  return !!(request.requester_id && userId && userId === request.requester_id);
}

exports.updateRequest = async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [request] } = await client.query(
      `SELECT * FROM capex_requests WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    if (!canResubmit(request.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Only requests returned for correction can be edited (current status: ${request.status})` });
    }
    if (!canActOnReturnedRequest(req, request)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the requester or an Admin can edit this request' });
    }

    const b = req.body;
    const quotations = b.quotations;
    if (quotations !== undefined) {
      if (!Array.isArray(quotations) || quotations.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'At least one quotation is required' });
      }
      if (!quotations.some(q => q.isSelected)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'One selected supplier quotation is required' });
      }
      const justification = b.fewerThan3Justification ?? request.fewer_than_3_justification;
      if (quotations.length < 3 && !justification) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Justification is required when fewer than 3 quotations are provided' });
      }
    }

    const num = (v) => (v === undefined || v === '' ? null : Number(v));
    const { rows: [updated] } = await client.query(
      `UPDATE capex_requests SET
         title = COALESCE($1, title),
         department = COALESCE($2, department),
         business_function = COALESCE($3, business_function),
         budget_holder = COALESCE($4, budget_holder),
         current_cost_budget = COALESCE($5, current_cost_budget),
         estimated_value = COALESCE($6, estimated_value),
         acv_po_value = COALESCE($7, acv_po_value),
         urgent = COALESCE($8, urgent),
         scope_details = COALESCE($9, scope_details),
         frequency = COALESCE($10, frequency),
         volume_per_year = COALESCE($11, volume_per_year),
         hsse_risk = COALESCE($12, hsse_risk),
         worker_welfare_risk = COALESCE($13, worker_welfare_risk),
         payment_terms_agreed = COALESCE($14, payment_terms_agreed),
         payment_terms = COALESCE($15, payment_terms),
         fewer_than_3_justification = COALESCE($16, fewer_than_3_justification),
         savings = COALESCE($17, savings),
         roi = COALESCE($18, roi),
         updated_at = NOW()
       WHERE id = $19
       RETURNING *`,
      [
        b.title ?? null, b.department ?? null, b.businessFunction ?? null, b.budgetHolder ?? null,
        num(b.currentCostBudget), num(b.estimatedValue), num(b.acvPoValue),
        b.urgent === undefined ? null : !!b.urgent,
        b.scopeDetails ?? null, b.frequency ?? null, b.volumePerYear ?? null,
        b.hsseRisk ?? null, b.workerWelfareRisk ?? null,
        b.paymentTermsAgreed === undefined ? null : !!b.paymentTermsAgreed,
        b.paymentTerms ?? null, b.fewerThan3Justification ?? null,
        num(b.savings), b.roi ?? null, req.params.id,
      ]
    );

    if (quotations !== undefined) {
      await client.query(`DELETE FROM capex_supplier_quotations WHERE request_id = $1`, [req.params.id]);
      for (const q of quotations) {
        await client.query(
          `INSERT INTO capex_supplier_quotations
           (request_id, supplier_name, quote_value, currency, payment_terms, is_selected, attachment_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.params.id, q.supplierName, Number(q.quoteValue), q.currency || 'OMR', q.paymentTerms || '', !!q.isSelected, q.attachmentName || '']
        );
      }
    }

    await addAuditLog(client, req.params.id, 'REQUEST_EDITED', 'Request edited while returned for correction.', userName(req));
    await client.query('COMMIT');
    req.params.id = updated.id;
    return exports.getRequestById(req, res, next);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.resubmitRequest = async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [request] } = await client.query(
      `SELECT * FROM capex_requests WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    if (!canResubmit(request.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Only requests returned for correction can be resubmitted (current status: ${request.status})` });
    }
    if (!canActOnReturnedRequest(req, request)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the requester or an Admin can resubmit this request' });
    }

    const thresholds = await getValueThresholds(client);
    const band = calcValueBandWithThresholds(request.acv_po_value || request.estimated_value, thresholds);

    // Neutralize any step nextOpenStep() could pick up; keep decided rows as
    // history (capex_approval_actions.step_id references these rows).
    await client.query(
      `UPDATE capex_approval_steps SET status = 'Superseded'
       WHERE request_id = $1 AND status IN ('Pending','Returned')`,
      [req.params.id]
    );

    const { rows: [{ max_order }] } = await client.query(
      `SELECT COALESCE(MAX(step_order), 0) AS max_order FROM capex_approval_steps WHERE request_id = $1`,
      [req.params.id]
    );
    const { rows: [{ quote_count }] } = await client.query(
      `SELECT COUNT(*)::int AS quote_count FROM capex_supplier_quotations WHERE request_id = $1`,
      [req.params.id]
    );

    const workflow = await buildConfiguredCapexWorkflow(client, {
      valueBand: band,
      quoteCount: quote_count,
      hsseRisk: request.hsse_risk,
      workerWelfareRisk: request.worker_welfare_risk,
    });

    let firstStepId = null;
    for (const [index, step] of workflow.entries()) {
      const { rows: [insertedStep] } = await client.query(
        `INSERT INTO capex_approval_steps (request_id, step_order, approver_role, label, status)
         VALUES ($1,$2,$3,$4,'Pending') RETURNING *`,
        [req.params.id, Number(max_order) + index + 1, step.role, step.label]
      );
      if (index === 0) firstStepId = insertedStep.id;
    }

    await client.query(
      `UPDATE capex_requests
       SET value_band = $1, status = $2, current_step_id = $3, submitted_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [band, requestStatusForStep(workflow[0]), firstStepId, req.params.id]
    );
    const { rows: [resubmittedRequest] } = await client.query(
      `SELECT * FROM capex_requests WHERE id = $1`,
      [req.params.id]
    );
    await syncCapexApprovalDecisionGate(client, resubmittedRequest, userName(req));

    await addAuditLog(client, req.params.id, 'REQUEST_RESUBMITTED',
      `Request resubmitted and routed to ${workflow[0]?.role || 'approval'}.`, userName(req));
    await client.query('COMMIT');
    return exports.getRequestById(req, res, next);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.updateProcurement = async (req, res, next) => {
  let client;
  try {
    const requestId = req.params.id;
    const {
      ndaRequired, ndaStatus, ndaCompletionDate,
      dpaRequired, dpaStatus, dpaCompletionDate,
      vendorRegistrationStatus, agreementStatus,
      gsapProjectReference, gsapProjectCreatedAt,
      prNumber, prCreatedAt, prStatus,
      poNumber, poCreatedAt, poValue, poStatus,
      poAttachmentName, poReleasedAfterJobDone,
    } = req.body;

    if (poStatus === 'Uploaded' && !hasPoUploadRequirements({ poNumber, poValue, poAttachmentName })) {
      return res.status(400).json({ error: 'PO number, PO value, and PO attachment are required to mark PO uploaded' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [request] } = await client.query(`SELECT * FROM capex_requests WHERE id = $1 FOR UPDATE`, [requestId]);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    if (!canEditProcurement(request.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Procurement tracking can only be edited after approval completes (current status: ${request.status})`,
      });
    }

    if (poAttachmentName) {
      const { rows: [attachment] } = await client.query(
        `SELECT id
         FROM capex_attachments
         WHERE request_id = $1 AND name = $2`,
        [requestId, poAttachmentName]
      );
      if (!attachment) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'PO attachment must match an uploaded request attachment' });
      }
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_procurement_tracking
       (request_id, nda_required, nda_status, nda_completion_date, dpa_required, dpa_status,
        dpa_completion_date, vendor_registration_status, agreement_status, gsap_project_reference,
        gsap_project_created_at, pr_number, pr_created_at, pr_status, po_number, po_created_at,
        po_value, po_status, po_attachment_name, po_released_after_job_done)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (request_id) DO UPDATE SET
        nda_required = EXCLUDED.nda_required,
        nda_status = EXCLUDED.nda_status,
        nda_completion_date = EXCLUDED.nda_completion_date,
        dpa_required = EXCLUDED.dpa_required,
        dpa_status = EXCLUDED.dpa_status,
        dpa_completion_date = EXCLUDED.dpa_completion_date,
        vendor_registration_status = EXCLUDED.vendor_registration_status,
        agreement_status = EXCLUDED.agreement_status,
        gsap_project_reference = EXCLUDED.gsap_project_reference,
        gsap_project_created_at = EXCLUDED.gsap_project_created_at,
        pr_number = EXCLUDED.pr_number,
        pr_created_at = EXCLUDED.pr_created_at,
        pr_status = EXCLUDED.pr_status,
        po_number = EXCLUDED.po_number,
        po_created_at = EXCLUDED.po_created_at,
        po_value = EXCLUDED.po_value,
        po_status = EXCLUDED.po_status,
        po_attachment_name = EXCLUDED.po_attachment_name,
        po_released_after_job_done = EXCLUDED.po_released_after_job_done,
        updated_at = NOW()
       RETURNING *`,
      [
        requestId, !!ndaRequired, ndaStatus || (ndaRequired ? 'Pending' : 'Not required'), ndaCompletionDate || null,
        !!dpaRequired, dpaStatus || (dpaRequired ? 'Pending' : 'Not required'), dpaCompletionDate || null,
        vendorRegistrationStatus || 'Pending', agreementStatus || 'Pending', gsapProjectReference || '',
        gsapProjectCreatedAt || null, prNumber || '', prCreatedAt || null, prStatus || '',
        poNumber || '', poCreatedAt || null, poValue === '' || poValue === undefined ? null : Number(poValue),
        poStatus || '', poAttachmentName || '', !!poReleasedAfterJobDone,
      ]
    );

    let nextStatus = request.status;
    if (poStatus === 'Uploaded') nextStatus = 'PO uploaded';
    else if (poNumber) nextStatus = 'PO created';
    else if (prNumber) nextStatus = 'PR created';
    else if (gsapProjectReference) nextStatus = 'GSAP project created';
    else if (['Pending', 'Completed'].includes(vendorRegistrationStatus) || ndaRequired || dpaRequired) {
      nextStatus = 'Procurement in progress';
    }

    if (nextStatus !== request.status) {
      await client.query(`UPDATE capex_requests SET status = $1, updated_at = NOW() WHERE id = $2`, [nextStatus, requestId]);
    }
    await addAuditLog(client, requestId, 'PROCUREMENT_UPDATED', `Procurement tracking updated; status is ${nextStatus}.`, userName(req));

    await client.query('COMMIT');
    res.json(mapCapexProcurement(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.createMilestone = async (req, res, next) => {
  let client;
  try {
    const { stageName, milestoneName, plannedDate, actualDate, paymentPercentage, paymentAmount, completionEvidence, status } = req.body;
    if (!stageName || !milestoneName) {
      return res.status(400).json({ error: 'stageName and milestoneName are required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [request] } = await client.query(`SELECT * FROM capex_requests WHERE id = $1 FOR UPDATE`, [req.params.id]);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    if (!canCreateMilestone(request.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Milestones require the PO document to be uploaded (current status: ${request.status})`,
      });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_project_milestones
       (request_id, stage_name, milestone_name, planned_date, actual_date, payment_percentage,
        payment_amount, completion_evidence, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.params.id, stageName, milestoneName, plannedDate || null, actualDate || null,
        paymentPercentage === '' || paymentPercentage === undefined ? null : Number(paymentPercentage),
        paymentAmount === '' || paymentAmount === undefined ? null : Number(paymentAmount),
        completionEvidence || '', status || (actualDate ? 'Completed' : 'Open'),
      ]
    );

    await client.query(`UPDATE capex_requests SET status = 'In execution', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    await addAuditLog(client, req.params.id, 'MILESTONE_CREATED', `Milestone added: ${milestoneName}.`, userName(req));

    await client.query('COMMIT');
    res.status(201).json(mapCapexMilestone(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.updateMilestone = async (req, res, next) => {
  let client;
  try {
    const { actualDate, paymentPercentage, paymentAmount, completionEvidence, status } = req.body;
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [request] } = await client.query(
      `SELECT status FROM capex_requests WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    if (!canUpdateMilestone(request.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Milestones cannot be updated in status '${request.status}'`,
      });
    }

    const { rows: [row] } = await client.query(
      `UPDATE capex_project_milestones SET
         actual_date = COALESCE($1, actual_date),
         payment_percentage = COALESCE($2, payment_percentage),
         payment_amount = COALESCE($3, payment_amount),
         completion_evidence = COALESCE($4, completion_evidence),
         status = COALESCE($5, status)
       WHERE request_id = $6 AND id = $7
       RETURNING *`,
      [
        actualDate || null,
        paymentPercentage === '' || paymentPercentage === undefined ? null : Number(paymentPercentage),
        paymentAmount === '' || paymentAmount === undefined ? null : Number(paymentAmount),
        completionEvidence || null,
        status || null,
        req.params.id,
        req.params.milestoneId,
      ]
    );
    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Milestone not found' });
    }

    await addAuditLog(client, req.params.id, 'MILESTONE_UPDATED', `Milestone updated: ${row.milestone_name}.`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexMilestone(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.saveFinancialClosure = async (req, res, next) => {
  let client;
  try {
    const { actualSpend, finalRoi, finalSavings, financeComments, capexFormAttachment, closeRequest } = req.body;
    if (closeRequest && (actualSpend === undefined || actualSpend === '' || !capexFormAttachment)) {
      return res.status(400).json({ error: 'Actual spend and CAPEX closure form are required to close request' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [request] } = await client.query(`SELECT * FROM capex_requests WHERE id = $1 FOR UPDATE`, [req.params.id]);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    // Financial closure only applies once the request has cleared the approval
    // chain and entered execution — it must never be reachable mid-approval,
    // where it could jump a Submitted/Pending request straight to closure.
    if (!APPROVED_OR_LATER_STATUSES.includes(canonicalStatus(request.status))) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Financial closure is only available after approval and execution (current status: ${request.status})`,
      });
    }

    if (closeRequest) {
      await insertDefaultClosureChecklist(client, req.params.id, userName(req));

      const { rows: incompleteItems } = await client.query(
        `SELECT label
         FROM capex_closure_checklist_items
         WHERE request_id = $1 AND status <> 'Completed'
         ORDER BY id`,
        [req.params.id]
      );
      if (incompleteItems.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Closure checklist must be completed before closing request',
          incompleteItems: incompleteItems.map(item => item.label),
        });
      }

      const { rows: [poClosure] } = await client.query(
        `SELECT closure_status FROM capex_po_closure_tracking WHERE request_id = $1`,
        [req.params.id]
      );
      if (!poClosure || poClosure.closure_status !== 'Closed') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'PO closure must be marked Closed before closing request' });
      }

      const { rows: [closureAttachment] } = await client.query(
        `SELECT id FROM capex_attachments WHERE request_id = $1 AND name = $2`,
        [req.params.id, capexFormAttachment]
      );
      if (!closureAttachment) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'CAPEX closure form attachment must match an uploaded request attachment' });
      }
    }

    const spend = actualSpend === '' || actualSpend === undefined ? null : Number(actualSpend);
    const variance = spend === null ? null : Number(request.estimated_value || 0) - spend;

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_financial_closure
       (request_id, actual_spend, final_roi, final_savings, variance, finance_comments,
        capex_form_attachment, closed_by, closed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (request_id) DO UPDATE SET
        actual_spend = EXCLUDED.actual_spend,
        final_roi = EXCLUDED.final_roi,
        final_savings = EXCLUDED.final_savings,
        variance = EXCLUDED.variance,
        finance_comments = EXCLUDED.finance_comments,
        capex_form_attachment = EXCLUDED.capex_form_attachment,
        closed_by = EXCLUDED.closed_by,
        closed_at = EXCLUDED.closed_at
       RETURNING *`,
      [
        req.params.id, spend, finalRoi || '',
        finalSavings === '' || finalSavings === undefined ? null : Number(finalSavings),
        variance, financeComments || '', capexFormAttachment || '',
        closeRequest ? userName(req) : null, closeRequest ? new Date() : null,
      ]
    );

    const nextStatus = closeRequest || canonicalStatus(request.status) === 'Closed' ? 'Closed' : 'Pending final closure';
    await client.query(`UPDATE capex_requests SET status = $1, updated_at = NOW() WHERE id = $2`, [nextStatus, req.params.id]);
    await addAuditLog(client, req.params.id, closeRequest ? 'REQUEST_CLOSED' : 'CLOSURE_SAVED', closeRequest ? 'Financial closure completed.' : 'Financial closure draft saved.', userName(req));

    await client.query('COMMIT');
    res.json(mapCapexClosure(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.updateAucTracking = async (req, res, next) => {
  let client;
  try {
    const {
      aucAccount, aucValue, aucStartDate, completionConfirmed, capitalizationReady,
      status, businessOwner, financeOwner, escalationLevel, comments,
    } = req.body;

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_auc_tracking
       (request_id, auc_account, auc_value, auc_start_date, completion_confirmed,
        capitalization_ready, status, business_owner, finance_owner, escalation_level,
        comments, updated_by)
       VALUES ($1,$2,COALESCE($3,0),$4,COALESCE($5,false),COALESCE($6,false),COALESCE($7,'Open'),$8,$9,$10,$11,$12)
       ON CONFLICT (request_id) DO UPDATE SET
        auc_account = COALESCE(EXCLUDED.auc_account, capex_auc_tracking.auc_account),
        auc_value = CASE WHEN $3 IS NULL THEN capex_auc_tracking.auc_value ELSE EXCLUDED.auc_value END,
        auc_start_date = COALESCE(EXCLUDED.auc_start_date, capex_auc_tracking.auc_start_date),
        completion_confirmed = CASE WHEN $5 IS NULL THEN capex_auc_tracking.completion_confirmed ELSE EXCLUDED.completion_confirmed END,
        capitalization_ready = CASE WHEN $6 IS NULL THEN capex_auc_tracking.capitalization_ready ELSE EXCLUDED.capitalization_ready END,
        status = CASE WHEN $7 IS NULL THEN capex_auc_tracking.status ELSE EXCLUDED.status END,
        business_owner = COALESCE(EXCLUDED.business_owner, capex_auc_tracking.business_owner),
        finance_owner = COALESCE(EXCLUDED.finance_owner, capex_auc_tracking.finance_owner),
        escalation_level = COALESCE(EXCLUDED.escalation_level, capex_auc_tracking.escalation_level),
        comments = COALESCE(EXCLUDED.comments, capex_auc_tracking.comments),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
       RETURNING *`,
      [
        req.params.id, aucAccount || null,
        aucValue === undefined || aucValue === '' ? null : Number(aucValue),
        aucStartDate || null,
        completionConfirmed === undefined ? null : !!completionConfirmed,
        capitalizationReady === undefined ? null : !!capitalizationReady,
        status || null, businessOwner || null, financeOwner || null,
        escalationLevel || null, comments || null, userName(req),
      ]
    );

    await addAuditLog(client, req.params.id, 'AUC_UPDATED', `AUC tracking updated; status is ${row.status}.`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexAuc(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.updateCapitalizationTracking = async (req, res, next) => {
  let client;
  try {
    const {
      status, financeVerified, capitalizationRequestDate, assetMasterNumber,
      assetCategory, capitalizedValue, capitalizationApprovalDate,
      fixedAssetRegisteredAt, depreciationStartDate, comments,
    } = req.body;

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_capitalization_tracking
       (request_id, status, finance_verified, capitalization_request_date,
        asset_master_number, asset_category, capitalized_value,
        capitalization_approval_date, fixed_asset_registered_at,
        depreciation_start_date, comments, updated_by)
       VALUES ($1,COALESCE($2,'Not Started'),COALESCE($3,false),$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (request_id) DO UPDATE SET
        status = CASE WHEN $2 IS NULL THEN capex_capitalization_tracking.status ELSE EXCLUDED.status END,
        finance_verified = CASE WHEN $3 IS NULL THEN capex_capitalization_tracking.finance_verified ELSE EXCLUDED.finance_verified END,
        capitalization_request_date = COALESCE(EXCLUDED.capitalization_request_date, capex_capitalization_tracking.capitalization_request_date),
        asset_master_number = COALESCE(EXCLUDED.asset_master_number, capex_capitalization_tracking.asset_master_number),
        asset_category = COALESCE(EXCLUDED.asset_category, capex_capitalization_tracking.asset_category),
        capitalized_value = COALESCE(EXCLUDED.capitalized_value, capex_capitalization_tracking.capitalized_value),
        capitalization_approval_date = COALESCE(EXCLUDED.capitalization_approval_date, capex_capitalization_tracking.capitalization_approval_date),
        fixed_asset_registered_at = COALESCE(EXCLUDED.fixed_asset_registered_at, capex_capitalization_tracking.fixed_asset_registered_at),
        depreciation_start_date = COALESCE(EXCLUDED.depreciation_start_date, capex_capitalization_tracking.depreciation_start_date),
        comments = COALESCE(EXCLUDED.comments, capex_capitalization_tracking.comments),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
       RETURNING *`,
      [
        req.params.id, status || null,
        financeVerified === undefined ? null : !!financeVerified,
        capitalizationRequestDate || null, assetMasterNumber || null,
        assetCategory || null,
        capitalizedValue === undefined || capitalizedValue === '' ? null : Number(capitalizedValue),
        capitalizationApprovalDate || null, fixedAssetRegisteredAt || null,
        depreciationStartDate || null, comments || null, userName(req),
      ]
    );

    await addAuditLog(client, req.params.id, 'CAPITALIZATION_UPDATED', `Capitalization tracking updated; status is ${row.status}.`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexCapitalization(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.updatePoClosureTracking = async (req, res, next) => {
  let client;
  try {
    const {
      finalInvoiceReceived, vendorConfirmationReceived, closureStatus,
      openCommitmentValue, unutilizedCommitment, closureDueDate, closedAt,
      followUpOwner, comments,
    } = req.body;

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_po_closure_tracking
       (request_id, final_invoice_received, vendor_confirmation_received,
        closure_status, open_commitment_value, unutilized_commitment,
        closure_due_date, closed_at, follow_up_owner, comments, updated_by)
       VALUES ($1,COALESCE($2,false),COALESCE($3,false),COALESCE($4,'Open'),COALESCE($5,0),COALESCE($6,0),$7,$8,$9,$10,$11)
       ON CONFLICT (request_id) DO UPDATE SET
        final_invoice_received = CASE WHEN $2 IS NULL THEN capex_po_closure_tracking.final_invoice_received ELSE EXCLUDED.final_invoice_received END,
        vendor_confirmation_received = CASE WHEN $3 IS NULL THEN capex_po_closure_tracking.vendor_confirmation_received ELSE EXCLUDED.vendor_confirmation_received END,
        closure_status = CASE WHEN $4 IS NULL THEN capex_po_closure_tracking.closure_status ELSE EXCLUDED.closure_status END,
        open_commitment_value = CASE WHEN $5 IS NULL THEN capex_po_closure_tracking.open_commitment_value ELSE EXCLUDED.open_commitment_value END,
        unutilized_commitment = CASE WHEN $6 IS NULL THEN capex_po_closure_tracking.unutilized_commitment ELSE EXCLUDED.unutilized_commitment END,
        closure_due_date = COALESCE(EXCLUDED.closure_due_date, capex_po_closure_tracking.closure_due_date),
        closed_at = COALESCE(EXCLUDED.closed_at, capex_po_closure_tracking.closed_at),
        follow_up_owner = COALESCE(EXCLUDED.follow_up_owner, capex_po_closure_tracking.follow_up_owner),
        comments = COALESCE(EXCLUDED.comments, capex_po_closure_tracking.comments),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
       RETURNING *`,
      [
        req.params.id,
        finalInvoiceReceived === undefined ? null : !!finalInvoiceReceived,
        vendorConfirmationReceived === undefined ? null : !!vendorConfirmationReceived,
        closureStatus || null,
        openCommitmentValue === undefined || openCommitmentValue === '' ? null : Number(openCommitmentValue),
        unutilizedCommitment === undefined || unutilizedCommitment === '' ? null : Number(unutilizedCommitment),
        closureDueDate || null, closedAt || null, followUpOwner || null,
        comments || null, userName(req),
      ]
    );

    await addAuditLog(client, req.params.id, 'PO_CLOSURE_UPDATED', `PO closure tracking updated; status is ${row.closure_status}.`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexPoClosure(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.updateClosureChecklistItem = async (req, res, next) => {
  let client;
  try {
    const { status, responsibleOwner, dueDate, evidenceAttachment, comments } = req.body;
    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    await insertDefaultClosureChecklist(client, req.params.id, userName(req));

    const { rows: [row] } = await client.query(
      `UPDATE capex_closure_checklist_items SET
        status = COALESCE($1, status),
        responsible_owner = COALESCE($2, responsible_owner),
        due_date = COALESCE($3, due_date),
        evidence_attachment = COALESCE($4, evidence_attachment),
        comments = COALESCE($5, comments),
        completed_at = CASE WHEN COALESCE($1, status) = 'Completed' THEN COALESCE(completed_at, NOW()) ELSE NULL END,
        updated_by = $6,
        updated_at = NOW()
       WHERE request_id = $7 AND id = $8
       RETURNING *`,
      [status || null, responsibleOwner || null, dueDate || null, evidenceAttachment || null, comments || null, userName(req), req.params.id, req.params.itemId]
    );
    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Closure checklist item not found' });
    }

    await addAuditLog(client, req.params.id, 'CLOSURE_CHECKLIST_UPDATED', `Closure checklist updated: ${row.label}.`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexClosureChecklistItem(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.saveBenefitReview = async (req, res, next) => {
  let client;
  try {
    const {
      reviewPeriodMonths, plannedRoi, actualRoi, plannedSavings,
      actualSavings, benefitScore, status, reviewedAt, reviewer, comments,
    } = req.body;
    if (![6, 12, 24].includes(Number(reviewPeriodMonths))) {
      return res.status(400).json({ error: 'reviewPeriodMonths must be one of 6, 12, or 24' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_benefit_reviews
       (request_id, review_period_months, planned_roi, actual_roi, planned_savings,
        actual_savings, benefit_score, status, reviewed_at, reviewer, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (request_id, review_period_months) DO UPDATE SET
        planned_roi = EXCLUDED.planned_roi,
        actual_roi = EXCLUDED.actual_roi,
        planned_savings = EXCLUDED.planned_savings,
        actual_savings = EXCLUDED.actual_savings,
        benefit_score = EXCLUDED.benefit_score,
        status = EXCLUDED.status,
        reviewed_at = EXCLUDED.reviewed_at,
        reviewer = EXCLUDED.reviewer,
        comments = EXCLUDED.comments,
        updated_at = NOW()
       RETURNING *`,
      [
        req.params.id, Number(reviewPeriodMonths),
        plannedRoi === undefined || plannedRoi === '' ? null : Number(plannedRoi),
        actualRoi === undefined || actualRoi === '' ? null : Number(actualRoi),
        plannedSavings === undefined || plannedSavings === '' ? null : Number(plannedSavings),
        actualSavings === undefined || actualSavings === '' ? null : Number(actualSavings),
        benefitScore === undefined || benefitScore === '' ? null : Number(benefitScore),
        status || 'Planned', reviewedAt || null, reviewer || userName(req), comments || '',
      ]
    );

    await addAuditLog(client, req.params.id, 'BENEFIT_REVIEW_UPDATED', `${reviewPeriodMonths}-month benefit review updated.`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexBenefitReview(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.createRisk = async (req, res, next) => {
  let client;
  try {
    const { category, title, severity, probability, impact, mitigationPlan, owner, dueDate, status } = req.body;
    if (!category || !title) return res.status(400).json({ error: 'category and title are required' });

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_risks
       (request_id, category, title, severity, probability, impact, mitigation_plan,
        owner, due_date, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.params.id, category, title, severity || 'Amber', probability || '',
        impact || '', mitigationPlan || '', owner || '', dueDate || null,
        status || 'Open', userName(req),
      ]
    );

    await addAuditLog(client, req.params.id, 'RISK_CREATED', `Risk created: ${title}.`, userName(req));
    await client.query('COMMIT');
    res.status(201).json(mapCapexRisk(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.updateRisk = async (req, res, next) => {
  let client;
  try {
    const { category, title, severity, probability, impact, mitigationPlan, owner, dueDate, status } = req.body;
    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `UPDATE capex_risks SET
        category = COALESCE($1, category),
        title = COALESCE($2, title),
        severity = COALESCE($3, severity),
        probability = COALESCE($4, probability),
        impact = COALESCE($5, impact),
        mitigation_plan = COALESCE($6, mitigation_plan),
        owner = COALESCE($7, owner),
        due_date = COALESCE($8, due_date),
        status = COALESCE($9, status),
        closed_at = CASE WHEN COALESCE($9, status) = 'Closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END,
        updated_at = NOW()
       WHERE request_id = $10 AND id = $11
       RETURNING *`,
      [category || null, title || null, severity || null, probability || null, impact || null, mitigationPlan || null, owner || null, dueDate || null, status || null, req.params.id, req.params.riskId]
    );
    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Risk not found' });
    }

    await addAuditLog(client, req.params.id, 'RISK_UPDATED', `Risk updated: ${row.title}.`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexRisk(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.getProcessReferenceData = async (req, res, next) => {
  try {
    const [businessUnits, projectTypes, escalationPolicies] = await Promise.all([
      pool.query(`SELECT id, name, is_active FROM capex_reference_business_units ORDER BY name`),
      pool.query(`SELECT id, type_name, example, is_active FROM capex_reference_project_types ORDER BY type_name`),
      pool.query(`SELECT * FROM capex_escalation_policy WHERE is_active = true ORDER BY id`),
    ]);
    const thresholds = await getValueThresholds();
    const [lowRoute, mediumRoute, highRoute] = await Promise.all([
      approvalRouteForBandFromConfig(pool, 'LOW'),
      approvalRouteForBandFromConfig(pool, 'MEDIUM'),
      approvalRouteForBandFromConfig(pool, 'HIGH'),
    ]);
    res.json({
      businessUnits: businessUnits.rows.map(r => ({ id: r.id, name: r.name, isActive: r.is_active })),
      projectTypes: projectTypes.rows.map(r => ({ id: r.id, typeName: r.type_name, example: r.example, isActive: r.is_active })),
      escalationPolicies: escalationPolicies.rows.map(mapCapexEscalationPolicy),
      decisionGates: DEFAULT_DECISION_GATES.map(([gateKey, gateName]) => ({ gateKey, gateName })),
      approvalRoutes: [
        { valueBand: 'LOW', range: `<= OMR ${thresholds.lowMax.toLocaleString()}`, route: lowRoute || approvalRouteForBand('LOW') },
        { valueBand: 'MEDIUM', range: `> OMR ${thresholds.lowMax.toLocaleString()} and <= OMR ${thresholds.mediumMax.toLocaleString()}`, route: mediumRoute || approvalRouteForBand('MEDIUM') },
        { valueBand: 'HIGH', range: `> OMR ${thresholds.mediumMax.toLocaleString()}`, route: highRoute || approvalRouteForBand('HIGH') },
      ],
    });
  } catch (err) { next(err); }
};

exports.createBudgetVariation = async (req, res, next) => {
  let client;
  try {
    const {
      variationType, originalBudget, revisedBudget, justification,
      financialImpactAnalysis, fibReviewStatus,
    } = req.body;
    if (originalBudget === undefined || revisedBudget === undefined || !justification) {
      return res.status(400).json({ error: 'originalBudget, revisedBudget, and justification are required' });
    }

    const original = Number(originalBudget);
    const revised = Number(revisedBudget);
    const amount = revised - original;
    const percent = original ? (amount / original) * 100 : 0;
    const moaRequired = Math.abs(percent) > 10;

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    // Variations always start Pending: approval happens through the separate
    // decision endpoint, never in the create call (no self-approval).
    const { rows: [row] } = await client.query(
      `INSERT INTO capex_budget_variations
       (request_id, variation_type, original_budget, revised_budget, variation_amount,
        variation_percent, justification, financial_impact_analysis, fib_review_status,
        moa_approval_required, approval_status, requested_by, requested_by_id, approved_by, approved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending',$11,$12,NULL,NULL)
       RETURNING *`,
      [
        req.params.id, variationType || 'Variation', original, revised, amount,
        percent, justification, financialImpactAnalysis || '', fibReviewStatus || 'Pending',
        moaRequired, userName(req), toUuid(req.user?.id),
      ]
    );
    await addAuditLog(client, req.params.id, 'BUDGET_VARIATION_CREATED', `Budget variation requested: ${row.variation_percent}%.`, userName(req));
    await client.query('COMMIT');
    res.status(201).json(mapCapexBudgetVariation(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.decideBudgetVariation = async (req, res, next) => {
  let client;
  try {
    const { decision, comment } = req.body;
    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'Approved' or 'Rejected'" });
    }
    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    const { rows: [variation] } = await client.query(
      `SELECT * FROM capex_budget_variations WHERE id = $1 AND request_id = $2 FOR UPDATE`,
      [req.params.variationId, req.params.id]
    );
    if (!variation) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Budget variation not found' });
    }
    if (variation.approval_status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Variation is already ${variation.approval_status}` });
    }
    // Compare by identity where recorded (falling back to name for pre-migration
    // rows). Admins may override.
    const userId = toUuid(req.user?.id);
    const isRequester = variation.requested_by_id
      ? (!!userId && userId === variation.requested_by_id)
      : variation.requested_by === userName(req);
    if (isRequester && req.user?.role !== 'Admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'A variation cannot be decided by its requester' });
    }

    const { rows: [row] } = await client.query(
      `UPDATE capex_budget_variations
       SET approval_status = $1, approved_by = $2, approved_at = NOW()
       WHERE id = $3 RETURNING *`,
      [decision, userName(req), variation.id]
    );
    await addAuditLog(client, req.params.id, 'BUDGET_VARIATION_DECIDED',
      `Budget variation ${decision.toLowerCase()} (${row.variation_percent}%).${comment ? ` Comment: ${comment}` : ''}`, userName(req));
    await client.query('COMMIT');
    res.json(mapCapexBudgetVariation(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.saveProcurementPerformance = async (req, res, next) => {
  let client;
  try {
    const {
      rfqIssuedAt, tenderStartedAt, tenderCompletedAt, vendorResponseCount,
      invitedVendorCount, awardedValue, budgetEstimate, poProcessingDays, cpOwner,
    } = req.body;
    const estimate = budgetEstimate === undefined || budgetEstimate === '' ? null : Number(budgetEstimate);
    const award = awardedValue === undefined || awardedValue === '' ? null : Number(awardedValue);
    const savings = estimate === null || award === null ? null : estimate - award;

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_procurement_performance
       (request_id, rfq_issued_at, tender_started_at, tender_completed_at,
        vendor_response_count, invited_vendor_count, awarded_value,
        budget_estimate, procurement_savings, po_processing_days, cp_owner, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (request_id) DO UPDATE SET
        rfq_issued_at = EXCLUDED.rfq_issued_at,
        tender_started_at = EXCLUDED.tender_started_at,
        tender_completed_at = EXCLUDED.tender_completed_at,
        vendor_response_count = EXCLUDED.vendor_response_count,
        invited_vendor_count = EXCLUDED.invited_vendor_count,
        awarded_value = EXCLUDED.awarded_value,
        budget_estimate = EXCLUDED.budget_estimate,
        procurement_savings = EXCLUDED.procurement_savings,
        po_processing_days = EXCLUDED.po_processing_days,
        cp_owner = EXCLUDED.cp_owner,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
       RETURNING *`,
      [
        req.params.id, rfqIssuedAt || null, tenderStartedAt || null, tenderCompletedAt || null,
        Number(vendorResponseCount || 0), Number(invitedVendorCount || 0), award,
        estimate, savings, poProcessingDays === undefined || poProcessingDays === '' ? null : Number(poProcessingDays),
        cpOwner || '', userName(req),
      ]
    );
    await addAuditLog(client, req.params.id, 'PROCUREMENT_PERFORMANCE_UPDATED', 'Procurement performance metrics updated.', userName(req));
    await client.query('COMMIT');
    res.json(mapCapexProcurementPerformance(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.updateDecisionGate = async (req, res, next) => {
  let client;
  try {
    const { status, comments, evidence } = req.body;
    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }
    await insertDefaultDecisionGates(client, req.params.id, userName(req));
    const rule = gateRule(req.params.gateKey);
    if (rule.autoManaged) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `${rule.ownerLabel} is updated automatically by the workflow` });
    }
    if (!canUserReviewDecisionGate(req.user, req.params.gateKey)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: `${rule.ownerLabel} owns this decision gate` });
    }

    const { rows: [row] } = await client.query(
      `UPDATE capex_decision_gate_reviews SET
         status = COALESCE($1, status),
         reviewer = COALESCE($2, reviewer),
         reviewed_at = CASE WHEN COALESCE($1, status) IN ('Passed','Failed','Waived') THEN NOW() ELSE reviewed_at END,
         comments = COALESCE($3, comments),
         evidence = COALESCE($4, evidence),
         updated_at = NOW()
       WHERE request_id = $5 AND gate_key = $6
       RETURNING *`,
      [status || null, userName(req), comments || null, evidence || null, req.params.id, req.params.gateKey]
    );
    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Decision gate not found' });
    }
    await addAuditLog(client, req.params.id, 'DECISION_GATE_UPDATED', `${row.gate_name} marked ${row.status}.`, userName(req));
    await client.query('COMMIT');
    res.json(decorateDecisionGateForUser(mapCapexDecisionGate(row), request, req.user));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.getMoaRecords = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*,
              COALESCE(json_agg(json_build_object(
                'id', r.id,
                'revisionNumber', r.revision_number,
                'changeSummary', r.change_summary,
                'revisedBy', r.revised_by,
                'revisedAt', r.revised_at,
                'attachmentId', r.attachment_id
              ) ORDER BY r.revision_number) FILTER (WHERE r.id IS NOT NULL), '[]') AS revisions
       FROM capex_moa_records m
       LEFT JOIN capex_moa_revisions r ON r.moa_id = m.id
       GROUP BY m.id
       ORDER BY m.created_at DESC, m.id DESC`
    );
    res.json(rows.map(mapCapexMoaRecord));
  } catch (err) { next(err); }
};

exports.saveMoaRecord = async (req, res, next) => {
  let client;
  try {
    const {
      moaNumber, title, approvalAuthority, approvalRoute, approvalStatus,
      projectValue, effectiveDate, expiryDate, renewalRequired,
      attachmentId, matrixViolationReason,
    } = req.body;
    if (!moaNumber || !title || !approvalAuthority) {
      return res.status(400).json({ error: 'moaNumber, title, and approvalAuthority are required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const thresholds = await getValueThresholds(client);
    const value = projectValue === undefined || projectValue === '' ? Number(request.acv_po_value || request.estimated_value || 0) : Number(projectValue);
    const valueBand = calcValueBandWithThresholds(value, thresholds);
    const expectedRoute = (await approvalRouteForBandFromConfig(client, valueBand)) || approvalRouteForBand(valueBand);
    const route = approvalRoute || expectedRoute;
    const matrixValidated = route === expectedRoute && !matrixViolationReason;

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_moa_records
       (request_id, moa_number, title, approval_authority, approval_route,
        approval_status, project_value, value_band, matrix_validated,
        matrix_violation_reason, effective_date, expiry_date, renewal_required,
        attachment_id, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
       ON CONFLICT (request_id, moa_number) DO UPDATE SET
        title = EXCLUDED.title,
        approval_authority = EXCLUDED.approval_authority,
        approval_route = EXCLUDED.approval_route,
        approval_status = EXCLUDED.approval_status,
        project_value = EXCLUDED.project_value,
        value_band = EXCLUDED.value_band,
        matrix_validated = EXCLUDED.matrix_validated,
        matrix_violation_reason = EXCLUDED.matrix_violation_reason,
        effective_date = EXCLUDED.effective_date,
        expiry_date = EXCLUDED.expiry_date,
        renewal_required = EXCLUDED.renewal_required,
        attachment_id = EXCLUDED.attachment_id,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
       RETURNING *`,
      [
        req.params.id, moaNumber, title, approvalAuthority, route,
        approvalStatus || 'Draft', value, valueBand, matrixValidated,
        matrixViolationReason || (matrixValidated ? null : `Expected route: ${expectedRoute}`),
        effectiveDate || null, expiryDate || null, !!renewalRequired,
        attachmentId || null, userName(req),
      ]
    );

    await addAuditLog(client, req.params.id, 'MOA_UPDATED', `MOA record saved: ${row.moa_number}.`, userName(req));
    await client.query('COMMIT');
    res.status(201).json(mapCapexMoaRecord(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.addMoaRevision = async (req, res, next) => {
  let client;
  try {
    const { changeSummary, attachmentId } = req.body;
    if (!changeSummary) return res.status(400).json({ error: 'changeSummary is required' });

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [moa] } = await client.query(
      `SELECT * FROM capex_moa_records WHERE id = $1 AND request_id = $2 FOR UPDATE`,
      [req.params.moaId, req.params.id]
    );
    if (!moa) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'MOA record not found' });
    }

    const { rows: [last] } = await client.query(
      `SELECT COALESCE(MAX(revision_number),0) AS max_revision FROM capex_moa_revisions WHERE moa_id = $1`,
      [moa.id]
    );
    const revisionNumber = Number(last.max_revision || 0) + 1;
    const { rows: [row] } = await client.query(
      `INSERT INTO capex_moa_revisions
       (moa_id, revision_number, change_summary, revised_by, attachment_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [moa.id, revisionNumber, changeSummary, userName(req), attachmentId || null]
    );

    await client.query(`UPDATE capex_moa_records SET updated_by = $1, updated_at = NOW() WHERE id = $2`, [userName(req), moa.id]);
    await addAuditLog(client, req.params.id, 'MOA_REVISION_ADDED', `MOA revision ${revisionNumber} added for ${moa.moa_number}.`, userName(req));
    await client.query('COMMIT');
    res.status(201).json(mapCapexMoaRevision(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.createDocumentVersion = async (req, res, next) => {
  let client;
  try {
    const { attachmentId, documentType, documentName, versionLabel, changelog, retentionUntil } = req.body;
    if (!documentType || !documentName || !versionLabel) {
      return res.status(400).json({ error: 'documentType, documentName, and versionLabel are required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_document_versions
       (request_id, attachment_id, document_type, document_name, version_label,
        changelog, retention_until, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (request_id, document_type, version_label) DO UPDATE SET
        attachment_id = EXCLUDED.attachment_id,
        document_name = EXCLUDED.document_name,
        changelog = EXCLUDED.changelog,
        retention_until = EXCLUDED.retention_until,
        uploaded_by = EXCLUDED.uploaded_by,
        uploaded_at = NOW()
       RETURNING *`,
      [req.params.id, attachmentId || null, documentType, documentName, versionLabel, changelog || '', retentionUntil || null, userName(req)]
    );

    await addAuditLog(client, req.params.id, 'DOCUMENT_VERSIONED', `Document version saved: ${documentName} ${versionLabel}.`, userName(req));
    await client.query('COMMIT');
    res.status(201).json(mapCapexDocumentVersion(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.createElectronicSignature = async (req, res, next) => {
  let client;
  try {
    const { linkedType, linkedId, decision, signatureMethod, comments } = req.body;
    const signerName = userName(req);
    const signerRole = userRole(req);

    client = await pool.connect();
    await client.query('BEGIN');
    const request = await ensureCapexRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CAPEX request not found' });
    }

    const { rows: [row] } = await client.query(
      `INSERT INTO capex_electronic_signatures
       (request_id, linked_type, linked_id, signer_name, signer_role, decision,
        signature_method, comments, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.params.id, linkedType || 'Approval', linkedId || null,
        signerName, signerRole, decision || 'Signed',
        signatureMethod || 'System Attestation', comments || '',
        req.ip || null, req.get?.('user-agent') || null,
      ]
    );

    await addAuditLog(client, req.params.id, 'E_SIGNATURE_CAPTURED', `Electronic signature captured from ${signerName}.`, userName(req));
    await client.query('COMMIT');
    res.status(201).json(mapCapexElectronicSignature(row));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.getReportSchedules = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM capex_report_schedules ORDER BY is_active DESC, next_run_date NULLS LAST, id DESC`
    );
    res.json(rows.map(mapCapexReportSchedule));
  } catch (err) { next(err); }
};

exports.createReportSchedule = async (req, res, next) => {
  try {
    const { reportName, reportType, audience, frequency, format, filters, recipients, nextRunDate, isActive } = req.body;
    if (!reportName || !reportType) return res.status(400).json({ error: 'reportName and reportType are required' });

    const { rows: [row] } = await pool.query(
      `INSERT INTO capex_report_schedules
       (report_name, report_type, audience, frequency, format, filters, recipients,
        next_run_date, is_active, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
       RETURNING *`,
      [
        reportName, reportType, audience || '', frequency || 'Monthly',
        format || 'PDF', JSON.stringify(filters || {}),
        Array.isArray(recipients) ? recipients : [],
        nextRunDate || null, isActive !== false, userName(req),
      ]
    );
    res.status(201).json(mapCapexReportSchedule(row));
  } catch (err) { next(err); }
};

exports.getReportExport = async (req, res, next) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const reportType = req.query.reportType || 'governance';
    const { rows } = await pool.query(
      `SELECT r.id, r.title, r.department, r.business_function, r.status,
              r.estimated_value, p.po_value, fc.actual_spend, a.auc_value,
              c.capitalized_value, po.open_commitment_value,
              COUNT(DISTINCT risk.id)::int AS open_risks,
              COUNT(DISTINCT moa.id)::int AS moa_records
       FROM capex_requests r
       LEFT JOIN capex_procurement_tracking p ON p.request_id = r.id
       LEFT JOIN capex_financial_closure fc ON fc.request_id = r.id
       LEFT JOIN capex_auc_tracking a ON a.request_id = r.id
       LEFT JOIN capex_capitalization_tracking c ON c.request_id = r.id
       LEFT JOIN capex_po_closure_tracking po ON po.request_id = r.id
       LEFT JOIN capex_risks risk ON risk.request_id = r.id AND risk.status <> 'Closed'
       LEFT JOIN capex_moa_records moa ON moa.request_id = r.id
       GROUP BY r.id, p.po_value, fc.actual_spend, a.auc_value, c.capitalized_value, po.open_commitment_value
       ORDER BY r.created_at DESC`
    );

    const exportRows = rows.map(r => ({
      requestId: r.id,
      title: r.title,
      department: r.department,
      businessFunction: r.business_function,
      status: r.status,
      approvedBudget: Number(r.estimated_value || 0),
      committedSpend: r.po_value === null ? 0 : Number(r.po_value),
      actualSpend: r.actual_spend === null ? 0 : Number(r.actual_spend),
      aucValue: r.auc_value === null ? 0 : Number(r.auc_value),
      capitalizedValue: r.capitalized_value === null ? 0 : Number(r.capitalized_value),
      openCommitmentValue: r.open_commitment_value === null ? 0 : Number(r.open_commitment_value),
      openRisks: Number(r.open_risks || 0),
      moaRecords: Number(r.moa_records || 0),
    }));

    if (format === 'csv' || format === 'xlsx') {
      const headers = Object.keys(exportRows[0] || {
        requestId: '', title: '', department: '', businessFunction: '', status: '',
        approvedBudget: '', committedSpend: '', actualSpend: '', aucValue: '',
        capitalizedValue: '', openCommitmentValue: '', openRisks: '', moaRecords: '',
      });
      const body = exportRows.map(row => headers.map(h => csvCell(row[h])).join(','));
      res.setHeader('Content-Type', format === 'xlsx' ? 'text/csv' : 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="capex-${reportType}.${format === 'xlsx' ? 'csv' : 'csv'}"`);
      return res.send([headers.map(csvCell).join(','), ...body].join('\n'));
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/json');
      return res.json({
        reportType,
        format: 'pdf',
        status: 'ready_for_pdf_renderer',
        message: 'PDF export payload is generated; connect a PDF renderer in the frontend or reporting worker.',
        rows: exportRows,
      });
    }

    res.json({ reportType, format: 'json', rows: exportRows });
  } catch (err) { next(err); }
};

exports.getDashboardDrilldown = async (req, res, next) => {
  try {
    const type = String(req.query.type || 'portfolio');
    const department = req.query.department || null;
    const params = [];
    let where = '';
    if (department) {
      params.push(department);
      where = `WHERE LOWER(r.department) = LOWER($${params.length})`;
    }

    const queries = {
      businessUnit:
        `SELECT r.department,
                COUNT(*)::int AS projects,
                COALESCE(SUM(r.estimated_value),0) AS approved_budget,
                COALESCE(SUM(p.po_value),0) AS commitments,
                COALESCE(SUM(fc.actual_spend),0) AS actual_spend,
                COUNT(*) FILTER (
                  WHERE r.status = 'Delayed'
                     OR EXISTS (
                       SELECT 1 FROM capex_project_milestones m
                       WHERE m.request_id = r.id AND m.status <> 'Completed'
                         AND m.planned_date < CURRENT_DATE - INTERVAL '30 days')
                )::int AS delayed_projects
         FROM capex_requests r
         LEFT JOIN capex_procurement_tracking p ON p.request_id = r.id
         LEFT JOIN capex_financial_closure fc ON fc.request_id = r.id
         ${where}
         GROUP BY r.department
         ORDER BY r.department`,
      aucAging:
        `SELECT r.id, r.title, r.department, a.auc_value, a.auc_start_date, a.status,
                CASE
                  WHEN a.auc_start_date <= CURRENT_DATE - INTERVAL '180 days' THEN '>180'
                  WHEN a.auc_start_date <= CURRENT_DATE - INTERVAL '90 days' THEN '90-180'
                  ELSE '<90'
                END AS aging_bucket
         FROM capex_auc_tracking a
         JOIN capex_requests r ON r.id = a.request_id
         ${where}
         ORDER BY a.auc_start_date NULLS LAST`,
      moaCompliance:
        `SELECT r.id, r.title, r.department, m.moa_number, m.approval_status,
                m.matrix_validated, m.expiry_date, m.renewal_required,
                m.matrix_violation_reason
         FROM capex_moa_records m
         JOIN capex_requests r ON r.id = m.request_id
         ${where}
         ORDER BY m.expiry_date NULLS LAST, m.id DESC`,
      risks:
        `SELECT r.id AS request_id, r.title AS project_title, r.department,
                risk.id, risk.category, risk.title, risk.severity, risk.status, risk.owner, risk.due_date
         FROM capex_risks risk
         JOIN capex_requests r ON r.id = risk.request_id
         ${where}
         ORDER BY CASE risk.severity WHEN 'Red' THEN 1 WHEN 'Amber' THEN 2 ELSE 3 END, risk.due_date NULLS LAST`,
      variations:
        `SELECT r.id AS request_id, r.title, r.department, v.variation_type,
                v.original_budget, v.revised_budget, v.variation_amount,
                v.variation_percent, v.moa_approval_required, v.approval_status
         FROM capex_budget_variations v
         JOIN capex_requests r ON r.id = v.request_id
         ${where}
         ORDER BY v.requested_at DESC`,
      procurementPerformance:
        `SELECT r.id AS request_id, r.title, r.department, pp.rfq_issued_at,
                pp.tender_started_at, pp.tender_completed_at, pp.vendor_response_count,
                pp.invited_vendor_count, pp.procurement_savings, pp.po_processing_days, pp.cp_owner
         FROM capex_procurement_performance pp
         JOIN capex_requests r ON r.id = pp.request_id
         ${where}
         ORDER BY pp.updated_at DESC`,
      decisionGates:
        `SELECT r.id AS request_id, r.title, r.department, g.gate_key,
                g.gate_name, g.status, g.reviewer, g.reviewed_at
         FROM capex_decision_gate_reviews g
         JOIN capex_requests r ON r.id = g.request_id
         ${where}
         ORDER BY r.id, g.id`,
    };

    const sql = queries[type] || queries.businessUnit;
    const { rows } = await pool.query(sql, params);
    res.json({ type: queries[type] ? type : 'businessUnit', rows: rows.map(mapDrilldownRow) });
  } catch (err) { next(err); }
};

exports.getGovernanceDashboard = async (req, res, next) => {
  try {
    const [
      portfolio, delivery, auc, capitalization, poClosure,
      checklist, benefits, risks, moaCompliance, documentControls,
      scheduledReports, variations, procurementPerformance, decisionGates, alerts, storedAlerts,
    ] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*)::int AS total_projects,
          COUNT(*) FILTER (WHERE status NOT IN ('Closed','Rejected','Cancelled'))::int AS active_projects,
          COUNT(*) FILTER (
            WHERE status = 'Delayed'
               OR EXISTS (
                 SELECT 1 FROM capex_project_milestones m
                 WHERE m.request_id = r.id AND m.status <> 'Completed'
                   AND m.planned_date < CURRENT_DATE - INTERVAL '30 days')
          )::int AS delayed_projects,
          COUNT(*) FILTER (WHERE status = 'Closed')::int AS closed_projects,
          -- Approved budget counts only requests that have cleared approval.
          COALESCE(SUM(estimated_value) FILTER (WHERE status = ANY($1)),0) AS approved_budget,
          COALESCE(SUM(fc.actual_spend),0) AS actual_spend,
          -- Committed spend excludes POs that have already been closed.
          COALESCE(SUM(p.po_value) FILTER (WHERE COALESCE(pc.closure_status,'Open') <> 'Closed'),0) AS committed_spend,
          COALESCE(SUM(COALESCE(fc.actual_spend, p.po_value, estimated_value) ) FILTER (WHERE status = ANY($1)),0) AS forecast_spend
         FROM capex_requests r
         LEFT JOIN capex_procurement_tracking p ON p.request_id = r.id
         LEFT JOIN capex_po_closure_tracking pc ON pc.request_id = r.id
         LEFT JOIN capex_financial_closure fc ON fc.request_id = r.id`,
        [APPROVED_OR_LATER_STATUSES]
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS milestones,
          COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_milestones,
          COUNT(*) FILTER (WHERE planned_date < CURRENT_DATE AND status <> 'Completed')::int AS delayed_milestones
         FROM capex_project_milestones`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS open_auc_projects,
          COALESCE(SUM(auc_value),0) AS total_auc_value,
          COUNT(*) FILTER (WHERE auc_start_date <= CURRENT_DATE - INTERVAL '90 days')::int AS aged_over_90,
          COUNT(*) FILTER (WHERE auc_start_date <= CURRENT_DATE - INTERVAL '180 days')::int AS aged_over_180,
          COUNT(*) FILTER (WHERE capitalization_ready = true)::int AS capitalization_ready
         FROM capex_auc_tracking
         WHERE status <> 'Capitalized'`
      ),
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE status IN ('Ready','Pending Approval','In Progress'))::int AS pending_capitalizations,
          COALESCE(SUM(capitalized_value),0) AS capitalized_value,
          COUNT(*) FILTER (WHERE fixed_asset_registered_at IS NOT NULL)::int AS capitalized_projects,
          COUNT(*) FILTER (WHERE capitalization_request_date <= CURRENT_DATE - INTERVAL '60 days' AND fixed_asset_registered_at IS NULL)::int AS overdue_capitalizations
         FROM capex_capitalization_tracking`
      ),
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE closure_status <> 'Closed')::int AS open_pos,
          COALESCE(SUM(open_commitment_value),0) AS open_commitment_value,
          COALESCE(SUM(unutilized_commitment),0) AS unutilized_commitment,
          COUNT(*) FILTER (WHERE closure_due_date < CURRENT_DATE AND closure_status <> 'Closed')::int AS overdue_closures
         FROM capex_po_closure_tracking`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS checklist_items,
          COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_items,
          COUNT(DISTINCT request_id) FILTER (WHERE status <> 'Completed')::int AS projects_pending_closure
         FROM capex_closure_checklist_items`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS reviews,
          COALESCE(AVG(actual_roi),0) AS average_actual_roi,
          COALESCE(SUM(actual_savings),0) AS actual_savings,
          COUNT(*) FILTER (WHERE status <> 'Completed')::int AS pending_reviews
         FROM capex_benefit_reviews`
      ),
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE status <> 'Closed')::int AS open_risks,
          COUNT(*) FILTER (WHERE severity = 'Red' AND status <> 'Closed')::int AS red_risks,
          COUNT(*) FILTER (WHERE severity = 'Amber' AND status <> 'Closed')::int AS amber_risks
         FROM capex_risks`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS total_moa,
          COUNT(*) FILTER (WHERE approval_status IN ('Approved','Active'))::int AS approved_moa,
          COUNT(*) FILTER (WHERE matrix_validated = false)::int AS matrix_violations,
          COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '60 days')::int AS expiring_soon,
          COUNT(*) FILTER (WHERE renewal_required = true)::int AS renewals_required
         FROM capex_moa_records`
      ),
      pool.query(
        `SELECT
          COUNT(DISTINCT request_id)::int AS projects_with_versions,
          COUNT(*)::int AS document_versions,
          COUNT(*) FILTER (WHERE retention_until IS NOT NULL AND retention_until < CURRENT_DATE)::int AS expired_retention_items,
          (SELECT COUNT(*) FROM capex_electronic_signatures)::int AS electronic_signatures
         FROM capex_document_versions`
      ),
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE is_active = true)::int AS active_schedules,
          COUNT(*) FILTER (WHERE is_active = true AND next_run_date <= CURRENT_DATE)::int AS due_schedules
         FROM capex_report_schedules`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS total_variations,
          COUNT(*) FILTER (WHERE moa_approval_required = true)::int AS moa_required,
          COUNT(*) FILTER (WHERE approval_status = 'Approved')::int AS approved_variations,
          COALESCE(SUM(variation_amount),0) AS net_variation_amount
         FROM capex_budget_variations`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS tracked_projects,
          COALESCE(AVG(NULLIF(po_processing_days,0)),0) AS avg_po_processing_days,
          COALESCE(AVG(CASE WHEN invited_vendor_count > 0 THEN vendor_response_count::numeric / invited_vendor_count * 100 ELSE NULL END),0) AS avg_vendor_response_rate,
          COALESCE(SUM(procurement_savings),0) AS procurement_savings
         FROM capex_procurement_performance`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS total_gates,
          COUNT(*) FILTER (WHERE status = 'Passed')::int AS passed_gates,
          COUNT(*) FILTER (WHERE status = 'Failed')::int AS failed_gates,
          COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending_gates
         FROM capex_decision_gate_reviews`
      ),
      pool.query(
        `SELECT * FROM (
          SELECT r.id AS request_id, 'Budget Variance' AS alert_type, 'Red' AS severity,
                 'Budget variance exceeds 10%.' AS message
          FROM capex_requests r
          LEFT JOIN capex_financial_closure fc ON fc.request_id = r.id
          WHERE fc.actual_spend IS NOT NULL AND fc.actual_spend > r.estimated_value * 1.10
          UNION ALL
          SELECT request_id, 'AUC Aging', 'Red', 'AUC age exceeds 180 days.'
          FROM capex_auc_tracking
          WHERE status <> 'Capitalized' AND auc_start_date <= CURRENT_DATE - INTERVAL '180 days'
          UNION ALL
          SELECT request_id, 'Capitalization Overdue', 'Amber', 'Capitalization pending for more than 60 days.'
          FROM capex_capitalization_tracking
          WHERE fixed_asset_registered_at IS NULL AND capitalization_request_date <= CURRENT_DATE - INTERVAL '60 days'
          UNION ALL
          SELECT request_id, 'PO Closure Overdue', 'Amber', 'PO closure is overdue.'
          FROM capex_po_closure_tracking
          WHERE closure_status <> 'Closed' AND closure_due_date < CURRENT_DATE
          UNION ALL
          SELECT request_id, 'Project Delay', 'Amber', 'Project milestone is delayed by more than 30 days.'
          FROM capex_project_milestones
          WHERE status <> 'Completed' AND planned_date < CURRENT_DATE - INTERVAL '30 days'
          UNION ALL
          SELECT request_id, 'Budget Variation Reapproval', 'Red', 'Budget variation exceeds 10% and requires MOA approval.'
          FROM capex_budget_variations
          WHERE moa_approval_required = true AND approval_status <> 'Approved'
          UNION ALL
          SELECT request_id, 'MOA Matrix Violation', 'Red', 'MOA authority matrix validation failed.'
          FROM capex_moa_records
          WHERE matrix_validated = false
          UNION ALL
          SELECT request_id, 'MOA Expiry', 'Amber', 'MOA expiry or renewal is due within 60 days.'
          FROM capex_moa_records
          WHERE expiry_date <= CURRENT_DATE + INTERVAL '60 days' OR renewal_required = true
        ) generated
        ORDER BY severity DESC, request_id`
      ),
      pool.query(
        `SELECT request_id, alert_type, severity, message
         FROM capex_governance_alerts
         WHERE status = 'Open'
         ORDER BY triggered_at DESC, id DESC
         LIMIT 200`
      ),
    ]);

    const p = portfolio.rows[0] || {};
    const approvedBudget = Number(p.approved_budget || 0);
    const actualSpend = Number(p.actual_spend || 0);
    const checklistRow = checklist.rows[0] || {};
    const checklistItems = Number(checklistRow.checklist_items || 0);
    const completedItems = Number(checklistRow.completed_items || 0);

    res.json({
      portfolio: {
        totalProjects: Number(p.total_projects || 0),
        activeProjects: Number(p.active_projects || 0),
        delayedProjects: Number(p.delayed_projects || 0),
        closedProjects: Number(p.closed_projects || 0),
        approvedBudget,
        actualSpend,
        committedSpend: Number(p.committed_spend || 0),
        forecastSpend: Number(p.forecast_spend || 0),
        // Sourced from tracked procurement performance, not the requester's
        // self-entered savings estimate on the request.
        procurementSavings: Number(procurementPerformance.rows[0]?.procurement_savings || 0),
        budgetUtilizationPercent: approvedBudget ? Math.round((actualSpend / approvedBudget) * 100) : 0,
      },
      delivery: {
        milestones: Number(delivery.rows[0]?.milestones || 0),
        completedMilestones: Number(delivery.rows[0]?.completed_milestones || 0),
        delayedMilestones: Number(delivery.rows[0]?.delayed_milestones || 0),
      },
      auc: {
        openProjects: Number(auc.rows[0]?.open_auc_projects || 0),
        totalValue: Number(auc.rows[0]?.total_auc_value || 0),
        agedOver90Days: Number(auc.rows[0]?.aged_over_90 || 0),
        agedOver180Days: Number(auc.rows[0]?.aged_over_180 || 0),
        capitalizationReady: Number(auc.rows[0]?.capitalization_ready || 0),
      },
      capitalization: {
        pending: Number(capitalization.rows[0]?.pending_capitalizations || 0),
        capitalizedValue: Number(capitalization.rows[0]?.capitalized_value || 0),
        capitalizedProjects: Number(capitalization.rows[0]?.capitalized_projects || 0),
        overdue: Number(capitalization.rows[0]?.overdue_capitalizations || 0),
      },
      poClosure: {
        openPOs: Number(poClosure.rows[0]?.open_pos || 0),
        openCommitmentValue: Number(poClosure.rows[0]?.open_commitment_value || 0),
        unutilizedCommitment: Number(poClosure.rows[0]?.unutilized_commitment || 0),
        overdueClosures: Number(poClosure.rows[0]?.overdue_closures || 0),
      },
      closure: {
        checklistItems,
        completedItems,
        readinessPercent: checklistItems ? Math.round((completedItems / checklistItems) * 100) : 0,
        projectsPendingClosure: Number(checklistRow.projects_pending_closure || 0),
      },
      benefits: {
        reviews: Number(benefits.rows[0]?.reviews || 0),
        averageActualRoi: Number(benefits.rows[0]?.average_actual_roi || 0),
        actualSavings: Number(benefits.rows[0]?.actual_savings || 0),
        pendingReviews: Number(benefits.rows[0]?.pending_reviews || 0),
      },
      risk: {
        openRisks: Number(risks.rows[0]?.open_risks || 0),
        redRisks: Number(risks.rows[0]?.red_risks || 0),
        amberRisks: Number(risks.rows[0]?.amber_risks || 0),
      },
      moaCompliance: {
        totalMoa: Number(moaCompliance.rows[0]?.total_moa || 0),
        approvedMoa: Number(moaCompliance.rows[0]?.approved_moa || 0),
        matrixViolations: Number(moaCompliance.rows[0]?.matrix_violations || 0),
        expiringSoon: Number(moaCompliance.rows[0]?.expiring_soon || 0),
        renewalsRequired: Number(moaCompliance.rows[0]?.renewals_required || 0),
      },
      documentControls: {
        projectsWithVersions: Number(documentControls.rows[0]?.projects_with_versions || 0),
        documentVersions: Number(documentControls.rows[0]?.document_versions || 0),
        expiredRetentionItems: Number(documentControls.rows[0]?.expired_retention_items || 0),
        electronicSignatures: Number(documentControls.rows[0]?.electronic_signatures || 0),
      },
      scheduledReporting: {
        activeSchedules: Number(scheduledReports.rows[0]?.active_schedules || 0),
        dueSchedules: Number(scheduledReports.rows[0]?.due_schedules || 0),
      },
      variationControl: {
        totalVariations: Number(variations.rows[0]?.total_variations || 0),
        moaRequired: Number(variations.rows[0]?.moa_required || 0),
        approvedVariations: Number(variations.rows[0]?.approved_variations || 0),
        netVariationAmount: Number(variations.rows[0]?.net_variation_amount || 0),
      },
      procurementPerformance: {
        trackedProjects: Number(procurementPerformance.rows[0]?.tracked_projects || 0),
        averagePoProcessingDays: Number(procurementPerformance.rows[0]?.avg_po_processing_days || 0),
        averageVendorResponseRate: Number(procurementPerformance.rows[0]?.avg_vendor_response_rate || 0),
        procurementSavings: Number(procurementPerformance.rows[0]?.procurement_savings || 0),
      },
      decisionGates: {
        totalGates: Number(decisionGates.rows[0]?.total_gates || 0),
        passedGates: Number(decisionGates.rows[0]?.passed_gates || 0),
        failedGates: Number(decisionGates.rows[0]?.failed_gates || 0),
        pendingGates: Number(decisionGates.rows[0]?.pending_gates || 0),
      },
      generatedAlerts: mergeAlerts(alerts.rows, storedAlerts.rows),
    });
  } catch (err) { next(err); }
};

// Merge rule-generated alerts with stored governance alerts (e.g. approval
// escalations written by escalateStep), de-duplicated by request + type.
function mergeAlerts(generated, stored) {
  const seen = new Set();
  const out = [];
  for (const r of [...generated, ...stored]) {
    const key = `${r.request_id}|${r.alert_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ requestId: r.request_id, alertType: r.alert_type, severity: r.severity, message: r.message });
  }
  return out;
}

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, event_type, message, actor, created_at
       FROM capex_audit_logs
       WHERE request_id = $1
       ORDER BY created_at, id`,
      [req.params.id]
    );
    res.json(rows.map(r => ({
      id: r.id,
      eventType: r.event_type,
      message: r.message,
      actor: r.actor,
      createdAt: r.created_at,
    })));
  } catch (err) { next(err); }
};

exports.getReport = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.title, r.requester_name, r.department, r.business_function,
              r.budget_holder, r.financial_year, COALESCE(r.acv_po_value, r.estimated_value) AS value,
              r.value_band, r.hsse_risk, r.worker_welfare_risk, COUNT(q.id)::int AS quotation_count,
              MAX(CASE WHEN q.is_selected THEN q.supplier_name ELSE NULL END) AS selected_supplier,
              r.status, s.approver_role AS pending_with, p.pr_number, p.po_number, p.po_value,
              r.created_at, r.submitted_at, c.closed_at
       FROM capex_requests r
       LEFT JOIN capex_supplier_quotations q ON q.request_id = r.id
       LEFT JOIN capex_approval_steps s ON s.id = r.current_step_id
       LEFT JOIN capex_procurement_tracking p ON p.request_id = r.id
       LEFT JOIN capex_financial_closure c ON c.request_id = r.id
       GROUP BY r.id, s.approver_role, p.pr_number, p.po_number, p.po_value, c.closed_at
       ORDER BY r.created_at DESC`
    );

    if (req.query.format === 'csv') {
      const headers = [
        'Request number','Request title','Requester','Department code','Business/function','Budget holder',
        'Financial year','Value','Value band','HSSE risk','Worker welfare risk','Quotation count',
        'Selected supplier','Status','Current pending approver','PR number','PO number','PO value',
        'Created date','Submitted date','Closed date',
      ];
      const body = rows.map(r => [
        r.id, r.title, r.requester_name, r.department, r.business_function, r.budget_holder,
        r.financial_year, r.value, r.value_band, r.hsse_risk, r.worker_welfare_risk, r.quotation_count,
        r.selected_supplier, r.status, r.pending_with, r.pr_number, r.po_number, r.po_value,
        r.created_at, r.submitted_at, r.closed_at,
      ].map(csvCell).join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="capex-report.csv"');
      return res.send([headers.map(csvCell).join(','), ...body].join('\n'));
    }

    res.json(rows.map(r => ({
      requestNumber: r.id,
      title: r.title,
      requester: r.requester_name,
      department: r.department,
      businessFunction: r.business_function,
      budgetHolder: r.budget_holder,
      financialYear: r.financial_year,
      value: Number(r.value || 0),
      valueBand: r.value_band,
      hsseRisk: r.hsse_risk,
      workerWelfareRisk: r.worker_welfare_risk,
      quotationCount: Number(r.quotation_count || 0),
      selectedSupplier: r.selected_supplier,
      status: r.status,
      pendingWith: r.pending_with,
      prNumber: r.pr_number,
      poNumber: r.po_number,
      poValue: r.po_value === null ? null : Number(r.po_value),
      createdAt: r.created_at,
      submittedAt: r.submitted_at,
      closedAt: r.closed_at,
    })));
  } catch (err) { next(err); }
};

exports.getAdminConfig = async (req, res, next) => {
  try {
    const [thresholdsResult, workflowResult, departmentsResult] = await Promise.all([
      pool.query(`SELECT low_max_omr, medium_max_omr, updated_by, updated_at FROM capex_value_thresholds WHERE id = 1`),
      pool.query(
        `SELECT id, value_band, condition_key, step_order, approver_role, label, allowed_user_roles, is_active, updated_by, updated_at
         FROM capex_workflow_config
         ORDER BY value_band, condition_key, step_order`
      ),
      pool.query(`SELECT id, name, total_budget FROM capex_departments ORDER BY name`),
    ]);

    const thresholds = thresholdsResult.rows[0] || {};
    res.json({
      thresholds: {
        lowMaxOmr: Number(thresholds.low_max_omr ?? 25000),
        mediumMaxOmr: Number(thresholds.medium_max_omr ?? 300000),
        updatedBy: thresholds.updated_by || null,
        updatedAt: thresholds.updated_at || null,
      },
      workflowRules: workflowResult.rows.map(r => ({
        id: r.id,
        valueBand: r.value_band,
        conditionKey: r.condition_key,
        stepOrder: r.step_order,
        approverRole: r.approver_role,
        allowedUserRoles: r.allowed_user_roles || [],
        label: r.label,
        isActive: r.is_active,
        updatedBy: r.updated_by,
        updatedAt: r.updated_at,
      })),
      departments: departmentsResult.rows.map(r => ({
        id: r.id,
        name: r.name,
        totalBudget: Number(r.total_budget || 0),
      })),
    });
  } catch (err) { next(err); }
};

exports.updateThresholds = async (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const lowMaxOmr = Number(req.body.lowMaxOmr);
    const mediumMaxOmr = Number(req.body.mediumMaxOmr);
    if (!lowMaxOmr || !mediumMaxOmr || lowMaxOmr >= mediumMaxOmr) {
      return res.status(400).json({ error: 'lowMaxOmr and mediumMaxOmr are required, and lowMaxOmr must be less than mediumMaxOmr' });
    }

    const { rows: [row] } = await pool.query(
      `INSERT INTO capex_value_thresholds (id, low_max_omr, medium_max_omr, updated_by, updated_at)
       VALUES (1,$1,$2,$3,NOW())
       ON CONFLICT (id) DO UPDATE SET
         low_max_omr = EXCLUDED.low_max_omr,
         medium_max_omr = EXCLUDED.medium_max_omr,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING low_max_omr, medium_max_omr, updated_by, updated_at`,
      [lowMaxOmr, mediumMaxOmr, userName(req)]
    );

    res.json({
      lowMaxOmr: Number(row.low_max_omr),
      mediumMaxOmr: Number(row.medium_max_omr),
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    });
  } catch (err) { next(err); }
};

exports.updateWorkflowRule = async (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { approverRole, label, stepOrder, allowedUserRoles, isActive } = req.body;
    if (!approverRole || !label || !stepOrder) {
      return res.status(400).json({ error: 'approverRole, label, and stepOrder are required' });
    }

    if (!Array.isArray(allowedUserRoles) || !allowedUserRoles.length || allowedUserRoles.some(role => typeof role !== 'string' || !role.trim())) {
      return res.status(400).json({ error: 'At least one allowed user role is required' });
    }
    const normalisedAllowedRoles = [...new Set(allowedUserRoles.map(role => role.trim()))];

    const { rows: [row] } = await pool.query(
      `UPDATE capex_workflow_config SET
         approver_role = $1,
         label = $2,
         step_order = $3,
         allowed_user_roles = $4,
         is_active = $5,
         updated_by = $6,
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [approverRole, label, Number(stepOrder), normalisedAllowedRoles, isActive !== false, userName(req), req.params.ruleId]
    );
    if (!row) return res.status(404).json({ error: 'Workflow rule not found' });
    res.json({
      id: row.id,
      valueBand: row.value_band,
      conditionKey: row.condition_key,
      stepOrder: row.step_order,
      approverRole: row.approver_role,
      allowedUserRoles: row.allowed_user_roles,
      label: row.label,
      isActive: row.is_active,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    });
  } catch (err) { next(err); }
};

exports.uploadAttachment = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Attachment file is required' });
  try {
    const requestId = req.params.id;
    const attachmentType = req.body.type || 'Document';
    const canCreateDocuments = await userHasPermission(req.user, 'capex.documents', 'can_create');
    const canUploadClosureForm = attachmentType === 'CAPEX Closure Form'
      && await userHasPermission(req.user, 'capex.finance', 'can_edit');
    if (!canCreateDocuments && !canUploadClosureForm) {
      return res.status(403).json({ error: 'Forbidden: capex.documents can_create permission required' });
    }

    const retentionYears = Number(req.body.retentionYears || 7);
    const retentionUntil = new Date();
    retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [request] } = await client.query(`SELECT id FROM capex_requests WHERE id = $1`, [requestId]);
      if (!request) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'CAPEX request not found' });
      }

      const { rows: [row] } = await client.query(
        `INSERT INTO capex_attachments
         (request_id, linked_type, linked_id, name, type, size, uploaded_by,
          mime_type, size_bytes, retention_until, file_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          requestId,
          req.body.linkedType || 'Request',
          req.body.linkedId || null,
          req.file.originalname,
          attachmentType,
          `${Math.ceil(req.file.size / 1024)} KB`,
          userName(req),
          req.file.mimetype,
          req.file.size,
          retentionUntil.toISOString().slice(0, 10),
          req.file.buffer,
        ]
      );
      await addAuditLog(client, requestId, 'ATTACHMENT_UPLOADED', `Attachment uploaded: ${req.file.originalname}.`, userName(req));
      await client.query('COMMIT');
      res.status(201).json(mapCapexAttachment(row));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
};

exports.downloadAttachment = async (req, res, next) => {
  try {
    const { rows: [row] } = await pool.query(
      `SELECT name, mime_type, file_data FROM capex_attachments WHERE request_id = $1 AND id = $2`,
      [req.params.id, req.params.attachmentId]
    );
    if (!row || !row.file_data) return res.status(404).json({ error: 'Attachment not found' });
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${row.name.replace(/"/g, '')}"`);
    res.send(row.file_data);
  } catch (err) { next(err); }
};

function mapInitiation(r) {
  return {
    id:              r.id,
    title:           r.title,
    description:     r.description,
    department:      r.department,
    initiator:       r.initiator,
    projectType:     r.project_type,
    estimatedBudget: Number(r.estimated_budget),
    priority:        r.priority,
    status:          r.status,
    startDate:       r.start_date,
    endDate:         r.end_date,
    stakeholders:    r.stakeholders,
    justification:   r.justification,
    createdAt:       r.created_at,
  };
}

function mapManualEntry(r) {
  return {
    id:              r.id,
    entryType:       r.entry_type,
    department:      r.department,
    period:          r.period,
    amount:          Number(r.amount),
    description:     r.description,
    referenceNumber: r.reference_number,
    enteredBy:       r.entered_by,
    enteredAt:       r.entered_at,
    status:          r.status,
  };
}

function mapCapexRequestSummary(r) {
  return {
    id: r.id,
    title: r.title,
    requesterName: r.requester_name,
    department: r.department,
    businessFunction: r.business_function,
    budgetHolder: r.budget_holder,
    financialYear: r.financial_year,
    estimatedValue: Number(r.estimated_value),
    acvPoValue: r.acv_po_value === null ? null : Number(r.acv_po_value),
    currency: r.currency,
    valueBand: r.value_band,
    urgent: r.urgent,
    hsseRisk: r.hsse_risk,
    workerWelfareRisk: r.worker_welfare_risk,
    status: r.status,
    quoteCount: Number(r.quote_count || 0),
    averageQuote: Number(r.average_quote || 0),
    currentApproverRole: r.current_approver_role || null,
    currentStepLabel: r.current_step_label || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapCapexRequest(r) {
  return {
    id: r.id,
    title: r.title,
    requesterName: r.requester_name,
    requesterId: r.requester_id || null,
    department: r.department,
    businessFunction: r.business_function,
    budgetHolder: r.budget_holder,
    financialYear: r.financial_year,
    currentCostBudget: Number(r.current_cost_budget || 0),
    estimatedValue: Number(r.estimated_value),
    acvPoValue: r.acv_po_value === null ? null : Number(r.acv_po_value),
    currency: r.currency,
    valueBand: r.value_band,
    urgent: r.urgent,
    scopeDetails: r.scope_details,
    frequency: r.frequency,
    volumePerYear: r.volume_per_year,
    hsseRisk: r.hsse_risk,
    workerWelfareRisk: r.worker_welfare_risk,
    paymentTermsAgreed: r.payment_terms_agreed,
    paymentTerms: r.payment_terms,
    fewerThan3Justification: r.fewer_than_3_justification,
    savings: r.savings === null ? null : Number(r.savings),
    roi: r.roi,
    status: r.status,
    currentStepId: r.current_step_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    submittedAt: r.submitted_at,
  };
}

function mapCapexQuotation(r) {
  return {
    id: r.id,
    supplierName: r.supplier_name,
    quoteValue: Number(r.quote_value),
    currency: r.currency,
    paymentTerms: r.payment_terms,
    isSelected: r.is_selected,
    attachmentName: r.attachment_name,
    createdAt: r.created_at,
  };
}

function mapCapexApprovalStep(r) {
  return {
    id: r.id,
    stepOrder: r.step_order,
    approverRole: r.approver_role,
    label: r.label,
    status: r.status,
    assignedTo: r.assigned_to,
    decidedAt: r.decided_at,
  };
}

function mapCapexApprovalAction(r) {
  return {
    id: r.id,
    stepId: r.step_id,
    approverName: r.approver_name,
    approverRole: r.approver_role,
    decision: r.decision,
    comment: r.comment,
    createdAt: r.created_at,
  };
}

function mapCapexProcurement(r) {
  return {
    ndaRequired: r.nda_required,
    ndaStatus: r.nda_status,
    ndaCompletionDate: r.nda_completion_date,
    dpaRequired: r.dpa_required,
    dpaStatus: r.dpa_status,
    dpaCompletionDate: r.dpa_completion_date,
    vendorRegistrationStatus: r.vendor_registration_status,
    agreementStatus: r.agreement_status,
    gsapProjectReference: r.gsap_project_reference,
    gsapProjectCreatedAt: r.gsap_project_created_at,
    prNumber: r.pr_number,
    prCreatedAt: r.pr_created_at,
    prStatus: r.pr_status,
    poNumber: r.po_number,
    poCreatedAt: r.po_created_at,
    poValue: r.po_value === null ? null : Number(r.po_value),
    poStatus: r.po_status,
    poAttachmentName: r.po_attachment_name,
    poReleasedAfterJobDone: r.po_released_after_job_done,
  };
}

function mapCapexMilestone(r) {
  return {
    id: r.id,
    stageName: r.stage_name,
    milestoneName: r.milestone_name,
    plannedDate: r.planned_date,
    actualDate: r.actual_date,
    paymentPercentage: r.payment_percentage === null ? null : Number(r.payment_percentage),
    paymentAmount: r.payment_amount === null ? null : Number(r.payment_amount),
    completionEvidence: r.completion_evidence,
    status: r.status,
  };
}

function mapCapexClosure(r) {
  return {
    actualSpend: r.actual_spend === null ? null : Number(r.actual_spend),
    finalRoi: r.final_roi,
    finalSavings: r.final_savings === null ? null : Number(r.final_savings),
    variance: r.variance === null ? null : Number(r.variance),
    financeComments: r.finance_comments,
    capexFormAttachment: r.capex_form_attachment,
    closedBy: r.closed_by,
    closedAt: r.closed_at,
  };
}

function mapCapexAttachment(r) {
  return {
    id: r.id,
    linkedType: r.linked_type,
    linkedId: r.linked_id,
    name: r.name,
    type: r.type,
    size: r.size,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    retentionUntil: r.retention_until,
    uploadedBy: r.uploaded_by,
    uploadedAt: r.uploaded_at,
  };
}

function mapCapexAuc(r) {
  return {
    requestId: r.request_id,
    aucAccount: r.auc_account,
    aucValue: Number(r.auc_value || 0),
    aucStartDate: r.auc_start_date,
    completionConfirmed: r.completion_confirmed,
    capitalizationReady: r.capitalization_ready,
    status: r.status,
    businessOwner: r.business_owner,
    financeOwner: r.finance_owner,
    escalationLevel: r.escalation_level,
    comments: r.comments,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

function mapCapexCapitalization(r) {
  return {
    requestId: r.request_id,
    status: r.status,
    financeVerified: r.finance_verified,
    capitalizationRequestDate: r.capitalization_request_date,
    assetMasterNumber: r.asset_master_number,
    assetCategory: r.asset_category,
    capitalizedValue: r.capitalized_value === null ? null : Number(r.capitalized_value),
    capitalizationApprovalDate: r.capitalization_approval_date,
    fixedAssetRegisteredAt: r.fixed_asset_registered_at,
    depreciationStartDate: r.depreciation_start_date,
    comments: r.comments,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

function mapCapexPoClosure(r) {
  return {
    requestId: r.request_id,
    finalInvoiceReceived: r.final_invoice_received,
    vendorConfirmationReceived: r.vendor_confirmation_received,
    closureStatus: r.closure_status,
    openCommitmentValue: Number(r.open_commitment_value || 0),
    unutilizedCommitment: Number(r.unutilized_commitment || 0),
    closureDueDate: r.closure_due_date,
    closedAt: r.closed_at,
    followUpOwner: r.follow_up_owner,
    comments: r.comments,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

function mapCapexClosureChecklistItem(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    itemKey: r.item_key,
    label: r.label,
    responsibleOwner: r.responsible_owner,
    dueDate: r.due_date,
    status: r.status,
    completedAt: r.completed_at,
    evidenceAttachment: r.evidence_attachment,
    comments: r.comments,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

function mapCapexBenefitReview(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    reviewPeriodMonths: r.review_period_months,
    plannedRoi: r.planned_roi === null ? null : Number(r.planned_roi),
    actualRoi: r.actual_roi === null ? null : Number(r.actual_roi),
    plannedSavings: r.planned_savings === null ? null : Number(r.planned_savings),
    actualSavings: r.actual_savings === null ? null : Number(r.actual_savings),
    benefitScore: r.benefit_score === null ? null : Number(r.benefit_score),
    status: r.status,
    reviewedAt: r.reviewed_at,
    reviewer: r.reviewer,
    comments: r.comments,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapCapexRisk(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    category: r.category,
    title: r.title,
    severity: r.severity,
    probability: r.probability,
    impact: r.impact,
    mitigationPlan: r.mitigation_plan,
    owner: r.owner,
    dueDate: r.due_date,
    status: r.status,
    closedAt: r.closed_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapCapexGovernanceAlert(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    alertType: r.alert_type,
    severity: r.severity,
    message: r.message,
    assignedTo: r.assigned_to,
    status: r.status,
    triggeredAt: r.triggered_at,
    resolvedAt: r.resolved_at,
  };
}

function mapCapexMoaRecord(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    moaNumber: r.moa_number,
    title: r.title,
    approvalAuthority: r.approval_authority,
    approvalRoute: r.approval_route,
    approvalStatus: r.approval_status,
    projectValue: Number(r.project_value || 0),
    valueBand: r.value_band,
    matrixValidated: r.matrix_validated,
    matrixViolationReason: r.matrix_violation_reason,
    effectiveDate: r.effective_date,
    expiryDate: r.expiry_date,
    renewalRequired: r.renewal_required,
    attachmentId: r.attachment_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
    revisions: Array.isArray(r.revisions) ? r.revisions : undefined,
  };
}

function mapCapexMoaRevision(r) {
  return {
    id: r.id,
    moaId: r.moa_id,
    revisionNumber: r.revision_number,
    changeSummary: r.change_summary,
    revisedBy: r.revised_by,
    revisedAt: r.revised_at,
    attachmentId: r.attachment_id,
  };
}

function mapCapexDocumentVersion(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    attachmentId: r.attachment_id,
    documentType: r.document_type,
    documentName: r.document_name,
    versionLabel: r.version_label,
    changelog: r.changelog,
    retentionUntil: r.retention_until,
    uploadedBy: r.uploaded_by,
    uploadedAt: r.uploaded_at,
  };
}

function mapCapexElectronicSignature(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    linkedType: r.linked_type,
    linkedId: r.linked_id,
    signerName: r.signer_name,
    signerRole: r.signer_role,
    decision: r.decision,
    signatureMethod: r.signature_method,
    signedAt: r.signed_at,
    comments: r.comments,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
  };
}

function mapCapexReportSchedule(r) {
  return {
    id: r.id,
    reportName: r.report_name,
    reportType: r.report_type,
    audience: r.audience,
    frequency: r.frequency,
    format: r.format,
    filters: r.filters || {},
    recipients: r.recipients || [],
    nextRunDate: r.next_run_date,
    isActive: r.is_active,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

function mapDrilldownRow(r) {
  const out = {};
  for (const [key, value] of Object.entries(r)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  }
  return out;
}

function mapCapexBudgetVariation(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    variationType: r.variation_type,
    originalBudget: Number(r.original_budget || 0),
    revisedBudget: Number(r.revised_budget || 0),
    variationAmount: Number(r.variation_amount || 0),
    variationPercent: Number(r.variation_percent || 0),
    justification: r.justification,
    financialImpactAnalysis: r.financial_impact_analysis,
    fibReviewStatus: r.fib_review_status,
    moaApprovalRequired: r.moa_approval_required,
    approvalStatus: r.approval_status,
    requestedBy: r.requested_by,
    requestedAt: r.requested_at,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
  };
}

function mapCapexProcurementPerformance(r) {
  return {
    requestId: r.request_id,
    rfqIssuedAt: r.rfq_issued_at,
    tenderStartedAt: r.tender_started_at,
    tenderCompletedAt: r.tender_completed_at,
    vendorResponseCount: r.vendor_response_count,
    invitedVendorCount: r.invited_vendor_count,
    awardedValue: r.awarded_value === null ? null : Number(r.awarded_value),
    budgetEstimate: r.budget_estimate === null ? null : Number(r.budget_estimate),
    procurementSavings: r.procurement_savings === null ? null : Number(r.procurement_savings),
    poProcessingDays: r.po_processing_days,
    cpOwner: r.cp_owner,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

function mapCapexDecisionGate(r) {
  return {
    id: r.id,
    requestId: r.request_id,
    gateKey: r.gate_key,
    gateName: r.gate_name,
    status: r.status,
    reviewer: r.reviewer,
    reviewedAt: r.reviewed_at,
    comments: r.comments,
    evidence: r.evidence,
    updatedAt: r.updated_at,
  };
}

function mapCapexEscalationPolicy(r) {
  return {
    id: r.id,
    policyKey: r.policy_key,
    triggerLabel: r.trigger_label,
    thresholdValue: r.threshold_value === null ? null : Number(r.threshold_value),
    thresholdUnit: r.threshold_unit,
    severity: r.severity,
    escalationTarget: r.escalation_target,
    isActive: r.is_active,
  };
}
