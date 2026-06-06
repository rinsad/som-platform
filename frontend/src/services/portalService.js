const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function apiUrl(path) {
  const apiPath = path.startsWith('/api/') ? path : `/api${path}`;
  if (!API || API === '/api') return apiPath;
  return API.endsWith('/api') ? `${API}${apiPath.slice(4)}` : `${API}${apiPath}`;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('som_token')}`,
  };
}

async function request(path, options = {}) {
  const r = await fetch(apiUrl(path), { headers: authHeaders(), ...options });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

async function publicRequest(path) {
  const r = await fetch(apiUrl(path));
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

export function getApps() {
  return publicRequest('/portal/apps');
}

export function getKnowledge(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return publicRequest(`/portal/knowledge${qs ? `?${qs}` : ''}`);
}

/** Full-text search — returns results with highlighted <mark> snippets */
export function searchKnowledge(q, category) {
  const params = { q };
  if (category && category !== 'All') params.category = category;
  const qs = new URLSearchParams(params).toString();
  return publicRequest(`/portal/knowledge/search?${qs}`);
}

export function getDocVersions(docId) {
  return publicRequest(`/portal/knowledge/${docId}/versions`);
}

export function getFavourites() {
  return request('/portal/favourites');
}

export function toggleFavourite(appId) {
  return request('/portal/favourites', {
    method: 'POST',
    body: JSON.stringify({ appId }),
  });
}

export function getPinnedDocs() {
  return request('/portal/pinned-docs');
}

export function togglePinnedDoc(docId) {
  return request('/portal/pinned-docs', {
    method: 'POST',
    body: JSON.stringify({ docId }),
  });
}

/** Admin: fetch all KB documents with full metadata. */
export function getKnowledgeAdmin() {
  return request('/portal/knowledge/admin');
}

/** Admin: permanently delete a KB document and all its chunks. */
export function deleteKBDocument(id) {
  return request(`/portal/knowledge/${id}`, { method: 'DELETE' });
}

/** Admin: generate / refresh semantic embeddings for a document's chunks. */
export function embedDocument(id) {
  return request(`/portal/knowledge/${id}/embed`, { method: 'POST' });
}

/** Upload a document (PDF / DOCX / EML / TXT) for KB indexing. */
export async function uploadDocument(formData) {
  const r = await fetch(apiUrl('/portal/knowledge/upload'), {
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

/**
 * Returns the correct URL to view a document's file.
 * - Uploaded docs (file stored in DB): served via API endpoint — works locally + AWS.
 * - Pre-seeded dummy docs (no DB binary): served from /kb-files/ static folder.
 */
export function getDocFileUrl(docId, sourceType = 'pdf', hasStoredFile = false) {
  if (hasStoredFile) {
    return apiUrl(`/portal/knowledge/${docId}/file`);
  }
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
