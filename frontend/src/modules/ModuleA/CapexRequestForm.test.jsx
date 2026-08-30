import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CapexRequestForm from './CapexRequestForm';

// The form fetches its Business / Function and Asset Category masters on mount.
// Stub both so the tests exercise the rendered lists rather than the network:
// an empty business list keeps the DEPT_NAMES fallback the other tests expect.
vi.mock('../../services/capexService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getBusinessFunctions: vi.fn(() => Promise.resolve([])),
    getCapexAssetCategories: vi.fn(() => Promise.resolve([
      { id: 1, name: 'Plant and Machinery', isActive: true },
      { id: 2, name: 'IT Equipment', isActive: true },
    ])),
  };
});

describe('CapexRequestForm page', () => {
  function completeRequiredTextFields() {
    fireEvent.change(screen.getByLabelText('Request Title *'), { target: { value: 'Canopy upgrade' } });
    fireEvent.change(screen.getByLabelText('Estimated Value (OMR) *'), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Project Description *'), { target: { value: 'Replace the existing canopy.' } });
    fireEvent.change(screen.getAllByPlaceholderText('Supplier')[0], { target: { value: 'Supplier A' } });
    fireEvent.change(screen.getAllByPlaceholderText('Quote value')[0], { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Justification for fewer than 3 quotations *'), { target: { value: 'Only one compliant supplier.' } });
  }

  test('renders the dedicated request sections and submission summary', () => {
    render(<CapexRequestForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'New CAPEX Request' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Project & budget' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Risk & business case' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supplier quotations & terms' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Request summary' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Urgent requirement' })).not.toBeChecked();
    expect(screen.getByText('Marks this request as time-sensitive for visibility. Normal approval requirements still apply.')).toBeVisible();
    expect(screen.getByText('Mandatory HSSE screening')).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'HSSE Risk' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Worker Welfare Risk' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Project Description *').closest('section')).toHaveAttribute('id', 'project-budget');
    expect(screen.getByLabelText('Upload project documents and presentations').closest('section')).toHaveAttribute('id', 'project-budget');
    expect(screen.getByLabelText('Upload project documents and presentations')).toHaveAttribute('multiple');
  });

  test('shows inline validation and supports returning to the register', () => {
    const onCancel = vi.fn();
    render(<CapexRequestForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit CAPEX Request' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Request title is required.');

    fireEvent.click(screen.getByRole('button', { name: /CAPEX requests/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('shows the calculated savings or over-budget amount in the summary panel', () => {
    render(<CapexRequestForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Current Cost / Budget'), { target: { value: '100' } });
    fireEvent.change(screen.getAllByPlaceholderText('Supplier')[0], { target: { value: 'Supplier A' } });
    fireEvent.change(screen.getAllByPlaceholderText('Quote value')[0], { target: { value: '80' } });

    expect(screen.getByText('Savings · OMR 20.000')).toBeInTheDocument();

    fireEvent.change(screen.getAllByPlaceholderText('Quote value')[0], { target: { value: '120' } });

    expect(screen.getByText('Over budget · OMR 20.000')).toBeInTheDocument();
  });

  test('requires project evidence and a file for every valid quotation', () => {
    render(<CapexRequestForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    completeRequiredTextFields();

    fireEvent.click(screen.getByRole('button', { name: 'Submit CAPEX Request' }));
    expect(screen.getByRole('alert')).toHaveTextContent('At least one project document or presentation is required.');

    fireEvent.change(screen.getByLabelText('Upload project documents and presentations'), {
      target: { files: [new File(['strategy'], 'strategy.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit CAPEX Request' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Attach a document for every supplier quotation.');
  }, 15000);

  test('submits ordered evidence files and supports removing a selected file', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<CapexRequestForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    completeRequiredTextFields();
    fireEvent.change(screen.getByLabelText('Current Cost / Budget'), { target: { value: '100' } });

    const strategy = new File(['strategy'], 'strategy.pdf', { type: 'application/pdf' });
    const presentation = new File(['slides'], 'proposal.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const quote = new File(['quote'], 'quote-a.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Upload project documents and presentations'), { target: { files: [strategy, presentation] } });
    fireEvent.change(screen.getByLabelText('Upload quotation document 1'), { target: { files: [quote] } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Urgent requirement' }));

    expect(screen.getByText('quote-a.pdf')).toBeInTheDocument();
    expect(screen.getByText('strategy.pdf')).toBeInTheDocument();
    expect(screen.getByText('proposal.pptx')).toBeInTheDocument();
    fireEvent.click(screen.getByText('quote-a.pdf').parentElement.querySelector('button'));
    expect(screen.queryByText('quote-a.pdf')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Upload quotation document 1'), { target: { files: [quote] } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit CAPEX Request' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      projectFiles: [strategy, presentation],
      savings: 20,
      urgent: true,
      quotations: [expect.objectContaining({ supplierName: 'Supplier A', isSelected: true, file: quote, attachmentName: 'quote-a.pdf' })],
    });
  }, 15000);
  test('renders the schedule and capitalization planning fields', async () => {
    render(<CapexRequestForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Schedule & capitalization' })).toBeInTheDocument();
    const startDate = screen.getByLabelText('Start Date');
    expect(startDate).toHaveAttribute('type', 'date');
    expect(startDate.closest('section')).toHaveAttribute('id', 'schedule-capitalization');
    expect(screen.getByLabelText('Target Completion Date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Expected Capitalization Date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Project Owner Job Title')).toBeInTheDocument();

    // Populated from the admin-maintained list, not hardcoded in the form.
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Asset Category' })).toBeInTheDocument();
    });
  });

  test('blocks a target completion date earlier than the start date', () => {
    const onSubmit = vi.fn();
    render(<CapexRequestForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    completeRequiredTextFields();

    const strategy = new File(['strategy'], 'strategy.pdf', { type: 'application/pdf' });
    const quote = new File(['quote'], 'quote-a.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Upload project documents and presentations'), { target: { files: [strategy] } });
    fireEvent.change(screen.getByLabelText('Upload quotation document 1'), { target: { files: [quote] } });

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByLabelText('Target Completion Date'), { target: { value: '2026-12-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit CAPEX Request' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Target completion date cannot be earlier than the start date.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('submits the planning fields, sending null for the ones left blank', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CapexRequestForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    completeRequiredTextFields();

    const strategy = new File(['strategy'], 'strategy.pdf', { type: 'application/pdf' });
    const quote = new File(['quote'], 'quote-a.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Upload project documents and presentations'), { target: { files: [strategy] } });
    fireEvent.change(screen.getByLabelText('Upload quotation document 1'), { target: { files: [quote] } });

    fireEvent.change(screen.getByLabelText('Project Owner Job Title'), { target: { value: 'Real Estate Project Owner' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Target Completion Date'), { target: { value: '2027-03-31' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit CAPEX Request' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      projectOwnerTitle: 'Real Estate Project Owner',
      startDate: '2026-09-01',
      targetCompletionDate: '2027-03-31',
      expectedCapitalizationDate: null,
      assetCategoryId: null,
    });
  }, 15000);
});
