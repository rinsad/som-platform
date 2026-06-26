-- ============================================================
-- SOM Platform: complete CAPEX closure checklist coverage
-- Migration 015
-- ============================================================

WITH checklist_items(item_key, label) AS (
  VALUES
    ('technical_completion_confirmed', 'Technical completion confirmed'),
    ('final_contractor_acceptance', 'Final contractor acceptance completed'),
    ('completion_certificate_uploaded', 'Completion certificate uploaded'),
    ('contract_closure_completed', 'Contract closure completed'),
    ('retention_release_completed', 'Retention release completed'),
    ('asset_handover_completed', 'Asset handover completed'),
    ('operational_acceptance_completed', 'Operational acceptance completed'),
    ('hse_documentation_closed', 'HSE documentation closed'),
    ('lessons_learned_captured', 'Lessons learned captured')
)
INSERT INTO capex_closure_checklist_items
  (request_id, item_key, label, responsible_owner, updated_by)
SELECT r.id, c.item_key, c.label, COALESCE(r.requester_name, 'System'), 'System'
FROM capex_requests r
CROSS JOIN checklist_items c
ON CONFLICT (request_id, item_key) DO NOTHING;
