import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../../services/usersService';
import ConfirmModal from '../../components/ConfirmModal';
import UserFormModal from './UserFormModal';
import Badge from '../../components/Badge';
import { notifyError, notifySuccess } from '../../utils/toast';

// Role labels are arbitrary identity tags, not a severity ladder, so each
// gets an explicit tone; unlisted roles fall back to the Badge default (neutral).
const ROLE_TONE = { Admin: 'danger', Manager: 'warning', Finance: 'success', Employee: 'neutral' };

export default function UserManagement() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [modalUser, setModalUser] = useState(undefined); // undefined = closed, null = new, object = edit
  const [editData, setEditData]   = useState(null);
  const [confirm, setConfirm]     = useState(null);  // { type, user }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersService.list();
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openNew  = () => { setEditData(null); setModalUser(null); };
  const openEdit = async (user) => {
    try {
      const full = await usersService.get(user.id);
      setEditData(full);
      setModalUser(full);
    } catch {
      setError('Failed to load user details');
    }
  };

  const handleSave = async (payload) => {
    if (editData) {
      await usersService.update(editData.id, payload);
      notifySuccess('User updated.');
    } else {
      await usersService.create(payload);
      notifySuccess('User created.');
    }
    setModalUser(undefined);
    loadUsers();
  };

  const handleDeactivate = async (user) => {
    try {
      await usersService.deactivate(user.id);
      notifySuccess(`${user.full_name} deactivated.`);
      loadUsers();
    } catch (err) {
      notifyError(err, 'Failed to deactivate');
    }
    setConfirm(null);
  };

  const handleReactivate = async (user) => {
    try {
      await usersService.reactivate(user.id);
      notifySuccess(`${user.full_name} reactivated.`);
      loadUsers();
    } catch (err) {
      notifyError(err, 'Failed to reactivate');
    }
    setConfirm(null);
  };

  const handleDelete = async (user) => {
    try {
      await usersService.delete(user.id);
      notifySuccess(`${user.full_name} deleted.`);
      loadUsers();
    } catch (err) {
      notifyError(err, 'Failed to delete');
    }
    setConfirm(null);
  };

  const filtered = users.filter(u =>
    !search ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase()) ||
    (u.department ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    admins:   users.filter(u => u.role === 'Admin').length,
  };

  const confirmContent = confirm && {
    delete: {
      title: 'Delete User',
      message: `Permanently delete ${confirm.user.full_name}? This cannot be undone.`,
      label: 'Delete',
      color: 'var(--shell-red)',
      action: handleDelete,
    },
    reactivate: {
      title: 'Reactivate User',
      message: `Reactivate ${confirm.user.full_name}? They will be able to log in again.`,
      label: 'Reactivate',
      color: 'var(--success)',
      action: handleReactivate,
    },
    deactivate: {
      title: 'Deactivate User',
      message: `Deactivate ${confirm.user.full_name}? They will no longer be able to log in.`,
      label: 'Deactivate',
      color: 'var(--warning)',
      action: handleDeactivate,
    },
  }[confirm.type];

  return (
    <div style={s.root}>
      {/* Page header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>User Management</h1>
          <p style={s.pageSubtitle}>Create users and manage application, module, page, and field-level permissions.</p>
        </div>
        <button type="button" style={s.newBtn} onClick={openNew}>
          <span style={s.plusIcon}>+</span> New User
        </button>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label: 'Total Users',    value: stats.total,    colour: 'var(--info)' },
          { label: 'Active',         value: stats.active,   colour: 'var(--success)' },
          { label: 'Inactive',       value: stats.inactive, colour: 'var(--danger)' },
          { label: 'Administrators', value: stats.admins,   colour: 'var(--shell-yellow)' },
        ].map(({ label, value, colour }) => (
          <div key={label} style={s.statCard}>
            <span style={{ ...s.statValue, color: colour }}>{value}</span>
            <span style={s.statLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⊕</span>
          <input
            style={s.searchInput}
            placeholder="Search by name, email, role or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* Table */}
      {loading ? (
        <div style={s.center}>
          <div style={s.spinner} />
          <span style={s.loadingText}>Loading users…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          {search ? `No users match "${search}"` : 'No users yet. Create the first one.'}
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Employee ID', 'Name', 'Email', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => {
                return (
                  <tr key={user.id} style={{ ...s.tr, background: i % 2 === 0 ? 'transparent' : 'var(--gray-50)' }}>
                    <td style={s.td}>
                      <span style={s.empId}>{user.employee_id ?? '—'}</span>
                    </td>
                    <td style={s.td}>
                      <div style={s.avatar}>
                        <div style={s.avatarCircle}>
                          {(user.full_name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <span style={s.name}>{user.full_name}</span>
                      </div>
                    </td>
                    <td style={s.td}><span style={s.email}>{user.email}</span></td>
                    <td style={s.td}>
                      <Badge status={user.role} tone={ROLE_TONE[user.role]} />
                    </td>
                    <td style={s.td}><span style={s.dept}>{user.department ?? '—'}</span></td>
                    <td style={s.td}>
                      <Badge status={user.is_active ? 'Active' : 'Inactive'} tone={user.is_active ? 'success' : 'danger'} />
                    </td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        <button type="button" style={s.actionBtn} onClick={() => openEdit(user)} title="Edit">✎</button>
                        {user.is_active ? (
                          <button type="button"
                            style={{ ...s.actionBtn, color: 'var(--accent-amber-text)' }}
                            onClick={() => setConfirm({ type: 'deactivate', user })}
                            title="Deactivate"
                            aria-label={`Deactivate ${user.full_name}`}
                          >⊘</button>
                        ) : (
                          <button type="button"
                            style={{ ...s.actionBtn, color: 'var(--success)' }}
                            onClick={() => setConfirm({ type: 'reactivate', user })}
                            title="Reactivate"
                            aria-label={`Reactivate ${user.full_name}`}
                          >↻</button>
                        )}
                        <button type="button"
                          style={{ ...s.actionBtn, color: 'var(--shell-red)' }}
                          onClick={() => setConfirm({ type: 'delete', user })}
                          title="Delete"
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalUser !== undefined && (
        <UserFormModal
          user={editData}
          onSave={handleSave}
          onClose={() => setModalUser(undefined)}
        />
      )}

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirmContent?.title}
        message={confirmContent?.message}
        confirmLabel={confirmContent?.label}
        confirmColor={confirmContent?.color}
        onConfirm={() => confirmContent?.action(confirm.user)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

const s = {
  root: { display: 'flex', flexDirection: 'column', gap: '20px' },
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  pageTitle: {
    fontSize: '24px', fontWeight: '800', color: 'var(--label)', margin: 0,
  },
  pageSubtitle: {
    fontSize: '13px', color: 'var(--gray-500)', margin: '4px 0 0',
  },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 20px',
    background: 'var(--shell-red)',
    border: 'none', borderRadius: 'var(--radius-xs)',
    color: '#fff', fontSize: '14px', fontWeight: '800',
    cursor: 'pointer',
  },
  plusIcon: { fontSize: '18px', lineHeight: 1 },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  statCard: {
    background: '#fff',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statValue: {
    fontSize: '28px', fontWeight: '700', lineHeight: 1,
  },
  statLabel: {
    fontSize: '12px', color: 'var(--gray-500)', fontWeight: '700',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  searchWrap: {
    flex: 1, display: 'flex', alignItems: 'center',
    background: '#fff',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)', overflow: 'hidden',
  },
  searchIcon: {
    padding: '0 10px 0 14px', fontSize: '16px', color: 'var(--gray-400)',
  },
  searchInput: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: 'var(--label)', fontSize: '13px', padding: '10px 12px 10px 0',
  },
  errorBanner: {
    padding: '12px 16px',
    background: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-line)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--shell-red)', fontSize: '13px', fontWeight: 700,
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)',
    background: '#fff',
    boxShadow: 'var(--shadow-sm)',
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 14px',
    fontSize: '11px', fontWeight: '600',
    color: 'var(--label-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    textAlign: 'left',
    borderBottom: '1px solid var(--gray-200)',
    whiteSpace: 'nowrap',
  },
  tr: {
    transition: 'background 0.1s',
  },
  td: {
    padding: '12px 14px',
    fontSize: '13px', color: 'var(--gray-700)',
    borderBottom: '1px solid var(--gray-100)',
    verticalAlign: 'middle',
  },
  empId: {
    fontFamily: 'monospace', fontSize: '12px',
    color: 'var(--label-tertiary)',
  },
  avatar: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatarCircle: {
    width: '30px', height: '30px', borderRadius: '50%',
    background: 'var(--shell-yellow)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '800', color: 'var(--shell-red)', flexShrink: 0,
  },
  name: { fontWeight: '700', color: 'var(--label)' },
  email: { color: 'var(--gray-500)', fontSize: '12px' },
  dept: { color: 'var(--gray-500)' },
  actions: { display: 'flex', gap: '4px', alignItems: 'center' },
  actionBtn: {
    background: '#fff',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--gray-600)',
    fontSize: '14px', cursor: 'pointer',
    width: '30px', height: '30px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 0' },
  spinner: {
    width: '32px', height: '32px', borderRadius: '50%',
    border: '3px solid var(--gray-200)',
    borderTopColor: 'var(--shell-red)',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { fontSize: '13px', color: 'var(--label-tertiary)' },
  empty: {
    textAlign: 'center', padding: '60px 0',
    color: 'var(--label-tertiary)', fontSize: '14px',
  },
};
