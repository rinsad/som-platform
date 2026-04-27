import { useState, useEffect, useCallback, useRef } from 'react';
import { getKnowledgeAdmin, deleteKBDocument, uploadDocument, searchKnowledge, embedDocument } from '../../services/portalService';

const SOURCE_BADGES = {
  pdf:    { label: 'PDF',    bg: 'rgba(220,38,38,0.14)',   color: '#ff6b6b', border: 'rgba(220,38,38,0.28)' },
  docx:   { label: 'DOCX',  bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8', border: 'rgba(56,189,248,0.28)' },
  eml:    { label: 'EML',   bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.28)' },
  txt:    { label: 'TXT',   bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.50)', border: 'rgba(255,255,255,0.15)' },
  manual: { label: 'Manual',bg: 'rgba(52,211,153,0.10)',  color: '#34d399', border: 'rgba(52,211,153,0.25)' },
};

const CAT_COLOURS = {
  Policy:    { bg: 'rgba(220,38,38,0.12)',  color: '#ff6b6b' },
  Procedure: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
  QHSE:      { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  HR:        { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
  Finance:   { bg: 'rgba(251,191,36,0.10)', color: '#fbbf24' },
  IT:        { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
  Operations:{ bg: 'rgba(192,132,252,0.12)',color: '#c084fc' },
};

function catColour(cat) {
  return CAT_COLOURS[cat] || { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' };
}

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }) {
  const [title, setTitle]         = useState('');
  const [category, setCategory]   = useState('Procedure');
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!file)         { setError('Please select a file.'); return; }
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('category', category);
      fd.append('file', file);
      onSuccess(await uploadDocument(fd));
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)' }}>Upload Document</h2>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Title *">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Emergency Evacuation Procedure"
              style={inputStyle}
            />
          </Field>

          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              {['Policy','Procedure','QHSE','HR','Finance','IT','Operations'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="File (PDF, DOCX, EML, TXT)">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.eml,.txt,text/plain,application/pdf"
              onChange={(e) => setFile(e.target.files[0] || null)}
              style={{ ...inputStyle, color: 'var(--gray-700)' }}
            />
            {file && (
              <span style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 4 }}>
                {file.name} — {fmtSize(file.size)}
              </span>
            )}
          </Field>

          {error && (
            <div style={{ fontSize: 12.5, color: '#ff6b6b', background: 'rgba(220,38,38,0.10)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(220,38,38,0.25)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
            <button type="submit" disabled={uploading} style={{ ...submitBtn, opacity: uploading ? 0.6 : 1 }}>
              {uploading ? (
                <><span style={spinner} /> Uploading…</>
              ) : 'Upload & Index'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────
function ConfirmDelete({ doc, onConfirm, onCancel }) {
  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 380 }}>
        <div style={{ fontSize: 28, marginBottom: 14, textAlign: 'center' }}>🗑️</div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', textAlign: 'center', marginBottom: 8 }}>
          Remove document?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', textAlign: 'center', lineHeight: 1.6, marginBottom: 22 }}>
          <strong style={{ color: 'var(--gray-800)' }}>{doc.title}</strong>
          {' '}will be permanently removed from the knowledge base along with all its indexed chunks. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={cancelBtn}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ ...submitBtn, background: '#DC2626', boxShadow: '0 2px 8px rgba(220,38,38,0.30)' }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KBManagement() {
  const [docs, setDocs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [ftsIds, setFtsIds]           = useState(null);
  const [showUpload, setShowUpload]   = useState(false);
  const [confirmDoc, setConfirmDoc]   = useState(null);
  const [toast, setToast]             = useState('');
  const [embeddingId, setEmbeddingId] = useState(null); // doc currently being embedded
  const debounceRef                   = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setDocs(await getKnowledgeAdmin()); }
    catch { setError('Failed to load knowledge base.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounced FTS: run content search 350ms after user stops typing
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!search.trim()) { setFtsIds(null); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchKnowledge(search.trim());
        setFtsIds(new Set(results.map(r => r.id)));
      } catch {
        setFtsIds(null); // fall back to metadata filter on error
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function handleUploadSuccess(result) {
    setShowUpload(false);
    showToast(`"${result.title}" uploaded and indexed (${result.chunks} chunk${result.chunks !== 1 ? 's' : ''}).`);
    load();
  }

  async function handleDelete() {
    const doc = confirmDoc;
    setConfirmDoc(null);
    try {
      await deleteKBDocument(doc.id);
      showToast(`"${doc.title}" removed from knowledge base.`);
      load();
    } catch {
      setError(`Failed to delete "${doc.title}".`);
    }
  }

  async function handleEmbed(doc) {
    setEmbeddingId(doc.id);
    try {
      const result = await embedDocument(doc.id);
      showToast(`"${doc.title}" — ${result.chunksEmbedded} chunk${result.chunksEmbedded !== 1 ? 's' : ''} embedded for semantic search.`);
      load();
    } catch (err) {
      setError(err.message?.includes('OPENAI_API_KEY')
        ? 'Semantic search is not configured — add OPENAI_API_KEY to the server environment.'
        : `Failed to embed "${doc.title}".`);
    } finally {
      setEmbeddingId(null);
    }
  }

  const filtered = docs.filter((d) => {
    if (!search.trim()) return true;
    // If FTS results are ready, match by doc ID (content search)
    if (ftsIds !== null) return ftsIds.has(d.id);
    // While FTS is pending, fall back to metadata filter
    return (
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.uploadedBy || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleUploadSuccess} />}
      {confirmDoc  && <ConfirmDelete doc={confirmDoc} onConfirm={handleDelete} onCancel={() => setConfirmDoc(null)} />}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '-0.4px', marginBottom: 4 }}>
            Knowledge Base
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>
            Manage documents available to all portal visitors — upload, index, and remove.
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} style={newBtn}>
          ↑ Upload Document
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ fontSize: 13, color: '#34d399', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10, padding: '11px 16px', marginBottom: 16 }}>
          ✓ {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 13, color: '#ff6b6b', background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.28)', borderRadius: 10, padding: '11px 16px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Documents', value: docs.length },
          { label: 'Uploaded Files',  value: docs.filter(d => d.sourceType !== 'manual').length },
          { label: 'Total Chunks',    value: docs.reduce((s, d) => s + (d.chunkCount || 0), 0) },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '14px 20px', boxShadow: 'var(--shadow-xs)', minWidth: 140 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by title, content, category, or uploader…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '10px 14px', fontSize: 14, borderRadius: 10, border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)', fontFamily: 'inherit', outline: 'none', width: '100%', maxWidth: 380, boxShadow: 'var(--shadow-xs)' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 70px 130px 70px 110px 80px', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
          {['Title', 'Category', 'Source', 'Version', 'Uploaded by', 'Chunks', 'AI Search', ''].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{ width: 26, height: 26, border: '3px solid rgba(255,255,255,0.10)', borderTopColor: '#DD1D21', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--gray-400)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
            {search ? `No documents matching "${search}"` : 'No documents yet — upload one to get started.'}
          </div>
        ) : (
          filtered.map((doc, i) => {
            const src = SOURCE_BADGES[doc.sourceType] || SOURCE_BADGES.manual;
            const cc  = catColour(doc.category);
            return (
              <div
                key={doc.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 90px 70px 130px 70px 110px 80px',
                  gap: 12, padding: '14px 20px', alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '1px solid var(--gray-100)',
                  transition: 'background 0.1s',
                }}
              >
                {/* Title */}
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 2 }}>
                    {doc.title}
                  </div>
                  {doc.originalFilename && (
                    <div style={{ fontSize: 11.5, color: 'var(--gray-400)' }}>📎 {doc.originalFilename}</div>
                  )}
                </div>

                {/* Category */}
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: cc.bg, color: cc.color }}>
                  {doc.category || '—'}
                </span>

                {/* Source */}
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.2px', background: src.bg, color: src.color, border: `1px solid ${src.border}` }}>
                  {src.label}
                </span>

                {/* Version */}
                <span style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600 }}>
                  {doc.version ? `v${doc.version}` : '—'}
                </span>

                {/* Uploaded by */}
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-700)' }}>{doc.uploadedBy || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                    {doc.lastUpdated ? new Date(doc.lastUpdated).toLocaleDateString('en-GB') : ''}
                  </div>
                </div>

                {/* Chunks */}
                <span style={{ fontSize: 12.5, color: 'var(--gray-400)', fontWeight: 500 }}>
                  {doc.chunkCount ?? '—'}
                </span>

                {/* AI Search status */}
                <div>
                  {doc.embeddedAt ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#34d399' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
                      Ready
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEmbed(doc)}
                      disabled={embeddingId === doc.id}
                      title="Generate semantic embeddings for AI search"
                      style={{
                        padding: '4px 10px', fontSize: 11.5, fontWeight: 600,
                        borderRadius: 7, border: '1px solid rgba(99,102,241,0.35)',
                        background: 'rgba(99,102,241,0.08)', color: '#818cf8',
                        cursor: embeddingId === doc.id ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', opacity: embeddingId === doc.id ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {embeddingId === doc.id ? '…' : '✦ Enable'}
                    </button>
                  )}
                </div>

                {/* Actions */}
                <button
                  onClick={() => setConfirmDoc(doc)}
                  title="Remove document"
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 600,
                    borderRadius: 8, border: '1px solid rgba(220,38,38,0.30)',
                    background: 'rgba(220,38,38,0.08)', color: '#ff6b6b',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gray-400)', textAlign: 'right' }}>
        {filtered.length} of {docs.length} document{docs.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999, backdropFilter: 'blur(4px)',
};
const modal = {
  background: 'var(--surface)', borderRadius: 20, padding: '32px 28px',
  width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,0.50)',
  border: '1px solid var(--gray-200)', animation: 'fadeIn 0.2s ease',
};
const closeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 20, color: 'var(--gray-400)', lineHeight: 1, padding: 2,
};
const inputStyle = {
  padding: '10px 12px', fontSize: 14, borderRadius: 10,
  border: '1px solid var(--gray-200)', background: 'var(--gray-50)',
  color: 'var(--gray-900)', fontFamily: 'inherit', outline: 'none', width: '100%',
};
const cancelBtn = {
  flex: 1, padding: '11px', fontSize: 14, fontWeight: 600,
  borderRadius: 10, border: '1px solid var(--gray-200)',
  background: 'var(--surface)', color: 'var(--gray-600)',
  cursor: 'pointer', fontFamily: 'inherit',
};
const submitBtn = {
  flex: 1, padding: '11px', fontSize: 14, fontWeight: 600,
  borderRadius: 10, border: 'none', background: '#DD1D21',
  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  boxShadow: '0 2px 8px rgba(221,29,33,0.30)',
};
const newBtn = {
  padding: '9px 18px', fontSize: 13.5, fontWeight: 600,
  borderRadius: 10, border: 'none', background: '#DD1D21',
  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', gap: 6,
  boxShadow: '0 2px 10px rgba(221,29,33,0.35)',
};
const spinner = {
  width: 14, height: 14,
  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
  borderRadius: '50%', animation: 'spin 0.75s linear infinite',
  display: 'inline-block',
};
