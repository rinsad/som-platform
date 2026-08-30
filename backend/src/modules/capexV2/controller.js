const pool = require('../../database/db');
const { HttpError, sendError } = require('./http');
const {
  loadAccessContext,
  requireCapability,
  requirePortfolioCapability,
  hasCapability,
  hasPortfolioCapability,
} = require('./access');
const { recordAudit } = require('./audit');
const masterData = require('./masterDataService');
const budgets = require('./budgetService');
const workflows = require('./workflowService');
const requests = require('./requestService');
const documents = require('./documentService');
const reporting = require('./reportingService');
const { LocalDocumentStorage } = require('./storage');
const { parseCsv } = require('./csv');

const storage = new LocalDocumentStorage();

function route(handler, { capability = null, portfolioCapability = null } = {}) {
  return async (req, res, next) => {
    let client;
    try {
      client = await pool.connect();
      const context = await loadAccessContext(client, req.user);
      if (capability) requireCapability(context, capability);
      if (portfolioCapability) requirePortfolioCapability(context, portfolioCapability);
      const result = await handler({ req, res, client, context });
      if (!res.headersSent) res.json(result);
    } catch (error) {
      if (error instanceof HttpError || error?.code?.startsWith?.('CAPEX_V2_')) return sendError(res, error);
      if (error?.code === '23505') {
        return sendError(res, new HttpError(409, 'CAPEX_V2_DUPLICATE', 'A record with the same unique reference already exists'));
      }
      if (error?.code === '23503' || error?.code === '22P02') {
        return sendError(res, new HttpError(400, 'CAPEX_V2_INVALID_REFERENCE', 'A referenced CAPEX v2 record is invalid'));
      }
      if (error?.code === '23514' || error?.code === '22003' || error?.code === '22007') {
        return sendError(res, new HttpError(400, 'CAPEX_V2_INVALID_VALUE', 'A CAPEX v2 value failed validation'));
      }
      if (String(error?.message || '').startsWith('Amount ')) {
        return sendError(res, new HttpError(400, 'CAPEX_V2_INVALID_OMR_AMOUNT', error.message));
      }
      if (error instanceof SyntaxError) {
        return sendError(res, new HttpError(400, 'CAPEX_V2_INVALID_JSON', 'The submitted JSON payload is invalid'));
      }
      next(error);
    } finally {
      client?.release();
    }
  };
}

function workspaces(context) {
  const items = [{ key: 'operational', label: 'My CAPEX work', path: '/capex-v2' }];
  if (context.scopes.some((scope) => scope.type === 'BUSINESS_UNIT') || hasCapability(context, 'dashboard:bu')) {
    items.push({ key: 'business-unit', label: 'Business-unit control', path: '/capex-v2/business-unit' });
  }
  if (hasPortfolioCapability(context, 'dashboard:portfolio')) {
    items.push({ key: 'executive', label: 'Portfolio control', path: '/capex-v2/executive' });
  }
  if (hasCapability(context, 'budget:view') || hasCapability(context, 'budget:manage')) {
    items.push({ key: 'budgets', label: 'Budget control', path: '/capex-v2/budgets' });
  }
  return items;
}

exports.getContext = route(async ({ req, context }) => ({
  user: { id: req.user.id, name: req.user.full_name || req.user.name || req.user.email, role: req.user.role },
  ...context,
  authorityMode: process.env.CAPEX_V2_SSO_READY === 'true' ? 'BINDING_READY' : 'PILOT_ONLY',
  workspaces: workspaces(context),
}));

exports.getMasterData = route(async ({ client, context }) => masterData.getMasterData(client, context));

exports.createOrganization = route(async ({ req, client }) => {
  const result = await masterData.createOrganizationUnit(client, req.body, req.user);
  await recordAudit(client, { req, eventType: 'ORGANIZATION_CREATED', entityType: 'ORGANIZATION_UNIT', entityId: result.id, afterState: result });
  return result;
}, { portfolioCapability: 'master-data:manage' });

exports.createCostCentre = route(async ({ req, client }) => {
  const result = await masterData.createCostCentre(client, req.body, req.user);
  await recordAudit(client, { req, eventType: 'COST_CENTRE_CREATED', entityType: 'COST_CENTRE', entityId: result.id, organizationUnitId: result.organizationUnitId, afterState: result });
  return result;
}, { portfolioCapability: 'master-data:manage' });

exports.createCategory = route(async ({ req, client }) => {
  const result = await masterData.createCategory(client, req.body, req.user);
  await recordAudit(client, { req, eventType: 'CAPEX_CATEGORY_CREATED', entityType: 'CAPEX_CATEGORY', entityId: result.id, afterState: result });
  return result;
}, { portfolioCapability: 'master-data:manage' });

exports.createScopeAssignment = route(async ({ req, client }) => {
  const result = await masterData.createScopeAssignment(client, req.body, req.user);
  await recordAudit(client, { req, eventType: 'USER_SCOPE_ASSIGNED', entityType: 'USER_SCOPE_ASSIGNMENT', entityId: result.id, organizationUnitId: result.organizationUnitId, afterState: result });
  return result;
}, { portfolioCapability: 'master-data:manage' });

exports.listBudgetCycles = route(async ({ client, context }) => budgets.listBudgetCycles(client, context));

exports.createBudgetCycle = route(async ({ req, client }) => {
  const result = await budgets.createBudgetCycle(client, req.body, req.user);
  await recordAudit(client, { req, eventType: 'BUDGET_CYCLE_CREATED', entityType: 'BUDGET_CYCLE', entityId: result.id, afterState: result });
  return result;
}, { portfolioCapability: 'budget:manage' });

exports.listImports = route(async ({ req, client }) => budgets.listImportBatches(client, req.query.budgetCycleId), { portfolioCapability: 'budget:manage' });

exports.createImport = route(async ({ req, client }) => {
  let payload = req.body || {};
  if (typeof payload.payload === 'string') payload = JSON.parse(payload.payload);
  if (req.file) {
    payload = {
      ...payload,
      originalFilename: req.file.originalname,
      originalContent: req.file.buffer,
      rows: parseCsv(req.file.buffer.toString('utf8')),
    };
  }
  const result = await budgets.createImportBatch(client, payload, req.user);
  await recordAudit(client, { req, eventType: 'FINANCIAL_IMPORT_STAGED', entityType: 'IMPORT_BATCH', entityId: result.id, afterState: result });
  return result;
}, { portfolioCapability: 'budget:manage' });

exports.getImport = route(async ({ req, client }) => budgets.getImportBatchDetail(client, req.params.importId), {
  portfolioCapability: 'budget:manage',
});

exports.downloadImport = route(async ({ req, res, client }) => {
  const download = await budgets.getImportBatchDownload(client, req.params.importId);
  const safeFilename = download.filename.replace(/[\r\n"]/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('X-CAPEX-V2-Download-Mode', download.mode);
  res.send(download.content);
}, { portfolioCapability: 'budget:manage' });

exports.validateImport = route(async ({ req, client }) => {
  const result = await budgets.validateImportBatch(client, req.params.importId, req.user);
  await recordAudit(client, { req, eventType: 'FINANCIAL_IMPORT_VALIDATED', entityType: 'IMPORT_BATCH', entityId: result.id, afterState: result });
  return result;
}, { portfolioCapability: 'budget:manage' });

exports.postImport = route(async ({ req, client }) => {
  const result = await budgets.postImportBatch(client, req.params.importId, req.user);
  await recordAudit(client, { req, eventType: 'FINANCIAL_IMPORT_POSTED', entityType: 'IMPORT_BATCH', entityId: result.id, afterState: result });
  return result;
}, { portfolioCapability: 'budget:approve' });

exports.listAllocations = route(async ({ req, client, context }) => budgets.listAllocations(client, req.query.budgetCycleId, context));
exports.listTransfers = route(async ({ req, client, context }) => budgets.listTransfers(client, req.query.budgetCycleId, context));

exports.createTransfer = route(async ({ req, client, context }) => {
  const result = await budgets.createTransfer(client, req.body, req.user, context);
  await recordAudit(client, { req, eventType: 'BUDGET_TRANSFER_REQUESTED', entityType: 'BUDGET_TRANSFER', entityId: result.id, afterState: result });
  return result;
}, { capability: 'budget:transfer:create' });

exports.decideTransfer = route(async ({ req, client }) => {
  const result = await budgets.decideTransfer(client, req.params.transferId, req.body, req.user);
  await recordAudit(client, { req, eventType: `BUDGET_TRANSFER_${result.status}`, entityType: 'BUDGET_TRANSFER', entityId: result.id, afterState: result });
  return result;
}, { portfolioCapability: 'budget:approve' });

exports.listWorkflows = route(async ({ client }) => workflows.listWorkflowConfiguration(client), { portfolioCapability: 'workflow:manage' });

exports.createWorkflowDefinition = route(async ({ req, client }) => {
  const result = await workflows.createDefinition(client, req.body, req.user);
  await recordAudit(client, { req, eventType: 'WORKFLOW_DEFINITION_CREATED', entityType: 'WORKFLOW_DEFINITION', entityId: result.id, afterState: result });
  return result;
}, { portfolioCapability: 'workflow:manage' });

exports.createWorkflowVersion = route(async ({ req, client }) => {
  const result = await workflows.createVersion(client, req.params.definitionId, req.body, req.user);
  await recordAudit(client, { req, eventType: 'WORKFLOW_VERSION_DRAFTED', entityType: 'WORKFLOW_VERSION', entityId: result.id, authorityMode: result.authorityMode, afterState: result });
  return result;
}, { portfolioCapability: 'workflow:manage' });

exports.activateWorkflowVersion = route(async ({ req, client }) => {
  await client.query('BEGIN');
  try {
    const result = await workflows.activateVersion(client, req.params.versionId, req.body, req.user);
    await recordAudit(client, { req, eventType: 'WORKFLOW_VERSION_ACTIVATED', entityType: 'WORKFLOW_VERSION', entityId: result.id, authorityMode: result.authorityMode, afterState: result });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}, { portfolioCapability: 'workflow:manage' });

exports.simulateWorkflow = route(async ({ req, client }) => {
  await client.query('BEGIN');
  try {
    const result = await workflows.simulateRoute(client, req.body, req.user);
    await recordAudit(client, {
      req,
      eventType: 'WORKFLOW_ROUTE_SIMULATED',
      entityType: 'WORKFLOW_VERSION',
      entityId: req.body.versionId || result.versionId,
      authorityMode: result.authorityMode,
      afterState: result,
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}, { portfolioCapability: 'workflow:manage' });

exports.listRequests = route(async ({ req, client, context }) => requests.listRequests(client, context, req.query));
exports.getRequest = route(async ({ req, client, context }) => requests.getRequestDetail(client, req.params.requestId, context));

exports.createRequest = route(async ({ req, client, context }) => {
  const result = await requests.createRequest(client, req.body, req.user, context);
  await recordAudit(client, { req, eventType: 'REQUEST_DRAFT_CREATED', entityType: 'REQUEST', entityId: result.id, afterState: result });
  return result;
}, { capability: 'request:create' });

exports.updateRequest = route(async ({ req, client, context }) => {
  const before = await requests.getRequestDetail(client, req.params.requestId, context);
  const result = await requests.updateRequest(client, req.params.requestId, req.body, req.user, context);
  await recordAudit(client, { req, eventType: 'REQUEST_EDITED', entityType: 'REQUEST', entityId: result.id, organizationUnitId: before.organizationUnitId, beforeState: before, afterState: result });
  return result;
});

exports.addQuotation = route(async ({ req, client, context }) => {
  const result = await requests.addQuotation(client, req.params.requestId, req.body, req.user, context);
  await recordAudit(client, { req, eventType: 'QUOTATION_ADDED', entityType: 'QUOTATION', entityId: result.id, afterState: result, metadata: { requestId: req.params.requestId } });
  return result;
});

exports.deleteQuotation = route(async ({ req, client, context }) => {
  const result = await requests.deleteQuotation(client, req.params.requestId, req.params.quotationId, req.user, context);
  await recordAudit(client, { req, eventType: 'QUOTATION_REMOVED', entityType: 'QUOTATION', entityId: result.id, beforeState: result, metadata: { requestId: req.params.requestId } });
  return result;
});

exports.submitRequest = route(async ({ req, client, context }) => {
  const result = await requests.submitRequest(client, req.params.requestId, req.user, context);
  await recordAudit(client, { req, eventType: 'REQUEST_SUBMITTED', entityType: 'REQUEST', entityId: result.id, authorityMode: result.authorityMode, afterState: result });
  return result;
});

exports.withdrawRequest = route(async ({ req, client, context }) => {
  const result = await requests.withdrawRequest(client, req.params.requestId, req.user, context);
  await recordAudit(client, { req, eventType: 'REQUEST_WITHDRAWN', entityType: 'REQUEST', entityId: result.id, afterState: result });
  return result;
});

exports.getApprovalInbox = route(async ({ req, client }) => requests.getApprovalInbox(client, req.user));

exports.decideRequest = route(async ({ req, client, context }) => {
  const result = await requests.decideRequestStep(client, req.params.requestId, req.body, req.user, context);
  await recordAudit(client, { req, eventType: `REQUEST_STEP_${String(req.body.decision || '').toUpperCase()}`, entityType: 'REQUEST', entityId: result.id, authorityMode: result.authorityMode, afterState: result });
  return result;
});

exports.uploadRequestDocument = route(async ({ req, client, context }) => {
  const result = await documents.attachDocument(client, storage, {
    requestId: req.params.requestId,
    documentKind: req.body.documentKind || 'PROJECT_EVIDENCE',
    supersedesDocumentId: req.body.supersedesDocumentId || null,
    changeNote: req.body.changeNote || null,
    file: req.file,
    user: req.user,
    context,
  });
  await recordAudit(client, { req, eventType: 'REQUEST_DOCUMENT_UPLOADED', entityType: 'DOCUMENT', entityId: result.id, afterState: result, metadata: { requestId: req.params.requestId } });
  return result;
});

exports.uploadQuotationDocument = route(async ({ req, client, context }) => {
  const result = await documents.attachDocument(client, storage, {
    requestId: req.params.requestId,
    quotationId: req.params.quotationId,
    documentKind: 'QUOTATION_EVIDENCE',
    file: req.file,
    user: req.user,
    context,
  });
  await recordAudit(client, { req, eventType: 'QUOTATION_DOCUMENT_UPLOADED', entityType: 'DOCUMENT', entityId: result.id, afterState: result, metadata: { requestId: req.params.requestId, quotationId: req.params.quotationId } });
  return result;
});

exports.downloadDocument = route(async ({ req, res, client, context }) => {
  const document = await documents.downloadDocument(client, storage, req.params.documentId, context);
  res.setHeader('Content-Type', document.mediaType);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`);
  res.send(document.buffer);
});

exports.getOperationalDashboard = route(async ({ req, client, context }) => reporting.getDashboard(client, context, 'operational', req.user));
exports.getBusinessUnitDashboard = route(async ({ req, client, context }) => reporting.getDashboard(client, context, 'business-unit', req.user), { capability: 'dashboard:bu' });
exports.getExecutiveDashboard = route(async ({ req, client, context }) => reporting.getDashboard(client, context, 'executive', req.user), { portfolioCapability: 'dashboard:portfolio' });
