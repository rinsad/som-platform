/**
 * Middleware: restrict route to Admin role only.
 * Must be used AFTER verifyToken.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

module.exports = requireAdmin;
