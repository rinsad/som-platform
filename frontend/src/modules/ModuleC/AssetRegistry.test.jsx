import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssetRegistry from './AssetRegistry';

// vi.mock (not jest.mock) — required for Vitest hoisting
vi.mock('chart.js', () => ({
  Chart: class { constructor() {} destroy() {} update() {} },
  LineController: {},
  LineElement: {},
  PointElement: {},
  CategoryScale: {},
  LinearScale: {},
  Tooltip: {},
  Legend: {},
}));

const mockAssets = [
  { assetCode: 'MSQ-001-F01-GEN001', name: 'Generator Unit', region: 'Muscat',
    site: 'HQ', facility: 'F01', equipmentType: 'Generator', status: 'Active', department: 'Operations' },
  { assetCode: 'SLL-002-F01-HVC001', name: 'HVAC System', region: 'Salalah',
    site: 'Depot', facility: 'F01', equipmentType: 'HVAC', status: 'Maintenance', department: 'Facilities' },
];

const mockAlerts = [
  { alertId: 1, assetCode: 'MSQ-001-F01-GEN001', type: 'Contract Expiry',
    message: 'Contract expiring soon', daysRemaining: 12, severity: 'medium' },
];

beforeEach(() => {
  localStorage.setItem('som_token', 'fake-token');
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes('alerts'))
      return Promise.resolve({ ok: true, json: async () => mockAlerts });
    // utility-bills endpoint must return { bills: {} } shape
    if (url.includes('utility-bills'))
      return Promise.resolve({ ok: true, json: async () => ({ bills: {} }) });
    return Promise.resolve({ ok: true, json: async () => mockAssets });
  });
});

afterEach(() => { localStorage.clear(); jest.clearAllMocks(); });

test('renders asset rows after fetch', async () => {
  render(<AssetRegistry />);
  await waitFor(() =>
    expect(screen.getByText('Generator Unit')).toBeInTheDocument()
  );
  expect(screen.getAllByTestId('asset-row')).toHaveLength(2);
});

test('search bar filters assets by name', async () => {
  render(<AssetRegistry />);
  await waitFor(() => screen.getByText('Generator Unit'));
  fireEvent.change(screen.getByTestId('search-assets'),
    { target: { value: 'HVAC' } });
  expect(screen.queryByText('Generator Unit')).not.toBeInTheDocument();
  expect(screen.getByText('HVAC System')).toBeInTheDocument();
});

test('shows compliance alert banner', async () => {
  render(<AssetRegistry />);
  await waitFor(() =>
    expect(screen.getByText(/contract expiring/i)).toBeInTheDocument()
  );
});

test('Log Bill button is visible on Utilities tab', async () => {
  render(<AssetRegistry />);
  fireEvent.click(screen.getByTestId('tab-utilities'));
  await waitFor(() =>
    expect(screen.getByTestId('btn-log-bill')).toBeInTheDocument()
  );
});
