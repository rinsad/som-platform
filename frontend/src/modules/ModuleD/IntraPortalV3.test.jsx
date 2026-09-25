import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import IntraPortalV3 from './IntraPortalV3';

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

// The duty manager notice opens over every home page load; close it when a
// test is about the page underneath.
function dismissDutyManager() {
  fireEvent.click(screen.getByRole('button', { name: 'Close duty manager notice' }));
}

test('shows the duty manager notice until closed, then keeps it closed for this rota', () => {
  const { unmount } = render(<IntraPortalV3 />);

  const dialog = screen.getByRole('dialog', { name: /Duty Manager/ });
  expect(within(dialog).getByRole('heading', { name: 'Ahmed Al Dughaishi' })).toBeInTheDocument();
  expect(within(dialog).getByAltText('Ahmed Al Dughaishi, duty manager')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/duty-manager.jpg',
  );
  expect(dialog).toHaveTextContent('20th to 26th September');
  expect(within(dialog).getByRole('link', { name: '99231647' })).toHaveAttribute('href', 'tel:+96899231647');
  expect(dialog).toHaveTextContent('Available This Week');
  expect(dialog).not.toHaveTextContent(/Department|Email/);

  const close = within(dialog).getByRole('button', { name: 'Close duty manager notice' });
  expect(close).toHaveFocus();
  fireEvent.click(close);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  unmount();

  // reloading or coming back from another page keeps it closed
  render(<IntraPortalV3 />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  // the edge tab reopens it on demand
  fireEvent.click(screen.getByRole('button', { name: 'Duty Manager' }));
  expect(screen.getByRole('dialog', { name: /Duty Manager/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Duty Manager' })).not.toBeInTheDocument();
});

test('shows the duty manager notice again once the rota changes', () => {
  localStorage.setItem('ip3-duty-manager-seen', 'Previous Manager|13th to 17th September');
  render(<IntraPortalV3 />);
  expect(screen.getByRole('dialog', { name: /Duty Manager/ })).toBeInTheDocument();
});

test('does not open the duty manager notice away from the home page, but offers the tab', () => {
  render(<IntraPortalV3 page="hr-online" />);
  expect(screen.queryByRole('dialog', { name: /Duty Manager/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Duty Manager' }));
  expect(screen.getByRole('dialog', { name: /Duty Manager/ })).toBeInTheDocument();
});

test('renders the reference-based portal hierarchy', () => {
  const { container } = render(<IntraPortalV3 />);

  expect(screen.getByRole('navigation', { name: /portal navigation/i })).toBeInTheDocument();
  expect(container.querySelectorAll('.ip3-nav .ip3-nav-icon')).toHaveLength(8);
  expect(container.querySelectorAll('.ip3-nav a')).toHaveLength(7);
  expect(screen.getByRole('button', { name: 'Shell Oman' })).toHaveAttribute('aria-expanded', 'false');
  expect(container.querySelector('.ip3-nav .is-active')).not.toBeInTheDocument();
  expect(container.querySelector('.ip3-nav [aria-current="page"]')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'LinkedIn' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'X' })).toBeInTheDocument();
  expect(screen.getByRole('article', { name: /shell oman past and today carousel/i })).toBeInTheDocument();
  expect(screen.getByAltText('Shell Oman past and today banner 1')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/banners/05-Banners_Hero_Carousel_Past&Today_SOM_1356x768px-01.jpg',
  );
  expect(screen.getByRole('heading', { name: /governance, ethics & compliance/i })).toBeInTheDocument();
  expect(screen.getByText('Lexi')).toBeInTheDocument();
  expect(screen.getByText('Your Ethics & Compliance Chatbot')).toBeInTheDocument();
  expect(screen.queryByText('Code of Conduct')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /more to watch/i })).toBeInTheDocument();
});

test('opens the Shell Oman mega menu only on click without marking it as the current page', () => {
  render(<IntraPortalV3 />);

  const trigger = screen.getByRole('button', { name: 'Shell Oman' });
  expect(screen.queryByRole('region', { name: 'Shell Oman menu' })).not.toBeInTheDocument();

  fireEvent.mouseEnter(trigger);
  expect(screen.queryByRole('region', { name: 'Shell Oman menu' })).not.toBeInTheDocument();

  fireEvent.click(trigger);

  const menu = screen.getByRole('region', { name: 'Shell Oman menu' });
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(menu.querySelectorAll('.ip3-mega-group-mark span')).toHaveLength(0);
  expect(within(menu).getByRole('heading', { name: 'About Shell' })).toBeInTheDocument();
  expect(within(menu).getByRole('heading', { name: 'Business' })).toBeInTheDocument();
  expect(within(menu).getByRole('heading', { name: 'Functions' })).toBeInTheDocument();
  const aboutShell = within(menu).getByRole('region', { name: 'About Shell' });
  expect(within(aboutShell).getAllByRole('link')).toHaveLength(3);
  expect(within(aboutShell).getByRole('link', { name: 'This is Shell Oman' })).toBeInTheDocument();
  expect(within(aboutShell).getByRole('link', { name: 'This is Shell Oman' })).toHaveAttribute('href', '/this-is-shell');
  expect(within(aboutShell).getByRole('link', { name: 'CEO Corner' })).toBeInTheDocument();
  expect(within(aboutShell).getByRole('link', { name: 'CEO Corner' })).toHaveAttribute('href', '/ceo-corner');
  expect(within(aboutShell).getByRole('link', { name: 'Performance and Results' })).toBeInTheDocument();
  const business = within(menu).getByRole('region', { name: 'Business' });
  expect(within(business).getByRole('heading', { name: 'Trade & Supply' })).toBeInTheDocument();
  expect(within(business).getByRole('heading', { name: 'Lubricants' })).toBeInTheDocument();
  expect(within(business).getByRole('heading', { name: 'Mobility' })).toBeInTheDocument();
  expect(within(business).getByRole('heading', { name: 'Low Carbon Solutions' })).toBeInTheDocument();
  expect(within(business).queryByRole('link', { name: 'Road Transport Operations & Order to Delivery' })).not.toBeInTheDocument();
  const tradeAndSupply = within(business).getByRole('button', { name: 'Trade & Supply' });
  expect(tradeAndSupply).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(tradeAndSupply);
  expect(tradeAndSupply).toHaveAttribute('aria-expanded', 'true');
  expect(menu.querySelector('ol')).not.toBeInTheDocument();
  expect(within(business).getByRole('link', { name: 'Road Transport Operations & Order to Delivery' })).toBeInTheDocument();
  const lowCarbonSolutions = within(business).getByRole('button', { name: 'Low Carbon Solutions' });
  fireEvent.click(lowCarbonSolutions);
  expect(tradeAndSupply).toHaveAttribute('aria-expanded', 'false');
  expect(within(business).queryByRole('link', { name: 'Road Transport Operations & Order to Delivery' })).not.toBeInTheDocument();
  expect(lowCarbonSolutions).toHaveAttribute('aria-expanded', 'true');
  expect(within(business).getByRole('link', { name: 'Marine Fuels & Marine Lubes' })).toBeInTheDocument();
  const functions = within(menu).getByRole('region', { name: 'Functions' });
  expect(within(functions).getByRole('heading', { name: 'Finance' })).toBeInTheDocument();
  expect(within(functions).getByRole('heading', { name: 'Human Resources, Real Estate Facilities & IT' })).toBeInTheDocument();
  const finance = within(functions).getByRole('button', { name: 'Finance' });
  fireEvent.click(finance);
  expect(finance).toHaveAttribute('aria-expanded', 'true');
  expect(lowCarbonSolutions).toHaveAttribute('aria-expanded', 'false');
  expect(within(business).queryByRole('link', { name: 'Marine Fuels & Marine Lubes' })).not.toBeInTheDocument();
  expect(within(functions).getByRole('link', { name: 'Legal' })).toBeInTheDocument();
  const humanResources = within(functions).getByRole('button', { name: 'Human Resources, Real Estate Facilities & IT' });
  fireEvent.click(humanResources);
  expect(finance).toHaveAttribute('aria-expanded', 'false');
  expect(within(functions).queryByRole('link', { name: 'Legal' })).not.toBeInTheDocument();
  expect(humanResources).toHaveAttribute('aria-expanded', 'true');
  expect(within(functions).getByRole('link', { name: 'Retail IT' })).toBeInTheDocument();
  expect(within(functions).getByRole('link', { name: 'Corporate Relations' })).toBeInTheDocument();
  expect(within(functions).getByRole('link', { name: 'Internal Audit' })).toBeInTheDocument();
  expect(within(menu).queryByRole('link', { name: 'Goal Zero & HSSE' })).not.toBeInTheDocument();
  expect(within(menu).queryByRole('link', { name: 'Diversity, Equity & Inclusion' })).not.toBeInTheDocument();

  fireEvent.keyDown(screen.getByRole('complementary', { name: 'Portal sidebar' }), { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Shell Oman menu' })).not.toBeInTheDocument();
});

test('renders the CEO Corner Coffee with the CEO announcement', () => {
  render(<IntraPortalV3 page="ceo-corner" />);

  expect(screen.getByRole('heading', { name: 'Coffee with the CEO returns' })).toBeInTheDocument();
  expect(screen.getByAltText('Coffee with the CEO at Shell Café')).toHaveAttribute(
    'src',
    '/intraportal-v3/ceo-corner-coffee-banner.webp',
  );
  expect(screen.getByText('Date and location will be announced soon.')).toBeInTheDocument();
  expect(screen.getAllByText(/Faisal Al-Busaidi/)).toHaveLength(2);
  expect(screen.getByText('Sip. Chat. Connect.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Breaking news')).not.toBeInTheDocument();
});

test('renders the This is Shell Oman company profile page', () => {
  render(<IntraPortalV3 page="this-is-shell" />);

  expect(screen.getByRole('heading', { name: 'More than 60 years of serving Oman' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Shell Oman Marketing at a glance' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Our journey in Oman' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'What we offer' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Shell Oman Marketing in numbers' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Our Vision & Mission:' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Our Contribution' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Financial Performance' })).toBeInTheDocument();
  expect(screen.getByAltText('Shell service station in Oman at sunset')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/this-is-shell/hero-60-years.jpeg',
  );
  expect(screen.queryByLabelText('Breaking news')).not.toBeInTheDocument();
});

test('hero carousel steps through all eight image-only banners with arrow controls', () => {
  const { container } = render(<IntraPortalV3 />);

  expect(screen.queryByRole('button', { name: /show banner/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /read the story/i })).not.toBeInTheDocument();
  expect(screen.getByText('1 of 8')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next banner' }));
  expect(screen.getByText('2 of 8')).toBeInTheDocument();
  expect(container.querySelector('.ip3-story-track')).toHaveStyle({ transform: 'translate3d(-100%, 0, 0)' });

  fireEvent.click(screen.getByRole('button', { name: 'Previous banner' }));
  fireEvent.click(screen.getByRole('button', { name: 'Previous banner' }));
  expect(screen.getByText('8 of 8')).toBeInTheDocument();
  expect(container.querySelector('.ip3-story-track')).toHaveStyle({ transform: 'translate3d(-700%, 0, 0)' });
  expect(screen.getByAltText('Shell Oman past and today banner 8')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/banners/05-Banners_Hero_Carousel_Past&Today_SOM_1356x768px-08.jpg',
  );
});

test('hero carousel auto-advances and can be paused', () => {
  vi.useFakeTimers();

  try {
    render(<IntraPortalV3 />);

    expect(screen.getByText('1 of 8')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText('2 of 8')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause banner carousel' }));
    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(screen.getByText('2 of 8')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play banner carousel' }));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText('3 of 8')).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test('hides the breaking-news ticker when there is no news', () => {
  render(<IntraPortalV3 />);

  expect(screen.queryByLabelText('Breaking news')).not.toBeInTheDocument();
  expect(screen.queryByText(/Shell People Survey 2026 opens/)).not.toBeInTheDocument();
});

test('opens side-news video thumbnails in an accessible modal', () => {
  render(<IntraPortalV3 />);
  dismissDutyManager();

  const firstVideo = screen.getByRole('button', { name: 'Play video: BYOD Collaboration' });
  firstVideo.focus();
  fireEvent.click(firstVideo);

  const dialog = screen.getByRole('dialog', { name: 'BYOD Collaboration' });
  expect(within(dialog).getByText(/transition to e-bike delivery fleets/i)).toBeInTheDocument();
  expect(within(dialog).getByText(/Oman’s Net Zero Vision/i)).toBeInTheDocument();
  expect(within(dialog).queryByRole('heading', { name: 'Milestones shared' })).not.toBeInTheDocument();
  expect(dialog.querySelector('video')).toHaveAttribute('poster', '/intraportal-v3/media/powering-progress-thumbnail.png');
  expect(dialog.querySelector('.ip3-video-modal')).toHaveClass('is-portrait');
  expect(dialog.querySelector('.ip3-video-frame')).toHaveClass('is-portrait');
  expect(dialog.querySelector('video')).toHaveClass('ip3-video-player');
  expect(dialog.querySelector('source')).toHaveAttribute('src', '/intraportal-v3/videos/powering-progress-in-oman.mp4');
  expect(dialog.querySelector('source')).toHaveAttribute('type', 'video/mp4');
  expect(within(dialog).getByRole('button', { name: 'Close video' })).toHaveFocus();

  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(firstVideo).toHaveFocus();

  const governanceDayCard = screen.getByRole('button', { name: 'Play video: Governance Day' });
  expect(governanceDayCard.querySelector('img')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/governance-day-thumbnail.png',
  );
  fireEvent.click(governanceDayCard);
  const governanceDayDialog = screen.getByRole('dialog', { name: 'Governance Day' });
  expect(governanceDayDialog.querySelector('.ip3-video-modal')).toHaveClass('is-portrait');
  expect(governanceDayDialog.querySelector('source')).toHaveAttribute(
    'src',
    '/intraportal-v3/videos/Governance-Day-Video.MP4',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close video' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  const leadYourFutureCard = screen.getByRole('button', { name: 'Play video: Lead Your Future' });
  expect(leadYourFutureCard.querySelector('img')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/lead-your-future-thumbnail.png',
  );
  fireEvent.click(leadYourFutureCard);
  const leadYourFutureDialog = screen.getByRole('dialog', { name: 'Lead Your Future' });
  expect(leadYourFutureDialog.querySelector('.ip3-video-modal')).toHaveClass('is-portrait');
  expect(leadYourFutureDialog.querySelector('source')).toHaveAttribute(
    'src',
    '/intraportal-v3/videos/Lead-you-future.mp4',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close video' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('shows the current new-baby congratulations announcement', () => {
  render(<IntraPortalV3 />);

  const announcement = screen.getByRole('article', { name: 'Congratulations on the Arrival of Your Little One' });
  expect(within(announcement).getByText('Haneen Al Hatrooshi was blessed with a baby girl.')).toBeInTheDocument();
  expect(within(announcement).getByText('Salah Al Mahrooqi was blessed with a baby girl.')).toBeInTheDocument();
  expect(within(announcement).getByText('Omar Al Alawi was blessed with twins (boy & girl).')).toBeInTheDocument();
  expect(within(announcement).getByText('Mohammed Al Balushi was blessed with a baby girl.')).toBeInTheDocument();
  expect(announcement.querySelector('.ip3-community-baby-toys')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/baby-toys-strip.png',
  );
  expect(screen.queryByText('Celebrating a new addition to the family')).not.toBeInTheDocument();
});

test('renders the Goal Zero safety dashboard with the supplied performance data', () => {
  render(<IntraPortalV3 />);

  const statusCard = screen.getByRole('region', { name: 'Goal Zero Safety Dashboard' });
  expect(within(statusCard).queryByText('Shell Oman Marketing Company SAOG')).not.toBeInTheDocument();
  expect(within(statusCard).getByText('Safety Performance 2026')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('243 days no harm')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('243 days no leak')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('189 days no harm in 2025')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('365 days no leak in 2025')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText(/^\d{1,2} [A-Z][a-z]+ \d{4} at \d{2}:\d{2} (AM|PM) Oman time$/))
    .toBeInTheDocument();
  expect(within(statusCard).getByText('Process Safety')).toBeInTheDocument();
  expect(within(statusCard).getByText('Safety Audits')).toBeInTheDocument();
  expect(within(statusCard).getByText('Contractor Safety')).toBeInTheDocument();
  expect(within(statusCard).getByText('Security')).toBeInTheDocument();
  expect(statusCard.querySelector('.ip3-safety-dashboard-artwork')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/goal-zero-refinery-artwork.png',
  );
  expect(statusCard.querySelector('.ip3-safety-dashboard-artwork')).not.toBeInstanceOf(SVGElement);
  expect(statusCard.querySelectorAll('.ip3-safety-dashboard-focus-grid li')).toHaveLength(10);
  expect(screen.queryByRole('button', { name: 'View safety dashboard' })).not.toBeInTheDocument();
  expect(screen.queryByText('Share price')).not.toBeInTheDocument();
});

test('temporarily hides the upcoming events panel', () => {
  render(<IntraPortalV3 />);

  expect(screen.queryByRole('complementary', { name: 'Upcoming events' })).not.toBeInTheDocument();
});

test('no longer renders the Golden Star Rate scorecard panel', () => {
  const { container } = render(<IntraPortalV3 />);

  expect(container.querySelector('.ip3-phishing-panel')).not.toBeInTheDocument();
  expect(container.querySelector('.ip3-golden-scorecard')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /golden star rate/i })).not.toBeInTheDocument();
  expect(screen.queryByText('31.08%')).not.toBeInTheDocument();

  // the phishing message now reaches people through the story slider instead
  expect(screen.getByRole('link', { name: /Phishing Scorecard Target/i })).toHaveAttribute(
    'href',
    'https://eu001-sp.shell.com/sites/SPO000684',
  );
});

test('uses the Shell People Survey banner and survey copy without tabs', () => {
  render(<IntraPortalV3 />);

  const surveyBanner = screen.getByAltText(/Shell People Survey 2026: thank you for your participation/);
  expect(surveyBanner).toHaveAttribute(
    'src',
    '/intraportal-v3/shell-people-survey-2026-thank-you-v2.jpg',
  );
  const surveyPanel = surveyBanner.closest('.ip3-learning-panel');
  expect(within(surveyPanel).queryByRole('tab')).not.toBeInTheDocument();
  expect(within(surveyPanel).getByRole('heading', { name: 'Thank You for Your Participation in the Shell People Survey 2026' })).toBeInTheDocument();
  expect(within(surveyPanel).getByText(/closed on 18 September 2026/)).toBeInTheDocument();
  expect(within(surveyPanel).getByText(/contributing to a better Shell workplace/)).toBeInTheDocument();
  // the survey has closed, so there is no longer a link to take it
  expect(within(surveyPanel).queryByRole('link', { name: /Take the Shell People Survey/ })).not.toBeInTheDocument();
});

test('uses project media instead of remote placeholder images', () => {
  const { container } = render(<IntraPortalV3 />);
  dismissDutyManager();

  const imageSources = [...container.querySelectorAll('img')].map((image) => image.getAttribute('src'));
  expect(imageSources.some((source) => source?.includes('picsum.photos'))).toBe(false);
  expect(imageSources.filter((source) => source?.startsWith('/intraportal-v3/media/'))).toHaveLength(24);
  expect(screen.getByAltText(/annual report cover/i)).toHaveAttribute(
    'src',
    '/intraportal-v3/media/annual-report-2025-covers.jpg',
  );
});

test('features Riyadh Ashoor on the new joiner page', () => {
  const { container } = render(<IntraPortalV3 page="welcome-riyadh-ashoor" />);

  const newJoinerCard = container.querySelector('.ip3-announcement-light');
  expect(newJoinerCard).not.toBeNull();
  expect(within(newJoinerCard).getByAltText('Riyadh Ashoor portrait')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/portrait-riyadh-ashoor.jpg',
  );
  expect(newJoinerCard).toHaveTextContent(
    /We are delighted to announce that Riyadh Ashoor is joining Shell Oman as LSC Maintenance Manager, effective 13th September 2026\./i,
  );
  expect(newJoinerCard).toHaveTextContent(/Riyadh brings over 11 years of experience in operations and mechanical engineering/i);
  expect(newJoinerCard).toHaveTextContent(/Master’s degree in Process Engineering/i);
  expect(newJoinerCard).toHaveTextContent(/thrilled to welcome Riyadh to our team/i);
});

test('features Shurooq Al Darmaki on the new joiner page', () => {
  const { container } = render(<IntraPortalV3 page="welcome-shurooq-al-darmaki" />);

  const newJoinerCard = container.querySelector('.ip3-announcement-light');
  expect(newJoinerCard).not.toBeNull();
  expect(within(newJoinerCard).getByAltText('Shurooq Al Darmaki portrait')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/portrait-shurooq-al-darmaki.jpg',
  );
  expect(newJoinerCard).toHaveTextContent(
    /We are delighted to announce that Shurooq Al Darmaki is joining Shell Oman as Corporate Finance Accountant, effective 9th of August 2026\./i,
  );
  expect(newJoinerCard).toHaveTextContent(/Shurooq brings seven years of experience across external audit/i);
  expect(newJoinerCard).toHaveTextContent(/thrilled to welcome Shurooq to our team/i);
  expect(newJoinerCard).not.toHaveTextContent(/Riyadh/);
});

test('features the Jamal Al-Wahabi farewell announcement', () => {
  const { container } = render(<IntraPortalV3 page="farewell-jamal-al-wahabi" />);

  const card = container.querySelector('.ip3-announcement');
  expect(card).toHaveTextContent('Staff announcement · farewell');
  expect(within(card).getByAltText('Jamal Al-Wahabi portrait')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/farewell-jamal-al-wahabi.jpg',
  );
  expect(card).toHaveTextContent('44 Years. One Remarkable Journey.');
  expect(card).toHaveTextContent(/celebrate Jamal Al-Wahabi from the Customer Operations team as he begins a new chapter/);
  expect(card).toHaveTextContent(/Join us as we celebrate Jamal and 44 remarkable years of service\./);
  expect(card).not.toHaveTextContent(/new joiner/);
});

test('home page links to the people stories instead of embedding them', () => {
  const { container } = render(<IntraPortalV3 />);

  expect(container.querySelector('.ip3-announcement-light')).not.toBeInTheDocument();

  // every page stays mounted so the panel keeps one height; only the visible
  // page is interactive, so assert against that one
  const visiblePage = () => container.querySelector('.ip3-post-slider-page:not([inert])');
  const hrefsOf = (page) => [...page.querySelectorAll('a.ip3-post-card')].map((card) => card.getAttribute('href'));

  expect(container.querySelectorAll('.ip3-post-slider-page')).toHaveLength(2);
  expect(hrefsOf(visiblePage())).toEqual([
    '/farewell-jamal-al-wahabi',
    '/welcome-riyadh-ashoor',
  ]);

  fireEvent.click(screen.getByRole('button', { name: 'Next stories' }));
  expect(hrefsOf(visiblePage())).toEqual(['/welcome-shurooq-al-darmaki', 'https://eu001-sp.shell.com/sites/SPO000684']);
  expect(container.querySelector('.ip3-post-slider-track')).toHaveStyle({ transform: 'translate3d(-100%, 0, 0)' });
});

test('links to the Shell People Survey from the HR online highlights', () => {
  render(<IntraPortalV3 page="hr-online" />);

  const surveyLink = screen.getByRole('link', { name: /Shell People Survey/i });
  expect(surveyLink).toHaveAttribute('href', 'https://eu001-sp.shell.com/sites/SPO000430');
  expect(within(surveyLink).getByAltText('Shell People Survey 2026, 19 August to 18 September')).toHaveAttribute(
    'src',
    '/intraportal-v3/shell-people-survey-2026-banner.png',
  );
});

test('renders the employee portal survey and requires a rating', () => {
  render(<IntraPortalV3 />);
  dismissDutyManager();

  const form = screen.getByRole('form', { name: /employee portal survey/i });
  expect(screen.getByRole('heading', { name: 'Employee Portal Survey' })).toBeInTheDocument();
  const ratings = within(form).getAllByRole('radio');
  expect(ratings.map((radio) => radio.value)).toEqual(['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']);

  fireEvent.click(within(form).getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/choose a rating/i)).toBeInTheDocument();

  fireEvent.click(within(form).getByRole('radio', { name: 'Very Good' }));
  fireEvent.change(within(form).getByLabelText(/how can we improve/i), { target: { value: 'More HR self-service links.' } });
  fireEvent.click(within(form).getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/your feedback has been captured/i)).toBeInTheDocument();
});

test('HR online service cards show icons while their pages keep the banners', () => {
  const { container, unmount } = render(<IntraPortalV3 page="hr-online" />);
  const cardImages = [...container.querySelectorAll('.ip3-hr-service img')].map((image) => image.getAttribute('src'));
  expect(cardImages).toEqual([
    '/intraportal-v3/media/hr-online/business-mileage-claim-icon.jpg',
    '/intraportal-v3/media/hr-online/recreational-wellness-scheme-icon.jpg',
    '/intraportal-v3/media/hr-online/healthcare-benefits-icon.jpg',
    '/intraportal-v3/media/hr-online/mobile-phones-business-numbers-icon.jpg',
  ]);
  unmount();

  const { container: article } = render(<IntraPortalV3 page="business-mileage-claim" />);
  expect(article.querySelector('.ip3-hr-banner img')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/hr-online/business-mileage.png',
  );
});

test('OWN page shows both slides and sits before Learning in the nav', () => {
  const { container } = render(<IntraPortalV3 page="own" />);

  const navLabels = [...container.querySelectorAll('.ip3-nav a')].map((link) => link.textContent.trim());
  expect(navLabels).toEqual([
    'HR online', 'Tools & resources', 'Upcoming events', 'OWN', 'Learning', 'Find us', 'Latest company news',
  ]);
  expect(screen.getByRole('link', { name: 'OWN' })).toHaveAttribute('aria-current', 'page');

  expect(screen.getByRole('heading', { level: 1, name: /Oman Women’s Network/ })).toBeInTheDocument();
  const slides = [...container.querySelectorAll('.ip3-own-slide img')];
  expect(slides.map((image) => image.getAttribute('src'))).toEqual([
    '/intraportal-v3/media/own/own-mission-vision.webp',
    '/intraportal-v3/media/own/own-organizing-committee.webp',
  ]);
  expect(slides[0].getAttribute('alt')).toMatch(/OWN Mission: We empower women/);
  expect(slides[1].getAttribute('alt')).toMatch(/Chair: Majida Al Kharusi/);
});

test.each([
  ['business-mileage-claim', 'Submit a claim', /^https:\/\/eu2\.concursolutions\.com\/nui\/signin\?dcredirect=1$/],
  ['recreational-wellness-scheme', 'Submit a claim', /categoryId=benefits&cardId=benefitActions$/],
  ['healthcare-benefits', 'View my benefits', /cardId=customCard1761109783432217$/],
  ['mobile-phones-business-numbers', 'Apply now', /cardId=customCard1761109783432217$/],
])('HR article %s links out from its call-to-action button', (slug, label, href) => {
  render(<IntraPortalV3 page={slug} />);
  const cta = screen.getByRole('link', { name: label });
  expect(cta).toHaveAttribute('href', expect.stringMatching(href));
  expect(cta).toHaveAttribute('target', '_blank');
});

test('Learning page puts the Workday card between the banner and the learning materials', () => {
  const { container } = render(<IntraPortalV3 page="learning" />);

  const headings = [...container.querySelectorAll('.ip3-learning-page h2')].map((heading) => heading.textContent);
  expect(headings.slice(0, 2)).toEqual(['Workday', 'Learning materials']);
  const workday = screen.getByRole('link', { name: 'Open Workday Home' });
  expect(workday).toHaveAttribute('href', 'https://wd3.myworkday.com/shell/d/home.htmld');
  expect(workday).toHaveAttribute('target', '_blank');
});
