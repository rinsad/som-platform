const pool     = require('../database/db');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const fs       = require('fs');
const path     = require('path');

// Public kb-files folder (served by Vite / frontend static)
const KB_FILES_DIR = path.join(__dirname, '../../../frontend/public/kb-files');
const { OpenAI } = require('openai');

// ── Multer: in-memory storage, 20 MB limit ────────────────────────────────────
const _upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
exports.uploadMiddleware = _upload.single('file');

// ── OpenAI client (lazy — only instantiated when API key present) ─────────────
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Embed an array of strings; returns array of float arrays, or null if no key
async function embedTexts(texts) {
  const ai = getOpenAI();
  if (!ai || !texts.length) return null;
  try {
    const response = await ai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map(d => d.embedding);
  } catch (err) {
    console.error('[KB embed error]', err.message);
    return null;
  }
}

// Cosine similarity between two float arrays
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ── Text extraction helpers ───────────────────────────────────────────────────
async function extractText(buffer, mimetype, originalname) {
  const lower = (originalname || '').toLowerCase();

  if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  // EML / plain text / fallback — treat as UTF-8 text
  return buffer.toString('utf8');
}

// Splits text into overlapping ~500-word chunks
function chunkText(text, size = 500, overlap = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [text || '(empty)'];
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
    i += size - overlap;
  }
  return chunks;
}

// ── GET /api/portal/knowledge/admin  (Admin only) ────────────────────────────
exports.adminList = async (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { rows } = await pool.query(
      `SELECT
         k.id, k.title, k.category, k.version,
         k.last_updated      AS "lastUpdated",
         k.source_type       AS "sourceType",
         k.original_filename AS "originalFilename",
         k.file_size         AS "fileSize",
         k.uploaded_by       AS "uploadedBy",
         k.extracted_at      AS "extractedAt",
         k.embedded_at       AS "embeddedAt",
         COUNT(c.id)::int    AS "chunkCount",
         COUNT(c.embedding)::int AS "embeddedChunks"
       FROM knowledge_base k
       LEFT JOIN kb_chunks c ON c.doc_id = k.id
       GROUP BY k.id
       ORDER BY k.last_updated DESC NULLS LAST, k.id DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// ── DELETE /api/portal/knowledge/:id  (Admin only) ───────────────────────────
exports.deleteDoc = async (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM knowledge_base WHERE id = $1', [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ deleted: req.params.id });
  } catch (err) { next(err); }
};

// ── POST /api/portal/knowledge/:id/embed  (Admin only) ───────────────────────
// Re-embed all chunks for a single document
exports.embedDoc = async (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  if (!getOpenAI()) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });

  try {
    const { rows: chunks } = await pool.query(
      'SELECT id, content FROM kb_chunks WHERE doc_id = $1 ORDER BY chunk_index',
      [req.params.id]
    );
    if (chunks.length === 0) return res.status(404).json({ error: 'Document not found or has no chunks' });

    const embeddings = await embedTexts(chunks.map(c => c.content));
    if (!embeddings) return res.status(502).json({ error: 'Embedding API call failed' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < chunks.length; i++) {
        await client.query(
          'UPDATE kb_chunks SET embedding = $1 WHERE id = $2',
          [JSON.stringify(embeddings[i]), chunks[i].id]
        );
      }
      await client.query(
        'UPDATE knowledge_base SET embedded_at = NOW() WHERE id = $1',
        [req.params.id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ id: req.params.id, chunksEmbedded: chunks.length });
  } catch (err) { next(err); }
};

// ── GET /api/portal/knowledge/search?q=...&category=... ──────────────────────
// Uses semantic (vector) search when embeddings exist; falls back to FTS
exports.search = async (req, res, next) => {
  const { q, category } = req.query;
  if (!q || !q.trim()) return res.json([]);

  const catFilter = category && category !== 'All' ? category : '';

  try {
    // ── Try semantic search first ────────────────────────────────────────────
    const queryEmbedding = await embedTexts([q.trim()]);

    if (queryEmbedding) {
      // Load all embedded chunks (with doc metadata) matching optional category
      const { rows } = await pool.query(
        `SELECT
           c.id AS chunk_id, c.doc_id, c.content, c.embedding,
           k.id, k.title, k.category, k.version,
           k.last_updated      AS "lastUpdated",
           k.source_type       AS "sourceType",
           k.original_filename AS "originalFilename"
         FROM kb_chunks c
         JOIN knowledge_base k ON k.id = c.doc_id
         WHERE c.embedding IS NOT NULL
           AND ($1::text = '' OR k.category = $1)`,
        [catFilter]
      );

      if (rows.length > 0) {
        const qVec = queryEmbedding[0];

        // Score every chunk, keep best per document
        const byDoc = {};
        for (const row of rows) {
          const vec   = row.embedding;  // already parsed by pg as JS array via JSONB
          const score = cosine(qVec, Array.isArray(vec) ? vec : JSON.parse(vec));
          if (!byDoc[row.doc_id] || byDoc[row.doc_id].score < score) {
            byDoc[row.doc_id] = { ...row, score };
          }
        }

        const results = Object.values(byDoc)
          .filter(r => r.score > 0.25)           // relevance threshold
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
          .map(r => ({
            id:               r.id,
            title:            r.title,
            category:         r.category,
            version:          r.version,
            lastUpdated:      r.lastUpdated,
            sourceType:       r.sourceType,
            originalFilename: r.originalFilename,
            score:            Math.round(r.score * 100),
            snippet:          buildSnippet(r.content, q.trim()),
            searchMode:       'semantic',
          }));

        return res.json(results);
      }
    }

    // ── Fallback: PostgreSQL full-text search ────────────────────────────────
    const { rows } = await pool.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (k.id)
          k.id,
          k.title,
          k.category,
          k.version,
          k.last_updated       AS "lastUpdated",
          k.source_type        AS "sourceType",
          k.original_filename  AS "originalFilename",
          ts_rank(c.tsv, plainto_tsquery('english', $1)) AS rank,
          ts_headline(
            'english', c.content,
            plainto_tsquery('english', $1),
            'MaxFragments=2,FragmentDelimiter= … ,StartSel=<mark>,StopSel=</mark>'
          ) AS snippet
        FROM kb_chunks c
        JOIN knowledge_base k ON k.id = c.doc_id
        WHERE c.tsv @@ plainto_tsquery('english', $1)
          AND ($2::text = '' OR k.category = $2)
        ORDER BY k.id, ts_rank(c.tsv, plainto_tsquery('english', $1)) DESC
      ) sub
      ORDER BY rank DESC
      LIMIT 20`,
      [q.trim(), catFilter]
    );
    res.json(rows.map(r => ({ ...r, searchMode: 'fts' })));
  } catch (err) { next(err); }
};

// Build a readable snippet by finding the query terms in the chunk content
function buildSnippet(content, query) {
  const words   = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower   = content.toLowerCase();
  let best = 0;
  for (const w of words) {
    const idx = lower.indexOf(w);
    if (idx !== -1) { best = Math.max(0, idx - 80); break; }
  }
  const slice = content.slice(best, best + 300);
  // Wrap matched words in <mark>
  let highlighted = slice;
  for (const w of words) {
    if (w.length < 3) continue;
    highlighted = highlighted.replace(
      new RegExp(`(${w})`, 'gi'),
      '<mark>$1</mark>'
    );
  }
  return (best > 0 ? '…' : '') + highlighted + (best + 300 < content.length ? '…' : '');
}

// ── POST /api/portal/knowledge/upload  (multipart/form-data) ─────────────────
exports.uploadDoc = async (req, res, next) => {
  try {
    const { title, category = 'Procedure' } = req.body;
    if (!title)    return res.status(400).json({ error: 'title is required' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const { buffer, mimetype, originalname } = req.file;

    const text   = await extractText(buffer, mimetype, originalname);
    const chunks = chunkText(text);

    // Detect source type from filename / mimetype
    const lower      = originalname.toLowerCase();
    const sourceType =
      mimetype === 'application/pdf' || lower.endsWith('.pdf') ? 'pdf' :
      lower.endsWith('.docx')                                  ? 'docx' :
      lower.endsWith('.eml')                                   ? 'eml'  : 'txt';

    // Generate next KB-NNN id
    const { rows: [maxRow] } = await pool.query(
      `SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)) AS max
       FROM knowledge_base WHERE id ~ '^KB-[0-9]+$'`
    );
    const nextNum = (maxRow.max || 0) + 1;
    const newId   = `KB-${String(nextNum).padStart(3, '0')}`;

    const uploader = req.user?.name || req.user?.email || 'Unknown';

    // Generate embeddings for all chunks (if OpenAI key is set)
    const embeddings = await embedTexts(chunks);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO knowledge_base
           (id, title, category, version, last_updated, source_type,
            original_filename, file_size, uploaded_by, extracted_at, content_text,
            embedded_at, file_data, file_mimetype)
         VALUES ($1,$2,$3,'1.0',CURRENT_DATE,$4,$5,$6,$7,NOW(),$8,$9,$10,$11)`,
        [newId, title, category, sourceType,
         originalname, buffer.length, uploader,
         text.slice(0, 50000),
         embeddings ? new Date() : null,
         buffer, mimetype]
      );

      for (let i = 0; i < chunks.length; i++) {
        await client.query(
          `INSERT INTO kb_chunks (doc_id, chunk_index, content, embedding)
           VALUES ($1,$2,$3,$4)`,
          [newId, i, chunks[i],
           embeddings ? JSON.stringify(embeddings[i]) : null]
        );
      }

      await client.query('COMMIT');

      // Save file to frontend/public/kb-files so the static "View" link works
      fs.mkdirSync(KB_FILES_DIR, { recursive: true });
      fs.writeFileSync(path.join(KB_FILES_DIR, `${newId}.${sourceType}`), buffer);

      res.status(201).json({
        id: newId, title, sourceType,
        chunks: chunks.length,
        embedded: !!embeddings,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
};

// ── GET /api/portal/knowledge/:id/file ───────────────────────────────────────
// Serves the original uploaded file (PDF, DOCX, etc.)
exports.serveFile = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT file_data, file_mimetype, original_filename FROM knowledge_base WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length || !rows[0].file_data) {
      return res.status(404).json({ error: 'File not found' });
    }
    const { file_data, file_mimetype, original_filename } = rows[0];
    res.setHeader('Content-Type', file_mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${original_filename}"`);
    res.send(file_data);
  } catch (err) { next(err); }
};
