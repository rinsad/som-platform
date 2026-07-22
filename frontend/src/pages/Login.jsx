import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        setError('Invalid email or password.');
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
    <div className="som-login-page" style={s.page}>
      <section className="som-login-brand" style={s.brandPanel}>
        <div style={s.brandShapePrimary} />
        <div style={s.brandShapeSecondary} />
        <div style={s.brandShapeLine} />

        <a href="/" style={s.logoRow}>
          <img src="/leen-logo.png" alt="Leen" style={s.logo} />
          <span>
            <strong style={s.brandName}>Shell Oman Marketing</strong>
            <span style={s.brandSub}>Employee Intraportal</span>
          </span>
        </a>

        <div style={s.brandCopy}>
          <span style={s.eyebrow}>Secure enterprise access</span>
          <h1 style={s.heroTitle}>Welcome to the SOM internal workspace</h1>
          <p style={s.heroText}>
            Sign in to access dashboards, approvals, department tools, HR Online,
            assets, knowledge resources and Shell Oman business services.
          </p>
        </div>

        <div style={s.brandFooter}>
          <span>Goal Zero</span>
          <span>Performance</span>
          <span>People</span>
        </div>
      </section>

      <section className="som-login-form" style={s.formPanel}>
        <div style={s.card}>
          <div style={s.cardAccent} />
          <h2 style={s.heading}>Sign in</h2>
          <p style={s.subheading}>Use your Shell Oman platform credentials.</p>

          <form onSubmit={handleSubmit} style={s.form}>
            <label style={s.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shell.om"
              autoComplete="username"
              style={s.input}
              required
            />

            <label style={s.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={s.input}
              required
            />

            {error && <div style={s.errorRow}>{error}</div>}

            <button type="submit" disabled={loading} aria-busy={loading} style={{ ...s.btn, ...(loading ? s.btnLoading : {}) }}>
              {loading ? <><span style={s.spinner} aria-hidden="true" /> Signing In…</> : 'Sign In'}
            </button>
          </form>

          <div style={s.cardFooter}>
            <span>Secure</span>
            <span>Enterprise</span>
            <span>Shell Oman</span>
          </div>
        </div>

        <a href="/" style={s.backLink}>Back to home</a>
        <p style={s.pageFooter}>
          © {new Date().getFullYear()} Shell Oman Marketing. All rights reserved.
        </p>
        <style>{`
          @media (max-width: 860px) {
            .som-login-page {
              grid-template-columns: 1fr !important;
            }
            .som-login-brand {
              min-height: 390px !important;
              border-right: 0 !important;
              border-bottom: 10px solid var(--shell-yellow) !important;
            }
            .som-login-form {
              min-height: auto !important;
            }
          }
        `}</style>
      </section>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: 'minmax(360px, 0.92fr) minmax(420px, 1.08fr)',
    background: '#fff',
    color: 'var(--label)',
  },
  brandPanel: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100vh',
    padding: '38px 44px',
    background: 'linear-gradient(135deg, var(--gray-700) 0%, var(--gray-900) 42%, var(--shell-red) 100%)',
    borderRight: '14px solid var(--shell-yellow)',
    color: '#fff',
    overflow: 'hidden',
  },
  brandShapePrimary: {
    position: 'absolute',
    right: '-18%',
    bottom: '-16%',
    width: '62%',
    aspectRatio: '1',
    borderRadius: '50%',
    background: 'rgba(255,213,0,0.20)',
    pointerEvents: 'none',
  },
  brandShapeSecondary: {
    position: 'absolute',
    right: '-8%',
    top: '14%',
    width: '34%',
    aspectRatio: '1',
    borderRadius: '50%',
    border: '42px solid rgba(255,213,0,0.16)',
    pointerEvents: 'none',
  },
  brandShapeLine: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: 18,
    background: 'var(--shell-red)',
    borderTop: '8px solid var(--shell-yellow)',
    pointerEvents: 'none',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: 'fit-content',
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    width: 84,
    height: 60,
    objectFit: 'contain',
    background: '#fff',
    borderRadius: 'var(--radius-xs)',
    padding: 2,
  },
  brandName: {
    display: 'block',
    fontSize: 17,
    lineHeight: 1.15,
  },
  brandSub: {
    display: 'block',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  brandCopy: {
    maxWidth: 560,
    position: 'relative',
    zIndex: 1,
  },
  eyebrow: {
    display: 'inline-flex',
    background: 'var(--shell-yellow)',
    color: 'var(--label)',
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase',
    padding: '8px 11px',
    borderRadius: 'var(--radius-xs)',
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 'clamp(42px, 5vw, 68px)',
    lineHeight: 0.98,
    fontWeight: 900,
    marginBottom: 20,
  },
  heroText: {
    fontSize: 18,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.88)',
  },
  brandFooter: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 1,
  },
  formPanel: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    background: 'linear-gradient(180deg, var(--bg-tertiary) 0, #fff 220px)',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    background: '#fff',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)',
    padding: '34px 32px 28px',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    animation: 'fadeIn 0.3s ease',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 7,
    background: 'var(--shell-red)',
  },
  heading: {
    fontSize: 32,
    fontWeight: 900,
    color: 'var(--label)',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: 'var(--gray-500)',
    marginBottom: 24,
  },
  form: {
    display: 'grid',
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: 900,
    color: 'var(--gray-600)',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-xs)',
    background: 'var(--gray-50)',
    color: 'var(--label)',
    fontSize: 15,
    outlineColor: 'var(--shell-red)',
  },
  errorRow: {
    background: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-line)',
    color: 'var(--shell-red)',
    borderRadius: 'var(--radius-xs)',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 800,
    marginTop: 4,
  },
  btn: {
    marginTop: 8,
    padding: '13px 16px',
    minHeight: 48,
    border: 'none',
    borderRadius: 'var(--radius-xs)',
    background: 'var(--shell-red)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinner: {
    width: 19,
    height: 19,
    border: '3px solid rgba(255,255,255,0.32)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
    display: 'inline-block',
  },
  cardFooter: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    color: 'var(--label-tertiary)',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    marginTop: 22,
    paddingTop: 18,
    borderTop: '1px solid var(--gray-100)',
  },
  backLink: {
    marginTop: 18,
    color: 'var(--shell-red)',
    fontSize: 13,
    fontWeight: 900,
  },
  pageFooter: {
    marginTop: 22,
    fontSize: 12,
    color: 'var(--label-tertiary)',
    textAlign: 'center',
  },
};
