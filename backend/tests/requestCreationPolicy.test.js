// Only the Project Owner (and Admin, for now) may raise CAPEX or purchase
// requests. Enforced in two places — the permission presets that shape the UI,
// and a server-side guard that holds even if a permission row was granted before
// the rule existed.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const pool = require('../src/database/db');
const {
  getRolePermissionPreset,
  canRoleCreateRequests,
  CREATE_ROLES,
  ROLE_PERMISSION_PRESETS,
} = require('../src/config/capexRolePermissions');

const secret = process.env.JWT_SECRET || 'som-super-secret-key-2026';

// Deliberately over-permissioned: these accounts are granted can_create on both
// modules, so the only thing that can stop them is the server-side guard.
const managerId = '77777777-0000-4000-8000-000000000001';
const engineerId = '77777777-0000-4000-8000-000000000002';
const ownerId = '77777777-0000-4000-8000-000000000003';

const auth = (id, email, role) => ({
  Authorization: `Bearer ${jwt.sign({ id, email, full_name: email, role, department: 'Ops' }, secret)}`,
});

const managerAuth = auth(managerId, 'policy.manager@shell.om', 'Manager');
const engineerAuth = auth(engineerId, 'policy.engineer@shell.om', 'Project Engineer');
const ownerAuth = auth(ownerId, 'policy.owner@shell.om', 'Project Owner');

async function seedOverPermissionedUser(id, email, role) {
  await pool.query(
    `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role, department, is_active)
     VALUES ($1, $2, $3, $4, 'x', $5, 'Ops', true)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email, is_active = true`,
    [id, `POL-${id.slice(-4)}`, email, email, role]
  );
  await pool.query(
    `INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
     VALUES ($1, 'page', 'capex.requests', true, true, true, false),
            ($1, 'module', 'purchase-requests', true, true, true, false)
     ON CONFLICT (user_id, resource_key)
     DO UPDATE SET can_view = true, can_create = true, can_edit = true`,
    [id]
  );
}

beforeAll(async () => {
  await seedOverPermissionedUser(managerId, 'policy.manager@shell.om', 'Manager');
  await seedOverPermissionedUser(engineerId, 'policy.engineer@shell.om', 'Project Engineer');
  await seedOverPermissionedUser(ownerId, 'policy.owner@shell.om', 'Project Owner');
});

afterAll(async () => {
  for (const id of [managerId, engineerId, ownerId]) {
    await pool.query('DELETE FROM som_permissions WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM som_users WHERE id = $1', [id]);
  }
});

describe('who may raise requests', () => {
  test('only Project Owner and Admin', () => {
    expect(CREATE_ROLES).toEqual(['Project Owner', 'Admin']);
    expect(canRoleCreateRequests('Project Owner')).toBe(true);
    expect(canRoleCreateRequests('Admin')).toBe(true);
    for (const role of ['Manager', 'Project Engineer', 'CP Lead', 'CP Manager',
      'Business GM', 'CFO', 'CEO/Board', 'Finance in Business', 'HSSE Focal',
      'Internal Audit', 'Asset Team', 'Finance Manager', 'Employee', undefined]) {
      expect(canRoleCreateRequests(role)).toBe(false);
    }
  });

  test('no preset except Project Owner grants request creation', () => {
    for (const role of Object.keys(ROLE_PERMISSION_PRESETS)) {
      const preset = getRolePermissionPreset(role);
      const capex = preset.find((r) => r.resource_key === 'capex.requests');
      const pr = preset.find((r) => r.resource_key === 'purchase-requests');
      const expected = canRoleCreateRequests(role);
      if (capex) expect(capex.can_create).toBe(expected);
      if (pr) expect(pr.can_create).toBe(expected);
    }
  });

  test('the Admin application-level grant still covers creation', () => {
    const admin = getRolePermissionPreset('Admin');
    expect(admin.some((r) => r.resource_key === 'capex' && r.can_create)).toBe(true);
  });
});

describe('POST /api/capex/requests', () => {
  test('rejects a Line Manager even with can_create granted', async () => {
    const res = await request(app)
      .post('/api/capex/requests')
      .set(managerAuth)
      .field('payload', JSON.stringify({ title: 'x', department: 'Aviation', estimatedValue: 1000, scopeDetails: 'x' }));

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Project Owner's responsibility/);
  });

  test('rejects a Project Engineer even with can_create granted', async () => {
    const res = await request(app)
      .post('/api/capex/requests')
      .set(engineerAuth)
      .field('payload', JSON.stringify({ title: 'x', department: 'Aviation', estimatedValue: 1000, scopeDetails: 'x' }));

    expect(res.statusCode).toBe(403);
  });

  test('lets the Project Owner through to normal validation', async () => {
    const res = await request(app)
      .post('/api/capex/requests')
      .set(ownerAuth)
      .field('payload', JSON.stringify({ title: 'x', department: 'Aviation', estimatedValue: 1000, scopeDetails: 'x' }));

    // Past the policy gate: fails on the missing quotations/evidence instead.
    expect(res.statusCode).toBe(400);
    expect(res.body.error).not.toMatch(/responsibility/);
  });
});

describe('POST /api/purchase-requests', () => {
  test('rejects a Line Manager even with can_create granted', async () => {
    const res = await request(app)
      .post('/api/purchase-requests')
      .set(managerAuth)
      .send({ title: 'x', department: 'Operations', totalValue: 500 });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Project Owner's responsibility/);
  });

  test('lets the Project Owner through to normal validation', async () => {
    const res = await request(app)
      .post('/api/purchase-requests')
      .set(ownerAuth)
      .send({ title: 'x', department: 'Operations', totalValue: 500 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).not.toMatch(/responsibility/);
  });
});

describe('updating the PO', () => {
  test('the Project Owner holds capex.procurement edit', () => {
    const preset = getRolePermissionPreset('Project Owner');
    const procurement = preset.find((r) => r.resource_key === 'capex.procurement');
    expect(procurement).toBeDefined();
    expect(procurement.can_view).toBe(true);
    expect(procurement.can_edit).toBe(true);
  });
});
