import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../../services/usersService';
import UserFormModal from './UserFormModal';

const ROLE_COLOURS = {
  Admin:    { bg: '#fff1f1', text: '#DD1D21' },
  Manager:  { bg: '#fff8cc', text: '#8a5d00' },
  Finance:  { bg: '#ecfdf5', text: '#047857' },
  Employee: { bg: '#f4f4f4', text: '#525252' },
};

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
    } else {
      await usersService.create(payload);
    }
    setModalUser(undefined);
    loadUsers();
  };

  const handleDeactivate = async (user) => {
    try {
      await usersService.deactivate(user.id);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to deactivate');
    }
    setConfirm(null);
  };

  const handleDelete = async (user) => {
    try {
      await usersService.delete(user.id);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to delete');
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

  return (
    <div style={s.root}>
      {/* Page header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>User Management</h1>
          <p style={s.pageSubtitle}>Create users and manage application, module, page, and field-level permissions.</p>
        </div>
        <button style={s.newBtn} onClick={openNew}>
          <span style={s.plusIcon}>+</span> New User
        </button>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label: 'Total Users',    value: stats.total,    colour: '#7EB3FF' },
          { label: 'Active',         value: stats.active,   colour: '#34C759' },
          { label: 'Inactive',       value: stats.inactive, colour: '#FF8A8A' },
          { label: 'Administrators', value: stats.admins,   colour: '#FFD500' },
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
                const rc = ROLE_COLOURS[user.role] ?? ROLE_COLOURS.Employee;
                return (
                  <tr key={user.id} style={{ ...s.tr, background: i % 2 === 0 ? 'transparent' : '#fafafa' }}>
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
                      <span style={{ ...s.roleBadge, background: rc.bg, color: rc.text }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={s.td}><span style={s.dept}>{user.department ?? '—'}</span></td>
                    <td style={s.td}>
                      <span style={user.is_active ? s.activeChip : s.inactiveChip}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        <button style={s.actionBtn} onClick={() => openEdit(user)} title="Edit">✎</button>
                        {user.is_active && (
                          <button
                            style={{ ...s.actionBtn, color: '#8a5d00' }}
                            onClick={() => setConfirm({ type: 'deactivate', user })}
                            title="Deactivate"
                          >⊘</button>
                        )}
                        <button
                          style={{ ...s.actionBtn, color: '#DD1D21' }}
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

      {/* Confirm dialog */}
      {confirm && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setConfirm(null)}>
          <div style={s.confirmBox}>
            <p style={s.confirmTitle}>
              {confirm.type === 'delete' ? 'Delete User' : 'Deactivate User'}
            </p>
            <p style={s.confirmBody}>
              {confirm.type === 'delete'
                ? `Permanently delete ${confirm.user.full_name}? This cannot be undone.`
                : `Deactivate ${confirm.user.full_name}? They will no longer be able to log in.`}
            </p>
            <div style={s.confirmActions}>
              <button style={s.cancelBtn} onClick={() => setConfirm(null)}>Cancel</button>
              <button
                style={{ ...s.dangerBtn, background: confirm.type === 'delete' ? '#DD1D21' : '#f59e0b' }}
                onClick={() => confirm.type === 'delete' ? handleDelete(confirm.user) : handleDeactivate(confirm.user)}
              >
                {confirm.type === 'delete' ? 'Delete' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    fontSize: '24px', fontWeight: '800', color: '#222', margin: 0,
  },
  pageSubtitle: {
    fontSize: '13px', color: '#666', margin: '4px 0 0',
  },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 20px',
    background: '#DD1D21',
    border: 'none', borderRadius: '4px',
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
    border: '1px solid #e1e1e1',
    borderRadius: '4px',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statValue: {
    fontSize: '28px', fontWeight: '700', lineHeight: 1,
  },
  statLabel: {
    fontSize: '12px', color: '#666', fontWeight: '700',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  searchWrap: {
    flex: 1, display: 'flex', alignItems: 'center',
    background: '#fff',
    border: '1px solid #e1e1e1',
    borderRadius: '4px', overflow: 'hidden',
  },
  searchIcon: {
    padding: '0 10px 0 14px', fontSize: '16px', color: '#8a8a8a',
  },
  searchInput: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#222', fontSize: '13px', padding: '10px 12px 10px 0',
  },
  errorBanner: {
    padding: '12px 16px',
    background: '#fff1f1',
    border: '1px solid #ffd3d3',
    borderRadius: '4px',
    color: '#DD1D21', fontSize: '13px', fontWeight: 700,
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid #e1e1e1',
    borderRadius: '4px',
    background: '#fff',
    boxShadow: 'var(--shadow-sm)',
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 14px',
    fontSize: '11px', fontWeight: '600',
    color: '#777',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    textAlign: 'left',
    borderBottom: '1px solid #e1e1e1',
    whiteSpace: 'nowrap',
  },
  tr: {
    transition: 'background 0.1s',
  },
  td: {
    padding: '12px 14px',
    fontSize: '13px', color: '#333',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  },
  empId: {
    fontFamily: 'monospace', fontSize: '12px',
    color: '#777',
  },
  avatar: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatarCircle: {
    width: '30px', height: '30px', borderRadius: '50%',
    background: '#FFD500',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '800', color: '#DD1D21', flexShrink: 0,
  },
  name: { fontWeight: '700', color: '#222' },
  email: { color: '#666', fontSize: '12px' },
  roleBadge: {
    display: 'inline-block',
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '11px', fontWeight: '600',
  },
  dept: { color: '#666' },
  activeChip: {
    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
    background: '#ecfdf5', color: '#047857',
    fontSize: '11px', fontWeight: '600',
  },
  inactiveChip: {
    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
    background: '#f4f4f4', color: '#777',
    fontSize: '11px', fontWeight: '600',
  },
  actions: { display: 'flex', gap: '4px', alignItems: 'center' },
  actionBtn: {
    background: '#fff',
    border: '1px solid #e1e1e1',
    borderRadius: '4px',
    color: '#555',
    fontSize: '14px', cursor: 'pointer',
    width: '30px', height: '30px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 0' },
  spinner: {
    width: '32px', height: '32px', borderRadius: '50%',
    border: '3px solid #e1e1e1',
    borderTopColor: '#DD1D21',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { fontSize: '13px', color: '#777' },
  empty: {
    textAlign: 'center', padding: '60px 0',
    color: '#777', fontSize: '14px',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 900,
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  confirmBox: {
    background: '#fff',
    border: '1px solid #e1e1e1',
    borderRadius: '4px', padding: '28px 28px 20px',
    maxWidth: '380px', width: '100%',
    boxShadow: 'var(--shadow-xl)',
  },
  confirmTitle: {
    fontSize: '17px', fontWeight: '800', color: '#222', margin: '0 0 10px',
  },
  confirmBody: {
    fontSize: '13px', color: '#666', margin: '0 0 20px', lineHeight: 1.5,
  },
  confirmActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  cancelBtn: {
    padding: '8px 18px', borderRadius: '4px',
    border: '1px solid #d6d6d6',
    background: '#fff', color: '#333',
    fontSize: '13px', fontWeight: '800', cursor: 'pointer',
  },
  dangerBtn: {
    padding: '8px 18px', borderRadius: '4px',
    border: 'none', color: '#fff',
    fontSize: '13px', fontWeight: '800', cursor: 'pointer',
  },
};
