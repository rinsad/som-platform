import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import CapexV2RequestForm from './CapexV2RequestForm';
import {
  getCapexV2Allocations,
  getCapexV2BudgetCycles,
  getCapexV2MasterData,
} from '../../services/capexV2Service';

vi.mock('../../services/capexV2Service', () => ({
  getCapexV2MasterData: vi.fn().mockResolvedValue({ organizations: [], costCentres: [], categories: [], users: [] }),
  getCapexV2BudgetCycles: vi.fn().mockResolvedValue([]),
  getCapexV2Allocations: vi.fn().mockResolvedValue([]),
  createCapexV2Request: vi.fn(),
  uploadCapexV2Document: vi.fn(),
  addCapexV2Quotation: vi.fn(),
  uploadCapexV2QuotationDocument: vi.fn(),
  submitCapexV2Request: vi.fn(),
}));

describe('CAPEX v2 request ownership form', () => {
  test('keeps project scope in Project & budget and omits the business case section', async () => {
    render(<MemoryRouter><CapexV2RequestForm /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Project & budget' })).toBeVisible());
    expect(screen.getByLabelText('Project description *')).toBeVisible();
    expect(screen.getByText('Project strategy / scope documents *')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Business case' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Business case')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ROI / benefits summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Mandatory HSSE screening')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cost centre')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('CAPEX category')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Line manager/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('HSSE risk')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Worker Welfare risk')).not.toBeInTheDocument();
  });

  test('loads budget allocations from the controlled SAC import and selects a single match', async () => {
    const user = userEvent.setup();
    const organization = { id: 'bu-1', name: 'Mobility' };
    getCapexV2MasterData.mockResolvedValueOnce({ organizations: [organization], costCentres: [], categories: [], users: [] });
    getCapexV2BudgetCycles.mockResolvedValueOnce([{ id: 'cycle-1', fiscalYear: 2026, status: 'OPEN' }]);
    getCapexV2Allocations.mockResolvedValueOnce([{ id: 'allocation-1', organizationUnitId: organization.id, description: 'Station renewals', available: '75000.000' }]);

    render(<MemoryRouter><CapexV2RequestForm /></MemoryRouter>);
    await user.click(await screen.findByLabelText('Business / Function *'));
    await user.click(screen.getByRole('option', { name: 'Mobility' }));
    await user.click(screen.getByLabelText('Fiscal year *'));
    await user.click(screen.getByRole('option', { name: '2026 · OPEN' }));

    await waitFor(() => expect(screen.getByLabelText('Budget allocation *')).toHaveTextContent('Station renewals'));
    expect(screen.getByText(/Loaded from the controlled SAC import/)).toBeVisible();
  });

  test('explains that urgency does not change governance', async () => {
    render(<MemoryRouter><CapexV2RequestForm /></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText('Urgent requirement')).toBeVisible());
    expect(screen.getByText('Marks this request as time-sensitive for visibility. Normal approval requirements still apply.')).toBeVisible();
  });

  test('appends separately selected project documents and allows removal', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CapexV2RequestForm /></MemoryRouter>);
    const picker = await screen.findByLabelText('Upload project documents and presentations');
    const scope = new File(['scope'], 'scope.pdf', { type: 'application/pdf', lastModified: 1 });
    const presentation = new File(['slides'], 'project.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', lastModified: 2 });

    await user.upload(picker, scope);
    await user.upload(picker, presentation);

    expect(screen.getByText('scope.pdf')).toBeVisible();
    expect(screen.getByText('project.pptx')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Remove scope.pdf' }));
    expect(screen.queryByText('scope.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('project.pptx')).toBeVisible();
  });
});
