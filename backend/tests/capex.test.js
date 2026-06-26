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

  test('tracks governance lifecycle modules and dashboard metrics', async () => {
    const auc = await request(app)
      .patch(`/api/capex/requests/${requestId}/auc`)
      .set(auth)
      .send({
        aucAccount: 'AUC-1001',
        aucValue: 14900,
        aucStartDate: '2026-01-01',
        capitalizationReady: true,
        status: 'Open',
      });
    expect(auc.statusCode).toBe(200);
    expect(auc.body.capitalizationReady).toBe(true);

    const capitalization = await request(app)
      .patch(`/api/capex/requests/${requestId}/capitalization`)
      .set(auth)
      .send({
        status: 'Pending Approval',
        financeVerified: true,
        capitalizationRequestDate: '2026-02-01',
        assetMasterNumber: 'FA-1001',
        capitalizedValue: 14900,
      });
    expect(capitalization.statusCode).toBe(200);
    expect(capitalization.body.assetMasterNumber).toBe('FA-1001');

    const poClosure = await request(app)
      .patch(`/api/capex/requests/${requestId}/po-closure`)
      .set(auth)
      .send({
        finalInvoiceReceived: true,
        vendorConfirmationReceived: true,
        closureStatus: 'In Progress',
        openCommitmentValue: 100,
        unutilizedCommitment: 100,
        closureDueDate: '2026-03-01',
      });
    expect(poClosure.statusCode).toBe(200);
    expect(poClosure.body.openCommitmentValue).toBe(100);

    const detailBeforeChecklist = await request(app)
      .get(`/api/capex/requests/${requestId}`)
      .set(auth);
    expect(detailBeforeChecklist.statusCode).toBe(200);
    expect(detailBeforeChecklist.body.closureChecklist.length).toBeGreaterThan(0);

    const checklistItem = detailBeforeChecklist.body.closureChecklist[0];
    const checklist = await request(app)
      .patch(`/api/capex/requests/${requestId}/closure-checklist/${checklistItem.id}`)
      .set(auth)
      .send({ status: 'Completed', evidenceAttachment: 'completion.pdf' });
    expect(checklist.statusCode).toBe(200);
    expect(checklist.body.status).toBe('Completed');

    const benefit = await request(app)
      .post(`/api/capex/requests/${requestId}/benefit-reviews`)
      .set(auth)
      .send({
        reviewPeriodMonths: 6,
        plannedRoi: 12,
        actualRoi: 14,
        plannedSavings: 500,
        actualSavings: 650,
        benefitScore: 90,
        status: 'Completed',
      });
    expect(benefit.statusCode).toBe(200);
    expect(benefit.body.reviewPeriodMonths).toBe(6);

    const risk = await request(app)
      .post(`/api/capex/requests/${requestId}/risks`)
      .set(auth)
      .send({
        category: 'Schedule Risk',
        title: 'Vendor delivery delay',
        severity: 'Red',
        mitigationPlan: 'Weekly vendor escalation',
      });
    expect(risk.statusCode).toBe(201);
    expect(risk.body.severity).toBe('Red');

    const moa = await request(app)
      .post(`/api/capex/requests/${requestId}/moa`)
      .set(auth)
      .send({
        moaNumber: 'MOA-TEST-001',
        title: 'Lifecycle Test MOA',
        approvalAuthority: 'Business GM',
        approvalStatus: 'Approved',
        projectValue: 18000,
        expiryDate: '2026-03-01',
        renewalRequired: true,
      });
    expect(moa.statusCode).toBe(201);
    expect(moa.body.matrixValidated).toBe(true);

    const moaRevision = await request(app)
      .post(`/api/capex/requests/${requestId}/moa/${moa.body.id}/revisions`)
      .set(auth)
      .send({ changeSummary: 'Updated authority matrix evidence.' });
    expect(moaRevision.statusCode).toBe(201);
    expect(moaRevision.body.revisionNumber).toBe(1);

    const documentVersion = await request(app)
      .post(`/api/capex/requests/${requestId}/document-versions`)
      .set(auth)
      .send({
        documentType: 'MOA',
        documentName: 'Lifecycle Test MOA',
        versionLabel: 'v1',
        changelog: 'Initial approved MOA record',
        retentionUntil: '2033-01-01',
      });
    expect(documentVersion.statusCode).toBe(201);
    expect(documentVersion.body.versionLabel).toBe('v1');

    const signature = await request(app)
      .post(`/api/capex/requests/${requestId}/signatures`)
      .set(auth)
      .send({
        linkedType: 'MOA',
        linkedId: String(moa.body.id),
        signerName: 'Test GM',
        signerRole: 'Business GM',
        decision: 'Signed',
      });
    expect(signature.statusCode).toBe(201);
    expect(signature.body.signerRole).toBe('Business GM');

    const schedule = await request(app)
      .post('/api/capex/report-schedules')
      .set(auth)
      .send({
        reportName: 'Monthly CAPEX Governance Pack',
        reportType: 'governance',
        audience: 'CEO/CFO',
        frequency: 'Monthly',
        format: 'PDF',
        recipients: ['cfo@shell.om'],
        nextRunDate: '2026-04-01',
      });
    expect(schedule.statusCode).toBe(201);
    expect(schedule.body.reportType).toBe('governance');

    const processRef = await request(app)
      .get('/api/capex/process-reference')
      .set(auth);
    expect(processRef.statusCode).toBe(200);
    expect(processRef.body.businessUnits.length).toBeGreaterThan(0);
    expect(processRef.body.projectTypes.length).toBeGreaterThan(0);
    expect(processRef.body.decisionGates).toHaveLength(8);
    expect(processRef.body.escalationPolicies.length).toBeGreaterThan(0);

    const variation = await request(app)
      .post(`/api/capex/requests/${requestId}/budget-variations`)
      .set(auth)
      .send({
        variationType: 'Variation',
        originalBudget: 18000,
        revisedBudget: 20500,
        justification: 'Additional electrical scope discovered.',
        financialImpactAnalysis: 'Variance is manageable within portfolio.',
        fibReviewStatus: 'Reviewed',
      });
    expect(variation.statusCode).toBe(201);
    expect(variation.body.moaApprovalRequired).toBe(true);

    const procurementPerformance = await request(app)
      .patch(`/api/capex/requests/${requestId}/procurement-performance`)
      .set(auth)
      .send({
        rfqIssuedAt: '2026-01-02',
        tenderStartedAt: '2026-01-05',
        tenderCompletedAt: '2026-01-15',
        vendorResponseCount: 2,
        invitedVendorCount: 3,
        budgetEstimate: 18000,
        awardedValue: 15000,
        poProcessingDays: 4,
        cpOwner: 'CP Lead',
      });
    expect(procurementPerformance.statusCode).toBe(200);
    expect(procurementPerformance.body.procurementSavings).toBe(3000);

    const gate = await request(app)
      .patch(`/api/capex/requests/${requestId}/decision-gates/gate_3_procurement`)
      .set(auth)
      .send({
        status: 'Passed',
        reviewer: 'CP Manager',
        comments: 'Procurement requirements complete.',
        evidence: 'gate-3.pdf',
      });
    expect(gate.statusCode).toBe(200);
    expect(gate.body.status).toBe('Passed');

    const dashboard = await request(app)
      .get('/api/capex/dashboard/governance')
      .set(auth);
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.body.portfolio.totalProjects).toBeGreaterThan(0);
    expect(dashboard.body.auc.totalValue).toBeGreaterThanOrEqual(14900);
    expect(dashboard.body.risk.redRisks).toBeGreaterThan(0);
    expect(dashboard.body.moaCompliance.approvedMoa).toBeGreaterThan(0);
    expect(dashboard.body.documentControls.documentVersions).toBeGreaterThan(0);
    expect(dashboard.body.documentControls.electronicSignatures).toBeGreaterThan(0);
    expect(dashboard.body.scheduledReporting.activeSchedules).toBeGreaterThan(0);
    expect(dashboard.body.variationControl.totalVariations).toBeGreaterThan(0);
    expect(dashboard.body.procurementPerformance.procurementSavings).toBeGreaterThanOrEqual(3000);
    expect(dashboard.body.decisionGates.passedGates).toBeGreaterThan(0);

    const drilldown = await request(app)
      .get('/api/capex/dashboard/drilldown?type=moaCompliance')
      .set(auth);
    expect(drilldown.statusCode).toBe(200);
    expect(drilldown.body.rows.length).toBeGreaterThan(0);

    const variationDrilldown = await request(app)
      .get('/api/capex/dashboard/drilldown?type=variations')
      .set(auth);
    expect(variationDrilldown.statusCode).toBe(200);
    expect(variationDrilldown.body.rows.length).toBeGreaterThan(0);

    const exportRes = await request(app)
      .get('/api/capex/reports/export?reportType=governance&format=csv')
      .set(auth);
    expect(exportRes.statusCode).toBe(200);
    expect(exportRes.text).toContain('requestId');

    const detail = await request(app)
      .get(`/api/capex/requests/${requestId}`)
      .set(auth);
    expect(detail.statusCode).toBe(200);
    expect(detail.body.auc.aucAccount).toBe('AUC-1001');
    expect(detail.body.capitalization.assetMasterNumber).toBe('FA-1001');
    expect(detail.body.poClosure.closureStatus).toBe('In Progress');
    expect(detail.body.benefitReviews).toHaveLength(1);
    expect(detail.body.risks).toHaveLength(1);
    expect(detail.body.moaRecords).toHaveLength(1);
    expect(detail.body.documentVersions).toHaveLength(1);
    expect(detail.body.electronicSignatures).toHaveLength(1);
    expect(detail.body.budgetVariations).toHaveLength(1);
    expect(detail.body.procurementPerformance.procurementSavings).toBe(3000);
    expect(detail.body.decisionGates.length).toBeGreaterThanOrEqual(8);
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
