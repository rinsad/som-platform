-- Repair migration for environments that were created before Module B tables
-- were present, or where the original migration was only partially applied.

CREATE TABLE IF NOT EXISTS purchase_requests (
  id                     VARCHAR(30) PRIMARY KEY,
  title                  VARCHAR(200) NOT NULL,
  description            TEXT,
  requestor_name         VARCHAR(100),
  requestor_id           UUID REFERENCES som_users(id),
  department             VARCHAR(100),
  total_value            NUMERIC(14,2) NOT NULL,
  tier                   VARCHAR(10) NOT NULL CHECK (tier IN ('LOW','MEDIUM','HIGH')),
  status                 VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
  quote_count            INTEGER DEFAULT 0,
  requires_justification BOOLEAN DEFAULT false,
  justification          TEXT,
  line_items             JSONB DEFAULT '[]',
  approval_history       JSONB DEFAULT '[]',
  created_at             DATE NOT NULL DEFAULT CURRENT_DATE
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

INSERT INTO purchase_requests (id, title, description, requestor_name, department, total_value, tier, status, quote_count, requires_justification, justification, approval_history, created_at) VALUES
  ('PR-2026-001','Office Supplies Q1','Stationery and consumables for the admin department for Q1 2026.','Ahmed Al Balushi','Admin',1500,'LOW','APPROVED',3,false,'','[{"approver":"Sara Al Harthi","decision":"APPROVED","comment":"Routine supplies, approved.","date":"2026-01-11"}]','2026-01-10'),
  ('PR-2026-002','Generator Maintenance Equipment','Spare parts and servicing tools for station backup generators across Muscat region.','Sara Al Harthi','Operations',85000,'MEDIUM','PENDING_APPROVAL',3,false,'','[]','2026-02-14'),
  ('PR-2026-003','Fuel Storage Tank Replacement','Full replacement of aged underground fuel storage tanks at Al Khuwair station.','Khalid Al Rashdi','Retail',450000,'HIGH','PENDING_APPROVAL',4,false,'','[{"approver":"Ahmed Al Balushi","decision":"APPROVED","comment":"Dept manager approved. Escalating to Finance.","date":"2026-03-03"}]','2026-03-01'),
  ('PR-2026-004','IT Hardware Refresh','Replacement laptops and monitors for the IT team - end of lifecycle.','Fatma Al Maamari','IT',22000,'LOW','DRAFT',1,true,'Only 1 quote obtained so far - 2 more in progress.','[]','2026-03-10'),
  ('PR-2026-005','CCTV Upgrade - Salalah Stations','Installation of HD CCTV cameras across 3 Salalah stations for QHSE compliance.','Rashid Al Ghafri','QHSE',67500,'MEDIUM','APPROVED',3,false,'','[{"approver":"Sara Al Harthi","decision":"APPROVED","comment":"Budget available, QHSE priority.","date":"2026-01-25"},{"approver":"Admin User","decision":"APPROVED","comment":"Final approval granted.","date":"2026-01-27"}]','2026-01-22'),
  ('PR-2026-006','Fleet Vehicle Leasing - 5 Units','Annual lease for 5 field inspection vehicles for the infrastructure team.','Maryam Al Lawati','Infrastructure',312000,'HIGH','REJECTED',3,false,'','[{"approver":"Sara Al Harthi","decision":"REJECTED","comment":"Budget freeze in effect for Q1. Resubmit in Q2.","date":"2026-02-05"}]','2026-02-01'),
  ('PR-2026-007','Safety Signage Rebranding','Replace all station safety and brand signage to new Shell global standard.','Ahmed Al Balushi','Retail',18400,'LOW','APPROVED',3,false,'','[{"approver":"Sara Al Harthi","decision":"APPROVED","comment":"Approved - brand compliance requirement.","date":"2026-02-22"}]','2026-02-20'),
  ('PR-2026-008','Canopy Structural Inspection','Third-party structural inspection of canopies at 12 stations per regulatory schedule.','Rashid Al Ghafri','QHSE',9800,'LOW','PENDING_APPROVAL',2,true,'Third quote delayed by vendor - expected within 5 days.','[]','2026-03-12')
ON CONFLICT (id) DO NOTHING;

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
