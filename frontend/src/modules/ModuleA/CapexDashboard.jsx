import { useState, useEffect, useRef } from 'react';
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import {
  getDepartments, getSyncStatus, getGsapData,
  getInitiations, createInitiation,
  getCapexRequests, getCapexRequest, createCapexRequest, decideCapexRequest,
  updateCapexProcurement, createCapexMilestone, updateCapexMilestone,
  saveCapexFinancialClosure, getCapexAuditLogs, getCapexReportCsvUrl,
  getCapexGovernanceDashboard, getCapexDashboardDrilldown, getCapexProcessReference,
  getCapexGovernanceExportUrl, getCapexReportSchedules, createCapexReportSchedule,
  updateCapexAuc, updateCapexCapitalization, updateCapexPoClosure,
  updateCapexClosureChecklistItem, saveCapexBenefitReview, createCapexRisk,
  createCapexMoa, createCapexDocumentVersion, createCapexSignature,
  createCapexBudgetVariation, updateCapexProcurementPerformance, updateCapexDecisionGate,
  getCapexAdminConfig, updateCapexThresholds, updateCapexWorkflowRule,
  uploadCapexAttachment, downloadCapexAttachment,
  getManualEntries, createManualEntry,
  DEPT_NAMES,
} from '../../services/capexService';
import usePermissions from '../../hooks/usePermissions';
import ManualEntryModal        from './ManualEntryModal';
import CapexInitiationForm     from './CapexInitiationForm';
import CapexBudgetUploadModal  from './CapexBudgetUploadModal';
import CapexRequestForm        from './CapexRequestForm';

if (typeof Chart.register === 'function') {
  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtOMR(val) {
  if (val >= 1_000_000) return `OMR ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `OMR ${Math.round(val / 1_000)}k`;
  return `OMR ${val?.toLocaleString()}`;
}

function meterColor(pct) {
  if (pct >= 90) return '#DD1D21';
  if (pct >= 70) return '#BA7517';
  return '#2e7d32';
}

function StatusBadge({ status }) {
  const map = {
    success:              { bg: '#E7F6EF', color: '#176B43', border: '#B8E2CD' },
    error:                { bg: '#FDECEC', color: '#A91F23', border: '#F4B8BB' },
    Posted:               { bg: '#E7F6EF', color: '#176B43', border: '#B8E2CD' },
    Approved:             { bg: '#E7F6EF', color: '#176B43', border: '#B8E2CD' },
    Completed:            { bg: '#E7F6EF', color: '#176B43', border: '#B8E2CD' },
    Complete:             { bg: '#E7F6EF', color: '#176B43', border: '#B8E2CD' },
    Signed:               { bg: '#E7F6EF', color: '#176B43', border: '#B8E2CD' },
    'Under Review':       { bg: '#FFF7D1', color: '#805B00', border: '#F1D36A' },
    'Pending Approval':   { bg: '#FFF7D1', color: '#805B00', border: '#F1D36A' },
    Pending:              { bg: '#FFF7D1', color: '#805B00', border: '#F1D36A' },
    Draft:                { bg: '#EEF2F7', color: '#4B5C6B', border: '#D6DEE8' },
    'Partially Delivered':{ bg: '#E9F1FB', color: '#225C94', border: '#BDD3EA' },
    Open:                 { bg: '#E9F1FB', color: '#225C94', border: '#BDD3EA' },
    High:                 { bg: '#FDECEC', color: '#A91F23', border: '#F4B8BB' },
    Red:                  { bg: '#FDECEC', color: '#A91F23', border: '#F4B8BB' },
    Medium:               { bg: '#FFF7D1', color: '#805B00', border: '#F1D36A' },
    Amber:                { bg: '#FFF7D1', color: '#805B00', border: '#F1D36A' },
    Low:                  { bg: '#E7F6EF', color: '#176B43', border: '#B8E2CD' },
    Green:                { bg: '#E7F6EF', color: '#176B43', border: '#B8E2CD' },
    Rejected:             { bg: '#FDECEC', color: '#A91F23', border: '#F4B8BB' },
    'Returned for Correction': { bg: '#FFF7D1', color: '#805B00', border: '#F1D36A' },
  };
  const style = map[status] || { bg: '#EEF2F7', color: '#4B5C6B', border: '#D6DEE8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: style.bg, color: style.color,
      border: `1px solid ${style.border}`,
      borderRadius: 'var(--radius-full)',
      padding: '3px 10px', fontSize: 12, fontWeight: 800,
      lineHeight: 1.2, whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

function SummaryCard({ label, value, color, sub }) {
  return (
    <div style={{ ...s.card, borderTop: `3px solid ${color || 'var(--shell-red)'}` }}>
      <p style={s.cardLabel}>{label}</p>
      <p style={{ ...s.cardValue, color }}>{value}</p>
      {sub && <p style={s.cardSub}>{sub}</p>}
    </div>
  );
}

function DataTable({ columns, rows, emptyMsg = 'No data available.' }) {
  if (!rows.length) return <p style={{ color: 'var(--label-secondary)', fontSize: 14, padding: '16px 0' }}>{emptyMsg}</p>;
  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key} style={s.th}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={i % 2 === 0 ? {} : { background: '#FAFBFC' }}>
              {columns.map((c) => (
                <td key={c.key} style={s.td}>
                  {c.render ? c.render(row[c.field || c.key], row) : row[c.field || c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 'overview',    label: 'Overview',       permKey: 'capex.planning.dashboard' },
  { id: 'departments', label: 'Departments',    permKey: 'capex.planning.departments' },
  { id: 'gsap',        label: 'GSAP Sync',      disabled: true },
  { id: 'manual',      label: 'Manual Entries', permKey: 'capex.tracking.manual-entry' },
  { id: 'requests',    label: 'Requests',       permKey: 'capex.requests' },
  { id: 'governance',  label: 'Governance',     permKey: 'capex.governance.dashboard' },
  { id: 'admin',       label: 'Admin Config',   permKey: 'capex.admin' },
  { id: 'initiations', label: 'Initiations',    permKey: 'capex.initiations' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function CapexDashboard() {
  const { canView, canCreate, canEdit } = usePermissions();

  const TABS = ALL_TABS.filter(t => {
    if (t.permKey && !canView(t.permKey)) return false;
    return true;
  });

  const [activeTab,      setActiveTab]      = useState(() => TABS[0]?.id || 'overview');
  const [depts,          setDepts]          = useState([]);
  const [syncStatus,     setSyncStatus]     = useState(null);
  const [gsapData,       setGsapData]       = useState(null);
  const [capexRequests,  setCapexRequests]  = useState([]);
  const [selectedRequest,setSelectedRequest]= useState(null);
  const [initiations,    setInitiations]    = useState([]);
  const [manualEntries,  setManualEntries]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [selectedDept,   setSelectedDept]   = useState('');
  const [showManual,     setShowManual]      = useState(false);
  const [showRequestForm,setShowRequestForm] = useState(false);
  const [showInitForm,   setShowInitForm]    = useState(false);
  const [showBudgetUpload, setShowBudgetUpload] = useState(false);
  const [uploadToast,    setUploadToast]    = useState('');
  const [auditLogs,      setAuditLogs]      = useState([]);
  const [procurementForm,setProcurementForm]= useState({});
  const [milestoneForm,  setMilestoneForm]  = useState({ stageName: '', milestoneName: '', plannedDate: '', actualDate: '', paymentPercentage: '', paymentAmount: '', completionEvidence: '' });
  const [closureForm,    setClosureForm]    = useState({ actualSpend: '', finalRoi: '', finalSavings: '', financeComments: '', capexFormAttachment: '' });
  const [governance,     setGovernance]     = useState(null);
  const [drilldownType,  setDrilldownType]  = useState('businessUnit');
  const [drilldownRows,  setDrilldownRows]  = useState([]);
  const [processRef,     setProcessRef]     = useState(null);
  const [reportSchedules,setReportSchedules]= useState([]);
  const [adminConfig,    setAdminConfig]    = useState(null);
  const [thresholdForm,  setThresholdForm]  = useState({ lowMaxOmr: 25000, mediumMaxOmr: 300000 });
  const [attachmentType, setAttachmentType] = useState('Scope Document');
  const [aucForm,        setAucForm]        = useState({ aucAccount: '', aucValue: '', aucStartDate: '', capitalizationReady: false, status: 'Open' });
  const [capitalizationForm, setCapitalizationForm] = useState({ status: 'Not Started', financeVerified: false, capitalizationRequestDate: '', assetMasterNumber: '', assetCategory: '', capitalizedValue: '' });
  const [poClosureForm,  setPoClosureForm]  = useState({ finalInvoiceReceived: false, vendorConfirmationReceived: false, closureStatus: 'Open', openCommitmentValue: '', unutilizedCommitment: '', closureDueDate: '' });
  const [benefitForm,    setBenefitForm]    = useState({ reviewPeriodMonths: 6, plannedRoi: '', actualRoi: '', plannedSavings: '', actualSavings: '', benefitScore: '', status: 'Planned' });
  const [riskForm,       setRiskForm]       = useState({ category: 'Schedule Risk', title: '', severity: 'Amber', mitigationPlan: '', owner: '' });
  const [moaForm,        setMoaForm]        = useState({ moaNumber: '', title: '', approvalAuthority: '', approvalStatus: 'Draft', projectValue: '', expiryDate: '', renewalRequired: false });
  const [variationForm,  setVariationForm]  = useState({ variationType: 'Variation', originalBudget: '', revisedBudget: '', justification: '', financialImpactAnalysis: '', fibReviewStatus: 'Pending' });
  const [procPerfForm,   setProcPerfForm]   = useState({ rfqIssuedAt: '', tenderStartedAt: '', tenderCompletedAt: '', vendorResponseCount: '', invitedVendorCount: '', budgetEstimate: '', awardedValue: '', poProcessingDays: '', cpOwner: '' });
  const [docVersionForm, setDocVersionForm] = useState({ documentType: 'MOA', documentName: '', versionLabel: 'v1', changelog: '', retentionUntil: '' });
  const [signatureForm,  setSignatureForm]  = useState({ linkedType: 'MOA', linkedId: '', signerName: '', signerRole: '', decision: 'Signed' });
  const [scheduleForm,   setScheduleForm]   = useState({ reportName: 'Monthly CAPEX Governance Pack', reportType: 'governance', audience: 'CEO/CFO', frequency: 'Monthly', format: 'PDF', recipients: '', nextRunDate: '' });

  const overviewChartRef = useRef(null);
  const overviewChartInst = useRef(null);
  const deptChartRef = useRef(null);
  const deptChartInst = useRef(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      let allowedCalls = 0;
      let failedCalls = 0;
      const safe = (allowed, fn, fallback) => {
        if (!allowed) return Promise.resolve(fallback);
        allowedCalls += 1;
        return fn().catch(() => {
          failedCalls += 1;
          return fallback;
        });
      };
      const [
        deptResults,
        syncRes,
        gsap,
        inits,
        entries,
        gov,
        refs,
        schedules,
        drill,
        requests,
        config,
      ] = await Promise.all([
        safe(canView('capex.planning.departments'), getDepartments, []),
        safe(canView('capex.planning.dashboard'), getSyncStatus, null),
        safe(canView('capex.planning.dashboard'), getGsapData, null),
        safe(canView('capex.initiations'), getInitiations, []),
        safe(canView('capex.tracking.manual-entry'), getManualEntries, []),
        safe(canView('capex.governance.dashboard'), getCapexGovernanceDashboard, null),
        safe(canView('capex.governance.dashboard'), getCapexProcessReference, null),
        safe(canView('capex.reports'), getCapexReportSchedules, []),
        safe(canView('capex.governance.dashboard'), () => getCapexDashboardDrilldown(drilldownType), { rows: [] }),
        safe(canView('capex.requests'), getCapexRequests, []),
        safe(canView('capex.admin'), getCapexAdminConfig, null),
      ]);
      if (allowedCalls > 0 && failedCalls === allowedCalls) {
        throw new Error('All permitted CAPEX requests failed');
      }
      setDepts(deptResults);
      if (deptResults.length) setSelectedDept(prev => prev || deptResults[0].name);
      setSyncStatus(syncRes);
      setGsapData(gsap);
      setInitiations(inits);
      setManualEntries(entries);
      setGovernance(gov);
      setProcessRef(refs);
      setReportSchedules(schedules);
      setDrilldownRows(drill.rows || []);
      setCapexRequests(requests);
      if (!selectedRequest && requests.length) {
        getCapexRequest(requests[0].id).then(setSelectedRequest).catch(() => {});
      }
      if (config) {
        setAdminConfig(config);
        setThresholdForm({
          lowMaxOmr: config.thresholds.lowMaxOmr,
          mediumMaxOmr: config.thresholds.mediumMaxOmr,
        });
      }
    } catch {
      setError('Failed to load Capex data. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!selectedRequest) return;
    setProcurementForm({
      ndaRequired: !!selectedRequest.procurement?.ndaRequired,
      ndaStatus: selectedRequest.procurement?.ndaStatus || 'Not required',
      ndaCompletionDate: selectedRequest.procurement?.ndaCompletionDate || '',
      dpaRequired: !!selectedRequest.procurement?.dpaRequired,
      dpaStatus: selectedRequest.procurement?.dpaStatus || 'Not required',
      dpaCompletionDate: selectedRequest.procurement?.dpaCompletionDate || '',
      vendorRegistrationStatus: selectedRequest.procurement?.vendorRegistrationStatus || 'Pending',
      agreementStatus: selectedRequest.procurement?.agreementStatus || 'Pending',
      gsapProjectReference: selectedRequest.procurement?.gsapProjectReference || '',
      gsapProjectCreatedAt: selectedRequest.procurement?.gsapProjectCreatedAt || '',
      prNumber: selectedRequest.procurement?.prNumber || '',
      prCreatedAt: selectedRequest.procurement?.prCreatedAt || '',
      prStatus: selectedRequest.procurement?.prStatus || '',
      poNumber: selectedRequest.procurement?.poNumber || '',
      poCreatedAt: selectedRequest.procurement?.poCreatedAt || '',
      poValue: selectedRequest.procurement?.poValue || '',
      poStatus: selectedRequest.procurement?.poStatus || '',
      poAttachmentName: selectedRequest.procurement?.poAttachmentName || '',
      poReleasedAfterJobDone: !!selectedRequest.procurement?.poReleasedAfterJobDone,
    });
    setClosureForm({
      actualSpend: selectedRequest.financialClosure?.actualSpend || '',
      finalRoi: selectedRequest.financialClosure?.finalRoi || '',
      finalSavings: selectedRequest.financialClosure?.finalSavings || '',
      financeComments: selectedRequest.financialClosure?.financeComments || '',
      capexFormAttachment: selectedRequest.financialClosure?.capexFormAttachment || '',
    });
    setAucForm({
      aucAccount: selectedRequest.auc?.aucAccount || '',
      aucValue: selectedRequest.auc?.aucValue || '',
      aucStartDate: selectedRequest.auc?.aucStartDate || '',
      capitalizationReady: !!selectedRequest.auc?.capitalizationReady,
      status: selectedRequest.auc?.status || 'Open',
    });
    setCapitalizationForm({
      status: selectedRequest.capitalization?.status || 'Not Started',
      financeVerified: !!selectedRequest.capitalization?.financeVerified,
      capitalizationRequestDate: selectedRequest.capitalization?.capitalizationRequestDate || '',
      assetMasterNumber: selectedRequest.capitalization?.assetMasterNumber || '',
      assetCategory: selectedRequest.capitalization?.assetCategory || '',
      capitalizedValue: selectedRequest.capitalization?.capitalizedValue || '',
    });
    setPoClosureForm({
      finalInvoiceReceived: !!selectedRequest.poClosure?.finalInvoiceReceived,
      vendorConfirmationReceived: !!selectedRequest.poClosure?.vendorConfirmationReceived,
      closureStatus: selectedRequest.poClosure?.closureStatus || 'Open',
      openCommitmentValue: selectedRequest.poClosure?.openCommitmentValue || '',
      unutilizedCommitment: selectedRequest.poClosure?.unutilizedCommitment || '',
      closureDueDate: selectedRequest.poClosure?.closureDueDate || '',
    });
    setProcPerfForm({
      rfqIssuedAt: selectedRequest.procurementPerformance?.rfqIssuedAt || '',
      tenderStartedAt: selectedRequest.procurementPerformance?.tenderStartedAt || '',
      tenderCompletedAt: selectedRequest.procurementPerformance?.tenderCompletedAt || '',
      vendorResponseCount: selectedRequest.procurementPerformance?.vendorResponseCount || '',
      invitedVendorCount: selectedRequest.procurementPerformance?.invitedVendorCount || '',
      budgetEstimate: selectedRequest.procurementPerformance?.budgetEstimate || selectedRequest.estimatedValue || '',
      awardedValue: selectedRequest.procurementPerformance?.awardedValue || selectedRequest.procurement?.poValue || '',
      poProcessingDays: selectedRequest.procurementPerformance?.poProcessingDays || '',
      cpOwner: selectedRequest.procurementPerformance?.cpOwner || '',
    });
    setMoaForm(prev => ({
      ...prev,
      projectValue: selectedRequest.estimatedValue || '',
      title: selectedRequest.title ? `${selectedRequest.title} MOA` : '',
    }));
    setVariationForm(prev => ({
      ...prev,
      originalBudget: selectedRequest.estimatedValue || '',
      revisedBudget: selectedRequest.estimatedValue || '',
    }));
    setDocVersionForm(prev => ({ ...prev, documentName: selectedRequest.title || '' }));
    getCapexAuditLogs(selectedRequest.id).then(setAuditLogs).catch(() => setAuditLogs([]));
  }, [selectedRequest]);

  function showUploadToast(msg) {
    setUploadToast(msg);
    setTimeout(() => setUploadToast(''), 5000);
  }

  async function openCapexRequest(id) {
    const detail = await getCapexRequest(id);
    setSelectedRequest(detail);
  }

  async function refreshSelectedRequest(id = selectedRequest?.id) {
    if (!id) return;
    const [detail, requests] = await Promise.all([getCapexRequest(id), getCapexRequests()]);
    setSelectedRequest(detail);
    setCapexRequests(requests);
  }

  async function refreshGovernance(type = drilldownType) {
    const [gov, refs, schedules, drill] = await Promise.all([
      getCapexGovernanceDashboard(),
      getCapexProcessReference(),
      getCapexReportSchedules(),
      getCapexDashboardDrilldown(type),
    ]);
    setGovernance(gov);
    setProcessRef(refs);
    setReportSchedules(schedules);
    setDrilldownRows(drill.rows || []);
  }

  async function handleCreateCapexRequest(data) {
    const created = await createCapexRequest(data);
    const detail = await getCapexRequest(created.id);
    setCapexRequests((prev) => [created, ...prev]);
    setSelectedRequest(detail);
    setShowRequestForm(false);
  }

  async function handleCapexDecision(decision) {
    if (!selectedRequest) return;
    const comment = decision === 'APPROVED' ? '' : window.prompt('Comment required for this action') || '';
    if (decision !== 'APPROVED' && !comment.trim()) return;
    const updated = await decideCapexRequest(selectedRequest.id, decision, comment);
    setSelectedRequest(updated);
    const requests = await getCapexRequests();
    setCapexRequests(requests);
  }

  async function handleSaveProcurement() {
    if (!selectedRequest) return;
    await updateCapexProcurement(selectedRequest.id, procurementForm);
    await refreshSelectedRequest();
  }

  async function handleAddMilestone(e) {
    e.preventDefault();
    if (!selectedRequest || !milestoneForm.stageName || !milestoneForm.milestoneName) return;
    await createCapexMilestone(selectedRequest.id, milestoneForm);
    setMilestoneForm({ stageName: '', milestoneName: '', plannedDate: '', actualDate: '', paymentPercentage: '', paymentAmount: '', completionEvidence: '' });
    await refreshSelectedRequest();
  }

  async function handleCompleteMilestone(milestone) {
    if (!selectedRequest) return;
    await updateCapexMilestone(selectedRequest.id, milestone.id, {
      actualDate: milestone.actualDate || new Date().toISOString().slice(0, 10),
      status: 'Complete',
    });
    await refreshSelectedRequest();
  }

  async function handleSaveClosure(closeRequest = false) {
    if (!selectedRequest) return;
    await saveCapexFinancialClosure(selectedRequest.id, { ...closureForm, closeRequest });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleSaveAuc() {
    if (!selectedRequest) return;
    await updateCapexAuc(selectedRequest.id, aucForm);
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleSaveCapitalization() {
    if (!selectedRequest) return;
    await updateCapexCapitalization(selectedRequest.id, capitalizationForm);
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleSavePoClosure() {
    if (!selectedRequest) return;
    await updateCapexPoClosure(selectedRequest.id, poClosureForm);
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleChecklistStatus(item, status) {
    if (!selectedRequest) return;
    await updateCapexClosureChecklistItem(selectedRequest.id, item.id, { status });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleSaveBenefitReview() {
    if (!selectedRequest) return;
    await saveCapexBenefitReview(selectedRequest.id, benefitForm);
    setBenefitForm({ reviewPeriodMonths: 6, plannedRoi: '', actualRoi: '', plannedSavings: '', actualSavings: '', benefitScore: '', status: 'Planned' });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleCreateRisk() {
    if (!selectedRequest || !riskForm.title.trim()) return;
    await createCapexRisk(selectedRequest.id, riskForm);
    setRiskForm({ category: 'Schedule Risk', title: '', severity: 'Amber', mitigationPlan: '', owner: '' });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleCreateMoa() {
    if (!selectedRequest || !moaForm.moaNumber.trim()) return;
    await createCapexMoa(selectedRequest.id, moaForm);
    setMoaForm({ moaNumber: '', title: '', approvalAuthority: '', approvalStatus: 'Draft', projectValue: selectedRequest.estimatedValue || '', expiryDate: '', renewalRequired: false });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleCreateVariation() {
    if (!selectedRequest || !variationForm.justification.trim()) return;
    await createCapexBudgetVariation(selectedRequest.id, variationForm);
    setVariationForm({ variationType: 'Variation', originalBudget: selectedRequest.estimatedValue || '', revisedBudget: selectedRequest.estimatedValue || '', justification: '', financialImpactAnalysis: '', fibReviewStatus: 'Pending' });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleSaveProcurementPerformance() {
    if (!selectedRequest) return;
    await updateCapexProcurementPerformance(selectedRequest.id, procPerfForm);
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleDecisionGate(gate, status = 'Passed') {
    if (!selectedRequest) return;
    await updateCapexDecisionGate(selectedRequest.id, gate.gateKey, { status, reviewer: JSON.parse(localStorage.getItem('som_user') || '{}')?.fullName || 'Current user' });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleCreateDocumentVersion() {
    if (!selectedRequest || !docVersionForm.documentName.trim()) return;
    await createCapexDocumentVersion(selectedRequest.id, docVersionForm);
    setDocVersionForm({ documentType: 'MOA', documentName: selectedRequest.title || '', versionLabel: 'v1', changelog: '', retentionUntil: '' });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleCreateSignature() {
    if (!selectedRequest || !signatureForm.signerName.trim()) return;
    await createCapexSignature(selectedRequest.id, signatureForm);
    setSignatureForm({ linkedType: 'MOA', linkedId: '', signerName: '', signerRole: '', decision: 'Signed' });
    await refreshSelectedRequest();
    await refreshGovernance();
  }

  async function handleCreateReportSchedule() {
    await createCapexReportSchedule({
      ...scheduleForm,
      recipients: scheduleForm.recipients.split(',').map(v => v.trim()).filter(Boolean),
    });
    setScheduleForm({ reportName: 'Monthly CAPEX Governance Pack', reportType: 'governance', audience: 'CEO/CFO', frequency: 'Monthly', format: 'PDF', recipients: '', nextRunDate: '' });
    await refreshGovernance();
  }

  async function handleDrilldownChange(type) {
    setDrilldownType(type);
    const drill = await getCapexDashboardDrilldown(type);
    setDrilldownRows(drill.rows || []);
  }

  async function handleAttachmentUpload(e) {
    if (!selectedRequest || !e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('type', attachmentType);
    formData.append('linkedType', 'Request');
    formData.append('retentionYears', '7');
    await uploadCapexAttachment(selectedRequest.id, formData);
    e.target.value = '';
    await refreshSelectedRequest();
  }

  async function handleSaveThresholds() {
    const updated = await updateCapexThresholds(thresholdForm);
    setThresholdForm({ lowMaxOmr: updated.lowMaxOmr, mediumMaxOmr: updated.mediumMaxOmr });
    const config = await getCapexAdminConfig();
    setAdminConfig(config);
  }

  async function handleWorkflowRuleChange(rule, field, value) {
    setAdminConfig(prev => ({
      ...prev,
      workflowRules: prev.workflowRules.map(r => r.id === rule.id ? { ...r, [field]: value } : r),
    }));
  }

  async function handleSaveWorkflowRule(rule) {
    await updateCapexWorkflowRule(rule.id, rule);
    const config = await getCapexAdminConfig();
    setAdminConfig(config);
  }

  // ── Overview chart (aggregated monthly) ────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'overview') return;
    if (!depts.length || !overviewChartRef.current || !depts[0]?.monthlyData?.length) return;

    const months   = depts[0].monthlyData.map((m) => m.month);
    const budgeted = months.map((_, i) => depts.reduce((s, d) => s + d.monthlyData[i].budgeted, 0));
    const actual   = months.map((_, i) => depts.reduce((s, d) => s + d.monthlyData[i].actual, 0));

    if (overviewChartInst.current) overviewChartInst.current.destroy();

    overviewChartInst.current = new Chart(overviewChartRef.current, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Budgeted', data: budgeted, backgroundColor: 'rgba(255,213,0,0.75)', borderRadius: 4 },
          { label: 'Actual',   data: actual,   backgroundColor: 'rgba(221,29,33,0.80)',  borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtOMR(ctx.parsed.y)}` } },
        },
        scales: { y: { ticks: { callback: (v) => fmtOMR(v) } } },
      },
    });

    return () => { overviewChartInst.current?.destroy(); };
  }, [depts, activeTab]);

  // ── Department chart ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'departments') return;
    const dept = depts.find((d) => d.name === selectedDept);
    if (!dept || !deptChartRef.current || !dept.monthlyData?.length) return;

    if (deptChartInst.current) deptChartInst.current.destroy();

    deptChartInst.current = new Chart(deptChartRef.current, {
      type: 'bar',
      data: {
        labels: dept.monthlyData.map((m) => m.month),
        datasets: [
          { label: 'Budgeted', data: dept.monthlyData.map((m) => m.budgeted), backgroundColor: 'rgba(255,213,0,0.75)', borderRadius: 4 },
          { label: 'Actual',   data: dept.monthlyData.map((m) => m.actual),   backgroundColor: 'rgba(221,29,33,0.80)',  borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtOMR(ctx.parsed.y)}` } },
        },
        scales: { y: { ticks: { callback: (v) => fmtOMR(v) } } },
      },
    });

    return () => { deptChartInst.current?.destroy(); };
  }, [depts, selectedDept, activeTab]);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalBudget    = depts.reduce((s, d) => s + d.totalBudget, 0);
  const totalActual    = depts.reduce((s, d) => s + d.actual, 0);
  const totalCommitted = depts.reduce((s, d) => s + d.committed, 0);
  const totalRemaining = depts.reduce((s, d) => s + d.remaining, 0);
  const overallPct     = totalBudget ? Math.round(((totalActual + totalCommitted) / totalBudget) * 100) : 0;

  const lastSynced = syncStatus
    ? new Date(syncStatus.lastSynced).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  // ── States ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.center} data-testid="loading-spinner">
      <div style={s.spinner} />
      <p style={{ color: 'var(--label-secondary)', marginTop: 12 }}>Loading Capex data…</p>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={s.errorBox}>{error}</div>
      <button onClick={fetchAll} style={s.retryBtn}>Retry</button>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.experience}>
      {showBudgetUpload && (
        <CapexBudgetUploadModal
          onClose={() => setShowBudgetUpload(false)}
          onSuccess={(result) => {
            setShowBudgetUpload(false);
            showUploadToast(`${result.message}`);
            fetchAll(); // reload charts + meters with new budget data
          }}
        />
      )}
      {/* Upload success toast */}
      {uploadToast && (
        <div style={{ fontSize: 13, color: '#34d399', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10, padding: '11px 16px', marginBottom: 16 }}>
          ✓ {uploadToast}
        </div>
      )}

      {/* Page header */}
      <div style={s.pageHeader}>
        <div>
          <div style={s.brandRow}>
            <span style={s.brandMark}>SOM</span>
            <span style={s.brandText}>Shell Oman Marketing</span>
          </div>
          <h1 style={s.heading}>CAPEX Control Center</h1>
          <p style={s.subheading}>FY 2026 portfolio control, approval routing, procurement tracking, and closure assurance.</p>
        </div>
        <div style={s.headerRight}>
          <div style={s.syncBadge}>
            <span style={{ ...s.syncDot, background: syncStatus?.status === 'success' ? '#22c55e' : '#ef4444' }} />
            GSAP Synced · {lastSynced}
          </div>
          <button style={s.refreshBtn} onClick={fetchAll}>Refresh</button>
        </div>
      </div>

      <div style={s.commandBar}>
        <div style={s.commandItem}>
          <span style={s.commandLabel}>Portfolio Health</span>
          <strong style={s.commandValue}>{overallPct}% utilization</strong>
        </div>
        <div style={s.commandItem}>
          <span style={s.commandLabel}>Active Requests</span>
          <strong style={s.commandValue}>{capexRequests.length}</strong>
        </div>
        <div style={s.commandItem}>
          <span style={s.commandLabel}>Governance Alerts</span>
          <strong style={s.commandValue}>{governance?.generatedAlerts?.length || 0}</strong>
        </div>
        <div style={s.commandItem}>
          <span style={s.commandLabel}>Open AUC</span>
          <strong style={s.commandValue}>{fmtOMR(governance?.auc?.totalValue || 0)}</strong>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={s.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            style={{
              ...s.tabBtn,
              ...(activeTab === t.id ? s.tabBtnActive : {}),
              ...(t.disabled ? s.tabBtnDisabled : {}),
            }}
            onClick={() => !t.disabled && setActiveTab(t.id)}
            title={t.disabled ? 'Unavailable — SAP undergoing maintenance' : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div>
          {/* Summary Cards */}
          <div style={s.cardRow}>
            {canView('capex.planning.dashboard.total_budget') && (
              <SummaryCard label="Total Authorised Budget" value={fmtOMR(totalBudget)} color="var(--shell-navy)" />
            )}
            {canView('capex.planning.dashboard.actual') && (
              <SummaryCard label="Actual Spend YTD" value={fmtOMR(totalActual)} color="var(--shell-red)"
                sub={`${Math.round((totalActual / totalBudget) * 100)}% of budget`} />
            )}
            {canView('capex.planning.dashboard.committed') && (
              <SummaryCard label="PO Commitments" value={fmtOMR(totalCommitted)} color="#BA7517" />
            )}
            {canView('capex.planning.dashboard.remaining') && (
              <SummaryCard label="Remaining Balance" value={fmtOMR(totalRemaining)} color="#2e7d32" />
            )}
          </div>

          {/* Running Capex Meter */}
          {canView('capex.planning.dashboard.percent_used') && <div style={s.section}>
            <div style={s.sectionHead}>
              <h2 style={s.sectionTitle}>Running Capex Meter</h2>
              <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
                Total consumption: <strong style={{ color: meterColor(overallPct) }}>{overallPct}%</strong>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {depts.map((dept) => (
                <div key={dept.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>{dept.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
                      {fmtOMR(dept.actual)} actual + {fmtOMR(dept.committed)} committed / {fmtOMR(dept.totalBudget)}
                    </span>
                  </div>
                  <div style={s.meterTrack}>
                    <div
                      data-testid={`meter-bar-${dept.name}`}
                      style={{
                        ...s.meterFill,
                        width: `${Math.min(dept.percentUsed, 100)}%`,
                        backgroundColor: meterColor(dept.percentUsed),
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meterColor(dept.percentUsed) }}>
                      {dept.percentUsed}% used
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>}

          {/* Monthly Budget vs Actual Chart */}
          {canView('capex.planning.dashboard.monthly_chart') && (
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Budget vs Actual by Month — All Departments</h2>
              <div style={s.chartWrap}>
                <canvas ref={overviewChartRef} />
              </div>
            </div>
          )}

          {/* GSAP info bar */}
          <div style={s.infoBar}>
            <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
              Data source: <strong>GSAP (read-only)</strong> &nbsp;|&nbsp; Last synced: <strong>{lastSynced}</strong>
              &nbsp;|&nbsp; Manual fallback entries are posted to the Manual Entries tab
            </span>
          </div>
        </div>
      )}

      {/* ── TAB: Departments ──────────────────────────────────────────────── */}
      {activeTab === 'departments' && (
        <div>
          {/* Department selector */}
          <div style={{ ...s.section, paddingBottom: 0 }}>
            <h2 style={s.sectionTitle}>Department Dashboard</h2>
            <div style={s.deptTabs}>
              {depts.map((d) => (
                <button
                  key={d.name}
                  style={{ ...s.deptTab, ...(selectedDept === d.name ? s.deptTabActive : {}) }}
                  onClick={() => setSelectedDept(d.name)}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {depts.filter((d) => d.name === selectedDept).map((dept) => (
            <div key={dept.name}>
              {/* Dept summary cards */}
              <div style={s.cardRow}>
                {canView('capex.planning.departments.total_budget') && (
                  <SummaryCard label="Authorised Budget" value={fmtOMR(dept.totalBudget)} color="var(--shell-navy)" />
                )}
                {canView('capex.planning.departments.actual') && (
                  <SummaryCard label="Actual Spend" value={fmtOMR(dept.actual)} color="var(--shell-red)"
                    sub={`${dept.percentUsed}% consumed`} />
                )}
                {canView('capex.planning.departments.committed') && (
                  <SummaryCard label="PO Committed" value={fmtOMR(dept.committed)} color="#BA7517" />
                )}
                {canView('capex.planning.departments.remaining') && (
                  <SummaryCard label="Remaining" value={fmtOMR(dept.remaining)} color="#2e7d32" />
                )}
              </div>

              {/* Dept meter */}
              {canView('capex.planning.departments.percent_used') && (
                <div style={s.section}>
                  <div style={s.sectionHead}>
                    <h2 style={s.sectionTitle}>{dept.name} — Budget Consumption</h2>
                    <span style={{ fontSize: 13, color: meterColor(dept.percentUsed), fontWeight: 700 }}>
                      {dept.percentUsed}%
                    </span>
                  </div>
                  <div style={s.meterTrack}>
                    <div
                      data-testid={`meter-bar-${dept.name}`}
                      style={{
                        ...s.meterFill,
                        width: `${Math.min(dept.percentUsed, 100)}%`,
                        backgroundColor: meterColor(dept.percentUsed),
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
                      {fmtOMR(dept.actual + dept.committed)} consumed &amp; committed
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
                      {fmtOMR(dept.remaining)} remaining
                    </span>
                  </div>
                </div>
              )}

              {/* Dept monthly chart */}
              {canView('capex.planning.departments.monthly_chart') && (
                <div style={s.section}>
                  <h2 style={s.sectionTitle}>{dept.name} — Monthly Budget vs Actual</h2>
                  <div style={s.chartWrap}>
                    <canvas ref={deptChartRef} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: GSAP Sync ───────────────────────────────────────────────── */}
      {activeTab === 'gsap' && gsapData && (
        <div>
          {/* Sync status banner */}
          <div style={{ ...s.section, padding: '16px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: gsapData.status === 'success' ? '#22c55e' : '#ef4444',
                flexShrink: 0,
              }} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>
                  GSAP Integration — One-way Read
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--label-secondary)' }}>
                  Source: <strong>{gsapData.source}</strong> &nbsp;|&nbsp;
                  Last sync: <strong>{new Date(gsapData.lastSynced).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</strong>
                  &nbsp;|&nbsp; Status: <StatusBadge status={gsapData.status} />
                </p>
              </div>
            </div>
          </div>

          {/* Approved Budgets */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Approved Budgets (WBS)</h2>
            <DataTable
              columns={[
                { key: 'wbsCode',      label: 'WBS Code' },
                { key: 'department',   label: 'Department' },
                { key: 'description',  label: 'Description' },
                { key: 'approvedAmount', label: 'Approved (OMR)', render: (v) => fmtOMR(v) },
                { key: 'postedAmount', label: 'Posted (OMR)', render: (v) => fmtOMR(v) },
                { key: 'variance',     label: 'Remaining (OMR)',
                  render: (_, row) => {
                    const rem = row.approvedAmount - row.postedAmount;
                    return <span style={{ color: rem < 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>{fmtOMR(rem)}</span>;
                  }
                },
              ]}
              rows={gsapData.approvedBudgets}
            />
          </div>

          {/* PO Commitments */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>PO Commitments</h2>
            <DataTable
              columns={[
                { key: 'poNumber',    label: 'PO Number' },
                { key: 'vendor',      label: 'Vendor' },
                { key: 'wbsCode',     label: 'WBS Code' },
                { key: 'description', label: 'Description' },
                { key: 'amount',      label: 'Amount (OMR)', render: (v) => fmtOMR(v) },
                { key: 'dueDate',     label: 'Due Date' },
                { key: 'status',      label: 'Status', render: (v) => <StatusBadge status={v} /> },
              ]}
              rows={gsapData.poCommitments}
            />
          </div>

          {/* GR/IR Actuals */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>GR/IR Actuals</h2>
            <DataTable
              columns={[
                { key: 'grNumber',     label: 'GR Number' },
                { key: 'poNumber',     label: 'PO Reference' },
                { key: 'wbsCode',      label: 'WBS Code' },
                { key: 'description',  label: 'Description' },
                { key: 'amount',       label: 'Amount (OMR)', render: (v) => fmtOMR(v) },
                { key: 'postingDate',  label: 'Posting Date' },
              ]}
              rows={gsapData.grirActuals}
            />
          </div>
        </div>
      )}

      {/* ── TAB: Manual Entries ──────────────────────────────────────────── */}
      {activeTab === 'manual' && (
        <div>
          <div style={s.tabActionRow}>
            <div>
              <h2 style={s.sectionTitle}>Manual Entry Fallback</h2>
              <p style={s.tabSubtitle}>Post budget adjustments, actuals, or PO commitments for non-GSAP items with a standardised structure.</p>
            </div>
            {canCreate('capex.tracking.manual-entry') && (
              <button style={s.primaryBtn} onClick={() => setShowManual(true)}>+ Add Entry</button>
            )}
          </div>

          <div style={s.section}>
            <DataTable
              columns={[
                { key: 'id',              label: 'Entry ID' },
                canView('capex.tracking.manual-entry.entry_type') && { key: 'entryTypeStatus', field: 'entryType', label: 'Type', render: (v) => <StatusBadge status={v === 'Actual' ? 'Posted' : v === 'PO Commitment' ? 'Open' : 'Under Review'} /> },
                canView('capex.tracking.manual-entry.entry_type') && { key: 'entryType', label: 'Entry Type' },
                canView('capex.tracking.manual-entry.department')       && { key: 'department',      label: 'Department' },
                canView('capex.tracking.manual-entry.period')           && { key: 'period',          label: 'Period' },
                canView('capex.tracking.manual-entry.amount')           && { key: 'amount',          label: 'Amount (OMR)', render: (v) => <strong>{fmtOMR(v)}</strong> },
                canView('capex.tracking.manual-entry.reference_number') && { key: 'referenceNumber', label: 'Reference' },
                canView('capex.tracking.manual-entry.entered_by')       && { key: 'enteredBy',       label: 'Entered By' },
                canView('capex.tracking.manual-entry.status')           && { key: 'status',          label: 'Status', render: (v) => <StatusBadge status={v} /> },
              ].filter(Boolean).filter((c, i, arr) => arr.findIndex((x) => x.key === c.key && x.label === c.label) === i)}
              rows={manualEntries}
              emptyMsg="No manual entries yet. Use 'Add Entry' to post a non-GSAP transaction."
            />
          </div>
        </div>
      )}

      {/* ── TAB: Initiations ─────────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div>
          <div style={s.tabActionRow}>
            <div>
              <h2 style={s.sectionTitle}>CAPEX Requests</h2>
              <p style={s.tabSubtitle}>Governance workflow for quotations, HSSE risk, approvals, and procurement handover.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              {canView('capex.reports') && (
                <a href={getCapexReportCsvUrl()} style={{ ...s.secondaryBtn, textDecoration: 'none' }}>Export CSV</a>
              )}
              {canCreate('capex.requests') && (
                <button style={s.primaryBtn} onClick={() => setShowRequestForm(true)}>+ New CAPEX Request</button>
              )}
            </div>
          </div>

          {showRequestForm && (
            <CapexRequestForm
              onSubmit={handleCreateCapexRequest}
              onCancel={() => setShowRequestForm(false)}
            />
          )}

          <div style={s.requestWorkspace}>
            <div style={s.section}>
              <DataTable
                columns={[
                  { key: 'id', label: 'Request' },
                  { key: 'title', label: 'Title',
                    render: (v, row) => (
                      <button style={s.linkBtn} onClick={() => openCapexRequest(row.id)}>{v}</button>
                    )
                  },
                  { key: 'department', label: 'Department' },
                  { key: 'estimatedValue', label: 'Value', render: (v) => fmtOMR(v) },
                  { key: 'valueBand', label: 'Band', render: (v) => <StatusBadge status={v === 'LOW' ? 'Low' : v === 'MEDIUM' ? 'Medium' : 'High'} /> },
                  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
                ]}
                rows={capexRequests}
                emptyMsg="No CAPEX requests yet. Create the first request to start workflow routing."
              />
            </div>

            <div style={{ ...s.section, ...s.requestDetailPanel }}>
              {!selectedRequest ? (
                <p style={{ color: 'var(--label-secondary)', fontSize: 14 }}>Select a request to view workflow details.</p>
              ) : (
                <div>
                  <div style={s.requestHero}>
                    <div>
                      <span style={s.detailEyebrow}>Selected Request</span>
                      <h3 style={s.requestTitle}>{selectedRequest.title}</h3>
                      <p style={s.requestMeta}>
                        {selectedRequest.id} - {selectedRequest.department} - {fmtOMR(selectedRequest.estimatedValue)}
                      </p>
                    </div>
                    <StatusBadge status={selectedRequest.status} />
                  </div>

                  <div style={s.workflowRibbon}>
                    {(selectedRequest.approvalSteps || []).slice(0, 5).map((step) => (
                      <div key={step.id} style={s.workflowStep}>
                        <span style={s.workflowOrder}>{step.stepOrder}</span>
                        <span style={s.workflowLabel}>{step.label}</span>
                        <StatusBadge status={step.status} />
                      </div>
                    ))}
                  </div>

                  <div style={s.detailStats}>
                    <MiniInfo label="Value Band" value={selectedRequest.valueBand} />
                    <MiniInfo label="Quotes" value={`${selectedRequest.quotations?.length || 0} / 3`} />
                    <MiniInfo label="HSSE Risk" value={selectedRequest.hsseRisk} />
                    <MiniInfo label="Worker Welfare" value={selectedRequest.workerWelfareRisk} />
                  </div>

                  <h4 style={s.detailTitle}>Scope</h4>
                  <p style={s.detailText}>{selectedRequest.scopeDetails}</p>

                  {selectedRequest.fewerThan3Justification && (
                    <>
                      <h4 style={s.detailTitle}>Fewer than 3 Quotations Justification</h4>
                      <p style={s.detailText}>{selectedRequest.fewerThan3Justification}</p>
                    </>
                  )}

                  <h4 style={s.detailTitle}>Supplier Quotations</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {(selectedRequest.quotations || []).map((q) => (
                      <div key={q.id} style={s.compactRow}>
                        <span style={{ fontWeight: q.isSelected ? 700 : 500 }}>{q.supplierName}{q.isSelected ? ' (selected)' : ''}</span>
                        <span>{fmtOMR(q.quoteValue)}</span>
                      </div>
                    ))}
                  </div>

                  <h4 style={s.detailTitle}>Attachments</h4>
                  <div style={s.lifecycleGrid}>
                    <select style={s.compactInput} value={attachmentType} onChange={e => setAttachmentType(e.target.value)}>
                      {['Scope Document', 'Supplier Quotation', 'HSSE Evidence', 'PO Document', 'Milestone Evidence', 'CAPEX Closure Form'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    {canCreate('capex.documents') && (
                      <input style={s.compactInput} type="file" onChange={handleAttachmentUpload} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {(selectedRequest.attachments || []).map((a) => (
                      <div key={a.id} style={s.compactRow}>
                        <span>{a.type}: {a.name}</span>
                        <button style={s.linkBtn} onClick={() => downloadCapexAttachment(selectedRequest.id, a)}>Download</button>
                      </div>
                    ))}
                    {!(selectedRequest.attachments || []).length && <p style={s.detailText}>No documents uploaded yet.</p>}
                  </div>

                  <h4 style={s.detailTitle}>Approval Workflow</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selectedRequest.approvalSteps || []).map((step) => (
                      <div key={step.id} style={s.compactRow}>
                        <span>{step.stepOrder}. {step.label}</span>
                        <StatusBadge status={step.status} />
                      </div>
                    ))}
                  </div>

                  {canEdit('capex.approvals') &&
                   selectedRequest.status !== 'Approved for Procurement' &&
                   selectedRequest.status !== 'Rejected' &&
                   selectedRequest.status !== 'Returned for Correction' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                      <button style={s.primaryBtn} onClick={() => handleCapexDecision('APPROVED')}>Approve Step</button>
                      <button style={s.warnBtn} onClick={() => handleCapexDecision('RETURNED')}>Return</button>
                      <button style={s.dangerBtn} onClick={() => handleCapexDecision('REJECTED')}>Reject</button>
                    </div>
                  )}

                  <h4 style={s.detailTitle}>Procurement Tracking</h4>
                  <div style={s.lifecycleGrid}>
                    <label style={s.check}><input type="checkbox" checked={!!procurementForm.ndaRequired} onChange={e => setProcurementForm(p => ({ ...p, ndaRequired: e.target.checked, ndaStatus: e.target.checked ? 'Pending' : 'Not required' }))} /> NDA required</label>
                    <select style={s.compactInput} value={procurementForm.ndaStatus || 'Not required'} onChange={e => setProcurementForm(p => ({ ...p, ndaStatus: e.target.value }))}>
                      {['Not required', 'Pending', 'Completed'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <label style={s.check}><input type="checkbox" checked={!!procurementForm.dpaRequired} onChange={e => setProcurementForm(p => ({ ...p, dpaRequired: e.target.checked, dpaStatus: e.target.checked ? 'Pending' : 'Not required' }))} /> DPA required</label>
                    <select style={s.compactInput} value={procurementForm.dpaStatus || 'Not required'} onChange={e => setProcurementForm(p => ({ ...p, dpaStatus: e.target.value }))}>
                      {['Not required', 'Pending', 'Completed'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <select style={s.compactInput} value={procurementForm.vendorRegistrationStatus || 'Pending'} onChange={e => setProcurementForm(p => ({ ...p, vendorRegistrationStatus: e.target.value }))}>
                      {['Not required', 'Pending', 'Completed'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <select style={s.compactInput} value={procurementForm.agreementStatus || 'Pending'} onChange={e => setProcurementForm(p => ({ ...p, agreementStatus: e.target.value }))}>
                      {['Not required', 'Pending', 'Completed'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <input style={s.compactInput} placeholder="GSAP project reference" value={procurementForm.gsapProjectReference || ''} onChange={e => setProcurementForm(p => ({ ...p, gsapProjectReference: e.target.value }))} />
                    <input style={s.compactInput} placeholder="PR number" value={procurementForm.prNumber || ''} onChange={e => setProcurementForm(p => ({ ...p, prNumber: e.target.value }))} />
                    <input style={s.compactInput} placeholder="PO number" value={procurementForm.poNumber || ''} onChange={e => setProcurementForm(p => ({ ...p, poNumber: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="PO value" value={procurementForm.poValue || ''} onChange={e => setProcurementForm(p => ({ ...p, poValue: e.target.value }))} />
                    <input style={s.compactInput} placeholder="PO attachment filename" value={procurementForm.poAttachmentName || ''} onChange={e => setProcurementForm(p => ({ ...p, poAttachmentName: e.target.value }))} />
                    <select style={s.compactInput} value={procurementForm.poStatus || ''} onChange={e => setProcurementForm(p => ({ ...p, poStatus: e.target.value }))}>
                      {['', 'Draft', 'Created', 'Released', 'Uploaded'].map(v => <option key={v}>{v || 'PO status'}</option>)}
                    </select>
                  </div>
                  {canEdit('capex.procurement') && (
                    <button style={{ ...s.primaryBtn, marginTop: 10 }} onClick={handleSaveProcurement}>Save Procurement</button>
                  )}

                  <h4 style={s.detailTitle}>Project Execution</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(selectedRequest.milestones || []).map((m) => (
                      <div key={m.id} style={s.compactRow}>
                        <span>{m.stageName} - {m.milestoneName}</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <StatusBadge status={m.status} />
                          {canEdit('capex.requests') && m.status !== 'Complete' && <button style={s.miniBtn} onClick={() => handleCompleteMilestone(m)}>Complete</button>}
                        </span>
                      </div>
                    ))}
                  </div>
                  {canEdit('capex.requests') && <form onSubmit={handleAddMilestone} style={s.lifecycleGrid}>
                    <input style={s.compactInput} placeholder="Stage" value={milestoneForm.stageName} onChange={e => setMilestoneForm(p => ({ ...p, stageName: e.target.value }))} />
                    <input style={s.compactInput} placeholder="Milestone" value={milestoneForm.milestoneName} onChange={e => setMilestoneForm(p => ({ ...p, milestoneName: e.target.value }))} />
                    <input style={s.compactInput} type="date" value={milestoneForm.plannedDate} onChange={e => setMilestoneForm(p => ({ ...p, plannedDate: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Payment %" value={milestoneForm.paymentPercentage} onChange={e => setMilestoneForm(p => ({ ...p, paymentPercentage: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Payment amount" value={milestoneForm.paymentAmount} onChange={e => setMilestoneForm(p => ({ ...p, paymentAmount: e.target.value }))} />
                    <input style={s.compactInput} placeholder="Evidence filename" value={milestoneForm.completionEvidence} onChange={e => setMilestoneForm(p => ({ ...p, completionEvidence: e.target.value }))} />
                    <button style={s.primaryBtn} type="submit">Add Milestone</button>
                  </form>}

                  <h4 style={s.detailTitle}>Financial Closure</h4>
                  <div style={s.lifecycleGrid}>
                    <input style={s.compactInput} type="number" placeholder="Actual spend" value={closureForm.actualSpend} onChange={e => setClosureForm(p => ({ ...p, actualSpend: e.target.value }))} />
                    <input style={s.compactInput} placeholder="Final ROI" value={closureForm.finalRoi} onChange={e => setClosureForm(p => ({ ...p, finalRoi: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Final savings" value={closureForm.finalSavings} onChange={e => setClosureForm(p => ({ ...p, finalSavings: e.target.value }))} />
                    <input style={s.compactInput} placeholder="CAPEX closure form" value={closureForm.capexFormAttachment} onChange={e => setClosureForm(p => ({ ...p, capexFormAttachment: e.target.value }))} />
                    <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Finance comments" value={closureForm.financeComments} onChange={e => setClosureForm(p => ({ ...p, financeComments: e.target.value }))} />
                  </div>
                  {canEdit('capex.finance') && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button style={s.warnBtn} onClick={() => handleSaveClosure(false)}>Save Closure Draft</button>
                      <button style={s.primaryBtn} onClick={() => handleSaveClosure(true)}>Close Request</button>
                    </div>
                  )}

                  <h4 style={s.detailTitle}>AUC, Capitalization & PO Closure</h4>
                  <div style={s.lifecycleGrid}>
                    <input style={s.compactInput} placeholder="AUC account" value={aucForm.aucAccount} onChange={e => setAucForm(p => ({ ...p, aucAccount: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="AUC value" value={aucForm.aucValue} onChange={e => setAucForm(p => ({ ...p, aucValue: e.target.value }))} />
                    <input style={s.compactInput} type="date" value={aucForm.aucStartDate} onChange={e => setAucForm(p => ({ ...p, aucStartDate: e.target.value }))} />
                    <select style={s.compactInput} value={aucForm.status} onChange={e => setAucForm(p => ({ ...p, status: e.target.value }))}>
                      {['Open', 'In Review', 'Capitalized'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <label style={s.check}><input type="checkbox" checked={aucForm.capitalizationReady} onChange={e => setAucForm(p => ({ ...p, capitalizationReady: e.target.checked }))} /> Capitalization ready</label>
                    {canEdit('capex.finance') && <button style={s.primaryBtn} onClick={handleSaveAuc}>Save AUC</button>}
                  </div>

                  <div style={s.lifecycleGrid}>
                    <select style={s.compactInput} value={capitalizationForm.status} onChange={e => setCapitalizationForm(p => ({ ...p, status: e.target.value }))}>
                      {['Not Started', 'Ready', 'Pending Approval', 'In Progress', 'Capitalized'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <input style={s.compactInput} placeholder="Asset master number" value={capitalizationForm.assetMasterNumber} onChange={e => setCapitalizationForm(p => ({ ...p, assetMasterNumber: e.target.value }))} />
                    <input style={s.compactInput} placeholder="Asset category" value={capitalizationForm.assetCategory} onChange={e => setCapitalizationForm(p => ({ ...p, assetCategory: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Capitalized value" value={capitalizationForm.capitalizedValue} onChange={e => setCapitalizationForm(p => ({ ...p, capitalizedValue: e.target.value }))} />
                    <input style={s.compactInput} type="date" value={capitalizationForm.capitalizationRequestDate} onChange={e => setCapitalizationForm(p => ({ ...p, capitalizationRequestDate: e.target.value }))} />
                    {canEdit('capex.finance') && <button style={s.primaryBtn} onClick={handleSaveCapitalization}>Save Capitalization</button>}
                  </div>

                  <div style={s.lifecycleGrid}>
                    <select style={s.compactInput} value={poClosureForm.closureStatus} onChange={e => setPoClosureForm(p => ({ ...p, closureStatus: e.target.value }))}>
                      {['Open', 'In Progress', 'Closed'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <input style={s.compactInput} type="number" placeholder="Open commitment" value={poClosureForm.openCommitmentValue} onChange={e => setPoClosureForm(p => ({ ...p, openCommitmentValue: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Unutilized commitment" value={poClosureForm.unutilizedCommitment} onChange={e => setPoClosureForm(p => ({ ...p, unutilizedCommitment: e.target.value }))} />
                    <input style={s.compactInput} type="date" value={poClosureForm.closureDueDate} onChange={e => setPoClosureForm(p => ({ ...p, closureDueDate: e.target.value }))} />
                    <label style={s.check}><input type="checkbox" checked={poClosureForm.finalInvoiceReceived} onChange={e => setPoClosureForm(p => ({ ...p, finalInvoiceReceived: e.target.checked }))} /> Final invoice</label>
                    {canEdit('capex.closure') && <button style={s.primaryBtn} onClick={handleSavePoClosure}>Save PO Closure</button>}
                  </div>

                  <h4 style={s.detailTitle}>Closure Checklist</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(selectedRequest.closureChecklist || []).map(item => (
                      <div key={item.id} style={s.compactRow}>
                        <span>{item.label}</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <StatusBadge status={item.status} />
                          {canEdit('capex.closure') && item.status !== 'Completed' && <button style={s.miniBtn} onClick={() => handleChecklistStatus(item, 'Completed')}>Done</button>}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h4 style={s.detailTitle}>MOA, Variation & Decision Gates</h4>
                  <div style={s.lifecycleGrid}>
                    <input style={s.compactInput} placeholder="MOA number" value={moaForm.moaNumber} onChange={e => setMoaForm(p => ({ ...p, moaNumber: e.target.value }))} />
                    <input style={s.compactInput} placeholder="MOA title" value={moaForm.title} onChange={e => setMoaForm(p => ({ ...p, title: e.target.value }))} />
                    <input style={s.compactInput} placeholder="Authority" value={moaForm.approvalAuthority} onChange={e => setMoaForm(p => ({ ...p, approvalAuthority: e.target.value }))} />
                    <select style={s.compactInput} value={moaForm.approvalStatus} onChange={e => setMoaForm(p => ({ ...p, approvalStatus: e.target.value }))}>
                      {['Draft', 'Pending', 'Approved', 'Active'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <input style={s.compactInput} type="date" value={moaForm.expiryDate} onChange={e => setMoaForm(p => ({ ...p, expiryDate: e.target.value }))} />
                    {canCreate('capex.moa') && <button style={s.primaryBtn} onClick={handleCreateMoa}>Save MOA</button>}
                  </div>
                  <DataTable
                    columns={[
                      { key: 'moaNumber', label: 'MOA' },
                      { key: 'approvalStatus', label: 'Status', render: v => <StatusBadge status={v} /> },
                      { key: 'matrixValidated', label: 'Matrix', render: v => v ? 'Valid' : 'Review' },
                    ]}
                    rows={selectedRequest.moaRecords || []}
                    emptyMsg="No MOA records."
                  />

                  <div style={s.lifecycleGrid}>
                    <input style={s.compactInput} type="number" placeholder="Original budget" value={variationForm.originalBudget} onChange={e => setVariationForm(p => ({ ...p, originalBudget: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Revised budget" value={variationForm.revisedBudget} onChange={e => setVariationForm(p => ({ ...p, revisedBudget: e.target.value }))} />
                    <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Variation justification" value={variationForm.justification} onChange={e => setVariationForm(p => ({ ...p, justification: e.target.value }))} />
                    <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Financial impact analysis" value={variationForm.financialImpactAnalysis} onChange={e => setVariationForm(p => ({ ...p, financialImpactAnalysis: e.target.value }))} />
                    {canCreate('capex.variations') && <button style={s.primaryBtn} onClick={handleCreateVariation}>Create Variation</button>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(selectedRequest.decisionGates || []).map(gate => (
                      <div key={gate.gateKey} style={s.compactRow}>
                        <span>{gate.gateName}</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <StatusBadge status={gate.status} />
                          {canEdit('capex.approvals') && gate.status !== 'Passed' && <button style={s.miniBtn} onClick={() => handleDecisionGate(gate)}>Pass</button>}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h4 style={s.detailTitle}>Procurement Performance, Benefits & Risk</h4>
                  <div style={s.lifecycleGrid}>
                    <input style={s.compactInput} type="date" value={procPerfForm.rfqIssuedAt} onChange={e => setProcPerfForm(p => ({ ...p, rfqIssuedAt: e.target.value }))} />
                    <input style={s.compactInput} type="date" value={procPerfForm.tenderCompletedAt} onChange={e => setProcPerfForm(p => ({ ...p, tenderCompletedAt: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Vendor responses" value={procPerfForm.vendorResponseCount} onChange={e => setProcPerfForm(p => ({ ...p, vendorResponseCount: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Invited vendors" value={procPerfForm.invitedVendorCount} onChange={e => setProcPerfForm(p => ({ ...p, invitedVendorCount: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Budget estimate" value={procPerfForm.budgetEstimate} onChange={e => setProcPerfForm(p => ({ ...p, budgetEstimate: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Awarded value" value={procPerfForm.awardedValue} onChange={e => setProcPerfForm(p => ({ ...p, awardedValue: e.target.value }))} />
                    {canEdit('capex.procurement') && <button style={s.primaryBtn} onClick={handleSaveProcurementPerformance}>Save Procurement KPIs</button>}
                  </div>

                  <div style={s.lifecycleGrid}>
                    <select style={s.compactInput} value={benefitForm.reviewPeriodMonths} onChange={e => setBenefitForm(p => ({ ...p, reviewPeriodMonths: Number(e.target.value) }))}>
                      {[6, 12, 24].map(v => <option key={v} value={v}>{v} months</option>)}
                    </select>
                    <input style={s.compactInput} type="number" placeholder="Actual ROI %" value={benefitForm.actualRoi} onChange={e => setBenefitForm(p => ({ ...p, actualRoi: e.target.value }))} />
                    <input style={s.compactInput} type="number" placeholder="Actual savings" value={benefitForm.actualSavings} onChange={e => setBenefitForm(p => ({ ...p, actualSavings: e.target.value }))} />
                    <select style={s.compactInput} value={benefitForm.status} onChange={e => setBenefitForm(p => ({ ...p, status: e.target.value }))}>
                      {['Planned', 'In Review', 'Completed'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    {canEdit('capex.finance') && <button style={s.primaryBtn} onClick={handleSaveBenefitReview}>Save Benefit Review</button>}
                  </div>

                  <div style={s.lifecycleGrid}>
                    <select style={s.compactInput} value={riskForm.category} onChange={e => setRiskForm(p => ({ ...p, category: e.target.value }))}>
                      {['Budget Risk', 'Schedule Risk', 'Vendor Risk', 'HSE Risk', 'Capitalization Risk', 'Operational Risk'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <select style={s.compactInput} value={riskForm.severity} onChange={e => setRiskForm(p => ({ ...p, severity: e.target.value }))}>
                      {['Green', 'Amber', 'Red'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Risk title" value={riskForm.title} onChange={e => setRiskForm(p => ({ ...p, title: e.target.value }))} />
                    <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Mitigation plan" value={riskForm.mitigationPlan} onChange={e => setRiskForm(p => ({ ...p, mitigationPlan: e.target.value }))} />
                    {canCreate('capex.risks') && <button style={s.primaryBtn} onClick={handleCreateRisk}>Add Risk</button>}
                  </div>

                  <h4 style={s.detailTitle}>Document Versioning & Signatures</h4>
                  <div style={s.lifecycleGrid}>
                    <input style={s.compactInput} placeholder="Document name" value={docVersionForm.documentName} onChange={e => setDocVersionForm(p => ({ ...p, documentName: e.target.value }))} />
                    <input style={s.compactInput} placeholder="Version" value={docVersionForm.versionLabel} onChange={e => setDocVersionForm(p => ({ ...p, versionLabel: e.target.value }))} />
                    <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Changelog" value={docVersionForm.changelog} onChange={e => setDocVersionForm(p => ({ ...p, changelog: e.target.value }))} />
                    {canCreate('capex.documents') && <button style={s.primaryBtn} onClick={handleCreateDocumentVersion}>Save Version</button>}
                  </div>
                  <div style={s.lifecycleGrid}>
                    <input style={s.compactInput} placeholder="Signer name" value={signatureForm.signerName} onChange={e => setSignatureForm(p => ({ ...p, signerName: e.target.value }))} />
                    <input style={s.compactInput} placeholder="Signer role" value={signatureForm.signerRole} onChange={e => setSignatureForm(p => ({ ...p, signerRole: e.target.value }))} />
                    {canCreate('capex.documents') && <button style={s.primaryBtn} onClick={handleCreateSignature}>Capture Signature</button>}
                  </div>

                  <h4 style={s.detailTitle}>Audit History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {auditLogs.length ? auditLogs.map(log => (
                      <div key={log.id} style={s.compactRow}>
                        <span>{log.message}</span>
                        <span style={{ color: 'var(--label-secondary)' }}>{log.actor}</span>
                      </div>
                    )) : <p style={s.detailText}>No audit events recorded yet.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'governance' && (
        <div>
          <div style={s.tabActionRow}>
            <div>
              <h2 style={s.sectionTitle}>CAPEX Governance</h2>
              <p style={s.tabSubtitle}>Executive controls for portfolio health, MOA compliance, AUC, capitalization, PO closure, decision gates, and reporting.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              {canView('capex.reports') && (
                <a href={getCapexGovernanceExportUrl('csv')} style={{ ...s.secondaryBtn, textDecoration: 'none' }}>Export Governance CSV</a>
              )}
              <button style={s.primaryBtn} onClick={() => refreshGovernance()}>Refresh</button>
            </div>
          </div>

          <div style={s.cardRow}>
            <SummaryCard label="Approved Budget" value={fmtOMR(governance?.portfolio?.approvedBudget || 0)} color="var(--label)" sub={`${governance?.portfolio?.totalProjects || 0} projects`} />
            <SummaryCard label="Forecast Spend" value={fmtOMR(governance?.portfolio?.forecastSpend || 0)} color="var(--shell-red)" sub={`${governance?.portfolio?.budgetUtilizationPercent || 0}% utilized`} />
            <SummaryCard label="Open AUC" value={fmtOMR(governance?.auc?.totalValue || 0)} color="#BA7517" sub={`${governance?.auc?.agedOver180Days || 0} over 180 days`} />
            <SummaryCard label="Red Risks" value={governance?.risk?.redRisks || 0} color="#DD1D21" sub={`${governance?.generatedAlerts?.length || 0} alerts`} />
          </div>

          <div style={s.section}>
            <div style={s.sectionHead}>
              <h3 style={s.sectionTitle}>Executive Control Summary</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              <MiniInfo label="Pending Capitalization" value={governance?.capitalization?.pending || 0} />
              <MiniInfo label="Open PO Value" value={fmtOMR(governance?.poClosure?.openCommitmentValue || 0)} />
              <MiniInfo label="Closure Readiness" value={`${governance?.closure?.readinessPercent || 0}%`} />
              <MiniInfo label="MOA Violations" value={governance?.moaCompliance?.matrixViolations || 0} />
              <MiniInfo label="Document Versions" value={governance?.documentControls?.documentVersions || 0} />
              <MiniInfo label="E-Signatures" value={governance?.documentControls?.electronicSignatures || 0} />
              <MiniInfo label="Variations" value={governance?.variationControl?.totalVariations || 0} />
              <MiniInfo label="Passed Gates" value={`${governance?.decisionGates?.passedGates || 0}/${governance?.decisionGates?.totalGates || 0}`} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'flex-start' }}>
            <div style={s.section}>
              <h3 style={s.sectionTitle}>Process Reference</h3>
              <h4 style={s.detailTitle}>Business Units</h4>
              <div style={s.pillWrap}>
                {(processRef?.businessUnits || []).map(b => <span key={b.id} style={s.pill}>{b.name}</span>)}
              </div>
              <h4 style={s.detailTitle}>Approval Routes</h4>
              <DataTable
                columns={[
                  { key: 'valueBand', label: 'Band' },
                  { key: 'range', label: 'Range' },
                  { key: 'route', label: 'Route' },
                ]}
                rows={processRef?.approvalRoutes || []}
              />
              <h4 style={s.detailTitle}>Escalation Thresholds</h4>
              <DataTable
                columns={[
                  { key: 'triggerLabel', label: 'Trigger' },
                  { key: 'thresholdValue', label: 'Threshold', render: (v, row) => `${v} ${row.thresholdUnit || ''}` },
                  { key: 'escalationTarget', label: 'Escalate To' },
                ]}
                rows={processRef?.escalationPolicies || []}
              />
            </div>

            <div style={s.section}>
              <h3 style={s.sectionTitle}>Scheduled Reports</h3>
              <div style={s.lifecycleGrid}>
                <input style={s.compactInput} placeholder="Report name" value={scheduleForm.reportName} onChange={e => setScheduleForm(p => ({ ...p, reportName: e.target.value }))} />
                <select style={s.compactInput} value={scheduleForm.reportType} onChange={e => setScheduleForm(p => ({ ...p, reportType: e.target.value }))}>
                  {['governance', 'auc', 'po-closure', 'moa-compliance', 'benefits'].map(v => <option key={v}>{v}</option>)}
                </select>
                <input style={s.compactInput} placeholder="Audience" value={scheduleForm.audience} onChange={e => setScheduleForm(p => ({ ...p, audience: e.target.value }))} />
                <select style={s.compactInput} value={scheduleForm.frequency} onChange={e => setScheduleForm(p => ({ ...p, frequency: e.target.value }))}>
                  {['Weekly', 'Monthly', 'Quarterly'].map(v => <option key={v}>{v}</option>)}
                </select>
                <select style={s.compactInput} value={scheduleForm.format} onChange={e => setScheduleForm(p => ({ ...p, format: e.target.value }))}>
                  {['PDF', 'CSV', 'XLSX'].map(v => <option key={v}>{v}</option>)}
                </select>
                <input style={s.compactInput} type="date" value={scheduleForm.nextRunDate} onChange={e => setScheduleForm(p => ({ ...p, nextRunDate: e.target.value }))} />
                <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Recipients, comma separated" value={scheduleForm.recipients} onChange={e => setScheduleForm(p => ({ ...p, recipients: e.target.value }))} />
              </div>
              {canCreate('capex.reports') && (
                <button style={s.primaryBtn} onClick={handleCreateReportSchedule}>Add Schedule</button>
              )}
              <DataTable
                columns={[
                  { key: 'reportName', label: 'Report' },
                  { key: 'frequency', label: 'Frequency' },
                  { key: 'format', label: 'Format' },
                  { key: 'nextRunDate', label: 'Next Run' },
                ]}
                rows={reportSchedules}
                emptyMsg="No schedules yet."
              />
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionHead}>
              <h3 style={s.sectionTitle}>Dashboard Drill-Down</h3>
              <select style={s.compactInput} value={drilldownType} onChange={e => handleDrilldownChange(e.target.value)}>
                {['businessUnit', 'aucAging', 'moaCompliance', 'risks', 'variations', 'procurementPerformance', 'decisionGates'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <DataTable
              columns={Object.keys(drilldownRows[0] || {}).slice(0, 7).map(key => ({ key, label: key.replace(/[A-Z]/g, m => ` ${m}`).trim() }))}
              rows={drilldownRows}
              emptyMsg="No drill-down records available."
            />
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <div>
          <div style={s.tabActionRow}>
            <div>
              <h2 style={s.sectionTitle}>CAPEX Admin Configuration</h2>
              <p style={s.tabSubtitle}>Maintain first-build governance thresholds and approval matrix rules.</p>
            </div>
          </div>

          <div style={s.section}>
            <h3 style={s.detailTitle}>Value Thresholds</h3>
            <div style={{ ...s.lifecycleGrid, maxWidth: 520 }}>
              <input style={s.compactInput} type="number" value={thresholdForm.lowMaxOmr} onChange={e => setThresholdForm(p => ({ ...p, lowMaxOmr: Number(e.target.value) }))} />
              <input style={s.compactInput} type="number" value={thresholdForm.mediumMaxOmr} onChange={e => setThresholdForm(p => ({ ...p, mediumMaxOmr: Number(e.target.value) }))} />
              <MiniInfo label="Low Value Max" value={`OMR ${Number(thresholdForm.lowMaxOmr).toLocaleString()}`} />
              <MiniInfo label="Medium Value Max" value={`OMR ${Number(thresholdForm.mediumMaxOmr).toLocaleString()}`} />
            </div>
            {canEdit('capex.admin') && (
              <button style={s.primaryBtn} onClick={handleSaveThresholds}>Save Thresholds</button>
            )}
          </div>

          <div style={s.section}>
            <h3 style={s.detailTitle}>Workflow Matrix</h3>
            <DataTable
              columns={[
                { key: 'valueBand', label: 'Band' },
                { key: 'conditionKey', label: 'Condition' },
                { key: 'stepOrder', label: 'Order',
                  render: (v, row) => <input style={{ ...s.compactInput, width: 74 }} type="number" value={v} onChange={e => handleWorkflowRuleChange(row, 'stepOrder', Number(e.target.value))} />
                },
                { key: 'approverRole', label: 'Approver Role',
                  render: (v, row) => <input style={s.compactInput} value={v} onChange={e => handleWorkflowRuleChange(row, 'approverRole', e.target.value)} />
                },
                { key: 'label', label: 'Step Label',
                  render: (v, row) => <input style={s.compactInput} value={v} onChange={e => handleWorkflowRuleChange(row, 'label', e.target.value)} />
                },
                { key: 'isActive', label: 'Active',
                  render: (v, row) => <input type="checkbox" checked={!!v} onChange={e => handleWorkflowRuleChange(row, 'isActive', e.target.checked)} />
                },
                { key: 'id', label: 'Action',
                  render: (_, row) => canEdit('capex.admin') ? <button style={s.miniBtn} onClick={() => handleSaveWorkflowRule(row)}>Save</button> : '-'
                },
              ]}
              rows={adminConfig?.workflowRules || []}
              emptyMsg="Workflow configuration has not loaded."
            />
          </div>
        </div>
      )}

      {activeTab === 'initiations' && (
        <div>
          <div style={s.tabActionRow}>
            <div>
              <h2 style={s.sectionTitle}>Capex Initiations</h2>
              <p style={s.tabSubtitle}>Standardised requirement gathering — capture project details, stakeholders, and justification before budget approval.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              {canCreate('capex.finance') && (
              <button
                style={{ ...s.primaryBtn, background: 'var(--surface)', color: 'var(--shell-red)', border: '1px solid rgba(221,29,33,0.30)', boxShadow: 'none' }}
                onClick={() => setShowBudgetUpload(true)}
              >
                ↑ Upload Approved Budget
              </button>
              )}
              {canCreate('capex.initiations') && !showInitForm && (
                <button style={s.primaryBtn} onClick={() => setShowInitForm(true)}>+ New Initiation</button>
              )}
            </div>
          </div>

          {showInitForm && (
            <CapexInitiationForm
              onSubmit={async (data) => {
                const created = await createInitiation(data);
                setInitiations((prev) => [created, ...prev]);
                setShowInitForm(false);
              }}
              onCancel={() => setShowInitForm(false)}
            />
          )}

          <div style={s.section}>
            <DataTable
              columns={[
                { key: 'id',               label: 'ID' },
                { key: 'title',            label: 'Project Title' },
                { key: 'department',       label: 'Department' },
                { key: 'projectType',      label: 'Type' },
                { key: 'estimatedBudget',  label: 'Est. Budget', render: (v) => fmtOMR(v) },
                { key: 'priority',         label: 'Priority', render: (v) => <StatusBadge status={v} /> },
                { key: 'status',           label: 'Status',   render: (v) => <StatusBadge status={v} /> },
                { key: 'createdAt',        label: 'Submitted' },
              ]}
              rows={initiations}
              emptyMsg="No initiations submitted yet."
            />
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManual && (
        <ManualEntryModal
          onClose={() => setShowManual(false)}
          onSubmit={async (data) => {
            const created = await createManualEntry(data);
            setManualEntries((prev) => [...prev, created]);
          }}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function MiniInfo({ label, value }) {
  return (
    <div style={s.miniInfo}>
      <span style={s.miniLabel}>{label}</span>
      <strong style={s.miniValue}>{value || '-'}</strong>
    </div>
  );
}

const s = {
  experience: {
    background: '#F4F6F8',
    border: '1px solid #E0E5EB',
    borderRadius: 8,
    padding: 20,
    minHeight: 'calc(100vh - 120px)',
  },
  center: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', minHeight: 300,
  },
  spinner: {
    width: 40, height: 40,
    border: '4px solid var(--gray-200)',
    borderTopColor: 'var(--shell-red)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)',
    color: '#ff6b6b', padding: '12px 20px', borderRadius: 'var(--radius-sm)', marginBottom: 12,
  },
  retryBtn: {
    padding: '8px 20px', background: 'var(--shell-red)',
    color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600,
  },

  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    background: '#FFFFFF',
    border: '1px solid #E0E5EB',
    borderLeft: '5px solid var(--shell-red)',
    borderRadius: 8,
    padding: '22px 24px',
    marginBottom: 14,
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  brandMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    minWidth: 46,
    padding: '0 9px',
    background: 'var(--shell-yellow)',
    border: '1px solid #D9B800',
    borderRadius: 4,
    color: '#2B2B2B',
    fontSize: 12,
    fontWeight: 900,
  },
  brandText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  heading:    { margin: 0, fontSize: 28, fontWeight: 800, color: '#1F2933' },
  subheading: { margin: '6px 0 0', fontSize: 14, color: '#5B6773', maxWidth: 760 },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 12 },
  syncBadge: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: '#F9FAFB', border: '1px solid #D9DEE5',
    borderRadius: 999, padding: '7px 12px',
    fontSize: 12, fontWeight: 700, color: '#4B5563',
  },
  syncDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  refreshBtn: {
    padding: '8px 16px', background: '#FFFFFF',
    border: '1px solid #C8D0D9', borderRadius: 6,
    fontSize: 13, fontWeight: 800, cursor: 'pointer', color: '#344054',
  },
  commandBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  commandItem: {
    background: '#FFFFFF',
    border: '1px solid #E0E5EB',
    borderRadius: 8,
    padding: '13px 16px',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },
  commandLabel: {
    display: 'block',
    color: '#687586',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  commandValue: {
    display: 'block',
    color: '#1F2933',
    fontSize: 15,
    marginTop: 2,
  },

  tabBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    background: '#FFFFFF',
    border: '1px solid #D9DEE5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 18,
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
  },
  tabBtn: {
    padding: '9px 16px', border: 'none',
    borderRadius: 6, cursor: 'pointer',
    fontSize: 13, fontWeight: 800, color: '#5B6773',
    background: 'transparent', transition: 'all var(--transition-fast)',
  },
  tabBtnActive: {
    background: 'var(--shell-red)', color: '#fff',
    fontWeight: 900, boxShadow: '0 1px 2px rgba(0,0,0,0.14)',
  },
  tabBtnDisabled: {
    opacity: 0.4, cursor: 'not-allowed',
  },

  cardRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18,
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E0E5EB',
    borderRadius: 8,
    padding: '18px 18px',
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
  },
  cardLabel: {
    margin: '0 0 6px', fontSize: 11, fontWeight: 600,
    color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  cardValue: { margin: 0, fontSize: 24, fontWeight: 850 },
  cardSub:   { margin: '4px 0 0', fontSize: 12, color: 'var(--label-secondary)' },

  section: {
    background: '#FFFFFF',
    border: '1px solid #E0E5EB',
    borderRadius: 8,
    padding: '22px',
    marginBottom: 18,
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
  },
  sectionHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  sectionTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 850, color: '#1F2933' },

  meterTrack: {
    height: 10, background: 'var(--gray-200)',
    borderRadius: 'var(--radius-full)', overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: 'var(--radius-full)', transition: 'width 0.7s var(--ease)' },

  chartWrap: { height: 260, position: 'relative' },

  infoBar: {
    background: 'var(--surface)', border: '1px solid var(--separator-clear)',
    borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 8,
  },

  deptTabs: { display: 'flex', gap: 0, borderBottom: '1px solid var(--separator-clear)', marginBottom: 0 },
  deptTab: {
    padding: '10px 20px', border: 'none', background: 'transparent',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    color: 'var(--label-secondary)', borderBottom: '2px solid transparent',
    transition: 'all var(--transition-fast)',
  },
  deptTabActive: {
    color: 'var(--shell-red)', fontWeight: 700,
    borderBottom: '2px solid var(--shell-red)',
  },

  tabActionRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 18, marginBottom: 16,
  },
  tabSubtitle: { margin: '4px 0 0', fontSize: 13, color: '#5B6773' },
  primaryBtn: {
    padding: '9px 18px', background: 'var(--shell-red)',
    border: '1px solid #B8161B', borderRadius: 6,
    fontSize: 13, fontWeight: 850, color: '#fff', cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15,23,42,0.08)', flexShrink: 0,
  },
  secondaryBtn: {
    padding: '9px 14px', background: '#FFFFFF',
    border: '1px solid #C8D0D9', borderRadius: 6,
    fontSize: 13, fontWeight: 800, color: '#344054', cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)', flexShrink: 0,
  },
  warnBtn: {
    padding: '9px 14px', background: '#FFF7D1',
    border: '1px solid #F1D36A', borderRadius: 6,
    fontSize: 13, fontWeight: 800, color: '#805B00', cursor: 'pointer',
  },
  dangerBtn: {
    padding: '9px 14px', background: '#FDECEC',
    border: '1px solid #F4B8BB', borderRadius: 6,
    fontSize: 13, fontWeight: 800, color: '#A91F23', cursor: 'pointer',
  },
  linkBtn: {
    background: 'transparent', border: 'none', padding: 0,
    color: 'var(--shell-red)', fontWeight: 700, cursor: 'pointer',
    textAlign: 'left', font: 'inherit',
  },
  miniInfo: {
    background: '#F8FAFC', border: '1px solid #E0E5EB',
    borderRadius: 6, padding: '11px 12px',
  },
  miniLabel: {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  miniValue: { display: 'block', marginTop: 4, fontSize: 13, color: 'var(--label)' },
  detailTitle: { margin: '18px 0 8px', fontSize: 12, fontWeight: 850, color: '#5B6773', textTransform: 'uppercase', letterSpacing: '0.4px' },
  detailText: { margin: 0, fontSize: 13, color: 'var(--label)', lineHeight: 1.55 },
  compactRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    background: '#F8FAFC', border: '1px solid #E0E5EB',
    borderRadius: 6, padding: '10px 12px', fontSize: 13,
  },
  lifecycleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8, marginBottom: 12,
  },
  compactInput: {
    border: '1px solid #C8D0D9', borderRadius: 6,
    padding: '9px 10px', fontSize: 12, color: '#1F2933',
    background: '#FFFFFF', fontFamily: 'inherit', minWidth: 0,
  },
  miniBtn: {
    padding: '5px 8px', border: '1px solid #C8D0D9',
    borderRadius: 6, background: '#FFFFFF',
    color: '#344054', fontSize: 11, fontWeight: 800, cursor: 'pointer',
  },
  inlineLink: {
    color: 'var(--shell-red)', fontSize: 12, fontWeight: 700,
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
  pillWrap: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: {
    display: 'inline-flex', alignItems: 'center',
    border: '1px solid var(--separator-clear)', background: 'var(--bg)',
    borderRadius: 'var(--radius-full)', padding: '5px 10px',
    fontSize: 12, fontWeight: 700, color: 'var(--label-secondary)',
  },

  requestWorkspace: {
    display: 'grid',
    gridTemplateColumns: 'minmax(460px, 1.05fr) minmax(440px, 0.95fr)',
    gap: 18,
    alignItems: 'flex-start',
  },
  requestDetailPanel: {
    position: 'sticky',
    top: 18,
    maxHeight: 'calc(100vh - 120px)',
    overflow: 'auto',
  },
  requestHero: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    background: '#F8FAFC',
    border: '1px solid #E0E5EB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  detailEyebrow: {
    display: 'block',
    fontSize: 10,
    fontWeight: 900,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  requestTitle: {
    margin: 0,
    fontSize: 18,
    color: '#1F2933',
    fontWeight: 850,
  },
  requestMeta: {
    margin: '4px 0 0',
    fontSize: 12,
    color: '#5B6773',
  },
  workflowRibbon: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 8,
    marginBottom: 12,
  },
  workflowStep: {
    minHeight: 74,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    justifyContent: 'space-between',
    background: '#FFFFFF',
    border: '1px solid #E0E5EB',
    borderRadius: 8,
    padding: 10,
  },
  workflowOrder: {
    width: 22,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    background: 'var(--shell-red)',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 900,
  },
  workflowLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.25,
  },
  detailStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
    marginBottom: 16,
  },
  tableWrap: { overflowX: 'auto', border: '1px solid #E0E5EB', borderRadius: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#FFFFFF' },
  th: {
    padding: '11px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 850, color: '#5B6773',
    textTransform: 'uppercase', letterSpacing: '0.4px',
    borderBottom: '1px solid #D9DEE5', whiteSpace: 'nowrap',
    background: '#F8FAFC',
  },
  td: {
    padding: '12px 14px', borderBottom: '1px solid #E9EDF2',
    color: '#1F2933', verticalAlign: 'middle',
  },
};
