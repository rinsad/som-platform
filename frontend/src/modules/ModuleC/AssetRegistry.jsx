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
import DateField from '../../components/DateField';
import SelectField from '../../components/SelectField';
import Badge from '../../components/Badge';

if (typeof Chart.register === 'function') {
  Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);
}

const SITES = [
  { id: 'SITE-001', label: 'Al Khuwair Station — Muscat' },
  { id: 'SITE-003', label: 'Salalah Main Station — Salalah' },
  { id: 'SITE-004', label: 'Sohar Industrial Station — Sohar' },
];

const UTILITY_COLORS = { Electricity: 'var(--shell-yellow)', Water: 'var(--info)', Gas: 'var(--warning)' };

// Work-order priority is a 4-rung ladder distinct from the shared Badge's
// default 3-rung Low/Medium/High mapping, so it needs an explicit tone here.
const PRIORITY_TONE = { Low: 'neutral', Medium: 'info', High: 'warning', Critical: 'danger' };

const EQUIP_TYPES  = ['Generator', 'Dispenser', 'HVAC', 'Security', 'Lighting', 'Electrical', 'Pump', 'Other'];
const REGIONS      = ['Muscat', 'Salalah', 'Sohar'];
const DEPARTMENTS  = ['Operations', 'Retail', 'Facilities', 'Infrastructure', 'QHSE', 'Technology'];

function fmtOMR(v) { return `OMR ${Number(v).toLocaleString('en-GB')}`; }

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, gap: 12 }}>
      <div style={{ width: 34, height: 34, border: '3px solid var(--gray-200)', borderTopColor: 'var(--shell-red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Loading…</p>
    </div>
  );
}

function StatCard({ label, value, color, bg, icon }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      </div>
      <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
        No assets match the current filter.
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', cursor: 'pointer', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', userSelect: 'none' }}
            >
              <span style={{ fontSize: 11, color: 'var(--gray-400)', width: 14, flexShrink: 0 }}>{regionOpen ? '▼' : '▶'}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)' }}>🗺 {region} Region</span>
              <span style={{ marginLeft: 'auto', background: 'var(--gray-200)', color: 'var(--gray-600)', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)' }}>{regionCount}</span>
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
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px 9px 32px', cursor: 'pointer', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', userSelect: 'none' }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', width: 14, flexShrink: 0 }}>{siteOpen ? '▼' : '▶'}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gray-700)' }}>📍 {site}</span>
                    <span style={{ marginLeft: 'auto', background: 'var(--info-bg)', color: 'var(--info)', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)' }}>{siteCount}</span>
                  </div>

                  {siteOpen && Object.entries(facilities).map(([facility, assetList]) => {
                    const facKey  = `f:${region}:${site}:${facility}`;
                    const facOpen = expanded.has(facKey);

                    return (
                      <div key={facility}>
                        {/* Facility */}
                        <div
                          onClick={() => toggle(facKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 8px 52px', cursor: 'pointer', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-50)', userSelect: 'none' }}
                        >
                          <span style={{ fontSize: 11, color: 'var(--gray-400)', width: 14, flexShrink: 0 }}>{facOpen ? '▼' : '▶'}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>🏗 {facility}</span>
                          <span style={{ marginLeft: 'auto', background: 'var(--success-bg)', color: 'var(--success)', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)' }}>{assetList.length}</span>
                        </div>

                        {/* Equipment rows */}
                        {facOpen && assetList.map((asset) => (
                          <div
                            key={asset.assetCode}
                            data-testid="asset-tree-row"
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 8px 72px', borderBottom: '1px solid var(--gray-50)', background: 'transparent' }}
                          >
                            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--gray-500)', minWidth: 175, flexShrink: 0 }}>{asset.assetCode}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-800)', flex: 1 }}>{asset.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--gray-500)', minWidth: 80, flexShrink: 0 }}>{asset.equipmentType}</span>
                            <Badge status={asset.status} />
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
    if (days < 7)  return { bg: 'var(--danger-bg)', border: 'var(--danger)', color: 'var(--danger)', icon: '🔴' };
    if (days < 30) return { bg: 'var(--warning-bg)', border: 'var(--warning)', color: 'var(--warning)', icon: '🟡' };
    return { bg: 'var(--success-bg)', border: 'var(--success)', color: 'var(--success)', icon: '🟢' };
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
      <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: 14 }}>{error}</div>
      <button type="button" onClick={fetchAll} style={btn.retry}>Retry</button>
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
              <div key={al.alertId} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
                <div>
                  <span style={{ fontWeight: 700, color: c.color, fontSize: 13 }}>{al.type} · {al.assetCode}</span>
                  <p style={{ color: c.color, fontSize: 13, marginTop: 2 }}>{al.message}</p>
                </div>
                <span style={{ marginLeft: 'auto', background: c.border, color: c.color, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-pill)', flexShrink: 0 }}>
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
          style={{ flex: 1, minWidth: 220, padding: '9px 13px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: 13.5, background: 'var(--gray-50)', fontFamily: 'inherit', outline: 'none' }}
        />
        <SelectField
          value={region}
          onChange={setRegion}
          options={regions.map((r) => ({ value: r, label: r === 'ALL' ? 'All Regions' : r }))}
          style={{ padding: '9px 13px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: 13.5, background: 'var(--gray-50)', fontFamily: 'inherit', color: 'var(--gray-700)' }}
          aria-label="Filter by region"
        />

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', padding: 3, gap: 2 }}>
          {[{ id: 'tree', label: '🌲 Tree' }, { id: 'table', label: '📋 Table' }].map((v) => (
            <button type="button"
              key={v.id}
              onClick={() => setViewMode(v.id)}
              style={{
                padding: '5px 12px', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                background: viewMode === v.id ? 'var(--surface)' : 'transparent',
                color:      viewMode === v.id ? 'var(--gray-900)' : 'var(--gray-500)',
                boxShadow:  viewMode === v.id ? 'var(--shadow-xs)' : 'none',
              }}
            >{v.label}</button>
          ))}
        </div>

        <button type="button" onClick={() => { setShowAddForm((v) => !v); setAddErr(''); }} style={btn.primary}>
          {showAddForm ? '✕ Cancel' : '+ Register Asset'}
        </button>
      </div>

      {/* Register asset form */}
      {showAddForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: 24, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
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
                <SelectField id="asset-region" value={addForm.region} onChange={(v) => setAddForm((f) => ({ ...f, region: v }))} options={REGIONS} style={frm.input} aria-label="Region" />
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
                <SelectField id="asset-type" value={addForm.equipmentType} onChange={(v) => setAddForm((f) => ({ ...f, equipmentType: v }))} options={EQUIP_TYPES} style={frm.input} aria-label="Equipment Type" />
              </div>
              <div>
                <label htmlFor="asset-dept" style={frm.label}>Department</label>
                <SelectField id="asset-dept" value={addForm.department} onChange={(v) => setAddForm((f) => ({ ...f, department: v }))} options={DEPARTMENTS} style={frm.input} aria-label="Department" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="asset-status" style={frm.label}>Status</label>
                <SelectField id="asset-status" value={addForm.status} onChange={(v) => setAddForm((f) => ({ ...f, status: v }))} options={['Active', 'Maintenance', 'Inactive']} style={frm.input} aria-label="Status" />
              </div>
            </div>
            {addErr && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>⚠ {addErr}</div>}
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
        <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
                return (
                  <>
                    <tr
                      key={asset.assetCode}
                      data-testid="asset-row"
                      onClick={() => setExpanded(isOpen ? null : asset.assetCode)}
                      style={{ background: i % 2 === 1 ? 'var(--gray-50)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s', borderBottom: isOpen ? 'none' : '1px solid var(--gray-50)' }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--gray-700)', fontFamily: 'monospace', fontSize: 12.5 }}>{asset.assetCode}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--gray-800)' }}>{asset.name}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-500)' }}>{asset.region}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-500)' }}>{asset.site}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-500)' }}>{asset.facility}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-600)' }}>{asset.equipmentType}</td>
                      <td style={{ padding: '12px 14px' }}><Badge status={asset.status} /></td>
                    </tr>
                    {isOpen && (
                      <tr key={`${asset.assetCode}-detail`} style={{ background: 'var(--info-bg)' }}>
                        <td colSpan={7} style={{ padding: '14px 20px', borderBottom: '1px solid var(--info-bg)' }}>
                          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                            <div><span style={exp.label}>Asset Code</span><span style={exp.value}>{asset.assetCode}</span></div>
                            <div><span style={exp.label}>Department</span><span style={exp.value}>{asset.department}</span></div>
                            <div><span style={exp.label}>Status</span><Badge status={asset.status} /></div>
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
        borderColor: UTILITY_COLORS[type] || 'var(--gray-400)',
        backgroundColor: (UTILITY_COLORS[type] || 'var(--gray-400)') + '18',
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
    { type: 'Electricity', testId: 'metric-electricity', icon: '⚡', color: 'var(--info)', light: 'var(--info-bg)' },
    { type: 'Water',       testId: 'metric-water',       icon: '💧', color: 'var(--info)', light: 'var(--info-bg)'  },
    { type: 'Gas',         testId: 'metric-gas',         icon: '🔥', color: 'var(--warning)', light: 'rgba(249,115,22,0.12)'  },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>Site</label>
        <SelectField
          value={siteId}
          onChange={setSiteId}
          options={SITES.map((site) => ({ value: site.id, label: site.label }))}
          style={{ padding: '9px 14px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--gray-800)', background: 'var(--surface)', minWidth: 280, boxShadow: 'var(--shadow-xs)' }}
          aria-label="Site"
        />
        <button type="button"
          data-testid="btn-log-bill"
          onClick={() => { setShowForm((v) => !v); setSaveMsg(''); setSaveErr(''); }}
          style={{ ...btn.primary, marginLeft: 'auto' }}
        >
          {showForm ? '✕ Cancel' : '+ Log Bill'}
        </button>
      </div>

      {saveMsg && <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>✓ {saveMsg}</div>}

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: 24, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16 }}>Log Utility Bill</h3>
          <form onSubmit={handleLogBill} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={frm.label}>Utility Type</label>
              <SelectField value={formData.utilityType} onChange={(v) => setFormData((f) => ({ ...f, utilityType: v }))} options={['Electricity', 'Water', 'Gas']} style={frm.input} aria-label="Utility Type" />
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
          {saveErr && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 13 }}>⚠ {saveErr}</div>}
        </div>
      )}

      {loading ? <Spinner /> : error ? (
        <div style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 14 }}>{error}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
            {METRICS.map((m) => {
              const { current, prev, trend } = getMetric(m.type);
              const trendUp   = trend > 0;
              const trendDown = trend < 0;
              return (
                <div key={m.type} data-testid={m.testId} style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{m.type}</span>
                    <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: m.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.icon}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: current !== null ? m.color : 'var(--gray-300)', marginBottom: 6 }}>
                    {current !== null ? fmtOMR(current) : '—'}
                  </div>
                  {prev !== null && (
                    <div style={{ fontSize: 12, color: trendUp ? 'var(--danger)' : trendDown ? 'var(--success)' : 'var(--gray-400)', fontWeight: 500 }}>
                      {trendUp ? '↑' : trendDown ? '↓' : '→'} {fmtOMR(Math.abs(trend))} vs prev month
                    </div>
                  )}
                  {current === null && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>No data for this site</div>}
                </div>
              );
            })}
          </div>

          {Object.keys(bills).length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
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
      <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: 14 }}>{error}</div>
      <button type="button" onClick={fetchData} style={btn.retry}>Retry</button>
    </div>
  );

  const openCount     = workOrders.filter((w) => w.status === 'Open').length;
  const inProgCount   = workOrders.filter((w) => w.status === 'In Progress').length;
  const criticalCount = workOrders.filter((w) => w.priority === 'Critical').length;

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard label="Open"        value={openCount}     color="var(--info)" bg="var(--info-bg)" icon="📋" />
        <StatCard label="In Progress" value={inProgCount}   color="var(--warning)" bg="var(--warning-bg)"  icon="🔧" />
        <StatCard label="Critical"    value={criticalCount} color="var(--danger)" bg="var(--danger-bg)"   icon="🚨" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SelectField value={filterStatus} onChange={setFilterStatus} options={['ALL', 'Open', 'In Progress', 'Completed'].map((s) => ({ value: s, label: s === 'ALL' ? 'All Statuses' : s }))} style={{ padding: '9px 12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: 13, background: 'var(--gray-50)', fontFamily: 'inherit', color: 'var(--gray-700)' }} aria-label="Filter by status" />
        <SelectField value={filterType} onChange={setFilterType} options={['ALL', 'Planned', 'Unplanned'].map((t) => ({ value: t, label: t === 'ALL' ? 'All Types' : t }))} style={{ padding: '9px 12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: 13, background: 'var(--gray-50)', fontFamily: 'inherit', color: 'var(--gray-700)' }} aria-label="Filter by type" />
        <button type="button" onClick={() => { setShowForm((v) => !v); setSaveErr(''); }} style={{ ...btn.primary, marginLeft: 'auto' }}>
          {showForm ? '✕ Cancel' : '+ New Work Order'}
        </button>
      </div>

      {/* New work order form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: 24, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16 }}>New Work Order</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="wo-asset" style={frm.label}>Asset</label>
                <SelectField id="wo-asset" value={formData.assetCode} onChange={(v) => setFormData((f) => ({ ...f, assetCode: v }))} options={assets.map((a) => ({ value: a.assetCode, label: `${a.assetCode} — ${a.name}` }))} placeholder="Select asset…" style={frm.input} aria-label="Asset" />
              </div>
              <div>
                <label htmlFor="wo-type" style={frm.label}>Type</label>
                <SelectField id="wo-type" value={formData.type} onChange={(v) => setFormData((f) => ({ ...f, type: v }))} options={['Planned', 'Unplanned']} style={frm.input} aria-label="Type" />
              </div>
              <div>
                <label htmlFor="wo-priority" style={frm.label}>Priority</label>
                <SelectField id="wo-priority" value={formData.priority} onChange={(v) => setFormData((f) => ({ ...f, priority: v }))} options={['Low', 'Medium', 'High', 'Critical']} style={frm.input} aria-label="Priority" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="wo-scheduled" style={frm.label}>Scheduled Date</label>
                <DateField id="wo-scheduled" value={formData.scheduledDate} onChange={(v) => setFormData((f) => ({ ...f, scheduledDate: v }))} style={frm.input} />
              </div>
              <div>
                <label htmlFor="wo-tech" style={frm.label}>Technician</label>
                <input id="wo-tech" type="text" placeholder="Full name" value={formData.technician} onChange={(e) => setFormData((f) => ({ ...f, technician: e.target.value }))} style={frm.input} />
              </div>
              <div>
                <label htmlFor="wo-dept" style={frm.label}>Department</label>
                <SelectField id="wo-dept" value={formData.department} onChange={(v) => setFormData((f) => ({ ...f, department: v }))} options={DEPARTMENTS} placeholder="Select…" style={frm.input} aria-label="Work order department" />
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
            {saveErr && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>⚠ {saveErr}</div>}
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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
            ) : filtered.map((wo, i) => (
                <tr key={wo.id} data-testid="wo-row" style={{ background: i % 2 === 1 ? 'var(--gray-50)' : 'transparent', borderBottom: '1px solid var(--gray-50)' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--gray-700)', fontFamily: 'monospace', fontSize: 12 }}>{wo.id}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--gray-500)' }}>{wo.assetCode}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--gray-700)', marginTop: 2 }}>{wo.assetName}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: wo.type === 'Planned' ? 'var(--info)' : 'var(--danger)' }}>
                      {wo.type === 'Planned' ? '📅' : '⚠'} {wo.type}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}><Badge status={wo.priority} tone={PRIORITY_TONE[wo.priority]} /></td>
                  <td style={{ padding: '11px 14px', maxWidth: 200 }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-700)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{wo.description}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{wo.scheduledDate}</td>
                  <td style={{ padding: '11px 14px' }}><Badge status={wo.status} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--gray-600)' }}>{wo.technician || '—'}</td>
                </tr>
            ))}
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

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {TABS.map((tab) => (
          <button type="button"
            key={tab.id}
            data-testid={tab.testId}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
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
  retry:    { padding: '8px 20px', background: 'var(--shell-red)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' },
  primary:  { padding: '9px 16px', background: 'linear-gradient(135deg,var(--shell-red),var(--shell-red-dark))', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(221,29,33,0.30)' },
  saveForm: { padding: '9px 20px', background: 'var(--shell-red)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  cancel:   { padding: '9px 20px', background: 'var(--gray-100)', color: 'var(--gray-600)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};

const frm = {
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gray-500)', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--gray-900)', background: 'var(--gray-50)', outline: 'none', boxSizing: 'border-box' },
};

const exp = {
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 },
  value: { display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--gray-800)' },
};
