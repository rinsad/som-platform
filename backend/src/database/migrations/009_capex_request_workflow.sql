-- ============================================================
-- SOM Platform: CAPEX Request Workflow Foundation
-- Migration 009
-- ============================================================

CREATE TABLE IF NOT EXISTS capex_requests (
  id                         VARCHAR(30) PRIMARY KEY,
  title                      VARCHAR(200) NOT NULL,
  requester_name             VARCHAR(100),
  requester_id               UUID REFERENCES som_users(id),
  department                 VARCHAR(100) NOT NULL,
  business_function          VARCHAR(100),
  budget_holder              VARCHAR(100),
  financial_year             INTEGER NOT NULL DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE))::INTEGER,
  current_cost_budget        NUMERIC(14,2) DEFAULT 0,
  estimated_value            NUMERIC(14,2) NOT NULL,
  acv_po_value               NUMERIC(14,2),
  currency                   VARCHAR(10) NOT NULL DEFAULT 'OMR',
  value_band                 VARCHAR(20) NOT NULL CHECK (value_band IN ('LOW','MEDIUM','HIGH')),
  urgent                     BOOLEAN NOT NULL DEFAULT false,
  scope_details              TEXT NOT NULL,
  frequency                  VARCHAR(50),
  volume_per_year            VARCHAR(100),
  hsse_risk                  VARCHAR(20) NOT NULL DEFAULT 'Low' CHECK (hsse_risk IN ('Low','Medium','High')),
  worker_welfare_risk        VARCHAR(20) NOT NULL DEFAULT 'Low' CHECK (worker_welfare_risk IN ('Low','Medium','High')),
  payment_terms_agreed       BOOLEAN NOT NULL DEFAULT false,
  payment_terms              VARCHAR(50),
  fewer_than_3_justification TEXT,
  savings                    NUMERIC(14,2),
  roi                        VARCHAR(100),
  status                     VARCHAR(50) NOT NULL DEFAULT 'Draft',
  current_step_id            INTEGER,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at               TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS capex_supplier_quotations (
  id             SERIAL PRIMARY KEY,
  request_id     VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  supplier_name  VARCHAR(200) NOT NULL,
  quote_value    NUMERIC(14,2) NOT NULL,
  currency       VARCHAR(10) NOT NULL DEFAULT 'OMR',
  payment_terms  VARCHAR(50),
  is_selected    BOOLEAN NOT NULL DEFAULT false,
  attachment_name VARCHAR(200),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_approval_steps (
  id             SERIAL PRIMARY KEY,
  request_id     VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  step_order     INTEGER NOT NULL,
  approver_role  VARCHAR(100) NOT NULL,
  label          VARCHAR(200) NOT NULL,
  status         VARCHAR(30) NOT NULL DEFAULT 'Pending',
  assigned_to    VARCHAR(100),
  decided_at     TIMESTAMPTZ,
  UNIQUE (request_id, step_order)
);

CREATE TABLE IF NOT EXISTS capex_approval_actions (
  id             SERIAL PRIMARY KEY,
  request_id     VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  step_id        INTEGER REFERENCES capex_approval_steps(id) ON DELETE SET NULL,
  approver_name  VARCHAR(100),
  approver_role  VARCHAR(100),
  decision       VARCHAR(30) NOT NULL,
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_attachments (
  id             SERIAL PRIMARY KEY,
  request_id     VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  linked_type    VARCHAR(50) NOT NULL DEFAULT 'Request',
  linked_id      VARCHAR(50),
  name           VARCHAR(200) NOT NULL,
  type           VARCHAR(50) DEFAULT 'Document',
  size           VARCHAR(20),
  uploaded_by    VARCHAR(100),
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_procurement_tracking (
  request_id                  VARCHAR(30) PRIMARY KEY REFERENCES capex_requests(id) ON DELETE CASCADE,
  nda_required                BOOLEAN NOT NULL DEFAULT false,
  nda_status                  VARCHAR(30) DEFAULT 'Not required',
  dpa_required                BOOLEAN NOT NULL DEFAULT false,
  dpa_status                  VARCHAR(30) DEFAULT 'Not required',
  vendor_registration_status  VARCHAR(30) DEFAULT 'Pending',
  agreement_status            VARCHAR(30) DEFAULT 'Pending',
  gsap_project_reference      VARCHAR(100),
  gsap_project_created_at     DATE,
  pr_number                   VARCHAR(100),
  pr_created_at               DATE,
  pr_status                   VARCHAR(50),
  po_number                   VARCHAR(100),
  po_created_at               DATE,
  po_value                    NUMERIC(14,2),
  po_status                   VARCHAR(50),
  po_attachment_name          VARCHAR(200),
  po_released_after_job_done  BOOLEAN NOT NULL DEFAULT false,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_project_milestones (
  id                    SERIAL PRIMARY KEY,
  request_id             VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  stage_name             VARCHAR(150) NOT NULL,
  milestone_name         VARCHAR(200) NOT NULL,
  planned_date           DATE,
  actual_date            DATE,
  payment_percentage     NUMERIC(6,2),
  payment_amount         NUMERIC(14,2),
  completion_evidence    VARCHAR(200),
  status                 VARCHAR(30) NOT NULL DEFAULT 'Open',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_financial_closure (
  request_id             VARCHAR(30) PRIMARY KEY REFERENCES capex_requests(id) ON DELETE CASCADE,
  actual_spend           NUMERIC(14,2),
  final_roi              VARCHAR(100),
  final_savings          NUMERIC(14,2),
  variance               NUMERIC(14,2),
  finance_comments       TEXT,
  capex_form_attachment  VARCHAR(200),
  closed_by              VARCHAR(100),
  closed_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_capex_requests_status ON capex_requests(status);
CREATE INDEX IF NOT EXISTS idx_capex_requests_department ON capex_requests(department);
CREATE INDEX IF NOT EXISTS idx_capex_requests_value_band ON capex_requests(value_band);
CREATE INDEX IF NOT EXISTS idx_capex_approval_steps_request ON capex_approval_steps(request_id, step_order);
