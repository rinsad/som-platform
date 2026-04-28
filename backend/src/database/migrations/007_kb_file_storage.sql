-- Migration 007: Store original file binary in knowledge_base
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS file_data     BYTEA,
  ADD COLUMN IF NOT EXISTS file_mimetype VARCHAR(100);
