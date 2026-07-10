import { NavLink, useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'D' },
    ],
  },
  {
    label: 'Modules',
    items: [
      { label: 'Capex Planning', path: '/capex', icon: 'C', permKey: 'capex' },
      { label: 'Purchase Requests', path: '/purchase-requests', icon: 'P', permKey: 'purchase-requests' },
      { label: 'Assets (RADP)', path: '/assets', icon: 'A', permKey: 'assets' },
    ],
  },
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { label: 'User Management', path: '/admin/users', icon: 'U' },
      { label: 'Knowledge Base', path: '/admin/knowledge', icon: 'K' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { role, canView } = usePermissions();

  return (
    <aside style={s.sidebar}>
      <a href="/dashboard" style={s.brand} aria-label="Shell Oman Marketing dashboard">
        <span style={s.logoMark}>
          <img src="/logo.png" alt="Shell Oman Marketing" style={s.logoImg} />
        </span>
        <span>
          <strong style={s.brandName}>Shell Oman Marketing</strong>
          <span style={s.brandSub}>Enterprise Platform</span>
        </span>
      </a>

      <div style={s.titleBlock}>
        <span style={s.titleAccent} />
        <div>
          <strong style={s.title}>Workspace</strong>
          <span style={s.subtitle}>Internal modules</span>
        </div>
      </div>

      <nav style={s.nav}>
        {NAV_SECTIONS
          .filter(section => !section.adminOnly || role === 'Admin')
          .map((section) => {
            const visibleItems = section.items.filter(item =>
              !item.permKey || canView(item.permKey)
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label} style={s.section}>
                <p style={s.sectionLabel}>{section.label}</p>
                {visibleItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                      <div style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}>
                        <div style={{ ...s.iconWrap, ...(active ? s.iconWrapActive : {}) }}>
                          <span style={{ ...s.icon, ...(active ? s.iconActive : {}) }}>{item.icon}</span>
                        </div>
                        <span style={{ ...s.label, ...(active ? s.labelActive : {}) }}>
                          {item.label}
                        </span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
      </nav>

      <div style={s.footer}>
        <div style={s.versionBadge}>
          <span style={s.versionDot} />
          <span style={s.versionText}>v1.0 · Shell Oman</span>
        </div>
      </div>
    </aside>
  );
}

const s = {
  sidebar: {
    width: 304,
    height: '100vh',
    background: '#fff',
    borderRight: '1px solid var(--gray-200)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    boxShadow: '1px 0 0 rgba(0,0,0,0.02)',
  },
  brand: {
    minHeight: 100,
    padding: '24px 22px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: 'var(--label)',
    textDecoration: 'none',
    borderTop: '5px solid var(--shell-yellow)',
    borderBottom: '1px solid var(--gray-100)',
  },
  logoMark: {
    width: 42,
    height: 42,
    flexShrink: 0,
    display: 'block',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  brandName: {
    display: 'block',
    color: 'var(--label)',
    fontSize: 16,
    lineHeight: 1.16,
    fontWeight: 800,
  },
  brandSub: {
    display: 'block',
    color: 'var(--gray-500)',
    fontSize: 12,
    marginTop: 2,
  },
  titleBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '24px 22px 18px',
    borderBottom: '1px solid var(--gray-100)',
  },
  titleAccent: {
    width: 7,
    height: 34,
    background: 'var(--shell-yellow)',
    borderRadius: 'var(--radius-xs)',
    display: 'block',
  },
  title: {
    display: 'block',
    color: 'var(--label)',
    fontSize: 15,
    lineHeight: 1.2,
  },
  subtitle: {
    display: 'block',
    color: 'var(--label-tertiary)',
    fontSize: 12,
    marginTop: 2,
  },
  nav: {
    flex: 1,
    padding: '24px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--gray-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    padding: '4px 10px 8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 38,
    padding: '8px 10px 8px 8px',
    borderRadius: 0,
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    transition: 'background 0.12s ease, border-color 0.12s ease, color 0.12s ease',
  },
  navItemActive: {
    background: 'var(--danger-bg)',
    borderLeftColor: 'var(--shell-red)',
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 'var(--radius-xs)',
    background: 'transparent',
    border: '1px solid var(--separator)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapActive: {
    background: 'var(--shell-red)',
    borderColor: 'var(--shell-red)',
  },
  icon: {
    fontSize: 12,
    color: 'var(--gray-500)',
    lineHeight: 1,
    fontWeight: 900,
  },
  iconActive: {
    color: '#fff',
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--gray-600)',
    flex: 1,
  },
  labelActive: {
    color: 'var(--shell-red)',
    fontWeight: 800,
  },
  footer: {
    padding: '14px 16px',
    borderTop: '1px solid var(--gray-100)',
  },
  versionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  versionDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--success)',
    boxShadow: '0 0 0 3px rgba(22,163,74,0.12)',
  },
  versionText: {
    fontSize: 12,
    color: 'var(--gray-500)',
    fontWeight: 700,
  },
};
