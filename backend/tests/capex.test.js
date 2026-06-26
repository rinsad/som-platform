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
  test('returns 200 with 6 departments', async () => {
    const res = await request(app).get('/api/capex/summary').set(auth);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(6);
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
    const aviation = res.body.find(d => d.name === 'Aviation');
    expect(aviation.percentUsed).toBe(48);
  });

  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/capex/summary');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/capex/department/:name', () => {
  test('returns monthlyData array with 6 entries', async () => {
    const res = await request(app)
      .get('/api/capex/department/Aviation')
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

describe('CAPEX request lifecycle rules', () => {
  let requestId;

  test('creates a request with approval workflow', async () => {
    const res = await request(app)
      .post('/api/capex/requests')
      .set(auth)
      .send({
        title: 'Automated lifecycle test',
        department: 'Aviation',
        businessFunction: 'Aviation',
        budgetHolder: 'Budget Holder',
        estimatedValue: 18000,
        scopeDetails: 'Replace project equipment.',
        hsseRisk: 'Low',
        workerWelfareRisk: 'Low',
        fewerThan3Justification: 'Only two compliant suppliers available.',
        quotations: [
          { supplierName: 'Supplier A', quoteValue: 10000, isSelected: true, attachmentName: 'a.pdf' },
          { supplierName: 'Supplier B', quoteValue: 12000, attachmentName: 'b.pdf' },
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('Pending Line Manager Endorsement');
    requestId = res.body.id;
  });

  test('blocks PO uploaded state without mandatory PO fields', async () => {
    const res = await request(app)
      .patch(`/api/capex/requests/${requestId}/procurement`)
      .set(auth)
      .send({ poStatus: 'Uploaded', poNumber: 'PO-1' });

    expect(res.statusCode).toBe(400);
  });

  test('saves procurement, milestone, closure draft, and audit log', async () => {
    const procurement = await request(app)
      .patch(`/api/capex/requests/${requestId}/procurement`)
      .set(auth)
      .send({ poStatus: 'Uploaded', poNumber: 'PO-1', poValue: 15000, poAttachmentName: 'po.pdf' });
    expect(procurement.statusCode).toBe(200);
    expect(procurement.body.poStatus).toBe('Uploaded');

    const milestone = await request(app)
      .post(`/api/capex/requests/${requestId}/milestones`)
      .set(auth)
      .send({ stageName: 'Delivery', milestoneName: 'Install equipment' });
    expect(milestone.statusCode).toBe(201);
    expect(milestone.body.status).toBe('Open');

    const closure = await request(app)
      .patch(`/api/capex/requests/${requestId}/financial-closure`)
      .set(auth)
      .send({ actualSpend: 14900, capexFormAttachment: 'closure.pdf' });
    expect(closure.statusCode).toBe(200);
    expect(closure.body.actualSpend).toBe(14900);

    const audit = await request(app)
      .get(`/api/capex/requests/${requestId}/audit`)
      .set(auth);
    expect(audit.statusCode).toBe(200);
    expect(audit.body.length).toBeGreaterThan(0);
  });

  test('uploads and downloads request attachments with retention metadata', async () => {
    const upload = await request(app)
      .post(`/api/capex/requests/${requestId}/attachments`)
      .set(auth)
      .field('type', 'Scope Document')
      .field('retentionYears', '7')
      .attach('file', Buffer.from('capex evidence'), 'scope.txt');

    expect(upload.statusCode).toBe(201);
    expect(upload.body.name).toBe('scope.txt');
    expect(upload.body.retentionUntil).toBeTruthy();

    const download = await request(app)
      .get(`/api/capex/requests/${requestId}/attachments/${upload.body.id}/download`)
      .set(auth);
    expect(download.statusCode).toBe(200);
    expect(download.text).toBe('capex evidence');
  });
});

describe('CAPEX admin configuration', () => {
  test('returns thresholds and workflow matrix rows', async () => {
    const res = await request(app).get('/api/capex/admin-config').set(auth);
    expect(res.statusCode).toBe(200);
    expect(res.body.thresholds.lowMaxOmr).toBeGreaterThan(0);
    expect(res.body.workflowRules.length).toBeGreaterThan(0);
  });

  test('updates value thresholds and restores defaults', async () => {
    const update = await request(app)
      .patch('/api/capex/admin-config/thresholds')
      .set(auth)
      .send({ lowMaxOmr: 26000, mediumMaxOmr: 310000 });
    expect(update.statusCode).toBe(200);
    expect(update.body.lowMaxOmr).toBe(26000);

    const restore = await request(app)
      .patch('/api/capex/admin-config/thresholds')
      .set(auth)
      .send({ lowMaxOmr: 25000, mediumMaxOmr: 300000 });
    expect(restore.statusCode).toBe(200);
  });
});
