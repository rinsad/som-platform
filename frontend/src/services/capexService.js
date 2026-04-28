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
  const API = import.meta.env.VITE_API_URL || '/api',;
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
