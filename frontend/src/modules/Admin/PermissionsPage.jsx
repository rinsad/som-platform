import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersService, PERMISSION_TREE } from '../../services/usersService';
import PermissionsPanel from './PermissionsPanel';

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
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to save permissions');
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
          <button style={s.backBtn} onClick={() => navigate('/admin/users')}>
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
          <button style={s.cancelBtn} onClick={() => navigate('/admin/users')}>
            Cancel
          </button>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
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
    color: 'rgba(255,255,255,0.45)',
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
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.60)',
    fontSize: '13px',
    fontWeight: '500',
    padding: '7px 14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rolePill: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '20px',
    background: 'rgba(0,51,102,0.40)',
    color: '#6b9fff',
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
    color: '#34C759',
    padding: '4px 10px',
    background: 'rgba(52,199,89,0.12)',
    borderRadius: '20px',
    border: '1px solid rgba(52,199,89,0.25)',
  },
  cancelBtn: {
    padding: '9px 20px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.60)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #003366 0%, #004080 100%)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,51,102,0.40)',
  },
  hint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
    margin: '0 0 14px',
  },
  errorBanner: {
    marginBottom: '16px',
    padding: '10px 14px',
    background: 'rgba(221,29,33,0.15)',
    border: '1px solid rgba(221,29,33,0.30)',
    borderRadius: '8px',
    color: '#FF8A8A',
    fontSize: '13px',
  },
};
