const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
const { USERS, PASSWORD } = require('../../backend/scripts/seedCapexVideoUsers');
const { getRoleTraining } = require('./capexRoleTrainingManifest.cjs');

const selectedRole = process.env.CAPEX_TRAINING_ROLE || 'Project Owner';
const training = getRoleTraining(selectedRole);
const personaByRole = new Map(USERS.map((user) => [user.role, user]));

if (!training) throw new Error(`No CAPEX role training manifest found for ${selectedRole}`);

const persona = personaByRole.get(training.role);
const completeWorkflow = training.completeWorkflows?.[0];

if (!persona) throw new Error(`No CAPEX video user found for ${training.role}`);
if (!completeWorkflow) throw new Error(`No complete workflow configured for ${training.role}`);

function roleOutputDir() {
  return path.resolve(__dirname, '../test-results/capex-role-training', training.role);
}

async function saveRoleVideo(page, useCase) {
  const rawDir = path.join(roleOutputDir(), 'raw');
  fs.mkdirSync(rawDir, { recursive: true });

  await page.close();
  const videoPath = await page.video().path();
  fs.copyFileSync(videoPath, path.join(rawDir, `${useCase.id}.webm`));
}

async function showChapter(page, title, body) {
  await page.evaluate(({ title, body }) => {
    let card = document.querySelector('[data-capex-training-caption]');
    if (!card) {
      card = document.createElement('div');
      card.setAttribute('data-capex-training-caption', 'true');
      Object.assign(card.style, {
        position: 'fixed',
        left: '24px',
        right: '24px',
        bottom: '24px',
        zIndex: 99999,
        padding: '18px 20px',
        borderRadius: '10px',
        background: 'rgba(12, 18, 28, 0.92)',
        color: '#fff',
        boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
        fontFamily: 'Inter, Arial, sans-serif',
        pointerEvents: 'none',
      });
      document.body.appendChild(card);
    }
    card.innerHTML = `
      <div style="font-size: 15px; font-weight: 800; margin-bottom: 6px;">${title}</div>
      <div style="font-size: 13px; line-height: 1.45; max-width: 980px;">${body}</div>
    `;
  }, { title, body });
  await page.waitForTimeout(4_000);
}

async function clearChapter(page) {
  await page.evaluate(() => document.querySelector('[data-capex-training-caption]')?.remove());
}

async function signInAs(page, user) {
  const res = await page.request.post('/api/auth/login', {
    data: { email: user.email, password: PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();

  await page.goto('/login');
  await page.evaluate(({ token, user: storedUser, permissions }) => {
    localStorage.setItem('som_token', token);
    localStorage.setItem('som_user', JSON.stringify(storedUser));
    localStorage.setItem('som_permissions', JSON.stringify(permissions));
  }, data);

  await page.goto('/capex');
  await expect(page.getByRole('heading', { name: /Capex Planning/i })).toBeVisible();
}

async function clickTab(page, label) {
  const tab = page.getByRole('button', { name: label });
  await expect(tab).toBeVisible();
  await tab.click();
  await page.waitForTimeout(700);
}

async function fillProjectOwnerRequest(page, title) {
  await clickTab(page, 'Requests');
  await showChapter(page, 'Requests Workspace', 'The Project Owner starts in the CAPEX request register. This is where new project spend is captured and routed through governance.');

  await page.getByRole('button', { name: /\+ New CAPEX Request/i }).click();
  await showChapter(page, 'Create Request', 'The request form captures scope, department, budget holder, estimated value, risk, savings, ROI, payment terms, and supplier quotations.');

  await page.getByPlaceholder('e.g. Station canopy upgrade').fill(title);
  await page.getByRole('textbox', { name: 'Budget Holder' }).fill('Training Budget Holder');
  await page.getByLabel(/Estimated Value/i).fill('87500');
  await page.getByRole('checkbox', { name: /Urgent requirement/i }).check();
  await page.getByPlaceholder('Describe the scope and business need.').fill('Replace critical forecourt electrical systems with improved monitoring and control.');
  await page.getByLabel(/HSSE Risk/i).selectOption('Medium');
  await page.getByLabel(/Worker Welfare Risk/i).selectOption('Low');
  await page.getByLabel(/Savings/i).fill('12000');
  await page.getByLabel(/ROI/i).fill('18 months');
  await page.waitForTimeout(1_000);

  await page.mouse.wheel(0, 700);
  await showChapter(page, 'Supplier Quotations', 'The Project Owner records three quotations, selects the preferred supplier, attaches quotation names, and confirms agreed payment terms.');

  const suppliers = ['Alpha Engineering', 'Beta Industrial', 'Gamma Services'];
  for (let i = 0; i < suppliers.length; i += 1) {
    await page.getByPlaceholder('Supplier').nth(i).fill(suppliers[i]);
    await page.getByPlaceholder('Quote value').nth(i).fill(String(87500 + i * 2500));
    await page.getByPlaceholder('Payment terms').nth(i).fill('90 days');
    await page.getByPlaceholder('Attachment filename').nth(i).fill(`training-quote-${i + 1}.pdf`);
  }

  await page.getByRole('checkbox', { name: /Payment terms agreed/i }).check();
  await page.waitForTimeout(1_000);
  await page.getByRole('button', { name: /Submit CAPEX Request/i }).click();
  await expect(page.getByRole('button', { name: title })).toBeVisible({ timeout: 15_000 });
  await showChapter(page, 'Submitted Request', 'After submission, the request appears in the register with a value band and current approval status.');
}

async function openRequest(page, title) {
  const rowButton = page.getByRole('button', { name: title }).first();
  await expect(rowButton).toBeVisible({ timeout: 15_000 });
  await rowButton.click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await showChapter(page, 'Request Detail', 'The detail panel shows scope, quotations, attachments, approval workflow, execution, closure, risk, document controls, and audit history.');
}

async function reviewDetailSections(page) {
  for (const section of [
    ['Approval Workflow', 'Approval steps show who needs to review the request before procurement and closure can proceed.'],
    ['Project Execution', 'Execution controls allow the Project Owner to track delivery milestones and evidence.'],
    ['Closure Checklist', 'The closure checklist turns project completion into a traceable governance checklist.'],
    ['Document Versioning & Signatures', 'Document controls preserve versions and capture sign-off evidence.'],
  ]) {
    await page.getByRole('heading', { name: section[0] }).scrollIntoViewIfNeeded();
    await showChapter(page, section[0], section[1]);
  }
}

async function addMilestoneAndComplete(page) {
  await page.getByRole('heading', { name: 'Project Execution' }).scrollIntoViewIfNeeded();
  await showChapter(page, 'Add Milestone', 'The Project Owner adds a milestone with planned date, payment percentage, value, and completion evidence.');
  await page.getByPlaceholder('Stage').fill('Execution');
  await page.getByPlaceholder('Milestone').fill('Install and energize equipment');
  await page.locator('input[type="date"]').first().fill('2026-07-15');
  await page.getByPlaceholder('Payment %').fill('50');
  await page.getByPlaceholder('Payment amount').fill('21250');
  await page.getByPlaceholder('Evidence filename').fill('installation-evidence.pdf');
  await page.getByRole('button', { name: 'Add Milestone' }).click();
  await expect(page.getByText('Execution - Install and energize equipment').first()).toBeVisible({ timeout: 15_000 });

  const complete = page.getByRole('button', { name: 'Complete' }).first();
  if (await complete.isVisible().catch(() => false)) {
    await showChapter(page, 'Complete Milestone', 'Once work is done, the milestone is marked complete so delivery progress is visible to governance users.');
    await complete.click();
    await page.waitForTimeout(1_000);
  }
}

async function saveDocumentVersionAndSignature(page) {
  await page.getByRole('heading', { name: 'Document Versioning & Signatures' }).scrollIntoViewIfNeeded();
  await showChapter(page, 'Document Version', 'The Project Owner saves a controlled version of the project document pack with a changelog.');
  await page.getByPlaceholder('Document name').fill('Project owner training scope pack');
  await page.getByPlaceholder('Version').fill('v2');
  await page.getByPlaceholder('Changelog').fill('Added final supplier selection and approval evidence.');
  await page.getByRole('button', { name: 'Save Version' }).click();
  await page.waitForTimeout(1_000);

  await showChapter(page, 'Capture Signature', 'The Project Owner captures signature evidence by recording signer name and signer role.');
  await page.getByPlaceholder('Signer name').fill('Training Project Owner');
  await page.getByPlaceholder('Signer role').fill('Project Owner');
  await page.getByRole('button', { name: 'Capture Signature' }).click();
  await page.waitForTimeout(1_000);
}

async function addRiskAndClosureControls(page) {
  await page.getByRole('heading', { name: 'Procurement Performance, Benefits & Risk' }).scrollIntoViewIfNeeded();
  await showChapter(page, 'Add Risk', 'The Project Owner can record project risks with severity and mitigation so the governance dashboard has current risk information.');
  await page.getByRole('button', { name: '+ Add risk' }).click();
  await page.getByPlaceholder('Risk title').fill('Delivery schedule pressure');
  await page.getByPlaceholder('Mitigation plan').fill('Weekly supplier expediting and site-readiness checks.');
  await page.getByRole('button', { name: 'Add Risk', exact: true }).click();
  await page.waitForTimeout(1_000);

  await page.getByRole('heading', { name: 'AUC, Capitalization & PO Closure' }).scrollIntoViewIfNeeded();
  await showChapter(page, 'PO Closure', 'Closure controls capture open commitment, unutilized commitment, final invoice status, and due date for handover.');
  await page.getByPlaceholder('Open commitment').fill('42500');
  await page.getByPlaceholder('Unutilized commitment').fill('0');
  const dates = page.locator('input[type="date"]');
  await dates.nth(4).fill('2026-08-15');
  await page.getByRole('checkbox', { name: /Final invoice/i }).check();
  await page.getByRole('button', { name: 'Save PO Closure' }).click();
  await page.waitForTimeout(1_000);

  await page.getByRole('heading', { name: 'Closure Checklist' }).scrollIntoViewIfNeeded();
  await showChapter(page, 'Closure Checklist', 'Each closure checklist item can be completed as evidence arrives. This creates traceability for audit and handover.');
  const done = page.getByRole('button', { name: 'Done' }).first();
  if (await done.isVisible().catch(() => false)) {
    await done.click();
    await page.waitForTimeout(1_000);
  }
}

async function finishWithAudit(page) {
  await page.getByRole('heading', { name: 'Audit History' }).scrollIntoViewIfNeeded();
  await showChapter(page, 'Audit Trail', 'The audit history records the submitted request, milestone, document, signature, risk, and closure actions completed by this role.');
  await clearChapter(page);
  await page.waitForTimeout(1_500);
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.beforeAll(() => {
  execFileSync('node', ['scripts/seedCapexVideoUsers.js'], {
    cwd: '../backend',
    stdio: 'inherit',
  });
});

test(`${training.role} - complete workflow`, async ({ page }) => {
  await signInAs(page, persona);
  await showChapter(page, 'Project Owner CAPEX Workflow', 'This complete video follows the Project Owner journey from request creation through execution, documents, risk, closure controls, and audit trail.');

  await clickTab(page, 'Overview');
  await showChapter(page, 'CAPEX Planning Overview', 'The overview gives the role high-level visibility before moving into detailed request work.');

  await clickTab(page, 'Departments');
  await showChapter(page, 'Department View', 'Department views help the user understand budget and actual spend context.');

  const title = `Complete Project Owner Workflow ${Date.now()}`;
  await fillProjectOwnerRequest(page, title);
  await openRequest(page, title);
  await reviewDetailSections(page);
  await addMilestoneAndComplete(page);
  await saveDocumentVersionAndSignature(page);
  await addRiskAndClosureControls(page);
  await finishWithAudit(page);
  await saveRoleVideo(page, completeWorkflow);
});
