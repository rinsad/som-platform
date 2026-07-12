// CAPEX request lifecycle state machine and approval authority rules.
// Pure functions/constants — no DB access — so the rules are unit-testable
// and there is one source of truth for which actions each status allows.
//
// Status names follow the PRD status model (capex-product-requirements-
// document.md section 14). LEGACY_STATUS_MAP translates strings written by
// earlier builds (also remapped in DB by migration 016).

const CANONICAL_STATUSES = [
  'Draft',
  'Submitted',
  'Returned for correction',
  'Pending line manager endorsement',
  'Pending FIB validation',
  'Pending CP review',
  'Pending HSSE / worker welfare review',
  'Pending GM approval',
  'Pending CFO approval',
  'Pending EMT approval',
  'Pending Contract Board approval',
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
  'Rejected',
  'Cancelled',
];

const LEGACY_STATUS_MAP = {
  'Pending Vendor Registration / NDA / DPA': 'Procurement in progress',
  'GSAP Project Created': 'GSAP project created',
  'PR Created': 'PR created',
  'PO Created': 'PO created',
  'PO Uploaded': 'PO uploaded',
  'In Execution': 'In execution',
  'Pending Financial Closure': 'Pending final closure',
  'Approved for Procurement': 'Approved',
  'Returned for Correction': 'Returned for correction',
  'Pending FiB Validation': 'Pending FIB validation',
  'Pending HSSE Approval': 'Pending HSSE / worker welfare review',
  'Pending CP Review': 'Pending CP review',
  'Pending Contract Board Approval': 'Pending Contract Board approval',
  'Pending Management Approval': 'Pending GM approval',
  'Pending Line Manager Endorsement': 'Pending line manager endorsement',
};

function canonicalStatus(status) {
  return LEGACY_STATUS_MAP[status] || status;
}

// Statuses counting as "approved or later" for financial aggregation.
const APPROVED_OR_LATER_STATUSES = [
  'Approved', 'Procurement in progress', 'GSAP project created', 'PR created',
  'PO created', 'PO uploaded', 'In execution', 'Delayed',
  'Technically complete', 'Physically complete', 'Pending PO closure',
  'Pending AUC review', 'Pending capitalization', 'Pending asset handover',
  'Pending benefits review', 'Pending final closure', 'Closed',
];

// Procurement tracking (vendor docs, GSAP/PR/PO references) may only be
// edited after the approval chain has completed and before/during execution.
const PROCUREMENT_EDITABLE_STATUSES = [
  'Approved', 'Procurement in progress', 'GSAP project created',
  'PR created', 'PO created', 'PO uploaded', 'In execution', 'Delayed',
];

// Milestones require the PO document to be uploaded before execution starts.
const MILESTONE_CREATE_STATUSES = ['PO uploaded', 'In execution', 'Delayed'];

// Milestone updates are frozen in terminal / pre-approval-reset states.
const MILESTONE_UPDATE_BLOCKED_STATUSES = ['Rejected', 'Closed', 'Cancelled', 'Returned for correction'];

const RESUBMITTABLE_STATUSES = ['Returned for correction'];

function canEditProcurement(status) {
  return PROCUREMENT_EDITABLE_STATUSES.includes(canonicalStatus(status));
}

function canCreateMilestone(status) {
  return MILESTONE_CREATE_STATUSES.includes(canonicalStatus(status));
}

function canUpdateMilestone(status) {
  return !MILESTONE_UPDATE_BLOCKED_STATUSES.includes(canonicalStatus(status));
}

function canResubmit(status) {
  return RESUBMITTABLE_STATUSES.includes(canonicalStatus(status));
}

function canDecide(request) {
  return !!request?.current_step_id;
}

// Approval authority for a workflow step.
// Returns:
//   'assigned'       — the step is explicitly assigned to this user
//   'role-allowed'   — the admin-configured authority roles include the user
//   'denied'         — authority roles are configured and exclude the user
//   'admin-override' — Admin acting outside assignment/config (audit-logged)
//   'unconfigured'   — no assignment and no configured authority roles
function decisionAuthority(user, step, allowedRolesFromDb) {
  const assignee = (step?.assigned_to || '').trim().toLowerCase();
  if (assignee) {
    const name = (user?.full_name || '').trim().toLowerCase();
    const email = (user?.email || '').trim().toLowerCase();
    if (assignee === name || assignee === email) return 'assigned';
  }
  const configured = Array.isArray(allowedRolesFromDb) ? allowedRolesFromDb.filter(Boolean) : [];
  if (configured.length > 0) {
    if (user?.role && configured.includes(user.role)) return 'role-allowed';
    if (user?.role === 'Admin') return 'admin-override';
    return 'denied';
  }
  if (assignee) {
    // Step is assigned to someone else; without a configured matrix the
    // assignment is the only authority signal.
    return user?.role === 'Admin' ? 'admin-override' : 'denied';
  }
  return user?.role === 'Admin' ? 'admin-override' : 'unconfigured';
}

// Explicit step-role -> pending-status map (canonical names). Replaces the
// old substring matching, which broke when admins renamed workflow roles.
const STEP_ROLE_PENDING_STATUS = {
  'Line Manager': 'Pending line manager endorsement',
  Manager: 'Pending line manager endorsement',
  'HSSE Focal': 'Pending HSSE / worker welfare review',
  FiB: 'Pending FIB validation',
  'Finance in Business': 'Pending FIB validation',
  'CP Lead': 'Pending CP review',
  'Head of CP': 'Pending CP review',
  'CP Manager / Head of CP': 'Pending CP review',
  'CP Manager': 'Pending CP review',
  CP: 'Pending CP review',
  'Contract Holder / Owner': 'Pending CP review',
  'Project Owner': 'Pending CP review',
  'Business GM': 'Pending GM approval',
  CFO: 'Pending CFO approval',
  EMT: 'Pending EMT approval',
  'Contract Board': 'Pending Contract Board approval',
};

function requestStatusForStep(step) {
  if (!step) return 'Approved';
  const role = step.approver_role || step.role || '';
  const label = (step.label || '').toLowerCase();
  if (role === 'CEO/Board' && label.includes('contract board')) return 'Pending Contract Board approval';
  if (role === 'CEO/Board' && label.includes('emt')) return 'Pending EMT approval';
  return STEP_ROLE_PENDING_STATUS[role] || 'Pending GM approval';
}

module.exports = {
  CANONICAL_STATUSES,
  LEGACY_STATUS_MAP,
  APPROVED_OR_LATER_STATUSES,
  PROCUREMENT_EDITABLE_STATUSES,
  MILESTONE_CREATE_STATUSES,
  MILESTONE_UPDATE_BLOCKED_STATUSES,
  RESUBMITTABLE_STATUSES,
  STEP_ROLE_PENDING_STATUS,
  canonicalStatus,
  canEditProcurement,
  canCreateMilestone,
  canUpdateMilestone,
  canResubmit,
  canDecide,
  decisionAuthority,
  requestStatusForStep,
};
