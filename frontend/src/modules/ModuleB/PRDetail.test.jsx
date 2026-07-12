import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import PRDetail from './PRDetail';

vi.mock('../../utils/toast', () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const purchaseRequest = {
  id: 'PR-2026-141',
  title: 'CCTV Upgrade',
  department: 'Mobility',
  status: 'PENDING_APPROVAL',
  tier: 'LOW',
  createdAt: '2026-03-11',
  requestorName: 'Fatima Al Balushi',
  totalValue: 1800,
  currentBudget: 2500,
  savings: 700,
  description: 'Supply and install upgraded CCTV cameras.',
  requiresJustification: false,
  requestorId: 'requestor-1',
  currentStepIndex: 0,
  workflow: [{ label: 'Line Manager Endorsement', role: 'Line Manager' }],
  approvalHistory: [
    {
      approver: 'Admin User',
      role: 'Admin',
      decision: 'SUPPLIER_SELECTED',
      stepLabel: 'Supplier quotation selected',
      comment: 'Desert Tech Trading selected at OMR 1,875.000.',
      date: '2026-03-12',
    },
  ],
  supplierQuotations: [
    {
      id: 'SQ-1',
      supplierName: 'Muscat Security Solutions LLC',
      quoteAmount: 1800,
      documentId: 'DOC-quote-1',
      documentName: 'Docishield Cert.pdf',
      isSelected: true,
    },
  ],
  lineItems: [
    {
      description: 'CCTV cameras, NVR, cabling, and installation accessories',
      quantity: 4,
      unitPrice: 450,
      lineTotal: 1800,
    },
  ],
};

beforeEach(() => {
  localStorage.setItem('som_token', 'fake-token');
  localStorage.setItem('som_user', JSON.stringify({ id: 'manager-1', role: 'Manager' }));
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:quote-document');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  globalThis.fetch = vi.fn((url) => {
    const href = String(url);
    if (href.endsWith('/api/purchase-requests/PR-2026-141')) {
      return Promise.resolve({ ok: true, json: async () => purchaseRequest });
    }
    if (href.endsWith('/api/purchase-requests/PR-2026-141/documents/DOC-quote-1/download')) {
      return Promise.resolve({ ok: true, blob: async () => new Blob(['quote pdf']) });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/purchase-requests/PR-2026-141']}>
      <Routes>
        <Route path="/purchase-requests/:id" element={<PRDetail />} />
      </Routes>
    </MemoryRouter>
  );

test('downloads supplier quote document from the quotations table', async () => {
  const appendChild = vi.spyOn(document.body, 'appendChild');
  const click = vi.fn();
  const remove = vi.fn();
  const originalCreateElement = document.createElement.bind(document);
  const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
    if (tagName === 'a') {
      const anchor = originalCreateElement('a');
      vi.spyOn(anchor, 'click').mockImplementation(click);
      vi.spyOn(anchor, 'remove').mockImplementation(remove);
      return anchor;
    }
    return originalCreateElement(tagName);
  });

  renderDetail();

  const quoteFile = await screen.findByRole('button', { name: 'Docishield Cert.pdf' });
  await userEvent.click(quoteFile);

  await waitFor(() =>
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/purchase-requests/PR-2026-141/documents/DOC-quote-1/download'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fake-token' }),
      })
    )
  );
  expect(createElement).toHaveBeenCalledWith('a');
  expect(appendChild).toHaveBeenCalled();
  expect(click).toHaveBeenCalled();
  expect(remove).toHaveBeenCalled();
});

test('shows the request created event in the audit trail', async () => {
  renderDetail();

  await userEvent.click(await screen.findByRole('button', { name: 'Audit Trail' }));

  expect(screen.getByText('CREATED')).toBeInTheDocument();
  expect(screen.getByText('Purchase request created')).toBeInTheDocument();
  expect(screen.getByText(/Fatima Al Balushi \(Requestor\)/)).toBeInTheDocument();
  expect(screen.queryByText('No audit events recorded yet.')).not.toBeInTheDocument();
});

test('shows supplier selection events in the audit trail', async () => {
  renderDetail();

  await userEvent.click(await screen.findByRole('button', { name: 'Audit Trail' }));

  expect(screen.getByText('SUPPLIER_SELECTED')).toBeInTheDocument();
  expect(screen.getByText('Supplier quotation selected')).toBeInTheDocument();
  expect(screen.getByText('Desert Tech Trading selected at OMR 1,875.000.')).toBeInTheDocument();
});
