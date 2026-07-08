import { useMemo, useState } from 'react';
import { DEPT_NAMES } from '../../services/capexService';
import Modal from '../../components/Modal';

function emptyQuote(selected = false) {
  return {
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

export default function CapexRequestForm({ onSubmit, onCancel }) {
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
        quotations: validQuotes.map(q => ({ ...q, quoteValue: Number(q.quoteValue) })),
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
            <select style={s.input} value={form.department} onChange={e => set('department', e.target.value)}>
              {DEPT_NAMES.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Business / Function">
            <select style={s.input} value={form.businessFunction} onChange={e => set('businessFunction', e.target.value)}>
              {DEPT_NAMES.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Budget Holder">
            <input style={s.input} value={form.budgetHolder} onChange={e => set('budgetHolder', e.target.value)} placeholder="Name" />
          </Field>
          <Field label="Financial Year">
            <input style={s.input} type="number" value={form.financialYear} onChange={e => set('financialYear', e.target.value)} />
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
          <label style={s.check}><input type="checkbox" checked={form.urgent} onChange={e => set('urgent', e.target.checked)} /> Urgent requirement</label>
        </div>

        <Field label="Scope Details *">
          <textarea style={{ ...s.input, minHeight: 78 }} value={form.scopeDetails} onChange={e => set('scopeDetails', e.target.value)} placeholder="Describe the scope and business need." />
        </Field>

        <div style={s.grid3}>
          <Field label="Frequency">
            <select style={s.input} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              {['One-time', 'Annual', '2 years', 'Recurring'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Volume / Year">
            <input style={s.input} value={form.volumePerYear} onChange={e => set('volumePerYear', e.target.value)} />
          </Field>
          <Field label="HSSE Risk">
            <select style={s.input} value={form.hsseRisk} onChange={e => set('hsseRisk', e.target.value)}>
              {['Low', 'Medium', 'High'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Worker Welfare Risk">
            <select style={s.input} value={form.workerWelfareRisk} onChange={e => set('workerWelfareRisk', e.target.value)}>
              {['Low', 'Medium', 'High'].map(v => <option key={v}>{v}</option>)}
            </select>
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
            <div key={i} style={s.quoteRow}>
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
          <label style={{ ...s.check, alignSelf: 'end' }}>
            <input type="checkbox" checked={form.paymentTermsAgreed} onChange={e => set('paymentTermsAgreed', e.target.checked)} /> Payment terms agreed
          </label>
        </div>

        <div style={s.actions}>
          <button type="button" style={s.secondaryBtn} onClick={onCancel}>Cancel</button>
          <button type="submit" style={s.primaryBtn} disabled={saving}>{saving ? 'Submitting...' : 'Submit CAPEX Request'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children, wide }) {
  return (
    <label style={{ ...s.field, ...(wide ? { gridColumn: '1 / -1' } : {}) }}>
      <span style={s.label}>{label}</span>
      {children}
    </label>
  );
}

const s = {
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 850, color: '#5B6773', textTransform: 'uppercase', letterSpacing: '0.3px' },
  input: {
    border: '1px solid #C8D0D9',
    borderRadius: 6,
    padding: '10px 11px',
    fontSize: 13,
    color: '#1F2933',
    background: '#FFFFFF',
    fontFamily: 'inherit',
    width: '100%',
  },
  bandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  badge: { background: '#FFF7D1', color: '#805B00', border: '1px solid #F1D36A', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 850 },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4B5563' },
  sectionTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 10px' },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 850, color: '#1F2933' },
  quoteList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  quoteRow: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.8fr 0.8fr 1fr 92px 72px',
    gap: 8,
    alignItems: 'center',
    background: '#F8FAFC',
    border: '1px solid #E0E5EB',
    borderRadius: 8,
    padding: 10,
  },
  radio: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5B6773' },
  error: { background: '#FDECEC', color: '#A91F23', border: '1px solid #F4B8BB', borderRadius: 6, padding: '10px 12px', marginBottom: 14, fontSize: 13 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  primaryBtn: { padding: '9px 18px', background: 'var(--shell-red)', color: '#fff', border: '1px solid #B8161B', borderRadius: 6, fontWeight: 850, cursor: 'pointer' },
  secondaryBtn: { padding: '8px 14px', background: '#FFFFFF', color: '#344054', border: '1px solid #C8D0D9', borderRadius: 6, fontWeight: 850, cursor: 'pointer' },
  removeBtn: { padding: '8px 10px', background: '#FDECEC', color: '#A91F23', border: '1px solid #F4B8BB', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
};
