// End-to-end proof of multi-business scoping: two businesses, a Line Manager in
// each, one CAPEX request and one purchase request each. Runs the whole matrix
// with enforcement off, then on.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const pool = require('../src/database/db');
const { resetEnforcementCache } = require('../src/services/scopeContext');

const secret = process.env.JWT_SECRET || 'som-super-secret-key-2026';

const AVIATION_CODE = 'ISO_AVIATION';
const MOBILITY_CODE = 'ISO_MOBILITY';
const AVIATION_NAME = 'Isolation Aviation';
const MOBILITY_NAME = 'Isolation Mobility';

const avManagerId = '66666666-0000-4000-8000-00000000a001';
const mbManagerId = '66666666-0000-4000-8000-00000000b001';
const cfoId = '66666666-0000-4000-8000-00000000c001';

const AV_REQUEST = 'CAPEX-ISO-AV1';
const MB_REQUEST = 'CAPEX-ISO-MB1';
const AV_PR = 'PR-ISO-AV1';
const MB_PR = 'PR-ISO-MB1';

let aviationId;
let mobilityId;

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (id, email, fullName, role) =>
  jwt.sign({ id, email, full_name: fullName, role, department: 'Ops' }, secret);

const avManagerAuth = auth(tokenFor(avManagerId, 'iso.av.manager@shell.om', 'Iso Aviation Manager', 'Manager'));
const mbManagerAuth = auth(tokenFor(mbManagerId, 'iso.mb.manager@shell.om', 'Iso Mobility Manager', 'Manager'));
const cfoAuth = auth(tokenFor(cfoId, 'iso.cfo@shell.om', 'Iso CFO', 'CFO'));

async function setEnforcement(mode) {
  await pool.query(`UPDATE capex_scope_settings SET enforcement_mode = $1 WHERE id = 1`, [mode]);
  resetEnforcementCache();
}

async function seedUnit(code, name) {
  const { rows: [unit] } = await pool.query(
    `INSERT INTO capex_v2.organization_units (code, name, unit_type)
     VALUES ($1, $2, 'BUSINESS_UNIT')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = TRUE
     RETURNING id`,
    [code, name]
  );
  await pool.query(
    `INSERT INTO capex_v2.organization_unit_aliases (alias_normalized, alias_source, organization_unit_id)
     VALUES (lower(btrim($1)), 'UNIT_NAME', $2)
     ON CONFLICT (alias_normalized) DO UPDATE SET organization_unit_id = EXCLUDED.organization_unit_id`,
    [name, unit.id]
  );
  return unit.id;
}

async function seedUser(id, email, fullName, role, organizationUnitId) {
  await pool.query(
    `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role, department, is_active)
     VALUES ($1, $2, $3, $4, 'x', $5, 'Ops', true)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email, is_active = true`,
    [id, `ISO-${id.slice(-4)}`, fullName, email, role]
  );
  await pool.query(
    `INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
     VALUES ($1, 'application', 'capex', true, true, true, false),
            ($1, 'module', 'purchase-requests', true, true, true, false)
     ON CONFLICT (user_id, resource_key) DO UPDATE
       SET can_view = true, can_create = true, can_edit = true`,
    [id]
  );
  await pool.query(`DELETE FROM capex_v2.user_scope_assignments WHERE user_id = $1`, [id]);
  await pool.query(
    `INSERT INTO capex_v2.user_scope_assignments
       (user_id, role_name, scope_type, organization_unit_id, capabilities, source)
     VALUES ($1, $2, $3, $4, '{}'::TEXT[], 'DERIVED_FROM_PROFILE')`,
    [id, role, organizationUnitId ? 'BUSINESS_UNIT' : 'PORTFOLIO', organizationUnitId]
  );
}

async function seedCapexRequest(id, unitId, departmentName) {
  await pool.query(
    `INSERT INTO capex_requests
       (id, title, requester_name, department, business_function, estimated_value, currency,
        value_band, scope_details, status, organization_unit_id)
     VALUES ($1, $2, 'Seeder', $3, $3, 50000, 'OMR', 'MEDIUM', 'Scoping isolation fixture',
             'Pending line manager endorsement', $4)
     ON CONFLICT (id) DO UPDATE SET organization_unit_id = EXCLUDED.organization_unit_id`,
    [id, `${departmentName} project`, departmentName, unitId]
  );
  const { rows: [step] } = await pool.query(
    `INSERT INTO capex_approval_steps (request_id, step_order, approver_role, label, status, started_at)
     VALUES ($1, 1, 'Manager', 'Line Manager Endorsement', 'Pending', NOW())
     RETURNING id`,
    [id]
  );
  await pool.query(`UPDATE capex_requests SET current_step_id = $1 WHERE id = $2`, [step.id, id]);
  return step.id;
}

async function seedPurchaseRequest(id, unitId, departmentName) {
  await pool.query(
    `INSERT INTO purchase_requests
       (id, title, description, requestor_name, department, total_value, tier, status,
        quote_count, requires_justification, justification, line_items, approval_history,
        current_step_index, organization_unit_id)
     VALUES ($1, $2, '', 'Seeder', $3, 5000, 'LOW', 'PENDING_APPROVAL', 3, false, '',
             '[]'::jsonb, '[]'::jsonb, 0, $4)
     ON CONFLICT (id) DO UPDATE SET organization_unit_id = EXCLUDED.organization_unit_id`,
    [id, `${departmentName} purchase`, departmentName, unitId]
  );
}

beforeAll(async () => {
  aviationId = await seedUnit(AVIATION_CODE, AVIATION_NAME);
  mobilityId = await seedUnit(MOBILITY_CODE, MOBILITY_NAME);

  await seedUser(avManagerId, 'iso.av.manager@shell.om', 'Iso Aviation Manager', 'Manager', aviationId);
  await seedUser(mbManagerId, 'iso.mb.manager@shell.om', 'Iso Mobility Manager', 'Manager', mobilityId);
  await seedUser(cfoId, 'iso.cfo@shell.om', 'Iso CFO', 'CFO', null);

  await seedCapexRequest(AV_REQUEST, aviationId, AVIATION_NAME);
  await seedCapexRequest(MB_REQUEST, mobilityId, MOBILITY_NAME);
  await seedPurchaseRequest(AV_PR, aviationId, AVIATION_NAME);
  await seedPurchaseRequest(MB_PR, mobilityId, MOBILITY_NAME);
});

afterAll(async () => {
  await setEnforcement('off');
  await pool.query(`DELETE FROM capex_requests WHERE id = ANY($1)`, [[AV_REQUEST, MB_REQUEST]]);
  await pool.query(`DELETE FROM purchase_requests WHERE id = ANY($1)`, [[AV_PR, MB_PR]]);
  for (const id of [avManagerId, mbManagerId, cfoId]) {
    await pool.query(`DELETE FROM capex_v2.user_scope_assignments WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM som_permissions WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM som_users WHERE id = $1`, [id]);
  }
  await pool.query(`DELETE FROM capex_v2.organization_unit_aliases WHERE alias_normalized = ANY($1)`,
    [[AVIATION_NAME.toLowerCase(), MOBILITY_NAME.toLowerCase()]]);
  await pool.query(`DELETE FROM capex_v2.organization_units WHERE code = ANY($1)`, [[AVIATION_CODE, MOBILITY_CODE]]);
});

describe('with enforcement off (the shipped default)', () => {
  beforeAll(() => setEnforcement('off'));

  test('every list stays portfolio-wide, exactly as before', async () => {
    const res = await request(app).get('/api/capex/requests').set(avManagerAuth);
    expect(res.statusCode).toBe(200);
    const ids = res.body.map((r) => r.id);
    expect(ids).toContain(AV_REQUEST);
    expect(ids).toContain(MB_REQUEST);
  });

  test('cross-business detail is still readable', async () => {
    const res = await request(app).get(`/api/capex/requests/${MB_REQUEST}`).set(avManagerAuth);
    expect(res.statusCode).toBe(200);
  });
});

describe('with enforcement on', () => {
  beforeAll(() => setEnforcement('on'));
  afterAll(() => setEnforcement('off'));

  test('a Line Manager sees only their own business', async () => {
    const aviation = await request(app).get('/api/capex/requests').set(avManagerAuth);
    const aviationIds = aviation.body.map((r) => r.id);
    expect(aviationIds).toContain(AV_REQUEST);
    expect(aviationIds).not.toContain(MB_REQUEST);

    const mobility = await request(app).get('/api/capex/requests').set(mbManagerAuth);
    const mobilityIds = mobility.body.map((r) => r.id);
    expect(mobilityIds).toContain(MB_REQUEST);
    expect(mobilityIds).not.toContain(AV_REQUEST);
  });

  test('the CFO still sees both businesses', async () => {
    const res = await request(app).get('/api/capex/requests').set(cfoAuth);
    const ids = res.body.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([AV_REQUEST, MB_REQUEST]));
  });

  test('cross-business detail is 404, not 403 — no existence leak', async () => {
    const foreign = await request(app).get(`/api/capex/requests/${MB_REQUEST}`).set(avManagerAuth);
    expect(foreign.statusCode).toBe(404);

    const own = await request(app).get(`/api/capex/requests/${AV_REQUEST}`).set(avManagerAuth);
    expect(own.statusCode).toBe(200);
  });

  test('deciding a cross-business step is 403 with an actionable message', async () => {
    const { rows: [step] } = await pool.query(
      `SELECT id FROM capex_approval_steps WHERE request_id = $1 AND status = 'Pending'`, [MB_REQUEST]
    );
    expect(step).toBeDefined();

    const res = await request(app)
      .patch(`/api/capex/requests/${MB_REQUEST}/decision`)
      .set(avManagerAuth)
      .send({ decision: 'APPROVED', comment: 'from the wrong business' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/outside your assignment/i);
  });

  // The single most important regression to guard: an approver must never lose
  // sight of a decision that is explicitly theirs, even across businesses.
  test('an explicitly assigned approver keeps a cross-business request', async () => {
    await pool.query(
      `UPDATE capex_approval_steps SET assigned_to = 'iso.av.manager@shell.om'
        WHERE request_id = $1 AND status = 'Pending'`,
      [MB_REQUEST]
    );
    try {
      const list = await request(app).get('/api/capex/requests').set(avManagerAuth);
      expect(list.body.map((r) => r.id)).toContain(MB_REQUEST);

      const detail = await request(app).get(`/api/capex/requests/${MB_REQUEST}`).set(avManagerAuth);
      expect(detail.statusCode).toBe(200);

      const decision = await request(app)
        .patch(`/api/capex/requests/${MB_REQUEST}/decision`)
        .set(avManagerAuth)
        .send({ decision: 'APPROVED', comment: 'assigned to me' });
      expect(decision.statusCode).toBe(200);
    } finally {
      await pool.query(
        `UPDATE capex_approval_steps SET assigned_to = NULL, status = 'Pending', decided_at = NULL
          WHERE request_id = $1`, [MB_REQUEST]
      );
      await pool.query(
        `UPDATE capex_requests SET status = 'Pending line manager endorsement',
                current_step_id = (SELECT id FROM capex_approval_steps WHERE request_id = $1 ORDER BY step_order LIMIT 1)
          WHERE id = $1`, [MB_REQUEST]
      );
    }
  });

  test('purchase requests are scoped, and the tab counts match the list', async () => {
    const res = await request(app).get('/api/purchase-requests?page=1&pageSize=100').set(avManagerAuth);
    expect(res.statusCode).toBe(200);
    const ids = res.body.items.map((r) => r.id);
    expect(ids).toContain(AV_PR);
    expect(ids).not.toContain(MB_PR);
    // The badge total must describe the same rows the list shows.
    expect(res.body.counts.all).toBe(res.body.pagination.totalItems);
  });

  test('cross-business purchase-request detail is 404', async () => {
    const foreign = await request(app).get(`/api/purchase-requests/${MB_PR}`).set(avManagerAuth);
    expect(foreign.statusCode).toBe(404);

    const own = await request(app).get(`/api/purchase-requests/${AV_PR}`).set(avManagerAuth);
    expect(own.statusCode).toBe(200);
  });

  test('the business list offers only businesses the user may file into', async () => {
    const scoped = await request(app).get('/api/capex/business-functions').set(avManagerAuth);
    expect(scoped.statusCode).toBe(200);
    expect(scoped.body.map((u) => u.name)).toEqual([AVIATION_NAME]);

    const portfolio = await request(app).get('/api/capex/business-functions').set(cfoAuth);
    expect(portfolio.body.map((u) => u.name)).toEqual(expect.arrayContaining([AVIATION_NAME, MOBILITY_NAME]));
  });

  test('governance aggregates count only in-scope requests', async () => {
    const scoped = await request(app).get('/api/capex/dashboard/governance').set(avManagerAuth);
    const portfolio = await request(app).get('/api/capex/dashboard/governance').set(cfoAuth);
    expect(scoped.statusCode).toBe(200);
    expect(portfolio.statusCode).toBe(200);
    expect(scoped.body.portfolio.totalProjects)
      .toBeLessThan(portfolio.body.portfolio.totalProjects);
  });

  test('the business-unit drilldown shows only the caller’s businesses', async () => {
    const res = await request(app)
      .get('/api/capex/dashboard/drilldown?type=businessUnit')
      .set(avManagerAuth);
    expect(res.statusCode).toBe(200);
    const departments = res.body.rows.map((r) => r.department);
    expect(departments).not.toContain(MOBILITY_NAME);
  });
});

describe('shadow mode', () => {
  beforeAll(() => setEnforcement('shadow'));
  afterAll(() => setEnforcement('off'));

  test('allows a cross-business decision but records it for review', async () => {
    const res = await request(app)
      .patch(`/api/capex/requests/${MB_REQUEST}/decision`)
      .set(avManagerAuth)
      .send({ decision: 'APPROVED', comment: 'shadow mode' });

    expect(res.statusCode).toBe(200);

    const { rows } = await pool.query(
      `SELECT event_type, message FROM capex_audit_logs
        WHERE request_id = $1 AND event_type = 'SCOPE_SHADOW_DENY'`,
      [MB_REQUEST]
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].message).toMatch(/outside their business/i);
  });
});
