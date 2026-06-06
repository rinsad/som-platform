import { useNavigate } from 'react-router-dom';

const MODULES = [
  {
    label: 'Capex Planning',
    description: 'Budget vs actual tracking, department meters, GSAP sync',
    path: '/capex',
    accent: '#FFD500',
    light: '#fff8cc',
    icon: 'C',
    stats: [{ label: 'Total Budget', value: 'OMR 4.2M' }, { label: 'Utilisation', value: '43%' }],
  },
  {
    label: 'Purchase Requests',
    description: 'Tiered approval workflow, sourcing governance, 3-quote rule',
    path: '/purchase-requests',
    accent: '#DD1D21',
    light: '#fff1f1',
    icon: 'P',
    stats: [{ label: 'Open PRs', value: '3' }, { label: 'Pending', value: '2' }],
  },
  {
    label: 'Assets - RADP',
    description: 'Region, site, facility and equipment registry with utility billing',
    path: '/assets',
    accent: '#B45309',
    light: '#fff7ed',
    icon: 'A',
    stats: [{ label: 'Regions', value: '2' }, { label: 'Sites', value: '3' }],
  },
];

const ACTIVITY = [
  { label: 'PR-2026-003 escalated to Finance review', time: '2h ago', dot: '#DD1D21' },
  { label: 'Capex sync completed - GSAP', time: '4h ago', dot: '#FFD500' },
  { label: 'PR-2026-005 approved by Admin User', time: '1d ago', dot: '#16a34a' },
  { label: 'New asset registered - Salalah Main Station', time: '2d ago', dot: '#B45309' },
  { label: 'PR-2026-006 rejected - Q1 budget freeze', time: '3d ago', dot: '#6b7280' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('som_user');
  const user = raw ? JSON.parse(raw) : {};

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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

      <div style={s.grid}>
        {MODULES.map((mod) => (
          <button key={mod.path} onClick={() => navigate(mod.path)} style={s.card}>
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
            {ACTIVITY.map((a, i) => (
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
            {[
              { label: 'SOM API', status: 'Operational', ok: true },
              { label: 'GSAP Sync', status: 'Last sync 2h ago', ok: true },
              { label: 'Authentication', status: 'Operational', ok: true },
              { label: 'PostgreSQL', status: 'Check connection', ok: false },
            ].map((item) => (
              <div key={item.label} style={s.statusItem}>
                <div style={{ ...s.statusDot, background: item.ok ? '#16a34a' : '#f59e0b' }} />
                <div style={s.statusInfo}>
                  <span style={s.statusLabel}>{item.label}</span>
                  <span style={{ ...s.statusText, color: item.ok ? '#166534' : '#92400e' }}>{item.status}</span>
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
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
    flexWrap: 'wrap',
    background: '#fff',
    border: '1px solid #e1e1e1',
    borderTop: '8px solid #FFD500',
    borderRadius: 4,
    padding: 28,
    marginBottom: 22,
    boxShadow: 'var(--shadow-sm)',
  },
  eyebrow: {
    display: 'inline-flex',
    color: '#DD1D21',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: { fontSize: 32, fontWeight: 800, color: '#222', marginBottom: 6 },
  subheading: { fontSize: 15, color: '#595959', maxWidth: 640 },
  heroRight: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  homeLink: {
    fontSize: 13,
    fontWeight: 800,
    color: '#fff',
    padding: '9px 16px',
    borderRadius: 4,
    background: '#DD1D21',
  },
  dateBadge: {
    background: '#f7f7f7',
    border: '1px solid #e1e1e1',
    borderRadius: 4,
    padding: '8px 14px',
  },
  dateText: { fontSize: 13, color: '#4f4f4f', fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 },
  card: {
    background: '#fff',
    border: '1px solid #e1e1e1',
    borderRadius: 4,
    padding: 22,
    textAlign: 'left',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    fontFamily: 'inherit',
    color: '#222',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardIcon: { width: 42, height: 42, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900 },
  cardArrow: { fontSize: 12, fontWeight: 800, textTransform: 'uppercase' },
  cardLabel: { fontSize: 18, fontWeight: 800, color: '#222', marginBottom: 7 },
  cardDesc: { fontSize: 13, color: '#666', lineHeight: 1.55, marginBottom: 16 },
  statsRow: { display: 'flex', gap: 22 },
  stat: {},
  statValue: { fontSize: 22, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 11, color: '#777', fontWeight: 700, marginTop: 4 },
  cardLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5 },
  bottomRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', gap: 16 },
  panel: { background: '#fff', border: '1px solid #e1e1e1', borderRadius: 4, padding: 24, boxShadow: 'var(--shadow-sm)' },
  cardTitle: { fontSize: 17, fontWeight: 800, color: '#222', marginBottom: 16 },
  activityList: { display: 'flex', flexDirection: 'column', gap: 14 },
  activityItem: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  activityDot: { width: 9, height: 9, borderRadius: '50%', marginTop: 5, flexShrink: 0 },
  activityLabel: { fontSize: 13, color: '#333', fontWeight: 700, marginBottom: 2 },
  activityTime: { fontSize: 12, color: '#777' },
  statusList: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 },
  statusItem: { display: 'flex', alignItems: 'center', gap: 10 },
  statusDot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  statusInfo: { display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center', gap: 12 },
  statusLabel: { fontSize: 13, color: '#333', fontWeight: 700 },
  statusText: { fontSize: 12, fontWeight: 800 },
  roleBadge: { background: '#fff8cc', border: '1px solid #ffe889', borderRadius: 4, padding: '12px 14px' },
  roleLabel: { display: 'block', fontSize: 11, color: '#8a5d00', fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 },
  roleValue: { fontSize: 13, color: '#222', fontWeight: 800 },
};
