import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Checkbox from '../../components/Checkbox';
import FileUploadField from '../../components/FileUploadField';
import SelectField from '../../components/SelectField';
import {
  addCapexV2Quotation,
  decideCapexV2Request,
  deleteCapexV2Quotation,
  downloadCapexV2Document,
  getCapexV2Request,
  submitCapexV2Request,
  updateCapexV2Request,
  uploadCapexV2Document,
  uploadCapexV2QuotationDocument,
  withdrawCapexV2Request,
} from '../../services/capexV2Service';
import { CapexV2Error, CapexV2Loading, StatusBadge } from './CapexV2States';
import { fileIdentity, mergeSelectedFiles } from './capexV2Files';
import { formatDate, formatOmr } from './capexV2Format';
import { quoteHasContent, quoteIsComplete } from './capexV2RequestValidation';

let correctionQuoteSequence = 0;
const newCorrectionQuote = () => ({
  clientId: `correction-quote-${Date.now()}-${correctionQuoteSequence += 1}`,
  supplierName: '',
  quotedValue: '',
  paymentTerms: '',
  isProposed: false,
  nonLowestJustification: '',
  file: null,
});

function riskLabel(value) {
  return value ? value.replaceAll('_', ' ') : 'NOT ASSESSED';
}

export default function CapexV2RequestDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { context } = useOutletContext();
  const [state, setState] = useState({ loading: true, request: null, error: null });
  const [decision, setDecision] = useState({ comment: '', hsseRisk: '', workerWelfareRisk: '' });
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const [newQuotes, setNewQuotes] = useState([]);
  const [removedQuoteIds, setRemovedQuoteIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    getCapexV2Request(requestId)
      .then((request) => {
        setState({ loading: false, request, error: null });
        setEdit({
          version: request.version,
          title: request.title,
          estimatedValue: request.estimatedValue,
          projectDescription: request.projectDescription,
          businessCase: request.businessCase || '',
          roiSummary: request.roiSummary || '',
          urgent: request.urgent,
          quoteWaiverReason: request.quoteWaiverReason || '',
        });
      })
      .catch((error) => setState({ loading: false, request: null, error }));
  };
  useEffect(() => {
    let active = true;
    getCapexV2Request(requestId)
      .then((request) => {
        if (!active) return;
        setState({ loading: false, request, error: null });
        setEdit({
          version: request.version,
          title: request.title,
          estimatedValue: request.estimatedValue,
          projectDescription: request.projectDescription,
          businessCase: request.businessCase || '',
          roiSummary: request.roiSummary || '',
          urgent: request.urgent,
          quoteWaiverReason: request.quoteWaiverReason || '',
        });
      })
      .catch((error) => { if (active) setState({ loading: false, request: null, error }); });
    return () => { active = false; };
  }, [requestId]);

  const currentStep = useMemo(() => state.request?.workflowSteps.find((step) => step.status === 'PENDING') || null, [state.request]);
  const removedQuoteIdSet = useMemo(() => new Set(removedQuoteIds), [removedQuoteIds]);
  const canDecide = currentStep?.assignedUserId === context.userId;
  const canEdit = state.request && state.request.ownerUserId === context.userId && ['DRAFT', 'RETURNED'].includes(state.request.status);
  const latestHsse = state.request?.hsseAssessments?.[0];

  const runDecision = async (value) => {
    if (['RETURNED', 'REJECTED'].includes(value) && !decision.comment.trim()) {
      toast.error('Add a clear reason before returning or rejecting the request.');
      return;
    }
    setBusy(true);
    try {
      await decideCapexV2Request(requestId, { decision: value, ...decision });
      toast.success(value === 'APPROVED' ? 'Approval step completed' : `Request ${value.toLowerCase()}`);
      setDecision({ comment: '', hsseRisk: '', workerWelfareRisk: '' });
      load();
    } catch (error) {
      toast.error(error.message);
    } finally { setBusy(false); }
  };

  const saveCorrection = async (resubmit) => {
    const startedQuotes = newQuotes.filter(quoteHasContent);
    if (startedQuotes.some((quote) => !quoteIsComplete(quote))) {
      toast.error('Complete or remove each started replacement quotation.');
      return;
    }
    setBusy(true);
    try {
      await updateCapexV2Request(requestId, edit);
      await Promise.all(newFiles.map((file) => uploadCapexV2Document(requestId, file)));
      await Promise.all(removedQuoteIds.map((quotationId) => deleteCapexV2Quotation(requestId, quotationId)));
      const saveQuote = async (quote) => {
        const created = await addCapexV2Quotation(requestId, {
          supplierName: quote.supplierName,
          quotedValue: quote.quotedValue,
          paymentTerms: quote.paymentTerms,
          isProposed: quote.isProposed,
          nonLowestJustification: quote.nonLowestJustification,
        });
        await uploadCapexV2QuotationDocument(requestId, created.id, quote.file);
      };
      await Promise.all(startedQuotes.filter((quote) => !quote.isProposed).map(saveQuote));
      const proposedQuote = startedQuotes.find((quote) => quote.isProposed);
      if (proposedQuote) await saveQuote(proposedQuote);
      if (resubmit) await submitCapexV2Request(requestId);
      toast.success(resubmit ? 'Corrections submitted' : 'Corrections saved');
      setEditing(false);
      setNewFiles([]);
      setNewQuotes([]);
      setRemovedQuoteIds([]);
      load();
    } catch (error) {
      toast.error(error.message);
      load();
    } finally { setBusy(false); }
  };

  const updateNewQuote = (index, patch) => setNewQuotes((current) => current.map((quote, quoteIndex) => quoteIndex === index ? { ...quote, ...patch } : quote));
  const markNewQuoteProposed = (index) => setNewQuotes((current) => current.map((quote, quoteIndex) => ({ ...quote, isProposed: quoteIndex === index })));
  const toggleQuoteRemoval = (quotationId) => setRemovedQuoteIds((current) => current.includes(quotationId)
    ? current.filter((id) => id !== quotationId)
    : [...current, quotationId]);
  const selectCorrectionFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    setNewFiles((current) => mergeSelectedFiles(current, selected));
    event.target.value = '';
  };

  const submitExistingDraft = async () => {
    setBusy(true);
    try { await submitCapexV2Request(requestId); toast.success('CAPEX request submitted'); load(); }
    catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };

  const withdraw = async () => {
    setBusy(true);
    try { await withdrawCapexV2Request(requestId); toast.success('Request withdrawn'); load(); }
    catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };

  if (state.loading && !state.request) return <CapexV2Loading lines={10} />;
  if (state.error) return <CapexV2Error error={state.error} onRetry={load} />;
  const request = state.request;

  return (
    <div>
      <div className="capex-v2-section-heading">
        <div>
          <button type="button" className="capex-v2-btn capex-v2-btn--secondary" style={{ marginBottom: 11 }} onClick={() => navigate('/capex-v2/requests')}>Back to register</button>
          <span className="capex-v2-eyebrow">{request.requestNumber}</span>
          <h2>{request.title}</h2>
          <p>{request.organizationName} · {request.ownerName}</p>
        </div>
        <div className="capex-v2-section-heading__actions">
          <StatusBadge status={request.status} />
          {request.urgent && <StatusBadge urgent />}
          {canEdit && <button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => setEditing((value) => !value)}>{editing ? 'Close correction' : request.status === 'RETURNED' ? 'Correct request' : 'Edit draft'}</button>}
        </div>
      </div>

      {editing && edit && (
        <section className="capex-v2-form-section" style={{ marginBottom: 15 }}>
          <h3>{request.status === 'RETURNED' ? 'Correct & resubmit' : 'Edit draft'}</h3>
          <p>Requester-owned fields and supporting evidence are editable. HSSE ratings remain controlled by the HSSE Focal.</p>
          <div className="capex-v2-form-grid">
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="edit-title">Request title</label><input id="edit-title" className="capex-v2-input" value={edit.title} onChange={(event) => setEdit({ ...edit, title: event.target.value })} /></div>
            <div className="capex-v2-field"><label htmlFor="edit-value">Estimated value (OMR)</label><input id="edit-value" className="capex-v2-input" value={edit.estimatedValue} onChange={(event) => setEdit({ ...edit, estimatedValue: event.target.value })} /></div>
            <div className="capex-v2-field"><Checkbox checked={edit.urgent} onChange={(urgent) => setEdit({ ...edit, urgent })} label="Urgent requirement" /><small>Visibility only; normal governance still applies.</small></div>
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="edit-description">Project description</label><textarea id="edit-description" className="capex-v2-textarea" value={edit.projectDescription} onChange={(event) => setEdit({ ...edit, projectDescription: event.target.value })} /></div>
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="edit-case">Business case</label><textarea id="edit-case" className="capex-v2-textarea" value={edit.businessCase} onChange={(event) => setEdit({ ...edit, businessCase: event.target.value })} /></div>
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="edit-roi">ROI / benefits summary</label><textarea id="edit-roi" className="capex-v2-textarea" value={edit.roiSummary} onChange={(event) => setEdit({ ...edit, roiSummary: event.target.value })} /></div>
            <div className="capex-v2-field capex-v2-field--full"><label htmlFor="v2-correction-documents">Additional project evidence</label><FileUploadField id="v2-correction-documents" multiple onChange={selectCorrectionFiles} aria-label="Upload corrected project evidence" /></div>
            {newFiles.length > 0 && <div className="capex-v2-field capex-v2-field--full"><div className="capex-v2-file-list">{newFiles.map((file) => <div key={fileIdentity(file)} className="capex-v2-file-item"><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => setNewFiles((current) => current.filter((candidate) => candidate !== file))} aria-label={`Remove ${file.name}`}>Remove</button></div>)}</div></div>}
            <div className="capex-v2-field capex-v2-field--full">
              <span className="capex-v2-label">Existing quotations</span>
              <div className="capex-v2-file-list">
                {request.quotations.map((quote) => {
                  const marked = removedQuoteIdSet.has(quote.id);
                  return (
                    <div key={quote.id} className="capex-v2-file-item">
                      <span><strong>{quote.supplierName}</strong><small>{formatOmr(quote.quotedValue)}{quote.isProposed ? ' · proposed' : ''}</small></span>
                      <button type="button" className={`capex-v2-btn ${marked ? '' : 'capex-v2-btn--secondary'}`} onClick={() => toggleQuoteRemoval(quote.id)}>{marked ? 'Keep quotation' : 'Remove on save'}</button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="capex-v2-field capex-v2-field--full">
              <span className="capex-v2-label">Replacement or additional quotations</span>
              {newQuotes.map((quote, index) => (
                <div key={quote.clientId} className="capex-v2-quote" style={{ marginTop: 9 }}>
                  <div className="capex-v2-field"><label htmlFor={`correction-supplier-${index}`}>Supplier *</label><input id={`correction-supplier-${index}`} className="capex-v2-input" value={quote.supplierName} onChange={(event) => updateNewQuote(index, { supplierName: event.target.value })} /></div>
                  <div className="capex-v2-field"><label htmlFor={`correction-value-${index}`}>Quoted value *</label><input id={`correction-value-${index}`} className="capex-v2-input" inputMode="decimal" value={quote.quotedValue} onChange={(event) => updateNewQuote(index, { quotedValue: event.target.value })} /></div>
                  <div className="capex-v2-field"><label htmlFor={`correction-terms-${index}`}>Payment terms</label><input id={`correction-terms-${index}`} className="capex-v2-input" value={quote.paymentTerms} onChange={(event) => updateNewQuote(index, { paymentTerms: event.target.value })} /></div>
                  <div className="capex-v2-field"><label htmlFor={`correction-file-${index}`}>Quotation file *</label><FileUploadField id={`correction-file-${index}`} onChange={(event) => updateNewQuote(index, { file: event.target.files?.[0] || null })} /></div>
                  <div className="capex-v2-field"><Checkbox checked={quote.isProposed} onChange={() => markNewQuoteProposed(index)} label="Proposed supplier" /></div>
                  {quote.isProposed && <div className="capex-v2-field"><label htmlFor={`correction-justification-${index}`}>Non-lowest justification</label><input id={`correction-justification-${index}`} className="capex-v2-input" value={quote.nonLowestJustification} onChange={(event) => updateNewQuote(index, { nonLowestJustification: event.target.value })} /></div>}
                  <button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => setNewQuotes((current) => current.filter((_, quoteIndex) => quoteIndex !== index))}>Remove new quotation</button>
                </div>
              ))}
              <button type="button" className="capex-v2-btn capex-v2-btn--secondary" style={{ marginTop: 9 }} onClick={() => setNewQuotes((current) => [...current, newCorrectionQuote()])}>Add replacement quotation</button>
            </div>
          </div>
          <div className="capex-v2-form-actions" style={{ position: 'static' }}>
            <button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={busy} onClick={() => saveCorrection(false)}>Save correction</button>
            <button type="button" className="capex-v2-btn" disabled={busy} onClick={() => saveCorrection(true)}>{request.status === 'RETURNED' ? 'Save and resubmit' : 'Save and submit'}</button>
          </div>
        </section>
      )}

      <div className="capex-v2-detail-grid">
        <div className="capex-v2-detail-stack">
          <section className="capex-v2-panel">
            <div className="capex-v2-panel__header"><h3>Decision evidence</h3></div>
            <div className="capex-v2-panel__body">
              <div className="capex-v2-data-grid">
                <div className="capex-v2-data-point"><span>Estimated value</span><strong>{formatOmr(request.estimatedValue)}</strong></div>
                <div className="capex-v2-data-point"><span>Fiscal year</span><strong>{request.fiscalYear}</strong></div>
                <div className="capex-v2-data-point"><span>Value band</span><strong>{request.valueBand || 'Calculated on submission'}</strong></div>
              </div>
              <div style={{ marginTop: 20 }}><span className="capex-v2-eyebrow">Project description</span><div className="capex-v2-copy">{request.projectDescription}</div></div>
              {request.businessCase && <div style={{ marginTop: 18 }}><span className="capex-v2-eyebrow">Business case</span><div className="capex-v2-copy">{request.businessCase}</div></div>}
              {request.roiSummary && <div style={{ marginTop: 18 }}><span className="capex-v2-eyebrow">ROI / benefits</span><div className="capex-v2-copy">{request.roiSummary}</div></div>}
            </div>
          </section>

          <section className="capex-v2-panel">
            <div className="capex-v2-panel__header"><h3>Supporting documents</h3><span className="capex-v2-badge capex-v2-badge--neutral">{request.documents.length} files</span></div>
            <div className="capex-v2-panel__body">
              <div className="capex-v2-file-list">
                {request.documents.map((document) => (
                  <div key={document.id} className="capex-v2-file-item">
                    <span><strong>{document.filename}</strong><small>{document.documentKind.replaceAll('_', ' ')} · {(Number(document.byteSize) / 1024 / 1024).toFixed(2)} MB</small></span>
                    <button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => downloadCapexV2Document(document).catch((error) => toast.error(error.message))}>Download</button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="capex-v2-panel">
            <div className="capex-v2-panel__header"><h3>Supplier quotations</h3><span className="capex-v2-badge capex-v2-badge--neutral">{request.quotations.length} received</span></div>
            <div className="capex-v2-table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="capex-v2-table">
                <thead><tr><th>Supplier</th><th>Quote</th><th>Terms</th><th>Selection</th><th>Evidence</th></tr></thead>
                <tbody>
                  {request.quotations.map((quote) => {
                    const files = request.quotationDocuments.filter((document) => document.quotationId === quote.id);
                    return (
                      <tr key={quote.id}>
                        <td><span className="capex-v2-table__title">{quote.supplierName}</span>{quote.nonLowestJustification && <span className="capex-v2-table__meta">{quote.nonLowestJustification}</span>}</td>
                        <td>{formatOmr(quote.quotedValue)}</td>
                        <td>{quote.paymentTerms || '—'}</td>
                        <td>{quote.isProposed ? <StatusBadge status="PROPOSED" /> : '—'}</td>
                        <td>{files.map((file) => <button key={file.id} type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => downloadCapexV2Document(file).catch((error) => toast.error(error.message))}>{file.filename}</button>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="capex-v2-panel">
            <div className="capex-v2-panel__header"><h3>HSSE and Worker Welfare</h3></div>
            <div className="capex-v2-panel__body">
              <div className="capex-v2-data-grid">
                <div className="capex-v2-data-point"><span>Screening status</span><strong>{latestHsse?.status || 'NOT STARTED'}</strong></div>
                <div className="capex-v2-data-point"><span>HSSE risk</span><strong>{riskLabel(latestHsse?.hsseRisk)}</strong></div>
                <div className="capex-v2-data-point"><span>Worker Welfare risk</span><strong>{riskLabel(latestHsse?.workerWelfareRisk)}</strong></div>
              </div>
              <div className="capex-v2-notice" style={{ marginTop: 15 }}><strong>Independent screening</strong><span>These ratings are recorded only by the assigned HSSE Focal, never by the project owner.</span></div>
            </div>
          </section>

          <section className="capex-v2-panel">
            <div className="capex-v2-panel__header"><h3>Approval route and history</h3></div>
            <div className="capex-v2-panel__body">
              {request.workflowSteps.length ? (
                <div className="capex-v2-timeline">
                  {request.workflowSteps.map((step) => (
                    <div key={`${step.instanceId}-${step.stepId}`} className={`capex-v2-timeline__item is-${step.status.toLowerCase()}`}>
                      <strong>{step.label}</strong>
                      <small>{step.assignedUserName} · {step.status.replaceAll('_', ' ')}{step.decisionComment ? ` · ${step.decisionComment}` : ''}</small>
                    </div>
                  ))}
                </div>
              ) : <p className="capex-v2-copy">The route is generated and frozen when the requester submits against an active signed workflow version.</p>}
            </div>
          </section>
        </div>

        <aside className="capex-v2-detail-stack">
          <section className="capex-v2-panel capex-v2-decision">
            <div className="capex-v2-panel__header"><h3>{canDecide ? 'Your assigned decision' : 'Request control'}</h3></div>
            <div className="capex-v2-panel__body">
              {canDecide ? (
                <>
                  <span className="capex-v2-eyebrow">{currentStep.label}</span>
                  <p className="capex-v2-copy">Review the complete evidence packet before recording this decision.</p>
                  {currentStep.stepKey === 'HSSE_SCREENING' && (
                    <div className="capex-v2-form-grid" style={{ marginTop: 12 }}>
                      <div className="capex-v2-field"><label htmlFor="detail-hsse">HSSE risk *</label><SelectField id="detail-hsse" className="capex-v2-select" value={decision.hsseRisk} onChange={(hsseRisk) => setDecision({ ...decision, hsseRisk })} options={['LOW', 'MEDIUM', 'HIGH']} placeholder="Select rating" /></div>
                      <div className="capex-v2-field"><label htmlFor="detail-welfare">Worker Welfare risk *</label><SelectField id="detail-welfare" className="capex-v2-select" value={decision.workerWelfareRisk} onChange={(workerWelfareRisk) => setDecision({ ...decision, workerWelfareRisk })} options={['LOW', 'MEDIUM', 'HIGH']} placeholder="Select rating" /></div>
                    </div>
                  )}
                  <div className="capex-v2-field" style={{ marginTop: 12 }}><label htmlFor="decision-comment">Decision comment</label><textarea id="decision-comment" className="capex-v2-textarea" value={decision.comment} onChange={(event) => setDecision({ ...decision, comment: event.target.value })} /></div>
                  <div className="capex-v2-decision__actions">
                    <button type="button" className="capex-v2-btn" disabled={busy} onClick={() => runDecision('APPROVED')}>Approve step</button>
                    <button type="button" className="capex-v2-btn capex-v2-btn--quiet" disabled={busy} onClick={() => runDecision('RETURNED')}>Return</button>
                    <button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={busy} onClick={() => runDecision('REJECTED')}>Reject</button>
                  </div>
                </>
              ) : canEdit ? (
                <>
                  <p className="capex-v2-copy">This request is controlled by you and can be submitted or withdrawn while it is {request.status.toLowerCase()}.</p>
                  <div className="capex-v2-decision__actions">
                    <button type="button" className="capex-v2-btn" disabled={busy} onClick={submitExistingDraft}>{request.status === 'RETURNED' ? 'Resubmit' : 'Submit request'}</button>
                    <button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={busy} onClick={withdraw}>Withdraw</button>
                  </div>
                </>
              ) : (
                <p className="capex-v2-copy">No action is assigned to you. The backend continues to enforce organizational scope and named step ownership.</p>
              )}
            </div>
          </section>

          <section className="capex-v2-panel">
            <div className="capex-v2-panel__header"><h3>Budget position</h3></div>
            <div className="capex-v2-panel__body">
              {request.budgetPosition ? (
                <div className="capex-v2-data-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="capex-v2-data-point"><span>Allocation</span><strong>{request.budgetPosition.description}</strong></div>
                  <div className="capex-v2-data-point"><span>Authorized</span><strong>{formatOmr(request.budgetPosition.authorizedBudget)}</strong></div>
                  <div className="capex-v2-data-point"><span>Available</span><strong>{formatOmr(request.budgetPosition.available)}</strong></div>
                  <div className="capex-v2-data-point"><span>Proposed request</span><strong>{formatOmr(request.estimatedValue)}</strong></div>
                </div>
              ) : <p className="capex-v2-copy">No budget allocation is linked.</p>}
            </div>
          </section>

          {request.project && (
            <section className="capex-v2-panel">
              <div className="capex-v2-panel__header"><h3>Approved project</h3></div>
              <div className="capex-v2-panel__body"><strong>{request.project.projectNumber}</strong><p className="capex-v2-copy">A separate project shell was created. Procurement and execution remain later lifecycle releases.</p></div>
            </section>
          )}
          <small style={{ color: 'var(--label-tertiary)' }}>Created {formatDate(request.createdAt)} · version {request.version}</small>
        </aside>
      </div>
    </div>
  );
}
