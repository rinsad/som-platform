const pool = require('../database/db');
const ALLOWED_ACTIONS = new Set(['can_view', 'can_create', 'can_edit', 'can_delete']);

function parentKeys(resourceKey) {
  const parts = resourceKey.split('.');
  const keys = [];
  for (let i = parts.length; i >= 1; i -= 1) {
    keys.push(parts.slice(0, i).join('.'));
  }
  return keys;
}

function requirePermission(resourceKey, action = 'can_view') {
  if (!ALLOWED_ACTIONS.has(action)) {
    throw new Error(`Unsupported permission action: ${action}`);
  }

  return async (req, res, next) => {
    if (req.user?.role === 'Admin') return next();

    try {
      const keys = parentKeys(resourceKey);
      const { rows } = await pool.query(
        `SELECT ${action}
         FROM som_permissions
         WHERE user_id = $1 AND resource_key = ANY($2::text[])`,
        [req.user.id, keys]
      );

      if (rows.some((row) => row[action])) return next();
      return res.status(403).json({ error: `Forbidden: ${resourceKey} ${action} permission required` });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requirePermission;
