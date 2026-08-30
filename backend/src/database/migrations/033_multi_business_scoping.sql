-- ============================================================
-- SOM Platform: multi-business scoping foundation
-- Migration 033
--
-- Gives legacy CAPEX and Purchase Requests a business dimension so that
-- business-scoped roles (Business GM, Manager, Finance in Business, CP Lead,
-- HSSE Focal, Project Owner, Project Engineer) only see and decide requests in
-- their own business, while portfolio roles (CEO/Board, CFO, Admin, Internal
-- Audit, Finance Manager, CP Manager, Asset Team) keep full visibility.
--
-- The business master is capex_v2.organization_units and the per-user grants
-- live in capex_v2.user_scope_assignments — the same tables CAPEX v2 already
-- uses, so v1 and v2 agree on who the Aviation FiB is.
--
-- This migration is INERT: it adds columns and rows, but no read path consults
-- them yet. Enforcement is gated by capex_scope_settings.enforcement_mode,
-- which starts at 'off'.
--
-- migrate.js replays every migration file on every run, so every statement here
-- must be idempotent AND non-stomping: the backfills are guarded on IS NULL so
-- a replay can never revert an administrator's manual correction.
--
-- NOTE (decision register item C1, unsigned): the authoritative business list
-- is still a client decision. Units below are seeded from the data already in
-- this database so the backfill is exact and lossless. They are referenced by
-- UUID and are admin-editable, so renaming or merging them after sign-off costs
-- an UPDATE plus an alias row — never a migration.
-- ============================================================

-- ── Normalised code helper ───────────────────────────────────────────────────
-- 'Trading, Lubricants & Supply Chain' -> 'TRADING_LUBRICANTS_SUPPLY_CHAIN'
CREATE OR REPLACE FUNCTION capex_v2.normalize_org_code(source TEXT)
RETURNS TEXT AS $$
  SELECT btrim(regexp_replace(upper(btrim(COALESCE(source, ''))), '[^A-Z0-9]+', '_', 'g'), '_');
$$ LANGUAGE SQL IMMUTABLE;

-- ── 1. Seed the business master from real data ───────────────────────────────
-- The CAPEX department master is the business-unit list.
INSERT INTO capex_v2.organization_units (code, name, unit_type, external_reference)
SELECT capex_v2.normalize_org_code(d.name), d.name, 'BUSINESS_UNIT', 'LEGACY_CAPEX_DEPARTMENT'
  FROM capex_departments d
 WHERE capex_v2.normalize_org_code(d.name) <> ''
ON CONFLICT (code) DO NOTHING;

-- Every other department string still referenced by a live request becomes a
-- DEPARTMENT unit, so the backfill below leaves no request unmapped. Purchase
-- requests use their own vocabulary (Operations, IT, QHSE, Retail...) which does
-- not overlap the CAPEX departments at all — without this, every legacy PR
-- would end up with a NULL business and disappear under scoped reads.
INSERT INTO capex_v2.organization_units (code, name, unit_type, external_reference)
SELECT DISTINCT ON (capex_v2.normalize_org_code(src.dept))
       capex_v2.normalize_org_code(src.dept), btrim(src.dept), 'DEPARTMENT', 'LEGACY_BACKFILL'
  FROM (
    SELECT department AS dept FROM capex_requests    WHERE btrim(COALESCE(department, '')) <> ''
    UNION ALL
    SELECT department AS dept FROM purchase_requests WHERE btrim(COALESCE(department, '')) <> ''
  ) src
 WHERE capex_v2.normalize_org_code(src.dept) <> ''
   AND NOT EXISTS (
     SELECT 1 FROM capex_v2.organization_units o
      WHERE o.code = capex_v2.normalize_org_code(src.dept))
 ORDER BY capex_v2.normalize_org_code(src.dept), btrim(src.dept)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Free-text bridge ──────────────────────────────────────────────────────
-- Maps a legacy department string to a business unit. This is what lets the
-- department-keyed legacy endpoints (summary, departments, GSAP, initiations,
-- manual entries) be scoped without adding a column to five more tables, and it
-- absorbs later renames and merges of the master list.
CREATE TABLE IF NOT EXISTS capex_v2.organization_unit_aliases (
  alias_normalized     TEXT PRIMARY KEY,
  alias_source         VARCHAR(40) NOT NULL DEFAULT 'LEGACY_DEPARTMENT',
  organization_unit_id UUID NOT NULL REFERENCES capex_v2.organization_units(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capex_v2_org_alias_unit
  ON capex_v2.organization_unit_aliases(organization_unit_id);

-- Each unit is an alias of its own name.
INSERT INTO capex_v2.organization_unit_aliases (alias_normalized, alias_source, organization_unit_id)
SELECT lower(btrim(o.name)), 'UNIT_NAME', o.id
  FROM capex_v2.organization_units o
ON CONFLICT (alias_normalized) DO NOTHING;

-- Any legacy string that normalises onto an existing unit code also aliases to
-- it — this covers casing/punctuation drift and code collisions.
INSERT INTO capex_v2.organization_unit_aliases (alias_normalized, alias_source, organization_unit_id)
SELECT DISTINCT lower(btrim(src.dept)), 'LEGACY_DEPARTMENT', o.id
  FROM (
    SELECT department AS dept FROM capex_requests    WHERE btrim(COALESCE(department, '')) <> ''
    UNION ALL
    SELECT department AS dept FROM purchase_requests WHERE btrim(COALESCE(department, '')) <> ''
  ) src
  JOIN capex_v2.organization_units o ON o.code = capex_v2.normalize_org_code(src.dept)
ON CONFLICT (alias_normalized) DO NOTHING;

-- ── 3. Scope columns and indexes ─────────────────────────────────────────────
ALTER TABLE capex_requests
  ADD COLUMN IF NOT EXISTS organization_unit_id UUID REFERENCES capex_v2.organization_units(id);
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS organization_unit_id UUID REFERENCES capex_v2.organization_units(id);

CREATE INDEX IF NOT EXISTS idx_capex_requests_org_unit
  ON capex_requests(organization_unit_id);
CREATE INDEX IF NOT EXISTS idx_capex_requests_requester
  ON capex_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_org_unit
  ON purchase_requests(organization_unit_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_requestor
  ON purchase_requests(requestor_id);

-- Anti-starvation lookup: "which requests have a step assigned to me". An
-- approver must keep sight of a decision that is explicitly theirs even when the
-- request belongs to another business.
CREATE INDEX IF NOT EXISTS idx_capex_steps_assigned_lower
  ON capex_approval_steps (lower(btrim(assigned_to)))
  WHERE assigned_to IS NOT NULL;

-- ── 4. Backfill (guarded — never stomps a manual reassignment on replay) ─────
UPDATE capex_requests r
   SET organization_unit_id = al.organization_unit_id
  FROM capex_v2.organization_unit_aliases al
 WHERE r.organization_unit_id IS NULL
   AND al.alias_normalized = lower(btrim(r.department));

UPDATE purchase_requests p
   SET organization_unit_id = al.organization_unit_id
  FROM capex_v2.organization_unit_aliases al
 WHERE p.organization_unit_id IS NULL
   AND al.alias_normalized = lower(btrim(p.department));

-- ── 5. Provenance on scope assignments ───────────────────────────────────────
-- Separates rows derived from a user's role + Business / Function profile from
-- rows an administrator created by hand through the CAPEX v2 APIs, so the
-- former can be replaced without ever touching the latter.
ALTER TABLE capex_v2.user_scope_assignments
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'MANUAL';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capex_v2_user_scope_source_chk') THEN
    ALTER TABLE capex_v2.user_scope_assignments
      ADD CONSTRAINT capex_v2_user_scope_source_chk
      CHECK (source IN ('MANUAL', 'DERIVED_FROM_PROFILE'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_capex_v2_scope_derived_unique
  ON capex_v2.user_scope_assignments
     (user_id, role_name, COALESCE(organization_unit_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE source = 'DERIVED_FROM_PROFILE' AND is_active = TRUE;

-- ── 6. Derive role-scope rows from role + Business / Function anchor ─────────
-- Portfolio roles get a PORTFOLIO scope. Business roles get a BUSINESS_UNIT
-- scope taken from the anchor the Admin user form already writes; users with a
-- business role and no anchor get nothing and fail closed once enforcement is
-- switched on (see capex_scope_settings below).
INSERT INTO capex_v2.user_scope_assignments
  (user_id, role_name, scope_type, organization_unit_id, capabilities, source)
SELECT u.id,
       u.role,
       CASE WHEN u.role IN ('CEO/Board', 'CFO', 'Admin', 'Internal Audit',
                            'Finance Manager', 'CP Manager', 'Asset Team')
            THEN 'PORTFOLIO' ELSE 'BUSINESS_UNIT' END,
       CASE WHEN u.role IN ('CEO/Board', 'CFO', 'Admin', 'Internal Audit',
                            'Finance Manager', 'CP Manager', 'Asset Team')
            THEN NULL ELSE anchor.organization_unit_id END,
       '{}'::TEXT[],
       'DERIVED_FROM_PROFILE'
  FROM som_users u
  LEFT JOIN LATERAL (
    SELECT a.organization_unit_id
      FROM capex_v2.user_scope_assignments a
     WHERE a.user_id = u.id
       AND a.role_name = '__BUSINESS_FUNCTION_ANCHOR__'
       AND a.scope_type = 'OWN'
       AND a.is_active = TRUE
       AND a.effective_from <= CURRENT_DATE
       AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
     ORDER BY a.created_at DESC
     LIMIT 1
  ) anchor ON TRUE
 WHERE u.is_active = TRUE
   AND u.role IS NOT NULL
   AND (
     u.role IN ('CEO/Board', 'CFO', 'Admin', 'Internal Audit',
                'Finance Manager', 'CP Manager', 'Asset Team')
     OR anchor.organization_unit_id IS NOT NULL
   )
ON CONFLICT DO NOTHING;

-- ── 7. Enforcement switch ────────────────────────────────────────────────────
-- 'off'    — no scoping applied (current behaviour)
-- 'shadow' — predicates evaluated but not enforced; every would-be denial is
--            written to the audit log so the impact can be reviewed before the
--            flip
-- 'on'     — enforced
--
-- INSERT only, deliberately. This file is replayed on every deploy, so an
-- UPDATE here would silently re-disable a switch that was flipped on, or
-- re-enable one that was rolled back.
CREATE TABLE IF NOT EXISTS capex_scope_settings (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  enforcement_mode VARCHAR(10) NOT NULL DEFAULT 'off'
    CHECK (enforcement_mode IN ('off', 'shadow', 'on')),
  updated_by       VARCHAR(100),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO capex_scope_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
