import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import UserFormModal from './UserFormModal';

describe('UserFormModal Business / Function assignment', () => {
  it('saves the selected CAPEX Business / Function separately from Department', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <UserFormModal
          user={{
            id: 'user-1',
            employee_id: 'EMP-1',
            full_name: 'Project Owner',
            email: 'owner@shell.om',
            role: 'Project Owner',
            department: 'Engineering',
            business_function_id: '',
          }}
          businessFunctions={[{ id: 'business-1', name: 'Mobility' }]}
          onSave={onSave}
          onClose={vi.fn()}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByLabelText('Role *'));
    await user.click(screen.getByRole('option', { name: 'Project Owner' }));
    await user.click(screen.getByLabelText('Department'));
    await user.click(screen.getByRole('option', { name: 'Engineering' }));
    await user.click(screen.getByLabelText('Business / Function'));
    await user.click(screen.getByRole('option', { name: 'Mobility' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      department: 'Engineering',
      business_function_id: 'business-1',
    })));
  }, 10000);
});
