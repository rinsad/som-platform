-- ============================================================
-- SOM Platform: Capex Budget Upload
-- Migration 004
-- ============================================================

CREATE TABLE IF NOT EXISTS capex_budget_uploads (
  id            SERIAL PRIMARY KEY,
  fiscal_year   INTEGER NOT NULL,
  filename      VARCHAR(255),
  rows_imported INTEGER NOT NULL DEFAULT 0,
  uploaded_by   TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
