const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const token = jwt.sign(
  { id: 1, email: 'admin@shell.om', role: 'Admin', department: 'IT' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);

const auth = { Authorization: `Bearer ${token}` };

describe('GET /api/assets', () => {
  test('returns 12 assets', async () => {
    const res = await request(app).get('/api/assets').set(auth);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(12);
  });

  test('asset codes follow the correct format', async () => {
    const res = await request(app).get('/api/assets').set(auth);
    const codePattern = /^[A-Z]{3}-\d{3}-F\d{2}-[A-Z]{2,4}\d{3}$/;
    res.body.forEach(a => expect(a.assetCode).toMatch(codePattern));
  });

  test('region filter returns only matching assets', async () => {
    const res = await request(app)
      .get('/api/assets?region=Muscat').set(auth);
    res.body.forEach(a => expect(a.region).toBe('Muscat'));
  });
});

describe('POST /api/assets/utility-bills', () => {
  test('creates a valid bill entry', async () => {
    const res = await request(app)
      .post('/api/assets/utility-bills').set(auth)
      .send({ siteId: 'MSQ-001', utilityType: 'Electricity',
        period: 'Mar 2026', amount: 12500, meterReading: 84200 });
    expect(res.statusCode).toBe(201);
    expect(res.body.amount).toBe(12500);
  });

  test('rejects bill with negative amount', async () => {
    const res = await request(app)
      .post('/api/assets/utility-bills').set(auth)
      .send({ siteId: 'MSQ-001', utilityType: 'Water',
        period: 'Mar 2026', amount: -100, meterReading: 100 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('rejects bill with empty period', async () => {
    const res = await request(app)
      .post('/api/assets/utility-bills').set(auth)
      .send({ siteId: 'MSQ-001', utilityType: 'Gas',
        period: '', amount: 5000, meterReading: 200 });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/assets/alerts', () => {
  test('returns alerts sorted by daysRemaining ascending', async () => {
    const res = await request(app).get('/api/assets/alerts').set(auth);
    expect(res.statusCode).toBe(200);
    for (let i = 1; i < res.body.length; i++) {
      expect(res.body[i].daysRemaining)
        .toBeGreaterThanOrEqual(res.body[i - 1].daysRemaining);
    }
  });
});
