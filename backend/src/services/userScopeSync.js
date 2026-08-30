// Keeps a user's CAPEX scope assignments in step with their profile.
//
// A user's Business / Function is stored as a sentinel "anchor" row in
// capex_v2.user_scope_assignments, and their role + anchor together imply a real
// scope row (PORTFOLIO for company-wide roles, BUSINESS_UNIT otherwise) that the
// scoping predicates and CAPEX v2's approver resolution both read.
//
// Both derived rows carry source = 'DERIVED_FROM_PROFILE' so they can be
// replaced wholesale without disturbing assignments an administrator created by
// hand through the CAPEX v2 APIs (source = 'MANUAL').
//
// This is the single writer: usersController (admin UI) and seedCapexVideoUsers
// both call it, so the two cannot drift.

const BUSINESS_FUNCTION_ANCHOR_ROLE = '__BUSINESS_FUNCTION_ANCHOR__';

// Roles that see the whole portfolio. Kept in sync with capexDataScopes.js —
// that module is the source of truth for the split; this list exists so the
// migration and this service produce identical rows.
const PORTFOLIO_ROLES = [
  'Admin',
  'CEO/Board',
  'CFO',
  'Internal Audit',
  'Finance Manager',
  'CP Manager',
  'Asset Team',
];

function isPortfolioRole(role) {
  return PORTFOLIO_ROLES.includes(role);
}

async function assertOrganizationUnitUsable(client, organizationUnitId) {
  const { rowCount } = await client.query(
    `SELECT 1
       FROM capex_v2.organization_units
      WHERE id = $1 AND is_active = TRUE
        AND effective_from <= CURRENT_DATE
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`,
    [organizationUnitId]
  );
  if (!rowCount) {
    const error = new Error('Select an active Business / Function from the approved master');
    error.status = 400;
    throw error;
  }
}

// Expires every profile-derived row for the user and re-creates the anchor plus
// the implied scope row. Safe to call repeatedly.
async function syncUserScopeAssignments(client, { userId, role, organizationUnitId, actorId = null }) {
  await client.query(
    `UPDATE capex_v2.user_scope_assignments
        SET is_active = FALSE, effective_to = CURRENT_DATE
      WHERE user_id = $1
        AND is_active = TRUE
        AND (role_name = $2 OR source = 'DERIVED_FROM_PROFILE')`,
    [userId, BUSINESS_FUNCTION_ANCHOR_ROLE]
  );

  if (organizationUnitId) {
    await assertOrganizationUnitUsable(client, organizationUnitId);

    await client.query(
      `INSERT INTO capex_v2.user_scope_assignments
         (user_id, role_name, scope_type, organization_unit_id, capabilities, source, created_by)
       VALUES ($1, $2, 'OWN', $3, '{}'::TEXT[], 'DERIVED_FROM_PROFILE', $4)`,
      [userId, BUSINESS_FUNCTION_ANCHOR_ROLE, organizationUnitId, actorId]
    );
  }

  if (!role) return;

  if (isPortfolioRole(role)) {
    await client.query(
      `INSERT INTO capex_v2.user_scope_assignments
         (user_id, role_name, scope_type, organization_unit_id, capabilities, source, created_by)
       VALUES ($1, $2, 'PORTFOLIO', NULL, '{}'::TEXT[], 'DERIVED_FROM_PROFILE', $3)
       ON CONFLICT DO NOTHING`,
      [userId, role, actorId]
    );
    return;
  }

  // A business-scoped role with no Business / Function gets no scope row: the
  // user fails closed rather than inheriting portfolio-wide visibility.
  if (!organizationUnitId) return;

  await client.query(
    `INSERT INTO capex_v2.user_scope_assignments
       (user_id, role_name, scope_type, organization_unit_id, capabilities, source, created_by)
     VALUES ($1, $2, 'BUSINESS_UNIT', $3, '{}'::TEXT[], 'DERIVED_FROM_PROFILE', $4)
     ON CONFLICT DO NOTHING`,
    [userId, role, organizationUnitId, actorId]
  );
}

module.exports = {
  BUSINESS_FUNCTION_ANCHOR_ROLE,
  PORTFOLIO_ROLES,
  isPortfolioRole,
  syncUserScopeAssignments,
};
