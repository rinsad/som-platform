const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

export function getAssets(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/assets${qs ? `?${qs}` : ''}`);
}

export function getAlerts() {
  return request('/api/assets/alerts');
}

export function getAssetByCode(assetCode) {
  return request(`/api/assets/${assetCode}`);
}

export function createAsset(data) {
  return request('/api/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getBillsBySite(siteId) {
  return request(`/api/assets/utility-bills/${siteId}`);
}

export function createBill(data) {
  return request('/api/assets/utility-bills', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getWorkOrders(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/assets/work-orders${qs ? `?${qs}` : ''}`);
}

export function createWorkOrder(data) {
  return request('/api/assets/work-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
