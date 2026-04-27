const pool = require('../database/db');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

// ── Workflow config — kept in code (no business value in the DB) ──────────────
const WORKFLOW_CONFIG = {
  default: {
    LOW:    [{ role: 'Department Manager', label: 'Department Manager Approval' }],
    MEDIUM: [{ role: 'Department Manager', label: 'Department Manager Approval' }, { role: 'Finance', label: 'Finance Review & Approval' }],
    HIGH:   [{ role: 'Department Manager', label: 'Department Manager Approval' }, { role: 'Finance', label: 'Finance Review & Approval' }, { role: 'Admin', label: 'Executive Committee Approval' }],
  },
  QHSE: {
    LOW:    [{ role: 'Department Manager', label: 'QHSE Manager Approval' }],
    MEDIUM: [{ role: 'Department Manager', label: 'QHSE Manager Approval' }, { role: 'Admin', label: 'HSE Director Sign-off' }],
    HIGH:   [{ role: 'Department Manager', label: 'QHSE Manager Approval' }, { role: 'Admin', label: 'HSE Director Sign-off' }, { role: 'Finance', label: 'Finance & Executive Approval' }],
  },
  Retail: {
    LOW:    [{ role: 'Department Manager', label: 'Retail Operations Manager' }],
    MEDIUM: [{ role: 'Department Manager', label: 'Retail Operations Manager' }, { role: 'Finance', label: 'Finance Approval' }],
    HIGH:   [{ role: 'Department Manager', label: 'Retail Operations Manager' }, { role: 'Finance', label: 'Finance Approval' }, { role: 'Admin', label: 'Regional Director Sign-off' }],
  },
  Infrastructure: {
    LOW:    [{ role: 'Department Manager', label: 'Infrastructure Manager Approval' }],
    MEDIUM: [{ role: 'Department Manager', label: 'Infrastructure Manager Approval' }, { role: 'Finance', label: 'Finance Review' }],
    HIGH:   [{ role: 'Department Manager', label: 'Infrastructure Manager Approval' }, { role: 'Finance', label: 'Finance Review' }, { role: 'Admin', label: 'CTO & Finance Committee' }],
  },
};

function getWorkflow(department, tier) {
  const deptConfig = WORKFLOW_CONFIG[department] || WORKFLOW_CONFIG.default;
  return deptConfig[tier] || WORKFLOW_CONFIG.default[tier];
}

function calcTier(value) {
  if (value <= 25000)       return 'LOW';
  if (value <= 300000)      return 'MEDIUM';
  return 'HIGH';
}

function mapPR(r) {
  return {
    id:                   r.id,
    title:                r.title,
    description:          r.description,
    requestorName:        r.requestor_name,
    department:           r.department,
    totalValue:           Number(r.total_value),
    tier:                 r.tier,
    status:               r.status,
    quoteCount:           r.quote_count,
    requiresJustification: r.requires_justification,
    justification:        r.justification,
    lineItems:            r.line_items ?? [],
    approvalHistory:      r.approval_history ?? [],
    createdAt:            r.created_at,
  };
}

// ── GET /api/purchase-requests ────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { rows } = status
      ? await pool.query(`SELECT * FROM purchase_requests WHERE UPPER(status) = $1 ORDER BY created_at DESC`, [status.toUpperCase()])
      : await pool.query(`SELECT * FROM purchase_requests ORDER BY created_at DESC`);
    res.json(rows.map(mapPR));
  } catch (err) { next(err); }
};

// ── GET /api/purchase-requests/:id ────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const { rows: [pr] } = await pool.query(
      `SELECT * FROM purchase_requests WHERE id = $1`, [req.params.id]
    );
    if (!pr) return res.status(404).json({ error: 'Purchase request not found' });
    const workflow = getWorkflow(pr.department, pr.tier);
    res.json({ ...mapPR(pr), workflow });
  } catch (err) { next(err); }
};

// ── POST /api/purchase-requests ───────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { title, description, requestorName, department, totalValue, quoteCount, lineItems, justification } = req.body;
    if (!title || totalValue === undefined) {
      return res.status(400).json({ error: 'title and totalValue are required' });
    }

    const tier   = calcTier(Number(totalValue));
    const quotes = quoteCount || 0;
    const year   = new Date().getFullYear();

    const { rows: [last] } = await pool.query(
      `SELECT id FROM purchase_requests WHERE id LIKE 'PR-${year}-%' ORDER BY id DESC LIMIT 1`
    );
    const seq = last ? String(Number(last.id.split('-')[2]) + 1).padStart(3, '0') : '001';
    const id  = `PR-${year}-${seq}`;

    const reqName = requestorName || req.user?.full_name || req.user?.email || 'Unknown';

    const { rows: [row] } = await pool.query(
      `INSERT INTO purchase_requests
         (id, title, description, requestor_name, requestor_id, department, total_value,
          tier, status, quote_count, requires_justification, justification, line_items, approval_history)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING_APPROVAL',$9,$10,$11,$12,'[]'::jsonb)
       RETURNING *`,
      [id, title, description||'', reqName, toUuid(req.user?.id), department||'Unknown',
       Number(totalValue), tier, quotes, quotes < 3,
       justification||'', JSON.stringify(lineItems||[])]
    );
    const workflow = getWorkflow(row.department, row.tier);
    res.status(201).json({ ...mapPR(row), workflow });
  } catch (err) { next(err); }
};

// ── PATCH /api/purchase-requests/:id/approve ─────────────────────────────────
exports.approve = async (req, res, next) => {
  try {
    const { decision, comment } = req.body;
    const VALID = ['APPROVED', 'REJECTED', 'RETURNED'];
    if (!VALID.includes(decision)) {
      return res.status(400).json({ error: `decision must be one of: ${VALID.join(', ')}` });
    }

    const statusMap = { APPROVED: 'APPROVED', REJECTED: 'REJECTED', RETURNED: 'DRAFT' };

    const historyEntry = {
      approver:  req.user?.full_name || req.user?.email || 'Unknown',
      role:      req.user?.role || 'Unknown',
      decision,
      comment:   comment || '',
      date:      new Date().toISOString().split('T')[0],
    };

    const { rows: [pr] } = await pool.query(
      `UPDATE purchase_requests
       SET status = $1,
           approval_history = approval_history || $2::jsonb
       WHERE id = $3
       RETURNING *`,
      [statusMap[decision], JSON.stringify(historyEntry), req.params.id]
    );
    if (!pr) return res.status(404).json({ error: 'Purchase request not found' });

    res.json({ ...mapPR(pr), workflow: getWorkflow(pr.department, pr.tier) });
  } catch (err) { next(err); }
};

// ── GET /api/purchase-requests/:id/documents ─────────────────────────────────
exports.getDocuments = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, pr_id, name, type, size, uploaded_by, uploaded_at
       FROM pr_documents WHERE pr_id = $1 ORDER BY uploaded_at, id`,
      [req.params.id]
    );
    res.json(rows.map(d => ({
      id:         d.id,
      prId:       d.pr_id,
      name:       d.name,
      type:       d.type,
      size:       d.size,
      uploadedBy: d.uploaded_by,
      uploadedAt: d.uploaded_at,
    })));
  } catch (err) { next(err); }
};

// ── POST /api/purchase-requests/:id/documents ────────────────────────────────
exports.uploadDocument = async (req, res, next) => {
  try {
    const { rows: [pr] } = await pool.query(
      `SELECT id FROM purchase_requests WHERE id = $1`, [req.params.id]
    );
    if (!pr) return res.status(404).json({ error: 'Purchase request not found' });

    const { name, type, size } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { rows: [last] } = await pool.query(
      `SELECT id FROM pr_documents ORDER BY id DESC LIMIT 1`
    );
    const seq = last ? String(Number(last.id.split('-')[1]) + 1).padStart(3, '0') : '001';
    const id  = `DOC-${seq}`;
    const uploadedBy = req.user?.full_name || req.user?.email || 'Unknown';

    const { rows: [doc] } = await pool.query(
      `INSERT INTO pr_documents (id, pr_id, name, type, size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, req.params.id, name, type||'Document', size||'Unknown', uploadedBy]
    );
    res.status(201).json({
      id: doc.id, prId: doc.pr_id, name: doc.name,
      type: doc.type, size: doc.size, uploadedBy: doc.uploaded_by, uploadedAt: doc.uploaded_at,
    });
  } catch (err) { next(err); }
};

// ── GET /api/purchase-requests/:id/workflow ───────────────────────────────────
exports.getWorkflowForPR = async (req, res, next) => {
  try {
    const { rows: [pr] } = await pool.query(
      `SELECT department, tier FROM purchase_requests WHERE id = $1`, [req.params.id]
    );
    if (!pr) return res.status(404).json({ error: 'Purchase request not found' });
    res.json({ workflow: getWorkflow(pr.department, pr.tier), tier: pr.tier, department: pr.department });
  } catch (err) { next(err); }
};
