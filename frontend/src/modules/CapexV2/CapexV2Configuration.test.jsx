import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CapexV2Configuration from './CapexV2Configuration';

const service = vi.hoisted(() => ({
  getMasterData: vi.fn(),
  getWorkflow: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/capexV2Service', () => ({
  activateCapexV2WorkflowVersion: vi.fn(),
  createCapexV2Organization: vi.fn(),
  createCapexV2WorkflowDefinition: vi.fn(),
  createCapexV2WorkflowVersion: vi.fn(),
  getCapexV2MasterData: service.getMasterData,
  getCapexV2Workflow: service.getWorkflow,
  simulateCapexV2Workflow: vi.fn(),
}));

describe('CAPEX v2 controlled configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getMasterData.mockResolvedValue({
      organizations: [{ id: 'business-1', name: 'Mobility' }],
      costCentres: [],
      categories: [],
      users: [{ id: 'user-1', fullName: 'Project Owner', role: 'Employee' }],
    });
    service.getWorkflow.mockResolvedValue([]);
  });

  it('keeps user assignment in the central User Management module', async () => {
    render(<CapexV2Configuration />);

    expect(await screen.findByRole('heading', { name: 'Business / Function master' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'User role assignment' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Access scope')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Capabilities')).not.toBeInTheDocument();
  });
});
