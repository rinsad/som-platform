import { useState } from 'react';
import { DEPT_NAMES } from '../../services/capexService';

export default function CapexInitiationForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    department: DEPT_NAMES[0],
    initiator: '',
    projectType: 'New',
    estimatedBudget: '',
    priority: 'Medium',
    startDate: '',
    endDate: '',
    stakeholders: '',
    justification: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Project title is required.'); return; }
    if (!form.estimatedBudget || Number(form.estimatedBudget) <= 0) {
      setError('Please enter a valid estimated budget.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ ...form, estimatedBudget: Number(form.estimatedBudget) });
    } catch {
      setError('Failed to submit initiation. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.formHeader}>
        <div>
          <h3 style={s.formTitle}>New Capex Initiation</h3>
          <p style={s.formSubtitle}>Capture the initial requirement and parties involved for review and budget approval.</p>
        </div>
        <button style={s.cancelBtn} onClick={onCancel}>Discard</button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Row 1 */}
        <div style={s.row}>
          <div style={{ ...s.field, gridColumn: '1 / -1' }}>
            <label style={s.label}>Project Title *</label>
            <input style={s.input} type="text" placeholder="e.g. Solar Panel Installation — Al Khuwair Station"
              value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
        </div>

        {/* Row 2 */}
        <div style={s.row}>
          <div style={s.field}>
            <label htmlFor="ci-department" style={s.label}>Department *</label>
            <select id="ci-department" style={s.input} value={form.department} onChange={(e) => set('department', e.target.value)}>
              {DEPT_NAMES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label htmlFor="ci-initiator" style={s.label}>Initiator / Sponsor</label>
            <input id="ci-initiator" style={s.input} type="text" placeholder="Full name"
              value={form.initiator} onChange={(e) => set('initiator', e.target.value)} />
          </div>
          <div style={s.field}>
            <label htmlFor="ci-projectType" style={s.label}>Project Type</label>
            <select id="ci-projectType" style={s.input} value={form.projectType} onChange={(e) => set('projectType', e.target.value)}>
              {['New', 'Replacement', 'Upgrade', 'Expansion'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3 */}
        <div style={s.row}>
          <div style={s.field}>
            <label htmlFor="ci-budget" style={s.label}>Estimated Budget (OMR) *</label>
            <input id="ci-budget" style={s.input} type="number" step="0.001" placeholder="0.000"
              value={form.estimatedBudget} onChange={(e) => set('estimatedBudget', e.target.value)} />
          </div>
          <div style={s.field}>
            <label htmlFor="ci-priority" style={s.label}>Priority</label>
            <select id="ci-priority" style={s.input} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Proposed Start Date</label>
            <input style={s.input} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Proposed End Date</label>
            <input style={s.input} type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </div>
        </div>

        {/* Row 4 */}
        <div style={{ ...s.row, gridTemplateColumns: '1fr' }}>
          <div style={s.field}>
            <label style={s.label}>Parties / Stakeholders Involved</label>
            <input style={s.input} type="text" placeholder="e.g. Finance, QHSE, IT Team (comma separated)"
              value={form.stakeholders} onChange={(e) => set('stakeholders', e.target.value)} />
          </div>
        </div>

        {/* Row 5 */}
        <div style={{ ...s.row, gridTemplateColumns: '1fr' }}>
          <div style={s.field}>
            <label style={s.label}>Description</label>
            <textarea style={{ ...s.input, minHeight: 72, resize: 'vertical' }} placeholder="Brief description of the capital requirement…"
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>

        {/* Row 6 */}
        <div style={{ ...s.row, gridTemplateColumns: '1fr' }}>
          <div style={s.field}>
            <label style={s.label}>Business Justification</label>
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} placeholder="Strategic rationale, cost-benefit, regulatory requirement…"
              value={form.justification} onChange={(e) => set('justification', e.target.value)} />
          </div>
        </div>

        <div style={s.actions}>
          <button type="button" style={s.cancelBtnSm} onClick={onCancel}>Cancel</button>
          <button type="submit" style={s.submitBtn} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </form>
    </div>
  );
}

const s = {
  wrap: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-card)',
    padding: '28px 32px',
    marginBottom: 24,
    animation: 'fadeIn 0.2s var(--ease)',
  },
  formHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20,
  },
  formTitle:    { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--shell-navy)' },
  formSubtitle: { margin: '4px 0 0', fontSize: 13, color: 'var(--label-secondary)' },
  errorBox: {
    background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)',
    color: '#ff6b6b', borderRadius: 'var(--radius-sm)',
    padding: '10px 14px', marginBottom: 16, fontSize: 13,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 16,
  },
  field:  { display: 'flex', flexDirection: 'column', gap: 6 },
  label:  { fontSize: 11, fontWeight: 600, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: {
    border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-sm)',
    padding: '9px 12px',
    fontSize: 14,
    color: 'var(--label)',
    background: 'var(--bg)',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  },
  actions:     { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtnSm: {
    padding: '9px 20px', background: 'var(--fill-tertiary)',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: 14, fontWeight: 600, color: 'var(--label-secondary)', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '7px 16px', background: 'var(--fill-tertiary)',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 600, color: 'var(--label-secondary)', cursor: 'pointer',
  },
  submitBtn: {
    padding: '9px 24px', background: 'var(--shell-navy)',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
  },
};
