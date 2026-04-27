const express = require('express');
const router = express.Router();
const assetsController = require('../controllers/assetsController');
const verifyToken = require('../middleware/auth');

// NOTE: specific routes must come before /:assetCode to avoid shadowing
router.get('/alerts',                    verifyToken, assetsController.getAlerts);
router.get('/utility-bills/:siteId',     verifyToken, assetsController.getBillsBySite);
router.post('/utility-bills',            verifyToken, assetsController.createBill);
router.get('/work-orders',               verifyToken, assetsController.getWorkOrders);
router.post('/work-orders',              verifyToken, assetsController.createWorkOrder);
router.get('/',                          verifyToken, assetsController.getAll);
router.post('/',                         verifyToken, assetsController.createAsset);
router.get('/:assetCode',                verifyToken, assetsController.getByCode);

module.exports = router;
