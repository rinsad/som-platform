import { NavLink, useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',  path: '/dashboard', icon: '⊞' },
    ],
  },
  {
    label: 'Modules',
    items: [
      { label: 'Capex Planning',    path: '/capex',             icon: '◈', permKey: 'capex' },
      { label: 'Purchase Requests', path: '/purchase-requests', icon: '◎', permKey: 'purchase-requests' },
      { label: 'Assets (RADP)',     path: '/assets',            icon: '◉', permKey: 'assets' },
    ],
  },
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { label: 'User Management',   path: '/admin/users',      icon: '⊛' },
      { label: 'Knowledge Base',    path: '/admin/knowledge',  icon: '◈' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { role, canView } = usePermissions();

  return (
    <aside style={s.sidebar}>
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
                    <NavLink
                      key={item.path}
                      to={item.path}
                      style={{ textDecoration: 'none' }}
                    >
                      <div style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}>
                        <div style={{ ...s.iconWrap, ...(active ? s.iconWrapActive : {}) }}>
                          <span style={s.icon}>{item.icon}</span>
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

      {/* Bottom badge */}
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
    width: '224px',
    minHeight: '100%',
    background: 'rgba(13,13,24,0.72)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRight: '0.5px solid rgba(255,255,255,0.07)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  section: {
    marginBottom: '6px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.28)',
    textTransform: 'uppercase',
    letterSpacing: '0.7px',
    padding: '10px 10px 5px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 8px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.12s ease',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.10)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.30)',
  },
  iconWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    background: 'rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.12s ease',
  },
  iconWrapActive: {
    background: 'linear-gradient(135deg, #DD1D21 0%, #9b0000 100%)',
    boxShadow: '0 1px 4px rgba(221,29,33,0.40)',
  },
  icon: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.50)',
    lineHeight: 1,
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    flex: 1,
    transition: 'color 0.12s ease',
  },
  labelActive: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
  footer: {
    padding: '14px 16px',
    borderTop: '0.5px solid rgba(255,255,255,0.07)',
  },
  versionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  versionDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#34C759',
    boxShadow: '0 0 0 2px rgba(52,199,89,0.20)',
  },
  versionText: {
    fontSize: '11px',
    color: '#AEAEB2',
    fontWeight: '500',
  },
};
