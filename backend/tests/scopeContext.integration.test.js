const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const pool = require('../src/database/db');
const { getScopeContext, resolveStepAssigneeSoft, resolveOrganizationUnitId } = require('../src/services/scopeContext');
const { SCOPE_TIERS } = require('../src/config/capexDataScopes');

const secret = process.env.JWT_SECRET || 'som-super-secret-key-2026';
const adminToken = jwt.sign({ id: 1, email: 'admin@shell.om', role: 'Admin', department: 'IT' }, secret);

const AVIATION_CODE = 'SCOPETEST_AVIATION';
const MOBILITY_CODE = 'SCOPETEST_MOBILITY';
const gmId = '55555555-0000-4000-8000-000000000001';
const fibId = '55555555-0000-4000-8000-000000000002';
const strangerId = '55555555-0000-4000-8000-000000000003';

let aviationId;
let mobilityId;

async function seedUnit(code, name) {
  const { rows: [unit] } = await pool.query(
    `INSERT INTO capex_v2.organization_units (code, name, unit_type)
     VALUES ($1, $2, 'BUSINESS_UNIT')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [code, name]
  );
  return unit.id;
}

async function seedUser(id, email, fullName, role) {
  await pool.query(
    `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role, department, is_active)
     VALUES ($1, $2, $3, $4, 'x', $5, 'Ops', true)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email, is_active = true`,
    [id, `SCOPE-${id.slice(-4)}`, fullName, email, role]
  );
}

async function grantScope(userId, roleName, scopeType, organizationUnitId) {
  await pool.query(
    `DELETE FROM capex_v2.user_scope_assignments WHERE user_id = $1`,
    [userId]
  );
  await pool.query(
    `INSERT INTO capex_v2.user_scope_assignments
       (user_id, role_name, scope_type, organization_unit_id, capabilities, source)
     VALUES ($1, $2, $3, $4, '{}'::TEXT[], 'DERIVED_FROM_PROFILE')`,
    [userId, roleName, scopeType, organizationUnitId]
  );
}

function fakeReq(user) {
  return { user };
}

beforeAll(async () => {
  aviationId = await seedUnit(AVIATION_CODE, 'Scope Test Aviation');
  mobilityId = await seedUnit(MOBILITY_CODE, 'Scope Test Mobility');

  await seedUser(gmId, 'scope.gm@shell.om', 'Scope GM', 'Business GM');
  await seedUser(fibId, 'scope.fib@shell.om', 'Scope FiB', 'Finance in Business');
  await seedUser(strangerId, 'scope.stranger@shell.om', 'Scope Stranger', 'Manager');

  await grantScope(gmId, 'Business GM', 'BUSINESS_UNIT', aviationId);
  await grantScope(fibId, 'Finance in Business', 'BUSINESS_UNIT', aviationId);
  await grantScope(strangerId, 'Manager', 'BUSINESS_UNIT', mobilityId);
});

afterAll(async () => {
  for (const id of [gmId, fibId, strangerId]) {
    await pool.query(`DELETE FROM capex_v2.user_scope_assignments WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM som_users WHERE id = $1`, [id]);
  }
  await pool.query(`DELETE FROM capex_v2.organization_units WHERE code = ANY($1)`, [[AVIATION_CODE, MOBILITY_CODE]]);
});

describe('getScopeContext', () => {
  test('gives a business-scoped role its own business only', async () => {
    const scope = await getScopeContext(fakeReq({
      id: gmId, email: 'scope.gm@shell.om', full_name: 'Scope GM', role: 'Business GM',
    }));

    expect(scope.tier).toBe(SCOPE_TIERS.BUSINESS);
    expect(scope.organizationUnitIds).toEqual([aviationId]);
    expect(scope.organizationUnitIds).not.toContain(mobilityId);
    expect(scope.identityKeys).toEqual(['scope.gm@shell.om', 'scope gm']);
  });

  test('gives a company-wide role portfolio reach', async () => {
    const scope = await getScopeContext(fakeReq({
      id: '00000000-0000-4000-8000-0000000000ff', email: 'cfo@x.om', role: 'CFO',
    }));
    expect(scope.tier).toBe(SCOPE_TIERS.PORTFOLIO);
  });

  test('memoises so re-entrant handlers do not re-query', async () => {
    const req = fakeReq({ id: gmId, email: 'scope.gm@shell.om', role: 'Business GM' });
    const first = getScopeContext(req);
    const second = getScopeContext(req);
    expect(first).toBe(second);
    await first;
  });

  test('fails closed for an unrecognised role', async () => {
    const scope = await getScopeContext(fakeReq({
      id: '00000000-0000-4000-8000-0000000000fe', email: 'who@x.om', role: 'Chief Vibes Officer',
    }));
    expect(scope.tier).toBe(SCOPE_TIERS.OWN);
    expect(scope.organizationUnitIds).toEqual([]);
  });
});

describe('resolveStepAssigneeSoft', () => {
  test('resolves the single role holder in the request business by email', async () => {
    const result = await resolveStepAssigneeSoft(pool, {
      roleName: 'Finance in Business',
      organizationUnitId: aviationId,
    });
    expect(result).toMatchObject({ status: 'RESOLVED', assignedTo: 'scope.fib@shell.om' });
  });

  test('reports NO_ASSIGNEE rather than throwing when the business has nobody', async () => {
    const result = await resolveStepAssigneeSoft(pool, {
      roleName: 'Finance in Business',
      organizationUnitId: mobilityId,
    });
    expect(result.status).toBe('NO_ASSIGNEE');
    expect(result.assignedTo).toBeNull();
  });

  test('never picks one of several candidates', async () => {
    const extraId = '55555555-0000-4000-8000-000000000004';
    await seedUser(extraId, 'scope.fib2@shell.om', 'Scope FiB Two', 'Finance in Business');
    await grantScope(extraId, 'Finance in Business', 'BUSINESS_UNIT', aviationId);
    try {
      const result = await resolveStepAssigneeSoft(pool, {
        roleName: 'Finance in Business',
        organizationUnitId: aviationId,
      });
      expect(result.status).toBe('AMBIGUOUS');
      expect(result.assignedTo).toBeNull();
      expect(result.candidateCount).toBe(2);
    } finally {
      await pool.query(`DELETE FROM capex_v2.user_scope_assignments WHERE user_id = $1`, [extraId]);
      await pool.query(`DELETE FROM som_users WHERE id = $1`, [extraId]);
    }
  });
});

describe('resolveOrganizationUnitId', () => {
  test('accepts an explicit business', async () => {
    expect(await resolveOrganizationUnitId(pool, { organizationUnitId: aviationId })).toBe(aviationId);
  });

  test('falls back to the legacy department name through the alias bridge', async () => {
    // Migration 033 seeds one alias per unit name; matching is case- and
    // whitespace-insensitive so older clients that only send free text still
    // land on the right business.
    const resolved = await resolveOrganizationUnitId(pool, { department: '  scope TEST aviation  ' });
    expect(resolved).toBe(aviationId);
  });

  test('returns null for an unknown department', async () => {
    expect(await resolveOrganizationUnitId(pool, { department: 'Department of Nowhere' })).toBeNull();
  });
});

describe('GET /api/users/role-scopes', () => {
  test('serves the role to scope-tier map to admins', async () => {
    const res = await request(app)
      .get('/api/users/role-scopes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const byRole = Object.fromEntries(res.body.map((entry) => [entry.role, entry]));
    expect(byRole.CFO).toMatchObject({ tier: 'PORTFOLIO', requiresBusiness: false });
    expect(byRole['Business GM']).toMatchObject({ tier: 'BUSINESS', requiresBusiness: true });
    expect(byRole['Project Owner']).toMatchObject({ tier: 'OWN', requiresBusiness: true });
  });

  test('is admin-only', async () => {
    const res = await request(app).get('/api/users/role-scopes');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/login', () => {
  test('returns the scope tier alongside the user, without signing it into the token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shell.om', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.user.scope_tier).toBe('PORTFOLIO');
    expect(res.body.user).toHaveProperty('business_function_id');

    const decoded = jwt.decode(res.body.token);
    expect(decoded.scope_tier).toBeUndefined();
    expect(decoded.business_function_id).toBeUndefined();
  });
});
