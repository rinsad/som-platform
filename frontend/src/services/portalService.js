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

async function publicRequest(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

export function getApps() {
  return request('/api/portal/apps');
}

export function getKnowledge(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return publicRequest(`/api/portal/knowledge${qs ? `?${qs}` : ''}`);
}

/** Full-text search — returns results with highlighted <mark> snippets */
export function searchKnowledge(q, category) {
  const params = { q };
  if (category && category !== 'All') params.category = category;
  const qs = new URLSearchParams(params).toString();
  return publicRequest(`/api/portal/knowledge/search?${qs}`);
}

export function getDocVersions(docId) {
  return publicRequest(`/api/portal/knowledge/${docId}/versions`);
}

export function getFavourites() {
  return request('/api/portal/favourites');
}

export function toggleFavourite(appId) {
  return request('/api/portal/favourites', {
    method: 'POST',
    body: JSON.stringify({ appId }),
  });
}

export function getPinnedDocs() {
  return request('/api/portal/pinned-docs');
}

export function togglePinnedDoc(docId) {
  return request('/api/portal/pinned-docs', {
    method: 'POST',
    body: JSON.stringify({ docId }),
  });
}

/** Admin: fetch all KB documents with full metadata. */
export function getKnowledgeAdmin() {
  return request('/api/portal/knowledge/admin');
}

/** Admin: permanently delete a KB document and all its chunks. */
export function deleteKBDocument(id) {
  return request(`/api/portal/knowledge/${id}`, { method: 'DELETE' });
}

/** Admin: generate / refresh semantic embeddings for a document's chunks. */
export function embedDocument(id) {
  return request(`/api/portal/knowledge/${id}/embed`, { method: 'POST' });
}

/** Upload a document (PDF / DOCX / EML / TXT) for KB indexing. */
export async function uploadDocument(formData) {
  const r = await fetch(`${API}/api/portal/knowledge/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('som_token')}` },
    body: formData,   // browser sets multipart Content-Type + boundary
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${r.status})`);
  }
  return r.json();
}

/** Returns the URL to view a document's file from the public kb-files folder. */
export function getDocFileUrl(docId, sourceType = 'pdf') {
  return `/kb-files/${docId}.${sourceType}`;
}

/**
 * SSO Readiness stub.
 * In production this would initiate a SAML 2.0 / OAuth 2.0 redirect via the
 * identity provider. Replace the body with the real IdP redirect when live.
 */
export function ssoLogin(app) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true, app }), 1200);
  });
}
