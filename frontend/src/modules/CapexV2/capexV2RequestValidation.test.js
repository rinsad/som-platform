import { describe, expect, test } from 'vitest';
import { validateRequestForm } from './capexV2RequestValidation';

const baseForm = {
  title: 'Tank replacement',
  organizationUnitId: 'bu-1',
  fiscalYear: '2026',
  estimatedValue: '25000.000',
  projectDescription: 'Replace the deteriorated tank.',
  budgetAllocationId: '',
};

describe('CAPEX v2 request validation', () => {
  test('allows an incomplete decision packet to be saved as a draft', () => {
    expect(validateRequestForm({
      form: baseForm,
      projectFiles: [],
      quotes: [{ supplierName: '', quotedValue: '', paymentTerms: '', nonLowestJustification: '', file: null, isProposed: true }],
      submitting: false,
    })).toBe('');
  });

  test('requires an imported budget allocation before submission', () => {
    expect(validateRequestForm({ form: baseForm, projectFiles: [], quotes: [], submitting: true }))
      .toMatch(/budget allocation imported from SAC/i);
  });

  test('does not silently discard a partially completed quotation from a draft', () => {
    expect(validateRequestForm({
      form: baseForm,
      projectFiles: [],
      quotes: [{ supplierName: 'Vendor A', quotedValue: '', paymentTerms: '', nonLowestJustification: '', file: null }],
      submitting: false,
    })).toMatch(/Complete or remove each started quotation/i);
  });
});
