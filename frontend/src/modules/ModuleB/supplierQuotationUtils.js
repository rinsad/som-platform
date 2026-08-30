export function emptyQuotationRow() {
  return { id: Date.now() + Math.random(), supplierName: '', quoteAmount: '', file: null, documentId: null, documentName: '', isSelected: false };
}

export function normalizeQuotationRows(rows = []) {
  const quotations = [];
  for (const row of rows) {
    const supplierName = String(row.supplierName ?? row.name ?? '').trim();
    const hasAmount = String(row.quoteAmount ?? '').trim() !== '';
    const hasFile = !!row.file || !!row.documentId || !!row.documentName || !!row.legacyAttachmentExempt;
    if (!supplierName && !hasAmount && !hasFile) continue;
    if (!supplierName) throw new Error('Supplier name is required for every quotation row.');
    const quoteAmount = Number(row.quoteAmount);
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
      throw new Error('Quote amount must be a positive number for every quotation row.');
    }
    quotations.push({
      id: row.id,
      supplierName,
      quoteAmount,
      file: row.file || null,
      documentId: row.documentId || null,
      legacyAttachmentExempt: Boolean(row.legacyAttachmentExempt),
      isSelected: Boolean(row.isSelected),
    });
  }
  return quotations;
}

export function completeQuotationCount(rows = []) {
  return rows.filter((row) => {
    const supplierName = String(row.supplierName ?? row.name ?? '').trim();
    const amount = Number(row.quoteAmount);
    return supplierName && Number.isFinite(amount) && amount > 0;
  }).length;
}

export function quotationMetrics(rows = [], currentBudget = '') {
  const amounts = rows
    .map((row) => Number(row.quoteAmount))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  const avgQuote = amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : null;
  const selected = rows.find((row) => row.isSelected);
  const selectedAmount = Number(selected?.quoteAmount);
  const budget = Number(currentBudget);
  const savings = Number.isFinite(budget) && budget > 0 && Number.isFinite(selectedAmount) && selectedAmount > 0
    ? budget - selectedAmount
    : null;
  return { avgQuote, savings };
}
