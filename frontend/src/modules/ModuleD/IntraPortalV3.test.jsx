import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import IntraPortalV3 from './IntraPortalV3';

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

test('renders the reference-based portal hierarchy', () => {
  const { container } = render(<IntraPortalV3 />);

  expect(screen.getByRole('navigation', { name: /portal navigation/i })).toBeInTheDocument();
  expect(container.querySelectorAll('.ip3-nav .ip3-nav-icon')).toHaveLength(8);
  expect(container.querySelectorAll('.ip3-nav a')).toHaveLength(7);
  expect(screen.getByRole('button', { name: 'Our Shell' })).toHaveAttribute('aria-expanded', 'false');
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
  expect(screen.getByRole('heading', { name: /collective progress/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /more to watch/i })).toBeInTheDocument();
});

test('opens the Our Shell mega menu only on click without marking it as the current page', () => {
  render(<IntraPortalV3 />);

  const trigger = screen.getByRole('button', { name: 'Our Shell' });
  expect(screen.queryByRole('region', { name: 'Our Shell menu' })).not.toBeInTheDocument();

  fireEvent.mouseEnter(trigger);
  expect(screen.queryByRole('region', { name: 'Our Shell menu' })).not.toBeInTheDocument();

  fireEvent.click(trigger);

  const menu = screen.getByRole('region', { name: 'Our Shell menu' });
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(menu.querySelectorAll('.ip3-mega-group-mark span')).toHaveLength(0);
  expect(within(menu).getByRole('heading', { name: 'About Shell' })).toBeInTheDocument();
  expect(within(menu).getByRole('heading', { name: 'Business' })).toBeInTheDocument();
  expect(within(menu).getByRole('heading', { name: 'Functions' })).toBeInTheDocument();
  const aboutShell = within(menu).getByRole('region', { name: 'About Shell' });
  expect(within(aboutShell).getAllByRole('link')).toHaveLength(3);
  expect(within(aboutShell).getByRole('link', { name: 'This is Shell' })).toBeInTheDocument();
  expect(within(aboutShell).getByRole('link', { name: 'This is Shell' })).toHaveAttribute('href', '/this-is-shell');
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
  expect(screen.queryByRole('region', { name: 'Our Shell menu' })).not.toBeInTheDocument();
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

test('renders the This is Shell company profile page', () => {
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

test('rotates through three frontend demo breaking-news items', () => {
  vi.useFakeTimers();

  try {
    render(<IntraPortalV3 />);

    expect(screen.getByText('Shell agrees to sell Spring Energy Group to Aditya Birla Renewables Limited.')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText('Shell Oman celebrates the opening of Oman’s first hydrogen service station.')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText('Shell People Survey 2026 opens on 19 August to 18 September.')).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test('opens side-news video thumbnails in an accessible modal', () => {
  render(<IntraPortalV3 />);

  const firstVideo = screen.getByRole('button', { name: 'Play video: Powering Progress in Oman: From Inception to the Future' });
  firstVideo.focus();
  fireEvent.click(firstVideo);

  const dialog = screen.getByRole('dialog', { name: 'Powering Progress in Oman: From Inception to the Future' });
  expect(within(dialog).getByText(/hosted a national media event/i)).toBeInTheDocument();
  expect(within(dialog).getByRole('heading', { name: 'Milestones shared' })).toBeInTheDocument();
  expect(within(dialog).getByText(/oman’s first hydrogen service station/i)).toBeInTheDocument();
  expect(within(dialog).getByText(/with 94% omanization/i)).toBeInTheDocument();
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

  const announcement = screen.getByRole('article', { name: 'Congratulations' });
  expect(within(announcement).getByText('Haneen Al Hatrooshi was blessed with a baby girl.')).toBeInTheDocument();
  expect(within(announcement).getByText('Salah Al Mahrooqi was blessed with a baby girl.')).toBeInTheDocument();
  expect(within(announcement).getByText('Omar Al Alawi was blessed with twins (boy & girl).')).toBeInTheDocument();
  expect(within(announcement).getByText('Mohammed Al Balushi was blessed with a baby girl.')).toBeInTheDocument();
  expect(announcement.querySelector('.ip3-community-baby-art')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/baby-congratulations-art.png',
  );
  expect(screen.queryByText('Celebrating a new addition to the family')).not.toBeInTheDocument();
});

test('uses the signed-in user profile when available', () => {
  localStorage.setItem('som_user', JSON.stringify({ name: 'Sara Al Balushi', role: 'Operations manager' }));
  render(<IntraPortalV3 />);

  expect(screen.getByText('Sara Al Balushi')).toBeInTheDocument();
  expect(screen.getByText('Operations manager')).toBeInTheDocument();
});

test('renders the Goal Zero safety dashboard with the supplied performance data', () => {
  render(<IntraPortalV3 />);

  const statusCard = screen.getByRole('region', { name: 'Goal Zero Safety Dashboard' });
  expect(within(statusCard).getByText('Shell Oman Marketing Company SAOG')).toBeInTheDocument();
  expect(within(statusCard).getByText('Safety Performance 2026')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('212 days no harm')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('212 days no leak')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('189 days no harm in 2025')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('365 days no leak in 2025')).toBeInTheDocument();
  expect(within(statusCard).getByLabelText('Last updated 25 August 2026 at 8:02 AM')).toBeInTheDocument();
  expect(within(statusCard).getByText('Process Safety')).toBeInTheDocument();
  expect(within(statusCard).getByText('Safety Audits')).toBeInTheDocument();
  expect(statusCard.querySelector('.ip3-safety-dashboard-artwork')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/goal-zero-refinery-artwork.png',
  );
  expect(statusCard.querySelector('.ip3-safety-dashboard-artwork')).not.toBeInstanceOf(SVGElement);
  expect(statusCard.querySelectorAll('.ip3-safety-dashboard-focus-grid li')).toHaveLength(8);
  expect(screen.queryByRole('button', { name: 'View safety dashboard' })).not.toBeInTheDocument();
  expect(screen.queryByText('Share price')).not.toBeInTheDocument();
});

test('temporarily hides the upcoming events panel', () => {
  render(<IntraPortalV3 />);

  expect(screen.queryByRole('complementary', { name: 'Upcoming events' })).not.toBeInTheDocument();
});

test('renders the Golden Catch banner with an accessible text scorecard', () => {
  render(<IntraPortalV3 />);

  expect(screen.getByAltText(/don't be the golden catch/i)).toHaveAttribute(
    'src',
    '/intraportal-v3/phishing-golden-catch-som-connect.png',
  );
  expect(screen.getByRole('heading', { name: /golden star rate: 30% target achieved/i })).toBeInTheDocument();
  expect(screen.getAllByText('31.08%')).toHaveLength(2);
  expect(screen.getByText('Report suspicious emails')).toBeInTheDocument();
  expect(screen.getByText('Pause before opening')).toBeInTheDocument();
  expect(screen.getByText('Join awareness activities')).toBeInTheDocument();
  expect(screen.getByText(/every valid report takes us closer to our 40% ambition/i)).toBeInTheDocument();
});

test('uses the Shell People Survey banner and survey copy without tabs', () => {
  render(<IntraPortalV3 />);

  const surveyBanner = screen.getByAltText('Shell People Survey 2026, August 19 to September 18');
  expect(surveyBanner).toHaveAttribute(
    'src',
    '/intraportal-v3/shell-people-survey-2026-banner.png',
  );
  const surveyPanel = surveyBanner.closest('article');
  expect(within(surveyPanel).queryByRole('tab')).not.toBeInTheDocument();
  expect(within(surveyPanel).getByText(/The Shell People Survey \(SPS\) 2026 will be open/i)).toBeInTheDocument();
  expect(within(surveyPanel).getByText(/to measure our engagement, motivation, and commitment to Shell/i)).toBeInTheDocument();
});

test('uses project media instead of remote placeholder images', () => {
  const { container } = render(<IntraPortalV3 />);

  const imageSources = [...container.querySelectorAll('img')].map((image) => image.getAttribute('src'));
  expect(imageSources.some((source) => source?.includes('picsum.photos'))).toBe(false);
  expect(imageSources.filter((source) => source?.startsWith('/intraportal-v3/media/'))).toHaveLength(24);
  expect(screen.getByAltText(/annual report cover/i)).toHaveAttribute(
    'src',
    '/intraportal-v3/media/annual-report-2025.webp',
  );
});

test('features Salma Al-Madailwi in the OWN the Spotlight card', () => {
  render(<IntraPortalV3 />);

  const rotationCard = screen.getByText('OWN the Spotlight').closest('article');
  expect(rotationCard).not.toBeNull();
  expect(within(rotationCard).getByAltText('Salma Al-Madailwi portrait')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/portrait-salma-al-madailwi.png',
  );
  expect(rotationCard).toHaveTextContent(/Every Challenge Creates an Opportunity to Grow/i);
  expect(rotationCard).toHaveTextContent(/My name is Salma Al-Madailwi, an Aviation Operations Executive/i);
  expect(rotationCard).toHaveTextContent(/Creativity and Community - How I Show Up and Add Value/i);
  expect(rotationCard).toHaveTextContent(/Serenity & Energy - Staying Grounded Beyond Work/i);
  expect(screen.queryByText(/Noura Al Hashar/)).not.toBeInTheDocument();
});

test('features Shurooq Al Darmaki in the new joiner announcement', () => {
  render(<IntraPortalV3 />);

  const newJoinerCard = screen.getByText('Staff announcement · new joiner').closest('article');
  expect(newJoinerCard).not.toBeNull();
  expect(within(newJoinerCard).getByAltText('Shurooq Al Darmaki portrait')).toHaveAttribute(
    'src',
    '/intraportal-v3/media/portrait-shurooq-al-darmaki.png',
  );
  expect(newJoinerCard).toHaveTextContent(
    /We are delighted to announce that Shurooq Al Darmaki is joining Shell Oman as Corporate Finance Accountant, effective 9th of August 2026\./i,
  );
  expect(newJoinerCard).toHaveTextContent(/Shurooq brings seven years of experience across external audit/i);
  expect(newJoinerCard).toHaveTextContent(/bachelor’s degree in accounting from Modern College of Business and Science/i);
  expect(newJoinerCard).toHaveTextContent(/thrilled to welcome Shurooq to our team/i);
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

test('renders an interactive anonymous employee feedback panel', () => {
  render(<IntraPortalV3 />);

  const form = screen.getByRole('form', { name: /anonymous employee feedback/i });
  expect(screen.getByRole('tab', { name: /give feedback/i })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(within(form).getByRole('radio', { name: 'Happy' }));
  fireEvent.click(within(form).getByRole('button', { name: 'Tools & resources' }));
  fireEvent.change(within(form).getByLabelText(/share your thoughts/i), { target: { value: 'The new tools page is easier to use.' } });
  fireEvent.click(within(form).getByRole('button', { name: /send feedback/i }));

  expect(screen.getByText(/anonymous feedback has been captured/i)).toBeInTheDocument();
});
