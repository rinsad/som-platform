const bcrypt = require('bcryptjs');
const pool = require('../database/db');
const { getRolePermissionPreset } = require('../config/capexRolePermissions');
const { BUSINESS_FUNCTION_ANCHOR_ROLE, syncUserScopeAssignments } = require('../services/userScopeSync');
const { roleScopeCatalog } = require('../config/capexDataScopes');

const USER_PROFILE_SELECT = `
  SELECT u.id, u.employee_id, u.full_name, u.email, u.role, u.department,
         u.is_active, u.created_at,
         business_function.organization_unit_id AS business_function_id,
         business_function.name AS business_function_name
    FROM som_users u
    LEFT JOIN LATERAL (
      SELECT a.organization_unit_id, o.name
        FROM capex_v2.user_scope_assignments a
        JOIN capex_v2.organization_units o ON o.id = a.organization_unit_id
       WHERE a.user_id = u.id
         AND a.role_name = '${BUSINESS_FUNCTION_ANCHOR_ROLE}'
         AND a.scope_type = 'OWN'
         AND a.is_active = TRUE
         AND a.effective_from <= CURRENT_DATE
         AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
       ORDER BY a.created_at DESC
       LIMIT 1
    ) business_function ON TRUE`;

// Reads the user's current Business / Function so a role change can re-derive
// the scope row without the caller having to resend the business.
async function currentBusinessFunctionId(client, userId) {
  const { rows: [anchor] } = await client.query(
    `SELECT organization_unit_id
       FROM capex_v2.user_scope_assignments
      WHERE user_id = $1
        AND role_name = $2
        AND scope_type = 'OWN'
        AND is_active = TRUE
        AND effective_from <= CURRENT_DATE
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, BUSINESS_FUNCTION_ANCHOR_ROLE]
  );
  return anchor?.organization_unit_id || null;
}

// ── List all users (no password hashes) ─────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${USER_PROFILE_SELECT}
       ORDER BY u.created_at DESC`
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
      `${USER_PROFILE_SELECT}
       WHERE u.id = $1`,
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
    const { employee_id, full_name, email, password, role, department, business_function_id, permissions = [] } = req.body;

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

    const permissionsToApply = permissions.length > 0 ? permissions : getRolePermissionPreset(role);
    if (permissionsToApply.length > 0) {
      await _upsertPermissions(client, user.id, permissionsToApply);
    }
    await syncUserScopeAssignments(client, {
      userId: user.id,
      role,
      organizationUnitId: business_function_id || null,
      actorId: req.user.id,
    });

    await client.query('COMMIT');
    res.status(201).json({ ...user, business_function_id: business_function_id || null });
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
    const { employee_id, full_name, email, password, role, department, business_function_id, is_active, permissions } = req.body;

    await client.query('BEGIN');

    const { rows: [existingUser] } = await client.query(
      `SELECT role FROM som_users WHERE id = $1`,
      [id]
    );
    if (!existingUser) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

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
    } else if (role !== undefined && role !== existingUser.role) {
      const rolePreset = getRolePermissionPreset(role);
      if (rolePreset.length > 0) {
        await client.query('DELETE FROM som_permissions WHERE user_id=$1', [id]);
        await _upsertPermissions(client, id, rolePreset);
      }
    }

    // Re-derive scope rows whenever the business OR the role changes — the
    // derived row is keyed on both, so a role change with no business in the
    // payload would otherwise leave a stale assignment behind.
    const roleChanged = role !== undefined && role !== existingUser.role;
    if (business_function_id !== undefined || roleChanged) {
      const organizationUnitId = business_function_id !== undefined
        ? (business_function_id || null)
        : await currentBusinessFunctionId(client, id);
      await syncUserScopeAssignments(client, {
        userId: id,
        role: role !== undefined ? role : existingUser.role,
        organizationUnitId,
        actorId: req.user.id,
      });
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

// Which roles are company-wide and which need a Business / Function. Served so
// the admin user form validates against the same map the backend enforces.
exports.listRoleScopes = (req, res) => {
  res.json(roleScopeCatalog());
};

exports.listBusinessFunctions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name
         FROM capex_v2.organization_units
        WHERE is_active = TRUE
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ── Deactivate / reactivate / delete user ────────────────────────────────────
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

exports.reactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE som_users SET is_active = true WHERE id=$1 RETURNING id`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User reactivated' });
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
    // Postgres foreign-key violation: the user is still referenced by records
    // they created (purchase requests, CAPEX requests, budget entries, …).
    // Deleting would orphan auditable history, so block it and steer the admin
    // to deactivation instead.
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'This user has created records (e.g. purchase or CAPEX requests) and cannot be deleted. Deactivate the user instead to revoke access while preserving history.',
      });
    }
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
