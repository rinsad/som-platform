const express = require('express');
const router = express.Router();
const prController = require('../controllers/purchaseRequestsController');
const verifyToken = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

router.get('/',                    verifyToken, requirePermission('purchase-requests'), prController.getAll);
router.post('/',                   verifyToken, requirePermission('purchase-requests', 'can_create'), prController.create);
router.get('/:id',                 verifyToken, requirePermission('purchase-requests'), prController.getById);
router.patch('/:id',               verifyToken, requirePermission('purchase-requests', 'can_edit'), prController.updateDraft);
router.patch('/:id/resubmit',      verifyToken, requirePermission('purchase-requests', 'can_edit'), prController.resubmit);
router.patch('/:id/approve',       verifyToken, requirePermission('purchase-requests', 'can_edit'), prController.approve);
router.get('/:id/documents',       verifyToken, requirePermission('purchase-requests'), prController.getDocuments);
router.post('/:id/documents',      verifyToken, requirePermission('purchase-requests', 'can_create'), prController.documentUploadMiddleware, prController.uploadDocument);
router.get('/:id/documents/:docId/download', verifyToken, requirePermission('purchase-requests'), prController.downloadDocument);
router.get('/:id/workflow',        verifyToken, requirePermission('purchase-requests'), prController.getWorkflowForPR);

module.exports = router;
