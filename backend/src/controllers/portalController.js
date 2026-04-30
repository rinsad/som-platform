const pool = require('../database/db');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

// ── GET /api/portal/apps ──────────────────────────────────────────────────────
exports.getApps = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, icon, category, url, sso_enabled, allowed_roles
       FROM portal_apps
       ORDER BY sort_order`
    );
    res.json(rows.map(r => ({
      id:          r.id,
      name:        r.name,
      description: r.description,
      icon:        r.icon,
      category:    r.category,
      url:         r.url,
      ssoEnabled:  r.sso_enabled,
      allowedRoles: r.allowed_roles,
    })));
  } catch (err) { next(err); }
};

// ── GET /api/portal/knowledge ─────────────────────────────────────────────────
exports.getKnowledge = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    let q = `SELECT id, title, category, version, last_updated, description, tags,
                    source_type, original_filename,
                    (file_data IS NOT NULL) AS has_stored_file
             FROM knowledge_base WHERE 1=1`;
    const vals = [];

    if (category) {
      vals.push(category.toLowerCase());
      q += ` AND LOWER(category) = $${vals.length}`;
    }
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      vals.push(like);
      q += ` AND (LOWER(title) LIKE $${vals.length} OR LOWER(description) LIKE $${vals.length} OR EXISTS (
               SELECT 1 FROM unnest(tags) t WHERE LOWER(t) LIKE $${vals.length}
             ))`;
    }
    q += ` ORDER BY last_updated DESC`;

    const { rows } = await pool.query(q, vals);
    res.json(rows.map(r => ({
      id:               r.id,
      title:            r.title,
      category:         r.category,
      version:          r.version,
      lastUpdated:      r.last_updated,
      description:      r.description,
      tags:             r.tags,
      sourceType:       r.source_type,
      originalFilename: r.original_filename,
      hasStoredFile:    r.has_stored_file,
    })));
  } catch (err) { next(err); }
};

// ── GET /api/portal/knowledge/:id/versions ────────────────────────────────────
exports.getDocVersions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT version, updated_at, updated_by, changelog
       FROM kb_versions WHERE doc_id = $1 ORDER BY updated_at DESC`,
      [req.params.id]
    );
    res.json(rows.map(r => ({
      version:   r.version,
      updatedAt: r.updated_at,
      updatedBy: r.updated_by,
      changelog: r.changelog,
    })));
  } catch (err) { next(err); }
};

// ── GET /api/portal/favourites ────────────────────────────────────────────────
exports.getFavourites = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT app_id FROM user_favourites WHERE user_id = $1`, [String(req.user.id)]
    );
    res.json(rows.map(r => r.app_id));
  } catch (err) { next(err); }
};

// ── POST /api/portal/favourites  body: { appId } ─────────────────────────────
exports.toggleFavourite = async (req, res, next) => {
  try {
    const { appId } = req.body;
    if (!appId) return res.status(400).json({ error: 'appId is required' });
    const userId = String(req.user.id);
    const { rows: [existing] } = await pool.query(
      `SELECT 1 FROM user_favourites WHERE user_id = $1 AND app_id = $2`,
      [userId, appId]
    );

    if (existing) {
      await pool.query(
        `DELETE FROM user_favourites WHERE user_id = $1 AND app_id = $2`,
        [userId, appId]
      );
    } else {
      await pool.query(
        `INSERT INTO user_favourites (user_id, app_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [userId, appId]
      );
    }

    const { rows } = await pool.query(
      `SELECT app_id FROM user_favourites WHERE user_id = $1`, [userId]
    );
    const favourites = rows.map(r => r.app_id);
    res.json({ appId, favourited: !existing, favourites });
  } catch (err) { next(err); }
};

// ── GET /api/portal/pinned-docs ───────────────────────────────────────────────
exports.getPinnedDocs = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT doc_id FROM user_pinned_docs WHERE user_id = $1`, [String(req.user.id)]
    );
    res.json(rows.map(r => r.doc_id));
  } catch (err) { next(err); }
};

// ── POST /api/portal/pinned-docs  body: { docId } ────────────────────────────
exports.togglePinnedDoc = async (req, res, next) => {
  try {
    const { docId } = req.body;
    if (!docId) return res.status(400).json({ error: 'docId is required' });
    const userId = String(req.user.id);
    const { rows: [existing] } = await pool.query(
      `SELECT 1 FROM user_pinned_docs WHERE user_id = $1 AND doc_id = $2`,
      [userId, docId]
    );

    if (existing) {
      await pool.query(
        `DELETE FROM user_pinned_docs WHERE user_id = $1 AND doc_id = $2`,
        [userId, docId]
      );
    } else {
      await pool.query(
        `INSERT INTO user_pinned_docs (user_id, doc_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [userId, docId]
      );
    }

    const { rows } = await pool.query(
      `SELECT doc_id FROM user_pinned_docs WHERE user_id = $1`, [userId]
    );
    const pinnedDocs = rows.map(r => r.doc_id);
    res.json({ docId, pinned: !existing, pinnedDocs });
  } catch (err) { next(err); }
};
