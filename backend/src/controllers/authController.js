const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../database/db');
const { scopeTierForRole } = require('../config/capexDataScopes');

// The user's Business / Function and data-scope tier, for display and for
// shaping the UI. Returned in the response body only — never signed into the
// token, so an administrator's change takes effect on the next call instead of
// at token expiry.
async function scopeProfile(userId, role) {
  const scope_tier = scopeTierForRole(role);
  if (!userId) return { business_function_id: null, business_function_name: null, scope_tier };

  try {
    const { rows: [business] } = await pool.query(
      `SELECT o.id, o.name
         FROM capex_v2.user_scope_assignments a
         JOIN capex_v2.organization_units o ON o.id = a.organization_unit_id
        WHERE a.user_id = $1
          AND a.is_active = TRUE
          AND a.effective_from <= CURRENT_DATE
          AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
        ORDER BY CASE a.scope_type WHEN 'BUSINESS_UNIT' THEN 0 ELSE 1 END, a.created_at DESC
        LIMIT 1`,
      [userId]
    );
    return {
      business_function_id: business?.id || null,
      business_function_name: business?.name || null,
      scope_tier,
    };
  } catch (err) {
    // Display metadata must never be able to fail a login.
    return { business_function_id: null, business_function_name: null, scope_tier };
  }
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { rows } = await pool.query(
      `SELECT id, employee_id, full_name, email, password_hash, role, department, is_active
       FROM som_users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id:          user.id,
      employee_id: user.employee_id,
      full_name:   user.full_name,
      email:       user.email,
      role:        user.role,
      department:  user.department,
    };

    const { rows: permissions } = await pool.query(
      `SELECT level, resource_key, can_view, can_create, can_edit, can_delete
       FROM som_permissions WHERE user_id = $1`,
      [user.id]
    );

    // The signed payload stays exactly as it was; the scope profile rides along
    // in the response body only.
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    const profile = await scopeProfile(user.id, user.role);
    res.json({ token, user: { ...payload, ...profile }, permissions });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

exports.me = async (req, res, next) => {
  try {
    const { rows: [user] } = await pool.query(
      `SELECT id, employee_id, full_name, email, role, department
       FROM som_users WHERE id = $1 AND is_active = true`,
      [req.user.id]
    );
    if (!user) return res.status(401).json({ error: 'User not found or inactive' });

    const { rows: permissions } = await pool.query(
      `SELECT level, resource_key, can_view, can_create, can_edit, can_delete
       FROM som_permissions WHERE user_id = $1`,
      [user.id]
    );

    const profile = await scopeProfile(user.id, user.role);
    res.json({ user: { ...user, ...profile }, permissions });
  } catch (err) { next(err); }
};
