const bcrypt = require('bcryptjs');
const pool = require('../database/db');

// ── List all users (no password hashes) ─────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, employee_id, full_name, email, role, department, is_active, created_at
       FROM som_users
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ── Get single user with their permissions ───────────────────────────────────
exports.getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `SELECT id, employee_id, full_name, email, role, department, is_active, created_at
       FROM som_users WHERE id = $1`,
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permsResult = await pool.query(
      `SELECT id, level, resource_key, can_view, can_create, can_edit, can_delete
       FROM som_permissions WHERE user_id = $1
       ORDER BY level, resource_key`,
      [id]
    );

    res.json({ ...userResult.rows[0], permissions: permsResult.rows });
  } catch (err) {
    next(err);
  }
};

// ── Create user ──────────────────────────────────────────────────────────────
exports.createUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { employee_id, full_name, email, password, role, department, permissions = [] } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'full_name, email, password and role are required' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    await client.query('BEGIN');

    const { rows: [user] } = await client.query(
      `INSERT INTO som_users (employee_id, full_name, email, password_hash, role, department, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, employee_id, full_name, email, role, department, is_active, created_at`,
      [employee_id || null, full_name, email, password_hash, role, department || null, req.user.id]
    );

    if (permissions.length > 0) {
      await _upsertPermissions(client, user.id, permissions);
    }

    await client.query('COMMIT');
    res.status(201).json(user);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that email or employee ID already exists' });
    }
    next(err);
  } finally {
    client.release();
  }
};

// ── Update user (profile + permissions) ─────────────────────────────────────
exports.updateUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { employee_id, full_name, email, password, role, department, is_active, permissions } = req.body;

    await client.query('BEGIN');

    // Build partial update
    const fields = [];
    const vals = [];
    let idx = 1;

    if (employee_id !== undefined) { fields.push(`employee_id=$${idx++}`); vals.push(employee_id); }
    if (full_name    !== undefined) { fields.push(`full_name=$${idx++}`);    vals.push(full_name); }
    if (email        !== undefined) { fields.push(`email=$${idx++}`);        vals.push(email); }
    if (role         !== undefined) { fields.push(`role=$${idx++}`);         vals.push(role); }
    if (department   !== undefined) { fields.push(`department=$${idx++}`);   vals.push(department); }
    if (is_active    !== undefined) { fields.push(`is_active=$${idx++}`);    vals.push(is_active); }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      fields.push(`password_hash=$${idx++}`);
      vals.push(hash);
    }

    if (fields.length > 0) {
      vals.push(id);
      const { rows } = await client.query(
        `UPDATE som_users SET ${fields.join(', ')} WHERE id=$${idx} RETURNING id`,
        vals
      );
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Replace all permissions if provided
    if (Array.isArray(permissions)) {
      await client.query('DELETE FROM som_permissions WHERE user_id=$1', [id]);
      if (permissions.length > 0) {
        await _upsertPermissions(client, id, permissions);
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'User updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email or employee ID already in use' });
    }
    next(err);
  } finally {
    client.release();
  }
};

// ── Deactivate / delete user ─────────────────────────────────────────────────
exports.deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE som_users SET is_active = false WHERE id=$1 RETURNING id`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const { rows } = await pool.query(
      `DELETE FROM som_users WHERE id=$1 RETURNING id`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Helper: bulk upsert permissions ─────────────────────────────────────────
async function _upsertPermissions(client, userId, permissions) {
  for (const p of permissions) {
    await client.query(
      `INSERT INTO som_permissions (user_id, level, resource_key, can_view, can_create, can_edit, can_delete)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, resource_key)
       DO UPDATE SET
         can_view=$4, can_create=$5, can_edit=$6, can_delete=$7`,
      [
        userId,
        p.level,
        p.resource_key,
        p.can_view   ?? false,
        p.can_create ?? false,
        p.can_edit   ?? false,
        p.can_delete ?? false,
      ]
    );
  }
}
