const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const token = jwt.sign(
  { id: 1, email: 'admin@shell.om', role: 'Admin', department: 'Operations' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);

const auth = { Authorization: `Bearer ${token}` };

// A limited (non-Admin, UUID) user with no purchase-request permissions.
const limitedToken = jwt.sign(
  { id: '00000000-0000-0000-0000-000000000009', email: 'limited@shell.om', role: 'Employee', department: 'Operations' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);
const limitedAuth = { Authorization: `Bearer ${limitedToken}` };

// quotes >= 3 by default so no justification is required; pass a justification
// explicitly for fewer-than-3 cases.
const newPR = (value, quotes = 3, justification) => ({
  title: 'Test PR', description: 'Test', department: 'Operations',
  totalValue: value, quoteCount: quotes,
  ...(justification !== undefined ? { justification } : {}),
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
  test('sets requiresJustification true when quotes < 3 (with justification)', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(50000, 2, 'Only two compliant suppliers.'));
    expect(res.statusCode).toBe(201);
    expect(res.body.requiresJustification).toBe(true);
  });

  test('rejects fewer than 3 quotes without a justification', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(50000, 2));
    expect(res.statusCode).toBe(400);
  });

  test('requiresJustification is false when quotes >= 3', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(50000, 3));
    expect(res.body.requiresJustification).toBe(false);
  });
});

describe('Purchase request access control', () => {
  test('a user without purchase-request permission is denied', async () => {
    const res = await request(app).get('/api/purchase-requests').set(limitedAuth);
    expect(res.statusCode).toBe(403);
  });
});

describe('Sequential approval workflow', () => {
  test('MEDIUM PR needs two approvals before it is Approved', async () => {
    const created = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(150000));
    expect(created.statusCode).toBe(201);
    expect(created.body.tier).toBe('MEDIUM');

    const first = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/approve`)
      .set(auth).send({ decision: 'APPROVED' });
    expect(first.statusCode).toBe(200);
    expect(first.body.status).toBe('PENDING_APPROVAL');
    expect(first.body.currentStepIndex).toBe(1);

    const second = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/approve`)
      .set(auth).send({ decision: 'APPROVED' });
    expect(second.statusCode).toBe(200);
    expect(second.body.status).toBe('APPROVED');

    const third = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/approve`)
      .set(auth).send({ decision: 'APPROVED' });
    expect(third.statusCode).toBe(409);
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

describe('Revision workflow', () => {
  test('returned draft can be edited and resubmitted for approval', async () => {
    const created = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(10000));
    expect(created.statusCode).toBe(201);

    const returned = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/approve`)
      .set(auth)
      .send({ decision: 'RETURNED', comment: 'Please add updated scope.' });
    expect(returned.statusCode).toBe(200);
    expect(returned.body.status).toBe('DRAFT');

    const updated = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}`)
      .set(auth)
      .send({
        title: 'Updated Test PR',
        description: 'Updated scope',
        department: 'Operations',
        totalValue: 35000,
        quoteCount: 3,
        justification: '',
        lineItems: [{ description: 'Updated item', quantity: 1, unitPrice: 35000, lineTotal: 35000 }],
      });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.title).toBe('Updated Test PR');
    expect(updated.body.tier).toBe('MEDIUM');

    const resubmitted = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/resubmit`)
      .set(auth)
      .send({});
    expect(resubmitted.statusCode).toBe(200);
    expect(resubmitted.body.status).toBe('PENDING_APPROVAL');
    expect(resubmitted.body.currentStepIndex).toBe(0);
    // Audit history is preserved (PRD-NFR-002): the prior RETURNED decision
    // remains and a RESUBMITTED entry is appended.
    const decisions = resubmitted.body.approvalHistory.map(h => h.decision);
    expect(decisions).toContain('RETURNED');
    expect(decisions[decisions.length - 1]).toBe('RESUBMITTED');
  });

  test('non-draft purchase requests cannot be edited or resubmitted', async () => {
    const created = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(10000));
    expect(created.statusCode).toBe(201);

    const updated = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}`)
      .set(auth)
      .send(newPR(12000));
    expect(updated.statusCode).toBe(409);

    const resubmitted = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/resubmit`)
      .set(auth)
      .send({});
    expect(resubmitted.statusCode).toBe(409);
  });
});
