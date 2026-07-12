const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete'];

const LEVELS = {
  capex: 'application',
  'capex.planning': 'module',
  'capex.planning.dashboard': 'page',
  'capex.planning.departments': 'page',
  'capex.tracking': 'module',
  'capex.tracking.manual-entry': 'page',
  'capex.governance': 'module',
  'capex.governance.dashboard': 'page',
  'capex.requests': 'page',
  'capex.approvals': 'page',
  'capex.procurement': 'page',
  'capex.execution': 'page',
  'capex.finance': 'page',
  'capex.closure': 'page',
  'capex.moa': 'page',
  'capex.variations': 'page',
  'capex.risks': 'page',
  'capex.documents': 'page',
  'capex.reports': 'page',
  'capex.admin': 'page',
  'capex.initiations': 'page',
};

function permission(resourceKey, actions, level = LEVELS[resourceKey] || 'page') {
  const row = {
    level,
    resource_key: resourceKey,
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  };

  for (const action of actions) {
    if (ACTIONS.includes(action)) row[action] = true;
  }

  return row;
}

function view(keys) {
  return keys.map((key) => permission(key, ['can_view']));
}

const COMMON_READ = [
  'capex',
  'capex.planning',
  'capex.planning.dashboard',
  'capex.planning.departments',
  'capex.governance',
  'capex.governance.dashboard',
  'capex.requests',
  'capex.documents',
];

const ROLE_PERMISSION_PRESETS = {
  Admin: [permission('capex', ACTIONS, 'application')],

  'CEO/Board': [
    ...view(COMMON_READ),
    permission('capex.reports', ['can_view']),
    permission('capex.approvals', ['can_view', 'can_edit']),
  ],

  CFO: [
    ...view(COMMON_READ),
    permission('capex.finance', ['can_view', 'can_edit']),
    permission('capex.closure', ['can_view', 'can_edit']),
    permission('capex.moa', ['can_view', 'can_create', 'can_edit']),
    permission('capex.variations', ['can_view', 'can_create', 'can_edit']),
    permission('capex.reports', ['can_view', 'can_create', 'can_edit']),
    permission('capex.approvals', ['can_view', 'can_edit']),
  ],

  'Finance Manager': [
    ...view(COMMON_READ),
    permission('capex.finance', ['can_view', 'can_edit']),
    permission('capex.closure', ['can_view', 'can_edit']),
    permission('capex.variations', ['can_view', 'can_create', 'can_edit']),
    permission('capex.reports', ['can_view', 'can_create']),
    permission('capex.tracking.manual-entry', ['can_view', 'can_create', 'can_edit']),
  ],

  'Finance in Business': [
    ...view(COMMON_READ),
    permission('capex.finance', ['can_view', 'can_edit']),
    permission('capex.variations', ['can_view', 'can_create', 'can_edit']),
    permission('capex.approvals', ['can_view', 'can_edit']),
  ],

  'CP Manager': [
    ...view(COMMON_READ),
    permission('capex.procurement', ['can_view', 'can_create', 'can_edit']),
    permission('capex.documents', ['can_view', 'can_create', 'can_edit']),
    permission('capex.reports', ['can_view']),
    permission('capex.approvals', ['can_view', 'can_edit']),
  ],

  'CP Lead': [
    ...view(COMMON_READ),
    permission('capex.procurement', ['can_view', 'can_create', 'can_edit']),
    permission('capex.documents', ['can_view', 'can_create', 'can_edit']),
    permission('capex.approvals', ['can_view', 'can_edit']),
  ],

  'Project Owner': [
    ...view(COMMON_READ),
    permission('capex.requests', ['can_view', 'can_create', 'can_edit']),
    permission('capex.risks', ['can_view', 'can_create', 'can_edit']),
    permission('capex.documents', ['can_view', 'can_create', 'can_edit']),
    permission('capex.approvals', ['can_view', 'can_edit']),
  ],

  'Project Engineer': [
    ...view(COMMON_READ),
    permission('capex.requests', ['can_view', 'can_create', 'can_edit']),
    permission('capex.procurement', ['can_view', 'can_create', 'can_edit']),
    permission('capex.execution', ['can_view', 'can_create', 'can_edit']),
    permission('capex.risks', ['can_view', 'can_create', 'can_edit']),
    permission('capex.documents', ['can_view', 'can_create', 'can_edit']),
  ],

  'Business GM': [
    ...view(COMMON_READ),
    permission('capex.approvals', ['can_view', 'can_edit']),
    permission('capex.moa', ['can_view', 'can_create', 'can_edit']),
    permission('capex.variations', ['can_view', 'can_edit']),
  ],

  'Internal Audit': [
    ...view(COMMON_READ),
    permission('capex.procurement', ['can_view']),
    permission('capex.finance', ['can_view']),
    permission('capex.closure', ['can_view']),
    permission('capex.moa', ['can_view']),
    permission('capex.variations', ['can_view']),
    permission('capex.risks', ['can_view']),
    permission('capex.reports', ['can_view']),
  ],

  'Asset Team': [
    ...view(COMMON_READ),
    permission('capex.finance', ['can_view', 'can_edit']),
  ],

  'HSSE Focal': [
    ...view(COMMON_READ),
    permission('capex.approvals', ['can_view', 'can_edit']),
    permission('capex.risks', ['can_view', 'can_create', 'can_edit']),
  ],

  Manager: [
    ...view(COMMON_READ),
    permission('capex.approvals', ['can_view', 'can_edit']),
  ],
};

function getRolePermissionPreset(role) {
  const preset = ROLE_PERMISSION_PRESETS[role] || [];
  const merged = new Map();

  for (const row of preset) {
    const current = merged.get(row.resource_key) || {
      level: row.level,
      resource_key: row.resource_key,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };

    for (const action of ACTIONS) {
      current[action] = current[action] || row[action];
    }

    merged.set(row.resource_key, current);
  }

  return [...merged.values()];
}

module.exports = {
  ROLE_PERMISSION_PRESETS,
  getRolePermissionPreset,
};
