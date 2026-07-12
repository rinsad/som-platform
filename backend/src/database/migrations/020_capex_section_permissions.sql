-- Align CAPEX section edit permissions with the functional specification.

INSERT INTO som_permissions
  (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT
  id,
  'page',
  'capex.execution',
  TRUE,
  TRUE,
  TRUE,
  FALSE
FROM som_users
WHERE role = 'Project Engineer'
ON CONFLICT (user_id, resource_key) DO UPDATE SET
  can_view = TRUE,
  can_create = TRUE,
  can_edit = TRUE;

INSERT INTO som_permissions
  (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT
  id,
  'page',
  'capex.procurement',
  TRUE,
  TRUE,
  TRUE,
  FALSE
FROM som_users
WHERE role = 'Project Engineer'
ON CONFLICT (user_id, resource_key) DO UPDATE SET
  can_view = TRUE,
  can_create = TRUE,
  can_edit = TRUE;

INSERT INTO som_permissions
  (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT
  id,
  'page',
  'capex.documents',
  TRUE,
  TRUE,
  TRUE,
  FALSE
FROM som_users
WHERE role IN ('CP Manager', 'CP Lead', 'Project Engineer')
ON CONFLICT (user_id, resource_key) DO UPDATE SET
  can_view = TRUE,
  can_create = TRUE,
  can_edit = TRUE;

UPDATE som_permissions p
SET can_create = FALSE,
    can_edit = FALSE,
    can_delete = FALSE
FROM som_users u
WHERE p.user_id = u.id
  AND p.resource_key = 'capex.closure'
  AND u.role IN ('CP Manager', 'CP Lead', 'Project Owner', 'Project Engineer', 'HSSE Focal', 'Asset Team');
