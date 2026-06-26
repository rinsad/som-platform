const API = (() => {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return base === '/api' ? '' : base;
})();

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('som_token')}`,
  };
}

async function request(path, options = {}) {
  const r = await fetch(`${API}${path}`, { headers: authHeaders(), ...options });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

export const DEPT_NAMES = [
  'HR & Real Estate',
  'Finance & Operations',
  'Trading, Lubricants & Supply Chain',
  'Aviation',
  'Mobility',
  'General',
];

export function getDepartments() {
  return request('/api/capex/departments');
}

export function getSyncStatus() {
  return request('/api/capex/sync-status');
}

export function getGsapData() {
  return request('/api/capex/gsap-data');
}

export function getInitiations() {
  return request('/api/capex/initiations');
}

export function getCapexRequests() {
  return request('/api/capex/requests');
}

export function getCapexRequest(id) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}`);
}

export function createCapexRequest(data) {
  return request('/api/capex/requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function decideCapexRequest(id, decision, comment = '') {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, comment }),
  });
}

export function updateCapexProcurement(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/procurement`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function createCapexMilestone(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/milestones`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCapexMilestone(id, milestoneId, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function saveCapexFinancialClosure(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/financial-closure`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getCapexAuditLogs(id) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/audit`);
}

export function getCapexReport() {
  return request('/api/capex/requests/report');
}

export function getCapexReportCsvUrl() {
  return `${API}/api/capex/requests/report?format=csv`;
}

export function getCapexGovernanceDashboard() {
  return request('/api/capex/dashboard/governance');
}

export function getCapexDashboardDrilldown(type = 'businessUnit', filters = {}) {
  const params = new URLSearchParams({ type, ...filters });
  return request(`/api/capex/dashboard/drilldown?${params.toString()}`);
}

export function getCapexProcessReference() {
  return request('/api/capex/process-reference');
}

export function getCapexReportExport(format = 'json', reportType = 'governance') {
  const params = new URLSearchParams({ format, reportType });
  return request(`/api/capex/reports/export?${params.toString()}`);
}

export function getCapexGovernanceExportUrl(format = 'csv', reportType = 'governance') {
  return `${API}/api/capex/reports/export?format=${encodeURIComponent(format)}&reportType=${encodeURIComponent(reportType)}`;
}

export function getCapexReportSchedules() {
  return request('/api/capex/report-schedules');
}

export function createCapexReportSchedule(data) {
  return request('/api/capex/report-schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCapexAuc(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/auc`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function updateCapexCapitalization(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/capitalization`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function updateCapexPoClosure(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/po-closure`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function updateCapexClosureChecklistItem(id, itemId, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/closure-checklist/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function saveCapexBenefitReview(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/benefit-reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createCapexRisk(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/risks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createCapexMoa(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/moa`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createCapexMoaRevision(id, moaId, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/moa/${encodeURIComponent(moaId)}/revisions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createCapexDocumentVersion(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/document-versions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createCapexSignature(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/signatures`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createCapexBudgetVariation(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/budget-variations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCapexProcurementPerformance(id, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/procurement-performance`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function updateCapexDecisionGate(id, gateKey, data) {
  return request(`/api/capex/requests/${encodeURIComponent(id)}/decision-gates/${encodeURIComponent(gateKey)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getCapexAdminConfig() {
  return request('/api/capex/admin-config');
}

export function updateCapexThresholds(data) {
  return request('/api/capex/admin-config/thresholds', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function updateCapexWorkflowRule(ruleId, data) {
  return request(`/api/capex/admin-config/workflow-rules/${encodeURIComponent(ruleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function uploadCapexAttachment(id, formData) {
  const r = await fetch(`${API}/api/capex/requests/${encodeURIComponent(id)}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('som_token')}` },
    body: formData,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `Attachment upload failed (${r.status})`);
  }
  return r.json();
}

export function getCapexAttachmentDownloadUrl(requestId, attachmentId) {
  return `${API}/api/capex/requests/${encodeURIComponent(requestId)}/attachments/${encodeURIComponent(attachmentId)}/download`;
}

export async function downloadCapexAttachment(requestId, attachment) {
  const r = await fetch(getCapexAttachmentDownloadUrl(requestId, attachment.id), {
    headers: { Authorization: `Bearer ${localStorage.getItem('som_token')}` },
  });
  if (!r.ok) throw new Error(`Attachment download failed (${r.status})`);
  const blob = await r.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.name || 'capex-attachment';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function createInitiation(data) {
  return request('/api/capex/initiations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getManualEntries() {
  return request('/api/capex/manual-entries');
}

export function createManualEntry(data) {
  return request('/api/capex/manual-entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getBudgetUploads() {
  return request('/api/capex/budget-uploads');
}

export async function uploadCapexBudget(formData) {
  const API = import.meta.env.VITE_API_URL || '/api';
  const r = await fetch(`${API}/api/capex/budget-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('som_token')}` },
    body: formData,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${r.status})`);
  }
  return r.json();
}
