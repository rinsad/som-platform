const express = require('express');
const router = express.Router();
const capexController = require('../controllers/capexController');
const verifyToken = require('../middleware/auth');

router.get('/summary',         verifyToken, capexController.getSummary);
router.get('/departments',     verifyToken, capexController.getDepartmentsList);
router.get('/sync-status',     verifyToken, capexController.getSyncStatus);
router.get('/department/:name', verifyToken, capexController.getDepartment);
router.get('/gsap-data',       verifyToken, capexController.getGsapData);
router.get('/initiations',     verifyToken, capexController.getInitiations);
router.post('/initiations',    verifyToken, capexController.createInitiation);
router.get('/manual-entries',  verifyToken, capexController.getManualEntries);
router.post('/manual-entries', verifyToken, capexController.createManualEntry);

router.get('/budget-uploads',  verifyToken, capexController.getBudgetUploads);
router.post('/budget-upload',  verifyToken, capexController.csvUploadMiddleware, capexController.uploadBudget);

module.exports = router;
