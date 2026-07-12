-- Clean out known local dev/test purchase requests that were created while
-- validating workflow and input-guard fixes, then top the sample set up with a
-- few more realistic variations for the list/detail views.

DELETE FROM pr_documents
WHERE pr_id IN (
  'PR-2026-141',
  'PR-2026-142',
  'PR-2026-143',
  'PR-2026-144',
  'PR-2026-145',
  'PR-2026-146',
  'PR-2026-147',
  'PR-2026-148',
  'PR-2026-149',
  'PR-2026-150',
  'PR-2026-151'
);

DELETE FROM purchase_requests
WHERE id IN (
  'PR-2026-141',
  'PR-2026-142',
  'PR-2026-143',
  'PR-2026-144',
  'PR-2026-145',
  'PR-2026-146',
  'PR-2026-147',
  'PR-2026-148',
  'PR-2026-149',
  'PR-2026-150',
  'PR-2026-151'
)
OR title IN (
  'DeptMgr Approve Verify',
  'Valid Guard Test',
  'NaN Total Test',
  'No Dept Test',
  'Zero Total Test',
  'Negative Total Test',
  'Self-Approval Test PR'
);

INSERT INTO purchase_requests (
  id,
  title,
  description,
  requestor_name,
  department,
  total_value,
  tier,
  status,
  quote_count,
  requires_justification,
  justification,
  approval_history,
  created_at,
  hsse_risk,
  worker_welfare_risk,
  suppliers,
  selected_supplier,
  current_budget_omr
)
SELECT *
FROM (
  VALUES
    (
      'PR-2026-009',
      'POS Receipt Printer Rollout',
      'Replace receipt printers across six high-volume forecourts to reduce downtime and improve cashier uptime.',
      'Aisha Al Busaidi',
      'Retail',
      12800,
      'LOW',
      'PENDING_APPROVAL',
      3,
      false,
      '',
      '[]'::jsonb,
      '2026-03-18T09:30:00.000Z'::timestamptz,
      'Low',
      'Low',
      '[{"name":"TechSource","quoteAmount":12450},{"name":"Oman Office Systems","quoteAmount":12800},{"name":"Muscat Digital","quoteAmount":13120}]'::jsonb,
      'TechSource',
      14000
    ),
    (
      'PR-2026-010',
      'Workshop Exhaust Ventilation Upgrade',
      'Install upgraded exhaust and airflow controls in the vehicle workshop to address heat load and technician safety concerns.',
      'Salim Al Hinai',
      'Infrastructure',
      58600,
      'MEDIUM',
      'APPROVED',
      3,
      false,
      '',
      '[{"approver":"Nadia Al Lawati","decision":"APPROVED","comment":"Budget confirmed and quotes are complete.","date":"2026-03-08"},{"approver":"CP Lead","decision":"APPROVED","comment":"Supplier recommendation accepted.","date":"2026-03-10"}]'::jsonb,
      '2026-03-05T08:15:00.000Z'::timestamptz,
      'Medium',
      'Low',
      '[{"name":"Gulf Airflow Systems","quoteAmount":58600},{"name":"Prime Climate","quoteAmount":60150},{"name":"Ventec Oman","quoteAmount":59400}]'::jsonb,
      'Gulf Airflow Systems',
      62000
    ),
    (
      'PR-2026-011',
      'Emergency Spill Kit Replenishment',
      'Replenish spill-response kits and absorbent materials at coastal sites before the monsoon maintenance window.',
      'Hamed Al Farsi',
      'QHSE',
      7200,
      'LOW',
      'DRAFT',
      2,
      true,
      'Third compliant quotation is delayed by the approved vendor list refresh; operational stock must be reserved now.',
      '[]'::jsonb,
      '2026-03-20T11:00:00.000Z'::timestamptz,
      'High',
      'Medium',
      '[{"name":"SafeMarine Supplies","quoteAmount":7200},{"name":"Oman Industrial Safety","quoteAmount":7480}]'::jsonb,
      'SafeMarine Supplies',
      7800
    )
) AS seed_rows (
  id,
  title,
  description,
  requestor_name,
  department,
  total_value,
  tier,
  status,
  quote_count,
  requires_justification,
  justification,
  approval_history,
  created_at,
  hsse_risk,
  worker_welfare_risk,
  suppliers,
  selected_supplier,
  current_budget_omr
)
WHERE NOT EXISTS (
  SELECT 1
  FROM purchase_requests pr
  WHERE pr.id = seed_rows.id
);
