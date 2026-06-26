const express = require('express');
const router = express.Router();
const capexController = require('../controllers/capexController');
const verifyToken = require('../middleware/auth');

router.get('/summary',         verifyToken, capexController.getSummary);
router.get('/departments',     verifyToken, capexController.getDepartmentsList);
router.get('/sync-status',     verifyToken, capexController.getSyncStatus);
router.get('/department/:name', verifyToken, capexController.getDepartment);
router.get('/gsap-data',       verifyToken, capexController.getGsapData);
router.get('/admin-config',    verifyToken, capexController.getAdminConfig);
router.patch('/admin-config/thresholds', verifyToken, capexController.updateThresholds);
router.patch('/admin-config/workflow-rules/:ruleId', verifyToken, capexController.updateWorkflowRule);
router.get('/requests',        verifyToken, capexController.getRequests);
router.post('/requests',       verifyToken, capexController.createRequest);
router.get('/requests/report', verifyToken, capexController.getReport);
router.get('/requests/:id',    verifyToken, capexController.getRequestById);
router.post('/requests/:id/attachments', verifyToken, capexController.attachmentUploadMiddleware, capexController.uploadAttachment);
router.get('/requests/:id/attachments/:attachmentId/download', verifyToken, capexController.downloadAttachment);
router.patch('/requests/:id/decision', verifyToken, capexController.decideRequest);
router.patch('/requests/:id/procurement', verifyToken, capexController.updateProcurement);
router.post('/requests/:id/milestones', verifyToken, capexController.createMilestone);
router.patch('/requests/:id/milestones/:milestoneId', verifyToken, capexController.updateMilestone);
router.patch('/requests/:id/financial-closure', verifyToken, capexController.saveFinancialClosure);
router.get('/requests/:id/audit', verifyToken, capexController.getAuditLogs);
router.get('/initiations',     verifyToken, capexController.getInitiations);
router.post('/initiations',    verifyToken, capexController.createInitiation);
router.get('/manual-entries',  verifyToken, capexController.getManualEntries);
router.post('/manual-entries', verifyToken, capexController.createManualEntry);

router.get('/budget-uploads',  verifyToken, capexController.getBudgetUploads);
router.post('/budget-upload',  verifyToken, capexController.csvUploadMiddleware, capexController.uploadBudget);

module.exports = router;
