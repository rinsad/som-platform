-- CAPEX v2: isolated, additive foundation.
-- No organization units, approval chains, or financial transactions are seeded
-- here. Production master data and workflow versions must come from signed
-- business artifacts through the CAPEX v2 APIs.

CREATE SCHEMA IF NOT EXISTS capex_v2;

CREATE SEQUENCE IF NOT EXISTS capex_v2.request_number_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS capex_v2.project_number_seq START WITH 1;

CREATE TABLE IF NOT EXISTS capex_v2.organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  unit_type VARCHAR(30) NOT NULL DEFAULT 'BUSINESS_UNIT'
    CHECK (unit_type IN ('BUSINESS_UNIT', 'FUNCTION', 'DEPARTMENT')),
  parent_id UUID REFERENCES capex_v2.organization_units(id),
  external_reference VARCHAR(120),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS capex_v2.cost_centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_unit_id UUID NOT NULL REFERENCES capex_v2.organization_units(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(160) NOT NULL,
  external_reference VARCHAR(120),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_unit_id, code),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS capex_v2.user_scope_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.som_users(id) ON DELETE CASCADE,
  role_name VARCHAR(80) NOT NULL,
  scope_type VARCHAR(20) NOT NULL
    CHECK (scope_type IN ('PORTFOLIO', 'BUSINESS_UNIT', 'OWN', 'ASSIGNED')),
  organization_unit_id UUID REFERENCES capex_v2.organization_units(id),
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (scope_type = 'BUSINESS_UNIT' AND organization_unit_id IS NOT NULL)
    OR (scope_type <> 'BUSINESS_UNIT')
  ),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_capex_v2_scope_user
  ON capex_v2.user_scope_assignments(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_capex_v2_scope_org
  ON capex_v2.user_scope_assignments(organization_unit_id)
  WHERE organization_unit_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS capex_v2.capex_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  asset_class_code VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by UUID REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS capex_v2.budget_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year INTEGER NOT NULL UNIQUE CHECK (fiscal_year BETWEEN 2000 AND 2200),
  currency CHAR(3) NOT NULL DEFAULT 'OMR' CHECK (currency = 'OMR'),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'OPEN', 'LOCKED', 'CLOSED')),
  source_system VARCHAR(30) NOT NULL DEFAULT 'SAC',
  board_approval_reference VARCHAR(160),
  board_approved_at DATE,
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_v2.budget_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_cycle_id UUID NOT NULL REFERENCES capex_v2.budget_cycles(id),
  source_system VARCHAR(30) NOT NULL CHECK (source_system IN ('SAC', 'GSAP')),
  import_type VARCHAR(30) NOT NULL
    CHECK (import_type IN ('APPROVED_BUDGET', 'PO_COMMITMENT', 'ACTUAL', 'AUC', 'ASSET')),
  source_reference VARCHAR(180),
  original_filename VARCHAR(255),
  content_sha256 CHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'STAGED'
    CHECK (status IN ('STAGED', 'VALIDATED', 'REJECTED', 'POSTED')),
  row_count INTEGER NOT NULL DEFAULT 0,
  valid_row_count INTEGER NOT NULL DEFAULT 0,
  invalid_row_count INTEGER NOT NULL DEFAULT 0,
  control_total NUMERIC(18,3) NOT NULL DEFAULT 0,
  validation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  validated_by UUID REFERENCES public.som_users(id),
  posted_by UUID REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_capex_v2_import_source_ref
  ON capex_v2.budget_import_batches(source_system, import_type, source_reference)
  WHERE source_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_capex_v2_import_content
  ON capex_v2.budget_import_batches(budget_cycle_id, source_system, import_type, content_sha256);

CREATE TABLE IF NOT EXISTS capex_v2.budget_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES capex_v2.budget_import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  organization_code VARCHAR(50),
  cost_centre_code VARCHAR(50),
  external_project_reference VARCHAR(120),
  description TEXT,
  amount NUMERIC(18,3),
  currency CHAR(3) DEFAULT 'OMR',
  source_date DATE,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (validation_status IN ('PENDING', 'VALID', 'INVALID')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, row_number)
);

CREATE TABLE IF NOT EXISTS capex_v2.budget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_cycle_id UUID NOT NULL REFERENCES capex_v2.budget_cycles(id),
  import_batch_id UUID REFERENCES capex_v2.budget_import_batches(id),
  version_number INTEGER NOT NULL,
  version_type VARCHAR(20) NOT NULL
    CHECK (version_type IN ('BASELINE', 'REVISION', 'CORRECTION')),
  status VARCHAR(20) NOT NULL DEFAULT 'POSTED'
    CHECK (status IN ('DRAFT', 'VALIDATED', 'POSTED', 'SUPERSEDED')),
  source_reference VARCHAR(180),
  posted_by UUID REFERENCES public.som_users(id),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_cycle_id, version_number)
);

CREATE TABLE IF NOT EXISTS capex_v2.budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_version_id UUID NOT NULL REFERENCES capex_v2.budget_versions(id),
  organization_unit_id UUID NOT NULL REFERENCES capex_v2.organization_units(id),
  cost_centre_id UUID REFERENCES capex_v2.cost_centres(id),
  external_reference VARCHAR(120),
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capex_v2_alloc_org
  ON capex_v2.budget_allocations(organization_unit_id);

CREATE TABLE IF NOT EXISTS capex_v2.budget_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_cycle_id UUID NOT NULL REFERENCES capex_v2.budget_cycles(id),
  allocation_id UUID REFERENCES capex_v2.budget_allocations(id),
  request_id UUID,
  project_id UUID,
  import_batch_id UUID REFERENCES capex_v2.budget_import_batches(id),
  entry_type VARCHAR(30) NOT NULL
    CHECK (entry_type IN (
      'BASELINE', 'TRANSFER_IN', 'TRANSFER_OUT', 'COMMITMENT',
      'COMMITMENT_REVERSAL', 'ACTUAL', 'ACTUAL_REVERSAL',
      'FORECAST', 'AUC', 'CAPITALIZED', 'CORRECTION'
    )),
  amount NUMERIC(18,3) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'OMR' CHECK (currency = 'OMR'),
  external_reference VARCHAR(180),
  effective_date DATE NOT NULL,
  description TEXT,
  reversal_of UUID REFERENCES capex_v2.budget_ledger_entries(id),
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount <> 0)
);

CREATE TABLE IF NOT EXISTS capex_v2.budget_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_cycle_id UUID NOT NULL REFERENCES capex_v2.budget_cycles(id),
  from_allocation_id UUID NOT NULL REFERENCES capex_v2.budget_allocations(id),
  to_allocation_id UUID NOT NULL REFERENCES capex_v2.budget_allocations(id),
  amount NUMERIC(18,3) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_by UUID NOT NULL REFERENCES public.som_users(id),
  decided_by UUID REFERENCES public.som_users(id),
  decision_comment TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  CHECK (from_allocation_id <> to_allocation_id)
);

CREATE TABLE IF NOT EXISTS capex_v2.workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  workflow_type VARCHAR(30) NOT NULL DEFAULT 'CAPEX_REQUEST'
    CHECK (workflow_type IN ('CAPEX_REQUEST', 'BUDGET_TRANSFER', 'CHANGE_CONTROL')),
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_v2.workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES capex_v2.workflow_definitions(id),
  version_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
  authority_mode VARCHAR(20) NOT NULL DEFAULT 'PILOT'
    CHECK (authority_mode IN ('PILOT', 'BINDING')),
  source_artifact_reference TEXT,
  signed_artifact_reference TEXT,
  business_signoff_reference TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  simulation_snapshot JSONB,
  simulated_by UUID REFERENCES public.som_users(id),
  simulated_at TIMESTAMPTZ,
  effective_from DATE,
  effective_to DATE,
  approved_by UUID REFERENCES public.som_users(id),
  activated_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_definition_id, version_number),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  CHECK (authority_mode <> 'BINDING' OR signed_artifact_reference IS NOT NULL)
);

ALTER TABLE capex_v2.workflow_versions
  ADD COLUMN IF NOT EXISTS business_signoff_reference TEXT,
  ADD COLUMN IF NOT EXISTS simulation_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS simulated_by UUID REFERENCES public.som_users(id),
  ADD COLUMN IF NOT EXISTS simulated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS capex_v2.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES capex_v2.workflow_versions(id) ON DELETE CASCADE,
  rule_order INTEGER NOT NULL,
  label VARCHAR(180) NOT NULL,
  value_band VARCHAR(20) NOT NULL CHECK (value_band IN ('LOW', 'MEDIUM', 'HIGH', 'CUSTOM')),
  min_amount NUMERIC(18,3) NOT NULL DEFAULT 0,
  max_amount NUMERIC(18,3),
  min_quote_count INTEGER NOT NULL DEFAULT 0 CHECK (min_quote_count >= 0),
  max_quote_count INTEGER CHECK (max_quote_count IS NULL OR max_quote_count >= 0),
  allow_quote_waiver BOOLEAN NOT NULL DEFAULT FALSE,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (workflow_version_id, rule_order),
  CHECK (max_amount IS NULL OR max_amount >= min_amount),
  CHECK (max_quote_count IS NULL OR max_quote_count >= min_quote_count)
);

CREATE TABLE IF NOT EXISTS capex_v2.workflow_rule_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_rule_id UUID NOT NULL REFERENCES capex_v2.workflow_rules(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_key VARCHAR(80) NOT NULL,
  label VARCHAR(180) NOT NULL,
  approver_role VARCHAR(80) NOT NULL,
  scope_resolution VARCHAR(24) NOT NULL DEFAULT 'REQUEST_ORG'
    CHECK (scope_resolution IN ('REQUEST_ORG', 'PORTFOLIO')),
  sla_business_days INTEGER CHECK (sla_business_days IS NULL OR sla_business_days > 0),
  UNIQUE (workflow_rule_id, step_order),
  UNIQUE (workflow_rule_id, step_key)
);

CREATE TABLE IF NOT EXISTS capex_v2.workflow_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES capex_v2.workflow_versions(id) ON DELETE CASCADE,
  workflow_rule_id UUID NOT NULL REFERENCES capex_v2.workflow_rules(id) ON DELETE CASCADE,
  simulation_input JSONB NOT NULL,
  simulation_result JSONB NOT NULL,
  ready BOOLEAN NOT NULL,
  simulated_by UUID NOT NULL REFERENCES public.som_users(id),
  simulated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capex_v2_workflow_simulation_coverage
  ON capex_v2.workflow_simulations(workflow_version_id, workflow_rule_id, ready, simulated_at DESC);

CREATE TABLE IF NOT EXISTS capex_v2.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(240) NOT NULL,
  organization_unit_id UUID NOT NULL REFERENCES capex_v2.organization_units(id),
  cost_centre_id UUID REFERENCES capex_v2.cost_centres(id),
  budget_allocation_id UUID REFERENCES capex_v2.budget_allocations(id),
  category_id UUID REFERENCES capex_v2.capex_categories(id),
  fiscal_year INTEGER NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2200),
  owner_user_id UUID NOT NULL REFERENCES public.som_users(id),
  line_manager_user_id UUID REFERENCES public.som_users(id),
  estimated_value NUMERIC(18,3) NOT NULL CHECK (estimated_value > 0),
  currency CHAR(3) NOT NULL DEFAULT 'OMR' CHECK (currency = 'OMR'),
  project_description TEXT NOT NULL,
  business_case TEXT,
  roi_summary TEXT,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'IN_REVIEW', 'RETURNED', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  value_band VARCHAR(20) CHECK (value_band IN ('LOW', 'MEDIUM', 'HIGH', 'CUSTOM')),
  quote_waiver_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_capex_v2_ledger_request') THEN
    ALTER TABLE capex_v2.budget_ledger_entries
      ADD CONSTRAINT fk_capex_v2_ledger_request
      FOREIGN KEY (request_id) REFERENCES capex_v2.requests(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_capex_v2_request_scope
  ON capex_v2.requests(organization_unit_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capex_v2_request_owner
  ON capex_v2.requests(owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS capex_v2.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code VARCHAR(80),
  name VARCHAR(200) NOT NULL,
  source_system VARCHAR(30) NOT NULL DEFAULT 'PLATFORM',
  registration_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED',
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, vendor_code)
);

CREATE TABLE IF NOT EXISTS capex_v2.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES capex_v2.requests(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES capex_v2.vendors(id),
  supplier_name VARCHAR(200) NOT NULL,
  quoted_value NUMERIC(18,3) NOT NULL CHECK (quoted_value > 0),
  currency CHAR(3) NOT NULL DEFAULT 'OMR' CHECK (currency = 'OMR'),
  payment_terms TEXT,
  quotation_date DATE,
  valid_until DATE,
  is_proposed BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_capex_v2_single_proposed_quote
  ON capex_v2.quotations(request_id) WHERE is_proposed;

CREATE TABLE IF NOT EXISTS capex_v2.vendor_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES capex_v2.requests(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES capex_v2.quotations(id),
  budget_savings NUMERIC(18,3) NOT NULL,
  non_lowest_justification TEXT,
  selected_by UUID NOT NULL REFERENCES public.som_users(id),
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_v2.hsse_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES capex_v2.requests(id),
  assessment_round INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'COMPLETED', 'RETURNED')),
  hsse_risk VARCHAR(20) NOT NULL DEFAULT 'NOT_ASSESSED'
    CHECK (hsse_risk IN ('NOT_ASSESSED', 'LOW', 'MEDIUM', 'HIGH')),
  worker_welfare_risk VARCHAR(20) NOT NULL DEFAULT 'NOT_ASSESSED'
    CHECK (worker_welfare_risk IN ('NOT_ASSESSED', 'LOW', 'MEDIUM', 'HIGH')),
  comments TEXT,
  assessed_by UUID REFERENCES public.som_users(id),
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, assessment_round)
);

CREATE TABLE IF NOT EXISTS capex_v2.workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES capex_v2.requests(id),
  workflow_version_id UUID NOT NULL REFERENCES capex_v2.workflow_versions(id),
  workflow_rule_id UUID NOT NULL REFERENCES capex_v2.workflow_rules(id),
  submission_round INTEGER NOT NULL DEFAULT 1,
  authority_mode VARCHAR(20) NOT NULL CHECK (authority_mode IN ('PILOT', 'BINDING')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'RETURNED', 'REJECTED', 'COMPLETED', 'CANCELLED')),
  route_snapshot JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (request_id, submission_round)
);

CREATE TABLE IF NOT EXISTS capex_v2.workflow_instance_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES capex_v2.workflow_instances(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_key VARCHAR(80) NOT NULL,
  label VARCHAR(180) NOT NULL,
  approver_role VARCHAR(80) NOT NULL,
  assigned_user_id UUID NOT NULL REFERENCES public.som_users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'WAITING'
    CHECK (status IN ('WAITING', 'PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED')),
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  UNIQUE (workflow_instance_id, step_order),
  UNIQUE (workflow_instance_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_capex_v2_inbox
  ON capex_v2.workflow_instance_steps(assigned_user_id, status, started_at);

CREATE TABLE IF NOT EXISTS capex_v2.workflow_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_step_id UUID NOT NULL REFERENCES capex_v2.workflow_instance_steps(id),
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'RETURNED', 'REJECTED')),
  comment TEXT,
  decided_by UUID NOT NULL REFERENCES public.som_users(id),
  delegated_from UUID REFERENCES public.som_users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_step_id)
);

CREATE TABLE IF NOT EXISTS capex_v2.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number VARCHAR(40) NOT NULL UNIQUE,
  request_id UUID NOT NULL UNIQUE REFERENCES capex_v2.requests(id),
  organization_unit_id UUID NOT NULL REFERENCES capex_v2.organization_units(id),
  owner_user_id UUID NOT NULL REFERENCES public.som_users(id),
  execution_status VARCHAR(24) NOT NULL DEFAULT 'NOT_STARTED',
  procurement_status VARCHAR(24) NOT NULL DEFAULT 'NOT_STARTED',
  closure_status VARCHAR(24) NOT NULL DEFAULT 'NOT_STARTED',
  capitalization_status VARCHAR(24) NOT NULL DEFAULT 'NOT_STARTED',
  benefits_status VARCHAR(24) NOT NULL DEFAULT 'NOT_STARTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_capex_v2_ledger_project') THEN
    ALTER TABLE capex_v2.budget_ledger_entries
      ADD CONSTRAINT fk_capex_v2_ledger_project
      FOREIGN KEY (project_id) REFERENCES capex_v2.projects(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS capex_v2.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_provider VARCHAR(30) NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  media_type VARCHAR(160) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  sha256 CHAR(64) NOT NULL,
  scan_status VARCHAR(24) NOT NULL DEFAULT 'NOT_CONFIGURED'
    CHECK (scan_status IN ('NOT_CONFIGURED', 'PENDING', 'CLEAN', 'BLOCKED')),
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_v2.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES capex_v2.documents(id),
  version_number INTEGER NOT NULL,
  supersedes_document_id UUID REFERENCES capex_v2.documents(id),
  change_note TEXT,
  created_by UUID NOT NULL REFERENCES public.som_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE IF NOT EXISTS capex_v2.entity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES capex_v2.documents(id),
  entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('REQUEST', 'QUOTATION', 'WORKFLOW', 'PROJECT', 'IMPORT')),
  entity_id UUID NOT NULL,
  document_kind VARCHAR(40) NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capex_v2_entity_docs
  ON capex_v2.entity_documents(entity_type, entity_id, is_current);

CREATE TABLE IF NOT EXISTS capex_v2.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  actor_user_id UUID REFERENCES public.som_users(id),
  actor_role VARCHAR(80),
  authority_mode VARCHAR(20),
  organization_unit_id UUID REFERENCES capex_v2.organization_units(id),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capex_v2_audit_entity
  ON capex_v2.audit_events(entity_type, entity_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS capex_v2.external_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  source_system VARCHAR(30) NOT NULL,
  reference_type VARCHAR(40) NOT NULL,
  reference_value VARCHAR(180) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, reference_type, reference_value)
);

CREATE TABLE IF NOT EXISTS capex_v2.migration_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_entity_type VARCHAR(40) NOT NULL,
  legacy_entity_id TEXT NOT NULL,
  v2_entity_type VARCHAR(40) NOT NULL,
  v2_entity_id UUID NOT NULL,
  source_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_reference TEXT,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (legacy_entity_type, legacy_entity_id)
);
