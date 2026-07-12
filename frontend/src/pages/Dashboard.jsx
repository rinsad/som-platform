import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssets } from '../services/assetsService';
import { getDepartments, getSyncStatus } from '../services/capexService';
import { getAllPRs } from '../services/prService';

const BASE_MODULES = [
  {
    label: 'Capex Planning',
    description: 'Budget vs actual tracking, department meters, GSAP sync',
    path: '/capex',
    accent: 'var(--shell-yellow)',
    light: 'var(--bg-tertiary)',
    icon: 'C',
    key: 'capex',
  },
  {
    label: 'Purchase Requests',
    description: 'Tiered approval workflow, sourcing governance, 3-quote rule',
    path: '/purchase-requests',
    accent: 'var(--shell-red)',
    light: 'var(--accent-red-bg)',
    icon: 'P',
    key: 'purchaseRequests',
  },
  {
    label: 'Assets - RADP',
    description: 'Region, site, facility and equipment registry with utility billing',
    path: '/assets',
    accent: 'var(--accent-amber)',
    light: 'var(--accent-amber-bg)',
    icon: 'A',
    key: 'assets',
  },
];

const DEFAULT_STATS = {
  capex: [{ label: 'Total Budget', value: '-' }, { label: 'Utilisation', value: '-' }],
  purchaseRequests: [{ label: 'Open PRs', value: '-' }, { label: 'Pending', value: '-' }],
  assets: [{ label: 'Regions', value: '-' }, { label: 'Sites', value: '-' }],
};

function formatOmr(value) {
  if (!Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 1_000_000) return `OMR ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `OMR ${(value / 1_000).toFixed(0)}K`;
  return `OMR ${value.toLocaleString('en-GB')}`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function readUser() {
  try {
    const raw = localStorage.getItem('som_user');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildActivity(prs, syncStatus) {
  const prActivity = prs.flatMap((pr) => {
    const history = Array.isArray(pr.approvalHistory) ? pr.approvalHistory : [];
    const historyItems = history.map((h) => ({
      label: `${pr.id} ${String(h.decision || 'updated').toLowerCase().replace(/_/g, ' ')}${h.approver ? ` by ${h.approver}` : ''}`,
      time: formatDate(h.date),
      sortDate: new Date(h.date || pr.createdAt || 0).getTime(),
      dot: h.decision === 'REJECTED' ? 'var(--shell-red)' : 'var(--success)',
    }));
    return [
      {
        label: `${pr.id} created - ${pr.title}`,
        time: formatDate(pr.createdAt),
        sortDate: new Date(pr.createdAt || 0).getTime(),
        dot: pr.status === 'PENDING_APPROVAL' ? 'var(--shell-yellow)' : 'var(--neutral)',
      },
      ...historyItems,
    ];
  });

  const syncActivity = syncStatus?.lastSynced
    ? [{
        label: `${syncStatus.source || 'GSAP'} sync completed`,
        time: formatDate(syncStatus.lastSynced),
        sortDate: new Date(syncStatus.lastSynced).getTime(),
        dot: 'var(--shell-yellow)',
      }]
    : [];

  const items = [...prActivity, ...syncActivity]
    .filter((item) => item.label && item.sortDate)
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, 5);

  return items.length
    ? items
    : [{ label: 'No recent module activity available', time: '', dot: 'var(--neutral)' }];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({
    loading: true,
    error: '',
    stats: DEFAULT_STATS,
    activity: [{ label: 'Loading dashboard activity...', time: '', dot: 'var(--neutral)' }],
    status: [],
  });
  const user = useMemo(() => readUser(), []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const modules = BASE_MODULES.map((mod) => ({ ...mod, stats: dashboard.stats[mod.key] || DEFAULT_STATS[mod.key] }));

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const [deptResult, prResult, assetResult, syncResult] = await Promise.allSettled([
        getDepartments(),
        getAllPRs(),
        getAssets(),
        getSyncStatus(),
      ]);

      if (cancelled) return;

      const departments = deptResult.status === 'fulfilled' ? deptResult.value : [];
      const prs = prResult.status === 'fulfilled' ? prResult.value : [];
      const assets = assetResult.status === 'fulfilled' ? assetResult.value : [];
      const syncStatus = syncResult.status === 'fulfilled' ? syncResult.value : null;

      const totalBudget = departments.reduce((sum, dept) => sum + Number(dept.totalBudget || 0), 0);
      const actualSpend = departments.reduce((sum, dept) => sum + Number(dept.actual || 0), 0);
      const utilisation = totalBudget > 0 ? Math.round((actualSpend / totalBudget) * 100) : null;
      const pendingPrs = prs.filter((pr) => pr.status === 'PENDING_APPROVAL').length;
      const openPrs = prs.filter((pr) => ['DRAFT', 'PENDING_APPROVAL'].includes(pr.status)).length;
      const regions = new Set(assets.map((asset) => asset.region).filter(Boolean)).size;
      const sites = new Set(assets.map((asset) => asset.site).filter(Boolean)).size;
      const moduleApiOk = [deptResult, prResult, assetResult].some((result) => result.status === 'fulfilled');
      const allDataOk = [deptResult, prResult, assetResult].every((result) => result.status === 'fulfilled');

      setDashboard({
        loading: false,
        error: [deptResult, prResult, assetResult, syncResult].some((result) => result.status === 'rejected')
          ? 'Some dashboard data could not be refreshed.'
          : '',
        stats: {
          capex: [
            { label: 'Total Budget', value: formatOmr(totalBudget) },
            { label: 'Utilisation', value: utilisation === null ? '-' : `${utilisation}%` },
          ],
          purchaseRequests: [
            { label: 'Open PRs', value: String(openPrs) },
            { label: 'Pending', value: String(pendingPrs) },
          ],
          assets: [
            { label: 'Regions', value: String(regions) },
            { label: 'Sites', value: String(sites) },
          ],
        },
        activity: buildActivity(prs, syncStatus),
        status: [
          { label: 'SOM API', status: moduleApiOk ? 'Operational' : 'Check connection', ok: moduleApiOk },
          {
            label: 'GSAP Sync',
            status: syncStatus?.lastSynced
              ? `Last sync ${formatDate(syncStatus.lastSynced)}`
              : syncStatus?.mode === 'manual'
                ? 'Manual mode'
                : 'Not synced',
            ok: !!syncStatus,
          },
          { label: 'Authentication', status: localStorage.getItem('som_token') ? 'Operational' : 'No active token', ok: !!localStorage.getItem('som_token') },
          { label: 'PostgreSQL', status: allDataOk ? 'Operational' : 'Check connection', ok: allDataOk },
        ],
      });
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <div>
          <span style={s.eyebrow}>Shell Oman internal workspace</span>
          <h1 style={s.heading}>{greeting}{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p style={s.subheading}>Your daily view across SOM Platform modules, approvals, assets and system health.</p>
        </div>
        <div style={s.heroRight}>
          <a href="/" style={s.homeLink}>Home</a>
          <div style={s.dateBadge}>
            <span style={s.dateText}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {dashboard.error && <div style={s.notice}>{dashboard.error}</div>}

      <div style={s.grid}>
        {modules.map((mod) => (
          <button type="button" key={mod.path} onClick={() => navigate(mod.path)} style={s.card} aria-busy={dashboard.loading}>
            <div style={s.cardHeader}>
              <div style={{ ...s.cardIcon, background: mod.light, color: mod.accent }}>
                {mod.icon}
              </div>
              <div style={{ ...s.cardArrow, color: mod.accent }}>Open</div>
            </div>

            <div style={s.cardLabel}>{mod.label}</div>
            <div style={s.cardDesc}>{mod.description}</div>

            <div style={s.statsRow}>
              {mod.stats.map((stat) => (
                <div key={stat.label} style={s.stat}>
                  <div style={{ ...s.statValue, color: mod.accent }}>{stat.value}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ ...s.cardLine, background: mod.accent }} />
          </button>
        ))}
      </div>

      <div style={s.bottomRow}>
        <div style={s.panel}>
          <h2 style={s.cardTitle}>Recent Activity</h2>
          <div style={s.activityList}>
            {dashboard.activity.map((a, i) => (
              <div key={i} style={s.activityItem}>
                <div style={{ ...s.activityDot, background: a.dot }} />
                <div>
                  <p style={s.activityLabel}>{a.label}</p>
                  <p style={s.activityTime}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.panel}>
          <h2 style={s.cardTitle}>System Status</h2>
          <div style={s.statusList}>
            {dashboard.status.map((item) => (
              <div key={item.label} style={s.statusItem}>
                <div style={{ ...s.statusDot, background: item.ok ? 'var(--success)' : 'var(--warning)' }} />
                <div style={s.statusInfo}>
                  <span style={s.statusLabel}>{item.label}</span>
                  <span style={{ ...s.statusText, color: item.ok ? 'var(--success-text)' : 'var(--warning-text)' }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={s.roleBadge}>
            <span style={s.roleLabel}>Signed in as</span>
            <span style={s.roleValue}>{user.role || 'User'} · {user.department || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { animation: 'fadeIn 0.3s ease' },
  notice: {
    background: 'var(--warning-bg)',
    border: '1px solid var(--warning-line)',
    color: 'var(--warning-text)',
    borderRadius: 'var(--radius-xs)',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 14,
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
    flexWrap: 'wrap',
    background: '#fff',
    border: '1px solid var(--gray-200)',
    borderTop: '8px solid var(--shell-yellow)',
    borderRadius: 'var(--radius-xs)',
    padding: 28,
    marginBottom: 22,
    boxShadow: 'var(--shadow-sm)',
  },
  eyebrow: {
    display: 'inline-flex',
    color: 'var(--shell-red)',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: { fontSize: 32, fontWeight: 800, color: 'var(--label)', marginBottom: 6 },
  subheading: { fontSize: 15, color: 'var(--label-secondary)', maxWidth: 640 },
  heroRight: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  homeLink: {
    fontSize: 13,
    fontWeight: 800,
    color: '#fff',
    padding: '9px 16px',
    borderRadius: 'var(--radius-xs)',
    background: 'var(--shell-red)',
  },
  dateBadge: {
    background: 'var(--bg)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)',
    padding: '8px 14px',
  },
  dateText: { fontSize: 13, color: 'var(--gray-600)', fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 },
  card: {
    background: '#fff',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)',
    padding: 22,
    textAlign: 'left',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    fontFamily: 'inherit',
    color: 'var(--label)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardIcon: { width: 42, height: 42, borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900 },
  cardArrow: { fontSize: 12, fontWeight: 800, textTransform: 'uppercase' },
  cardLabel: { fontSize: 18, fontWeight: 800, color: 'var(--label)', marginBottom: 7 },
  cardDesc: { fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.55, marginBottom: 16 },
  statsRow: { display: 'flex', gap: 22 },
  stat: {},
  statValue: { fontSize: 22, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 11, color: 'var(--label-tertiary)', fontWeight: 700, marginTop: 4 },
  cardLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5 },
  bottomRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', gap: 16 },
  panel: { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', padding: 24, boxShadow: 'var(--shadow-sm)' },
  cardTitle: { fontSize: 17, fontWeight: 800, color: 'var(--label)', marginBottom: 16 },
  activityList: { display: 'flex', flexDirection: 'column', gap: 14 },
  activityItem: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  activityDot: { width: 9, height: 9, borderRadius: '50%', marginTop: 5, flexShrink: 0 },
  activityLabel: { fontSize: 13, color: 'var(--gray-700)', fontWeight: 700, marginBottom: 2 },
  activityTime: { fontSize: 12, color: 'var(--label-tertiary)' },
  statusList: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 },
  statusItem: { display: 'flex', alignItems: 'center', gap: 10 },
  statusDot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  statusInfo: { display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center', gap: 12 },
  statusLabel: { fontSize: 13, color: 'var(--gray-700)', fontWeight: 700 },
  statusText: { fontSize: 12, fontWeight: 800 },
  roleBadge: { background: 'var(--bg-tertiary)', border: '1px solid var(--accent-amber-line)', borderRadius: 'var(--radius-xs)', padding: '12px 14px' },
  roleLabel: { display: 'block', fontSize: 11, color: 'var(--accent-amber-text)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 },
  roleValue: { fontSize: 13, color: 'var(--label)', fontWeight: 800 },
};
