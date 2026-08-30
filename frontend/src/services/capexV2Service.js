const API = (() => {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return base === '/api' ? '' : base;
})();

function headers(json = true) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${localStorage.getItem('som_token')}`,
  };
}

async function call(path, options = {}) {
  const response = await fetch(`${API}/api/capex/v2${path}`, {
    ...options,
    headers: { ...headers(!(options.body instanceof FormData)), ...(options.headers || {}) },
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(body?.error || `CAPEX v2 request failed (${response.status})`);
    error.code = body?.code;
    error.details = body?.details;
    error.status = response.status;
    throw error;
  }
  return body;
}

function json(method, data) {
  return { method, body: JSON.stringify(data || {}) };
}

export const getCapexV2Context = () => call('/me/context');
export const getCapexV2MasterData = () => call('/master-data');
export const createCapexV2Organization = (data) => call('/master-data/organizations', json('POST', data));
export const createCapexV2CostCentre = (data) => call('/master-data/cost-centres', json('POST', data));
export const createCapexV2Category = (data) => call('/master-data/categories', json('POST', data));
export const createCapexV2ScopeAssignment = (data) => call('/master-data/scope-assignments', json('POST', data));

export const getCapexV2Dashboard = (view = 'operational') => call(`/dashboards/${encodeURIComponent(view)}`);
export const getCapexV2BudgetCycles = () => call('/budget-cycles');
export const createCapexV2BudgetCycle = (data) => call('/budget-cycles', json('POST', data));
export const getCapexV2Imports = (budgetCycleId) => call(`/imports${budgetCycleId ? `?budgetCycleId=${encodeURIComponent(budgetCycleId)}` : ''}`);
export const getCapexV2Import = (id) => call(`/imports/${encodeURIComponent(id)}`);
export const validateCapexV2Import = (id) => call(`/imports/${encodeURIComponent(id)}/validate`, json('POST'));
export const postCapexV2Import = (id) => call(`/imports/${encodeURIComponent(id)}/post`, json('POST'));
export const getCapexV2Allocations = (budgetCycleId) => call(`/allocations?budgetCycleId=${encodeURIComponent(budgetCycleId)}`);
export const getCapexV2Transfers = (budgetCycleId) => call(`/transfers${budgetCycleId ? `?budgetCycleId=${encodeURIComponent(budgetCycleId)}` : ''}`);
export const createCapexV2Transfer = (data) => call('/transfers', json('POST', data));
export const decideCapexV2Transfer = (id, data) => call(`/transfers/${encodeURIComponent(id)}/decision`, json('POST', data));

export function uploadCapexV2Import({ file, budgetCycleId, sourceReference, importType = 'APPROVED_BUDGET', sourceSystem = 'SAC' }) {
  const form = new FormData();
  form.append('file', file);
  form.append('payload', JSON.stringify({ budgetCycleId, sourceReference, importType, sourceSystem }));
  return call('/imports', { method: 'POST', body: form });
}

export async function downloadCapexV2Import(batch) {
  const response = await fetch(`${API}/api/capex/v2/imports/${encodeURIComponent(batch.id)}/download`, {
    headers: headers(false),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Import download failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = batch.originalFilename || `capex-import-${batch.id}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const getCapexV2Requests = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  return call(`/requests${params.size ? `?${params.toString()}` : ''}`);
};
export const getCapexV2Request = (id) => call(`/requests/${encodeURIComponent(id)}`);
export const createCapexV2Request = (data) => call('/requests', json('POST', data));
export const updateCapexV2Request = (id, data) => call(`/requests/${encodeURIComponent(id)}`, json('PATCH', data));
export const submitCapexV2Request = (id) => call(`/requests/${encodeURIComponent(id)}/submit`, json('POST'));
export const withdrawCapexV2Request = (id) => call(`/requests/${encodeURIComponent(id)}/withdraw`, json('POST'));
export const addCapexV2Quotation = (id, data) => call(`/requests/${encodeURIComponent(id)}/quotations`, json('POST', data));
export const deleteCapexV2Quotation = (requestId, quotationId) => call(`/requests/${encodeURIComponent(requestId)}/quotations/${encodeURIComponent(quotationId)}`, { method: 'DELETE' });
export const decideCapexV2Request = (id, data) => call(`/requests/${encodeURIComponent(id)}/decision`, json('POST', data));
export const getCapexV2ApprovalInbox = () => call('/approvals/inbox');

export function uploadCapexV2Document(requestId, file, documentKind = 'PROJECT_EVIDENCE') {
  const form = new FormData();
  form.append('file', file);
  form.append('documentKind', documentKind);
  return call(`/requests/${encodeURIComponent(requestId)}/documents`, { method: 'POST', body: form });
}

export function uploadCapexV2QuotationDocument(requestId, quotationId, file) {
  const form = new FormData();
  form.append('file', file);
  return call(`/requests/${encodeURIComponent(requestId)}/quotations/${encodeURIComponent(quotationId)}/documents`, { method: 'POST', body: form });
}

export async function downloadCapexV2Document(document) {
  const response = await fetch(`${API}/api/capex/v2/documents/${encodeURIComponent(document.id)}/download`, {
    headers: headers(false),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Document download failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.filename || 'capex-document';
  anchor.click();
  URL.revokeObjectURL(url);
}

export const getCapexV2Workflow = () => call('/workflow');
export const createCapexV2WorkflowDefinition = (data) => call('/workflow/definitions', json('POST', data));
export const createCapexV2WorkflowVersion = (definitionId, data) => call(`/workflow/definitions/${encodeURIComponent(definitionId)}/versions`, json('POST', data));
export const activateCapexV2WorkflowVersion = (versionId, data) => call(`/workflow/versions/${encodeURIComponent(versionId)}/activate`, json('POST', data));
export const simulateCapexV2Workflow = (data) => call('/workflow/simulate', json('POST', data));
