// The signed-in user's multi-business scope, read straight from the stored
// session.
//
// Deliberately router-free — useAuth pulls in useNavigate for logout, which
// makes it unusable in plain form components that render outside a <Router>.
// Components that only need to know "which business am I in?" use this instead.

export function readStoredUser() {
  try {
    const raw = localStorage.getItem('som_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readUserScope() {
  const user = readStoredUser();
  // Default to the most restrictive tier: a session created before scoping
  // shipped carries no scope_tier and must fail closed until /me refreshes it.
  const scopeTier = user?.scope_tier ?? 'OWN';
  const businessFunctionId = user?.business_function_id ?? null;
  const businessFunctionName = user?.business_function_name ?? null;
  const isPortfolioScope = scopeTier === 'PORTFOLIO';

  return {
    scopeTier,
    businessFunctionId,
    businessFunctionName,
    isPortfolioScope,
    hasBusinessScope: isPortfolioScope || !!businessFunctionId,
  };
}
