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
    width: 244,
    minHeight: '100%',
    background: '#fff',
    borderRight: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    boxShadow: '1px 0 0 rgba(0,0,0,0.02)',
  },
  titleBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '18px 18px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  titleAccent: {
    width: 7,
    height: 34,
    background: '#FFD500',
    borderRadius: 2,
    display: 'block',
  },
  title: {
    display: 'block',
    color: '#222',
    fontSize: 15,
    lineHeight: 1.2,
  },
  subtitle: {
    display: 'block',
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
  nav: {
    flex: 1,
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: '#8a8a8a',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    padding: '10px 10px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'background 0.12s ease, border-color 0.12s ease',
  },
  navItemActive: {
    background: '#fff1f1',
    borderColor: '#ffd3d3',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 4,
    background: '#f4f4f4',
    border: '1px solid #e1e1e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapActive: {
    background: '#DD1D21',
    borderColor: '#DD1D21',
  },
  icon: {
    fontSize: 12,
    color: '#666',
    lineHeight: 1,
    fontWeight: 900,
  },
  iconActive: {
    color: '#fff',
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#4f4f4f',
    flex: 1,
  },
  labelActive: {
    color: '#DD1D21',
    fontWeight: 800,
  },
  footer: {
    padding: '14px 16px',
    borderTop: '1px solid #f0f0f0',
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
    background: '#16a34a',
    boxShadow: '0 0 0 3px rgba(22,163,74,0.12)',
  },
  versionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 700,
  },
};
