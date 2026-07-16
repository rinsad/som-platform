-- ============================================================
-- SOM Platform: Reconcile CAPEX demo data with manual entries
-- Migration 028
-- ============================================================

-- The demo manual-entry rows are displayed as already posted. Keep the
-- department dashboard baseline aligned with those posted entries.

UPDATE capex_departments
SET committed = 317000,
    updated_at = NOW()
WHERE name = 'Trading, Lubricants & Supply Chain';

UPDATE capex_departments
SET actual = 498600,
    updated_at = NOW()
WHERE name = 'Mobility';

UPDATE capex_departments
SET total_budget = 530000,
    updated_at = NOW()
WHERE name = 'General';

UPDATE capex_department_monthly monthly
SET actual = 96600
FROM capex_departments dept
WHERE monthly.department_id = dept.id
  AND dept.name = 'Mobility'
  AND monthly.month_label = 'Mar';

UPDATE gsap_approved_budgets
SET posted_amount = 498600,
    source = 'manual',
    updated_at = NOW()
WHERE wbs_code = 'WBS-OM-2026-MOB-001';

UPDATE gsap_approved_budgets
SET approved_amount = 530000,
    source = 'manual',
    updated_at = NOW()
WHERE wbs_code = 'WBS-OM-2026-GEN-001';
