-- ============================================================
-- SOM Platform: CAPEX hardening — canonical statuses, approval
-- authority config, Module B workflow columns, milestone fix
-- Migration 016
--
-- Note: migrate.js replays every migration file on each run, so
-- every statement here must be idempotent.
-- ============================================================

-- 1. Canonical request statuses (PRD section 14). Remap the
--    improvised status strings used by earlier builds.
UPDATE capex_requests SET status = 'Procurement in progress' WHERE status = 'Pending Vendor Registration / NDA / DPA';
UPDATE capex_requests SET status = 'GSAP project created'    WHERE status = 'GSAP Project Created';
UPDATE capex_requests SET status = 'PR created'              WHERE status = 'PR Created';
UPDATE capex_requests SET status = 'PO created'              WHERE status = 'PO Created';
UPDATE capex_requests SET status = 'PO uploaded'             WHERE status = 'PO Uploaded';
UPDATE capex_requests SET status = 'In execution'            WHERE status = 'In Execution';
UPDATE capex_requests SET status = 'Pending final closure'   WHERE status = 'Pending Financial Closure';
UPDATE capex_requests SET status = 'Approved'                WHERE status = 'Approved for Procurement';
UPDATE capex_requests SET status = 'Returned for correction' WHERE status = 'Returned for Correction';
UPDATE capex_requests SET status = 'Pending FIB validation'  WHERE status = 'Pending FiB Validation';
UPDATE capex_requests SET status = 'Pending HSSE / worker welfare review' WHERE status = 'Pending HSSE Approval';
UPDATE capex_requests SET status = 'Pending CP review'       WHERE status = 'Pending CP Review';
UPDATE capex_requests SET status = 'Pending Contract Board approval' WHERE status = 'Pending Contract Board Approval';
UPDATE capex_requests SET status = 'Pending GM approval'     WHERE status = 'Pending Management Approval';
UPDATE capex_requests SET status = 'Pending line manager endorsement' WHERE status = 'Pending Line Manager Endorsement';

-- 2. Milestone status canonicalization (governance queries count
--    'Completed'; earlier writes used 'Complete').
UPDATE capex_project_milestones SET status = 'Completed' WHERE status = 'Complete';

-- 3. Approval authority mapping per workflow step role.
--    INTENTIONALLY EMPTY: the delegation-of-authority matrix is
--    unconfirmed (decision register B1/B2; PRD section 4 forbids
--    inventing it). Admins populate this from the client MOA.
--    While empty, decisions on unassigned steps are permitted but
--    audit-flagged AUTHORITY_UNVERIFIED for compliance reporting.
ALTER TABLE capex_workflow_config
  ADD COLUMN IF NOT EXISTS allowed_user_roles TEXT[] NOT NULL DEFAULT '{}';

-- 4. Module B (Purchase Requests) hardening columns.
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS current_step_index INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capex_request_id VARCHAR(30) REFERENCES capex_requests(id);

ALTER TABLE purchase_requests
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz;

ALTER TABLE pr_documents
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Approved PRs predate step tracking; align their step index with a
-- fully-walked workflow so the timeline renders as complete.
UPDATE purchase_requests
   SET current_step_index = CASE tier WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END
 WHERE status = 'APPROVED' AND current_step_index = 0;
