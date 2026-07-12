/**
 * Permissions utility.
 *
 * Permissions are stored as an array of rows:
 *   { level, resource_key, can_view, can_create, can_edit, can_delete }
 *
 * Admins bypass all permission checks — they have full access to everything.
 */

/** Build a lookup map keyed by resource_key for O(1) access. */
export function buildPermMap(permissions = []) {
  const map = {};
  for (const p of permissions) {
    map[p.resource_key] = p;
  }
  return map;
}

/**
 * Check a single permission action for a resource key.
 * Admin role always returns true.
 */
export function can(permMap, role, resourceKey, action = 'can_view') {
  if (role === 'Admin') return true;
  const parts = resourceKey.split('.');
  for (let i = parts.length; i >= 1; i -= 1) {
    if (i === 1 && parts.length > 1) continue;
    const key = parts.slice(0, i).join('.');
    const p = permMap[key];
    if (p?.[action]) return true;
  }
  return false;
}

export const canView   = (m, r, k) => can(m, r, k, 'can_view');
export const canCreate = (m, r, k) => can(m, r, k, 'can_create');
export const canEdit   = (m, r, k) => can(m, r, k, 'can_edit');
export const canDelete = (m, r, k) => can(m, r, k, 'can_delete');

/**
 * Map each application path to its permission resource key.
 * Used by Sidebar and route guards.
 */
export const APP_PERMISSION_KEYS = {
  '/capex':             'capex',
  '/purchase-requests': 'purchase-requests',
  '/assets':            'assets',
};
