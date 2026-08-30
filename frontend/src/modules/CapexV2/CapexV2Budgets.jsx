import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import DateField from '../../components/DateField';
import FileUploadField from '../../components/FileUploadField';
import ConfirmModal from '../../components/ConfirmModal';
import Modal from '../../components/Modal';
import SelectField from '../../components/SelectField';
import {
  createCapexV2BudgetCycle,
  createCapexV2Transfer,
  decideCapexV2Transfer,
  downloadCapexV2Import,
  getCapexV2Allocations,
  getCapexV2BudgetCycles,
  getCapexV2Import,
  getCapexV2Imports,
  getCapexV2Transfers,
  postCapexV2Import,
  uploadCapexV2Import,
  validateCapexV2Import,
} from '../../services/capexV2Service';
import { CapexV2Empty, CapexV2Error, CapexV2Loading, StatusBadge } from './CapexV2States';
import { formatDate, formatOmr } from './capexV2Format';

export default function CapexV2Budgets() {
  const { context } = useOutletContext();
  const [state, setState] = useState({ loading: true, cycles: [], imports: [], allocations: [], transfers: [], error: null });
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [cycleForm, setCycleForm] = useState({ fiscalYear: String(new Date().getFullYear() + 1), boardApprovalReference: '', boardApprovedAt: '' });
  const [importForm, setImportForm] = useState({ sourceReference: '', file: null });
  const [transfer, setTransfer] = useState({ fromAllocationId: '', toAllocationId: '', amount: '', reason: '' });
  const [importPreview, setImportPreview] = useState({ loading: false, batch: null, error: null });
  const [validationCandidate, setValidationCandidate] = useState(null);
  const [busy, setBusy] = useState(false);
  const can = (capability) => context.isAdmin || context.capabilities.includes('*') || context.capabilities.includes(capability);
  const canManagePortfolioBudget = context.isAdmin || context.scopes.some((scope) => scope.type === 'PORTFOLIO' && (scope.capabilities || []).includes('budget:manage'));
  const canApprovePortfolioBudget = context.isAdmin || context.scopes.some((scope) => scope.type === 'PORTFOLIO' && (scope.capabilities || []).includes('budget:approve'));

  const loadCycles = async () => {
    const cycles = await getCapexV2BudgetCycles();
    const cycleId = selectedCycleId || cycles[0]?.id || '';
    setSelectedCycleId(cycleId);
    const [imports, allocations, transfers] = cycleId
      ? await Promise.all([canManagePortfolioBudget ? getCapexV2Imports(cycleId) : Promise.resolve([]), getCapexV2Allocations(cycleId), getCapexV2Transfers(cycleId)])
      : [[], [], []];
    setState({ loading: false, cycles, imports, allocations, transfers, error: null });
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cycles = await getCapexV2BudgetCycles();
        const cycleId = selectedCycleId || cycles[0]?.id || '';
        const [imports, allocations, transfers] = cycleId
          ? await Promise.all([canManagePortfolioBudget ? getCapexV2Imports(cycleId) : Promise.resolve([]), getCapexV2Allocations(cycleId), getCapexV2Transfers(cycleId)])
          : [[], [], []];
        if (active) {
          setSelectedCycleId(cycleId);
          setState({ loading: false, cycles, imports, allocations, transfers, error: null });
        }
      } catch (error) {
        if (active) setState((current) => ({ ...current, loading: false, error }));
      }
    })();
    return () => { active = false; };
  }, [selectedCycleId, canManagePortfolioBudget]);

  const selectedCycle = useMemo(() => state.cycles.find((cycle) => cycle.id === selectedCycleId), [state.cycles, selectedCycleId]);

  const act = async (action, success) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await loadCycles();
      if (importPreview.batch?.id) {
        const batch = await getCapexV2Import(importPreview.batch.id);
        setImportPreview({ loading: false, batch, error: null });
      }
      return true;
    }
    catch (error) {
      toast.error(error.message);
      return false;
    }
    finally { setBusy(false); }
  };

  const confirmValidation = async () => {
    if (!validationCandidate) return;
    const completed = await act(
      () => validateCapexV2Import(validationCandidate.id),
      'Import validation completed'
    );
    if (completed) setValidationCandidate(null);
  };

  const viewImport = async (batchId) => {
    setImportPreview({ loading: true, batch: null, error: null });
    try {
      const batch = await getCapexV2Import(batchId);
      setImportPreview({ loading: false, batch, error: null });
    } catch (error) {
      setImportPreview({ loading: false, batch: null, error });
    }
  };

  const downloadImport = async (batch) => {
    try { await downloadCapexV2Import(batch); }
    catch (error) { toast.error(error.message); }
  };

  if (state.loading && !state.cycles.length) return <CapexV2Loading lines={9} />;
  if (state.error) return <CapexV2Error error={state.error} onRetry={() => loadCycles()} />;

  return (
    <div>
      <div className="capex-v2-section-heading">
        <div><h2>Budget control</h2><p>SAC-approved baselines enter through staged validation, reconciliation, and posting.</p></div>
        {state.cycles.length > 0 && (
          <div className="capex-v2-section-heading__actions">
            <SelectField className="capex-v2-select" aria-label="Budget cycle" value={selectedCycleId} onChange={setSelectedCycleId} options={state.cycles.map((cycle) => ({ value: cycle.id, label: `FY ${cycle.fiscalYear} · ${cycle.status}` }))} placeholder="Select budget cycle" />
          </div>
        )}
      </div>

      {!state.cycles.length ? (
        <div className="capex-v2-panel">
          <CapexV2Empty title="No approved budget cycle has been loaded" description="Create the fiscal cycle first. No fabricated department or allocation data is seeded in CAPEX v2." />
          {canManagePortfolioBudget && (
            <div className="capex-v2-panel__body">
              <div className="capex-v2-form-grid">
                <div className="capex-v2-field"><label htmlFor="cycle-year">Fiscal year</label><input id="cycle-year" className="capex-v2-input" value={cycleForm.fiscalYear} onChange={(event) => setCycleForm({ ...cycleForm, fiscalYear: event.target.value })} /></div>
                <div className="capex-v2-field"><label htmlFor="cycle-ref">Board approval reference</label><input id="cycle-ref" className="capex-v2-input" value={cycleForm.boardApprovalReference} onChange={(event) => setCycleForm({ ...cycleForm, boardApprovalReference: event.target.value })} /></div>
                <div className="capex-v2-field"><label htmlFor="cycle-date">Board approval date</label><DateField id="cycle-date" className="capex-v2-input" value={cycleForm.boardApprovedAt} onChange={(boardApprovedAt) => setCycleForm({ ...cycleForm, boardApprovedAt })} /></div>
              </div>
              <button type="button" className="capex-v2-btn" style={{ marginTop: 12 }} disabled={busy || !cycleForm.fiscalYear || !cycleForm.boardApprovalReference.trim() || !cycleForm.boardApprovedAt} onClick={() => act(() => createCapexV2BudgetCycle(cycleForm), 'Budget cycle created')}>Create cycle</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {canManagePortfolioBudget && (
            <details className="capex-v2-panel" style={{ marginBottom: 18 }}>
              <summary className="capex-v2-panel__header" style={{ cursor: 'pointer' }}><h3>Open another Board-approved fiscal cycle</h3></summary>
              <div className="capex-v2-panel__body">
                <div className="capex-v2-form-grid">
                  <div className="capex-v2-field"><label htmlFor="next-cycle-year">Fiscal year</label><input id="next-cycle-year" className="capex-v2-input" value={cycleForm.fiscalYear} onChange={(event) => setCycleForm({ ...cycleForm, fiscalYear: event.target.value })} /></div>
                  <div className="capex-v2-field"><label htmlFor="next-cycle-ref">Board approval reference</label><input id="next-cycle-ref" className="capex-v2-input" value={cycleForm.boardApprovalReference} onChange={(event) => setCycleForm({ ...cycleForm, boardApprovalReference: event.target.value })} /></div>
                  <div className="capex-v2-field"><label htmlFor="next-cycle-date">Board approval date</label><DateField id="next-cycle-date" className="capex-v2-input" value={cycleForm.boardApprovedAt} onChange={(boardApprovedAt) => setCycleForm({ ...cycleForm, boardApprovedAt })} /></div>
                </div>
                <button type="button" className="capex-v2-btn" style={{ marginTop: 12 }} disabled={busy || !cycleForm.fiscalYear || !cycleForm.boardApprovalReference.trim() || !cycleForm.boardApprovedAt} onClick={() => act(() => createCapexV2BudgetCycle(cycleForm), 'Budget cycle created')}>Create controlled cycle</button>
              </div>
            </details>
          )}
          <div className="capex-v2-summary-grid">
            <div className="capex-v2-summary-item"><span>Original budget</span><strong>{formatOmr(selectedCycle.originalBudget, true)}</strong><small>First posted SAC baseline</small></div>
            <div className="capex-v2-summary-item"><span>Revised budget</span><strong>{formatOmr(selectedCycle.authorizedBudget, true)}</strong><small>Current baseline and transfers</small></div>
            <div className="capex-v2-summary-item"><span>Commitments</span><strong>{formatOmr(selectedCycle.commitments, true)}</strong><small>Controlled GSAP imports</small></div>
            <div className="capex-v2-summary-item"><span>Actuals</span><strong>{formatOmr(selectedCycle.actuals, true)}</strong><small>Traceable source batches</small></div>
            <div className="capex-v2-summary-item"><span>Forecast</span><strong>{formatOmr(selectedCycle.forecast, true)}</strong><small>Latest posted forecast entries</small></div>
            <div className="capex-v2-summary-item"><span>Variance</span><strong>{formatOmr(selectedCycle.variance, true)}</strong><small>Revised budget less forecast</small></div>
          </div>

          {canManagePortfolioBudget && (
            <section className="capex-v2-form-section" style={{ marginTop: 18 }}>
              <h3>Stage approved SAC budget</h3>
              <p>CSV columns: business_function, external_project_reference, description, amount, currency, source_date.</p>
              <a
                className="capex-v2-download-link"
                href="/capex-v2-sac-budget-sample.csv"
                download="capex-v2-sac-budget-sample.csv"
              >
                Download sample CSV
              </a>
              <div className="capex-v2-form-grid">
                <div className="capex-v2-field"><label htmlFor="import-ref">Source / approval reference</label><input id="import-ref" className="capex-v2-input" value={importForm.sourceReference} onChange={(event) => setImportForm({ ...importForm, sourceReference: event.target.value })} /></div>
                <div className="capex-v2-field">
                  <label htmlFor="v2-budget-csv">Budget CSV</label>
                  <FileUploadField id="v2-budget-csv" accept=".csv,text/csv" fileName={importForm.file?.name} onChange={(event) => setImportForm({ ...importForm, file: event.target.files?.[0] || null })} aria-label="Upload approved SAC budget CSV" />
                  <small>Use the approved Business / Function name exactly as maintained in master data.</small>
                </div>
              </div>
              <button type="button" className="capex-v2-btn" style={{ marginTop: 12 }} disabled={busy || !importForm.file || !importForm.sourceReference.trim()} onClick={() => act(() => uploadCapexV2Import({ ...importForm, budgetCycleId: selectedCycleId }), 'Import staged for validation')}>Stage import</button>
            </section>
          )}

          <div className="capex-v2-split">
            <section className="capex-v2-panel">
              <div className="capex-v2-panel__header"><h3>Import lineage</h3><span className="capex-v2-badge capex-v2-badge--neutral">{state.imports.length} batches</span></div>
              {state.imports.length ? (
                <div className="capex-v2-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                  <table className="capex-v2-table">
                    <thead><tr><th>Source</th><th>Rows</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {state.imports.map((batch) => (
                        <tr key={batch.id}>
                          <td><span className="capex-v2-table__title">{batch.sourceReference || batch.originalFilename}</span><span className="capex-v2-table__meta">{batch.sourceSystem} · {formatDate(batch.createdAt)}</span></td>
                          <td>{batch.status === 'STAGED' ? `${batch.rowCount} pending` : `${batch.validRowCount}/${batch.rowCount} valid`}</td>
                          <td>{batch.status === 'STAGED' ? <span className="capex-v2-table__meta">Pending validation</span> : formatOmr(batch.controlTotal)}</td>
                          <td><StatusBadge status={batch.status} /></td>
                          <td>
                            <div className="capex-v2-action-row">
                              <button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={busy} onClick={() => viewImport(batch.id)}>View rows</button>
                              <button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={busy} onClick={() => downloadImport(batch)}>Download CSV</button>
                              {canManagePortfolioBudget && ['STAGED', 'REJECTED'].includes(batch.status) && <button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={busy} onClick={() => setValidationCandidate(batch)}>Validate</button>}
                              {canApprovePortfolioBudget && batch.status === 'VALIDATED' && <button type="button" className="capex-v2-btn" disabled={busy} onClick={() => act(() => postCapexV2Import(batch.id), 'Approved budget posted')}>Post</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <CapexV2Empty title="No import batches" description="Stage the Board-approved SAC export to create a traceable baseline." />}
            </section>

            <aside className="capex-v2-panel">
              <div className="capex-v2-panel__header"><h3>Control status</h3></div>
              <div className="capex-v2-panel__body">
                <div className="capex-v2-work-list">
                  <div className="capex-v2-work-item"><span><strong>Planning source</strong><small>SAP SAC</small></span><StatusBadge status="SOURCE" /></div>
                  <div className="capex-v2-work-item"><span><strong>Currency precision</strong><small>OMR · 3 decimals</small></span><StatusBadge status="ACTIVE" /></div>
                  <div className="capex-v2-work-item"><span><strong>Baseline mutation</strong><small>Corrections require a new version</small></span><StatusBadge status="LOCKED" /></div>
                </div>
              </div>
            </aside>
          </div>

          <section className="capex-v2-panel" style={{ marginTop: 18 }}>
            <div className="capex-v2-panel__header"><h3>Budget allocations</h3><span className="capex-v2-badge capex-v2-badge--neutral">{state.allocations.length}</span></div>
            {state.allocations.length ? (
              <div className="capex-v2-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="capex-v2-table"><thead><tr><th>Business / Function</th><th>Allocation</th><th>Authorized</th><th>Committed</th><th>Actual</th><th>Available</th></tr></thead>
                  <tbody>{state.allocations.map((allocation) => <tr key={allocation.id}><td>{allocation.organizationName}</td><td><span className="capex-v2-table__title">{allocation.description}</span><span className="capex-v2-table__meta">{allocation.externalReference || 'No external reference'}</span></td><td>{formatOmr(allocation.authorizedBudget)}</td><td>{formatOmr(allocation.commitments)}</td><td>{formatOmr(allocation.actuals)}</td><td><strong>{formatOmr(allocation.available)}</strong></td></tr>)}</tbody>
                </table>
              </div>
            ) : <CapexV2Empty title="No posted allocations" description="Validate and post an approved SAC baseline to create immutable allocations." />}
          </section>

          {can('budget:transfer:create') && state.allocations.length > 1 && (
            <section className="capex-v2-form-section" style={{ marginTop: 18 }}>
              <h3>Request a balanced budget transfer</h3><p>Transfers create equal debit and credit ledger entries only after approval.</p>
              <div className="capex-v2-form-grid">
                <div className="capex-v2-field"><label htmlFor="transfer-from">From allocation</label><SelectField id="transfer-from" className="capex-v2-select" value={transfer.fromAllocationId} onChange={(fromAllocationId) => setTransfer({ ...transfer, fromAllocationId })} options={state.allocations.map((item) => ({ value: item.id, label: `${item.organizationName} · ${item.description}` }))} placeholder="Select source" /></div>
                <div className="capex-v2-field"><label htmlFor="transfer-to">To allocation</label><SelectField id="transfer-to" className="capex-v2-select" value={transfer.toAllocationId} onChange={(toAllocationId) => setTransfer({ ...transfer, toAllocationId })} options={state.allocations.map((item) => ({ value: item.id, label: `${item.organizationName} · ${item.description}` }))} placeholder="Select destination" /></div>
                <div className="capex-v2-field"><label htmlFor="transfer-amount">Amount (OMR)</label><input id="transfer-amount" className="capex-v2-input" value={transfer.amount} onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })} /></div>
                <div className="capex-v2-field"><label htmlFor="transfer-reason">Reason</label><input id="transfer-reason" className="capex-v2-input" value={transfer.reason} onChange={(event) => setTransfer({ ...transfer, reason: event.target.value })} /></div>
              </div>
              <button type="button" className="capex-v2-btn" style={{ marginTop: 12 }} disabled={busy} onClick={() => act(() => createCapexV2Transfer(transfer), 'Transfer submitted for approval')}>Submit transfer</button>
            </section>
          )}

          <section className="capex-v2-panel" style={{ marginTop: 18 }}>
            <div className="capex-v2-panel__header"><h3>Budget transfers</h3><span className="capex-v2-badge capex-v2-badge--neutral">{state.transfers.length}</span></div>
            {state.transfers.length ? <div className="capex-v2-table-wrap" style={{ border: 0, borderRadius: 0 }}><table className="capex-v2-table"><thead><tr><th>Route</th><th>Amount</th><th>Reason</th><th>Status</th><th>Decision</th></tr></thead><tbody>{state.transfers.map((item) => <tr key={item.id}><td><span className="capex-v2-table__title">{item.fromOrganization} → {item.toOrganization}</span><span className="capex-v2-table__meta">{item.fromAllocation} → {item.toAllocation}</span></td><td>{formatOmr(item.amount)}</td><td>{item.reason}</td><td><StatusBadge status={item.status} /></td><td>{canApprovePortfolioBudget && item.status === 'PENDING_APPROVAL' ? <div style={{ display: 'flex', gap: 5 }}><button type="button" className="capex-v2-btn" disabled={busy} onClick={() => act(() => decideCapexV2Transfer(item.id, { decision: 'APPROVED' }), 'Transfer approved')}>Approve</button><button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={busy} onClick={() => act(() => decideCapexV2Transfer(item.id, { decision: 'REJECTED' }), 'Transfer rejected')}>Reject</button></div> : item.decidedByName || '—'}</td></tr>)}</tbody></table></div> : <CapexV2Empty title="No transfers" description="Approved transfer requests will remain visible here with their balanced ledger entries." />}
          </section>
        </>
      )}

      {(importPreview.loading || importPreview.error || importPreview.batch) && (
        <Modal
          title="Staged import rows"
          subtitle={importPreview.batch ? `${importPreview.batch.sourceReference || importPreview.batch.originalFilename} · ${importPreview.batch.rowCount} rows` : 'Loading the staged source data.'}
          onClose={() => setImportPreview({ loading: false, batch: null, error: null })}
          maxWidth={1280}
        >
          <div aria-live="polite">
            {importPreview.loading && <CapexV2Loading lines={4} />}
            {importPreview.error && <CapexV2Error error={importPreview.error} />}
            {importPreview.batch && (
              <>
                <div className="capex-v2-modal-actions">
                  <button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => downloadImport(importPreview.batch)}>{importPreview.batch.hasOriginalFile ? 'Download original CSV' : 'Download staged CSV'}</button>
                </div>
                <div className="capex-v2-table-wrap capex-v2-import-preview__table">
                  <table className="capex-v2-table">
                    <thead><tr><th>Row</th><th>Business / Function</th><th>External reference</th><th>Description</th><th>Amount</th><th>Source date</th><th>Validation</th></tr></thead>
                    <tbody>
                      {importPreview.batch.rows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.rowNumber}</td>
                          <td>{row.businessFunction || '—'}</td>
                          <td>{row.externalProjectReference || '—'}</td>
                          <td>{row.description || '—'}</td>
                          <td>{row.amount === null ? '—' : formatOmr(row.amount)}</td>
                          <td>{row.sourceDate ? formatDate(row.sourceDate) : '—'}</td>
                          <td>
                            {row.validationStatus === 'PENDING' ? <span className="capex-v2-badge capex-v2-badge--neutral">Not validated</span> : <StatusBadge status={row.validationStatus} />}
                            {row.validationErrors?.length > 0 && <ul className="capex-v2-validation-errors">{row.validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={Boolean(validationCandidate)}
        title="Validate staged import?"
        message="This checks Business / Function names against active master data, OMR precision, positive amounts, descriptions, and required references. Validation does not post the budget. If any row is invalid, the batch will be marked Rejected and no allocations will be created."
        confirmLabel="Validate import"
        onConfirm={confirmValidation}
        onCancel={() => setValidationCandidate(null)}
        busy={busy}
      />
    </div>
  );
}
