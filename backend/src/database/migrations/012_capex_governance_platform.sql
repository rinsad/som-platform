-- ============================================================
-- SOM Platform: CAPEX governance platform lifecycle modules
-- Migration 012
-- ============================================================

CREATE TABLE IF NOT EXISTS capex_auc_tracking (
  request_id               VARCHAR(30) PRIMARY KEY REFERENCES capex_requests(id) ON DELETE CASCADE,
  auc_account              VARCHAR(100),
  auc_value                NUMERIC(14,2) NOT NULL DEFAULT 0,
  auc_start_date           DATE,
  completion_confirmed     BOOLEAN NOT NULL DEFAULT false,
  capitalization_ready     BOOLEAN NOT NULL DEFAULT false,
  status                   VARCHAR(50) NOT NULL DEFAULT 'Open',
  business_owner           VARCHAR(100),
  finance_owner            VARCHAR(100),
  escalation_level         VARCHAR(50),
  comments                 TEXT,
  updated_by               VARCHAR(100),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_capitalization_tracking (
  request_id                    VARCHAR(30) PRIMARY KEY REFERENCES capex_requests(id) ON DELETE CASCADE,
  status                        VARCHAR(50) NOT NULL DEFAULT 'Not Started',
  finance_verified              BOOLEAN NOT NULL DEFAULT false,
  capitalization_request_date   DATE,
  asset_master_number           VARCHAR(100),
  asset_category                VARCHAR(100),
  capitalized_value             NUMERIC(14,2),
  capitalization_approval_date  DATE,
  fixed_asset_registered_at     DATE,
  depreciation_start_date       DATE,
  comments                      TEXT,
  updated_by                    VARCHAR(100),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_po_closure_tracking (
  request_id                   VARCHAR(30) PRIMARY KEY REFERENCES capex_requests(id) ON DELETE CASCADE,
  final_invoice_received       BOOLEAN NOT NULL DEFAULT false,
  vendor_confirmation_received BOOLEAN NOT NULL DEFAULT false,
  closure_status               VARCHAR(50) NOT NULL DEFAULT 'Open',
  open_commitment_value        NUMERIC(14,2) NOT NULL DEFAULT 0,
  unutilized_commitment        NUMERIC(14,2) NOT NULL DEFAULT 0,
  closure_due_date             DATE,
  closed_at                    DATE,
  follow_up_owner              VARCHAR(100),
  comments                     TEXT,
  updated_by                   VARCHAR(100),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_closure_checklist_items (
  id                   SERIAL PRIMARY KEY,
  request_id            VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  item_key              VARCHAR(80) NOT NULL,
  label                 VARCHAR(200) NOT NULL,
  responsible_owner     VARCHAR(100),
  due_date              DATE,
  status                VARCHAR(30) NOT NULL DEFAULT 'Open',
  completed_at          TIMESTAMPTZ,
  evidence_attachment   VARCHAR(200),
  comments              TEXT,
  updated_by            VARCHAR(100),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, item_key)
);

CREATE TABLE IF NOT EXISTS capex_benefit_reviews (
  id                    SERIAL PRIMARY KEY,
  request_id             VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  review_period_months   INTEGER NOT NULL CHECK (review_period_months IN (6, 12, 24)),
  planned_roi            NUMERIC(8,2),
  actual_roi             NUMERIC(8,2),
  planned_savings        NUMERIC(14,2),
  actual_savings         NUMERIC(14,2),
  benefit_score          NUMERIC(5,2),
  status                 VARCHAR(40) NOT NULL DEFAULT 'Planned',
  reviewed_at            DATE,
  reviewer               VARCHAR(100),
  comments               TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, review_period_months)
);

CREATE TABLE IF NOT EXISTS capex_risks (
  id                  SERIAL PRIMARY KEY,
  request_id           VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  category             VARCHAR(50) NOT NULL,
  title                VARCHAR(200) NOT NULL,
  severity             VARCHAR(20) NOT NULL DEFAULT 'Amber' CHECK (severity IN ('Green','Amber','Red')),
  probability          VARCHAR(20),
  impact               VARCHAR(20),
  mitigation_plan      TEXT,
  owner                VARCHAR(100),
  due_date             DATE,
  status               VARCHAR(30) NOT NULL DEFAULT 'Open',
  closed_at            TIMESTAMPTZ,
  created_by           VARCHAR(100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_governance_alerts (
  id                  SERIAL PRIMARY KEY,
  request_id           VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  alert_type           VARCHAR(80) NOT NULL,
  severity             VARCHAR(20) NOT NULL DEFAULT 'Amber' CHECK (severity IN ('Amber','Red')),
  message              TEXT NOT NULL,
  assigned_to          VARCHAR(100),
  status               VARCHAR(30) NOT NULL DEFAULT 'Open',
  triggered_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_capex_auc_status ON capex_auc_tracking(status, auc_start_date);
CREATE INDEX IF NOT EXISTS idx_capex_capitalization_status ON capex_capitalization_tracking(status, capitalization_request_date);
CREATE INDEX IF NOT EXISTS idx_capex_po_closure_status ON capex_po_closure_tracking(closure_status, closure_due_date);
CREATE INDEX IF NOT EXISTS idx_capex_closure_checklist_request ON capex_closure_checklist_items(request_id, status);
CREATE INDEX IF NOT EXISTS idx_capex_benefit_reviews_request ON capex_benefit_reviews(request_id, review_period_months);
CREATE INDEX IF NOT EXISTS idx_capex_risks_request ON capex_risks(request_id, severity, status);
CREATE INDEX IF NOT EXISTS idx_capex_governance_alerts_request ON capex_governance_alerts(request_id, status);
