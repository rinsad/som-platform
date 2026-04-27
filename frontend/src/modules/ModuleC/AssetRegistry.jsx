import { useState, useEffect, useRef } from 'react';
import {
  Chart, LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import {
  getAssets, getAlerts, createAsset,
  getBillsBySite, createBill,
  getWorkOrders, createWorkOrder,
} from '../../services/assetsService';

if (typeof Chart.register === 'function') {
  Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);
}

const SITES = [
  { id: 'SITE-001', label: 'Al Khuwair Station — Muscat' },
  { id: 'SITE-003', label: 'Salalah Main Station — Salalah' },
  { id: 'SITE-004', label: 'Sohar Industrial Station — Sohar' },
];

const UTILITY_COLORS = { Electricity: '#FFD500', Water: '#0ea5e9', Gas: '#f97316' };

const STATUS_STYLE = {
  Active:      { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', border: 'rgba(52,211,153,0.30)' },
  Maintenance: { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.30)' },
  Inactive:    { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.42)', border: 'rgba(255,255,255,0.15)' },
};

const WO_STATUS_STYLE = {
  Open:          { bg: 'rgba(107,159,255,0.15)', color: '#6b9fff', border: 'rgba(107,159,255,0.30)' },
  'In Progress': { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.30)' },
  Completed:     { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', border: 'rgba(52,211,153,0.30)' },
};

const PRIORITY_STYLE = {
  Low:      { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.42)', border: 'rgba(255,255,255,0.15)' },
  Medium:   { bg: 'rgba(107,159,255,0.15)', color: '#6b9fff',                border: 'rgba(107,159,255,0.30)' },
  High:     { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24',                border: 'rgba(251,191,36,0.30)' },
  Critical: { bg: 'rgba(220,38,38,0.15)',   color: '#ff6b6b',                border: 'rgba(220,38,38,0.35)' },
};

const EQUIP_TYPES  = ['Generator', 'Dispenser', 'HVAC', 'Security', 'Lighting', 'Electrical', 'Pump', 'Other'];
const REGIONS      = ['Muscat', 'Salalah', 'Sohar'];
const DEPARTMENTS  = ['Operations', 'Retail', 'Facilities', 'Infrastructure', 'QHSE', 'Technology'];

function fmtOMR(v) { return `OMR ${Number(v).toLocaleString('en-GB')}`; }

function Badge({ text, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
      border: `1px solid ${style.border}`, background: style.bg, color: style.color,
    }}>
      {text}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, gap: 12 }}>
      <div style={{ width: 34, height: 34, border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#DD1D21', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Loading…</p>
    </div>
  );
}

function StatCard({ label, value, color, bg, icon }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      </div>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
    </div>
  );
}

// ─── Hierarchical Tree View ───────────────────────────────────────────────────
function buildTree(assets) {
  const tree = {};
  assets.forEach((asset) => {
    const r = asset.region;
    const s = asset.site;
    const f = asset.facility;
    if (!tree[r]) tree[r] = {};
    if (!tree[r][s]) tree[r][s] = {};
    if (!tree[r][s][f]) tree[r][s][f] = [];
    tree[r][s][f].push(asset);
  });
  return tree;
}

function AssetTreeView({ assets }) {
  const tree = buildTree(assets);
  const [expanded, setExpanded] = useState(() => new Set(Object.keys(tree).map((r) => `r:${r}`)));

  function toggle(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (assets.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
        No assets match the current filter.
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ padding: '10px 16px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Region → Site → Facility → Equipment</span>
        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{assets.length} assets</span>
      </div>

      {Object.entries(tree).map(([region, sites]) => {
        const regionKey   = `r:${region}`;
        const regionOpen  = expanded.has(regionKey);
        const regionCount = Object.values(sites).flatMap((s) => Object.values(s)).flat().length;

        return (
          <div key={region}>
            {/* Region */}
            <div
              onClick={() => toggle(regionKey)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--gray-100)', userSelect: 'none' }}
            >
              <span style={{ fontSize: 11, color: 'var(--gray-400)', width: 14, flexShrink: 0 }}>{regionOpen ? '▼' : '▶'}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)' }}>🗺 {region} Region</span>
              <span style={{ marginLeft: 'auto', background: 'var(--gray-200)', color: 'var(--gray-600)', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 9999 }}>{regionCount}</span>
            </div>

            {regionOpen && Object.entries(sites).map(([site, facilities]) => {
              const siteKey   = `s:${region}:${site}`;
              const siteOpen  = expanded.has(siteKey);
              const siteCount = Object.values(facilities).flat().length;

              return (
                <div key={site}>
                  {/* Site */}
                  <div
                    onClick={() => toggle(siteKey)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px 9px 32px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--gray-100)', userSelect: 'none' }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', width: 14, flexShrink: 0 }}>{siteOpen ? '▼' : '▶'}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gray-700)' }}>📍 {site}</span>
                    <span style={{ marginLeft: 'auto', background: 'rgba(107,159,255,0.18)', color: '#6b9fff', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 9999 }}>{siteCount}</span>
                  </div>

                  {siteOpen && Object.entries(facilities).map(([facility, assetList]) => {
                    const facKey  = `f:${region}:${site}:${facility}`;
                    const facOpen = expanded.has(facKey);

                    return (
                      <div key={facility}>
                        {/* Facility */}
                        <div
                          onClick={() => toggle(facKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 8px 52px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', userSelect: 'none' }}
                        >
                          <span style={{ fontSize: 11, color: 'var(--gray-400)', width: 14, flexShrink: 0 }}>{facOpen ? '▼' : '▶'}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>🏗 {facility}</span>
                          <span style={{ marginLeft: 'auto', background: 'rgba(52,211,153,0.15)', color: '#34d399', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 9999 }}>{assetList.length}</span>
                        </div>

                        {/* Equipment rows */}
                        {facOpen && assetList.map((asset) => {
                          const ss = STATUS_STYLE[asset.status] || STATUS_STYLE.Inactive;
                          return (
                            <div
                              key={asset.assetCode}
                              data-testid="asset-tree-row"
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 8px 72px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}
                            >
                              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--gray-500)', minWidth: 175, flexShrink: 0 }}>{asset.assetCode}</span>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-800)', flex: 1 }}>{asset.name}</span>
                              <span style={{ fontSize: 12, color: 'var(--gray-500)', minWidth: 80, flexShrink: 0 }}>{asset.equipmentType}</span>
                              <Badge text={asset.status} style={ss} />
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
      })}
    </div>
  );
}

// ─── Tab 1: Asset Registry ────────────────────────────────────────────────────
function AssetsTab() {
  const [assets, setAssets]       = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [region, setRegion]       = useState('ALL');
  const [expanded, setExpanded]   = useState(null);
  const [viewMode, setViewMode]   = useState('tree');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm]     = useState({
    name: '', region: 'Muscat', site: '', facility: '',
    equipmentType: 'Generator', department: 'Operations', status: 'Active',
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addErr, setAddErr]       = useState('');

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [assetsData, alertsData] = await Promise.all([getAssets(), getAlerts()]);
      setAssets(assetsData);
      setAlerts(alertsData);
    } catch { setError('Failed to load assets. Please retry.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const regions  = ['ALL', ...new Set(assets.map((a) => a.region))];
  const filtered = assets.filter((a) => {
    const matchRegion = region === 'ALL' || a.region === region;
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.assetCode.toLowerCase().includes(q);
    return matchRegion && matchSearch;
  });

  const alertBg = (days) => {
    if (days < 7)  return { bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.30)', color: '#ff6b6b', icon: '🔴' };
    if (days < 30) return { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.30)', color: '#fbbf24', icon: '🟡' };
    return { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.30)', color: '#34d399', icon: '🟢' };
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim())     { setAddErr('Asset name is required.'); return; }
    if (!addForm.site.trim())     { setAddErr('Site is required.'); return; }
    if (!addForm.facility.trim()) { setAddErr('Facility is required.'); return; }
    setAddSaving(true); setAddErr('');
    try {
      await createAsset(addForm);
      setShowAddForm(false);
      setAddForm({ name: '', region: 'Muscat', site: '', facility: '', equipmentType: 'Generator', department: 'Operations', status: 'Active' });
      fetchAll();
    } catch { setAddErr('Failed to register asset. Please try again.'); }
    finally { setAddSaving(false); }
  };

  if (loading) return <Spinner />;
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
      <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', color: '#ff6b6b', padding: '12px 20px', borderRadius: 10, fontSize: 14 }}>{error}</div>
      <button onClick={fetchAll} style={btn.retry}>Retry</button>
    </div>
  );

  return (
    <div>
      {/* Compliance alerts banner */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {alerts.map((al) => {
            const c = alertBg(al.daysRemaining);
            return (
              <div key={al.alertId} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
                <div>
                  <span style={{ fontWeight: 700, color: c.color, fontSize: 13 }}>{al.type} · {al.assetCode}</span>
                  <p style={{ color: c.color, fontSize: 13, marginTop: 2 }}>{al.message}</p>
                </div>
                <span style={{ marginLeft: 'auto', background: c.border, color: c.color, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 9999, flexShrink: 0 }}>
                  {al.daysRemaining === 0 ? 'BREACHED' : `${al.daysRemaining}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          data-testid="search-assets"
          type="text"
          placeholder="Search by name or asset code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: '9px 13px', border: '1px solid var(--gray-200)', borderRadius: 9, fontSize: 13.5, background: 'var(--gray-50)', fontFamily: 'inherit', outline: 'none' }}
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{ padding: '9px 13px', border: '1px solid var(--gray-200)', borderRadius: 9, fontSize: 13.5, background: 'var(--gray-50)', fontFamily: 'inherit', color: 'var(--gray-700)' }}
        >
          {regions.map((r) => <option key={r} value={r}>{r === 'ALL' ? 'All Regions' : r}</option>)}
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 8, padding: 3, gap: 2 }}>
          {[{ id: 'tree', label: '🌲 Tree' }, { id: 'table', label: '📋 Table' }].map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              style={{
                padding: '5px 12px', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                background: viewMode === v.id ? 'var(--surface)' : 'transparent',
                color:      viewMode === v.id ? 'var(--gray-900)' : 'var(--gray-500)',
                boxShadow:  viewMode === v.id ? 'var(--shadow-xs)' : 'none',
              }}
            >{v.label}</button>
          ))}
        </div>

        <button onClick={() => { setShowAddForm((v) => !v); setAddErr(''); }} style={btn.primary}>
          {showAddForm ? '✕ Cancel' : '+ Register Asset'}
        </button>
      </div>

      {/* Register asset form */}
      {showAddForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>Register New Asset</h3>
          <p style={{ fontSize: 12.5, color: 'var(--gray-400)', marginBottom: 16 }}>Asset code is auto-generated from location and equipment type.</p>
          <form onSubmit={handleAddAsset}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="asset-name" style={frm.label}>Asset Name</label>
                <input id="asset-name" type="text" placeholder="e.g. Fuel Dispenser Unit 3" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} style={frm.input} />
              </div>
              <div>
                <label htmlFor="asset-region" style={frm.label}>Region</label>
                <select id="asset-region" value={addForm.region} onChange={(e) => setAddForm((f) => ({ ...f, region: e.target.value }))} style={frm.input}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="asset-site" style={frm.label}>Site</label>
                <input id="asset-site" type="text" placeholder="e.g. Al Khuwair Station" value={addForm.site} onChange={(e) => setAddForm((f) => ({ ...f, site: e.target.value }))} style={frm.input} />
              </div>
              <div>
                <label htmlFor="asset-facility" style={frm.label}>Facility</label>
                <input id="asset-facility" type="text" placeholder="e.g. Main Forecourt" value={addForm.facility} onChange={(e) => setAddForm((f) => ({ ...f, facility: e.target.value }))} style={frm.input} />
              </div>
              <div>
                <label htmlFor="asset-type" style={frm.label}>Equipment Type</label>
                <select id="asset-type" value={addForm.equipmentType} onChange={(e) => setAddForm((f) => ({ ...f, equipmentType: e.target.value }))} style={frm.input}>
                  {EQUIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="asset-dept" style={frm.label}>Department</label>
                <select id="asset-dept" value={addForm.department} onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))} style={frm.input}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="asset-status" style={frm.label}>Status</label>
                <select id="asset-status" value={addForm.status} onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))} style={frm.input}>
                  {['Active', 'Maintenance', 'Inactive'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {addErr && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>⚠ {addErr}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={addSaving} style={{ ...btn.saveForm, ...(addSaving ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}>
                {addSaving ? 'Registering…' : 'Register Asset'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} style={btn.cancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Asset content: tree or flat table */}
      {viewMode === 'tree' ? (
        <AssetTreeView assets={filtered} />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {['Asset Code', 'Name', 'Region', 'Site', 'Facility', 'Type', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>No assets found</td></tr>
              ) : filtered.map((asset, i) => {
                const isOpen = expanded === asset.assetCode;
                const ss = STATUS_STYLE[asset.status] || STATUS_STYLE.Inactive;
                return (
                  <>
                    <tr
                      key={asset.assetCode}
                      data-testid="asset-row"
                      onClick={() => setExpanded(isOpen ? null : asset.assetCode)}
                      style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s', borderBottom: isOpen ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--gray-700)', fontFamily: 'monospace', fontSize: 12.5 }}>{asset.assetCode}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--gray-800)' }}>{asset.name}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-500)' }}>{asset.region}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-500)' }}>{asset.site}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-500)' }}>{asset.facility}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-600)' }}>{asset.equipmentType}</td>
                      <td style={{ padding: '12px 14px' }}><Badge text={asset.status} style={ss} /></td>
                    </tr>
                    {isOpen && (
                      <tr key={`${asset.assetCode}-detail`} style={{ background: 'rgba(107,159,255,0.08)' }}>
                        <td colSpan={7} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(107,159,255,0.20)' }}>
                          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                            <div><span style={exp.label}>Asset Code</span><span style={exp.value}>{asset.assetCode}</span></div>
                            <div><span style={exp.label}>Department</span><span style={exp.value}>{asset.department}</span></div>
                            <div><span style={exp.label}>Status</span><Badge text={asset.status} style={ss} /></div>
                            <div><span style={exp.label}>Region</span><span style={exp.value}>{asset.region}</span></div>
                            <div><span style={exp.label}>Site</span><span style={exp.value}>{asset.site}</span></div>
                            <div><span style={exp.label}>Facility</span><span style={exp.value}>{asset.facility}</span></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 10, fontSize: 12, color: 'var(--gray-400)', textAlign: 'right' }}>Showing {filtered.length} of {assets.length} assets</p>
    </div>
  );
}

// ─── Tab 2: Utilities & Billing ───────────────────────────────────────────────
function UtilitiesTab() {
  const [siteId, setSiteId]     = useState('SITE-001');
  const [bills, setBills]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ utilityType: 'Electricity', period: '', meterReading: '', amount: '' });
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const [saveErr, setSaveErr]   = useState('');
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  const fetchBills = async () => {
    setLoading(true); setError('');
    try {
      const data = await getBillsBySite(siteId);
      setBills(data.bills || {});
    } catch { setError('Failed to load utility data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBills(); }, [siteId]);

  useEffect(() => {
    if (loading || !chartRef.current || !Object.keys(bills).length) return;

    const allPeriods = [...new Set(Object.values(bills).flat().map((b) => b.period))].sort();

    const datasets = Object.entries(bills).map(([type, entries]) => {
      const byPeriod = Object.fromEntries(entries.map((e) => [e.period, e.amount]));
      return {
        label: type,
        data: allPeriods.map((p) => byPeriod[p] ?? null),
        borderColor: UTILITY_COLORS[type] || '#888',
        backgroundColor: (UTILITY_COLORS[type] || '#888') + '18',
        borderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
        tension: 0.4, fill: false, spanGaps: true,
      };
    });

    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current, {
      type: 'line',
      data: { labels: allPeriods, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtOMR(ctx.parsed.y)}` } },
        },
        scales: { y: { ticks: { callback: (v) => fmtOMR(v) } } },
      },
    });
    return () => { if (chartInst.current) chartInst.current.destroy(); };
  }, [bills, loading]);

  function getMetric(type) {
    const entries = bills[type];
    if (!entries || entries.length === 0) return { current: null, prev: null, trend: 0 };
    const sorted  = [...entries].sort((a, b) => a.period.localeCompare(b.period));
    const current = sorted[sorted.length - 1].amount;
    const prev    = sorted.length > 1 ? sorted[sorted.length - 2].amount : null;
    const trend   = prev !== null ? current - prev : 0;
    return { current, prev, trend };
  }

  const handleLogBill = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveMsg(''); setSaveErr('');
    try {
      await createBill({
        siteId,
        siteName: SITES.find((s) => s.id === siteId)?.label,
        ...formData,
        amount: Number(formData.amount),
      });
      setSaveMsg('Bill logged successfully.');
      setFormData({ utilityType: 'Electricity', period: '', meterReading: '', amount: '' });
      setShowForm(false);
      fetchBills();
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  const METRICS = [
    { type: 'Electricity', testId: 'metric-electricity', icon: '⚡', color: '#6b9fff', light: 'rgba(107,159,255,0.12)' },
    { type: 'Water',       testId: 'metric-water',       icon: '💧', color: '#38bdf8', light: 'rgba(56,189,248,0.12)'  },
    { type: 'Gas',         testId: 'metric-gas',         icon: '🔥', color: '#f97316', light: 'rgba(249,115,22,0.12)'  },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>Site</label>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid var(--gray-200)', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--gray-800)', background: 'var(--surface)', minWidth: 280, boxShadow: 'var(--shadow-xs)' }}
        >
          {SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button
          data-testid="btn-log-bill"
          onClick={() => { setShowForm((v) => !v); setSaveMsg(''); setSaveErr(''); }}
          style={{ ...btn.primary, marginLeft: 'auto' }}
        >
          {showForm ? '✕ Cancel' : '+ Log Bill'}
        </button>
      </div>

      {saveMsg && <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.30)', color: '#34d399', borderRadius: 9, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>✓ {saveMsg}</div>}

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16 }}>Log Utility Bill</h3>
          <form onSubmit={handleLogBill} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={frm.label}>Utility Type</label>
              <select value={formData.utilityType} onChange={(e) => setFormData((f) => ({ ...f, utilityType: e.target.value }))} style={frm.input}>
                {['Electricity', 'Water', 'Gas'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={frm.label}>Period</label>
              <input type="text" placeholder="e.g. 2026-04" value={formData.period} onChange={(e) => setFormData((f) => ({ ...f, period: e.target.value }))} required style={frm.input} />
            </div>
            <div>
              <label style={frm.label}>Meter Reading</label>
              <input type="number" placeholder="Reading" value={formData.meterReading} onChange={(e) => setFormData((f) => ({ ...f, meterReading: e.target.value }))} style={frm.input} />
            </div>
            <div>
              <label style={frm.label}>Amount (OMR)</label>
              <input type="number" placeholder="0.00" min="0.01" step="0.01" value={formData.amount} onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))} required style={frm.input} />
            </div>
            <button type="submit" disabled={saving} style={{ ...btn.saveForm, ...(saving ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
          {saveErr && <div style={{ marginTop: 10, color: '#dc2626', fontSize: 13 }}>⚠ {saveErr}</div>}
        </div>
      )}

      {loading ? <Spinner /> : error ? (
        <div style={{ color: '#ff6b6b', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', borderRadius: 10, padding: '12px 16px', fontSize: 14 }}>{error}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
            {METRICS.map((m) => {
              const { current, prev, trend } = getMetric(m.type);
              const trendUp   = trend > 0;
              const trendDown = trend < 0;
              return (
                <div key={m.type} data-testid={m.testId} style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{m.type}</span>
                    <span style={{ width: 36, height: 36, borderRadius: 9, background: m.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.icon}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: current !== null ? m.color : 'var(--gray-300)', marginBottom: 6 }}>
                    {current !== null ? fmtOMR(current) : '—'}
                  </div>
                  {prev !== null && (
                    <div style={{ fontSize: 12, color: trendUp ? '#dc2626' : trendDown ? '#16a34a' : 'var(--gray-400)', fontWeight: 500 }}>
                      {trendUp ? '↑' : trendDown ? '↓' : '→'} {fmtOMR(Math.abs(trend))} vs prev month
                    </div>
                  )}
                  {current === null && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>No data for this site</div>}
                </div>
              );
            })}
          </div>

          {Object.keys(bills).length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16 }}>6-Month Utility Trend</h3>
              <div style={{ height: 280, position: 'relative' }}>
                <canvas ref={chartRef} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab 3: Maintenance Work Orders ──────────────────────────────────────────
function MaintenanceTab() {
  const [workOrders, setWorkOrders] = useState([]);
  const [assets, setAssets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType]     = useState('ALL');
  const [showForm, setShowForm]     = useState(false);
  const [formData, setFormData]     = useState({
    assetCode: '', type: 'Planned', priority: 'Medium',
    description: '', scheduledDate: '', technician: '',
    department: '', estimatedHours: '', notes: '',
  });
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const [wos, ass] = await Promise.all([getWorkOrders(), getAssets()]);
      setWorkOrders(wos);
      setAssets(ass);
    } catch { setError('Failed to load work orders. Please retry.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = workOrders.filter((wo) => {
    const matchStatus = filterStatus === 'ALL' || wo.status === filterStatus;
    const matchType   = filterType   === 'ALL' || wo.type   === filterType;
    return matchStatus && matchType;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.assetCode)           { setSaveErr('Please select an asset.'); return; }
    if (!formData.description.trim())  { setSaveErr('Description is required.'); return; }
    if (!formData.scheduledDate)       { setSaveErr('Scheduled date is required.'); return; }
    setSaving(true); setSaveErr('');
    try {
      await createWorkOrder({ ...formData, estimatedHours: Number(formData.estimatedHours) || 0 });
      setShowForm(false);
      setFormData({ assetCode: '', type: 'Planned', priority: 'Medium', description: '', scheduledDate: '', technician: '', department: '', estimatedHours: '', notes: '' });
      fetchData();
    } catch { setSaveErr('Failed to save work order. Please try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
      <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', color: '#ff6b6b', padding: '12px 20px', borderRadius: 10, fontSize: 14 }}>{error}</div>
      <button onClick={fetchData} style={btn.retry}>Retry</button>
    </div>
  );

  const openCount     = workOrders.filter((w) => w.status === 'Open').length;
  const inProgCount   = workOrders.filter((w) => w.status === 'In Progress').length;
  const criticalCount = workOrders.filter((w) => w.priority === 'Critical').length;

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard label="Open"        value={openCount}     color="#6b9fff" bg="rgba(107,159,255,0.12)" icon="📋" />
        <StatCard label="In Progress" value={inProgCount}   color="#fbbf24" bg="rgba(251,191,36,0.12)"  icon="🔧" />
        <StatCard label="Critical"    value={criticalCount} color="#ff6b6b" bg="rgba(220,38,38,0.15)"   icon="🚨" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '9px 12px', border: '1px solid var(--gray-200)', borderRadius: 9, fontSize: 13, background: 'var(--gray-50)', fontFamily: 'inherit', color: 'var(--gray-700)' }}>
          {['ALL', 'Open', 'In Progress', 'Completed'].map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '9px 12px', border: '1px solid var(--gray-200)', borderRadius: 9, fontSize: 13, background: 'var(--gray-50)', fontFamily: 'inherit', color: 'var(--gray-700)' }}>
          {['ALL', 'Planned', 'Unplanned'].map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}
        </select>
        <button onClick={() => { setShowForm((v) => !v); setSaveErr(''); }} style={{ ...btn.primary, marginLeft: 'auto' }}>
          {showForm ? '✕ Cancel' : '+ New Work Order'}
        </button>
      </div>

      {/* New work order form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16 }}>New Work Order</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="wo-asset" style={frm.label}>Asset</label>
                <select id="wo-asset" value={formData.assetCode} onChange={(e) => setFormData((f) => ({ ...f, assetCode: e.target.value }))} style={frm.input}>
                  <option value="">Select asset…</option>
                  {assets.map((a) => <option key={a.assetCode} value={a.assetCode}>{a.assetCode} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="wo-type" style={frm.label}>Type</label>
                <select id="wo-type" value={formData.type} onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))} style={frm.input}>
                  <option value="Planned">Planned</option>
                  <option value="Unplanned">Unplanned</option>
                </select>
              </div>
              <div>
                <label htmlFor="wo-priority" style={frm.label}>Priority</label>
                <select id="wo-priority" value={formData.priority} onChange={(e) => setFormData((f) => ({ ...f, priority: e.target.value }))} style={frm.input}>
                  {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="wo-scheduled" style={frm.label}>Scheduled Date</label>
                <input id="wo-scheduled" type="date" value={formData.scheduledDate} onChange={(e) => setFormData((f) => ({ ...f, scheduledDate: e.target.value }))} style={frm.input} />
              </div>
              <div>
                <label htmlFor="wo-tech" style={frm.label}>Technician</label>
                <input id="wo-tech" type="text" placeholder="Full name" value={formData.technician} onChange={(e) => setFormData((f) => ({ ...f, technician: e.target.value }))} style={frm.input} />
              </div>
              <div>
                <label htmlFor="wo-dept" style={frm.label}>Department</label>
                <select id="wo-dept" value={formData.department} onChange={(e) => setFormData((f) => ({ ...f, department: e.target.value }))} style={frm.input}>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="wo-hours" style={frm.label}>Est. Hours</label>
                <input id="wo-hours" type="number" min="0" step="0.5" placeholder="0" value={formData.estimatedHours} onChange={(e) => setFormData((f) => ({ ...f, estimatedHours: e.target.value }))} style={frm.input} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="wo-desc" style={frm.label}>Description</label>
                <textarea id="wo-desc" rows={3} placeholder="Describe the work to be done…" value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} style={{ ...frm.input, resize: 'vertical' }} />
              </div>
              <div>
                <label htmlFor="wo-notes" style={frm.label}>Notes (optional)</label>
                <textarea id="wo-notes" rows={3} value={formData.notes} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} style={{ ...frm.input, resize: 'vertical' }} />
              </div>
            </div>
            {saveErr && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>⚠ {saveErr}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ ...btn.saveForm, ...(saving ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}>
                {saving ? 'Saving…' : 'Create Work Order'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={btn.cancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Work orders table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              {['WO ID', 'Asset', 'Type', 'Priority', 'Description', 'Scheduled', 'Status', 'Technician'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>No work orders found</td></tr>
            ) : filtered.map((wo, i) => {
              const ws = WO_STATUS_STYLE[wo.status] || WO_STATUS_STYLE.Open;
              const ps = PRIORITY_STYLE[wo.priority] || PRIORITY_STYLE.Medium;
              return (
                <tr key={wo.id} data-testid="wo-row" style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--gray-700)', fontFamily: 'monospace', fontSize: 12 }}>{wo.id}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--gray-500)' }}>{wo.assetCode}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--gray-700)', marginTop: 2 }}>{wo.assetName}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: wo.type === 'Planned' ? '#1d4ed8' : '#dc2626' }}>
                      {wo.type === 'Planned' ? '📅' : '⚠'} {wo.type}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}><Badge text={wo.priority} style={ps} /></td>
                  <td style={{ padding: '11px 14px', maxWidth: 200 }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-700)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{wo.description}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{wo.scheduledDate}</td>
                  <td style={{ padding: '11px 14px' }}><Badge text={wo.status} style={ws} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--gray-600)' }}>{wo.technician || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 10, fontSize: 12, color: 'var(--gray-400)', textAlign: 'right' }}>Showing {filtered.length} of {workOrders.length} work orders</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AssetRegistry() {
  const [activeTab, setActiveTab] = useState('assets');

  const TABS = [
    { id: 'assets',      label: 'Asset Registry',     testId: 'tab-assets' },
    { id: 'utilities',   label: 'Utilities & Billing', testId: 'tab-utilities' },
    { id: 'maintenance', label: 'Maintenance',         testId: 'tab-maintenance' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '-0.4px', marginBottom: 4 }}>Assets — RADP</h1>
        <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>Real Estate Asset Development Portfolio</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--gray-100)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-testid={tab.testId}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px', borderRadius: 9, border: 'none', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
              color:      activeTab === tab.id ? 'var(--gray-900)' : 'var(--gray-500)',
              boxShadow:  activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'assets'      && <AssetsTab />}
      {activeTab === 'utilities'   && <UtilitiesTab />}
      {activeTab === 'maintenance' && <MaintenanceTab />}
    </div>
  );
}

// ── Shared style tokens ───────────────────────────────────────────────────────
const btn = {
  retry:    { padding: '8px 20px', background: '#DD1D21', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' },
  primary:  { padding: '9px 16px', background: 'linear-gradient(135deg,#DD1D21,#9b0000)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(221,29,33,0.30)' },
  saveForm: { padding: '9px 20px', background: '#DD1D21', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  cancel:   { padding: '9px 20px', background: 'var(--gray-100)', color: 'var(--gray-600)', border: '1px solid var(--gray-200)', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};

const frm = {
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gray-500)', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--gray-900)', background: 'var(--gray-50)', outline: 'none', boxSizing: 'border-box' },
};

const exp = {
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 },
  value: { display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--gray-800)' },
};
