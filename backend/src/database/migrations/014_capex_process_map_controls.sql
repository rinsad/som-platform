-- ============================================================
-- SOM Platform: CAPEX process-map controls from Shell PR map
-- Migration 014
-- ============================================================

CREATE TABLE IF NOT EXISTS capex_reference_business_units (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS capex_reference_project_types (
  id          SERIAL PRIMARY KEY,
  type_name   VARCHAR(120) NOT NULL UNIQUE,
  example     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS capex_budget_variations (
  id                         SERIAL PRIMARY KEY,
  request_id                  VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  variation_type              VARCHAR(40) NOT NULL DEFAULT 'Variation',
  original_budget             NUMERIC(14,2) NOT NULL DEFAULT 0,
  revised_budget              NUMERIC(14,2) NOT NULL DEFAULT 0,
  variation_amount            NUMERIC(14,2) NOT NULL DEFAULT 0,
  variation_percent           NUMERIC(8,2) NOT NULL DEFAULT 0,
  justification               TEXT NOT NULL,
  financial_impact_analysis   TEXT,
  fib_review_status           VARCHAR(40) NOT NULL DEFAULT 'Pending',
  moa_approval_required       BOOLEAN NOT NULL DEFAULT false,
  approval_status             VARCHAR(40) NOT NULL DEFAULT 'Pending',
  requested_by                VARCHAR(100),
  requested_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by                 VARCHAR(100),
  approved_at                 TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS capex_procurement_performance (
  request_id             VARCHAR(30) PRIMARY KEY REFERENCES capex_requests(id) ON DELETE CASCADE,
  rfq_issued_at           DATE,
  tender_started_at       DATE,
  tender_completed_at     DATE,
  vendor_response_count   INTEGER NOT NULL DEFAULT 0,
  invited_vendor_count    INTEGER NOT NULL DEFAULT 0,
  awarded_value           NUMERIC(14,2),
  budget_estimate         NUMERIC(14,2),
  procurement_savings     NUMERIC(14,2),
  po_processing_days      INTEGER,
  cp_owner                VARCHAR(100),
  updated_by              VARCHAR(100),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_decision_gate_reviews (
  id              SERIAL PRIMARY KEY,
  request_id       VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  gate_key         VARCHAR(40) NOT NULL,
  gate_name        VARCHAR(160) NOT NULL,
  status           VARCHAR(40) NOT NULL DEFAULT 'Pending',
  reviewer         VARCHAR(100),
  reviewed_at      TIMESTAMPTZ,
  comments         TEXT,
  evidence         VARCHAR(200),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, gate_key)
);

CREATE TABLE IF NOT EXISTS capex_escalation_policy (
  id                 SERIAL PRIMARY KEY,
  policy_key          VARCHAR(80) NOT NULL UNIQUE,
  trigger_label       VARCHAR(160) NOT NULL,
  threshold_value     NUMERIC(12,2),
  threshold_unit      VARCHAR(40),
  severity            VARCHAR(20) NOT NULL DEFAULT 'Amber',
  escalation_target   VARCHAR(120) NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO capex_reference_business_units (name) VALUES
  ('B2B - Fleet'),
  ('B2B - Homebase'),
  ('Mobility B2C'),
  ('Marine Fuels'),
  ('Aviation'),
  ('Lubricants'),
  ('Lubricant Supply Chain'),
  ('Trade & Supply'),
  ('Corporate Functions')
ON CONFLICT (name) DO NOTHING;

INSERT INTO capex_reference_project_types (type_name, example) VALUES
  ('Growth - Contractual Commitment', 'New service station at a location secured under a signed agreement'),
  ('Growth - Not Committed', 'New service station proposed for future market penetration'),
  ('Asset Integrity', 'Replacement of underground fuel tanks due to corrosion'),
  ('Asset Integrity & Business Continuity', 'Depot backup generator installation'),
  ('Care & Maintenance - IT', 'POS system replacement across retail network'),
  ('Maintain Margin', 'LED retrofit across all service stations'),
  ('Maintenance', 'Fuel dispenser replacement at end of useful life'),
  ('Care & Maintenance', 'Service station canopy refurbishment')
ON CONFLICT (type_name) DO NOTHING;

INSERT INTO capex_escalation_policy
  (policy_key, trigger_label, threshold_value, threshold_unit, severity, escalation_target)
VALUES
  ('budget_variance_gt_10', 'Budget variance greater than 10%', 10, 'percent', 'Red', 'Project Owner'),
  ('project_delay_gt_30', 'Project delay greater than 30 days', 30, 'days', 'Amber', 'GM'),
  ('auc_gt_90', 'AUC age greater than 90 days', 90, 'days', 'Amber', 'Business Owner'),
  ('auc_gt_180', 'AUC age greater than 180 days', 180, 'days', 'Red', 'EMT Review'),
  ('auc_gt_270', 'AUC age greater than 270 days', 270, 'days', 'Red', 'CFO'),
  ('capitalization_pending_gt_60', 'Capitalization pending greater than 60 days', 60, 'days', 'Amber', 'Finance Manager / Corporate Controller'),
  ('po_open_gt_90_after_completion', 'PO open greater than 90 days after completion', 90, 'days', 'Amber', 'CP / Finance')
ON CONFLICT (policy_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_capex_budget_variations_request ON capex_budget_variations(request_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_capex_decision_gate_reviews_request ON capex_decision_gate_reviews(request_id, gate_key);
CREATE INDEX IF NOT EXISTS idx_capex_escalation_policy_active ON capex_escalation_policy(is_active, policy_key);
