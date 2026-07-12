-- Clarify the conditional HSSE step label.
-- The approver is the HSSE Focal role; HSSE / worker welfare are risk domains,
-- not user names.

UPDATE pr_workflow_config
SET label = 'HSSE Focal Review',
    updated_at = NOW()
WHERE approver_role = 'HSSE Focal'
  AND condition_key = 'hsse_required'
  AND label = 'HSSE / Worker Welfare Approval';

