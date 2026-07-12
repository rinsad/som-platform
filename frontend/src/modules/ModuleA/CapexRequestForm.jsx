import { useMemo, useState } from 'react';
import { DEPT_NAMES } from '../../services/capexService';
import Modal from '../../components/Modal';
import SelectField from '../../components/SelectField';
import Checkbox from '../../components/Checkbox';

function emptyQuote(selected = false) {
  return {
    _uid: crypto.randomUUID(),
    supplierName: '',
    quoteValue: '',
    currency: 'OMR',
    paymentTerms: '',
    attachmentName: '',
    isSelected: selected,
  };
}

function valueBand(value) {
  const n = Number(value) || 0;
  if (n <= 25000) return 'LOW';
  if (n <= 300000) return 'MEDIUM';
  return 'HIGH';
}

function financialYearOptions() {
  const year = new Date().getFullYear();
  return [year - 1, year, year + 1, year + 2].map(y => ({
    value: y,
    label: `FY ${y}`,
  }));
}

export default function CapexRequestForm({ onSubmit, onCancel }) {
  const fyOptions = useMemo(() => financialYearOptions(), []);
  const [form, setForm] = useState({
    title: '',
    department: DEPT_NAMES[0],
    businessFunction: DEPT_NAMES[0],
    budgetHolder: '',
    financialYear: new Date().getFullYear(),
    currentCostBudget: '',
    estimatedValue: '',
    urgent: false,
    scopeDetails: '',
    frequency: 'One-time',
    volumePerYear: '',
    hsseRisk: 'Low',
    workerWelfareRisk: 'Low',
    paymentTermsAgreed: false,
    paymentTerms: '90 days',
    fewerThan3Justification: '',
    savings: '',
    roi: '',
    quotations: [emptyQuote(true), emptyQuote(), emptyQuote()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const band = useMemo(() => valueBand(form.estimatedValue), [form.estimatedValue]);
  const validQuotes = form.quotations.filter(q => q.supplierName.trim() && Number(q.quoteValue) > 0);
  const needsJustification = validQuotes.length < 3;

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function setQuote(index, field, value) {
    setForm(prev => ({
      ...prev,
      quotations: prev.quotations.map((q, i) => {
        if (field === 'isSelected') return { ...q, isSelected: i === index };
        return i === index ? { ...q, [field]: value } : q;
      }),
    }));
  }

  function addQuote() {
    setForm(prev => ({ ...prev, quotations: [...prev.quotations, emptyQuote()] }));
  }

  function removeQuote(index) {
    setForm(prev => {
      const next = prev.quotations.filter((_, i) => i !== index);
      if (!next.some(q => q.isSelected) && next[0]) next[0].isSelected = true;
      return { ...prev, quotations: next.length ? next : [emptyQuote(true)] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Request title is required.');
    if (!form.scopeDetails.trim()) return setError('Scope details are required.');
    if (!form.estimatedValue || Number(form.estimatedValue) <= 0) return setError('Estimated value must be greater than zero.');
    if (!validQuotes.length) return setError('At least one supplier quotation is required.');
    if (needsJustification && !form.fewerThan3Justification.trim()) return setError('Justification is required when fewer than 3 quotations are provided.');
    if (!validQuotes.some(q => q.isSelected)) return setError('Select one supplier quotation.');

    setSaving(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        financialYear: Number(form.financialYear),
        currentCostBudget: Number(form.currentCostBudget || 0),
        estimatedValue: Number(form.estimatedValue),
        savings: form.savings === '' ? undefined : Number(form.savings),
        quotations: validQuotes.map(q => {
          const clean = { ...q, quoteValue: Number(q.quoteValue) };
          delete clean._uid;
          return clean;
        }),
      });
    } catch (err) {
      setError(err.message || 'Failed to create CAPEX request.');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="New CAPEX Request"
      subtitle="Capture governance, quotation, risk, and budget details for approval routing."
      onClose={onCancel}
      maxWidth={920}
    >
      {error && <div style={s.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={s.grid3}>
          <Field label="Request Title *" wide>
            <input style={s.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Station canopy upgrade" />
          </Field>
          <Field label="Department *">
            <SelectField style={s.input} value={form.department} onChange={v => set('department', v)} options={DEPT_NAMES} aria-label="Department" />
          </Field>
          <Field label="Business / Function">
            <SelectField style={s.input} value={form.businessFunction} onChange={v => set('businessFunction', v)} options={DEPT_NAMES} aria-label="Business / Function" />
          </Field>
          <Field label="Budget Holder">
            <input style={s.input} value={form.budgetHolder} onChange={e => set('budgetHolder', e.target.value)} placeholder="Name" />
          </Field>
          <Field label="Financial Year *" hint="Budget year for approval and reporting.">
            <SelectField style={s.input} value={form.financialYear} onChange={v => set('financialYear', v)} options={fyOptions} aria-label="Financial Year" />
          </Field>
          <Field label="Current Cost / Budget">
            <input style={s.input} type="number" min="0" step="0.001" value={form.currentCostBudget} onChange={e => set('currentCostBudget', e.target.value)} />
          </Field>
          <Field label="Estimated Value (OMR) *">
            <input style={s.input} type="number" min="0" step="0.001" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} />
          </Field>
        </div>

        <div style={s.bandRow}>
          <span style={s.badge}>Value band: {band}</span>
          <Checkbox style={s.check} checked={form.urgent} onChange={c => set('urgent', c)} label="Urgent requirement" />
        </div>

        <Field label="Scope Details *">
          <textarea style={{ ...s.input, minHeight: 78 }} value={form.scopeDetails} onChange={e => set('scopeDetails', e.target.value)} placeholder="Describe the scope and business need." />
        </Field>

        <div style={s.grid3}>
          <Field label="Frequency">
            <SelectField style={s.input} value={form.frequency} onChange={v => set('frequency', v)} options={['One-time', 'Annual', '2 years', 'Recurring']} aria-label="Frequency" />
          </Field>
          <Field label="Volume / Year">
            <input style={s.input} value={form.volumePerYear} onChange={e => set('volumePerYear', e.target.value)} />
          </Field>
          <Field label="HSSE Risk">
            <SelectField style={s.input} value={form.hsseRisk} onChange={v => set('hsseRisk', v)} options={['Low', 'Medium', 'High']} aria-label="HSSE Risk" />
          </Field>
          <Field label="Worker Welfare Risk">
            <SelectField style={s.input} value={form.workerWelfareRisk} onChange={v => set('workerWelfareRisk', v)} options={['Low', 'Medium', 'High']} aria-label="Worker Welfare Risk" />
          </Field>
          <Field label="Savings">
            <input style={s.input} type="number" step="0.001" value={form.savings} onChange={e => set('savings', e.target.value)} />
          </Field>
          <Field label="ROI">
            <input style={s.input} value={form.roi} onChange={e => set('roi', e.target.value)} />
          </Field>
        </div>

        <div style={s.sectionTitleRow}>
          <h4 style={s.sectionTitle}>Supplier Quotations</h4>
          <button type="button" style={s.secondaryBtn} onClick={addQuote}>+ Add Quote</button>
        </div>
        <div style={s.quoteList}>
          {form.quotations.map((q, i) => (
            <div key={q._uid} style={s.quoteRow}>
              <input style={s.input} placeholder="Supplier" value={q.supplierName} onChange={e => setQuote(i, 'supplierName', e.target.value)} />
              <input style={s.input} type="number" min="0" step="0.001" placeholder="Quote value" value={q.quoteValue} onChange={e => setQuote(i, 'quoteValue', e.target.value)} />
              <input style={s.input} placeholder="Payment terms" value={q.paymentTerms} onChange={e => setQuote(i, 'paymentTerms', e.target.value)} />
              <input style={s.input} placeholder="Attachment filename" value={q.attachmentName} onChange={e => setQuote(i, 'attachmentName', e.target.value)} />
              <label style={s.radio}><input type="radio" checked={q.isSelected} onChange={() => setQuote(i, 'isSelected', true)} /> Selected</label>
              <button type="button" style={s.removeBtn} onClick={() => removeQuote(i)}>Remove</button>
            </div>
          ))}
        </div>

        {needsJustification && (
          <Field label="Justification for fewer than 3 quotations *">
            <textarea style={{ ...s.input, minHeight: 68 }} value={form.fewerThan3Justification} onChange={e => set('fewerThan3Justification', e.target.value)} />
          </Field>
        )}

        <div style={s.grid3}>
          <Field label="Payment Terms">
            <input style={s.input} value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} />
          </Field>
          <Checkbox style={{ ...s.check, alignSelf: 'end' }} checked={form.paymentTermsAgreed} onChange={c => set('paymentTermsAgreed', c)} label="Payment terms agreed" />
        </div>

        <div style={s.actions}>
          <button type="button" style={s.secondaryBtn} onClick={onCancel}>Cancel</button>
          <button type="submit" style={s.primaryBtn} disabled={saving}>{saving ? 'Submitting...' : 'Submit CAPEX Request'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children, wide, hint }) {
  return (
    <label style={{ ...s.field, ...(wide ? { gridColumn: '1 / -1' } : {}) }}>
      <span style={s.label}>{label}</span>
      {children}
      {hint && <span style={s.hint}>{hint}</span>}
    </label>
  );
}

const s = {
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 850, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  hint: { marginTop: -1, fontSize: 11, color: 'var(--label-tertiary)', fontWeight: 600, lineHeight: 1.35 },
  input: {
    border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 11px',
    fontSize: 13,
    color: 'var(--label)',
    background: '#FFFFFF',
    fontFamily: 'inherit',
    width: '100%',
  },
  bandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  badge: { background: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)', border: '1px solid var(--accent-amber-line)', borderRadius: 'var(--radius-pill)', padding: '5px 12px', fontSize: 12, fontWeight: 850 },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-600)' },
  sectionTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 10px' },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 850, color: 'var(--label)' },
  quoteList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  quoteRow: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.8fr 0.8fr 1fr 92px 72px',
    gap: 8,
    alignItems: 'center',
    background: 'var(--gray-50)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    padding: 10,
  },
  radio: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--label-secondary)' },
  error: { background: 'var(--accent-red-bg)', color: 'var(--shell-red-dark)', border: '1px solid var(--accent-red-line)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, fontSize: 13 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  primaryBtn: { padding: '9px 18px', background: 'var(--shell-red)', color: '#fff', border: '1px solid var(--shell-red-dark)', borderRadius: 'var(--radius-sm)', fontWeight: 850, cursor: 'pointer' },
  secondaryBtn: { padding: '8px 14px', background: '#FFFFFF', color: 'var(--gray-700)', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontWeight: 850, cursor: 'pointer' },
  removeBtn: { padding: '8px 10px', background: 'var(--accent-red-bg)', color: 'var(--shell-red-dark)', border: '1px solid var(--accent-red-line)', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' },
};
