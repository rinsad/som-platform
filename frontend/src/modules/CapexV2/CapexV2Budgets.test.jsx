import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CapexV2Budgets from './CapexV2Budgets';
import {
  getCapexV2Import,
  validateCapexV2Import,
} from '../../services/capexV2Service';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../../services/capexV2Service', () => ({
  createCapexV2BudgetCycle: vi.fn(),
  createCapexV2Transfer: vi.fn(),
  decideCapexV2Transfer: vi.fn(),
  downloadCapexV2Import: vi.fn(),
  getCapexV2Allocations: vi.fn().mockResolvedValue([]),
  getCapexV2BudgetCycles: vi.fn().mockResolvedValue([{ id: 'cycle-1', fiscalYear: 2026, status: 'OPEN' }]),
  getCapexV2Import: vi.fn(),
  getCapexV2Imports: vi.fn().mockResolvedValue([{
    id: 'batch-1',
    sourceReference: 'BOARD-2026',
    originalFilename: 'approved.csv',
    sourceSystem: 'SAC',
    status: 'STAGED',
    rowCount: 1,
    validRowCount: 0,
    controlTotal: '0.000',
    createdAt: '2026-07-21T00:00:00.000Z',
  }]),
  getCapexV2Transfers: vi.fn().mockResolvedValue([]),
  postCapexV2Import: vi.fn(),
  uploadCapexV2Import: vi.fn(),
  validateCapexV2Import: vi.fn().mockResolvedValue({ status: 'VALIDATED' }),
}));

const context = {
  isAdmin: true,
  capabilities: ['*'],
  scopes: [{ type: 'PORTFOLIO', capabilities: ['budget:manage', 'budget:approve'] }],
};

function Harness() {
  return <Outlet context={{ context }} />;
}

function renderBudgets() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route element={<Harness />}>
          <Route index element={<CapexV2Budgets />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getCapexV2Import.mockResolvedValue({
    id: 'batch-1',
    sourceReference: 'BOARD-2026',
    originalFilename: 'approved.csv',
    hasOriginalFile: true,
    status: 'STAGED',
    rowCount: 1,
    rows: [{
      id: 'row-1',
      rowNumber: 1,
      businessFunction: 'Aviation',
      externalProjectReference: 'SAC-WBS-1',
      description: 'Station canopy renewal',
      amount: '75000.000',
      sourceDate: '2026-10-15',
      validationStatus: 'PENDING',
      validationErrors: [],
    }],
  });
});

describe('CAPEX v2 import review controls', () => {
  test('shows the selected Budget CSV filename', async () => {
    const user = userEvent.setup();
    renderBudgets();

    const picker = await screen.findByLabelText('Upload approved SAC budget CSV');
    await user.upload(picker, new File(['business_function,description,amount'], 'approved-sac-budget.csv', { type: 'text/csv' }));

    expect(screen.getByText('approved-sac-budget.csv')).toBeVisible();
  });

  test('opens staged rows in a modal instead of rendering them inline', async () => {
    const user = userEvent.setup();
    renderBudgets();

    await user.click(await screen.findByRole('button', { name: 'View rows' }));

    expect(await screen.findByRole('heading', { name: 'Staged import rows' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Business / Function' })).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: 'Cost centre' })).not.toBeInTheDocument();
    expect(screen.getByText('Station canopy renewal')).toBeVisible();
    expect(screen.getByText('Not validated')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Station canopy renewal')).not.toBeInTheDocument();
  });

  test('requires confirmation before starting validation', async () => {
    const user = userEvent.setup();
    renderBudgets();

    await user.click(await screen.findByRole('button', { name: 'Validate' }));
    expect(screen.getByRole('alertdialog', { name: 'Validate staged import?' })).toBeVisible();
    expect(validateCapexV2Import).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Validate import' }));
    await waitFor(() => expect(validateCapexV2Import).toHaveBeenCalledWith('batch-1'));
  });
});
