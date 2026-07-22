import { useMemo, useState } from 'react';
import {
  CalendarDots,
  ChartBar,
  ChatCircleText,
  GraduationCap,
  House,
  IdentificationCard,
  InstagramLogo,
  LinkedinLogo,
  MapPin,
  NewspaperClipping,
  Smiley,
  SmileyMeh,
  SmileyNervous,
  SmileySad,
  SmileyWink,
  Toolbox,
  TreeStructure,
  Trophy,
  XLogo,
} from '@phosphor-icons/react';
import './intraportal-v3.css';

const MEDIA_ROOT = '/intraportal-v3/media';

const NAV_ITEMS = [
  { label: 'Our Shell', icon: House },
  { label: 'Tools & resources', icon: Toolbox },
  { label: 'Latest company news', icon: NewspaperClipping },
  { label: 'HR online', icon: IdentificationCard },
  { label: 'Upcoming events', icon: CalendarDots },
  { label: 'Find us', icon: MapPin },
  { label: 'Org structure', icon: TreeStructure },
  { label: 'Learning', icon: GraduationCap },
];

const LEAD_STORIES = [
  {
    category: 'Our people',
    title: 'Sailing through the Strait of Hormuz',
    summary: 'How a global team supported a stranded crew and guided them to safety.',
    image: `${MEDIA_ROOT}/hero-maritime.webp`,
  },
  {
    category: 'Winning performance culture',
    title: 'Working safely through every shift',
    summary: 'Colleagues share the habits that keep operations focused, safe and reliable.',
    image: `${MEDIA_ROOT}/hero-safety-shift.webp`,
  },
  {
    category: 'In country value',
    title: 'Building capability for Oman',
    summary: 'New partnerships create practical learning pathways for early-career talent.',
    image: `${MEDIA_ROOT}/hero-oman-talent.webp`,
  },
];

const SIDE_NEWS = [
  {
    title: 'Stepping up when it matters most',
    description: 'Follow #ThisIsShell on Viva Engage to see stories of colleagues who stepped up in challenging moments.',
    image: `${MEDIA_ROOT}/news-teamwork.webp`,
  },
  {
    title: 'Middle East: your questions answered',
    description: 'Guidance on safety, travel and support amid evolving events in the region.',
    image: `${MEDIA_ROOT}/news-middle-east.webp`,
  },
  {
    title: 'Meet Shell Assist',
    description: 'Your AI-powered assistant for HR, Finance, Corporate Travel and Corporate Relations queries is now available in MS Teams.',
    image: `${MEDIA_ROOT}/news-shell-assist.webp`,
  },
];

const EVENTS = [
  { day: '18', month: 'Jun', title: 'Long service awards', detail: 'Recognising 10, 20, 25, 30 and 35-year milestones.' },
  { day: '24', month: 'Jun', title: 'Goal Zero forum', detail: 'Learning session and safety highlights.' },
  { day: '02', month: 'Jul', title: 'Employee Connect', detail: 'Discussion with HR, IT and Real Estate.' },
  { day: '09', month: 'Jul', title: 'Country event', detail: 'Company and country calendar update.' },
];

const WATCH_ITEMS = [
  { title: 'Innovation in action', duration: '04:18', image: `${MEDIA_ROOT}/watch-innovation.webp` },
  { title: 'Sparta’s big milestone', duration: '02:46', image: `${MEDIA_ROOT}/watch-sparta.webp` },
  { title: 'Learning is vital', duration: '03:12', image: `${MEDIA_ROOT}/watch-learning.webp` },
  { title: 'People behind the platform', duration: '05:03', image: `${MEDIA_ROOT}/watch-platform-people.webp` },
];

const LEARNING_TOPICS = [
  {
    label: 'Think Secure Home',
    tone: 'home',
    title: 'Welcome to Think Secure: Shell’s hub for cybersecurity awareness',
    description: 'Practical guidance helps every colleague protect information, spot changing risks and make secure choices during everyday work.',
    action: 'Open learning hub',
  },
  {
    label: 'Access',
    tone: 'access',
    title: 'Secure access starts with strong verification',
    description: 'Use unique passphrases, multi-factor authentication and approved access methods to keep Shell systems protected.',
    action: 'Review access guidance',
  },
  {
    label: 'Devices',
    tone: 'devices',
    title: 'Keep every device secure and current',
    description: 'Install updates promptly, lock unattended devices and use approved equipment for Shell information and services.',
    action: 'Explore device security',
  },
  {
    label: 'Data & Information',
    tone: 'data',
    title: 'Handle information with care',
    description: 'Classify, store and share business information using the right controls for its sensitivity and intended audience.',
    action: 'View data guidance',
  },
  {
    label: 'Collaboration & Connection',
    tone: 'collaboration',
    title: 'Collaborate safely across approved channels',
    description: 'Confirm recipients, permissions and meeting access before sharing files or discussing confidential information.',
    action: 'Learn safer collaboration',
  },
  {
    label: 'Social Engineering & Phishing',
    tone: 'phishing',
    title: 'Stop, check and report suspicious messages',
    description: 'Pause before opening unexpected links or attachments, verify unusual requests and report anything suspicious immediately.',
    action: 'Review phishing guidance',
  },
  {
    label: 'Outside of Shell',
    tone: 'outside',
    title: 'Protect Shell information wherever you work',
    description: 'Stay alert in public spaces, use trusted connections and keep conversations, screens and documents away from unintended audiences.',
    action: 'View remote-work guidance',
  },
];

const FEEDBACK_MOODS = [
  { label: 'Very unhappy', icon: SmileySad },
  { label: 'Unhappy', icon: SmileyNervous },
  { label: 'Neutral', icon: SmileyMeh },
  { label: 'Happy', icon: Smiley },
  { label: 'Very happy', icon: SmileyWink },
];

const FEEDBACK_TOPICS = [
  'Work environment',
  'Team collaboration',
  'Management',
  'Tools & resources',
  'Work-life balance',
  'Growth opportunities',
];

function fallbackImageData(label) {
  const caption = label.slice(0, 42);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760">
      <defs>
        <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f1f1f1"/>
          <stop offset="1" stop-color="#e1e1e1"/>
        </linearGradient>
        <pattern id="lines" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="10" height="42" fill="#ffffff" opacity="0.35"/>
        </pattern>
      </defs>
      <rect width="1200" height="760" fill="url(#wash)"/>
      <rect width="1200" height="760" fill="url(#lines)"/>
      <circle cx="1020" cy="110" r="220" fill="#FFD500" opacity="0.78"/>
      <rect x="74" y="90" width="14" height="186" rx="7" fill="#DD1D21"/>
      <text x="120" y="168" fill="#222222" font-family="Arial, sans-serif" font-size="34" font-weight="700">IMAGE UNAVAILABLE</text>
      <text x="120" y="224" fill="#595959" font-family="Arial, sans-serif" font-size="25">${caption}</text>
      <text x="120" y="650" fill="#777777" font-family="Arial, sans-serif" font-size="20">Please try again later</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function Image({ src, alt, className }) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = fallbackImageData(alt);
      }}
    />
  );
}

function SectionHeading({ eyebrow, title, action }) {
  return (
    <header className="ip3-section-heading">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action && <button type="button" className="ip3-text-action">{action}</button>}
    </header>
  );
}

function ThinkSecureLearning() {
  const [activeTopic, setActiveTopic] = useState(0);
  const topic = LEARNING_TOPICS[activeTopic];

  return (
    <article className="ip3-learning-panel">
      <div className="ip3-learning-banner">
        <Image
          className="ip3-learning-icon"
          src="/intraportal-v3/think-secure-lock.png"
          alt=""
        />
        <div>
          <h2>Think Secure</h2>
          <span>Cyber Fundamentals</span>
        </div>
      </div>

      <div className="ip3-learning-tabs" role="tablist" aria-label="Cyber learning topics">
        {LEARNING_TOPICS.map((item, index) => (
          <button
            key={item.label}
            id={`ip3-learning-tab-${item.tone}`}
            type="button"
            role="tab"
            aria-selected={activeTopic === index}
            aria-controls="ip3-learning-panel"
            className={`ip3-learning-tab ip3-learning-tab-${item.tone}`}
            onClick={() => setActiveTopic(index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="ip3-learning-copy"
        id="ip3-learning-panel"
        role="tabpanel"
        aria-labelledby={`ip3-learning-tab-${topic.tone}`}
      >
        <h3>{topic.title}</h3>
        <p>{topic.description}</p>
        <button type="button">{topic.action}</button>
      </div>
    </article>
  );
}

function EmployeePulse() {
  const [activeTab, setActiveTab] = useState('feedback');
  const [mood, setMood] = useState('');
  const [topics, setTopics] = useState([]);
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState('');

  const toggleTopic = (topic) => {
    setTopics((current) => (
      current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]
    ));
  };

  const submitFeedback = (event) => {
    event.preventDefault();
    if (!mood || !comment.trim()) {
      setNotice('Choose a mood and add a short comment before sending.');
      return;
    }

    setNotice('Thank you. Your anonymous feedback has been captured.');
  };

  return (
    <article className="ip3-feedback-card" aria-label="Employee feedback">
      <div className="ip3-feedback-tabs" role="tablist" aria-label="Employee pulse views">
        <button type="button" role="tab" aria-selected={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')}>
          <ChatCircleText size={17} weight="regular" aria-hidden="true" />
          Give feedback
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')}>
          <Trophy size={17} weight="regular" aria-hidden="true" />
          Leaderboard
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
          <ChartBar size={17} weight="regular" aria-hidden="true" />
          Analytics
        </button>
      </div>

      {activeTab === 'feedback' && (
        <form className="ip3-feedback-form" onSubmit={submitFeedback} aria-label="Anonymous employee feedback form">
          <fieldset className="ip3-mood-fieldset">
            <legend>How are you feeling today?</legend>
            <div className="ip3-mood-options" role="radiogroup" aria-label="Current mood">
              {FEEDBACK_MOODS.map((item) => {
                const MoodIcon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="radio"
                    aria-checked={mood === item.label}
                    onClick={() => { setMood(item.label); setNotice(''); }}
                  >
                    <span><MoodIcon size={27} weight={mood === item.label ? 'fill' : 'regular'} aria-hidden="true" /></span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="ip3-topic-fieldset">
            <legend>What’s this about?</legend>
            <div className="ip3-topic-options">
              {FEEDBACK_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  aria-pressed={topics.includes(topic)}
                  onClick={() => toggleTopic(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="ip3-feedback-comment">
            <label htmlFor="ip3-feedback-comment">Share your thoughts</label>
            <textarea
              id="ip3-feedback-comment"
              value={comment}
              onChange={(event) => { setComment(event.target.value); setNotice(''); }}
              placeholder="Tell us what’s on your mind. Your feedback is anonymous and helps us improve."
              rows={3}
            />
          </div>

          <div className="ip3-feedback-submit">
            <p className={notice.startsWith('Thank') ? 'is-success' : 'is-error'} aria-live="polite">{notice}</p>
            <button type="submit">Send feedback</button>
          </div>
        </form>
      )}

      {activeTab === 'leaderboard' && (
        <div className="ip3-pulse-summary" role="tabpanel" aria-label="Participation leaderboard">
          <p className="ip3-eyebrow">June participation</p>
          <h3>Teams making their voices heard</h3>
          <ol>
            <li><span>Retail operations</span><strong>84%</strong></li>
            <li><span>Corporate services</span><strong>78%</strong></li>
            <li><span>Supply and distribution</span><strong>71%</strong></li>
          </ol>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="ip3-pulse-summary" role="tabpanel" aria-label="Feedback analytics">
          <p className="ip3-eyebrow">Monthly snapshot</p>
          <h3>Employee sentiment at a glance</h3>
          <dl>
            <div><dt>Positive sentiment</dt><dd>68%</dd></div>
            <div><dt>Most discussed</dt><dd>Tools & resources</dd></div>
            <div><dt>Responses this month</dt><dd>426</dd></div>
          </dl>
        </div>
      )}
    </article>
  );
}

export default function IntraPortalV3() {
  const [activeStory, setActiveStory] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState('');

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('som_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const userName = storedUser?.name || 'Nada Al-Balushi';
  const userRole = storedUser?.role || 'Payroll & HR system administrator';
  const story = LEAD_STORIES[activeStory];

  const goTo = (target) => {
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setNavOpen(false);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;
    const destination = normalized.includes('learn') ? 'learning' : normalized.includes('event') ? 'performance' : 'news';
    goTo(destination);
  };

  return (
    <div className="intraportal-v3" id="top">
      <a className="ip3-skip-link" href="#ip3-main">Skip to portal content</a>

      <aside className={`ip3-sidebar ${navOpen ? 'is-open' : ''}`} aria-label="Portal sidebar">
        <button className="ip3-brand" type="button" onClick={() => goTo('top')} aria-label="Sada Shell portal home">
          <img src="/logo.png" alt="Shell" />
          <span>Sada Shell</span>
        </button>

        <nav className="ip3-nav" aria-label="Portal navigation">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;

            return (
              <a
                key={item.label}
                href="#"
                className={index === 0 ? 'is-active' : ''}
                aria-current={index === 0 ? 'page' : undefined}
                onClick={() => setNavOpen(false)}
              >
                <Icon className="ip3-nav-icon" size={25} weight="regular" aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

      </aside>

      <div className="ip3-workspace">
        <header className="ip3-topbar">
          <button className="ip3-menu-button" type="button" onClick={() => setNavOpen((value) => !value)} aria-expanded={navOpen}>
            Menu
          </button>

          <form className="ip3-search" onSubmit={handleSearch} role="search">
            <label htmlFor="ip3-search-input">Search the intraportal</label>
            <input
              id="ip3-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search news, people, forms and tools"
            />
            <button type="submit">Search</button>
          </form>

          <div className="ip3-topbar-links" aria-label="Social channels">
            <a href="https://www.linkedin.com/company/shell" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <LinkedinLogo size={22} weight="regular" aria-hidden="true" />
            </a>
            <a href="https://www.instagram.com/shell" target="_blank" rel="noreferrer" aria-label="Instagram">
              <InstagramLogo size={22} weight="regular" aria-hidden="true" />
            </a>
            <a href="https://x.com/Shell" target="_blank" rel="noreferrer" aria-label="X">
              <XLogo size={22} weight="regular" aria-hidden="true" />
            </a>
          </div>

          <div className="ip3-profile">
            <Image src={`${MEDIA_ROOT}/profile-nada.webp`} alt={`${userName} profile`} />
            <span><strong>{userName}</strong><small>{userRole}</small></span>
          </div>
        </header>

        <main className="ip3-main" id="ip3-main">
          <section className="ip3-ticker" aria-label="Breaking news">
            <strong>Breaking news</strong>
            <p>Shell agrees to sell Spring Energy Group to Aditya Birla Renewables Limited.</p>
            <button type="button">Read update</button>
          </section>

          <div className="ip3-content-grid">
            <div className="ip3-primary-column">
              <section className="ip3-lead-grid" id="news" aria-label="Latest company news">
                <article className="ip3-lead-story">
                  <Image src={story.image} alt={`${story.title} feature`} />
                  <div className="ip3-lead-shade" />
                  <div className="ip3-lead-copy">
                    <span>{story.category}</span>
                    <h1>{story.title}</h1>
                    <p>{story.summary}</p>
                    <button type="button">Read the story</button>
                  </div>
                  <div className="ip3-story-controls" aria-label="Choose lead story">
                    {LEAD_STORIES.map((item, index) => (
                      <button
                        key={item.title}
                        type="button"
                        className={activeStory === index ? 'is-active' : ''}
                        onClick={() => setActiveStory(index)}
                        aria-label={`Show story ${index + 1}: ${item.title}`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </article>

                <div className="ip3-story-rail">
                  {SIDE_NEWS.map((item) => (
                    <article key={item.title} className="ip3-story-rail-item">
                      <Image src={item.image} alt={`${item.title} story`} />
                      <div><h3>{item.title}</h3><p>{item.description}</p></div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="ip3-announcements" id="people">
                <article className="ip3-announcement ip3-announcement-red">
                  <div className="ip3-announcement-banner">Mobility team rotations</div>
                  <Image src={`${MEDIA_ROOT}/portrait-noura.webp`} alt="Noura Al Hashar portrait" />
                  <div>
                    <p>We are pleased to share an update on the latest rotation within our Mobility team.</p>
                    <strong>Noura Al Hashar — Territory Executive</strong>
                    <span>Effective 1 May 2026</span>
                  </div>
                </article>

                <article className="ip3-announcement ip3-announcement-light">
                  <div className="ip3-announcement-banner">Staff announcement · new joiner</div>
                  <Image src={`${MEDIA_ROOT}/portrait-ahmed.webp`} alt="Ahmed Hamed Al Subhi portrait" />
                  <div>
                    <p>We are delighted to welcome Ahmed Hamed Al Subhi to Shell Oman.</p>
                    <strong>Internal Auditor</strong>
                    <span>Effective 1 March 2026</span>
                  </div>
                </article>
              </section>

              <section className="ip3-resource-grid" id="learning">
                <article className="ip3-phishing-panel">
                  <Image
                    className="ip3-phishing-art"
                    src="/intraportal-v3/phishing-golden-catch-banner.png"
                    alt="Don't be the golden Catch. Report Phishing."
                  />
                  <div className="ip3-phishing-scorecard">
                    <header>
                      <h2>Reach ≥30% Golden Star Rate</h2>
                      <p>Every SOM employee can move the scorecard.</p>
                    </header>

                    <img className="ip3-scorecard-mark" src="/logo.png" alt="" aria-hidden="true" />

                    <div className="ip3-phishing-actions">
                      <div>
                        <strong>Report</strong>
                        <span>Use the report phishing button.</span>
                      </div>
                      <div>
                        <strong>Do not click</strong>
                        <span>Pause before email links and attachments.</span>
                      </div>
                      <div>
                        <strong>Participate</strong>
                        <span>Join awareness activities.</span>
                      </div>
                    </div>

                    <p className="ip3-phishing-target">
                      <strong>Target behavior:</strong> report suspicious emails first — do not click to investigate.
                    </p>
                  </div>
                </article>

                <ThinkSecureLearning />
              </section>

              <section className="ip3-performance" id="performance">
                <div className="ip3-performance-main">
                  <p className="ip3-eyebrow">Performance and results</p>
                  <h2>Collective progress, visible to everyone</h2>
                  <p>A focused view of achievements, business goals, Goal Zero, HSSE events, DE&I and worker welfare.</p>
                  <div className="ip3-metrics">
                    <div><strong>Goal Zero</strong><span>HSSE dashboard</span><small>Safety moments and team actions</small></div>
                    <div><strong>High performance</strong><span>Achievements</span><small>Internal and external value stories</small></div>
                    <div><strong>Business goals</strong><span>Targets</span><small>Progress visibility by function</small></div>
                    <div><strong>DE&I</strong><span>Worker welfare</span><small>Employee wellbeing and inclusion</small></div>
                  </div>
                </div>

                <aside className="ip3-events" aria-label="Upcoming events">
                  <h2>Upcoming company and country events</h2>
                  {EVENTS.map((event) => (
                    <article key={`${event.day}-${event.title}`}>
                      <time><strong>{event.day}</strong><span>{event.month}</span></time>
                      <div><h3>{event.title}</h3><p>{event.detail}</p></div>
                    </article>
                  ))}
                </aside>
              </section>

              <section className="ip3-community" id="tools">
                <SectionHeading eyebrow="Community" title="Life across Sada Shell" action="View all stories" />
                <div className="ip3-community-grid">
                  <EmployeePulse />
                  <div className="ip3-community-stories">
                    <article><Image src={`${MEDIA_ROOT}/community-family.webp`} alt="Newborn baby feet held safely in a parent’s hands" /><div><span>Our people</span><h3>Celebrating a new addition to the family</h3></div></article>
                    <article><Image src={`${MEDIA_ROOT}/community-milestone.webp`} alt="Colleagues celebrating a teammate’s achievement" /><div><span>Milestones</span><h3>Congratulations from colleagues across Oman</h3></div></article>
                  </div>
                </div>
              </section>
            </div>

            <aside className="ip3-right-rail" aria-label="Quick information">
              <section className="ip3-status-card" aria-label="Goal Zero and share price">
                <div className="ip3-safety-card">
                  <div className="ip3-safety-head"><span>Goal Zero</span><strong>Live</strong></div>
                  <dl>
                    <div><dt>No harm</dt><dd>75 days</dd></div>
                    <div><dt>No leaks</dt><dd>78 days</dd></div>
                  </dl>
                  <button type="button">View safety dashboard</button>
                </div>

                <div className="ip3-market-card">
                  <div><span>Share price</span><small>Delayed 15 minutes</small></div>
                  <dl>
                    <div><dt>Amsterdam</dt><dd>€36.87 <span>+0.09%</span></dd></div>
                    <div><dt>London</dt><dd>3,147.00p <span>+1.22%</span></dd></div>
                    <div><dt>New York</dt><dd>$84.41 <span>+0.51%</span></dd></div>
                  </dl>
                </div>
              </section>

              <article className="ip3-help-card">
                <Image src={`${MEDIA_ROOT}/support-digital-tools.webp`} alt="Digital workplace tools on a laptop and tablet" />
                <div><span>Need help?</span><h2>Key tools and resources in one place</h2><button type="button">Find support</button></div>
              </article>

              <article className="ip3-small-feature">
                <Image src={`${MEDIA_ROOT}/support-employee-assistance.webp`} alt="Confidential employee wellbeing support conversation" />
                <div><h3>Employee assistance programme</h3><p>Support when you need it.</p></div>
              </article>

              <article className="ip3-corporate-card">
                <p>Corporate relations</p>
                <h2>Annual report 2025</h2>
                <span>From inception to the future</span>
                <Image
                  className="ip3-report-cover"
                  src={`${MEDIA_ROOT}/annual-report-2025.webp`}
                  alt="Annual report cover featuring Oman’s mountains and energy infrastructure"
                />
                <button type="button">Open report</button>
              </article>

              <section className="ip3-watch-card">
                <SectionHeading eyebrow="Media" title="More to watch" />
                {WATCH_ITEMS.map((item) => (
                  <article key={item.title}>
                    <Image src={item.image} alt={`${item.title} video thumbnail`} />
                    <div><h3>{item.title}</h3><span>{item.duration}</span></div>
                  </article>
                ))}
                <button type="button">View all media</button>
              </section>
            </aside>
          </div>
        </main>

        <footer className="ip3-footer" id="footer">
          <div><h2>Essential links</h2><a href="/login">Code of conduct and helpline</a><a href="https://www.shell.com" target="_blank" rel="noreferrer">Shell.com</a><a href="/login">Social media guidelines</a></div>
          <div><h2>Hub information and forms</h2><a href="/login">The hub introduction</a><a href="/login">Hub feedback and help</a><a href="/login">Report an inappropriate comment</a></div>
          <div><h2>Terms and conditions</h2><a href="/login">Terms of use</a><a href="/login">Privacy information</a><a href="/login">Confidentiality classification rules</a></div>
        </footer>
      </div>
    </div>
  );
}
