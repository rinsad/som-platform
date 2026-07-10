const pool = require('../database/db');
const multer = require('multer');
const { getValueThresholds, calcValueBandWithThresholds } = require('../config/capexThresholds');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

const _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.documentUploadMiddleware = _upload.single('file');

// Tier from the shared, admin-editable CAPEX thresholds.
async function calcTierShared(value, db = pool) {
  const thresholds = await getValueThresholds(db);
  return calcValueBandWithThresholds(value, thresholds);
}

// Next sequence number for an id family (PR-YYYY-### or DOC-###). Runs inside
// the caller's transaction and locks the table to avoid races and the string
// sort defect where PR-...-1000 sorts before PR-...-999.
async function nextSequence(db, table, prefix, part) {
  const { rows: [{ maxseq }] } = await db.query(
    `SELECT COALESCE(MAX(NULLIF(split_part(id, '-', $2), '')::int), 0) AS maxseq
     FROM ${table} WHERE id LIKE $1`,
    [`${prefix}%`, part]
  );
  return Number(maxseq) + 1;
}

function requesterOrAdmin(req, pr) {
  if (req.user?.role === 'Admin') return true;
  const userId = toUuid(req.user?.id);
  return !!(pr.requestor_id && userId && userId === pr.requestor_id);
}

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
    currentStepIndex:     r.current_step_index ?? 0,
    capexRequestId:       r.capex_request_id ?? null,
    quoteCount:           r.quote_count,
    requiresJustification: r.requires_justification,
    justification:        r.justification,
    lineItems:            r.line_items ?? [],
    approvalHistory:      r.approval_history ?? [],
    createdAt:            r.created_at,
  };
}

// Validate an optional CAPEX request link; returns the id if it exists, throws
// a tagged error the caller turns into a 400 if it does not.
async function validateCapexLink(db, capexRequestId) {
  if (!capexRequestId) return null;
  const { rows: [row] } = await db.query(`SELECT id FROM capex_requests WHERE id = $1`, [capexRequestId]);
  if (!row) { const e = new Error('capexRequestId does not reference an existing CAPEX request'); e.status = 400; throw e; }
  return row.id;
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
  let client;
  try {
    const { title, description, requestorName, department, totalValue, quoteCount, lineItems, justification, capexRequestId } = req.body;
    if (!title || totalValue === undefined) {
      return res.status(400).json({ error: 'title and totalValue are required' });
    }
    const quotes = Number(quoteCount) || 0;
    if (quotes < 3 && !(justification && justification.trim())) {
      return res.status(400).json({ error: 'Justification is required when fewer than 3 quotations are provided' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const linkedCapexId = await validateCapexLink(client, capexRequestId);
    const tier  = await calcTierShared(Number(totalValue), client);
    const year  = new Date().getFullYear();
    const seq   = String(await nextSequence(client, 'purchase_requests', `PR-${year}-`, 3)).padStart(3, '0');
    const id    = `PR-${year}-${seq}`;
    const reqName = requestorName || req.user?.full_name || req.user?.email || 'Unknown';

    const { rows: [row] } = await client.query(
      `INSERT INTO purchase_requests
         (id, title, description, requestor_name, requestor_id, department, total_value,
          tier, status, quote_count, requires_justification, justification, line_items,
          approval_history, current_step_index, capex_request_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING_APPROVAL',$9,$10,$11,$12,'[]'::jsonb,0,$13)
       RETURNING *`,
      [id, title, description||'', reqName, toUuid(req.user?.id), department||'Unknown',
       Number(totalValue), tier, quotes, quotes < 3,
       justification||'', JSON.stringify(lineItems||[]), linkedCapexId]
    );
    await client.query('COMMIT');
    const workflow = getWorkflow(row.department, row.tier);
    res.status(201).json({ ...mapPR(row), workflow });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  } finally {
    if (client) client.release();
  }
};

// ── PATCH /api/purchase-requests/:id ─────────────────────────────────────────
exports.updateDraft = async (req, res, next) => {
  let client;
  try {
    const { title, description, department, totalValue, quoteCount, lineItems, justification, capexRequestId } = req.body;
    if (!title || totalValue === undefined) {
      return res.status(400).json({ error: 'title and totalValue are required' });
    }
    const quotes = Number(quoteCount) || 0;
    if (quotes < 3 && !(justification && justification.trim())) {
      return res.status(400).json({ error: 'Justification is required when fewer than 3 quotations are provided' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [existing] } = await client.query(
      `SELECT * FROM purchase_requests WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase request not found' });
    }
    if (existing.status !== 'DRAFT') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only draft purchase requests can be edited' });
    }
    if (!requesterOrAdmin(req, existing)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the requester or an Admin can edit this request' });
    }

    const linkedCapexId = capexRequestId === undefined
      ? existing.capex_request_id
      : await validateCapexLink(client, capexRequestId);
    const tier = await calcTierShared(Number(totalValue), client);

    const { rows: [row] } = await client.query(
      `UPDATE purchase_requests
       SET title = $1, description = $2, department = $3, total_value = $4, tier = $5,
           quote_count = $6, requires_justification = $7, justification = $8,
           line_items = $9, capex_request_id = $10
       WHERE id = $11
       RETURNING *`,
      [
        title, description || '', department || 'Unknown', Number(totalValue), tier,
        quotes, quotes < 3, justification || '', JSON.stringify(lineItems || []),
        linkedCapexId, req.params.id,
      ]
    );
    await client.query('COMMIT');
    res.json({ ...mapPR(row), workflow: getWorkflow(row.department, row.tier) });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  } finally {
    if (client) client.release();
  }
};

// ── PATCH /api/purchase-requests/:id/resubmit ────────────────────────────────
exports.resubmit = async (req, res, next) => {
  let client;
  try {
    const { comment } = req.body;
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [existing] } = await client.query(
      `SELECT * FROM purchase_requests WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase request not found' });
    }
    if (existing.status !== 'DRAFT') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only draft purchase requests can be resubmitted' });
    }
    if (!requesterOrAdmin(req, existing)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the requester or an Admin can resubmit this request' });
    }

    const historyEntry = {
      approver: req.user?.full_name || req.user?.email || 'Unknown',
      role: req.user?.role || 'Unknown',
      decision: 'RESUBMITTED',
      comment: comment || '',
      date: new Date().toISOString().split('T')[0],
    };
    const { rows: [pr] } = await client.query(
      `UPDATE purchase_requests
       SET status = 'PENDING_APPROVAL',
           current_step_index = 0,
           approval_history = approval_history || $2::jsonb
       WHERE id = $1
       RETURNING *`,
      [req.params.id, JSON.stringify(historyEntry)]
    );
    await client.query('COMMIT');
    res.json({ ...mapPR(pr), workflow: getWorkflow(pr.department, pr.tier) });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

// ── PATCH /api/purchase-requests/:id/approve ─────────────────────────────────
exports.approve = async (req, res, next) => {
  let client;
  try {
    const { decision, comment } = req.body;
    const VALID = ['APPROVED', 'REJECTED', 'RETURNED'];
    if (!VALID.includes(decision)) {
      return res.status(400).json({ error: `decision must be one of: ${VALID.join(', ')}` });
    }
    if ((decision === 'REJECTED' || decision === 'RETURNED') && !(comment && comment.trim())) {
      return res.status(400).json({ error: 'comment is required to reject or return a request' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [pr] } = await client.query(
      `SELECT * FROM purchase_requests WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (!pr) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase request not found' });
    }
    if (pr.status !== 'PENDING_APPROVAL') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Only requests pending approval can be decided (current status: ${pr.status})` });
    }

    const workflow = getWorkflow(pr.department, pr.tier);
    const currentStep = workflow[pr.current_step_index] || null;

    // Authority enforcement (previously UI-only): the caller must hold the role
    // for the current workflow step, and a requester may not approve their own
    // request. Admins may act on any step as an audited override.
    const isAdmin = req.user?.role === 'Admin';
    const userId = toUuid(req.user?.id);
    const isRequester = !!(pr.requestor_id && userId && userId === pr.requestor_id);
    if (isRequester && !isAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You cannot approve or decide your own purchase request' });
    }
    if (!isAdmin && currentStep && req.user?.role !== currentStep.role) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: `Role '${req.user?.role || 'Unknown'}' is not authorised to decide step '${currentStep.label}' (requires: ${currentStep.role})`,
      });
    }

    const historyEntry = {
      approver: req.user?.full_name || req.user?.email || 'Unknown',
      role: req.user?.role || 'Unknown',
      stepLabel: currentStep?.label || null,
      decision,
      comment: comment || '',
      date: new Date().toISOString().split('T')[0],
    };

    let nextStatus = pr.status;
    let nextIndex = pr.current_step_index;
    if (decision === 'REJECTED') {
      nextStatus = 'REJECTED';
    } else if (decision === 'RETURNED') {
      nextStatus = 'DRAFT';
      nextIndex = 0;
    } else {
      // APPROVED — advance one step; the PR is approved only when the last
      // workflow step has been completed.
      nextIndex = pr.current_step_index + 1;
      nextStatus = nextIndex >= workflow.length ? 'APPROVED' : 'PENDING_APPROVAL';
    }

    const { rows: [updated] } = await client.query(
      `UPDATE purchase_requests
       SET status = $1, current_step_index = $2,
           approval_history = approval_history || $3::jsonb
       WHERE id = $4
       RETURNING *`,
      [nextStatus, nextIndex, JSON.stringify(historyEntry), req.params.id]
    );
    await client.query('COMMIT');
    res.json({ ...mapPR(updated), workflow });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
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
// Accepts either a real multipart file upload (field "file") or, for backward
// compatibility, a JSON body with { name, type, size } metadata only.
exports.uploadDocument = async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [pr] } = await client.query(
      `SELECT id FROM purchase_requests WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (!pr) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    const file = req.file;
    const name = file ? file.originalname : req.body.name;
    if (!name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'A file or a document name is required' });
    }
    const type = req.body.type
      || (name.toLowerCase().includes('quote') ? 'Quote'
        : name.toLowerCase().includes('scope') ? 'Scope'
        : name.toLowerCase().includes('tech') ? 'Technical' : 'Document');
    const size = file
      ? (file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`)
      : (req.body.size || 'Unknown');

    const seq = String(await nextSequence(client, 'pr_documents', 'DOC-', 2)).padStart(3, '0');
    const id  = `DOC-${seq}`;
    const uploadedBy = req.user?.full_name || req.user?.email || 'Unknown';

    const { rows: [doc] } = await client.query(
      `INSERT INTO pr_documents (id, pr_id, name, type, size, uploaded_by, mime_type, size_bytes, file_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, req.params.id, name, type, size, uploadedBy,
       file?.mimetype || null, file?.size || null, file?.buffer || null]
    );
    await client.query('COMMIT');
    res.status(201).json({
      id: doc.id, prId: doc.pr_id, name: doc.name,
      type: doc.type, size: doc.size, uploadedBy: doc.uploaded_by, uploadedAt: doc.uploaded_at,
      hasFile: !!doc.file_data,
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

// ── GET /api/purchase-requests/:id/documents/:docId/download ─────────────────
exports.downloadDocument = async (req, res, next) => {
  try {
    const { rows: [row] } = await pool.query(
      `SELECT name, mime_type, file_data FROM pr_documents WHERE pr_id = $1 AND id = $2`,
      [req.params.id, req.params.docId]
    );
    if (!row || !row.file_data) return res.status(404).json({ error: 'Document file not found' });
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${row.name.replace(/"/g, '')}"`);
    res.send(row.file_data);
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
