const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../database/db');

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

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: payload, permissions });
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

    res.json({ user, permissions });
  } catch (err) { next(err); }
};
