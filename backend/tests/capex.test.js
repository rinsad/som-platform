const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const pool = require('../src/database/db');
const { getRolePermissionPreset } = require('../src/config/capexRolePermissions');

const token = jwt.sign(
  { id: 1, email: 'admin@shell.om', role: 'Admin', department: 'IT' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);

const auth = { Authorization: `Bearer ${token}` };

const limitedToken = jwt.sign(
  { id: '00000000-0000-0000-0000-000000000001', email: 'limited@shell.om', role: 'Employee', department: 'Retail' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);

const limitedAuth = { Authorization: `Bearer ${limitedToken}` };

const approverUserId = '00000000-0000-0000-0000-0000000000a7';
const approverToken = jwt.sign(
  { id: approverUserId, email: 'phase7.approver@shell.om', full_name: 'Phase 7 Approver', role: 'Finance Manager', department: 'Finance' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);
const approverAuth = { Authorization: `Bearer ${approverToken}` };

const managerUserId = '00000000-0000-0000-0000-0000000000b8';
const managerToken = jwt.sign(
  { id: managerUserId, email: 'phase7.manager@shell.om', full_name: 'Phase 7 Manager', role: 'Manager', department: 'Operations' },
  process.env.JWT_SECRET || 'som-super-secret-key-2026',
  { expiresIn: '1h' }
);
const managerAuth = { Authorization: `Bearer ${managerToken}` };

async function seedApproverPermission() {
  await pool.query(
    `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role, department)
     VALUES ($1, 'P7A', 'Phase 7 Approver', 'phase7.approver@shell.om', 'test-only', 'Finance Manager', 'Finance')
     ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department`,
    [approverUserId]
  );
  await pool.query(
    `INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
     VALUES ($1, 'page', 'capex.approvals', true, false, true, false)
     ON CONFLICT (user_id, resource_key) DO UPDATE SET can_view = true, can_edit = true`,
    [approverUserId]
  );
  await pool.query(
    `INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
     VALUES ($1, 'page', 'capex.documents', true, false, false, false)
     ON CONFLICT (user_id, resource_key) DO UPDATE SET can_view = true`,
    [approverUserId]
  );
  await pool.query(
    `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role, department)
     VALUES ($1, 'P7M', 'Phase 7 Manager', 'phase7.manager@shell.om', 'test-only', 'Manager', 'Operations')
     ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department`,
    [managerUserId]
  );
  await pool.query(
    `INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
     VALUES ($1, 'page', 'capex.approvals', true, false, true, false)
     ON CONFLICT (user_id, resource_key) DO UPDATE SET can_view = true, can_edit = true`,
    [managerUserId]
  );
}

async function createCapex(overrides = {}) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const res = await request(app)
    .post('/api/capex/requests')
    .set(auth)
    .send({
      title: `Phase 7 CAPEX ${stamp}`,
      department: 'Aviation',
      businessFunction: 'Aviation',
      budgetHolder: 'Budget Holder',
      estimatedValue: 18000,
      scopeDetails: 'Phase 7 hardening test request.',
      hsseRisk: 'Low',
      workerWelfareRisk: 'Low',
      quotations: [
        { supplierName: 'Supplier A', quoteValue: 10000, isSelected: true, attachmentName: 'a.pdf' },
        { supplierName: 'Supplier B', quoteValue: 12000, attachmentName: 'b.pdf' },
        { supplierName: 'Supplier C', quoteValue: 14000, attachmentName: 'c.pdf' },
      ],
      ...overrides,
    });
  if (res.statusCode !== 201) throw new Error(`createCapex failed: ${res.statusCode} ${JSON.stringify(res.body)}`);
  return res.body;
}

beforeAll(async () => {
  await seedApproverPermission();
});

// Walk a request through every pending approval step (as Admin) until it
// reaches the 'Approved' state, so procurement/execution gating is satisfied.
async function approveAll(requestId) {
  for (let i = 0; i < 12; i += 1) {
    const detail = await request(app).get(`/api/capex/requests/${requestId}`).set(auth);
    if (detail.body.status === 'Approved' || !detail.body.currentStepId) return detail.body;
    const decided = await request(app)
      .patch(`/api/capex/requests/${requestId}/decision`)
      .set(auth)
      .send({ decision: 'APPROVED' });
    if (decided.statusCode !== 200) throw new Error(`approve step failed: ${decided.statusCode} ${JSON.stringify(decided.body)}`);
  }
  throw new Error('approveAll exceeded step limit');
}

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

  test('returns 403 when user lacks CAPEX permission', async () => {
    const res = await request(app).get('/api/capex/summary').set(limitedAuth);
    expect(res.statusCode).toBe(403);
  });
});

describe('CAPEX role permission presets', () => {
  test('Project Owner can create requests but cannot edit finance controls', () => {
    const preset = getRolePermissionPreset('Project Owner');
    const requests = preset.find((p) => p.resource_key === 'capex.requests');
    const finance = preset.find((p) => p.resource_key === 'capex.finance');
    const closure = preset.find((p) => p.resource_key === 'capex.closure');

    expect(requests).toMatchObject({ can_view: true, can_create: true, can_edit: true });
    expect(finance?.can_edit).not.toBe(true);
    expect(closure?.can_edit).not.toBe(true);
  });

  test('Finance Manager can edit finance controls and create reports', () => {
    const preset = getRolePermissionPreset('Finance Manager');
    const finance = preset.find((p) => p.resource_key === 'capex.finance');
    const reports = preset.find((p) => p.resource_key === 'capex.reports');

    expect(finance).toMatchObject({ can_view: true, can_edit: true });
    expect(reports).toMatchObject({ can_view: true, can_create: true });
  });

  test('CEO/Board can approve but cannot edit procurement controls', () => {
    const preset = getRolePermissionPreset('CEO/Board');
    const approvals = preset.find((p) => p.resource_key === 'capex.approvals');
    const procurement = preset.find((p) => p.resource_key === 'capex.procurement');

    expect(approvals).toMatchObject({ can_view: true, can_edit: true });
    expect(procurement?.can_edit).not.toBe(true);
  });

  test('Project Engineer can edit procurement controls and upload related documents', () => {
    const preset = getRolePermissionPreset('Project Engineer');
    const procurement = preset.find((p) => p.resource_key === 'capex.procurement');
    const execution = preset.find((p) => p.resource_key === 'capex.execution');
    const documents = preset.find((p) => p.resource_key === 'capex.documents');

    expect(procurement).toMatchObject({ can_view: true, can_create: true, can_edit: true });
    expect(execution).toMatchObject({ can_view: true, can_create: true, can_edit: true });
    expect(documents).toMatchObject({ can_view: true, can_create: true, can_edit: true });
  });

  test('Project Owner cannot edit execution controls', () => {
    const preset = getRolePermissionPreset('Project Owner');
    const execution = preset.find((p) => p.resource_key === 'capex.execution');

    expect(execution?.can_edit).not.toBe(true);
  });

  test('CP roles can edit procurement but not closure controls', () => {
    for (const role of ['CP Manager', 'CP Lead']) {
      const preset = getRolePermissionPreset(role);
      const procurement = preset.find((p) => p.resource_key === 'capex.procurement');
      const closure = preset.find((p) => p.resource_key === 'capex.closure');

      expect(procurement).toMatchObject({ can_view: true, can_create: true, can_edit: true });
      expect(closure?.can_edit).not.toBe(true);
    }
  });

  test('Asset Team cannot edit closure controls', () => {
    const preset = getRolePermissionPreset('Asset Team');
    const closure = preset.find((p) => p.resource_key === 'capex.closure');

    expect(closure?.can_edit).not.toBe(true);
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

describe('CAPEX approval and gating hardening', () => {
  test('decision on a terminal request returns 400', async () => {
    const created = await createCapex();
    const rejected = await request(app)
      .patch(`/api/capex/requests/${created.id}/decision`)
      .set(auth)
      .send({ decision: 'REJECTED', comment: 'No longer required.' });
    expect(rejected.statusCode).toBe(200);
    expect(rejected.body.status).toBe('Rejected');

    const secondDecision = await request(app)
      .patch(`/api/capex/requests/${created.id}/decision`)
      .set(auth)
      .send({ decision: 'APPROVED' });
    expect(secondDecision.statusCode).toBe(400);
  });

  test('configured authority matrix denies roles outside allowed_user_roles', async () => {
    const created = await createCapex();
    const detail = await request(app).get(`/api/capex/requests/${created.id}`).set(auth);
    const role = detail.body.approvalSteps.find(step => step.id === detail.body.currentStepId).approverRole;

    try {
      await pool.query(
        `UPDATE capex_workflow_config SET allowed_user_roles = ARRAY['CFO']::text[] WHERE approver_role = $1`,
        [role]
      );
      const denied = await request(app)
        .patch(`/api/capex/requests/${created.id}/decision`)
        .set(approverAuth)
        .send({ decision: 'APPROVED' });
      expect(denied.statusCode).toBe(403);
    } finally {
      await pool.query(`UPDATE capex_workflow_config SET allowed_user_roles = '{}'::text[] WHERE approver_role = $1`, [role]);
    }
  });

  test('empty authority matrix rejects decisions from non-admin users', async () => {
    const created = await createCapex();
    const detail = await request(app).get(`/api/capex/requests/${created.id}`).set(auth);
    const role = detail.body.approvalSteps.find(step => step.id === detail.body.currentStepId).approverRole;
    await pool.query(`UPDATE capex_workflow_config SET allowed_user_roles = '{}'::text[] WHERE approver_role = $1`, [role]);

    const decided = await request(app)
      .patch(`/api/capex/requests/${created.id}/decision`)
      .set(approverAuth)
      .send({ decision: 'APPROVED' });
    expect(decided.statusCode).toBe(403);
    expect(decided.body.error).toMatch(/no authorised user roles configured/i);
  });

  test('legacy Line Manager steps resolve to canonical Manager authority', async () => {
    await pool.query(
      `UPDATE capex_workflow_config
       SET approver_role = 'Manager', allowed_user_roles = ARRAY['Manager']::text[]
       WHERE value_band = 'ALL' AND condition_key = 'standard' AND step_order = 1`
    );
    const created = await createCapex();
    const detail = await request(app).get(`/api/capex/requests/${created.id}`).set(auth);
    const currentStep = detail.body.approvalSteps.find(step => step.id === detail.body.currentStepId);
    await pool.query(`UPDATE capex_approval_steps SET approver_role = 'Line Manager' WHERE id = $1`, [currentStep.id]);

    const returned = await request(app)
      .patch(`/api/capex/requests/${created.id}/decision`)
      .set(managerAuth)
      .send({ decision: 'RETURNED', comment: 'Please clarify scope.' });

    expect(returned.statusCode).toBe(200);
    expect(returned.body.status).toBe('Returned for correction');
  });

  test('delegation uses active eligible users instead of arbitrary text', async () => {
    await pool.query(
      `UPDATE capex_workflow_config
       SET approver_role = 'Manager', allowed_user_roles = ARRAY['Manager']::text[]
       WHERE value_band = 'ALL' AND condition_key = 'standard' AND step_order = 1`
    );
    await pool.query(
      `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role, department)
       VALUES ('00000000-0000-0000-0000-0000000000c9', 'P7D', 'Phase 7 Delegate', 'phase7.delegate@shell.om', 'test-only', 'Manager', 'Operations')
       ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, role = EXCLUDED.role, department = EXCLUDED.department, is_active = true`
    );

    const created = await createCapex();
    const detail = await request(app).get(`/api/capex/requests/${created.id}`).set(auth);
    const currentStep = detail.body.approvalSteps.find(step => step.id === detail.body.currentStepId);

    const candidates = await request(app)
      .get(`/api/capex/requests/${created.id}/steps/${currentStep.id}/delegate-candidates`)
      .set(auth);
    expect(candidates.statusCode).toBe(200);
    expect(candidates.body.some(user => user.email === 'phase7.delegate@shell.om')).toBe(true);
    expect(candidates.body.some(user => user.email === 'admin@shell.om')).toBe(false);

    const rejected = await request(app)
      .patch(`/api/capex/requests/${created.id}/steps/${currentStep.id}/delegate`)
      .set(auth)
      .send({ delegateTo: 'typed-but-not-a-user@shell.om' });
    expect(rejected.statusCode).toBe(400);

    const delegated = await request(app)
      .patch(`/api/capex/requests/${created.id}/steps/${currentStep.id}/delegate`)
      .set(auth)
      .send({ delegateTo: 'phase7.delegate@shell.om' });
    expect(delegated.statusCode).toBe(200);
    expect(delegated.body.assignedTo).toBe('phase7.delegate@shell.om');
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
    expect(res.body.status).toBe('Pending line manager endorsement');
    requestId = res.body.id;
  });

  test('blocks procurement editing before approval completes', async () => {
    const res = await request(app)
      .patch(`/api/capex/requests/${requestId}/procurement`)
      .set(auth)
      .send({ vendorRegistrationStatus: 'Pending' });
    expect(res.statusCode).toBe(409);
  });

  test('walks the approval chain to Approved', async () => {
    const approved = await approveAll(requestId);
    expect(approved.status).toBe('Approved');
    const capexGate = approved.decisionGates.find(gate => gate.gateKey === 'gate_2_capex');
    expect(capexGate.status).toBe('Passed');
    expect(capexGate.autoManaged).toBe(true);
  });

  test('blocks manual updates to Gate 2 because workflow manages it automatically', async () => {
    const res = await request(app)
      .patch(`/api/capex/requests/${requestId}/decision-gates/gate_2_capex`)
      .set(auth)
      .send({ status: 'Passed' });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/updated automatically by the workflow/i);
  });

  test('blocks approval users from passing decision gates they do not own', async () => {
    const res = await request(app)
      .patch(`/api/capex/requests/${requestId}/decision-gates/gate_4_cost_schedule`)
      .set(managerAuth)
      .send({ status: 'Passed' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/project engineer/i);
  });

  test('allows the mapped owner role to pass the correct decision gate', async () => {
    const res = await request(app)
      .patch(`/api/capex/requests/${requestId}/decision-gates/gate_6_auc`)
      .set(approverAuth)
      .send({ status: 'Passed', comments: 'Finance review completed.' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('Passed');
    expect(res.body.ownerLabel).toBe('Finance');
    expect(res.body.canAct).toBe(false);

    const detail = await request(app)
      .get(`/api/capex/requests/${requestId}`)
      .set(auth);
    expect(detail.statusCode).toBe(200);
    expect(detail.body.decisionGates.find(gate => gate.gateKey === 'gate_6_auc').status).toBe('Passed');
  });

  test('blocks PO uploaded state without mandatory PO fields', async () => {
    const res = await request(app)
      .patch(`/api/capex/requests/${requestId}/procurement`)
      .set(auth)
      .send({ poStatus: 'Uploaded', poNumber: 'PO-1' });

    expect(res.statusCode).toBe(400);
  });

  test('blocks PO uploaded state when attachment name does not match an uploaded request attachment', async () => {
    const res = await request(app)
      .patch(`/api/capex/requests/${requestId}/procurement`)
      .set(auth)
      .send({ poStatus: 'Uploaded', poNumber: 'PO-1', poValue: 15000, poAttachmentName: 'missing-po.pdf' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/uploaded request attachment/i);
  });

  test('keeps execution locked when procurement has only created the PO', async () => {
    const procurement = await request(app)
      .patch(`/api/capex/requests/${requestId}/procurement`)
      .set(auth)
      .send({ poStatus: 'Created', poNumber: 'PO-1', poValue: 15000 });
    expect(procurement.statusCode).toBe(200);

    const detail = await request(app)
      .get(`/api/capex/requests/${requestId}`)
      .set(auth);
    expect(detail.statusCode).toBe(200);
    expect(detail.body.status).toBe('PO created');

    const milestone = await request(app)
      .post(`/api/capex/requests/${requestId}/milestones`)
      .set(auth)
      .send({ stageName: 'Delivery', milestoneName: 'Install equipment before upload' });
    expect(milestone.statusCode).toBe(409);
    expect(milestone.body.error).toMatch(/PO document to be uploaded/i);
  });

  test('saves procurement, milestone, closure draft, and audit log', async () => {
    const upload = await request(app)
      .post(`/api/capex/requests/${requestId}/attachments`)
      .set(auth)
      .field('type', 'PO Document')
      .field('retentionYears', '7')
      .attach('file', Buffer.from('po evidence'), 'po.pdf');
    expect(upload.statusCode).toBe(201);

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
    const checklistLabels = detailBeforeChecklist.body.closureChecklist.map(item => item.label);
    expect(checklistLabels).toContain('Asset handover completed');
    expect(checklistLabels).toContain('Lessons learned captured');
    expect(checklistLabels).toContain('Retention release completed');

    const blockedClosure = await request(app)
      .patch(`/api/capex/requests/${requestId}/financial-closure`)
      .set(auth)
      .send({ actualSpend: 14900, capexFormAttachment: 'scope.txt', closeRequest: true });
    expect(blockedClosure.statusCode).toBe(409);
    expect(blockedClosure.body.incompleteItems.length).toBeGreaterThan(0);

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
    expect(signature.body.signerName).toBe('admin@shell.om');
    expect(signature.body.signerRole).toBe('Admin');

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
        approvalStatus: 'Approved',
        approvedBy: 'Self Approver',
      });
    expect(variation.statusCode).toBe(201);
    expect(variation.body.moaApprovalRequired).toBe(true);
    expect(variation.body.approvalStatus).toBe('Pending');
    expect(variation.body.approvedBy).toBeFalsy();

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
    expect(detail.body.decisionGates.some(gate => gate.gateKey === 'gate_4_cost_schedule' && gate.ownerLabel === 'Project Engineer')).toBe(true);

    for (const item of detail.body.closureChecklist.filter(item => item.status !== 'Completed')) {
      const completed = await request(app)
        .patch(`/api/capex/requests/${requestId}/closure-checklist/${item.id}`)
        .set(auth)
        .send({ status: 'Completed', evidenceAttachment: `${item.itemKey}.pdf` });
      expect(completed.statusCode).toBe(200);
    }

    const closedPo = await request(app)
      .patch(`/api/capex/requests/${requestId}/po-closure`)
      .set(auth)
      .send({
        finalInvoiceReceived: true,
        vendorConfirmationReceived: true,
        closureStatus: 'Closed',
        openCommitmentValue: 0,
        unutilizedCommitment: 0,
      });
    expect(closedPo.statusCode).toBe(200);
    expect(closedPo.body.closureStatus).toBe('Closed');

    const closureForm = await request(app)
      .post(`/api/capex/requests/${requestId}/attachments`)
      .set(auth)
      .field('type', 'Closure Form')
      .field('retentionYears', '7')
      .attach('file', Buffer.from('closure form'), 'closure-form.txt');
    expect(closureForm.statusCode).toBe(201);

    const closed = await request(app)
      .patch(`/api/capex/requests/${requestId}/financial-closure`)
      .set(auth)
      .send({ actualSpend: 14900, capexFormAttachment: 'closure-form.txt', closeRequest: true });
    expect(closed.statusCode).toBe(200);
    expect(closed.body.closedAt).toBeTruthy();

    const closedDetail = await request(app)
      .get(`/api/capex/requests/${requestId}`)
      .set(auth);
    expect(closedDetail.statusCode).toBe(200);
    expect(closedDetail.body.status).toBe('Closed');

    const draftAfterClose = await request(app)
      .patch(`/api/capex/requests/${requestId}/financial-closure`)
      .set(auth)
      .send({ actualSpend: 14900, capexFormAttachment: 'closure-form.txt', closeRequest: false });
    expect(draftAfterClose.statusCode).toBe(200);

    const stillClosed = await request(app)
      .get(`/api/capex/requests/${requestId}`)
      .set(auth);
    expect(stillClosed.statusCode).toBe(200);
    expect(stillClosed.body.status).toBe('Closed');
  });
});

describe('CAPEX admin configuration', () => {
  test('returns thresholds and workflow matrix rows', async () => {
    const res = await request(app).get('/api/capex/admin-config').set(auth);
    expect(res.statusCode).toBe(200);
    expect(res.body.thresholds.lowMaxOmr).toBeGreaterThan(0);
    expect(res.body.workflowRules.length).toBeGreaterThan(0);
  });

  test('blocks Manager users from admin configuration', async () => {
    const res = await request(app).get('/api/capex/admin-config').set(managerAuth);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/admin access required/i);
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
