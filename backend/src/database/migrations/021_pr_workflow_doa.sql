-- ============================================================
-- SOM Platform: Purchase Request DoA workflow alignment
-- Migration 021
--
-- Aligns the Purchase Request module with the CP Governance
-- Framework / DoA matrix (docs/capex/Purchase Request Platform (2).xlsx):
--   LOW  (<= low_max_omr):        Line Manager -> [HSSE] -> FiB -> CP Lead
--                                 -> [Head of CP if <3 quotes] -> Business GM
--   MEDIUM (<= medium_max_omr):   Line Manager -> [HSSE] -> Contract Owner
--                                 -> Contract Holder -> FiB -> [CFO if <3 quotes]
--                                 -> EMT (CEO/Board) -> Head of CP (CP Manager)
--   HIGH (> medium_max_omr):      Line Manager -> [HSSE] -> CP Manager
--                                 -> FiB -> Contract Board (CEO/Board)
-- Role mapping follows migrations 018/019 canon:
--   EMT / Contract Board -> CEO/Board, Head of CP -> CP Manager,
--   FiB -> Finance in Business, Contract Owner/Holder -> Project Owner,
--   Line Manager -> Manager.
-- ============================================================

CREATE TABLE IF NOT EXISTS pr_workflow_config (
  id                 SERIAL PRIMARY KEY,
  value_band          VARCHAR(20) NOT NULL CHECK (value_band IN ('LOW','MEDIUM','HIGH','ALL')),
  condition_key       VARCHAR(80) NOT NULL DEFAULT 'standard',
  step_order          INTEGER NOT NULL,
  approver_role       VARCHAR(100) NOT NULL,
  label               VARCHAR(200) NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  allowed_user_roles  TEXT[] NOT NULL DEFAULT '{}',
  updated_by          VARCHAR(100),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_workflow_config_unique
  ON pr_workflow_config(value_band, condition_key, step_order);

INSERT INTO pr_workflow_config (value_band, condition_key, step_order, approver_role, label) VALUES
  ('ALL',    'standard',      1,  'Manager',             'Line Manager Endorsement'),
  ('ALL',    'hsse_required', 2,  'HSSE Focal',          'HSSE / Worker Welfare Approval'),
  ('LOW',    'standard',      10, 'Finance in Business', 'FiB Pre-support'),
  ('LOW',    'standard',      20, 'CP Lead',             'CP Lead Pre-support'),
  ('LOW',    'fewer_than_3',  30, 'CP Manager',          'Head of CP Approval for Fewer than 3 Quotations'),
  ('LOW',    'standard',      40, 'Business GM',         'Business GM Authorization'),
  ('MEDIUM', 'standard',      10, 'Project Owner',       'Contract Owner Pre-support'),
  ('MEDIUM', 'standard',      20, 'Project Owner',       'Contract Holder Pre-support'),
  ('MEDIUM', 'standard',      30, 'Finance in Business', 'FiB Pre-support'),
  ('MEDIUM', 'fewer_than_3',  40, 'CFO',                 'CFO Approval for Fewer than 3 Quotations'),
  ('MEDIUM', 'standard',      50, 'CEO/Board',           'EMT (CoB) Authorization'),
  ('MEDIUM', 'standard',      60, 'CP Manager',          'Head of CP / CP Manager Authorization'),
  ('HIGH',   'standard',      10, 'CP Manager',          'CP Review - Contract Strategy / Award Proposal'),
  ('HIGH',   'standard',      20, 'Finance in Business', 'FiB Validation'),
  ('HIGH',   'standard',      30, 'CEO/Board',           'Contract Board Authorization')
ON CONFLICT (value_band, condition_key, step_order) DO NOTHING;

UPDATE pr_workflow_config
SET allowed_user_roles = ARRAY[approver_role]
WHERE allowed_user_roles = '{}';

-- Risk classification (drives the conditional HSSE Focal step) and the
-- sourcing-essentials intake fields from the DoA checklist.
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS hsse_risk           VARCHAR(10) NOT NULL DEFAULT 'Low' CHECK (hsse_risk IN ('Low','Medium','High')),
  ADD COLUMN IF NOT EXISTS worker_welfare_risk VARCHAR(10) NOT NULL DEFAULT 'Low' CHECK (worker_welfare_risk IN ('Low','Medium','High')),
  ADD COLUMN IF NOT EXISTS suppliers           JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_supplier   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS current_budget_omr  NUMERIC(14,2);

-- Restart in-flight approvals under the new DoA chain (user-confirmed
-- cutover). The current_step_index > 0 guard makes re-runs no-ops and
-- avoids duplicate audit notes. APPROVED/REJECTED/DRAFT rows untouched.
UPDATE purchase_requests
SET current_step_index = 0,
    approval_history = approval_history || jsonb_build_array(jsonb_build_object(
      'approver', 'System',
      'role', 'System',
      'decision', 'WORKFLOW_RESET',
      'comment', 'Approval chain restarted at step 1 under the new DoA workflow (migration 021)',
      'date', to_char(now(), 'YYYY-MM-DD')))
WHERE status = 'PENDING_APPROVAL' AND current_step_index > 0;
