import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  assetCategories: [
    { id: 1, name: 'Plant and Machinery', description: 'Placeholder pending client list', sortOrder: 10, isActive: true, updatedBy: 'Migration 035' },
    { id: 2, name: 'Retired Category', description: null, sortOrder: 900, isActive: false, updatedBy: 'Test Admin' },
  ],
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

const mockCapexRequest = {
  id: 'CAPEX-2026-038',
  title: 'Sample Forecourt LED Canopy Upgrade',
  requesterName: 'Maya Al Balushi',
  department: 'Mobility',
  businessFunction: 'Mobility',
  budgetHolder: 'Ahmed Al Harthy',
  financialYear: 2026,
  currentCostBudget: 50000,
  estimatedValue: 42000,
  valueBand: 'MEDIUM',
  urgent: true,
  status: 'Pending final closure',
  currentStepId: 'step-2',
  requesterId: 'user-1',
  scopeDetails: 'Upgrade LED canopy lighting across the forecourt.',
  fewerThan3Justification: '',
  hsseRisk: 'Not assessed',
  workerWelfareRisk: 'Not assessed',
  savings: 10000,
  roi: '18 months',
  paymentTerms: '90 days',
  paymentTermsAgreed: true,
  approvalSteps: [
    { id: 'step-1', label: 'Line Manager Endorsement', status: 'Approved', approverRole: 'Manager' },
    { id: 'step-2', label: 'HSSE Focal Screening', status: 'Pending', approverRole: 'HSSE Focal', pendingDays: 4, startedAt: '2026-03-10T00:00:00Z' },
  ],
  quotations: [
    { id: 'quote-1', supplierName: 'Vendor A', quoteValue: 40000, paymentTerms: '90 days', isSelected: true, attachmentName: 'vendor-a.pdf' },
  ],
  attachments: [
    { id: 'attachment-1', linkedType: 'Request', name: 'strategy.pdf', type: 'Project Strategy / Scope' },
    { id: 'attachment-2', linkedType: 'Supplier Quotation', linkedId: 'quote-1', name: 'vendor-a.pdf', type: 'Supplier Quotation' },
  ],
  milestones: [],
  closureChecklist: [],
  moaRecords: [],
  budgetVariations: [],
  decisionGates: [],
  risks: [],
};

const mockDrilldown = {
  type: 'businessUnit',
  rows: [{ department: 'Aviation', projects: 2, approvedBudget: 500000, commitments: 120000 }],
};

// Routes all fetch calls to the correct mock response
function makeFetchMock(depts = mockDepts, capexRequest = mockCapexRequest, capexRequests = []) {
  return jest.fn().mockImplementation((url, options) => {
    const method = options?.method || 'GET';

    if (url.includes('requests/CAPEX-2026-038')) return Promise.resolve({ ok: true, json: async () => capexRequest });
    if (url.includes('dashboard/governance')) return Promise.resolve({ ok: true, json: async () => mockGovernance });
    if (url.includes('dashboard/drilldown')) return Promise.resolve({ ok: true, json: async () => mockDrilldown });
    if (url.includes('process-reference')) return Promise.resolve({ ok: true, json: async () => mockProcessRef });
    if (url.includes('report-schedules')) return Promise.resolve({ ok: true, json: async () => method === 'POST' ? mockSchedules[0] : mockSchedules });
    if (url.includes('admin-config')) return Promise.resolve({ ok: true, json: async () => method === 'PATCH' ? mockAdminConfig.thresholds : mockAdminConfig });
    if (url.includes('departments'))  return Promise.resolve({ ok: true, json: async () => depts });
    if (url.includes('sync-status'))  return Promise.resolve({ ok: true, json: async () => mockSync });
    if (url.includes('gsap-data'))    return Promise.resolve({ ok: true, json: async () => mockGsapData });
    if (url.includes('requests'))     return Promise.resolve({ ok: true, json: async () => capexRequests });
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
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  window.history.replaceState({}, '', '/capex');
});

const renderDashboard = (initialEntries = ['/capex']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/capex" element={<CapexDashboard />} />
        <Route path="/capex/requests/new" element={<div>Dedicated CAPEX request page</div>} />
        <Route path="/capex/requests/:requestId" element={<CapexDashboard />} />
      </Routes>
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
    expect(screen.getByText('01 Mar 2026')).toBeInTheDocument();
    expect(screen.queryByText('2026-03-01')).not.toBeInTheDocument();
  });

  test('clicking Governance tab shows executive controls', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Governance' }));
    expect(screen.getByText('CAPEX Governance')).toBeInTheDocument();
    expect(screen.getByText('Attention required')).toBeInTheDocument();
    expect(screen.getByText('Budget variance exceeds 10%.')).toBeInTheDocument();
    expect(screen.getByText('Portfolio drill-down')).toBeInTheDocument();
    expect(screen.getByText('Policies and controls')).toBeInTheDocument();
    expect(screen.getByText('Monthly CAPEX Governance Pack')).toBeInTheDocument();
    expect(screen.getByText('01 Apr 2026')).toBeInTheDocument();
  });

  test('displays and filters urgent requests without changing date ordering', async () => {
    const user = userEvent.setup();
    const requests = [
      {
        id: 'CAPEX-2026-040', title: 'Urgent pump replacement', department: 'Aviation',
        estimatedValue: 12000, valueBand: 'LOW', urgent: true, status: 'Submitted',
        submittedAt: '2026-03-20T00:00:00Z', updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'CAPEX-2026-041', title: 'Standard office refresh', department: 'Mobility',
        estimatedValue: 8000, valueBand: 'LOW', urgent: false, status: 'Submitted',
        submittedAt: '2026-03-21T00:00:00Z', updatedAt: '2026-03-21T00:00:00Z',
      },
    ];
    global.fetch = makeFetchMock(mockDepts, mockCapexRequest, requests);
    renderDashboard();
    await waitForLoad();
    await user.click(screen.getByRole('button', { name: 'Requests' }));

    expect(screen.getByText('Urgent pump replacement')).toBeVisible();
    expect(screen.getByText('Standard office refresh')).toBeVisible();
    expect(screen.getByText('Showing 2 of 2')).toBeVisible();
    expect(screen.getAllByText('Urgent')).toHaveLength(1);

    await user.click(screen.getByRole('combobox', { name: 'Filter by urgency' }));
    await user.click(screen.getByRole('option', { name: 'Urgent' }));

    expect(screen.getByText('Urgent pump replacement')).toBeVisible();
    expect(screen.queryByText('Standard office refresh')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 2')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText('Search by request ID, title, or department'), { target: { value: 'office' } });
    expect(screen.getByText('No requests match your filters.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Showing 2 of 2')).toBeVisible();
  }, 15000);

  test('direct request detail route opens the CAPEX request detail page', async () => {
    renderDashboard(['/capex/requests/CAPEX-2026-038']);
    await waitFor(() => expect(screen.getByText('Sample Forecourt LED Canopy Upgrade')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /all requests/i })).toBeInTheDocument();
    const overviewTab = screen.getByRole('tab', { name: /^Overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(overviewTab).toHaveStyle({ borderBottomColor: 'var(--shell-red)' });
    expect(screen.getByText('Project Description')).toBeVisible();
    expect(screen.getByText('Approval Workflow')).not.toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: /^Approvals/i }));

    expect(screen.getByRole('tab', { name: /^Approvals/i })).toHaveAttribute('aria-selected', 'true');
    expect(overviewTab.style.borderBottomColor).toBe('transparent');
    expect(screen.getByText('Approval Workflow')).toBeVisible();
    expect(screen.getByRole('tab', { name: 'MOA & decision gates' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^Audit trail/i }));

    expect(screen.getByRole('tab', { name: /^Audit trail/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Audit Trail' })).toBeVisible();
    expect(screen.queryByText('CAPEX Control Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Portfolio Health')).not.toBeInTheDocument();
  }, 15000);

  test('shows the complete approval summary, evidence, and pending age', async () => {
    renderDashboard(['/capex/requests/CAPEX-2026-038']);
    await waitFor(() => expect(screen.getByText('Approval Summary')).toBeVisible());

    expect(screen.getByText('Maya Al Balushi')).toBeVisible();
    expect(screen.getByText('Ahmed Al Harthy')).toBeVisible();
    expect(screen.getByText('FY 2026')).toBeVisible();
    expect(screen.getByText('Urgency')).toBeVisible();
    expect(screen.getAllByText('Urgent').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Savings · OMR 10k')).toBeVisible();
    expect(screen.getByText('strategy.pdf')).toBeVisible();
    expect(screen.getByText('vendor-a.pdf')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(2);
    expect(screen.getAllByText('4 pending days').some(element => element.offsetParent !== null || !element.closest('[hidden]'))).toBe(true);
  }, 15000);

  test('requires the HSSE Focal to record both risk ratings before approving screening', async () => {
    const user = userEvent.setup();
    renderDashboard(['/capex/requests/CAPEX-2026-038']);
    await waitFor(() => expect(screen.getByText('Sample Forecourt LED Canopy Upgrade')).toBeVisible());

    const approveButton = screen.getByRole('button', { name: 'Approve Step' });
    expect(screen.getByRole('combobox', { name: 'Assess HSSE Risk' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Assess Worker Welfare Risk' })).toBeVisible();
    expect(approveButton).toBeDisabled();

    await user.click(screen.getByRole('combobox', { name: 'Assess HSSE Risk' }));
    await user.click(screen.getByRole('option', { name: 'High' }));
    await user.click(screen.getByRole('combobox', { name: 'Assess Worker Welfare Risk' }));
    await user.click(screen.getByRole('option', { name: 'Medium' }));
    expect(approveButton).toBeEnabled();
    await user.click(approveButton);

    await waitFor(() => {
      const patchCall = global.fetch.mock.calls.find(([url, options]) =>
        url.includes('/api/capex/requests/CAPEX-2026-038/decision') && options?.method === 'PATCH'
      );
      expect(JSON.parse(patchCall[1].body)).toMatchObject({
        decision: 'APPROVED',
        hsseRisk: 'High',
        workerWelfareRisk: 'Medium',
      });
    });
  }, 15000);

  test('allows urgency to change only through the returned-request edit form and refreshes the register', async () => {
    const user = userEvent.setup();
    const returnedRequest = { ...mockCapexRequest, status: 'Returned for correction', urgent: true };
    global.fetch = makeFetchMock(mockDepts, returnedRequest, [{ ...returnedRequest }]);
    renderDashboard(['/capex/requests/CAPEX-2026-038']);
    await waitFor(() => expect(screen.getByText('Sample Forecourt LED Canopy Upgrade')).toBeVisible());
    await user.click(screen.getByRole('tab', { name: /^Approvals/i }));

    const urgencyCheckbox = screen.getByRole('checkbox', { name: 'Urgent requirement' });
    expect(urgencyCheckbox).toBeChecked();
    await user.click(urgencyCheckbox);
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      const patchCall = global.fetch.mock.calls.find(([url, options]) =>
        url.includes('/api/capex/requests/CAPEX-2026-038') && options?.method === 'PATCH'
      );
      expect(JSON.parse(patchCall[1].body)).toMatchObject({ urgent: false });
    });
    const registerFetches = global.fetch.mock.calls.filter(([url, options]) =>
      url.endsWith('/api/capex/requests') && (!options?.method || options.method === 'GET')
    );
    expect(registerFetches.length).toBeGreaterThanOrEqual(2);
  }, 15000);

  test.each([
    ['Pending FIB validation', ['Overview', 'Approvals', 'Documents', 'Audit trail'], ['Procurement', 'Execution & risk', 'Closure', 'AUC / PO Tracking']],
    ['Approved', ['Overview', 'Approvals', 'Procurement', 'Documents', 'Audit trail'], ['Execution & risk', 'Closure', 'AUC / PO Tracking']],
    ['PO created', ['Overview', 'Approvals', 'Procurement', 'AUC / PO Tracking', 'Documents', 'Audit trail'], ['Execution & risk', 'Closure']],
    ['PO uploaded', ['Overview', 'Approvals', 'Procurement', 'Execution & risk', 'AUC / PO Tracking', 'Documents', 'Audit trail'], ['Closure']],
    ['Technically complete', ['Overview', 'Approvals', 'Procurement', 'Execution & risk', 'Closure', 'Documents', 'Audit trail'], ['AUC / PO Tracking']],
  ])('shows only lifecycle groups relevant to %s', async (status, visible, hidden) => {
    global.fetch = makeFetchMock(mockDepts, { ...mockCapexRequest, status });
    renderDashboard(['/capex/requests/CAPEX-2026-038']);
    await waitFor(() => expect(screen.getByText('Sample Forecourt LED Canopy Upgrade')).toBeVisible());

    visible.forEach(label => expect(screen.getByRole('tab', { name: new RegExp(`^${label}`, 'i') })).toBeVisible());
    hidden.forEach(label => expect(screen.queryByRole('tab', { name: new RegExp(`^${label}`, 'i') })).not.toBeInTheDocument());
  }, 15000);

  test('falls back to overview when the URL hash targets a hidden lifecycle section', async () => {
    global.fetch = makeFetchMock(mockDepts, { ...mockCapexRequest, status: 'Pending FIB validation' });
    window.history.replaceState({}, '', '/capex/requests/CAPEX-2026-038#procurement');
    renderDashboard(['/capex/requests/CAPEX-2026-038#procurement']);

    await waitFor(() => expect(screen.getByRole('tab', { name: /^Overview/i })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.queryByRole('tab', { name: /^Procurement/i })).not.toBeInTheDocument();
  });

  test('new CAPEX request opens on a dedicated route', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Requests' }));
    fireEvent.click(screen.getByRole('button', { name: /new capex request/i }));
    expect(screen.getByText('Dedicated CAPEX request page')).toBeInTheDocument();
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

// ── Admin Config: asset categories ────────────────────────────────────────────
describe('Admin Config asset categories', () => {
  test('lists configured categories, including retired ones', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Admin Config' }));

    expect(screen.getByRole('heading', { name: 'Asset Categories' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Name for Plant and Machinery')).toHaveValue('Plant and Machinery');
    });
    // Retired entries stay on the admin screen so they can be reactivated.
    expect(screen.getByLabelText('Name for Retired Category')).toHaveValue('Retired Category');
    expect(screen.getByLabelText('Active for Retired Category')).not.toBeChecked();
    expect(screen.getByLabelText('Active for Plant and Machinery')).toBeChecked();
  });

  test('retiring a category PATCHes it with isActive false', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Admin Config' }));
    await waitFor(() => expect(screen.getByLabelText('Active for Plant and Machinery')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Active for Plant and Machinery'));
    // Scope the Save click to this category's own row — the workflow matrix
    // above renders Save buttons too.
    const row = screen.getByLabelText('Name for Plant and Machinery').closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const patch = global.fetch.mock.calls.find(([url, options]) => (
        url.includes('/admin-config/asset-categories/1') && options?.method === 'PATCH'
      ));
      expect(patch).toBeTruthy();
      expect(JSON.parse(patch[1].body)).toMatchObject({ name: 'Plant and Machinery', isActive: false });
    });
  });

  test('adds a new category through the inline form', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Admin Config' }));
    await waitFor(() => expect(screen.getByLabelText('New asset category name')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('New asset category name'), { target: { value: 'Marine Equipment' } });
    fireEvent.change(screen.getByLabelText('New asset category sort order'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add Category' }));

    await waitFor(() => {
      const post = global.fetch.mock.calls.find(([url, options]) => (
        url.includes('/admin-config/asset-categories') && options?.method === 'POST'
      ));
      expect(post).toBeTruthy();
      expect(JSON.parse(post[1].body)).toMatchObject({ name: 'Marine Equipment', sortOrder: 60 });
    });
  });

  test('refuses to add a category with no name', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Admin Config' }));
    await waitFor(() => expect(screen.getByLabelText('New asset category name')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '+ Add Category' }));

    const post = global.fetch.mock.calls.find(([url, options]) => (
      url.includes('/admin-config/asset-categories') && options?.method === 'POST'
    ));
    expect(post).toBeFalsy();
  });
});
