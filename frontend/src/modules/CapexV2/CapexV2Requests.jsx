import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SelectField from '../../components/SelectField';
import { getCapexV2MasterData, getCapexV2Requests } from '../../services/capexV2Service';
import { CapexV2Empty, CapexV2Error, CapexV2Loading, StatusBadge } from './CapexV2States';
import { formatDate, formatOmr } from './capexV2Format';

const EMPTY_FILTERS = { search: '', status: '', organizationUnitId: '', urgency: '' };

export default function CapexV2Requests() {
  const navigate = useNavigate();
  const { context } = useOutletContext();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [state, setState] = useState({ loading: true, result: null, master: null, error: null });

  const load = () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([getCapexV2Requests(applied), getCapexV2MasterData()])
      .then(([result, master]) => setState({ loading: false, result, master, error: null }))
      .catch((error) => setState({ loading: false, result: null, master: null, error }));
  };
  useEffect(() => {
    let active = true;
    Promise.all([getCapexV2Requests(applied), getCapexV2MasterData()])
      .then(([result, master]) => { if (active) setState({ loading: false, result, master, error: null }); })
      .catch((error) => { if (active) setState({ loading: false, result: null, master: null, error }); });
    return () => { active = false; };
  }, [applied]);

  const submitFilters = (event) => { event.preventDefault(); setApplied({ ...filters }); };
  const clear = () => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); };

  if (state.loading && !state.result) return <CapexV2Loading lines={8} />;
  if (state.error) return <CapexV2Error error={state.error} onRetry={load} />;
  const { result, master } = state;

  return (
    <div>
      <div className="capex-v2-section-heading">
        <div>
          <h2>CAPEX request register</h2>
          <p>{result.total} request{result.total === 1 ? '' : 's'} in your authorized scope, ordered by latest activity.</p>
        </div>
        {(context.isAdmin || context.capabilities.includes('request:create')) && (
          <div className="capex-v2-section-heading__actions">
            <button type="button" className="capex-v2-btn" onClick={() => navigate('/capex-v2/requests/new')}>New CAPEX request</button>
          </div>
        )}
      </div>

      <form className="capex-v2-filterbar" onSubmit={submitFilters}>
        <input className="capex-v2-input" aria-label="Search requests" placeholder="Search title, number, or description" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <SelectField className="capex-v2-select" aria-label="Filter by status" value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={['DRAFT', 'IN_REVIEW', 'RETURNED', 'APPROVED', 'REJECTED', 'WITHDRAWN'].map((status) => ({ value: status, label: status.replaceAll('_', ' ') }))} placeholder="All statuses" />
        <SelectField className="capex-v2-select" aria-label="Filter by Business / Function" value={filters.organizationUnitId} onChange={(organizationUnitId) => setFilters({ ...filters, organizationUnitId })} options={master.organizations.map((organization) => ({ value: organization.id, label: organization.name }))} placeholder="All Business / Functions" />
        <SelectField className="capex-v2-select" aria-label="Filter by urgency" value={filters.urgency} onChange={(urgency) => setFilters({ ...filters, urgency })} options={[{ value: 'URGENT', label: 'Urgent' }, { value: 'STANDARD', label: 'Standard' }]} placeholder="All urgency" />
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="submit" className="capex-v2-btn">Apply</button>
          <button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={clear}>Clear</button>
        </div>
      </form>

      {state.loading ? <CapexV2Loading lines={4} /> : result.items.length ? (
        <div className="capex-v2-table-wrap">
          <table className="capex-v2-table">
            <thead><tr><th>Request</th><th>Owner</th><th>Business / Function</th><th>Value</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {result.items.map((request) => (
                <tr key={request.id}>
                  <td>
                    <button type="button" className="capex-v2-table__link" onClick={() => navigate(`/capex-v2/requests/${request.id}`)}>{request.title}</button>
                    <span className="capex-v2-table__meta">{request.requestNumber}</span>
                  </td>
                  <td>{request.ownerName}</td>
                  <td>{request.organizationName}</td>
                  <td>{formatOmr(request.estimatedValue)}</td>
                  <td><span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}><StatusBadge status={request.status} />{request.urgent && <StatusBadge urgent />}</span></td>
                  <td>{formatDate(request.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="capex-v2-panel">
          <CapexV2Empty
            title="No requests match these filters"
            description="Clear the filters or create a CAPEX request against an imported budget allocation."
            action={<button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={clear}>Clear filters</button>}
          />
        </div>
      )}
    </div>
  );
}
