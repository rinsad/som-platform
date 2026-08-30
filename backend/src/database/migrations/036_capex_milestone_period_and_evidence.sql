-- ============================================================
-- SOM Platform: milestone delivery period, comments and real evidence
-- Migration 036
--
-- From the client demo of 16 Jul 2026. Three asks against Project Execution:
--
--   1. "So stage one is from which period to which period. So we can see
--      whether the project is going on on time or not." A milestone carried a
--      single planned_date, which cannot express a period. planned_start_date
--      is added and the existing planned_date keeps its meaning as the planned
--      COMPLETION date, so no historic row changes meaning and no backfill is
--      needed.
--
--   2. "Keep a comment box because all this project lead would like to write
--      some small comment."
--
--   3. "He has to put the evidence." completion_evidence is a VARCHAR holding a
--      typed filename, so nothing was actually stored — the same defect that
--      was already fixed for supplier quotations. Evidence now rides on
--      capex_attachments (linked_type 'Milestone', linked_id = milestone id),
--      which already carries file_data, retention and the audit trail.
--      completion_evidence is retained, unused by new writes, so existing rows
--      keep the filename an engineer typed before this migration.
--
-- migrate.js replays every migration on every run, so every statement here is
-- guarded and forward-only.
-- ============================================================

ALTER TABLE capex_project_milestones
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS comments           TEXT;

COMMENT ON COLUMN capex_project_milestones.planned_date IS
  'Planned completion date. Paired with planned_start_date to form the delivery period.';
COMMENT ON COLUMN capex_project_milestones.completion_evidence IS
  'Legacy typed filename. Superseded by capex_attachments rows with linked_type = ''Milestone''.';

-- Evidence lookups are always "attachments for this milestone".
CREATE INDEX IF NOT EXISTS idx_capex_attachments_linked
  ON capex_attachments (request_id, linked_type, linked_id);
