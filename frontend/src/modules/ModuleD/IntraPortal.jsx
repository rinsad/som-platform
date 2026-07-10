import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getApps, getKnowledge, searchKnowledge, getDocVersions,
  getFavourites, toggleFavourite,
  getPinnedDocs, togglePinnedDoc,
  ssoLogin, getDocFileUrl,
} from '../../services/portalService';
import { sanitizeSnippet } from '../../utils/sanitizeHtml';

const SHELL_RED = 'var(--shell-red)';
const SHELL_YELLOW = 'var(--shell-yellow)';
const INK = 'var(--label)';

const KB_CATEGORIES = ['All', 'Policy', 'Procedure', 'QHSE', 'HR'];

const ABOUT_ITEMS = [
  { title: 'This is Shell', text: 'Company story, values, people, operating principles and Shell Oman identity.' },
  { title: 'Shell History in Oman', text: 'A dedicated area for Shell history in Oman, aligned to Shell Oman Marketing public content.' },
  { title: 'CEO Corner', text: 'CEO reflections, yearly priorities, performance messages, targets and employee video updates.' },
  { title: 'Performance and Results', text: 'Collective performance, highest achievements, business goals and progress dashboards.' },
  { title: 'Goal Zero and HSSE', text: 'Goal Zero dashboard, corporate HSSE events, safety learning and worker welfare focus.' },
  { title: 'Diversity, Equity and Inclusion', text: 'Creative DE&I storytelling, inclusion progress, worker welfare and recognition.' },
];

const PERFORMANCE_METRICS = [
  { label: 'Goal Zero', value: 'HSSE dashboard', detail: 'Safety moments, corporate events and team actions.' },
  { label: 'High performance', value: 'Achievements', detail: 'Internal and external value stories across SOM.' },
  { label: 'Business goals', value: 'Targets', detail: 'Progress visibility by business and support function.' },
  { label: 'DE&I', value: 'Worker welfare', detail: 'Employee wellbeing, inclusion themes and engagement.' },
];

const DEPARTMENTS = [
  {
    name: 'Mobility',
    lead: 'Serving customers across Oman through the retail, network and B2B mobility business.',
    photo: 'M',
    units: ['Marketing', 'Network', 'Mobility Sales and Operations', 'B2B Fuels and Specialties', 'Corporate Mobility and HSSE'],
    materials: ['Campaign calendar', 'Network performance pack', 'Mobility HSSE guide'],
    updates: ['Retail excellence toolkit refreshed', 'B2B Fuels customer guide published'],
  },
  {
    name: 'Trade and Supply',
    lead: 'Moving product safely and reliably through terminals, transport and supply operations.',
    photo: 'T',
    units: ['Terminal Operation', 'Road Transport Operations and Order to Delivery', 'Trade and Supply HSSE', 'Supply Operations'],
    materials: ['Terminal operations guide', 'Order to Delivery checklist', 'Transport safety references'],
    updates: ['Road transport learning note added', 'Terminal weekly dashboard available'],
  },
  {
    name: 'Low Carbon Solutions',
    lead: 'Supporting transition opportunities through ITP operations, fuel farms and marine activities.',
    photo: 'L',
    units: ['Muscat ITP Operations', 'Salalah ITP Operations', 'Salalah ITP and Fuel Farm Operations', 'Marine and Home Base'],
    materials: ['ITP operations guide', 'Fuel farm reference pack', 'Marine support data'],
    updates: ['Salalah operations brief updated', 'Marine home base contact sheet added'],
  },
  {
    name: 'Lubricants',
    lead: 'Connecting customer operations, supply chain and commercial lubes teams with practical resources.',
    photo: 'L',
    units: ['Customer Operations', 'Fleet Cards', 'Retail/Home Base and GL', 'Logistics', 'Planning', 'Production', 'Quality', 'Maintenance', 'Commercial Lubes', 'Marketing', 'Sales', 'Technical'],
    materials: ['Lube supply chain dashboard', 'Technical support library', 'Customer operations playbook'],
    updates: ['Quality learning module published', 'Commercial lubes sales guide refreshed'],
  },
  {
    name: 'Corporate Functions',
    lead: 'Finance, procurement, legal, credit, business finance and corporate relations support for SOM.',
    photo: 'C',
    units: ['Corporate Finance', 'Contract and Procurement', 'Legal', 'Credit Management', 'Business Finance', 'Corporate Relations'],
    materials: ['Procurement policy links', 'Legal request guide', 'Finance month-end calendar'],
    updates: ['Credit management FAQ posted', 'Contract request templates updated'],
  },
  {
    name: 'People and Digital',
    lead: 'Human Resources, services, audit, information technology and real estate support in one area.',
    photo: 'P',
    units: ['Human Resources', 'Service', 'Internal Audit', 'Corporate IT', 'Retail IT', 'Real Estate'],
    materials: ['HR services guide', 'IT support matrix', 'Real estate request form'],
    updates: ['Employee search directory refreshed', 'Retail IT support hours added'],
  },
];

const EVENTS = [
  { day: '18', month: 'Jun', title: 'Long Service Award', text: 'Recognising 10, 20, 25, 30 and 35 year milestones.' },
  { day: '24', month: 'Jun', title: 'Goal Zero Forum', text: 'Corporate HSSE learning session and safety highlights.' },
  { day: '02', month: 'Jul', title: 'Employee Connect', text: 'Open discussion with HR, IT and Real Estate teams.' },
  { day: '09', month: 'Jul', title: 'Country Event', text: 'Company and country calendar update for all employees.' },
];

const NEWS = [
  'News central for high performance and value achievements across SOM, internal channels and external Oolom Shell.',
  'Department focal points can publish updates, images, guides and learning materials.',
  'Employees can personalise their feed by following departments, events and topics.',
];

const HR_MODES = [
  { id: 'insight', label: 'HR Insight', title: 'Insight from HR', text: 'Policy notes, people stories, engagement updates and service announcements from HR.' },
  { id: 'connect', label: 'HR GM Connect', title: 'Connect with HR GM', text: 'A dedicated space for questions, listening topics and HR leadership updates.' },
  { id: 'topics', label: 'Employee Topics', title: 'Common employee topics', text: 'Frequently raised questions, support themes and practical answers for employees.' },
  { id: 'media', label: 'Media Materials', title: 'Media materials', text: 'Photos, announcements, recognition posts and reusable HR communication material.' },
  { id: 'services', label: 'HR, IT and Real Estate', title: 'Shared service support', text: 'HR team updates alongside IT and Real Estate service information.' },
];

const EMPLOYEES = [
  { name: 'Sara Al Balushi', team: 'Operations', location: 'Muscat HQ', email: 'sara.albalushi@shelloman.com' },
  { name: 'Ahmed Al Harthy', team: 'Mobility', location: 'Muscat HQ', email: 'ahmed.alharthy@shelloman.com' },
  { name: 'Maha Al Rawahi', team: 'Human Resources', location: 'Muscat HQ', email: 'maha.alrawahi@shelloman.com' },
  { name: 'Nasser Al Hinai', team: 'Trade and Supply', location: 'Sohar Terminal', email: 'nasser.alhinai@shelloman.com' },
  { name: 'Laila Al Farsi', team: 'Low Carbon Solutions', location: 'Salalah', email: 'laila.alfarsi@shelloman.com' },
];

const SERVICE_LINKS = [
  'Employee directory',
  'HR service requests',
  'IT support',
  'Real Estate helpdesk',
  'Business support materials',
  'Company and country events',
];

const NETWORK_LOCATIONS = [
  { name: 'Muscat HQ', detail: 'Corporate teams, HR, IT, Real Estate and business support.' },
  { name: 'Sohar Terminal', detail: 'Terminal operation, supply operations and transport coordination.' },
  { name: 'Salalah Operations', detail: 'ITP, fuel farm, marine and home base activity.' },
];

const LONG_SERVICE = [
  { name: 'Aisha Al Kindi', years: 10, milestone: 'Customer Operations' },
  { name: 'Khalid Al Siyabi', years: 20, milestone: 'Network' },
  { name: 'Maryam Al Zadjali', years: 25, milestone: 'Finance' },
  { name: 'Said Al Maqbali', years: 30, milestone: 'Terminal Operation' },
  { name: 'Fatma Al Riyami', years: 35, milestone: 'Human Resources' },
];

const CATEGORY_COLORS = {
  Enterprise: { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-bg)' },
  HR: { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-bg)' },
  QHSE: { bg: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)', border: 'var(--accent-amber-line)' },
  IT: { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-bg)' },
  Finance: { bg: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)', border: 'var(--accent-amber-line)' },
  Procurement: { bg: 'var(--neutral-bg)', color: 'var(--neutral)', border: 'var(--neutral-bg)' },
  Operations: { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-bg)' },
  Administration: { bg: 'var(--fill-tertiary)', color: 'var(--gray-600)', border: 'var(--gray-200)' },
  Policy: { bg: 'var(--accent-red-bg)', color: SHELL_RED, border: 'var(--accent-red-line)' },
  Procedure: { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-bg)' },
};

const SOURCE_BADGES = {
  pdf: { label: 'PDF', bg: 'var(--accent-red-bg)', color: SHELL_RED, border: 'var(--accent-red-line)' },
  docx: { label: 'DOCX', bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-bg)' },
  eml: { label: 'EML', bg: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)', border: 'var(--accent-amber-line)' },
  txt: { label: 'TXT', bg: 'var(--fill-tertiary)', color: 'var(--gray-600)', border: 'var(--gray-200)' },
  manual: { label: 'KB', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-bg)' },
};

function catStyle(cat) {
  return CATEGORY_COLORS[cat] || { bg: 'var(--fill-tertiary)', color: 'var(--gray-600)', border: 'var(--gray-200)' };
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarButton({ active, onClick, appId }) {
  if (!onClick) return null;
  return (
    <button type="button"
      data-testid={`star-btn-${appId}`}
      onClick={(event) => { event.stopPropagation(); onClick(appId); }}
      style={active ? s.starActive : s.star}
      title={active ? 'Remove from favourites' : 'Add to favourites'}
    >
      {active ? '★' : '☆'}
    </button>
  );
}

function AppTile({ app, isFav, onToggleStar, onAppClick, launching }) {
  const iconText = (app.icon && app.icon !== 'APP') ? app.icon : app.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2);
  return (
    <button type="button"
      data-testid="app-tile"
      onClick={() => !launching && onAppClick(app)}
      style={s.appTile}
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
      <span style={s.appText}>{app.description}</span>
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
            <button type="button"
              data-testid={`pin-btn-${doc.id}`}
              onClick={() => onTogglePin(doc.id)}
              style={isPinned ? s.pinActive : s.pin}
              title={isPinned ? 'Unpin document' : 'Pin document'}
            >
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
        <button type="button" data-testid={`history-btn-${doc.id}`} onClick={handleHistory} style={s.textButton}>
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

export default function IntraPortal() {
  const isLoggedIn = !!localStorage.getItem('som_token');
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('som_user')) || {}; } catch { return {}; }
  })();
  const firstName = storedUser.name ? storedUser.name.split(' ')[0] : '';

  const [apps, setApps] = useState([]);
  const [appsErr, setAppsErr] = useState('');
  const [favourites, setFavourites] = useState([]);
  const [ssoLaunching, setSsoLaunching] = useState(new Set());
  const [kbDocs, setKbDocs] = useState([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbErr, setKbErr] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [kbCategory, setKbCategory] = useState('All');
  const [pinnedDocs, setPinnedDocs] = useState([]);
  const [isFtsMode, setIsFtsMode] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(DEPARTMENTS[0].name);
  const [followedDepartments, setFollowedDepartments] = useState([DEPARTMENTS[0].name]);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [hrMode, setHrMode] = useState(HR_MODES[0].id);
  const [hrPosts, setHrPosts] = useState([
    'How can employees access long-service award nomination details?',
    'Please share the updated HR service turnaround times.',
  ]);
  const [hrDraft, setHrDraft] = useState('');
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const appsData = await getApps();
        setApps(appsData);
        if (isLoggedIn) {
          const [favsData, pinsData] = await Promise.all([getFavourites(), getPinnedDocs()]);
          setFavourites(favsData);
          setPinnedDocs(pinsData);
        }
      } catch {
        setAppsErr('Failed to load employee applications. Please refresh.');
      }
    }
    load();
  }, [isLoggedIn]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setKbLoading(true);
      setKbErr('');
      try {
        if (searchTerm.trim()) {
          const results = await searchKnowledge(searchTerm.trim(), kbCategory);
          setKbDocs(results);
          setIsFtsMode(true);
        } else {
          const params = {};
          if (kbCategory !== 'All') params.category = kbCategory;
          setKbDocs(await getKnowledge(params));
          setIsFtsMode(false);
        }
      } catch {
        setKbErr('Failed to load knowledge documents.');
      } finally {
        setKbLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, kbCategory]);

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

  function toggleFollow(departmentName) {
    setFollowedDepartments((prev) => (
      prev.includes(departmentName)
        ? prev.filter((name) => name !== departmentName)
        : [...prev, departmentName]
    ));
  }

  function submitHrPost(event) {
    event.preventDefault();
    const next = hrDraft.trim();
    if (!next) return;
    setHrPosts((prev) => [next, ...prev]);
    setHrDraft('');
  }

  const favouritedApps = apps.filter((app) => favourites.includes(app.id));
  const launcherApps = [
    ...favouritedApps,
    ...apps.filter((app) => !favourites.includes(app.id)),
  ];
  const pinnedKbDocs = !isFtsMode ? kbDocs.filter((doc) => pinnedDocs.includes(doc.id)) : [];
  const selectedDepartmentData = DEPARTMENTS.find((dept) => dept.name === selectedDepartment) || DEPARTMENTS[0];
  const selectedHrMode = HR_MODES.find((mode) => mode.id === hrMode) || HR_MODES[0];
  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return EMPLOYEES;
    return EMPLOYEES.filter((employee) => (
      employee.name.toLowerCase().includes(q)
      || employee.team.toLowerCase().includes(q)
      || employee.location.toLowerCase().includes(q)
    ));
  }, [employeeQuery]);

  return (
    <div style={s.page}>
      <section style={s.hero}>
        <div style={s.heroImage} />
        <div style={s.heroOverlay}>
          <div style={s.heroContent}>
            <span style={s.eyebrow}>Shell Oman Marketing Company</span>
            <h1 data-testid="welcome-header" style={s.heroTitle}>
              {firstName ? `Welcome back, ${firstName}` : 'Employee Intraportal'}
            </h1>
            <p style={s.heroText}>
              One home for SOM news, CEO updates, performance, Goal Zero, DE&I,
              HR Online, business divisions, employee services and knowledge resources.
            </p>
            <div style={s.heroActions}>
              <a href="#employee-tools" style={s.primaryCta}>Open employee tools</a>
              <a href="#departments" style={s.secondaryCta}>Explore departments</a>
              <a href="#hr-online" style={s.ghostCta}>HR Online</a>
            </div>
          </div>
        </div>
      </section>

      <section id="about" style={s.band}>
        <div style={s.container}>
          <div style={s.sectionIntro}>
            <span style={s.kicker}>Main home page content</span>
            <h2 style={s.sectionTitle}>A central place for Shell Oman employees</h2>
            <p style={s.sectionText}>
              The home page now maps to the full intraportal content brief: company story,
              Shell history, CEO corner, performance, Goal Zero, DE&I, departments and employee services.
            </p>
          </div>
          <div style={s.pillarGrid}>
            {ABOUT_ITEMS.map((item) => (
              <article key={item.title} className="som-lift-card" style={s.pillarCard}>
                <span className="som-lift-accent" style={s.cardAccent} />
                <h3 style={s.cardTitle}>{item.title}</h3>
                <p style={s.cardText}>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="performance" style={s.performance}>
        <div style={s.container}>
          <div className="som-two-column" style={s.featureGrid}>
            <div style={s.yellowPanel}>
              <span style={s.kickerDark}>Performance and results</span>
              <h2 style={s.featureTitle}>Collective progress, visible to everyone</h2>
              <p style={s.featureText}>
                A dashboard-style area for achievements, business goals, targets,
                Goal Zero, HSSE events, DE&I and worker welfare.
              </p>
              <div style={s.metricGrid}>
                {PERFORMANCE_METRICS.map((metric) => (
                <article key={metric.label} className="som-lift-card" style={s.metricCard}>
                    <strong>{metric.label}</strong>
                    <span>{metric.value}</span>
                    <small>{metric.detail}</small>
                  </article>
                ))}
              </div>
            </div>
            <div style={s.eventPanel}>
              <h3 style={s.panelTitle}>Upcoming company and country events</h3>
              {EVENTS.map((event) => (
                <article key={event.title} style={s.eventItem}>
                  <span style={s.eventDate}><strong>{event.day}</strong>{event.month}</span>
                  <span>
                    <strong>{event.title}</strong>
                    <small>{event.text}</small>
                  </span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="departments" style={s.band}>
        <div style={s.container}>
          <div style={s.sectionIntro}>
            <span style={s.kicker}>Business and division areas</span>
            <h2 style={s.sectionTitle}>Department tiles, division detail and focal ownership</h2>
            <p style={s.sectionText}>
              Each department has division tiles, a lead area, business support materials,
              collaboration updates and a follow button for personalised news.
            </p>
          </div>
          <div style={s.departmentGrid}>
            {DEPARTMENTS.map((department) => {
              const active = selectedDepartment === department.name;
              const followed = followedDepartments.includes(department.name);
              return (
                  <article key={department.name} className="som-lift-card" style={active ? s.departmentCardActive : s.departmentCard}>
                  <button type="button" onClick={() => setSelectedDepartment(department.name)} style={s.departmentReadMore}>
                    Read more <ArrowIcon />
                  </button>
                  <div style={s.departmentPhoto}>{department.photo}</div>
                  <h3 style={s.departmentTitle}>{department.name}</h3>
                  <p style={s.smallText}>{department.lead}</p>
                  <div style={s.unitList}>
                    {department.units.slice(0, 5).map((unit) => <span key={unit} style={s.unitChip}>{unit}</span>)}
                  </div>
                  <button type="button" onClick={() => toggleFollow(department.name)} style={followed ? s.followingBtn : s.followBtn}>
                    {followed ? 'Following' : 'Follow'}
                  </button>
                </article>
              );
            })}
          </div>

          <section style={s.detailPanel}>
            <div>
              <span style={s.kicker}>Selected division page</span>
              <h3 style={s.detailTitle}>{selectedDepartmentData.name}</h3>
              <p style={s.sectionText}>{selectedDepartmentData.lead}</p>
            </div>
            <div style={s.detailColumns}>
              <div>
                <h4 style={s.listTitle}>Division information</h4>
                <div style={s.unitList}>
                  {selectedDepartmentData.units.map((unit) => <span key={unit} style={s.unitChip}>{unit}</span>)}
                </div>
              </div>
              <div>
                <h4 style={s.listTitle}>Business support materials and data</h4>
                {selectedDepartmentData.materials.map((item) => <p key={item} style={s.newsItem}>{item}</p>)}
              </div>
              <div>
                <h4 style={s.listTitle}>Collaboration and learning updates</h4>
                {selectedDepartmentData.updates.map((item) => <p key={item} style={s.newsItem}>{item}</p>)}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section id="news" style={s.band}>
        <div style={s.container}>
          <div className="som-two-column" style={s.hrGrid}>
            <div>
              <span style={s.kicker}>News central and personalisation</span>
              <h2 style={s.sectionTitle}>Follow the updates that matter to you</h2>
              <p style={s.sectionText}>
                Employees can follow departments to shape their update stream for events,
                news, business guides and learning material.
              </p>
              <div style={s.followSummary}>
                {followedDepartments.length ? followedDepartments.map((name) => <span key={name} style={s.unitChip}>{name}</span>) : 'No departments followed yet.'}
              </div>
            </div>
            <div style={s.newsPanel}>
              {NEWS.map((item) => <p key={item} style={s.newsItem}>{item}</p>)}
            </div>
          </div>
        </div>
      </section>

      <section id="hr-online" style={s.hrBand}>
        <div style={s.container}>
          <div className="som-two-column" style={s.hrGrid}>
            <div>
              <span style={s.kickerDark}>HR Online</span>
              <h2 style={s.featureTitle}>Employee services, people stories and support topics</h2>
              <p style={s.featureText}>
                A dedicated area for HR insight, employee search, HR GM connect,
                common employee topics, media material, IT, Real Estate and recognition.
              </p>
              <div style={s.modeTabs}>
                {HR_MODES.map((mode) => (
                  <button type="button" key={mode.id} onClick={() => setHrMode(mode.id)} style={hrMode === mode.id ? s.modeActive : s.modeBtn}>
                    {mode.label}
                  </button>
                ))}
              </div>
              <article style={s.hrModePanel}>
                <h3>{selectedHrMode.title}</h3>
                <p>{selectedHrMode.text}</p>
              </article>
            </div>
            <div style={s.hrPostPanel}>
              <h3 style={s.panelTitle}>HR GM connect posts</h3>
              <form onSubmit={submitHrPost} style={s.postForm}>
                <textarea
                  value={hrDraft}
                  onChange={(event) => setHrDraft(event.target.value)}
                  placeholder="Post a question or HR update..."
                  style={s.textArea}
                />
                <button type="submit" style={s.primarySmall}>Post update</button>
              </form>
              {hrPosts.map((post) => <p key={post} style={s.newsItem}>{post}</p>)}
            </div>
          </div>
        </div>
      </section>

      <section id="employee-services" style={s.band}>
        <div style={s.container}>
          <div className="som-two-column" style={s.featureGrid}>
            <div>
              <div style={s.sectionIntro}>
                <span style={s.kicker}>Employee search and services</span>
                <h2 style={s.sectionTitle}>Find people, links and Shell network locations</h2>
                <p style={s.sectionText}>
                  A searchable employee area sits beside practical links for all employees and business teams.
                </p>
              </div>
              <input
                type="text"
                placeholder="Search employees by name, team or location..."
                value={employeeQuery}
                onChange={(event) => setEmployeeQuery(event.target.value)}
                style={s.searchInput}
              />
              <div style={s.employeeGrid}>
                {filteredEmployees.map((employee) => (
                  <article key={employee.email} className="som-lift-card" style={s.employeeCard}>
                    <span className="som-letter-badge" style={s.employeeAvatar}>{employee.name[0]}</span>
                    <strong>{employee.name}</strong>
                    <small>{employee.team} - {employee.location}</small>
                    <a href={`mailto:${employee.email}`} style={s.redLink}>{employee.email}</a>
                  </article>
                ))}
              </div>
            </div>
            <div style={s.eventPanel}>
              <h3 style={s.panelTitle}>Main links for employees and business</h3>
              {SERVICE_LINKS.map((link) => <p key={link} style={s.newsItem}>{link}</p>)}
              <h3 style={s.panelTitle}>Shell network location</h3>
              {NETWORK_LOCATIONS.map((location) => (
                <article key={location.name} style={s.locationItem}>
                  <strong>{location.name}</strong>
                  <small>{location.detail}</small>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="recognition" style={s.performance}>
        <div style={s.container}>
          <div style={s.sectionIntro}>
            <span style={s.kicker}>Long service award</span>
            <h2 style={s.sectionTitle}>Recognising 10, 20, 25, 30 and 35 years of service</h2>
            <p style={s.sectionText}>
              Employee recognition can include photos, years of service, milestone stories
              and the upcoming 18 June celebration.
            </p>
          </div>
          <div style={s.awardGrid}>
            {LONG_SERVICE.map((person) => (
              <article key={person.name} className="som-lift-card" style={s.awardCard}>
                <span className="som-letter-badge" style={s.awardPhoto}>{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                <strong>{person.name}</strong>
                <span style={s.awardYears}>{person.years} years</span>
                <small>{person.milestone}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="employee-tools" style={s.toolsBand}>
        <aside
          className={`som-app-dock${appLauncherOpen ? ' is-open' : ''}`}
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
            <span style={s.appDockDots}>•••</span>
            <span style={s.appDockText}>Apps</span>
          </button>

          <div className="som-app-panel" style={s.appPanel}>
            <div style={s.launcherHeader}>
              <span style={s.launcherIcon}>SOM</span>
              <div style={s.launcherTitle}>
                <strong>Employee apps</strong>
                <small>{apps.length} shortcuts</small>
              </div>
            </div>

            <div style={s.launcherDots} />

            <div className="som-launcher-scroll" style={s.launcherScroll}>
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
      </section>

      <section id="knowledge" style={s.band}>
        <div style={s.container}>
          <div style={s.sectionIntro}>
            <span style={s.kicker}>Knowledge base</span>
            <h2 style={s.sectionTitle}>Policies, procedures and learning materials</h2>
            <p style={s.sectionText}>
              Search SOM documents, browse by category, pin key references and view version history.
            </p>
          </div>

          <div style={s.searchBar}>
            <input
              data-testid="knowledge-search"
              type="text"
              placeholder="Search documents, policies, procedures..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={s.searchInput}
            />
            <div style={s.categoryFilter}>
              {KB_CATEGORIES.map((cat) => {
                const active = kbCategory === cat;
                return (
                  <button type="button"
                    key={cat}
                    onClick={() => setKbCategory(cat)}
                    style={active ? s.filterActive : s.filter}
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

          <div data-testid="knowledge-results">
            {kbLoading ? (
              <div style={s.loading}>Loading documents...</div>
            ) : isFtsMode && searchTerm.trim() && kbDocs.length === 0 ? (
              <div data-testid="empty-state" style={s.empty}>No results for "{searchTerm}"</div>
            ) : !isFtsMode && kbDocs.length === 0 ? (
              <div data-testid="empty-state" style={s.empty}>No documents found</div>
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

      <footer style={s.footer}>
        <div style={s.container}>
          <div className="som-footer-grid" style={s.footerGrid}>
            <div>
              <strong>Shell Oman Marketing Company</strong>
              <p>Employee Intraportal for news, services, departments, HR Online and knowledge.</p>
            </div>
            <div>
              <strong>More in home</strong>
              <a href="#departments">Business divisions</a>
              <a href="#hr-online">HR Online</a>
              <a href="#employee-services">Employee search</a>
              <a href="#knowledge">Knowledge base</a>
            </div>
            <div>
              <strong>Can we help?</strong>
              <a href="#employee-tools">Employee tools</a>
              <a href="/login">Sign in</a>
              {isLoggedIn && <a href="/dashboard">Dashboard</a>}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        mark { background: rgba(255, 213, 0, 0.55); color: inherit; border-radius: 2px; padding: 0 2px; }
        #root footer a {
          color: rgba(255,255,255,0.74);
          display: block;
          margin-top: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .som-lift-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .som-lift-card:hover,
        .som-lift-card:focus-within,
        .som-lift-card:active {
          transform: translateY(-6px);
          box-shadow: 0 14px 30px rgba(0,0,0,0.12) !important;
          border-color: var(--gray-300) !important;
        }
        .som-lift-card:hover .som-lift-accent,
        .som-lift-card:focus-within .som-lift-accent,
        .som-lift-card:active .som-lift-accent,
        .som-lift-card:hover .som-letter-badge,
        .som-lift-card:focus-within .som-letter-badge,
        .som-lift-card:active .som-letter-badge {
          background: var(--shell-red) !important;
        }
        .som-lift-card:hover .som-letter-badge,
        .som-lift-card:focus-within .som-letter-badge,
        .som-lift-card:active .som-letter-badge {
          color: var(--shell-yellow) !important;
        }
        .som-app-panel {
          opacity: 0;
          pointer-events: none;
          transform: translateX(calc(100% + 48px));
          transition: opacity 0.18s ease, transform 0.2s ease;
        }
        .som-app-dock.is-open .som-app-panel {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(0);
        }
        .som-app-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 18% 10%, rgba(255, 213, 0, 0.24), transparent 30%),
            linear-gradient(145deg, rgba(255,255,255,0.88), rgba(255,255,255,0.64));
          pointer-events: none;
        }
        .som-launcher-scroll::-webkit-scrollbar {
          width: 7px;
        }
        .som-launcher-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .som-launcher-scroll::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.22);
          border-radius: 999px;
        }
        @media (max-width: 760px) {
          .som-two-column,
          .som-footer-grid {
            grid-template-columns: 1fr !important;
          }
          .som-app-dock {
            position: fixed !important;
            top: 154px !important;
            right: 0 !important;
            z-index: 120 !important;
          }
          .som-app-panel {
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
  page: { background: '#fff', color: INK, animation: 'fadeIn 0.25s ease' },
  hero: { position: 'relative', minHeight: 520, overflow: 'hidden', background: '#1f1f1f' },
  heroImage: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.52) 42%, rgba(0,0,0,0.12) 100%), url(/logo.jpeg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transform: 'scale(1.02)',
  },
  heroOverlay: { position: 'relative', minHeight: 520, display: 'flex', alignItems: 'center', borderBottom: `14px solid ${SHELL_YELLOW}` },
  heroContent: { width: 'min(1180px, calc(100% - 48px))', margin: '0 auto', padding: '72px 0', color: '#fff' },
  eyebrow: { display: 'inline-flex', background: SHELL_YELLOW, color: 'var(--label)', fontSize: 13, fontWeight: 800, padding: '8px 12px', borderRadius: 'var(--radius-xs)', marginBottom: 18 },
  heroTitle: { fontSize: 'clamp(40px, 7vw, 72px)', lineHeight: 0.95, maxWidth: 820, fontWeight: 800, marginBottom: 22 },
  heroText: { maxWidth: 710, fontSize: 20, lineHeight: 1.55, color: 'rgba(255,255,255,0.92)', marginBottom: 28 },
  heroActions: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  primaryCta: { display: 'inline-flex', color: '#fff', background: SHELL_RED, padding: '13px 20px', borderRadius: 'var(--radius-xs)', fontWeight: 800 },
  secondaryCta: { display: 'inline-flex', color: 'var(--label)', background: SHELL_YELLOW, padding: '13px 20px', borderRadius: 'var(--radius-xs)', fontWeight: 800 },
  ghostCta: { display: 'inline-flex', color: '#fff', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.42)', padding: '13px 20px', borderRadius: 'var(--radius-xs)', fontWeight: 800 },
  band: { padding: '64px 24px', background: '#fff' },
  toolsBand: { padding: 0, background: 'transparent', height: 0 },
  performance: { padding: '64px 24px', background: 'var(--bg)' },
  hrBand: {
    padding: '64px 24px',
    background: '#fff',
    color: 'var(--label)',
    borderTop: `10px solid ${SHELL_RED}`,
    borderBottom: '1px solid var(--gray-200)',
  },
  container: { maxWidth: 1180, margin: '0 auto' },
  sectionIntro: { maxWidth: 780, marginBottom: 28 },
  kicker: { display: 'inline-block', color: SHELL_RED, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 },
  kickerDark: { display: 'inline-block', color: 'var(--label)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 },
  sectionTitle: { color: 'var(--label)', fontSize: 34, lineHeight: 1.15, fontWeight: 800, marginBottom: 10 },
  sectionText: { color: 'var(--label-secondary)', fontSize: 17, lineHeight: 1.65 },
  smallText: { color: 'var(--gray-500)', fontSize: 13, lineHeight: 1.5 },
  pillarGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 18 },
  pillarCard: { position: 'relative', minHeight: 190, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', padding: 22, color: 'var(--label)', background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 },
  cardAccent: { width: 48, height: 6, background: SHELL_YELLOW, display: 'block', marginBottom: 6 },
  cardTitle: { fontSize: 21, fontWeight: 800 },
  cardText: { color: 'var(--gray-600)', lineHeight: 1.55, flex: 1 },
  featureGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(280px, 0.55fr)', gap: 20 },
  yellowPanel: { background: SHELL_YELLOW, borderRadius: 'var(--radius-xs)', padding: 34, color: 'var(--label)' },
  featureTitle: { fontSize: 34, lineHeight: 1.12, fontWeight: 800, marginBottom: 12 },
  featureText: { fontSize: 17, lineHeight: 1.65, maxWidth: 720 },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 24 },
  metricCard: { background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 'var(--radius-xs)', padding: 16, display: 'grid', gap: 5 },
  eventPanel: { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', padding: 24, color: 'var(--label)' },
  panelTitle: { fontSize: 20, fontWeight: 800, marginBottom: 16 },
  eventItem: { display: 'flex', gap: 14, padding: '14px 0', borderTop: '1px solid var(--gray-100)' },
  eventDate: { width: 54, minWidth: 54, height: 54, background: SHELL_RED, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-xs)', fontSize: 12, lineHeight: 1 },
  departmentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 },
  departmentCard: { position: 'relative', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', background: '#fff', padding: 22, borderTop: `7px solid ${SHELL_RED}`, display: 'grid', gap: 12 },
  departmentCardActive: { position: 'relative', border: `2px solid ${SHELL_RED}`, borderRadius: 'var(--radius-xs)', background: '#fff', padding: 21, borderTop: `7px solid ${SHELL_RED}`, display: 'grid', gap: 12 },
  departmentReadMore: { justifySelf: 'end', color: SHELL_RED, background: 'transparent', border: 0, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 },
  departmentPhoto: { width: '100%', height: 120, background: 'var(--bg-tertiary)', color: SHELL_RED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 900, borderRadius: 'var(--radius-xs)' },
  departmentTitle: { fontSize: 22, fontWeight: 800 },
  unitList: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  unitChip: { display: 'inline-flex', background: 'var(--fill-tertiary)', border: '1px solid var(--gray-200)', color: 'var(--gray-700)', padding: '6px 9px', borderRadius: 'var(--radius-xs)', fontSize: 12, fontWeight: 700 },
  followBtn: { width: 'fit-content', background: '#fff', color: SHELL_RED, border: `1px solid ${SHELL_RED}`, borderRadius: 'var(--radius-xs)', padding: '8px 12px', fontWeight: 800 },
  followingBtn: { width: 'fit-content', background: SHELL_YELLOW, color: 'var(--label)', border: '1px solid var(--accent-amber-line)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', fontWeight: 800 },
  detailPanel: { marginTop: 24, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', padding: 24, background: '#fff' },
  detailTitle: { fontSize: 28, fontWeight: 800, marginBottom: 8 },
  detailColumns: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 20 },
  listTitle: { fontSize: 16, fontWeight: 800, marginBottom: 10 },
  hrGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.75fr)', gap: 28, alignItems: 'start' },
  newsPanel: { background: '#fff', color: 'var(--label)', borderRadius: 'var(--radius-xs)', padding: 22, border: '1px solid var(--gray-200)' },
  newsItem: { padding: '12px 0', borderTop: '1px solid var(--gray-100)', lineHeight: 1.55 },
  followSummary: { marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--gray-500)' },
  modeTabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 },
  modeBtn: { background: '#fff', color: 'var(--gray-700)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', fontWeight: 800 },
  modeActive: { background: SHELL_YELLOW, color: 'var(--label)', border: '1px solid var(--accent-amber-line)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', fontWeight: 800 },
  hrModePanel: { marginTop: 16, background: '#fff', color: 'var(--label)', borderRadius: 'var(--radius-xs)', padding: 20, borderLeft: `6px solid ${SHELL_RED}`, boxShadow: 'var(--shadow-sm)' },
  hrPostPanel: { background: '#fff', color: 'var(--label)', borderRadius: 'var(--radius-xs)', padding: 22, borderTop: `6px solid ${SHELL_RED}`, boxShadow: 'var(--shadow-sm)' },
  postForm: { display: 'grid', gap: 10, marginBottom: 12 },
  textArea: { minHeight: 92, resize: 'vertical', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', padding: 12, fontFamily: 'inherit' },
  primarySmall: { width: 'fit-content', background: SHELL_RED, color: '#fff', border: 0, borderRadius: 'var(--radius-xs)', padding: '9px 14px', fontWeight: 800 },
  employeeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 18 },
  employeeCard: { border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', padding: 16, display: 'grid', gap: 6, background: '#fff' },
  employeeAvatar: { width: 38, height: 38, borderRadius: '50%', background: SHELL_YELLOW, color: SHELL_RED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 },
  locationItem: { display: 'grid', gap: 4, padding: '12px 0', borderTop: '1px solid var(--gray-100)' },
  awardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 },
  awardCard: { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', padding: 18, display: 'grid', gap: 8, textAlign: 'center', justifyItems: 'center' },
  awardPhoto: { width: 84, height: 84, borderRadius: '50%', background: SHELL_RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900 },
  awardYears: { background: 'var(--bg-tertiary)', border: '1px solid var(--accent-amber-line)', borderRadius: 'var(--radius-xs)', padding: '5px 9px', fontWeight: 800 },
  appDock: { position: 'fixed', top: 188, right: 0, zIndex: 95, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', color: 'var(--label)' },
  appDockTab: { width: 38, minHeight: 130, border: 0, borderRadius: '18px 0 0 18px', background: SHELL_RED, color: '#fff', boxShadow: '-5px 10px 24px rgba(221,29,33,0.28)', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 10, padding: '13px 0', fontWeight: 900 },
  appDockDots: { writingMode: 'vertical-rl', letterSpacing: 2, color: SHELL_YELLOW, fontSize: 17, lineHeight: 1 },
  appDockText: { writingMode: 'vertical-rl', transform: 'rotate(180deg)', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 },
  appPanel: { position: 'relative', width: 326, maxHeight: 510, background: 'rgba(255,255,255,0.74)', backdropFilter: 'blur(18px) saturate(1.35)', WebkitBackdropFilter: 'blur(18px) saturate(1.35)', border: '1px solid rgba(255,255,255,0.72)', borderRadius: '26px 0 0 26px', padding: 16, boxShadow: '-20px 24px 46px rgba(0,0,0,0.20)', color: 'var(--label)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  launcherHeader: { position: 'relative', zIndex: 1, display: 'flex', gap: 12, alignItems: 'center', padding: '2px 4px 14px', color: 'var(--label)' },
  launcherTitle: { display: 'grid', gap: 2, lineHeight: 1.2 },
  launcherIcon: { width: 52, height: 52, borderRadius: 'var(--radius-md)', background: SHELL_YELLOW, color: SHELL_RED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, boxShadow: '0 8px 18px rgba(255,213,0,0.34)' },
  launcherDots: { position: 'relative', zIndex: 1, height: 1, margin: '0 2px 14px', background: 'rgba(0,0,0,0.08)' },
  launcherScroll: { position: 'relative', zIndex: 1, overflowY: 'auto', padding: '4px 4px 6px', flex: 1, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.22) transparent' },
  toolSection: { marginTop: 18 },
  toolHeading: { display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.86)', fontSize: 13, fontWeight: 800, marginBottom: 12, textTransform: 'uppercase' },
  appGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px 14px', alignItems: 'start' },
  appTile: { position: 'relative', minHeight: 104, textAlign: 'center', background: 'transparent', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '2px 4px 0', display: 'grid', gridTemplateRows: '58px auto', justifyItems: 'center', alignItems: 'start', gap: 8, color: 'var(--label)', fontFamily: 'inherit' },
  appIcon: { width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 900, boxShadow: '0 10px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.72)' },
  appTitle: { fontSize: 12, fontWeight: 800, lineHeight: 1.12, color: '#1f1f1f', maxWidth: 82, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  appText: { display: 'none' },
  star: { position: 'absolute', top: 0, right: 7, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.92)', color: 'var(--label-tertiary)', borderRadius: 'var(--radius-pill)', width: 21, height: 21, fontSize: 12, lineHeight: 1, fontWeight: 900, boxShadow: '0 3px 8px rgba(0,0,0,0.08)' },
  starActive: { position: 'absolute', top: 0, right: 7, border: '1px solid var(--accent-amber-line)', background: SHELL_YELLOW, color: 'var(--label)', borderRadius: 'var(--radius-pill)', width: 21, height: 21, fontSize: 12, lineHeight: 1, fontWeight: 900, boxShadow: '0 3px 8px rgba(0,0,0,0.08)' },
  ssoBadge: { position: 'absolute', top: 43, left: 12, background: 'rgba(255,255,255,0.96)', color: SHELL_RED, border: `1px solid ${SHELL_RED}`, borderRadius: 'var(--radius-sm)', fontSize: 8, fontWeight: 800, padding: '1px 5px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
  launching: { position: 'absolute', inset: 0, zIndex: 2, background: 'rgba(255,255,255,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, color: SHELL_RED },
  spinner: { width: 18, height: 18, border: '3px solid var(--accent-red-line)', borderTopColor: SHELL_RED, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  tag: { display: 'inline-flex', alignItems: 'center', width: 'fit-content', padding: '4px 9px', borderRadius: 'var(--radius-xs)', border: '1px solid', fontSize: 12, fontWeight: 800 },
  searchBar: { display: 'grid', gap: 14, marginBottom: 24 },
  searchInput: { width: 'min(100%, 560px)', padding: '13px 15px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-xs)', fontSize: 15, color: 'var(--label)', outlineColor: SHELL_RED },
  categoryFilter: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filter: { background: '#fff', color: 'var(--gray-700)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', padding: '8px 14px', fontWeight: 800 },
  filterActive: { background: SHELL_RED, color: '#fff', border: `1px solid ${SHELL_RED}`, borderRadius: 'var(--radius-xs)', padding: '8px 14px', fontWeight: 800 },
  kbGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  kbCard: { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', padding: 20, display: 'grid', gap: 12 },
  kbHeader: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  kbTitle: { fontSize: 17, lineHeight: 1.35, fontWeight: 800 },
  kbText: { color: 'var(--gray-500)', lineHeight: 1.6 },
  kbMeta: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', color: 'var(--label-tertiary)', fontSize: 12 },
  badgeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  fileBadge: { display: 'inline-flex', height: 25, alignItems: 'center', padding: '3px 7px', border: '1px solid', borderRadius: 'var(--radius-xs)', fontSize: 11, fontWeight: 800 },
  matchBadge: { display: 'inline-flex', height: 25, alignItems: 'center', padding: '3px 7px', border: '1px solid var(--info-bg)', borderRadius: 'var(--radius-xs)', background: 'var(--info-bg)', color: 'var(--info)', fontSize: 11, fontWeight: 800 },
  pin: { border: '1px solid var(--gray-200)', background: '#fff', color: 'var(--gray-600)', borderRadius: 'var(--radius-xs)', padding: '4px 7px', fontWeight: 800, fontSize: 11 },
  pinActive: { border: '1px solid var(--accent-amber-line)', background: SHELL_YELLOW, color: 'var(--label)', borderRadius: 'var(--radius-xs)', padding: '4px 7px', fontWeight: 800, fontSize: 11 },
  redLink: { color: SHELL_RED, fontWeight: 800 },
  textButton: { color: SHELL_RED, background: 'transparent', border: 0, fontWeight: 800, padding: 0 },
  history: { borderTop: '1px solid var(--gray-100)', paddingTop: 12, color: 'var(--gray-500)', fontSize: 13, display: 'grid', gap: 8 },
  historyItem: { display: 'grid', gridTemplateColumns: '50px 95px 1fr', gap: 8 },
  error: { background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-line)', color: SHELL_RED, borderRadius: 'var(--radius-xs)', padding: '12px 14px', fontWeight: 700 },
  loading: { padding: 36, textAlign: 'center', color: 'var(--label-tertiary)' },
  empty: { padding: 36, textAlign: 'center', color: 'var(--label-tertiary)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xs)', background: '#fff' },
  footer: { background: '#262626', color: '#fff', padding: '36px 24px' },
  footerGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 28 },
};
