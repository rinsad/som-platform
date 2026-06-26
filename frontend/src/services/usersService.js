const API = (() => {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return base === '/api' ? '' : base;
})();

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('som_token')}`,
  };
}

async function request(path, options = {}) {
  const r = await fetch(`${API}${path}`, { headers: authHeaders(), ...options });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error ?? `API error ${r.status}`);
    err.response = { data };
    throw err;
  }
  return data;
}

export const usersService = {
  list: () =>
    request('/api/users'),

  get: (id) =>
    request(`/api/users/${id}`),

  create: (payload) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id, payload) =>
    request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deactivate: (id) =>
    request(`/api/users/${id}/deactivate`, { method: 'PATCH' }),

  delete: (id) =>
    request(`/api/users/${id}`, { method: 'DELETE' }),
};

// ── Permission resource tree ──────────────────────────────────────────────────
// Drives both the UI checkbox tree and the DB resource_key values.
// Structure: Application > Module > Page > Fields
// Field keys match DB column names; labels match UI form/table headers.
export const USER_ROLES = [
  'Admin',
  'CEO/Board',
  'CFO',
  'Finance Manager',
  'Finance in Business',
  'CP Manager',
  'CP Lead',
  'Project Owner',
  'Project Engineer',
  'Business GM',
  'Internal Audit',
  'Asset Team',
  'HSSE Focal',
  'Manager',
  'Finance',
  'Employee',
];

export const PERMISSION_TREE = [
  // ── MODULE A: CAPEX PLANNING ─────────────────────────────────────────────
  {
    key: 'capex',
    label: 'CAPEX Governance',
    level: 'application',
    icon: '◈',
    modules: [
      {
        key: 'capex.planning',
        label: 'Planning',
        level: 'module',
        pages: [
          {
            key: 'capex.planning.dashboard',
            label: 'Overview Dashboard',
            level: 'page',
            fields: [
              { key: 'capex.planning.dashboard.total_budget',   label: 'Total Budget' },
              { key: 'capex.planning.dashboard.committed',      label: 'PO Commitments' },
              { key: 'capex.planning.dashboard.actual',         label: 'Actual Spend YTD' },
              { key: 'capex.planning.dashboard.remaining',      label: 'Remaining Balance' },
              { key: 'capex.planning.dashboard.percent_used',   label: '% Used' },
              { key: 'capex.planning.dashboard.monthly_chart',  label: 'Budget vs Actual Chart' },
            ],
          },
          {
            key: 'capex.planning.departments',
            label: 'Departments',
            level: 'page',
            fields: [
              { key: 'capex.planning.departments.total_budget',  label: 'Authorised Budget' },
              { key: 'capex.planning.departments.committed',     label: 'PO Committed' },
              { key: 'capex.planning.departments.actual',        label: 'Actual Spend' },
              { key: 'capex.planning.departments.remaining',     label: 'Remaining' },
              { key: 'capex.planning.departments.percent_used',  label: '% Consumed' },
              { key: 'capex.planning.departments.monthly_chart', label: 'Monthly Chart' },
            ],
          },
        ],
      },
      {
        key: 'capex.tracking',
        label: 'Tracking',
        level: 'module',
        pages: [
          {
            key: 'capex.tracking.manual-entry',
            label: 'Manual Entries',
            level: 'page',
            fields: [
              { key: 'capex.tracking.manual-entry.entry_type',       label: 'Entry Type' },
              { key: 'capex.tracking.manual-entry.department',       label: 'Department' },
              { key: 'capex.tracking.manual-entry.period',           label: 'Period' },
              { key: 'capex.tracking.manual-entry.amount',           label: 'Amount (OMR)' },
              { key: 'capex.tracking.manual-entry.description',      label: 'Description' },
              { key: 'capex.tracking.manual-entry.reference_number', label: 'Reference Number' },
              { key: 'capex.tracking.manual-entry.entered_by',       label: 'Entered By' },
              { key: 'capex.tracking.manual-entry.status',           label: 'Status' },
            ],
          },
        ],
      },
      {
        key: 'capex.governance',
        label: 'Governance',
        level: 'module',
        pages: [
          {
            key: 'capex.governance.dashboard',
            label: 'Governance Dashboard',
            level: 'page',
            fields: [
              { key: 'capex.governance.dashboard.portfolio',      label: 'Portfolio Summary' },
              { key: 'capex.governance.dashboard.auc',            label: 'AUC Aging' },
              { key: 'capex.governance.dashboard.capitalization', label: 'Capitalization' },
              { key: 'capex.governance.dashboard.po_closure',     label: 'PO Closure' },
              { key: 'capex.governance.dashboard.moa_compliance', label: 'MOA Compliance' },
              { key: 'capex.governance.dashboard.risk',           label: 'Risk Register' },
            ],
          },
          {
            key: 'capex.requests',
            label: 'CAPEX Requests',
            level: 'page',
            fields: [
              { key: 'capex.requests.scope',       label: 'Scope & Business Case' },
              { key: 'capex.requests.quotations',  label: 'Supplier Quotations' },
              { key: 'capex.requests.milestones',  label: 'Milestones' },
              { key: 'capex.requests.attachments', label: 'Attachments' },
            ],
          },
          {
            key: 'capex.approvals',
            label: 'Approvals & Decision Gates',
            level: 'page',
            fields: [
              { key: 'capex.approvals.workflow', label: 'Approval Workflow' },
              { key: 'capex.approvals.gates',    label: 'Decision Gates' },
              { key: 'capex.approvals.comments', label: 'Approval Comments' },
            ],
          },
          {
            key: 'capex.procurement',
            label: 'Procurement & PR/PO',
            level: 'page',
            fields: [
              { key: 'capex.procurement.pr',          label: 'PR Tracking' },
              { key: 'capex.procurement.po',          label: 'PO Tracking' },
              { key: 'capex.procurement.vendor',      label: 'Vendor Controls' },
              { key: 'capex.procurement.performance', label: 'Procurement KPIs' },
            ],
          },
          {
            key: 'capex.finance',
            label: 'Finance, AUC & Capitalization',
            level: 'page',
            fields: [
              { key: 'capex.finance.budget',         label: 'Budget Monitoring' },
              { key: 'capex.finance.auc',            label: 'AUC Tracking' },
              { key: 'capex.finance.capitalization', label: 'Capitalization' },
              { key: 'capex.finance.benefits',       label: 'Benefit Reviews' },
            ],
          },
          {
            key: 'capex.closure',
            label: 'Closure Controls',
            level: 'page',
            fields: [
              { key: 'capex.closure.financial',      label: 'Financial Closure' },
              { key: 'capex.closure.po',             label: 'PO Closure' },
              { key: 'capex.closure.checklist',      label: 'Closure Checklist' },
              { key: 'capex.closure.asset_handover', label: 'Asset Handover' },
            ],
          },
          {
            key: 'capex.moa',
            label: 'MOA Records',
            level: 'page',
            fields: [
              { key: 'capex.moa.matrix',    label: 'Authority Matrix' },
              { key: 'capex.moa.revisions', label: 'MOA Revisions' },
              { key: 'capex.moa.expiry',    label: 'Expiry & Renewal' },
            ],
          },
          {
            key: 'capex.variations',
            label: 'Budget Variations',
            level: 'page',
            fields: [
              { key: 'capex.variations.transfer', label: 'Transfers' },
              { key: 'capex.variations.impact',   label: 'Financial Impact' },
              { key: 'capex.variations.fib',      label: 'FiB Review' },
            ],
          },
          {
            key: 'capex.risks',
            label: 'Risk & Escalations',
            level: 'page',
            fields: [
              { key: 'capex.risks.register',    label: 'Risk Register' },
              { key: 'capex.risks.mitigation',  label: 'Mitigation Plan' },
              { key: 'capex.risks.escalations', label: 'Escalations' },
            ],
          },
          {
            key: 'capex.documents',
            label: 'Documents & Signatures',
            level: 'page',
            fields: [
              { key: 'capex.documents.versions',   label: 'Document Versions' },
              { key: 'capex.documents.signatures', label: 'E-Signatures' },
              { key: 'capex.documents.audit',      label: 'Audit History' },
            ],
          },
          {
            key: 'capex.reports',
            label: 'Reports & Scheduling',
            level: 'page',
            fields: [
              { key: 'capex.reports.export',    label: 'Report Exports' },
              { key: 'capex.reports.schedules', label: 'Report Schedules' },
            ],
          },
          {
            key: 'capex.admin',
            label: 'Admin Configuration',
            level: 'page',
            fields: [
              { key: 'capex.admin.thresholds',      label: 'Value Thresholds' },
              { key: 'capex.admin.workflow_matrix', label: 'Workflow Matrix' },
            ],
          },
          {
            key: 'capex.initiations',
            label: 'Initiations & Budget Uploads',
            level: 'page',
            fields: [
              { key: 'capex.initiations.pipeline',       label: 'Initiation Pipeline' },
              { key: 'capex.initiations.budget_uploads', label: 'Budget Uploads' },
            ],
          },
        ],
      },
    ],
  },

  // ── MODULE B: PURCHASE REQUESTS ──────────────────────────────────────────
  {
    key: 'purchase-requests',
    label: 'Purchase Requests',
    level: 'application',
    icon: '◎',
    modules: [
      {
        key: 'purchase-requests.requests',
        label: 'Requests',
        level: 'module',
        pages: [
          {
            key: 'purchase-requests.requests.list',
            label: 'Request List',
            level: 'page',
            fields: [
              { key: 'purchase-requests.requests.list.title',       label: 'Title' },
              { key: 'purchase-requests.requests.list.department',  label: 'Department' },
              { key: 'purchase-requests.requests.list.total_value', label: 'Total Value (OMR)' },
              { key: 'purchase-requests.requests.list.tier',        label: 'Tier' },
              { key: 'purchase-requests.requests.list.status',      label: 'Status' },
              { key: 'purchase-requests.requests.list.created_at',  label: 'Date Submitted' },
            ],
          },
          {
            key: 'purchase-requests.requests.new-request',
            label: 'New Request Form',
            level: 'page',
            fields: [
              { key: 'purchase-requests.requests.new-request.title',         label: 'PR Title' },
              { key: 'purchase-requests.requests.new-request.department',    label: 'Department' },
              { key: 'purchase-requests.requests.new-request.description',   label: 'Description' },
              { key: 'purchase-requests.requests.new-request.line_items',    label: 'Line Items' },
              { key: 'purchase-requests.requests.new-request.quote_count',   label: 'Quotes Attached' },
              { key: 'purchase-requests.requests.new-request.justification', label: 'Justification' },
            ],
          },
          {
            key: 'purchase-requests.requests.detail',
            label: 'Request Detail',
            level: 'page',
            fields: [
              { key: 'purchase-requests.requests.detail.requestor_name',  label: 'Requestor' },
              { key: 'purchase-requests.requests.detail.total_value',     label: 'Total Value (OMR)' },
              { key: 'purchase-requests.requests.detail.tier',            label: 'Approval Tier' },
              { key: 'purchase-requests.requests.detail.quote_count',     label: 'Quote Count' },
              { key: 'purchase-requests.requests.detail.description',     label: 'Description' },
              { key: 'purchase-requests.requests.detail.justification',   label: 'Justification' },
              { key: 'purchase-requests.requests.detail.line_items',      label: 'Line Items' },
              { key: 'purchase-requests.requests.detail.approval_history',label: 'Approval History' },
            ],
          },
        ],
      },
      {
        key: 'purchase-requests.approvals',
        label: 'Approvals',
        level: 'module',
        pages: [
          {
            key: 'purchase-requests.approvals.queue',
            label: 'Approval Queue',
            level: 'page',
            fields: [
              { key: 'purchase-requests.approvals.queue.decision', label: 'Approve / Reject / Return' },
              { key: 'purchase-requests.approvals.queue.comment',  label: 'Comment' },
            ],
          },
        ],
      },
    ],
  },

  // ── MODULE C: ASSETS (RADP) ──────────────────────────────────────────────
  {
    key: 'assets',
    label: 'Assets (RADP)',
    level: 'application',
    icon: '◉',
    modules: [
      {
        key: 'assets.registry',
        label: 'Registry',
        level: 'module',
        pages: [
          {
            key: 'assets.registry.list',
            label: 'Asset List',
            level: 'page',
            fields: [
              { key: 'assets.registry.list.asset_code',     label: 'Asset Code' },
              { key: 'assets.registry.list.name',           label: 'Asset Name' },
              { key: 'assets.registry.list.region',         label: 'Region' },
              { key: 'assets.registry.list.site',           label: 'Site' },
              { key: 'assets.registry.list.facility',       label: 'Facility' },
              { key: 'assets.registry.list.equipment_type', label: 'Equipment Type' },
              { key: 'assets.registry.list.department',     label: 'Department' },
              { key: 'assets.registry.list.status',         label: 'Status' },
            ],
          },
          {
            key: 'assets.registry.compliance',
            label: 'Compliance Alerts',
            level: 'page',
            fields: [
              { key: 'assets.registry.compliance.type',           label: 'Alert Type' },
              { key: 'assets.registry.compliance.asset_code',     label: 'Asset Code' },
              { key: 'assets.registry.compliance.message',        label: 'Message' },
              { key: 'assets.registry.compliance.days_remaining', label: 'Days Remaining' },
              { key: 'assets.registry.compliance.severity',       label: 'Severity' },
            ],
          },
          {
            key: 'assets.registry.work-orders',
            label: 'Work Orders',
            level: 'page',
            fields: [
              { key: 'assets.registry.work-orders.asset_code',      label: 'Asset Code' },
              { key: 'assets.registry.work-orders.type',            label: 'Work Order Type' },
              { key: 'assets.registry.work-orders.priority',        label: 'Priority' },
              { key: 'assets.registry.work-orders.description',     label: 'Description' },
              { key: 'assets.registry.work-orders.scheduled_date',  label: 'Scheduled Date' },
              { key: 'assets.registry.work-orders.technician',      label: 'Technician' },
              { key: 'assets.registry.work-orders.department',      label: 'Department' },
              { key: 'assets.registry.work-orders.estimated_hours', label: 'Estimated Hours' },
              { key: 'assets.registry.work-orders.notes',           label: 'Notes' },
              { key: 'assets.registry.work-orders.status',          label: 'Status' },
            ],
          },
        ],
      },
      {
        key: 'assets.billing',
        label: 'Billing',
        level: 'module',
        pages: [
          {
            key: 'assets.billing.utility-bills',
            label: 'Utility Bills',
            level: 'page',
            fields: [
              { key: 'assets.billing.utility-bills.site_id',       label: 'Site' },
              { key: 'assets.billing.utility-bills.utility_type',  label: 'Utility Type' },
              { key: 'assets.billing.utility-bills.period',        label: 'Period' },
              { key: 'assets.billing.utility-bills.amount',        label: 'Amount (OMR)' },
              { key: 'assets.billing.utility-bills.meter_reading', label: 'Meter Reading' },
              { key: 'assets.billing.utility-bills.unit',          label: 'Unit' },
            ],
          },
        ],
      },
    ],
  },

];
