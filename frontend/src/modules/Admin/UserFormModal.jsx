import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { USER_ROLES } from '../../services/usersService';
import BrandSelect from '../../components/SelectField';

const DEPARTMENTS = ['IT', 'Operations', 'Finance', 'Retail', 'HR', 'Legal', 'Commercial', 'Engineering', 'Procurement', 'Internal Audit', 'Assets', 'HSSE'];

export default function UserFormModal({ user, businessFunctions = [], roleScopes = [], onSave, onClose }) {
  const isEdit = !!user;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    employee_id: '',
    full_name:   '',
    email:       '',
    password:    '',
    role:        'Employee',
    department:  '',
    business_function_id: '',
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
        business_function_id: user.business_function_id ?? '',
      });
    }
  }, [user]);

  const handleField = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Company-wide roles (CEO/Board, CFO, Admin, audit and the central functions)
  // see every business, so they need no Business / Function. Every other role is
  // scoped to one, and without it the user sees nothing once scoping is
  // enforced — so require it here rather than let them be created blind.
  const roleScope = roleScopes.find((entry) => entry.role === form.role);
  const businessRequired = roleScope ? roleScope.requiresBusiness : false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (businessRequired && !form.business_function_id) {
      setError(`The ${form.role} role is scoped to one Business / Function — select one.`);
      return;
    }
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
    <div
      role="presentation"
      style={s.overlay}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>{isEdit ? 'Edit User' : 'Create New User'}</h2>
          <button type="button" style={s.closeBtn} onClick={onClose}>✕</button>
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
                onChange={handleField} options={USER_ROLES} />
              <SelectField label="Department" name="department" value={form.department}
                onChange={handleField} options={['', ...DEPARTMENTS]} />
            </div>
            <div style={s.row}>
              <SelectField
                label={businessRequired ? 'Business / Function *' : 'Business / Function'}
                name="business_function_id"
                value={form.business_function_id}
                onChange={handleField}
                options={[{ value: '', label: '— none —' }, ...businessFunctions.map((item) => ({ value: item.id, label: item.name }))]}
                hint={roleScope && !businessRequired
                  ? `${form.role} is a company-wide role — no Business / Function required.`
                  : businessRequired
                    ? `${form.role} only sees CAPEX and purchase requests for the selected Business / Function.`
                    : null}
              />
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
  const id = `user-${name}`;
  return (
    <div style={s.fieldWrap}>
      <label htmlFor={id} style={s.label}>{label}</label>
      <input
        id={id}
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

// Sentinel so an empty-string ("— none —") choice stays selectable — Radix
// Select items require non-empty values.
const NONE = '__none__';

function SelectField({ label, name, value, onChange, options, hint }) {
  const id = `user-${name}`;
  const normalizedOptions = options.map((option) => {
    if (option !== null && typeof option === 'object') {
      return { value: option.value === '' ? NONE : option.value, label: option.label };
    }
    return { value: option === '' ? NONE : option, label: option || '— none —' };
  });
  return (
    <div style={s.fieldWrap}>
      <label htmlFor={id} style={s.label}>{label}</label>
      <BrandSelect
        id={id}
        name={name}
        value={value === '' ? NONE : value}
        onChange={(v) => onChange({ target: { name, value: v === NONE ? '' : v } })}
        options={normalizedOptions}
        style={{ ...s.input, cursor: 'pointer' }}
        aria-label={label}
      />
      {hint && <span style={s.hint}>{hint}</span>}
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
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)',
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
    color: 'var(--label)',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--label-tertiary)',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
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
    color: 'var(--gray-500)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  input: {
    background: 'var(--gray-50)',
    border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-xs)',
    padding: '9px 12px',
    fontSize: '14px',
    color: 'var(--label)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '11.5px',
    color: 'var(--label-tertiary)',
    lineHeight: 1.4,
  },
  error: {
    margin: '0 24px',
    padding: '10px 14px',
    background: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-line)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--shell-red)',
    fontSize: '13px',
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '16px 24px',
    borderTop: '1px solid var(--gray-200)',
    flexShrink: 0,
  },
  footerRight: {
    display: 'flex',
    gap: '10px',
  },
  permBtn: {
    padding: '9px 18px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--accent-red-line)',
    background: 'var(--accent-red-bg)',
    color: 'var(--shell-red)',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
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
};
