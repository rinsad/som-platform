import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DateField from '../../components/DateField';
import SelectField from '../../components/SelectField';
import {
  activateCapexV2WorkflowVersion,
  createCapexV2Organization,
  createCapexV2WorkflowDefinition,
  createCapexV2WorkflowVersion,
  getCapexV2MasterData,
  getCapexV2Workflow,
  simulateCapexV2Workflow,
} from '../../services/capexV2Service';
import { CapexV2Empty, CapexV2Error, CapexV2Loading, StatusBadge } from './CapexV2States';

const RULE_TEMPLATE = JSON.stringify([
  {
    ruleOrder: 1,
    label: 'Replace with signed MOA band and condition',
    valueBand: 'LOW',
    minAmount: '0.000',
    maxAmount: '24999.999',
    minQuoteCount: 0,
    allowQuoteWaiver: false,
    steps: [
      {
        stepKey: 'REPLACE_WITH_SIGNED_ROLE',
        label: 'Replace with signed approval step',
        approverRole: 'Replace with authoritative role',
        scopeResolution: 'REQUEST_ORG'
      }
    ]
  }
], null, 2);

export default function CapexV2Configuration() {
  const [state, setState] = useState({ loading: true, master: null, workflows: [], error: null });
  const [organization, setOrganization] = useState({ name: '', externalReference: '' });
  const [definition, setDefinition] = useState({ code: 'CAPEX_REQUEST_MOA', name: 'CAPEX Request Manual of Authority', workflowType: 'CAPEX_REQUEST' });
  const [version, setVersion] = useState({ definitionId: '', sourceArtifactReference: '', authorityMode: 'PILOT', rules: RULE_TEMPLATE });
  const [activationRefs, setActivationRefs] = useState({});
  const [simulation, setSimulation] = useState({ versionId: '', amount: '', quoteCount: '3', organizationUnitId: '' });
  const [simulationResult, setSimulationResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const updateActivation = (versionId, patch) => setActivationRefs((current) => ({
    ...current,
    [versionId]: { ...(current[versionId] || {}), ...patch },
  }));

  const load = () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([getCapexV2MasterData(), getCapexV2Workflow()])
      .then(([master, workflows]) => setState({ loading: false, master, workflows, error: null }))
      .catch((error) => setState({ loading: false, master: null, workflows: [], error }));
  };
  useEffect(() => {
    let active = true;
    Promise.all([getCapexV2MasterData(), getCapexV2Workflow()])
      .then(([master, workflows]) => { if (active) setState({ loading: false, master, workflows, error: null }); })
      .catch((error) => { if (active) setState({ loading: false, master: null, workflows: [], error }); });
    return () => { active = false; };
  }, []);

  const definitions = useMemo(() => {
    const map = new Map();
    state.workflows.forEach((item) => map.set(item.definitionId, { id: item.definitionId, code: item.code, name: item.name }));
    return [...map.values()];
  }, [state.workflows]);

  const act = async (action, success) => {
    setBusy(true);
    try { await action(); toast.success(success); await load(); }
    catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };

  if (state.loading && !state.master) return <CapexV2Loading lines={10} />;
  if (state.error) return <CapexV2Error error={state.error} onRetry={load} />;

  return (
    <div>
      <div className="capex-v2-section-heading"><div><h2>Controlled configuration</h2><p>Production master data and workflows are empty until loaded from signed business artifacts.</p></div></div>
      <div className="capex-v2-message capex-v2-message--warning" role="status">
        <div><strong>No current legacy department or approval seed is reused</strong><p>Activation requires a signed artifact reference. Binding routes additionally require production SSO readiness.</p></div>
      </div>

      <div>
        <section className="capex-v2-form-section" style={{ margin: 0 }}>
          <h3>Business / Function master</h3><p>Load only names approved by the business owner.</p>
          <div className="capex-v2-form-grid">
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="org-name">Business / Function name</label><input id="org-name" className="capex-v2-input" value={organization.name} onChange={(event) => setOrganization({ ...organization, name: event.target.value })} /></div>
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="org-ref">Authoritative external reference</label><input id="org-ref" className="capex-v2-input" value={organization.externalReference} onChange={(event) => setOrganization({ ...organization, externalReference: event.target.value })} /></div>
          </div>
          <button type="button" className="capex-v2-btn" style={{ marginTop: 12 }} disabled={busy || !organization.name.trim()} onClick={() => act(() => createCapexV2Organization(organization), 'Business / Function added')}>Add Business / Function</button>
          <div className="capex-v2-work-list" style={{ marginTop: 15 }}>
            {state.master.organizations.map((item) => <div key={item.id} className="capex-v2-work-item"><span><strong>{item.name}</strong><small>{item.externalReference || 'No external reference'}</small></span><StatusBadge status="ACTIVE" /></div>)}
          </div>
        </section>
      </div>

      <section className="capex-v2-form-section" style={{ marginTop: 18 }}>
        <h3>Versioned MOA workflow</h3><p>Create a definition once, then draft effective-dated rules from the signed Manual of Authority.</p>
        {!definitions.length ? (
          <div className="capex-v2-form-grid">
            <div className="capex-v2-field"><label htmlFor="workflow-code">Definition code</label><input id="workflow-code" className="capex-v2-input" value={definition.code} onChange={(event) => setDefinition({ ...definition, code: event.target.value })} /></div>
            <div className="capex-v2-field"><label htmlFor="workflow-name">Definition name</label><input id="workflow-name" className="capex-v2-input" value={definition.name} onChange={(event) => setDefinition({ ...definition, name: event.target.value })} /></div>
            <div><button type="button" className="capex-v2-btn" disabled={busy} onClick={() => act(() => createCapexV2WorkflowDefinition(definition), 'Workflow definition created')}>Create definition</button></div>
          </div>
        ) : (
          <div className="capex-v2-form-grid">
            <div className="capex-v2-field"><label htmlFor="version-definition">Workflow definition</label><SelectField id="version-definition" className="capex-v2-select" value={version.definitionId} onChange={(definitionId) => setVersion({ ...version, definitionId })} options={definitions.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select definition" /></div>
            <div className="capex-v2-field"><label htmlFor="version-mode">Authority mode</label><SelectField id="version-mode" className="capex-v2-select" value={version.authorityMode} onChange={(authorityMode) => setVersion({ ...version, authorityMode })} options={['PILOT', 'BINDING']} /></div>
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="version-source">Source MOA / policy artifact reference</label><input id="version-source" className="capex-v2-input" value={version.sourceArtifactReference} onChange={(event) => setVersion({ ...version, sourceArtifactReference: event.target.value })} /></div>
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="version-rules">Rules and post-HSSE approval steps (JSON)</label><textarea id="version-rules" className="capex-v2-textarea" style={{ minHeight: 330, fontFamily: 'Consolas, monospace', fontSize: 12 }} value={version.rules} onChange={(event) => setVersion({ ...version, rules: event.target.value })} /><small>Mandatory HSSE and Worker Welfare screening is added automatically before these configured steps.</small></div>
            <div><button type="button" className="capex-v2-btn" disabled={busy || !version.definitionId || !version.sourceArtifactReference} onClick={() => act(() => createCapexV2WorkflowVersion(version.definitionId, { sourceArtifactReference: version.sourceArtifactReference, authorityMode: version.authorityMode, rules: JSON.parse(version.rules) }), 'Draft workflow version created')}>Create draft version</button></div>
          </div>
        )}
      </section>

      <section className="capex-v2-panel" style={{ marginTop: 18 }}>
        <div className="capex-v2-panel__header"><h3>Workflow versions</h3><span className="capex-v2-badge capex-v2-badge--neutral">{state.workflows.length}</span></div>
        {state.workflows.length ? <div className="capex-v2-table-wrap" style={{ border: 0, borderRadius: 0 }}><table className="capex-v2-table"><thead><tr><th>Definition</th><th>Version</th><th>Source</th><th>Rules</th><th>Status</th><th>Activation gate</th></tr></thead><tbody>{state.workflows.map((item) => {
          const activation = activationRefs[item.versionId] || {};
          return <tr key={`${item.definitionId}-${item.versionId || 'empty'}`}><td>{item.name}</td><td>{item.versionNumber || '—'} · {item.authorityMode || '—'}</td><td>{item.sourceArtifactReference || '—'}</td><td>{item.rules?.length || 0}<small style={{ display: 'block' }}>{item.simulatedAt ? 'Simulation recorded' : 'Simulation required'}</small></td><td><StatusBadge status={item.status || 'EMPTY'} /></td><td>{item.status === 'DRAFT' ? <div className="capex-v2-work-list"><input className="capex-v2-input" aria-label={`Signed artifact for version ${item.versionNumber}`} value={activation.signedArtifactReference || ''} onChange={(event) => updateActivation(item.versionId, { signedArtifactReference: event.target.value })} placeholder="Signed artifact reference" /><input className="capex-v2-input" aria-label={`Business sign-off for version ${item.versionNumber}`} value={activation.businessSignoffReference || ''} onChange={(event) => updateActivation(item.versionId, { businessSignoffReference: event.target.value })} placeholder="Business sign-off reference" /><DateField className="capex-v2-input" aria-label={`Effective date for version ${item.versionNumber}`} value={activation.effectiveFrom || ''} onChange={(effectiveFrom) => updateActivation(item.versionId, { effectiveFrom })} /><button type="button" className="capex-v2-btn" disabled={busy || !item.simulatedAt || !activation.signedArtifactReference || !activation.businessSignoffReference || !activation.effectiveFrom} onClick={() => act(() => activateCapexV2WorkflowVersion(item.versionId, activation), 'Workflow activated')}>Activate signed version</button></div> : <span>{item.signedArtifactReference || '—'}<small style={{ display: 'block' }}>{item.businessSignoffReference || 'No sign-off reference'}</small></span>}</td></tr>;
        })}</tbody></table></div> : <CapexV2Empty title="No workflow definition" description="Create a definition and a draft version from the signed Manual of Authority." />}
      </section>

      {state.workflows.some((item) => item.versionId) && (
        <section className="capex-v2-form-section" style={{ marginTop: 18 }}>
          <h3>Route simulation</h3><p>Resolve the exact route and named assignees before activation or pilot submission.</p>
          <div className="capex-v2-form-grid">
            <div className="capex-v2-field"><label htmlFor="sim-version">Version</label><SelectField id="sim-version" className="capex-v2-select" value={simulation.versionId} onChange={(versionId) => setSimulation({ ...simulation, versionId })} options={state.workflows.filter((item) => item.versionId).map((item) => ({ value: item.versionId, label: `${item.name} v${item.versionNumber} · ${item.status}` }))} placeholder="Select version" /></div>
            <div className="capex-v2-field"><label htmlFor="sim-org">Business / Function</label><SelectField id="sim-org" className="capex-v2-select" value={simulation.organizationUnitId} onChange={(organizationUnitId) => setSimulation({ ...simulation, organizationUnitId })} options={state.master.organizations.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select Business / Function" /></div>
            <div className="capex-v2-field"><label htmlFor="sim-value">Value (OMR)</label><input id="sim-value" className="capex-v2-input" value={simulation.amount} onChange={(event) => setSimulation({ ...simulation, amount: event.target.value })} /></div>
            <div className="capex-v2-field"><label htmlFor="sim-quotes">Quotation count</label><input id="sim-quotes" className="capex-v2-input" value={simulation.quoteCount} onChange={(event) => setSimulation({ ...simulation, quoteCount: event.target.value })} /></div>
          </div>
          <button type="button" className="capex-v2-btn" style={{ marginTop: 12 }} disabled={busy || !simulation.versionId || !simulation.amount || !simulation.organizationUnitId} onClick={async () => { setBusy(true); try { const result = await simulateCapexV2Workflow(simulation); setSimulationResult(result); toast.success(result.ready ? 'Successful simulation recorded for activation' : 'Simulation recorded with unresolved assignees'); await load(); } catch (error) { toast.error(error.message); } finally { setBusy(false); } }}>Simulate and record route</button>
          {simulationResult && <div className="capex-v2-timeline" style={{ marginTop: 15 }}>{simulationResult.steps.map((step) => <div key={step.stepKey} className={`capex-v2-timeline__item ${step.resolution === 'RESOLVED' ? 'is-approved' : 'is-pending'}`}><strong>{step.label}</strong><small>{step.assignedUserName || step.error || 'Unresolved'} · {step.approverRole}</small></div>)}</div>}
        </section>
      )}
    </div>
  );
}
