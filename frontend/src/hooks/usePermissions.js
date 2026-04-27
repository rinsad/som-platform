import { useState, useEffect, useMemo } from 'react';
import { buildPermMap, can, canView, canCreate, canEdit, canDelete } from '../utils/permissions';

function readFromStorage() {
  const user = JSON.parse(localStorage.getItem('som_user') ?? 'null');
  const permissions = JSON.parse(localStorage.getItem('som_permissions') ?? '[]');
  return { role: user?.role ?? '', permissions };
}

export default function usePermissions() {
  const [state, setState] = useState(readFromStorage);

  useEffect(() => {
    const handler = () => setState(readFromStorage());
    window.addEventListener('som-permissions-updated', handler);
    return () => window.removeEventListener('som-permissions-updated', handler);
  }, []);

  const permMap = useMemo(() => buildPermMap(state.permissions), [state.permissions]);

  return {
    role:      state.role,
    isAdmin:   state.role === 'Admin',
    permMap,
    can:       (key, action) => can(permMap, state.role, key, action),
    canView:   (key)         => canView(permMap, state.role, key),
    canCreate: (key)         => canCreate(permMap, state.role, key),
    canEdit:   (key)         => canEdit(permMap, state.role, key),
    canDelete: (key)         => canDelete(permMap, state.role, key),
  };
}
