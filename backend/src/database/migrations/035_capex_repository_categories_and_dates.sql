-- ============================================================
-- SOM Platform: CAPEX repository — asset categories and project dates
-- Migration 035
--
-- From the client meeting of 5 Aug 2026 (see
-- docs/capex/meeting-2026-08-05-repository-gap-report.md, items 4, 10, 11, 12
-- and 14). Two asks:
--
--   1. Asset category must be an admin-maintained list of values, not a
--      hardcoded or free-text field, and it must be captured on the project
--      rather than only at capitalization. The seeds below are placeholders for
--      testing — the client owes us the production list, which is loaded by
--      INSERT into capex_reference_asset_categories, never by a migration.
--
--   2. The repository needs project-level dates the schema does not have:
--      start, target completion and expected capitalization. Only actuals
--      existed (milestone dates, capitalization approval dates), so nothing
--      could be measured against a plan. capex_requests.created_at is the
--      submission date, not the project start.
--
--   Plus the project owner's job title, which the client asked to see next to
--   the owner's name. The owner's name is capex_requests.requester_name —
--   migration 034 made the Project Owner the only role that raises requests, so
--   requester and project owner are the same person by construction and no
--   second name column is warranted.
--
-- migrate.js replays every migration file on every run, so every statement here
-- is idempotent and non-stomping: backfills are guarded so a replay can never
-- revert an administrator's correction.
-- ============================================================

-- ── 1. Asset category reference list ─────────────────────────────────────────
-- Shaped after capex_reference_project_types (migration 014), with the
-- description/sort/audit columns an admin-maintained list needs.
CREATE TABLE IF NOT EXISTS capex_reference_asset_categories (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL UNIQUE,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 100,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  updated_by    VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capex_asset_categories_active
  ON capex_reference_asset_categories(is_active, sort_order, name);

-- Placeholder seeds only — Azmath Kwaja is sending the Shell asset-category
-- list for production. ON CONFLICT DO NOTHING so a replay never reactivates or
-- renames a category an administrator has since edited or deactivated.
INSERT INTO capex_reference_asset_categories (name, description, sort_order, updated_by) VALUES
  ('Plant and Machinery',   'Placeholder pending client list', 10, 'Migration 035'),
  ('Furniture and Fixtures','Placeholder pending client list', 20, 'Migration 035'),
  ('IT Equipment',          'Placeholder pending client list', 30, 'Migration 035'),
  ('Motor Vehicles',        'Placeholder pending client list', 40, 'Migration 035'),
  ('Buildings',             'Placeholder pending client list', 50, 'Migration 035')
ON CONFLICT (name) DO NOTHING;

-- ── 2. Adopt asset-category values already recorded as free text ─────────────
-- capex_capitalization_tracking.asset_category is a free VARCHAR(100). Promote
-- every distinct value already in it into the reference list so no existing
-- record loses its category when the UI moves to the list.
INSERT INTO capex_reference_asset_categories (name, description, sort_order, updated_by)
SELECT DISTINCT btrim(c.asset_category), 'Adopted from existing capitalization records', 900, 'Migration 035'
  FROM capex_capitalization_tracking c
 WHERE btrim(COALESCE(c.asset_category, '')) <> ''
   AND NOT EXISTS (
     SELECT 1 FROM capex_reference_asset_categories r
      WHERE lower(r.name) = lower(btrim(c.asset_category)))
ON CONFLICT (name) DO NOTHING;

-- ── 3. Project-level repository fields ───────────────────────────────────────
-- asset_category_id is nullable: it is unknown for every request raised before
-- this migration, and the client treats it as a planning field rather than a
-- submission gate. Enforcement, if wanted, belongs in the controller against
-- new requests only — not as a NOT NULL that would break historical rows.
ALTER TABLE capex_requests
  ADD COLUMN IF NOT EXISTS project_owner_title          VARCHAR(120),
  ADD COLUMN IF NOT EXISTS start_date                   DATE,
  ADD COLUMN IF NOT EXISTS target_completion_date       DATE,
  ADD COLUMN IF NOT EXISTS expected_capitalization_date DATE,
  ADD COLUMN IF NOT EXISTS asset_category_id            INTEGER
    REFERENCES capex_reference_asset_categories(id);

-- A target completion before the start would silently poison the schedule flag
-- (ahead/on-time/delayed) the repository is meant to show. Both sides are
-- nullable, so the constraint only bites when both dates are present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'capex_requests_target_after_start'
  ) THEN
    ALTER TABLE capex_requests
      ADD CONSTRAINT capex_requests_target_after_start
      CHECK (
        start_date IS NULL
        OR target_completion_date IS NULL
        OR target_completion_date >= start_date
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_capex_requests_target_completion
  ON capex_requests(target_completion_date)
  WHERE target_completion_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_capex_requests_asset_category
  ON capex_requests(asset_category_id)
  WHERE asset_category_id IS NOT NULL;

-- ── 4. Same list on the capitalization record ────────────────────────────────
-- The free-text asset_category column stays and stays readable: controller and
-- report code still select it, and dropping it here would break those paths.
-- New writes should set asset_category_id; the text column is retired in a
-- later migration once every read path has moved.
ALTER TABLE capex_capitalization_tracking
  ADD COLUMN IF NOT EXISTS asset_category_id INTEGER
    REFERENCES capex_reference_asset_categories(id);

UPDATE capex_capitalization_tracking c
   SET asset_category_id = r.id
  FROM capex_reference_asset_categories r
 WHERE c.asset_category_id IS NULL
   AND btrim(COALESCE(c.asset_category, '')) <> ''
   AND lower(r.name) = lower(btrim(c.asset_category));

-- ── 5. Carry the planned category down to capitalization ─────────────────────
-- When a project is capitalized without a category named at that stage, the one
-- chosen at planning time is the right default. Guarded on IS NULL so a finance
-- correction at capitalization is never overwritten by a replay.
UPDATE capex_capitalization_tracking c
   SET asset_category_id = q.asset_category_id
  FROM capex_requests q
 WHERE c.request_id = q.id
   AND c.asset_category_id IS NULL
   AND btrim(COALESCE(c.asset_category, '')) = ''
   AND q.asset_category_id IS NOT NULL;
