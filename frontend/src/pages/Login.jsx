import { useState } from 'react';
import { useNavigate } from 'react-router-dom';


export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [focused, setFocused]   = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError('Your email or password is incorrect.');
        return;
      }

      localStorage.setItem('som_token', data.token);
      localStorage.setItem('som_user', JSON.stringify(data.user));
      localStorage.setItem('som_permissions', JSON.stringify(data.permissions ?? []));
      navigate('/dashboard');
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* ── Background: layered radial orbs — Apple Photos "Memories" feel ── */}
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.orb3} />
      <div style={s.orb4} />
      <div style={s.orbCenter} />

      {/* ── Frosted glass card ──────────────────────────────────────────────── */}
      <div style={s.card}>

        {/* App icon */}
        <div style={s.iconWrap}>
          <div style={s.icon}>
            <img src="/logo.png" alt="Shell Oman Marketing" style={s.logoImg} />
          </div>
          <div style={s.iconGlow} />
        </div>

        {/* Heading */}
        <h1 style={s.heading}>Shell Oman Marketing</h1>
        <p style={s.subheading}>Enterprise Platform</p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>

          {/* Grouped inputs — Apple's stacked field style */}
          <div style={s.fieldGroup}>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              placeholder="Email"
              autoComplete="username"
              style={{
                ...s.input,
                borderRadius: '13px 13px 0 0',
                borderBottom: '0.5px solid rgba(255,255,255,0.1)',
                background: focused === 'email'
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(255,255,255,0.09)',
              }}
            />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused('')}
              placeholder="Password"
              autoComplete="current-password"
              style={{
                ...s.input,
                borderRadius: '0 0 13px 13px',
                background: focused === 'password'
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(255,255,255,0.09)',
              }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={s.errorRow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" fill="rgba(255,69,58,0.3)" stroke="rgba(255,69,58,0.8)" strokeWidth="1.5" />
                <line x1="12" y1="8" x2="12" y2="13" stroke="rgba(255,120,100,1)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="rgba(255,120,100,1)"/>
              </svg>
              {error}
            </div>
          )}

          {/* Sign In button */}
          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btn, ...(loading ? s.btnLoading : {}) }}
          >
            {loading
              ? <span style={s.spinner} />
              : 'Sign In'
            }
          </button>

        </form>

        {/* Divider */}
        <div style={s.divider} />

        {/* Footer tagline */}
        <p style={s.cardFooter}>Secure · Enterprise · Shell Oman</p>
      </div>

      <a href="/" style={s.backLink}>← Back to home</a>

      <p style={s.pageFooter}>
        © {new Date().getFullYear()} Shell Oman Marketing. All rights reserved.
      </p>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

const s = {
  /* Page: dark canvas */
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0d0d18',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: FONT,
  },

  /* Layered glowing orbs — Shell brand palette, Apple wallpaper feel */
  orb1: {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
    width: '75vw', height: '75vw', maxWidth: 900, maxHeight: 900,
    top: '-20%', left: '-15%',
    background: 'radial-gradient(circle, rgba(221,29,33,0.55) 0%, transparent 65%)',
    filter: 'blur(2px)',
  },
  orb2: {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
    width: '60vw', height: '60vw', maxWidth: 760, maxHeight: 760,
    top: '-10%', right: '-10%',
    background: 'radial-gradient(circle, rgba(255,213,0,0.35) 0%, transparent 60%)',
    filter: 'blur(2px)',
  },
  orb3: {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
    width: '80vw', height: '80vw', maxWidth: 960, maxHeight: 960,
    bottom: '-25%', right: '-10%',
    background: 'radial-gradient(circle, rgba(255,213,0,0.28) 0%, transparent 60%)',
    filter: 'blur(2px)',
  },
  orb4: {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
    width: '50vw', height: '50vw', maxWidth: 640, maxHeight: 640,
    bottom: '-10%', left: '-8%',
    background: 'radial-gradient(circle, rgba(221,29,33,0.3) 0%, transparent 58%)',
    filter: 'blur(2px)',
  },
  orbCenter: {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
    width: '40vw', height: '40vw', maxWidth: 520, maxHeight: 520,
    top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    background: 'radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)',
  },

  /* Frosted glass card */
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '380px',
    background: 'rgba(255,255,255,0.10)',
    backdropFilter: 'blur(64px) saturate(180%)',
    WebkitBackdropFilter: 'blur(64px) saturate(180%)',
    border: '0.5px solid rgba(255,255,255,0.20)',
    borderRadius: '28px',
    padding: '44px 36px 36px',
    boxShadow: `
      0 0 0 0.5px rgba(0,0,0,0.4),
      0 50px 100px rgba(0,0,0,0.55),
      0 20px 40px rgba(0,0,0,0.3),
      inset 0 1px 0 rgba(255,255,255,0.15)
    `,
    animation: 'fadeIn 0.45s ease',
  },

  /* Icon */
  iconWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '22px',
    position: 'relative',
  },
  icon: {
    width: '72px',
    height: '72px',
    borderRadius: '17px',
    overflow: 'hidden',
    boxShadow: '0 12px 36px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)',
    position: 'relative',
    zIndex: 1,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  iconGlow: {
    position: 'absolute',
    width: '72px', height: '72px',
    borderRadius: '17px',
    background: 'rgba(255,255,255,0.25)',
    filter: 'blur(22px)',
    top: '8px',
    zIndex: 0,
  },

  /* Typography */
  heading: {
    textAlign: 'center',
    fontSize: '22px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: '-0.4px',
    marginBottom: '5px',
    fontFamily: FONT,
  },
  subheading: {
    textAlign: 'center',
    fontSize: '13.5px',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: '28px',
    letterSpacing: '0.1px',
    fontFamily: FONT,
  },

  /* Form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  /* Apple grouped input container */
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '13px',
    overflow: 'hidden',
    boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.12)',
  },

  /* Individual input — no border, fills colored by focus */
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    fontFamily: FONT,
    color: 'rgba(255,255,255,0.92)',
    border: 'none',
    outline: 'none',
    transition: 'background 0.18s',
    width: '100%',
    boxSizing: 'border-box',
    caretColor: '#DD1D21',
    /* placeholder colour via CSS class injected below */
  },

  /* Error */
  errorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '13px',
    color: 'rgba(255,100,85,0.95)',
    fontWeight: '500',
    padding: '0 2px',
    fontFamily: FONT,
  },

  /* Sign In button */
  btn: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: '#DD1D21',
    border: 'none',
    borderRadius: '13px',
    cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.12s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50px',
    letterSpacing: '-0.1px',
    fontFamily: FONT,
    boxShadow: '0 4px 18px rgba(221,29,33,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
    marginTop: '4px',
  },
  btnLoading: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },

  /* Spinner */
  spinner: {
    width: '19px',
    height: '19px',
    border: '2.5px solid rgba(255,255,255,0.25)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
    display: 'inline-block',
  },

  /* Card divider */
  divider: {
    height: '0.5px',
    background: 'rgba(255,255,255,0.1)',
    margin: '22px 0 16px',
  },

  /* Card bottom tagline */
  cardFooter: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    fontFamily: FONT,
  },

  backLink: {
    position: 'relative',
    zIndex: 1,
    marginTop: '16px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.40)',
    textDecoration: 'none',
    fontFamily: FONT,
    transition: 'color 0.15s',
  },

  /* Page footer */
  pageFooter: {
    position: 'relative',
    zIndex: 1,
    marginTop: '28px',
    fontSize: '11.5px',
    color: 'rgba(255,255,255,0.22)',
    textAlign: 'center',
    fontFamily: FONT,
  },
};

/* ── Placeholder colour injection (once) ──────────────────────────────────── */
if (typeof document !== 'undefined') {
  const id = 'som-login-styles';
  if (!document.getElementById(id)) {
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      #email::placeholder,
      #password::placeholder {
        color: rgba(255,255,255,0.32);
      }
      #email::-webkit-input-placeholder,
      #password::-webkit-input-placeholder {
        color: rgba(255,255,255,0.32);
      }
    `;
    document.head.appendChild(el);
  }
}
