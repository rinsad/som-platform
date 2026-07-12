-- ============================================================
-- SOM Platform: CAPEX canonical workflow roles
-- Migration 019
--
-- Keep account roles canonical in approver_role. Business wording remains in
-- label, so historical labels like "EMT Approval" still display correctly.
-- ============================================================

UPDATE capex_workflow_config
SET approver_role = CASE approver_role
  WHEN 'Line Manager' THEN 'Manager'
  WHEN 'Contract Holder / Owner' THEN 'Project Owner'
  WHEN 'FiB' THEN 'Finance in Business'
  WHEN 'Head of CP' THEN 'CP Manager'
  WHEN 'CP Manager / Head of CP' THEN 'CP Manager'
  WHEN 'CP' THEN 'CP Manager'
  WHEN 'EMT' THEN 'CEO/Board'
  WHEN 'Contract Board' THEN 'CEO/Board'
  ELSE approver_role
END,
label = CASE
  WHEN approver_role = 'Contract Holder / Owner' THEN 'Project Owner Pre-support'
  WHEN approver_role = 'Head of CP' THEN 'CP Manager Approval for Fewer than 3 Quotations'
  ELSE label
END,
updated_by = COALESCE(updated_by, 'Migration 019'),
updated_at = NOW()
WHERE approver_role IN (
  'Line Manager',
  'Contract Holder / Owner',
  'FiB',
  'Head of CP',
  'CP Manager / Head of CP',
  'CP',
  'EMT',
  'Contract Board'
);

UPDATE capex_workflow_config
SET allowed_user_roles = CASE approver_role
  WHEN 'Manager' THEN ARRAY['Manager']::TEXT[]
  WHEN 'HSSE Focal' THEN ARRAY['HSSE Focal']::TEXT[]
  WHEN 'Project Owner' THEN ARRAY['Project Owner']::TEXT[]
  WHEN 'Finance in Business' THEN ARRAY['Finance in Business']::TEXT[]
  WHEN 'CP Lead' THEN ARRAY['CP Lead']::TEXT[]
  WHEN 'CP Manager' THEN ARRAY['CP Manager']::TEXT[]
  WHEN 'Business GM' THEN ARRAY['Business GM']::TEXT[]
  WHEN 'CFO' THEN ARRAY['CFO']::TEXT[]
  WHEN 'CEO/Board' THEN ARRAY['CEO/Board']::TEXT[]
  ELSE allowed_user_roles
END,
updated_by = COALESCE(updated_by, 'Migration 019'),
updated_at = NOW()
WHERE approver_role IN (
  'Manager',
  'HSSE Focal',
  'Project Owner',
  'Finance in Business',
  'CP Lead',
  'CP Manager',
  'Business GM',
  'CFO',
  'CEO/Board'
);

UPDATE capex_approval_steps
SET approver_role = CASE approver_role
  WHEN 'Line Manager' THEN 'Manager'
  WHEN 'Contract Holder / Owner' THEN 'Project Owner'
  WHEN 'FiB' THEN 'Finance in Business'
  WHEN 'Head of CP' THEN 'CP Manager'
  WHEN 'CP Manager / Head of CP' THEN 'CP Manager'
  WHEN 'CP' THEN 'CP Manager'
  WHEN 'EMT' THEN 'CEO/Board'
  WHEN 'Contract Board' THEN 'CEO/Board'
  ELSE approver_role
END,
label = CASE
  WHEN approver_role = 'Contract Holder / Owner' THEN 'Project Owner Pre-support'
  WHEN approver_role = 'Head of CP' THEN 'CP Manager Approval for Fewer than 3 Quotations'
  ELSE label
END
WHERE approver_role IN (
  'Line Manager',
  'Contract Holder / Owner',
  'FiB',
  'Head of CP',
  'CP Manager / Head of CP',
  'CP',
  'EMT',
  'Contract Board'
);
