import { fireEvent, render, screen, within } from '@testing-library/react';
import IntraPortalV3 from './IntraPortalV3';

beforeEach(() => {
  localStorage.clear();
});

test('renders the reference-based portal hierarchy', () => {
  const { container } = render(<IntraPortalV3 />);

  expect(screen.getByRole('navigation', { name: /portal navigation/i })).toBeInTheDocument();
  expect(container.querySelectorAll('.ip3-nav .ip3-nav-icon')).toHaveLength(8);
  expect(container.querySelectorAll('.ip3-nav a[href="#"]')).toHaveLength(8);
  expect(screen.getByRole('link', { name: 'LinkedIn' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'X' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /sailing through the strait of hormuz/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /collective progress/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /more to watch/i })).toBeInTheDocument();
});

test('lead story controls change the visible feature', () => {
  render(<IntraPortalV3 />);

  fireEvent.click(screen.getByRole('button', { name: /show story 2/i }));
  expect(screen.getByRole('heading', { name: /working safely through every shift/i })).toBeInTheDocument();
  expect(screen.getByAltText(/working safely through every shift feature/i)).toHaveAttribute(
    'src',
    '/intraportal-v3/media/hero-safety-shift.webp',
  );
});

test('uses the signed-in user profile when available', () => {
  localStorage.setItem('som_user', JSON.stringify({ name: 'Sara Al Balushi', role: 'Operations manager' }));
  render(<IntraPortalV3 />);

  expect(screen.getByText('Sara Al Balushi')).toBeInTheDocument();
  expect(screen.getByText('Operations manager')).toBeInTheDocument();
});

test('groups Goal Zero and share price into one status card', () => {
  render(<IntraPortalV3 />);

  const statusCard = screen.getByRole('region', { name: /goal zero and share price/i });
  expect(within(statusCard).getByText('Goal Zero')).toBeInTheDocument();
  expect(within(statusCard).getByText('Share price')).toBeInTheDocument();
});

test('renders the Golden Catch banner with an accessible text scorecard', () => {
  render(<IntraPortalV3 />);

  expect(screen.getByAltText(/don't be the golden catch/i)).toHaveAttribute(
    'src',
    '/intraportal-v3/phishing-golden-catch-banner.png',
  );
  expect(screen.getByRole('heading', { name: 'Reach ≥30% Golden Star Rate' })).toBeInTheDocument();
  expect(screen.getByText('Every SOM employee can move the scorecard.')).toBeInTheDocument();
  expect(screen.getByText(/report suspicious emails first/i)).toBeInTheDocument();
});

test('uses the generated Think Secure icon and all learning topics', () => {
  const { container } = render(<IntraPortalV3 />);

  expect(container.querySelector('.ip3-learning-icon')).toHaveAttribute(
    'src',
    '/intraportal-v3/think-secure-lock.png',
  );
  expect(screen.getByText('Think Secure Home')).toHaveClass('ip3-learning-tab-home');
  expect(screen.getByText('Social Engineering & Phishing')).toHaveClass('ip3-learning-tab-phishing');
  expect(screen.getByText('Outside of Shell')).toHaveClass('ip3-learning-tab-outside');

  fireEvent.click(screen.getByRole('tab', { name: 'Social Engineering & Phishing' }));
  expect(screen.getByRole('tab', { name: 'Social Engineering & Phishing' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: /stop, check and report suspicious messages/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /review phishing guidance/i })).toBeInTheDocument();
});

test('uses project media instead of remote placeholder images', () => {
  const { container } = render(<IntraPortalV3 />);

  const imageSources = [...container.querySelectorAll('img')].map((image) => image.getAttribute('src'));
  expect(imageSources.some((source) => source?.includes('picsum.photos'))).toBe(false);
  expect(imageSources.filter((source) => source?.startsWith('/intraportal-v3/media/'))).toHaveLength(16);
  expect(screen.getByAltText(/annual report cover/i)).toHaveAttribute(
    'src',
    '/intraportal-v3/media/annual-report-2025.webp',
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
