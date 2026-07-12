import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppShell from './layouts/AppShell';
import PublicShell from './layouts/PublicShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CapexDashboard from './modules/ModuleA/CapexDashboard';
import PurchaseRequestList from './modules/ModuleB/PurchaseRequestList';
import NewPurchaseRequest from './modules/ModuleB/NewPurchaseRequest';
import PRDetail from './modules/ModuleB/PRDetail';
import AssetRegistry from './modules/ModuleC/AssetRegistry';
import IntraPortal from './modules/ModuleD/IntraPortal';
import IntraPortalPreview from './modules/ModuleD/IntraPortalPreview';
import UserManagement from './modules/Admin/UserManagement';
import KBManagement from './modules/Admin/KBManagement';
import PermissionsPage from './modules/Admin/PermissionsPage';
import { buildPermMap, can } from './utils/permissions';

function RequireAuth({ children }) {
  const token = localStorage.getItem('som_token');
  return token ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const raw  = localStorage.getItem('som_user');
  const user = raw ? JSON.parse(raw) : null;
  return user?.role === 'Admin' ? children : <Navigate to="/dashboard" replace />;
}

/** Redirect to /dashboard if user lacks the given action on the resource key. */
function RequirePerm({ permKey, action = 'can_view', children }) {
  const raw   = localStorage.getItem('som_user');
  const user  = raw ? JSON.parse(raw) : null;
  const role  = user?.role ?? '';
  const perms = JSON.parse(localStorage.getItem('som_permissions') ?? '[]');
  const map   = buildPermMap(perms);
  return can(map, role, permKey, action) ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        closeButton
        richColors
        position="top-right"
        duration={4000}
        toastOptions={{
          style: {
            borderRadius: 'var(--radius-md)',
            fontFamily: 'inherit',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Public portal — home page at /, no auth required. Must come first so
            React Router resolves / here instead of the authenticated group. */}
        <Route element={<PublicShell />}>
          <Route path="/" element={<IntraPortal />} />
          <Route path="/intra-portal-preview" element={<IntraPortalPreview />} />
        </Route>

        {/* Authenticated app — /dashboard, /capex, etc. */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard"              element={<Dashboard />} />
          <Route path="/capex"                  element={<RequirePerm permKey="capex"><CapexDashboard /></RequirePerm>} />
          <Route path="/capex/requests/:requestId" element={<RequirePerm permKey="capex"><CapexDashboard /></RequirePerm>} />
          <Route path="/purchase-requests"      element={<RequirePerm permKey="purchase-requests"><PurchaseRequestList /></RequirePerm>} />
          <Route path="/purchase-requests/new"  element={<RequirePerm permKey="purchase-requests" action="can_create"><NewPurchaseRequest /></RequirePerm>} />
          <Route path="/purchase-requests/:id"  element={<RequirePerm permKey="purchase-requests"><PRDetail /></RequirePerm>} />
          <Route path="/assets"                 element={<RequirePerm permKey="assets"><AssetRegistry /></RequirePerm>} />
          <Route path="/admin/users"                      element={<RequireAdmin><UserManagement /></RequireAdmin>} />
          <Route path="/admin/users/:id/permissions"   element={<RequireAdmin><PermissionsPage /></RequireAdmin>} />
          <Route path="/admin/knowledge"               element={<RequireAdmin><KBManagement /></RequireAdmin>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
