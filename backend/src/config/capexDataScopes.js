// Which data a role may see — the single source of truth for multi-business
// scoping. Pure and DB-free, in the same spirit as capexStateMachine.js, so the
// whole role/tier/predicate matrix is unit-testable without a database.
//
// Tiers:
//   PORTFOLIO — the whole company. Executives, audit and the central functions.
//   BUSINESS  — requests belonging to the businesses the user is assigned to,
//               plus their own requests and anything awaiting their decision.
//   OWN       — their own requests and anything awaiting their decision.
//
// Anything not recognised falls to OWN. Fail closed: a role we have never heard
// of must never inherit portfolio-wide visibility.

const { ROLE_PERMISSION_PRESETS } = require('./capexRolePermissions');

const SCOPE_TIERS = {
  PORTFOLIO: 'PORTFOLIO',
  BUSINESS: 'BUSINESS',
  OWN: 'OWN',
};

// Company-wide roles. Finance Manager, CP Manager and Asset Team are central
// functions that service every business, so they are portfolio too.
const PORTFOLIO_ROLES = [
  'Admin',
  'CEO/Board',
  'CFO',
  'Internal Audit',
  'Finance Manager',
  'CP Manager',
  'Asset Team',
];

// Roles a business staffs for itself.
const BUSINESS_ROLES = [
  'Business GM',
  'Manager',
  'Finance in Business',
  'CP Lead',
  'HSSE Focal',
  'Project Owner',
  'Project Engineer',
];

// Business roles that are additionally limited to requests they raised or are
// assigned to, rather than everything in their business.
const OWN_RESTRICTED_ROLES = [
  'Project Owner',
  'Project Engineer',
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isGlobalRole(role) {
  return PORTFOLIO_ROLES.includes(role);
}

function scopeTierForRole(role) {
  if (PORTFOLIO_ROLES.includes(role)) return SCOPE_TIERS.PORTFOLIO;
  if (OWN_RESTRICTED_ROLES.includes(role)) return SCOPE_TIERS.OWN;
  if (BUSINESS_ROLES.includes(role)) return SCOPE_TIERS.BUSINESS;
  return SCOPE_TIERS.OWN;
}

// Serialised to the admin UI so the user form's "is a business required for this
// role?" rule cannot drift from what the backend actually enforces.
function roleScopeCatalog() {
  const roles = new Set([
    ...Object.keys(ROLE_PERMISSION_PRESETS),
    ...PORTFOLIO_ROLES,
    ...BUSINESS_ROLES,
  ]);
  return [...roles].sort().map((role) => ({
    role,
    tier: scopeTierForRole(role),
    requiresBusiness: scopeTierForRole(role) !== SCOPE_TIERS.PORTFOLIO,
  }));
}

function canAccessOrganization(context, organizationUnitId) {
  if (context?.isAdmin || context?.tier === SCOPE_TIERS.PORTFOLIO) return true;
  if (!organizationUnitId) return false;
  return (context?.organizationUnitIds || []).includes(organizationUnitId);
}

// Builds a WHERE fragment restricting a request-like table to what the user may
// see, as { sql, params } so callers can splice it in at the right $n offset.
//
// The assigned arm is the anti-starvation guarantee: an approver keeps sight of
// a request awaiting their decision even when it belongs to another business.
function buildScopePredicate(context, options = {}) {
  const {
    alias = 'r',
    startIndex = 1,
    orgColumn = 'organization_unit_id',
    ownerColumn = 'requester_id',
    assignedStepTable = 'capex_approval_steps',
    assignedStepFk = 'request_id',
    includeAssignedArm = true,
  } = options;

  if (context?.isAdmin || context?.tier === SCOPE_TIERS.PORTFOLIO) {
    return { sql: 'TRUE', params: [] };
  }

  const clauses = [];
  const params = [];
  const nextParam = (value) => {
    params.push(value);
    return `$${startIndex + params.length - 1}`;
  };

  const organizationUnitIds = [...new Set((context?.organizationUnitIds || []).filter(Boolean))];
  if (context?.tier === SCOPE_TIERS.BUSINESS && organizationUnitIds.length) {
    clauses.push(`${alias}.${orgColumn} = ANY(${nextParam(organizationUnitIds)}::uuid[])`);
  }

  if (context?.userId && UUID_RE.test(String(context.userId))) {
    clauses.push(`${alias}.${ownerColumn} = ${nextParam(String(context.userId))}`);
  }

  const identityKeys = [...new Set((context?.identityKeys || [])
    .filter(Boolean)
    .map((key) => String(key).trim().toLowerCase())
    .filter((key) => key !== ''))];
  if (includeAssignedArm && assignedStepTable && identityKeys.length) {
    clauses.push(`EXISTS (
      SELECT 1 FROM ${assignedStepTable} s_scope
       WHERE s_scope.${assignedStepFk} = ${alias}.id
         AND lower(btrim(s_scope.assigned_to)) = ANY(${nextParam(identityKeys)}::text[])
    )`);
  }

  // No arms at all means no basis for visibility — show nothing rather than
  // everything.
  if (!clauses.length) return { sql: 'FALSE', params: [] };

  return { sql: `(${clauses.join(' OR ')})`, params };
}

module.exports = {
  SCOPE_TIERS,
  PORTFOLIO_ROLES,
  BUSINESS_ROLES,
  OWN_RESTRICTED_ROLES,
  isGlobalRole,
  scopeTierForRole,
  roleScopeCatalog,
  canAccessOrganization,
  buildScopePredicate,
};
