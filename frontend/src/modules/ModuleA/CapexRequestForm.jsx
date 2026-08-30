import { useEffect, useMemo, useState } from 'react';
import { DEPT_NAMES, getBusinessFunctions, getCapexAssetCategories } from '../../services/capexService';
import { readUserScope } from '../../utils/userScope';
import SelectField from '../../components/SelectField';
import Checkbox from '../../components/Checkbox';
import FileUploadField from '../../components/FileUploadField';

function makeClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `quote-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyQuote(selected = false) {
  return {
    _uid: makeClientId(),
    supplierName: '',
    quoteValue: '',
    currency: 'OMR',
    paymentTerms: '',
    attachmentName: '',
    file: null,
    isSelected: selected,
  };
}

function valueBand(value) {
  const n = Number(value) || 0;
  if (n <= 25000) return 'LOW';
  if (n <= 300000) return 'MEDIUM';
  return 'HIGH';
}

function financialYearOptions() {
  const year = new Date().getFullYear();
  return [year - 1, year, year + 1, year + 2].map(y => ({
    value: y,
    label: `FY ${y}`,
  }));
}

export default function CapexRequestForm({ onSubmit, onCancel }) {
  const fyOptions = useMemo(() => financialYearOptions(), []);
  const { businessFunctionId, businessFunctionName, isPortfolioScope } = useMemo(() => readUserScope(), []);
  // The live Business / Function master, replacing the hardcoded department
  // list. Falls back to DEPT_NAMES so the form still works if the call fails.
  const [businessFunctions, setBusinessFunctions] = useState([]);
  // Admin-maintained asset categories. Empty until the call returns; the field
  // is optional, so a failed call costs the requester nothing.
  const [assetCategories, setAssetCategories] = useState([]);
  const [form, setForm] = useState({
    title: '',
    organizationUnitId: businessFunctionId || '',
    businessFunction: businessFunctionName || DEPT_NAMES[0],
    department: businessFunctionName || DEPT_NAMES[0],
    budgetHolder: '',
    financialYear: new Date().getFullYear(),
    currentCostBudget: '',
    estimatedValue: '',
    urgent: false,
    scopeDetails: '',
    frequency: 'One-time',
    volumePerYear: '',
    paymentTermsAgreed: false,
    paymentTerms: '90 days',
    fewerThan3Justification: '',
    savings: '',
    roi: '',
    projectOwnerTitle: '',
    startDate: '',
    targetCompletionDate: '',
    expectedCapitalizationDate: '',
    assetCategoryId: '',
    projectFiles: [],
    quotations: [emptyQuote(true), emptyQuote(), emptyQuote()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getBusinessFunctions()
      .then((units) => {
        if (cancelled || !Array.isArray(units) || !units.length) return;
        setBusinessFunctions(units);
        setForm((prev) => {
          if (prev.organizationUnitId) return prev;
          // A user attached to exactly one business files into it by default.
          const preferred = units.find((unit) => unit.name === businessFunctionName) || units[0];
          return {
            ...prev,
            organizationUnitId: preferred.id,
            businessFunction: preferred.name,
            department: preferred.name,
          };
        });
      })
      .catch(() => { /* keep the DEPT_NAMES fallback */ });
    return () => { cancelled = true; };
  }, [businessFunctionName]);

  useEffect(() => {
    let cancelled = false;
    getCapexAssetCategories()
      .then((categories) => {
        if (!cancelled && Array.isArray(categories)) setAssetCategories(categories);
      })
      .catch(() => { /* optional field — leave the picker empty */ });
    return () => { cancelled = true; };
  }, []);

  // Business options come from the server, which already filters them to what
  // this user may file into; portfolio users see every business.
  const businessOptions = businessFunctions.length
    ? businessFunctions.map((unit) => ({ value: unit.id, label: unit.name }))
    : DEPT_NAMES.map((name) => ({ value: name, label: name }));
  const businessLocked = !isPortfolioScope && businessFunctions.length === 1;

  function setBusiness(value) {
    const unit = businessFunctions.find((item) => item.id === value);
    setForm(prev => ({
      ...prev,
      organizationUnitId: unit ? unit.id : '',
      businessFunction: unit ? unit.name : value,
      department: unit ? unit.name : value,
    }));
  }

  const band = useMemo(() => valueBand(form.estimatedValue), [form.estimatedValue]);
  const validQuotes = form.quotations.filter(q => q.supplierName.trim() && Number(q.quoteValue) > 0);
  const selectedQuote = validQuotes.find(q => q.isSelected);
  const selectedCost = Number(selectedQuote?.quoteValue || 0);
  const budgetValue = Number(form.currentCostBudget || 0);
  const budgetVariance = budgetValue > 0 && selectedCost > 0 ? budgetValue - selectedCost : null;
  const needsJustification = validQuotes.length < 3;
  const readinessChecks = [
    Boolean(form.title.trim()),
    Boolean(form.scopeDetails.trim()),
    Number(form.estimatedValue) > 0,
    form.projectFiles.length > 0,
    validQuotes.length > 0,
    validQuotes.length > 0 && validQuotes.every(q => Boolean(q.file)),
    !needsJustification || Boolean(form.fewerThan3Justification.trim()),
    Boolean(selectedQuote),
  ];
  const readinessCount = readinessChecks.filter(Boolean).length;

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function setQuote(index, field, value) {
    setForm(prev => ({
      ...prev,
      quotations: prev.quotations.map((q, i) => {
        if (field === 'isSelected') return { ...q, isSelected: i === index };
        return i === index ? { ...q, [field]: value } : q;
      }),
    }));
  }

  function addQuote() {
    setForm(prev => ({ ...prev, quotations: [...prev.quotations, emptyQuote()] }));
  }

  function removeQuote(index) {
    setForm(prev => {
      const next = prev.quotations.filter((_, i) => i !== index);
      if (!next.some(q => q.isSelected) && next[0]) next[0].isSelected = true;
      return { ...prev, quotations: next.length ? next : [emptyQuote(true)] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Request title is required.');
    if (!form.scopeDetails.trim()) return setError('Project description is required.');
    if (!form.estimatedValue || Number(form.estimatedValue) <= 0) return setError('Estimated value must be greater than zero.');
    if (!form.projectFiles.length) return setError('At least one project document or presentation is required.');
    if (!validQuotes.length) return setError('At least one supplier quotation is required.');
    if (validQuotes.some(q => !q.file)) return setError('Attach a document for every supplier quotation.');
    if (needsJustification && !form.fewerThan3Justification.trim()) return setError('Justification is required when fewer than 3 quotations are provided.');
    if (!validQuotes.some(q => q.isSelected)) return setError('Select one supplier quotation.');
    // Mirrors the server check so the requester sees it before the round trip.
    if (form.startDate && form.targetCompletionDate && form.targetCompletionDate < form.startDate) {
      return setError('Target completion date cannot be earlier than the start date.');
    }

    setSaving(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        financialYear: Number(form.financialYear),
        currentCostBudget: Number(form.currentCostBudget || 0),
        estimatedValue: Number(form.estimatedValue),
        savings: budgetVariance === null ? undefined : budgetVariance,
        // Send null rather than '' for the untouched optional fields — the API
        // reads '' as "clear this" and null/absent as "leave it unset".
        projectOwnerTitle: form.projectOwnerTitle.trim() || null,
        startDate: form.startDate || null,
        targetCompletionDate: form.targetCompletionDate || null,
        expectedCapitalizationDate: form.expectedCapitalizationDate || null,
        assetCategoryId: form.assetCategoryId ? Number(form.assetCategoryId) : null,
        projectFiles: form.projectFiles,
        quotations: validQuotes.map(q => {
          const clean = { ...q, quoteValue: Number(q.quoteValue), attachmentName: q.file.name };
          delete clean._uid;
          return clean;
        }),
      });
    } catch (err) {
      setError(err.message || 'Failed to create CAPEX request.');
      setSaving(false);
    }
  }

  return (
    <div style={s.page}>
      <header style={s.pageHeader}>
        <button type="button" style={s.backBtn} onClick={onCancel}>← CAPEX requests</button>
        <div>
          <div style={s.eyebrow}>CAPEX governance</div>
          <h1 style={s.pageTitle}>New CAPEX Request</h1>
          <p style={s.pageSubtitle}>Capture the project, risk, budget, and supplier evidence required for approval routing.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="capex-request-form-layout" style={s.layout}>
          <main style={s.mainColumn}>
            {error && <div role="alert" style={s.error}>{error}</div>}

            <section id="project-budget" style={s.card}>
              <div style={s.cardHeader}>
                <div>
                  <h2 style={s.cardTitle}>Project & budget</h2>
                  <p style={s.cardSubtitle}>Identify the request owner, budget year, and expected investment.</p>
                </div>
                <span style={s.badge}>Value band: {band}</span>
              </div>

              <div className="capex-request-grid-3" style={s.grid3}>
                <Field label="Request Title *" wide>
                  <input style={s.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Station canopy upgrade" />
                </Field>
                <Field
                  label="Business / Function *"
                  hint={businessLocked ? 'Your account files into this business.' : undefined}
                >
                  <SelectField
                    style={s.input}
                    value={form.organizationUnitId || form.businessFunction}
                    onChange={setBusiness}
                    options={businessOptions}
                    disabled={businessLocked}
                    aria-label="Business / Function"
                  />
                </Field>
                <Field label="Department *">
                  <SelectField style={s.input} value={form.department} onChange={v => set('department', v)} options={DEPT_NAMES} aria-label="Department" />
                </Field>
                <Field label="Budget Holder">
                  <input style={s.input} value={form.budgetHolder} onChange={e => set('budgetHolder', e.target.value)} placeholder="Name" />
                </Field>
                <Field label="Financial Year *" hint="Budget year for approval and reporting.">
                  <SelectField style={s.input} value={form.financialYear} onChange={v => set('financialYear', v)} options={fyOptions} aria-label="Financial Year" />
                </Field>
                <Field label="Current Cost / Budget">
                  <input style={s.input} type="number" min="0" step="0.001" value={form.currentCostBudget} onChange={e => set('currentCostBudget', e.target.value)} />
                </Field>
                <Field label="Estimated Value (OMR) *">
                  <input style={s.input} type="number" min="0" step="0.001" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} />
                </Field>
              </div>

              <Field label="Project Description *">
                <textarea style={{ ...s.input, minHeight: 104 }} value={form.scopeDetails} onChange={e => set('scopeDetails', e.target.value)} placeholder="Describe the scope and business need." />
              </Field>

              <Field label="Project Documents & Presentations *" hint="Upload one or more supporting files. Maximum file size: 5 MB per file.">
                <div style={s.filePickerRow}>
                  <FileUploadField
                    onChange={e => {
                      const selected = Array.from(e.target.files || []);
                      setForm(prev => ({
                        ...prev,
                        projectFiles: [...prev.projectFiles, ...selected].filter((file, index, files) => (
                          files.findIndex(candidate => candidate.name === file.name
                            && candidate.size === file.size
                            && candidate.lastModified === file.lastModified) === index
                        )),
                      }));
                      e.target.value = '';
                    }}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                    aria-label="Upload project documents and presentations"
                  />
                  {form.projectFiles.length > 0 && (
                    <div style={s.selectedFileList}>
                      {form.projectFiles.map(file => (
                        <div key={`${file.name}-${file.size}-${file.lastModified}`} style={s.selectedFile}>
                          <span style={s.selectedFileName}>{file.name}</span>
                          <span style={s.selectedFileSize}>{formatFileSize(file.size)}</span>
                          <button
                            type="button"
                            style={s.fileRemoveBtn}
                            onClick={() => set('projectFiles', form.projectFiles.filter(candidate => candidate !== file))}
                            aria-label={`Remove ${file.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <div style={s.urgentField}>
                <Checkbox
                  id="capex-urgent"
                  style={s.check}
                  checked={form.urgent}
                  onChange={c => set('urgent', c)}
                  label="Urgent requirement"
                  aria-describedby="capex-urgent-help"
                />
                <p id="capex-urgent-help" style={s.urgentHint}>
                  Marks this request as time-sensitive for visibility. Normal approval requirements still apply.
                </p>
              </div>
            </section>

            <section id="schedule-capitalization" style={s.card}>
              <div style={s.cardHeader}>
                <div>
                  <h2 style={s.cardTitle}>Schedule & capitalization</h2>
                  <p style={s.cardSubtitle}>
                    Planning dates and asset classification for the CAPEX repository. All optional at
                    submission — fill them in as the project firms up.
                  </p>
                </div>
              </div>

              <div className="capex-request-grid-3" style={s.grid3}>
                <Field label="Project Owner Job Title" hint="Shown alongside your name in the repository.">
                  <input
                    style={s.input}
                    value={form.projectOwnerTitle}
                    onChange={e => set('projectOwnerTitle', e.target.value)}
                    placeholder="e.g. Real Estate Project Owner"
                    aria-label="Project Owner Job Title"
                  />
                </Field>
                <Field label="Asset Category" hint="Maintained by an administrator.">
                  <SelectField
                    style={s.input}
                    value={form.assetCategoryId}
                    onChange={v => set('assetCategoryId', v)}
                    options={assetCategories.map(c => ({ value: c.id, label: c.name }))}
                    placeholder={assetCategories.length ? 'Select…' : 'No categories configured'}
                    aria-label="Asset Category"
                  />
                </Field>
                <Field label="Start Date">
                  <input
                    style={s.input}
                    type="date"
                    value={form.startDate}
                    onChange={e => set('startDate', e.target.value)}
                    aria-label="Start Date"
                  />
                </Field>
                <Field label="Target Completion Date">
                  {/* Deliberately no `min`: a native min blocks form submission
                      with a browser bubble, bypassing the inline role="alert"
                      message every other check in this form uses. The ordering
                      is validated on submit instead, and again on the server. */}
                  <input
                    style={s.input}
                    type="date"
                    value={form.targetCompletionDate}
                    onChange={e => set('targetCompletionDate', e.target.value)}
                    aria-label="Target Completion Date"
                  />
                </Field>
                <Field label="Expected Capitalization Date" hint="When the spend is expected to be capitalized.">
                  <input
                    style={s.input}
                    type="date"
                    value={form.expectedCapitalizationDate}
                    onChange={e => set('expectedCapitalizationDate', e.target.value)}
                    aria-label="Expected Capitalization Date"
                  />
                </Field>
              </div>
            </section>

            <section id="risk-business-case" style={s.card}>
              <div style={s.cardHeader}>
                <div>
                  <h2 style={s.cardTitle}>Risk & business case</h2>
                  <p style={s.cardSubtitle}>Explain the need and classify the operational exposure.</p>
                </div>
              </div>

              <div style={s.hsseScreeningNotice}>
                <strong>Mandatory HSSE screening</strong>
                <span>Every request is routed to the HSSE Focal, who records the HSSE and Worker Welfare risk ratings.</span>
              </div>

              <div className="capex-request-grid-3" style={s.grid3}>
                <Field label="ROI">
                  <input style={s.input} value={form.roi} onChange={e => set('roi', e.target.value)} />
                </Field>
              </div>

            </section>

            <section id="quotations-terms" style={s.card}>
              <div style={s.cardHeader}>
                <div>
                  <h2 style={s.cardTitle}>Supplier quotations & terms</h2>
                  <p style={s.cardSubtitle}>Record comparable quotations and select the proposed supplier.</p>
                </div>
                <button type="button" style={s.secondaryBtn} onClick={addQuote}>+ Add Quote</button>
              </div>

              <div style={s.quoteList}>
                {form.quotations.map((q, i) => (
                  <div key={q._uid} className="capex-request-quote-row" style={s.quoteRow}>
                    <input style={s.input} placeholder="Supplier" value={q.supplierName} onChange={e => setQuote(i, 'supplierName', e.target.value)} />
                    <input style={s.input} type="number" min="0" step="0.001" placeholder="Quote value" value={q.quoteValue} onChange={e => setQuote(i, 'quoteValue', e.target.value)} />
                    <input style={s.input} placeholder="Payment terms" value={q.paymentTerms} onChange={e => setQuote(i, 'paymentTerms', e.target.value)} />
                    <div style={s.quoteFileCell}>
                      <FileUploadField
                        key={`${q._uid}-${q.file?.name || 'empty'}`}
                        onChange={e => setQuote(i, 'file', e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        aria-label={`Upload quotation document ${i + 1}`}
                      />
                      {q.file && (
                        <div style={s.quoteFileMeta}>
                          <span style={s.quoteFileName} title={q.file.name}>{q.file.name}</span>
                          <button type="button" style={s.fileRemoveBtn} onClick={() => setQuote(i, 'file', null)}>Remove</button>
                        </div>
                      )}
                    </div>
                    <label style={s.radio}><input type="radio" checked={q.isSelected} onChange={() => setQuote(i, 'isSelected', true)} /> Proposed</label>
                    <button type="button" style={s.removeBtn} onClick={() => removeQuote(i)}>Remove</button>
                  </div>
                ))}
              </div>

              {needsJustification && (
                <Field label="Justification for fewer than 3 quotations *">
                  <textarea style={{ ...s.input, minHeight: 78 }} value={form.fewerThan3Justification} onChange={e => set('fewerThan3Justification', e.target.value)} />
                </Field>
              )}

              <div className="capex-request-grid-3" style={s.grid3}>
                <Field label="Payment Terms">
                  <input style={s.input} value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} />
                </Field>
                <Checkbox style={{ ...s.check, alignSelf: 'end', marginBottom: 14 }} checked={form.paymentTermsAgreed} onChange={c => set('paymentTermsAgreed', c)} label="Payment terms agreed" />
              </div>
            </section>
          </main>

          <aside className="capex-request-summary" style={s.summaryColumn} aria-label="Request summary">
            <div style={s.summaryCard}>
              <div style={s.summaryEyebrow}>Submission summary</div>
              <h2 style={s.summaryTitle}>{form.title.trim() || 'Untitled request'}</h2>
              <div style={s.summaryRows}>
                <SummaryRow label="Value band" value={band} />
                <SummaryRow label="Estimated value" value={form.estimatedValue ? `OMR ${Number(form.estimatedValue).toLocaleString('en-GB')}` : '—'} />
                <SummaryRow label="Valid quotes" value={`${validQuotes.length} / 3`} />
                <SummaryRow label="Proposed supplier" value={selectedQuote?.supplierName || 'Not selected'} />
              </div>

              <div
                style={{
                  ...s.budgetPosition,
                  ...(budgetVariance === null
                    ? s.budgetPositionPending
                    : budgetVariance >= 0 ? s.budgetPositionSaving : s.budgetPositionOver),
                }}
                aria-live="polite"
              >
                <span style={s.budgetPositionLabel}>Budget position</span>
                <strong style={s.budgetPositionValue}>
                  {budgetVariance === null
                    ? 'Enter budget and select a quote'
                    : `${budgetVariance >= 0 ? 'Savings' : 'Over budget'} · OMR ${Math.abs(budgetVariance).toLocaleString('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`}
                </strong>
              </div>

              <div style={s.readinessBlock}>
                <div style={s.readinessHead}>
                  <span>Submission readiness</span>
                  <strong>{readinessCount} / {readinessChecks.length}</strong>
                </div>
                <div style={s.readinessTrack}>
                  <span style={{ ...s.readinessFill, width: `${(readinessCount / readinessChecks.length) * 100}%` }} />
                </div>
                <p style={s.readinessHint}>Missing requirements will be shown inline when you submit.</p>
              </div>

              <div style={s.actions}>
                <button type="submit" style={{ ...s.primaryBtn, ...(saving ? s.primaryBtnDisabled : {}) }} disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit CAPEX Request'}
                </button>
                <button type="button" style={s.cancelBtn} onClick={onCancel}>Cancel</button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={s.summaryRow}>
      <span style={s.summaryLabel}>{label}</span>
      <strong style={s.summaryValue}>{value}</strong>
    </div>
  );
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Field({ label, children, wide, hint }) {
  return (
    <label style={{ ...s.field, ...(wide ? { gridColumn: '1 / -1' } : {}) }}>
      <span style={s.label}>{label}</span>
      {children}
      {hint && <span style={s.hint}>{hint}</span>}
    </label>
  );
}

const s = {
  page: { animation: 'fadeIn 0.25s var(--ease)' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 22 },
  backBtn: {
    flexShrink: 0, marginTop: 3, padding: '8px 13px', background: '#FFFFFF', color: 'var(--gray-700)',
    border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit', boxShadow: 'var(--shadow-xs)',
  },
  eyebrow: { marginBottom: 4, color: 'var(--shell-red)', fontSize: 11, fontWeight: 850, letterSpacing: '.06em', textTransform: 'uppercase' },
  pageTitle: { margin: 0, color: 'var(--label)', fontSize: 27, fontWeight: 850, letterSpacing: '-.02em' },
  pageSubtitle: { margin: '5px 0 0', color: 'var(--label-secondary)', fontSize: 13.5, fontWeight: 550, lineHeight: 1.5 },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 18, alignItems: 'start' },
  mainColumn: { display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 },
  summaryColumn: { position: 'sticky', top: 16, alignSelf: 'start' },
  card: {
    background: '#FFFFFF', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
    padding: '22px 24px', boxShadow: 'var(--shadow-sm)', scrollMarginTop: 16,
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
  cardTitle: { margin: 0, color: 'var(--label)', fontSize: 16, fontWeight: 850, letterSpacing: '-.01em' },
  cardSubtitle: { margin: '4px 0 0', color: 'var(--label-tertiary)', fontSize: 12.5, fontWeight: 550, lineHeight: 1.45 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 14px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 850, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  hint: { marginTop: -1, fontSize: 11, color: 'var(--label-tertiary)', fontWeight: 600, lineHeight: 1.35 },
  input: {
    border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 11px',
    fontSize: 13,
    color: 'var(--label)',
    background: '#FFFFFF',
    fontFamily: 'inherit',
    width: '100%',
  },
  badge: { background: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)', border: '1px solid var(--accent-amber-line)', borderRadius: 'var(--radius-pill)', padding: '5px 12px', fontSize: 12, fontWeight: 850 },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-600)' },
  urgentField: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  urgentHint: { margin: 0, color: 'var(--label-tertiary)', fontSize: 11.5, fontWeight: 550, lineHeight: 1.45 },
  hsseScreeningNotice: {
    display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, padding: '12px 14px',
    background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info)',
    borderRadius: 'var(--radius-md)', fontSize: 12, lineHeight: 1.45,
  },
  quoteList: { display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 },
  quoteRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(160px, 1.1fr) minmax(110px, .7fr) minmax(130px, .8fr) minmax(160px, 1fr) 92px 72px',
    gap: 8,
    alignItems: 'center',
    background: 'var(--gray-50)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    padding: 10,
  },
  filePickerRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  selectedFileList: { display: 'grid', gap: 8, minWidth: 0 },
  selectedFile: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, color: 'var(--label-secondary)', fontSize: 12 },
  selectedFileName: { maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 750 },
  selectedFileSize: { color: 'var(--label-tertiary)' },
  fileRemoveBtn: { border: 0, background: 'transparent', color: 'var(--shell-red)', padding: 0, font: 'inherit', fontSize: 11, fontWeight: 800, cursor: 'pointer' },
  quoteFileCell: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 },
  quoteFileMeta: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
  quoteFileName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--label-secondary)', fontSize: 11, fontWeight: 700 },
  radio: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--label-secondary)' },
  error: { background: 'var(--accent-red-bg)', color: 'var(--shell-red-dark)', border: '1px solid var(--accent-red-line)', borderRadius: 'var(--radius-sm)', padding: '11px 13px', fontSize: 13, fontWeight: 750 },
  summaryCard: { background: '#FFFFFF', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: 18, boxShadow: 'var(--shadow-sm)' },
  summaryEyebrow: { color: 'var(--label-tertiary)', fontSize: 10.5, fontWeight: 850, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5 },
  summaryTitle: { margin: '0 0 16px', color: 'var(--label)', fontSize: 16, fontWeight: 850, lineHeight: 1.35, overflowWrap: 'anywhere' },
  summaryRows: { borderTop: '1px solid var(--gray-100)', borderBottom: '1px solid var(--gray-100)', padding: '8px 0' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '6px 0' },
  summaryLabel: { color: 'var(--label-tertiary)', fontSize: 11.5, fontWeight: 650 },
  summaryValue: { color: 'var(--label)', fontSize: 11.5, fontWeight: 800, textAlign: 'right', overflowWrap: 'anywhere' },
  budgetPosition: { marginTop: 12, padding: '11px 12px', border: '1px solid', borderRadius: 'var(--radius-md)' },
  budgetPositionPending: { background: 'var(--neutral-bg)', borderColor: 'var(--gray-200)', color: 'var(--neutral-text)' },
  budgetPositionSaving: { background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success-text)' },
  budgetPositionOver: { background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: 'var(--danger-text)' },
  budgetPositionLabel: { display: 'block', marginBottom: 3, fontSize: 10.5, fontWeight: 850, letterSpacing: '.04em', textTransform: 'uppercase', color: 'inherit' },
  budgetPositionValue: { display: 'block', fontSize: 12.5, fontWeight: 850, lineHeight: 1.35, color: 'inherit', fontVariantNumeric: 'tabular-nums' },
  readinessBlock: { padding: '15px 0 14px' },
  readinessHead: { display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--label-secondary)', fontSize: 11.5, fontWeight: 800 },
  readinessTrack: { position: 'relative', height: 6, overflow: 'hidden', marginTop: 8, borderRadius: 'var(--radius-pill)', background: 'var(--gray-100)' },
  readinessFill: { position: 'absolute', inset: 0, right: 'auto', borderRadius: 'var(--radius-pill)', background: 'var(--shell-red)', transition: 'width var(--transition)' },
  readinessHint: { margin: '8px 0 0', color: 'var(--label-tertiary)', fontSize: 10.5, lineHeight: 1.45 },
  actions: { display: 'flex', flexDirection: 'column', gap: 8 },
  primaryBtn: { width: '100%', padding: '10px 14px', background: 'var(--shell-red)', color: '#fff', border: '1px solid var(--shell-red-dark)', borderRadius: 'var(--radius-sm)', fontWeight: 850, cursor: 'pointer', fontFamily: 'inherit' },
  primaryBtnDisabled: { opacity: .65, cursor: 'not-allowed' },
  secondaryBtn: { padding: '8px 14px', background: '#FFFFFF', color: 'var(--gray-700)', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontWeight: 850, cursor: 'pointer' },
  cancelBtn: { width: '100%', padding: '9px 14px', background: '#FFFFFF', color: 'var(--gray-700)', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },
  removeBtn: { padding: '8px 10px', background: 'var(--accent-red-bg)', color: 'var(--shell-red-dark)', border: '1px solid var(--accent-red-line)', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' },
};
