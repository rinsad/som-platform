import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersService, PERMISSION_TREE } from '../../services/usersService';
import PermissionsPanel from './PermissionsPanel';
import { notifyError, notifySuccess } from '../../utils/toast';

function buildEmptyPermMap() {
  const map = {};
  const add = (key) => { map[key] = { can_view: false, can_create: false, can_edit: false, can_delete: false }; };
  for (const app of PERMISSION_TREE) {
    add(app.key);
    for (const mod of app.modules) {
      add(mod.key);
      for (const page of mod.pages) {
        add(page.key);
        for (const field of (page.fields ?? [])) add(field.key);
      }
    }
  }
  return map;
}

function buildLevelMap() {
  const map = {};
  for (const app of PERMISSION_TREE) {
    map[app.key] = 'application';
    for (const mod of app.modules) {
      map[mod.key] = 'module';
      for (const page of mod.pages) {
        map[page.key] = 'page';
        for (const field of (page.fields ?? [])) map[field.key] = 'field';
      }
    }
  }
  return map;
}

function permArrayToMap(permissions = []) {
  const map = buildEmptyPermMap();
  for (const p of permissions) {
    if (map[p.resource_key] !== undefined) {
      map[p.resource_key] = {
        can_view:   p.can_view,
        can_create: p.can_create,
        can_edit:   p.can_edit,
        can_delete: p.can_delete,
      };
    }
  }
  return map;
}

function permMapToArray(map) {
  const levelMap = buildLevelMap();
  return Object.entries(map)
    .filter(([, perms]) => perms.can_view || perms.can_create || perms.can_edit || perms.can_delete)
    .map(([resource_key, perms]) => ({
      resource_key,
      level: levelMap[resource_key] ?? 'field',
      ...perms,
    }));
}

export default function PermissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser]       = useState(null);
  const [permMap, setPermMap] = useState(buildEmptyPermMap);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    usersService.get(id)
      .then(u => {
        setUser(u);
        setPermMap(permArrayToMap(u.permissions ?? []));
      })
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePermChange = (key, level, action, value) => {
    setSaved(false);
    setPermMap(m => ({ ...m, [key]: { ...(m[key] ?? {}), [action]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await usersService.update(id, { permissions: permMapToArray(permMap) });
      setSaved(true);
      notifySuccess('Permissions saved.');
    } catch (err) {
      const message = err.response?.data?.error ?? err.message ?? 'Failed to save permissions';
      setError(message);
      notifyError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={s.state}>Loading…</div>;
  if (error && !user) return <div style={s.state}>{error}</div>;

  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button type="button" style={s.backBtn} onClick={() => navigate('/admin/users')}>
            ← Users
          </button>
          <div>
            <h1 style={s.title}>Permissions</h1>
            <p style={s.subtitle}>
              {user?.full_name}
              <span style={s.rolePill}>{user?.role}</span>
            </p>
          </div>
        </div>
        <div style={s.headerActions}>
          {saved && <span style={s.savedBadge}>Saved</span>}
          <button type="button" style={s.cancelBtn} onClick={() => navigate('/admin/users')}>
            Cancel
          </button>
          <button type="button" style={s.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      <p style={s.hint}>
        Checking a parent row cascades to all child modules, pages, and fields.
      </p>

      <PermissionsPanel permissions={permMap} onChange={handlePermChange} />
    </div>
  );
}

const s = {
  page: {
    padding: '28px 32px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  state: {
    padding: '48px 32px',
    color: 'var(--gray-500)',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    background: '#fff',
    border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--gray-700)',
    fontSize: '13px',
    fontWeight: '800',
    padding: '7px 14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--label)',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--gray-500)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rolePill: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-red-bg)',
    color: 'var(--shell-red)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  savedBadge: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--success)',
    padding: '4px 10px',
    background: 'var(--success-bg)',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--success-bg)',
  },
  cancelBtn: {
    padding: '9px 20px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--separator)',
    background: '#fff',
    color: 'var(--gray-700)',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 24px',
    borderRadius: 'var(--radius-xs)',
    border: 'none',
    background: 'var(--shell-red)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--label-tertiary)',
    margin: '0 0 14px',
  },
  errorBanner: {
    marginBottom: '16px',
    padding: '10px 14px',
    background: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-line)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--shell-red)',
    fontSize: '13px',
  },
};
