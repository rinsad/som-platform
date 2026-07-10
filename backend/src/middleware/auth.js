const jwt = require('jsonwebtoken');
const pool = require('../database/db');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Verify the JWT and, for real (UUID-keyed) users, re-check that the account is
// still active on every request. This closes the window where a deactivated or
// demoted user keeps access until their 8h token expires: role/permission
// changes now take effect on the next call.
//
// Tokens whose `id` is not a UUID (synthetic/service tokens used in tests and
// tooling) and tokens for accounts with no matching row are allowed through —
// the permission layer still gates what they can reach. Only an explicit
// is_active = false blocks the request here.
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  if (typeof decoded.id === 'string' && UUID_RE.test(decoded.id)) {
    try {
      const { rows: [account] } = await pool.query(
        `SELECT is_active, role FROM som_users WHERE id = $1`,
        [decoded.id]
      );
      if (account && account.is_active === false) {
        return res.status(401).json({ error: 'Unauthorized: Account is inactive' });
      }
      // Trust the live role over the (possibly stale) token claim.
      if (account && account.role) decoded.role = account.role;
    } catch (err) {
      // Availability over strictness: if the lookup fails, fall back to the
      // verified token rather than locking every user out on a DB hiccup.
    }
  }

  req.user = decoded;
  next();
};

module.exports = verifyToken;
