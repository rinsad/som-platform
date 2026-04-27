-- ============================================================
-- SOM Platform: Semantic vector embeddings for KB chunks
-- Migration 005
-- ============================================================

-- Store embeddings as a JSON float array (pgvector not available)
ALTER TABLE kb_chunks
  ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Track whether a doc has been fully embedded (for admin UI)
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;
