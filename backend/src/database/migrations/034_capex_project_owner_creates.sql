-- ============================================================
-- SOM Platform: only the Project Owner raises requests
-- Migration 034
--
-- Client rule: CAPEX requests and purchase requests are originated by the
-- Project Owner. Admin keeps the ability for now so support can raise one on a
-- requester's behalf. Every other role reviews, approves or executes, but does
-- not originate.
--
-- Also moves the purchase-order fields on the procurement record to the Project
-- Owner, who is now responsible for updating the PO.
--
-- Targeted per-key updates in the style of migrations 018/020/026/027 — never a
-- wholesale per-user reset, so administrator customisations survive.
-- All statements are idempotent; migrate.js replays this file on every run.
-- ============================================================

-- ── Revoke request creation from every role except Project Owner and Admin ───
-- can_view and can_edit are deliberately untouched: these roles still read and
-- update requests, they simply no longer originate them.
UPDATE som_permissions p
   SET can_create = false
  FROM som_users u
 WHERE u.id = p.user_id
   AND p.resource_key IN ('capex.requests', 'purchase-requests')
   AND p.can_create = true
   AND u.role NOT IN ('Project Owner', 'Admin');

-- ── Ensure the Project Owner can raise both ─────────────────────────────────
INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT u.id, 'page', 'capex.requests', true, true, true, false
  FROM som_users u
 WHERE u.role = 'Project Owner'
ON CONFLICT (user_id, resource_key)
DO UPDATE SET
  level      = EXCLUDED.level,
  can_view   = true,
  can_create = true,
  can_edit   = true;

INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT u.id, 'module', 'purchase-requests', true, true, true, false
  FROM som_users u
 WHERE u.role = 'Project Owner'
ON CONFLICT (user_id, resource_key)
DO UPDATE SET
  level      = EXCLUDED.level,
  can_view   = true,
  can_create = true,
  can_edit   = true;

-- ── Updating the PO is the Project Owner's responsibility ───────────────────
-- The procurement section is guarded by capex.procurement can_edit, which the
-- Project Owner did not previously hold. can_create is left false: they update
-- the existing procurement record rather than creating procurement entries.
INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
SELECT u.id, 'page', 'capex.procurement', true, false, true, false
  FROM som_users u
 WHERE u.role = 'Project Owner'
ON CONFLICT (user_id, resource_key)
DO UPDATE SET
  level    = EXCLUDED.level,
  can_view = true,
  can_edit = true;
