import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bank,
  CalendarDots,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartBar,
  ChatCircleText,
  CheckCircle,
  ClipboardText,
  Confetti,
  Coffee,
  Clock,
  DeviceMobile,
  Drop,
  EnvelopeSimple,
  Check,
  Fire,
  FirstAidKit,
  Gear,
  GraduationCap,
  HardHat,
  House,
  IdentificationCard,
  InstagramLogo,
  Leaf,
  LinkedinLogo,
  MapPin,
  NewspaperClipping,
  Pause,
  Play,
  ReadCvLogo,
  RoadHorizon,
  Shield,
  ShieldCheck,
  Smiley,
  SmileyMeh,
  SmileyNervous,
  SmileySad,
  SmileyWink,
  SquaresFour,
  Star,
  Toolbox,
  TreeStructure,
  Trophy,
  User,
  UsersThree,
  X,
  XLogo,
} from '@phosphor-icons/react';
import './intraportal-v3.css';

const MEDIA_ROOT = '/intraportal-v3/media';

const NAV_ITEMS = [
  { label: 'Our Shell', icon: House, megaMenu: true },
  { label: 'Tools & resources', icon: Toolbox, href: '/tools-and-resources' },
  { label: 'Latest company news', icon: NewspaperClipping, href: '#news' },
  { label: 'HR online', icon: IdentificationCard, href: '/hr-online' },
  { label: 'Upcoming events', icon: CalendarDots, href: '#performance' },
  { label: 'Find us', icon: MapPin, href: '#footer' },
  { label: 'Org structure', icon: TreeStructure, href: '#ip3-main' },
  { label: 'Learning', icon: GraduationCap, href: '/learning' },
];

const OUR_SHELL_MENU = [
  {
    title: 'About Shell',
    items: [
      { label: 'This is Shell', href: '/this-is-shell' },
      { label: 'CEO Corner', href: '/ceo-corner' },
      { label: 'Performance and Results', href: '/#performance' },
    ],
  },
  {
    title: 'Business',
    sections: [
      {
        title: 'Trade & Supply',
        items: [
          'Road Transport Operations & Order to Delivery',
          'Engineering',
          'Trade & Supply HSSE',
          'Supply Operations',
          'Terminal Operations',
        ],
      },
      {
        title: 'Lubricants',
        items: ['Lubricant Supply Chain', 'Commercial Lubes', 'Customer Operations'],
      },
      {
        title: 'Mobility',
        items: ['Sales & Operations', 'B2B Fuels & Specialties', 'Corporate & Mobility HSSE', 'Network', 'Marketing'],
      },
      {
        title: 'Low Carbon Solutions',
        items: ['Aviation', 'Marine & Commercial (Bulk Fuel)', 'Marine Fuels & Marine Lubes'],
      },
    ],
  },
  {
    title: 'Functions',
    sections: [
      {
        title: 'Finance',
        items: ['Legal', 'Corporate Finance', 'Contract & Procurement', 'Credit Management', 'Business Finance'],
      },
      {
        title: 'Human Resources, Real Estate Facilities & IT',
        items: ['Human Resource', 'Services', 'Corporate IT', 'Retail IT'],
      },
      { title: 'Corporate Relations', href: '#learning' },
      { title: 'Internal Audit', href: '#learning' },
    ],
  },
];

const LEAD_STORIES = [
  ...Array.from({ length: 8 }, (_, index) => {
    const bannerNumber = String(index + 1).padStart(2, '0');

    return {
      id: `past-and-today-${bannerNumber}`,
      alt: `Shell Oman past and today banner ${index + 1}`,
      image: `${MEDIA_ROOT}/banners/05-Banners_Hero_Carousel_Past&Today_SOM_1356x768px-${bannerNumber}.jpg`,
    };
  }),
];

// Frontend-only demonstration data. Replace this array with the CMS response
// when the intraportal backend is connected.
const BREAKING_NEWS = [
  {
    headline: 'Shell agrees to sell Spring Energy Group to Aditya Birla Renewables Limited.',
    target: 'news',
  },
  {
    headline: 'Shell Oman celebrates the opening of Oman’s first hydrogen service station.',
    target: 'performance',
  },
  {
    headline: 'Shell People Survey 2026 opens on 19 August to 18 September.',
    target: 'learning',
  },
];

const LEAD_STORY_ROTATION_MS = 6000;
const BREAKING_NEWS_ROTATION_MS = 6000;

const SIDE_NEWS = [
  {
    title: 'Powering Progress in Oman: From Inception to the Future',
    description: 'Shell Oman’s national media event celebrated the milestones shaping a more innovative and sustainable future.',
    body: 'Shell Oman hosted a national media event welcoming esteemed government guests, industry partners, national media, and the leadership team to celebrate the company’s journey of innovation and progress.',
    highlights: [
      'Inauguration of Oman’s first hydrogen service station',
      'Launch of Shell FuelSave 91',
      'Expansion of the company’s EV journey',
      'A landmark agreement with Oman Air at Muscat and Salalah airports',
      '40 years of excellence at the Lubricants Blending Plant',
      'New immersion cooling technologies supporting data-centre growth in Oman',
    ],
    closing: [
      'The event also highlighted the people behind these achievements. With 94% Omanization, strong employee engagement, and a continued focus on In-Country Value, Shell Oman remains a trusted partner in the nation’s future.',
      'Thank you for your dedication, teamwork, and passion. Together, we are not just witnessing Shell Oman’s journey—we are shaping it.',
    ],
    image: `${MEDIA_ROOT}/powering-progress-thumbnail.png`,
    video: '/intraportal-v3/videos/powering-progress-in-oman.mp4',
    orientation: 'portrait',
  },
  {
    title: 'Governance Day',
    description: 'Highlights from Governance Day, bringing colleagues together around accountability and responsible decision-making.',
    image: `${MEDIA_ROOT}/governance-day-thumbnail.png`,
    thumbnailClass: 'is-governance-day',
    video: '/intraportal-v3/videos/Governance-Day-Video.MP4',
    orientation: 'portrait',
  },
  {
    title: 'Lead Your Future',
    description: 'A People Development Week message encouraging colleagues to take ownership of their growth and future.',
    image: `${MEDIA_ROOT}/lead-your-future-thumbnail.png`,
    thumbnailClass: 'is-lead-your-future',
    video: '/intraportal-v3/videos/Lead-you-future.mp4',
    orientation: 'portrait',
  },
];

const EVENTS = [
  { day: '18', month: 'Jun', title: 'Long service awards', detail: 'Recognising 10, 20, 25, 30 and 35-year milestones.' },
  { day: '24', month: 'Jun', title: 'Goal Zero forum', detail: 'Learning session and safety highlights.' },
  { day: '02', month: 'Jul', title: 'Employee Connect', detail: 'Discussion with HR, IT and Real Estate.' },
  { day: '09', month: 'Jul', title: 'Country event', detail: 'Company and country calendar update.' },
];

// Temporarily hidden until the events feed is ready to be shown again.
const SHOW_UPCOMING_EVENTS = false;

const WATCH_ITEMS = [
  { title: 'Innovation in action', duration: '04:18', image: `${MEDIA_ROOT}/watch-innovation.webp` },
  { title: 'Sparta’s big milestone', duration: '02:46', image: `${MEDIA_ROOT}/watch-sparta.webp` },
  { title: 'Learning is vital', duration: '03:12', image: `${MEDIA_ROOT}/watch-learning.webp` },
  { title: 'People behind the platform', duration: '05:03', image: `${MEDIA_ROOT}/watch-platform-people.webp` },
];

const GOLDEN_STAR_ACTIONS = [
  {
    title: 'Report suspicious emails',
    detail: 'Use the Report Phishing button as soon as an email looks unusual.',
    tone: 'green',
  },
  {
    title: 'Pause before opening',
    detail: 'Check the sender, link, attachment, and QR code before taking action.',
    tone: 'blue',
  },
  {
    title: 'Join awareness activities',
    detail: 'Practice the right response and remind colleagues to report.',
    tone: 'red',
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

const HR_ONLINE_MEDIA = '/intraportal-v3/media/hr-online';

const HR_ONLINE_INTRO = [
  'At Shell, our people are at the heart of everything we do. The Human Resources (HR) team is here to empower you, support your growth, and create an inclusive environment where everyone can thrive.',
  'Our role in HR is to enable the delivery of Shell’s Powering Progress strategy by developing and deploying effective people strategies. We aim to attract, develop, and retain the best talent while fostering a winning performance culture aligned with Shell’s purpose and values.',
  'Whether it’s career development, seamless support for your queries, or guidance on policies and benefits, HR is committed to helping you succeed both personally and professionally.',
  'We operate as an integrated team — across HR in the business, in our operations, and in specialised areas like learning, talent, and reward — to drive business performance and create value for Shell.',
];

const HR_ONLINE_HIGHLIGHTS = [
  {
    id: 'winning-performance-culture',
    title: 'Winning Performance Culture',
    image: `${HR_ONLINE_MEDIA}/winning-performance-culture.jpg`,
    alt: 'Winning performance culture',
    href: 'https://eu001-sp.shell.com/sites/SPO000035/_layouts/15/stream.aspx?id=%2Fsites%2FSPO000035%2FIC%20Stream%20on%20SharePoint%20Videos%2FCEWS%2FThis%20is%20Shell%5FFebruary%202025%20all%2Dstaff%20stand%2Dup%20with%20Wael%2FThis%20is%20Shell%5FWinning%20Performance%20Culture%5FRachel%20Solway%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Ec108a9b7%2D5d5e%2D4394%2Db6b0%2D3f99e3e804de',
  },
  {
    id: 'diversity-equity-inclusion',
    title: 'Diversity, Equity & Inclusion',
    image: `${HR_ONLINE_MEDIA}/diversity-equity-inclusion.jpg`,
    alt: 'Diversity, equity and inclusion',
    href: 'https://eu001-sp.shell.com/sites/AAAAA9387/SitePages/Homepage.aspx',
  },
  {
    id: 'employee-value-proposition',
    title: 'Employee Value Proposition',
    image: `${HR_ONLINE_MEDIA}/employee-value-proposition.jpg`,
    alt: 'Employee value proposition',
    href: 'https://eu001-sp.shell.com/sites/SPO001113',
  },
  {
    id: 'shell-people-survey',
    title: 'Shell People Survey',
    image: '/intraportal-v3/shell-people-survey-2026-banner.png',
    alt: 'Shell People Survey 2026, 19 August to 18 September',
    href: 'https://eu001-sp.shell.com/sites/SPO000430',
  },
];

const HR_ONLINE_LINK_ICON = '/intraportal-v3/link-icon.png';

const HR_ONLINE_QUICK_LINKS = [
  { id: 'people1st-hr-manual', title: 'Explore our People1st HR Manual', href: null },
  { id: 'oman-labour-law', title: 'Oman Labour Law', href: 'https://www.mol.gov.om/Laborlaw' },
  { id: 'social-protection-fund', title: 'Social Protection Fund', href: 'https://www.spf.gov.om/en/home-2/' },
];

const HR_ONLINE_SERVICES = [
  {
    id: 'business-mileage-claim',
    title: 'Business Mileage Claim',
    detail: null,
    image: `${HR_ONLINE_MEDIA}/business-mileage.png`,
    alt: 'Business mileage claim',
    href: '/business-mileage-claim',
  },
  {
    id: 'recreational-wellness-scheme',
    title: 'Recreational & Wellness Scheme',
    detail: null,
    image: `${HR_ONLINE_MEDIA}/recreational-wellness-scheme.png`,
    alt: 'Recreational and wellness scheme',
    href: '/recreational-wellness-scheme',
  },
  {
    id: 'healthcare-benefits',
    title: 'Healthcare Benefits',
    detail: null,
    image: `${HR_ONLINE_MEDIA}/healthcare-benefits.png`,
    alt: 'Healthcare benefits',
    href: '/healthcare-benefits',
  },
  {
    id: 'mobile-phones-business-numbers',
    title: 'SOM Allocated Mobile Phones & Business Numbers',
    detail: null,
    image: `${HR_ONLINE_MEDIA}/mobile-phones-business-numbers.png`,
    alt: 'SOM allocated mobile phones and business numbers',
    href: '/mobile-phones-business-numbers',
  },
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

function Image({ src, alt, className, loading = 'lazy', fetchPriority, ariaHidden }) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      aria-hidden={ariaHidden}
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
  return (
    <article className="ip3-learning-panel">
      <Image
        className="ip3-learning-banner"
        src="/intraportal-v3/shell-people-survey-2026-banner.png"
        alt="Shell People Survey 2026, August 19 to September 18"
      />

      <div className="ip3-learning-copy">
        <p className="ip3-learning-copy-lead">
          The Shell People Survey (SPS) 2026 will be open from the 19th of August until September 18th,
          2026, and you have the opportunity to voice your opinion! SPS is an annual survey conducted
        </p>
        <p>
          to measure our engagement, motivation, and commitment to Shell. It covers crucial topics like safety,
          diversity, equity and Inclusion, ethics, collaboration, organization and team leadership.
        </p>
      </div>
    </article>
  );
}

function GoldenStarScorecard() {
  return (
    <section className="ip3-golden-scorecard" aria-labelledby="ip3-golden-scorecard-title">
      <h2 id="ip3-golden-scorecard-title">
        Golden Star Rate: 30% Target Achieved <span>— Aim for 40% Ambition</span>
      </h2>

      <div className="ip3-golden-status" aria-label="Golden Star scorecard status">
        <strong>Scorecard:</strong>
        <div className="ip3-golden-status-item is-achieved">
          <span className="ip3-golden-status-icon"><Check size={19} weight="bold" aria-hidden="true" /></span>
          <span><b>30% Target</b><small>Achieved</small></span>
        </div>
        <div className="ip3-golden-status-item is-ambition">
          <span className="ip3-golden-status-icon"><Star size={16} weight="fill" aria-hidden="true" /></span>
          <span><b>40% Ambition</b><small>Our next goal</small></span>
        </div>
        <p>We’ve reached the scorecard target. Now let’s keep improving toward 40%.</p>
      </div>

      <div className="ip3-golden-body">
        <section className="ip3-golden-current" aria-labelledby="ip3-golden-current-title">
          <data value="31.08">31.08%</data>
          <h3 id="ip3-golden-current-title">Current Golden Star Rate</h3>

          <div className="ip3-golden-scale" role="img" aria-label="Current Golden Star Rate is 31.08 percent, above the 30 percent target and moving toward the 40 percent ambition">
            <div className="ip3-golden-scale-track" aria-hidden="true">
              <span className="ip3-golden-scale-progress" />
              <span className="ip3-golden-scale-remaining" />
              <i className="ip3-golden-marker is-start" />
              <i className="ip3-golden-marker is-target"><Check size={15} weight="bold" /></i>
              <i className="ip3-golden-current-pin" />
              <i className="ip3-golden-marker is-goal"><Star size={13} weight="fill" /></i>
            </div>
            <div className="ip3-golden-scale-labels" aria-hidden="true">
              <span>0%</span>
              <span className="is-target">30%<small>Target</small></span>
              <span className="is-current">31.08%<small>Current</small></span>
              <span className="is-goal">40%<small>Ambition</small></span>
            </div>
          </div>

          <aside className="ip3-golden-improvement">
            <span><ArrowUpRight size={18} weight="bold" aria-hidden="true" /></span>
            <p><strong>What improves the Golden Star Rate?</strong>More valid reports of suspicious emails from all employees.</p>
          </aside>
        </section>

        <section className="ip3-golden-actions" aria-labelledby="ip3-golden-actions-title">
          <h3 id="ip3-golden-actions-title">How we move toward 40%</h3>
          <ol>
            {GOLDEN_STAR_ACTIONS.map((action, index) => (
              <li className={`is-${action.tone}`} key={action.title}>
                <span>{index + 1}</span>
                <div><strong>{action.title}</strong><p>{action.detail}</p></div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer>30% achieved — every valid report takes us closer to our 40% ambition.</footer>
    </section>
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

const SAFETY_FOCUS_AREAS = [
  { label: 'Process Safety', icon: UsersThree },
  { label: 'Fire Safety', icon: Fire },
  { label: 'Road Safety', icon: RoadHorizon },
  { label: 'PPE Compliance', icon: HardHat },
  { label: 'Equipment Integrity', icon: Gear },
  { label: 'Permit to Work', icon: ClipboardText },
  { label: 'Environment Protection', icon: Leaf },
  { label: 'Safety Audits', icon: ShieldCheck },
];

function SafetySectionHeading({ icon, children }) {
  return (
    <div className="ip3-safety-dashboard-section-heading">
      <span aria-hidden="true">{createElement(icon, { size: 17, weight: 'bold' })}</span>
      <h3>{children}</h3>
      <i aria-hidden="true" />
    </div>
  );
}

function CurrentSafetyMetric({ icon, label, value }) {
  return (
    <article className="ip3-safety-dashboard-current-metric">
      <header>
        <span className={`ip3-safety-dashboard-current-icon${label === 'No Harm' ? ' is-harm' : ''}`} aria-hidden="true">
          {label === 'No Harm' ? (
            <>
              <Shield size={38} weight="regular" />
              <User size={17} weight="regular" />
            </>
          ) : createElement(icon, { size: 38, weight: 'regular' })}
        </span>
        <strong>{label}</strong>
        <CheckCircle size={20} weight="fill" aria-label="On track" />
      </header>
      <data value={value} aria-label={`${value} days ${label.toLowerCase()}`}>{value}</data>
      <span>Days</span>
      <footer><CheckCircle size={15} weight="fill" aria-hidden="true" /> On Track</footer>
    </article>
  );
}

function PreviousSafetyMetric({ icon, label, value }) {
  return (
    <article className="ip3-safety-dashboard-previous-metric">
      <div>
        <strong>{label}</strong>
        <data value={value} aria-label={`${value} days ${label.toLowerCase()} in 2025`}>{value}</data>
        <span>Days</span>
      </div>
      <span className="ip3-safety-dashboard-previous-icon" aria-hidden="true">
        {createElement(icon, { size: 34, weight: 'regular' })}
      </span>
    </article>
  );
}

function GoalZeroCounter() {
  return (
    <section className="ip3-goal-zero-counter" aria-labelledby="ip3-goal-zero-title">
      <header className="ip3-safety-dashboard-header">
        <div className="ip3-safety-dashboard-company">
          <img src="/logo.png" alt="Shell" />
          <strong>Shell Oman Marketing Company SAOG</strong>
        </div>
        <h2 id="ip3-goal-zero-title">Goal Zero Safety Dashboard</h2>
        <p>Safety Performance 2026</p>
        <img
          className="ip3-safety-dashboard-artwork"
          src={`${MEDIA_ROOT}/goal-zero-refinery-artwork.png`}
          alt=""
          aria-hidden="true"
        />
      </header>

      <div className="ip3-safety-dashboard-section">
        <SafetySectionHeading icon={ChartBar}>Current Performance</SafetySectionHeading>
        <div className="ip3-safety-dashboard-current-grid">
          <CurrentSafetyMetric icon={ShieldCheck} label="No Harm" value={212} />
          <CurrentSafetyMetric icon={Drop} label="No Leak" value={212} />
        </div>
      </div>

      <div className="ip3-safety-dashboard-section">
        <SafetySectionHeading icon={CalendarDots}>Previous Year Performance (2025)</SafetySectionHeading>
        <div className="ip3-safety-dashboard-previous-grid">
          <PreviousSafetyMetric icon={ShieldCheck} label="No Harm" value={189} />
          <PreviousSafetyMetric icon={Drop} label="No Leak" value={365} />
        </div>
      </div>

      <div className="ip3-safety-dashboard-section">
        <SafetySectionHeading icon={Clock}>Last Updated</SafetySectionHeading>
        <time className="ip3-safety-dashboard-updated" dateTime="2026-08-25T08:02:00" aria-label="Last updated 25 August 2026 at 8:02 AM">
          <span>25 August 2026</span>
          <strong>08:02 AM</strong>
        </time>
      </div>

      <div className="ip3-safety-dashboard-section">
        <SafetySectionHeading icon={ShieldCheck}>Safety Focus Areas</SafetySectionHeading>
        <ul className="ip3-safety-dashboard-focus-grid">
          {SAFETY_FOCUS_AREAS.map(({ label, icon }) => (
            <li key={label}>
              <span aria-hidden="true">{createElement(icon, { size: 22, weight: 'fill' })}</span>
              <strong>{label}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function VideoModal({ item, setActiveVideo }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = 'hidden';
    if (typeof dialog?.showModal === 'function') dialog.showModal();
    else dialog?.setAttribute('open', '');
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="ip3-video-dialog"
      aria-labelledby="ip3-video-modal-title"
      aria-describedby="ip3-video-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        setActiveVideo(null);
      }}
      onClose={() => setActiveVideo(null)}
    >
      <section
        className={item.orientation === 'portrait' ? 'ip3-video-modal is-portrait' : 'ip3-video-modal'}
      >
        <button
          ref={closeButtonRef}
          className="ip3-video-modal-close"
          type="button"
          aria-label="Close video"
          onClick={() => setActiveVideo(null)}
        >
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
        <div className="ip3-video-modal-media">
          {item.video ? (
            <div className={item.orientation === 'portrait' ? 'ip3-video-frame is-portrait' : 'ip3-video-frame'}>
              <video className="ip3-video-player" controls poster={item.image}>
                <source src={item.video} type="video/mp4" />
              </video>
            </div>
          ) : (
            <>
              <Image src={item.image} alt="" />
              <span className="ip3-video-modal-play" aria-hidden="true">
                <Play size={38} weight="fill" />
              </span>
            </>
          )}
        </div>
        <div className="ip3-video-modal-copy">
          <h2 id="ip3-video-modal-title">{item.title}</h2>
          <p id="ip3-video-modal-description">{item.body || item.description}</p>
          {item.highlights && (
            <section className="ip3-video-modal-highlights" aria-labelledby="ip3-video-modal-highlights-title">
              <h3 id="ip3-video-modal-highlights-title">Milestones shared</h3>
              <ul>
                {item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
              </ul>
            </section>
          )}
          {item.closing?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>
    </dialog>
  );
}

function CeoCornerPage() {
  return (
    <main className="ip3-main ip3-ceo-page" id="ip3-main">
      <nav className="ip3-ceo-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Our Shell</a>
        <CaretRight size={15} weight="bold" aria-hidden="true" />
        <span aria-current="page">CEO Corner</span>
      </nav>

      <article className="ip3-ceo-article">
        <Image
          className="ip3-ceo-banner"
          src="/intraportal-v3/ceo-corner-coffee-banner.webp"
          alt="Coffee with the CEO at Shell Café"
        />

        <div className="ip3-ceo-content">
          <div className="ip3-ceo-copy">
            <p className="ip3-eyebrow">CEO Corner</p>
            <h1>Coffee with the CEO returns</h1>
            <p className="ip3-ceo-lede">A relaxed conversation beyond the office, bringing colleagues together to exchange ideas and connect with Shell Oman’s leadership.</p>

            <p>Dear Colleagues,</p>
            <p>Following the high demand and positive feedback from previous sessions, we’re excited to bring back <strong>Coffee with the CEO</strong> with <strong>Mohammed Al-Balushi, SMO CEO</strong>.</p>
            <p>This time, we’ll be taking the conversations beyond the office and hosting the session in one of our <strong>Shell Café outlets</strong>, providing a relaxed and welcoming environment to connect, exchange ideas, and engage in meaningful discussions.</p>
            <p>Whether you’d like to share your thoughts, gain insights into the business, or simply connect with colleagues from across SOM, this is a great opportunity to do so over a cup of coffee.</p>

            <section className="ip3-ceo-date-callout" aria-label="Event schedule update">
              <CalendarDots size={25} weight="duotone" aria-hidden="true" />
              <div><strong>Date and location will be announced soon.</strong><span>Watch this space for the confirmed Shell Café outlet and session date.</span></div>
            </section>

            <p>To secure your spot, email <strong>Faisal Al-Busaidi, SMO-CRBD/2</strong>. Places are available on a first-come, first-served basis, but there’s always next month if the session is full.</p>
            <p>We look forward to seeing you there for great conversations, fresh perspectives, and valuable connections.</p>

            <div className="ip3-ceo-closing">
              <Coffee size={26} weight="duotone" aria-hidden="true" />
              <strong>Sip. Chat. Connect.</strong>
            </div>
            <p className="ip3-ceo-signature">Corporate Relations Team</p>
          </div>

          <aside className="ip3-ceo-details" aria-labelledby="ip3-ceo-details-title">
            <p className="ip3-eyebrow">Session details</p>
            <h2 id="ip3-ceo-details-title">At a glance</h2>
            <dl>
              <div><dt>Host</dt><dd>Mohammed Al-Balushi<br /><span>SMO CEO</span></dd></div>
              <div><dt>Venue</dt><dd>Shell Café outlet<br /><span>Location to be confirmed</span></dd></div>
              <div><dt>Date</dt><dd>Coming soon</dd></div>
              <div><dt>Registration</dt><dd>First come, first served</dd></div>
            </dl>
            <section className="ip3-ceo-registration">
              <EnvelopeSimple size={28} weight="duotone" aria-hidden="true" />
              <h3>Reserve your place</h3>
              <p>Email <strong>Faisal Al-Busaidi, SMO-CRBD/2</strong> through the Shell directory.</p>
            </section>
          </aside>
        </div>
      </article>
    </main>
  );
}

function HrOnlinePage() {
  return (
    <main className="ip3-main ip3-hr-page" id="ip3-main">
      <nav className="ip3-ceo-breadcrumb" aria-label="Breadcrumb">
        <a href="/">SOM Connect</a>
        <CaretRight size={15} weight="bold" aria-hidden="true" />
        <span aria-current="page">HR online</span>
      </nav>

      <section className="ip3-hr-banner" aria-label="Human Resources Hub">
        <Image
          src={`${HR_ONLINE_MEDIA}/hr-hub-banner.jpg`}
          alt="Shell Oman colleagues talking outside a Shell Oman office"
          loading="eager"
          fetchPriority="high"
        />
      </section>

      <div className="ip3-hr-lead">
        <article className="ip3-hr-welcome" aria-labelledby="ip3-hr-welcome-title">
          <p className="ip3-eyebrow">HR online</p>
          <h1 id="ip3-hr-welcome-title">Welcome to the Human Resources Hub</h1>
          {HR_ONLINE_INTRO.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>

        <aside className="ip3-hr-highlights" aria-label="HR highlights">
          {HR_ONLINE_HIGHLIGHTS.map((item) => (
            <a
              className="ip3-hr-highlight"
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              <Image src={item.image} alt={item.alt} />
              <div>
                <h2>{item.title}</h2>
              </div>
            </a>
          ))}
        </aside>
      </div>

      <section className="ip3-hr-quick-links" aria-labelledby="ip3-hr-quick-links-title">
        <h2 id="ip3-hr-quick-links-title">Quick Links</h2>
        <div className="ip3-hr-quick-links-grid">
          {HR_ONLINE_QUICK_LINKS.map((item) => {
            const content = (
              <>
                <Image src={HR_ONLINE_LINK_ICON} alt="" ariaHidden />
                <span>{item.title}</span>
              </>
            );
            return item.href ? (
              <a className="ip3-hr-quick-link" key={item.id} href={item.href} target="_blank" rel="noreferrer">
                {content}
              </a>
            ) : (
              <span className="ip3-hr-quick-link" key={item.id}>{content}</span>
            );
          })}
        </div>
      </section>

      <section className="ip3-hr-services" aria-label="HR services">
        {HR_ONLINE_SERVICES.map((item) => {
          const Card = item.href ? 'a' : 'article';
          const isExternal = Boolean(item.href) && /^https?:/.test(item.href);
          const linkProps = item.href
            ? { href: item.href, ...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {}) }
            : {};
          return (
            <Card className="ip3-hr-service" key={item.id} {...linkProps}>
              <Image src={item.image} alt={item.alt} />
              <div>
                <h2>{item.title}</h2>
                {item.detail ? <p>{item.detail}</p> : null}
              </div>
            </Card>
          );
        })}
      </section>
    </main>
  );
}

const HR_ARTICLES = {
  'business-mileage-claim': {
    title: 'Business Mileage Claim',
    image: `${HR_ONLINE_MEDIA}/business-mileage.png`,
    alt: 'Business mileage claim',
    lede: {
      label: 'Purpose:',
      text: 'Employees must submit eligible Business Mileage claims through the Concur Expense Claim Portal in line with company policy.',
    },
    sections: [
      {
        id: 'eligibility-and-rules',
        title: 'Eligibility and rules',
        list: 'ul',
        items: [
          'Employees who are occasional business travellers and are not assigned a job allocated car may use their personal cars for business travel and claim business mileage.',
          'Business mileage can be claimed at RO 0.150 bzs/km.',
          'The first 50 km per trip is not claimable.',
          'Business mileage above 50 km per trip can be claimed at RO 0.150 bzs/km.',
          'Business trips must not be combined to increase claimable mileage.',
          'This allowance does not apply to daily commuting, training locations, or event locations.',
          'The calculation reference starting point is the employee office/base location.',
        ],
      },
      {
        id: 'employee-action-required',
        title: 'Employee action required',
        list: 'ol',
        items: [
          'Log in to the Concur Expense Claim Portal.',
          'Select Create New Expense Claim.',
          'Choose Business Mileage as the expense type.',
          'Enter the business trip details, including date, purpose of travel, and mileage travelled.',
          'Ensure the first 50 km is excluded from the claim calculation where applicable.',
          'Submit the claim with any required supporting information.',
          'Obtain line manager approval through the Concur workflow.',
        ],
      },
    ],
    note: {
      label: 'Note:',
      text: 'Claims that do not comply with the Business Mileage policy may be rejected.',
    },
  },
  'recreational-wellness-scheme': {
    title: 'Recreational & Wellness Scheme',
    image: `${HR_ONLINE_MEDIA}/recreational-wellness-scheme.png`,
    alt: 'Recreational and wellness scheme',
    contents: true,
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        paragraphs: [
          'SOM is committed to supporting the health, wellbeing, and quality of life of employees. To encourage a healthy lifestyle, SOM provides a Recreational & Wellness Reimbursement benefit that allows eligible employees to claim reimbursement for approved wellness and recreational activities.',
        ],
        callout: {
          label: 'Benefit value:',
          text: 'Up to RO 300 per calendar year for employees and eligible dependents.',
        },
      },
      {
        id: 'eligibility',
        title: 'Eligibility',
        list: 'ul',
        items: [
          'SOM employees on local terms and conditions of employment.',
          'Eligible dependents as defined by SOM.',
          'Participants enrolled in recognized recreational centres formally registered in the Sultanate of Oman.',
        ],
      },
      {
        id: 'exclusions',
        title: 'Exclusions',
        list: 'ul',
        items: [
          'Employees during the probation period.',
          'Employees from the date of resignation.',
          'Employees from the date of termination.',
        ],
      },
      {
        id: 'eligible-activities',
        title: 'Eligible activities',
        list: 'ul',
        items: [
          'Gym and fitness center memberships.',
          'Sports club membership and registration fees.',
          'Fitness classes and programmes (e.g., aerobics, yoga, dance, martial arts).',
          'Athletic facility access passes.',
          'Personal trainer and exercise physiologist sessions.',
          'Registration fees for fitness-related events.',
          'Nutritional counselling by certified professionals.',
          'Professional weight management programmes (excluding food purchases).',
          'Stress management, mindfulness, and guided meditation programmes.',
        ],
      },
      {
        id: 'how-to-claim',
        title: 'How to claim',
        list: 'ol',
        items: [
          'Enrol and participate in an approved wellness or recreational activity.',
          'Make payment using a debit card, credit card, or bank transfer.',
          'Obtain a valid invoice and proof of payment showing VAT payment where applicable.',
          'Submit the claim through the appropriate HR reimbursement process.',
        ],
      },
      {
        id: 'important-notes',
        title: 'Important notes',
        list: 'ul',
        items: [
          'Quotations and cash receipts are not accepted.',
          'HR may request additional documents to validate participation and registration.',
          'SOM may conduct verification checks before approval.',
        ],
      },
      {
        id: 'payment-requirements',
        title: 'Payment requirements',
        list: 'ul',
        items: ['Debit card', 'Credit card', 'Bank transfer'],
      },
      {
        id: 'expenses-not-covered',
        title: 'Expenses not covered',
        list: 'ul',
        items: [
          'Food, drinks, vitamins, supplements, and nutritional products.',
          'Clothing, footwear, and personal fitness equipment.',
          'Fitness equipment purchases or rentals.',
          'Books, tools, music, tapes, or similar items.',
          'Smoking cessation products.',
          'Massage therapy.',
          'Alternative medicine treatments (e.g., acupuncture, hypnosis).',
          'Bariatric surgery.',
          'Medical treatments are covered under SOM Medical Insurance.',
        ],
      },
    ],
  },
  'healthcare-benefits': {
    title: 'Healthcare Benefits',
    image: `${HR_ONLINE_MEDIA}/healthcare-benefits.png`,
    alt: 'Healthcare benefits',
    lede: {
      text: 'SOM will make provision for healthcare of all Employees on Local Employment Contract and their eligible Dependents with a local healthcare provider.',
    },
    sections: [
      {
        id: 'general-guidelines',
        title: 'General guidelines',
        list: 'ul',
        items: [
          'Medical plan supplier may be changed without advance notice — changes will be communicated.',
          'Coverage will be subject to exclusions of the medical plan supplier.',
          'Cover for Employees and Dependents will cease when Employee leaves SOM, reaches retirement age, or any member reaches maximum allowable age limit as per the policy.',
          'Ex-SOM Employees, who have proceeded on early, normal, or medical retirement and are in receipt of a pension will be able to avail SOM corporate rate to purchase medical insurance for themselves and Eligible Dependents at their own account.',
          'Children will be covered up to the age 23 (i.e., cover will cease on child’s 23rd birthday). It is the responsibility of the Employee to advise SOM to remove children from the plan on reaching the age of 23.',
          'All related costs for children who remain in the plan post their 23rd birthday will be for Employee’s account.',
          'Although children with disabilities, as defined under the Applicable Laws, will be covered regardless of their age. Employee should submit all required documents for continuation of coverage.',
          'The medical facilities provided to the Employees shall be limited to the medical plan and cover provided by the Medical Insurance to the Employee & their eligible Dependents. For more information on this, contact HR.',
          'The Employee should declare if their spouse and/or Eligible Dependents are covered by any other health insurance provider through inclusion by a family member’s employer (spouse, ex-spouse, parent, or child) and avail one of the two programs for their Eligible Dependents.',
        ],
      },
      {
        id: 'what-to-do',
        title: 'What to do',
        list: 'ul',
        items: [
          'Familiarise yourself with the Medical Insurance Scheme Policy.',
          'Submit all claims to the Medical Insurer directly (not to HR or Finance).',
        ],
      },
    ],
    note: {
      text: 'Employees on Local Non-National or Long Term International or Short-Term International Assignment are eligible for Healthcare Benefits as per International Mobility Policy.',
    },
  },
  'mobile-phones-business-numbers': {
    title: 'SOM Allocated Mobile Phones & Business Numbers',
    image: `${HR_ONLINE_MEDIA}/mobile-phones-business-numbers.png`,
    alt: 'SOM allocated mobile phones and business numbers',
    lede: {
      label: 'Purpose:',
      text: 'The purpose of this benefit is to provide Mobile Phones and Business Numbers (SIM Cards) to employees whose roles require business communications outside normal office hours or while working away from the office. The benefit supports operational effectiveness while ensuring employees have access to approved communication tools when needed.',
    },
    sections: [
      {
        id: 'eligibility',
        title: 'Eligibility',
        paragraphs: [
          'SOM provides Mobile Phones and Business Numbers (SIM Cards) to employees in positions that require regular business communication outside normal office hours or while working away from the office.',
        ],
        listIntro: 'Eligible positions include:',
        list: 'ul',
        items: [
          'Executive Management Team (EMT)',
          'Field-Based Sales Positions',
          'Other Critical Positions approved by management',
        ],
        trailing: [
          'Employees may lose eligibility if they transfer to a non-eligible position or no longer require a company mobile service for business purposes.',
        ],
      },
      {
        id: 'mobile-phone',
        title: 'Mobile phone',
        paragraphs: [
          'Employees assigned to an eligible position may receive a company mobile device or, where applicable, a voucher to acquire a device in line with company standards.',
        ],
        listIntro: 'Key points:',
        list: 'ul',
        items: [
          'Device replacement is generally available every 3 years.',
          'Mobile phones are provided based on business requirements.',
          'Certain positions may require a company-provided device due to operational or safety needs.',
          'Early replacement requires appropriate approvals.',
        ],
      },
      {
        id: 'monthly-call-charges',
        title: 'Mobile device & monthly call charges',
        paragraphs: [
          'The Company provides mobile connectivity to support operational communication requirements.',
        ],
        listIntro: 'Employees are expected to:',
        list: 'ul',
        items: [
          'Use the company mobile service responsibly.',
          'Comply with company policies and acceptable use requirements.',
          'Minimise personal use where possible.',
          'Protect company information and devices from misuse or loss.',
          'Utilise Microsoft Teams and other approved communication tools where appropriate.',
        ],
        trailing: [
          'Monthly charges and device provisions are managed in accordance with company guidelines and approved business requirements.',
        ],
      },
      {
        id: 'how-to-apply',
        title: 'How to apply',
        paragraphs: ['Submit your request through SAP SuccessFactors using the link below.'],
      },
    ],
    cta: {
      label: 'Apply now',
      href: 'https://performancemanager.successfactors.eu/sf/liveprofile?company=ShellOmanMktg&categoryId=customCategory1760852311168661&cardId=customCard1761109783432217',
    },
  },
};

function HrArticlePage({ slug }) {
  const article = HR_ARTICLES[slug];
  if (!article) return null;

  return (
    <main className="ip3-main ip3-hr-article" id="ip3-main">
      <nav className="ip3-ceo-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <CaretRight size={15} weight="bold" aria-hidden="true" />
        <a href="/hr-online">HR online</a>
        <CaretRight size={15} weight="bold" aria-hidden="true" />
        <span aria-current="page">{article.title}</span>
      </nav>

      <section className="ip3-hr-banner" aria-label={article.title}>
        <Image src={article.image} alt={article.alt} loading="eager" fetchPriority="high" />
      </section>

      <article className="ip3-hr-article-body" aria-labelledby="ip3-hr-article-title">
        <p className="ip3-eyebrow">HR online</p>
        <h1 id="ip3-hr-article-title">{article.title}</h1>

        {article.lede ? (
          <p className="ip3-hr-article-lede">
            {article.lede.label ? <strong>{article.lede.label} </strong> : null}
            {article.lede.text}
          </p>
        ) : null}

        {article.contents ? (
          <nav className="ip3-hr-article-toc" aria-labelledby="ip3-hr-article-toc-title">
            <h2 id="ip3-hr-article-toc-title">Table of contents</h2>
            <ol>
              {article.sections.map((section) => (
                <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
              ))}
            </ol>
          </nav>
        ) : null}

        {article.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`}>{section.title}</h2>
            {(section.paragraphs || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.callout ? (
              <p className="ip3-hr-article-callout">
                <strong>{section.callout.label}</strong> {section.callout.text}
              </p>
            ) : null}
            {section.listIntro ? <p className="ip3-hr-article-list-intro">{section.listIntro}</p> : null}
            {section.list === 'ol' ? (
              <ol>{section.items.map((item) => <li key={item}>{item}</li>)}</ol>
            ) : section.list === 'ul' ? (
              <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
            {(section.trailing || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}

        {article.cta ? (
          <p className="ip3-hr-article-cta-row">
            <a
              className="ip3-hr-article-cta"
              href={article.cta.href}
              target="_blank"
              rel="noreferrer"
            >
              {article.cta.label}
              <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
            </a>
          </p>
        ) : null}

        {article.note ? (
          <p className="ip3-hr-article-note">
            {article.note.label ? <strong>{article.note.label} </strong> : null}
            {article.note.text}
          </p>
        ) : null}
      </article>
    </main>
  );
}

const LEARNING_MATERIALS_MEDIA = '/intraportal-v3/media/learning-materials';

const LEARNING_MATERIALS = [
  {
    id: 'management-essentials',
    title: 'Hot Skills: Management Essentials (January 2026)',
    href: `${LEARNING_MATERIALS_MEDIA}/hot-skills-management-essentials-jan26.pdf`,
  },
  {
    id: 'change-management',
    title: 'Hot Skills: Change Management (February 2026)',
    href: `${LEARNING_MATERIALS_MEDIA}/hot-skills-change-management-feb26.pdf`,
  },
  {
    id: 'career-development',
    title: 'Hot Skills: Career Development (March 2026)',
    href: `${LEARNING_MATERIALS_MEDIA}/hot-skills-career-development-mar26.pdf`,
  },
  {
    id: 'resilience-agility',
    title: 'Hot Skills: Resilience & Agility (April 2026)',
    href: `${LEARNING_MATERIALS_MEDIA}/hot-skills-resilience-and-agility-apr26.pdf`,
  },
  {
    id: 'strategic-communication',
    title: 'Hot Skills: Strategic Communication (May 2026)',
    href: `${LEARNING_MATERIALS_MEDIA}/hot-skills-strategic-communication-may26.pdf`,
  },
  {
    id: 'commercial-acumen',
    title: 'Hot Skills: Commercial Acumen (June 2026)',
    href: `${LEARNING_MATERIALS_MEDIA}/hot-skills-commercial-acumen-jun26.pdf`,
  },
  {
    id: 'stakeholder-management',
    title: 'Hot Skills: Stakeholder Management (July 2026)',
    href: `${LEARNING_MATERIALS_MEDIA}/hot-skills-stakeholder-management-jul26.pdf`,
  },
  {
    id: 'data-analysis',
    title: 'Hot Skills: Data Analysis (August 2026)',
    href: `${LEARNING_MATERIALS_MEDIA}/hot-skills-data-analysis-aug26.pdf`,
  },
];

function LearningPage() {
  return (
    <main className="ip3-main ip3-learning-page" id="ip3-main">
      <nav className="ip3-ceo-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <CaretRight size={15} weight="bold" aria-hidden="true" />
        <span aria-current="page">Learning</span>
      </nav>

      <section className="ip3-hr-quick-links" aria-labelledby="ip3-learning-materials-title">
        <p className="ip3-eyebrow">Learning</p>
        <h2 id="ip3-learning-materials-title">Learning materials</h2>
        <div className="ip3-hr-quick-links-grid">
          {LEARNING_MATERIALS.map((item) => (
            <a
              className="ip3-hr-quick-link"
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              <Image src={HR_ONLINE_LINK_ICON} alt="" ariaHidden />
              <span>{item.title}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

const TOOLS_RESOURCES_MEDIA = '/intraportal-v3/media/tools-and-resources';

const TOOLS_AND_RESOURCES = [
  {
    id: 'information-risk-cyber-security-portal',
    tone: 'cyber',
    title: 'Information Risk and Cyber Security Portal',
    description: 'Your place for accessing resources or raising requests related to information risk and cyber security services.',
    icon: ShieldCheck,
    href: null,
  },
  {
    id: 'sap-successfactors',
    tone: 'people',
    title: 'SAP SuccessFactors',
    description: 'Your self-service HR portal for managing personal details, time off, learning, performance, and career development.',
    icon: User,
    href: 'https://performancemanager.successfactors.eu/',
  },
  {
    id: 'mobile-device-sim-card',
    tone: 'devices',
    title: 'Mobile device & SIM card',
    description: 'Your place for requesting and managing business mobile devices and SIM cards.',
    icon: DeviceMobile,
    href: 'https://performancemanager.successfactors.eu/sf/liveprofile?company=ShellOmanMktg&categoryId=customCategory1760852311168661&cardId=customCard1761109783432217',
  },
  {
    id: 'employee-experience-letter',
    tone: 'letters',
    title: 'Employee Experience Letter',
    description: 'Request an official letter confirming your employment history and experience.',
    icon: ReadCvLogo,
    href: 'https://performancemanager.successfactors.eu/sf/liveprofile?company=ShellOmanMktg&categoryId=customCategory1760852311168661&cardId=customCard1761109783432217',
  },
  {
    id: 'bank-letter',
    tone: 'finance',
    title: 'Bank Letter',
    description: 'Request an official letter confirming your employment and salary details for bank requirements.',
    icon: Bank,
    href: 'https://performancemanager.successfactors.eu/sf/liveprofile?company=ShellOmanMktg&categoryId=customCategory1760852311168661&cardId=customCard1761109783432217',
  },
  {
    id: 'health-benefit',
    tone: 'health',
    title: 'Health Benefit',
    description: 'Your place for requesting a medical insurance card for you or your dependents.',
    icon: FirstAidKit,
    href: 'https://performancemanager.successfactors.eu/sf/liveprofile?company=ShellOmanMktg&categoryId=customCategory1760852311168661&cardId=customCard1761109783432217',
  },
  {
    id: 'recreational-wellness-scheme',
    tone: 'wellness',
    title: 'Recreational & Wellness Scheme',
    description: 'Your place for accessing recreational and wellness benefits and claims.',
    icon: Confetti,
    href: 'https://performancemanager.successfactors.eu/sf/liveprofile?company=ShellOmanMktg&categoryId=benefits&cardId=benefitActions',
  },
  {
    id: 'time-management',
    tone: 'time',
    title: 'Time Management',
    description: 'Your place for submitting and managing leave requests.',
    icon: Clock,
    href: 'https://performancemanager.successfactors.eu/sf/liveprofile?company=ShellOmanMktg&categoryId=timeManagement',
  },
];

function ToolsAndResourcesPage() {
  return (
    <main className="ip3-main ip3-tools-page" id="ip3-main">
      <nav className="ip3-ceo-breadcrumb" aria-label="Breadcrumb">
        <a href="/">SOM Connect</a>
        <CaretRight size={15} weight="bold" aria-hidden="true" />
        <span aria-current="page">Tools &amp; resources</span>
      </nav>

      <section className="ip3-tools-banner" aria-labelledby="ip3-tools-banner-title">
        <Image
          src={`${TOOLS_RESOURCES_MEDIA}/tools-and-resources-banner.jpg`}
          alt=""
          ariaHidden
          loading="eager"
          fetchPriority="high"
        />
        <div className="ip3-tools-banner-panel">
          <h1 id="ip3-tools-banner-title">Tools and Resources</h1>
        </div>
      </section>

      <section className="ip3-tools-catalogue" aria-labelledby="ip3-tools-catalogue-title">
        <header className="ip3-tools-catalogue-head">
          <div>
            <p className="ip3-eyebrow">Tools &amp; resources</p>
            <h2 id="ip3-tools-catalogue-title">My tools and resources</h2>
          </div>
          <p className="ip3-tools-count">
            {TOOLS_AND_RESOURCES.length} results
          </p>
        </header>

        <div className="ip3-tools-grid">
          {TOOLS_AND_RESOURCES.map((item) => {
            const Card = item.href ? 'a' : 'article';
            const linkProps = item.href
              ? { href: item.href, target: '_blank', rel: 'noreferrer' }
              : {};

            return (
              <Card className="ip3-tool-card" key={item.id} data-tone={item.tone} {...linkProps}>
                <span className="ip3-tool-card-icon" aria-hidden="true">
                  {createElement(item.icon, { size: 26, weight: 'fill' })}
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}

const THIS_IS_SHELL_MEDIA = '/intraportal-v3/media/this-is-shell';

function ThisIsShellPage() {
  return (
    <main className="ip3-main ip3-shell-page" id="ip3-main">
      <nav className="ip3-ceo-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Our Shell</a>
        <CaretRight size={15} weight="bold" aria-hidden="true" />
        <span aria-current="page">This is Shell</span>
      </nav>

      <article className="ip3-shell-profile">
        <header className="ip3-shell-hero">
          <Image
            src={`${THIS_IS_SHELL_MEDIA}/hero-60-years.jpeg`}
            alt="Shell service station in Oman at sunset"
            loading="eager"
            fetchPriority="high"
          />
        </header>

        <section className="ip3-shell-intro" aria-labelledby="ip3-shell-who-we-are">
          <h1>More than 60 years of serving Oman</h1>
          <h2 id="ip3-shell-who-we-are">Who we are</h2>
          <p>With a growing network of service stations, a portfolio of world-class products and services, and a strong presence at air and sea ports, Shell Oman is proud to contribute to the overall growth of the Sultanate’s economy.</p>
        </section>

        <div className="ip3-shell-sections">
          <section className="ip3-shell-feature is-reversed" aria-labelledby="ip3-shell-glance-title">
            <Image src={`${THIS_IS_SHELL_MEDIA}/at-a-glance.jpeg`} alt="Shell Oman Marketing at a glance" />
            <div>
              <h2 id="ip3-shell-glance-title">Shell Oman Marketing at a glance</h2>
              <ul className="ip3-shell-copy-list">
                <li>Established: Active in Oman since 1958</li>
                <li>Core Business: Marketing fuels and lubricants</li>
                <li>Headquarters: Located in Muscat, Mina Al Fahal</li>
              </ul>
              <p>At the heart of our operations are our values: honesty, integrity, and respect for people, as outlined in the Shell General Business Principles.</p>
            </div>
          </section>

          <section className="ip3-shell-feature" aria-labelledby="ip3-shell-journey-title">
            <Image src={`${THIS_IS_SHELL_MEDIA}/our-journey.jpeg`} alt="Shell Oman journey through the decades" />
            <div>
              <h2 id="ip3-shell-journey-title">Our journey in Oman</h2>
              <p>Shell first established a presence in Oman in 1958 through Shell Marketing (Oman) Ltd. In 1997, the company transitioned into a public limited company, becoming Shell Oman Marketing Company SAOG, Marking a historic milestone for Shell in the Middle East. Today, the company is jointly owned by Shell (49%) and private investors, many of whom are Omanis.</p>
              <p>This unique ownership structure allows Shell Oman to combine Shell’s world-class marketing expertise with deep, local knowledge of Omani business practices and needs.</p>
            </div>
          </section>

          <section className="ip3-shell-feature is-reversed" aria-labelledby="ip3-shell-offer-title">
            <Image src={`${THIS_IS_SHELL_MEDIA}/what-we-offer.jpeg`} alt="Shell Oman products and services" />
            <div>
              <h2 id="ip3-shell-offer-title">What we offer</h2>
              <p>Shell Oman Marketing provides a comprehensive range of services and products to customers across the Sultanate, including: automotive products, aviation services, and marine solutions.</p>
              <p>Shell Oman remains committed to supporting the Sultanate’s development through innovative solutions and exceptional service.</p>
            </div>
          </section>

          <section className="ip3-shell-feature" aria-labelledby="ip3-shell-numbers-title">
            <Image src={`${THIS_IS_SHELL_MEDIA}/in-numbers.jpeg`} alt="Shell Oman Marketing in numbers" />
            <div>
              <h2 id="ip3-shell-numbers-title">Shell Oman Marketing in numbers</h2>
              <ul className="ip3-shell-copy-list">
                <li>Shell Oman has a network of more than 200 Shell service stations strategically located throughout the Sultanate.</li>
                <li>Shell Oman has reached an Omanization level of more than 96%</li>
                <li>Shell Oman owns and operates Oman&apos;s only ISO certified lubricants blending plant which creates in-country value (ICV) through producing made-in-Oman Shell lubricants.</li>
              </ul>
            </div>
          </section>

          <section className="ip3-shell-feature is-reversed" aria-labelledby="ip3-shell-vision-title">
            <Image src={`${THIS_IS_SHELL_MEDIA}/vision-mission.jpeg`} alt="Shell Oman vision and mission" />
            <div>
              <h2 id="ip3-shell-vision-title">Our Vision &amp; Mission:</h2>
              <p>Our vision is to be the market leader, delivering exceptional value to our stakeholders and setting benchmarks in excellence.</p>
              <p>Our mission is to drive profitability through innovative management strategies, ensuring cost efficiency and leveraging creative ideas to achieve sustainable growth.</p>
            </div>
          </section>

          <section className="ip3-shell-feature" aria-labelledby="ip3-shell-contribution-title">
            <Image src={`${THIS_IS_SHELL_MEDIA}/our-contribution.jpeg`} alt="Shell Oman contribution to local communities" />
            <div>
              <h2 id="ip3-shell-contribution-title">Our Contribution</h2>
              <p>Shell Oman is deeply committed to Corporate Social Investment (CSI), supporting a wide range of activities that cater to diverse segments of Omani society. Our initiatives focus mainly on charitable organizations, road safety, and environmental sustainability.</p>
            </div>
          </section>

          <section className="ip3-shell-financial" aria-labelledby="ip3-shell-financial-title">
            <h2 id="ip3-shell-financial-title">Financial Performance</h2>
            <p>Please refer to our <a href="https://www.shelloman.com.om/en_om/investors/financial-reports.html" target="_blank" rel="noreferrer">Financial Reports Page</a> to see Shell Oman’s quarterly and annual financial performance.</p>
          </section>
        </div>
      </article>
    </main>
  );
}

export default function IntraPortalV3({ page = 'home' }) {
  const [activeStory, setActiveStory] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);
  const [activeNews, setActiveNews] = useState(0);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [ourShellMenuOpen, setOurShellMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [query, setQuery] = useState('');

  const toggleSubmenu = (submenuId) => {
    setOpenSubmenu((current) => (current === submenuId ? null : submenuId));
  };

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('som_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const userName = storedUser?.name || 'Nada Al-Balushi';
  const userRole = storedUser?.role || 'Payroll & HR system administrator';
  const breakingNews = BREAKING_NEWS[activeNews];

  useEffect(() => {
    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (tickerPaused || prefersReducedMotion) return undefined;

    const rotationTimer = window.setInterval(() => {
      setActiveNews((current) => (current + 1) % BREAKING_NEWS.length);
    }, BREAKING_NEWS_ROTATION_MS);

    return () => window.clearInterval(rotationTimer);
  }, [tickerPaused]);

  useEffect(() => {
    if (storyPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveStory((current) => (current + 1) % LEAD_STORIES.length);
    }, LEAD_STORY_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [storyPaused]);

  const showStory = (index) => {
    setActiveStory((index + LEAD_STORIES.length) % LEAD_STORIES.length);
  };

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

      <aside
        className={`ip3-sidebar ${navOpen ? 'is-open' : ''}`}
        aria-label="Portal sidebar"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOurShellMenuOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOurShellMenuOpen(false);
        }}
      >
        <div className="ip3-sticky-brand" aria-hidden="true">
          <img src="/som-connect-logo.png" alt="" />
        </div>

        <nav className="ip3-nav" aria-label="Portal navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon className="ip3-nav-icon" size={25} weight="regular" aria-hidden="true" />
                <span>{item.label}</span>
              </>
            );

            if (item.megaMenu) {
              return (
                <button
                  key={item.label}
                  className={`ip3-nav-link ip3-nav-trigger${page === 'this-is-shell' || page === 'ceo-corner' ? ' is-active' : ''}`}
                  type="button"
                  aria-expanded={ourShellMenuOpen}
                  aria-controls="ip3-our-shell-menu"
                  onClick={() => setOurShellMenuOpen((open) => !open)}
                >
                  {content}
                  <CaretDown className="ip3-nav-caret" size={16} weight="bold" aria-hidden="true" />
                </button>
              );
            }

            const isActive = Boolean(page) && item.href === `/${page}`;

            return (
              <a
                key={item.label}
                href={item.href}
                className={`ip3-nav-link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onFocus={() => setOurShellMenuOpen(false)}
                onClick={() => { setNavOpen(false); setOurShellMenuOpen(false); }}
              >
                {content}
              </a>
            );
          })}
        </nav>

        {ourShellMenuOpen && (
          <section
            className="ip3-mega-menu"
            id="ip3-our-shell-menu"
            aria-label="Our Shell menu"
          >
            {OUR_SHELL_MENU.map((group) => (
              <section className="ip3-mega-group" key={group.title} aria-labelledby={`ip3-mega-${group.title.toLowerCase().replaceAll(' ', '-')}`}>
                <div className="ip3-mega-group-mark" aria-hidden="true">
                  <SquaresFour size={31} weight="fill" />
                </div>
                <h2 id={`ip3-mega-${group.title.toLowerCase().replaceAll(' ', '-')}`}>{group.title}</h2>
                {group.items ? (
                  <ul className="ip3-mega-links">
                    {group.items.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} onClick={() => setOurShellMenuOpen(false)}>
                          <CaretRight size={18} weight="regular" aria-hidden="true" />
                          <span>{link.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="ip3-mega-sections">
                    {group.sections.map((section) => {
                      const submenuId = `ip3-submenu-${group.title}-${section.title}`.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
                      const submenuOpen = openSubmenu === submenuId;

                      return (
                        <section className="ip3-mega-subgroup" key={section.title}>
                          {section.href ? (
                            <a className="ip3-mega-subgroup-link" href={section.href} onClick={() => setOurShellMenuOpen(false)}>
                              <CaretRight className="ip3-mega-direct-caret" size={17} weight="bold" aria-hidden="true" />
                              <span>{section.title}</span>
                            </a>
                          ) : (
                            <h3>
                              <button
                                className="ip3-mega-submenu-trigger"
                                type="button"
                                aria-expanded={submenuOpen}
                                aria-controls={submenuId}
                                onClick={() => toggleSubmenu(submenuId)}
                              >
                                <CaretRight className="ip3-mega-submenu-caret" size={17} weight="bold" aria-hidden="true" />
                                <span>{section.title}</span>
                              </button>
                            </h3>
                          )}
                          {section.items && submenuOpen && (
                            <ul id={submenuId}>
                              {section.items.map((label) => (
                                <li key={label}>
                                  <a href={group.title === 'Business' ? '#news' : '#learning'} onClick={() => setOurShellMenuOpen(false)}>
                                    {label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </section>
        )}

      </aside>

      <div className="ip3-workspace">
        <header className="ip3-topbar">
          <a className="ip3-brand" href="/" aria-label="SOM Connect portal home">
            <img src="/som-connect-logo.png" alt="SOM Connect" />
          </a>

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

        {page === 'this-is-shell' ? (
          <ThisIsShellPage />
        ) : page === 'ceo-corner' ? (
          <CeoCornerPage />
        ) : page === 'tools-and-resources' ? (
          <ToolsAndResourcesPage />
        ) : page === 'learning' ? (
          <LearningPage />
        ) : HR_ARTICLES[page] ? (
          <HrArticlePage slug={page} />
        ) : page === 'hr-online' ? (
          <HrOnlinePage />
        ) : (
        <main className="ip3-main" id="ip3-main">
          <section
            className="ip3-ticker"
            aria-label="Breaking news"
            onMouseEnter={() => setTickerPaused(true)}
            onMouseLeave={() => setTickerPaused(false)}
            onFocus={() => setTickerPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setTickerPaused(false);
            }}
          >
            <strong>Breaking news</strong>
            <p key={breakingNews.headline} aria-live="polite" aria-atomic="true">
              {breakingNews.headline}
            </p>
            <button type="button" onClick={() => goTo(breakingNews.target)}>Read update</button>
          </section>

          <div className="ip3-content-grid">
            <div className="ip3-primary-column">
              <section className="ip3-lead-grid" id="news" aria-label="Latest company news">
                <article className="ip3-lead-story" aria-label="Shell Oman past and today carousel">
                  <div
                    className="ip3-story-track"
                    style={{ transform: `translate3d(-${activeStory * 100}%, 0, 0)` }}
                  >
                    {LEAD_STORIES.map((item, index) => (
                      <Image
                        key={item.id}
                        src={item.image}
                        alt={item.alt}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : undefined}
                        ariaHidden={activeStory !== index}
                      />
                    ))}
                  </div>
                  <div className="ip3-story-controls" aria-label="Lead story controls">
                    <button
                      type="button"
                      className="ip3-story-control-play"
                      onClick={() => setStoryPaused((value) => !value)}
                      aria-label={storyPaused ? 'Play banner carousel' : 'Pause banner carousel'}
                    >
                      {storyPaused
                        ? <Play size={15} weight="fill" aria-hidden="true" />
                        : <Pause size={15} weight="fill" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => showStory(activeStory - 1)}
                      aria-label="Previous banner"
                    >
                      <CaretLeft size={15} weight="bold" aria-hidden="true" />
                    </button>
                    <span aria-live="polite">{activeStory + 1} of {LEAD_STORIES.length}</span>
                    <button
                      type="button"
                      onClick={() => showStory(activeStory + 1)}
                      aria-label="Next banner"
                    >
                      <CaretRight size={15} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                </article>

                <div className="ip3-story-rail">
                  {SIDE_NEWS.map((item) => (
                    <article key={item.title} className="ip3-story-rail-item">
                      <button
                        className="ip3-story-rail-trigger"
                        type="button"
                        aria-label={`Play video: ${item.title}`}
                        aria-haspopup="dialog"
                        onClick={() => setActiveVideo(item)}
                      >
                        <span className="ip3-story-rail-thumbnail">
                          <Image src={item.image} alt="" className={item.thumbnailClass} />
                          <span className="ip3-story-rail-play" aria-hidden="true">
                            <Play size={25} weight="fill" />
                          </span>
                        </span>
                        <span className="ip3-story-rail-copy">
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                        </span>
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="ip3-announcements" id="people">
                <article className="ip3-announcement ip3-announcement-red">
                  <div className="ip3-announcement-banner">OWN the Spotlight</div>
                  <Image
                    className="ip3-announcement-salma"
                    src={`${MEDIA_ROOT}/portrait-salma-al-madailwi.png`}
                    alt="Salma Al-Madailwi portrait"
                  />
                  <div className="ip3-announcement-copy-long">
                    <section className="ip3-announcement-copy-section">
                      <h3><strong>Ambition and Empowerment</strong> - “Every Challenge Creates an Opportunity to Grow”</h3>
                      <p>
                        My name is <strong>Salma Al-Madailwi</strong>, an Aviation Operations Executive with over eight years of
                        aviation experience and ten years with Shell Oman Marketing. My expertise focuses on operations
                        management and HSSE, ensuring safe, efficient, and compliant operations. I hold a Bachelor&apos;s degree
                        in Applied Chemistry, an MBA from Franklin University, and a NEBOSH International General Certificate.
                        These qualifications, combined with practical experience, have strengthened my capabilities in risk
                        management, operational excellence, stakeholder engagement, and continuous improvement.
                      </p>
                      <p>
                        Over the years, I have had the opportunity to work in dynamic and fast-paced operational environments,
                        gaining valuable experience in operational coordination and safety management.
                      </p>
                    </section>
                    <section className="ip3-announcement-copy-section">
                      <h3><strong>Creativity and Community</strong> - How I Show Up and Add Value</h3>
                      <p>
                        I believe creativity in aviation comes from finding practical solutions that connect people, processes,
                        and operational needs. I add value through collaboration, problem-solving, and continuous improvement,
                        while supporting teams to achieve operational excellence and Goal Zero. Building strong relationships,
                        encouraging open communication, and fostering teamwork are central to how I contribute to a positive and
                        high-performing work environment.
                      </p>
                    </section>
                    <section className="ip3-announcement-copy-section">
                      <h3><strong>Serenity &amp; Energy</strong> - Staying Grounded Beyond Work</h3>
                      <p>
                        I am a proud mother of two wonderful daughters, who inspire me daily and remind me of the importance of
                        balance, resilience, and growth. My family is my greatest source of strength and support. Outside of work,
                        I enjoy graphic design, which allows me to express creativity and develop new skills. Spending quality
                        time with my family helps me stay focused, adaptable, and motivated both personally and professionally.
                      </p>
                    </section>
                  </div>
                </article>

                <article className="ip3-phishing-panel">
                  <Image
                    className="ip3-phishing-art"
                    src="/intraportal-v3/phishing-golden-catch-som-connect.png"
                    alt="Don't be the golden Catch. Report Phishing."
                  />
                  <GoldenStarScorecard />
                </article>
              </section>

              <section className="ip3-resource-grid" id="learning">
                <article className="ip3-announcement ip3-announcement-light">
                  <div className="ip3-announcement-banner">Staff announcement · new joiner</div>
                  <Image
                    className="ip3-announcement-shurooq"
                    src={`${MEDIA_ROOT}/portrait-shurooq-al-darmaki.png`}
                    alt="Shurooq Al Darmaki portrait"
                  />
                  <div className="ip3-announcement-copy-long">
                    <p className="ip3-announcement-lead">
                      We are delighted to announce that <strong>Shurooq Al Darmaki</strong> is joining Shell Oman as{' '}
                      <strong>Corporate Finance Accountant</strong>, effective <strong>9th of August 2026.</strong>
                    </p>
                    <p>
                      Shurooq brings seven years of experience across external audit and corporate finance in the professional
                      services and energy sectors. Most recently, she worked in the Financial Control function as a General
                      Ledger Specialist at OQ Refineries and Petroleum Industries (OQ RPI), where she was responsible for
                      financial reporting, month-end close activities, account reconciliations, and driving finance process
                      improvements. Prior to OQ RPI, Shurooq spent four years with EY, building a strong foundation in external
                      audit, financial reporting, risk assessment, and internal controls while working with clients across a
                      range of industries.
                    </p>
                    <p>Shurooq holds a bachelor’s degree in accounting from Modern College of Business and Science.</p>
                    <p>
                      Outside of work, she enjoys travelling, staying active, and embracing new challenges for learning and
                      personal growth.
                    </p>
                    <p>We are thrilled to welcome Shurooq to our team and wish her great success in her new role.</p>
                  </div>
                </article>

                <ThinkSecureLearning />
              </section>

              <section
                className={`ip3-performance${SHOW_UPCOMING_EVENTS ? '' : ' ip3-performance-wide'}`}
                id="performance"
              >
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

                {SHOW_UPCOMING_EVENTS && (
                  <aside className="ip3-events" aria-label="Upcoming events">
                    <h2>Upcoming company and country events</h2>
                    {EVENTS.map((event) => (
                      <article key={`${event.day}-${event.title}`}>
                        <time><strong>{event.day}</strong><span>{event.month}</span></time>
                        <div><h3>{event.title}</h3><p>{event.detail}</p></div>
                      </article>
                    ))}
                  </aside>
                )}
              </section>

              <section className="ip3-community" id="tools">
                <SectionHeading eyebrow="Community" title="Life across Sada Shell" action="View all stories" />
                <div className="ip3-community-grid">
                  <EmployeePulse />
                  <div className="ip3-community-stories">
                    <article className="ip3-community-baby-announcement" aria-labelledby="ip3-baby-announcement-title">
                      <header>
                        <h3 id="ip3-baby-announcement-title">Congratulations</h3>
                      </header>
                      <div className="ip3-community-baby-body">
                        <ul>
                          <li>Haneen Al Hatrooshi was blessed with a baby girl.</li>
                          <li>Salah Al Mahrooqi was blessed with a baby girl.</li>
                          <li>Omar Al Alawi was blessed with twins (boy &amp; girl).</li>
                          <li>Mohammed Al Balushi was blessed with a baby girl.</li>
                        </ul>
                        <Image className="ip3-community-baby-art" src={`${MEDIA_ROOT}/baby-congratulations-art.png`} alt="" />
                      </div>
                    </article>
                    <article><Image src={`${MEDIA_ROOT}/community-milestone.webp`} alt="Colleagues celebrating a teammate’s achievement" /><div><span>Milestones</span><h3>Congratulations from colleagues across Oman</h3></div></article>
                  </div>
                </div>
              </section>
            </div>

            <aside className="ip3-right-rail" aria-label="Quick information">
              <GoalZeroCounter />

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
        )}

        <footer className="ip3-footer" id="footer">
          <div><h2>Essential links</h2><a href="/login">Code of conduct and helpline</a><a href="https://www.shell.com" target="_blank" rel="noreferrer">Shell.com</a><a href="/login">Social media guidelines</a></div>
          <div><h2>Hub information and forms</h2><a href="/login">The hub introduction</a><a href="/login">Hub feedback and help</a><a href="/login">Report an inappropriate comment</a></div>
          <div><h2>Terms and conditions</h2><a href="/login">Terms of use</a><a href="/login">Privacy information</a><a href="/login">Confidentiality classification rules</a></div>
        </footer>
      </div>
      {activeVideo && <VideoModal item={activeVideo} setActiveVideo={setActiveVideo} />}
    </div>
  );
}
