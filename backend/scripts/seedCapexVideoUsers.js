const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/database/db');
const { getRolePermissionPreset } = require('../src/config/capexRolePermissions');

const PASSWORD = process.env.CAPEX_DEMO_USER_PASSWORD || process.env.CAPEX_VIDEO_USER_PASSWORD || 'Test@1234';

const USERS = [
  { id: '10000000-0000-0000-0000-000000000001', employeeId: 'VID-001', fullName: 'CAPEX Admin', email: 'capex.admin@shell.om', role: 'Admin', department: 'IT' },
  { id: '10000000-0000-0000-0000-000000000002', employeeId: 'VID-002', fullName: 'CEO Board', email: 'ceo-board@shell.om', role: 'CEO/Board', department: 'Executive' },
  { id: '10000000-0000-0000-0000-000000000003', employeeId: 'VID-003', fullName: 'CFO', email: 'cfo@shell.om', role: 'CFO', department: 'Finance' },
  { id: '10000000-0000-0000-0000-000000000004', employeeId: 'VID-004', fullName: 'Finance Manager', email: 'finance-manager@shell.om', role: 'Finance Manager', department: 'Finance' },
  { id: '10000000-0000-0000-0000-000000000005', employeeId: 'VID-005', fullName: 'Finance in Business', email: 'finance-business@shell.om', role: 'Finance in Business', department: 'Finance' },
  { id: '10000000-0000-0000-0000-000000000006', employeeId: 'VID-006', fullName: 'CP Manager', email: 'cp-manager@shell.om', role: 'CP Manager', department: 'Procurement' },
  { id: '10000000-0000-0000-0000-000000000007', employeeId: 'VID-007', fullName: 'CP Lead', email: 'cp-lead@shell.om', role: 'CP Lead', department: 'Procurement' },
  { id: '10000000-0000-0000-0000-000000000008', employeeId: 'VID-008', fullName: 'Project Owner', email: 'project-owner@shell.om', role: 'Project Owner', department: 'Operations' },
  { id: '10000000-0000-0000-0000-000000000009', employeeId: 'VID-009', fullName: 'Project Engineer', email: 'project-engineer@shell.om', role: 'Project Engineer', department: 'Engineering' },
  { id: '10000000-0000-0000-0000-000000000010', employeeId: 'VID-010', fullName: 'Business GM', email: 'business-gm@shell.om', role: 'Business GM', department: 'Commercial' },
  { id: '10000000-0000-0000-0000-000000000011', employeeId: 'VID-011', fullName: 'Internal Audit', email: 'internal-audit@shell.om', role: 'Internal Audit', department: 'Internal Audit' },
  { id: '10000000-0000-0000-0000-000000000012', employeeId: 'VID-012', fullName: 'Asset Team', email: 'asset-team@shell.om', role: 'Asset Team', department: 'Assets' },
  { id: '10000000-0000-0000-0000-000000000013', employeeId: 'VID-013', fullName: 'HSSE Focal', email: 'hsse-focal@shell.om', role: 'HSSE Focal', department: 'HSSE' },
  { id: '10000000-0000-0000-0000-000000000014', employeeId: 'VID-014', fullName: 'Line Manager', email: 'manager@shell.om', role: 'Manager', department: 'Operations' },
];

async function upsertPermissions(client, userId, permissions) {
  await client.query('DELETE FROM som_permissions WHERE user_id = $1', [userId]);

  for (const p of permissions) {
    await client.query(
      `INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        p.level,
        p.resource_key,
        p.can_view ?? false,
        p.can_create ?? false,
        p.can_edit ?? false,
        p.can_delete ?? false,
      ]
    );
  }
}

async function main() {
  const client = await pool.connect();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  try {
    await client.query('BEGIN');

    for (const user of USERS) {
      await client.query(
        `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role, department, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (id)
         DO UPDATE SET
           employee_id = EXCLUDED.employee_id,
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           department = EXCLUDED.department,
           is_active = true`,
        [user.id, user.employeeId, user.fullName, user.email, passwordHash, user.role, user.department]
      );

      if (user.role !== 'Admin') {
        await upsertPermissions(client, user.id, getRolePermissionPreset(user.role));
      }
    }

    await client.query('COMMIT');
    console.log(`Seeded ${USERS.length} CAPEX demo users. Password: ${PASSWORD}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { USERS, PASSWORD };
