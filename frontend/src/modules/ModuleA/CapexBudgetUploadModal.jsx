import { useState } from 'react';
import { uploadCapexBudget } from '../../services/capexService';

const CURRENT_YEAR = new Date().getFullYear();

export default function CapexBudgetUploadModal({ onClose, onSuccess }) {
  const [file,        setFile]        = useState(null);
  const [fiscalYear,  setFiscalYear]  = useState(String(CURRENT_YEAR));
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState('');
  const [preview,     setPreview]     = useState(null); // parsed rows for preview

  // Parse CSV locally for preview only
  function parsePreview(f) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setPreview([]); return; }
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        const obj  = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
        return obj;
      }).filter(r => r.department && parseFloat(r.total_budget) > 0);
      setPreview(rows);
    };
    reader.readAsText(f);
  }

  function handleFileChange(e) {
    const f = e.target.files[0] || null;
    setFile(f);
    setError('');
    setPreview(null);
    if (f) parsePreview(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file)       { setError('Please select a CSV file.'); return; }
    if (!fiscalYear) { setError('Fiscal year is required.'); return; }
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fiscalYear', fiscalYear);
      const result = await uploadCapexBudget(fd);
      onSuccess(result);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
              Upload Approved Budget
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--gray-400)', margin: '3px 0 0' }}>
              Bulk-load the initial authorised CAPEX budget for the fiscal year.
            </p>
          </div>
          <button onClick={onClose} style={s.closeBtn}>×</button>
        </div>

        {/* Sample download */}
        <a
          href="/capex-budget-template.csv"
          download="capex-budget-template.csv"
          style={s.sampleLink}
        >
          ↓ Download sample CSV template
        </a>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>

          {/* Fiscal year */}
          <div style={s.field}>
            <label style={s.label}>Fiscal Year *</label>
            <input
              type="number"
              min="2020"
              max="2099"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              style={s.input}
            />
          </div>

          {/* File picker */}
          <div style={s.field}>
            <label style={s.label}>CSV File *</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              style={{ ...s.input, color: 'var(--gray-600)', cursor: 'pointer' }}
            />
            {file && (
              <span style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 3 }}>
                {file.name} — {(file.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Preview table */}
          {preview && preview.length > 0 && (
            <div style={s.previewBox}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Preview — {preview.length} row{preview.length !== 1 ? 's' : ''} detected
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Department', 'WBS Code', 'Description', 'Total Budget (OMR)'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--gray-50)' }}>
                        <td style={s.td}>{row.department}</td>
                        <td style={s.td}>{row.wbs_code || '—'}</td>
                        <td style={s.td}>{row.description || '—'}</td>
                        <td style={{ ...s.td, fontWeight: 600, color: 'var(--gray-900)' }}>
                          {Number(row.total_budget).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview !== null && preview.length === 0 && (
            <div style={{ fontSize: 12.5, color: '#fbbf24', background: 'rgba(251,191,36,0.10)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(251,191,36,0.25)' }}>
              No valid rows found. Ensure the CSV has department and total_budget columns.
            </div>
          )}

          {error && (
            <div style={s.errorBox}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
            <button
              type="submit"
              disabled={uploading || (preview !== null && preview.length === 0)}
              style={{ ...s.submitBtn, opacity: uploading ? 0.6 : 1 }}
            >
              {uploading ? <><span style={s.spinner} /> Importing…</> : 'Import Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--surface)', borderRadius: 20, padding: '28px 26px',
    width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 32px 80px rgba(0,0,0,0.50)',
    border: '1px solid var(--gray-200)', animation: 'fadeIn 0.2s ease',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 20, color: 'var(--gray-400)', lineHeight: 1, padding: 2,
  },
  sampleLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 13, fontWeight: 600, color: '#DD1D21',
    background: 'rgba(221,29,33,0.07)', border: '1px solid rgba(221,29,33,0.20)',
    borderRadius: 8, padding: '7px 14px', textDecoration: 'none',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: {
    fontSize: 11.5, fontWeight: 600, color: 'var(--gray-500)',
    textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  input: {
    padding: '10px 12px', fontSize: 14, borderRadius: 10,
    border: '1px solid var(--gray-200)', background: 'var(--gray-50)',
    color: 'var(--gray-900)', fontFamily: 'inherit', outline: 'none', width: '100%',
  },
  previewBox: {
    background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
    borderRadius: 10, padding: '12px 14px',
  },
  th: {
    padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.4px',
    borderBottom: '1px solid var(--gray-200)',
  },
  td: {
    padding: '7px 10px', fontSize: 12.5, color: 'var(--gray-700)',
    borderBottom: '1px solid var(--gray-100)',
  },
  errorBox: {
    fontSize: 12.5, color: '#ff6b6b',
    background: 'rgba(220,38,38,0.10)', borderRadius: 8, padding: '8px 12px',
    border: '1px solid rgba(220,38,38,0.25)',
  },
  cancelBtn: {
    flex: 1, padding: '11px', fontSize: 14, fontWeight: 600,
    borderRadius: 10, border: '1px solid var(--gray-200)',
    background: 'var(--surface)', color: 'var(--gray-600)',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  submitBtn: {
    flex: 1, padding: '11px', fontSize: 14, fontWeight: 600,
    borderRadius: 10, border: 'none', background: '#DD1D21',
    color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 2px 8px rgba(221,29,33,0.30)',
  },
  spinner: {
    width: 14, height: 14,
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'spin 0.75s linear infinite',
    display: 'inline-block',
  },
};
