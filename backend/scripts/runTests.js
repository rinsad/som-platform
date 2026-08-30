const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

process.env.NODE_ENV = 'test';
// Pin the suite to the deployment timezone (UTC+4) unless the caller overrides
// it. Date handling differs east and west of Greenwich — notably pg reading a
// DATE column into a JS Date at local midnight — and a UTC runner would hide
// those bugs entirely. This must happen before jest starts; assigning
// process.env.TZ from inside a test does not reach V8's timezone cache.
process.env.TZ = process.env.TZ || 'Asia/Muscat';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.TEST_DATABASE_URL) {
  console.error('TEST_DATABASE_URL is required for backend tests.');
  console.error('Set it in backend/.env, for example: postgresql://postgres:1234@127.0.0.1:5432/som_platform_test');
  process.exit(1);
}

if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  console.error('TEST_DATABASE_URL must be different from DATABASE_URL.');
  process.exit(1);
}

if (!process.argv.includes('--runInBand')) {
  process.argv.push('--runInBand');
}

async function seedTestAdmin() {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    for (const migration of [
      '023_pr_supplier_quotations.sql',
      '029_capex_approval_step_aging.sql',
      '030_capex_mandatory_hsse_screening.sql',
      '031_capex_v2_foundation.sql',
      '032_capex_v2_import_source_content.sql',
      '033_multi_business_scoping.sql',
      '034_capex_project_owner_creates.sql',
      '035_capex_repository_categories_and_dates.sql',
      '036_capex_milestone_period_and_evidence.sql',
    ]) {
      const sql = fs.readFileSync(path.resolve(__dirname, `../src/database/migrations/${migration}`), 'utf8');
      await client.query(sql);
    }
    const passwordHash = await bcrypt.hash('password', 4);
    await client.query(
      `UPDATE som_users
       SET password_hash = $1, role = 'Admin', department = 'IT', is_active = true
       WHERE email = 'admin@shell.om'`,
      [passwordHash]
    );
  } finally {
    await client.end();
  }
}

seedTestAdmin()
  .then(() => require('jest/bin/jest'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
