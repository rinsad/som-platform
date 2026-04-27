-- ============================================================
-- SOM Platform: Knowledge Base Full-Text Search
-- Migration 003
-- ============================================================

-- Trigram extension for fuzzy/substring search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add metadata + content columns to knowledge_base
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS source_type       VARCHAR(10)  NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_size         INTEGER,
  ADD COLUMN IF NOT EXISTS uploaded_by       TEXT,
  ADD COLUMN IF NOT EXISTS extracted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_text      TEXT;

-- Chunked text table — each row is a ~500-word segment of a document
-- tsv is auto-maintained by PostgreSQL from the content column
CREATE TABLE IF NOT EXISTS kb_chunks (
  id          SERIAL PRIMARY KEY,
  doc_id      VARCHAR(10) NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  tsv         TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc ON kb_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_tsv ON kb_chunks USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_kb_title_trgm ON knowledge_base USING GIN(title gin_trgm_ops);

-- Bootstrap: seed one chunk per existing KB document from title + description + tags
INSERT INTO kb_chunks (doc_id, chunk_index, content)
SELECT
  id,
  0,
  title || '. ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' ')
FROM knowledge_base
WHERE NOT EXISTS (
  SELECT 1 FROM kb_chunks c WHERE c.doc_id = knowledge_base.id AND c.chunk_index = 0
);
