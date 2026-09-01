import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppShell from './layouts/AppShell';
import PublicShell from './layouts/PublicShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CapexV2Shell from './modules/CapexV2/CapexV2Shell';
import PurchaseRequestList from './modules/ModuleB/PurchaseRequestList';
import NewPurchaseRequest from './modules/ModuleB/NewPurchaseRequest';
import PRDetail from './modules/ModuleB/PRDetail';
import AssetRegistry from './modules/ModuleC/AssetRegistry';
import IntraPortalPreview from './modules/ModuleD/IntraPortalPreview';
import IntraPortalV3 from './modules/ModuleD/IntraPortalV3';
import UserManagement from './modules/Admin/UserManagement';
import KBManagement from './modules/Admin/KBManagement';
import PermissionsPage from './modules/Admin/PermissionsPage';
import { buildPermMap, can } from './utils/permissions';

const CapexDashboard = lazy(() => import('./modules/ModuleA/CapexDashboard'));
const NewCapexRequest = lazy(() => import('./modules/ModuleA/NewCapexRequest'));
const CapexV2Dashboard = lazy(() => import('./modules/CapexV2/CapexV2Dashboard'));
const CapexV2Requests = lazy(() => import('./modules/CapexV2/CapexV2Requests'));
const CapexV2RequestForm = lazy(() => import('./modules/CapexV2/CapexV2RequestForm'));
const CapexV2RequestDetail = lazy(() => import('./modules/CapexV2/CapexV2RequestDetail'));
const CapexV2Budgets = lazy(() => import('./modules/CapexV2/CapexV2Budgets'));
const CapexV2Configuration = lazy(() => import('./modules/CapexV2/CapexV2Configuration'));

function Deferred({ children }) {
  return <Suspense fallback={<div role="status" aria-live="polite" style={{ padding: 24 }}>Loading workspace…</div>}>{children}</Suspense>;
}

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
        {/* Public intra-portal — home page at /, no auth required. */}
        <Route path="/" element={<IntraPortalV3 />} />
        <Route path="/this-is-shell" element={<IntraPortalV3 page="this-is-shell" />} />
        <Route path="/ceo-corner" element={<IntraPortalV3 page="ceo-corner" />} />
        <Route path="/hr-online" element={<IntraPortalV3 page="hr-online" />} />
        <Route path="/business-mileage-claim" element={<IntraPortalV3 page="business-mileage-claim" />} />
        <Route path="/recreational-wellness-scheme" element={<IntraPortalV3 page="recreational-wellness-scheme" />} />
        <Route path="/healthcare-benefits" element={<IntraPortalV3 page="healthcare-benefits" />} />
        <Route path="/mobile-phones-business-numbers" element={<IntraPortalV3 page="mobile-phones-business-numbers" />} />
        <Route path="/learning" element={<IntraPortalV3 page="learning" />} />
        <Route path="/tools-and-resources" element={<IntraPortalV3 page="tools-and-resources" />} />
        <Route path="/own-the-spotlight-salma-al-madailwi" element={<IntraPortalV3 page="own-the-spotlight-salma-al-madailwi" />} />
        <Route path="/welcome-shurooq-al-darmaki" element={<IntraPortalV3 page="welcome-shurooq-al-darmaki" />} />

        {/* Standalone design preview, kept outside the authenticated app. */}
        <Route element={<PublicShell />}>
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
          <Route path="/capex"                  element={<RequirePerm permKey="capex"><Deferred><CapexDashboard /></Deferred></RequirePerm>} />
          <Route path="/capex/requests/new"     element={<RequirePerm permKey="capex.requests" action="can_create"><Deferred><NewCapexRequest /></Deferred></RequirePerm>} />
          <Route path="/capex/requests/:requestId" element={<RequirePerm permKey="capex"><Deferred><CapexDashboard /></Deferred></RequirePerm>} />
          <Route path="/capex-v2" element={<RequirePerm permKey="capex"><CapexV2Shell /></RequirePerm>}>
            <Route index element={<Deferred><CapexV2Dashboard view="operational" /></Deferred>} />
            <Route path="requests" element={<Deferred><CapexV2Requests /></Deferred>} />
            <Route path="requests/new" element={<Deferred><CapexV2RequestForm /></Deferred>} />
            <Route path="requests/:requestId" element={<Deferred><CapexV2RequestDetail /></Deferred>} />
            <Route path="budgets" element={<Deferred><CapexV2Budgets /></Deferred>} />
            <Route path="business-unit" element={<Deferred><CapexV2Dashboard view="business-unit" /></Deferred>} />
            <Route path="executive" element={<Deferred><CapexV2Dashboard view="executive" /></Deferred>} />
            <Route path="configuration" element={<RequireAdmin><Deferred><CapexV2Configuration /></Deferred></RequireAdmin>} />
          </Route>
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
