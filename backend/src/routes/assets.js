const express = require('express');
const router = express.Router();
const assetsController = require('../controllers/assetsController');
const verifyToken = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

// NOTE: specific routes must come before /:assetCode to avoid shadowing
router.get('/alerts',                    verifyToken, requirePermission('assets'), assetsController.getAlerts);
router.get('/utility-bills/:siteId',     verifyToken, requirePermission('assets'), assetsController.getBillsBySite);
router.post('/utility-bills',            verifyToken, requirePermission('assets', 'can_create'), assetsController.createBill);
router.get('/work-orders',               verifyToken, requirePermission('assets'), assetsController.getWorkOrders);
router.post('/work-orders',              verifyToken, requirePermission('assets', 'can_create'), assetsController.createWorkOrder);
router.get('/',                          verifyToken, requirePermission('assets'), assetsController.getAll);
router.post('/',                         verifyToken, requirePermission('assets', 'can_create'), assetsController.createAsset);
router.get('/:assetCode',                verifyToken, requirePermission('assets'), assetsController.getByCode);

module.exports = router;
