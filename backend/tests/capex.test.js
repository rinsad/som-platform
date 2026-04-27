const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const token = jwt.sign(
  { id: 1, email: 'admin@shell.om', role: 'Admin', department: 'IT' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);

const auth = { Authorization: `Bearer ${token}` };

describe('GET /api/capex/summary', () => {
  test('returns 200 with 4 departments', async () => {
    const res = await request(app).get('/api/capex/summary').set(auth);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(4);
  });

  test('each department has required fields', async () => {
    const res = await request(app).get('/api/capex/summary').set(auth);
    const dept = res.body[0];
    expect(dept).toHaveProperty('name');
    expect(dept).toHaveProperty('totalBudget');
    expect(dept).toHaveProperty('actual');
    expect(dept).toHaveProperty('remaining');
    expect(dept).toHaveProperty('percentUsed');
  });

  test('percentUsed is calculated correctly', async () => {
    const res = await request(app).get('/api/capex/summary').set(auth);
    const retail = res.body.find(d => d.name === 'Retail Operations');
    expect(retail.percentUsed).toBe(57);
  });

  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/capex/summary');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/capex/department/:name', () => {
  test('returns monthlyData array with 6 entries', async () => {
    const res = await request(app)
      .get('/api/capex/department/Technology')
      .set(auth);
    expect(res.statusCode).toBe(200);
    expect(res.body.monthlyData).toHaveLength(6);
  });

  test('returns 404 for unknown department', async () => {
    const res = await request(app)
      .get('/api/capex/department/Unknown')
      .set(auth);
    expect(res.statusCode).toBe(404);
  });
});
