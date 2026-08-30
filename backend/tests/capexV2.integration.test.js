const { randomUUID } = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const pool = require('../src/database/db');

const secret = process.env.JWT_SECRET || 'som-super-secret-key-2026';
const stamp = Date.now();
const users = {
  admin: { id: randomUUID(), role: 'Admin', name: 'V2 Pilot Administrator' },
  owner: { id: randomUUID(), role: 'Project Owner', name: 'V2 Project Owner' },
  manager: { id: randomUUID(), role: 'Manager', name: 'V2 Line Manager' },
  hsse: { id: randomUUID(), role: 'HSSE Focal', name: 'V2 HSSE Focal' },
  finance: { id: randomUUID(), role: 'Finance in Business', name: 'V2 Finance in Business' },
};
let pilotFiscalYear;
let outsiderId = null;

function auth(user) {
  return {
    Authorization: `Bearer ${jwt.sign({ id: user.id, email: `${user.id}@shell.om`, role: user.role, full_name: user.name }, secret, { expiresIn: '1h' })}`,
  };
}

async function seedUsers() {
  for (const [index, [key, user]] of Object.entries(users).entries()) {
    await pool.query(
      `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role, department)
       VALUES ($1,$2,$3,$4,'test-only',$5,'V2 Pilot')`,
      [user.id, `V2${String(stamp).slice(-8)}${String(index).padStart(2, '0')}`, user.name, `${user.id}@shell.om`, user.role]
    );
    await pool.query(
      `INSERT INTO som_permissions
         (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
       VALUES ($1,'application','capex',TRUE,TRUE,TRUE,FALSE)`,
      [user.id]
    );
  }
  const { rows: [year] } = await pool.query(
    `SELECT candidate AS fiscal_year
       FROM generate_series(2000, 2200) candidate
      WHERE NOT EXISTS (SELECT 1 FROM capex_v2.budget_cycles c WHERE c.fiscal_year=candidate)
      ORDER BY candidate DESC LIMIT 1`
  );
  pilotFiscalYear = year.fiscal_year;
}

describe('CAPEX v2 budget-to-approval pilot', () => {
  let organizationId;
  let budgetCycleId;
  let allocationId;
  let requestId;

  beforeAll(seedUsers);

  afterAll(async () => {
    const { rows: [tables] } = await pool.query(
      `SELECT string_agg(format('%I.%I', schemaname, tablename), ', ') AS names
         FROM pg_tables WHERE schemaname='capex_v2'`
    );
    if (tables.names) await pool.query(`TRUNCATE TABLE ${tables.names} RESTART IDENTITY CASCADE`);
    const userIds = [...Object.values(users).map((user) => user.id), ...(outsiderId ? [outsiderId] : [])];
    await pool.query(`DELETE FROM som_users WHERE id=ANY($1::uuid[])`, [userIds]);
    await pool.end();
  });

  test('loads authoritative master data and explicit scoped assignees', async () => {
    const organization = await request(app)
      .post('/api/capex/v2/master-data/organizations')
      .set(auth(users.admin))
      .send({ name: `Verified Pilot Business ${stamp}`, externalReference: `ORG-${stamp}` });
    expect(organization.statusCode).toBe(200);
    organizationId = organization.body.id;

    const availableBusinessFunctions = await request(app)
      .get('/api/users/business-functions')
      .set(auth(users.admin));
    expect(availableBusinessFunctions.statusCode).toBe(200);
    expect(availableBusinessFunctions.body).toContainEqual({
      id: organizationId,
      name: `Verified Pilot Business ${stamp}`,
    });

    const userAssignment = await request(app)
      .put(`/api/users/${users.owner.id}`)
      .set(auth(users.admin))
      .send({ business_function_id: organizationId });
    expect(userAssignment.statusCode).toBe(200);

    const userProfile = await request(app)
      .get(`/api/users/${users.owner.id}`)
      .set(auth(users.admin));
    expect(userProfile.statusCode).toBe(200);
    expect(userProfile.body).toMatchObject({
      business_function_id: organizationId,
      business_function_name: `Verified Pilot Business ${stamp}`,
    });

    const assignments = [
      { userId: users.owner.id, roleName: 'Project Owner', scopeType: 'OWN', organizationUnitId: organizationId, capabilities: ['request:create'] },
      { userId: users.hsse.id, roleName: 'HSSE Focal', scopeType: 'BUSINESS_UNIT', organizationUnitId: organizationId, capabilities: [] },
      { userId: users.finance.id, roleName: 'Finance in Business', scopeType: 'BUSINESS_UNIT', organizationUnitId: organizationId, capabilities: [] },
    ];
    for (const assignment of assignments) {
      const response = await request(app)
        .post('/api/capex/v2/master-data/scope-assignments')
        .set(auth(users.admin))
        .send(assignment);
      expect(response.statusCode).toBe(200);
    }
  });

  test('activates only an explicit signed workflow version', async () => {
    const definition = await request(app)
      .post('/api/capex/v2/workflow/definitions')
      .set(auth(users.admin))
      .send({ code: `CAPEX_PILOT_${stamp}`, name: `Signed pilot MOA ${stamp}`, workflowType: 'CAPEX_REQUEST' });
    expect(definition.statusCode).toBe(200);

    const version = await request(app)
      .post(`/api/capex/v2/workflow/definitions/${definition.body.id}/versions`)
      .set(auth(users.admin))
      .send({
        sourceArtifactReference: `MOA-DRAFT-${stamp}`,
        authorityMode: 'PILOT',
        rules: [{
          label: 'Verified pilot low-value route',
          valueBand: 'LOW',
          minAmount: '0.001',
          maxAmount: '24999.999',
          minQuoteCount: 1,
          steps: [{
            stepKey: 'FIB_VALIDATION',
            label: 'Finance in Business validation',
            approverRole: 'Finance in Business',
            scopeResolution: 'REQUEST_ORG',
          }],
        }],
      });
    expect(version.statusCode).toBe(200);
    expect(version.body.status).toBe('DRAFT');

    const blockedActivation = await request(app)
      .post(`/api/capex/v2/workflow/versions/${version.body.id}/activate`)
      .set(auth(users.admin))
      .send({
        signedArtifactReference: `MOA-SIGNED-${stamp}`,
        businessSignoffReference: `BUSINESS-SIGNOFF-${stamp}`,
        effectiveFrom: '2026-01-01',
      });
    expect(blockedActivation.statusCode).toBe(409);
    expect(blockedActivation.body.code).toBe('WORKFLOW_SIMULATION_REQUIRED');

    const simulation = await request(app)
      .post('/api/capex/v2/workflow/simulate')
      .set(auth(users.admin))
      .send({
        versionId: version.body.id,
        amount: '19250.075',
        quoteCount: 1,
        organizationUnitId: organizationId,
      });
    expect(simulation.statusCode).toBe(200);
    expect(simulation.body).toMatchObject({ ready: true, recordedForActivation: true });

    const activated = await request(app)
      .post(`/api/capex/v2/workflow/versions/${version.body.id}/activate`)
      .set(auth(users.admin))
      .send({
        signedArtifactReference: `MOA-SIGNED-${stamp}`,
        businessSignoffReference: `BUSINESS-SIGNOFF-${stamp}`,
        effectiveFrom: '2026-01-01',
      });
    expect(activated.statusCode).toBe(200);
    expect(activated.body).toMatchObject({ status: 'ACTIVE', authorityMode: 'PILOT' });
  });

  test('stages, validates, and posts a traceable SAC baseline', async () => {
    const cycle = await request(app)
      .post('/api/capex/v2/budget-cycles')
      .set(auth(users.admin))
      .send({ fiscalYear: pilotFiscalYear, boardApprovalReference: `BOARD-${stamp}`, boardApprovedAt: '2026-10-15' });
    expect(cycle.statusCode).toBe(200);
    budgetCycleId = cycle.body.id;

    const staged = await request(app)
      .post('/api/capex/v2/imports')
      .set(auth(users.admin))
      .field('payload', JSON.stringify({
        budgetCycleId,
        sourceSystem: 'SAC',
        importType: 'APPROVED_BUDGET',
        sourceReference: `SAC-BOARD-${stamp}`,
      }))
      .attach(
        'file',
        Buffer.from(`business_function,external_project_reference,description,amount,currency,source_date\nVerified Pilot Business ${stamp},SAC-WBS-${stamp},Verified pilot allocation,75000.125,OMR,2026-10-15`),
        'approved-sac-budget.csv'
      );
    expect(staged.statusCode).toBe(200);

    const preview = await request(app)
      .get(`/api/capex/v2/imports/${staged.body.id}`)
      .set(auth(users.admin));
    expect(preview.statusCode).toBe(200);
    expect(preview.body).toMatchObject({ status: 'STAGED', rowCount: 1, hasOriginalFile: true });
    expect(preview.body.rows[0]).toMatchObject({
      rowNumber: 1,
      businessFunction: `Verified Pilot Business ${stamp}`,
      amount: '75000.125',
      validationStatus: 'PENDING',
      validationErrors: [],
    });

    const forbiddenPreview = await request(app)
      .get(`/api/capex/v2/imports/${staged.body.id}`)
      .set(auth(users.owner));
    expect(forbiddenPreview.statusCode).toBe(403);

    const download = await request(app)
      .get(`/api/capex/v2/imports/${staged.body.id}/download`)
      .set(auth(users.admin));
    expect(download.statusCode).toBe(200);
    expect(download.headers['content-disposition']).toContain('approved-sac-budget.csv');
    expect(download.headers['x-capex-v2-download-mode']).toBe('original');
    expect(download.text).toContain(`Verified Pilot Business ${stamp}`);

    const validated = await request(app)
      .post(`/api/capex/v2/imports/${staged.body.id}/validate`)
      .set(auth(users.admin));
    expect(validated.statusCode).toBe(200);
    expect(validated.body).toMatchObject({ status: 'VALIDATED', invalidRowCount: 0, controlTotal: '75000.125' });

    const validatedPreview = await request(app)
      .get(`/api/capex/v2/imports/${staged.body.id}`)
      .set(auth(users.admin));
    expect(validatedPreview.body.rows[0]).toMatchObject({ validationStatus: 'VALID', validationErrors: [] });

    const posted = await request(app)
      .post(`/api/capex/v2/imports/${staged.body.id}/post`)
      .set(auth(users.admin));
    expect(posted.statusCode).toBe(200);
    expect(posted.body.status).toBe('POSTED');

    const allocations = await request(app)
      .get(`/api/capex/v2/allocations?budgetCycleId=${budgetCycleId}`)
      .set(auth(users.admin));
    expect(allocations.statusCode).toBe(200);
    expect(allocations.body).toHaveLength(1);
    expect(allocations.body[0].authorizedBudget).toBe('75000.125');
    allocationId = allocations.body[0].id;
  });

  test('routes requester evidence through HSSE and configured MOA approval', async () => {
    const fiscalYear = pilotFiscalYear;
    const draft = await request(app)
      .post('/api/capex/v2/requests')
      .set(auth(users.owner))
      .send({
        title: `Verified canopy project ${stamp}`,
        organizationUnitId: organizationId,
        budgetAllocationId: allocationId,
        fiscalYear,
        estimatedValue: '19250.075',
        projectDescription: 'Replace the canopy with verified scope and implementation evidence.',
        businessCase: 'Asset integrity and continuity.',
        roiSummary: 'Avoided downtime and maintenance cost.',
        urgent: false,
      });
    expect(draft.statusCode).toBe(200);
    requestId = draft.body.id;

    const evidence = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/documents`)
      .set(auth(users.owner))
      .field('documentKind', 'PROJECT_EVIDENCE')
      .attach('file', Buffer.from('verified project evidence'), 'scope.pptx');
    expect(evidence.statusCode).toBe(200);

    const quotation = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/quotations`)
      .set(auth(users.owner))
      .send({ supplierName: 'Verified Engineering Supplier', quotedValue: '18500.050', paymentTerms: '30 days', isProposed: true });
    expect(quotation.statusCode).toBe(200);

    const quotationEvidence = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/quotations/${quotation.body.id}/documents`)
      .set(auth(users.owner))
      .attach('file', Buffer.from('verified supplier quotation'), 'quotation.pdf');
    expect(quotationEvidence.statusCode).toBe(200);

    const submitted = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/submit`)
      .set(auth(users.owner));
    expect(submitted.statusCode).toBe(200);
    expect(submitted.body).toMatchObject({ status: 'IN_REVIEW', valueBand: 'LOW', authorityMode: 'PILOT' });

    const hsseReturn = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/decision`)
      .set(auth(users.hsse))
      .send({ decision: 'RETURNED', comment: 'Clarify timing and provide evidence for screening.' });
    expect(hsseReturn.statusCode).toBe(200);
    expect(hsseReturn.body.status).toBe('RETURNED');

    const returned = await request(app)
      .get(`/api/capex/v2/requests/${requestId}`)
      .set(auth(users.owner));
    expect(returned.statusCode).toBe(200);

    const corrected = await request(app)
      .patch(`/api/capex/v2/requests/${requestId}`)
      .set(auth(users.owner))
      .send({
        version: returned.body.version,
        projectDescription: 'Replace the canopy using the clarified accelerated delivery sequence.',
        urgent: true,
      });
    expect(corrected.statusCode).toBe(200);

    const removedQuotation = await request(app)
      .delete(`/api/capex/v2/requests/${requestId}/quotations/${quotation.body.id}`)
      .set(auth(users.owner));
    expect(removedQuotation.statusCode).toBe(200);
    expect(removedQuotation.body.supplierName).toBe('Verified Engineering Supplier');

    const replacementQuotation = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/quotations`)
      .set(auth(users.owner))
      .send({ supplierName: 'Replacement Verified Supplier', quotedValue: '18300.025', paymentTerms: '45 days', isProposed: true });
    expect(replacementQuotation.statusCode).toBe(200);

    const replacementEvidence = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/quotations/${replacementQuotation.body.id}/documents`)
      .set(auth(users.owner))
      .attach('file', Buffer.from('corrected supplier quotation'), 'corrected-quotation.pdf');
    expect(replacementEvidence.statusCode).toBe(200);

    const resubmitted = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/submit`)
      .set(auth(users.owner));
    expect(resubmitted.statusCode).toBe(200);

    const lockedQuotationEdit = await request(app)
      .delete(`/api/capex/v2/requests/${requestId}/quotations/${replacementQuotation.body.id}`)
      .set(auth(users.owner));
    expect(lockedQuotationEdit.statusCode).toBe(409);
    expect(lockedQuotationEdit.body.code).toBe('QUOTATIONS_LOCKED');

    const hsseDecision = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/decision`)
      .set(auth(users.hsse))
      .send({ decision: 'APPROVED', hsseRisk: 'MEDIUM', workerWelfareRisk: 'LOW', comment: 'Controls recorded.' });
    expect(hsseDecision.statusCode).toBe(200);

    const financeDecision = await request(app)
      .post(`/api/capex/v2/requests/${requestId}/decision`)
      .set(auth(users.finance))
      .send({ decision: 'APPROVED', comment: 'Budget position validated.' });
    expect(financeDecision.statusCode).toBe(200);
    expect(financeDecision.body.status).toBe('APPROVED');
    expect(financeDecision.body.project.projectNumber).toMatch(/^CAPEX-/);

    const detail = await request(app)
      .get(`/api/capex/v2/requests/${requestId}`)
      .set(auth(users.owner));
    expect(detail.statusCode).toBe(200);
    expect(detail.body.status).toBe('APPROVED');
    expect(detail.body.hsseAssessments[0]).toMatchObject({ status: 'COMPLETED', hsseRisk: 'MEDIUM', workerWelfareRisk: 'LOW' });
    expect(detail.body.urgent).toBe(true);
    expect(detail.body.project).toBeTruthy();

    const urgentRegister = await request(app)
      .get('/api/capex/v2/requests?urgency=URGENT&status=APPROVED')
      .set(auth(users.owner));
    expect(urgentRegister.statusCode).toBe(200);
    expect(urgentRegister.body).toMatchObject({ total: 1 });
    expect(urgentRegister.body.items[0].id).toBe(requestId);

    const dashboard = await request(app)
      .get('/api/capex/v2/dashboards/operational')
      .set(auth(users.owner));
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.body.financials).toMatchObject({
      originalBudget: '75000.125',
      authorizedBudget: '75000.125',
    });
  });

  test('rejects cross-scope direct request access', async () => {
    const outsider = { id: randomUUID(), role: 'Project Owner', name: 'V2 Outsider' };
    outsiderId = outsider.id;
    await pool.query(
      `INSERT INTO som_users (id, employee_id, full_name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,'test-only',$5)`,
      [outsider.id, `V2OUT${String(stamp).slice(-8)}`, outsider.name, `${outsider.id}@shell.om`, outsider.role]
    );
    await pool.query(
      `INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
       VALUES ($1,'application','capex',TRUE,TRUE,FALSE,FALSE)`,
      [outsider.id]
    );
    const response = await request(app).get(`/api/capex/v2/requests/${requestId}`).set(auth(outsider));
    expect(response.statusCode).toBe(404);

    const deniedCreate = await request(app)
      .post('/api/capex/v2/requests')
      .set(auth(outsider))
      .send({
        title: 'Out-of-scope direct request',
        organizationUnitId: organizationId,
        fiscalYear: pilotFiscalYear,
        estimatedValue: '1.000',
        projectDescription: 'This direct-ID mutation must be rejected by the server.',
      });
    expect(deniedCreate.statusCode).toBe(403);
  });
});
