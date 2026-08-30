const { HttpError } = require('./http');
const { UUID_RE } = require('./audit');

// Effective-dated scope rows for a user. Shared with the legacy CAPEX scoping
// layer (services/scopeContext.js) so both read the same rows under the same
// effective-dating rules.
async function loadScopeAssignmentRows(client, userId) {
  const { rows } = await client.query(
    `SELECT a.role_name, a.scope_type, a.organization_unit_id, a.capabilities,
            o.code AS organization_code, o.name AS organization_name
       FROM capex_v2.user_scope_assignments a
       LEFT JOIN capex_v2.organization_units o ON o.id = a.organization_unit_id
      WHERE a.user_id = $1
        AND a.is_active = TRUE
        AND a.effective_from <= CURRENT_DATE
        AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
      ORDER BY a.scope_type, o.name NULLS FIRST`,
    [userId]
  );
  return rows;
}

async function loadAccessContext(client, user) {
  const isAdmin = user?.role === 'Admin';
  if (!UUID_RE.test(String(user?.id || ''))) {
    return {
      userId: String(user?.id || ''),
      displayRole: user?.role || 'User',
      isAdmin,
      scopes: isAdmin ? [{ type: 'PORTFOLIO', organizationUnitId: null, roleName: 'Admin' }] : [],
      capabilities: isAdmin ? ['*'] : ['request:create', 'request:view-own'],
    };
  }

  const rows = await loadScopeAssignmentRows(client, user.id);

  const capabilities = new Set(['request:create', 'request:view-own']);
  rows.forEach((assignment) => (assignment.capabilities || []).forEach((item) => capabilities.add(item)));
  if (isAdmin) capabilities.add('*');

  return {
    userId: user.id,
    displayRole: user.role || rows[0]?.role_name || 'User',
    isAdmin,
    scopes: isAdmin && !rows.some((row) => row.scope_type === 'PORTFOLIO')
      ? [{ type: 'PORTFOLIO', organizationUnitId: null, roleName: 'Admin' }, ...rows.map(mapScope)]
      : rows.map(mapScope),
    capabilities: [...capabilities],
  };
}

function mapScope(row) {
  return {
    type: row.scope_type,
    organizationUnitId: row.organization_unit_id,
    organizationCode: row.organization_code || null,
    organizationName: row.organization_name || null,
    roleName: row.role_name,
    capabilities: row.capabilities || [],
  };
}

function hasCapability(context, capability) {
  return context.isAdmin || context.capabilities.includes('*') || context.capabilities.includes(capability);
}

function requireCapability(context, capability) {
  if (!hasCapability(context, capability)) {
    throw new HttpError(403, 'CAPEX_V2_FORBIDDEN', `Capability '${capability}' is required`);
  }
}

function hasPortfolioCapability(context, capability) {
  if (context.isAdmin) return true;
  return context.scopes.some((scope) => (
    scope.type === 'PORTFOLIO'
    && (scope.capabilities || []).includes(capability)
  ));
}

function requirePortfolioCapability(context, capability) {
  if (!hasPortfolioCapability(context, capability)) {
    throw new HttpError(403, 'CAPEX_V2_PORTFOLIO_FORBIDDEN', `Portfolio capability '${capability}' is required`);
  }
}

function canAccessOrganization(context, organizationUnitId) {
  if (context.isAdmin || context.scopes.some((scope) => scope.type === 'PORTFOLIO')) return true;
  return context.scopes.some((scope) => scope.organizationUnitId === organizationUnitId);
}

function requireOrganizationAccess(context, organizationUnitId) {
  if (!canAccessOrganization(context, organizationUnitId)) {
    throw new HttpError(403, 'CAPEX_V2_ORGANIZATION_FORBIDDEN', 'The selected organization is outside your effective-dated scope');
  }
}

function requestScopePredicate(context, { alias = 'r', startIndex = 1 } = {}) {
  if (context.isAdmin || context.scopes.some((scope) => scope.type === 'PORTFOLIO')) {
    return { sql: 'TRUE', params: [] };
  }

  const clauses = [];
  const params = [];
  const orgIds = [...new Set(context.scopes
    .filter((scope) => scope.type === 'BUSINESS_UNIT' && scope.organizationUnitId)
    .map((scope) => scope.organizationUnitId))];

  if (orgIds.length) {
    params.push(orgIds);
    clauses.push(`${alias}.organization_unit_id = ANY($${startIndex + params.length - 1}::uuid[])`);
  }
  if (context.userId && UUID_RE.test(context.userId)) {
    params.push(context.userId);
    const userParam = `$${startIndex + params.length - 1}`;
    clauses.push(`${alias}.owner_user_id = ${userParam}`);
    clauses.push(`EXISTS (
      SELECT 1
        FROM capex_v2.workflow_instances wi_scope
        JOIN capex_v2.workflow_instance_steps wis_scope ON wis_scope.workflow_instance_id = wi_scope.id
       WHERE wi_scope.request_id = ${alias}.id AND wis_scope.assigned_user_id = ${userParam}
    )`);
  }

  return { sql: clauses.length ? `(${clauses.join(' OR ')})` : 'FALSE', params };
}

module.exports = {
  loadScopeAssignmentRows,
  loadAccessContext,
  hasCapability,
  hasPortfolioCapability,
  requireCapability,
  requirePortfolioCapability,
  canAccessOrganization,
  requireOrganizationAccess,
  requestScopePredicate,
};
