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

export function getAllPRs(status) {
  const qs = status ? `?status=${status}` : '';
  return request(`/api/purchase-requests${qs}`);
}

export function getPRById(id) {
  return request(`/api/purchase-requests/${id}`);
}

export function createPR(data) {
  return request('/api/purchase-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePR(id, data) {
  return request(`/api/purchase-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function resubmitPR(id, comment) {
  return request(`/api/purchase-requests/${id}/resubmit`, {
    method: 'PATCH',
    body: JSON.stringify({ comment }),
  });
}

export function approvePR(id, decision, comment) {
  return request(`/api/purchase-requests/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, comment }),
  });
}

export function getDocuments(prId) {
  return request(`/api/purchase-requests/${prId}/documents`);
}

export function uploadDocument(prId, data) {
  return request(`/api/purchase-requests/${prId}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Real multipart file upload (stores bytes on the server).
export async function uploadDocumentFile(prId, file, type) {
  const form = new FormData();
  form.append('file', file);
  if (type) form.append('type', type);
  const r = await fetch(`${API}/api/purchase-requests/${prId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('som_token')}` },
    body: form,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${r.status})`);
  }
  return r.json();
}

export async function downloadDocument(prId, docId, name) {
  const r = await fetch(`${API}/api/purchase-requests/${prId}/documents/${docId}/download`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('som_token')}` },
  });
  if (!r.ok) throw new Error(`Download failed (${r.status})`);
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
