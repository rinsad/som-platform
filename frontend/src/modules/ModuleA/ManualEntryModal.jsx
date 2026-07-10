import { useState } from 'react';
import { DEPT_NAMES } from '../../services/capexService';
import Modal from '../../components/Modal';
import SelectField from '../../components/SelectField';
import { fieldInputStyle } from '../../components/fieldStyles';

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
    <Modal
      title="Add Manual Entry"
      subtitle="Record a non-GSAP transaction against the Capex budget with a standardized structure."
      onClose={onClose}
    >
      {error && <div style={s.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={s.grid}>
          <div style={s.field}>
            <label htmlFor="me-entryType" style={s.label}>Entry Type *</label>
            <SelectField id="me-entryType" style={s.input} value={form.entryType} onChange={(v) => set('entryType', v)} options={['Actual', 'PO Commitment', 'Budget Adjustment']} aria-label="Entry Type" />
          </div>
          <div style={s.field}>
            <label htmlFor="me-department" style={s.label}>Department *</label>
            <SelectField id="me-department" style={s.input} value={form.department} onChange={(v) => set('department', v)} options={DEPT_NAMES} aria-label="Department" />
          </div>
          <div style={s.field}>
            <label htmlFor="me-period" style={s.label}>Period (YYYY-MM) *</label>
            <input id="me-period" style={s.input} type="month" value={form.period} onChange={(e) => set('period', e.target.value)} required />
          </div>
          <div style={s.field}>
            <label htmlFor="me-amount" style={s.label}>Amount (OMR) *</label>
            <input id="me-amount" style={s.input} type="number" step="0.001" placeholder="0.000" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div style={{ ...s.field, gridColumn: '1 / -1' }}>
            <label htmlFor="me-description" style={s.label}>Description</label>
            <input id="me-description" style={s.input} type="text" placeholder="Brief description of the transaction" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div style={{ ...s.field, gridColumn: '1 / -1' }}>
            <label htmlFor="me-ref" style={s.label}>Reference Number</label>
            <input id="me-ref" style={s.input} type="text" placeholder="Invoice / PO / internal reference" value={form.referenceNumber} onChange={(e) => set('referenceNumber', e.target.value)} />
          </div>
        </div>

        <div style={s.actions}>
          <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="submit" style={s.submitBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Post Entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const s = {
  errorBox: {
    background: 'var(--accent-red-bg)', color: 'var(--shell-red-dark)', border: '1px solid var(--accent-red-line)',
    borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: 14, fontSize: 13,
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' },
  input: fieldInputStyle,
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: {
    padding: '10px 16px', background: '#FFFFFF', border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', cursor: 'pointer', fontFamily: 'inherit',
  },
  submitBtn: {
    padding: '10px 20px', background: 'var(--shell-red)', border: '1px solid var(--shell-red-dark)',
    borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
  },
};
