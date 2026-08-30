// Request-time multi-business scope for the legacy CAPEX and Purchase Request
// controllers.
//
// The pure role/tier/predicate rules live in config/capexDataScopes.js; this
// module is the part that touches the database — loading a user's effective
// scope assignments, reading the enforcement switch, and the couple of helpers
// controllers need to gate a single record.
//
// Scope is read live on each request rather than carried in the JWT, matching
// how middleware/auth.js already re-reads is_active and role: an administrator
// reassigning someone's business must take effect on their next call, not up to
// eight hours later, and assignments are effective-dated so they can change with
// no token event at all.

const pool = require('../database/db');
const { loadScopeAssignmentRows } = require('../modules/capexV2/access');
const {
  SCOPE_TIERS,
  scopeTierForRole,
  buildScopePredicate,
} = require('../config/capexDataScopes');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// How a request-like table maps onto the predicate builder.
const SCOPED_TABLES = {
  capex_requests: {
    ownerColumn: 'requester_id',
    assignedStepTable: 'capex_approval_steps',
    assignedStepFk: 'request_id',
    includeAssignedArm: true,
  },
  purchase_requests: {
    ownerColumn: 'requestor_id',
    // Purchase-request approvals live in an approval_history JSONB blob with no
    // per-user assignment, so there is no assigned arm to add.
    includeAssignedArm: false,
  },
};

// ── Enforcement switch ───────────────────────────────────────────────────────
const ENFORCEMENT_TTL_MS = 30_000;
let enforcementCache = { value: null, readAt: 0 };

async function getEnforcementMode(db = pool) {
  const now = Date.now();
  if (enforcementCache.value && now - enforcementCache.readAt < ENFORCEMENT_TTL_MS) {
    return enforcementCache.value;
  }
  try {
    const { rows: [row] } = await db.query(
      `SELECT enforcement_mode FROM capex_scope_settings WHERE id = 1`
    );
    enforcementCache = { value: row?.enforcement_mode || 'off', readAt: now };
  } catch (err) {
    // Never let a missing settings row or a DB hiccup lock the platform down.
    enforcementCache = { value: 'off', readAt: now };
  }
  return enforcementCache.value;
}

function resetEnforcementCache() {
  enforcementCache = { value: null, readAt: 0 };
}

// ── Scope context ────────────────────────────────────────────────────────────
async function loadScopeContext(req, db) {
  const user = req.user || {};
  const role = user.role || null;
  const isAdmin = role === 'Admin';
  const enforcement = await getEnforcementMode(db);

  const identityKeys = [user.email, user.full_name]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase())
    .filter((value) => value !== '');

  const base = {
    userId: user.id ? String(user.id) : null,
    role,
    isAdmin,
    identityKeys,
    enforcement,
    organizationUnitIds: [],
    organizationUnitNames: [],
    hasScopeAssignment: false,
  };

  // Synthetic (non-UUID) service tokens have no scope rows to look up. Admin
  // tooling keeps portfolio reach; anything else falls back to its role tier
  // with no businesses, i.e. fails closed.
  if (!UUID_RE.test(String(user.id || ''))) {
    return { ...base, tier: isAdmin ? SCOPE_TIERS.PORTFOLIO : scopeTierForRole(role) };
  }

  const rows = await loadScopeAssignmentRows(db, user.id);
  const organizationUnitIds = [...new Set(rows
    .filter((row) => row.organization_unit_id)
    .map((row) => row.organization_unit_id))];
  const organizationUnitNames = [...new Set(rows
    .filter((row) => row.organization_unit_id && row.organization_name)
    .map((row) => row.organization_name))];

  const hasPortfolioRow = rows.some((row) => row.scope_type === 'PORTFOLIO');
  const tier = (isAdmin || hasPortfolioRow || scopeTierForRole(role) === SCOPE_TIERS.PORTFOLIO)
    ? SCOPE_TIERS.PORTFOLIO
    : scopeTierForRole(role);

  return {
    ...base,
    tier,
    organizationUnitIds,
    organizationUnitNames,
    hasScopeAssignment: rows.length > 0,
  };
}

// Memoised per request: several handlers re-enter one another (decideRequest
// finishes by calling getRequestById) and the scope must not be re-queried.
function getScopeContext(req, db = pool) {
  if (!req._somScopeContext) {
    req._somScopeContext = loadScopeContext(req, db);
  }
  return req._somScopeContext;
}

// ── Predicates ───────────────────────────────────────────────────────────────
// Returns the WHERE fragment for a scoped read. Outside full enforcement it
// degrades to TRUE so the same code can ship inert and be switched on later
// with a single settings row.
function scopeFilter(scope, options = {}) {
  if (scope?.enforcement !== 'on') return { sql: 'TRUE', params: [] };
  return buildScopePredicate(scope, options);
}

function scopeFilterForTable(scope, table, options = {}) {
  const config = SCOPED_TABLES[table] || {};
  return scopeFilter(scope, { ...config, ...options });
}

// Restricts a table keyed only by a free-text department name — the legacy
// budget/planning endpoints, which have no request id to join on. Matching goes
// through the alias bridge, so renaming a business does not orphan its history.
//
// Own-requests users get nothing here: these are budget views with no personal
// dimension, so there is no sensible narrowing short of empty.
function departmentScopeFilter(scope, { column, startIndex = 1 } = {}) {
  if (scope?.enforcement !== 'on') return { sql: 'TRUE', params: [] };
  if (scope.isAdmin || scope.tier === SCOPE_TIERS.PORTFOLIO) return { sql: 'TRUE', params: [] };
  if (scope.tier !== SCOPE_TIERS.BUSINESS || !scope.organizationUnitIds.length) {
    return { sql: 'FALSE', params: [] };
  }

  return {
    sql: `EXISTS (
      SELECT 1 FROM capex_v2.organization_unit_aliases al_scope
       WHERE al_scope.alias_normalized = lower(btrim(${column}))
         AND al_scope.organization_unit_id = ANY($${startIndex}::uuid[])
    )`,
    params: [scope.organizationUnitIds],
  };
}

// ── Single-record gate ───────────────────────────────────────────────────────
// Reads return 404 rather than 403 for an out-of-scope record so the scoping on
// list endpoints cannot be defeated by enumerating ids.
function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

async function requireRequestInScope(db, req, table, id, options = {}) {
  const config = SCOPED_TABLES[table];
  if (!config) throw new Error(`No scope configuration for table '${table}'`);

  const scope = await getScopeContext(req, db);
  const filter = scopeFilterForTable(scope, table, { alias: 'r', startIndex: 2 });

  const { rows: [row] } = await db.query(
    `SELECT r.* FROM ${table} r WHERE r.id = $1 AND ${filter.sql}`,
    [id, ...filter.params]
  );
  if (!row) {
    throw notFound(options.message || (table === 'purchase_requests'
      ? 'Purchase request not found'
      : 'CAPEX request not found'));
  }
  return row;
}

// ── Write-path helpers ───────────────────────────────────────────────────────
// Resolves a submitted business, falling back to the free-text department via
// the alias bridge so requests created by older clients are still tagged.
async function resolveOrganizationUnitId(db, { organizationUnitId, department } = {}) {
  if (organizationUnitId) {
    const { rows: [unit] } = await db.query(
      `SELECT id FROM capex_v2.organization_units
        WHERE id = $1 AND is_active = TRUE
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`,
      [organizationUnitId]
    );
    if (unit) return unit.id;
  }

  if (department && String(department).trim() !== '') {
    const { rows: [match] } = await db.query(
      `SELECT al.organization_unit_id
         FROM capex_v2.organization_unit_aliases al
        WHERE al.alias_normalized = lower(btrim($1))
        UNION ALL
       SELECT o.id
         FROM capex_v2.organization_units o
        WHERE lower(btrim(o.name)) = lower(btrim($1))
          AND o.is_active = TRUE
        LIMIT 1`,
      [String(department)]
    );
    if (match) return match.organization_unit_id;
  }

  return null;
}

// Finds the single person holding a workflow role within a request's business.
//
// Deliberately softer than the CAPEX v2 equivalent (workflowService.resolveAssignee,
// which throws 409 on an ambiguous or missing assignee): v2 gates submission on
// a workflow simulation, whereas here a business that has not yet named its FiB
// must not block CAPEX submission. Leaving assigned_to NULL is exactly today's
// behaviour, and any candidate still passes the role-and-business check at
// decision time.
async function resolveStepAssigneeSoft(db, { roleName, organizationUnitId } = {}) {
  if (!roleName || !organizationUnitId) return { status: 'NO_ASSIGNEE', assignedTo: null };

  const { rows } = await db.query(
    `SELECT DISTINCT ON (a.user_id) a.user_id, u.email, u.full_name, a.scope_type
       FROM capex_v2.user_scope_assignments a
       JOIN public.som_users u ON u.id = a.user_id AND u.is_active = TRUE
      WHERE a.role_name = $1
        AND a.is_active = TRUE
        AND a.effective_from <= CURRENT_DATE
        AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
        AND a.scope_type = 'BUSINESS_UNIT'
        AND a.organization_unit_id = $2
      ORDER BY a.user_id`,
    [roleName, organizationUnitId]
  );

  if (rows.length === 1) {
    // Store the email: it is unique, whereas two people can share a full name
    // and both would then satisfy the assigned-approver check.
    return { status: 'RESOLVED', assignedTo: rows[0].email || rows[0].full_name || null };
  }
  // Never pick one of several candidates — that would write a false audit trail.
  return { status: rows.length ? 'AMBIGUOUS' : 'NO_ASSIGNEE', assignedTo: null, candidateCount: rows.length };
}

module.exports = {
  SCOPED_TABLES,
  getScopeContext,
  getEnforcementMode,
  resetEnforcementCache,
  scopeFilter,
  scopeFilterForTable,
  departmentScopeFilter,
  requireRequestInScope,
  resolveOrganizationUnitId,
  resolveStepAssigneeSoft,
};
