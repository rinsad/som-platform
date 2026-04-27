-- ============================================================
-- SOM Platform: Replace capex departments with new structure
-- Migration 006
-- ============================================================

-- ── Remove old department-linked data ────────────────────────
-- capex_department_monthly cascades automatically (ON DELETE CASCADE)
DELETE FROM gsap_approved_budgets
  WHERE department IN ('Retail Operations','Infrastructure','Technology','QHSE');

DELETE FROM capex_initiations
  WHERE department IN ('Retail Operations','Infrastructure','Technology','QHSE');

DELETE FROM capex_manual_entries
  WHERE department IN ('Retail Operations','Infrastructure','Technology','QHSE');

DELETE FROM capex_departments
  WHERE name IN ('Retail Operations','Infrastructure','Technology','QHSE');

-- ── Insert new departments ────────────────────────────────────
INSERT INTO capex_departments (name, total_budget, committed, actual) VALUES
  ('HR & Real Estate',                    800000, 120000, 350000),
  ('Finance & Operations',                600000,  80000, 210000),
  ('Trading, Lubricants & Supply Chain', 2000000, 250000, 890000),
  ('Aviation',                           1500000, 180000, 720000),
  ('Mobility',                           1200000, 150000, 480000),
  ('General',                             500000,  60000, 140000)
ON CONFLICT (name) DO UPDATE
  SET total_budget = EXCLUDED.total_budget,
      committed    = EXCLUDED.committed,
      actual       = EXCLUDED.actual,
      updated_at   = NOW();

-- ── Insert monthly data ───────────────────────────────────────
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

-- ── Insert capex initiations ──────────────────────────────────
INSERT INTO capex_initiations (id, title, description, department, initiator, project_type, estimated_budget, priority, status, start_date, end_date, stakeholders, justification, created_at) VALUES
  ('CINIT-2026-001','Aviation Ground Support Equipment Upgrade','Replacement of ageing ground support equipment across all aviation fuelling stations to meet IATA safety standards.','Aviation','Khalid Al Rashdi','Replacement',420000,'High','Under Review','2026-06-01','2026-12-31','Aviation, Finance & Operations, General','Mandatory compliance with IATA ground handling regulations. Existing equipment beyond service life.','2026-03-01'),
  ('CINIT-2026-002','EV Fleet Expansion — Mobility Division','Procurement of 25 electric vehicles to grow the Mobility fleet and support Oman''s national EV adoption targets.','Mobility','Ahmed Al Balushi','New',280000,'Medium','Approved','2026-04-15','2026-09-30','Mobility, Finance & Operations, HR & Real Estate','Strategic investment aligned with Shell''s net-zero commitments and growing domestic EV demand.','2026-02-15'),
  ('CINIT-2026-003','Head Office Fit-Out — Phase 2','Second-phase interior fit-out of the new Muscat head office including meeting rooms, collaboration spaces, and IT infrastructure.','HR & Real Estate','Rashid Al Ghafri','New',195000,'High','Pending Approval','2026-05-01','2026-08-31','HR & Real Estate, Finance & Operations, General','Phase 1 complete. Phase 2 required to bring remaining floors into operational use ahead of Q3 staff relocation.','2026-03-10')
ON CONFLICT (id) DO NOTHING;

-- ── Insert capex manual entries ───────────────────────────────
INSERT INTO capex_manual_entries (id, entry_type, department, period, amount, description, reference_number, entered_by, entered_at, status) VALUES
  ('ME-2026-001','Actual','Mobility','2026-03',18600,'EV charger installation at Muscat depot — vendor invoice #INV-5510','INV-5510','Sara Al Harthi','2026-03-15','Posted'),
  ('ME-2026-002','PO Commitment','Trading, Lubricants & Supply Chain','2026-03',67000,'Lubricant blending equipment overhaul — PO raised for Al Maha Engineering','PO-2026-0318','Fatma Al Maamari','2026-03-12','Posted'),
  ('ME-2026-003','Budget Adjustment','General','2026-02',30000,'Emergency budget reallocation for organisation-wide IT security audit','BA-2026-005','Admin User','2026-02-28','Posted')
ON CONFLICT (id) DO NOTHING;

-- ── Insert GSAP approved budgets ──────────────────────────────
INSERT INTO gsap_approved_budgets (wbs_code, description, department, approved_amount, posted_amount, source) VALUES
  ('WBS-OM-2026-HR-001', 'HR & Real Estate — Facilities and Property Capex',        'HR & Real Estate',                    800000, 350000, 'manual'),
  ('WBS-OM-2026-FIN-001','Finance & Operations — Systems and Process Capex',         'Finance & Operations',                600000, 210000, 'manual'),
  ('WBS-OM-2026-TLS-001','Trading, Lubricants & Supply Chain — Infrastructure Capex','Trading, Lubricants & Supply Chain', 2000000, 890000, 'manual'),
  ('WBS-OM-2026-AVN-001','Aviation — Equipment and Facilities Capex',                'Aviation',                           1500000, 720000, 'manual'),
  ('WBS-OM-2026-MOB-001','Mobility — Fleet and Charging Infrastructure Capex',       'Mobility',                           1200000, 480000, 'manual'),
  ('WBS-OM-2026-GEN-001','General — Organisation-Wide Capex',                        'General',                             500000, 140000, 'manual')
ON CONFLICT (wbs_code) DO UPDATE
  SET description     = EXCLUDED.description,
      department      = EXCLUDED.department,
      approved_amount = EXCLUDED.approved_amount,
      posted_amount   = EXCLUDED.posted_amount,
      source          = EXCLUDED.source,
      updated_at      = NOW();
