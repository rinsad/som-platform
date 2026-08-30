import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Checkbox from '../../components/Checkbox';
import FileUploadField from '../../components/FileUploadField';
import SelectField from '../../components/SelectField';
import {
  addCapexV2Quotation,
  createCapexV2Request,
  getCapexV2Allocations,
  getCapexV2BudgetCycles,
  getCapexV2MasterData,
  submitCapexV2Request,
  uploadCapexV2Document,
  uploadCapexV2QuotationDocument,
} from '../../services/capexV2Service';
import { CapexV2Error, CapexV2Loading } from './CapexV2States';
import { fileIdentity, mergeSelectedFiles } from './capexV2Files';
import { formatOmr } from './capexV2Format';
import { quoteIsComplete, validateRequestForm } from './capexV2RequestValidation';

let quoteSequence = 0;
const newQuote = (proposed = false) => ({
  clientId: `quote-${Date.now()}-${quoteSequence += 1}`,
  supplierName: '',
  quotedValue: '',
  paymentTerms: '',
  isProposed: proposed,
  nonLowestJustification: '',
  file: null,
});

export default function CapexV2RequestForm() {
  const navigate = useNavigate();
  const [reference, setReference] = useState({ loading: true, master: null, cycles: [], allocations: [], error: null });
  const [form, setForm] = useState({
    title: '', organizationUnitId: '', budgetAllocationId: '', fiscalYear: '', estimatedValue: '',
    projectDescription: '', urgent: false, quoteWaiverReason: '',
  });
  const [projectFiles, setProjectFiles] = useState([]);
  const [quotes, setQuotes] = useState([newQuote(true)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);

  useEffect(() => {
    Promise.all([getCapexV2MasterData(), getCapexV2BudgetCycles()])
      .then(([master, cycles]) => setReference({ loading: false, master, cycles, allocations: [], error: null }))
      .catch((loadError) => setReference({ loading: false, master: null, cycles: [], allocations: [], error: loadError }));
  }, []);

  const selectedCycle = useMemo(
    () => reference.cycles.find((cycle) => String(cycle.fiscalYear) === String(form.fiscalYear) && cycle.status === 'OPEN'),
    [reference.cycles, form.fiscalYear]
  );

  const selectedCycleId = selectedCycle?.id || '';
  useEffect(() => {
    if (!selectedCycleId) return;
    getCapexV2Allocations(selectedCycleId)
      .then((allocations) => setReference((current) => ({ ...current, allocations })))
      .catch((loadError) => setReference((current) => ({ ...current, error: loadError })));
  }, [selectedCycleId]);

  const availableAllocations = useMemo(
    () => reference.allocations.filter((item) => item.organizationUnitId === form.organizationUnitId),
    [reference.allocations, form.organizationUnitId]
  );
  useEffect(() => {
    setForm((current) => {
      const selectionIsValid = availableAllocations.some((item) => item.id === current.budgetAllocationId);
      const budgetAllocationId = availableAllocations.length === 1
        ? availableAllocations[0].id
        : selectionIsValid ? current.budgetAllocationId : '';
      return budgetAllocationId === current.budgetAllocationId ? current : { ...current, budgetAllocationId };
    });
  }, [availableAllocations]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateQuote = (index, patch) => setQuotes((current) => current.map((quote, quoteIndex) => quoteIndex === index ? { ...quote, ...patch } : quote));
  const markProposed = (index) => setQuotes((current) => current.map((quote, quoteIndex) => ({ ...quote, isProposed: quoteIndex === index })));
  const selectProjectFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    setProjectFiles((current) => mergeSelectedFiles(current, selected));
    event.target.value = '';
  };

  const save = async (submitAfterSave) => {
    const validation = validateRequestForm({ form, projectFiles, quotes, submitting: submitAfterSave });
    if (validation) { setError(new Error(validation)); return; }
    setBusy(true);
    setError(null);
    try {
      const draft = await createCapexV2Request(form);
      setSavedDraft(draft);
      await Promise.all(projectFiles.map((file) => uploadCapexV2Document(draft.id, file)));

      const saveQuote = async (quote) => {
        const created = await addCapexV2Quotation(draft.id, {
          supplierName: quote.supplierName,
          quotedValue: quote.quotedValue,
          paymentTerms: quote.paymentTerms,
          isProposed: quote.isProposed,
          nonLowestJustification: quote.nonLowestJustification,
        });
        await uploadCapexV2QuotationDocument(draft.id, created.id, quote.file);
      };
      const completeQuotes = quotes.filter(quoteIsComplete);
      await Promise.all(completeQuotes.filter((quote) => !quote.isProposed).map(saveQuote));
      const proposedQuote = completeQuotes.find((quote) => quote.isProposed);
      if (proposedQuote) await saveQuote(proposedQuote);
      if (submitAfterSave) await submitCapexV2Request(draft.id);
      toast.success(submitAfterSave ? 'CAPEX request submitted' : 'CAPEX draft saved');
      navigate(`/capex-v2/requests/${draft.id}`);
    } catch (saveError) {
      setError(saveError);
    } finally {
      setBusy(false);
    }
  };

  if (reference.loading) return <CapexV2Loading lines={10} />;
  if (reference.error) return <CapexV2Error error={reference.error} />;

  return (
    <div>
      <div className="capex-v2-section-heading">
        <div>
          <h2>New CAPEX request</h2>
          <p>Create a decision-ready request against a posted SAC budget allocation.</p>
        </div>
        <div className="capex-v2-section-heading__actions">
          <button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => navigate('/capex-v2/requests')}>Cancel</button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 12 }}>
          <CapexV2Error error={error} />
          {savedDraft && (
            <button type="button" className="capex-v2-btn capex-v2-btn--quiet" style={{ marginTop: 8 }} onClick={() => navigate(`/capex-v2/requests/${savedDraft.id}`)}>
              Open saved draft {savedDraft.requestNumber}
            </button>
          )}
        </div>
      )}

      <section className="capex-v2-form-section">
        <h3>Project &amp; budget</h3>
        <p>Identify the project, accountable Business / Function, imported budget allocation, expected investment, and supporting scope.</p>
        <div className="capex-v2-form-grid">
          <div className="capex-v2-field capex-v2-field--full">
            <label htmlFor="v2-title">Request title *</label>
            <input id="v2-title" className="capex-v2-input" value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Station canopy replacement" />
          </div>
          <div className="capex-v2-field">
            <label htmlFor="v2-organization">Business / Function *</label>
            <SelectField id="v2-organization" className="capex-v2-select" value={form.organizationUnitId} onChange={(organizationUnitId) => setForm((current) => ({ ...current, organizationUnitId, budgetAllocationId: '' }))} options={reference.master.organizations.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select signed master data" />
          </div>
          <div className="capex-v2-field">
            <label htmlFor="v2-fiscal-year">Fiscal year *</label>
            <SelectField id="v2-fiscal-year" className="capex-v2-select" value={form.fiscalYear} onChange={(fiscalYear) => { setReference((current) => ({ ...current, allocations: [] })); setForm((current) => ({ ...current, fiscalYear, budgetAllocationId: '' })); }} options={reference.cycles.map((cycle) => ({ value: String(cycle.fiscalYear), label: `${cycle.fiscalYear} · ${cycle.status}` }))} placeholder="Select year" />
            {!selectedCycle && <small>No open posted budget cycle exists for this year.</small>}
          </div>
          <div className="capex-v2-field">
            <label htmlFor="v2-allocation">Budget allocation *</label>
            <SelectField id="v2-allocation" className="capex-v2-select" value={form.budgetAllocationId} onChange={(value) => set('budgetAllocationId', value)} options={availableAllocations.map((item) => ({ value: item.id, label: `${item.description} · ${formatOmr(item.available)} available` }))} placeholder="Select imported SAC allocation" />
            <small>Loaded from the controlled SAC import. Automatically selected when one allocation matches the business unit and fiscal year.</small>
          </div>
          <div className="capex-v2-field">
            <label htmlFor="v2-value">Estimated value (OMR) *</label>
            <input id="v2-value" className="capex-v2-input" inputMode="decimal" value={form.estimatedValue} onChange={(event) => set('estimatedValue', event.target.value)} placeholder="0.000" />
            <small>OMR values retain three decimal places.</small>
          </div>
          <div className="capex-v2-field capex-v2-field--full">
            <label htmlFor="v2-description">Project description *</label>
            <textarea id="v2-description" className="capex-v2-textarea" value={form.projectDescription} onChange={(event) => set('projectDescription', event.target.value)} placeholder="Describe the scope, business need, intended result, and key constraints." />
          </div>
          <div className="capex-v2-field capex-v2-field--full">
            <label htmlFor="v2-project-documents">Project strategy / scope documents *</label>
            <FileUploadField id="v2-project-documents" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={selectProjectFiles} aria-label="Upload project documents and presentations" />
            <small>Upload one or more project documents or presentations. The pilot limit is 25 MB per file.</small>
            {projectFiles.length > 0 && (
              <div className="capex-v2-file-list">
                {projectFiles.map((file) => <div key={fileIdentity(file)} className="capex-v2-file-item"><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={() => setProjectFiles((current) => current.filter((candidate) => candidate !== file))} aria-label={`Remove ${file.name}`}>Remove</button></div>)}
              </div>
            )}
          </div>
          <div className="capex-v2-field capex-v2-field--full">
            <Checkbox checked={form.urgent} onChange={(checked) => set('urgent', checked)} label="Urgent requirement" />
            <small>Marks this request as time-sensitive for visibility. Normal approval requirements still apply.</small>
          </div>
        </div>
      </section>

      <section className="capex-v2-form-section">
        <h3>Sourcing evidence</h3>
        <p>Capture the quotations received and identify the proposed supplier. The active signed MOA determines the applicable count and waiver route.</p>
        {quotes.map((quote, index) => (
          <div key={quote.clientId} className="capex-v2-quote">
            <div className="capex-v2-field">
              <label htmlFor={`supplier-${index}`}>Supplier *</label>
              <input id={`supplier-${index}`} className="capex-v2-input" value={quote.supplierName} onChange={(event) => updateQuote(index, { supplierName: event.target.value })} />
            </div>
            <div className="capex-v2-field">
              <label htmlFor={`quote-value-${index}`}>Quoted value *</label>
              <input id={`quote-value-${index}`} className="capex-v2-input" inputMode="decimal" value={quote.quotedValue} onChange={(event) => updateQuote(index, { quotedValue: event.target.value })} placeholder="0.000" />
            </div>
            <div className="capex-v2-field">
              <label htmlFor={`terms-${index}`}>Payment terms</label>
              <input id={`terms-${index}`} className="capex-v2-input" value={quote.paymentTerms} onChange={(event) => updateQuote(index, { paymentTerms: event.target.value })} />
            </div>
            <div className="capex-v2-field">
              <label htmlFor={`quote-file-${quote.clientId}`}>Quotation file *</label>
              <FileUploadField id={`quote-file-${quote.clientId}`} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(event) => updateQuote(index, { file: event.target.files?.[0] || null })} aria-label={`Upload quotation ${index + 1}`} />
            </div>
            <div className="capex-v2-field" style={{ alignSelf: 'center' }}>
              <Checkbox checked={quote.isProposed} onChange={() => markProposed(index)} label="Proposed supplier" />
            </div>
            {quote.isProposed && (
              <div className="capex-v2-field" style={{ gridColumn: 'span 2' }}>
                <label htmlFor={`justification-${index}`}>Non-lowest selection justification</label>
                <input id={`justification-${index}`} className="capex-v2-input" value={quote.nonLowestJustification} onChange={(event) => updateQuote(index, { nonLowestJustification: event.target.value })} placeholder="Required only when this is not the lowest quotation" />
              </div>
            )}
            <button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={quotes.length === 1} onClick={() => setQuotes((current) => current.filter((_, quoteIndex) => quoteIndex !== index).map((item, nextIndex) => ({ ...item, isProposed: current[index].isProposed && nextIndex === 0 ? true : item.isProposed })))}>Remove</button>
          </div>
        ))}
        <button type="button" className="capex-v2-btn capex-v2-btn--secondary" style={{ marginTop: 9 }} onClick={() => setQuotes((current) => [...current, newQuote(false)])}>Add quotation</button>
        <div className="capex-v2-field" style={{ marginTop: 14 }}>
          <label htmlFor="v2-waiver">Quotation waiver / single-source reason</label>
          <textarea id="v2-waiver" className="capex-v2-textarea" value={form.quoteWaiverReason} onChange={(event) => set('quoteWaiverReason', event.target.value)} placeholder="Complete only when the active policy permits fewer quotations." />
        </div>
      </section>

      <div className="capex-v2-form-actions">
        <button type="button" className="capex-v2-btn capex-v2-btn--secondary" disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : 'Save draft'}</button>
        <button type="button" className="capex-v2-btn" disabled={busy} onClick={() => save(true)}>{busy ? 'Submitting…' : 'Create and submit'}</button>
      </div>
    </div>
  );
}
