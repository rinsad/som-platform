-- CAPEX HSSE and worker-welfare ratings are assigned by the HSSE Focal,
-- not by the requester. New requests remain unassessed until the mandatory
-- HSSE screening approval step is completed.

ALTER TABLE capex_requests
  ALTER COLUMN hsse_risk SET DEFAULT 'Not assessed',
  ALTER COLUMN worker_welfare_risk SET DEFAULT 'Not assessed';

ALTER TABLE capex_requests
  DROP CONSTRAINT IF EXISTS capex_requests_hsse_risk_check,
  DROP CONSTRAINT IF EXISTS capex_requests_worker_welfare_risk_check;

ALTER TABLE capex_requests
  ADD CONSTRAINT capex_requests_hsse_risk_check
    CHECK (hsse_risk IN ('Not assessed', 'Low', 'Medium', 'High')),
  ADD CONSTRAINT capex_requests_worker_welfare_risk_check
    CHECK (worker_welfare_risk IN ('Not assessed', 'Low', 'Medium', 'High'));

UPDATE capex_workflow_config
SET label = 'HSSE Focal Screening',
    is_active = true,
    allowed_user_roles = ARRAY['HSSE Focal']::TEXT[],
    updated_at = NOW()
WHERE value_band = 'ALL'
  AND condition_key = 'hsse_required'
  AND approver_role = 'HSSE Focal';
