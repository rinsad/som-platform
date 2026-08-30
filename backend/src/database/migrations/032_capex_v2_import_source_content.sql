ALTER TABLE capex_v2.budget_import_batches
  ADD COLUMN IF NOT EXISTS original_content BYTEA;

