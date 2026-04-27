import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PurchaseRequestList from './PurchaseRequestList';

const mockPRs = [
  { id: 1, title: 'New CCTV System', department: 'Operations',
    totalValue: 45000, tier: 'MEDIUM', status: 'APPROVED',
    quoteCount: 3, requiresJustification: false, createdAt: '2026-03-01' },
  { id: 2, title: 'Office Furniture', department: 'HR',
    totalValue: 8000, tier: 'LOW', status: 'PENDING_APPROVAL',
    quoteCount: 1, requiresJustification: true, createdAt: '2026-03-10' },
  { id: 3, title: 'Server Upgrade', department: 'IT',
    totalValue: 450000, tier: 'HIGH', status: 'REJECTED',
    quoteCount: 3, requiresJustification: false, createdAt: '2026-03-05' },
];

beforeEach(() => {
  localStorage.setItem('som_token', 'fake-token');
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, json: async () => mockPRs,
  });
});

afterEach(() => { localStorage.clear(); jest.clearAllMocks(); });

const renderList = () =>
  render(
    <MemoryRouter>
      <PurchaseRequestList />
    </MemoryRouter>
  );

test('renders all PRs from the API', async () => {
  renderList();
  await waitFor(() =>
    expect(screen.getByText('New CCTV System')).toBeInTheDocument()
  );
  expect(screen.getByText('Office Furniture')).toBeInTheDocument();
  expect(screen.getByText('Server Upgrade')).toBeInTheDocument();
});

test('Approved filter shows only approved PRs', async () => {
  renderList();
  await waitFor(() => screen.getByText('New CCTV System'));
  fireEvent.click(screen.getByRole('button', { name: /approved/i }));
  expect(screen.getByText('New CCTV System')).toBeInTheDocument();
  expect(screen.queryByText('Office Furniture')).not.toBeInTheDocument();
});

test('shows justification warning banner', async () => {
  renderList();
  await waitFor(() =>
    expect(screen.getByText(/justification/i)).toBeInTheDocument()
  );
});

test('shows empty state when filter has no results', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
  renderList();
  await waitFor(() =>
    expect(screen.getAllByText(/no.*requests/i).length).toBeGreaterThan(0)
  );
});
