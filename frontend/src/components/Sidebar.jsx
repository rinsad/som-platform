import {
  BookOpen,
  ChartNoAxesCombined,
  FileText,
  Gauge,
  PackageSearch,
  Users,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: Gauge },
    ],
  },
  {
    label: 'Modules',
    items: [
      { label: 'Capex Planning', path: '/capex', icon: ChartNoAxesCombined, permKey: 'capex' },
      { label: 'Purchase Requests', path: '/purchase-requests', icon: FileText, permKey: 'purchase-requests' },
      { label: 'Assets (RADP)', path: '/assets', icon: PackageSearch, permKey: 'assets' },
    ],
  },
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { label: 'User Management', path: '/admin/users', icon: Users },
      { label: 'Knowledge Base', path: '/admin/knowledge', icon: BookOpen },
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
          <img src="/leen-logo.png" alt="Leen" style={s.logoImg} />
        </span>
        <span>
          <strong style={s.brandName}>Shell Oman Marketing</strong>
          <span style={s.brandSub}>Enterprise Platform</span>
        </span>
      </a>

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
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                      <div style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}>
                        <div style={{ ...s.iconWrap, ...(active ? s.iconWrapActive : {}) }}>
                          <Icon
                            aria-hidden="true"
                            size={16}
                            strokeWidth={2}
                            style={{ ...s.icon, ...(active ? s.iconActive : {}) }}
                          />
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
    width: 248,
    height: '100vh',
    background: '#fff',
    borderRight: '1px solid var(--gray-200)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    boxShadow: '1px 0 0 rgba(0,0,0,0.02)',
  },
  brand: {
    minHeight: 66,
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: 'var(--label)',
    textDecoration: 'none',
    borderTop: '4px solid var(--shell-yellow)',
    borderBottom: '1px solid var(--gray-100)',
  },
  logoMark: {
    width: 48,
    height: 34,
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
    fontSize: 13.5,
    lineHeight: 1.16,
    fontWeight: 800,
  },
  brandSub: {
    display: 'block',
    color: 'var(--gray-500)',
    fontSize: 10.5,
    marginTop: 1,
  },
  nav: {
    flex: 1,
    padding: '16px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: 800,
    color: 'var(--gray-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    padding: '4px 8px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 34,
    padding: '7px 8px 7px 6px',
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
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapActive: {},
  icon: {
    color: 'var(--gray-500)',
    display: 'block',
  },
  iconActive: {
    color: 'var(--shell-red)',
  },
  label: {
    fontSize: 12.5,
    fontWeight: 700,
    color: 'var(--gray-600)',
    flex: 1,
  },
  labelActive: {
    color: 'var(--shell-red)',
    fontWeight: 800,
  },
  footer: {
    padding: '12px 14px',
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
    fontSize: 11.5,
    color: 'var(--gray-500)',
    fontWeight: 700,
  },
};
