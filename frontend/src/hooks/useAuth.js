import { useNavigate } from 'react-router-dom';

export default function useAuth() {
  const navigate = useNavigate();

  const raw = localStorage.getItem('som_user');
  const user = raw ? JSON.parse(raw) : null;
  const isLoggedIn = !!user;

  const logout = () => {
    localStorage.removeItem('som_token');
    localStorage.removeItem('som_user');
    navigate('/login');
  };

  return { user, isLoggedIn, logout };
}
