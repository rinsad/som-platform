const express = require('express');
const router = express.Router();
const prController = require('../controllers/purchaseRequestsController');
const verifyToken = require('../middleware/auth');

router.get('/',                    verifyToken, prController.getAll);
router.post('/',                   verifyToken, prController.create);
router.get('/:id',                 verifyToken, prController.getById);
router.patch('/:id/approve',       verifyToken, prController.approve);
router.get('/:id/documents',       verifyToken, prController.getDocuments);
router.post('/:id/documents',      verifyToken, prController.uploadDocument);
router.get('/:id/workflow',        verifyToken, prController.getWorkflowForPR);

module.exports = router;
