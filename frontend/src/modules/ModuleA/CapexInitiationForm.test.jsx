import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CapexInitiationForm from './CapexInitiationForm';

const renderForm = (overrides = {}) => {
  const props = {
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onCancel: jest.fn(),
    ...overrides,
  };
  render(<CapexInitiationForm {...props} />);
  return props;
};

describe('CapexInitiationForm — rendering', () => {
  test('renders the form heading and subtitle', () => {
    renderForm();
    expect(screen.getByText('New Capex Initiation')).toBeInTheDocument();
    expect(screen.getByText(/initial requirement/i)).toBeInTheDocument();
  });

  test('renders all required input fields', () => {
    renderForm();
    expect(screen.getByPlaceholderText(/Solar Panel Installation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument();
  });

  test('renders project type selector with all options', () => {
    renderForm();
    const select = screen.getByLabelText(/Project Type/i);
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['New', 'Replacement', 'Upgrade', 'Expansion']);
  });

  test('renders priority selector with High, Medium, Low', () => {
    renderForm();
    const select = screen.getByLabelText(/Priority/i);
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['High', 'Medium', 'Low']);
  });

  test('renders stakeholders and justification text fields', () => {
    renderForm();
    expect(screen.getByPlaceholderText(/Finance, QHSE/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Strategic rationale/i)).toBeInTheDocument();
  });

  test('renders Submit and Cancel/Discard buttons', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /Submit for Approval/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
  });
});

describe('CapexInitiationForm — validation', () => {
  test('shows error when title is empty on submit', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: /Submit for Approval/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  test('shows error when estimated budget is missing', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByPlaceholderText(/Solar Panel/i), 'My Project');
    await user.click(screen.getByRole('button', { name: /Submit for Approval/i }));
    expect(screen.getByText(/valid.*budget|budget.*valid/i)).toBeInTheDocument();
  });

  test('shows error when estimated budget is zero', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByPlaceholderText(/Solar Panel/i), 'My Project');
    await user.type(screen.getByLabelText(/Estimated Budget/i), '0');
    await user.click(screen.getByRole('button', { name: /Submit for Approval/i }));
    expect(screen.getByText(/valid.*budget|budget.*valid/i)).toBeInTheDocument();
  });

  test('does not call onSubmit when validation fails', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.click(screen.getByRole('button', { name: /Submit for Approval/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('CapexInitiationForm — interactions', () => {
  test('calls onCancel when Discard button is clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();
    await user.click(screen.getByRole('button', { name: /discard/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('calls onSubmit with correct data on valid form', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByPlaceholderText(/Solar Panel/i), 'EV Charging Hub');
    await user.selectOptions(screen.getByLabelText(/Department \*/i), 'Technology');
    await user.selectOptions(screen.getByLabelText(/Project Type/i), 'Upgrade');
    await user.type(screen.getByLabelText(/Estimated Budget/i), '150000');
    await user.selectOptions(screen.getByLabelText(/Priority/i), 'High');
    await user.type(screen.getByPlaceholderText(/Finance, QHSE/i), 'Finance, IT');
    await user.type(screen.getByPlaceholderText(/Brief description/i), 'Install EV chargers');
    await user.type(screen.getByPlaceholderText(/Strategic rationale/i), 'Market opportunity');

    await user.click(screen.getByRole('button', { name: /Submit for Approval/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'EV Charging Hub',
        department: 'Technology',
        projectType: 'Upgrade',
        estimatedBudget: 150000,
        priority: 'High',
        stakeholders: 'Finance, IT',
        description: 'Install EV chargers',
        justification: 'Market opportunity',
      })
    );
  });

  test('shows submitting state while onSubmit is pending', async () => {
    const user = userEvent.setup();
    let resolve;
    const onSubmit = jest.fn().mockImplementation(() => new Promise((r) => { resolve = r; }));
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText(/Solar Panel/i), 'My Project');
    await user.type(screen.getByLabelText(/Estimated Budget \(OMR\) \*/i), '50000');
    await user.click(screen.getByRole('button', { name: /Submit for Approval/i }));

    expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
    resolve();
  });

  test('shows error message when onSubmit rejects', async () => {
    const user = userEvent.setup();
    renderForm({ onSubmit: jest.fn().mockRejectedValue(new Error('API error')) });

    await userEvent.type(screen.getByPlaceholderText(/Solar Panel/i), 'My Project');
    await userEvent.type(screen.getByLabelText(/Estimated Budget \(OMR\) \*/i), '50000');
    await userEvent.click(screen.getByRole('button', { name: /Submit for Approval/i }));

    await waitFor(() => expect(screen.getByText(/failed to submit/i)).toBeInTheDocument());
  });
});
