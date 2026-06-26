-- ============================================================
-- SOM Platform: CAPEX admin configuration and document storage
-- Migration 011
-- ============================================================

CREATE TABLE IF NOT EXISTS capex_value_thresholds (
  id                 INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  low_max_omr        NUMERIC(14,2) NOT NULL DEFAULT 25000,
  medium_max_omr     NUMERIC(14,2) NOT NULL DEFAULT 300000,
  updated_by         VARCHAR(100),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO capex_value_thresholds (id, low_max_omr, medium_max_omr)
VALUES (1, 25000, 300000)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS capex_workflow_config (
  id                 SERIAL PRIMARY KEY,
  value_band          VARCHAR(20) NOT NULL CHECK (value_band IN ('LOW','MEDIUM','HIGH','ALL')),
  condition_key       VARCHAR(80) NOT NULL DEFAULT 'standard',
  step_order          INTEGER NOT NULL,
  approver_role       VARCHAR(100) NOT NULL,
  label               VARCHAR(200) NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  updated_by          VARCHAR(100),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_capex_workflow_config_unique
  ON capex_workflow_config(value_band, condition_key, step_order);

INSERT INTO capex_workflow_config (value_band, condition_key, step_order, approver_role, label) VALUES
  ('ALL', 'standard', 1, 'Line Manager', 'Line Manager Endorsement'),
  ('ALL', 'hsse_required', 2, 'HSSE Focal', 'HSSE / Worker Welfare Approval'),
  ('LOW', 'standard', 10, 'FiB', 'FiB Validation'),
  ('LOW', 'standard', 20, 'CP Lead', 'CP Lead Pre-support'),
  ('LOW', 'fewer_than_3', 30, 'Head of CP', 'Head of CP Approval for Fewer than 3 Quotations'),
  ('LOW', 'standard', 40, 'Business GM', 'Business GM Approval'),
  ('MEDIUM', 'standard', 10, 'Contract Holder / Owner', 'Contract Holder / Owner Pre-support'),
  ('MEDIUM', 'standard', 20, 'FiB', 'FiB Validation'),
  ('MEDIUM', 'standard', 30, 'CP Manager / Head of CP', 'CP Governance Approval'),
  ('MEDIUM', 'fewer_than_3', 40, 'CFO', 'CFO Approval for Fewer than 3 Quotations'),
  ('MEDIUM', 'standard', 50, 'EMT', 'EMT Approval'),
  ('HIGH', 'standard', 10, 'CP', 'CP Review'),
  ('HIGH', 'standard', 20, 'FiB', 'FiB Validation'),
  ('HIGH', 'standard', 30, 'Contract Board', 'Contract Board Approval')
ON CONFLICT (value_band, condition_key, step_order) DO NOTHING;

ALTER TABLE capex_attachments
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS retention_until DATE,
  ADD COLUMN IF NOT EXISTS file_data BYTEA;
