import { useState, useEffect, useRef } from 'react';
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import {
  getDepartments, getSyncStatus, getGsapData,
  getInitiations, createInitiation,
  getCapexRequests, getCapexRequest, createCapexRequest, decideCapexRequest,
  updateCapexRequest, resubmitCapexRequest, delegateCapexStep, decideCapexBudgetVariation,
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
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import DateField from '../../components/DateField';
import SelectField from '../../components/SelectField';
import Checkbox from '../../components/Checkbox';
import Badge from '../../components/Badge';
import { fieldInputStyle } from '../../components/fieldStyles';
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
  if (pct >= 90) return 'var(--shell-red)';
  if (pct >= 70) return 'var(--warning)';
  return 'var(--success)';
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
            <tr key={i} style={i % 2 === 0 ? {} : { background: 'var(--gray-50)' }}>
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

// ── Workflow stepper (all approval steps) ─────────────────────────────────────
function WorkflowStepper({ steps = [], currentStepId }) {
  const visible = steps.filter((step) => step.status !== 'Superseded');
  if (!visible.length) {
    return <p style={{ ...s.detailText, marginBottom: 4 }}>No approval steps configured.</p>;
  }
  return (
    <div style={s.stepper}>
      {visible.map((step, i) => {
        const isCurrent = step.id === currentStepId;
        const isDone = ['Approved', 'Completed', 'Complete', 'Signed', 'Posted'].includes(step.status);
        const connColor = isDone ? 'var(--success-bg)' : 'var(--gray-200)';
        const node = {
          ...s.stepNode,
          ...(isDone ? s.stepNodeDone : {}),
          ...(isCurrent ? s.stepNodeCurrent : {}),
        };
        const pill = isDone ? s.stepPillDone : isCurrent ? s.stepPillCurrent : s.stepPillPending;
        return (
          <div key={step.id} style={s.stepCell}>
            <div style={s.stepConnectorRow}>
              <div style={{ ...s.stepConnector, background: i > 0 ? connColor : 'transparent' }} />
              <div style={node}>{isDone ? '✓' : step.stepOrder}</div>
              <div style={{ ...s.stepConnector, background: i < visible.length - 1 ? (['Approved', 'Completed', 'Complete', 'Signed', 'Posted'].includes(visible[i + 1]?.status) || isDone ? 'var(--success-bg)' : 'var(--gray-200)') : 'transparent' }} />
            </div>
            <div style={s.stepLabel} title={step.label}>{step.label}</div>
            <span style={{ ...s.stepPill, ...pill }}>{isDone ? 'Approved' : isCurrent ? 'Current' : step.status}</span>
          </div>
        );
      })}
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
  const [signatureForm,  setSignatureForm]  = useState({ linkedType: 'MOA', linkedId: '', decision: 'Signed' });
  const [scheduleForm,   setScheduleForm]   = useState({ reportName: 'Monthly CAPEX Governance Pack', reportType: 'governance', audience: 'CEO/CFO', frequency: 'Monthly', format: 'PDF', recipients: '', nextRunDate: '' });
  const [returnedEditForm, setReturnedEditForm] = useState({ title: '', estimatedValue: '', acvPoValue: '', scopeDetails: '', fewerThan3Justification: '', savings: '' });
  const [delegateTo,     setDelegateTo]     = useState('');
  const [reqSearch,      setReqSearch]      = useState('');
  const [reqStatusFilter,setReqStatusFilter]= useState('');
  const [reqDeptFilter,  setReqDeptFilter]  = useState('');
  const [activeSection,  setActiveSection]  = useState('summary');
  const [showMoaModal,   setShowMoaModal]   = useState(false);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showRiskModal,  setShowRiskModal]  = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('som_user') || '{}'); } catch { return {}; } })();

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
    setReturnedEditForm({
      title: selectedRequest.title || '',
      estimatedValue: selectedRequest.estimatedValue ?? '',
      acvPoValue: selectedRequest.acvPoValue ?? '',
      scopeDetails: selectedRequest.scopeDetails || '',
      fewerThan3Justification: selectedRequest.fewerThan3Justification || '',
      savings: selectedRequest.savings ?? '',
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

  // Scroll-spy: keep the "On this request" rail in sync with the section in view
  useEffect(() => {
    if (!selectedRequest) return;
    const els = Array.from(document.querySelectorAll('[id^="capex-sec-"]'));
    if (!els.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) setActiveSection(visible[0].target.id.replace('capex-sec-', ''));
    }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [selectedRequest]);

  function showUploadToast(msg) {
    setUploadToast(msg);
    setTimeout(() => setUploadToast(''), 5000);
  }

  async function openCapexRequest(id) {
    const detail = await getCapexRequest(id);
    setSelectedRequest(detail);
    setActiveSection('summary');
    window.scrollTo({ top: 0 });
  }

  function closeRequestDetail() {
    setSelectedRequest(null);
  }

  function scrollToSection(key) {
    setActiveSection(key);
    document.getElementById(`capex-sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    setCapexRequests((prev) => [created, ...prev]);
    setShowRequestForm(false);
    showUploadToast(`CAPEX request "${created.title}" created.`);
  }

  async function handleCapexDecision(decision) {
    if (!selectedRequest) return;
    const comment = decision === 'APPROVED' ? '' : window.prompt('Comment required for this action') || '';
    if (decision !== 'APPROVED' && !comment.trim()) return;
    try {
      const updated = await decideCapexRequest(selectedRequest.id, decision, comment);
      setSelectedRequest(updated);
      const requests = await getCapexRequests();
      setCapexRequests(requests);
    } catch (err) {
      window.alert(err.message || 'Decision failed.');
    }
  }

  async function handleSaveReturnedEdit() {
    if (!selectedRequest) return;
    try {
      const updated = await updateCapexRequest(selectedRequest.id, returnedEditForm);
      setSelectedRequest(updated);
      setUploadToast('Request changes saved.');
    } catch (err) {
      window.alert(err.message || 'Failed to save changes.');
    }
  }

  async function handleResubmitRequest() {
    if (!selectedRequest) return;
    try {
      const updated = await resubmitCapexRequest(selectedRequest.id);
      setSelectedRequest(updated);
      const requests = await getCapexRequests();
      setCapexRequests(requests);
      setUploadToast('Request resubmitted for approval.');
    } catch (err) {
      window.alert(err.message || 'Failed to resubmit request.');
    }
  }

  async function handleDelegateStep() {
    if (!selectedRequest?.currentStepId || !delegateTo.trim()) return;
    try {
      await delegateCapexStep(selectedRequest.id, selectedRequest.currentStepId, delegateTo.trim());
      setDelegateTo('');
      await refreshSelectedRequest();
      setUploadToast('Approval step delegated.');
    } catch (err) {
      window.alert(err.message || 'Failed to delegate step.');
    }
  }

  async function handleVariationDecision(variationId, decision) {
    if (!selectedRequest) return;
    try {
      await decideCapexBudgetVariation(selectedRequest.id, variationId, decision);
      await refreshSelectedRequest();
    } catch (err) {
      window.alert(err.message || 'Failed to decide variation.');
    }
  }

  async function handleSaveProcurement() {
    if (!selectedRequest) return;
    try {
      await updateCapexProcurement(selectedRequest.id, procurementForm);
      await refreshSelectedRequest();
    } catch (err) {
      window.alert(err.message || 'Failed to save procurement.');
    }
  }

  async function handleAddMilestone(e) {
    e.preventDefault();
    if (!selectedRequest || !milestoneForm.stageName || !milestoneForm.milestoneName) return;
    try {
      await createCapexMilestone(selectedRequest.id, milestoneForm);
      setMilestoneForm({ stageName: '', milestoneName: '', plannedDate: '', actualDate: '', paymentPercentage: '', paymentAmount: '', completionEvidence: '' });
      await refreshSelectedRequest();
    } catch (err) {
      window.alert(err.message || 'Failed to add milestone.');
    }
  }

  async function handleCompleteMilestone(milestone) {
    if (!selectedRequest) return;
    try {
      await updateCapexMilestone(selectedRequest.id, milestone.id, {
        actualDate: milestone.actualDate || new Date().toISOString().slice(0, 10),
        status: 'Completed',
      });
      await refreshSelectedRequest();
    } catch (err) {
      window.alert(err.message || 'Failed to update milestone.');
    }
  }

  async function handleSaveClosure(closeRequest = false) {
    if (!selectedRequest) return;
    try {
      await saveCapexFinancialClosure(selectedRequest.id, { ...closureForm, closeRequest });
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to save financial closure.');
    }
  }

  async function handleSaveAuc() {
    if (!selectedRequest) return;
    try {
      await updateCapexAuc(selectedRequest.id, aucForm);
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to save AUC.');
    }
  }

  async function handleSaveCapitalization() {
    if (!selectedRequest) return;
    try {
      await updateCapexCapitalization(selectedRequest.id, capitalizationForm);
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to save capitalization.');
    }
  }

  async function handleSavePoClosure() {
    if (!selectedRequest) return;
    try {
      await updateCapexPoClosure(selectedRequest.id, poClosureForm);
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to save PO closure.');
    }
  }

  async function handleChecklistStatus(item, status) {
    if (!selectedRequest) return;
    try {
      await updateCapexClosureChecklistItem(selectedRequest.id, item.id, { status });
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to update checklist item.');
    }
  }

  async function handleSaveBenefitReview() {
    if (!selectedRequest) return;
    try {
      await saveCapexBenefitReview(selectedRequest.id, benefitForm);
      setBenefitForm({ reviewPeriodMonths: 6, plannedRoi: '', actualRoi: '', plannedSavings: '', actualSavings: '', benefitScore: '', status: 'Planned' });
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to save benefit review.');
    }
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

  async function submitMoaModal() {
    if (!moaForm.moaNumber.trim()) return;
    try {
      await handleCreateMoa();
      setShowMoaModal(false);
    } catch (err) {
      window.alert(err.message || 'Failed to save MOA.');
    }
  }

  async function submitVariationModal() {
    if (!variationForm.justification.trim()) return;
    try {
      await handleCreateVariation();
      setShowVariationModal(false);
    } catch (err) {
      window.alert(err.message || 'Failed to create variation.');
    }
  }

  async function submitRiskModal() {
    if (!riskForm.title.trim()) return;
    try {
      await handleCreateRisk();
      setShowRiskModal(false);
    } catch (err) {
      window.alert(err.message || 'Failed to add risk.');
    }
  }

  async function handleSaveProcurementPerformance() {
    if (!selectedRequest) return;
    try {
      await updateCapexProcurementPerformance(selectedRequest.id, procPerfForm);
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to save procurement KPIs.');
    }
  }

  async function handleDecisionGate(gate, status = 'Passed') {
    if (!selectedRequest) return;
    try {
      await updateCapexDecisionGate(selectedRequest.id, gate.gateKey, { status });
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to update decision gate.');
    }
  }

  async function handleCreateDocumentVersion() {
    if (!selectedRequest || !docVersionForm.documentName.trim()) return;
    try {
      await createCapexDocumentVersion(selectedRequest.id, docVersionForm);
      setDocVersionForm({ documentType: 'MOA', documentName: selectedRequest.title || '', versionLabel: 'v1', changelog: '', retentionUntil: '' });
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to save document version.');
    }
  }

  async function handleCreateSignature() {
    if (!selectedRequest) return;
    try {
      await createCapexSignature(selectedRequest.id, signatureForm);
      setSignatureForm({ linkedType: 'MOA', linkedId: '', decision: 'Signed' });
      await refreshSelectedRequest();
      await refreshGovernance();
    } catch (err) {
      window.alert(err.message || 'Failed to capture signature.');
    }
  }

  async function handleCreateReportSchedule() {
    await createCapexReportSchedule({
      ...scheduleForm,
      recipients: scheduleForm.recipients.split(',').map(v => v.trim()).filter(Boolean),
    });
    setScheduleForm({ reportName: 'Monthly CAPEX Governance Pack', reportType: 'governance', audience: 'CEO/CFO', frequency: 'Monthly', format: 'PDF', recipients: '', nextRunDate: '' });
    await refreshGovernance();
  }

  async function submitScheduleModal() {
    if (!scheduleForm.reportName.trim()) return;
    try {
      await handleCreateReportSchedule();
      setShowScheduleModal(false);
    } catch (err) {
      window.alert(err.message || 'Failed to create report schedule.');
    }
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
    try {
      await uploadCapexAttachment(selectedRequest.id, formData);
      e.target.value = '';
      await refreshSelectedRequest();
      showUploadToast('Attachment uploaded.');
    } catch (err) {
      window.alert(err.message || 'Failed to upload attachment.');
    }
  }

  async function handleSaveThresholds() {
    try {
      const updated = await updateCapexThresholds(thresholdForm);
      setThresholdForm({ lowMaxOmr: updated.lowMaxOmr, mediumMaxOmr: updated.mediumMaxOmr });
      const config = await getCapexAdminConfig();
      setAdminConfig(config);
    } catch (err) {
      window.alert(err.message || 'Failed to save thresholds.');
    }
  }

  async function handleWorkflowRuleChange(rule, field, value) {
    setAdminConfig(prev => ({
      ...prev,
      workflowRules: prev.workflowRules.map(r => r.id === rule.id ? { ...r, [field]: value } : r),
    }));
  }

  async function handleSaveWorkflowRule(rule) {
    try {
      await updateCapexWorkflowRule(rule.id, rule);
      const config = await getCapexAdminConfig();
      setAdminConfig(config);
    } catch (err) {
      window.alert(err.message || 'Failed to save workflow rule.');
    }
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
          { label: 'Budgeted', data: budgeted, backgroundColor: 'rgba(255,213,0,0.75)', borderRadius: 'var(--radius-xs)' },
          { label: 'Actual',   data: actual,   backgroundColor: 'rgba(221,29,33,0.80)',  borderRadius: 'var(--radius-xs)' },
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
          { label: 'Budgeted', data: dept.monthlyData.map((m) => m.budgeted), backgroundColor: 'rgba(255,213,0,0.75)', borderRadius: 'var(--radius-xs)' },
          { label: 'Actual',   data: dept.monthlyData.map((m) => m.actual),   backgroundColor: 'rgba(221,29,33,0.80)',  borderRadius: 'var(--radius-xs)' },
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

  // ── Requests register: derived filter options + filtered rows ────────────────
  const requestStatusOptions = [...new Set(capexRequests.map((r) => r.status).filter(Boolean))].sort();
  const requestDeptOptions   = [...new Set(capexRequests.map((r) => r.department).filter(Boolean))].sort();
  const filteredRequests = capexRequests.filter((r) => {
    const q = reqSearch.trim().toLowerCase();
    const matchesSearch = !q || [r.id, r.title, r.department].some((v) => String(v || '').toLowerCase().includes(q));
    const matchesStatus = !reqStatusFilter || r.status === reqStatusFilter;
    const matchesDept   = !reqDeptFilter || r.department === reqDeptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });
  const requestFiltersActive = !!(reqSearch.trim() || reqStatusFilter || reqDeptFilter);
  const clearRequestFilters = () => { setReqSearch(''); setReqStatusFilter(''); setReqDeptFilter(''); };

  const DETAIL_SECTIONS = [
    { key: 'summary',     label: 'Overview' },
    { key: 'approvals',   label: 'Approvals' },
    { key: 'procurement', label: 'Procurement' },
    { key: 'execution',   label: 'Execution' },
    { key: 'financial',   label: 'Financial closure' },
    { key: 'auc',         label: 'AUC & PO closure' },
    { key: 'checklist',   label: 'Closure checklist' },
    { key: 'governance',  label: 'MOA & gates' },
    { key: 'performance', label: 'Performance & risk' },
    { key: 'documents',   label: 'Documents' },
    { key: 'audit',       label: 'Audit history' },
  ];

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalBudget    = depts.reduce((s, d) => s + d.totalBudget, 0);
  const totalActual    = depts.reduce((s, d) => s + d.actual, 0);
  const totalCommitted = depts.reduce((s, d) => s + d.committed, 0);
  const totalRemaining = depts.reduce((s, d) => s + d.remaining, 0);
  const overallPct     = totalBudget ? Math.round(((totalActual + totalCommitted) / totalBudget) * 100) : 0;

  const isGsapLive  = syncStatus?.mode === 'gsap' && syncStatus?.status === 'success';
  const lastSynced  = syncStatus?.lastSynced
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
      <button type="button" onClick={fetchAll} style={s.retryBtn}>Retry</button>
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
        <div style={{ fontSize: 13, color: 'var(--success)', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '11px 16px', marginBottom: 16 }}>
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
          <div style={{ ...s.syncBadge, opacity: isGsapLive ? 1 : 0.6 }} title={syncStatus?.message || ''}>
            <span style={{ ...s.syncDot, background: isGsapLive ? 'var(--success)' : 'var(--gray-400)' }} />
            {isGsapLive ? `GSAP Synced · ${lastSynced}` : 'GSAP Sync Disabled · Manual Mode'}
          </div>
          <button type="button" style={s.refreshBtn} onClick={fetchAll}>Refresh</button>
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
          <button type="button"
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
              <SummaryCard label="PO Commitments" value={fmtOMR(totalCommitted)} color="var(--warning)" />
            )}
            {canView('capex.planning.dashboard.remaining') && (
              <SummaryCard label="Remaining Balance" value={fmtOMR(totalRemaining)} color="var(--success)" />
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
                <button type="button"
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
                  <SummaryCard label="PO Committed" value={fmtOMR(dept.committed)} color="var(--warning)" />
                )}
                {canView('capex.planning.departments.remaining') && (
                  <SummaryCard label="Remaining" value={fmtOMR(dept.remaining)} color="var(--success)" />
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
                background: gsapData.status === 'success' ? 'var(--success)' : 'var(--danger)',
                flexShrink: 0,
              }} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>
                  GSAP Integration — One-way Read
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--label-secondary)' }}>
                  Source: <strong>{gsapData.source}</strong> &nbsp;|&nbsp;
                  Last sync: <strong>{new Date(gsapData.lastSynced).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</strong>
                  &nbsp;|&nbsp; Status: <Badge status={gsapData.status} />
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
                    return <span style={{ color: rem < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{fmtOMR(rem)}</span>;
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
                { key: 'status',      label: 'Status', render: (v) => <Badge status={v} /> },
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
              <button type="button" style={s.primaryBtn} onClick={() => setShowManual(true)}>+ Add Entry</button>
            )}
          </div>

          <DataTable
            columns={[
              { key: 'id',              label: 'Entry ID' },
              canView('capex.tracking.manual-entry.entry_type') && { key: 'entryTypeStatus', field: 'entryType', label: 'Type', render: (v) => <Badge status={v === 'Actual' ? 'Posted' : v === 'PO Commitment' ? 'Open' : 'Under Review'} /> },
              canView('capex.tracking.manual-entry.entry_type') && { key: 'entryType', label: 'Entry Type' },
              canView('capex.tracking.manual-entry.department')       && { key: 'department',      label: 'Department' },
              canView('capex.tracking.manual-entry.period')           && { key: 'period',          label: 'Period' },
              canView('capex.tracking.manual-entry.amount')           && { key: 'amount',          label: 'Amount (OMR)', render: (v) => <strong>{fmtOMR(v)}</strong> },
              canView('capex.tracking.manual-entry.reference_number') && { key: 'referenceNumber', label: 'Reference' },
              canView('capex.tracking.manual-entry.entered_by')       && { key: 'enteredBy',       label: 'Entered By' },
              canView('capex.tracking.manual-entry.status')           && { key: 'status',          label: 'Status', render: (v) => <Badge status={v} /> },
            ].filter(Boolean).filter((c, i, arr) => arr.findIndex((x) => x.key === c.key && x.label === c.label) === i)}
            rows={manualEntries}
            emptyMsg="No manual entries yet. Use 'Add Entry' to post a non-GSAP transaction."
          />
        </div>
      )}

      {/* ── TAB: Initiations ─────────────────────────────────────────────── */}
      {activeTab === 'requests' && !selectedRequest && (
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
                <button type="button" style={s.primaryBtn} onClick={() => setShowRequestForm(true)}>+ New CAPEX Request</button>
              )}
            </div>
          </div>

          {showRequestForm && (
            <CapexRequestForm
              onSubmit={handleCreateCapexRequest}
              onCancel={() => setShowRequestForm(false)}
            />
          )}

          <div style={s.section}>
            <div style={s.reqToolbar}>
              <input
                style={s.reqSearch}
                placeholder="Search by request ID, title, or department"
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
              />
              <SelectField style={s.reqFilter} value={reqStatusFilter} onChange={setReqStatusFilter} options={requestStatusOptions} placeholder="All statuses" aria-label="Filter by status" />
              <SelectField style={s.reqFilter} value={reqDeptFilter} onChange={setReqDeptFilter} options={requestDeptOptions} placeholder="All departments" aria-label="Filter by department" />
              {requestFiltersActive && <button type="button" style={s.secondaryBtn} onClick={clearRequestFilters}>Clear</button>}
              <span style={s.reqCount}>Showing {filteredRequests.length} of {capexRequests.length}</span>
            </div>

            {!capexRequests.length ? (
              <p style={{ color: 'var(--label-secondary)', fontSize: 14, padding: '16px 0' }}>
                No CAPEX requests yet. Create the first request to start workflow routing.
              </p>
            ) : !filteredRequests.length ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <p style={{ color: 'var(--label-secondary)', fontSize: 14, marginBottom: 10 }}>No requests match your filters.</p>
                <button type="button" style={s.secondaryBtn} onClick={clearRequestFilters}>Clear filters</button>
              </div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Request</th>
                      <th style={s.th}>Title</th>
                      <th style={s.th}>Department</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Value</th>
                      <th style={s.th}>Band</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th} aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((r) => (
                      <tr key={r.id} className="capex-req-row" onClick={() => openCapexRequest(r.id)}>
                        <td style={s.td}>{r.id}</td>
                        <td style={s.td}>
                          <button type="button" className="capex-req-title" style={s.rowTitleBtn} onClick={() => openCapexRequest(r.id)}>{r.title}</button>
                        </td>
                        <td style={s.td}>{r.department}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtOMR(r.estimatedValue)}</td>
                        <td style={s.td}><Badge status={r.valueBand === 'LOW' ? 'Low' : r.valueBand === 'MEDIUM' ? 'Medium' : 'High'} /></td>
                        <td style={s.td}><Badge status={r.status} /></td>
                        <td style={{ ...s.td, textAlign: 'right', color: 'var(--gray-400)', fontWeight: 900 }}>›</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && selectedRequest && (
        <div>
          <button type="button" style={s.backBtn} onClick={closeRequestDetail}>← All Requests</button>

          <div style={s.dHeaderCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={s.dEyebrow}>CAPEX Request</div>
                <h3 style={s.dTitle}>{selectedRequest.title}</h3>
                <div style={s.dMeta}>
                  {selectedRequest.id} · {selectedRequest.department} · <span style={{ color: 'var(--label)', fontWeight: 700 }}>{fmtOMR(selectedRequest.estimatedValue)}</span>
                </div>
              </div>
              <Badge status={selectedRequest.status} />
            </div>

            <WorkflowStepper steps={selectedRequest.approvalSteps} currentStepId={selectedRequest.currentStepId} />

            <div style={s.dStatGrid}>
              <div style={s.dStatTile}><div style={s.dStatLabel}>Value Band</div><div style={s.dStatValue}>{selectedRequest.valueBand || '—'}</div></div>
              <div style={s.dStatTile}><div style={s.dStatLabel}>Quotes</div><div style={s.dStatValue}>{selectedRequest.quotations?.length || 0} / 3</div></div>
              <div style={s.dStatTile}><div style={s.dStatLabel}>HSSE Risk</div><div style={s.dStatValue}>{selectedRequest.hsseRisk || '—'}</div></div>
              <div style={s.dStatTile}><div style={s.dStatLabel}>Worker Welfare</div><div style={s.dStatValue}>{selectedRequest.workerWelfareRisk || '—'}</div></div>
            </div>
          </div>

          <div style={s.dTwoPane}>
            <div style={s.dNavRail}>
              <div style={s.dNavRailHead}>On this request</div>
              {DETAIL_SECTIONS.map((sec) => {
                const active = activeSection === sec.key;
                return (
                  <a
                    key={sec.key}
                    onClick={() => scrollToSection(sec.key)}
                    style={{ ...s.dNavItem, ...(active ? s.dNavItemActive : {}) }}
                  >
                    <span style={{ ...s.dNavDot, background: active ? 'var(--shell-red)' : 'var(--gray-200)' }} />{sec.label}
                  </a>
                );
              })}
            </div>

            <div style={s.dCardCol}>

              <section id="capex-sec-summary" style={s.dCard}>
                  <h4 style={s.detailTitle}>Scope</h4>
                  <p style={s.detailText}>{selectedRequest.scopeDetails}</p>

                  {selectedRequest.fewerThan3Justification && (
                    <>
                      <h4 style={s.detailTitle}>Fewer than 3 Quotations Justification</h4>
                      <p style={s.detailText}>{selectedRequest.fewerThan3Justification}</p>
                    </>
                  )}
              </section>

              <section id="capex-sec-approvals" style={s.dCard}>
                  <h4 style={s.detailTitle}>Approval Workflow</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selectedRequest.approvalSteps || []).filter((step) => step.status !== 'Superseded').map((step) => (
                      <div key={step.id} style={s.compactRow}>
                        <span>
                          {step.stepOrder}. {step.label}
                          {step.assignedTo ? ` — assigned to ${step.assignedTo}` : ''}
                        </span>
                        <Badge status={step.status} />
                      </div>
                    ))}
                  </div>

                  {selectedRequest.status === 'Returned for correction' &&
                   (currentUser.role === 'Admin' ||
                    (selectedRequest.requesterId && selectedRequest.requesterId === currentUser.id)) && (
                    <>
                      <h4 style={s.detailTitle}>Correct &amp; Resubmit</h4>
                      <p style={s.detailText}>
                        This request was returned for correction. Update the details, save, then resubmit for approval.
                      </p>
                      <div style={s.lifecycleGrid}>
                        <Field label="Title"><input style={s.fieldInput} placeholder="Title" value={returnedEditForm.title}
                          onChange={e => setReturnedEditForm(p => ({ ...p, title: e.target.value }))} /></Field>
                        <Field label="Estimated value (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={returnedEditForm.estimatedValue}
                          onChange={e => setReturnedEditForm(p => ({ ...p, estimatedValue: e.target.value }))} /></Field>
                        <Field label="ACV / PO value (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={returnedEditForm.acvPoValue ?? ''}
                          onChange={e => setReturnedEditForm(p => ({ ...p, acvPoValue: e.target.value }))} /></Field>
                        <Field label="Savings (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={returnedEditForm.savings ?? ''}
                          onChange={e => setReturnedEditForm(p => ({ ...p, savings: e.target.value }))} /></Field>
                        <Field label="Scope details" full><input style={s.fieldInput} placeholder="Scope details" value={returnedEditForm.scopeDetails}
                          onChange={e => setReturnedEditForm(p => ({ ...p, scopeDetails: e.target.value }))} /></Field>
                        <Field label="Justification if fewer than 3 quotations" full><input style={s.fieldInput} placeholder="Justification if fewer than 3 quotations" value={returnedEditForm.fewerThan3Justification}
                          onChange={e => setReturnedEditForm(p => ({ ...p, fewerThan3Justification: e.target.value }))} /></Field>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button type="button" style={s.warnBtn} onClick={handleSaveReturnedEdit}>Save Changes</button>
                        <button type="button" style={s.primaryBtn} onClick={handleResubmitRequest}>Resubmit for Approval</button>
                      </div>
                    </>
                  )}

              </section>

              <section id="capex-sec-procurement" style={s.dCard}>
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
                    <SelectField style={s.compactInput} value={attachmentType} onChange={setAttachmentType} options={['Scope Document', 'Supplier Quotation', 'HSSE Evidence', 'PO Document', 'Milestone Evidence', 'CAPEX Closure Form']} aria-label="Attachment type" />
                    {canCreate('capex.documents') && (
                      <input style={s.compactInput} type="file" onChange={handleAttachmentUpload} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {(selectedRequest.attachments || []).map((a) => (
                      <div key={a.id} style={s.compactRow}>
                        <span>{a.type}: {a.name}</span>
                        <button type="button" style={s.linkBtn} onClick={() => downloadCapexAttachment(selectedRequest.id, a)}>Download</button>
                      </div>
                    ))}
                    {!(selectedRequest.attachments || []).length && <p style={s.detailText}>No documents uploaded yet.</p>}
                  </div>

                  <h4 style={s.detailTitle}>Procurement Tracking</h4>

                  <div style={s.dSubLabel}>Compliance & vendor setup</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="NDA">
                      <Checkbox style={s.checkInline} checked={!!procurementForm.ndaRequired} onChange={c => setProcurementForm(p => ({ ...p, ndaRequired: c, ndaStatus: c ? 'Pending' : 'Not required' }))} label="Required" />
                    </Field>
                    <Field label="NDA status">
                      <SelectField style={s.fieldInput} value={procurementForm.ndaStatus || 'Not required'} onChange={v => setProcurementForm(p => ({ ...p, ndaStatus: v }))} options={['Not required', 'Pending', 'Completed']} aria-label="NDA status" />
                    </Field>
                    <Field label="DPA">
                      <Checkbox style={s.checkInline} checked={!!procurementForm.dpaRequired} onChange={c => setProcurementForm(p => ({ ...p, dpaRequired: c, dpaStatus: c ? 'Pending' : 'Not required' }))} label="Required" />
                    </Field>
                    <Field label="DPA status">
                      <SelectField style={s.fieldInput} value={procurementForm.dpaStatus || 'Not required'} onChange={v => setProcurementForm(p => ({ ...p, dpaStatus: v }))} options={['Not required', 'Pending', 'Completed']} aria-label="DPA status" />
                    </Field>
                    <Field label="Vendor registration">
                      <SelectField style={s.fieldInput} value={procurementForm.vendorRegistrationStatus || 'Pending'} onChange={v => setProcurementForm(p => ({ ...p, vendorRegistrationStatus: v }))} options={['Not required', 'Pending', 'Completed']} aria-label="Vendor registration" />
                    </Field>
                    <Field label="Agreement status">
                      <SelectField style={s.fieldInput} value={procurementForm.agreementStatus || 'Pending'} onChange={v => setProcurementForm(p => ({ ...p, agreementStatus: v }))} options={['Not required', 'Pending', 'Completed']} aria-label="Agreement status" />
                    </Field>
                  </div>

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>GSAP, PR & PO references</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="GSAP project reference"><input style={s.fieldInput} placeholder="e.g. GSAP-1234" value={procurementForm.gsapProjectReference || ''} onChange={e => setProcurementForm(p => ({ ...p, gsapProjectReference: e.target.value }))} /></Field>
                    <Field label="PR number"><input style={s.fieldInput} placeholder="PR number" value={procurementForm.prNumber || ''} onChange={e => setProcurementForm(p => ({ ...p, prNumber: e.target.value }))} /></Field>
                    <Field label="PO number"><input style={s.fieldInput} placeholder="PO number" value={procurementForm.poNumber || ''} onChange={e => setProcurementForm(p => ({ ...p, poNumber: e.target.value }))} /></Field>
                    <Field label="PO value (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={procurementForm.poValue || ''} onChange={e => setProcurementForm(p => ({ ...p, poValue: e.target.value }))} /></Field>
                    <Field label="PO attachment"><input style={s.fieldInput} placeholder="PO attachment filename" value={procurementForm.poAttachmentName || ''} onChange={e => setProcurementForm(p => ({ ...p, poAttachmentName: e.target.value }))} /></Field>
                    <Field label="PO status">
                      <SelectField style={s.fieldInput} value={procurementForm.poStatus || ''} onChange={v => setProcurementForm(p => ({ ...p, poStatus: v }))} options={['Draft', 'Created', 'Released', 'Uploaded']} placeholder="Select…" aria-label="PO status" />
                    </Field>
                  </div>
                  {canEdit('capex.procurement') && (
                    <div><button type="button" style={s.primaryBtn} onClick={handleSaveProcurement}>Save Procurement</button></div>
                  )}
              </section>

              <section id="capex-sec-execution" style={s.dCard}>
                  <h4 style={s.detailTitle}>Project Execution</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(selectedRequest.milestones || []).map((m) => (
                      <div key={m.id} style={s.compactRow}>
                        <span>{m.stageName} - {m.milestoneName}</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge status={m.status} />
                          {canEdit('capex.requests') && m.status !== 'Completed' && <button type="button" style={s.miniBtn} onClick={() => handleCompleteMilestone(m)}>Complete</button>}
                        </span>
                      </div>
                    ))}
                  </div>
                  {canEdit('capex.requests') && <form onSubmit={handleAddMilestone} style={s.lifecycleGrid}>
                    <Field label="Stage"><input style={s.fieldInput} placeholder="Stage" value={milestoneForm.stageName} onChange={e => setMilestoneForm(p => ({ ...p, stageName: e.target.value }))} /></Field>
                    <Field label="Milestone"><input style={s.fieldInput} placeholder="Milestone" value={milestoneForm.milestoneName} onChange={e => setMilestoneForm(p => ({ ...p, milestoneName: e.target.value }))} /></Field>
                    <Field label="Planned date"><DateField style={s.fieldInput} value={milestoneForm.plannedDate} onChange={v => setMilestoneForm(p => ({ ...p, plannedDate: v }))} /></Field>
                    <Field label="Payment %"><input style={s.fieldInput} type="number" placeholder="Payment %" value={milestoneForm.paymentPercentage} onChange={e => setMilestoneForm(p => ({ ...p, paymentPercentage: e.target.value }))} /></Field>
                    <Field label="Payment amount (OMR)"><input style={s.fieldInput} type="number" placeholder="Payment amount" value={milestoneForm.paymentAmount} onChange={e => setMilestoneForm(p => ({ ...p, paymentAmount: e.target.value }))} /></Field>
                    <Field label="Evidence filename"><input style={s.fieldInput} placeholder="Evidence filename" value={milestoneForm.completionEvidence} onChange={e => setMilestoneForm(p => ({ ...p, completionEvidence: e.target.value }))} /></Field>
                    <div><button style={s.primaryBtn} type="submit">Add Milestone</button></div>
                  </form>}

              </section>

              <section id="capex-sec-financial" style={s.dCard}>
                  <h4 style={s.detailTitle}>Financial Closure</h4>
                  <div style={s.lifecycleGrid}>
                    <Field label="Actual spend (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={closureForm.actualSpend} onChange={e => setClosureForm(p => ({ ...p, actualSpend: e.target.value }))} /></Field>
                    <Field label="Final ROI"><input style={s.fieldInput} placeholder="Final ROI" value={closureForm.finalRoi} onChange={e => setClosureForm(p => ({ ...p, finalRoi: e.target.value }))} /></Field>
                    <Field label="Final savings (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={closureForm.finalSavings} onChange={e => setClosureForm(p => ({ ...p, finalSavings: e.target.value }))} /></Field>
                    <Field label="CAPEX closure form"><input style={s.fieldInput} placeholder="CAPEX closure form" value={closureForm.capexFormAttachment} onChange={e => setClosureForm(p => ({ ...p, capexFormAttachment: e.target.value }))} /></Field>
                    <Field label="Finance comments" full><input style={s.fieldInput} placeholder="Finance comments" value={closureForm.financeComments} onChange={e => setClosureForm(p => ({ ...p, financeComments: e.target.value }))} /></Field>
                  </div>
                  {canEdit('capex.finance') && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button type="button" style={s.warnBtn} onClick={() => handleSaveClosure(false)}>Save Closure Draft</button>
                      <button type="button" style={s.primaryBtn} onClick={() => handleSaveClosure(true)}>Close Request</button>
                    </div>
                  )}
              </section>

              <section id="capex-sec-auc" style={s.dCard}>
                  <h4 style={s.detailTitle}>AUC, Capitalization & PO Closure</h4>

                  <div style={s.dSubLabel}>Asset under construction (AUC)</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="AUC account"><input style={s.fieldInput} placeholder="AUC account" value={aucForm.aucAccount} onChange={e => setAucForm(p => ({ ...p, aucAccount: e.target.value }))} /></Field>
                    <Field label="AUC value (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={aucForm.aucValue} onChange={e => setAucForm(p => ({ ...p, aucValue: e.target.value }))} /></Field>
                    <Field label="AUC start date"><DateField style={s.fieldInput} value={aucForm.aucStartDate} onChange={v => setAucForm(p => ({ ...p, aucStartDate: v }))} /></Field>
                    <Field label="AUC status">
                      <SelectField style={s.fieldInput} value={aucForm.status} onChange={v => setAucForm(p => ({ ...p, status: v }))} options={['Open', 'In Review', 'Capitalized']} aria-label="AUC status" />
                    </Field>
                    <Checkbox style={s.checkInline} checked={aucForm.capitalizationReady} onChange={c => setAucForm(p => ({ ...p, capitalizationReady: c }))} label="Capitalization ready" />
                  </div>
                  {canEdit('capex.finance') && <div><button type="button" style={s.primaryBtn} onClick={handleSaveAuc}>Save AUC</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>Capitalization</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="Capitalization status">
                      <SelectField style={s.fieldInput} value={capitalizationForm.status} onChange={v => setCapitalizationForm(p => ({ ...p, status: v }))} options={['Not Started', 'Ready', 'Pending Approval', 'In Progress', 'Capitalized']} aria-label="Capitalization status" />
                    </Field>
                    <Field label="Asset master number"><input style={s.fieldInput} placeholder="Asset master number" value={capitalizationForm.assetMasterNumber} onChange={e => setCapitalizationForm(p => ({ ...p, assetMasterNumber: e.target.value }))} /></Field>
                    <Field label="Asset category"><input style={s.fieldInput} placeholder="Asset category" value={capitalizationForm.assetCategory} onChange={e => setCapitalizationForm(p => ({ ...p, assetCategory: e.target.value }))} /></Field>
                    <Field label="Capitalized value (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={capitalizationForm.capitalizedValue} onChange={e => setCapitalizationForm(p => ({ ...p, capitalizedValue: e.target.value }))} /></Field>
                    <Field label="Capitalization request date"><DateField style={s.fieldInput} value={capitalizationForm.capitalizationRequestDate} onChange={v => setCapitalizationForm(p => ({ ...p, capitalizationRequestDate: v }))} /></Field>
                  </div>
                  {canEdit('capex.finance') && <div><button type="button" style={s.primaryBtn} onClick={handleSaveCapitalization}>Save Capitalization</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>PO closure</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="Closure status">
                      <SelectField style={s.fieldInput} value={poClosureForm.closureStatus} onChange={v => setPoClosureForm(p => ({ ...p, closureStatus: v }))} options={['Open', 'In Progress', 'Closed']} aria-label="Closure status" />
                    </Field>
                    <Field label="Open commitment (OMR)"><input style={s.fieldInput} type="number" placeholder="Open commitment" value={poClosureForm.openCommitmentValue} onChange={e => setPoClosureForm(p => ({ ...p, openCommitmentValue: e.target.value }))} /></Field>
                    <Field label="Unutilized commitment (OMR)"><input style={s.fieldInput} type="number" placeholder="Unutilized commitment" value={poClosureForm.unutilizedCommitment} onChange={e => setPoClosureForm(p => ({ ...p, unutilizedCommitment: e.target.value }))} /></Field>
                    <Field label="Closure due date"><DateField style={s.fieldInput} value={poClosureForm.closureDueDate} onChange={v => setPoClosureForm(p => ({ ...p, closureDueDate: v }))} /></Field>
                    <Checkbox style={s.checkInline} checked={poClosureForm.finalInvoiceReceived} onChange={c => setPoClosureForm(p => ({ ...p, finalInvoiceReceived: c }))} label="Final invoice" />
                  </div>
                  {canEdit('capex.closure') && <div><button type="button" style={s.primaryBtn} onClick={handleSavePoClosure}>Save PO Closure</button></div>}
              </section>

              <section id="capex-sec-checklist" style={s.dCard}>
                  <h4 style={s.detailTitle}>Closure Checklist</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(selectedRequest.closureChecklist || []).map(item => (
                      <div key={item.id} style={s.compactRow}>
                        <span>{item.label}</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge status={item.status} />
                          {canEdit('capex.closure') && item.status !== 'Completed' && <button type="button" style={s.miniBtn} onClick={() => handleChecklistStatus(item, 'Completed')}>Done</button>}
                        </span>
                      </div>
                    ))}
                  </div>

              </section>

              <section id="capex-sec-governance" style={s.dCard}>
                  <h4 style={s.detailTitle}>MOA, Variation & Decision Gates</h4>
                  <div style={s.dGroupHead}>
                    <div style={{ ...s.dSubLabel, margin: 0 }}>Memorandum of agreement</div>
                    {canCreate('capex.moa') && <button type="button" style={s.dAddBtn} onClick={() => setShowMoaModal(true)}>+ Add MOA</button>}
                  </div>
                  <DataTable
                    columns={[
                      { key: 'moaNumber', label: 'MOA' },
                      { key: 'approvalStatus', label: 'Status', render: v => <Badge status={v} /> },
                      { key: 'matrixValidated', label: 'Matrix', render: v => v ? 'Valid' : 'Review' },
                    ]}
                    rows={selectedRequest.moaRecords || []}
                    emptyMsg="No MOA records."
                  />

                  <div style={s.dDivider} />
                  <div style={s.dGroupHead}>
                    <div style={{ ...s.dSubLabel, margin: 0 }}>Budget variation</div>
                    {canCreate('capex.variations') && <button type="button" style={s.dAddBtn} onClick={() => setShowVariationModal(true)}>+ Create variation</button>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {!(selectedRequest.budgetVariations || []).length && <p style={s.detailText}>No budget variations raised.</p>}
                    {(selectedRequest.budgetVariations || []).map(v => (
                      <div key={v.id} style={s.compactRow}>
                        <span>
                          {v.variationType}: {fmtOMR(Number(v.originalBudget || 0))} → {fmtOMR(Number(v.revisedBudget || 0))}
                          {' '}({Number(v.variationPercent || 0).toFixed(1)}%){v.moaApprovalRequired ? ' · MOA required' : ''}
                          {' '}· requested by {v.requestedBy}
                        </span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge status={v.approvalStatus} />
                          {canEdit('capex.approvals') && v.approvalStatus === 'Pending' && (
                            <>
                              <button type="button" style={s.miniBtn} onClick={() => handleVariationDecision(v.id, 'Approved')}>Approve</button>
                              <button type="button" style={s.miniBtn} onClick={() => handleVariationDecision(v.id, 'Rejected')}>Reject</button>
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>Decision gates</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(selectedRequest.decisionGates || []).map(gate => (
                      <div key={gate.gateKey} style={s.compactRow}>
                        <span>{gate.gateName}</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge status={gate.status} />
                          {canEdit('capex.approvals') && gate.status !== 'Passed' && <button type="button" style={s.miniBtn} onClick={() => handleDecisionGate(gate)}>Pass</button>}
                        </span>
                      </div>
                    ))}
                  </div>
              </section>

              <section id="capex-sec-performance" style={s.dCard}>
                  <h4 style={s.detailTitle}>Procurement Performance, Benefits & Risk</h4>

                  <div style={s.dSubLabel}>Procurement KPIs</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="RFQ issued"><DateField style={s.fieldInput} value={procPerfForm.rfqIssuedAt} onChange={v => setProcPerfForm(p => ({ ...p, rfqIssuedAt: v }))} /></Field>
                    <Field label="Tender completed"><DateField style={s.fieldInput} value={procPerfForm.tenderCompletedAt} onChange={v => setProcPerfForm(p => ({ ...p, tenderCompletedAt: v }))} /></Field>
                    <Field label="Vendor responses"><input style={s.fieldInput} type="number" placeholder="0" value={procPerfForm.vendorResponseCount} onChange={e => setProcPerfForm(p => ({ ...p, vendorResponseCount: e.target.value }))} /></Field>
                    <Field label="Invited vendors"><input style={s.fieldInput} type="number" placeholder="0" value={procPerfForm.invitedVendorCount} onChange={e => setProcPerfForm(p => ({ ...p, invitedVendorCount: e.target.value }))} /></Field>
                    <Field label="Budget estimate (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={procPerfForm.budgetEstimate} onChange={e => setProcPerfForm(p => ({ ...p, budgetEstimate: e.target.value }))} /></Field>
                    <Field label="Awarded value (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={procPerfForm.awardedValue} onChange={e => setProcPerfForm(p => ({ ...p, awardedValue: e.target.value }))} /></Field>
                  </div>
                  {canEdit('capex.procurement') && <div><button type="button" style={s.primaryBtn} onClick={handleSaveProcurementPerformance}>Save Procurement KPIs</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>Benefit review</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="Review period">
                      <SelectField style={s.fieldInput} value={String(benefitForm.reviewPeriodMonths)} onChange={v => setBenefitForm(p => ({ ...p, reviewPeriodMonths: Number(v) }))} options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: '24', label: '24 months' }]} aria-label="Review period" />
                    </Field>
                    <Field label="Actual ROI %"><input style={s.fieldInput} type="number" placeholder="0" value={benefitForm.actualRoi} onChange={e => setBenefitForm(p => ({ ...p, actualRoi: e.target.value }))} /></Field>
                    <Field label="Actual savings (OMR)"><input style={s.fieldInput} type="number" placeholder="0" value={benefitForm.actualSavings} onChange={e => setBenefitForm(p => ({ ...p, actualSavings: e.target.value }))} /></Field>
                    <Field label="Status">
                      <SelectField style={s.fieldInput} value={benefitForm.status} onChange={v => setBenefitForm(p => ({ ...p, status: v }))} options={['Planned', 'In Review', 'Completed']} aria-label="Benefit status" />
                    </Field>
                  </div>
                  {canEdit('capex.finance') && <div><button type="button" style={s.primaryBtn} onClick={handleSaveBenefitReview}>Save Benefit Review</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.dGroupHead}>
                    <div style={{ ...s.dSubLabel, margin: 0 }}>Risk register</div>
                    {canCreate('capex.risks') && <button type="button" style={s.dAddBtn} onClick={() => setShowRiskModal(true)}>+ Add risk</button>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {!(selectedRequest.risks || []).length && <p style={s.detailText}>No risks recorded.</p>}
                    {(selectedRequest.risks || []).map(r => (
                      <div key={r.id} style={s.compactRow}>
                        <span>
                          <strong>{r.title}</strong>
                          <span style={{ color: 'var(--label-quaternary)' }}> · {r.category}</span>
                        </span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge status={r.severity} />
                          <Badge status={r.status} />
                        </span>
                      </div>
                    ))}
                  </div>
              </section>

              <section id="capex-sec-documents" style={s.dCard}>
                  <h4 style={s.detailTitle}>Document Versioning & Signatures</h4>

                  <div style={s.dSubLabel}>Document version</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="Document name"><input style={s.fieldInput} placeholder="Document name" value={docVersionForm.documentName} onChange={e => setDocVersionForm(p => ({ ...p, documentName: e.target.value }))} /></Field>
                    <Field label="Version"><input style={s.fieldInput} placeholder="Version" value={docVersionForm.versionLabel} onChange={e => setDocVersionForm(p => ({ ...p, versionLabel: e.target.value }))} /></Field>
                    <Field label="Changelog" full><input style={s.fieldInput} placeholder="What changed in this version" value={docVersionForm.changelog} onChange={e => setDocVersionForm(p => ({ ...p, changelog: e.target.value }))} /></Field>
                  </div>
                  {canCreate('capex.documents') && <div><button type="button" style={s.primaryBtn} onClick={handleCreateDocumentVersion}>Save Version</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>Signature</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="Linked to">
                      <SelectField style={s.fieldInput} value={signatureForm.linkedType} onChange={v => setSignatureForm(p => ({ ...p, linkedType: v }))} options={['MOA', 'Approval', 'Closure']} aria-label="Linked to" />
                    </Field>
                    <Field label="Linked ID (optional)"><input style={s.fieldInput} placeholder="Linked ID (optional)" value={signatureForm.linkedId} onChange={e => setSignatureForm(p => ({ ...p, linkedId: e.target.value }))} /></Field>
                    <Field label="Decision">
                      <SelectField style={s.fieldInput} value={signatureForm.decision} onChange={v => setSignatureForm(p => ({ ...p, decision: v }))} options={['Signed', 'Approved', 'Acknowledged']} aria-label="Decision" />
                    </Field>
                  </div>
                  {canCreate('capex.documents') && <div><button type="button" style={s.primaryBtn} onClick={handleCreateSignature}>Capture Signature</button></div>}
              </section>

              <section id="capex-sec-audit" style={s.dCard}>
                  <h4 style={s.detailTitle}>Audit History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {auditLogs.length ? auditLogs.map(log => (
                      <div key={log.id} style={s.compactRow}>
                        <span>{log.message}</span>
                        <span style={{ color: 'var(--label-secondary)' }}>{log.actor}</span>
                      </div>
                    )) : <p style={s.detailText}>No audit events recorded yet.</p>}
                  </div>
              </section>
            </div>
          </div>

          {showMoaModal && (
            <Modal title="Add MOA" subtitle="Create a memorandum of agreement for this request." onClose={() => setShowMoaModal(false)}>
              <div style={s.lifecycleGrid}>
                <input style={s.compactInput} placeholder="MOA number" value={moaForm.moaNumber} onChange={e => setMoaForm(p => ({ ...p, moaNumber: e.target.value }))} />
                <input style={s.compactInput} placeholder="MOA title" value={moaForm.title} onChange={e => setMoaForm(p => ({ ...p, title: e.target.value }))} />
                <input style={s.compactInput} placeholder="Authority" value={moaForm.approvalAuthority} onChange={e => setMoaForm(p => ({ ...p, approvalAuthority: e.target.value }))} />
                <SelectField style={s.compactInput} value={moaForm.approvalStatus} onChange={v => setMoaForm(p => ({ ...p, approvalStatus: v }))} options={['Draft', 'Pending', 'Approved', 'Active']} aria-label="MOA approval status" />
                <DateField style={{ ...s.compactInput, gridColumn: '1 / -1' }} value={moaForm.expiryDate} onChange={v => setMoaForm(p => ({ ...p, expiryDate: v }))} />
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.secondaryBtn} onClick={() => setShowMoaModal(false)}>Cancel</button>
                {canCreate('capex.moa') && <button type="button" style={s.primaryBtn} onClick={submitMoaModal}>Save MOA</button>}
              </div>
            </Modal>
          )}

          {showVariationModal && (
            <Modal title="Create variation" subtitle="Raise a change to the approved budget." onClose={() => setShowVariationModal(false)}>
              <div style={s.lifecycleGrid}>
                <input style={s.compactInput} type="number" placeholder="Original budget (OMR)" value={variationForm.originalBudget} onChange={e => setVariationForm(p => ({ ...p, originalBudget: e.target.value }))} />
                <input style={s.compactInput} type="number" placeholder="Revised budget (OMR)" value={variationForm.revisedBudget} onChange={e => setVariationForm(p => ({ ...p, revisedBudget: e.target.value }))} />
                <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Variation justification" value={variationForm.justification} onChange={e => setVariationForm(p => ({ ...p, justification: e.target.value }))} />
                <input style={{ ...s.compactInput, gridColumn: '1 / -1' }} placeholder="Financial impact analysis" value={variationForm.financialImpactAnalysis} onChange={e => setVariationForm(p => ({ ...p, financialImpactAnalysis: e.target.value }))} />
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.secondaryBtn} onClick={() => setShowVariationModal(false)}>Cancel</button>
                {canCreate('capex.variations') && <button type="button" style={s.primaryBtn} onClick={submitVariationModal}>Create Variation</button>}
              </div>
            </Modal>
          )}

          {showRiskModal && (
            <Modal title="Add risk" subtitle="Record a project risk with severity and mitigation." onClose={() => setShowRiskModal(false)}>
              <div style={s.lifecycleGrid}>
                <Field label="Category">
                  <SelectField style={s.fieldInput} value={riskForm.category} onChange={v => setRiskForm(p => ({ ...p, category: v }))} options={['Budget Risk', 'Schedule Risk', 'Vendor Risk', 'HSE Risk', 'Capitalization Risk', 'Operational Risk']} aria-label="Risk category" />
                </Field>
                <Field label="Severity">
                  <SelectField style={s.fieldInput} value={riskForm.severity} onChange={v => setRiskForm(p => ({ ...p, severity: v }))} options={['Green', 'Amber', 'Red']} aria-label="Risk severity" />
                </Field>
                <Field label="Risk title" full><input style={s.fieldInput} placeholder="Risk title" value={riskForm.title} onChange={e => setRiskForm(p => ({ ...p, title: e.target.value }))} /></Field>
                <Field label="Mitigation plan" full><input style={s.fieldInput} placeholder="Mitigation plan" value={riskForm.mitigationPlan} onChange={e => setRiskForm(p => ({ ...p, mitigationPlan: e.target.value }))} /></Field>
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.secondaryBtn} onClick={() => setShowRiskModal(false)}>Cancel</button>
                {canCreate('capex.risks') && <button type="button" style={s.primaryBtn} onClick={submitRiskModal}>Add Risk</button>}
              </div>
            </Modal>
          )}

          {canEdit('capex.approvals') && selectedRequest.currentStepId && (
            <div style={s.actionBar}>
              <span style={s.actionBarLabel}>
                {(() => {
                  const step = (selectedRequest.approvalSteps || []).find((st) => st.id === selectedRequest.currentStepId);
                  return step ? `Step ${step.stepOrder}: ${step.label}` : 'Awaiting your decision';
                })()}
              </span>
              <input
                style={{ ...s.compactInput, minWidth: 220 }}
                placeholder="Delegate current step to (name or email)"
                value={delegateTo}
                onChange={e => setDelegateTo(e.target.value)}
              />
              <button type="button" style={s.warnBtn} onClick={handleDelegateStep} disabled={!delegateTo.trim()}>Delegate</button>
              <button type="button" style={s.warnBtn} onClick={() => handleCapexDecision('RETURNED')}>Return</button>
              <button type="button" style={s.dangerBtn} onClick={() => handleCapexDecision('REJECTED')}>Reject</button>
              <button type="button" style={s.primaryBtn} onClick={() => handleCapexDecision('APPROVED')}>Approve Step</button>
            </div>
          )}
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
              <button type="button" style={s.primaryBtn} onClick={() => refreshGovernance()}>Refresh</button>
            </div>
          </div>

          <div style={s.cardRow}>
            <SummaryCard label="Approved Budget" value={fmtOMR(governance?.portfolio?.approvedBudget || 0)} color="var(--label)" sub={`${governance?.portfolio?.totalProjects || 0} projects`} />
            <SummaryCard label="Forecast Spend" value={fmtOMR(governance?.portfolio?.forecastSpend || 0)} color="var(--shell-red)" sub={`${governance?.portfolio?.budgetUtilizationPercent || 0}% utilized`} />
            <SummaryCard label="Open AUC" value={fmtOMR(governance?.auc?.totalValue || 0)} color="var(--warning)" sub={`${governance?.auc?.agedOver180Days || 0} over 180 days`} />
            <SummaryCard label="Red Risks" value={governance?.risk?.redRisks || 0} color="var(--shell-red)" sub={`${governance?.generatedAlerts?.length || 0} alerts`} />
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
              <div style={s.sectionHead}>
                <h3 style={s.sectionTitle}>Scheduled Reports</h3>
                {canCreate('capex.reports') && (
                  <button type="button" style={s.dAddBtn} onClick={() => setShowScheduleModal(true)}>+ Add schedule</button>
                )}
              </div>
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

            {showScheduleModal && (
              <Modal title="Add schedule" subtitle="Schedule a recurring CAPEX governance report." onClose={() => setShowScheduleModal(false)}>
                <div style={s.lifecycleGrid}>
                  <Field label="Report name" full><input style={s.fieldInput} placeholder="Report name" value={scheduleForm.reportName} onChange={e => setScheduleForm(p => ({ ...p, reportName: e.target.value }))} /></Field>
                  <Field label="Report type">
                    <SelectField style={s.fieldInput} value={scheduleForm.reportType} onChange={v => setScheduleForm(p => ({ ...p, reportType: v }))} options={['governance', 'auc', 'po-closure', 'moa-compliance', 'benefits']} aria-label="Report type" />
                  </Field>
                  <Field label="Audience"><input style={s.fieldInput} placeholder="e.g. CEO/CFO" value={scheduleForm.audience} onChange={e => setScheduleForm(p => ({ ...p, audience: e.target.value }))} /></Field>
                  <Field label="Frequency">
                    <SelectField style={s.fieldInput} value={scheduleForm.frequency} onChange={v => setScheduleForm(p => ({ ...p, frequency: v }))} options={['Weekly', 'Monthly', 'Quarterly']} aria-label="Frequency" />
                  </Field>
                  <Field label="Format">
                    <SelectField style={s.fieldInput} value={scheduleForm.format} onChange={v => setScheduleForm(p => ({ ...p, format: v }))} options={['PDF', 'CSV', 'XLSX']} aria-label="Format" />
                  </Field>
                  <Field label="Next run date"><DateField style={s.fieldInput} value={scheduleForm.nextRunDate} onChange={v => setScheduleForm(p => ({ ...p, nextRunDate: v }))} /></Field>
                  <Field label="Recipients (comma separated)" full><input style={s.fieldInput} placeholder="name@shell.com, ..." value={scheduleForm.recipients} onChange={e => setScheduleForm(p => ({ ...p, recipients: e.target.value }))} /></Field>
                </div>
                <div style={s.modalFoot}>
                  <button type="button" style={s.secondaryBtn} onClick={() => setShowScheduleModal(false)}>Cancel</button>
                  {canCreate('capex.reports') && <button type="button" style={s.primaryBtn} onClick={submitScheduleModal}>Add Schedule</button>}
                </div>
              </Modal>
            )}
          </div>

          <div style={s.section}>
            <div style={s.sectionHead}>
              <h3 style={s.sectionTitle}>Dashboard Drill-Down</h3>
              <SelectField style={s.compactInput} value={drilldownType} onChange={handleDrilldownChange} options={['businessUnit', 'aucAging', 'moaCompliance', 'risks', 'variations', 'procurementPerformance', 'decisionGates']} aria-label="Drill-down type" />
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
              <button type="button" style={s.primaryBtn} onClick={handleSaveThresholds}>Save Thresholds</button>
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
                  render: (v, row) => <Checkbox checked={!!v} onChange={c => handleWorkflowRuleChange(row, 'isActive', c)} aria-label="Active" />
                },
                { key: 'id', label: 'Action',
                  render: (_, row) => canEdit('capex.admin') ? <button type="button" style={s.miniBtn} onClick={() => handleSaveWorkflowRule(row)}>Save</button> : '-'
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
              <button type="button"
                style={{ ...s.primaryBtn, background: 'var(--surface)', color: 'var(--shell-red)', border: '1px solid rgba(221,29,33,0.30)', boxShadow: 'none' }}
                onClick={() => setShowBudgetUpload(true)}
              >
                ↑ Upload Approved Budget
              </button>
              )}
              {canCreate('capex.initiations') && !showInitForm && (
                <button type="button" style={s.primaryBtn} onClick={() => setShowInitForm(true)}>+ New Initiation</button>
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
                { key: 'priority',         label: 'Priority', render: (v) => <Badge status={v} /> },
                { key: 'status',           label: 'Status',   render: (v) => <Badge status={v} /> },
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
    background: 'var(--gray-50)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
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
    background: 'var(--danger-bg)', border: '1px solid var(--danger)',
    color: 'var(--danger)', padding: '12px 20px', borderRadius: 'var(--radius-sm)', marginBottom: 12,
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
    border: '1px solid var(--gray-200)',
    borderLeft: '5px solid var(--shell-red)',
    borderRadius: 'var(--radius-md)',
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
    border: '1px solid var(--accent-amber-line)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--gray-800)',
    fontSize: 12,
    fontWeight: 900,
  },
  brandText: {
    color: 'var(--gray-600)',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  heading:    { margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--label)' },
  subheading: { margin: '6px 0 0', fontSize: 14, color: 'var(--label-secondary)', maxWidth: 760 },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 12 },
  syncBadge: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'var(--gray-50)', border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-pill)', padding: '7px 12px',
    fontSize: 12, fontWeight: 700, color: 'var(--gray-600)',
  },
  syncDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  refreshBtn: {
    padding: '8px 16px', background: '#FFFFFF',
    border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 800, cursor: 'pointer', color: 'var(--gray-700)',
  },
  commandBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  commandItem: {
    background: '#FFFFFF',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    padding: '13px 16px',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },
  commandLabel: {
    display: 'block',
    color: 'var(--gray-500)',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  commandValue: {
    display: 'block',
    color: 'var(--label)',
    fontSize: 15,
    marginTop: 2,
  },

  tabBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    background: '#FFFFFF',
    border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-md)',
    padding: 4,
    marginBottom: 18,
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
  },
  tabBtn: {
    padding: '9px 16px', border: 'none',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    fontSize: 13, fontWeight: 800, color: 'var(--label-secondary)',
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
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
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
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    padding: '22px',
    marginBottom: 18,
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
  },
  sectionHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  sectionTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 850, color: 'var(--label)' },

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
  tabSubtitle: { margin: '4px 0 0', fontSize: 13, color: 'var(--label-secondary)' },
  primaryBtn: {
    padding: '9px 18px', background: 'var(--shell-red)',
    border: '1px solid var(--shell-red-dark)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 850, color: '#fff', cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15,23,42,0.08)', flexShrink: 0,
  },
  secondaryBtn: {
    padding: '9px 14px', background: '#FFFFFF',
    border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 800, color: 'var(--gray-700)', cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)', flexShrink: 0,
  },
  warnBtn: {
    padding: '9px 14px', background: 'var(--accent-amber-bg)',
    border: '1px solid var(--accent-amber-line)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 800, color: 'var(--accent-amber-text)', cursor: 'pointer',
  },
  dangerBtn: {
    padding: '9px 14px', background: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-line)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 800, color: 'var(--shell-red-dark)', cursor: 'pointer',
  },
  linkBtn: {
    background: 'transparent', border: 'none', padding: 0,
    color: 'var(--shell-red)', fontWeight: 700, cursor: 'pointer',
    textAlign: 'left', font: 'inherit',
  },
  miniInfo: {
    background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-sm)', padding: '11px 12px',
  },
  miniLabel: {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  miniValue: { display: 'block', marginTop: 4, fontSize: 13, color: 'var(--label)' },
  detailTitle: { margin: '4px 0 12px', fontSize: 15, fontWeight: 800, color: 'var(--label)', letterSpacing: '-.005em' },
  detailText: { margin: '0 0 4px', fontSize: 13.5, color: 'var(--gray-600)', lineHeight: 1.55 },
  compactRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    background: '#FFFFFF', border: '1px solid var(--separator-clear)',
    borderRadius: 'var(--radius-md)', padding: '11px 14px', fontSize: 13.5,
  },
  lifecycleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 14, marginBottom: 14,
  },
  compactInput: {
    border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
    padding: '10px 12px', fontSize: 13, color: 'var(--label)',
    background: '#FFFFFF', fontFamily: 'inherit', minWidth: 0,
  },
  miniBtn: {
    padding: '5px 8px', border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)', background: '#FFFFFF',
    color: 'var(--gray-700)', fontSize: 11, fontWeight: 800, cursor: 'pointer',
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

  reqToolbar: {
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16,
  },
  reqSearch: {
    flex: '1 1 280px', minWidth: 220,
    border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)',
    padding: '9px 12px', fontSize: 13, color: 'var(--label)',
    background: '#FFFFFF', fontFamily: 'inherit',
  },
  reqFilter: {
    border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)',
    padding: '9px 10px', fontSize: 13, color: 'var(--label)',
    background: '#FFFFFF', fontFamily: 'inherit', cursor: 'pointer',
  },
  reqCount: { marginLeft: 'auto', fontSize: 12, color: 'var(--gray-500)', fontWeight: 700, whiteSpace: 'nowrap' },
  rowTitleBtn: {
    background: 'transparent', border: 'none', padding: 0,
    color: 'var(--label)', fontWeight: 800, cursor: 'pointer',
    textAlign: 'left', font: 'inherit',
  },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', background: '#FFFFFF',
    border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 800, color: 'var(--gray-700)', cursor: 'pointer',
    marginBottom: 14,
  },
  actionBar: {
    position: 'sticky', bottom: 12, zIndex: 6,
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
    background: '#FFFFFF', border: '1px solid var(--gray-200)',
    boxShadow: '0 -2px 12px rgba(16,24,40,0.08)',
    padding: '14px 20px', marginTop: 18,
    borderRadius: 'var(--radius-md)',
  },
  actionBarLabel: { fontSize: 13, fontWeight: 800, color: 'var(--label)', marginRight: 'auto' },

  // ── Detail redesign (CapexRail handoff) ──────────────────────────────────
  dHeaderCard: {
    background: '#FFFFFF', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
    padding: '24px 26px', marginBottom: 18,
    boxShadow: '0 1px 3px rgba(16,24,40,0.05)',
    display: 'flex', flexDirection: 'column', gap: 22,
  },
  dEyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: 'var(--label-quaternary)', textTransform: 'uppercase', marginBottom: 5 },
  dTitle: { fontSize: 25, fontWeight: 800, margin: '0 0 6px', color: 'var(--label)', letterSpacing: '-.01em' },
  dMeta: { fontSize: 14, color: 'var(--neutral)', fontWeight: 500 },
  dStatGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 },
  dStatTile: { background: 'var(--gray-50)', border: '1px solid var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '13px 15px' },
  dStatLabel: { fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: 'var(--label-quaternary)', textTransform: 'uppercase' },
  dStatValue: { fontSize: 17, fontWeight: 800, marginTop: 4, color: 'var(--label)' },
  dTwoPane: { display: 'grid', gridTemplateColumns: '212px minmax(0,1fr)', gap: 20, alignItems: 'start' },
  dNavRail: {
    position: 'sticky', top: 12, alignSelf: 'start',
    display: 'flex', flexDirection: 'column', gap: 6,
    background: '#FFFFFF', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
    padding: '14px 12px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
  },
  dNavRailHead: { fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: 'var(--label-quaternary)', textTransform: 'uppercase', padding: '4px 10px 8px' },
  dNavItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 'var(--radius-md)', fontSize: 13.5, fontWeight: 500,
    color: 'var(--gray-600)', cursor: 'pointer', textDecoration: 'none',
  },
  dNavItemActive: { background: 'var(--accent-red-bg)', color: 'var(--shell-red)', fontWeight: 700 },
  dNavDot: { width: 7, height: 7, borderRadius: '50%', flex: '0 0 auto' },
  dCardCol: { display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 },
  dSubLabel: { fontSize: 12, fontWeight: 800, color: 'var(--neutral)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 12px' },
  dSubNote: { fontSize: 12.5, color: 'var(--label-quaternary)', margin: '-6px 0 12px', fontWeight: 500 },
  dDivider: { height: 1, background: 'var(--separator-clear)', margin: '20px 0 18px' },
  dGroupHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  checkInline: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--label)', minHeight: 40, cursor: 'pointer' },
  fieldInput: fieldInputStyle,
  dAddBtn: {
    height: 34, padding: '0 14px', border: '1px dashed var(--gray-300)', borderRadius: 'var(--radius-md)',
    background: '#FFFFFF', color: 'var(--gray-600)', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
  },
  modalFoot: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  dCard: {
    background: '#FFFFFF', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
    padding: '22px 24px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
    scrollMarginTop: 16,
  },
  stepper: {
    display: 'flex', alignItems: 'flex-start',
    overflowX: 'auto', padding: '4px 0 2px',
  },
  stepCell: {
    flex: '1 1 0', minWidth: 130,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    textAlign: 'center',
  },
  stepConnectorRow: { display: 'flex', alignItems: 'center', alignSelf: 'stretch' },
  stepConnector: { flex: 1, height: 2 },
  stepNode: {
    width: 34, height: 34, flex: '0 0 auto', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)',
    background: 'var(--gray-50)', color: 'var(--label-secondary)', border: '2px solid var(--gray-200)',
    fontSize: 15, fontWeight: 800,
  },
  stepNodeDone: { background: 'var(--success-bg)', color: 'var(--success)', border: '2px solid var(--success-bg)' },
  stepNodeCurrent: { background: 'var(--shell-red)', color: '#FFFFFF', border: '2px solid var(--shell-red)', boxShadow: '0 0 0 4px rgba(221,29,33,0.15)' },
  stepLabel: { color: 'var(--gray-600)', fontSize: 12, fontWeight: 600, lineHeight: 1.25, padding: '0 6px' },
  stepPill: { fontSize: 11, fontWeight: 700, borderRadius: 'var(--radius-pill)', padding: '2px 9px', whiteSpace: 'nowrap' },
  stepPillDone: { color: 'var(--success)', background: 'var(--success-bg)' },
  stepPillCurrent: { color: 'var(--accent-amber)', background: 'var(--accent-amber-bg)' },
  stepPillPending: { color: 'var(--neutral)', background: 'var(--gray-50)' },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#FFFFFF' },
  th: {
    padding: '11px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 850, color: 'var(--label-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.4px',
    borderBottom: '1px solid var(--separator)', whiteSpace: 'nowrap',
    background: 'var(--gray-50)',
  },
  td: {
    padding: '12px 14px', borderBottom: '1px solid var(--gray-100)',
    color: 'var(--label)', verticalAlign: 'middle',
  },
};
