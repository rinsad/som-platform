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
const newPR = (value, quotes = 3, justification, overrides = {}) => ({
  title: 'Test PR', description: 'Test', department: 'Operations',
  totalValue: value,
  suppliers: Array.from({ length: quotes }, (_, i) => ({
    name: i === 0 ? 'Default Supplier' : `Default Supplier ${i + 1}`,
    quoteAmount: value + i,
  })),
  ...(justification !== undefined ? { justification } : {}),
  ...overrides,
});

const workflowRoles = (res) => res.body.workflow.map((step) => step.role);

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

  test('defaults risk fields and sourcing optionals when omitted', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(10000));
    expect(res.statusCode).toBe(201);
    expect(res.body.hsseRisk).toBe('Low');
    expect(res.body.workerWelfareRisk).toBe('Low');
    expect(res.body.suppliers).toHaveLength(3);
    expect(res.body.selectedSupplier).toBeNull();
    expect(res.body.currentBudget).toBeNull();
    expect(res.body.avgQuote).toBe(10001);
    expect(res.body.savings).toBeNull();
  });

  test('persists suppliers and derives avgQuote and savings', async () => {
    const res = await request(app)
      .post('/api/purchase-requests')
      .set(auth)
      .send(newPR(10000, 3, undefined, {
        suppliers: [
          { name: 'Supplier A', quoteAmount: 9000 },
          { name: 'Supplier B', quoteAmount: 11000 },
          { name: 'Supplier C', quoteAmount: 10000 },
        ],
        selectedSupplier: 'Supplier A',
        currentBudget: 12000,
      }));
    expect(res.statusCode).toBe(201);
    expect(res.body.suppliers).toEqual([
      { name: 'Supplier A', quoteAmount: 9000 },
      { name: 'Supplier B', quoteAmount: 11000 },
      { name: 'Supplier C', quoteAmount: 10000 },
    ]);
    expect(res.body.selectedSupplier).toBe('Supplier A');
    expect(res.body.currentBudget).toBe(12000);
    expect(res.body.avgQuote).toBe(10000);
    expect(res.body.savings).toBe(3000);
  });

  test('rejects invalid risk values and malformed suppliers', async () => {
    const badRisk = await request(app)
      .post('/api/purchase-requests')
      .set(auth)
      .send(newPR(10000, 3, undefined, { hsseRisk: 'Severe' }));
    expect(badRisk.statusCode).toBe(400);

    const badSupplier = await request(app)
      .post('/api/purchase-requests')
      .set(auth)
      .send(newPR(10000, 3, undefined, { suppliers: [{ name: '', quoteAmount: 100 }] }));
    expect(badSupplier.statusCode).toBe(400);
  });

  test('rejects submit without any supplier quotation entries', async () => {
    const res = await request(app)
      .post('/api/purchase-requests')
      .set(auth)
      .send(newPR(10000, 3, undefined, { suppliers: [] }));
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/supplier quotation entry/i);
  });

  test('creates multipart supplier quotation with linked quote document', async () => {
    const payload = {
      title: 'Multipart Quote PR',
      description: 'Test',
      department: 'Operations',
      totalValue: 10000,
      justification: 'Single supplier emergency purchase.',
      quotations: [{ supplierName: 'Attached Supplier', quoteAmount: 9950 }],
      lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10000, lineTotal: 10000 }],
    };

    const res = await request(app)
      .post('/api/purchase-requests')
      .set(auth)
      .field('request', JSON.stringify(payload))
      .attach('quoteFile_0', Buffer.from('quote-data'), {
        filename: 'attached-quote.pdf',
        contentType: 'application/pdf',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.quoteCount).toBe(1);
    expect(res.body.supplierQuotations[0]).toMatchObject({
      supplierName: 'Attached Supplier',
      quoteAmount: 9950,
      documentName: 'attached-quote.pdf',
    });
    expect(res.body.supplierQuotations[0].documentId).toMatch(/^DOC-/);
  });
});

describe('DoA workflow shapes', () => {
  test('LOW with 3 quotes and Low risks follows the standard low chain', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(10000));
    expect(res.statusCode).toBe(201);
    expect(workflowRoles(res)).toEqual(['Manager', 'Finance in Business', 'CP Lead', 'Business GM']);
  });

  test('LOW with fewer than 3 quotes adds CP Manager before Business GM', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(10000, 2, 'Only two compliant suppliers.'));
    expect(res.statusCode).toBe(201);
    expect(workflowRoles(res)).toEqual(['Manager', 'Finance in Business', 'CP Lead', 'CP Manager', 'Business GM']);
  });

  test('MEDIUM with fewer than 3 quotes adds CFO', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(150000, 2, 'Only two compliant suppliers.'));
    expect(res.statusCode).toBe(201);
    expect(workflowRoles(res)).toEqual(['Manager', 'Project Owner', 'Project Owner', 'Finance in Business', 'CFO', 'CEO/Board', 'CP Manager']);
  });

  test('MEDIUM with high worker welfare risk injects HSSE Focal after Manager', async () => {
    const res = await request(app)
      .post('/api/purchase-requests')
      .set(auth)
      .send(newPR(150000, 3, undefined, { workerWelfareRisk: 'High' }));
    expect(res.statusCode).toBe(201);
    expect(res.body.workflow[1].role).toBe('HSSE Focal');
    expect(res.body.workflow[1].label).toBe('HSSE Focal Review');
  });

  test('HIGH follows the contract board chain', async () => {
    const res = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(500000));
    expect(res.statusCode).toBe(201);
    expect(workflowRoles(res)).toEqual(['Manager', 'CP Manager', 'Finance in Business', 'CEO/Board']);
  });
});

describe('Purchase request access control', () => {
  test('a user without purchase-request permission is denied', async () => {
    const res = await request(app).get('/api/purchase-requests').set(limitedAuth);
    expect(res.statusCode).toBe(403);
  });
});

describe('Sequential approval workflow', () => {
  test('supplier selection is recorded in approval history', async () => {
    const created = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(10000));
    expect(created.statusCode).toBe(201);

    const selected = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/supplier-selection`)
      .set(auth)
      .send({ quotationId: created.body.supplierQuotations[1].id });

    expect(selected.statusCode).toBe(200);
    expect(selected.body.selectedSupplier).toBe('Default Supplier 2');
    expect(selected.body.approvalHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          decision: 'SUPPLIER_SELECTED',
          stepLabel: 'Supplier quotation selected',
          comment: expect.stringContaining('Default Supplier 2 selected at OMR 10,001.000.'),
        }),
      ])
    );
  });

  test('MEDIUM PR needs six approvals before it is Approved', async () => {
    const created = await request(app)
      .post('/api/purchase-requests').set(auth).send(newPR(150000));
    expect(created.statusCode).toBe(201);
    expect(created.body.tier).toBe('MEDIUM');
    expect(workflowRoles(created)).toEqual(['Manager', 'Project Owner', 'Project Owner', 'Finance in Business', 'CEO/Board', 'CP Manager']);

    let latest = created;
    for (let i = 0; i < 6; i += 1) {
      if (i === 5) {
        const selected = await request(app)
          .patch(`/api/purchase-requests/${created.body.id}/supplier-selection`)
          .set(auth)
          .send({ quotationId: created.body.supplierQuotations[0].id });
        expect(selected.statusCode).toBe(200);
      }
      latest = await request(app)
        .patch(`/api/purchase-requests/${created.body.id}/approve`)
        .set(auth).send({ decision: 'APPROVED' });
      expect(latest.statusCode).toBe(200);
      expect(latest.body.currentStepIndex).toBe(i + 1);
      expect(latest.body.status).toBe(i === 5 ? 'APPROVED' : 'PENDING_APPROVAL');
    }

    const seventh = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/approve`)
      .set(auth).send({ decision: 'APPROVED' });
    expect(seventh.statusCode).toBe(409);
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

  test('page and pageSize return paginated response metadata', async () => {
    const res = await request(app)
      .get('/api/purchase-requests?page=1&pageSize=5')
      .set(auth);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      pageSize: 5,
    });
    expect(res.body.counts).toEqual(expect.objectContaining({
      all: expect.any(Number),
      pending: expect.any(Number),
      approved: expect.any(Number),
      rejected: expect.any(Number),
      draft: expect.any(Number),
      needsJustification: expect.any(Number),
    }));
  });

  test('paginated status filter keeps matching total and rows', async () => {
    const res = await request(app)
      .get('/api/purchase-requests?status=APPROVED&page=1&pageSize=5')
      .set(auth);

    expect(res.statusCode).toBe(200);
    res.body.items.forEach((pr) => expect(pr.status).toBe('APPROVED'));
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(res.body.items.length);
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
        hsseRisk: 'Medium',
        workerWelfareRisk: 'Low',
        suppliers: [
          { name: 'Updated Supplier', quoteAmount: 34500 },
          { name: 'Updated Supplier 2', quoteAmount: 34600 },
          { name: 'Updated Supplier 3', quoteAmount: 34700 },
        ],
        selectedSupplier: 'Updated Supplier',
        currentBudget: 40000,
        lineItems: [{ description: 'Updated item', quantity: 1, unitPrice: 35000, lineTotal: 35000 }],
      });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.title).toBe('Updated Test PR');
    expect(updated.body.tier).toBe('MEDIUM');
    expect(updated.body.hsseRisk).toBe('Medium');
    expect(updated.body.suppliers).toHaveLength(3);

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

  test('returned draft cannot be resubmitted without supplier quotation entries', async () => {
    const created = await request(app)
      .post('/api/purchase-requests')
      .set(auth)
      .send(newPR(10000, 3, undefined, {
        suppliers: [
          { name: 'Supplier A', quoteAmount: 10000 },
          { name: 'Supplier B', quoteAmount: 10001 },
          { name: 'Supplier C', quoteAmount: 10002 },
        ],
      }));
    expect(created.statusCode).toBe(201);

    const returned = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/approve`)
      .set(auth)
      .send({ decision: 'RETURNED', comment: 'Please revise sourcing.' });
    expect(returned.statusCode).toBe(200);
    expect(returned.body.status).toBe('DRAFT');

    const updated = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}`)
      .set(auth)
      .send({
        title: 'Updated Test PR',
        description: 'Updated scope',
        department: 'Operations',
        totalValue: 10000,
        quoteCount: 3,
        justification: '',
        hsseRisk: 'Low',
        workerWelfareRisk: 'Low',
        suppliers: [],
        lineItems: [{ description: 'Updated item', quantity: 1, unitPrice: 10000, lineTotal: 10000 }],
      });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.suppliers).toEqual([]);

    const resubmitted = await request(app)
      .patch(`/api/purchase-requests/${created.body.id}/resubmit`)
      .set(auth)
      .send({});
    expect(resubmitted.statusCode).toBe(400);
    expect(resubmitted.body.error).toMatch(/supplier quotation entry/i);
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
