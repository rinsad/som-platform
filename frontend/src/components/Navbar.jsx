const PUBLIC_MENU = [
  { label: 'Home', href: '/', active: true },
  {
    label: 'Motorists',
    href: '#employee-tools',
    items: ['Shell station locator', 'Fuel cards', 'National Subsidy System Cards'],
  },
  {
    label: 'Industrial Lubricants',
    href: '#departments',
    highlight: true,
    items: ['Lubricants', 'Technical support', 'Commercial Lubes'],
  },
  {
    label: 'Sustainability',
    href: '#performance',
    items: ['Corporate Social Responsibility', 'In-Country Value', 'Goal Zero and HSSE', 'Diversity, Equity and Inclusion'],
  },
  {
    label: 'About us',
    href: '#about',
    items: ['This is Shell', 'Shell history in Oman', 'CEO Corner', 'Shell network location'],
  },
  {
    label: 'Careers',
    href: '#hr-online',
    items: ['HR Online', 'Employee services', 'Long Service Award'],
  },
  {
    label: 'Investors',
    href: '#knowledge',
    items: ['Performance and Results', 'Annual reports', 'Knowledge base'],
  },
];

const PREVIEW_MENU = [
  { label: 'Our company', href: '#our-company' },
  { label: 'Business function', href: '#business-function' },
  { label: 'People finder', href: '#people-finder' },
  { label: 'HR online', href: '#hr-online' },
  { label: 'Goal Zero', href: '#goal-zero' },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="25" height="25" aria-hidden="true">
      <path d="M10.8 18.1a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Zm5.1-1.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Navbar({ user, onLogout, showDashboardLink = false, variant = 'app' }) {
  const isPublic = variant === 'public' || variant === 'preview';
  const isPreview = variant === 'preview';
  const styles = isPublic ? publicStyles : appStyles;
  const menuItems = isPreview ? PREVIEW_MENU : PUBLIC_MENU;

  if (isPublic) {
    return (
      <header style={styles.navbar}>
        <div className="som-public-utility" style={styles.utility}>
          <div className="som-public-utility-inner" style={styles.utilityInner}>
            <span style={styles.utilitySpacer} />
            <nav className="som-public-utility-links" style={styles.utilityLinks} aria-label="Utility">
              <a href="#employee-services" style={styles.utilityLink}>Help and Support</a>
              <a className="som-utility-secondary" href="#about" style={styles.utilityLink}>شل في سلطنة عمان</a>
              <a href="#news" style={styles.utilityLink}>Media</a>
              <span className="som-utility-secondary" style={styles.globe} aria-hidden="true">◎</span>
              <a className="som-utility-company" href="/" style={styles.utilityCompany}>Oman Marketing Company</a>
              {user ? (
                <>
                  {showDashboardLink && <a href="/dashboard" style={styles.utilityLink}>Dashboard</a>}
                  <button type="button" onClick={onLogout} style={styles.utilityButton}>Sign out</button>
                </>
              ) : (
                <a href="/login" style={styles.utilityButton}>Sign in</a>
              )}
            </nav>
          </div>
        </div>

        <div className="som-public-main-row" style={styles.mainRow}>
          <div className="som-public-inner" style={styles.inner}>
            <a href="/" style={styles.publicLogo} aria-label="Shell Oman Marketing home">
              <img src="/logo.png" alt="Shell Oman Marketing" style={styles.publicLogoImg} />
            </a>

            <nav className={`som-public-nav${isPreview ? ' is-preview-menu' : ''}`} style={isPreview ? { ...styles.navLinks, ...styles.previewNavLinks } : styles.navLinks} aria-label="Primary">
              {menuItems.map((item) => (
                <div key={item.label} className="som-public-nav-item" style={styles.navItem}>
                  <a
                    href={item.href}
                    style={{
                      ...styles.navText,
                      ...(isPreview ? styles.previewNavText : {}),
                      ...(item.active ? styles.navTextActive : {}),
                      ...(item.highlight ? styles.navTextHighlight : {}),
                    }}
                  >
                    {item.label}
                    {!isPreview && item.items && <ChevronIcon />}
                  </a>
                  {!isPreview && item.items && (
                    <div className="som-public-dropdown" style={styles.dropdown}>
                      <strong style={styles.dropdownTitle}>Go to: {item.label}</strong>
                      {item.items.map((entry) => (
                        <a key={entry} href={item.href} style={styles.dropdownLink}>
                          {entry}
                          {entry === 'Corporate Social Responsibility' && <ChevronIcon />}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <a href="#knowledge" style={styles.searchButton} aria-label="Search knowledge base">
              <SearchIcon />
            </a>
          </div>
        </div>

        <style>{`
          .som-public-dropdown {
            opacity: 0;
            transform: translateY(8px);
            pointer-events: none;
            transition: opacity 0.14s ease, transform 0.14s ease;
          }
          .som-public-nav-item:hover .som-public-dropdown,
          .som-public-nav-item:focus-within .som-public-dropdown {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
          }
          @media (max-width: 980px) {
            .som-public-nav { display: none !important; }
            .som-public-nav.is-preview-menu {
              display: flex !important;
              order: 3;
              flex: 0 0 100% !important;
              width: 100%;
              overflow-x: auto;
              overflow-y: hidden;
              padding: 0 0 2px;
              scrollbar-width: none;
            }
            .som-public-nav.is-preview-menu::-webkit-scrollbar {
              display: none;
            }
            .som-public-nav.is-preview-menu .som-public-nav-item {
              flex: 0 0 auto;
            }
            .som-public-nav.is-preview-menu a {
              min-height: 42px !important;
              padding: 0 14px !important;
              font-size: 16px !important;
              white-space: nowrap;
              border-bottom-width: 3px !important;
            }
          }
          @media (max-width: 760px) {
            .som-public-utility {
              height: 38px !important;
              overflow: hidden;
            }
            .som-public-utility-inner {
              padding: 0 12px !important;
              justify-content: flex-start !important;
            }
            .som-public-utility-inner > span {
              display: none !important;
            }
            .som-public-utility-links {
              width: 100%;
              gap: 18px !important;
              justify-content: space-between;
              overflow: hidden;
              white-space: nowrap;
            }
            .som-public-utility-links a,
            .som-public-utility-links button,
            .som-public-utility-links span {
              flex: 0 0 auto;
              white-space: nowrap;
            }
            .som-utility-secondary,
            .som-utility-company {
              display: none !important;
            }
            .som-public-main-row {
              min-height: 78px !important;
              padding: 0 18px !important;
            }
            .som-public-inner {
              justify-content: space-between !important;
              flex-wrap: wrap !important;
              gap: 14px !important;
            }
          }
        `}</style>
      </header>
    );
  }

  return (
    <header style={styles.navbar}>
      <div style={styles.inner}>
        <span style={styles.topbarSpacer} />
        <div style={styles.right}>
          {user ? (
            <>
              {showDashboardLink && <a href="/dashboard" style={styles.navLink}>Dashboard</a>}
              <div style={styles.userPill}>
                <div style={styles.avatar}>
                  {(user.name || user.email || '?')[0].toUpperCase()}
                </div>
                <div style={styles.userInfo}>
                  <span style={styles.userName}>{user.name || user.email}</span>
                  <span style={styles.userRole}>{user.role}</span>
                </div>
              </div>
              <button type="button" onClick={onLogout} style={styles.logoutBtn}>Sign out</button>
            </>
          ) : (
            <a href="/login" style={styles.signInBtn}>Sign in</a>
          )}
        </div>
      </div>
    </header>
  );
}

const base = {
  inner: {
    width: '100%',
    maxWidth: 1180,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    textDecoration: 'none',
    flexShrink: 0,
  },
  logoMark: {
    width: 38,
    height: 38,
    overflow: 'hidden',
    flexShrink: 0,
    display: 'block',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
};

const appStyles = {
  ...base,
  inner: {
    ...base.inner,
    maxWidth: 'none',
    margin: 0,
  },
  topbarSpacer: {
    flex: 1,
    minWidth: 0,
  },
  navbar: {
    minHeight: 66,
    background: '#fff',
    borderTop: '4px solid var(--shell-yellow)',
    borderBottom: '1px solid var(--gray-200)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 28px',
    flexShrink: 0,
    zIndex: 100,
    boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
  },
  brandName: {
    display: 'block',
    color: 'var(--label)',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  brandSub: {
    display: 'block',
    color: 'var(--gray-500)',
    fontSize: 12,
    lineHeight: 1.25,
  },
  navLink: {
    color: 'var(--label)',
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 14px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--gray-300)',
  },
  signInBtn: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    padding: '10px 18px',
    borderRadius: 'var(--radius-xs)',
    background: 'var(--shell-red)',
  },
  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--bg)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 12px 4px 4px',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'var(--shell-yellow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
    color: 'var(--shell-red)',
  },
  userName: {
    color: 'var(--label)',
    fontSize: 12.5,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  userRole: {
    color: 'var(--label-tertiary)',
    fontSize: 10.5,
    lineHeight: 1.2,
  },
  logoutBtn: {
    background: '#fff',
    border: '1px solid var(--gray-300)',
    color: 'var(--gray-700)',
    fontSize: 12.5,
    fontWeight: 700,
    padding: '7px 13px',
    borderRadius: 'var(--radius-xs)',
  },
};

const publicStyles = {
  ...base,
  navbar: {
    background: '#fff',
    borderBottom: '1px solid var(--gray-200)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
  },
  utility: {
    height: 34,
    background: '#fff',
  },
  utilityInner: {
    width: '100%',
    maxWidth: 1600,
    margin: '0 auto',
    height: '100%',
    padding: '0 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  utilitySpacer: {
    flex: 1,
  },
  utilityLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 22,
  },
  utilityLink: {
    color: 'var(--label)',
    fontSize: 13,
    fontWeight: 500,
  },
  utilityCompany: {
    color: 'var(--label)',
    fontSize: 14,
    fontWeight: 600,
  },
  utilityButton: {
    color: 'var(--label)',
    fontSize: 13,
    fontWeight: 700,
    background: 'transparent',
    border: 0,
    padding: 0,
  },
  globe: {
    color: 'var(--gray-700)',
    fontSize: 20,
    lineHeight: 1,
  },
  mainRow: {
    minHeight: 92,
    borderTop: '1px solid transparent',
    borderBottom: '1px solid var(--gray-200)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 28px',
  },
  inner: {
    width: '100%',
    maxWidth: 1600,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  publicLogo: {
    width: 78,
    height: 78,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  publicLogoImg: {
    width: 64,
    height: 64,
    objectFit: 'contain',
    display: 'block',
  },
  brandName: {
    display: 'block',
    color: 'var(--label)',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  brandSub: {
    display: 'block',
    color: 'var(--gray-500)',
    fontSize: 12,
    lineHeight: 1.25,
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    flex: 1,
    justifyContent: 'flex-start',
  },
  previewNavLinks: {
    justifyContent: 'flex-start',
  },
  navItem: {
    position: 'relative',
  },
  navText: {
    minHeight: 70,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--gray-700)',
    fontSize: 18,
    fontWeight: 600,
    padding: '0 18px',
    borderBottom: '5px solid transparent',
  },
  previewNavText: {
    minHeight: 70,
    fontSize: 18,
    fontWeight: 600,
    padding: '0 18px',
  },
  navTextActive: {
    borderBottomColor: 'var(--shell-yellow)',
  },
  navTextHighlight: {
    background: 'var(--gray-100)',
    borderRadius: 'var(--radius-xs)',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 12px)',
    left: 0,
    minWidth: 360,
    background: '#fff',
    color: 'var(--label)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 3px 18px rgba(0,0,0,0.18)',
    padding: '18px 20px',
    display: 'grid',
    gap: 18,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 800,
  },
  dropdownLink: {
    color: 'var(--label)',
    fontSize: 18,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  searchButton: {
    width: 64,
    height: 64,
    color: 'var(--gray-700)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navLink: {
    color: 'var(--label)',
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 14px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--gray-300)',
  },
  signInBtn: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    padding: '10px 18px',
    borderRadius: 'var(--radius-xs)',
    background: 'var(--shell-red)',
  },
  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    background: 'var(--bg)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-pill)',
    padding: '5px 14px 5px 5px',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--shell-yellow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
    color: 'var(--shell-red)',
  },
  userName: {
    color: 'var(--label)',
    fontSize: 12.5,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  userRole: {
    color: 'var(--label-tertiary)',
    fontSize: 10.5,
    lineHeight: 1.2,
  },
  logoutBtn: {
    background: '#fff',
    border: '1px solid var(--gray-300)',
    color: 'var(--gray-700)',
    fontSize: 12.5,
    fontWeight: 700,
    padding: '8px 13px',
    borderRadius: 'var(--radius-xs)',
  },
};
