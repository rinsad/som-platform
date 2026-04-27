import { useState } from 'react';
import { PERMISSION_TREE } from '../../services/usersService';

const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete'];
const ACTION_LABELS = { can_view: 'View', can_create: 'Create', can_edit: 'Edit', can_delete: 'Delete' };

/**
 * permissions: Map<resource_key, { can_view, can_create, can_edit, can_delete }>
 * onChange(resource_key, level, action, value)
 */
export default function PermissionsPanel({ permissions, onChange }) {
  const [openApps, setOpenApps]       = useState({});
  const [openModules, setOpenModules] = useState({});
  const [openPages, setOpenPages]     = useState({});

  const perm = (key) => permissions[key] ?? {};

  const toggle = (key, level, action, value) => onChange(key, level, action, value);

  // When a parent is checked for an action, cascade down
  const cascadeApp = (app, action, value) => {
    toggle(app.key, 'application', action, value);
    for (const mod of app.modules) {
      toggle(mod.key, 'module', action, value);
      for (const page of mod.pages) {
        toggle(page.key, 'page', action, value);
        for (const field of (page.fields ?? [])) {
          toggle(field.key, 'field', action, value);
        }
      }
    }
  };

  const cascadeMod = (mod, action, value) => {
    toggle(mod.key, 'module', action, value);
    for (const page of mod.pages) {
      toggle(page.key, 'page', action, value);
      for (const field of (page.fields ?? [])) {
        toggle(field.key, 'field', action, value);
      }
    }
  };

  const cascadePage = (page, action, value) => {
    toggle(page.key, 'page', action, value);
    for (const field of (page.fields ?? [])) {
      toggle(field.key, 'field', action, value);
    }
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.headerTitle}>Permissions</span>
        <div style={s.headerCols}>
          {ACTIONS.map(a => (
            <span key={a} style={s.colLabel}>{ACTION_LABELS[a]}</span>
          ))}
        </div>
      </div>

      {PERMISSION_TREE.map(app => {
        const appOpen = openApps[app.key];
        return (
          <div key={app.key} style={s.appBlock}>
            {/* Application row */}
            <div style={s.appRow}>
              <button
                type="button"
                style={s.toggleBtn}
                onClick={() => setOpenApps(o => ({ ...o, [app.key]: !o[app.key] }))}
              >
                <span style={{ ...s.chevron, transform: appOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                <span style={s.appIcon}>{app.icon}</span>
                <span style={s.appLabel}>{app.label}</span>
                <span style={s.levelBadge('application')}>App</span>
              </button>
              <div style={s.checkboxRow}>
                {ACTIONS.map(action => (
                  <input
                    key={action}
                    type="checkbox"
                    style={s.checkbox}
                    checked={!!perm(app.key)[action]}
                    onChange={e => cascadeApp(app, action, e.target.checked)}
                  />
                ))}
              </div>
            </div>

            {/* Module rows */}
            {appOpen && app.modules.map(mod => {
              const modOpen = openModules[mod.key];
              return (
                <div key={mod.key}>
                  <div style={s.modRow}>
                    <button
                      type="button"
                      style={s.toggleBtn}
                      onClick={() => setOpenModules(o => ({ ...o, [mod.key]: !o[mod.key] }))}
                    >
                      <span style={{ ...s.chevron, transform: modOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                      <span style={s.modLabel}>{mod.label}</span>
                      <span style={s.levelBadge('module')}>Module</span>
                    </button>
                    <div style={s.checkboxRow}>
                      {ACTIONS.map(action => (
                        <input
                          key={action}
                          type="checkbox"
                          style={s.checkbox}
                          checked={!!perm(mod.key)[action]}
                          onChange={e => cascadeMod(mod, action, e.target.checked)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Page rows */}
                  {modOpen && mod.pages.map(page => {
                    const pageOpen = openPages[page.key];
                    return (
                      <div key={page.key}>
                        <div style={s.pageRow}>
                          <button
                            type="button"
                            style={s.toggleBtn}
                            onClick={() => setOpenPages(o => ({ ...o, [page.key]: !o[page.key] }))}
                          >
                            <span style={{ ...s.chevron, transform: pageOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                            <span style={s.pageLabel}>{page.label}</span>
                            <span style={s.levelBadge('page')}>Page</span>
                          </button>
                          <div style={s.checkboxRow}>
                            {ACTIONS.map(action => (
                              <input
                                key={action}
                                type="checkbox"
                                style={s.checkbox}
                                checked={!!perm(page.key)[action]}
                                onChange={e => cascadePage(page, action, e.target.checked)}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Field rows */}
                        {pageOpen && (page.fields ?? []).map(field => (
                          <div key={field.key} style={s.fieldRow}>
                            <div style={s.fieldLabelWrap}>
                              <span style={s.fieldDot}>·</span>
                              <span style={s.fieldLabel}>{field.label}</span>
                              <span style={s.levelBadge('field')}>Field</span>
                            </div>
                            <div style={s.checkboxRow}>
                              {ACTIONS.map(action => (
                                <input
                                  key={action}
                                  type="checkbox"
                                  style={s.checkbox}
                                  checked={!!perm(field.key)[action]}
                                  onChange={e => toggle(field.key, 'field', action, e.target.checked)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const s = {
  root: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.02)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(221,29,33,0.18)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.70)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  headerCols: {
    display: 'flex',
    gap: '0',
  },
  colLabel: {
    width: '64px',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  appBlock: {
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  appRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.04)',
    cursor: 'default',
  },
  modRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 14px 7px 32px',
    background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid rgba(255,255,255,0.03)',
  },
  pageRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 14px 6px 52px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 14px 5px 72px',
    borderTop: '1px solid rgba(255,255,255,0.02)',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flex: 1,
  },
  chevron: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.30)',
    display: 'inline-block',
    transition: 'transform 0.15s ease',
    flexShrink: 0,
  },
  appIcon: {
    fontSize: '14px',
    color: 'rgba(255,213,0,0.80)',
  },
  appLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  modLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.70)',
  },
  pageLabel: {
    fontSize: '12px',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.60)',
  },
  fieldLabelWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },
  fieldDot: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.20)',
    lineHeight: 1,
    marginTop: '-2px',
  },
  fieldLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.50)',
  },
  levelBadge: (level) => ({
    fontSize: '9px',
    fontWeight: '600',
    padding: '1px 5px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    background: level === 'application' ? 'rgba(221,29,33,0.30)'
              : level === 'module'      ? 'rgba(255,213,0,0.20)'
              : level === 'page'        ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.05)',
    color: level === 'application' ? '#FF9494'
         : level === 'module'      ? '#FFD500'
         : level === 'page'        ? 'rgba(255,255,255,0.55)'
         : 'rgba(255,255,255,0.35)',
  }),
  checkboxRow: {
    display: 'flex',
    gap: '0',
    flexShrink: 0,
  },
  checkbox: {
    width: '64px',
    cursor: 'pointer',
    accentColor: '#DD1D21',
  },
};
