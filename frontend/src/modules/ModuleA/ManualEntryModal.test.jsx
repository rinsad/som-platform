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

  test('renders all entry type options', () => {
    renderModal();
    const select = screen.getByLabelText(/Entry Type \*/i);
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('Actual');
    expect(options).toContain('PO Commitment');
    expect(options).toContain('Budget Adjustment');
  });

  test('renders all department options', () => {
    renderModal();
    const select = screen.getByLabelText(/Department \*/i);
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('Retail Operations');
    expect(options).toContain('Infrastructure');
    expect(options).toContain('Technology');
    expect(options).toContain('QHSE');
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
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.selectOptions(screen.getByLabelText(/Entry Type \*/i), 'PO Commitment');
    await user.selectOptions(screen.getByLabelText(/Department \*/i), 'Technology');
    await user.clear(screen.getByLabelText(/Amount \(OMR\) \*/i));
    await user.type(screen.getByLabelText(/Amount \(OMR\) \*/i), '42000');
    await user.type(screen.getByLabelText(/Description/i), 'Network switches');
    await user.type(screen.getByLabelText(/Reference Number/i), 'PO-001');

    await user.click(screen.getByRole('button', { name: /Post Entry/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: 'PO Commitment',
        department: 'Technology',
        amount: '42000',
        description: 'Network switches',
        referenceNumber: 'PO-001',
      })
    );
  });

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

