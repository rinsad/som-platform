const express = require('express');
const multer = require('multer');
const verifyToken = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const controller = require('../modules/capexV2/controller');

const router = express.Router();
const jsonOrCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');
    callback(allowed ? null : new Error('Budget imports must be CSV files'), allowed);
  },
});
const evidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.CAPEX_V2_MAX_DOCUMENT_BYTES || 25 * 1024 * 1024), files: 1 },
});

router.use(verifyToken, requirePermission('capex'));

router.get('/me/context', controller.getContext);
router.get('/master-data', controller.getMasterData);
router.post('/master-data/organizations', controller.createOrganization);
router.post('/master-data/cost-centres', controller.createCostCentre);
router.post('/master-data/categories', controller.createCategory);
router.post('/master-data/scope-assignments', controller.createScopeAssignment);

router.get('/budget-cycles', controller.listBudgetCycles);
router.post('/budget-cycles', controller.createBudgetCycle);
router.get('/imports', controller.listImports);
router.post('/imports', jsonOrCsv.single('file'), controller.createImport);
router.get('/imports/:importId', controller.getImport);
router.get('/imports/:importId/download', controller.downloadImport);
router.post('/imports/:importId/validate', controller.validateImport);
router.post('/imports/:importId/post', controller.postImport);
router.get('/allocations', controller.listAllocations);
router.get('/transfers', controller.listTransfers);
router.post('/transfers', controller.createTransfer);
router.post('/transfers/:transferId/decision', controller.decideTransfer);

router.get('/workflow', controller.listWorkflows);
router.post('/workflow/definitions', controller.createWorkflowDefinition);
router.post('/workflow/definitions/:definitionId/versions', controller.createWorkflowVersion);
router.post('/workflow/versions/:versionId/activate', controller.activateWorkflowVersion);
router.post('/workflow/simulate', controller.simulateWorkflow);

router.get('/requests', controller.listRequests);
router.post('/requests', controller.createRequest);
router.get('/requests/:requestId', controller.getRequest);
router.patch('/requests/:requestId', controller.updateRequest);
router.post('/requests/:requestId/submit', controller.submitRequest);
router.post('/requests/:requestId/withdraw', controller.withdrawRequest);
router.post('/requests/:requestId/quotations', controller.addQuotation);
router.delete('/requests/:requestId/quotations/:quotationId', controller.deleteQuotation);
router.post('/requests/:requestId/documents', evidence.single('file'), controller.uploadRequestDocument);
router.post('/requests/:requestId/quotations/:quotationId/documents', evidence.single('file'), controller.uploadQuotationDocument);
router.post('/requests/:requestId/decision', controller.decideRequest);

router.get('/approvals/inbox', controller.getApprovalInbox);
router.get('/documents/:documentId/download', controller.downloadDocument);
router.get('/dashboards/operational', controller.getOperationalDashboard);
router.get('/dashboards/business-unit', controller.getBusinessUnitDashboard);
router.get('/dashboards/executive', controller.getExecutiveDashboard);

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: error.message, code: `CAPEX_V2_${error.code}` });
  }
  if (error?.message === 'Budget imports must be CSV files') {
    return res.status(400).json({ error: error.message, code: 'CAPEX_V2_INVALID_IMPORT_FILE' });
  }
  return next(error);
});

module.exports = router;
