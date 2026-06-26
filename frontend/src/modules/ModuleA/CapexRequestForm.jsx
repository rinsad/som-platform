import { useMemo, useState } from 'react';
import { DEPT_NAMES } from '../../services/capexService';

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
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <h3 style={s.title}>New CAPEX Request</h3>
          <p style={s.subtitle}>Capture governance, quotation, risk, and budget details for approval routing.</p>
        </div>
        <button type="button" onClick={onCancel} style={s.secondaryBtn}>Close</button>
      </div>

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
    </div>
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
  wrap: { background: 'var(--surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: 24, marginBottom: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 },
  title: { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--label)' },
  subtitle: { margin: '4px 0 0', fontSize: 13, color: 'var(--label-secondary)' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 700, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  input: { border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13, color: 'var(--label)', background: 'var(--bg)', fontFamily: 'inherit', width: '100%' },
  bandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  badge: { background: 'rgba(107,159,255,0.12)', color: '#6b9fff', border: '1px solid rgba(107,159,255,0.25)', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700 },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--label-secondary)' },
  sectionTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 10px' },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--label)' },
  quoteList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  quoteRow: { display: 'grid', gridTemplateColumns: '1.1fr 0.8fr 0.8fr 1fr 92px 72px', gap: 8, alignItems: 'center' },
  radio: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--label-secondary)' },
  error: { background: 'rgba(220,38,38,0.12)', color: '#ff6b6b', border: '1px solid rgba(220,38,38,0.30)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, fontSize: 13 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  primaryBtn: { padding: '9px 18px', background: 'var(--shell-red)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { padding: '8px 14px', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' },
  removeBtn: { padding: '8px 10px', background: 'rgba(220,38,38,0.10)', color: '#ff6b6b', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' },
};
