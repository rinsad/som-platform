const { test, expect } = require('@playwright/test');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
const { USERS, PASSWORD } = require('../../backend/scripts/seedCapexVideoUsers');
const { getRoleTraining } = require('./capexRoleTrainingManifest.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'som-super-secret-key-2026';
const selectedRole = process.env.CAPEX_TRAINING_ROLE || 'Project Owner';
const training = getRoleTraining(selectedRole);
const personaByRole = new Map(USERS.map((user) => [user.role, user]));
if (!training) {
  throw new Error(`No CAPEX role training manifest found for ${selectedRole}`);
}

const persona = personaByRole.get(training.role);

if (!persona) {
  throw new Error(`No CAPEX video user found for ${training.role}`);
}

function tokenFor(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

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
  await page.waitForTimeout(400);
}

async function createReferenceRequest(request, titleSuffix) {
  const title = `Training ${training.role} ${titleSuffix} ${Date.now()}`;
  const res = await request.post('/api/capex/requests', {
    headers: { Authorization: `Bearer ${tokenFor(persona)}` },
    data: {
      title,
      department: 'Aviation',
      businessFunction: 'Aviation',
      budgetHolder: 'Training Budget Holder',
      estimatedValue: 42500,
      scopeDetails: `Training scenario for ${training.role}: ${titleSuffix}.`,
      hsseRisk: 'Medium',
      workerWelfareRisk: 'Low',
      quotations: [
        { supplierName: 'Training Supplier A', quoteValue: 42500, isSelected: true, attachmentName: 'quote-a.pdf' },
        { supplierName: 'Training Supplier B', quoteValue: 44800, isSelected: false, attachmentName: 'quote-b.pdf' },
        { supplierName: 'Training Supplier C', quoteValue: 46100, isSelected: false, attachmentName: 'quote-c.pdf' },
      ],
    },
  });

  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { id: body.id, title };
}

async function openRequest(page, title) {
  await page.reload();
  await expect(page.getByRole('heading', { name: /Capex Planning/i })).toBeVisible();
  await clickTab(page, 'Requests');
  const rowButton = page.getByRole('button', { name: title }).first();
  await expect(rowButton).toBeVisible({ timeout: 15_000 });
  await rowButton.click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

async function fillProjectOwnerRequest(page, title) {
  await clickTab(page, 'Requests');
  await page.getByRole('button', { name: /\+ New CAPEX Request/i }).click();
  await page.getByPlaceholder('e.g. Station canopy upgrade').fill(title);
  await page.getByRole('textbox', { name: 'Budget Holder' }).fill('Training Budget Holder');
  await page.getByLabel(/Estimated Value/i).fill('87500');
  await page.getByRole('checkbox', { name: /Urgent requirement/i }).check();
  await page.getByPlaceholder('Describe the scope and business need.').fill('Replace critical forecourt electrical systems with improved monitoring and control.');
  await page.getByLabel(/HSSE Risk/i).selectOption('Medium');
  await page.getByLabel(/Worker Welfare Risk/i).selectOption('Low');
  await page.getByLabel(/Savings/i).fill('12000');
  await page.getByLabel(/ROI/i).fill('18 months');

  const suppliers = ['Alpha Engineering', 'Beta Industrial', 'Gamma Services'];
  for (let i = 0; i < suppliers.length; i += 1) {
    await page.getByPlaceholder('Supplier').nth(i).fill(suppliers[i]);
    await page.getByPlaceholder('Quote value').nth(i).fill(String(87500 + i * 2500));
    await page.getByPlaceholder('Payment terms').nth(i).fill('90 days');
    await page.getByPlaceholder('Attachment filename').nth(i).fill(`training-quote-${i + 1}.pdf`);
  }

  await page.getByRole('checkbox', { name: /Payment terms agreed/i }).check();
  await page.getByRole('button', { name: /Submit CAPEX Request/i }).click();
  await expect(page.getByRole('button', { name: title })).toBeVisible({ timeout: 15_000 });
}

async function addMilestoneAndComplete(page) {
  await page.getByPlaceholder('Stage').fill('Execution');
  await page.getByPlaceholder('Milestone').fill('Install and energize equipment');
  await page.locator('input[type="date"]').first().fill('2026-07-15');
  await page.getByPlaceholder('Payment %').fill('50');
  await page.getByPlaceholder('Payment amount').fill('21250');
  await page.getByPlaceholder('Evidence filename').fill('installation-evidence.pdf');
  await page.getByRole('button', { name: 'Add Milestone' }).click();
  await expect(page.getByText('Install and energize equipment')).toBeVisible({ timeout: 15_000 });

  const complete = page.getByRole('button', { name: 'Complete' }).first();
  if (await complete.isVisible().catch(() => false)) {
    await complete.click();
    await page.waitForTimeout(800);
  }
}

async function saveDocumentVersionAndSignature(page) {
  await page.getByPlaceholder('Document name').fill('Project owner training scope pack');
  await page.getByPlaceholder('Version').fill('v2');
  await page.getByPlaceholder('Changelog').fill('Added final supplier selection and approval evidence.');
  await page.getByRole('button', { name: 'Save Version' }).click();
  await page.waitForTimeout(800);

  await page.getByPlaceholder('Signer name').fill('Training Project Owner');
  await page.getByPlaceholder('Signer role').fill('Project Owner');
  await page.getByRole('button', { name: 'Capture Signature' }).click();
  await page.waitForTimeout(800);
}

async function addRiskAndClosureControls(page) {
  await page.getByRole('button', { name: '+ Add risk' }).click();
  await page.getByPlaceholder('Risk title').fill('Delivery schedule pressure');
  await page.getByPlaceholder('Mitigation plan').fill('Weekly supplier expediting and site-readiness checks.');
  await page.getByRole('button', { name: 'Add Risk', exact: true }).click();
  await page.waitForTimeout(800);

  await page.getByPlaceholder('Open commitment').fill('42500');
  await page.getByPlaceholder('Unutilized commitment').fill('0');
  const dates = page.locator('input[type="date"]');
  await dates.nth(4).fill('2026-08-15');
  await page.getByRole('checkbox', { name: /Final invoice/i }).check();
  await page.getByRole('button', { name: 'Save PO Closure' }).click();
  await page.waitForTimeout(800);

  const done = page.getByRole('button', { name: 'Done' }).first();
  if (await done.isVisible().catch(() => false)) {
    await done.click();
    await page.waitForTimeout(800);
  }
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  execFileSync('node', ['scripts/seedCapexVideoUsers.js'], {
    cwd: '../backend',
    stdio: 'inherit',
  });
});

for (const useCase of training.useCases) {
  test(`${training.role} - ${useCase.title}`, async ({ page, request }) => {
    await signInAs(page, persona);

    if (useCase.id === '01-create-capex-request') {
      await fillProjectOwnerRequest(page, `Training Project Owner Create ${Date.now()}`);
    }

    if (useCase.id === '02-manage-project-execution') {
      const capex = await createReferenceRequest(request, 'milestone management');
      await openRequest(page, capex.title);
      await addMilestoneAndComplete(page);
    }

    if (useCase.id === '03-document-version-and-signature') {
      const capex = await createReferenceRequest(request, 'document controls');
      await openRequest(page, capex.title);
      await saveDocumentVersionAndSignature(page);
    }

    if (useCase.id === '04-risk-and-closure-controls') {
      const capex = await createReferenceRequest(request, 'risk and closure');
      await openRequest(page, capex.title);
      await addRiskAndClosureControls(page);
    }

    await page.waitForTimeout(1_200);
    await saveRoleVideo(page, useCase);
  });
}
