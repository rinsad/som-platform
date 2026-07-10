import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CapexDashboard from './CapexDashboard';

vi.mock('chart.js', () => ({
  Chart: class MockChart {
    constructor() {}
    destroy() {}
    static register() {}
  },
  BarController: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Tooltip: {},
  Legend: {},
}));

// ── Shared mock data ──────────────────────────────────────────────────────────
const MONTHLY = [
  { month: 'Oct', budgeted: 100000, actual:  89000 },
  { month: 'Nov', budgeted: 110000, actual: 105000 },
  { month: 'Dec', budgeted: 120000, actual: 132000 },
  { month: 'Jan', budgeted: 115000, actual: 118000 },
  { month: 'Feb', budgeted: 105000, actual:  98000 },
  { month: 'Mar', budgeted: 130000, actual: 138000 },
];

const mockDepts = [
  { name: 'HR & Real Estate', totalBudget: 800000, actual: 350000, committed: 120000, remaining: 330000, percentUsed: 44, monthlyData: MONTHLY },
  { name: 'Finance & Operations', totalBudget: 600000, actual: 210000, committed: 80000, remaining: 310000, percentUsed: 35, monthlyData: MONTHLY },
  { name: 'Trading, Lubricants & Supply Chain', totalBudget: 2000000, actual: 890000, committed: 250000, remaining: 860000, percentUsed: 45, monthlyData: MONTHLY },
  { name: 'Aviation', totalBudget: 1500000, actual: 720000, committed: 180000, remaining: 600000, percentUsed: 48, monthlyData: MONTHLY },
  { name: 'Mobility', totalBudget: 1200000, actual: 480000, committed: 150000, remaining: 570000, percentUsed: 40, monthlyData: MONTHLY },
  { name: 'General', totalBudget: 500000, actual: 140000, committed: 60000, remaining: 300000, percentUsed: 28, monthlyData: MONTHLY },
];

const mockSync = { lastSynced: new Date().toISOString(), status: 'success', source: 'GSAP' };

const mockGsapData = {
  lastSynced: new Date().toISOString(),
  status: 'success',
  source: 'GSAP',
  approvedBudgets: [
    { wbsCode: 'WBS-OM-2026-RET-001', description: 'Retail Ops Programme', department: 'Retail Operations', approvedAmount: 1200000, postedAmount: 680000 },
  ],
  poCommitments: [
    { poNumber: 'PO-4500012344', vendor: 'Oman Construction Co.', wbsCode: 'WBS-OM-2026-INF-001', description: 'Pipeline inspection', amount: 95000, status: 'Open', dueDate: '2026-04-30' },
  ],
  grirActuals: [
    { grNumber: 'GR-5000043211', poNumber: 'PO-4500012187', wbsCode: 'WBS-OM-2026-RET-001', description: 'Canopy works', amount: 85000, postingDate: '2026-03-05' },
  ],
};

const mockInitiations = [
  { id: 'CINIT-2026-001', title: 'Solar Panel Installation', department: 'Infrastructure', projectType: 'New', estimatedBudget: 320000, priority: 'High', status: 'Under Review', createdAt: '2026-03-01' },
];

const mockManualEntries = [
  { id: 'ME-2026-001', entryType: 'Actual', department: 'Retail Operations', period: '2026-03', amount: 15400, referenceNumber: 'INV-4421', enteredBy: 'Sara Al Harthi', status: 'Posted' },
];

const mockAdminConfig = {
  thresholds: { lowMaxOmr: 25000, mediumMaxOmr: 300000 },
  workflowRules: [
    { id: 1, valueBand: 'LOW', conditionKey: 'standard', stepOrder: 10, approverRole: 'FiB', label: 'FiB Validation', isActive: true },
  ],
  departments: mockDepts,
};

const mockGovernance = {
  portfolio: { approvedBudget: 1800000, forecastSpend: 1500000, totalProjects: 4, budgetUtilizationPercent: 72 },
  auc: { totalValue: 320000, agedOver180Days: 1 },
  risk: { redRisks: 2 },
  generatedAlerts: [{ requestId: 'CAPEX-1', alertType: 'Budget Variance', severity: 'Red', message: 'Budget variance exceeds 10%.' }],
  capitalization: { pending: 3 },
  poClosure: { openCommitmentValue: 125000 },
  closure: { readinessPercent: 64 },
  moaCompliance: { matrixViolations: 1 },
  documentControls: { documentVersions: 5, electronicSignatures: 3 },
  variationControl: { totalVariations: 2 },
  decisionGates: { passedGates: 4, totalGates: 8 },
};

const mockProcessRef = {
  businessUnits: [{ id: 1, name: 'Aviation' }, { id: 2, name: 'Mobility B2C' }],
  projectTypes: [{ id: 1, typeName: 'Asset Integrity', example: 'Tank replacement' }],
  escalationPolicies: [{ id: 1, triggerLabel: 'Budget variance greater than 10%', thresholdValue: 10, thresholdUnit: 'percent', escalationTarget: 'Project Owner' }],
  decisionGates: Array.from({ length: 8 }, (_, i) => ({ gateKey: `gate_${i + 1}`, gateName: `Gate ${i + 1}` })),
  approvalRoutes: [{ valueBand: 'LOW', range: '<= OMR 25,000', route: 'Project Lead + GM' }],
};

const mockSchedules = [
  { id: 1, reportName: 'Monthly CAPEX Governance Pack', reportType: 'governance', frequency: 'Monthly', format: 'PDF', nextRunDate: '2026-04-01' },
];

const mockDrilldown = {
  type: 'businessUnit',
  rows: [{ department: 'Aviation', projects: 2, approvedBudget: 500000, commitments: 120000 }],
};

// Routes all fetch calls to the correct mock response
function makeFetchMock(depts = mockDepts) {
  return jest.fn().mockImplementation((url, options) => {
    const method = options?.method || 'GET';

    if (url.includes('dashboard/governance')) return Promise.resolve({ ok: true, json: async () => mockGovernance });
    if (url.includes('dashboard/drilldown')) return Promise.resolve({ ok: true, json: async () => mockDrilldown });
    if (url.includes('process-reference')) return Promise.resolve({ ok: true, json: async () => mockProcessRef });
    if (url.includes('report-schedules')) return Promise.resolve({ ok: true, json: async () => method === 'POST' ? mockSchedules[0] : mockSchedules });
    if (url.includes('admin-config')) return Promise.resolve({ ok: true, json: async () => method === 'PATCH' ? mockAdminConfig.thresholds : mockAdminConfig });
    if (url.includes('departments'))  return Promise.resolve({ ok: true, json: async () => depts });
    if (url.includes('sync-status'))  return Promise.resolve({ ok: true, json: async () => mockSync });
    if (url.includes('gsap-data'))    return Promise.resolve({ ok: true, json: async () => mockGsapData });
    if (url.includes('requests'))     return Promise.resolve({ ok: true, json: async () => [] });
    if (url.includes('initiations'))  return Promise.resolve({ ok: true, json: async () => method === 'POST' ? mockInitiations[0] : mockInitiations });
    if (url.includes('manual-entries')) return Promise.resolve({ ok: true, json: async () => method === 'POST' ? mockManualEntries[0] : mockManualEntries });
    // department/:name
    const dept = depts.find((d) => url.includes(encodeURIComponent(d.name)));
    return Promise.resolve({ ok: true, json: async () => dept || depts[0] });
  });
}

beforeEach(() => {
  localStorage.setItem('som_token', 'fake-token');
  localStorage.setItem('som_user', JSON.stringify({ role: 'Admin', fullName: 'Test Admin' }));
  global.fetch = makeFetchMock();
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <CapexDashboard />
    </MemoryRouter>
  );

// helper: wait for data to finish loading
const waitForLoad = () =>
  waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());

// ── Loading & Error ───────────────────────────────────────────────────────────
describe('Loading and error states', () => {
  test('shows loading spinner before data arrives', () => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('shows error message and retry button when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    renderDashboard();
    await waitFor(() =>
      expect(screen.getAllByText(/failed|error/i).length).toBeGreaterThan(0)
    );
    expect(screen.getByText(/retry/i)).toBeInTheDocument();
  });

  test('refetches data when retry button is clicked', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fail'));
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/retry/i)).toBeInTheDocument());

    global.fetch = makeFetchMock();
    fireEvent.click(screen.getByText(/retry/i));

    await waitFor(() => expect(screen.getByText('HR & Real Estate')).toBeInTheDocument());
  });
});

// ── Overview tab ─────────────────────────────────────────────────────────────
describe('Overview tab', () => {
  test('renders department meter labels', async () => {
    renderDashboard();
    await waitForLoad();
    expect(screen.getByText('HR & Real Estate')).toBeInTheDocument();
    expect(screen.getByText('Aviation')).toBeInTheDocument();
    expect(screen.getByText('Mobility')).toBeInTheDocument();
  });

  test('renders 4 summary cards', async () => {
    renderDashboard();
    await waitForLoad();
    expect(screen.getByText(/Total Authorised Budget/i)).toBeInTheDocument();
    expect(screen.getByText(/Actual Spend YTD/i)).toBeInTheDocument();
    expect(screen.getByText(/PO Commitments/i)).toBeInTheDocument();
    expect(screen.getByText(/Remaining Balance/i)).toBeInTheDocument();
  });

  test('applies red colour to meter bar when percentUsed ≥ 90', async () => {
    const highDept = { name: 'Test Dept', totalBudget: 100, actual: 95, committed: 0, remaining: 5, percentUsed: 95, monthlyData: MONTHLY };
    global.fetch = makeFetchMock([highDept]);
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText('Test Dept').length).toBeGreaterThan(0));
    const bar = screen.getAllByTestId('meter-bar-Test Dept')[0];
    expect(bar.style.backgroundColor).toBe('var(--shell-red)');
  });

  test('applies green colour to meter bar when percentUsed < 70', async () => {
    renderDashboard();
    await waitForLoad();
    // QHSE is 13% — should be green
    const bar = screen.getAllByTestId('meter-bar-General')[0];
    expect(bar.style.backgroundColor).toBe('var(--success)');
  });

  test('displays GSAP sync badge in header', async () => {
    renderDashboard();
    await waitForLoad();
    expect(screen.getByText(/GSAP Synced/i)).toBeInTheDocument();
  });
});

// ── Tab navigation ────────────────────────────────────────────────────────────
describe('Tab navigation', () => {
  test('shows CAPEX tab buttons', async () => {
    renderDashboard();
    await waitForLoad();
    ['Overview', 'Departments', 'GSAP Sync', 'Manual Entries', 'Requests', 'Governance', 'Admin Config', 'Initiations'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  test('clicking Departments tab shows department selector', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Departments' }));
    expect(screen.getByText('Department Dashboard')).toBeInTheDocument();
  });

  test('GSAP Sync tab is disabled while SAP integration is unavailable', async () => {
    renderDashboard();
    await waitForLoad();
    expect(screen.getByRole('button', { name: 'GSAP Sync' })).toHaveStyle({ cursor: 'not-allowed' });
  });

  test('clicking Manual Entries tab shows Add Entry button', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Manual Entries' }));
    expect(screen.getByText(/\+ Add Entry/i)).toBeInTheDocument();
  });

  test('clicking Initiations tab shows New Initiation button', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Initiations' }));
    expect(screen.getByText(/\+ New Initiation/i)).toBeInTheDocument();
  });

  test('clicking Governance tab shows executive controls', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Governance' }));
    expect(screen.getByText('CAPEX Governance')).toBeInTheDocument();
    expect(screen.getByText('Executive Control Summary')).toBeInTheDocument();
    expect(screen.getByText('Process Reference')).toBeInTheDocument();
    expect(screen.getByText('Monthly CAPEX Governance Pack')).toBeInTheDocument();
  });
});

// ── GSAP Sync tab ─────────────────────────────────────────────────────────────
describe.skip('GSAP Sync tab', () => {
  test('displays approved budget WBS code', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'GSAP Sync' }));
    await waitFor(() =>
      expect(screen.getAllByText('WBS-OM-2026-RET-001').length).toBeGreaterThan(0)
    );
  });

  test('displays PO commitment number', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'GSAP Sync' }));
    await waitFor(() =>
      expect(screen.getByText('PO-4500012344')).toBeInTheDocument()
    );
  });

  test('displays GR/IR actual entry', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'GSAP Sync' }));
    await waitFor(() =>
      expect(screen.getByText('GR-5000043211')).toBeInTheDocument()
    );
  });
});

// ── Manual Entries tab ────────────────────────────────────────────────────────
describe('Manual Entries tab', () => {
  test('shows existing manual entry reference number', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Manual Entries' }));
    await waitFor(() => expect(screen.getByText('INV-4421')).toBeInTheDocument());
  });

  test('opens manual entry modal when Add Entry is clicked', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Manual Entries' }));
    fireEvent.click(screen.getByText(/\+ Add Entry/i));
    expect(screen.getByText('Add Manual Entry')).toBeInTheDocument();
  });

  test('closes modal when Cancel is clicked inside it', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Manual Entries' }));
    fireEvent.click(screen.getByText(/\+ Add Entry/i));
    expect(screen.getByText('Add Manual Entry')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('Add Manual Entry')).not.toBeInTheDocument();
  });
});

// ── Initiations tab ───────────────────────────────────────────────────────────
describe('Initiations tab', () => {
  test('shows existing initiation title', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Initiations' }));
    await waitFor(() => expect(screen.getByText('Solar Panel Installation')).toBeInTheDocument());
  });

  test('shows the initiation form when New Initiation is clicked', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Initiations' }));
    fireEvent.click(screen.getByText(/\+ New Initiation/i));
    expect(screen.getByText('New Capex Initiation')).toBeInTheDocument();
  });

  test('hides initiation form when Discard is clicked', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Initiations' }));
    fireEvent.click(screen.getByText(/\+ New Initiation/i));
    expect(screen.getByText('New Capex Initiation')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));
    expect(screen.queryByText('New Capex Initiation')).not.toBeInTheDocument();
  });
});
