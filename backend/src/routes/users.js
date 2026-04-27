const express = require('express');
const router = express.Router();
const verifyToken   = require('../middleware/auth');
const requireAdmin  = require('../middleware/requireAdmin');
const ctrl          = require('../controllers/usersController');

// All user management routes require a valid JWT + Admin role
router.use(verifyToken, requireAdmin);

router.get('/',          ctrl.listUsers);
router.get('/:id',       ctrl.getUser);
router.post('/',         ctrl.createUser);
router.put('/:id',       ctrl.updateUser);
router.patch('/:id/deactivate', ctrl.deactivateUser);
router.delete('/:id',    ctrl.deleteUser);

module.exports = router;
