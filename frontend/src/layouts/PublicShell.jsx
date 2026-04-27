import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function PublicShell() {
  const navigate = useNavigate();

  const raw  = localStorage.getItem('som_user');
  const user = raw ? JSON.parse(raw) : null;

  const handleLogout = () => {
    localStorage.removeItem('som_token');
    localStorage.removeItem('som_user');
    localStorage.removeItem('som_permissions');
    navigate('/login');
  };

  return (
    <div style={s.root}>
      {/* Atmospheric orbs — same Shell brand palette as AppShell */}
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.orb3} />
      <div style={s.orb4} />

      <Navbar user={user} onLogout={handleLogout} />

      <main style={s.main}>
        <div style={s.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const s = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: '#0d0d18',
    position: 'relative',
  },
  orb1: {
    position: 'fixed', pointerEvents: 'none', borderRadius: '50%', zIndex: 0,
    width: '80vw', height: '80vw', maxWidth: 1000, maxHeight: 1000,
    top: '-30%', left: '-20%',
    background: 'radial-gradient(circle, rgba(221,29,33,0.22) 0%, transparent 65%)',
    filter: 'blur(4px)',
  },
  orb2: {
    position: 'fixed', pointerEvents: 'none', borderRadius: '50%', zIndex: 0,
    width: '60vw', height: '60vw', maxWidth: 760, maxHeight: 760,
    top: '-10%', right: '-15%',
    background: 'radial-gradient(circle, rgba(255,213,0,0.12) 0%, transparent 60%)',
    filter: 'blur(4px)',
  },
  orb3: {
    position: 'fixed', pointerEvents: 'none', borderRadius: '50%', zIndex: 0,
    width: '70vw', height: '70vw', maxWidth: 900, maxHeight: 900,
    bottom: '-25%', right: '-10%',
    background: 'radial-gradient(circle, rgba(255,213,0,0.14) 0%, transparent 60%)',
    filter: 'blur(4px)',
  },
  orb4: {
    position: 'fixed', pointerEvents: 'none', borderRadius: '50%', zIndex: 0,
    width: '50vw', height: '50vw', maxWidth: 640, maxHeight: 640,
    bottom: '-15%', left: '-5%',
    background: 'radial-gradient(circle, rgba(221,29,33,0.14) 0%, transparent 58%)',
    filter: 'blur(4px)',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    background: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
  content: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
    animation: 'fadeIn 0.25s var(--ease)',
  },
};
