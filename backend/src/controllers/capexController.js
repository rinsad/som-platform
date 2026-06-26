const pool   = require('../database/db');
const multer = require('multer');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

const _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.csvUploadMiddleware = _upload.single('file');
exports.attachmentUploadMiddleware = _upload.single('file');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function calcValueBand(value) {
  const n = Number(value) || 0;
  if (n <= 25000) return 'LOW';
  if (n <= 300000) return 'MEDIUM';
  return 'HIGH';
}

async function getValueThresholds(db = pool) {
  const { rows: [row] } = await db.query(
    `SELECT low_max_omr, medium_max_omr FROM capex_value_thresholds WHERE id = 1`
  );
  return {
    lowMax: Number(row?.low_max_omr ?? 25000),
    mediumMax: Number(row?.medium_max_omr ?? 300000),
  };
}

function calcValueBandWithThresholds(value, thresholds) {
  const n = Number(value) || 0;
  if (n <= thresholds.lowMax) return 'LOW';
  if (n <= thresholds.mediumMax) return 'MEDIUM';
  return 'HIGH';
}

function buildCapexWorkflow({ valueBand, quoteCount, hsseRisk, workerWelfareRisk }) {
  const steps = [];
  const add = (role, label) => steps.push({ role, label });
  const needsHsse = ['Medium', 'High'].includes(hsseRisk) || ['Medium', 'High'].includes(workerWelfareRisk);
  const fewerThan3 = Number(quoteCount || 0) < 3;

  add('Line Manager', 'Line Manager Endorsement');
  if (needsHsse) add('HSSE Focal', 'HSSE / Worker Welfare Approval');

  if (valueBand === 'LOW') {
    add('FiB', 'FiB Validation');
    add('CP Lead', 'CP Lead Pre-support');
    if (fewerThan3) add('Head of CP', 'Head of CP Approval for Fewer than 3 Quotations');
    add('Business GM', 'Business GM Approval');
  } else if (valueBand === 'MEDIUM') {
    add('Contract Holder / Owner', 'Contract Holder / Owner Pre-support');
    add('FiB', 'FiB Validation');
    add('CP Manager / Head of CP', 'CP Governance Approval');
    if (fewerThan3) add('CFO', 'CFO Approval for Fewer than 3 Quotations');
    add('EMT', 'EMT Approval');
  } else {
    add('CP', 'CP Review');
    add('FiB', 'FiB Validation');
    add('Contract Board', 'Contract Board Approval');
  }

  return steps;
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

    return rows.map(r => ({ role: r.approver_role, label: r.label }));
  } catch {
    return buildCapexWorkflow({ valueBand, quoteCount, hsseRisk, workerWelfareRisk });
  }
}

function nextOpenStep(steps) {
  return steps.find(s => s.status === 'Pending') || null;
}

function requestStatusForStep(step) {
  if (!step) return 'Approved for Procurement';
  const role = step.approver_role || step.role || '';
  if (role.includes('Line Manager')) return 'Pending Line Manager Endorsement';
  if (role.includes('FiB')) return 'Pending FiB Validation';
  if (role.includes('HSSE')) return 'Pending HSSE Approval';
  if (role.includes('CP') || role.includes('Contract Holder')) return 'Pending CP Review';
  if (role.includes('Contract Board')) return 'Pending Contract Board Approval';
  return 'Pending Management Approval';
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

function hasPoUploadRequirements(data) {
  return !!(data.poNumber && Number(data.poValue) > 0 && data.poAttachmentName);
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
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

    const { rows: [last] } = await pool.query(
      `SELECT id FROM capex_initiations WHERE id LIKE 'CINIT-${new Date().getFullYear()}-%' ORDER BY id DESC LIMIT 1`
    );
    const seq = last ? String(Number(last.id.split('-')[2]) + 1).padStart(3, '0') : '001';
    const id  = `CINIT-${new Date().getFullYear()}-${seq}`;

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
exports.createManualEntry = async (req, res, next) => {
  try {
    const { entryType, department, period, amount, description, referenceNumber } = req.body;
    if (!entryType || !department || !amount) {
      return res.status(400).json({ error: 'entryType, department, and amount are required' });
    }

    const year = new Date().getFullYear();
    const { rows: [last] } = await pool.query(
      `SELECT id FROM capex_manual_entries WHERE id LIKE 'ME-${year}-%' ORDER BY id DESC LIMIT 1`
    );
    const seq = last ? String(Number(last.id.split('-')[2]) + 1).padStart(3, '0') : '001';
    const id  = `ME-${year}-${seq}`;

    const enteredBy = req.user?.full_name || req.user?.email || 'Unknown';

    const { rows: [row] } = await pool.query(
      `INSERT INTO capex_manual_entries
         (id, entry_type, department, period, amount, description, reference_number, entered_by, entered_by_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Posted')
       RETURNING *`,
      [id, entryType, department, period||new Date().toISOString().slice(0,7),
       Number(amount), description||'', referenceNumber||'', enteredBy, toUuid(req.user?.id)]
    );
    res.status(201).json(mapManualEntry(row));
  } catch (err) { next(err); }
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

    const uploader = req.user?.name || req.user?.email || 'Unknown';

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
    const { rows } = await pool.query(
      `SELECT r.*,
              COUNT(q.id)::int AS quote_count,
              COALESCE(AVG(q.quote_value),0) AS average_quote,
              s.approver_role AS current_approver_role,
              s.label AS current_step_label
       FROM capex_requests r
       LEFT JOIN capex_supplier_quotations q ON q.request_id = r.id
       LEFT JOIN capex_approval_steps s ON s.id = r.current_step_id
       GROUP BY r.id, s.approver_role, s.label
       ORDER BY r.created_at DESC`
    );
    res.json(rows.map(mapCapexRequestSummary));
  } catch (err) { next(err); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const { rows: [request] } = await pool.query(`SELECT * FROM capex_requests WHERE id = $1`, [req.params.id]);
    if (!request) return res.status(404).json({ error: 'CAPEX request not found' });

    const [quotes, steps, actions, procurement, milestones, closure, attachments] = await Promise.all([
      pool.query(`SELECT * FROM capex_supplier_quotations WHERE request_id = $1 ORDER BY id`, [request.id]),
      pool.query(`SELECT * FROM capex_approval_steps WHERE request_id = $1 ORDER BY step_order`, [request.id]),
      pool.query(`SELECT * FROM capex_approval_actions WHERE request_id = $1 ORDER BY created_at, id`, [request.id]),
      pool.query(`SELECT * FROM capex_procurement_tracking WHERE request_id = $1`, [request.id]),
      pool.query(`SELECT * FROM capex_project_milestones WHERE request_id = $1 ORDER BY id`, [request.id]),
      pool.query(`SELECT * FROM capex_financial_closure WHERE request_id = $1`, [request.id]),
      pool.query(`SELECT * FROM capex_attachments WHERE request_id = $1 ORDER BY uploaded_at, id`, [request.id]),
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

    const { rows: [last] } = await client.query(
      `SELECT id FROM capex_requests WHERE id LIKE 'CAPEX-${year}-%' ORDER BY id DESC LIMIT 1`
    );
    const seq = last ? String(Number(last.id.split('-')[2]) + 1).padStart(3, '0') : '001';
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

    const nextStatus = requestStatusForStep(workflow[0]);
    const { rows: [updated] } = await client.query(
      `UPDATE capex_requests SET current_step_id = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [firstStepId, nextStatus, id]
    );
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
    if (!step && decision === 'APPROVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No pending approval step is available' });
    }

    const approverName = req.user?.full_name || req.user?.email || 'Unknown';
    await client.query(
      `INSERT INTO capex_approval_actions
       (request_id, step_id, approver_name, approver_role, decision, comment)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [request.id, step?.id || null, approverName, req.user?.role || step?.approver_role || 'Unknown', decision, comment || '']
    );

    if (decision === 'REJECTED') {
      if (step) await client.query(`UPDATE capex_approval_steps SET status = 'Rejected', decided_at = NOW() WHERE id = $1`, [step.id]);
      await client.query(`UPDATE capex_requests SET status = 'Rejected', current_step_id = NULL, updated_at = NOW() WHERE id = $1`, [request.id]);
      await addAuditLog(client, request.id, 'REQUEST_REJECTED', comment, approverName);
    } else if (decision === 'RETURNED') {
      if (step) await client.query(`UPDATE capex_approval_steps SET status = 'Returned', decided_at = NOW() WHERE id = $1`, [step.id]);
      await client.query(`UPDATE capex_requests SET status = 'Returned for Correction', current_step_id = NULL, updated_at = NOW() WHERE id = $1`, [request.id]);
      await addAuditLog(client, request.id, 'REQUEST_RETURNED', comment, approverName);
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
    if (poStatus === 'Uploaded') nextStatus = 'PO Uploaded';
    else if (poNumber) nextStatus = 'PO Created';
    else if (prNumber) nextStatus = 'PR Created';
    else if (gsapProjectReference) nextStatus = 'GSAP Project Created';
    else if (['Pending', 'Completed'].includes(vendorRegistrationStatus) || ndaRequired || dpaRequired) {
      nextStatus = 'Pending Vendor Registration / NDA / DPA';
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
        completionEvidence || '', status || (actualDate ? 'Complete' : 'Open'),
      ]
    );

    await client.query(`UPDATE capex_requests SET status = 'In Execution', updated_at = NOW() WHERE id = $1`, [req.params.id]);
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

    const nextStatus = closeRequest ? 'Closed' : 'Pending Financial Closure';
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
              r.created_at, r.submitted_at AS approved_at, c.closed_at
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
        'Created date','Approved date','Closed date',
      ];
      const body = rows.map(r => [
        r.id, r.title, r.requester_name, r.department, r.business_function, r.budget_holder,
        r.financial_year, r.value, r.value_band, r.hsse_risk, r.worker_welfare_risk, r.quotation_count,
        r.selected_supplier, r.status, r.pending_with, r.pr_number, r.po_number, r.po_value,
        r.created_at, r.approved_at, r.closed_at,
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
      approvedAt: r.approved_at,
      closedAt: r.closed_at,
    })));
  } catch (err) { next(err); }
};

exports.getAdminConfig = async (req, res, next) => {
  try {
    const [thresholdsResult, workflowResult, departmentsResult] = await Promise.all([
      pool.query(`SELECT low_max_omr, medium_max_omr, updated_by, updated_at FROM capex_value_thresholds WHERE id = 1`),
      pool.query(
        `SELECT id, value_band, condition_key, step_order, approver_role, label, is_active, updated_by, updated_at
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
    const { approverRole, label, stepOrder, isActive } = req.body;
    if (!approverRole || !label || !stepOrder) {
      return res.status(400).json({ error: 'approverRole, label, and stepOrder are required' });
    }

    const { rows: [row] } = await pool.query(
      `UPDATE capex_workflow_config SET
         approver_role = $1,
         label = $2,
         step_order = $3,
         is_active = $4,
         updated_by = $5,
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [approverRole, label, Number(stepOrder), isActive !== false, userName(req), req.params.ruleId]
    );
    if (!row) return res.status(404).json({ error: 'Workflow rule not found' });
    res.json({
      id: row.id,
      valueBand: row.value_band,
      conditionKey: row.condition_key,
      stepOrder: row.step_order,
      approverRole: row.approver_role,
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
          req.body.type || 'Document',
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
