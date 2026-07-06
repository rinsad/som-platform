// Shared CAPEX value-band thresholds. The single source of truth is the
// capex_value_thresholds row (admin-editable); both the CAPEX and Purchase
// Request modules band values against it so they never diverge.
const pool = require('../database/db');

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

module.exports = { getValueThresholds, calcValueBandWithThresholds };
