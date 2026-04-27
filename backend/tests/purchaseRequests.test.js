const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const token = jwt.sign(
  { id: 1, email: 'manager@shell.om', role: 'Manager', department: 'Operations' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);

const auth = { Authorization: `Bearer ${token}` };

const newPR = (value, quotes = 3) => ({
  title: 'Test PR', description: 'Test', department: 'Operations',
  totalValue: value, quoteCount: quotes,
});

describe('Tier routing engine', () => {
  test('assigns LOW tier for values at or below 25000', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(25000));
    expect(res.statusCode).toBe(201);
    expect(res.body.tier).toBe('LOW');
  });

  test('assigns MEDIUM tier for values between 25001 and 300000', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(150000));
    expect(res.body.tier).toBe('MEDIUM');
  });

  test('assigns HIGH tier for values above 300000', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(500000));
    expect(res.body.tier).toBe('HIGH');
  });

  test('boundary: 25001 is MEDIUM not LOW', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(25001));
    expect(res.body.tier).toBe('MEDIUM');
  });

  test('boundary: 300001 is HIGH not MEDIUM', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(300001));
    expect(res.body.tier).toBe('HIGH');
  });
});

describe('Sourcing governance', () => {
  test('sets requiresJustification true when quotes < 3', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(50000, 2));
    expect(res.body.requiresJustification).toBe(true);
  });

  test('requiresJustification is false when quotes >= 3', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(50000, 3));
    expect(res.body.requiresJustification).toBe(false);
  });
});

describe('GET /api/purchase-requests', () => {
  test('returns array of PRs', async () => {
    const res = await request(app).get('/api/purchase-requests').set(auth);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('status filter returns only matching PRs', async () => {
    const res = await request(app)
      .get('/api/purchase-requests?status=APPROVED').set(auth);
    res.body.forEach(pr => expect(pr.status).toBe('APPROVED'));
  });
});
