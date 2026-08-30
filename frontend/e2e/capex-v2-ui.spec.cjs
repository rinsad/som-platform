const { test, expect } = require('@playwright/test');

const organization = { id: '11111111-1111-4111-8111-111111111111', code: 'PILOT', name: 'Verified Pilot BU' };
const requests = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    requestNumber: 'CAPEXV2-2026-000001',
    title: 'Urgent canopy replacement',
    ownerName: 'Pilot Owner',
    organizationName: organization.name,
    estimatedValue: '19250.075',
    status: 'IN_REVIEW',
    urgent: true,
    updatedAt: '2026-07-20T08:00:00.000Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    requestNumber: 'CAPEXV2-2026-000002',
    title: 'Standard pump renewal',
    ownerName: 'Pilot Owner',
    organizationName: organization.name,
    estimatedValue: '9500.125',
    status: 'DRAFT',
    urgent: false,
    updatedAt: '2026-07-19T08:00:00.000Z',
  },
];

async function installPilotState(page) {
  await page.addInitScript(() => {
    if (!['http:', 'https:'].includes(window.location.protocol)) return;
    localStorage.setItem('som_token', 'playwright-capex-v2-token');
    localStorage.setItem('som_user', JSON.stringify({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Pilot Administrator', role: 'Admin' }));
    localStorage.setItem('som_permissions', JSON.stringify([]));
  });
  await page.route('**/api/auth/me', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Pilot Administrator', role: 'Admin' },
      permissions: [],
    }),
  }));
  await page.route('**/api/capex/v2/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/capex/v2', '');
    let body;
    if (path === '/me/context') {
      body = {
        user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Pilot Administrator', role: 'Admin' },
        isAdmin: true,
        displayRole: 'Admin',
        scopes: [{ type: 'PORTFOLIO', roleName: 'Admin', capabilities: ['*'] }],
        capabilities: ['*', 'request:create'],
        authorityMode: 'PILOT_ONLY',
        workspaces: [{ key: 'operational', label: 'My CAPEX work', path: '/capex-v2' }],
      };
    } else if (path === '/master-data') {
      body = { organizations: [organization], costCentres: [], categories: [], users: [] };
    } else if (path === '/budget-cycles') {
      body = [{ id: '55555555-5555-4555-8555-555555555555', fiscalYear: 2026, status: 'OPEN' }];
    } else if (path === '/allocations') {
      body = [{ id: '66666666-6666-4666-8666-666666666666', organizationUnitId: organization.id, description: 'Canopy renewal', available: '75000.125' }];
    } else if (path === '/requests') {
      const urgency = url.searchParams.get('urgency');
      const items = urgency === 'URGENT' ? requests.filter((item) => item.urgent)
        : urgency === 'STANDARD' ? requests.filter((item) => !item.urgent)
          : requests;
      body = { items, total: items.length, page: 1, pageSize: 25 };
    } else {
      body = {};
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('som_token', 'playwright-capex-v2-token');
    localStorage.setItem('som_user', JSON.stringify({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Pilot Administrator', role: 'Admin' }));
    localStorage.setItem('som_permissions', JSON.stringify([]));
  });
}

test.beforeEach(async ({ page }) => installPilotState(page));

test('register exposes composable urgency filtering and clear behavior', async ({ page }) => {
  await page.goto('/capex-v2/requests');
  await expect(page.getByRole('heading', { name: 'CAPEX request register' })).toBeVisible();
  await expect(page.getByText('2 requests in your authorized scope')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Urgent canopy replacement' })).toBeVisible();
  await expect(page.getByRole('table').getByText('Urgent', { exact: true })).toBeVisible();

  await page.getByLabel('Filter by urgency').click();
  await page.getByRole('option', { name: 'Standard', exact: true }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('1 request in your authorized scope')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Standard pump renewal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Urgent canopy replacement' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('2 requests in your authorized scope')).toBeVisible();
  await expect(page.getByLabel('Filter by urgency')).toContainText('All urgency');
});

test('requester form owns project evidence and never asks the requester for HSSE ratings', async ({ page }) => {
  await page.goto('/capex-v2/requests/new');
  await expect(page.getByRole('heading', { name: 'Project & budget' })).toBeVisible();
  await expect(page.getByLabel('Project description *')).toBeVisible();
  await expect(page.getByLabel('Upload project documents and presentations')).toHaveAttribute('multiple', '');
  await expect(page.getByLabel('Budget allocation *')).toBeVisible();
  await expect(page.getByText(/Loaded from the controlled SAC import/)).toBeVisible();
  await expect(page.getByLabel('Cost centre')).toHaveCount(0);
  await expect(page.getByLabel('CAPEX category')).toHaveCount(0);
  await expect(page.getByLabel(/Line manager/i)).toHaveCount(0);
  await expect(page.getByText('Marks this request as time-sensitive for visibility. Normal approval requirements still apply.')).toBeVisible();
  await expect(page.getByLabel(/HSSE risk/i)).toHaveCount(0);
  await expect(page.getByLabel(/Worker Welfare risk/i)).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'New CAPEX request' })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
