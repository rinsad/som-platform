import { useState } from 'react';
import { DEPT_NAMES } from '../../services/capexService';

export default function ManualEntryModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    entryType: 'Actual',
    department: DEPT_NAMES[0],
    period: new Date().toISOString().slice(0, 7),
    amount: '',
    description: '',
    referenceNumber: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch {
      setError('Failed to save entry. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={s.title}>Add Manual Entry</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p style={s.subtitle}>
          Record a non-GSAP transaction against the Capex budget with a standardized structure.
        </p>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.row}>
            <div style={s.field}>
              <label htmlFor="me-entryType" style={s.label}>Entry Type *</label>
              <select id="me-entryType" style={s.input} value={form.entryType} onChange={(e) => set('entryType', e.target.value)}>
                <option>Actual</option>
                <option>PO Commitment</option>
                <option>Budget Adjustment</option>
              </select>
            </div>
            <div style={s.field}>
              <label htmlFor="me-department" style={s.label}>Department *</label>
              <select id="me-department" style={s.input} value={form.department} onChange={(e) => set('department', e.target.value)}>
                {DEPT_NAMES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label htmlFor="me-period" style={s.label}>Period (YYYY-MM) *</label>
              <input
                id="me-period"
                style={s.input}
                type="month"
                value={form.period}
                onChange={(e) => set('period', e.target.value)}
                required
              />
            </div>
            <div style={s.field}>
              <label htmlFor="me-amount" style={s.label}>Amount (OMR) *</label>
              <input
                id="me-amount"
                style={s.input}
                type="number"
                step="0.001"
                placeholder="0.000"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
          </div>

          <div style={s.fieldFull}>
            <label htmlFor="me-description" style={s.label}>Description</label>
            <input
              id="me-description"
              style={s.input}
              type="text"
              placeholder="Brief description of the transaction"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div style={s.fieldFull}>
            <label htmlFor="me-ref" style={s.label}>Reference Number</label>
            <input
              id="me-ref"
              style={s.input}
              type="text"
              placeholder="Invoice / PO / internal reference"
              value={form.referenceNumber}
              onChange={(e) => set('referenceNumber', e.target.value)}
            />
          </div>

          <div style={s.actions}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.submitBtn} disabled={saving}>
              {saving ? 'Saving…' : 'Post Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: 'var(--radius-xl)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.60)',
    border: '1px solid rgba(255,255,255,0.10)',
    padding: '28px 32px',
    width: '100%',
    maxWidth: 540,
    animation: 'fadeIn 0.18s var(--ease)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title:  { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--shell-navy)' },
  closeBtn: {
    background: 'var(--fill-tertiary)', border: 'none',
    borderRadius: 'var(--radius-full)', width: 28, height: 28,
    cursor: 'pointer', fontSize: 13, color: 'var(--label-secondary)',
  },
  subtitle: { fontSize: 13, color: 'var(--label-secondary)', marginBottom: 20 },
  errorBox: {
    background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)',
    color: '#ff6b6b', borderRadius: 'var(--radius-sm)',
    padding: '10px 14px', marginBottom: 16, fontSize: 13,
  },
  row:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  field:    { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldFull:{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  label:    { fontSize: 12, fontWeight: 600, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: {
    border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-sm)',
    padding: '9px 12px',
    fontSize: 14,
    color: 'var(--label)',
    background: 'var(--bg)',
    outline: 'none',
    width: '100%',
  },
  actions:   { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: {
    padding: '9px 20px', background: 'var(--fill-tertiary)',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: 14, fontWeight: 600, color: 'var(--label-secondary)', cursor: 'pointer',
  },
  submitBtn: {
    padding: '9px 24px', background: 'var(--shell-navy)',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
  },
};
