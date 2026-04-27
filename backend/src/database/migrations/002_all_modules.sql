-- ============================================================
-- SOM Platform: All Module Tables + Seed Data
-- Migration 002
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- MODULE A: CAPEX PLANNING
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS capex_departments (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) UNIQUE NOT NULL,
  total_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  committed    NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual       NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capex_department_monthly (
  id            SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES capex_departments(id) ON DELETE CASCADE,
  month_label   VARCHAR(10) NOT NULL,
  budgeted      NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual        NUMERIC(14,2) NOT NULL DEFAULT 0,
  UNIQUE (department_id, month_label)
);

CREATE TABLE IF NOT EXISTS capex_initiations (
  id               VARCHAR(30) PRIMARY KEY,
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  department       VARCHAR(100) NOT NULL,
  initiator        VARCHAR(100),
  project_type     VARCHAR(50)  DEFAULT 'New',
  estimated_budget NUMERIC(14,2) NOT NULL,
  priority         VARCHAR(20)  DEFAULT 'Medium',
  status           VARCHAR(50)  DEFAULT 'Pending Approval',
  start_date       DATE,
  end_date         DATE,
  stakeholders     TEXT,
  justification    TEXT,
  created_by       UUID REFERENCES som_users(id),
  created_at       DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS capex_manual_entries (
  id               VARCHAR(30) PRIMARY KEY,
  entry_type       VARCHAR(50) NOT NULL,
  department       VARCHAR(100) NOT NULL,
  period           VARCHAR(20) NOT NULL,  -- YYYY-MM or 'Mon YYYY'
  amount           NUMERIC(14,2) NOT NULL,
  description      TEXT,
  reference_number VARCHAR(100),
  entered_by       VARCHAR(100),
  entered_by_id    UUID REFERENCES som_users(id),
  entered_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  status           VARCHAR(30) DEFAULT 'Posted'
);

-- GSAP Sync Stub — single-row config, replaced by live GSAP when SAP is back
CREATE TABLE IF NOT EXISTS gsap_sync_status (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  mode         VARCHAR(20) NOT NULL DEFAULT 'manual',  -- 'manual' | 'gsap'
  last_synced  TIMESTAMPTZ,
  source       VARCHAR(50) DEFAULT 'Manual Entry',
  message      TEXT DEFAULT 'GSAP connection pending — SAP undergoing maintenance. Using manual entry.'
);

-- WBS budget rows — populated manually now, overwritten by GSAP sync later
CREATE TABLE IF NOT EXISTS gsap_approved_budgets (
  id              SERIAL PRIMARY KEY,
  wbs_code        VARCHAR(50) UNIQUE NOT NULL,
  description     TEXT,
  department      VARCHAR(100),
  approved_amount NUMERIC(14,2) DEFAULT 0,
  posted_amount   NUMERIC(14,2) DEFAULT 0,
  source          VARCHAR(20) DEFAULT 'manual',  -- 'manual' | 'gsap'
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seed: capex_departments ───────────────────────────────────
INSERT INTO capex_departments (name, total_budget, committed, actual) VALUES
  ('HR & Real Estate',                    800000, 120000, 350000),
  ('Finance & Operations',                600000,  80000, 210000),
  ('Trading, Lubricants & Supply Chain', 2000000, 250000, 890000),
  ('Aviation',                           1500000, 180000, 720000),
  ('Mobility',                           1200000, 150000, 480000),
  ('General',                             500000,  60000, 140000)
ON CONFLICT (name) DO NOTHING;

-- ── Seed: capex_department_monthly ───────────────────────────
DO $$
DECLARE
  hid INTEGER; fid INTEGER; tid INTEGER; aid INTEGER; mid INTEGER; gid INTEGER;
BEGIN
  SELECT id INTO hid FROM capex_departments WHERE name = 'HR & Real Estate';
  SELECT id INTO fid FROM capex_departments WHERE name = 'Finance & Operations';
  SELECT id INTO tid FROM capex_departments WHERE name = 'Trading, Lubricants & Supply Chain';
  SELECT id INTO aid FROM capex_departments WHERE name = 'Aviation';
  SELECT id INTO mid FROM capex_departments WHERE name = 'Mobility';
  SELECT id INTO gid FROM capex_departments WHERE name = 'General';

  INSERT INTO capex_department_monthly (department_id, month_label, budgeted, actual) VALUES
    (hid,'Oct', 50000, 45000),(hid,'Nov', 55000, 58000),(hid,'Dec', 65000, 72000),
    (hid,'Jan', 60000, 55000),(hid,'Feb', 55000, 62000),(hid,'Mar', 65000, 58000),
    (fid,'Oct', 30000, 28000),(fid,'Nov', 35000, 33000),(fid,'Dec', 40000, 38000),
    (fid,'Jan', 38000, 42000),(fid,'Feb', 35000, 32000),(fid,'Mar', 40000, 37000),
    (tid,'Oct',140000,128000),(tid,'Nov',155000,165000),(tid,'Dec',175000,182000),
    (tid,'Jan',160000,155000),(tid,'Feb',150000,142000),(tid,'Mar',170000,118000),
    (aid,'Oct',110000, 98000),(aid,'Nov',120000,115000),(aid,'Dec',130000,142000),
    (aid,'Jan',125000,128000),(aid,'Feb',115000,112000),(aid,'Mar',130000,125000),
    (mid,'Oct', 75000, 68000),(mid,'Nov', 80000, 85000),(mid,'Dec', 90000, 95000),
    (mid,'Jan', 85000, 82000),(mid,'Feb', 78000, 72000),(mid,'Mar', 90000, 78000),
    (gid,'Oct', 20000, 18000),(gid,'Nov', 23000, 22000),(gid,'Dec', 25000, 28000),
    (gid,'Jan', 24000, 25000),(gid,'Feb', 22000, 20000),(gid,'Mar', 26000, 27000)
  ON CONFLICT (department_id, month_label) DO NOTHING;
END$$;

-- ── Seed: capex_initiations ───────────────────────────────────
INSERT INTO capex_initiations (id, title, description, department, initiator, project_type, estimated_budget, priority, status, start_date, end_date, stakeholders, justification, created_at) VALUES
  ('CINIT-2026-001','Aviation Ground Support Equipment Upgrade','Replacement of ageing ground support equipment across all aviation fuelling stations to meet IATA safety standards.','Aviation','Khalid Al Rashdi','Replacement',420000,'High','Under Review','2026-06-01','2026-12-31','Aviation, Finance & Operations, General','Mandatory compliance with IATA ground handling regulations. Existing equipment beyond service life.','2026-03-01'),
  ('CINIT-2026-002','EV Fleet Expansion — Mobility Division','Procurement of 25 electric vehicles to grow the Mobility fleet and support Oman''s national EV adoption targets.','Mobility','Ahmed Al Balushi','New',280000,'Medium','Approved','2026-04-15','2026-09-30','Mobility, Finance & Operations, HR & Real Estate','Strategic investment aligned with Shell''s net-zero commitments and growing domestic EV demand.','2026-02-15'),
  ('CINIT-2026-003','Head Office Fit-Out — Phase 2','Second-phase interior fit-out of the new Muscat head office including meeting rooms, collaboration spaces, and IT infrastructure.','HR & Real Estate','Rashid Al Ghafri','New',195000,'High','Pending Approval','2026-05-01','2026-08-31','HR & Real Estate, Finance & Operations, General','Phase 1 complete. Phase 2 required to bring remaining floors into operational use ahead of Q3 staff relocation.','2026-03-10')
ON CONFLICT (id) DO NOTHING;

-- ── Seed: capex_manual_entries ────────────────────────────────
INSERT INTO capex_manual_entries (id, entry_type, department, period, amount, description, reference_number, entered_by, entered_at, status) VALUES
  ('ME-2026-001','Actual','Mobility','2026-03',18600,'EV charger installation at Muscat depot — vendor invoice #INV-5510','INV-5510','Sara Al Harthi','2026-03-15','Posted'),
  ('ME-2026-002','PO Commitment','Trading, Lubricants & Supply Chain','2026-03',67000,'Lubricant blending equipment overhaul — PO raised for Al Maha Engineering','PO-2026-0318','Fatma Al Maamari','2026-03-12','Posted'),
  ('ME-2026-003','Budget Adjustment','General','2026-02',30000,'Emergency budget reallocation for organisation-wide IT security audit','BA-2026-005','Admin User','2026-02-28','Posted')
ON CONFLICT (id) DO NOTHING;

-- ── Seed: gsap_sync_status ────────────────────────────────────
INSERT INTO gsap_sync_status (id, mode, last_synced, source, message) VALUES
  (1, 'manual', NULL, 'Manual Entry', 'GSAP connection pending — SAP undergoing maintenance. Using manual entry mode.')
ON CONFLICT (id) DO NOTHING;

-- ── Seed: gsap_approved_budgets ───────────────────────────────
INSERT INTO gsap_approved_budgets (wbs_code, description, department, approved_amount, posted_amount, source) VALUES
  ('WBS-OM-2026-HR-001', 'HR & Real Estate — Facilities and Property Capex',       'HR & Real Estate',                    800000, 350000, 'manual'),
  ('WBS-OM-2026-FIN-001','Finance & Operations — Systems and Process Capex',        'Finance & Operations',                600000, 210000, 'manual'),
  ('WBS-OM-2026-TLS-001','Trading, Lubricants & Supply Chain — Infrastructure Capex','Trading, Lubricants & Supply Chain', 2000000, 890000, 'manual'),
  ('WBS-OM-2026-AVN-001','Aviation — Equipment and Facilities Capex',               'Aviation',                           1500000, 720000, 'manual'),
  ('WBS-OM-2026-MOB-001','Mobility — Fleet and Charging Infrastructure Capex',      'Mobility',                           1200000, 480000, 'manual'),
  ('WBS-OM-2026-GEN-001','General — Organisation-Wide Capex',                       'General',                             500000, 140000, 'manual')
ON CONFLICT (wbs_code) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- MODULE B: PURCHASE REQUESTS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_requests (
  id                    VARCHAR(30) PRIMARY KEY,
  title                 VARCHAR(200) NOT NULL,
  description           TEXT,
  requestor_name        VARCHAR(100),
  requestor_id          UUID REFERENCES som_users(id),
  department            VARCHAR(100),
  total_value           NUMERIC(14,2) NOT NULL,
  tier                  VARCHAR(10) NOT NULL CHECK (tier IN ('LOW','MEDIUM','HIGH')),
  status                VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
  quote_count           INTEGER DEFAULT 0,
  requires_justification BOOLEAN DEFAULT false,
  justification         TEXT,
  line_items            JSONB DEFAULT '[]',
  approval_history      JSONB DEFAULT '[]',
  created_at            DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS pr_documents (
  id           VARCHAR(20) PRIMARY KEY,
  pr_id        VARCHAR(30) NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  type         VARCHAR(50) DEFAULT 'Document',
  size         VARCHAR(20),
  uploaded_by  VARCHAR(100),
  uploaded_at  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_pr_docs_pr_id ON pr_documents(pr_id);
CREATE INDEX IF NOT EXISTS idx_prs_status ON purchase_requests(status);

-- ── Seed: purchase_requests ───────────────────────────────────
INSERT INTO purchase_requests (id, title, description, requestor_name, department, total_value, tier, status, quote_count, requires_justification, justification, approval_history, created_at) VALUES
  ('PR-2026-001','Office Supplies Q1','Stationery and consumables for the admin department for Q1 2026.','Ahmed Al Balushi','Admin',1500,'LOW','APPROVED',3,false,'','[{"approver":"Sara Al Harthi","decision":"APPROVED","comment":"Routine supplies, approved.","date":"2026-01-11"}]','2026-01-10'),
  ('PR-2026-002','Generator Maintenance Equipment','Spare parts and servicing tools for station backup generators across Muscat region.','Sara Al Harthi','Operations',85000,'MEDIUM','PENDING_APPROVAL',3,false,'','[]','2026-02-14'),
  ('PR-2026-003','Fuel Storage Tank Replacement','Full replacement of aged underground fuel storage tanks at Al Khuwair station.','Khalid Al Rashdi','Retail',450000,'HIGH','PENDING_APPROVAL',4,false,'','[{"approver":"Ahmed Al Balushi","decision":"APPROVED","comment":"Dept manager approved. Escalating to Finance.","date":"2026-03-03"}]','2026-03-01'),
  ('PR-2026-004','IT Hardware Refresh','Replacement laptops and monitors for the IT team — end of lifecycle.','Fatma Al Maamari','IT',22000,'LOW','DRAFT',1,true,'Only 1 quote obtained so far — 2 more in progress.','[]','2026-03-10'),
  ('PR-2026-005','CCTV Upgrade — Salalah Stations','Installation of HD CCTV cameras across 3 Salalah stations for QHSE compliance.','Rashid Al Ghafri','QHSE',67500,'MEDIUM','APPROVED',3,false,'','[{"approver":"Sara Al Harthi","decision":"APPROVED","comment":"Budget available, QHSE priority.","date":"2026-01-25"},{"approver":"Admin User","decision":"APPROVED","comment":"Final approval granted.","date":"2026-01-27"}]','2026-01-22'),
  ('PR-2026-006','Fleet Vehicle Leasing — 5 Units','Annual lease for 5 field inspection vehicles for the infrastructure team.','Maryam Al Lawati','Infrastructure',312000,'HIGH','REJECTED',3,false,'','[{"approver":"Sara Al Harthi","decision":"REJECTED","comment":"Budget freeze in effect for Q1. Resubmit in Q2.","date":"2026-02-05"}]','2026-02-01'),
  ('PR-2026-007','Safety Signage Rebranding','Replace all station safety and brand signage to new Shell global standard.','Ahmed Al Balushi','Retail',18400,'LOW','APPROVED',3,false,'','[{"approver":"Sara Al Harthi","decision":"APPROVED","comment":"Approved — brand compliance requirement.","date":"2026-02-22"}]','2026-02-20'),
  ('PR-2026-008','Canopy Structural Inspection','Third-party structural inspection of canopies at 12 stations per regulatory schedule.','Rashid Al Ghafri','QHSE',9800,'LOW','PENDING_APPROVAL',2,true,'Third quote delayed by vendor — expected within 5 days.','[]','2026-03-12')
ON CONFLICT (id) DO NOTHING;

-- ── Seed: pr_documents ────────────────────────────────────────
INSERT INTO pr_documents (id, pr_id, name, type, size, uploaded_by, uploaded_at) VALUES
  ('DOC-001','PR-2026-002','Generator_Quote_AlMaha.pdf','Quote','245 KB','Sara Al Harthi','2026-02-14'),
  ('DOC-002','PR-2026-002','Generator_Quote_OmanPower.pdf','Quote','189 KB','Sara Al Harthi','2026-02-14'),
  ('DOC-003','PR-2026-002','TechnicalScope_Generators.docx','Scope','78 KB','Sara Al Harthi','2026-02-15'),
  ('DOC-004','PR-2026-003','TankReplacement_Quote1.pdf','Quote','312 KB','Khalid Al Rashdi','2026-03-01'),
  ('DOC-005','PR-2026-003','TankReplacement_Quote2.pdf','Quote','298 KB','Khalid Al Rashdi','2026-03-01'),
  ('DOC-006','PR-2026-003','TankReplacement_Quote3.pdf','Quote','276 KB','Khalid Al Rashdi','2026-03-01'),
  ('DOC-007','PR-2026-003','EngineeringAssessment.pdf','Technical','1.2 MB','Khalid Al Rashdi','2026-03-02'),
  ('DOC-008','PR-2026-005','CCTV_Quote_SecureTech.pdf','Quote','156 KB','Rashid Al Ghafri','2026-01-22'),
  ('DOC-009','PR-2026-005','CCTV_Quote_AlNoor.pdf','Quote','143 KB','Rashid Al Ghafri','2026-01-22'),
  ('DOC-010','PR-2026-005','CCTV_Quote_VisionPro.pdf','Quote','167 KB','Rashid Al Ghafri','2026-01-22')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- MODULE C: ASSETS (RADP)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assets (
  asset_code     VARCHAR(40) PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  region         VARCHAR(50) NOT NULL,
  site           VARCHAR(100) NOT NULL,
  facility       VARCHAR(100) NOT NULL,
  equipment_type VARCHAR(50) NOT NULL,
  department     VARCHAR(100),
  status         VARCHAR(30) DEFAULT 'Active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_region ON assets(region);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

CREATE TABLE IF NOT EXISTS asset_compliance_alerts (
  alert_id       VARCHAR(20) PRIMARY KEY,
  asset_code     VARCHAR(40) NOT NULL REFERENCES assets(asset_code) ON DELETE CASCADE,
  type           VARCHAR(50),
  message        TEXT,
  days_remaining INTEGER DEFAULT 0,
  severity       VARCHAR(20) DEFAULT 'MEDIUM',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_work_orders (
  id               VARCHAR(20) PRIMARY KEY,
  asset_code       VARCHAR(40) NOT NULL REFERENCES assets(asset_code),
  asset_name       VARCHAR(200),
  type             VARCHAR(30) DEFAULT 'Planned',
  priority         VARCHAR(20) DEFAULT 'Medium',
  description      TEXT NOT NULL,
  scheduled_date   DATE,
  completed_date   DATE,
  status           VARCHAR(30) DEFAULT 'Open',
  technician       VARCHAR(100),
  department       VARCHAR(100),
  estimated_hours  NUMERIC(5,1) DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS utility_bills (
  id             VARCHAR(20) PRIMARY KEY,
  site_id        VARCHAR(20) NOT NULL,
  site_name      VARCHAR(100),
  utility_type   VARCHAR(30) NOT NULL,
  period         VARCHAR(20) NOT NULL,  -- YYYY-MM or 'Mon YYYY'
  amount         NUMERIC(10,2) NOT NULL,
  meter_reading  NUMERIC(12,2),
  unit           VARCHAR(10),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, utility_type, period)
);

CREATE INDEX IF NOT EXISTS idx_bills_site ON utility_bills(site_id);

-- ── Seed: assets ──────────────────────────────────────────────
INSERT INTO assets (asset_code, name, region, site, facility, equipment_type, department, status) VALUES
  ('MSQ-001-F01-GEN001','Standby Generator Unit 1','Muscat','Al Khuwair Station','Main Forecourt','Generator','Operations','Active'),
  ('MSQ-001-F01-DSP001','Fuel Dispenser Unit 1','Muscat','Al Khuwair Station','Main Forecourt','Dispenser','Retail','Active'),
  ('MSQ-001-F01-DSP002','Fuel Dispenser Unit 2','Muscat','Al Khuwair Station','Main Forecourt','Dispenser','Retail','Maintenance'),
  ('MSQ-002-F02-HVC001','HVAC Unit — Convenience Store','Muscat','Qurum Station','Convenience Store','HVAC','Facilities','Active'),
  ('MSQ-002-F02-SEC001','CCTV Camera Array','Muscat','Qurum Station','Convenience Store','Security','QHSE','Active'),
  ('SLL-003-F03-GEN001','Standby Generator','Salalah','Salalah Main Station','Forecourt','Generator','Operations','Active'),
  ('SLL-003-F03-DSP001','Fuel Dispenser Unit 1','Salalah','Salalah Main Station','Forecourt','Dispenser','Retail','Active'),
  ('SLL-003-F03-CNP001','Canopy Lighting Array','Salalah','Salalah Main Station','Forecourt','Lighting','Facilities','Inactive'),
  ('SLL-003-F04-TRN001','Transformer Unit','Salalah','Salalah Main Station','Utility Room','Electrical','Infrastructure','Active'),
  ('SHR-004-F05-DSP001','Fuel Dispenser Unit 1','Sohar','Sohar Industrial Station','Main Forecourt','Dispenser','Retail','Active'),
  ('SHR-004-F05-DSP002','Fuel Dispenser Unit 2','Sohar','Sohar Industrial Station','Main Forecourt','Dispenser','Retail','Active'),
  ('SHR-004-F05-PMP001','Submersible Pump Unit','Sohar','Sohar Industrial Station','Tank Farm','Pump','Operations','Maintenance')
ON CONFLICT (asset_code) DO NOTHING;

-- ── Seed: asset_compliance_alerts ────────────────────────────
INSERT INTO asset_compliance_alerts (alert_id, asset_code, type, message, days_remaining, severity) VALUES
  ('ALT-001','MSQ-001-F01-GEN001','Contract Expiry','Maintenance contract for Standby Generator Unit 1 expires in 14 days. Renew to avoid service gap.',14,'HIGH'),
  ('ALT-002','SHR-004-F05-PMP001','SLA Breach','Submersible Pump Unit has been under maintenance for 18 days — SLA threshold of 15 days exceeded.',0,'CRITICAL'),
  ('ALT-003','SLL-003-F03-CNP001','Contract Expiry','Canopy Lighting maintenance contract expires in 45 days. Schedule renewal with facilities team.',45,'MEDIUM')
ON CONFLICT (alert_id) DO NOTHING;

-- ── Seed: maintenance_work_orders ────────────────────────────
INSERT INTO maintenance_work_orders (id, asset_code, asset_name, type, priority, description, scheduled_date, completed_date, status, technician, department, estimated_hours, notes) VALUES
  ('WO-2026-001','MSQ-001-F01-GEN001','Standby Generator Unit 1','Planned','Medium','Annual servicing and oil change','2026-03-25',NULL,'Open','Ahmed Al Rashdi','Operations',4,''),
  ('WO-2026-002','MSQ-001-F01-DSP002','Fuel Dispenser Unit 2','Unplanned','High','Meter calibration failure — urgent repair required','2026-03-18','2026-03-19','Completed','Mohammed Al Balushi','Retail',2,'Replaced flow meter board'),
  ('WO-2026-003','SHR-004-F05-PMP001','Submersible Pump Unit','Unplanned','Critical','Pump seal failure causing intermittent shutdown','2026-03-01',NULL,'In Progress','Khalid Al Siyabi','Operations',8,'Awaiting seal kit from supplier'),
  ('WO-2026-004','SLL-003-F03-CNP001','Canopy Lighting Array','Planned','Low','Replace 12 LED fixtures as part of scheduled upgrade','2026-04-05',NULL,'Open','Salim Al Harthi','Facilities',6,''),
  ('WO-2026-005','MSQ-002-F02-HVC001','HVAC Unit — Convenience Store','Planned','Medium','Quarterly filter cleaning and refrigerant check','2026-03-28',NULL,'Open','Ibrahim Al Amri','Facilities',3,''),
  ('WO-2026-006','SLL-003-F04-TRN001','Transformer Unit','Planned','High','Bi-annual thermal imaging and connection torque check','2026-04-12',NULL,'Open','Ahmed Al Rashdi','Infrastructure',5,'')
ON CONFLICT (id) DO NOTHING;

-- ── Seed: utility_bills ───────────────────────────────────────
INSERT INTO utility_bills (id, site_id, site_name, utility_type, period, amount, meter_reading, unit) VALUES
  ('UB-001','SITE-001','Al Khuwair Station','Electricity','2025-10',4800,142300,'kWh'),
  ('UB-002','SITE-001','Al Khuwair Station','Electricity','2025-11',5100,147600,'kWh'),
  ('UB-003','SITE-001','Al Khuwair Station','Electricity','2025-12',5400,153200,'kWh'),
  ('UB-004','SITE-001','Al Khuwair Station','Electricity','2026-01',5250,158600,'kWh'),
  ('UB-005','SITE-001','Al Khuwair Station','Electricity','2026-02',4950,163700,'kWh'),
  ('UB-006','SITE-001','Al Khuwair Station','Electricity','2026-03',5050,168900,'kWh'),
  ('UB-007','SITE-001','Al Khuwair Station','Water','2025-10',320,8400,'m³'),
  ('UB-008','SITE-001','Al Khuwair Station','Water','2025-11',295,8710,'m³'),
  ('UB-009','SITE-001','Al Khuwair Station','Water','2025-12',340,9060,'m³'),
  ('UB-010','SITE-001','Al Khuwair Station','Water','2026-01',310,9380,'m³'),
  ('UB-011','SITE-001','Al Khuwair Station','Water','2026-02',290,9680,'m³'),
  ('UB-012','SITE-001','Al Khuwair Station','Water','2026-03',305,9990,'m³'),
  ('UB-013','SITE-003','Salalah Main Station','Electricity','2025-10',3800,98200,'kWh'),
  ('UB-014','SITE-003','Salalah Main Station','Electricity','2025-11',4100,102400,'kWh'),
  ('UB-015','SITE-003','Salalah Main Station','Electricity','2025-12',4400,106900,'kWh'),
  ('UB-016','SITE-003','Salalah Main Station','Electricity','2026-01',4200,111200,'kWh'),
  ('UB-017','SITE-003','Salalah Main Station','Electricity','2026-02',3950,115300,'kWh'),
  ('UB-018','SITE-003','Salalah Main Station','Electricity','2026-03',4050,119500,'kWh'),
  ('UB-019','SITE-003','Salalah Main Station','Gas','2025-10',620,21400,'MJ'),
  ('UB-020','SITE-003','Salalah Main Station','Gas','2025-11',680,22100,'MJ'),
  ('UB-021','SITE-003','Salalah Main Station','Gas','2025-12',720,22850,'MJ'),
  ('UB-022','SITE-003','Salalah Main Station','Gas','2026-01',695,23580,'MJ'),
  ('UB-023','SITE-003','Salalah Main Station','Gas','2026-02',640,24250,'MJ'),
  ('UB-024','SITE-003','Salalah Main Station','Gas','2026-03',660,24940,'MJ'),
  ('UB-025','SITE-004','Sohar Industrial Station','Electricity','2025-10',6200,201000,'kWh'),
  ('UB-026','SITE-004','Sohar Industrial Station','Electricity','2025-11',6500,207600,'kWh'),
  ('UB-027','SITE-004','Sohar Industrial Station','Electricity','2025-12',6800,214500,'kWh'),
  ('UB-028','SITE-004','Sohar Industrial Station','Electricity','2026-01',6600,221200,'kWh'),
  ('UB-029','SITE-004','Sohar Industrial Station','Electricity','2026-02',6300,227600,'kWh'),
  ('UB-030','SITE-004','Sohar Industrial Station','Electricity','2026-03',6450,234100,'kWh')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- MODULE D: INTRA PORTAL
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_apps (
  id            VARCHAR(20) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  icon          VARCHAR(10),
  category      VARCHAR(50),
  url           VARCHAR(200) DEFAULT '#',
  sso_enabled   BOOLEAN DEFAULT false,
  allowed_roles TEXT[] NOT NULL DEFAULT '{}',
  sort_order    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id           VARCHAR(10) PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  category     VARCHAR(50),
  version      VARCHAR(10),
  last_updated DATE,
  description  TEXT,
  tags         TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS kb_versions (
  id         SERIAL PRIMARY KEY,
  doc_id     VARCHAR(10) NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  version    VARCHAR(10) NOT NULL,
  updated_at DATE,
  updated_by VARCHAR(100),
  changelog  TEXT
);

CREATE INDEX IF NOT EXISTS idx_kb_versions_doc ON kb_versions(doc_id);

CREATE TABLE IF NOT EXISTS user_favourites (
  user_id TEXT NOT NULL,
  app_id  VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, app_id)
);

CREATE TABLE IF NOT EXISTS user_pinned_docs (
  user_id TEXT NOT NULL,
  doc_id  VARCHAR(10) NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, doc_id)
);

-- ── Seed: portal_apps ─────────────────────────────────────────
INSERT INTO portal_apps (id, name, description, icon, category, url, sso_enabled, allowed_roles, sort_order) VALUES
  ('APP-001','SAP','Enterprise resource planning — financials, procurement, and operations.','🏢','Enterprise','#',true,ARRAY['Admin','Finance','Manager'],1),
  ('APP-002','Leave Portal','Apply for annual, sick, or emergency leave and track your balance.','🗓️','HR','#',false,ARRAY['Admin','Manager','Finance','Employee'],2),
  ('APP-003','QHSE Portal','Report incidents, manage safety audits, and track QHSE KPIs.','🦺','QHSE','#',false,ARRAY['Admin','Manager','Finance','Employee'],3),
  ('APP-004','IT Helpdesk','Raise IT support tickets and track resolution status.','🖥️','IT','#',false,ARRAY['Admin','Manager','Finance','Employee'],4),
  ('APP-005','Procurement','Manage purchase requests, vendor quotes, and procurement workflows.','🛒','Procurement','#',true,ARRAY['Admin','Finance','Manager'],5),
  ('APP-006','Finance Reports','Access monthly P&L, budget variance reports, and financial dashboards.','📊','Finance','#',true,ARRAY['Admin','Finance'],6),
  ('APP-007','HR Portal','Employee directory, payslips, performance reviews, and onboarding.','👥','HR','#',true,ARRAY['Admin','Manager','Finance','Employee'],7),
  ('APP-008','Training Portal','Browse and enrol in mandatory and elective training courses.','🎓','HR','#',false,ARRAY['Admin','Manager','Finance','Employee'],8),
  ('APP-009','Asset Manager','Track real estate assets, utility bills, and compliance schedules.','🏗️','Operations','#',false,ARRAY['Admin','Finance','Manager'],9),
  ('APP-010','Project Tracker','Monitor project milestones, resource allocation, and delivery status.','📋','Operations','#',false,ARRAY['Admin','Finance','Manager'],10),
  ('APP-011','Document Hub','Central repository for policies, procedures, and corporate documents.','📁','Administration','#',false,ARRAY['Admin','Manager','Finance','Employee'],11),
  ('APP-012','Admin Console','User management, system configuration, and access control settings.','⚙️','Administration','#',false,ARRAY['Admin'],12)
ON CONFLICT (id) DO NOTHING;

-- ── Seed: knowledge_base ──────────────────────────────────────
INSERT INTO knowledge_base (id, title, category, version, last_updated, description, tags) VALUES
  ('KB-001','How to Raise a Purchase Request','Procedure','2.1','2026-01-15','Step-by-step guide to creating, submitting, and tracking a purchase request through the approval workflow.',ARRAY['purchase','procurement','approval','workflow','request']),
  ('KB-002','Capex Budget Approval Policy','Policy','3.0','2025-11-01','Defines approval tiers, authority limits, and escalation paths for capital expenditure requests.',ARRAY['capex','budget','approval','policy','finance']),
  ('KB-003','Asset Registration Guidelines','Procedure','1.4','2025-12-10','Instructions for registering new physical assets in RADP, including tagging standards and categorisation rules.',ARRAY['asset','registration','radp','tagging','equipment']),
  ('KB-004','Incident Reporting Procedure','QHSE','4.2','2026-02-03','Mandatory procedure for reporting workplace incidents, near-misses, and environmental events within 24 hours.',ARRAY['incident','safety','reporting','near-miss','QHSE']),
  ('KB-005','Annual Leave Policy','HR','2.0','2026-01-01','Outlines annual leave entitlements, approval process, carry-forward rules, and blackout periods.',ARRAY['leave','holiday','HR','policy','entitlement']),
  ('KB-006','IT Security & Acceptable Use Policy','Policy','5.1','2025-10-20','Governs acceptable use of company IT systems, password standards, and data classification requirements.',ARRAY['IT','security','password','data','acceptable use']),
  ('KB-007','Health & Safety Induction Checklist','QHSE','1.1','2026-02-28','Checklist for new employee and contractor site inductions covering emergency procedures and PPE requirements.',ARRAY['safety','induction','PPE','checklist','onboarding']),
  ('KB-008','Vendor Onboarding Procedure','Procedure','1.3','2025-09-15','Process for registering new vendors, obtaining required documentation, and setting up in the procurement system.',ARRAY['vendor','supplier','onboarding','procurement','registration'])
ON CONFLICT (id) DO NOTHING;

-- ── Seed: kb_versions ─────────────────────────────────────────
INSERT INTO kb_versions (doc_id, version, updated_at, updated_by, changelog) VALUES
  ('KB-001','2.1','2026-01-15','Fatima Al Said','Updated section 4 to reflect the new 3-quote approval workflow.'),
  ('KB-001','2.0','2025-09-01','Fatima Al Said','Major revision — added digital submission steps and removed paper form references.'),
  ('KB-001','1.2','2025-03-12','Ahmed Al Balushi','Minor corrections to form references and approver contact details.'),
  ('KB-002','3.0','2025-11-01','Mohammed Al Rashdi','Raised HIGH tier threshold from OMR 200k to OMR 300k per updated authority matrix.'),
  ('KB-002','2.1','2024-06-15','Mohammed Al Rashdi','Added mandatory QHSE sign-off for HIGH tier capex requests.'),
  ('KB-002','2.0','2023-12-01','Sara Al Farsi','Introduced tiered approval framework — LOW / MEDIUM / HIGH.'),
  ('KB-003','1.4','2025-12-10','Khalid Al Siyabi','Added equipment type code table (GEN/DSP/HVC/PMP etc.) to appendix.'),
  ('KB-003','1.3','2025-07-20','Khalid Al Siyabi','Corrected asset code format — facility segment changed from 2 to 3 chars.'),
  ('KB-004','4.2','2026-02-03','Nadia Al Harthy','Added section on environmental near-miss reporting; updated escalation contacts.'),
  ('KB-004','4.1','2025-08-14','Nadia Al Harthy','Revised 24-hour reporting SLA to include digital submission channel.'),
  ('KB-004','4.0','2024-11-01','Ali Al Zadjali','Full rewrite to align with Shell Group HSSE standards 2024 update.'),
  ('KB-005','2.0','2026-01-01','HR Department','Updated carry-forward cap to 15 days; added emergency leave category.'),
  ('KB-005','1.1','2024-07-01','HR Department','Minor edits — updated public holiday list for 2024.'),
  ('KB-006','5.1','2025-10-20','IT Security Team','Added AI tool usage guidelines and data residency requirements.'),
  ('KB-006','5.0','2025-01-10','IT Security Team','Major update for NCA compliance — new password complexity requirements.'),
  ('KB-006','4.2','2023-09-01','IT Security Team','Added MFA mandate for remote access connections.'),
  ('KB-007','1.1','2026-02-28','QHSE Department','Added fire assembly point locations for new Sohar station.'),
  ('KB-007','1.0','2025-01-15','QHSE Department','Initial release — replaces paper-based induction checklist.'),
  ('KB-008','1.3','2025-09-15','Procurement Team','Added mandatory Omanisation documentation requirements.'),
  ('KB-008','1.2','2024-12-01','Procurement Team','Aligned with updated SAP vendor master data fields.'),
  ('KB-008','1.1','2024-06-01','Procurement Team','Added QHSE pre-qualification criteria for high-risk vendor categories.');
