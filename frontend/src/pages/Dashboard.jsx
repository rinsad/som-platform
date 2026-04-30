import { useNavigate } from 'react-router-dom';

const MODULES = [
  {
    label: 'Capex Planning',
    description: 'Budget vs actual tracking, department meters, GSAP sync',
    path: '/capex',
    accent: '#FFD500',
    light: 'rgba(255,213,0,0.15)',
    icon: '◈',
    stats: [{ label: 'Total Budget', value: 'OMR 4.2M' }, { label: 'Utilisation', value: '43%' }],
  },
  {
    label: 'Purchase Requests',
    description: 'Tiered approval workflow, sourcing governance, 3-quote rule',
    path: '/purchase-requests',
    accent: '#ff6b6b',
    light: 'rgba(221,29,33,0.25)',
    icon: '◎',
    stats: [{ label: 'Open PRs', value: '3' }, { label: 'Pending', value: '2' }],
  },
  {
    label: 'Assets — RADP',
    description: 'Region › Site › Facility › Equipment registry, utility billing',
    path: '/assets',
    accent: '#fbbf24',
    light: 'rgba(180,83,9,0.25)',
    icon: '◉',
    stats: [{ label: 'Regions', value: '2' }, { label: 'Sites', value: '3' }],
  },
];

const ACTIVITY = [
  { label: 'PR-2026-003 escalated to Finance review',        time: '2h ago',  dot: '#DD1D21' },
  { label: 'Capex sync completed — GSAP',                    time: '4h ago',  dot: '#FFD500' },
  { label: 'PR-2026-005 approved by Admin User',             time: '1d ago',  dot: '#22c55e' },
  { label: 'New asset registered — Salalah Main Station',    time: '2d ago',  dot: '#B45309' },
  { label: 'PR-2026-006 rejected — Q1 budget freeze',        time: '3d ago',  dot: '#6b7280' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const raw  = localStorage.getItem('som_user');
  const user = raw ? JSON.parse(raw) : {};

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.heading}>{greeting}{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</h1>
          <p style={s.subheading}>Here's what's happening across SOM Platform today.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a href="/" style={s.homeLink}>← Home</a>
          <div style={s.dateBadge}>
            <span style={s.dateText}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div style={s.grid}>
        {MODULES.map((mod) => (
          <button key={mod.path} onClick={() => navigate(mod.path)} style={s.card}>
            {/* Card header */}
            <div style={s.cardHeader}>
              <div style={{ ...s.cardIcon, background: mod.light, color: mod.accent }}>
                {mod.icon}
              </div>
              <div style={{ ...s.cardArrow, color: mod.accent }}>→</div>
            </div>

            <div style={s.cardLabel}>{mod.label}</div>
            <div style={s.cardDesc}>{mod.description}</div>

            {/* Stats row */}
            <div style={s.statsRow}>
              {mod.stats.map((stat) => (
                <div key={stat.label} style={s.stat}>
                  <div style={{ ...s.statValue, color: mod.accent }}>{stat.value}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Bottom accent line */}
            <div style={{ ...s.cardLine, background: mod.accent }} />
          </button>
        ))}
      </div>

      {/* Bottom row */}
      <div style={s.bottomRow}>
        {/* Activity feed */}
        <div style={s.activityCard}>
          <h2 style={s.cardTitle}>Recent Activity</h2>
          <div style={s.activityList}>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={s.activityItem}>
                <div style={{ ...s.activityDot, background: a.dot }} />
                <div style={s.activityContent}>
                  <p style={s.activityLabel}>{a.label}</p>
                  <p style={s.activityTime}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div style={s.statusCard}>
          <h2 style={s.cardTitle}>System Status</h2>
          <div style={s.statusList}>
            {[
              { label: 'SOM API',          status: 'Operational', ok: true },
              { label: 'GSAP Sync',        status: 'Last sync 2h ago', ok: true },
              { label: 'Authentication',   status: 'Operational', ok: true },
              { label: 'PostgreSQL',       status: 'Not connected', ok: false },
            ].map((item) => (
              <div key={item.label} style={s.statusItem}>
                <div style={{ ...s.statusDot, background: item.ok ? '#22c55e' : '#f59e0b', boxShadow: item.ok ? '0 0 0 3px rgba(34,197,94,0.15)' : '0 0 0 3px rgba(245,158,11,0.15)' }} />
                <div style={s.statusInfo}>
                  <span style={s.statusLabel}>{item.label}</span>
                  <span style={{ ...s.statusText, color: item.ok ? '#059669' : '#d97706' }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Role badge */}
          <div style={s.roleBadge}>
            <span style={s.roleLabel}>Signed in as</span>
            <span style={s.roleValue}>{user.role || 'User'} · {user.department || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { animation: 'fadeIn 0.3s ease' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' },
  heading: { fontSize: '26px', fontWeight: '700', color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: '4px' },
  subheading: { fontSize: '14px', color: 'var(--gray-500)' },
  homeLink: { fontSize: '13px', fontWeight: '500', color: 'var(--gray-500)', textDecoration: 'none', padding: '7px 14px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-full)', background: 'var(--surface)', boxShadow: 'var(--shadow-xs)' },
  dateBadge: { background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-full)', padding: '7px 16px', boxShadow: 'var(--shadow-xs)' },
  dateText: { fontSize: '13px', color: 'var(--gray-500)', fontWeight: '500' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' },

  card: {
    background: 'var(--surface)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    textAlign: 'left',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.2s var(--ease), box-shadow 0.2s var(--ease)',
    fontFamily: 'inherit',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  cardIcon: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700' },
  cardArrow: { fontSize: '18px', fontWeight: '300' },
  cardLabel: { fontSize: '16px', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '6px', letterSpacing: '-0.2px' },
  cardDesc: { fontSize: '13px', color: 'var(--gray-500)', lineHeight: '1.5', marginBottom: '16px' },
  statsRow: { display: 'flex', gap: '20px' },
  stat: {},
  statValue: { fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px', lineHeight: 1 },
  statLabel: { fontSize: '11px', color: 'var(--gray-400)', fontWeight: '500', marginTop: '2px' },
  cardLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' },

  bottomRow: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' },

  activityCard: { background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' },
  statusCard:   { background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '16px', letterSpacing: '-0.2px' },

  activityList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  activityItem: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  activityDot: { width: '8px', height: '8px', borderRadius: '50%', marginTop: '5px', flexShrink: 0 },
  activityContent: {},
  activityLabel: { fontSize: '13px', color: 'var(--gray-700)', fontWeight: '500', marginBottom: '2px' },
  activityTime: { fontSize: '12px', color: 'var(--gray-400)' },

  statusList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  statusItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  statusInfo: { display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' },
  statusLabel: { fontSize: '13px', color: 'var(--gray-700)', fontWeight: '500' },
  statusText: { fontSize: '12px', fontWeight: '500' },

  roleBadge: { background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginTop: '4px' },
  roleLabel: { display: 'block', fontSize: '11px', color: 'var(--gray-400)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' },
  roleValue: { fontSize: '13px', color: 'var(--gray-700)', fontWeight: '600' },
};
