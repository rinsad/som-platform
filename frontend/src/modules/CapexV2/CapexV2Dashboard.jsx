import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, FilePlus2 } from 'lucide-react';
import { getCapexV2ApprovalInbox, getCapexV2Dashboard } from '../../services/capexV2Service';
import { CapexV2Empty, CapexV2Error, CapexV2Loading, StatusBadge } from './CapexV2States';
import { formatOmr } from './capexV2Format';

export default function CapexV2Dashboard({ view = 'operational' }) {
  const navigate = useNavigate();
  const { context } = useOutletContext();
  const [state, setState] = useState({ loading: true, data: null, inbox: [], error: null });

  const load = () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([
      getCapexV2Dashboard(view),
      view === 'operational' ? getCapexV2ApprovalInbox().catch(() => []) : Promise.resolve([]),
    ])
      .then(([data, inbox]) => setState({ loading: false, data, inbox, error: null }))
      .catch((error) => setState({ loading: false, data: null, inbox: [], error }));
  };
  useEffect(() => {
    let active = true;
    Promise.all([
      getCapexV2Dashboard(view),
      view === 'operational' ? getCapexV2ApprovalInbox().catch(() => []) : Promise.resolve([]),
    ])
      .then(([data, inbox]) => { if (active) setState({ loading: false, data, inbox, error: null }); })
      .catch((error) => { if (active) setState({ loading: false, data: null, inbox: [], error }); });
    return () => { active = false; };
  }, [view]);

  if (state.loading) return <CapexV2Loading lines={8} />;
  if (state.error) return <CapexV2Error error={state.error} onRetry={load} />;
  const { data, inbox } = state;
  const heading = view === 'executive' ? 'Portfolio control' : view === 'business-unit' ? 'Business-unit control' : 'My CAPEX work';
  const description = view === 'operational'
    ? 'Requests you own and decisions assigned specifically to you.'
    : 'Budget, request, and governance indicators limited to your authorized scope.';

  return (
    <div>
      <div className="capex-v2-section-heading">
        <div>
          <h2>{heading}</h2>
          <p>{description}</p>
        </div>
        {context.capabilities.includes('request:create') || context.isAdmin ? (
          <div className="capex-v2-section-heading__actions">
            <button type="button" className="capex-v2-btn" onClick={() => navigate('/capex-v2/requests/new')}>
              <FilePlus2 size={14} strokeWidth={2} aria-hidden="true" /> New request
            </button>
          </div>
        ) : null}
      </div>

      <div className="capex-v2-message capex-v2-message--warning" role="status">
        <div>
          <strong>{data.authorityNotice}</strong>
          <p>Workflow decisions remain marked with their authority mode in the immutable audit trail.</p>
        </div>
      </div>

      <div className="capex-v2-summary-grid" style={{ marginTop: 14 }}>
        <div className="capex-v2-summary-item">
          <span>Authorized budget</span>
          <strong>{formatOmr(data.financials.authorizedBudget, true)}</strong>
          <small>Posted SAC baseline plus approved transfers</small>
        </div>
        <div className="capex-v2-summary-item">
          <span>Available</span>
          <strong>{formatOmr(data.financials.available, true)}</strong>
          <small>Budget less commitments and actuals</small>
        </div>
        <div className="capex-v2-summary-item">
          <span>Active requests</span>
          <strong>{Number(data.requests.inReview || 0) + Number(data.requests.returned || 0)}</strong>
          <small>{data.requests.urgent || 0} marked urgent</small>
        </div>
        <div className="capex-v2-summary-item">
          <span>My decisions</span>
          <strong>{data.approvals.pending || 0}</strong>
          <small>Oldest pending: {data.approvals.oldestPendingDays || 0} days</small>
        </div>
      </div>

      <div className="capex-v2-split">
        <section className="capex-v2-panel">
          <div className="capex-v2-panel__header">
            <h3>{view === 'operational' ? 'Recent requests in my scope' : 'Recent portfolio activity'}</h3>
            <button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => navigate('/capex-v2/requests')}>View register</button>
          </div>
          {data.recentRequests.length ? (
            <div className="capex-v2-table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="capex-v2-table">
                <thead><tr><th>Request</th><th>Business / Function</th><th>Value</th><th>Status</th></tr></thead>
                <tbody>
                  {data.recentRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <button type="button" className="capex-v2-table__link" onClick={() => navigate(`/capex-v2/requests/${request.id}`)}>{request.title}</button>
                        <span className="capex-v2-table__meta">{request.requestNumber}</span>
                      </td>
                      <td>{request.organizationName}</td>
                      <td>{formatOmr(request.estimatedValue)}</td>
                      <td><span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}><StatusBadge status={request.status} />{request.urgent && <StatusBadge urgent />}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CapexV2Empty title="No requests in this scope" description="Requests will appear here after a project owner saves the first draft." />
          )}
        </section>

        <aside className="capex-v2-panel">
          <div className="capex-v2-panel__header"><h3>{view === 'operational' ? 'Assigned decisions' : 'Business / Function view'}</h3></div>
          <div className="capex-v2-panel__body">
            {view === 'operational' ? (
              inbox.length ? (
                <div className="capex-v2-work-list">
                  {inbox.slice(0, 6).map((item) => (
                    <button key={item.stepId} type="button" className="capex-v2-work-item" onClick={() => navigate(`/capex-v2/requests/${item.requestId}`)}>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.requestNumber} · {item.organizationName}</small>
                      </span>
                      <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : <CapexV2Empty title="No decisions waiting" description="Assigned approval and screening steps will appear here." />
            ) : data.organizations.length ? (
              <div className="capex-v2-work-list">
                {data.organizations.map((organization) => (
                  <div key={organization.id} className="capex-v2-work-item">
                    <span><strong>{organization.name}</strong><small>{organization.requests} requests</small></span>
                    <strong>{formatOmr(organization.budget, true)}</strong>
                  </div>
                ))}
              </div>
            ) : <CapexV2Empty title="No authorized Business / Functions" description="An administrator must load the approved Business / Function master and assign your access scope." />}
          </div>
        </aside>
      </div>
    </div>
  );
}
