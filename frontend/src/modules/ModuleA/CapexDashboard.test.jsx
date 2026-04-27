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
  { name: 'Retail Operations', totalBudget: 1200000, actual: 680000, committed: 180000, remaining: 340000, percentUsed: 57, monthlyData: MONTHLY },
  { name: 'Infrastructure',    totalBudget: 1500000, actual: 920000, committed:  95000, remaining: 485000, percentUsed: 61, monthlyData: MONTHLY },
  { name: 'Technology',        totalBudget:  900000, actual: 190000, committed:  60000, remaining: 650000, percentUsed: 21, monthlyData: MONTHLY },
  { name: 'QHSE',              totalBudget:  600000, actual:  80000, committed:  40000, remaining: 480000, percentUsed: 13, monthlyData: MONTHLY },
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

// Routes all fetch calls to the correct mock response
function makeFetchMock(depts = mockDepts) {
  return jest.fn().mockImplementation((url, options) => {
    const method = options?.method || 'GET';

    if (url.includes('sync-status'))  return Promise.resolve({ ok: true, json: async () => mockSync });
    if (url.includes('gsap-data'))    return Promise.resolve({ ok: true, json: async () => mockGsapData });
    if (url.includes('initiations'))  return Promise.resolve({ ok: true, json: async () => method === 'POST' ? mockInitiations[0] : mockInitiations });
    if (url.includes('manual-entries')) return Promise.resolve({ ok: true, json: async () => method === 'POST' ? mockManualEntries[0] : mockManualEntries });
    // department/:name
    const dept = depts.find((d) => url.includes(encodeURIComponent(d.name)));
    return Promise.resolve({ ok: true, json: async () => dept || depts[0] });
  });
}

beforeEach(() => {
  localStorage.setItem('som_token', 'fake-token');
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

    await waitFor(() => expect(screen.getByText('Retail Operations')).toBeInTheDocument());
  });
});

// ── Overview tab ─────────────────────────────────────────────────────────────
describe('Overview tab', () => {
  test('renders all 4 department meter labels', async () => {
    renderDashboard();
    await waitForLoad();
    expect(screen.getByText('Retail Operations')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('QHSE')).toBeInTheDocument();
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
    expect(bar.style.backgroundColor).toBe('rgb(221, 29, 33)'); // #DD1D21
  });

  test('applies green colour to meter bar when percentUsed < 70', async () => {
    renderDashboard();
    await waitForLoad();
    // QHSE is 13% — should be green
    const bar = screen.getAllByTestId('meter-bar-QHSE')[0];
    expect(bar.style.backgroundColor).toBe('rgb(46, 125, 50)'); // #2e7d32
  });

  test('displays GSAP sync badge in header', async () => {
    renderDashboard();
    await waitForLoad();
    expect(screen.getByText(/GSAP Synced/i)).toBeInTheDocument();
  });
});

// ── Tab navigation ────────────────────────────────────────────────────────────
describe('Tab navigation', () => {
  test('shows all 5 tab buttons', async () => {
    renderDashboard();
    await waitForLoad();
    ['Overview', 'Departments', 'GSAP Sync', 'Manual Entries', 'Initiations'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  test('clicking Departments tab shows department selector', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Departments' }));
    expect(screen.getByText('Department Dashboard')).toBeInTheDocument();
  });

  test('clicking GSAP Sync tab shows sync data section', async () => {
    renderDashboard();
    await waitForLoad();
    fireEvent.click(screen.getByRole('button', { name: 'GSAP Sync' }));
    await waitFor(() => expect(screen.getByText(/GSAP Integration/i)).toBeInTheDocument());
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
});

// ── GSAP Sync tab ─────────────────────────────────────────────────────────────
describe('GSAP Sync tab', () => {
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
