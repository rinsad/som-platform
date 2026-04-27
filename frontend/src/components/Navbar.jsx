export default function Navbar({ user, onLogout }) {
  return (
    <header style={s.navbar}>
      {/* Brand */}
      <div style={s.brand}>
        <div style={s.logoMark}>
          {/* Shell pecten — red on yellow, matches favicon */}
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <path fill="#DD1D21" d="M10 18 L1 11 L2 7 L5 3 Q10 0 15 3 L18 7 L19 11 Z"/>
            <line x1="10" y1="18" x2="2"  y2="8"  stroke="#FFD500" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="10" y1="18" x2="5"  y2="3"  stroke="#FFD500" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="10" y1="18" x2="10" y2="1"  stroke="#FFD500" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="18" x2="15" y2="3"  stroke="#FFD500" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="10" y1="18" x2="18" y2="8"  stroke="#FFD500" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M6 19 Q10 21 14 19" fill="#DD1D21"/>
          </svg>
        </div>
        <div>
          <div style={s.brandName}>Shell Oman Marketing</div>
          <div style={s.brandSub}>Enterprise Platform</div>
        </div>
      </div>

      {/* Right */}
      {user && (
        <div style={s.right}>
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
        </div>
      )}
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
    background: '#FFD500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 6px rgba(255,213,0,0.40), 0 1px 2px rgba(0,0,0,0.3)',
    flexShrink: 0,
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
