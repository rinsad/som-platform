import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualEntryModal from './ManualEntryModal';

const renderModal = (overrides = {}) => {
  const props = {
    onClose: jest.fn(),
    onSubmit: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<ManualEntryModal {...props} />);
  return props;
};

describe('ManualEntryModal — rendering', () => {
  test('renders all form fields', () => {
    renderModal();
    expect(screen.getByText('Add Manual Entry')).toBeInTheDocument();
    expect(screen.getByLabelText(/Entry Type \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Period/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reference Number/i)).toBeInTheDocument();
  });

  test('renders all entry type options', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByLabelText(/Entry Type \*/i));
    expect(screen.getByRole('option', { name: 'Actual' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'PO Commitment' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Budget Adjustment' })).toBeInTheDocument();
  });

  test('renders all department options', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByLabelText(/Department \*/i));
    expect(screen.getByRole('option', { name: 'HR & Real Estate' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aviation' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mobility' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'General' })).toBeInTheDocument();
  });
});

describe('ManualEntryModal — validation', () => {
  test('shows error message when amount is empty on submit', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Post Entry/i }));
    expect(screen.getByText(/valid amount/i)).toBeInTheDocument();
  });

  test('shows error when amount is zero', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText(/Amount \(OMR\)/i), '0');
    await user.click(screen.getByRole('button', { name: /Post Entry/i }));
    expect(screen.getByText(/valid amount/i)).toBeInTheDocument();
  });

  test('does not call onSubmit when validation fails', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();
    await user.click(screen.getByRole('button', { name: /Post Entry/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ManualEntryModal — interactions', () => {
  test('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onSubmit with form data on valid submit', async () => {
    // delay:null removes user-event's inter-event delay; Radix Select's
    // portal/scroll work makes the default 5s timeout tight for two selects
    // plus typing in jsdom.
    const user = userEvent.setup({ delay: null });
    const { onSubmit } = renderModal();

    await user.click(screen.getByLabelText(/Entry Type \*/i));
    await user.click(screen.getByRole('option', { name: 'PO Commitment' }));
    await user.click(screen.getByLabelText(/Department \*/i));
    await user.click(screen.getByRole('option', { name: 'Aviation' }));
    await user.clear(screen.getByLabelText(/Amount \(OMR\) \*/i));
    await user.type(screen.getByLabelText(/Amount \(OMR\) \*/i), '42000');
    await user.type(screen.getByLabelText(/Description/i), 'Network switches');
    await user.type(screen.getByLabelText(/Reference Number/i), 'PO-001');

    await user.click(screen.getByRole('button', { name: /Post Entry/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: 'PO Commitment',
        department: 'Aviation',
        amount: '42000',
        description: 'Network switches',
        referenceNumber: 'PO-001',
      })
    );
  }, 15000);

  test('calls onClose after successful submit', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.type(screen.getByLabelText(/Amount \(OMR\) \*/i), '5000');
    await user.click(screen.getByRole('button', { name: /Post Entry/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  test('shows error message when onSubmit rejects', async () => {
    const user = userEvent.setup();
    renderModal({ onSubmit: jest.fn().mockRejectedValue(new Error('Server error')) });
    await user.type(screen.getByLabelText(/Amount \(OMR\) \*/i), '5000');
    await user.click(screen.getByRole('button', { name: /Post Entry/i }));
    await waitFor(() => expect(screen.getByText(/failed to save/i)).toBeInTheDocument());
  });

  test('shows saving state while onSubmit is pending', async () => {
    const user = userEvent.setup();
    let resolve;
    const onSubmit = jest.fn().mockImplementation(() => new Promise((r) => { resolve = r; }));
    renderModal({ onSubmit });

    await user.type(screen.getByLabelText(/Amount \(OMR\) \*/i), '5000');
    await user.click(screen.getByRole('button', { name: /Post Entry/i }));

    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    resolve();
  });
});

