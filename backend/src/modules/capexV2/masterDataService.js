const { HttpError } = require('./http');
const { databaseUserId } = require('./audit');
const { randomUUID } = require('crypto');

async function getMasterData(client, context) {
  const orgScopeIds = context.isAdmin || context.scopes.some((scope) => scope.type === 'PORTFOLIO')
    ? null
    : context.scopes.filter((scope) => scope.organizationUnitId).map((scope) => scope.organizationUnitId);

  const organizations = await client.query(
      `SELECT id, code, name, unit_type AS "unitType", parent_id AS "parentId",
              external_reference AS "externalReference"
         FROM capex_v2.organization_units
        WHERE is_active = TRUE
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          AND ($1::uuid[] IS NULL OR id = ANY($1::uuid[]))
        ORDER BY name`,
      [orgScopeIds]
    );
  const costCentres = await client.query(
      `SELECT c.id, c.organization_unit_id AS "organizationUnitId", c.code, c.name,
              c.external_reference AS "externalReference"
         FROM capex_v2.cost_centres c
        WHERE c.is_active = TRUE
          AND c.effective_from <= CURRENT_DATE
          AND (c.effective_to IS NULL OR c.effective_to >= CURRENT_DATE)
          AND ($1::uuid[] IS NULL OR c.organization_unit_id = ANY($1::uuid[]))
        ORDER BY c.code`,
      [orgScopeIds]
    );
  const categories = await client.query(
      `SELECT id, code, name, asset_class_code AS "assetClassCode"
         FROM capex_v2.capex_categories
        WHERE is_active = TRUE
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY name`
    );
  const users = await client.query(
      `SELECT id, employee_id AS "employeeId", full_name AS "fullName", email, role, department
         FROM public.som_users u
        WHERE u.is_active = TRUE
          AND (
            $1::uuid[] IS NULL
            OR u.id = $2::uuid
            OR EXISTS (
              SELECT 1 FROM capex_v2.user_scope_assignments a
               WHERE a.user_id=u.id AND a.is_active=TRUE
                 AND (a.scope_type='PORTFOLIO' OR a.organization_unit_id=ANY($1::uuid[]))
            )
          )
        ORDER BY u.full_name`,
      [orgScopeIds, databaseUserId({ id: context.userId })]
    );

  return {
    organizations: organizations.rows,
    costCentres: costCentres.rows,
    categories: categories.rows,
    users: users.rows,
  };
}

async function createOrganizationUnit(client, payload, user) {
  if (!payload.name?.trim()) {
    throw new HttpError(400, 'INVALID_ORGANIZATION', 'Business / Function name is required');
  }
  const internalCode = `ORG-${randomUUID().toUpperCase()}`;
  const { rows: [row] } = await client.query(
    `INSERT INTO capex_v2.organization_units
       (code, name, unit_type, parent_id, external_reference, effective_from, created_by)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7)
     RETURNING id, code, name, unit_type AS "unitType", parent_id AS "parentId",
               external_reference AS "externalReference"`,
    [
      internalCode,
      payload.name.trim(),
      payload.unitType || 'BUSINESS_UNIT',
      payload.parentId || null,
      payload.externalReference || null,
      payload.effectiveFrom || null,
      databaseUserId(user),
    ]
  );
  return row;
}

async function createCostCentre(client, payload, user) {
  if (!payload.organizationUnitId || !payload.code?.trim() || !payload.name?.trim()) {
    throw new HttpError(400, 'INVALID_COST_CENTRE', 'Organization, cost-centre code, and name are required');
  }
  const { rows: [row] } = await client.query(
    `INSERT INTO capex_v2.cost_centres
       (organization_unit_id, code, name, external_reference, effective_from, created_by)
     VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),$6)
     RETURNING id, organization_unit_id AS "organizationUnitId", code, name,
               external_reference AS "externalReference"`,
    [
      payload.organizationUnitId,
      payload.code.trim().toUpperCase(),
      payload.name.trim(),
      payload.externalReference || null,
      payload.effectiveFrom || null,
      databaseUserId(user),
    ]
  );
  return row;
}

async function createCategory(client, payload, user) {
  if (!payload.code?.trim() || !payload.name?.trim()) {
    throw new HttpError(400, 'INVALID_CATEGORY', 'Category code and name are required');
  }
  const { rows: [row] } = await client.query(
    `INSERT INTO capex_v2.capex_categories (code, name, asset_class_code, created_by)
     VALUES ($1,$2,$3,$4)
     RETURNING id, code, name, asset_class_code AS "assetClassCode"`,
    [payload.code.trim().toUpperCase(), payload.name.trim(), payload.assetClassCode || null, databaseUserId(user)]
  );
  return row;
}

async function createScopeAssignment(client, payload, user) {
  if (!payload.userId || !payload.roleName?.trim() || !payload.scopeType) {
    throw new HttpError(400, 'INVALID_SCOPE_ASSIGNMENT', 'User, role, and scope type are required');
  }
  const scopeType = String(payload.scopeType).toUpperCase();
  if (!['PORTFOLIO', 'BUSINESS_UNIT', 'OWN', 'ASSIGNED'].includes(scopeType)) {
    throw new HttpError(400, 'INVALID_SCOPE_TYPE', 'Scope must be PORTFOLIO, BUSINESS_UNIT, OWN, or ASSIGNED');
  }
  if (['BUSINESS_UNIT', 'OWN'].includes(scopeType) && !payload.organizationUnitId) {
    throw new HttpError(400, 'ORGANIZATION_SCOPE_REQUIRED', 'Business-unit and own-data assignments require an organization');
  }
  const { rowCount: userCount } = await client.query(
    `SELECT 1 FROM public.som_users WHERE id=$1 AND is_active=TRUE`,
    [payload.userId]
  );
  if (!userCount) throw new HttpError(400, 'INVALID_SCOPE_USER', 'Select an active user');
  if (payload.organizationUnitId) {
    const { rowCount: organizationCount } = await client.query(
      `SELECT 1 FROM capex_v2.organization_units
        WHERE id=$1 AND is_active=TRUE AND effective_from<=CURRENT_DATE
          AND (effective_to IS NULL OR effective_to>=CURRENT_DATE)`,
      [payload.organizationUnitId]
    );
    if (!organizationCount) throw new HttpError(400, 'INVALID_SCOPE_ORGANIZATION', 'Select an active organization');
  }
  const capabilities = Array.isArray(payload.capabilities) ? payload.capabilities : [];
  if (capabilities.some((capability) => !/^[a-z0-9:*.-]+$/i.test(capability))) {
    throw new HttpError(400, 'INVALID_CAPABILITY', 'Capabilities may contain letters, numbers, colon, period, hyphen, and asterisk only');
  }
  const { rows: [row] } = await client.query(
    `INSERT INTO capex_v2.user_scope_assignments
       (user_id, role_name, scope_type, organization_unit_id, capabilities,
        effective_from, effective_to, created_by)
     VALUES ($1,$2,$3,$4,$5::text[],COALESCE($6::date,CURRENT_DATE),$7::date,$8)
     RETURNING id, user_id AS "userId", role_name AS "roleName", scope_type AS "scopeType",
               organization_unit_id AS "organizationUnitId", capabilities,
               effective_from AS "effectiveFrom", effective_to AS "effectiveTo"`,
    [
      payload.userId,
      payload.roleName.trim(),
      scopeType,
      payload.organizationUnitId || null,
      capabilities,
      payload.effectiveFrom || null,
      payload.effectiveTo || null,
      databaseUserId(user),
    ]
  );
  return row;
}

module.exports = {
  getMasterData,
  createOrganizationUnit,
  createCostCentre,
  createCategory,
  createScopeAssignment,
};
