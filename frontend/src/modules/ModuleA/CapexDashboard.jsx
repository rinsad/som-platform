import { useState, useEffect, useMemo, useRef, useId } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import { ArrowRight, CalendarClock, ChevronDown, CircleAlert, Download, Plus, RefreshCw } from 'lucide-react';
import {
  getDepartments, getSyncStatus, getGsapData,
  getInitiations, createInitiation,
  getCapexRequests, getCapexRequest, createCapexRequest, decideCapexRequest,
  updateCapexRequest, resubmitCapexRequest, delegateCapexStep, getCapexDelegateCandidates, decideCapexBudgetVariation,
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
import FileUploadField from '../../components/FileUploadField';
import Checkbox from '../../components/Checkbox';
import Badge from '../../components/Badge';
import { fieldInputStyle } from '../../components/fieldStyles';
import { USER_ROLES } from '../../services/usersService';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/toast';
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

const AUDIT_EVENT_LABELS = {
  REQUEST_SUBMITTED: 'Submitted',
  REQUEST_RETURNED: 'Returned for correction',
  REQUEST_REJECTED: 'Rejected',
  REQUEST_EDITED: 'Edited after return',
  REQUEST_RESUBMITTED: 'Resubmitted',
  APPROVAL_STEP_APPROVED: 'Approval step approved',
  APPROVAL_OVERRIDE: 'Admin override',
  STEP_DELEGATED: 'Delegated',
  STEP_ESCALATED: 'Escalated',
  PROCUREMENT_UPDATED: 'Procurement updated',
  PROCUREMENT_PERFORMANCE_UPDATED: 'Procurement performance updated',
  BUDGET_VARIATION_DECIDED: 'Budget variation decided',
  DECISION_GATE_UPDATED: 'Decision gate updated',
  MOA_UPDATED: 'MOA updated',
  MOA_REVISION_ADDED: 'MOA revision added',
  DOCUMENT_VERSIONED: 'Document versioned',
  E_SIGNATURE_CAPTURED: 'Electronic signature captured',
  ATTACHMENT_UPLOADED: 'Attachment uploaded',
};

function auditEventLabel(eventType) {
  return AUDIT_EVENT_LABELS[eventType] || String(eventType || 'Audit event').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function fmtDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function latestBenefitReview(reviews = []) {
  if (!Array.isArray(reviews) || !reviews.length) return null;
  return [...reviews].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.reviewedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.reviewedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  })[0];
}

function benefitFormFromReview(review, fallbackStatus = 'Planned') {
  return {
    reviewPeriodMonths: review?.reviewPeriodMonths ?? 6,
    plannedRoi: review?.plannedRoi ?? '',
    actualRoi: review?.actualRoi ?? '',
    plannedSavings: review?.plannedSavings ?? '',
    actualSavings: review?.actualSavings ?? '',
    benefitScore: review?.benefitScore ?? '',
    status: review?.status || fallbackStatus,
  };
}

function sortDateValue(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function requestSequenceValue(id) {
  const seq = String(id || '').split('-').pop();
  return Number(seq) || 0;
}

function currentApprovalStep(request) {
  const visibleSteps = (request?.approvalSteps || []).filter((st) => st.status !== 'Superseded');
  const stepIndex = visibleSteps.findIndex((st) => st.id === request?.currentStepId);
  const step = stepIndex >= 0 ? visibleSteps[stepIndex] : null;
  return {
    step,
    stepIndex,
    text: step ? `Step ${stepIndex + 1}: ${step.label}` : 'Awaiting your decision',
  };
}

const WORKFLOW_ROLE_ALIASES = {
  FiB: 'Finance in Business',
  'Line Manager': 'Manager',
  'Contract Holder / Owner': 'Project Owner',
  'Head of CP': 'CP Manager',
  'CP Manager / Head of CP': 'CP Manager',
  CP: 'CP Manager',
  EMT: 'CEO/Board',
  'Contract Board': 'CEO/Board',
};

function canonicalWorkflowRole(role) {
  const trimmed = String(role || '').trim();
  return WORKFLOW_ROLE_ALIASES[trimmed] || trimmed;
}

function userIdentityValues(user) {
  return [
    user?.email,
    user?.full_name,
    user?.fullName,
    user?.name,
  ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean);
}

function canUserDecideStep(user, step) {
  if (!step) return false;
  if (user?.role === 'Admin') return true;

  const assignedTo = String(step.assignedTo || '').trim().toLowerCase();
  if (assignedTo && userIdentityValues(user).includes(assignedTo)) return true;

  return canonicalWorkflowRole(user?.role) === canonicalWorkflowRole(step.approverRole);
}

const MILESTONE_CREATE_STATUSES = ['PO uploaded', 'In execution', 'Delayed'];

const WORKFLOW_ROLE_OPTIONS = [
  'Manager',
  'HSSE Focal',
  'Project Owner',
  'Finance in Business',
  'CP Lead',
  'CP Manager',
  'Business GM',
  'CFO',
  'CEO/Board',
];

const WORKFLOW_USER_ROLE_OPTIONS = USER_ROLES.filter(role => WORKFLOW_ROLE_OPTIONS.includes(role));

function canCreateMilestoneForStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return MILESTONE_CREATE_STATUSES.some(allowed => allowed.toLowerCase() === normalized);
}

const PROCUREMENT_EDITABLE_STATUSES = [
  'Approved',
  'Procurement in progress',
  'GSAP project created',
  'PR created',
  'PO created',
  'PO uploaded',
  'In execution',
  'Delayed',
];

const FINANCIAL_CLOSURE_EDITABLE_STATUSES = [
  'Approved',
  'Procurement in progress',
  'GSAP project created',
  'PR created',
  'PO created',
  'PO uploaded',
  'In execution',
  'Delayed',
  'Technically complete',
  'Physically complete',
  'Pending PO closure',
  'Pending AUC review',
  'Pending capitalization',
  'Pending asset handover',
  'Pending benefits review',
  'Pending final closure',
  'Closed',
];

const POST_PO_STATUSES = [
  'PO created',
  'PO uploaded',
  'In execution',
  'Delayed',
  'Technically complete',
  'Physically complete',
  'Pending PO closure',
  'Pending AUC review',
  'Pending capitalization',
  'Pending asset handover',
  'Pending benefits review',
  'Pending final closure',
];

const CAPITALIZATION_EDITABLE_STATUSES = [
  'Technically complete',
  'Physically complete',
  'Pending AUC review',
  'Pending capitalization',
  'Pending asset handover',
  'Pending benefits review',
  'Pending final closure',
];

function statusIn(status, allowedStatuses) {
  const normalized = String(status || '').trim().toLowerCase();
  return allowedStatuses.some(allowed => allowed.toLowerCase() === normalized);
}

function canEditProcurementForStatus(status) {
  return statusIn(status, PROCUREMENT_EDITABLE_STATUSES);
}

function canEditFinancialClosureForStatus(status) {
  return statusIn(status, FINANCIAL_CLOSURE_EDITABLE_STATUSES);
}

function canEditAucForStatus(status) {
  return statusIn(status, POST_PO_STATUSES);
}

function canEditCapitalizationForStatus(status) {
  return statusIn(status, CAPITALIZATION_EDITABLE_STATUSES);
}

function canEditPoClosureForStatus(status) {
  return statusIn(status, POST_PO_STATUSES);
}

function defaultApprovalRouteForBand(valueBand) {
  if (valueBand === 'LOW') return 'Project Lead + GM';
  if (valueBand === 'MEDIUM') return 'GM + CFO + EMT';
  if (valueBand === 'HIGH') return 'Contract Board';
  return '—';
}

function approvalRouteForValueBand(valueBand, processRef) {
  const row = (processRef?.approvalRoutes || []).find((route) => route.valueBand === valueBand);
  return row?.route || defaultApprovalRouteForBand(valueBand);
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

function defaultMoaFormForRequest(request) {
  return {
    moaNumber: '',
    title: request?.title ? `${request.title} MOA` : '',
    approvalAuthority: '',
    approvalStatus: 'Draft',
    projectValue: request?.estimatedValue || '',
    expiryDate: '',
    renewalRequired: false,
  };
}

function WorkflowRolePicker({ value = [], onChange }) {
  const selected = new Set(Array.isArray(value) ? value : []);
  const toggleRole = (role) => {
    const next = new Set(selected);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    onChange?.([...next]);
  };

  return (
    <div style={s.workflowRoleGrid}>
      {WORKFLOW_USER_ROLE_OPTIONS.map((role) => (
        <Checkbox
          key={role}
          checked={selected.has(role)}
          onChange={() => toggleRole(role)}
          label={role}
          style={{
            ...s.workflowRoleOption,
            ...(selected.has(role) ? s.workflowRoleOptionActive : {}),
          }}
          aria-label={`Allow ${role}`}
        />
      ))}
    </div>
  );
}

function SubmitFeedbackButton({
  state = 'idle',
  idleLabel,
  savingLabel = 'Saving',
  savedLabel = 'Saved',
  onClick,
  style,
  disabled = false,
}) {
  const isSaving = state === 'saving';
  const isSaved = state === 'saved';

  return (
    <button
      type="button"
      style={{
        ...style,
        ...(isSaving || disabled ? s.submitBtnDisabled : {}),
      }}
      onClick={onClick}
      disabled={isSaving || disabled}
      aria-busy={isSaving}
    >
      <span style={s.submitBtnInner}>
        {isSaving && <span style={s.inlineSpinner} aria-hidden="true" />}
        {isSaving ? savingLabel : isSaved ? savedLabel : idleLabel}
      </span>
    </button>
  );
}

function InlineTooltip({ content, children }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      style={s.tooltipWrap}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        style={s.tooltipTrigger}
        aria-label={content}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </button>
      {open && (
        <span id={tooltipId} role="tooltip" style={s.tooltipBubble}>
          {content}
        </span>
      )}
    </span>
  );
}

function SortableDateHeader({ label, sortKey, currentSort, onSort }) {
  const active = currentSort.key === sortKey;
  const direction = active ? currentSort.direction : 'desc';
  const arrowStyle = (arrowDirection) => ({
    ...s.sortArrow,
    ...(arrowDirection === 'asc' ? s.sortArrowUp : s.sortArrowDown),
    ...(active && direction === arrowDirection ? s.sortArrowActive : s.sortArrowIdle),
  });

  return (
    <button
      type="button"
      style={{ ...s.sortHeadBtn, ...(active ? s.sortHeadBtnActive : {}) }}
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label} ${active && direction === 'desc' ? 'ascending' : 'descending'}`}
    >
      <span>{label}</span>
      <span style={s.sortArrowStack} aria-hidden="true">
        <span style={arrowStyle('asc')} />
        <span style={arrowStyle('desc')} />
      </span>
    </button>
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
        const displayOrder = i + 1;
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
              <div style={node}>{isDone ? '✓' : displayOrder}</div>
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
  const navigate = useNavigate();
  const { requestId: routeRequestId } = useParams();
  const isRequestDetailRoute = Boolean(routeRequestId);
  const { role, canView, canCreate, canEdit } = usePermissions();

  const TABS = ALL_TABS.filter(t => {
    if (t.permKey && !canView(t.permKey)) return false;
    return true;
  });

  const [activeTab,      setActiveTab]      = useState(() => (routeRequestId ? 'requests' : (TABS[0]?.id || 'overview')));
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
  const [thresholdSaveState, setThresholdSaveState] = useState('idle');
  const [workflowSaveState, setWorkflowSaveState] = useState({});
  const [auditLogs,      setAuditLogs]      = useState([]);
  const [approvalActionState, setApprovalActionState] = useState('idle');
  const [approvalActionNotice, setApprovalActionNotice] = useState('');
  const [procurementForm,setProcurementForm]= useState({});
  const [procurementError, setProcurementError] = useState('');
  const [milestoneForm,  setMilestoneForm]  = useState({ stageName: '', milestoneName: '', plannedDate: '', actualDate: '', paymentPercentage: '', paymentAmount: '', completionEvidence: '' });
  const [milestoneError, setMilestoneError] = useState('');
  const [closureForm,    setClosureForm]    = useState({ actualSpend: '', finalRoi: '', finalSavings: '', financeComments: '', capexFormAttachment: '' });
  const [closureError,   setClosureError]   = useState('');
  const [closureActionState, setClosureActionState] = useState('idle');
  const [governance,     setGovernance]     = useState(null);
  const [drilldownType,  setDrilldownType]  = useState('businessUnit');
  const [drilldownRows,  setDrilldownRows]  = useState([]);
  const [processRef,     setProcessRef]     = useState(null);
  const [reportSchedules,setReportSchedules]= useState([]);
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [adminConfig,    setAdminConfig]    = useState(null);
  const [thresholdForm,  setThresholdForm]  = useState({ lowMaxOmr: 25000, mediumMaxOmr: 300000 });
  const [attachmentType, setAttachmentType] = useState('Scope Document');
  const [uploadProgress, setUploadProgress] = useState(null); // null = idle, 0–100 = uploading
  const [poAttachmentUploadProgress, setPoAttachmentUploadProgress] = useState(null);
  const [closureAttachmentUploadProgress, setClosureAttachmentUploadProgress] = useState(null);
  const [aucForm,        setAucForm]        = useState({ aucAccount: '', aucValue: '', aucStartDate: '', capitalizationReady: false, status: 'Open' });
  const [aucError,       setAucError]       = useState('');
  const [capitalizationForm, setCapitalizationForm] = useState({ status: 'Not Started', financeVerified: false, capitalizationRequestDate: '', assetMasterNumber: '', assetCategory: '', capitalizedValue: '' });
  const [capitalizationError, setCapitalizationError] = useState('');
  const [poClosureForm,  setPoClosureForm]  = useState({ finalInvoiceReceived: false, vendorConfirmationReceived: false, closureStatus: 'Open', openCommitmentValue: '', unutilizedCommitment: '', closureDueDate: '' });
  const [poClosureError, setPoClosureError] = useState('');
  const [benefitForm,    setBenefitForm]    = useState({ reviewPeriodMonths: 6, plannedRoi: '', actualRoi: '', plannedSavings: '', actualSavings: '', benefitScore: '', status: 'Planned' });
  const [riskForm,       setRiskForm]       = useState({ category: 'Schedule Risk', title: '', severity: 'Amber', mitigationPlan: '', owner: '' });
  const [moaForm,        setMoaForm]        = useState(defaultMoaFormForRequest(null));
  const [variationForm,  setVariationForm]  = useState({ variationType: 'Variation', originalBudget: '', revisedBudget: '', justification: '', financialImpactAnalysis: '', fibReviewStatus: 'Pending' });
  const [procPerfForm,   setProcPerfForm]   = useState({ rfqIssuedAt: '', tenderStartedAt: '', tenderCompletedAt: '', vendorResponseCount: '', invitedVendorCount: '', budgetEstimate: '', awardedValue: '', poProcessingDays: '', cpOwner: '' });
  const [docVersionForm, setDocVersionForm] = useState({ documentType: 'MOA', documentName: '', versionLabel: 'v1', changelog: '', retentionUntil: '' });
  const [signatureForm,  setSignatureForm]  = useState({ linkedType: 'MOA', linkedId: '', decision: 'Signed' });
  const [scheduleForm,   setScheduleForm]   = useState({ reportName: 'Monthly CAPEX Governance Pack', reportType: 'governance', audience: 'CEO/CFO', frequency: 'Monthly', format: 'PDF', recipients: '', nextRunDate: '' });
  const [returnedEditForm, setReturnedEditForm] = useState({ title: '', estimatedValue: '', acvPoValue: '', scopeDetails: '', fewerThan3Justification: '', savings: '' });
  const [delegateTo,     setDelegateTo]     = useState('');
  const [delegateCandidates, setDelegateCandidates] = useState([]);
  const [delegateLoadState, setDelegateLoadState] = useState('idle');
  const [reqSearch,      setReqSearch]      = useState('');
  const [reqStatusFilter,setReqStatusFilter]= useState('');
  const [reqDeptFilter,  setReqDeptFilter]  = useState('');
  const [reqSort,        setReqSort]        = useState({ key: 'submitted', direction: 'desc' });
  const [activeSection,  setActiveSection]  = useState('summary');
  const [showMoaModal,   setShowMoaModal]   = useState(false);
  const [editingMoaId,   setEditingMoaId]   = useState(null);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showRiskModal,  setShowRiskModal]  = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [decisionModal,  setDecisionModal]  = useState({ decision: '', comment: '', error: '' });

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('som_user') || '{}'); } catch { return {}; } })();
  const currentStep = currentApprovalStep(selectedRequest);
  const canDecideCurrentStep = canUserDecideStep(currentUser, currentStep.step);

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
    if (!routeRequestId) return;
    setActiveTab('requests');
  }, [routeRequestId]);

  useEffect(() => {
    if (!selectedRequest) return;
    setProcurementError('');
    setMilestoneError('');
    setClosureError('');
    setAucError('');
    setCapitalizationError('');
    setPoClosureError('');
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
    setBenefitForm(benefitFormFromReview(latestBenefitReview(selectedRequest.benefitReviews), 'Planned'));
    setMoaForm(prev => ({
      ...defaultMoaFormForRequest(selectedRequest),
      ...prev,
      projectValue: prev.projectValue || selectedRequest.estimatedValue || '',
      title: prev.title || (selectedRequest.title ? `${selectedRequest.title} MOA` : ''),
    }));
    setVariationForm(prev => ({
      ...prev,
      originalBudget: selectedRequest.estimatedValue || '',
      revisedBudget: selectedRequest.estimatedValue || '',
    }));
    setDocVersionForm(prev => ({ ...prev, documentName: selectedRequest.title || '' }));
    getCapexAuditLogs(selectedRequest.id).then(setAuditLogs).catch(() => setAuditLogs([]));
  }, [selectedRequest]);

  useEffect(() => {
    let cancelled = false;
    setDelegateTo('');

    if (!selectedRequest?.id || !selectedRequest.currentStepId || !canDecideCurrentStep) {
      setDelegateCandidates([]);
      setDelegateLoadState('idle');
      return () => { cancelled = true; };
    }

    setDelegateLoadState('loading');
    getCapexDelegateCandidates(selectedRequest.id, selectedRequest.currentStepId)
      .then((candidates) => {
        if (cancelled) return;
        setDelegateCandidates(Array.isArray(candidates) ? candidates : []);
        setDelegateLoadState('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setDelegateCandidates([]);
        setDelegateLoadState('error');
      });

    return () => { cancelled = true; };
  }, [selectedRequest?.id, selectedRequest?.currentStepId, canDecideCurrentStep]);

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

  useEffect(() => {
    let cancelled = false;

    if (!routeRequestId) {
      setSelectedRequest(null);
      return () => { cancelled = true; };
    }

    setActiveSection('summary');
    window.scrollTo({ top: 0, behavior: 'auto' });

    getCapexRequest(routeRequestId)
      .then((detail) => {
        if (cancelled) return;
        setSelectedRequest(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        setSelectedRequest(null);
        notifyError(err, 'Failed to load CAPEX request.');
        navigate('/capex', { replace: true });
      });

    return () => { cancelled = true; };
  }, [navigate, routeRequestId]);

  useEffect(() => {
    if (routeRequestId && activeTab !== 'requests') {
      navigate('/capex', { replace: true });
    }
  }, [activeTab, navigate, routeRequestId]);

  function openCapexRequest(id) {
    navigate(`/capex/requests/${id}`);
  }

  function closeRequestDetail() {
    navigate('/capex');
  }

  function scrollToSection(key) {
    setActiveSection(key);
    document.getElementById(`capex-sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openCreateMoaModal() {
    setEditingMoaId(null);
    setMoaForm(defaultMoaFormForRequest(selectedRequest));
    setShowMoaModal(true);
  }

  function openEditMoaModal(moa) {
    setEditingMoaId(moa.id);
    setMoaForm({
      moaNumber: moa.moaNumber || '',
      title: moa.title || '',
      approvalAuthority: moa.approvalAuthority || '',
      approvalStatus: moa.approvalStatus || 'Draft',
      projectValue: moa.projectValue ?? selectedRequest?.estimatedValue ?? '',
      expiryDate: moa.expiryDate || '',
      renewalRequired: !!moa.renewalRequired,
    });
    setShowMoaModal(true);
  }

  function closeMoaModal() {
    setShowMoaModal(false);
    setEditingMoaId(null);
    setMoaForm(defaultMoaFormForRequest(selectedRequest));
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
    notifySuccess(`CAPEX request "${created.title}" created.`);
  }

  async function handleCapexDecision(decision) {
    if (!selectedRequest) return;
    if (decision !== 'APPROVED') {
      setDecisionModal({ decision, comment: '', error: '' });
      return;
    }
    setApprovalActionState('saving');
    setApprovalActionNotice('');
    try {
      const updated = await decideCapexRequest(selectedRequest.id, decision, '');
      setSelectedRequest(updated);
      const requests = await getCapexRequests();
      setCapexRequests(requests);
      const nextStep = currentApprovalStep(updated);
      setApprovalActionState('saved');
      setApprovalActionNotice(nextStep.step ? `Step approved. Now pending: ${nextStep.text}` : 'Step approved. No pending approval steps remain.');
      setTimeout(() => {
        setApprovalActionState('idle');
        setApprovalActionNotice('');
      }, 2600);
    } catch (err) {
      setApprovalActionState('idle');
      notifyError(err, 'Decision failed.');
    }
  }

  async function submitDecisionModal() {
    if (!selectedRequest || !decisionModal.decision || !decisionModal.comment.trim()) return;
    try {
      const updated = await decideCapexRequest(selectedRequest.id, decisionModal.decision, decisionModal.comment.trim());
      setSelectedRequest(updated);
      setDecisionModal({ decision: '', comment: '', error: '' });
      const requests = await getCapexRequests();
      setCapexRequests(requests);
      setApprovalActionNotice(decisionModal.decision === 'RETURNED' ? 'Request returned for correction.' : 'Request rejected.');
      setTimeout(() => setApprovalActionNotice(''), 2600);
    } catch (err) {
      setDecisionModal(p => ({ ...p, error: err.message || 'Decision failed.' }));
    }
  }

  async function handleSaveReturnedEdit() {
    if (!selectedRequest) return;
    try {
      const updated = await updateCapexRequest(selectedRequest.id, returnedEditForm);
      setSelectedRequest(updated);
      notifySuccess('Request changes saved.');
    } catch (err) {
      notifyError(err, 'Failed to save changes.');
    }
  }

  async function handleResubmitRequest() {
    if (!selectedRequest) return;
    try {
      const updated = await resubmitCapexRequest(selectedRequest.id);
      setSelectedRequest(updated);
      const requests = await getCapexRequests();
      setCapexRequests(requests);
      notifySuccess('Request resubmitted for approval.');
    } catch (err) {
      notifyError(err, 'Failed to resubmit request.');
    }
  }

  async function handleDelegateStep() {
    if (!selectedRequest?.currentStepId || !delegateTo.trim()) return;
    try {
      await delegateCapexStep(selectedRequest.id, selectedRequest.currentStepId, delegateTo.trim());
      setDelegateTo('');
      await refreshSelectedRequest();
      notifySuccess('Approval step delegated.');
    } catch (err) {
      notifyError(err, 'Failed to delegate step.');
    }
  }

  async function handleVariationDecision(variationId, decision) {
    if (!selectedRequest) return;
    try {
      await decideCapexBudgetVariation(selectedRequest.id, variationId, decision);
      await refreshSelectedRequest();
      notifySuccess('Variation decision saved.');
    } catch (err) {
      notifyError(err, 'Failed to decide variation.');
    }
  }

  async function handleSaveProcurement() {
    if (!selectedRequest) return;
    if (!canEdit('capex.procurement')) {
      setProcurementError('This section is read-only for your role. CP or Project Engineer owns procurement updates.');
      return;
    }
    if (!canEditProcurementForStatus(selectedRequest.status)) {
      setProcurementError(`Procurement tracking opens after the CAPEX approval workflow is complete. Current status: ${selectedRequest.status || 'Unknown'}.`);
      return;
    }
    try {
      await updateCapexProcurement(selectedRequest.id, procurementForm);
      setProcurementError('');
      await refreshSelectedRequest();
      notifySuccess('Procurement tracking saved.');
    } catch (err) {
      const message = err.message || 'Failed to save procurement.';
      setProcurementError(message);
      notifyError(message);
    }
  }

  async function handleAddMilestone(e) {
    e.preventDefault();
    if (!selectedRequest || !milestoneForm.stageName || !milestoneForm.milestoneName) return;
    if (!canEdit('capex.execution')) {
      setMilestoneError('This section is read-only for your role. Project Engineer owns execution updates.');
      return;
    }
    if (!canCreateMilestoneForStatus(selectedRequest.status)) {
      setMilestoneError(`Milestones can be added after PO upload. Current status: ${selectedRequest.status || 'Unknown'}.`);
      return;
    }
    try {
      await createCapexMilestone(selectedRequest.id, milestoneForm);
      setMilestoneForm({ stageName: '', milestoneName: '', plannedDate: '', actualDate: '', paymentPercentage: '', paymentAmount: '', completionEvidence: '' });
      setMilestoneError('');
      await refreshSelectedRequest();
      notifySuccess('Milestone added.');
    } catch (err) {
      const message = err.message || 'Failed to add milestone.';
      setMilestoneError(message);
      notifyError(message);
    }
  }

  async function handleCompleteMilestone(milestone) {
    if (!selectedRequest) return;
    if (!canEdit('capex.execution')) {
      notifyWarning('This section is read-only for your role.', 'Project Engineer owns execution updates.');
      return;
    }
    try {
      await updateCapexMilestone(selectedRequest.id, milestone.id, {
        actualDate: milestone.actualDate || new Date().toISOString().slice(0, 10),
        status: 'Completed',
      });
      await refreshSelectedRequest();
      notifySuccess('Milestone marked complete.');
    } catch (err) {
      notifyError(err, 'Failed to update milestone.');
    }
  }

  async function handleSaveClosure(closeRequest = false) {
    if (!selectedRequest) return;
    if (closureActionState !== 'idle') return;
    if (!canEdit('capex.finance')) {
      setClosureError('This section is read-only for your role. Finance owns financial closure updates.');
      return;
    }
    if (!canEditFinancialClosureForStatus(selectedRequest.status)) {
      setClosureError(`Financial closure is only available after approval and execution. Current status: ${selectedRequest.status || 'Unknown'}.`);
      return;
    }
    try {
      setClosureError('');
      setClosureActionState(closeRequest ? 'closing' : 'saving');
      await saveCapexFinancialClosure(selectedRequest.id, { ...closureForm, closeRequest });
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess(closeRequest ? 'Request closed.' : 'Financial closure saved.');
    } catch (err) {
      const blockedItems = Array.isArray(err?.data?.incompleteItems) ? err.data.incompleteItems : [];
      const message = blockedItems.length
        ? `${err.message || 'Failed to save financial closure.'} Remaining items: ${blockedItems.join(', ')}.`
        : (err.message || 'Failed to save financial closure.');
      setClosureError(message);
      notifyError(message);
    } finally {
      setClosureActionState('idle');
    }
  }

  async function handleSaveAuc() {
    if (!selectedRequest) return;
    if (!canEdit('capex.finance')) {
      setAucError('This section is read-only for your role. Finance owns AUC updates.');
      return;
    }
    if (!canEditAucForStatus(selectedRequest.status)) {
      setAucError(`AUC tracking opens after PO creation or execution starts. Current status: ${selectedRequest.status || 'Unknown'}.`);
      return;
    }
    try {
      setAucError('');
      await updateCapexAuc(selectedRequest.id, aucForm);
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess('AUC tracking saved.');
    } catch (err) {
      const message = err.message || 'Failed to save AUC.';
      setAucError(message);
      notifyError(message);
    }
  }

  async function handleSaveCapitalization() {
    if (!selectedRequest) return;
    if (!canEdit('capex.finance')) {
      setCapitalizationError('This section is read-only for your role. Finance owns capitalization updates.');
      return;
    }
    if (!canEditCapitalizationForStatus(selectedRequest.status)) {
      setCapitalizationError(`Capitalization opens once the project is technically or physically complete. Current status: ${selectedRequest.status || 'Unknown'}.`);
      return;
    }
    try {
      setCapitalizationError('');
      await updateCapexCapitalization(selectedRequest.id, capitalizationForm);
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess('Capitalization saved.');
    } catch (err) {
      const message = err.message || 'Failed to save capitalization.';
      setCapitalizationError(message);
      notifyError(message);
    }
  }

  async function handleSavePoClosure() {
    if (!selectedRequest) return;
    if (!canEdit('capex.closure')) {
      setPoClosureError('This section is read-only for your role. Finance owns PO closure updates.');
      return;
    }
    if (!canEditPoClosureForStatus(selectedRequest.status)) {
      setPoClosureError(`PO closure opens after a PO exists and execution is underway. Current status: ${selectedRequest.status || 'Unknown'}.`);
      return;
    }
    try {
      setPoClosureError('');
      await updateCapexPoClosure(selectedRequest.id, poClosureForm);
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess('PO closure saved.');
    } catch (err) {
      const message = err.message || 'Failed to save PO closure.';
      setPoClosureError(message);
      notifyError(message);
    }
  }

  async function handleChecklistStatus(item, status) {
    if (!selectedRequest) return;
    try {
      await updateCapexClosureChecklistItem(selectedRequest.id, item.id, { status });
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess('Checklist item updated.');
    } catch (err) {
      notifyError(err, 'Failed to update checklist item.');
    }
  }

  async function handleSaveBenefitReview() {
    if (!selectedRequest) return;
    try {
      await saveCapexBenefitReview(selectedRequest.id, benefitForm);
      setBenefitForm({ reviewPeriodMonths: 6, plannedRoi: '', actualRoi: '', plannedSavings: '', actualSavings: '', benefitScore: '', status: 'Planned' });
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess('Benefit review saved.');
    } catch (err) {
      notifyError(err, 'Failed to save benefit review.');
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
    setMoaForm(defaultMoaFormForRequest(selectedRequest));
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
      closeMoaModal();
      notifySuccess(editingMoaId ? 'MOA updated.' : 'MOA saved.');
    } catch (err) {
      notifyError(err, editingMoaId ? 'Failed to update MOA.' : 'Failed to save MOA.');
    }
  }

  async function submitVariationModal() {
    if (!variationForm.justification.trim()) return;
    try {
      await handleCreateVariation();
      setShowVariationModal(false);
      notifySuccess('Variation created.');
    } catch (err) {
      notifyError(err, 'Failed to create variation.');
    }
  }

  async function submitRiskModal() {
    if (!riskForm.title.trim()) return;
    try {
      await handleCreateRisk();
      setShowRiskModal(false);
      notifySuccess('Risk added.');
    } catch (err) {
      notifyError(err, 'Failed to add risk.');
    }
  }

  async function handleSaveProcurementPerformance() {
    if (!selectedRequest) return;
    try {
      await updateCapexProcurementPerformance(selectedRequest.id, procPerfForm);
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess('Procurement KPIs saved.');
    } catch (err) {
      notifyError(err, 'Failed to save procurement KPIs.');
    }
  }

  async function handleDecisionGate(gate, status = 'Passed') {
    if (!selectedRequest) return;
    try {
      await updateCapexDecisionGate(selectedRequest.id, gate.gateKey, { status });
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess(`${gate.gateName || 'Decision gate'} updated.`);
    } catch (err) {
      notifyError(err, 'Failed to update decision gate.');
    }
  }

  async function handleCreateDocumentVersion() {
    if (!selectedRequest || !docVersionForm.documentName.trim()) return;
    try {
      await createCapexDocumentVersion(selectedRequest.id, docVersionForm);
      setDocVersionForm({ documentType: 'MOA', documentName: selectedRequest.title || '', versionLabel: 'v1', changelog: '', retentionUntil: '' });
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess('Document version saved.');
    } catch (err) {
      notifyError(err, 'Failed to save document version.');
    }
  }

  async function handleCreateSignature() {
    if (!selectedRequest) return;
    try {
      await createCapexSignature(selectedRequest.id, signatureForm);
      setSignatureForm({ linkedType: 'MOA', linkedId: '', decision: 'Signed' });
      await refreshSelectedRequest();
      await refreshGovernance();
      notifySuccess('Signature captured.');
    } catch (err) {
      notifyError(err, 'Failed to capture signature.');
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
      notifySuccess('Report schedule created.');
    } catch (err) {
      notifyError(err, 'Failed to create report schedule.');
    }
  }

  async function handleDrilldownChange(type) {
    setDrilldownType(type);
    const drill = await getCapexDashboardDrilldown(type);
    setDrilldownRows(drill.rows || []);
  }

  async function handleAttachmentUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedRequest) return;
    const input = e.target;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', attachmentType);
    formData.append('linkedType', 'Request');
    formData.append('retentionYears', '7');
    setUploadProgress(0);
    try {
      await uploadCapexAttachment(selectedRequest.id, formData, {
        onProgress: (pct) => setUploadProgress(pct),
      });
      input.value = '';
      await refreshSelectedRequest();
      notifySuccess('Attachment uploaded.');
    } catch (err) {
      notifyError(err, 'Failed to upload attachment.');
    } finally {
      setUploadProgress(null);
    }
  }

  async function handlePoAttachmentUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedRequest) return;
    const input = e.target;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'PO Document');
    formData.append('linkedType', 'Request');
    formData.append('retentionYears', '7');
    setPoAttachmentUploadProgress(0);
    try {
      const created = await uploadCapexAttachment(selectedRequest.id, formData, {
        onProgress: (pct) => setPoAttachmentUploadProgress(pct),
      });
      input.value = '';
      setSelectedRequest((prev) => prev ? {
        ...prev,
        attachments: [...(prev.attachments || []), created],
      } : prev);
      setProcurementForm((prev) => ({ ...prev, poAttachmentName: created.name }));
      setProcurementError('');
      notifySuccess('PO document uploaded.');
    } catch (err) {
      const message = err.message || 'Failed to upload PO document.';
      setProcurementError(message);
      notifyError(message);
    } finally {
      setPoAttachmentUploadProgress(null);
    }
  }

  async function handleClosureAttachmentUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedRequest) return;
    const input = e.target;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'CAPEX Closure Form');
    formData.append('linkedType', 'Request');
    formData.append('retentionYears', '7');
    setClosureAttachmentUploadProgress(0);
    try {
      const created = await uploadCapexAttachment(selectedRequest.id, formData, {
        onProgress: (pct) => setClosureAttachmentUploadProgress(pct),
      });
      input.value = '';
      setSelectedRequest((prev) => prev ? {
        ...prev,
        attachments: [...(prev.attachments || []), created],
      } : prev);
      setClosureForm((prev) => ({ ...prev, capexFormAttachment: created.name }));
      setClosureError('');
      notifySuccess('CAPEX closure form uploaded.');
    } catch (err) {
      const message = err.message || 'Failed to upload CAPEX closure form.';
      setClosureError(message);
      notifyError(message);
    } finally {
      setClosureAttachmentUploadProgress(null);
    }
  }

  async function handleSaveThresholds() {
    setThresholdSaveState('saving');
    try {
      const updated = await updateCapexThresholds(thresholdForm);
      setThresholdForm({ lowMaxOmr: updated.lowMaxOmr, mediumMaxOmr: updated.mediumMaxOmr });
      const config = await getCapexAdminConfig();
      setAdminConfig(config);
      setThresholdSaveState('saved');
      notifySuccess('Thresholds saved.');
      setTimeout(() => setThresholdSaveState('idle'), 1600);
    } catch (err) {
      setThresholdSaveState('idle');
      notifyError(err, 'Failed to save thresholds.');
    }
  }

  async function handleWorkflowRuleChange(rule, field, value) {
    setAdminConfig(prev => ({
      ...prev,
      workflowRules: prev.workflowRules.map(r => r.id === rule.id ? { ...r, [field]: value } : r),
    }));
  }

  function handleWorkflowApproverRoleChange(rule, value) {
    setAdminConfig(prev => ({
      ...prev,
      workflowRules: prev.workflowRules.map((r) => {
        if (r.id !== rule.id) return r;
        const currentAllowed = Array.isArray(r.allowedUserRoles) ? r.allowedUserRoles : [];
        const shouldMirrorApprover = currentAllowed.length <= 1 && (!currentAllowed.length || currentAllowed[0] === r.approverRole);
        return {
          ...r,
          approverRole: value,
          allowedUserRoles: shouldMirrorApprover ? [value] : currentAllowed,
        };
      }),
    }));
  }

  async function handleSaveWorkflowRule(rule) {
    setWorkflowSaveState(prev => ({ ...prev, [rule.id]: 'saving' }));
    try {
      await updateCapexWorkflowRule(rule.id, rule);
      const config = await getCapexAdminConfig();
      setAdminConfig(config);
      setWorkflowSaveState(prev => ({ ...prev, [rule.id]: 'saved' }));
      notifySuccess('Workflow rule saved.');
      setTimeout(() => {
        setWorkflowSaveState(prev => ({ ...prev, [rule.id]: 'idle' }));
      }, 1600);
    } catch (err) {
      setWorkflowSaveState(prev => ({ ...prev, [rule.id]: 'idle' }));
      notifyError(err, 'Failed to save workflow rule.');
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
  const sortedRequests = useMemo(() => {
    const dateFor = (row) => reqSort.key === 'updated'
      ? row.updatedAt
      : (row.submittedAt || row.createdAt);
    const multiplier = reqSort.direction === 'asc' ? 1 : -1;

    return [...filteredRequests].sort((a, b) => {
      const byDate = (sortDateValue(dateFor(a)) - sortDateValue(dateFor(b))) * multiplier;
      if (byDate) return byDate;
      return (requestSequenceValue(a.id) - requestSequenceValue(b.id)) * multiplier;
    });
  }, [filteredRequests, reqSort]);
  const requestFiltersActive = !!(reqSearch.trim() || reqStatusFilter || reqDeptFilter);
  const clearRequestFilters = () => { setReqSearch(''); setReqStatusFilter(''); setReqDeptFilter(''); };
  const handleRequestSort = (key) => {
    setReqSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

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

  const syncSource = String(syncStatus?.mode || syncStatus?.source || '').toLowerCase();
  const isGsapLive  = syncSource === 'gsap' && syncStatus?.status === 'success';
  const lastSynced  = syncStatus?.lastSynced
    ? new Date(syncStatus.lastSynced).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
  const canEditProcurementByRole = canEdit('capex.procurement');
  const canEditProcurementNow = canEditProcurementByRole && canEditProcurementForStatus(selectedRequest?.status);
  const procurementLockMessage = !canEditProcurementByRole
    ? 'Read-only for your role. CP or Project Engineer owns updates to this section.'
    : `Procurement tracking opens after the CAPEX approval workflow is complete. Current status: ${selectedRequest?.status || 'Unknown'}.`;
  const canEditExecutionByRole = canEdit('capex.execution');
  const canAddMilestoneNow = canEditExecutionByRole && canCreateMilestoneForStatus(selectedRequest?.status);
  const executionLockMessage = !canEditExecutionByRole
    ? 'Read-only for your role. Project Engineer owns execution updates.'
    : `Milestones can be added after PO upload. Current status: ${selectedRequest?.status || 'Unknown'}.`;
  const canEditFinancialClosureByRole = canEdit('capex.finance');
  const canEditFinancialClosureNow = canEditFinancialClosureByRole && canEditFinancialClosureForStatus(selectedRequest?.status);
  const financialClosureLockMessage = !canEditFinancialClosureByRole
    ? 'Read-only for your role. Finance owns financial closure updates.'
    : `Financial closure is only available after approval and execution. Current status: ${selectedRequest?.status || 'Unknown'}.`;
  const canEditAucByRole = canEdit('capex.finance');
  const canEditAucNow = canEditAucByRole && canEditAucForStatus(selectedRequest?.status);
  const aucLockMessage = !canEditAucByRole
    ? 'Read-only for your role. Finance owns AUC updates.'
    : `AUC tracking opens after PO creation or execution starts. Current status: ${selectedRequest?.status || 'Unknown'}.`;
  const canEditCapitalizationByRole = canEdit('capex.finance');
  const canEditCapitalizationNow = canEditCapitalizationByRole && canEditCapitalizationForStatus(selectedRequest?.status);
  const capitalizationLockMessage = !canEditCapitalizationByRole
    ? 'Read-only for your role. Finance owns capitalization updates.'
    : `Capitalization opens once the project is technically or physically complete. Current status: ${selectedRequest?.status || 'Unknown'}.`;
  const canEditPoClosureByRole = canEdit('capex.closure');
  const canEditPoClosureNow = canEditPoClosureByRole && canEditPoClosureForStatus(selectedRequest?.status);
  const poClosureLockMessage = !canEditPoClosureByRole
    ? 'Read-only for your role. Finance owns PO closure updates.'
    : `PO closure opens after a PO exists and execution is underway. Current status: ${selectedRequest?.status || 'Unknown'}.`;
  const canEditProcurementPerformance = canEdit('capex.procurement');
  const canEditBenefitReview = canEdit('capex.finance');
  const canEditDocuments = canCreate('capex.documents');
  const poAttachmentRecord = (selectedRequest?.attachments || []).find((attachment) => attachment.name === procurementForm.poAttachmentName);
  const closureAttachmentOptions = (selectedRequest?.attachments || []).map((attachment) => ({
    value: attachment.name,
    label: attachment.type ? `${attachment.name} (${attachment.type})` : attachment.name,
  }));
  if (closureForm.capexFormAttachment && !closureAttachmentOptions.some((option) => option.value === closureForm.capexFormAttachment)) {
    closureAttachmentOptions.push({ value: closureForm.capexFormAttachment, label: closureForm.capexFormAttachment });
  }
  const activeMoaRecord = editingMoaId
    ? (selectedRequest?.moaRecords || []).find((row) => row.id === editingMoaId)
    : null;
  const moaProjectValue = Number(activeMoaRecord?.projectValue ?? moaForm.projectValue ?? selectedRequest?.estimatedValue ?? 0);
  const moaValueBand = activeMoaRecord?.valueBand || selectedRequest?.valueBand || '';
  const moaExpectedRoute = approvalRouteForValueBand(moaValueBand, processRef);
  const moaShownRoute = activeMoaRecord?.approvalRoute || moaExpectedRoute;
  const moaMatrixStatus = activeMoaRecord
    ? (activeMoaRecord.matrixValidated ? 'Valid' : 'Review')
    : 'Pending save';
  const moaMatrixImpact = activeMoaRecord
    ? (activeMoaRecord.matrixValidated
        ? 'This MOA matches the configured approval route for its value band.'
        : activeMoaRecord.matrixViolationReason || `Expected route: ${moaExpectedRoute}`)
    : `This screen uses the CAPEX request value to derive the MOA route. The record will validate against the configured ${moaValueBand || 'current'} value-band matrix when you save it.`;
  const delegateCandidateOptions = delegateCandidates.map((user) => ({
    value: user.email || user.fullName,
    label: `${user.fullName || user.email} - ${user.role}${user.department ? ` (${user.department})` : ''}`,
  }));
  const delegatePlaceholder = delegateLoadState === 'loading'
    ? 'Loading delegate candidates...'
    : delegateLoadState === 'error'
      ? 'Unable to load candidates'
      : delegateCandidateOptions.length
        ? 'Select delegate'
        : 'No eligible delegates';

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
            notifySuccess(result.message);
            fetchAll(); // reload charts + meters with new budget data
          }}
        />
      )}

      {!isRequestDetailRoute && (
        <>
          {/* Page header */}
          <div style={s.pageHeader}>
            <div style={s.pageHeaderLeft}>
              <div style={s.brandRow}>
                <span style={s.brandMark}>SOM</span>
                <div style={s.titleBlock}>
                  <div style={s.brandText}>Shell Oman Marketing</div>
                  <h1 style={s.heading}>CAPEX Control Center</h1>
                </div>
              </div>
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
        </>
      )}

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
                      <th style={s.th} aria-sort={reqSort.key === 'submitted' ? (reqSort.direction === 'desc' ? 'descending' : 'ascending') : 'none'}>
                        <SortableDateHeader label="Submitted" sortKey="submitted" currentSort={reqSort} onSort={handleRequestSort} />
                      </th>
                      <th style={s.th} aria-sort={reqSort.key === 'updated' ? (reqSort.direction === 'desc' ? 'descending' : 'ascending') : 'none'}>
                        <SortableDateHeader label="Updated" sortKey="updated" currentSort={reqSort} onSort={handleRequestSort} />
                      </th>
                      <th style={s.th} aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRequests.map((r) => (
                      <tr key={r.id} className="capex-req-row" onClick={() => openCapexRequest(r.id)}>
                        <td style={s.td}>{r.id}</td>
                        <td style={s.td}>
                          <button type="button" className="capex-req-title" style={s.rowTitleBtn} onClick={() => openCapexRequest(r.id)}>{r.title}</button>
                        </td>
                        <td style={s.td}>{r.department}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtOMR(r.estimatedValue)}</td>
                        <td style={s.td}><Badge status={r.valueBand === 'LOW' ? 'Low' : r.valueBand === 'MEDIUM' ? 'Medium' : 'High'} /></td>
                        <td style={s.td}><Badge status={r.status} /></td>
                        <td style={s.td}>{fmtDate(r.submittedAt || r.createdAt)}</td>
                        <td style={s.td}>{fmtDate(r.updatedAt)}</td>
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
                    {(selectedRequest.approvalSteps || []).filter((step) => step.status !== 'Superseded').map((step, index) => (
                      <div key={step.id} style={s.compactRow}>
                        <span>
                          {index + 1}. {step.label}
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
                      <FileUploadField onChange={handleAttachmentUpload} uploading={uploadProgress !== null} progress={uploadProgress ?? 0} aria-label="Upload file" />
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

                  <div style={s.sectionTitleRow}>
                    <h4 style={{ ...s.detailTitle, margin: 0 }}>Procurement Tracking</h4>
                    {!canEditProcurementNow && <span style={s.lockBadge}>{canEditProcurementByRole ? 'Locked until approval completes' : 'View only'}</span>}
                  </div>
                  {!canEditProcurementNow && (
                    <div style={{ ...s.infoNotice, marginBottom: 14 }}>
                      {procurementLockMessage}
                    </div>
                  )}
                  {procurementError && (
                    <div style={{ ...s.decisionError, marginTop: 0, marginBottom: 14 }}>
                      {procurementError}
                    </div>
                  )}

                  <div style={s.dSubLabel}>Compliance & vendor setup</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="NDA">
                      <Checkbox style={s.checkInline} checked={!!procurementForm.ndaRequired} onChange={c => setProcurementForm(p => ({ ...p, ndaRequired: c, ndaStatus: c ? 'Pending' : 'Not required' }))} label="Required" disabled={!canEditProcurementNow} />
                    </Field>
                    <Field label="NDA status">
                      <SelectField style={canEditProcurementNow ? s.fieldInput : s.disabledInput} value={procurementForm.ndaStatus || 'Not required'} onChange={v => setProcurementForm(p => ({ ...p, ndaStatus: v }))} options={['Not required', 'Pending', 'Completed']} aria-label="NDA status" disabled={!canEditProcurementNow} />
                    </Field>
                    <Field label="DPA">
                      <Checkbox style={s.checkInline} checked={!!procurementForm.dpaRequired} onChange={c => setProcurementForm(p => ({ ...p, dpaRequired: c, dpaStatus: c ? 'Pending' : 'Not required' }))} label="Required" disabled={!canEditProcurementNow} />
                    </Field>
                    <Field label="DPA status">
                      <SelectField style={canEditProcurementNow ? s.fieldInput : s.disabledInput} value={procurementForm.dpaStatus || 'Not required'} onChange={v => setProcurementForm(p => ({ ...p, dpaStatus: v }))} options={['Not required', 'Pending', 'Completed']} aria-label="DPA status" disabled={!canEditProcurementNow} />
                    </Field>
                    <Field label="Vendor registration">
                      <SelectField style={canEditProcurementNow ? s.fieldInput : s.disabledInput} value={procurementForm.vendorRegistrationStatus || 'Pending'} onChange={v => setProcurementForm(p => ({ ...p, vendorRegistrationStatus: v }))} options={['Not required', 'Pending', 'Completed']} aria-label="Vendor registration" disabled={!canEditProcurementNow} />
                    </Field>
                    <Field label="Agreement status">
                      <SelectField style={canEditProcurementNow ? s.fieldInput : s.disabledInput} value={procurementForm.agreementStatus || 'Pending'} onChange={v => setProcurementForm(p => ({ ...p, agreementStatus: v }))} options={['Not required', 'Pending', 'Completed']} aria-label="Agreement status" disabled={!canEditProcurementNow} />
                    </Field>
                  </div>

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>GSAP, PR & PO references</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="GSAP project reference"><input style={canEditProcurementNow ? s.fieldInput : s.disabledInput} placeholder="e.g. GSAP-1234" value={procurementForm.gsapProjectReference || ''} onChange={e => setProcurementForm(p => ({ ...p, gsapProjectReference: e.target.value }))} disabled={!canEditProcurementNow} /></Field>
                    <Field label="PR number"><input style={canEditProcurementNow ? s.fieldInput : s.disabledInput} placeholder="PR number" value={procurementForm.prNumber || ''} onChange={e => setProcurementForm(p => ({ ...p, prNumber: e.target.value }))} disabled={!canEditProcurementNow} /></Field>
                    <Field label="PO number"><input style={canEditProcurementNow ? s.fieldInput : s.disabledInput} placeholder="PO number" value={procurementForm.poNumber || ''} onChange={e => setProcurementForm(p => ({ ...p, poNumber: e.target.value }))} disabled={!canEditProcurementNow} /></Field>
                    <Field label="PO value (OMR)"><input style={canEditProcurementNow ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={procurementForm.poValue || ''} onChange={e => setProcurementForm(p => ({ ...p, poValue: e.target.value }))} disabled={!canEditProcurementNow} /></Field>
                    <Field label="PO attachment">
                      <div style={s.poAttachmentField}>
                        <div style={canEditProcurementNow ? s.poAttachmentDisplay : s.poAttachmentDisplayDisabled}>
                          <span style={s.poAttachmentName}>{procurementForm.poAttachmentName || 'No PO document uploaded yet.'}</span>
                          {poAttachmentRecord && (
                            <button type="button" style={s.linkBtn} onClick={() => downloadCapexAttachment(selectedRequest.id, poAttachmentRecord)}>
                              Download
                            </button>
                          )}
                        </div>
                        {canCreate('capex.documents') && canEditProcurementByRole && (
                          <FileUploadField
                            onChange={handlePoAttachmentUpload}
                            uploading={poAttachmentUploadProgress !== null}
                            progress={poAttachmentUploadProgress ?? 0}
                            disabled={!canEditProcurementNow}
                            aria-label="Upload PO document"
                          />
                        )}
                      </div>
                    </Field>
                    <Field label="PO status">
                      <SelectField style={canEditProcurementNow ? s.fieldInput : s.disabledInput} value={procurementForm.poStatus || ''} onChange={v => setProcurementForm(p => ({ ...p, poStatus: v }))} options={['Draft', 'Created', 'Released', 'Uploaded']} placeholder="Select…" aria-label="PO status" disabled={!canEditProcurementNow} />
                    </Field>
                  </div>
                  {canEdit('capex.procurement') && (
                    <div><button type="button" style={canEditProcurementNow ? s.primaryBtn : s.disabledBtn} onClick={handleSaveProcurement} disabled={!canEditProcurementNow}>Save Procurement</button></div>
                  )}
              </section>

              <section id="capex-sec-execution" style={s.dCard}>
                  <div style={s.sectionTitleRow}>
                    <h4 style={{ ...s.detailTitle, margin: 0 }}>Project Execution</h4>
                    {!canAddMilestoneNow && <span style={s.lockBadge}>{canEditExecutionByRole ? 'Locked until PO uploaded' : 'View only'}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(selectedRequest.milestones || []).map((m) => (
                      <div key={m.id} style={s.compactRow}>
                        <span>{m.stageName} - {m.milestoneName}</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge status={m.status} />
                          {canEditExecutionByRole && m.status !== 'Completed' && <button type="button" style={s.miniBtn} onClick={() => handleCompleteMilestone(m)}>Complete</button>}
                        </span>
                      </div>
                    ))}
                  </div>
                  {canEditExecutionByRole && <form onSubmit={handleAddMilestone} style={s.lifecycleGrid}>
                    {!canAddMilestoneNow && (
                      <div style={{ ...s.infoNotice, gridColumn: '1 / -1' }}>
                        {executionLockMessage}
                      </div>
                    )}
                    {milestoneError && (
                      <div style={{ ...s.decisionError, gridColumn: '1 / -1', marginTop: 0 }}>
                        {milestoneError}
                      </div>
                    )}
                    <Field label="Stage"><input style={canAddMilestoneNow ? s.fieldInput : s.disabledInput} placeholder="Stage" value={milestoneForm.stageName} onChange={e => setMilestoneForm(p => ({ ...p, stageName: e.target.value }))} disabled={!canAddMilestoneNow} /></Field>
                    <Field label="Milestone"><input style={canAddMilestoneNow ? s.fieldInput : s.disabledInput} placeholder="Milestone" value={milestoneForm.milestoneName} onChange={e => setMilestoneForm(p => ({ ...p, milestoneName: e.target.value }))} disabled={!canAddMilestoneNow} /></Field>
                    <Field label="Planned date"><DateField style={canAddMilestoneNow ? s.fieldInput : s.disabledInput} value={milestoneForm.plannedDate} onChange={v => setMilestoneForm(p => ({ ...p, plannedDate: v }))} disabled={!canAddMilestoneNow} /></Field>
                    <Field label="Payment %"><input style={canAddMilestoneNow ? s.fieldInput : s.disabledInput} type="number" placeholder="Payment %" value={milestoneForm.paymentPercentage} onChange={e => setMilestoneForm(p => ({ ...p, paymentPercentage: e.target.value }))} disabled={!canAddMilestoneNow} /></Field>
                    <Field label="Payment amount (OMR)"><input style={canAddMilestoneNow ? s.fieldInput : s.disabledInput} type="number" placeholder="Payment amount" value={milestoneForm.paymentAmount} onChange={e => setMilestoneForm(p => ({ ...p, paymentAmount: e.target.value }))} disabled={!canAddMilestoneNow} /></Field>
                    <Field label="Evidence filename"><input style={canAddMilestoneNow ? s.fieldInput : s.disabledInput} placeholder="Evidence filename" value={milestoneForm.completionEvidence} onChange={e => setMilestoneForm(p => ({ ...p, completionEvidence: e.target.value }))} disabled={!canAddMilestoneNow} /></Field>
                    <div><button style={canAddMilestoneNow ? s.primaryBtn : s.disabledBtn} type="submit" disabled={!canAddMilestoneNow}>Add Milestone</button></div>
                  </form>}

              </section>

              <section id="capex-sec-financial" style={s.dCard}>
                  <div style={s.sectionTitleRow}>
                    <h4 style={{ ...s.detailTitle, margin: 0 }}>Financial Closure</h4>
                    {!canEditFinancialClosureNow && <span style={s.lockBadge}>{canEditFinancialClosureByRole ? 'Locked until approval complete' : 'View only'}</span>}
                  </div>
                  {!canEditFinancialClosureNow && (
                    <div style={{ ...s.infoNotice, marginBottom: 14 }}>
                      {financialClosureLockMessage}
                    </div>
                  )}
                  {closureError && (
                    <div style={{ ...s.decisionError, marginTop: 0, marginBottom: 14 }}>
                      {closureError}
                    </div>
                  )}
                  <div style={s.lifecycleGrid}>
                    <Field label="Actual spend (OMR)"><input style={canEditFinancialClosureNow ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={closureForm.actualSpend} onChange={e => setClosureForm(p => ({ ...p, actualSpend: e.target.value }))} disabled={!canEditFinancialClosureNow} /></Field>
                    <Field label="Final ROI"><input style={canEditFinancialClosureNow ? s.fieldInput : s.disabledInput} placeholder="Final ROI" value={closureForm.finalRoi} onChange={e => setClosureForm(p => ({ ...p, finalRoi: e.target.value }))} disabled={!canEditFinancialClosureNow} /></Field>
                    <Field label="Final savings (OMR)"><input style={canEditFinancialClosureNow ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={closureForm.finalSavings} onChange={e => setClosureForm(p => ({ ...p, finalSavings: e.target.value }))} disabled={!canEditFinancialClosureNow} /></Field>
                    <Field label="CAPEX closure form">
                      <div style={s.closureAttachmentField}>
                        <SelectField
                          style={canEditFinancialClosureNow ? s.fieldInput : s.disabledInput}
                          value={closureForm.capexFormAttachment}
                          onChange={v => setClosureForm(p => ({ ...p, capexFormAttachment: v }))}
                          options={closureAttachmentOptions}
                          placeholder={closureAttachmentOptions.length ? 'Select uploaded attachment' : 'Upload closure form first'}
                          aria-label="CAPEX closure form attachment"
                          disabled={!canEditFinancialClosureNow || !closureAttachmentOptions.length}
                        />
                        <FileUploadField
                          onChange={handleClosureAttachmentUpload}
                          uploading={closureAttachmentUploadProgress !== null}
                          progress={closureAttachmentUploadProgress ?? 0}
                          disabled={!canEditFinancialClosureNow}
                          aria-label="Upload CAPEX closure form"
                        />
                      </div>
                    </Field>
                    <Field label="Finance comments" full><input style={canEditFinancialClosureNow ? s.fieldInput : s.disabledInput} placeholder="Finance comments" value={closureForm.financeComments} onChange={e => setClosureForm(p => ({ ...p, financeComments: e.target.value }))} disabled={!canEditFinancialClosureNow} /></Field>
                  </div>
                  {canEdit('capex.finance') && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        style={canEditFinancialClosureNow && closureActionState === 'idle' ? s.warnBtn : s.disabledBtn}
                        onClick={() => handleSaveClosure(false)}
                        disabled={!canEditFinancialClosureNow || closureActionState !== 'idle'}
                      >
                        {closureActionState === 'saving' ? 'Saving...' : 'Save Closure Draft'}
                      </button>
                      <button
                        type="button"
                        style={canEditFinancialClosureNow && closureActionState === 'idle' ? s.primaryBtn : s.disabledBtn}
                        onClick={() => handleSaveClosure(true)}
                        disabled={!canEditFinancialClosureNow || closureActionState !== 'idle'}
                      >
                        {closureActionState === 'closing' ? 'Closing...' : 'Close Request'}
                      </button>
                    </div>
                  )}
              </section>

              <section id="capex-sec-auc" style={s.dCard}>
                  <h4 style={s.detailTitle}>AUC, Capitalization & PO Closure</h4>

                  <div style={s.sectionTitleRow}>
                    <div style={{ ...s.dSubLabel, margin: 0 }}>Asset under construction (AUC)</div>
                    {!canEditAucNow && <span style={s.lockBadge}>{canEditAucByRole ? 'Locked until PO created' : 'View only'}</span>}
                  </div>
                  {!canEditAucNow && (
                    <div style={{ ...s.infoNotice, marginBottom: 14 }}>
                      {aucLockMessage}
                    </div>
                  )}
                  {aucError && (
                    <div style={{ ...s.decisionError, marginTop: 0, marginBottom: 14 }}>
                      {aucError}
                    </div>
                  )}
                  <div style={s.lifecycleGrid}>
                    <Field label="AUC account"><input style={canEditAucNow ? s.fieldInput : s.disabledInput} placeholder="AUC account" value={aucForm.aucAccount} onChange={e => setAucForm(p => ({ ...p, aucAccount: e.target.value }))} disabled={!canEditAucNow} /></Field>
                    <Field label="AUC value (OMR)"><input style={canEditAucNow ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={aucForm.aucValue} onChange={e => setAucForm(p => ({ ...p, aucValue: e.target.value }))} disabled={!canEditAucNow} /></Field>
                    <Field label="AUC start date"><DateField style={canEditAucNow ? s.fieldInput : s.disabledInput} value={aucForm.aucStartDate} onChange={v => setAucForm(p => ({ ...p, aucStartDate: v }))} disabled={!canEditAucNow} /></Field>
                    <Field label="AUC status">
                      <SelectField style={canEditAucNow ? s.fieldInput : s.disabledInput} value={aucForm.status} onChange={v => setAucForm(p => ({ ...p, status: v }))} options={['Open', 'In Review', 'Capitalized']} aria-label="AUC status" disabled={!canEditAucNow} />
                    </Field>
                    <Checkbox style={s.checkInline} checked={aucForm.capitalizationReady} onChange={c => setAucForm(p => ({ ...p, capitalizationReady: c }))} label="Capitalization ready" disabled={!canEditAucNow} />
                  </div>
                  {canEdit('capex.finance') && <div><button type="button" style={canEditAucNow ? s.primaryBtn : s.disabledBtn} onClick={handleSaveAuc} disabled={!canEditAucNow}>Save AUC</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.sectionTitleRow}>
                    <div style={{ ...s.dSubLabel, margin: 0 }}>Capitalization</div>
                    {!canEditCapitalizationNow && <span style={s.lockBadge}>{canEditCapitalizationByRole ? 'Locked until completion stage' : 'View only'}</span>}
                  </div>
                  {!canEditCapitalizationNow && (
                    <div style={{ ...s.infoNotice, marginBottom: 14 }}>
                      {capitalizationLockMessage}
                    </div>
                  )}
                  {capitalizationError && (
                    <div style={{ ...s.decisionError, marginTop: 0, marginBottom: 14 }}>
                      {capitalizationError}
                    </div>
                  )}
                  <div style={s.lifecycleGrid}>
                    <Field label="Capitalization status">
                      <SelectField style={canEditCapitalizationNow ? s.fieldInput : s.disabledInput} value={capitalizationForm.status} onChange={v => setCapitalizationForm(p => ({ ...p, status: v }))} options={['Not Started', 'Ready', 'Pending Approval', 'In Progress', 'Capitalized']} aria-label="Capitalization status" disabled={!canEditCapitalizationNow} />
                    </Field>
                    <Field label="Asset master number"><input style={canEditCapitalizationNow ? s.fieldInput : s.disabledInput} placeholder="Asset master number" value={capitalizationForm.assetMasterNumber} onChange={e => setCapitalizationForm(p => ({ ...p, assetMasterNumber: e.target.value }))} disabled={!canEditCapitalizationNow} /></Field>
                    <Field label="Asset category"><input style={canEditCapitalizationNow ? s.fieldInput : s.disabledInput} placeholder="Asset category" value={capitalizationForm.assetCategory} onChange={e => setCapitalizationForm(p => ({ ...p, assetCategory: e.target.value }))} disabled={!canEditCapitalizationNow} /></Field>
                    <Field label="Capitalized value (OMR)"><input style={canEditCapitalizationNow ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={capitalizationForm.capitalizedValue} onChange={e => setCapitalizationForm(p => ({ ...p, capitalizedValue: e.target.value }))} disabled={!canEditCapitalizationNow} /></Field>
                    <Field label="Capitalization request date"><DateField style={canEditCapitalizationNow ? s.fieldInput : s.disabledInput} value={capitalizationForm.capitalizationRequestDate} onChange={v => setCapitalizationForm(p => ({ ...p, capitalizationRequestDate: v }))} disabled={!canEditCapitalizationNow} /></Field>
                  </div>
                  {canEdit('capex.finance') && <div><button type="button" style={canEditCapitalizationNow ? s.primaryBtn : s.disabledBtn} onClick={handleSaveCapitalization} disabled={!canEditCapitalizationNow}>Save Capitalization</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.sectionTitleRow}>
                    <div style={{ ...s.dSubLabel, margin: 0 }}>PO closure</div>
                    {!canEditPoClosureNow && <span style={s.lockBadge}>{canEditPoClosureByRole ? 'Locked until PO/execution stage' : 'View only'}</span>}
                  </div>
                  {!canEditPoClosureNow && (
                    <div style={{ ...s.infoNotice, marginBottom: 14 }}>
                      {poClosureLockMessage}
                    </div>
                  )}
                  {poClosureError && (
                    <div style={{ ...s.decisionError, marginTop: 0, marginBottom: 14 }}>
                      {poClosureError}
                    </div>
                  )}
                  <div style={s.lifecycleGrid}>
                    <Field label="Closure status">
                      <SelectField style={canEditPoClosureNow ? s.fieldInput : s.disabledInput} value={poClosureForm.closureStatus} onChange={v => setPoClosureForm(p => ({ ...p, closureStatus: v }))} options={['Open', 'In Progress', 'Closed']} aria-label="Closure status" disabled={!canEditPoClosureNow} />
                    </Field>
                    <Field label="Open commitment (OMR)"><input style={canEditPoClosureNow ? s.fieldInput : s.disabledInput} type="number" placeholder="Open commitment" value={poClosureForm.openCommitmentValue} onChange={e => setPoClosureForm(p => ({ ...p, openCommitmentValue: e.target.value }))} disabled={!canEditPoClosureNow} /></Field>
                    <Field label="Unutilized commitment (OMR)"><input style={canEditPoClosureNow ? s.fieldInput : s.disabledInput} type="number" placeholder="Unutilized commitment" value={poClosureForm.unutilizedCommitment} onChange={e => setPoClosureForm(p => ({ ...p, unutilizedCommitment: e.target.value }))} disabled={!canEditPoClosureNow} /></Field>
                    <Field label="Closure due date"><DateField style={canEditPoClosureNow ? s.fieldInput : s.disabledInput} value={poClosureForm.closureDueDate} onChange={v => setPoClosureForm(p => ({ ...p, closureDueDate: v }))} disabled={!canEditPoClosureNow} /></Field>
                    <Checkbox style={s.checkInline} checked={poClosureForm.finalInvoiceReceived} onChange={c => setPoClosureForm(p => ({ ...p, finalInvoiceReceived: c }))} label="Final invoice" disabled={!canEditPoClosureNow} />
                  </div>
                  {canEdit('capex.closure') && <div><button type="button" style={canEditPoClosureNow ? s.primaryBtn : s.disabledBtn} onClick={handleSavePoClosure} disabled={!canEditPoClosureNow}>Save PO Closure</button></div>}
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
                    {canCreate('capex.moa') && <button type="button" style={s.dAddBtn} onClick={openCreateMoaModal}>+ Add MOA</button>}
                  </div>
                  <DataTable
                    columns={[
                      { key: 'moaNumber', label: 'MOA' },
                      { key: 'approvalStatus', label: 'Status', render: v => <Badge status={v} /> },
                      { key: 'matrixValidated', label: 'Matrix', render: v => v ? 'Valid' : 'Review' },
                      canEdit('capex.moa')
                        ? {
                            key: 'actions',
                            label: 'Actions',
                            render: (_value, row) => (
                              <button type="button" style={s.miniBtn} onClick={() => openEditMoaModal(row)}>
                                Edit
                              </button>
                            ),
                          }
                        : null,
                    ].filter(Boolean)}
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
                        <div style={s.gateInfo}>
                          <span style={s.gateTitleRow}>
                            <span>{gate.gateName}</span>
                            {gate.ownerLabel && (
                              <InlineTooltip
                                content={gate.autoManaged
                                  ? `${gate.ownerLabel} updates this gate automatically.`
                                  : `${gate.ownerLabel} can update this gate.`}
                              >
                                <span style={s.gateOwnerHint}>
                                  <CircleAlert size={14} strokeWidth={2.1} />
                                </span>
                              </InlineTooltip>
                            )}
                          </span>
                          {gate.ownerLabel && (
                            <span style={s.gateMeta}>
                              {gate.autoManaged ? `${gate.ownerLabel} (automatic)` : gate.ownerLabel}
                            </span>
                          )}
                        </div>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge status={gate.status} />
                          {gate.canAct && canEdit('capex.approvals') && gate.status !== 'Passed' && <button type="button" style={s.miniBtn} onClick={() => handleDecisionGate(gate)}>Pass</button>}
                        </span>
                      </div>
                    ))}
                  </div>
              </section>

              <section id="capex-sec-performance" style={s.dCard}>
                  <h4 style={s.detailTitle}>Procurement Performance, Benefits & Risk</h4>

                  <div style={s.dSubLabel}>Procurement KPIs</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="RFQ issued"><DateField style={canEditProcurementPerformance ? s.fieldInput : s.disabledInput} value={procPerfForm.rfqIssuedAt} onChange={v => setProcPerfForm(p => ({ ...p, rfqIssuedAt: v }))} disabled={!canEditProcurementPerformance} /></Field>
                    <Field label="Tender completed"><DateField style={canEditProcurementPerformance ? s.fieldInput : s.disabledInput} value={procPerfForm.tenderCompletedAt} onChange={v => setProcPerfForm(p => ({ ...p, tenderCompletedAt: v }))} disabled={!canEditProcurementPerformance} /></Field>
                    <Field label="Vendor responses"><input style={canEditProcurementPerformance ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={procPerfForm.vendorResponseCount} onChange={e => setProcPerfForm(p => ({ ...p, vendorResponseCount: e.target.value }))} disabled={!canEditProcurementPerformance} /></Field>
                    <Field label="Invited vendors"><input style={canEditProcurementPerformance ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={procPerfForm.invitedVendorCount} onChange={e => setProcPerfForm(p => ({ ...p, invitedVendorCount: e.target.value }))} disabled={!canEditProcurementPerformance} /></Field>
                    <Field label="Budget estimate (OMR)"><input style={canEditProcurementPerformance ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={procPerfForm.budgetEstimate} onChange={e => setProcPerfForm(p => ({ ...p, budgetEstimate: e.target.value }))} disabled={!canEditProcurementPerformance} /></Field>
                    <Field label="Awarded value (OMR)"><input style={canEditProcurementPerformance ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={procPerfForm.awardedValue} onChange={e => setProcPerfForm(p => ({ ...p, awardedValue: e.target.value }))} disabled={!canEditProcurementPerformance} /></Field>
                  </div>
                  {canEditProcurementPerformance && <div><button type="button" style={s.primaryBtn} onClick={handleSaveProcurementPerformance}>Save Procurement KPIs</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>Benefit review</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="Review period">
                      <SelectField
                        style={canEditBenefitReview ? s.fieldInput : s.disabledInput}
                        value={String(benefitForm.reviewPeriodMonths)}
                        onChange={(v) => {
                          const months = Number(v);
                          const existing = (selectedRequest?.benefitReviews || []).find((review) => Number(review.reviewPeriodMonths) === months);
                          setBenefitForm(existing
                            ? benefitFormFromReview(existing, benefitForm.status || 'Planned')
                            : { ...benefitFormFromReview(null, benefitForm.status || 'Planned'), reviewPeriodMonths: months });
                        }}
                        options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: '24', label: '24 months' }]}
                        aria-label="Review period"
                        disabled={!canEditBenefitReview}
                      />
                    </Field>
                    <Field label="Actual ROI %"><input style={canEditBenefitReview ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={benefitForm.actualRoi} onChange={e => setBenefitForm(p => ({ ...p, actualRoi: e.target.value }))} disabled={!canEditBenefitReview} /></Field>
                    <Field label="Actual savings (OMR)"><input style={canEditBenefitReview ? s.fieldInput : s.disabledInput} type="number" placeholder="0" value={benefitForm.actualSavings} onChange={e => setBenefitForm(p => ({ ...p, actualSavings: e.target.value }))} disabled={!canEditBenefitReview} /></Field>
                    <Field label="Status">
                      <SelectField style={canEditBenefitReview ? s.fieldInput : s.disabledInput} value={benefitForm.status} onChange={v => setBenefitForm(p => ({ ...p, status: v }))} options={['Planned', 'In Review', 'Completed']} aria-label="Benefit status" disabled={!canEditBenefitReview} />
                    </Field>
                  </div>
                  {canEditBenefitReview && <div><button type="button" style={s.primaryBtn} onClick={handleSaveBenefitReview}>Save Benefit Review</button></div>}

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
                    <Field label="Document name"><input style={canEditDocuments ? s.fieldInput : s.disabledInput} placeholder="Document name" value={docVersionForm.documentName} onChange={e => setDocVersionForm(p => ({ ...p, documentName: e.target.value }))} disabled={!canEditDocuments} /></Field>
                    <Field label="Version"><input style={canEditDocuments ? s.fieldInput : s.disabledInput} placeholder="Version" value={docVersionForm.versionLabel} onChange={e => setDocVersionForm(p => ({ ...p, versionLabel: e.target.value }))} disabled={!canEditDocuments} /></Field>
                    <Field label="Changelog" full><input style={canEditDocuments ? s.fieldInput : s.disabledInput} placeholder="What changed in this version" value={docVersionForm.changelog} onChange={e => setDocVersionForm(p => ({ ...p, changelog: e.target.value }))} disabled={!canEditDocuments} /></Field>
                  </div>
                  {canEditDocuments && <div><button type="button" style={s.primaryBtn} onClick={handleCreateDocumentVersion}>Save Version</button></div>}

                  <div style={s.dDivider} />
                  <div style={s.dSubLabel}>Signature</div>
                  <div style={s.lifecycleGrid}>
                    <Field label="Linked to">
                      <SelectField style={canEditDocuments ? s.fieldInput : s.disabledInput} value={signatureForm.linkedType} onChange={v => setSignatureForm(p => ({ ...p, linkedType: v }))} options={['MOA', 'Approval', 'Closure']} aria-label="Linked to" disabled={!canEditDocuments} />
                    </Field>
                    <Field label="Linked ID (optional)"><input style={canEditDocuments ? s.fieldInput : s.disabledInput} placeholder="Linked ID (optional)" value={signatureForm.linkedId} onChange={e => setSignatureForm(p => ({ ...p, linkedId: e.target.value }))} disabled={!canEditDocuments} /></Field>
                    <Field label="Decision">
                      <SelectField style={canEditDocuments ? s.fieldInput : s.disabledInput} value={signatureForm.decision} onChange={v => setSignatureForm(p => ({ ...p, decision: v }))} options={['Signed', 'Approved', 'Acknowledged']} aria-label="Decision" disabled={!canEditDocuments} />
                    </Field>
                  </div>
                  {canEditDocuments && <div><button type="button" style={s.primaryBtn} onClick={handleCreateSignature}>Capture Signature</button></div>}
              </section>

              <section id="capex-sec-audit" style={s.dCard}>
                  <h4 style={s.detailTitle}>Audit History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {auditLogs.length ? auditLogs.map(log => (
                      <div key={log.id} style={s.auditRow}>
                        <div style={s.auditBody}>
                          <strong style={s.auditTitle}>{auditEventLabel(log.eventType)}</strong>
                          {log.message && <span style={s.auditMessage}>{log.message}</span>}
                        </div>
                        <div style={s.auditMeta}>
                          <span>{log.actor || 'System'}</span>
                          <time dateTime={log.createdAt || undefined}>{fmtDateTime(log.createdAt)}</time>
                        </div>
                      </div>
                    )) : <p style={s.detailText}>No audit events recorded yet.</p>}
                  </div>
              </section>
            </div>
          </div>

          {showMoaModal && (
            <Modal
              title={editingMoaId ? 'Edit MOA' : 'Add MOA'}
              subtitle={editingMoaId ? 'Update the memorandum of agreement for this request.' : 'Create a memorandum of agreement for this request.'}
              onClose={closeMoaModal}
            >
              <div style={s.modalContextGrid}>
                <div style={s.modalContextCard}>
                  <div style={s.modalContextLabel}>Project value</div>
                  <div style={s.modalContextValue}>{moaProjectValue ? fmtOMR(moaProjectValue) : '—'}</div>
                </div>
                <div style={s.modalContextCard}>
                  <div style={s.modalContextLabel}>Value band</div>
                  <div style={s.modalContextValue}>{moaValueBand || '—'}</div>
                </div>
                <div style={s.modalContextCard}>
                  <div style={s.modalContextLabel}>Approval route</div>
                  <div style={s.modalContextValue}>{moaShownRoute}</div>
                </div>
                <div style={s.modalContextCard}>
                  <div style={s.modalContextLabel}>Matrix validation</div>
                  <div style={s.modalContextValue}>{moaMatrixStatus}</div>
                </div>
              </div>
              <div style={{ ...s.infoNotice, marginBottom: 14 }}>
                {moaMatrixImpact}
              </div>
              <div style={s.lifecycleGrid}>
                <div style={s.modalField}>
                  <label style={s.modalLabel}>MOA number</label>
                  <input style={s.compactInput} value={moaForm.moaNumber} onChange={e => setMoaForm(p => ({ ...p, moaNumber: e.target.value }))} />
                </div>
                <div style={s.modalField}>
                  <label style={s.modalLabel}>MOA title</label>
                  <input style={s.compactInput} value={moaForm.title} onChange={e => setMoaForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div style={s.modalField}>
                  <label style={s.modalLabel}>Approval authority</label>
                  <input style={s.compactInput} value={moaForm.approvalAuthority} onChange={e => setMoaForm(p => ({ ...p, approvalAuthority: e.target.value }))} />
                </div>
                <div style={s.modalField}>
                  <label style={s.modalLabel}>Approval status</label>
                  <SelectField style={s.compactInput} value={moaForm.approvalStatus} onChange={v => setMoaForm(p => ({ ...p, approvalStatus: v }))} options={['Draft', 'Pending', 'Approved', 'Active']} aria-label="MOA approval status" />
                </div>
                <div style={{ ...s.modalField, gridColumn: '1 / -1' }}>
                  <label style={s.modalLabel}>Expiry date</label>
                  <DateField style={s.compactInput} value={moaForm.expiryDate} onChange={v => setMoaForm(p => ({ ...p, expiryDate: v }))} />
                </div>
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.secondaryBtn} onClick={closeMoaModal}>Cancel</button>
                {canCreate('capex.moa') && <button type="button" style={s.primaryBtn} onClick={submitMoaModal}>{editingMoaId ? 'Update MOA' : 'Save MOA'}</button>}
              </div>
            </Modal>
          )}

          {showVariationModal && (
            <Modal title="Create variation" subtitle="Raise a change to the approved budget." onClose={() => setShowVariationModal(false)}>
              <div style={s.lifecycleGrid}>
                <div style={s.modalField}>
                  <label style={s.modalLabel}>Original budget (OMR)</label>
                  <input style={s.compactInput} type="number" value={variationForm.originalBudget} onChange={e => setVariationForm(p => ({ ...p, originalBudget: e.target.value }))} />
                </div>
                <div style={s.modalField}>
                  <label style={s.modalLabel}>Revised budget (OMR)</label>
                  <input style={s.compactInput} type="number" value={variationForm.revisedBudget} onChange={e => setVariationForm(p => ({ ...p, revisedBudget: e.target.value }))} />
                </div>
                <div style={{ ...s.modalField, gridColumn: '1 / -1' }}>
                  <label style={s.modalLabel}>Variation justification</label>
                  <input style={s.compactInput} value={variationForm.justification} onChange={e => setVariationForm(p => ({ ...p, justification: e.target.value }))} />
                </div>
                <div style={{ ...s.modalField, gridColumn: '1 / -1' }}>
                  <label style={s.modalLabel}>Financial impact analysis</label>
                  <input style={s.compactInput} value={variationForm.financialImpactAnalysis} onChange={e => setVariationForm(p => ({ ...p, financialImpactAnalysis: e.target.value }))} />
                </div>
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

          {decisionModal.decision && (
            <Modal
              title={decisionModal.decision === 'RETURNED' ? 'Return for correction' : 'Reject request'}
              subtitle={decisionModal.decision === 'RETURNED'
                ? 'Tell the requester what needs to be fixed before resubmission.'
                : 'Record the reason this request cannot proceed.'}
              onClose={() => setDecisionModal({ decision: '', comment: '', error: '' })}
              maxWidth={520}
            >
              <Field label="Comment" full>
                <textarea
                  style={{ ...s.fieldInput, minHeight: 120, resize: 'vertical', lineHeight: 1.45 }}
                  placeholder={decisionModal.decision === 'RETURNED' ? 'Explain what needs to be corrected...' : 'Explain why this request is rejected...'}
                  value={decisionModal.comment}
                  onChange={e => setDecisionModal(p => ({ ...p, comment: e.target.value, error: '' }))}
                  autoFocus
                />
              </Field>
              {decisionModal.error && (
                <div style={s.decisionError}>{decisionModal.error}</div>
              )}
              <div style={s.modalFoot}>
                <button type="button" style={s.secondaryBtn} onClick={() => setDecisionModal({ decision: '', comment: '', error: '' })}>Cancel</button>
                <button
                  type="button"
                  style={decisionModal.decision === 'RETURNED' ? s.warnBtn : s.dangerBtn}
                  onClick={submitDecisionModal}
                  disabled={!decisionModal.comment.trim()}
                >
                  {decisionModal.decision === 'RETURNED' ? 'Return Request' : 'Reject Request'}
                </button>
              </div>
            </Modal>
          )}

          {canEdit('capex.approvals') && selectedRequest.currentStepId && (
            <div style={s.actionBar}>
              <div key={selectedRequest.currentStepId} style={s.actionBarContext}>
                <span style={s.actionBarMeta}>Current pending approval</span>
                <span style={s.actionBarLabel}>{currentStep.text}</span>
                {approvalActionNotice && <span style={s.actionBarNotice}>{approvalActionNotice}</span>}
                {!canDecideCurrentStep && currentStep.step && (
                  <span style={s.actionBarNotice}>
                    Waiting for {currentStep.step.assignedTo || currentStep.step.approverRole} to decide this step.
                  </span>
                )}
              </div>
              {canDecideCurrentStep && (
                <>
                  <SelectField
                    style={{ ...s.compactInput, minWidth: 220 }}
                    placeholder={delegatePlaceholder}
                    value={delegateTo}
                    onChange={setDelegateTo}
                    options={delegateCandidateOptions}
                    aria-label="Delegate current step to"
                    disabled={approvalActionState === 'saving' || delegateLoadState !== 'idle' || !delegateCandidateOptions.length}
                  />
                  <button type="button" style={s.warnBtn} onClick={handleDelegateStep} disabled={!delegateTo.trim() || approvalActionState === 'saving' || delegateLoadState !== 'idle'}>Delegate</button>
                  <button type="button" style={s.warnBtn} onClick={() => handleCapexDecision('RETURNED')} disabled={approvalActionState === 'saving'}>Return</button>
                  <button type="button" style={s.dangerBtn} onClick={() => handleCapexDecision('REJECTED')} disabled={approvalActionState === 'saving'}>Reject</button>
                  <SubmitFeedbackButton
                    state={approvalActionState}
                    idleLabel="Approve Step"
                    savingLabel="Approving"
                    savedLabel="Approved"
                    style={s.primaryBtn}
                    onClick={() => handleCapexDecision('APPROVED')}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'governance' && (
        <div>
          <div style={s.tabActionRow}>
            <div>
              <h2 style={s.sectionTitle}>CAPEX Governance</h2>
              <p style={s.tabSubtitle}>Review exceptions, assign decisions, and keep the portfolio within control.</p>
            </div>
            <div style={s.governanceActions}>
              {canView('capex.reports') && (
                <a href={getCapexGovernanceExportUrl('csv')} style={{ ...s.secondaryBtn, ...s.iconTextBtn, textDecoration: 'none' }}><Download size={15} /> Export CSV</a>
              )}
              <button type="button" style={{ ...s.primaryBtn, ...s.iconTextBtn }} onClick={() => refreshGovernance()}><RefreshCw size={15} /> Refresh data</button>
            </div>
          </div>

          <section style={s.attentionSection} aria-labelledby="attention-required-title">
            <div style={s.attentionHeader}>
              <div>
                <div style={s.eyebrow}>Decision queue</div>
                <h3 id="attention-required-title" style={s.attentionTitle}>Attention required</h3>
                <p style={s.attentionSubtitle}>Exceptions that need an owner or decision now.</p>
              </div>
              <strong style={s.attentionCount}>{governance?.generatedAlerts?.length || 0}</strong>
            </div>
            {(governance?.generatedAlerts || []).length ? (
              <div style={s.alertList}>
                {(governance?.generatedAlerts || []).map((alert, index) => (
                  <article key={`${alert.requestId || 'portfolio'}-${alert.alertType || index}`} style={s.alertRow}>
                    <span style={s.alertIcon}><CircleAlert size={18} /></span>
                    <div style={s.alertBody}>
                      <div style={s.alertMeta}>
                        <span style={s.severityBadge}>{alert.severity || 'Review'}</span>
                        <span>{alert.alertType || 'Governance exception'}</span>
                        {alert.requestId && <span style={s.requestRef}>{alert.requestId}</span>}
                      </div>
                      <strong style={s.alertMessage}>{alert.message || 'This item requires governance review.'}</strong>
                    </div>
                    {alert.requestId ? (
                      <button type="button" style={{ ...s.secondaryBtn, ...s.iconTextBtn }} onClick={() => { setActiveTab('requests'); openCapexRequest(alert.requestId); }}>
                        Review <ArrowRight size={15} />
                      </button>
                    ) : (
                      <span style={s.portfolioScope}>Portfolio level</span>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div style={s.clearState}>No governance exceptions need attention.</div>
            )}
          </section>

          <div style={s.governanceMetricGrid}>
            <SummaryCard label="Budget utilization" value={`${governance?.portfolio?.budgetUtilizationPercent || 0}%`} color="var(--label)" sub={`${fmtOMR(governance?.portfolio?.forecastSpend || 0)} forecast of ${fmtOMR(governance?.portfolio?.approvedBudget || 0)}`} />
            <SummaryCard label="AUC over 180 days" value={governance?.auc?.agedOver180Days || 0} color={(governance?.auc?.agedOver180Days || 0) > 0 ? 'var(--warning)' : 'var(--label)'} sub={`${fmtOMR(governance?.auc?.totalValue || 0)} total open AUC`} />
            <SummaryCard label="MOA violations" value={governance?.moaCompliance?.matrixViolations || 0} color={(governance?.moaCompliance?.matrixViolations || 0) > 0 ? 'var(--shell-red)' : 'var(--label)'} sub="Approval authority exceptions" />
            <SummaryCard label="Closure readiness" value={`${governance?.closure?.readinessPercent || 0}%`} color="var(--label)" sub={`${governance?.decisionGates?.passedGates || 0} of ${governance?.decisionGates?.totalGates || 0} gates passed`} />
          </div>

          <section style={s.section}>
            <div style={s.sectionHead}>
              <div>
                <h3 style={s.sectionTitle}>Portfolio drill-down</h3>
                <p style={s.sectionHint}>Compare the controls behind the headline metrics.</p>
              </div>
              <SelectField style={s.compactInput} value={drilldownType} onChange={handleDrilldownChange} options={['businessUnit', 'aucAging', 'moaCompliance', 'risks', 'variations', 'procurementPerformance', 'decisionGates']} aria-label="Drill-down type" />
            </div>
            <DataTable
              columns={Object.keys(drilldownRows[0] || {}).slice(0, 7).map(key => ({ key, label: key.replace(/[A-Z]/g, m => ` ${m}`).trim() }))}
              rows={drilldownRows}
              emptyMsg="No drill-down records available."
            />
          </section>

          <section style={s.section}>
            <div style={s.sectionHead}>
              <div>
                <h3 style={s.sectionTitle}>Control status</h3>
                <p style={s.sectionHint}>Supporting indicators for closure and assurance.</p>
              </div>
            </div>
            <div style={s.controlGrid}>
              <MiniInfo label="Pending Capitalization" value={governance?.capitalization?.pending || 0} />
              <MiniInfo label="Open PO Value" value={fmtOMR(governance?.poClosure?.openCommitmentValue || 0)} />
              <MiniInfo label="Document Versions" value={governance?.documentControls?.documentVersions || 0} />
              <MiniInfo label="E-Signatures" value={governance?.documentControls?.electronicSignatures || 0} />
              <MiniInfo label="Variations" value={governance?.variationControl?.totalVariations || 0} />
            </div>
          </section>

          <div style={s.governanceLowerGrid}>
            <details style={s.policyDetails}>
              <summary style={s.policySummary}>
                <span><strong>Policies and controls</strong><small>Business units, approval routes, and escalation thresholds</small></span>
                <ChevronDown size={17} />
              </summary>
              <div style={s.policyContent}>
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
            </details>

            <div style={s.section}>
              <div style={s.sectionHead}>
                <div>
                  <h3 style={s.sectionTitle}>Scheduled reports</h3>
                  <p style={s.sectionHint}>{reportSchedules.length} active schedule{reportSchedules.length === 1 ? '' : 's'}</p>
                </div>
                {canCreate('capex.reports') && (
                  <button type="button" style={{ ...s.dAddBtn, ...s.iconTextBtn }} onClick={() => setShowScheduleModal(true)}><Plus size={14} /> Add schedule</button>
                )}
              </div>
              <DataTable
                columns={[
                  { key: 'reportName', label: 'Report' },
                  { key: 'frequency', label: 'Frequency' },
                  { key: 'format', label: 'Format' },
                  { key: 'nextRunDate', label: 'Next run', render: value => <span style={s.dateCell}><CalendarClock size={14} /> {fmtDate(value)}</span> },
                ]}
                rows={showAllSchedules ? reportSchedules : reportSchedules.slice(0, 5)}
                emptyMsg="No schedules yet."
              />
              {reportSchedules.length > 5 && (
                <button type="button" style={s.viewAllBtn} onClick={() => setShowAllSchedules(value => !value)}>
                  {showAllSchedules ? 'Show next 5' : `View all ${reportSchedules.length} schedules`}
                </button>
              )}
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
              <SubmitFeedbackButton
                state={thresholdSaveState}
                idleLabel="Save Thresholds"
                savingLabel="Saving Thresholds"
                savedLabel="Thresholds Saved"
                style={s.primaryBtn}
                onClick={handleSaveThresholds}
              />
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
                  render: (v, row) => (
                    <SelectField
                      style={{ ...s.compactInput, minWidth: 220 }}
                      value={v}
                      onChange={value => handleWorkflowApproverRoleChange(row, value)}
                      options={WORKFLOW_ROLE_OPTIONS}
                      aria-label={`Approver role for ${row.label}`}
                    />
                  )
                },
                { key: 'allowedUserRoles', label: 'Allowed User Roles',
                  render: (v, row) => (
                    <WorkflowRolePicker
                      value={v || []}
                      onChange={roles => handleWorkflowRuleChange(row, 'allowedUserRoles', roles)}
                    />
                  )
                },
                { key: 'label', label: 'Step Label',
                  render: (v, row) => <input style={s.compactInput} value={v} onChange={e => handleWorkflowRuleChange(row, 'label', e.target.value)} />
                },
                { key: 'isActive', label: 'Active',
                  render: (v, row) => <Checkbox checked={!!v} onChange={c => handleWorkflowRuleChange(row, 'isActive', c)} aria-label="Active" />
                },
                { key: 'id', label: 'Action',
                  render: (_, row) => canEdit('capex.admin') ? (
                    <SubmitFeedbackButton
                      state={workflowSaveState[row.id] || 'idle'}
                      idleLabel="Save"
                      savingLabel="Saving"
                      savedLabel="Saved"
                      style={s.miniBtn}
                      onClick={() => handleSaveWorkflowRule(row)}
                    />
                  ) : '-'
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
                notifySuccess('CAPEX initiation submitted.');
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
            notifySuccess('Manual entry saved.');
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
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    padding: 0,
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
    alignItems: 'center',
    gap: 16,
    background: 'rgba(255,255,255,0.96)',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
    padding: '14px 22px',
    marginBottom: 12,
    boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
    backdropFilter: 'blur(8px)',
  },
  pageHeaderLeft: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  brandMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    minWidth: 38,
    padding: '0 8px',
    background: 'var(--shell-yellow)',
    border: '1px solid var(--accent-amber-line)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--gray-800)',
    fontSize: 11,
    fontWeight: 900,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  brandText: {
    color: 'var(--gray-600)',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  heading:    { margin: 0, fontSize: 18, lineHeight: 1.15, fontWeight: 800, color: 'var(--label)' },
  subheading: { margin: 0, fontSize: 12, color: 'var(--label-secondary)', maxWidth: 720, lineHeight: 1.45 },
  headerRight:{
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  syncBadge: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'var(--gray-50)', border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-pill)', padding: '6px 11px',
    fontSize: 11, fontWeight: 700, color: 'var(--gray-600)',
    whiteSpace: 'nowrap',
  },
  syncDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  refreshBtn: {
    padding: '7px 14px', background: '#FFFFFF',
    border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)',
    fontSize: 12, fontWeight: 800, cursor: 'pointer', color: 'var(--gray-700)',
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
    background: '#FADCDD',
    color: 'var(--shell-red)',
    fontWeight: 900,
    boxShadow: 'none',
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
  governanceActions: { display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },
  iconTextBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 },
  attentionSection: {
    background: '#FFFFFF', border: '1px solid rgba(211, 47, 47, 0.22)', borderLeft: '4px solid var(--shell-red)',
    borderRadius: 'var(--radius-md)', marginBottom: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
  },
  attentionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '20px 22px 16px' },
  eyebrow: { marginBottom: 5, color: 'var(--shell-red)', fontSize: 10, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em' },
  attentionTitle: { margin: 0, color: 'var(--label)', fontSize: 20, fontWeight: 850, lineHeight: 1.2 },
  attentionSubtitle: { margin: '5px 0 0', color: 'var(--label-secondary)', fontSize: 13 },
  attentionCount: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38,
    borderRadius: '50%', background: 'var(--accent-red-bg)', color: 'var(--shell-red)', fontSize: 17, fontVariantNumeric: 'tabular-nums',
  },
  alertList: { borderTop: '1px solid var(--gray-200)' },
  alertRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14, padding: '15px 22px', borderBottom: '1px solid var(--gray-200)' },
  alertIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
    borderRadius: 'var(--radius-sm)', background: 'var(--accent-red-bg)', color: 'var(--shell-red)', flexShrink: 0,
  },
  alertBody: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 },
  alertMeta: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: 'var(--label-secondary)', fontSize: 11, fontWeight: 700 },
  severityBadge: { padding: '3px 7px', borderRadius: 4, background: 'var(--shell-red)', color: '#FFFFFF', fontSize: 10, textTransform: 'uppercase' },
  requestRef: { fontVariantNumeric: 'tabular-nums', color: 'var(--gray-600)' },
  alertMessage: { color: 'var(--label)', fontSize: 13, fontWeight: 700, lineHeight: 1.4 },
  portfolioScope: { color: 'var(--label-secondary)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  clearState: { margin: '0 22px 20px', padding: '14px 16px', background: 'var(--gray-50)', color: 'var(--gray-600)', fontSize: 13, borderRadius: 'var(--radius-sm)' },
  governanceMetricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 },
  sectionHint: { margin: '-10px 0 0', color: 'var(--label-secondary)', fontSize: 12, lineHeight: 1.4 },
  governanceLowerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 18, alignItems: 'start' },
  policyDetails: {
    background: '#FFFFFF', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', marginBottom: 18,
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)', overflow: 'hidden',
  },
  policySummary: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 20px',
    cursor: 'pointer', color: 'var(--label)', fontSize: 14, listStyle: 'none',
  },
  policyContent: { padding: '0 20px 20px', borderTop: '1px solid var(--gray-200)' },
  dateCell: { display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  viewAllBtn: {
    width: '100%', marginTop: 10, padding: '9px 12px', border: 'none', borderTop: '1px solid var(--gray-200)',
    background: 'transparent', color: 'var(--shell-red)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  lockBadge: {
    background: 'var(--accent-amber-bg)',
    border: '1px solid var(--accent-amber-line)',
    borderRadius: 'var(--radius-pill)',
    color: 'var(--accent-amber-text)',
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 850,
    padding: '5px 10px',
  },
  primaryBtn: {
    padding: '9px 18px', background: 'var(--shell-red)',
    border: '1px solid var(--shell-red-dark)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 850, color: '#fff', cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15,23,42,0.08)', flexShrink: 0,
  },
  submitBtnInner: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 14,
  },
  submitBtnDisabled: {
    cursor: 'wait',
    opacity: 0.78,
    transform: 'translateY(1px)',
  },
  inlineSpinner: {
    width: 13,
    height: 13,
    border: '2px solid rgba(255,255,255,0.45)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
  disabledBtn: {
    padding: '9px 18px',
    background: 'var(--gray-200)',
    border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontWeight: 850,
    color: 'var(--gray-500)',
    cursor: 'not-allowed',
    boxShadow: 'none',
    flexShrink: 0,
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
  gateInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  gateTitleRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  tooltipWrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  tooltipTrigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    margin: 0,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'help',
    font: 'inherit',
  },
  tooltipBubble: {
    position: 'absolute',
    left: '50%',
    bottom: 'calc(100% + 10px)',
    transform: 'translateX(-50%)',
    zIndex: 20,
    minWidth: 180,
    maxWidth: 240,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#0F172A',
    color: '#F8FAFC',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.22)',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
    textAlign: 'center',
    whiteSpace: 'normal',
  },
  gateOwnerHint: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-amber-text)',
    flexShrink: 0,
    cursor: 'help',
  },
  gateMeta: {
    color: 'var(--label-secondary)',
    fontSize: 12.5,
    lineHeight: 1.4,
  },
  auditRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(170px, max-content)',
    gap: 14,
    alignItems: 'center',
    background: '#FFFFFF',
    border: '1px solid var(--separator-clear)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    fontSize: 13.5,
  },
  auditBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  auditTitle: {
    color: 'var(--label)',
    fontSize: 13.5,
    fontWeight: 850,
  },
  auditMessage: {
    color: 'var(--gray-600)',
    lineHeight: 1.45,
  },
  auditMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 3,
    color: 'var(--label-secondary)',
    fontSize: 12.5,
    textAlign: 'right',
    whiteSpace: 'nowrap',
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
  workflowRoleGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    minWidth: 360,
    maxWidth: 520,
  },
  workflowRoleOption: {
    margin: 0,
    padding: '5px 8px',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-pill)',
    background: '#FFFFFF',
    color: 'var(--label-secondary)',
    fontSize: 11,
    fontWeight: 750,
    whiteSpace: 'nowrap',
  },
  workflowRoleOptionActive: {
    borderColor: 'var(--accent-red-line)',
    background: 'var(--accent-red-bg)',
    color: 'var(--shell-red)',
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
  sortHeadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    textTransform: 'inherit',
    letterSpacing: 'inherit',
    cursor: 'pointer',
  },
  sortHeadBtnActive: {
    color: 'var(--shell-red)',
  },
  sortArrowStack: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 2,
    width: 8,
    transform: 'translateY(-1px)',
  },
  sortArrow: {
    width: 0,
    height: 0,
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
  },
  sortArrowUp: {
    borderBottom: '5px solid currentColor',
  },
  sortArrowDown: {
    borderTop: '5px solid currentColor',
  },
  sortArrowIdle: {
    color: 'var(--gray-400)',
    opacity: 0.7,
  },
  sortArrowActive: {
    color: 'var(--shell-red)',
    opacity: 1,
  },
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
  actionBarContext: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    marginRight: 'auto',
    minWidth: 300,
    animation: 'fadeIn 0.22s ease',
  },
  actionBarMeta: {
    fontSize: 10,
    fontWeight: 850,
    letterSpacing: '.06em',
    textTransform: 'uppercase',
    color: 'var(--label-tertiary)',
  },
  actionBarLabel: { fontSize: 13, fontWeight: 850, color: 'var(--label)' },
  actionBarNotice: {
    fontSize: 12,
    fontWeight: 750,
    color: 'var(--shell-red)',
    animation: 'fadeIn 0.22s ease',
  },

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
  disabledInput: {
    ...fieldInputStyle,
    background: 'var(--gray-50)',
    color: 'var(--label-tertiary)',
    cursor: 'not-allowed',
    opacity: 0.72,
  },
  poAttachmentField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  closureAttachmentField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  poAttachmentDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 42,
    padding: '10px 12px',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    background: '#FFFFFF',
  },
  poAttachmentDisplayDisabled: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 42,
    padding: '10px 12px',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--gray-50)',
    color: 'var(--label-tertiary)',
    opacity: 0.72,
  },
  poAttachmentName: {
    color: 'inherit',
    fontSize: 13,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dAddBtn: {
    height: 34, padding: '0 14px', border: '1px dashed var(--gray-300)', borderRadius: 'var(--radius-md)',
    background: '#FFFFFF', color: 'var(--gray-600)', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
  },
  modalFoot: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  modalField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 0,
  },
  modalContextGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 10,
    marginBottom: 14,
  },
  modalContextCard: {
    background: 'var(--gray-50)',
    border: '1px solid var(--gray-100)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    minWidth: 0,
  },
  modalContextLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--label-tertiary)',
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalContextValue: {
    fontSize: 13.5,
    fontWeight: 800,
    color: 'var(--label)',
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: 'var(--label-secondary)',
    letterSpacing: '.02em',
  },
  decisionError: {
    background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-line)',
    color: 'var(--shell-red)', borderRadius: 'var(--radius-xs)', padding: '10px 12px',
    fontSize: 13, fontWeight: 800, marginTop: 12,
  },
  infoNotice: {
    background: 'var(--accent-amber-bg)',
    border: '1px solid var(--accent-amber-line)',
    color: 'var(--accent-amber-text)',
    borderRadius: 'var(--radius-xs)',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.45,
  },
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
