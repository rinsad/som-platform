import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ROLES = ['Admin', 'Manager', 'Finance', 'Employee'];
const DEPARTMENTS = ['IT', 'Operations', 'Finance', 'Retail', 'HR', 'Legal', 'Commercial', 'Engineering'];

export default function UserFormModal({ user, onSave, onClose }) {
  const isEdit = !!user;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    employee_id: '',
    full_name:   '',
    email:       '',
    password:    '',
    role:        'Employee',
    department:  '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        employee_id: user.employee_id ?? '',
        full_name:   user.full_name   ?? '',
        email:       user.email       ?? '',
        password:    '',
        role:        user.role        ?? 'Employee',
        department:  user.department  ?? '',
      });
    }
  }, [user]);

  const handleField = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      await onSave(payload);
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>{isEdit ? 'Edit User' : 'Create New User'}</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.body}>
            <div style={s.row}>
              <Field label="Employee ID" name="employee_id" value={form.employee_id}
                onChange={handleField} placeholder="EMP-0001" />
              <Field label="Full Name *" name="full_name" value={form.full_name}
                onChange={handleField} placeholder="Mohammed Al-Rashidi" required />
            </div>
            <div style={s.row}>
              <Field label="Email *" name="email" type="email" value={form.email}
                onChange={handleField} placeholder="m.alrashidi@shell.om" required />
              <Field
                label={isEdit ? 'New Password (leave blank to keep)' : 'Password *'}
                name="password" type="password" value={form.password}
                onChange={handleField}
                required={!isEdit}
              />
            </div>
            <div style={s.row}>
              <SelectField label="Role *" name="role" value={form.role}
                onChange={handleField} options={ROLES} />
              <SelectField label="Department" name="department" value={form.department}
                onChange={handleField} options={['', ...DEPARTMENTS]} />
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <div style={s.footer}>
            {isEdit && (
              <button
                type="button"
                style={s.permBtn}
                onClick={() => { onClose(); navigate(`/admin/users/${user.id}/permissions`); }}
              >
                Manage Permissions →
              </button>
            )}
            <div style={s.footerRight}>
              <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
              <button type="submit" style={s.saveBtn} disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div style={s.fieldWrap}>
      <label style={s.label}>{label}</label>
      <input
        style={s.input}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div style={s.fieldWrap}>
      <label style={s.label}>{label}</label>
      <select style={{ ...s.input, cursor: 'pointer' }} name={name} value={value} onChange={onChange}>
        {options.map(o => <option key={o} value={o}>{o || '— none —'}</option>)}
      </select>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  },
  modal: {
    background: '#fff',
    border: '1px solid #e1e1e1',
    borderRadius: '4px',
    width: '100%',
    maxWidth: '760px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-xl)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
    flexShrink: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#222',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#777',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    lineHeight: 1,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  body: {
    padding: '20px 24px',
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  row: {
    display: 'flex',
    gap: '14px',
  },
  fieldWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  input: {
    background: '#fafafa',
    border: '1px solid #d8d8d8',
    borderRadius: '4px',
    padding: '9px 12px',
    fontSize: '14px',
    color: '#222',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    margin: '0 24px',
    padding: '10px 14px',
    background: '#fff1f1',
    border: '1px solid #ffd3d3',
    borderRadius: '4px',
    color: '#DD1D21',
    fontSize: '13px',
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '16px 24px',
    borderTop: '1px solid #e1e1e1',
    flexShrink: 0,
  },
  footerRight: {
    display: 'flex',
    gap: '10px',
  },
  permBtn: {
    padding: '9px 18px',
    borderRadius: '4px',
    border: '1px solid #ffd3d3',
    background: '#fff1f1',
    color: '#DD1D21',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '9px 20px',
    borderRadius: '4px',
    border: '1px solid #d8d8d8',
    background: '#fff',
    color: '#333',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 24px',
    borderRadius: '4px',
    border: 'none',
    background: '#DD1D21',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
  },
};
