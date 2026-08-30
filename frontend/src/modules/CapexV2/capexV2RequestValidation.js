import { compareDecimalStrings } from './capexV2Format';

export function quoteHasContent(quote) {
  return Boolean(
    quote.supplierName?.trim()
    || String(quote.quotedValue || '').trim()
    || quote.paymentTerms?.trim()
    || quote.nonLowestJustification?.trim()
    || quote.file
  );
}

export function quoteIsComplete(quote) {
  return Boolean(quote.supplierName?.trim() && String(quote.quotedValue || '').trim() && quote.file);
}

export function validateRequestForm({ form, projectFiles, quotes, submitting }) {
  const draftRequired = ['title', 'organizationUnitId', 'fiscalYear', 'estimatedValue', 'projectDescription'];
  if (draftRequired.some((key) => !String(form[key] || '').trim())) {
    return 'Complete the request title, business unit, fiscal year, estimated value, and project description.';
  }

  const startedQuotes = quotes.filter(quoteHasContent);
  if (startedQuotes.some((quote) => !quoteIsComplete(quote))) {
    return 'Complete or remove each started quotation before saving.';
  }

  if (!submitting) return '';
  if (!form.budgetAllocationId) return 'Select a budget allocation imported from SAC before submission.';
  if (!projectFiles.length) return 'Upload at least one project document or presentation.';
  if (!startedQuotes.length) return 'Add at least one supplier quotation with its supporting file.';
  if (startedQuotes.filter((quote) => quote.isProposed).length !== 1) return 'Select exactly one proposed supplier.';

  const selected = startedQuotes.find((quote) => quote.isProposed);
  const selectedIsHigher = startedQuotes.some((quote) => compareDecimalStrings(selected.quotedValue, quote.quotedValue) === 1);
  if (selectedIsHigher && !selected.nonLowestJustification.trim()) {
    return 'Explain why the proposed supplier is not the lowest quotation.';
  }
  return '';
}
