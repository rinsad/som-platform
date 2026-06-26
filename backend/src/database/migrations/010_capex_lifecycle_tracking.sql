-- ============================================================
-- SOM Platform: CAPEX lifecycle tracking additions
-- Migration 010
-- ============================================================

ALTER TABLE capex_procurement_tracking
  ADD COLUMN IF NOT EXISTS nda_completion_date DATE,
  ADD COLUMN IF NOT EXISTS dpa_completion_date DATE;

CREATE TABLE IF NOT EXISTS capex_audit_logs (
  id          SERIAL PRIMARY KEY,
  request_id  VARCHAR(30) NOT NULL REFERENCES capex_requests(id) ON DELETE CASCADE,
  event_type  VARCHAR(60) NOT NULL,
  message     TEXT NOT NULL,
  actor       VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capex_audit_logs_request ON capex_audit_logs(request_id, created_at);
