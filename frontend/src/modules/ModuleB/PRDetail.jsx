import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPRById, approvePR, getDocuments, uploadDocument } from '../../services/prService';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtOMR(v) {
  return 'OMR ' + Number(v).toLocaleString('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

const TIER_STYLE = {
  LOW:    { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', border: 'rgba(52,211,153,0.30)' },
  MEDIUM: { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.30)' },
  HIGH:   { bg: 'rgba(220,38,38,0.12)',   color: '#ff6b6b', border: 'rgba(220,38,38,0.30)' },
};

const STATUS_STYLE = {
  DRAFT:            { bg: 'rgba(255,255,255,0.07)',  color: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.15)' },
  PENDING_APPROVAL: { bg: 'rgba(107,159,255,0.15)', color: '#6b9fff',                border: 'rgba(107,159,255,0.30)' },
  APPROVED:         { bg: 'rgba(52,211,153,0.12)',  color: '#34d399',                border: 'rgba(52,211,153,0.30)' },
  REJECTED:         { bg: 'rgba(220,38,38,0.12)',   color: '#ff6b6b',                border: 'rgba(220,38,38,0.30)' },
};

const STATUS_LABEL = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved', REJECTED: 'Rejected',
};

const DECISION_ICON = { APPROVED: '✓', REJECTED: '✕', RETURNED: '↩' };
const DECISION_COLOR = { APPROVED: '#34d399', REJECTED: '#ff6b6b', RETURNED: '#fbbf24' };

const DOC_TYPE_ICON = { Quote: '📋', Scope: '📐', Technical: '⚙️', Document: '📄' };

function Badge({ text, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 12px', borderRadius: 9999,
      fontSize: 12, fontWeight: 700,
      border: `1px solid ${style.border}`,
      background: style.bg, color: style.color,
    }}>
      {text}
    </span>
  );
}

// ── Approval Timeline ─────────────────────────────────────────────────────────
function ApprovalTimeline({ workflow = [], history = [], status }) {
  // Map each workflow step to its history entry (if completed)
  const steps = workflow.map((step, i) => {
    const done = history[i];
    return { ...step, done };
  });

  return (
    <div style={tl.wrap}>
      {steps.map((step, i) => {
        const isComplete = !!step.done;
        const isCurrent  = !isComplete && steps.slice(0, i).every((s) => s.done);
        const isPending  = !isComplete && !isCurrent;
        const decision   = step.done?.decision;

        return (
          <div key={i} style={tl.step}>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{ ...tl.line, background: isComplete ? '#22c55e' : 'var(--gray-200)' }} />
            )}
            {/* Node */}
            <div style={{
              ...tl.node,
              background: isComplete
                ? (decision === 'REJECTED' ? 'rgba(220,38,38,0.15)' : 'rgba(52,211,153,0.15)')
                : isCurrent ? 'rgba(107,159,255,0.15)' : 'var(--gray-50)',
              border: `2px solid ${isComplete
                ? (decision === 'REJECTED' ? 'rgba(220,38,38,0.35)' : 'rgba(52,211,153,0.35)')
                : isCurrent ? 'rgba(107,159,255,0.40)' : 'var(--gray-200)'}`,
            }}>
              <div style={{
                ...tl.nodeIcon,
                color: isComplete
                  ? DECISION_COLOR[decision] || '#15803d'
                  : isCurrent ? '#1d4ed8' : 'var(--gray-400)',
              }}>
                {isComplete ? (DECISION_ICON[decision] || '✓') : isCurrent ? '●' : '○'}
              </div>
            </div>
            {/* Content */}
            <div style={tl.content}>
              <p style={tl.stepLabel}>{step.label}</p>
              {isComplete ? (
                <>
                  <p style={{ ...tl.stepMeta, color: DECISION_COLOR[decision] || '#15803d' }}>
                    {decision} by {step.done.approver}
                    {step.done.role ? ` (${step.done.role})` : ''} · {step.done.date}
                  </p>
                  {step.done.comment && (
                    <p style={tl.comment}>"{step.done.comment}"</p>
                  )}
                </>
              ) : isCurrent ? (
                <p style={{ ...tl.stepMeta, color: '#1d4ed8' }}>Awaiting approval</p>
              ) : (
                <p style={tl.stepMeta}>Pending</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Final outcome if fully approved/rejected */}
      {(status === 'APPROVED' || status === 'REJECTED') && (
        <div style={tl.step}>
          <div style={{
            ...tl.node,
            background: status === 'APPROVED' ? 'rgba(52,211,153,0.15)' : 'rgba(220,38,38,0.15)',
            border: `2px solid ${status === 'APPROVED' ? '#34d399' : '#ff6b6b'}`,
          }}>
            <div style={{ ...tl.nodeIcon, color: status === 'APPROVED' ? '#34d399' : '#ff6b6b', fontSize: 16 }}>
              {status === 'APPROVED' ? '✓' : '✕'}
            </div>
          </div>
          <div style={tl.content}>
            <p style={{ ...tl.stepLabel, color: status === 'APPROVED' ? '#34d399' : '#ff6b6b' }}>
              PR {status === 'APPROVED' ? 'Approved' : 'Rejected'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const tl = {
  wrap:      { display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' },
  step:      { display: 'grid', gridTemplateColumns: '36px 1fr', gap: 14, alignItems: 'flex-start', paddingBottom: 24, position: 'relative' },
  line:      { position: 'absolute', left: 17, top: 36, width: 2, height: 'calc(100% - 16px)', zIndex: 0 },
  node:      { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 },
  nodeIcon:  { fontSize: 14, fontWeight: 700 },
  content:   { paddingTop: 6 },
  stepLabel: { margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--label)' },
  stepMeta:  { margin: '3px 0 0', fontSize: 12, color: 'var(--label-secondary)' },
  comment:   { margin: '6px 0 0', fontSize: 12, color: 'var(--label-secondary)', fontStyle: 'italic', background: 'var(--fill-quaternary)', padding: '6px 10px', borderRadius: 6 },
};

// ── Document Repository ───────────────────────────────────────────────────────
function DocumentRepository({ prId, canUpload }) {
  const [docs,       setDocs]       = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState('');

  useEffect(() => {
    getDocuments(prId).then(setDocs).catch(() => {});
  }, [prId]);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setUploadErr('');
    try {
      for (const f of Array.from(files)) {
        const type = f.name.toLowerCase().includes('quote') ? 'Quote'
          : f.name.toLowerCase().includes('scope') ? 'Scope'
          : f.name.toLowerCase().includes('tech')  ? 'Technical'
          : 'Document';
        const created = await uploadDocument(prId, {
          name: f.name,
          type,
          size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
        });
        setDocs((prev) => [...prev, created]);
      }
    } catch {
      setUploadErr('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const quoteCount = docs.filter((d) => d.type === 'Quote').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            padding: '3px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700,
            background: quoteCount >= 3 ? 'rgba(52,211,153,0.12)' : 'rgba(220,38,38,0.12)',
            color:      quoteCount >= 3 ? '#34d399' : '#ff6b6b',
            border:     `1px solid ${quoteCount >= 3 ? 'rgba(52,211,153,0.30)' : 'rgba(220,38,38,0.30)'}`,
          }}>
            {quoteCount} / 3 quotes
          </span>
          {quoteCount < 3 && (
            <span style={{ fontSize: 12, color: '#dc2626' }}>⚠ Minimum 3 quotes required</span>
          )}
        </div>
        {canUpload && (
          <label style={doc.uploadBtn}>
            {uploading ? 'Uploading…' : '+ Attach Document'}
            <input
              type="file" multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {uploadErr && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{uploadErr}</p>}

      {docs.length === 0 ? (
        <p style={{ color: 'var(--label-secondary)', fontSize: 14, padding: '20px 0' }}>
          No documents attached yet.
        </p>
      ) : (
        <div style={doc.list}>
          {docs.map((d) => (
            <div key={d.id} style={doc.item}>
              <span style={doc.icon}>{DOC_TYPE_ICON[d.type] || '📄'}</span>
              <div style={doc.meta}>
                <p style={doc.name}>{d.name}</p>
                <p style={doc.sub}>{d.type} · {d.size} · Uploaded by {d.uploadedBy} on {d.uploadedAt}</p>
              </div>
              <Badge text={d.type} style={{
                bg: 'rgba(107,159,255,0.12)', color: '#6b9fff', border: 'rgba(107,159,255,0.25)',
              }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const doc = {
  uploadBtn: {
    display: 'inline-block', cursor: 'pointer',
    padding: '7px 16px', background: 'var(--shell-navy)',
    color: '#fff', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 600,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  item: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--bg)', border: '1px solid var(--separator-clear)',
    borderRadius: 'var(--radius-sm)', padding: '10px 14px',
  },
  icon: { fontSize: 20, flexShrink: 0 },
  meta: { flex: 1, minWidth: 0 },
  name: { margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--label)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub:  { margin: '2px 0 0', fontSize: 11, color: 'var(--label-secondary)' },
};

// ── Approve / Reject Panel ────────────────────────────────────────────────────
function ApprovalPanel({ prId, onDecision }) {
  const [decision, setDecision] = useState('');
  const [comment,  setComment]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function submit(d) {
    if (!d) return;
    setSaving(true);
    setError('');
    try {
      const updated = await approvePR(prId, d, comment);
      onDecision(updated);
    } catch {
      setError('Action failed. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div style={ap.wrap}>
      <p style={ap.title}>Your Decision</p>
      <textarea
        style={ap.textarea}
        placeholder="Add a comment (optional)…"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <div style={ap.btnRow}>
        <button
          style={{ ...ap.btn, ...ap.returnBtn }}
          disabled={saving}
          onClick={() => submit('RETURNED')}
        >
          ↩ Return for Revision
        </button>
        <button
          style={{ ...ap.btn, ...ap.rejectBtn }}
          disabled={saving}
          onClick={() => submit('REJECTED')}
        >
          ✕ Reject
        </button>
        <button
          style={{ ...ap.btn, ...ap.approveBtn }}
          disabled={saving}
          onClick={() => submit('APPROVED')}
        >
          {saving ? 'Processing…' : '✓ Approve'}
        </button>
      </div>
    </div>
  );
}

const ap = {
  wrap:      { background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.20)', borderRadius: 'var(--radius-lg)', padding: 20 },
  title:     { margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.4px' },
  textarea:  { width: '100%', border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: 12, background: 'var(--surface)', color: 'var(--label)' },
  btnRow:    { display: 'flex', gap: 8 },
  btn:       { flex: 1, padding: '9px 12px', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  approveBtn:{ background: '#DD1D21', color: '#fff' },
  rejectBtn: { background: 'rgba(220,38,38,0.15)', color: '#ff6b6b', border: '1px solid rgba(220,38,38,0.30)' },
  returnBtn: { background: 'rgba(180,83,9,0.15)', color: '#fbbf24', border: '1px solid rgba(180,83,9,0.30)' },
};

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'details',  label: 'Details' },
  { id: 'approval', label: 'Approval Progress' },
  { id: 'documents',label: 'Documents' },
];

export default function PRDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [pr,       setPR]       = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [activeTab,setActiveTab]= useState('details');

  const user = (() => { try { return JSON.parse(localStorage.getItem('som_user') || '{}'); } catch { return {}; } })();
  const canApprove = pr?.status === 'PENDING_APPROVAL' &&
    ['Admin', 'Finance', 'Department Manager'].includes(user.role);

  useEffect(() => {
    setLoading(true);
    getPRById(id)
      .then((data) => { setPR(data); setLoading(false); })
      .catch(() => { setError('Failed to load purchase request.'); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div style={s.center} data-testid="pr-loading">
      <div style={s.spinner} />
      <p style={{ color: 'var(--label-secondary)', marginTop: 12 }}>Loading request…</p>
    </div>
  );

  if (error || !pr) return (
    <div style={s.center}>
      <div style={s.errorBox}>{error || 'Request not found.'}</div>
      <button style={s.backBtn} onClick={() => navigate('/purchase-requests')}>← Back to list</button>
    </div>
  );

  const tierStyle   = TIER_STYLE[pr.tier]   || TIER_STYLE.LOW;
  const statusStyle = STATUS_STYLE[pr.status] || STATUS_STYLE.DRAFT;

  return (
    <div>
      {/* Header */}
      <div style={s.pageHeader}>
        <button style={s.backLink} onClick={() => navigate('/purchase-requests')}>← Purchase Requests</button>
        <div style={s.headerRow}>
          <div>
            <h1 style={s.heading}>{pr.title}</h1>
            <p style={s.prId}>{pr.id} · Submitted {pr.createdAt}</p>
          </div>
          <div style={s.headerBadges}>
            <Badge text={pr.tier}                     style={tierStyle} />
            <Badge text={STATUS_LABEL[pr.status] || pr.status} style={statusStyle} />
          </div>
        </div>
      </div>

      {/* Justification alert */}
      {pr.requiresJustification && pr.status === 'PENDING_APPROVAL' && (
        <div style={s.alertBanner} data-testid="justification-alert">
          ⚠ <strong>Justification Alert:</strong> This PR has fewer than 3 quotes attached. Justification required.
        </div>
      )}

      {/* Tab bar */}
      <div style={s.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            style={{ ...s.tabBtn, ...(activeTab === t.id ? s.tabActive : {}) }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.layout}>
        {/* ── Main panel ── */}
        <div style={s.main}>

          {/* Details tab */}
          {activeTab === 'details' && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Request Information</h2>
              <div style={s.infoGrid}>
                <InfoRow label="Requestor"   value={pr.requestorName} />
                <InfoRow label="Department"  value={pr.department} />
                <InfoRow label="Submitted"   value={pr.createdAt} />
                <InfoRow label="Total Value" value={<strong>{fmtOMR(pr.totalValue)}</strong>} />
                <InfoRow label="Approval Tier" value={
                  <Badge text={`${pr.tier} — ${pr.tier === 'LOW' ? 'up to OMR 25,000' : pr.tier === 'MEDIUM' ? 'OMR 25,001–300,000' : 'above OMR 300,000'}`} style={tierStyle} />
                } />
                <InfoRow label="Quote Count" value={
                  <span style={{ color: pr.quoteCount >= 3 ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                    {pr.quoteCount} of 3 required
                  </span>
                } />
              </div>

              {pr.description && (
                <>
                  <div style={s.divider} />
                  <h3 style={s.subTitle}>Description</h3>
                  <p style={s.descText}>{pr.description}</p>
                </>
              )}

              {pr.justification && (
                <>
                  <div style={s.divider} />
                  <h3 style={s.subTitle}>Quote Justification</h3>
                  <p style={{ ...s.descText, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '10px 14px' }}>
                    {pr.justification}
                  </p>
                </>
              )}

              {pr.lineItems?.length > 0 && (
                <>
                  <div style={s.divider} />
                  <h3 style={s.subTitle}>Line Items</h3>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {['Description', 'Qty', 'Unit Price', 'Line Total'].map((h) => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pr.lineItems.map((item, i) => (
                          <tr key={i} style={i % 2 ? { background: 'var(--fill-quaternary)' } : {}}>
                            <td style={s.td}>{item.description || '—'}</td>
                            <td style={{ ...s.td, textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtOMR(item.unitPrice)}</td>
                            <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtOMR(item.lineTotal)}</td>
                          </tr>
                        ))}
                        <tr style={{ background: 'var(--fill-tertiary)' }}>
                          <td colSpan={3} style={{ ...s.td, fontWeight: 700, textAlign: 'right' }}>Total</td>
                          <td style={{ ...s.td, fontWeight: 700, color: 'var(--shell-yellow)' }}>{fmtOMR(pr.totalValue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Approval progress tab */}
          {activeTab === 'approval' && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Approval Progress</h2>
              <ApprovalTimeline
                workflow={pr.workflow || []}
                history={pr.approvalHistory || []}
                status={pr.status}
              />
              {canApprove && (
                <>
                  <div style={s.divider} />
                  <ApprovalPanel
                    prId={pr.id}
                    onDecision={(updated) => setPR(updated)}
                  />
                </>
              )}
            </div>
          )}

          {/* Documents tab */}
          {activeTab === 'documents' && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Document Repository</h2>
              <DocumentRepository
                prId={pr.id}
                canUpload={pr.status !== 'APPROVED' && pr.status !== 'REJECTED'}
              />
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={s.side}>
          {/* Status card */}
          <div style={{ ...s.sideCard, borderTop: `3px solid ${statusStyle.color}` }}>
            <p style={s.sideLabel}>Status</p>
            <Badge text={STATUS_LABEL[pr.status] || pr.status} style={statusStyle} />
          </div>

          {/* Value card */}
          <div style={s.sideCard}>
            <p style={s.sideLabel}>Total Value</p>
            <p style={{ ...s.sideValue, color: 'var(--shell-yellow)' }}>{fmtOMR(pr.totalValue)}</p>
            <Badge text={pr.tier} style={tierStyle} />
          </div>

          {/* Workflow summary */}
          <div style={s.sideCard}>
            <p style={s.sideLabel}>Approval Chain</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {(pr.workflow || []).map((step, i) => {
                const done = pr.approvalHistory?.[i];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                      background: done ? 'rgba(52,211,153,0.15)' : 'var(--fill-tertiary)',
                      color: done ? '#34d399' : 'var(--label-secondary)',
                      border: `1px solid ${done ? 'rgba(52,211,153,0.30)' : 'var(--separator-clear)'}`,
                    }}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span style={{ fontSize: 12, color: done ? '#15803d' : 'var(--label-secondary)', fontWeight: done ? 600 : 400 }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick approve button in sidebar (if on details/docs tab) */}
          {canApprove && activeTab !== 'approval' && (
            <button
              style={s.quickApproveBtn}
              onClick={() => setActiveTab('approval')}
            >
              Take Action →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'contents' }}>
      <dt style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', paddingBottom: 14 }}>{label}</dt>
      <dd style={{ fontSize: 14, color: 'var(--label)', paddingBottom: 14 }}>{value}</dd>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  center:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 },
  spinner: { width: 36, height: 36, border: '3px solid var(--gray-200)', borderTopColor: 'var(--shell-red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  errorBox:{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', color: '#ff6b6b', padding: '12px 20px', borderRadius: 'var(--radius-sm)', marginBottom: 12 },
  backBtn: { padding: '8px 18px', background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--label-secondary)' },

  pageHeader: { marginBottom: 20 },
  backLink:   { background: 'none', border: 'none', color: 'var(--label-secondary)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12, display: 'block' },
  headerRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  heading:    { margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--label)', letterSpacing: '-0.4px' },
  prId:       { margin: '4px 0 0', fontSize: 13, color: 'var(--label-secondary)' },
  headerBadges: { display: 'flex', gap: 8, flexShrink: 0, alignItems: 'flex-start' },

  alertBanner: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)',
    borderRadius: 'var(--radius-sm)', padding: '12px 16px',
    marginBottom: 16, fontSize: 13, color: '#fbbf24',
  },

  tabBar: {
    display: 'flex', gap: 4,
    background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
    padding: 5, marginBottom: 20, width: 'fit-content',
    boxShadow: 'var(--shadow-card)',
  },
  tabBtn: { padding: '7px 18px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)', background: 'transparent' },
  tabActive: { background: 'var(--shell-red)', color: '#fff', fontWeight: 600, boxShadow: 'var(--shadow-sm)' },

  layout: { display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'flex-start' },
  main:   {},
  side:   { display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 20 },

  card:      { background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: 28, boxShadow: 'var(--shadow-card)' },
  cardTitle: { margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--label)' },
  subTitle:  { margin: '16px 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  divider:   { height: 1, background: 'var(--separator-clear)', margin: '20px 0' },
  infoGrid:  { display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0 16px' },
  descText:  { margin: 0, fontSize: 14, color: 'var(--label)', lineHeight: 1.6 },

  tableWrap: { overflowX: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:        { padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--separator-clear)', whiteSpace: 'nowrap' },
  td:        { padding: '10px 12px', borderBottom: '1px solid var(--separator-clear)', color: 'var(--label)' },

  sideCard:  { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-card)' },
  sideLabel: { margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  sideValue: { margin: '0 0 8px', fontSize: 20, fontWeight: 700 },

  quickApproveBtn: {
    width: '100%', padding: '10px', background: 'var(--shell-red)',
    color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
};
