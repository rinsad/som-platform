import SelectField from '../../components/SelectField';

export function emptyQuotationRow() {
  return { id: Date.now() + Math.random(), supplierName: '', quoteAmount: '', file: null, documentId: null, documentName: '', isSelected: false };
}

export function normalizeQuotationRows(rows = []) {
  const quotations = [];
  for (const row of rows) {
    const supplierName = String(row.supplierName ?? row.name ?? '').trim();
    const hasAmount = String(row.quoteAmount ?? '').trim() !== '';
    const hasFile = !!row.file || !!row.documentId || !!row.legacyAttachmentExempt;
    if (!supplierName && !hasAmount && !hasFile) continue;
    if (!supplierName) throw new Error('Supplier name is required for every quotation row.');
    const quoteAmount = Number(row.quoteAmount);
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
      throw new Error('Quote amount must be a positive number for every quotation row.');
    }
    if (!hasFile) throw new Error('Attach a quote file for every supplier quotation.');
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
    return supplierName && Number.isFinite(amount) && amount > 0
      && (row.file || row.documentId || row.legacyAttachmentExempt);
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

export default function SupplierQuotationEditor({
  rows,
  onChange,
  currentBudget,
  onBudgetChange,
  allowSelection = true,
  requireFiles = true,
  styles,
}) {
  const s = styles;
  const quoteCount = completeQuotationCount(rows);
  const needsJustification = quoteCount < 3;
  const { avgQuote, savings } = quotationMetrics(rows, currentBudget);

  const updateRow = (id, patch) => {
    onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };
  const addRow = () => onChange([...rows, emptyQuotationRow()]);
  const removeRow = (id) => onChange(rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);
  const selectRow = (id) => onChange(rows.map((row) => ({ ...row, isSelected: row.id === id })));

  return (
    <div>
      <div style={s.cardTitleRow}>
        <h2 style={s.cardTitle}>Sourcing Essentials</h2>
        <button type="button" onClick={addRow} style={s.addRowBtn || s.secondaryBtn}>+ Add Supplier</button>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {allowSelection && <th style={s.th}>Selected</th>}
              <th style={s.th}>Supplier</th>
              <th style={s.th}>Quote Amount (OMR)</th>
              <th style={s.th}>Quote File</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={i % 2 === 1 ? s.trAlt : {}}>
                {allowSelection && (
                  <td style={s.td}>
                    <input
                      type="radio"
                      name="selectedQuotation"
                      checked={Boolean(row.isSelected)}
                      onChange={() => selectRow(row.id)}
                      aria-label={`Select ${row.supplierName || 'supplier quotation'}`}
                    />
                  </td>
                )}
                <td style={s.tdInput || s.td}>
                  <input
                    type="text"
                    value={row.supplierName}
                    onChange={(e) => updateRow(row.id, { supplierName: e.target.value })}
                    placeholder="Supplier name"
                    style={s.cellInput}
                  />
                </td>
                <td style={s.tdInput || s.td}>
                  <input
                    type="number"
                    value={row.quoteAmount}
                    onChange={(e) => updateRow(row.id, { quoteAmount: e.target.value })}
                    placeholder="Quoted amount"
                    min="0"
                    step="0.01"
                    style={{ ...s.cellInput, textAlign: 'right' }}
                  />
                </td>
                <td style={s.td}>
                  <label style={s.fileBtn || s.secondaryBtn}>
                    {row.file ? row.file.name : row.documentName || 'Attach'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => updateRow(row.id, { file: e.target.files?.[0] || null })}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {requireFiles && !row.file && !row.documentId && !row.legacyAttachmentExempt && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--danger)' }}>Required</span>
                  )}
                </td>
                <td style={{ ...s.td, textAlign: 'center' }}>
                  <button type="button" onClick={() => removeRow(row.id)} style={s.removeBtn || s.iconBtn} title="Remove supplier">x</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...(s.row2Cols || s.formGrid), marginTop: 16 }}>
        <div style={s.field || {}}>
          <label style={s.label || s.formLabel}>Current Cost / Budget (OMR)</label>
          <input
            type="number"
            value={currentBudget}
            onChange={(e) => onBudgetChange(e.target.value)}
            placeholder="Current budget"
            min="0"
            step="0.01"
            style={s.input}
          />
        </div>
        <div style={s.field || {}}>
          <label style={s.label || s.formLabel}>Selected Supplier</label>
          <SelectField
            value={rows.find((row) => row.isSelected)?.supplierName || ''}
            onChange={(supplierName) => {
              const found = rows.find((row) => row.supplierName === supplierName);
              if (found) selectRow(found.id);
            }}
            options={rows.map((row) => row.supplierName).filter(Boolean)}
            placeholder="Select supplier..."
            disabled={!allowSelection}
            style={s.select || s.input}
            aria-label="Selected Supplier"
          />
        </div>
      </div>

      <div style={s.metricGrid}>
        <div style={s.metricBox}>
          <span style={s.metricLabel}>Complete Quotes</span>
          <strong style={{ ...s.metricValue, color: needsJustification ? 'var(--danger)' : 'var(--success)' }}>{quoteCount} / 3</strong>
        </div>
        <div style={s.metricBox}>
          <span style={s.metricLabel}>Average Quote</span>
          <strong style={s.metricValue}>{avgQuote == null ? '-' : `OMR ${avgQuote.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong>
        </div>
        <div style={s.metricBox}>
          <span style={s.metricLabel}>Savings</span>
          <strong style={s.metricValue}>{savings == null ? '-' : `OMR ${savings.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong>
        </div>
      </div>
    </div>
  );
}
