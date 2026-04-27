const pool = require('../database/db');

const REGION_CODES = { Muscat: 'MSQ', Salalah: 'SLL', Sohar: 'SHR' };
const TYPE_CODES   = {
  Generator: 'GEN', Dispenser: 'DSP', HVAC: 'HVC', Security: 'SEC',
  Lighting:  'CNP', Electrical: 'TRN', Pump: 'PMP', Other: 'OTH',
};

function mapAsset(r) {
  return {
    assetCode:     r.asset_code,
    name:          r.name,
    region:        r.region,
    site:          r.site,
    facility:      r.facility,
    equipmentType: r.equipment_type,
    department:    r.department,
    status:        r.status,
  };
}

function mapWO(r) {
  return {
    id:             r.id,
    assetCode:      r.asset_code,
    assetName:      r.asset_name,
    type:           r.type,
    priority:       r.priority,
    description:    r.description,
    scheduledDate:  r.scheduled_date,
    completedDate:  r.completed_date,
    status:         r.status,
    technician:     r.technician,
    department:     r.department,
    estimatedHours: Number(r.estimated_hours),
    notes:          r.notes,
  };
}

// ── GET /api/assets ───────────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { region, status } = req.query;
    let q = `SELECT * FROM assets WHERE 1=1`;
    const vals = [];
    if (region) { vals.push(region); q += ` AND LOWER(region) = LOWER($${vals.length})`; }
    if (status) { vals.push(status); q += ` AND LOWER(status) = LOWER($${vals.length})`; }
    q += ` ORDER BY region, site, asset_code`;
    const { rows } = await pool.query(q, vals);
    res.json(rows.map(mapAsset));
  } catch (err) { next(err); }
};

// ── POST /api/assets ──────────────────────────────────────────────────────────
exports.createAsset = async (req, res, next) => {
  try {
    const { name, region, site, facility, equipmentType, department, status } = req.body;
    if (!name?.trim())      return res.status(400).json({ error: 'name is required' });
    if (!region)            return res.status(400).json({ error: 'region is required' });
    if (!site?.trim())      return res.status(400).json({ error: 'site is required' });
    if (!facility?.trim())  return res.status(400).json({ error: 'facility is required' });
    if (!equipmentType)     return res.status(400).json({ error: 'equipmentType is required' });

    // Generate asset code from DB state
    const { rows: existing } = await pool.query(
      `SELECT asset_code, site, facility FROM assets`
    );
    const assetCode = generateAssetCode(region, site, facility, equipmentType, existing);

    const { rows: [row] } = await pool.query(
      `INSERT INTO assets (asset_code, name, region, site, facility, equipment_type, department, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [assetCode, name.trim(), region, site.trim(), facility.trim(),
       equipmentType, department||'Operations', status||'Active']
    );
    res.status(201).json(mapAsset(row));
  } catch (err) { next(err); }
};

// ── GET /api/assets/alerts ────────────────────────────────────────────────────
exports.getAlerts = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT alert_id, asset_code, type, message, days_remaining, severity
       FROM asset_compliance_alerts ORDER BY days_remaining ASC`
    );
    res.json(rows.map(r => ({
      alertId:       r.alert_id,
      assetCode:     r.asset_code,
      type:          r.type,
      message:       r.message,
      daysRemaining: r.days_remaining,
      severity:      r.severity,
    })));
  } catch (err) { next(err); }
};

// ── GET /api/assets/:assetCode ────────────────────────────────────────────────
exports.getByCode = async (req, res, next) => {
  try {
    const { rows: [asset] } = await pool.query(
      `SELECT * FROM assets WHERE LOWER(asset_code) = LOWER($1)`, [req.params.assetCode]
    );
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const { rows: alerts } = await pool.query(
      `SELECT alert_id, asset_code, type, message, days_remaining, severity
       FROM asset_compliance_alerts WHERE asset_code = $1`, [asset.asset_code]
    );
    res.json({
      ...mapAsset(asset),
      alerts: alerts.map(r => ({
        alertId: r.alert_id, assetCode: r.asset_code, type: r.type,
        message: r.message, daysRemaining: r.days_remaining, severity: r.severity,
      })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/assets/utility-bills/:siteId ─────────────────────────────────────
exports.getBillsBySite = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, site_id, site_name, utility_type, period, amount, meter_reading, unit
       FROM utility_bills WHERE site_id = $1 ORDER BY utility_type, period`,
      [req.params.siteId]
    );
    const grouped = {};
    for (const b of rows) {
      if (!grouped[b.utility_type]) grouped[b.utility_type] = [];
      grouped[b.utility_type].push({
        id: b.id, siteId: b.site_id, siteName: b.site_name,
        utilityType: b.utility_type, period: b.period,
        amount: Number(b.amount), meterReading: b.meter_reading ? Number(b.meter_reading) : null,
        unit: b.unit,
      });
    }
    res.json({ siteId: req.params.siteId, bills: grouped });
  } catch (err) { next(err); }
};

// ── POST /api/assets/utility-bills ───────────────────────────────────────────
exports.createBill = async (req, res, next) => {
  try {
    const { siteId, siteName, utilityType, period, amount, meterReading, unit } = req.body;
    if (!period?.toString().trim()) return res.status(400).json({ error: 'period must not be empty' });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const { rows: [last] } = await pool.query(
      `SELECT id FROM utility_bills ORDER BY id DESC LIMIT 1`
    );
    const seq = last ? String(Number(last.id.split('-')[1]) + 1).padStart(3, '0') : '001';
    const id  = `UB-${seq}`;

    const { rows: [row] } = await pool.query(
      `INSERT INTO utility_bills (id, site_id, site_name, utility_type, period, amount, meter_reading, unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (site_id, utility_type, period)
         DO UPDATE SET amount=$6, meter_reading=$7, unit=$8
       RETURNING *`,
      [id, siteId, siteName||'', utilityType, period, Number(amount), meterReading||null, unit||'']
    );
    res.status(201).json({
      id: row.id, siteId: row.site_id, siteName: row.site_name,
      utilityType: row.utility_type, period: row.period,
      amount: Number(row.amount), meterReading: row.meter_reading ? Number(row.meter_reading) : null,
      unit: row.unit,
    });
  } catch (err) { next(err); }
};

// ── GET /api/assets/work-orders ───────────────────────────────────────────────
exports.getWorkOrders = async (req, res, next) => {
  try {
    const { status, type, priority, assetCode } = req.query;
    let q = `SELECT * FROM maintenance_work_orders WHERE 1=1`;
    const vals = [];
    if (status)    { vals.push(status);    q += ` AND status = $${vals.length}`; }
    if (type)      { vals.push(type);      q += ` AND type = $${vals.length}`; }
    if (priority)  { vals.push(priority);  q += ` AND priority = $${vals.length}`; }
    if (assetCode) { vals.push(assetCode); q += ` AND asset_code = $${vals.length}`; }
    q += ` ORDER BY scheduled_date, id`;
    const { rows } = await pool.query(q, vals);
    res.json(rows.map(mapWO));
  } catch (err) { next(err); }
};

// ── POST /api/assets/work-orders ──────────────────────────────────────────────
exports.createWorkOrder = async (req, res, next) => {
  try {
    const { assetCode, type, priority, description, scheduledDate, technician, department, estimatedHours, notes } = req.body;
    if (!assetCode?.trim())    return res.status(400).json({ error: 'assetCode is required' });
    if (!description?.trim())  return res.status(400).json({ error: 'description is required' });
    if (!scheduledDate)        return res.status(400).json({ error: 'scheduledDate is required' });

    const year = new Date().getFullYear();
    const { rows: [last] } = await pool.query(
      `SELECT id FROM maintenance_work_orders WHERE id LIKE 'WO-${year}-%' ORDER BY id DESC LIMIT 1`
    );
    const seq = last ? String(Number(last.id.split('-')[2]) + 1).padStart(3, '0') : '001';
    const id  = `WO-${year}-${seq}`;

    const { rows: [asset] } = await pool.query(
      `SELECT name FROM assets WHERE asset_code = $1`, [assetCode]
    );

    const { rows: [row] } = await pool.query(
      `INSERT INTO maintenance_work_orders
         (id, asset_code, asset_name, type, priority, description, scheduled_date, status, technician, department, estimated_hours, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Open',$8,$9,$10,$11)
       RETURNING *`,
      [id, assetCode, asset?.name||assetCode, type||'Planned', priority||'Medium',
       description.trim(), scheduledDate, technician||'', department||'',
       Number(estimatedHours)||0, notes||'']
    );
    res.status(201).json(mapWO(row));
  } catch (err) { next(err); }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateAssetCode(region, site, facility, equipmentType, existingAssets) {
  const rrr      = REGION_CODES[region] || region.slice(0, 3).toUpperCase();
  const typeCode = TYPE_CODES[equipmentType] || equipmentType.slice(0, 3).toUpperCase();

  const siteNums = {};
  existingAssets.forEach(a => {
    const parts = a.asset_code.split('-');
    if (!siteNums[a.site]) siteNums[a.site] = parts[1];
  });
  const siteNum = siteNums[site] || String(Object.keys(siteNums).length + 1).padStart(3, '0');

  const facNums = {};
  existingAssets.forEach(a => {
    const key  = `${a.site}:${a.facility}`;
    const parts = a.asset_code.split('-');
    if (!facNums[key]) facNums[key] = parts[2];
  });
  const facKey = `${site}:${facility}`;
  const facNum = facNums[facKey] || `F${String(Object.keys(facNums).length + 1).padStart(2, '0')}`;

  const prefix   = `${rrr}-${siteNum}-${facNum}-${typeCode}`;
  const existing = existingAssets.filter(a => a.asset_code.startsWith(prefix));
  const seq      = String(existing.length + 1).padStart(3, '0');

  return `${prefix}${seq}`;
}
