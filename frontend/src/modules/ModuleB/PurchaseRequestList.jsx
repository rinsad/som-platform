import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPRs } from '../../services/prService';
import Badge from '../../components/Badge';

const TABS = [
  { label: 'All',      value: 'ALL' },
  { label: 'Pending',  value: 'PENDING_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const STATUS_LABEL = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function fmtValue(v) {
  return 'OMR ' + Number(v).toLocaleString('en-GB');
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
      <button type="button" onClick={fetchPRs} style={s.retryBtn}>Retry</button>
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
        <button type="button" style={s.newBtn} onClick={() => navigate('/purchase-requests/new')}>
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
              <button type="button"
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
                      <Badge status={pr.tier} />
                    </td>
                    <td style={s.td}>
                      <Badge status={STATUS_LABEL[pr.status] || pr.status} />
                    </td>
                    <td style={s.td}>
                      <span style={s.date}>{pr.createdAt}</span>
                    </td>
                    <td style={s.td}>
                      <button type="button"
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
  spinner: { width: '36px', height: '36px', border: '3px solid var(--gray-200)', borderTopColor: 'var(--shell-red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  spinnerText: { color: 'var(--gray-500)', fontSize: '14px' },
  errorBox: { background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger-text)', padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: '14px' },
  retryBtn: { padding: '8px 20px', background: 'var(--shell-red)', color: '#fff', border: '1px solid var(--shell-red-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600', fontSize: '14px', fontFamily: 'inherit' },

  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  heading: { fontSize: '24px', fontWeight: '800', color: 'var(--gray-900)', letterSpacing: '-0.4px', marginBottom: '4px' },
  subheading: { fontSize: '14px', color: 'var(--gray-500)' },
  newBtn: {
    padding: '9px 18px',
    background: 'var(--shell-red)',
    color: '#fff',
    border: '1px solid var(--shell-red-dark)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13.5px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-xs)',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  },

  warningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--warning-bg)',
    border: '1px solid var(--warning)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '13.5px',
    color: 'var(--warning-text)',
    fontWeight: '500',
  },
  warningIcon: { fontSize: '16px' },

  card: { background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' },

  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    padding: 4,
    margin: '12px 16px',
    background: '#FFFFFF',
    border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    fontWeight: '800',
    color: 'var(--label-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all var(--transition-fast)',
  },
  tabActive: {
    color: '#fff',
    background: 'var(--shell-red)',
    fontWeight: '900',
    boxShadow: '0 1px 2px rgba(0,0,0,0.14)',
  },
  tabCount: {
    background: 'var(--gray-200)',
    color: 'var(--gray-500)',
    fontSize: '11px',
    fontWeight: '700',
    padding: '1px 7px',
    borderRadius: 'var(--radius-pill)',
  },
  tabCountActive: {
    background: 'rgba(255,255,255,0.25)',
    color: '#fff',
  },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '11px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '850',
    color: 'var(--label-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    borderBottom: '1px solid var(--separator)',
    background: 'var(--gray-50)',
    whiteSpace: 'nowrap',
  },
  tr: { transition: 'background 0.1s' },
  trAlt: { background: 'var(--gray-50)' },
  td: { padding: '13px 16px', borderBottom: '1px solid var(--gray-100)', verticalAlign: 'middle' },

  prTitle: { fontSize: '13.5px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '2px' },
  prId:    { fontSize: '11px', color: 'var(--gray-400)', fontWeight: '500' },
  dept:    { fontSize: '13px', color: 'var(--gray-600)' },
  value:   { fontSize: '13.5px', fontWeight: '600', color: 'var(--gray-800)', fontVariantNumeric: 'tabular-nums' },
  date:    { fontSize: '12.5px', color: 'var(--gray-500)' },

  viewBtn: {
    padding: '5px 13px',
    background: '#FFFFFF',
    border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12.5px',
    fontWeight: '800',
    color: 'var(--gray-700)',
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
