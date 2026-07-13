-- SOM Platform: CAPEX finance-manager approvals permission
-- Finance-owned decision gates are guarded by capex.approvals can_edit, so
-- existing Finance Manager accounts need that permission as well.

INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT u.id, 'page', 'capex.approvals', true, false, true, false
FROM som_users u
WHERE u.role = 'Finance Manager'
ON CONFLICT (user_id, resource_key)
DO UPDATE SET
  level = EXCLUDED.level,
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit;
