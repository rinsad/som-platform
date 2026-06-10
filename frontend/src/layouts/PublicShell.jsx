import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function PublicShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = location.pathname.startsWith('/intra-portal-preview');

  const raw = localStorage.getItem('som_user');
  const user = raw ? JSON.parse(raw) : null;

  const handleLogout = () => {
    localStorage.removeItem('som_token');
    localStorage.removeItem('som_user');
    localStorage.removeItem('som_permissions');
    navigate('/login');
  };

  return (
    <div style={s.root}>
      <Navbar user={user} onLogout={handleLogout} showDashboardLink={!!user} variant={isPreview ? 'preview' : 'public'} />
      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

const s = {
  root: {
    minHeight: '100vh',
    background: '#fff',
    color: '#222',
  },
  main: {
    background: '#fff',
  },
};
