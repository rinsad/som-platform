import { useState, useEffect, useRef } from 'react';
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import {
  getDepartments, getSyncStatus, getGsapData,
  getInitiations, createInitiation,
  getManualEntries, createManualEntry,
  DEPT_NAMES,
} from '../../services/capexService';
import usePermissions from '../../hooks/usePermissions';
import ManualEntryModal        from './ManualEntryModal';
import CapexInitiationForm     from './CapexInitiationForm';
import CapexBudgetUploadModal  from './CapexBudgetUploadModal';

if (typeof Chart.register === 'function') {
  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtOMR(val) {
  if (val >= 1_000_000) return `OMR ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `OMR ${Math.round(val / 1_000)}k`;
  return `OMR ${val?.toLocaleString()}`;
}

function meterColor(pct) {
  if (pct >= 90) return '#DD1D21';
  if (pct >= 70) return '#BA7517';
  return '#2e7d32';
}

function StatusBadge({ status }) {
  const map = {
    success:              { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
    error:                { bg: 'rgba(220,38,38,0.12)',   color: '#ff6b6b' },
    Posted:               { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
    Approved:             { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
    'Under Review':       { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
    'Pending Approval':   { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
    'Partially Delivered':{ bg: 'rgba(107,159,255,0.15)', color: '#6b9fff' },
    Open:                 { bg: 'rgba(107,159,255,0.15)', color: '#6b9fff' },
    High:                 { bg: 'rgba(220,38,38,0.12)',   color: '#ff6b6b' },
    Medium:               { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
    Low:                  { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  };
  const style = map[status] || { bg: 'var(--fill-tertiary)', color: 'var(--label-secondary)' };
  return (
    <span style={{
      display: 'inline-block',
      background: style.bg, color: style.color,
      borderRadius: 'var(--radius-full)',
      padding: '2px 10px', fontSize: 12, fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

function SummaryCard({ label, value, color, sub }) {
  return (
    <div style={s.card}>
      <p style={s.cardLabel}>{label}</p>
      <p style={{ ...s.cardValue, color }}>{value}</p>
      {sub && <p style={s.cardSub}>{sub}</p>}
    </div>
  );
}

function DataTable({ columns, rows, emptyMsg = 'No data available.' }) {
  if (!rows.length) return <p style={{ color: 'var(--label-secondary)', fontSize: 14, padding: '16px 0' }}>{emptyMsg}</p>;
  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key} style={s.th}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={i % 2 === 0 ? {} : { background: 'var(--fill-quaternary)' }}>
              {columns.map((c) => (
                <td key={c.key} style={s.td}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 'overview',    label: 'Overview',       permKey: 'capex.planning.dashboard' },
  { id: 'departments', label: 'Departments',    permKey: 'capex.planning.departments' },
  { id: 'gsap',        label: 'GSAP Sync',      disabled: true },
  { id: 'manual',      label: 'Manual Entries', permKey: 'capex.tracking.manual-entry' },
  { id: 'initiations', label: 'Initiations',    adminOnly: true },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function CapexDashboard() {
  const rawUser          = localStorage.getItem('som_user');
  const isAdmin          = rawUser ? JSON.parse(rawUser)?.role === 'Admin' : false;
  const { canView }      = usePermissions();

  const TABS = ALL_TABS.filter(t => {
    if (t.adminOnly && !isAdmin) return false;
    if (t.permKey && !canView(t.permKey)) return false;
    return true;
  });

  const [activeTab,      setActiveTab]      = useState('overview');
  const [depts,          setDepts]          = useState([]);
  const [syncStatus,     setSyncStatus]     = useState(null);
  const [gsapData,       setGsapData]       = useState(null);
  const [initiations,    setInitiations]    = useState([]);
  const [manualEntries,  setManualEntries]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [selectedDept,   setSelectedDept]   = useState('');
  const [showManual,     setShowManual]      = useState(false);
  const [showInitForm,   setShowInitForm]    = useState(false);
  const [showBudgetUpload, setShowBudgetUpload] = useState(false);
  const [uploadToast,    setUploadToast]    = useState('');

  const overviewChartRef = useRef(null);
  const overviewChartInst = useRef(null);
  const deptChartRef = useRef(null);
  const deptChartInst = useRef(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [deptResults, syncRes, gsap, inits, entries] = await Promise.all([
        getDepartments(),
        getSyncStatus(),
        getGsapData(),
        getInitiations(),
        getManualEntries(),
      ]);
      setDepts(deptResults);
      if (deptResults.length) setSelectedDept(prev => prev || deptResults[0].name);
      setSyncStatus(syncRes);
      setGsapData(gsap);
      setInitiations(inits);
      setManualEntries(entries);
    } catch {
      setError('Failed to load Capex data. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  function showUploadToast(msg) {
    setUploadToast(msg);
    setTimeout(() => setUploadToast(''), 5000);
  }

  // ── Overview chart (aggregated monthly) ────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'overview') return;
    if (!depts.length || !overviewChartRef.current || !depts[0]?.monthlyData?.length) return;

    const months   = depts[0].monthlyData.map((m) => m.month);
    const budgeted = months.map((_, i) => depts.reduce((s, d) => s + d.monthlyData[i].budgeted, 0));
    const actual   = months.map((_, i) => depts.reduce((s, d) => s + d.monthlyData[i].actual, 0));

    if (overviewChartInst.current) overviewChartInst.current.destroy();

    overviewChartInst.current = new Chart(overviewChartRef.current, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Budgeted', data: budgeted, backgroundColor: 'rgba(255,213,0,0.75)', borderRadius: 4 },
          { label: 'Actual',   data: actual,   backgroundColor: 'rgba(221,29,33,0.80)',  borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtOMR(ctx.parsed.y)}` } },
        },
        scales: { y: { ticks: { callback: (v) => fmtOMR(v) } } },
      },
    });

    return () => { overviewChartInst.current?.destroy(); };
  }, [depts, activeTab]);

  // ── Department chart ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'departments') return;
    const dept = depts.find((d) => d.name === selectedDept);
    if (!dept || !deptChartRef.current || !dept.monthlyData?.length) return;

    if (deptChartInst.current) deptChartInst.current.destroy();

    deptChartInst.current = new Chart(deptChartRef.current, {
      type: 'bar',
      data: {
        labels: dept.monthlyData.map((m) => m.month),
        datasets: [
          { label: 'Budgeted', data: dept.monthlyData.map((m) => m.budgeted), backgroundColor: 'rgba(255,213,0,0.75)', borderRadius: 4 },
          { label: 'Actual',   data: dept.monthlyData.map((m) => m.actual),   backgroundColor: 'rgba(221,29,33,0.80)',  borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtOMR(ctx.parsed.y)}` } },
        },
        scales: { y: { ticks: { callback: (v) => fmtOMR(v) } } },
      },
    });

    return () => { deptChartInst.current?.destroy(); };
  }, [depts, selectedDept, activeTab]);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalBudget    = depts.reduce((s, d) => s + d.totalBudget, 0);
  const totalActual    = depts.reduce((s, d) => s + d.actual, 0);
  const totalCommitted = depts.reduce((s, d) => s + d.committed, 0);
  const totalRemaining = depts.reduce((s, d) => s + d.remaining, 0);
  const overallPct     = totalBudget ? Math.round(((totalActual + totalCommitted) / totalBudget) * 100) : 0;

  const lastSynced = syncStatus
    ? new Date(syncStatus.lastSynced).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  // ── States ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.center} data-testid="loading-spinner">
      <div style={s.spinner} />
      <p style={{ color: 'var(--label-secondary)', marginTop: 12 }}>Loading Capex data…</p>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={s.errorBox}>{error}</div>
      <button onClick={fetchAll} style={s.retryBtn}>Retry</button>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {showBudgetUpload && (
        <CapexBudgetUploadModal
          onClose={() => setShowBudgetUpload(false)}
          onSuccess={(result) => {
            setShowBudgetUpload(false);
            showUploadToast(`${result.message}`);
            fetchAll(); // reload charts + meters with new budget data
          }}
        />
      )}
      {/* Upload success toast */}
      {uploadToast && (
        <div style={{ fontSize: 13, color: '#34d399', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10, padding: '11px 16px', marginBottom: 16 }}>
          ✓ {uploadToast}
        </div>
      )}

      {/* Page header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.heading}>Capex Planning</h1>
          <p style={s.subheading}>FY 2026 — Budget vs Actual Tracking</p>
        </div>
        <div style={s.headerRight}>
          <div style={s.syncBadge}>
            <span style={{ ...s.syncDot, background: syncStatus?.status === 'success' ? '#22c55e' : '#ef4444' }} />
            GSAP Synced · {lastSynced}
          </div>
          <button style={s.refreshBtn} onClick={fetchAll}>Refresh</button>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={s.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            style={{
              ...s.tabBtn,
              ...(activeTab === t.id ? s.tabBtnActive : {}),
              ...(t.disabled ? s.tabBtnDisabled : {}),
            }}
            onClick={() => !t.disabled && setActiveTab(t.id)}
            title={t.disabled ? 'Unavailable — SAP undergoing maintenance' : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div>
          {/* Summary Cards */}
          <div style={s.cardRow}>
            {canView('capex.planning.dashboard.total_budget') && (
              <SummaryCard label="Total Authorised Budget" value={fmtOMR(totalBudget)} color="var(--shell-navy)" />
            )}
            {canView('capex.planning.dashboard.actual') && (
              <SummaryCard label="Actual Spend YTD" value={fmtOMR(totalActual)} color="var(--shell-red)"
                sub={`${Math.round((totalActual / totalBudget) * 100)}% of budget`} />
            )}
            {canView('capex.planning.dashboard.committed') && (
              <SummaryCard label="PO Commitments" value={fmtOMR(totalCommitted)} color="#BA7517" />
            )}
            {canView('capex.planning.dashboard.remaining') && (
              <SummaryCard label="Remaining Balance" value={fmtOMR(totalRemaining)} color="#2e7d32" />
            )}
          </div>

          {/* Running Capex Meter */}
          {canView('capex.planning.dashboard.percent_used') && <div style={s.section}>
            <div style={s.sectionHead}>
              <h2 style={s.sectionTitle}>Running Capex Meter</h2>
              <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
                Total consumption: <strong style={{ color: meterColor(overallPct) }}>{overallPct}%</strong>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {depts.map((dept) => (
                <div key={dept.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>{dept.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
                      {fmtOMR(dept.actual)} actual + {fmtOMR(dept.committed)} committed / {fmtOMR(dept.totalBudget)}
                    </span>
                  </div>
                  <div style={s.meterTrack}>
                    <div
                      data-testid={`meter-bar-${dept.name}`}
                      style={{
                        ...s.meterFill,
                        width: `${Math.min(dept.percentUsed, 100)}%`,
                        backgroundColor: meterColor(dept.percentUsed),
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meterColor(dept.percentUsed) }}>
                      {dept.percentUsed}% used
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>}

          {/* Monthly Budget vs Actual Chart */}
          {canView('capex.planning.dashboard.monthly_chart') && (
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Budget vs Actual by Month — All Departments</h2>
              <div style={s.chartWrap}>
                <canvas ref={overviewChartRef} />
              </div>
            </div>
          )}

          {/* GSAP info bar */}
          <div style={s.infoBar}>
            <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
              Data source: <strong>GSAP (read-only)</strong> &nbsp;|&nbsp; Last synced: <strong>{lastSynced}</strong>
              &nbsp;|&nbsp; Manual fallback entries are posted to the Manual Entries tab
            </span>
          </div>
        </div>
      )}

      {/* ── TAB: Departments ──────────────────────────────────────────────── */}
      {activeTab === 'departments' && (
        <div>
          {/* Department selector */}
          <div style={{ ...s.section, paddingBottom: 0 }}>
            <h2 style={s.sectionTitle}>Department Dashboard</h2>
            <div style={s.deptTabs}>
              {depts.map((d) => (
                <button
                  key={d.name}
                  style={{ ...s.deptTab, ...(selectedDept === d.name ? s.deptTabActive : {}) }}
                  onClick={() => setSelectedDept(d.name)}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {depts.filter((d) => d.name === selectedDept).map((dept) => (
            <div key={dept.name}>
              {/* Dept summary cards */}
              <div style={s.cardRow}>
                {canView('capex.planning.departments.total_budget') && (
                  <SummaryCard label="Authorised Budget" value={fmtOMR(dept.totalBudget)} color="var(--shell-navy)" />
                )}
                {canView('capex.planning.departments.actual') && (
                  <SummaryCard label="Actual Spend" value={fmtOMR(dept.actual)} color="var(--shell-red)"
                    sub={`${dept.percentUsed}% consumed`} />
                )}
                {canView('capex.planning.departments.committed') && (
                  <SummaryCard label="PO Committed" value={fmtOMR(dept.committed)} color="#BA7517" />
                )}
                {canView('capex.planning.departments.remaining') && (
                  <SummaryCard label="Remaining" value={fmtOMR(dept.remaining)} color="#2e7d32" />
                )}
              </div>

              {/* Dept meter */}
              {canView('capex.planning.departments.percent_used') && (
                <div style={s.section}>
                  <div style={s.sectionHead}>
                    <h2 style={s.sectionTitle}>{dept.name} — Budget Consumption</h2>
                    <span style={{ fontSize: 13, color: meterColor(dept.percentUsed), fontWeight: 700 }}>
                      {dept.percentUsed}%
                    </span>
                  </div>
                  <div style={s.meterTrack}>
                    <div
                      data-testid={`meter-bar-${dept.name}`}
                      style={{
                        ...s.meterFill,
                        width: `${Math.min(dept.percentUsed, 100)}%`,
                        backgroundColor: meterColor(dept.percentUsed),
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
                      {fmtOMR(dept.actual + dept.committed)} consumed &amp; committed
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--label-secondary)' }}>
                      {fmtOMR(dept.remaining)} remaining
                    </span>
                  </div>
                </div>
              )}

              {/* Dept monthly chart */}
              {canView('capex.planning.departments.monthly_chart') && (
                <div style={s.section}>
                  <h2 style={s.sectionTitle}>{dept.name} — Monthly Budget vs Actual</h2>
                  <div style={s.chartWrap}>
                    <canvas ref={deptChartRef} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: GSAP Sync ───────────────────────────────────────────────── */}
      {activeTab === 'gsap' && gsapData && (
        <div>
          {/* Sync status banner */}
          <div style={{ ...s.section, padding: '16px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: gsapData.status === 'success' ? '#22c55e' : '#ef4444',
                flexShrink: 0,
              }} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>
                  GSAP Integration — One-way Read
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--label-secondary)' }}>
                  Source: <strong>{gsapData.source}</strong> &nbsp;|&nbsp;
                  Last sync: <strong>{new Date(gsapData.lastSynced).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</strong>
                  &nbsp;|&nbsp; Status: <StatusBadge status={gsapData.status} />
                </p>
              </div>
            </div>
          </div>

          {/* Approved Budgets */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Approved Budgets (WBS)</h2>
            <DataTable
              columns={[
                { key: 'wbsCode',      label: 'WBS Code' },
                { key: 'department',   label: 'Department' },
                { key: 'description',  label: 'Description' },
                { key: 'approvedAmount', label: 'Approved (OMR)', render: (v) => fmtOMR(v) },
                { key: 'postedAmount', label: 'Posted (OMR)', render: (v) => fmtOMR(v) },
                { key: 'variance',     label: 'Remaining (OMR)',
                  render: (_, row) => {
                    const rem = row.approvedAmount - row.postedAmount;
                    return <span style={{ color: rem < 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>{fmtOMR(rem)}</span>;
                  }
                },
              ]}
              rows={gsapData.approvedBudgets}
            />
          </div>

          {/* PO Commitments */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>PO Commitments</h2>
            <DataTable
              columns={[
                { key: 'poNumber',    label: 'PO Number' },
                { key: 'vendor',      label: 'Vendor' },
                { key: 'wbsCode',     label: 'WBS Code' },
                { key: 'description', label: 'Description' },
                { key: 'amount',      label: 'Amount (OMR)', render: (v) => fmtOMR(v) },
                { key: 'dueDate',     label: 'Due Date' },
                { key: 'status',      label: 'Status', render: (v) => <StatusBadge status={v} /> },
              ]}
              rows={gsapData.poCommitments}
            />
          </div>

          {/* GR/IR Actuals */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>GR/IR Actuals</h2>
            <DataTable
              columns={[
                { key: 'grNumber',     label: 'GR Number' },
                { key: 'poNumber',     label: 'PO Reference' },
                { key: 'wbsCode',      label: 'WBS Code' },
                { key: 'description',  label: 'Description' },
                { key: 'amount',       label: 'Amount (OMR)', render: (v) => fmtOMR(v) },
                { key: 'postingDate',  label: 'Posting Date' },
              ]}
              rows={gsapData.grirActuals}
            />
          </div>
        </div>
      )}

      {/* ── TAB: Manual Entries ──────────────────────────────────────────── */}
      {activeTab === 'manual' && (
        <div>
          <div style={s.tabActionRow}>
            <div>
              <h2 style={s.sectionTitle}>Manual Entry Fallback</h2>
              <p style={s.tabSubtitle}>Post budget adjustments, actuals, or PO commitments for non-GSAP items with a standardised structure.</p>
            </div>
            <button style={s.primaryBtn} onClick={() => setShowManual(true)}>+ Add Entry</button>
          </div>

          <div style={s.section}>
            <DataTable
              columns={[
                { key: 'id',              label: 'Entry ID' },
                canView('capex.tracking.manual-entry.entry_type') && { key: 'entryType', label: 'Type', render: (v) => <StatusBadge status={v === 'Actual' ? 'Posted' : v === 'PO Commitment' ? 'Open' : 'Under Review'} /> },
                canView('capex.tracking.manual-entry.entry_type') && { key: 'entryType', label: 'Entry Type' },
                canView('capex.tracking.manual-entry.department')       && { key: 'department',      label: 'Department' },
                canView('capex.tracking.manual-entry.period')           && { key: 'period',          label: 'Period' },
                canView('capex.tracking.manual-entry.amount')           && { key: 'amount',          label: 'Amount (OMR)', render: (v) => <strong>{fmtOMR(v)}</strong> },
                canView('capex.tracking.manual-entry.reference_number') && { key: 'referenceNumber', label: 'Reference' },
                canView('capex.tracking.manual-entry.entered_by')       && { key: 'enteredBy',       label: 'Entered By' },
                canView('capex.tracking.manual-entry.status')           && { key: 'status',          label: 'Status', render: (v) => <StatusBadge status={v} /> },
              ].filter(Boolean).filter((c, i, arr) => arr.findIndex((x) => x.key === c.key && x.label === c.label) === i)}
              rows={manualEntries}
              emptyMsg="No manual entries yet. Use 'Add Entry' to post a non-GSAP transaction."
            />
          </div>
        </div>
      )}

      {/* ── TAB: Initiations ─────────────────────────────────────────────── */}
      {activeTab === 'initiations' && (
        <div>
          <div style={s.tabActionRow}>
            <div>
              <h2 style={s.sectionTitle}>Capex Initiations</h2>
              <p style={s.tabSubtitle}>Standardised requirement gathering — capture project details, stakeholders, and justification before budget approval.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                style={{ ...s.primaryBtn, background: 'var(--surface)', color: 'var(--shell-red)', border: '1px solid rgba(221,29,33,0.30)', boxShadow: 'none' }}
                onClick={() => setShowBudgetUpload(true)}
              >
                ↑ Upload Approved Budget
              </button>
              {!showInitForm && (
                <button style={s.primaryBtn} onClick={() => setShowInitForm(true)}>+ New Initiation</button>
              )}
            </div>
          </div>

          {showInitForm && (
            <CapexInitiationForm
              onSubmit={async (data) => {
                const created = await createInitiation(data);
                setInitiations((prev) => [created, ...prev]);
                setShowInitForm(false);
              }}
              onCancel={() => setShowInitForm(false)}
            />
          )}

          <div style={s.section}>
            <DataTable
              columns={[
                { key: 'id',               label: 'ID' },
                { key: 'title',            label: 'Project Title' },
                { key: 'department',       label: 'Department' },
                { key: 'projectType',      label: 'Type' },
                { key: 'estimatedBudget',  label: 'Est. Budget', render: (v) => fmtOMR(v) },
                { key: 'priority',         label: 'Priority', render: (v) => <StatusBadge status={v} /> },
                { key: 'status',           label: 'Status',   render: (v) => <StatusBadge status={v} /> },
                { key: 'createdAt',        label: 'Submitted' },
              ]}
              rows={initiations}
              emptyMsg="No initiations submitted yet."
            />
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManual && (
        <ManualEntryModal
          onClose={() => setShowManual(false)}
          onSubmit={async (data) => {
            const created = await createManualEntry(data);
            setManualEntries((prev) => [...prev, created]);
          }}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  center: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', minHeight: 300,
  },
  spinner: {
    width: 40, height: 40,
    border: '4px solid var(--gray-200)',
    borderTopColor: 'var(--shell-red)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)',
    color: '#ff6b6b', padding: '12px 20px', borderRadius: 'var(--radius-sm)', marginBottom: 12,
  },
  retryBtn: {
    padding: '8px 20px', background: 'var(--shell-red)',
    color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600,
  },

  pageHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20,
  },
  heading:    { margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--label)' },
  subheading: { margin: '4px 0 0', fontSize: 14, color: 'var(--label-secondary)' },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 12 },
  syncBadge: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'var(--surface)', border: '1px solid var(--separator-clear)',
    borderRadius: 'var(--radius-full)', padding: '6px 14px',
    fontSize: 12, fontWeight: 500, color: 'var(--label-secondary)',
    boxShadow: 'var(--shadow-xs)',
  },
  syncDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  refreshBtn: {
    padding: '7px 16px', background: 'var(--surface)',
    border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--label-secondary)',
    boxShadow: 'var(--shadow-xs)',
  },

  tabBar: {
    display: 'flex', gap: 4,
    background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
    padding: 6, marginBottom: 24,
    boxShadow: 'var(--shadow-card)', width: 'fit-content',
  },
  tabBtn: {
    padding: '8px 20px', border: 'none',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)',
    background: 'transparent', transition: 'all var(--transition-fast)',
  },
  tabBtnActive: {
    background: 'var(--shell-red)', color: '#fff',
    fontWeight: 600, boxShadow: 'var(--shadow-sm)',
  },
  tabBtnDisabled: {
    opacity: 0.4, cursor: 'not-allowed',
  },

  cardRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24,
  },
  card: {
    background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
    padding: '20px 24px', boxShadow: 'var(--shadow-card)',
  },
  cardLabel: {
    margin: '0 0 6px', fontSize: 11, fontWeight: 600,
    color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  cardValue: { margin: 0, fontSize: 24, fontWeight: 700 },
  cardSub:   { margin: '4px 0 0', fontSize: 12, color: 'var(--label-secondary)' },

  section: {
    background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
    padding: '24px', marginBottom: 20, boxShadow: 'var(--shadow-card)',
  },
  sectionHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  sectionTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--label)' },

  meterTrack: {
    height: 10, background: 'var(--gray-200)',
    borderRadius: 'var(--radius-full)', overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: 'var(--radius-full)', transition: 'width 0.7s var(--ease)' },

  chartWrap: { height: 260, position: 'relative' },

  infoBar: {
    background: 'var(--surface)', border: '1px solid var(--separator-clear)',
    borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 8,
  },

  deptTabs: { display: 'flex', gap: 0, borderBottom: '1px solid var(--separator-clear)', marginBottom: 0 },
  deptTab: {
    padding: '10px 20px', border: 'none', background: 'transparent',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    color: 'var(--label-secondary)', borderBottom: '2px solid transparent',
    transition: 'all var(--transition-fast)',
  },
  deptTabActive: {
    color: 'var(--shell-red)', fontWeight: 700,
    borderBottom: '2px solid var(--shell-red)',
  },

  tabActionRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  tabSubtitle: { margin: '4px 0 0', fontSize: 13, color: 'var(--label-secondary)' },
  primaryBtn: {
    padding: '9px 22px', background: 'var(--shell-red)',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)', flexShrink: 0,
  },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, color: 'var(--label-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.4px',
    borderBottom: '1px solid var(--separator-clear)', whiteSpace: 'nowrap',
  },
  td: {
    padding: '11px 14px', borderBottom: '1px solid var(--separator-clear)',
    color: 'var(--label)', verticalAlign: 'middle',
  },
};
