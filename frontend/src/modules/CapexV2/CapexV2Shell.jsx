import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { getCapexV2Context } from '../../services/capexV2Service';
import { CapexV2Error, CapexV2Loading } from './CapexV2States';
import './capex-v2.css';

export default function CapexV2Shell() {
  const [state, setState] = useState({ loading: true, context: null, error: null });
  const load = () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    getCapexV2Context()
      .then((context) => setState({ loading: false, context, error: null }))
      .catch((error) => setState({ loading: false, context: null, error }));
  };
  useEffect(() => {
    let active = true;
    getCapexV2Context()
      .then((context) => { if (active) setState({ loading: false, context, error: null }); })
      .catch((error) => { if (active) setState({ loading: false, context: null, error }); });
    return () => { active = false; };
  }, []);

  if (state.loading) return <CapexV2Loading lines={7} />;
  if (state.error) return <CapexV2Error error={state.error} onRetry={load} />;

  const { context } = state;
  const hasWorkspace = (key) => context.workspaces?.some((workspace) => workspace.key === key);
  const navigation = [
    { to: '/capex-v2', end: true, label: 'My work' },
    { to: '/capex-v2/requests', label: 'Requests' },
    ...(hasWorkspace('budgets') ? [{ to: '/capex-v2/budgets', label: 'Budget control' }] : []),
    ...(hasWorkspace('business-unit') ? [{ to: '/capex-v2/business-unit', label: 'Business unit' }] : []),
    ...(hasWorkspace('executive') ? [{ to: '/capex-v2/executive', label: 'Portfolio' }] : []),
    ...(context.isAdmin ? [{ to: '/capex-v2/configuration', label: 'Configuration' }] : []),
  ];

  return (
    <section className="capex-v2-root">
      <header className="capex-v2-hero">
        <div>
          <span className="capex-v2-eyebrow">CAPEX governance · parallel pilot</span>
          <h1>CAPEX control workspace</h1>
          <p>Approved budget, evidence, HSSE screening, and authority decisions in one traceable route.</p>
        </div>
        <div className="capex-v2-authority">
          <span className="capex-v2-authority__dot" />
          <span>
            <strong>{context.authorityMode === 'PILOT_ONLY' ? 'Pilot authority' : 'Production controls ready'}</strong>
            <small>{context.displayRole}</small>
          </span>
        </div>
      </header>

      <nav className="capex-v2-subnav" aria-label="CAPEX v2 workspace">
        {navigation.map(({ to, end, label }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `capex-v2-subnav__item${isActive ? ' is-active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ context, reloadContext: load }} />
    </section>
  );
}
