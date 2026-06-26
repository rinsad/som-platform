-- ============================================================
-- SOM Platform: CAPEX MOA, reporting, document versioning,
-- and e-signature readiness
-- Migration 013
-- ============================================================

CREATE TABLE IF NOT EXISTS capex_moa_records (
  id                         SERIAL PRIMARY KEY,
  request_id                  VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  moa_number                  VARCHAR(100) NOT NULL,
  title                       VARCHAR(200) NOT NULL,
  approval_authority          VARCHAR(100) NOT NULL,
  approval_route              VARCHAR(200),
  approval_status             VARCHAR(50) NOT NULL DEFAULT 'Draft',
  project_value               NUMERIC(14,2) NOT NULL DEFAULT 0,
  value_band                  VARCHAR(20) NOT NULL DEFAULT 'LOW',
  matrix_validated            BOOLEAN NOT NULL DEFAULT false,
  matrix_violation_reason     TEXT,
  effective_date              DATE,
  expiry_date                 DATE,
  renewal_required            BOOLEAN NOT NULL DEFAULT false,
  attachment_id               INTEGER REFERENCES capex_attachments(id) ON DELETE SET NULL,
  created_by                  VARCHAR(100),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                  VARCHAR(100),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, moa_number)
);

CREATE TABLE IF NOT EXISTS capex_moa_revisions (
  id               SERIAL PRIMARY KEY,
  moa_id            INTEGER NOT NULL REFERENCES capex_moa_records(id) ON DELETE CASCADE,
  revision_number   INTEGER NOT NULL,
  change_summary    TEXT NOT NULL,
  revised_by        VARCHAR(100),
  revised_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attachment_id     INTEGER REFERENCES capex_attachments(id) ON DELETE SET NULL,
  UNIQUE (moa_id, revision_number)
);

CREATE TABLE IF NOT EXISTS capex_document_versions (
  id                 SERIAL PRIMARY KEY,
  request_id          VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  attachment_id       INTEGER REFERENCES capex_attachments(id) ON DELETE SET NULL,
  document_type       VARCHAR(80) NOT NULL,
  document_name       VARCHAR(200) NOT NULL,
  version_label       VARCHAR(30) NOT NULL,
  changelog           TEXT,
  retention_until     DATE,
  uploaded_by         VARCHAR(100),
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, document_type, version_label)
);

CREATE TABLE IF NOT EXISTS capex_electronic_signatures (
  id                 SERIAL PRIMARY KEY,
  request_id          VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  linked_type         VARCHAR(50) NOT NULL DEFAULT 'Approval',
  linked_id           VARCHAR(50),
  signer_name         VARCHAR(100) NOT NULL,
  signer_role         VARCHAR(100) NOT NULL,
  decision            VARCHAR(30) NOT NULL DEFAULT 'Signed',
  signature_method    VARCHAR(50) NOT NULL DEFAULT 'System Attestation',
  signed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comments            TEXT,
  ip_address          VARCHAR(80),
  user_agent          TEXT
);

CREATE TABLE IF NOT EXISTS capex_report_schedules (
  id                   SERIAL PRIMARY KEY,
  report_name           VARCHAR(150) NOT NULL,
  report_type           VARCHAR(80) NOT NULL,
  audience              VARCHAR(120),
  frequency             VARCHAR(30) NOT NULL DEFAULT 'Monthly',
  format                VARCHAR(20) NOT NULL DEFAULT 'PDF',
  filters               JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  next_run_date         DATE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_by            VARCHAR(100),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            VARCHAR(100),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capex_moa_records_request ON capex_moa_records(request_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_capex_moa_records_expiry ON capex_moa_records(expiry_date, renewal_required);
CREATE INDEX IF NOT EXISTS idx_capex_moa_revisions_moa ON capex_moa_revisions(moa_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_capex_document_versions_request ON capex_document_versions(request_id, document_type);
CREATE INDEX IF NOT EXISTS idx_capex_electronic_signatures_request ON capex_electronic_signatures(request_id, linked_type);
CREATE INDEX IF NOT EXISTS idx_capex_report_schedules_active ON capex_report_schedules(is_active, next_run_date);
