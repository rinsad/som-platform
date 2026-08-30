const fs = require('fs');
const path = require('path');
const pool = require('../src/database/db');

describe('CAPEX v2 migration', () => {
  test('creates the isolated schema and principal controls', async () => {
    const { rows: [result] } = await pool.query(
      `SELECT
         to_regnamespace('capex_v2') IS NOT NULL AS schema_exists,
         to_regclass('capex_v2.budget_ledger_entries') IS NOT NULL AS ledger_exists,
         to_regclass('capex_v2.requests') IS NOT NULL AS requests_exist,
         to_regclass('capex_v2.projects') IS NOT NULL AS projects_exist,
         to_regclass('capex_v2.workflow_simulations') IS NOT NULL AS simulations_exist,
         EXISTS (
           SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'capex_v2'
              AND table_name = 'budget_import_batches'
              AND column_name = 'original_content'
         ) AS import_content_exists`
    );
    expect(result).toEqual({
      schema_exists: true,
      ledger_exists: true,
      requests_exist: true,
      projects_exist: true,
      simulations_exist: true,
      import_content_exists: true,
    });
  });

  test('rollback SQL is valid and leaves the schema intact when rolled back', async () => {
    const rollbackSql = fs.readFileSync(
      path.resolve(__dirname, '../src/database/rollbacks/031_capex_v2_foundation.sql'),
      'utf8'
    );
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(rollbackSql);
      const { rows: [inside] } = await client.query(`SELECT to_regnamespace('capex_v2') IS NULL AS removed`);
      expect(inside.removed).toBe(true);
      await client.query('ROLLBACK');
      const { rows: [after] } = await client.query(`SELECT to_regnamespace('capex_v2') IS NOT NULL AS restored`);
      expect(after.restored).toBe(true);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
});
