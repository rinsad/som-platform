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
  const p = permMap[resourceKey];
  return p ? !!p[action] : false;
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
