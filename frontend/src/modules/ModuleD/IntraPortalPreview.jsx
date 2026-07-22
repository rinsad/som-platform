import { useEffect, useState } from 'react';
import {
  getApps, getDocFileUrl, getDocVersions, getFavourites, getKnowledge,
  getPinnedDocs, searchKnowledge, ssoLogin, toggleFavourite, togglePinnedDoc,
} from '../../services/portalService';
import { sanitizeSnippet } from '../../utils/sanitizeHtml';

const SHELL_RED = 'var(--shell-red)';
const SHELL_YELLOW = 'var(--shell-yellow)';

const NEWS_ITEMS = [
  { title: 'New joiner', text: 'Welcome messages, team introductions and first-week highlights.' },
  { title: 'New baby born', text: 'Share family announcements and warm wishes from colleagues.' },
  { title: 'Marriage', text: 'Celebrate employee milestones and community moments.' },
  { title: 'Long service', text: 'Recognise service anniversaries and employee contributions.' },
  { title: 'Farewell', text: 'Appreciation posts for colleagues moving into a new chapter.' },
  { title: 'Condolence message', text: 'Respectful notices and support messages for employees.' },
  { title: 'Success story to share', text: 'Stories of achievement, teamwork and customer impact.' },
];

const DEI_TOPICS = [
  { title: 'Disability', text: 'Accessibility, workplace support and inclusive participation.' },
  { title: 'Gender', text: 'Balanced representation, development and allyship stories.' },
  { title: 'Culture', text: 'Belonging, local identity and cross-cultural learning.' },
  { title: 'Race & Ethnicity', text: 'Respect, awareness and employee voice across the organisation.' },
];

const DEI_UPDATES = [
  'People movement updates',
  'Role rotation stories',
  'Inclusion calendar and awareness events',
  'Employee resource and listening group highlights',
];

const OFFERS = [
  { title: 'Retail fuel offers', text: 'Employee promotions, campaign windows and participation details.' },
  { title: 'Lubricants discounts', text: 'Staff pricing, eligibility and branch contact points.' },
  { title: 'Partner offers', text: 'Corporate benefits from approved employee discount partners.' },
];

const WELLBEING = [
  { title: 'Medical support', text: 'Health insurance, clinic access and emergency contact guidance.' },
  { title: 'Mental health', text: 'Confidential support, wellbeing resources and manager guidance.' },
  { title: 'Employee assistance', text: 'Practical support for personal, family and workplace concerns.' },
];

const HELP_LINKS = ['Code of Conduct', 'Legal and Ethics', 'Compliance'];
const KB_CATEGORIES = ['All', 'Policy', 'Procedure', 'QHSE', 'HR'];

const FALLBACK_APPS = [
  { id: 'APP-001', name: 'SAP', description: 'Enterprise resource planning, financials, procurement and operations.', icon: 'SAP', category: 'Enterprise', url: '#', ssoEnabled: true },
  { id: 'APP-002', name: 'Leave Portal', description: 'Apply for leave and track your balance.', icon: 'LP', category: 'HR', url: '#', ssoEnabled: false },
  { id: 'APP-003', name: 'QHSE Portal', description: 'Report incidents, manage safety audits and track QHSE KPIs.', icon: 'QH', category: 'QHSE', url: '#', ssoEnabled: false },
  { id: 'APP-004', name: 'IT Helpdesk', description: 'Raise IT support tickets and track resolution status.', icon: 'IT', category: 'IT', url: '#', ssoEnabled: false },
  { id: 'APP-005', name: 'Procurement', description: 'Manage purchase requests, vendor quotes and procurement workflows.', icon: 'PR', category: 'Procurement', url: '#', ssoEnabled: true },
  { id: 'APP-006', name: 'Finance Reports', description: 'Access monthly P&L, budgets and financial dashboards.', icon: 'FR', category: 'Finance', url: '#', ssoEnabled: true },
  { id: 'APP-007', name: 'HR Portal', description: 'Employee directory, payslips, performance reviews and onboarding.', icon: 'HR', category: 'HR', url: '#', ssoEnabled: true },
  { id: 'APP-008', name: 'Training Portal', description: 'Browse and enrol in mandatory and elective training courses.', icon: 'TR', category: 'HR', url: '#', ssoEnabled: false },
  { id: 'APP-009', name: 'Asset Manager', description: 'Track real estate assets, utility bills and compliance schedules.', icon: 'AM', category: 'Operations', url: '#', ssoEnabled: false },
  { id: 'APP-010', name: 'Project Tracker', description: 'Monitor project milestones, resource allocation and delivery status.', icon: 'PT', category: 'Operations', url: '#', ssoEnabled: false },
  { id: 'APP-011', name: 'Document Hub', description: 'Central repository for policies, procedures and corporate documents.', icon: 'DH', category: 'Administration', url: '#', ssoEnabled: false },
  { id: 'APP-012', name: 'Admin Console', description: 'User management, system configuration and access control settings.', icon: 'AC', category: 'Administration', url: '#', ssoEnabled: false },
];

const CATEGORY_COLORS = {
  Enterprise: { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-bg)' },
  HR: { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-bg)' },
  QHSE: { bg: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)', border: 'var(--accent-amber-line)' },
  Policy: { bg: 'var(--accent-red-bg)', color: SHELL_RED, border: 'var(--accent-red-line)' },
  Procedure: { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-bg)' },
  IT: { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-bg)' },
  Finance: { bg: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)', border: 'var(--accent-amber-line)' },
  Procurement: { bg: 'var(--neutral-bg)', color: 'var(--neutral)', border: 'var(--neutral-bg)' },
  Operations: { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-bg)' },
  Administration: { bg: 'var(--fill-tertiary)', color: 'var(--gray-600)', border: 'var(--gray-200)' },
};

const SOURCE_BADGES = {
  pdf: { label: 'PDF', bg: 'var(--accent-red-bg)', color: SHELL_RED, border: 'var(--accent-red-line)' },
  docx: { label: 'DOCX', bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-bg)' },
  eml: { label: 'EML', bg: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)', border: 'var(--accent-amber-line)' },
  txt: { label: 'TXT', bg: 'var(--fill-tertiary)', color: 'var(--gray-600)', border: 'var(--gray-200)' },
  manual: { label: 'KB', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-bg)' },
};

function catStyle(cat) {
  const colors = CATEGORY_COLORS[cat] || { bg: 'var(--fill-tertiary)', color: 'var(--gray-600)', border: 'var(--gray-200)' };
  return { background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` };
}

function Card({ title, text }) {
  return (
    <article className="preview-card" style={s.card}>
      <span style={s.cardAccent} />
      <h3 style={s.cardTitle}>{title}</h3>
      <p style={s.cardText}>{text}</p>
    </article>
  );
}

function TextLink({ children }) {
  return (
    <a href="/login" style={s.textLink}>
      {children}
      <span aria-hidden="true">-&gt;</span>
    </a>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={s.searchGlyph}>
      <path d="M10.8 18.1a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Zm5.1-1.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function StarButton({ active, onClick, appId }) {
  if (!onClick) return null;
  return (
    <button
      onClick={(event) => { event.stopPropagation(); onClick(appId); }}
      style={active ? s.starActive : s.star}
      title={active ? 'Remove from favourites' : 'Add to favourites'}
      type="button"
    >
      {active ? '*' : '+'}
    </button>
  );
}

function AppTile({ app, isFav, onToggleStar, onAppClick, launching }) {
  const iconText = (app.icon && app.icon !== 'APP')
    ? app.icon
    : app.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2);

  return (
    <button
      onClick={() => !launching && onAppClick(app)}
      style={s.appTile}
      type="button"
    >
      {launching && (
        <span style={s.launching}>
          <span style={s.spinner} />
          Connecting via SSO
        </span>
      )}
      <StarButton active={isFav} onClick={onToggleStar} appId={app.id} />
      {app.ssoEnabled && <span style={s.ssoBadge}>SSO</span>}
      <span style={{ ...s.appIcon, ...catStyle(app.category) }}>{iconText}</span>
      <span style={s.appTitle}>{app.name}</span>
    </button>
  );
}

function KnowledgeCard({ doc, isPinned, onTogglePin }) {
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState(null);
  const [loading, setLoading] = useState(false);
  const srcBadge = SOURCE_BADGES[doc.sourceType] || SOURCE_BADGES.manual;

  const handleHistory = async () => {
    if (!showHistory && versions === null) {
      setLoading(true);
      try {
        setVersions(await getDocVersions(doc.id));
      } catch {
        setVersions([]);
      } finally {
        setLoading(false);
      }
    }
    setShowHistory((value) => !value);
  };

  return (
    <article style={s.kbCard}>
      <div style={s.kbHeader}>
        <h3 style={s.kbTitle}>{doc.title}</h3>
        <div style={s.badgeRow}>
          {doc.sourceType && doc.sourceType !== 'manual' && <span style={{ ...s.fileBadge, ...srcBadge }}>{srcBadge.label}</span>}
          {onTogglePin && (
            <button onClick={() => onTogglePin(doc.id)} style={isPinned ? s.pinActive : s.pin} type="button">
              {isPinned ? 'Pinned' : 'Pin'}
            </button>
          )}
        </div>
      </div>
      <p style={s.kbText}>{doc.description}</p>
      <div style={s.kbMeta}>
        <span style={{ ...s.tag, ...catStyle(doc.category) }}>{doc.category}</span>
        {doc.version && <span>v{doc.version}</span>}
        {doc.lastUpdated && <span>Updated {doc.lastUpdated}</span>}
        {doc.sourceType && doc.sourceType !== 'manual' && (
          <a href={getDocFileUrl(doc.id, doc.sourceType, doc.hasStoredFile)} target="_blank" rel="noopener noreferrer" style={s.redLink}>
            View
          </a>
        )}
        <button onClick={handleHistory} style={s.textButton} type="button">
          {showHistory ? 'Hide history' : 'History'}
        </button>
      </div>
      {showHistory && (
        <div style={s.history}>
          {loading ? (
            <span>Loading history...</span>
          ) : versions?.length > 0 ? (
            versions.map((item) => (
              <div key={item.version} style={s.historyItem}>
                <strong>v{item.version}</strong>
                <span>{item.updatedAt}</span>
                <span>{item.changelog}</span>
              </div>
            ))
          ) : (
            <span>No version history available.</span>
          )}
        </div>
      )}
    </article>
  );
}

function SearchResultCard({ result }) {
  const srcBadge = SOURCE_BADGES[result.sourceType] || SOURCE_BADGES.manual;
  return (
    <article style={s.kbCard}>
      <div style={s.kbHeader}>
        <h3 style={s.kbTitle}>{result.title}</h3>
        <div style={s.badgeRow}>
          {result.searchMode === 'semantic' && result.score != null && <span style={s.matchBadge}>{result.score}% match</span>}
          {result.sourceType && result.sourceType !== 'manual' && <span style={{ ...s.fileBadge, ...srcBadge }}>{srcBadge.label}</span>}
          <span style={{ ...s.tag, ...catStyle(result.category) }}>{result.category}</span>
        </div>
      </div>
      {result.snippet && <p style={s.kbText} dangerouslySetInnerHTML={{ __html: sanitizeSnippet(result.snippet) }} />}
      <div style={s.kbMeta}>
        {result.version && <span>v{result.version}</span>}
        {result.lastUpdated && <span>Updated {result.lastUpdated}</span>}
        {result.sourceType && result.sourceType !== 'manual' && (
          <a href={getDocFileUrl(result.id, result.sourceType, result.hasStoredFile)} target="_blank" rel="noopener noreferrer" style={s.redLink}>
            View
          </a>
        )}
      </div>
    </article>
  );
}

export default function IntraPortalPreview() {
  const isLoggedIn = !!localStorage.getItem('som_token');
  const [apps, setApps] = useState([]);
  const [appsErr, setAppsErr] = useState('');
  const [favourites, setFavourites] = useState([]);
  const [ssoLaunching, setSsoLaunching] = useState(new Set());
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [kbDocs, setKbDocs] = useState([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbErr, setKbErr] = useState('');
  const [kbQuery, setKbQuery] = useState('');
  const [kbCategory, setKbCategory] = useState('All');
  const [pinnedDocs, setPinnedDocs] = useState([]);
  const [isFtsMode, setIsFtsMode] = useState(false);

  useEffect(() => {
    async function loadApps() {
      try {
        const appsData = await getApps();
        setApps(appsData.length ? appsData : FALLBACK_APPS);
        if (isLoggedIn) {
          const [favsData, pinsData] = await Promise.all([getFavourites(), getPinnedDocs()]);
          setFavourites(favsData);
          setPinnedDocs(pinsData);
        }
      } catch {
        setApps(FALLBACK_APPS);
        setAppsErr('');
      }
    }
    loadApps();
  }, [isLoggedIn]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setKbLoading(true);
      setKbErr('');
      try {
        if (kbQuery.trim()) {
          const results = await searchKnowledge(kbQuery.trim(), kbCategory);
          setKbDocs(results);
          setIsFtsMode(true);
        } else {
          const params = {};
          if (kbCategory !== 'All') params.category = kbCategory;
          setKbDocs(await getKnowledge(params));
          setIsFtsMode(false);
        }
      } catch {
        setKbDocs([]);
        setKbErr('Failed to load knowledge documents.');
      } finally {
        setKbLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [kbQuery, kbCategory]);

  async function handleAppClick(app) {
    setAppLauncherOpen(false);
    if (app.ssoEnabled) {
      if (!isLoggedIn) {
        window.location.href = '/login';
        return;
      }
      setSsoLaunching((prev) => new Set(prev).add(app.id));
      try {
        await ssoLogin(app);
        if (app.url && app.url !== '#') window.open(app.url, '_blank', 'noopener,noreferrer');
      } finally {
        setSsoLaunching((prev) => {
          const next = new Set(prev);
          next.delete(app.id);
          return next;
        });
      }
    } else if (app.url && app.url !== '#') {
      window.open(app.url, '_blank', 'noopener,noreferrer');
    }
  }

  async function handleToggleStar(appId) {
    setFavourites((prev) => (prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]));
    try {
      const data = await toggleFavourite(appId);
      setFavourites(data.favourites);
    } catch {
      setFavourites((prev) => (prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]));
    }
  }

  async function handleTogglePin(docId) {
    setPinnedDocs((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]));
    try {
      const data = await togglePinnedDoc(docId);
      setPinnedDocs(data.pinnedDocs);
    } catch {
      setPinnedDocs((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]));
    }
  }

  const favouritedApps = apps.filter((app) => favourites.includes(app.id));
  const launcherApps = [
    ...favouritedApps,
    ...apps.filter((app) => !favourites.includes(app.id)),
  ];
  const filteredNewsItems = NEWS_ITEMS.filter((item) => {
    const query = peopleQuery.trim().toLowerCase();
    if (!query) return true;
    return `${item.title} ${item.text}`.toLowerCase().includes(query);
  });
  const pinnedKbDocs = !isFtsMode ? kbDocs.filter((doc) => pinnedDocs.includes(doc.id)) : [];

  return (
    <div style={s.page}>
      <section id="our-company" style={s.hero}>
        <div style={s.heroImage} />
        <div style={s.heroContent}>
          <span style={s.eyebrow}>Shell Oman Marketing Company</span>
          <h1 className="intra-preview-hero-title" style={s.heroTitle}>Employee Intraportal</h1>
          <p style={s.heroText}>
            One home for company news, DE&I stories, people movement, HR Online,
            Goal Zero, employee offers, wellbeing and help resources.
          </p>
          <div style={s.heroActions}>
            <a href="#people-finder" style={s.primaryButton}>Share employee news</a>
            <a href="#goal-zero" style={s.yellowButton}>Explore DE&I</a>
            <a href="#need-help" style={s.ghostButton}>Need help</a>
          </div>
        </div>
      </section>

      <section id="people-finder" style={s.section}>
        <div style={s.container}>
          <div style={s.sectionHeader}>
            <span style={s.kicker}>Employee news sharing</span>
            <h2 style={s.sectionTitle}>Updates that keep colleagues connected</h2>
            <p style={s.sectionText}>
              A dedicated publishing area for personal milestones, recognition and
              success stories, replacing the old generic home content cards.
            </p>
          </div>
          <div style={s.searchRow}>
            <SearchGlyph />
            <input
              id="preview-search"
              type="search"
              placeholder="Search people updates, milestones or success stories..."
              value={peopleQuery}
              onChange={(event) => setPeopleQuery(event.target.value)}
              style={s.searchInput}
            />
          </div>
          <div style={s.newsGrid}>
            {filteredNewsItems.map((item) => <Card key={item.title} {...item} />)}
          </div>
          {filteredNewsItems.length === 0 && <div style={s.emptyState}>No matching updates found.</div>}
        </div>
      </section>

      <section id="goal-zero" style={s.quoteBand}>
        <div style={s.container}>
          <div style={s.quoteBox}>
            <h2 style={s.deiTitle}>Welcome to the DE&I Portal</h2>
            <p style={s.quote}>
              "Shell remains committed to being a place where everyone feels valued
              and respected, no matter where you are in the world."
            </p>
            <p style={s.quoteByline}>
              Sir Andrew Mackenzie, Shell Chair at Shell's Annual General Meeting,
              London on May 20, 2025
            </p>
          </div>

          <div className="intra-preview-dei-layout" style={s.deiLayout}>
            <div style={s.deiPanel}>
              <span style={s.kickerDark}>D&I content</span>
              <h2 style={s.featureTitle}>Stories, learning and action for inclusion</h2>
              <div style={s.topicTabs}>
                {DEI_TOPICS.map((topic) => <span key={topic.title} style={s.topicTab}>{topic.title}</span>)}
              </div>
              <div style={s.topicGrid}>
                {DEI_TOPICS.map((topic) => <Card key={topic.title} {...topic} />)}
              </div>
            </div>
            <aside style={s.sidePanel}>
              <h3 style={s.sideTitle}>People Move, Rotation</h3>
              {DEI_UPDATES.map((item) => <p key={item} style={s.sideItem}>{item}</p>)}
            </aside>
          </div>
        </div>
      </section>

      <section id="business-function" style={s.section}>
        <div style={s.container}>
          <div className="intra-preview-two-column" style={s.twoColumn}>
            <div>
              <span style={s.kicker}>Corporate offers and discounts</span>
              <h2 style={s.sectionTitle}>Employee offers in place of division detail pages</h2>
              <p style={s.sectionText}>
                This preview removes the department tiles, selected division pages
                and focal ownership content, replacing that space with employee
                corporate offers and discount information.
              </p>
            </div>
            <div style={s.offerGrid}>
              {OFFERS.map((item) => <Card key={item.title} {...item} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="hr-online" style={s.healthBand}>
        <div style={s.container}>
          <div className="intra-preview-two-column" style={s.twoColumn}>
            <div>
              <span style={s.kicker}>Medical and mental health</span>
              <h2 style={s.sectionTitle}>Wellbeing support for every employee</h2>
              <p style={s.sectionText}>
                A focused area for medical assistance, mental health resources,
                HR Online access and employee assistance services.
              </p>
            </div>
            <div style={s.healthGrid}>
              {WELLBEING.map((item) => <Card key={item.title} {...item} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="knowledge" style={s.section}>
        <div style={s.container}>
          <div style={s.sectionHeader}>
            <span style={s.kicker}>Knowledge base</span>
            <h2 style={s.sectionTitle}>Policies, procedures and learning materials</h2>
            <p style={s.sectionText}>
              Search SOM documents, browse by category, pin key references and view version history.
            </p>
          </div>

          <div style={s.kbSearchBar}>
            <input
              type="search"
              placeholder="Search documents, policies, procedures..."
              value={kbQuery}
              onChange={(event) => setKbQuery(event.target.value)}
              style={s.kbSearchInput}
            />
            <div style={s.categoryFilter}>
              {KB_CATEGORIES.map((cat) => {
                const active = kbCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setKbCategory(cat)}
                    style={active ? s.filterActive : s.filter}
                    type="button"
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {kbErr && <div style={s.error}>{kbErr}</div>}

          {!isFtsMode && isLoggedIn && pinnedKbDocs.length > 0 && (
            <section style={s.toolSection}>
              <h3 style={s.toolHeading}>Pinned Documents <span>{pinnedKbDocs.length}</span></h3>
              <div style={s.kbGrid}>
                {pinnedKbDocs.map((doc) => (
                  <KnowledgeCard key={doc.id} doc={doc} isPinned onTogglePin={handleTogglePin} />
                ))}
              </div>
            </section>
          )}

          <div>
            {kbLoading ? (
              <div style={s.loading}>Loading documents...</div>
            ) : isFtsMode && kbQuery.trim() && kbDocs.length === 0 ? (
              <div style={s.empty}>No results for "{kbQuery}"</div>
            ) : !isFtsMode && kbDocs.length === 0 ? (
              <div style={s.empty}>No documents found</div>
            ) : (
              <div style={s.kbGrid}>
                {kbDocs.map((doc) => (
                  isFtsMode
                    ? <SearchResultCard key={doc.id} result={doc} />
                    : (
                      <KnowledgeCard
                        key={doc.id}
                        doc={doc}
                        isPinned={isLoggedIn && pinnedDocs.includes(doc.id)}
                        onTogglePin={isLoggedIn ? handleTogglePin : null}
                      />
                    )
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="need-help" style={s.helpBand}>
        <div style={s.container}>
          <div className="intra-preview-help-layout" style={s.helpLayout}>
            <div>
              <span style={s.kickerLight}>Need help</span>
              <h2 style={s.helpTitle}>Find the right guidance quickly</h2>
              <p style={s.helpText}>
                Replace the long service award block with help pathways for conduct,
                legal, ethics and compliance questions.
              </p>
            </div>
            <div style={s.helpLinks}>
              {HELP_LINKS.map((link) => <TextLink key={link}>{link}</TextLink>)}
            </div>
          </div>
        </div>
      </section>

      <aside
        className={`preview-app-dock${appLauncherOpen ? ' is-open' : ''}`}
        style={s.appDock}
        aria-label="Employee app launcher"
        onMouseLeave={() => setAppLauncherOpen(false)}
      >
        <button
          type="button"
          style={s.appDockTab}
          aria-label={appLauncherOpen ? 'Close employee apps' : 'Open employee apps'}
          aria-expanded={appLauncherOpen}
          onClick={() => setAppLauncherOpen((open) => !open)}
          onMouseEnter={() => setAppLauncherOpen(true)}
        >
          <span style={s.appDockDots}>...</span>
          <span style={s.appDockText}>Apps</span>
        </button>

        <div className="preview-app-panel" style={s.appPanel}>
          <div style={s.launcherHeader}>
            <span style={s.launcherIcon}>SOM</span>
            <div style={s.launcherTitle}>
              <strong>Employee apps</strong>
              <small>{apps.length} shortcuts</small>
            </div>
          </div>

          <div style={s.launcherDivider} />

          <div className="preview-launcher-scroll" style={s.launcherScroll}>
            {appsErr && <div style={s.error}>{appsErr}</div>}
            <div style={s.appGrid}>
              {launcherApps.map((app) => (
                <AppTile
                  key={app.id}
                  app={app}
                  isFav={favourites.includes(app.id)}
                  onToggleStar={isLoggedIn ? handleToggleStar : null}
                  onAppClick={handleAppClick}
                  launching={ssoLaunching.has(app.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        html {
          scroll-behavior: smooth;
        }
        #our-company,
        #people-finder,
        #goal-zero,
        #business-function,
        #hr-online,
        #need-help {
          scroll-margin-top: 96px;
        }
        #knowledge {
          scroll-margin-top: 96px;
        }
        mark { background: rgba(255, 213, 0, 0.55); color: inherit; border-radius: 2px; padding: 0 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .preview-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .preview-card:hover,
        .preview-card:focus-within {
          transform: translateY(-4px);
          border-color: var(--gray-300) !important;
          box-shadow: 0 14px 28px rgba(0,0,0,0.1);
        }
        .preview-app-panel {
          opacity: 0;
          pointer-events: none;
          transform: translateX(calc(100% + 48px));
          transition: opacity 0.18s ease, transform 0.2s ease;
        }
        .preview-app-dock.is-open .preview-app-panel {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(0);
        }
        .preview-app-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 18% 10%, rgba(255, 213, 0, 0.24), transparent 30%),
            linear-gradient(145deg, rgba(255,255,255,0.88), rgba(255,255,255,0.64));
          pointer-events: none;
        }
        .preview-launcher-scroll::-webkit-scrollbar {
          width: 7px;
        }
        .preview-launcher-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .preview-launcher-scroll::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.22);
          border-radius: 999px;
        }
        @media (max-width: 900px) {
          .intra-preview-two-column,
          .intra-preview-dei-layout,
          .intra-preview-help-layout {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          .intra-preview-hero-title {
            font-size: 42px !important;
          }
          .preview-app-dock {
            top: 154px !important;
          }
          .preview-app-panel {
            width: calc(100vw - 58px) !important;
            max-height: min(520px, 68vh) !important;
            border-radius: 24px 0 0 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: { background: '#fff', color: 'var(--label)' },
  hero: { position: 'relative', minHeight: 500, overflow: 'hidden', background: 'var(--label)', borderBottom: `12px solid ${SHELL_YELLOW}` },
  heroImage: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.82), rgba(0,0,0,0.5), rgba(0,0,0,0.18)), url(/leen-logo.png)',
    backgroundSize: 'cover, min(56vw, 760px) auto',
    backgroundPosition: 'center, 78% center',
    backgroundRepeat: 'no-repeat',
    transform: 'scale(1.02)',
  },
  heroContent: { position: 'relative', maxWidth: 1180, margin: '0 auto', minHeight: 500, padding: '78px 24px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  eyebrow: { width: 'fit-content', background: SHELL_YELLOW, color: 'var(--label)', fontSize: 13, fontWeight: 900, padding: '8px 12px', borderRadius: 'var(--radius-xs)', marginBottom: 18 },
  heroTitle: { fontSize: 68, lineHeight: 0.98, fontWeight: 900, marginBottom: 18 },
  heroText: { maxWidth: 760, color: 'rgba(255,255,255,0.92)', fontSize: 20, lineHeight: 1.55, marginBottom: 28 },
  heroActions: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  primaryButton: { background: SHELL_RED, color: '#fff', borderRadius: 'var(--radius-xs)', padding: '13px 18px', fontWeight: 900 },
  yellowButton: { background: SHELL_YELLOW, color: 'var(--label)', borderRadius: 'var(--radius-xs)', padding: '13px 18px', fontWeight: 900 },
  ghostButton: { background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 'var(--radius-xs)', padding: '13px 18px', fontWeight: 900 },
  section: { padding: '68px 24px', background: '#fff' },
  quoteBand: { padding: '68px 24px', background: 'var(--bg)' },
  healthBand: { padding: '68px 24px', background: 'var(--accent-amber-bg)' },
  helpBand: { padding: '58px 24px', background: '#272727', color: '#fff' },
  container: { maxWidth: 1180, margin: '0 auto' },
  sectionHeader: { maxWidth: 760, marginBottom: 28 },
  kicker: { color: SHELL_RED, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', display: 'inline-block', marginBottom: 8 },
  kickerDark: { color: 'var(--label)', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', display: 'inline-block', marginBottom: 8 },
  kickerLight: { color: SHELL_YELLOW, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', display: 'inline-block', marginBottom: 8 },
  sectionTitle: { fontSize: 34, lineHeight: 1.16, fontWeight: 900, marginBottom: 10 },
  sectionText: { color: 'var(--gray-600)', fontSize: 17, lineHeight: 1.65 },
  searchRow: { position: 'relative', maxWidth: 620, marginBottom: 24 },
  searchGlyph: { position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-600)', pointerEvents: 'none' },
  searchInput: { width: '100%', minHeight: 52, border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', padding: '0 16px 0 48px', color: 'var(--label)', fontSize: 16, outlineColor: SHELL_RED, background: '#fff' },
  kbSearchBar: { display: 'grid', gap: 14, marginBottom: 24 },
  kbSearchInput: { width: 'min(100%, 560px)', padding: '13px 15px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-xs)', fontSize: 15, color: 'var(--label)', outlineColor: SHELL_RED },
  categoryFilter: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filter: { background: '#fff', color: 'var(--gray-700)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', padding: '8px 14px', fontWeight: 800 },
  filterActive: { background: SHELL_RED, color: '#fff', border: `1px solid ${SHELL_RED}`, borderRadius: 'var(--radius-xs)', padding: '8px 14px', fontWeight: 800 },
  newsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: 16 },
  emptyState: { border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', padding: 24, color: 'var(--gray-500)', textAlign: 'center', marginTop: 14 },
  card: { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', padding: 20, minHeight: 154, display: 'grid', alignContent: 'start', gap: 10 },
  cardAccent: { width: 48, height: 6, background: SHELL_YELLOW, display: 'block' },
  cardTitle: { fontSize: 20, lineHeight: 1.2, fontWeight: 900 },
  cardText: { color: 'var(--gray-600)', lineHeight: 1.55 },
  quoteBox: { background: '#fff', borderTop: '1px solid var(--gray-200)', borderBottom: '1px solid var(--gray-200)', padding: '36px 28px', textAlign: 'center', marginBottom: 28 },
  deiTitle: { fontSize: 34, fontWeight: 900, marginBottom: 28, textAlign: 'left' },
  quote: { maxWidth: 960, margin: '0 auto 28px', fontSize: 23, lineHeight: 1.4, fontStyle: 'italic', fontWeight: 800, color: 'var(--gray-700)' },
  quoteByline: { fontSize: 17, lineHeight: 1.5, fontWeight: 800, color: 'var(--gray-700)' },
  deiLayout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)', gap: 20, alignItems: 'stretch' },
  deiPanel: { background: SHELL_YELLOW, borderRadius: 'var(--radius-sm)', padding: 28 },
  featureTitle: { fontSize: 32, lineHeight: 1.15, fontWeight: 900, marginBottom: 18 },
  topicTabs: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
  topicTab: { background: 'var(--accent-amber-bg)', border: '1px solid rgba(0,0,0,0.13)', borderTop: `5px solid ${SHELL_RED}`, borderRadius: 'var(--radius-xs)', padding: '9px 12px', fontWeight: 900 },
  topicGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 },
  sidePanel: { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', padding: 24 },
  sideTitle: { fontSize: 24, fontWeight: 900, marginBottom: 14 },
  sideItem: { borderTop: '1px solid var(--gray-100)', padding: '13px 0', lineHeight: 1.5 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)', gap: 28, alignItems: 'start' },
  offerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 },
  healthGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 },
  helpLayout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 0.8fr)', gap: 30, alignItems: 'center' },
  helpTitle: { fontSize: 34, lineHeight: 1.16, fontWeight: 900, marginBottom: 10 },
  helpText: { color: 'rgba(255,255,255,0.76)', fontSize: 17, lineHeight: 1.65 },
  helpLinks: { display: 'grid', gap: 12 },
  textLink: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, background: '#fff', color: 'var(--label)', borderRadius: 'var(--radius-sm)', padding: '16px 18px', fontWeight: 900 },
  toolSection: { marginTop: 18, marginBottom: 24 },
  toolHeading: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-700)', fontSize: 13, fontWeight: 900, marginBottom: 12, textTransform: 'uppercase' },
  kbGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  kbCard: { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', padding: 20, display: 'grid', gap: 12 },
  kbHeader: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  kbTitle: { fontSize: 17, lineHeight: 1.35, fontWeight: 800 },
  kbText: { color: 'var(--gray-500)', lineHeight: 1.6 },
  kbMeta: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', color: 'var(--label-tertiary)', fontSize: 12 },
  badgeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  tag: { display: 'inline-flex', alignItems: 'center', width: 'fit-content', padding: '4px 9px', borderRadius: 'var(--radius-xs)', border: '1px solid', fontSize: 12, fontWeight: 800 },
  fileBadge: { display: 'inline-flex', height: 25, alignItems: 'center', padding: '3px 7px', border: '1px solid', borderRadius: 'var(--radius-xs)', fontSize: 11, fontWeight: 800 },
  matchBadge: { display: 'inline-flex', height: 25, alignItems: 'center', padding: '3px 7px', border: '1px solid var(--info-bg)', borderRadius: 'var(--radius-xs)', background: 'var(--info-bg)', color: 'var(--info)', fontSize: 11, fontWeight: 800 },
  pin: { border: '1px solid var(--gray-200)', background: '#fff', color: 'var(--gray-600)', borderRadius: 'var(--radius-xs)', padding: '4px 7px', fontWeight: 800, fontSize: 11 },
  pinActive: { border: '1px solid var(--accent-amber-line)', background: SHELL_YELLOW, color: 'var(--label)', borderRadius: 'var(--radius-xs)', padding: '4px 7px', fontWeight: 800, fontSize: 11 },
  redLink: { color: SHELL_RED, fontWeight: 800 },
  textButton: { color: SHELL_RED, background: 'transparent', border: 0, fontWeight: 800, padding: 0 },
  history: { borderTop: '1px solid var(--gray-100)', paddingTop: 12, color: 'var(--gray-500)', fontSize: 13, display: 'grid', gap: 8 },
  historyItem: { display: 'grid', gridTemplateColumns: '50px 95px 1fr', gap: 8 },
  loading: { padding: 36, textAlign: 'center', color: 'var(--label-tertiary)' },
  empty: { padding: 36, textAlign: 'center', color: 'var(--label-tertiary)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', background: '#fff' },
  appDock: { position: 'fixed', top: 188, right: 0, zIndex: 95, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', color: 'var(--label)' },
  appDockTab: { width: 38, minHeight: 130, border: 0, borderRadius: '18px 0 0 18px', background: SHELL_RED, color: '#fff', boxShadow: '-5px 10px 24px rgba(221,29,33,0.28)', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 10, padding: '13px 0', fontWeight: 900 },
  appDockDots: { writingMode: 'vertical-rl', letterSpacing: 2, color: SHELL_YELLOW, fontSize: 17, lineHeight: 1 },
  appDockText: { writingMode: 'vertical-rl', transform: 'rotate(180deg)', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 },
  appPanel: { position: 'relative', width: 326, maxHeight: 510, background: 'rgba(255,255,255,0.74)', backdropFilter: 'blur(18px) saturate(1.35)', WebkitBackdropFilter: 'blur(18px) saturate(1.35)', border: '1px solid rgba(255,255,255,0.72)', borderRadius: '26px 0 0 26px', padding: 16, boxShadow: '-20px 24px 46px rgba(0,0,0,0.20)', color: 'var(--label)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  launcherHeader: { position: 'relative', zIndex: 1, display: 'flex', gap: 12, alignItems: 'center', padding: '2px 4px 14px', color: 'var(--label)' },
  launcherIcon: { width: 52, height: 52, borderRadius: 'var(--radius-md)', background: SHELL_YELLOW, color: SHELL_RED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, boxShadow: '0 8px 18px rgba(255,213,0,0.34)' },
  launcherTitle: { display: 'grid', gap: 2, lineHeight: 1.2 },
  launcherDivider: { position: 'relative', zIndex: 1, height: 1, margin: '0 2px 14px', background: 'rgba(0,0,0,0.08)' },
  launcherScroll: { position: 'relative', zIndex: 1, overflowY: 'auto', padding: '4px 4px 6px', flex: 1, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.22) transparent' },
  appGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px 14px', alignItems: 'start' },
  appTile: { position: 'relative', minHeight: 104, textAlign: 'center', background: 'transparent', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '2px 4px 0', display: 'grid', gridTemplateRows: '58px auto', justifyItems: 'center', alignItems: 'start', gap: 8, color: 'var(--label)', fontFamily: 'inherit' },
  appIcon: { width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 900, boxShadow: '0 10px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.72)' },
  appTitle: { fontSize: 12, fontWeight: 800, lineHeight: 1.12, color: '#1f1f1f', maxWidth: 82, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  star: { position: 'absolute', top: 0, right: 7, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.92)', color: 'var(--label-tertiary)', borderRadius: 'var(--radius-pill)', width: 21, height: 21, fontSize: 12, lineHeight: 1, fontWeight: 900, boxShadow: '0 3px 8px rgba(0,0,0,0.08)' },
  starActive: { position: 'absolute', top: 0, right: 7, border: '1px solid var(--accent-amber-line)', background: SHELL_YELLOW, color: 'var(--label)', borderRadius: 'var(--radius-pill)', width: 21, height: 21, fontSize: 12, lineHeight: 1, fontWeight: 900, boxShadow: '0 3px 8px rgba(0,0,0,0.08)' },
  ssoBadge: { position: 'absolute', top: 43, left: 12, background: 'rgba(255,255,255,0.96)', color: SHELL_RED, border: `1px solid ${SHELL_RED}`, borderRadius: 'var(--radius-sm)', fontSize: 8, fontWeight: 800, padding: '1px 5px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
  launching: { position: 'absolute', inset: 0, zIndex: 2, background: 'rgba(255,255,255,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, color: SHELL_RED },
  spinner: { width: 18, height: 18, border: '3px solid var(--accent-red-line)', borderTopColor: SHELL_RED, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  error: { background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-line)', color: SHELL_RED, borderRadius: 'var(--radius-xs)', padding: '12px 14px', fontWeight: 700 },
};
