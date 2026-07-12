-- ============================================================
-- SOM Platform: CAPEX workflow role authority
-- Migration 018
--
-- Keep business workflow labels separate from assignable user roles.
-- Existing non-empty authority mappings are preserved.
-- ============================================================

UPDATE capex_workflow_config
SET allowed_user_roles = CASE approver_role
  WHEN 'Line Manager' THEN ARRAY['Manager']::TEXT[]
  WHEN 'Manager' THEN ARRAY['Manager']::TEXT[]
  WHEN 'HSSE Focal' THEN ARRAY['HSSE Focal']::TEXT[]
  WHEN 'Contract Holder / Owner' THEN ARRAY['Project Owner']::TEXT[]
  WHEN 'Project Owner' THEN ARRAY['Project Owner']::TEXT[]
  WHEN 'FiB' THEN ARRAY['Finance in Business']::TEXT[]
  WHEN 'Finance in Business' THEN ARRAY['Finance in Business']::TEXT[]
  WHEN 'CP Lead' THEN ARRAY['CP Lead']::TEXT[]
  WHEN 'Head of CP' THEN ARRAY['CP Manager']::TEXT[]
  WHEN 'CP Manager / Head of CP' THEN ARRAY['CP Manager']::TEXT[]
  WHEN 'CP Manager' THEN ARRAY['CP Manager']::TEXT[]
  WHEN 'CP' THEN ARRAY['CP Manager', 'CP Lead']::TEXT[]
  WHEN 'Business GM' THEN ARRAY['Business GM']::TEXT[]
  WHEN 'CFO' THEN ARRAY['CFO']::TEXT[]
  WHEN 'EMT' THEN ARRAY['CEO/Board']::TEXT[]
  WHEN 'Contract Board' THEN ARRAY['CEO/Board']::TEXT[]
  WHEN 'CEO/Board' THEN ARRAY['CEO/Board']::TEXT[]
  ELSE allowed_user_roles
END,
updated_by = COALESCE(updated_by, 'Migration 018'),
updated_at = NOW()
WHERE cardinality(allowed_user_roles) = 0;

-- Existing users do not automatically receive changes made to role presets.
-- Grant only the approval permission required by the mapped workflow roles.
INSERT INTO som_permissions
  (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT
  id, 'page', 'capex.approvals', true, false, true, false
FROM som_users
WHERE role IN (
  'Manager',
  'HSSE Focal',
  'Project Owner',
  'Finance in Business',
  'CP Manager',
  'CP Lead',
  'Business GM',
  'CFO',
  'CEO/Board'
)
ON CONFLICT (user_id, resource_key) DO UPDATE SET
  can_view = som_permissions.can_view OR EXCLUDED.can_view,
  can_edit = som_permissions.can_edit OR EXCLUDED.can_edit;
