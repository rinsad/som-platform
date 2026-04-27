const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
export const PERMISSION_TREE = [
  // ── MODULE A: CAPEX PLANNING ─────────────────────────────────────────────
  {
    key: 'capex',
    label: 'Capex Planning',
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
