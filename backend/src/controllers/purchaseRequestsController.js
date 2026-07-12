const pool = require('../database/db');
const multer = require('multer');
const { getValueThresholds, calcValueBandWithThresholds } = require('../config/capexThresholds');
const { parsePagination, buildPaginationMeta } = require('../config/pagination');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

const _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.documentUploadMiddleware = _upload.single('file');
exports.createUploadMiddleware = _upload.any();

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

function canSelectSupplier(req) {
  return ['Admin', 'CP Lead', 'CP Manager'].includes(req.user?.role);
}

// ── DoA workflow — driven by the admin-editable pr_workflow_config table ──────
// Aligns with the CP Governance Framework / DoA matrix (see migration 021). The
// chain is recomputed from (tier, quoteCount, hsseRisk, workerWelfareRisk) on
// every read/decision — it is never snapshotted, matching the module's design
// and the shared value-threshold semantics.

// In-code fallback used when the config table is unavailable or empty. Kept in
// sync with the seed rows in migration 021.
function buildPRWorkflowFallback({ tier, quoteCount, hsseRisk, workerWelfareRisk }) {
  const steps = [];
  const add = (role, label) => steps.push({ role, label });
  const needsHsse = ['Medium', 'High'].includes(hsseRisk) || ['Medium', 'High'].includes(workerWelfareRisk);
  const fewerThan3 = Number(quoteCount || 0) < 3;

  add('Manager', 'Line Manager Endorsement');
  if (needsHsse) add('HSSE Focal', 'HSSE Focal Review');

  if (tier === 'LOW') {
    add('Finance in Business', 'FiB Pre-support');
    add('CP Lead', 'CP Lead Pre-support');
    if (fewerThan3) add('CP Manager', 'Head of CP Approval for Fewer than 3 Quotations');
    add('Business GM', 'Business GM Authorization');
  } else if (tier === 'MEDIUM') {
    add('Project Owner', 'Contract Owner Pre-support');
    add('Project Owner', 'Contract Holder Pre-support');
    add('Finance in Business', 'FiB Pre-support');
    if (fewerThan3) add('CFO', 'CFO Approval for Fewer than 3 Quotations');
    add('CEO/Board', 'EMT (CoB) Authorization');
    add('CP Manager', 'Head of CP / CP Manager Authorization');
  } else {
    add('CP Manager', 'CP Review - Contract Strategy / Award Proposal');
    add('Finance in Business', 'FiB Validation');
    add('CEO/Board', 'Contract Board Authorization');
  }

  return steps;
}

function displayWorkflowLabel(row) {
  if (row.approver_role === 'HSSE Focal' && row.label === 'HSSE / Worker Welfare Approval') {
    return 'HSSE Focal Review';
  }
  return row.label;
}

async function buildPRWorkflow(db, { tier, quoteCount, hsseRisk, workerWelfareRisk }) {
  try {
    const needsHsse = ['Medium', 'High'].includes(hsseRisk) || ['Medium', 'High'].includes(workerWelfareRisk);
    const fewerThan3 = Number(quoteCount || 0) < 3;
    const conditions = ['standard'];
    if (needsHsse) conditions.push('hsse_required');
    if (fewerThan3) conditions.push('fewer_than_3');

    const { rows } = await db.query(
      `SELECT approver_role, label
         FROM pr_workflow_config
        WHERE is_active = true
          AND value_band IN ('ALL', $1)
          AND condition_key = ANY($2)
        ORDER BY
          CASE WHEN value_band = 'ALL' THEN 0 ELSE 1 END,
          step_order`,
      [tier, conditions]
    );

    if (!rows.length) return buildPRWorkflowFallback({ tier, quoteCount, hsseRisk, workerWelfareRisk });
    return rows.map(r => ({ role: r.approver_role, label: displayWorkflowLabel(r) }));
  } catch {
    return buildPRWorkflowFallback({ tier, quoteCount, hsseRisk, workerWelfareRisk });
  }
}

// Shared shape for the (tier, quoteCount, risks) that build a PR's workflow.
const workflowInputs = (r) => ({
  tier: r.tier,
  quoteCount: r.quote_count,
  hsseRisk: r.hsse_risk,
  workerWelfareRisk: r.worker_welfare_risk,
});

function mapPR(r) {
  const quotations = Array.isArray(r.supplier_quotations) ? r.supplier_quotations : [];
  const suppliers = quotations.length
    ? quotations.map(q => ({ name: q.supplierName, quoteAmount: Number(q.quoteAmount) }))
    : (r.suppliers ?? []);
  const quoteAmounts = suppliers
    .map(s => Number(s?.quoteAmount))
    .filter(n => Number.isFinite(n) && n > 0);
  const avgQuote = quoteAmounts.length
    ? quoteAmounts.reduce((a, b) => a + b, 0) / quoteAmounts.length
    : null;
  const currentBudget = r.current_budget_omr == null ? null : Number(r.current_budget_omr);
  const selectedQuotation = quotations.find((q) => q.isSelected);
  const selectedSupplier = selectedQuotation?.supplierName || r.selected_supplier || null;
  const selectedSupplierQuote = suppliers.find((supplier) => supplier?.name === selectedSupplier)?.quoteAmount;
  const selectedQuoteAmount = Number(selectedSupplierQuote);
  const derivedQuoteCount = quotations.length
    ? quotations.filter((q) => q.documentId || q.legacyAttachmentExempt).length
    : Number(r.quote_count || 0);
  const savings = currentBudget != null && Number.isFinite(selectedQuoteAmount) && selectedQuoteAmount > 0
    ? currentBudget - selectedQuoteAmount
    : null;

  return {
    id:                   r.id,
    title:                r.title,
    description:          r.description,
    requestorName:        r.requestor_name,
    requestorId:          r.requestor_id ?? null,
    department:           r.department,
    totalValue:           Number(r.total_value),
    tier:                 r.tier,
    status:               r.status,
    currentStepIndex:     r.current_step_index ?? 0,
    capexRequestId:       r.capex_request_id ?? null,
    quoteCount:           derivedQuoteCount,
    requiresJustification: derivedQuoteCount < 3,
    justification:        r.justification,
    hsseRisk:             r.hsse_risk ?? 'Low',
    workerWelfareRisk:    r.worker_welfare_risk ?? 'Low',
    suppliers,
    supplierQuotations:   quotations.map(q => ({
      id: q.id,
      supplierName: q.supplierName,
      quoteAmount: Number(q.quoteAmount),
      documentId: q.documentId,
      documentName: q.documentName || null,
      documentSize: q.documentSize || null,
      isSelected: Boolean(q.isSelected),
      legacyAttachmentExempt: Boolean(q.legacyAttachmentExempt),
    })),
    selectedSupplier,
    selectedQuotationId:   selectedQuotation?.id || null,
    currentBudget,
    avgQuote,
    savings,
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

const RISK_LEVELS = ['Low', 'Medium', 'High'];
const bad = (msg) => { const e = new Error(msg); e.status = 400; throw e; };

function requestBody(req) {
  if (!req.body?.request) return req.body || {};
  try {
    return JSON.parse(req.body.request);
  } catch {
    bad('request must be valid JSON');
  }
}

function quotationFile(files, index) {
  return (files || []).find((file) => (
    file.fieldname === `quoteFile_${index}`
    || file.fieldname === `quotations[${index}][file]`
    || file.fieldname === `quotationFiles[${index}]`
  )) || null;
}

function fileSizeLabel(file) {
  if (!file) return 'Unknown';
  return file.size > 1048576
    ? `${(file.size / 1048576).toFixed(1)} MB`
    : `${Math.round(file.size / 1024)} KB`;
}

function normaliseQuotations(body, files = [], { requireFiles = false } = {}) {
  const raw = Array.isArray(body.quotations) ? body.quotations : body.suppliers;
  if (!Array.isArray(raw)) bad('quotations must be an array');

  return raw.map((q, i) => {
    if (!q || typeof q !== 'object') bad(`quotations[${i}] must be an object`);
    const supplierName = String(q.supplierName ?? q.name ?? '').trim();
    if (!supplierName) bad(`quotations[${i}].supplierName is required`);
    const quoteAmount = Number(q.quoteAmount ?? q.quoteAmountOmr);
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
      bad(`quotations[${i}].quoteAmount must be a positive number`);
    }
    const file = quotationFile(files, i);
    const documentId = q.documentId || null;
    if (requireFiles && !file && !documentId && !q.legacyAttachmentExempt) {
      bad(`quotations[${i}] requires a quote attachment`);
    }
    return {
      supplierName,
      quoteAmount,
      file,
      documentId,
      legacyAttachmentExempt: Boolean(q.legacyAttachmentExempt || (!file && !documentId)),
      isSelected: Boolean(q.isSelected || q.selected),
    };
  });
}

function completeQuoteCount(quotations = []) {
  return quotations.filter((q) => q.file || q.documentId || q.legacyAttachmentExempt).length;
}

async function nextDocumentId(db) {
  const seq = String(await nextSequence(db, 'pr_documents', 'DOC-', 2)).padStart(3, '0');
  return `DOC-${seq}`;
}

async function insertQuoteDocument(db, prId, file, uploadedBy) {
  if (!file) return null;
  const id = await nextDocumentId(db);
  const { rows: [doc] } = await db.query(
    `INSERT INTO pr_documents (id, pr_id, name, type, size, uploaded_by, mime_type, size_bytes, file_data)
     VALUES ($1,$2,$3,'Quote',$4,$5,$6,$7,$8) RETURNING id`,
    [id, prId, file.originalname, fileSizeLabel(file), uploadedBy,
     file.mimetype || null, file.size || null, file.buffer || null]
  );
  return doc.id;
}

async function replaceQuotations(db, prId, quotations, uploadedBy) {
  await db.query(`DELETE FROM pr_supplier_quotations WHERE pr_id = $1`, [prId]);
  const rows = [];
  for (let i = 0; i < quotations.length; i += 1) {
    const q = quotations[i];
    const documentId = q.file ? await insertQuoteDocument(db, prId, q.file, uploadedBy) : q.documentId;
    const id = `QTN-${prId}-${String(i + 1).padStart(2, '0')}`;
    const { rows: [row] } = await db.query(
      `INSERT INTO pr_supplier_quotations
         (id, pr_id, supplier_name, quote_amount_omr, document_id, is_selected, legacy_attachment_exempt, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [id, prId, q.supplierName, q.quoteAmount, documentId || null, q.isSelected,
       Boolean(q.legacyAttachmentExempt && !documentId), uploadedBy]
    );
    rows.push(row);
  }
  return rows;
}

function quotationSelect() {
  return `
    SELECT pr.*,
           COALESCE(jsonb_agg(jsonb_build_object(
             'id', q.id,
             'supplierName', q.supplier_name,
             'quoteAmount', q.quote_amount_omr,
             'documentId', q.document_id,
             'isSelected', q.is_selected,
             'legacyAttachmentExempt', q.legacy_attachment_exempt,
             'documentName', d.name,
             'documentSize', d.size
           ) ORDER BY q.created_at, q.id) FILTER (WHERE q.id IS NOT NULL), '[]'::jsonb) AS supplier_quotations
      FROM purchase_requests pr
      LEFT JOIN pr_supplier_quotations q ON q.pr_id = pr.id
      LEFT JOIN pr_documents d ON d.id = q.document_id
  `;
}

async function readPRById(db, id) {
  const { rows: [row] } = await db.query(
    `${quotationSelect()}
     WHERE pr.id = $1
     GROUP BY pr.id`,
    [id]
  );
  return row;
}

async function syncPurchaseRequestQuoteProjection(db, prId, quotations) {
  const suppliers = quotations.map((q) => ({
    name: q.supplierName,
    quoteAmount: Number(q.quoteAmount),
  }));
  const selected = quotations.find((q) => q.isSelected)?.supplierName || null;
  const count = completeQuoteCount(quotations);
  await db.query(
    `UPDATE purchase_requests
     SET suppliers = $2::jsonb,
         selected_supplier = $3,
         quote_count = $4,
         requires_justification = $5
     WHERE id = $1`,
    [prId, JSON.stringify(suppliers), selected, count, count < 3]
  );
}

// Validate and normalise the risk + sourcing intake fields shared by create and
// updateDraft. Throws a tagged 400 on malformed input; returns normalised values
// (defaults applied) for persistence.
function normaliseIntake(body) {
  const hsseRisk = body.hsseRisk ?? 'Low';
  const workerWelfareRisk = body.workerWelfareRisk ?? 'Low';
  if (!RISK_LEVELS.includes(hsseRisk)) bad(`hsseRisk must be one of: ${RISK_LEVELS.join(', ')}`);
  if (!RISK_LEVELS.includes(workerWelfareRisk)) bad(`workerWelfareRisk must be one of: ${RISK_LEVELS.join(', ')}`);

  let currentBudget = null;
  if (body.currentBudget !== undefined && body.currentBudget !== null && body.currentBudget !== '') {
    currentBudget = Number(body.currentBudget);
    if (!Number.isFinite(currentBudget) || currentBudget <= 0) bad('currentBudget must be a positive number');
  }

  return { hsseRisk, workerWelfareRisk, currentBudget };
}

function assertSubmissionReady({ quotations, justification }) {
  if (!Array.isArray(quotations) || quotations.length === 0) {
    bad('At least one supplier quotation entry is required before submitting or resubmitting a purchase request');
  }
  const quotes = completeQuoteCount(quotations);
  if (quotes < 3 && !(justification && String(justification).trim())) {
    bad('Justification is required when fewer than 3 quotations are provided');
  }
}

// ── GET /api/purchase-requests ────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    const pagination = parsePagination(req.query, { defaultPageSize: 10, maxPageSize: 100 });
    const hasStatusFilter = status && status.toUpperCase() !== 'ALL';
    const filterValues = hasStatusFilter ? [status.toUpperCase()] : [];
    const whereClause = hasStatusFilter ? 'WHERE UPPER(status) = $1' : '';
    const orderClause = 'ORDER BY created_at DESC, id DESC';

    if (!pagination.enabled) {
      const { rows } = await pool.query(
        `${quotationSelect()}
         ${whereClause ? whereClause.replace('status', 'pr.status') : ''}
         GROUP BY pr.id ${orderClause.replace('created_at', 'pr.created_at').replace('id', 'pr.id')}`,
        filterValues
      );
      return res.json(rows.map(mapPR));
    }

    const itemQueryValues = [...filterValues, pagination.limit, pagination.offset];
    const limitParam = hasStatusFilter ? '$2' : '$1';
    const offsetParam = hasStatusFilter ? '$3' : '$2';

    const [itemsResult, totalResult, countsResult] = await Promise.all([
      pool.query(
        `${quotationSelect()}
         ${whereClause ? whereClause.replace('status', 'pr.status') : ''}
         GROUP BY pr.id
         ${orderClause.replace('created_at', 'pr.created_at').replace('id', 'pr.id')}
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        itemQueryValues
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM purchase_requests
         ${whereClause}`,
        filterValues
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE requires_justification = true)::int AS needs_justification,
           COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')::int AS pending_approval,
           COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
           COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
           COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft
         FROM purchase_requests`
      ),
    ]);

    const totalItems = totalResult.rows[0]?.total ?? 0;
    const counts = countsResult.rows[0] || {};

    res.json({
      items: itemsResult.rows.map(mapPR),
      pagination: buildPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
      }),
      counts: {
        all: counts.total ?? 0,
        pending: counts.pending_approval ?? 0,
        approved: counts.approved ?? 0,
        rejected: counts.rejected ?? 0,
        draft: counts.draft ?? 0,
        needsJustification: counts.needs_justification ?? 0,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/purchase-requests/:id ────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const pr = await readPRById(pool, req.params.id);
    if (!pr) return res.status(404).json({ error: 'Purchase request not found' });
    const workflow = await buildPRWorkflow(pool, workflowInputs(pr));
    res.json({ ...mapPR(pr), workflow });
  } catch (err) { next(err); }
};

// ── POST /api/purchase-requests ───────────────────────────────────────────────
exports.create = async (req, res, next) => {
  let client;
  try {
    const body = requestBody(req);
    const { title, description, requestorName, department, totalValue, lineItems, justification, capexRequestId } = body;
    if (!title || totalValue === undefined) {
      return res.status(400).json({ error: 'title and totalValue are required' });
    }
    const amount = Number(totalValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'totalValue must be a positive number' });
    }
    if (!department || !String(department).trim()) {
      return res.status(400).json({ error: 'department is required' });
    }
    const intake = normaliseIntake(body);
    const quotations = normaliseQuotations(body, req.files || [], { requireFiles: Boolean(req.files?.length) });
    const selectedSupplier = body.selectedSupplier ? String(body.selectedSupplier).trim() : null;
    quotations.forEach((q) => { q.isSelected = q.isSelected || (!!selectedSupplier && q.supplierName === selectedSupplier); });
    const quotes = completeQuoteCount(quotations);
    assertSubmissionReady({ quotations, justification });

    client = await pool.connect();
    await client.query('BEGIN');

    const linkedCapexId = await validateCapexLink(client, capexRequestId);
    const tier  = await calcTierShared(Number(totalValue), client);
    const year  = new Date().getFullYear();
    const seq   = String(await nextSequence(client, 'purchase_requests', `PR-${year}-`, 3)).padStart(3, '0');
    const id    = `PR-${year}-${seq}`;
    const reqName = requestorName || req.user?.full_name || req.user?.email || 'Unknown';

    const uploadedBy = req.user?.full_name || req.user?.email || 'Unknown';
    const { rows: [row] } = await client.query(
      `INSERT INTO purchase_requests
         (id, title, description, requestor_name, requestor_id, department, total_value,
          tier, status, quote_count, requires_justification, justification, line_items,
          approval_history, current_step_index, capex_request_id,
          hsse_risk, worker_welfare_risk, suppliers, selected_supplier, current_budget_omr)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING_APPROVAL',$9,$10,$11,$12,'[]'::jsonb,0,$13,
               $14,$15,$16,$17,$18)
       RETURNING *`,
      [id, title, description||'', reqName, toUuid(req.user?.id), department||'Unknown',
       Number(totalValue), tier, quotes, quotes < 3,
       justification||'', JSON.stringify(lineItems||[]), linkedCapexId,
       intake.hsseRisk, intake.workerWelfareRisk, JSON.stringify([]),
       null, intake.currentBudget]
    );
    const insertedQuotations = await replaceQuotations(client, id, quotations, uploadedBy);
    await syncPurchaseRequestQuoteProjection(client, id, insertedQuotations.map((q) => ({
      supplierName: q.supplier_name,
      quoteAmount: q.quote_amount_omr,
      documentId: q.document_id,
      legacyAttachmentExempt: q.legacy_attachment_exempt,
      isSelected: q.is_selected,
    })));
    await client.query('COMMIT');
    const created = await readPRById(pool, row.id);
    const workflow = await buildPRWorkflow(pool, workflowInputs(created));
    res.status(201).json({ ...mapPR(created), workflow });
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
    const body = requestBody(req);
    const { title, description, department, totalValue, lineItems, justification, capexRequestId } = body;
    if (!title || totalValue === undefined) {
      return res.status(400).json({ error: 'title and totalValue are required' });
    }
    const amount = Number(totalValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'totalValue must be a positive number' });
    }
    if (!department || !String(department).trim()) {
      return res.status(400).json({ error: 'department is required' });
    }
    const intake = normaliseIntake(body);
    const quotations = normaliseQuotations(body, req.files || [], { requireFiles: false });
    const selectedSupplier = body.selectedSupplier ? String(body.selectedSupplier).trim() : null;
    quotations.forEach((q) => { q.isSelected = q.isSelected || (!!selectedSupplier && q.supplierName === selectedSupplier); });
    const quotes = completeQuoteCount(quotations);

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
           line_items = $9, capex_request_id = $10,
           hsse_risk = $12, worker_welfare_risk = $13, suppliers = $14,
           selected_supplier = $15, current_budget_omr = $16
       WHERE id = $11
       RETURNING *`,
      [
        title, description || '', department || 'Unknown', Number(totalValue), tier,
        quotes, quotes < 3, justification || '', JSON.stringify(lineItems || []),
        linkedCapexId, req.params.id,
        intake.hsseRisk, intake.workerWelfareRisk, JSON.stringify([]),
        null, intake.currentBudget,
      ]
    );
    const uploadedBy = req.user?.full_name || req.user?.email || 'Unknown';
    const insertedQuotations = await replaceQuotations(client, req.params.id, quotations, uploadedBy);
    await syncPurchaseRequestQuoteProjection(client, req.params.id, insertedQuotations.map((q) => ({
      supplierName: q.supplier_name,
      quoteAmount: q.quote_amount_omr,
      documentId: q.document_id,
      legacyAttachmentExempt: q.legacy_attachment_exempt,
      isSelected: q.is_selected,
    })));
    await client.query('COMMIT');
    const updated = await readPRById(pool, row.id);
    res.json({ ...mapPR(updated), workflow: await buildPRWorkflow(pool, workflowInputs(updated)) });
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
    const { rows: existingQuotations } = await client.query(
      `SELECT supplier_name AS "supplierName",
              quote_amount_omr AS "quoteAmount",
              document_id AS "documentId",
              legacy_attachment_exempt AS "legacyAttachmentExempt",
              is_selected AS "isSelected"
         FROM pr_supplier_quotations
        WHERE pr_id = $1
        ORDER BY created_at, id`,
      [req.params.id]
    );
    assertSubmissionReady({
      quotations: existingQuotations,
      justification: existing.justification,
    });

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
    const updated = await readPRById(pool, pr.id);
    res.json({ ...mapPR(updated), workflow: await buildPRWorkflow(pool, workflowInputs(updated)) });
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

    const workflow = await buildPRWorkflow(client, workflowInputs(pr));
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
      if (nextStatus === 'APPROVED') {
        const { rows: [selected] } = await client.query(
          `SELECT id FROM pr_supplier_quotations
           WHERE pr_id = $1 AND is_selected = true`,
          [req.params.id]
        );
        if (!selected) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'A selected supplier quotation is required before final approval' });
        }
      }
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
    const refreshed = await readPRById(pool, updated.id);
    res.json({ ...mapPR(refreshed), workflow });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
};

// ── PATCH /api/purchase-requests/:id/supplier-selection ──────────────────────
exports.selectSupplierQuotation = async (req, res, next) => {
  let client;
  try {
    if (!canSelectSupplier(req)) {
      return res.status(403).json({ error: 'Only CP Lead, CP Manager, or Admin can select a supplier quotation' });
    }
    const { quotationId } = req.body;
    if (!quotationId) return res.status(400).json({ error: 'quotationId is required' });

    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: [pr] } = await client.query(
      `SELECT * FROM purchase_requests WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!pr) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase request not found' });
    }
    if (pr.status !== 'PENDING_APPROVAL') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Supplier selection can only be changed while approval is pending' });
    }

    const { rows: [quotation] } = await client.query(
      `SELECT * FROM pr_supplier_quotations
       WHERE pr_id = $1 AND id = $2 AND (document_id IS NOT NULL OR legacy_attachment_exempt = true)`,
      [req.params.id, quotationId]
    );
    if (!quotation) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'quotationId must reference a complete quotation on this purchase request' });
    }

    await client.query(`UPDATE pr_supplier_quotations SET is_selected = false WHERE pr_id = $1`, [req.params.id]);
    const quoteAmount = Number(quotation.quote_amount_omr).toLocaleString('en-GB', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
    await client.query(
      `UPDATE pr_supplier_quotations
       SET is_selected = true, updated_at = NOW()
       WHERE pr_id = $1 AND id = $2`,
      [req.params.id, quotationId]
    );
    await client.query(
      `UPDATE purchase_requests
       SET selected_supplier = $2,
           approval_history = approval_history || $3::jsonb
       WHERE id = $1`,
      [req.params.id, quotation.supplier_name, JSON.stringify({
        approver: req.user?.full_name || req.user?.email || 'Unknown',
        role: req.user?.role || 'Unknown',
        decision: 'SUPPLIER_SELECTED',
        stepLabel: 'Supplier quotation selected',
        comment: `${quotation.supplier_name} selected at OMR ${quoteAmount}.`,
        date: new Date().toISOString().split('T')[0],
      })]
    );

    await client.query('COMMIT');
    const updated = await readPRById(pool, req.params.id);
    res.json({ ...mapPR(updated), workflow: await buildPRWorkflow(pool, workflowInputs(updated)) });
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
      `SELECT id, pr_id, name, type, size, uploaded_by, uploaded_at, file_data IS NOT NULL AS has_file
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
      hasFile:    d.has_file,
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
    if (type === 'Quote') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Quote documents must be uploaded through supplier quotations' });
    }
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
      `SELECT department, tier, quote_count, hsse_risk, worker_welfare_risk
       FROM purchase_requests
       WHERE id = $1`,
      [req.params.id]
    );
    if (!pr) return res.status(404).json({ error: 'Purchase request not found' });
    res.json({
      workflow: await buildPRWorkflow(pool, workflowInputs(pr)),
      tier: pr.tier,
      department: pr.department,
    });
  } catch (err) { next(err); }
};
