export default function Navbar({ user, onLogout, showDashboardLink = false }) {
  return (
    <header style={s.navbar}>
      {/* Brand */}
      <div style={s.brand}>
        <div style={s.logoMark}>
          <img src="/logo.png" alt="Shell Oman Marketing" style={s.logoImg} />
        </div>
        <div>
          <div style={s.brandName}>Shell Oman Marketing</div>
          <div style={s.brandSub}>Enterprise Platform</div>
        </div>
      </div>

      {/* Right */}
      <div style={s.right}>
        {user ? (
          <>
            {showDashboardLink && <a href="/dashboard" style={s.navLink}>Dashboard</a>}
            <div style={s.userPill}>
              <div style={s.avatar}>
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
              <div style={s.userInfo}>
                <span style={s.userName}>{user.name || user.email}</span>
                <span style={s.userRole}>{user.role}</span>
              </div>
            </div>
            <button onClick={onLogout} style={s.logoutBtn}>Sign out</button>
          </>
        ) : (
          <a href="/login" style={s.signInBtn}>Sign in</a>
        )}
      </div>
    </header>
  );
}

const s = {
  navbar: {
    height: '56px',
    background: 'rgba(13,13,24,0.88)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderBottom: '0.5px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoMark: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  brandName: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: '11px',
    fontWeight: '400',
    letterSpacing: '0.1px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  navLink: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: '13px',
    fontWeight: '500',
    textDecoration: 'none',
    padding: '5px 13px',
    borderRadius: '9999px',
    border: '0.5px solid rgba(255,255,255,0.18)',
    transition: 'color 0.15s',
  },
  signInBtn: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    padding: '5px 16px',
    borderRadius: '9999px',
    background: '#DD1D21',
    boxShadow: '0 2px 10px rgba(221,29,33,0.40)',
  },
  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    background: 'rgba(255,255,255,0.07)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: '9999px',
    padding: '4px 14px 4px 5px',
  },
  avatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FFD500 0%, #DD1D21 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    color: '#fff',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: '12.5px',
    fontWeight: '600',
    lineHeight: 1.2,
  },
  userRole: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: '10.5px',
    lineHeight: 1.2,
  },
  logoutBtn: {
    background: 'transparent',
    border: '0.5px solid rgba(255,255,255,0.18)',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '12.5px',
    fontWeight: '500',
    padding: '5px 13px',
    borderRadius: '9999px',
    transition: 'background 0.15s, color 0.15s',
    cursor: 'pointer',
  },
};
