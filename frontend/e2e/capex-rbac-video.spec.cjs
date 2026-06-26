const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
const { execFileSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
const { USERS, PASSWORD } = require('../../backend/scripts/seedCapexVideoUsers');

const JWT_SECRET = process.env.JWT_SECRET || 'som-super-secret-key-2026';
const sharedRequestTitle = `Video RBAC CAPEX ${Date.now()}`;
let sharedRequestId = null;

const personaOrder = [
  'Admin',
  'Project Owner',
  'Project Engineer',
  'Finance in Business',
  'Finance Manager',
  'CFO',
  'CP Manager',
  'CP Lead',
  'Business GM',
  'HSSE Focal',
  'Asset Team',
  'Internal Audit',
  'CEO/Board',
];

const personaByRole = new Map(USERS.map((user) => [user.role, user]));

function tokenFor(persona) {
  return jwt.sign(
    {
      id: persona.id,
      email: persona.email,
      role: persona.role,
      department: persona.department,
      fullName: persona.fullName,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

async function signInAs(page, persona) {
  const res = await page.request.post('/api/auth/login', {
    data: { email: persona.email, password: PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();

  await page.goto('/login');
  await page.evaluate(({ token, user, permissions }) => {
    localStorage.setItem('som_token', token);
    localStorage.setItem('som_user', JSON.stringify(user));
    localStorage.setItem('som_permissions', JSON.stringify(permissions));
  }, data);

  await expect.poll(async () => page.evaluate(() => !!localStorage.getItem('som_token'))).toBe(true);
  await page.goto('/capex');
  if (page.url().includes('/login')) {
    const stored = await page.evaluate(() => ({
      hasToken: !!localStorage.getItem('som_token'),
      user: localStorage.getItem('som_user'),
      permissions: localStorage.getItem('som_permissions'),
    }));
    throw new Error(`Redirected to login after auth storage was set: ${JSON.stringify(stored).slice(0, 500)}`);
  }
  await expect(page.getByRole('heading', { name: /Capex Planning/i })).toBeVisible();
}

async function clickTabIfVisible(page, label) {
  const tab = page.getByRole('button', { name: label });
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function openSharedRequest(page) {
  await clickTabIfVisible(page, 'Requests');
  const rowButton = page.getByRole('button', { name: sharedRequestTitle }).first();
  if (await rowButton.isVisible().catch(() => false)) {
    await rowButton.click();
    await page.waitForTimeout(500);
  }
}

async function expectAnyVisible(locators) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return;
    }
  }
  throw new Error('Expected at least one permitted CAPEX action to be visible.');
}

async function createCapexRequest(page) {
  await clickTabIfVisible(page, 'Requests');
  await page.getByRole('button', { name: /\+ New CAPEX Request/i }).click();
  await page.getByPlaceholder('e.g. Station canopy upgrade').fill(sharedRequestTitle);
  await page.getByRole('textbox', { name: 'Budget Holder' }).fill('Video Budget Holder');
  await page.getByLabel(/Estimated Value/i).fill('18500');
  await page.getByPlaceholder('Describe the scope and business need.').fill('Video walkthrough request for CAPEX RBAC validation.');
  await page.getByPlaceholder('Supplier').nth(0).fill('Video Supplier A');
  await page.getByPlaceholder('Quote value').nth(0).fill('18500');
  await page.getByPlaceholder('Payment terms').nth(0).fill('90 days');
  await page.getByPlaceholder('Attachment filename').nth(0).fill('video-quote-a.pdf');
  await page.getByLabel(/Justification for fewer than 3 quotations/i).fill('Video walkthrough validates the fewer-than-three quotation exception route.');
  await page.getByRole('button', { name: /Submit CAPEX Request/i }).click();
  await expect(page.getByText(sharedRequestTitle).first()).toBeVisible({ timeout: 15_000 });
}

async function seedReferenceRequest(request) {
  const admin = personaByRole.get('Admin');
  const res = await request.post('/api/capex/requests', {
    headers: { Authorization: `Bearer ${tokenFor(admin)}` },
    data: {
      title: sharedRequestTitle,
      department: 'Aviation',
      businessFunction: 'Aviation',
      budgetHolder: 'Video Budget Holder',
      estimatedValue: 18500,
      scopeDetails: 'Video walkthrough request for CAPEX RBAC validation.',
      hsseRisk: 'Low',
      workerWelfareRisk: 'Low',
      fewerThan3Justification: 'Video walkthrough validates the fewer-than-three quotation exception route.',
      quotations: [
        { supplierName: 'Video Supplier A', quoteValue: 18500, isSelected: true, attachmentName: 'video-quote-a.pdf' },
      ],
    },
  });

  if (res.ok()) {
    const body = await res.json();
    sharedRequestId = body.id;
  }
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  execFileSync('node', ['scripts/seedCapexVideoUsers.js'], {
    cwd: '../backend',
    stdio: 'inherit',
  });
  await seedReferenceRequest(request);
});

for (const role of personaOrder) {
  const persona = personaByRole.get(role);

  test(`${role} CAPEX use-case video walkthrough`, async ({ page }) => {
    await signInAs(page, persona);

    await test.step('View available CAPEX tabs for the role', async () => {
      await expect(page.getByText(persona.role).first()).toBeVisible();
      for (const tab of ['Overview', 'Departments', 'Manual Entries', 'Requests', 'Governance', 'Admin Config', 'Initiations']) {
        const visible = await page.getByRole('button', { name: tab }).isVisible().catch(() => false);
        if (visible) {
          await clickTabIfVisible(page, tab);
        }
      }
    });

    await test.step('Exercise primary permitted use cases', async () => {
      if (role === 'Project Owner') {
        await createCapexRequest(page);
        return;
      }

      if (['Project Engineer', 'CP Manager', 'CP Lead', 'Finance Manager', 'CFO', 'Finance in Business', 'Business GM', 'HSSE Focal', 'Asset Team', 'Internal Audit'].includes(role)) {
        await openSharedRequest(page);
      }

      if (['CP Manager', 'CP Lead'].includes(role)) {
        const saveProcurement = page.getByRole('button', { name: 'Save Procurement', exact: true });
        await expect(saveProcurement).toBeVisible();
      }

      if (['Finance Manager', 'CFO', 'Asset Team'].includes(role)) {
        await expect(page.getByRole('button', { name: /Save AUC/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Save Capitalization/i })).toBeVisible();
      }

      if (['Finance in Business', 'Business GM'].includes(role)) {
        const variationButton = page.getByRole('button', { name: /Create Variation/i });
        const approvalButton = page.getByRole('button', { name: /Approve Step/i });
        await expectAnyVisible([variationButton, approvalButton]);
      }

      if (role === 'Internal Audit') {
        await expect(page.getByRole('button', { name: /\+ New CAPEX Request/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Save Procurement', exact: true })).toHaveCount(0);
      }

      if (role === 'CEO/Board') {
        await clickTabIfVisible(page, 'Governance');
        await expect(page.getByText(/Executive Control Summary/i)).toBeVisible();
      }

      if (role === 'Admin') {
        await clickTabIfVisible(page, 'Admin Config');
        await expect(page.getByRole('button', { name: /Save Thresholds/i })).toBeVisible();
      }
    });

    await page.waitForTimeout(1_000);
  });
}

test.afterAll(async () => {
  console.log(`CAPEX video request id: ${sharedRequestId || 'not-created'}`);
});
