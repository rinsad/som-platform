const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

process.env.NODE_ENV = 'test';
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
    const prQuotationMigration = fs.readFileSync(
      path.resolve(__dirname, '../src/database/migrations/023_pr_supplier_quotations.sql'),
      'utf8'
    );
    await client.query(prQuotationMigration);
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
