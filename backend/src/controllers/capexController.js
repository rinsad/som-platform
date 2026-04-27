const pool   = require('../database/db');
const multer = require('multer');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

const _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.csvUploadMiddleware = _upload.single('file');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
