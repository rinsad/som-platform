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
  const isPublic = variant === 'public';
  const styles = isPublic ? publicStyles : appStyles;

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
                  <button onClick={onLogout} style={styles.utilityButton}>Sign out</button>
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

            <nav className="som-public-nav" style={styles.navLinks} aria-label="Primary">
              {PUBLIC_MENU.map((item) => (
                <div key={item.label} className="som-public-nav-item" style={styles.navItem}>
                  <a
                    href={item.href}
                    style={{
                      ...styles.navText,
                      ...(item.active ? styles.navTextActive : {}),
                      ...(item.highlight ? styles.navTextHighlight : {}),
                    }}
                  >
                    {item.label}
                    {item.items && <ChevronIcon />}
                  </a>
                  {item.items && (
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
        <a href="/" style={styles.brand} aria-label="Shell Oman Marketing home">
          <span style={styles.logoMark}>
            <img src="/logo.png" alt="Shell Oman Marketing" style={styles.logoImg} />
          </span>
          <span>
            <span style={styles.brandName}>Shell Oman Marketing</span>
            <span style={styles.brandSub}>{isPublic ? 'Employee Intraportal' : 'Enterprise Platform'}</span>
          </span>
        </a>

        {isPublic && (
          <nav className="som-public-nav" style={styles.navLinks} aria-label="Primary">
            <a href="#about" style={styles.navText}>About Shell</a>
            <a href="#departments" style={styles.navText}>Business</a>
            <a href="#hr-online" style={styles.navText}>HR Online</a>
            <a href="#employee-services" style={styles.navText}>People</a>
            <a href="#knowledge" style={styles.navText}>Knowledge</a>
          </nav>
        )}

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
              <button onClick={onLogout} style={styles.logoutBtn}>Sign out</button>
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
  navbar: {
    minHeight: 66,
    background: '#fff',
    borderTop: '5px solid #FFD500',
    borderBottom: '1px solid #e5e5e5',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
  },
  brandName: {
    display: 'block',
    color: '#222',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  brandSub: {
    display: 'block',
    color: '#666',
    fontSize: 12,
    lineHeight: 1.25,
  },
  navLink: {
    color: '#222',
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 14px',
    borderRadius: 4,
    border: '1px solid #d6d6d6',
  },
  signInBtn: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    padding: '10px 18px',
    borderRadius: 4,
    background: '#DD1D21',
  },
  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    background: '#f7f7f7',
    border: '1px solid #e1e1e1',
    borderRadius: 9999,
    padding: '5px 14px 5px 5px',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#FFD500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
    color: '#DD1D21',
  },
  userName: {
    color: '#222',
    fontSize: 12.5,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  userRole: {
    color: '#777',
    fontSize: 10.5,
    lineHeight: 1.2,
  },
  logoutBtn: {
    background: '#fff',
    border: '1px solid #d6d6d6',
    color: '#333',
    fontSize: 12.5,
    fontWeight: 700,
    padding: '8px 13px',
    borderRadius: 4,
  },
};

const publicStyles = {
  ...base,
  navbar: {
    background: '#fff',
    borderBottom: '1px solid #e5e5e5',
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
    color: '#30343b',
    fontSize: 13,
    fontWeight: 500,
  },
  utilityCompany: {
    color: '#1f2933',
    fontSize: 14,
    fontWeight: 600,
  },
  utilityButton: {
    color: '#1f2933',
    fontSize: 13,
    fontWeight: 700,
    background: 'transparent',
    border: 0,
    padding: 0,
  },
  globe: {
    color: '#3b3b3b',
    fontSize: 20,
    lineHeight: 1,
  },
  mainRow: {
    minHeight: 92,
    borderTop: '1px solid transparent',
    borderBottom: '1px solid #d9d9d9',
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
    color: '#222',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  brandSub: {
    display: 'block',
    color: '#666',
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
  navItem: {
    position: 'relative',
  },
  navText: {
    minHeight: 70,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: '#333',
    fontSize: 18,
    fontWeight: 600,
    padding: '0 18px',
    borderBottom: '5px solid transparent',
  },
  navTextActive: {
    borderBottomColor: '#FFD500',
  },
  navTextHighlight: {
    background: '#f0f0f0',
    borderRadius: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 12px)',
    left: 0,
    minWidth: 360,
    background: '#fff',
    color: '#202124',
    borderRadius: 10,
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
    color: '#1f2933',
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
    color: '#3b3b3b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navLink: {
    color: '#222',
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 14px',
    borderRadius: 4,
    border: '1px solid #d6d6d6',
  },
  signInBtn: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    padding: '10px 18px',
    borderRadius: 4,
    background: '#DD1D21',
  },
  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    background: '#f7f7f7',
    border: '1px solid #e1e1e1',
    borderRadius: 9999,
    padding: '5px 14px 5px 5px',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#FFD500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
    color: '#DD1D21',
  },
  userName: {
    color: '#222',
    fontSize: 12.5,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  userRole: {
    color: '#777',
    fontSize: 10.5,
    lineHeight: 1.2,
  },
  logoutBtn: {
    background: '#fff',
    border: '1px solid #d6d6d6',
    color: '#333',
    fontSize: 12.5,
    fontWeight: 700,
    padding: '8px 13px',
    borderRadius: 4,
  },
};
