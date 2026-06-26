import { useCallback, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = (() => {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return base === '/api' ? '' : base;
})();

export default function AppShell() {
  const navigate = useNavigate();

  const raw = localStorage.getItem('som_user');
  const user = raw ? JSON.parse(raw) : null;

  const handleLogout = useCallback(() => {
    localStorage.removeItem('som_token');
    localStorage.removeItem('som_user');
    localStorage.removeItem('som_permissions');
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('som_token');
    if (!token) return;

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ user, permissions }) => {
        localStorage.setItem('som_user', JSON.stringify(user));
        localStorage.setItem('som_permissions', JSON.stringify(permissions));
        window.dispatchEvent(new Event('som-permissions-updated'));
      })
      .catch(() => {
        handleLogout();
      });
  }, [handleLogout]);

  return (
    <div style={s.root}>
      <Navbar user={user} onLogout={handleLogout} />
      <div style={s.body}>
        <Sidebar />
        <main style={s.main}>
          <div style={s.content}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

const s = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: '#f7f7f7',
    color: '#222',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    background: 'linear-gradient(180deg, #fff8cc 0, #f7f7f7 190px)',
  },
  content: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
    animation: 'fadeIn 0.25s var(--ease)',
  },
};
