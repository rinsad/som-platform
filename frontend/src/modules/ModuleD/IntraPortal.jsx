import { useState, useEffect, useRef } from 'react';
import {
  getApps, getKnowledge, searchKnowledge, getDocVersions,
  getFavourites, toggleFavourite,
  getPinnedDocs, togglePinnedDoc,
  ssoLogin, getDocFileUrl,
} from '../../services/portalService';

const CATEGORY_COLORS = {
  Enterprise:    { bg: 'rgba(107,159,255,0.15)', color: '#6b9fff', border: 'rgba(107,159,255,0.30)' },
  HR:            { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', border: 'rgba(52,211,153,0.30)' },
  QHSE:          { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.30)' },
  IT:            { bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8', border: 'rgba(56,189,248,0.30)' },
  Finance:       { bg: 'rgba(251,191,36,0.10)',  color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  Procurement:   { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: 'rgba(167,139,250,0.30)' },
  Operations:    { bg: 'rgba(192,132,252,0.12)', color: '#c084fc', border: 'rgba(192,132,252,0.28)' },
  Administration:{ bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.50)', border: 'rgba(255,255,255,0.15)' },
  Policy:        { bg: 'rgba(220,38,38,0.12)',   color: '#ff6b6b', border: 'rgba(220,38,38,0.28)' },
  Procedure:     { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', border: 'rgba(52,211,153,0.30)' },
};

const SOURCE_BADGES = {
  pdf:    { label: 'PDF',  bg: 'rgba(220,38,38,0.14)',   color: '#ff6b6b', border: 'rgba(220,38,38,0.28)' },
  docx:   { label: 'DOCX', bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8', border: 'rgba(56,189,248,0.28)' },
  eml:    { label: 'EML',  bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.28)' },
  txt:    { label: 'TXT',  bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.50)', border: 'rgba(255,255,255,0.15)' },
  manual: { label: 'KB',   bg: 'rgba(52,211,153,0.10)',  color: '#34d399', border: 'rgba(52,211,153,0.25)' },
};

function catStyle(cat) {
  return CATEGORY_COLORS[cat] || { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.50)', border: 'rgba(255,255,255,0.15)' };
}

const KB_CATEGORIES = ['All', 'Policy', 'Procedure', 'QHSE', 'HR'];

// ─── App Tile ─────────────────────────────────────────────────────────────────
function AppTile({ app, isFav, onToggleStar, onAppClick, launching }) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      data-testid="app-tile"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => !launching && onAppClick(app)}
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: `1px solid ${hovering ? '#c7d2fe' : 'var(--gray-200)'}`,
        borderRadius: 16,
        padding: '20px 16px 16px',
        cursor: launching ? 'default' : 'pointer',
        transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.18s',
        boxShadow: hovering && !launching ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: hovering && !launching ? 'translateY(-2px)' : 'none',
        display: 'flex', flexDirection: 'column', gap: 8, userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* SSO launching overlay */}
      {launching && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.92)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 2,
        }}>
          <div style={{ width: 24, height: 24, border: '3px solid rgba(255,213,0,0.30)', borderTopColor: '#FFD500', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 11, color: '#FFD500', fontWeight: 700, letterSpacing: '0.2px' }}>Connecting via SSO…</span>
        </div>
      )}

      {/* SSO badge */}
      {app.ssoEnabled && !launching && (
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
          fontSize: 9.5, fontWeight: 700,
          padding: '2px 7px', borderRadius: 6,
          border: '1px solid rgba(167,139,250,0.30)', letterSpacing: '0.3px',
        }}>
          🔐 SSO
        </div>
      )}

      {/* Star button */}
      <button
        data-testid={`star-btn-${app.id}`}
        onClick={(e) => { e.stopPropagation(); onToggleStar(app.id); }}
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 17, lineHeight: 1, padding: 4, borderRadius: 6,
          color: isFav ? '#fbbf24' : 'rgba(255,255,255,0.25)',
          transition: 'color 0.15s, transform 0.15s',
          transform: isFav ? 'scale(1.15)' : 'scale(1)',
        }}
        title={isFav ? 'Remove from favourites' : 'Add to favourites'}
      >
        {isFav ? '★' : '☆'}
      </button>

      <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 4, marginTop: app.ssoEnabled ? 10 : 0 }}>{app.icon}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.3 }}>{app.name}</div>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.5, flexGrow: 1 }}>{app.description}</div>

      <div style={{ marginTop: 4 }}>
        <span style={{
          ...catStyle(app.category),
          display: 'inline-flex', alignItems: 'center',
          padding: '2px 9px', borderRadius: 9999,
          fontSize: 11, fontWeight: 600,
          border: `1px solid ${catStyle(app.category).border}`,
        }}>
          {app.category}
        </span>
      </div>
    </div>
  );
}

// ─── Knowledge Card (browse mode) ─────────────────────────────────────────────
function KnowledgeCard({ doc, isPinned, onTogglePin }) {
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions]       = useState(null);
  const [loadingV, setLoadingV]       = useState(false);
  const cs = catStyle(doc.category);

  const handleHistory = async () => {
    if (!showHistory && versions === null) {
      setLoadingV(true);
      try {
        const v = await getDocVersions(doc.id);
        setVersions(v);
      } catch { setVersions([]); }
      finally { setLoadingV(false); }
    }
    setShowHistory((v) => !v);
  };

  const srcBadge = SOURCE_BADGES[doc.sourceType] || SOURCE_BADGES.manual;

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--gray-200)',
      borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.35, flex: 1 }}>
          {doc.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Source type badge */}
          {doc.sourceType && doc.sourceType !== 'manual' && (
            <span style={{
              ...srcBadge, display: 'inline-flex', alignItems: 'center',
              padding: '2px 7px', borderRadius: 6,
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.2px',
              border: `1px solid ${srcBadge.border}`,
            }}>
              {srcBadge.label}
            </span>
          )}
          {/* Pin button */}
          {onTogglePin && (
            <button
              data-testid={`pin-btn-${doc.id}`}
              onClick={() => onTogglePin(doc.id)}
              title={isPinned ? 'Unpin document' : 'Pin document'}
              style={{
                background: isPinned ? 'rgba(251,191,36,0.15)' : 'none', border: 'none', cursor: 'pointer',
                fontSize: 15, padding: '2px 5px', borderRadius: 6,
                color: isPinned ? '#fbbf24' : 'rgba(255,255,255,0.25)',
                transition: 'color 0.15s', lineHeight: 1,
              }}
            >
              {isPinned ? '📌' : '📍'}
            </button>
          )}
          <span style={{
            ...cs, flexShrink: 0, display: 'inline-flex', alignItems: 'center',
            padding: '2px 10px', borderRadius: 9999,
            fontSize: 11, fontWeight: 600, border: `1px solid ${cs.border}`,
          }}>
            {doc.category}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--gray-500)', lineHeight: 1.55 }}>
        {doc.description}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 2 }}>
        {doc.version && <span style={{ fontSize: 11.5, color: 'var(--gray-400)', fontWeight: 600 }}>v{doc.version}</span>}
        {doc.lastUpdated && <span style={{ fontSize: 11.5, color: 'var(--gray-400)' }}>Updated {doc.lastUpdated}</span>}
        {doc.sourceType && doc.sourceType !== 'manual' && (
          <a
            href={getDocFileUrl(doc.id, doc.sourceType)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11.5, color: '#DD1D21', fontWeight: 600, textDecoration: 'none' }}
          >
            📄 View
          </a>
        )}
        <button
          data-testid={`history-btn-${doc.id}`}
          onClick={handleHistory}
          style={{
            marginLeft: 'auto', fontSize: 11.5, color: '#1d4ed8',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', padding: '2px 6px', borderRadius: 5,
            fontWeight: 500,
          }}
        >
          {showHistory ? '▲ Hide' : '📋 History'}
        </button>
      </div>

      {/* Version history */}
      {showHistory && (
        <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 12, marginTop: 4 }}>
          {loadingV ? (
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: '#DD1D21', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            </div>
          ) : versions?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {versions.map((v) => (
                <div key={v.version} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#FFD500', minWidth: 32, flexShrink: 0 }}>v{v.version}</span>
                  <span style={{ color: 'var(--gray-400)', minWidth: 86, flexShrink: 0 }}>{v.updatedAt}</span>
                  <span style={{ color: 'var(--gray-600)', flex: 1, lineHeight: 1.45 }}>{v.changelog}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>No version history available.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Search Result Card ────────────────────────────────────────────────────────
function SearchResultCard({ result }) {
  const cs       = catStyle(result.category);
  const srcBadge = SOURCE_BADGES[result.sourceType] || SOURCE_BADGES.manual;
  const isSemantic = result.searchMode === 'semantic';

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--gray-200)',
      borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.35, flex: 1 }}>
          {result.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {isSemantic && result.score != null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
              background: 'rgba(99,102,241,0.10)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)',
            }}>
              ✦ {result.score}% match
            </span>
          )}
          {result.sourceType && result.sourceType !== 'manual' && (
            <span style={{
              ...srcBadge, display: 'inline-flex', alignItems: 'center',
              padding: '2px 7px', borderRadius: 6,
              fontSize: 10.5, fontWeight: 700,
              border: `1px solid ${srcBadge.border}`,
            }}>
              {srcBadge.label}
            </span>
          )}
          <span style={{
            ...cs, flexShrink: 0, display: 'inline-flex', alignItems: 'center',
            padding: '2px 10px', borderRadius: 9999,
            fontSize: 11, fontWeight: 600, border: `1px solid ${cs.border}`,
          }}>
            {result.category}
          </span>
        </div>
      </div>

      {/* Snippet — may contain <mark> highlights from either backend */}
      {result.snippet && (
        <div
          style={{ fontSize: 12.5, color: 'var(--gray-500)', lineHeight: 1.65 }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: result.snippet }}
        />
      )}

      {/* Footer */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {result.version && <span style={{ fontSize: 11.5, color: 'var(--gray-400)', fontWeight: 600 }}>v{result.version}</span>}
        {result.lastUpdated && <span style={{ fontSize: 11.5, color: 'var(--gray-400)' }}>Updated {result.lastUpdated}</span>}
        {result.originalFilename && (
          <span style={{ fontSize: 11, color: 'var(--gray-300)' }}>
            📎 {result.originalFilename}
          </span>
        )}
        {result.sourceType && result.sourceType !== 'manual' && (
          <a
            href={getDocFileUrl(result.id, result.sourceType)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 'auto', fontSize: 11.5, color: '#DD1D21', fontWeight: 600, textDecoration: 'none' }}
          >
            📄 View
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IntraPortal() {
  const isLoggedIn = !!localStorage.getItem('som_token');
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('som_user')) || {}; } catch { return {}; }
  })();
  const firstName = storedUser.name ? storedUser.name.split(' ')[0] : '';

  // Apps (only when logged in)
  const [apps, setApps]               = useState([]);
  const [appsErr, setAppsErr]         = useState('');
  const [favourites, setFavourites]   = useState([]);
  const [ssoLaunching, setSsoLaunching] = useState(new Set());

  // Knowledge
  const [kbDocs, setKbDocs]           = useState([]);
  const [kbLoading, setKbLoading]     = useState(false);
  const [kbErr, setKbErr]             = useState('');
  const [searchTerm, setSearchTerm]   = useState('');
  const [kbCategory, setKbCategory]   = useState('All');
  const [pinnedDocs, setPinnedDocs]   = useState([]);
  const [isFtsMode, setIsFtsMode]     = useState(false);


  const debounceRef = useRef(null);

  // ── Load apps, favourites, and pinned docs on mount (auth-gated) ─────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    async function load() {
      try {
        const [appsData, favsData, pinsData] = await Promise.all([
          getApps(), getFavourites(), getPinnedDocs(),
        ]);
        setApps(appsData);
        setFavourites(favsData);
        setPinnedDocs(pinsData);
      } catch {
        setAppsErr('Failed to load apps. Please refresh.');
      }
    }
    load();
  }, [isLoggedIn]);

  // ── Knowledge base search (debounced 300 ms) ──────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setKbLoading(true); setKbErr('');
      try {
        if (searchTerm.trim()) {
          // Full-text search with highlighted snippets
          const results = await searchKnowledge(searchTerm.trim(), kbCategory);
          setKbDocs(results);
          setIsFtsMode(true);
        } else {
          // Browse mode
          const params = {};
          if (kbCategory !== 'All') params.category = kbCategory;
          setKbDocs(await getKnowledge(params));
          setIsFtsMode(false);
        }
      } catch {
        setKbErr('Failed to load documents.');
      } finally {
        setKbLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, kbCategory]);

  // ── App click: SSO-aware navigation ──────────────────────────────────────────
  async function handleAppClick(app) {
    if (app.ssoEnabled) {
      setSsoLaunching((prev) => new Set(prev).add(app.id));
      try {
        await ssoLogin(app);
        if (app.url && app.url !== '#') window.open(app.url, '_blank', 'noopener,noreferrer');
      } finally {
        setSsoLaunching((prev) => { const n = new Set(prev); n.delete(app.id); return n; });
      }
    } else {
      if (app.url && app.url !== '#') window.open(app.url, '_blank', 'noopener,noreferrer');
    }
  }

  // ── Star toggle ────────────────────────────────────────────────────────────────
  async function handleToggleStar(appId) {
    setFavourites((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
    try {
      const data = await toggleFavourite(appId);
      setFavourites(data.favourites);
    } catch {
      setFavourites((prev) =>
        prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
      );
    }
  }

  // ── Pin toggle ─────────────────────────────────────────────────────────────────
  async function handleTogglePin(docId) {
    setPinnedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
    try {
      const data = await togglePinnedDoc(docId);
      setPinnedDocs(data.pinnedDocs);
    } catch {
      setPinnedDocs((prev) =>
        prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
      );
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────────
  const groupedApps    = apps.reduce((acc, app) => {
    if (!acc[app.category]) acc[app.category] = [];
    acc[app.category].push(app);
    return acc;
  }, {});
  const favouritedApps = apps.filter((a) => favourites.includes(a.id));
  const pinnedKbDocs   = !isFtsMode ? kbDocs.filter((d) => pinnedDocs.includes(d.id)) : [];

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          data-testid="welcome-header"
          style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '-0.4px', marginBottom: 4 }}
        >
          {firstName ? `Welcome back, ${firstName}` : 'Intra Portal'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>
          Shell Oman Marketing — corporate apps and knowledge base
        </p>
      </div>

      {appsErr && (
        <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', color: '#ff6b6b', borderRadius: 10, padding: '12px 16px', fontSize: 14, marginBottom: 20 }}>
          {appsErr}
        </div>
      )}

      {/* ── SECTION 1: Favourites (logged-in only) ──────────────────────────── */}
      {isLoggedIn && favouritedApps.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>★</span>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)' }}>Favourites</h2>
            <span style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>
              {favouritedApps.length} app{favouritedApps.length > 1 ? 's' : ''}
            </span>
          </div>
          <div style={gridStyle}>
            {favouritedApps.map((app) => (
              <AppTile
                key={app.id} app={app} isFav={true}
                onToggleStar={handleToggleStar}
                onAppClick={handleAppClick}
                launching={ssoLaunching.has(app.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 2: All Apps by Category (logged-in only) ────────────────── */}
      {isLoggedIn && apps.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)' }}>All Apps</h2>
            <div style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 9999, border: '1px solid rgba(167,139,250,0.30)' }}>
              🔐 SSO-enabled apps launch securely via single sign-on
            </div>
          </div>

          {Object.entries(groupedApps).map(([category, catApps]) => (
            <div key={category} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{
                  ...catStyle(category),
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 12px', borderRadius: 9999,
                  fontSize: 11.5, fontWeight: 700, letterSpacing: '0.3px',
                  border: `1px solid ${catStyle(category).border}`,
                }}>
                  {category}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--gray-100)' }} />
              </div>
              <div style={gridStyle}>
                {catApps.map((app) => (
                  <AppTile
                    key={app.id} app={app}
                    isFav={favourites.includes(app.id)}
                    onToggleStar={handleToggleStar}
                    onAppClick={handleAppClick}
                    launching={ssoLaunching.has(app.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Sign-in prompt when not logged in */}
      {!isLoggedIn && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--gray-200)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: 'var(--shadow-xs)',
        }}>
          <span style={{ fontSize: 24 }}>🔐</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 3 }}>
              Sign in to access corporate apps
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              The knowledge base is available to everyone.{' '}
              <a href="/login" style={{ color: '#DD1D21', fontWeight: 600, textDecoration: 'none' }}>
                Sign in →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Knowledge Base ─────────────────────────────────────────── */}
      <section>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            Knowledge Base
            {isFtsMode && kbDocs.length > 0 && (() => {
              const mode = kbDocs[0]?.searchMode;
              return (
                <>
                  {mode === 'semantic' && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, padding: '2px 8px', letterSpacing: '0.2px' }}>
                      ✦ AI Semantic Search
                    </span>
                  )}
                  {mode === 'fts' && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', background: 'var(--gray-100)', borderRadius: 6, padding: '2px 8px' }}>
                      Full-text search
                    </span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-400)' }}>
                    {kbDocs.length} result{kbDocs.length !== 1 ? 's' : ''}
                  </span>
                </>
              );
            })()}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              data-testid="knowledge-search"
              type="text"
              placeholder="Search documents, policies, procedures…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', maxWidth: 460, padding: '10px 14px',
                border: '1px solid var(--gray-200)', borderRadius: 10, fontSize: 14,
                fontFamily: 'inherit', background: 'var(--gray-50)',
                color: 'var(--gray-900)', outline: 'none', boxShadow: 'var(--shadow-xs)',
              }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KB_CATEGORIES.map((cat) => {
                const active = kbCategory === cat;
                const cs = catStyle(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setKbCategory(cat)}
                    style={{
                      padding: '5px 16px', borderRadius: 9999, fontSize: 12.5,
                      fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      border: active ? `1.5px solid ${cs.border}` : '1px solid var(--gray-200)',
                      background: active ? cs.bg : 'var(--surface)',
                      color: active ? cs.color : 'var(--gray-500)',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {kbErr && (
          <div style={{ color: '#ff6b6b', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
            {kbErr}
          </div>
        )}

        {/* Pinned Documents (browse mode only, logged-in only) */}
        {!isFtsMode && isLoggedIn && pinnedKbDocs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>📌</span>
              <h3 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gray-700)' }}>Pinned Documents</h3>
              <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{pinnedKbDocs.length}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-100)' }} />
            </div>
            <div style={kbGridStyle}>
              {pinnedKbDocs.map((doc) => (
                <KnowledgeCard
                  key={doc.id} doc={doc} isPinned={true} onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div data-testid="knowledge-results">
          {kbLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#DD1D21', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : isFtsMode && searchTerm.trim() && kbDocs.length === 0 ? (
            <div
              data-testid="empty-state"
              style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--gray-400)', fontSize: 14 }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              No results for "{searchTerm}"
            </div>
          ) : !isFtsMode && kbDocs.length === 0 ? (
            <div
              data-testid="empty-state"
              style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--gray-400)', fontSize: 14 }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              No documents found
            </div>
          ) : isFtsMode ? (
            /* FTS results with highlighted snippets */
            <div style={kbGridStyle}>
              {kbDocs.map((result) => (
                <SearchResultCard key={result.id} result={result} />
              ))}
            </div>
          ) : (
            /* Browse results with pin/version history */
            <div style={kbGridStyle}>
              {kbDocs.map((doc) => (
                <KnowledgeCard
                  key={doc.id} doc={doc}
                  isPinned={isLoggedIn && pinnedDocs.includes(doc.id)}
                  onTogglePin={isLoggedIn ? handleTogglePin : null}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Inject mark highlight styles once */}
      <style>{`
        mark { background: rgba(255,213,0,0.35); color: inherit; border-radius: 2px; padding: 0 2px; }
      `}</style>
    </div>
  );
}

// ─── Responsive grid styles ───────────────────────────────────────────────────
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 14,
};

const kbGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 14,
};
