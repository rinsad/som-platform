const API = import.meta.env.VITE_API_URL || '/api';

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
