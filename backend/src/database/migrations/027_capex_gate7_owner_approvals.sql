-- Gate 7 - Asset Acceptance is owned by Asset Team / Project Engineer.
-- Decision-gate updates are guarded by capex.approvals can_edit, so existing
-- users in those roles need approval edit permission as well as the role preset.

INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT u.id, 'page', 'capex.approvals', true, false, true, false
FROM som_users u
WHERE u.role IN ('Asset Team', 'Project Engineer')
ON CONFLICT (user_id, resource_key)
DO UPDATE SET
  level = EXCLUDED.level,
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit;
