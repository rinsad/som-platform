import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPRs } from '../../services/prService';

const TABS = [
  { label: 'All',      value: 'ALL' },
  { label: 'Pending',  value: 'PENDING_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const TIER_STYLE = {
  LOW:    { background: 'rgba(52,211,153,0.12)',  color: '#34d399', border: 'rgba(52,211,153,0.30)' },
  MEDIUM: { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.30)' },
  HIGH:   { background: 'rgba(220,38,38,0.12)',   color: '#ff6b6b', border: 'rgba(220,38,38,0.30)' },
};

const STATUS_STYLE = {
  DRAFT:            { background: 'rgba(255,255,255,0.07)',  color: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.15)' },
  PENDING_APPROVAL: { background: 'rgba(107,159,255,0.15)', color: '#6b9fff',                border: 'rgba(107,159,255,0.30)' },
  APPROVED:         { background: 'rgba(52,211,153,0.12)',  color: '#34d399',                border: 'rgba(52,211,153,0.30)' },
  REJECTED:         { background: 'rgba(220,38,38,0.12)',   color: '#ff6b6b',                border: 'rgba(220,38,38,0.30)' },
};

const STATUS_LABEL = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function fmtValue(v) {
  return 'OMR ' + Number(v).toLocaleString('en-GB');
}

function Badge({ text, style }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '600',
      border: `1px solid ${style.border}`,
      background: style.background,
      color: style.color,
      letterSpacing: '0.1px',
    }}>
      {text}
    </span>
  );
}

export default function PurchaseRequestList() {
  const [prs, setPrs]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const navigate = useNavigate();

  const fetchPRs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllPRs();
      setPrs(data);
    } catch {
      setError('Failed to load purchase requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPRs(); }, []);

  const filtered = activeTab === 'ALL'
    ? prs
    : prs.filter((pr) => pr.status === activeTab);

  const needsJustification = prs.filter((pr) => pr.requiresJustification);

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={s.spinnerText}>Loading purchase requests…</p>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={s.errorBox}>{error}</div>
      <button onClick={fetchPRs} style={s.retryBtn}>Retry</button>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.heading}>Purchase Requests</h1>
          <p style={s.subheading}>Manage and track procurement approvals</p>
        </div>
        <button style={s.newBtn} onClick={() => navigate('/purchase-requests/new')}>
          + New Request
        </button>
      </div>

      {/* Justification warning */}
      {needsJustification.length > 0 && (
        <div style={s.warningBanner}>
          <span style={s.warningIcon}>⚠</span>
          <span>
            <strong>{needsJustification.length} request{needsJustification.length > 1 ? 's' : ''}</strong>
            {' '}need{needsJustification.length === 1 ? 's' : ''} justification — fewer than 3 quotes attached
          </span>
        </div>
      )}

      {/* Card */}
      <div style={s.card}>
        {/* Filter tabs */}
        <div style={s.tabs}>
          {TABS.map((tab) => {
            const count = tab.value === 'ALL'
              ? prs.length
              : prs.filter((p) => p.status === tab.value).length;
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                style={{ ...s.tab, ...(active ? s.tabActive : {}) }}
              >
                {tab.label}
                <span style={{ ...s.tabCount, ...(active ? s.tabCountActive : {}) }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>📋</div>
            <p style={s.emptyTitle}>No requests found</p>
            <p style={s.emptyMsg}>There are no purchase requests matching this filter.</p>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Title', 'Department', 'Value', 'Tier', 'Status', 'Date', 'Action'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((pr, i) => (
                  <tr
                    key={pr.id}
                    style={{ ...s.tr, ...(i % 2 === 0 ? {} : s.trAlt) }}
                  >
                    <td style={s.td}>
                      <div style={s.prTitle}>{pr.title}</div>
                      <div style={s.prId}>{pr.id}</div>
                    </td>
                    <td style={s.td}>
                      <span style={s.dept}>{pr.department}</span>
                    </td>
                    <td style={s.td}>
                      <span style={s.value}>{fmtValue(pr.totalValue)}</span>
                    </td>
                    <td style={s.td}>
                      <Badge text={pr.tier} style={TIER_STYLE[pr.tier] || TIER_STYLE.LOW} />
                    </td>
                    <td style={s.td}>
                      <Badge
                        text={STATUS_LABEL[pr.status] || pr.status}
                        style={STATUS_STYLE[pr.status] || STATUS_STYLE.DRAFT}
                      />
                    </td>
                    <td style={s.td}>
                      <span style={s.date}>{pr.createdAt}</span>
                    </td>
                    <td style={s.td}>
                      <button
                        style={s.viewBtn}
                        onClick={() => navigate(`/purchase-requests/${pr.id}`)}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      <p style={s.footerCount}>
        Showing {filtered.length} of {prs.length} requests
      </p>
    </div>
  );
}

const s = {
  page: { animation: 'fadeIn 0.25s ease' },

  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' },
  spinner: { width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#DD1D21', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  spinnerText: { color: 'var(--gray-500)', fontSize: '14px' },
  errorBox: { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', color: '#ff6b6b', padding: '12px 20px', borderRadius: '10px', fontSize: '14px' },
  retryBtn: { padding: '8px 20px', background: '#DD1D21', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', fontFamily: 'inherit' },

  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  heading: { fontSize: '24px', fontWeight: '700', color: 'var(--gray-900)', letterSpacing: '-0.4px', marginBottom: '4px' },
  subheading: { fontSize: '14px', color: 'var(--gray-500)' },
  newBtn: {
    padding: '9px 18px',
    background: 'linear-gradient(135deg, #DD1D21, #b91c1c)',
    color: '#fff',
    border: 'none',
    borderRadius: '9px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(221,29,33,0.3)',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  },

  warningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(251,191,36,0.10)',
    border: '1px solid rgba(251,191,36,0.25)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '13.5px',
    color: '#92400e',
    fontWeight: '500',
  },
  warningIcon: { fontSize: '16px' },

  card: { background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: '14px', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' },

  tabs: { display: 'flex', gap: '2px', padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    fontSize: '13.5px',
    fontWeight: '500',
    color: 'var(--gray-500)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#DD1D21',
    background: 'rgba(255,255,255,0.10)',
    borderBottom: '2px solid #DD1D21',
    boxShadow: 'var(--shadow-xs)',
  },
  tabCount: {
    background: 'var(--gray-200)',
    color: 'var(--gray-500)',
    fontSize: '11px',
    fontWeight: '700',
    padding: '1px 7px',
    borderRadius: '9999px',
  },
  tabCountActive: {
    background: 'rgba(221,29,33,0.20)',
    color: '#ff6b6b',
  },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '11px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--gray-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    borderBottom: '1px solid var(--gray-100)',
    background: 'var(--surface)',
    whiteSpace: 'nowrap',
  },
  tr: { transition: 'background 0.1s' },
  trAlt: { background: 'rgba(255,255,255,0.025)' },
  td: { padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'middle' },

  prTitle: { fontSize: '13.5px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '2px' },
  prId:    { fontSize: '11px', color: 'var(--gray-400)', fontWeight: '500' },
  dept:    { fontSize: '13px', color: 'var(--gray-600)' },
  value:   { fontSize: '13.5px', fontWeight: '600', color: 'var(--gray-800)', fontVariantNumeric: 'tabular-nums' },
  date:    { fontSize: '12.5px', color: 'var(--gray-500)' },

  viewBtn: {
    padding: '5px 13px',
    background: 'rgba(107,159,255,0.15)',
    border: '1px solid rgba(107,159,255,0.25)',
    borderRadius: '7px',
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#6b9fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },

  empty: { padding: '60px 24px', textAlign: 'center' },
  emptyIcon:  { fontSize: '36px', marginBottom: '12px' },
  emptyTitle: { fontSize: '15px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '6px' },
  emptyMsg:   { fontSize: '13px', color: 'var(--gray-400)' },

  footerCount: { marginTop: '12px', fontSize: '12px', color: 'var(--gray-400)', textAlign: 'right' },
};
