import { useNavigate } from 'react-router-dom';
import { readUserScope } from '../utils/userScope';

export default function useAuth() {
  const navigate = useNavigate();

  const raw = localStorage.getItem('som_user');
  const user = raw ? JSON.parse(raw) : null;
  const isLoggedIn = !!user;

  // Multi-business scoping, via the router-free helper so components that
  // cannot use this hook still read exactly the same values.
  const {
    scopeTier,
    businessFunctionId,
    businessFunctionName,
    isPortfolioScope,
    hasBusinessScope,
  } = readUserScope();

  const logout = () => {
    localStorage.removeItem('som_token');
    localStorage.removeItem('som_user');
    navigate('/login');
  };

  return {
    user,
    isLoggedIn,
    logout,
    scopeTier,
    businessFunctionId,
    businessFunctionName,
    isPortfolioScope,
    hasBusinessScope,
  };
}
