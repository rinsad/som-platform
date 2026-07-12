import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import PurchaseRequestList from './PurchaseRequestList';

const pageOne = {
  items: [
    { id: 'PR-1', title: 'New CCTV System', department: 'Operations',
      totalValue: 45000, tier: 'MEDIUM', status: 'APPROVED',
      quoteCount: 3, requiresJustification: false, createdAt: '2026-03-01' },
    { id: 'PR-2', title: 'Office Furniture', department: 'HR',
      totalValue: 8000, tier: 'LOW', status: 'PENDING_APPROVAL',
      quoteCount: 1, requiresJustification: true, createdAt: '2026-03-10' },
  ],
  pagination: { page: 1, pageSize: 10, totalItems: 3, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
  counts: { all: 3, pending: 1, approved: 1, rejected: 1, draft: 0, needsJustification: 1 },
};

const approvedPage = {
  items: [
    { id: 'PR-1', title: 'New CCTV System', department: 'Operations',
      totalValue: 45000, tier: 'MEDIUM', status: 'APPROVED',
      quoteCount: 3, requiresJustification: false, createdAt: '2026-03-01' },
  ],
  pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
  counts: { all: 3, pending: 1, approved: 1, rejected: 1, draft: 0, needsJustification: 1 },
};

const pagedResponse = {
  items: [
    { id: 'PR-3', title: 'Server Upgrade', department: 'IT',
      totalValue: 450000, tier: 'HIGH', status: 'REJECTED',
      quoteCount: 3, requiresJustification: false, createdAt: '2026-03-05' },
  ],
  pagination: { page: 2, pageSize: 25, totalItems: 3, totalPages: 2, hasPreviousPage: true, hasNextPage: false },
  counts: { all: 3, pending: 1, approved: 1, rejected: 1, draft: 0, needsJustification: 1 },
};

beforeEach(() => {
  localStorage.setItem('som_token', 'fake-token');
  localStorage.setItem('som_user', JSON.stringify({ role: 'Admin' }));
  globalThis.fetch = vi.fn((url) => {
    const parsedUrl = new URL(url, 'http://localhost');
    const status = parsedUrl.searchParams.get('status') || 'ALL';
    const page = parsedUrl.searchParams.get('page') || '1';
    const pageSize = parsedUrl.searchParams.get('pageSize') || '10';

    if (status === 'APPROVED') {
      return Promise.resolve({ ok: true, json: async () => approvedPage });
    }

    if (page === '2' && pageSize === '25') {
      return Promise.resolve({ ok: true, json: async () => pagedResponse });
    }

    return Promise.resolve({ ok: true, json: async () => pageOne });
  });
});

afterEach(() => { localStorage.clear(); vi.clearAllMocks(); });

const renderList = (initialEntries = ['/purchase-requests']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <PurchaseRequestList />
    </MemoryRouter>
  );

test('renders all PRs from the API', async () => {
  renderList();
  await waitFor(() =>
    expect(screen.getByText('New CCTV System')).toBeInTheDocument()
  );
  expect(screen.getByText('Office Furniture')).toBeInTheDocument();
  expect(screen.getByLabelText(/rows per page/i)).toHaveValue('10');
});

test('Approved filter shows only approved PRs', async () => {
  renderList();
  await waitFor(() => screen.getByText('New CCTV System'));
  fireEvent.click(screen.getByRole('button', { name: /approved/i }));
  await waitFor(() =>
    expect(screen.getByText('New CCTV System')).toBeInTheDocument()
  );
  expect(screen.queryByText('Office Furniture')).not.toBeInTheDocument();
});

test('shows justification warning banner', async () => {
  renderList();
  await waitFor(() =>
    expect(screen.getByText(/fewer than 3 quotes attached/i)).toBeInTheDocument()
  );
});

test('shows empty state when filter has no results', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      items: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
      counts: { all: 0, pending: 0, approved: 0, rejected: 0, draft: 0, needsJustification: 0 },
    }),
  });
  renderList();
  await waitFor(() =>
    expect(screen.getAllByText(/no.*requests/i).length).toBeGreaterThan(0)
  );
});

test('reads page and page size from the URL query', async () => {
  renderList(['/purchase-requests?page=2&pageSize=25']);
  await waitFor(() =>
    expect(screen.getByText('Server Upgrade')).toBeInTheDocument()
  );
  expect(screen.getByLabelText(/rows per page/i)).toHaveValue('25');
});
