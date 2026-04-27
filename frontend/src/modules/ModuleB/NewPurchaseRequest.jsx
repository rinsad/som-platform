import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPR } from '../../services/prService';

const DEPARTMENTS = [
  'Admin', 'Finance', 'HR', 'Infrastructure',
  'IT', 'Logistics', 'Operations', 'QHSE', 'Retail',
];

function calcTier(value) {
  if (value <= 25000)  return 'LOW';
  if (value <= 300000) return 'MEDIUM';
  return 'HIGH';
}

const TIER_CONFIG = {
  LOW:    { label: 'LOW — Department Manager approval',    bg: 'rgba(52,211,153,0.12)',  color: '#34d399', border: 'rgba(52,211,153,0.30)' },
  MEDIUM: { label: 'MEDIUM — Dept + Finance approval',     bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.30)' },
  HIGH:   { label: 'HIGH — Executive Committee approval',  bg: 'rgba(220,38,38,0.12)',   color: '#ff6b6b', border: 'rgba(220,38,38,0.30)' },
};

function emptyRow() {
  return { id: Date.now() + Math.random(), description: '', quantity: '', unitPrice: '' };
}

export default function NewPurchaseRequest() {
  const navigate = useNavigate();

  // Pre-fill from logged-in user profile
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('som_user') || '{}'); } catch { return {}; } })();

  const [title, setTitle]           = useState('');
  const [department, setDepartment] = useState(storedUser.department || '');
  const [description, setDescription] = useState('');
  const [rows, setRows]             = useState([emptyRow()]);
  const [quotes, setQuotes]         = useState([]);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [tier, setTier]             = useState('LOW');

  const totalValue = rows.reduce((sum, r) => {
    const qty = parseFloat(r.quantity) || 0;
    const up  = parseFloat(r.unitPrice) || 0;
    return sum + qty * up;
  }, 0);

  const quoteCount = quotes.length;
  const needsJustification = quoteCount < 3;

  // Live tier recalculation
  useEffect(() => {
    setTier(calcTier(totalValue));
  }, [totalValue]);

  // ── Line item handlers ──────────────────────────────────────────────────────
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (id) =>
    setRows((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);

  const updateRow = (id, field, value) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    const payload = {
      title,
      department,
      description,
      requestorName: storedUser.name || 'Unknown',
      totalValue,
      quoteCount,
      justification: needsJustification ? justification : undefined,
      lineItems: rows.map((r) => ({
        description: r.description,
        quantity:  parseFloat(r.quantity)  || 0,
        unitPrice: parseFloat(r.unitPrice) || 0,
        lineTotal: (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0),
      })),
    };

    try {
      await createPR(payload);
      navigate('/purchase-requests');
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tierCfg = TIER_CONFIG[tier];

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHeader}>
        <button onClick={() => navigate('/purchase-requests')} style={s.backBtn}>← Back</button>
        <div>
          <h1 style={s.heading}>New Purchase Request</h1>
          <p style={s.subheading}>Complete all sections before submitting</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={s.layout}>
          {/* ── Left column ─────────────────────────────────────── */}
          <div style={s.mainCol}>

            {/* Basic details */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Request Details</h2>

              <div style={s.field}>
                <label style={s.label}>PR Title <span style={s.req}>*</span></label>
                <input
                  data-testid="input-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Generator Maintenance Equipment"
                  required
                  style={s.input}
                />
              </div>

              <div style={s.row2}>
                <div style={s.field}>
                  <label style={s.label}>Department <span style={s.req}>*</span></label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                    style={s.select}
                  >
                    <option value="">Select department…</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose and scope of this purchase…"
                  rows={3}
                  style={s.textarea}
                />
              </div>
            </div>

            {/* Line items */}
            <div style={s.card}>
              <div style={s.cardTitleRow}>
                <h2 style={s.cardTitle}>Line Items</h2>
                <button type="button" onClick={addRow} style={s.addRowBtn}>+ Add Row</button>
              </div>

              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Description', 'Qty', 'Unit Price (OMR)', 'Line Total', ''].map((h) => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const lineTotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0);
                      return (
                        <tr key={row.id} style={i % 2 === 1 ? s.trAlt : {}}>
                          <td style={s.tdInput}>
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                              placeholder="Item description"
                              style={s.cellInput}
                            />
                          </td>
                          <td style={s.tdInput}>
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                              placeholder="Quantity"
                              min="0"
                              style={{ ...s.cellInput, textAlign: 'right' }}
                            />
                          </td>
                          <td style={s.tdInput}>
                            <input
                              type="number"
                              value={row.unitPrice}
                              onChange={(e) => updateRow(row.id, 'unitPrice', e.target.value)}
                              placeholder="Unit Price"
                              min="0"
                              step="0.01"
                              style={{ ...s.cellInput, textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ ...s.td, textAlign: 'right', fontWeight: 600, color: 'var(--gray-800)' }}>
                            {lineTotal > 0 ? `OMR ${lineTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              style={s.removeBtn}
                              title="Remove row"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div style={s.totalRow}>
                <span style={s.totalLabel}>Total Value</span>
                <span data-testid="total-value" style={s.totalValue}>
                  OMR {totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Quotes */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Quote Attachments</h2>
              <p style={s.cardHint}>Minimum 3 competitive quotes are required per sourcing policy.</p>

              <div style={s.quoteRow}>
                <label style={s.fileLabel}>
                  <span style={s.fileBtn}>Attach Quotes</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setQuotes(Array.from(e.target.files))}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{
                  ...s.quoteCount,
                  color: needsJustification ? '#ff6b6b' : '#34d399',
                  background: needsJustification ? 'rgba(220,38,38,0.12)' : 'rgba(52,211,153,0.12)',
                  border: `1px solid ${needsJustification ? 'rgba(220,38,38,0.30)' : 'rgba(52,211,153,0.30)'}`,
                }}>
                  {quoteCount} of 3 quotes
                </span>
              </div>

              {/* Quote file list */}
              {quotes.length > 0 && (
                <div style={s.fileList}>
                  {quotes.map((f, i) => (
                    <div key={i} style={s.fileItem}>
                      <span style={s.fileIcon}>📄</span>
                      <span style={s.fileName}>{f.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quote warning */}
              {needsJustification && (
                <div data-testid="quote-warning" style={s.quoteWarning}>
                  ⚠ Minimum 3 quotes required. Add justification or attach more quotes.
                </div>
              )}

              {/* Justification */}
              {needsJustification && (
                <div style={{ ...s.field, marginTop: '16px' }}>
                  <label style={s.label}>Justification <span style={s.req}>*</span></label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explain why fewer than 3 quotes are being submitted…"
                    rows={3}
                    style={s.textarea}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Right sidebar ────────────────────────────────────── */}
          <div style={s.sideCol}>

            {/* Live Tier Badge */}
            <div style={{ ...s.tierCard, background: tierCfg.bg, borderColor: tierCfg.border }}>
              <p style={s.tierTitle}>Approval Tier</p>
              <div
                data-testid="tier-badge"
                style={{ ...s.tierBadge, color: tierCfg.color, background: tierCfg.bg, borderColor: tierCfg.border }}
              >
                {tierCfg.label}
              </div>
              <p style={{ ...s.tierHint, color: tierCfg.color }}>
                Based on total value of{' '}
                <strong>OMR {totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>

            {/* Summary card */}
            <div style={s.summaryCard}>
              <p style={s.summaryTitle}>Summary</p>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>Line items</span>
                <span style={s.summaryVal}>{rows.length}</span>
              </div>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>Quotes attached</span>
                <span style={{ ...s.summaryVal, color: needsJustification ? '#dc2626' : '#15803d' }}>
                  {quoteCount} / 3
                </span>
              </div>
              <div style={{ ...s.summaryRow, borderTop: '1px solid var(--gray-100)', paddingTop: '10px', marginTop: '4px' }}>
                <span style={s.summaryLabel}>Total Value</span>
                <span style={{ ...s.summaryVal, fontWeight: 700, color: 'var(--gray-900)' }}>
                  OMR {totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{ ...s.submitBtn, ...(submitting ? s.submitBtnDisabled : {}) }}
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>

            {submitError && (
              <div style={s.submitError}>{submitError}</div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

const s = {
  page: { animation: 'fadeIn 0.25s ease' },

  pageHeader: { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' },
  backBtn: { background: 'var(--surface)', border: '1px solid var(--gray-200)', color: 'var(--gray-600)', padding: '8px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', marginTop: '4px', boxShadow: 'var(--shadow-xs)', flexShrink: 0 },
  heading: { fontSize: '24px', fontWeight: '700', color: 'var(--gray-900)', letterSpacing: '-0.4px', marginBottom: '4px' },
  subheading: { fontSize: '14px', color: 'var(--gray-500)' },

  layout: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'flex-start' },
  mainCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sideCol: { display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '20px' },

  card: { background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: '14px', padding: '24px', boxShadow: 'var(--shadow-sm)' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '16px', letterSpacing: '-0.2px' },
  cardTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardHint: { fontSize: '13px', color: 'var(--gray-400)', marginBottom: '14px', marginTop: '-8px' },

  field: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' },
  label: { fontSize: '13px', fontWeight: '500', color: 'var(--gray-600)' },
  req:   { color: '#dc2626' },
  row2:  { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' },

  input: { padding: '10px 13px', fontSize: '14px', border: '1px solid var(--gray-200)', borderRadius: '9px', outline: 'none', color: 'var(--gray-900)', background: 'var(--gray-50)', fontFamily: 'inherit', transition: 'border-color 0.15s', width: '100%' },
  select: { padding: '10px 13px', fontSize: '14px', border: '1px solid var(--gray-200)', borderRadius: '9px', outline: 'none', color: 'var(--gray-900)', background: 'var(--gray-50)', fontFamily: 'inherit', width: '100%' },
  textarea: { padding: '10px 13px', fontSize: '14px', border: '1px solid var(--gray-200)', borderRadius: '9px', outline: 'none', color: 'var(--gray-900)', background: 'var(--gray-50)', fontFamily: 'inherit', resize: 'vertical', width: '100%' },

  addRowBtn: { padding: '5px 13px', background: 'rgba(107,159,255,0.12)', border: '1px solid rgba(107,159,255,0.25)', color: '#6b9fff', borderRadius: '7px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },

  tableWrap: { overflowX: 'auto', marginBottom: '0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' },
  th: { padding: '9px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' },
  td: { padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'middle' },
  tdInput: { padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  trAlt: { background: 'rgba(255,255,255,0.025)' },

  cellInput: { width: '100%', padding: '7px 9px', fontSize: '13.5px', border: '1px solid var(--gray-200)', borderRadius: '7px', outline: 'none', background: 'var(--surface)', fontFamily: 'inherit', color: 'var(--gray-900)' },
  removeBtn: { background: 'transparent', border: 'none', color: 'var(--gray-300)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', borderRadius: '5px', fontFamily: 'inherit', transition: 'color 0.15s' },

  totalRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', padding: '12px 10px 0', borderTop: '2px solid var(--gray-100)', marginTop: '4px' },
  totalLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  totalValue: { fontSize: '18px', fontWeight: '700', color: 'var(--gray-900)', fontVariantNumeric: 'tabular-nums' },

  quoteRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' },
  fileLabel: { cursor: 'pointer' },
  fileBtn: { display: 'inline-block', padding: '8px 16px', background: 'rgba(107,159,255,0.12)', border: '1px solid rgba(107,159,255,0.25)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#6b9fff', cursor: 'pointer' },
  quoteCount: { padding: '5px 12px', borderRadius: '9999px', fontSize: '12.5px', fontWeight: '600' },
  fileList: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' },
  fileItem: { display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: '7px', padding: '6px 10px' },
  fileIcon: { fontSize: '14px' },
  fileName: { fontSize: '12.5px', color: 'var(--gray-600)', fontWeight: '500' },

  quoteWarning: { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', color: '#ff6b6b', borderRadius: '9px', padding: '10px 14px', fontSize: '13px', fontWeight: '500' },

  tierCard: { border: '1px solid', borderRadius: '12px', padding: '18px' },
  tierTitle: { fontSize: '11px', fontWeight: '600', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' },
  tierBadge: { display: 'inline-block', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: '1px solid', marginBottom: '8px' },
  tierHint: { fontSize: '12px', fontWeight: '400' },

  summaryCard: { background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px', boxShadow: 'var(--shadow-xs)' },
  summaryTitle: { fontSize: '12px', fontWeight: '600', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  summaryLabel: { fontSize: '13px', color: 'var(--gray-500)' },
  summaryVal: { fontSize: '13.5px', fontWeight: '600', color: 'var(--gray-700)' },

  submitBtn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #003366, #DD1D21)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(0,51,102,0.25)', transition: 'opacity 0.15s' },
  submitBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  submitError: { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', color: '#ff6b6b', padding: '10px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: '500', textAlign: 'center' },
};
