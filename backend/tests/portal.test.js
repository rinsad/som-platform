const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const makeToken = (role) =>
  jwt.sign(
    { id: 1, email: 'test@shell.om', role, department: 'Test' },
    process.env.JWT_SECRET || 'som-super-secret-key-2026',
    { expiresIn: '1h' }
  );

// ─── Role-based app visibility ────────────────────────────────────────────────
describe('Role-based app visibility', () => {
  test('Employee does not see Admin Console', async () => {
    const res = await request(app).get('/api/portal/apps')
      .set({ Authorization: `Bearer ${makeToken('Employee')}` });
    const names = res.body.map(a => a.name);
    expect(names).not.toContain('Admin Console');
  });

  test('Admin sees Admin Console', async () => {
    const res = await request(app).get('/api/portal/apps')
      .set({ Authorization: `Bearer ${makeToken('Admin')}` });
    const names = res.body.map(a => a.name);
    expect(names).toContain('Admin Console');
  });

  test('Finance does not see Admin Console', async () => {
    const res = await request(app).get('/api/portal/apps')
      .set({ Authorization: `Bearer ${makeToken('Finance')}` });
    const names = res.body.map(a => a.name);
    expect(names).not.toContain('Admin Console');
  });

  test('unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/portal/apps');
    expect(res.statusCode).toBe(401);
  });
});

// ─── Knowledge base ───────────────────────────────────────────────────────────
describe('GET /api/portal/knowledge', () => {
  const auth = { Authorization: `Bearer ${makeToken('Admin')}` };

  test('empty search returns all 8 documents', async () => {
    const res = await request(app).get('/api/portal/knowledge').set(auth);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(8);
  });

  test('search is case-insensitive', async () => {
    // 'incident' appears in KB-004 title — tests that case is ignored
    const lower = await request(app)
      .get('/api/portal/knowledge?search=incident').set(auth);
    const upper = await request(app)
      .get('/api/portal/knowledge?search=INCIDENT').set(auth);
    expect(lower.body.length).toBe(upper.body.length);
    expect(lower.body.length).toBeGreaterThan(0);
  });

  test('category filter returns only matching documents', async () => {
    const res = await request(app)
      .get('/api/portal/knowledge?category=QHSE').set(auth);
    res.body.forEach(doc => expect(doc.category).toBe('QHSE'));
  });

  test('category=Policy returns only Policy documents', async () => {
    const res = await request(app)
      .get('/api/portal/knowledge?category=Policy').set(auth);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach(doc => expect(doc.category).toBe('Policy'));
  });

  test('search by description term returns matching docs', async () => {
    const res = await request(app)
      .get('/api/portal/knowledge?search=vendor').set(auth);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach(doc =>
      expect(
        doc.title.toLowerCase().includes('vendor') ||
        doc.description.toLowerCase().includes('vendor')
      ).toBe(true)
    );
  });
});

// ─── Favourites ───────────────────────────────────────────────────────────────
describe('POST /api/portal/favourites', () => {
  const auth = { Authorization: `Bearer ${makeToken('Admin')}` };
  const pool = require('../src/database/db');
  beforeAll(async () => {
    await pool.query("DELETE FROM user_favourites WHERE user_id = '1'");
  });

  test('starts with empty favourites', async () => {
    const res = await request(app).get('/api/portal/favourites').set(auth);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('toggles app into favourites', async () => {
    const res = await request(app)
      .post('/api/portal/favourites').set(auth)
      .send({ appId: 'APP-TEST-001' });
    expect(res.statusCode).toBe(200);
    expect(res.body.favourited).toBe(true);
    expect(res.body.favourites).toContain('APP-TEST-001');
  });

  test('toggling again removes app from favourites', async () => {
    await request(app).post('/api/portal/favourites').set(auth)
      .send({ appId: 'APP-TEST-002' });
    const res = await request(app)
      .post('/api/portal/favourites').set(auth)
      .send({ appId: 'APP-TEST-002' });
    expect(res.body.favourited).toBe(false);
    expect(res.body.favourites).not.toContain('APP-TEST-002');
  });

  test('missing appId returns 400', async () => {
    const res = await request(app)
      .post('/api/portal/favourites').set(auth)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
