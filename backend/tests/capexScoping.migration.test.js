// Migration 033 must be safe to replay. migrate.js re-runs every file on every
// deploy with no migrations table, so a backfill that is not guarded would
// silently revert an administrator's manual correction.
const fs = require('fs');
const path = require('path');
const pool = require('../src/database/db');

const MIGRATION = path.resolve(__dirname, '../src/database/migrations/033_multi_business_scoping.sql');
const sql = fs.readFileSync(MIGRATION, 'utf8');

const counts = async () => {
  const { rows: [row] } = await pool.query(
    `SELECT (SELECT count(*)::int FROM capex_v2.organization_units) AS units,
            (SELECT count(*)::int FROM capex_v2.organization_unit_aliases) AS aliases,
            (SELECT count(*)::int FROM capex_v2.user_scope_assignments
              WHERE source = 'DERIVED_FROM_PROFILE') AS derived,
            (SELECT enforcement_mode FROM capex_scope_settings WHERE id = 1) AS mode`
  );
  return row;
};

describe('033_multi_business_scoping', () => {
  // Converge first: the property under test is "replaying a settled migration
  // changes nothing", not "the first application changes nothing".
  beforeAll(() => pool.query(sql));

  test('replaying it is a no-op', async () => {
    const before = await counts();
    await pool.query(sql);
    await pool.query(sql);
    expect(await counts()).toEqual(before);
  });

  test('does not revert a manual business reassignment', async () => {
    const { rows: [unit] } = await pool.query(
      `INSERT INTO capex_v2.organization_units (code, name, unit_type)
       VALUES ('MIGTEST_UNIT', 'Migration Test Unit', 'BUSINESS_UNIT')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    await pool.query(
      `INSERT INTO capex_requests
         (id, title, requester_name, department, estimated_value, currency, value_band,
          scope_details, status, organization_unit_id)
       VALUES ('CAPEX-MIGTEST-1', 'Migration fixture', 'Seeder', 'Aviation', 1000, 'OMR',
               'LOW', 'fixture', 'Draft', $1)
       ON CONFLICT (id) DO UPDATE SET organization_unit_id = EXCLUDED.organization_unit_id`,
      [unit.id]
    );

    try {
      // The department says Aviation; an admin has deliberately filed it elsewhere.
      await pool.query(sql);

      const { rows: [row] } = await pool.query(
        `SELECT organization_unit_id FROM capex_requests WHERE id = 'CAPEX-MIGTEST-1'`
      );
      expect(row.organization_unit_id).toBe(unit.id);
    } finally {
      await pool.query(`DELETE FROM capex_requests WHERE id = 'CAPEX-MIGTEST-1'`);
      await pool.query(`DELETE FROM capex_v2.organization_units WHERE code = 'MIGTEST_UNIT'`);
    }
  });

  test('does not re-disable enforcement once it has been switched on', async () => {
    const { rows: [before] } = await pool.query(`SELECT enforcement_mode FROM capex_scope_settings WHERE id = 1`);
    await pool.query(`UPDATE capex_scope_settings SET enforcement_mode = 'on' WHERE id = 1`);
    try {
      await pool.query(sql);
      const { rows: [after] } = await pool.query(`SELECT enforcement_mode FROM capex_scope_settings WHERE id = 1`);
      expect(after.enforcement_mode).toBe('on');
    } finally {
      await pool.query(`UPDATE capex_scope_settings SET enforcement_mode = $1 WHERE id = 1`, [before.enforcement_mode]);
    }
  });

  test('leaves no request unmapped when its department is known', async () => {
    const { rows: [capex] } = await pool.query(
      `SELECT count(*)::int AS n FROM capex_requests
        WHERE organization_unit_id IS NULL AND btrim(COALESCE(department, '')) <> ''`
    );
    const { rows: [pr] } = await pool.query(
      `SELECT count(*)::int AS n FROM purchase_requests
        WHERE organization_unit_id IS NULL AND btrim(COALESCE(department, '')) <> ''`
    );
    expect(capex.n).toBe(0);
    expect(pr.n).toBe(0);
  });

  test('every legacy department string resolves through the alias bridge', async () => {
    const { rows } = await pool.query(
      `SELECT DISTINCT btrim(dept) AS dept FROM (
         SELECT department AS dept FROM capex_requests    WHERE btrim(COALESCE(department,'')) <> ''
         UNION ALL
         SELECT department        FROM purchase_requests WHERE btrim(COALESCE(department,'')) <> ''
       ) src
       WHERE NOT EXISTS (
         SELECT 1 FROM capex_v2.organization_unit_aliases al
          WHERE al.alias_normalized = lower(btrim(src.dept)))`
    );
    expect(rows.map((r) => r.dept)).toEqual([]);
  });
});
