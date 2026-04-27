import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import IntraPortal from './IntraPortal';

// vi.useFakeTimers controls setTimeout used for the 300 ms debounce + ssoLogin
vi.useFakeTimers();

const mockApps = [
  { id: 'APP-001', name: 'SAP',          icon: '■', category: 'Finance',  description: 'ERP system',     ssoEnabled: true,  allowedRoles: ['Admin'] },
  { id: 'APP-002', name: 'Leave Portal', icon: '■', category: 'HR',       description: 'Leave requests', ssoEnabled: false, allowedRoles: ['Admin'] },
  { id: 'APP-003', name: 'QHSE Portal',  icon: '■', category: 'Safety',   description: 'Safety docs',    ssoEnabled: false, allowedRoles: ['Admin'] },
];

const mockDocs = [
  { id: 'KB-001', title: 'QHSE Manual', category: 'QHSE', version: '4.2', lastUpdated: '2026-02-03', description: 'Safety manual', tags: ['safety', 'QHSE'] },
  { id: 'KB-002', title: 'HR Policy',   category: 'HR',   version: '2.0', lastUpdated: '2026-01-01', description: 'HR procedures',  tags: ['HR', 'leave'] },
];

const mockVersions = [
  { version: '4.2', updatedAt: '2026-02-03', updatedBy: 'QHSE Team', changelog: 'Updated PPE section.' },
  { version: '4.1', updatedAt: '2025-09-01', updatedBy: 'QHSE Team', changelog: 'Initial release.' },
];

beforeEach(() => {
  localStorage.setItem('som_token', 'fake-token');
  localStorage.setItem('som_user',
    JSON.stringify({ name: 'Sara Al Balushi', role: 'Manager', department: 'Operations' }));

  global.fetch = jest.fn().mockImplementation((url, opts) => {
    if (url.includes('/versions'))
      return Promise.resolve({ ok: true, json: async () => mockVersions });
    if (url.includes('knowledge'))
      return Promise.resolve({ ok: true, json: async () => mockDocs });
    if (url.includes('pinned-docs') && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: async () => ({ docId: 'KB-001', pinned: true, pinnedDocs: ['KB-001'] }) });
    if (url.includes('pinned-docs'))
      return Promise.resolve({ ok: true, json: async () => [] });
    if (url.includes('favourites') && (!opts?.method || opts.method === 'GET'))
      return Promise.resolve({ ok: true, json: async () => [] });
    if (url.includes('favourites') && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: async () => ({ appId: 'APP-001', favourited: true, favourites: ['APP-001'] }) });
    // GET /api/portal/apps
    return Promise.resolve({ ok: true, json: async () => mockApps });
  });
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  jest.clearAllTimers();
});

test('shows personalised welcome with user first name', async () => {
  render(<IntraPortal />);
  expect(screen.getByTestId('welcome-header').textContent).toMatch(/Sara/i);
});

test('renders app tiles fetched from API', async () => {
  render(<IntraPortal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() =>
    expect(screen.getAllByTestId('app-tile')).toHaveLength(3)
  );
});

test('SSO-enabled app tile shows SSO badge', async () => {
  render(<IntraPortal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => screen.getAllByTestId('app-tile'));
  expect(screen.getByText('🔐 SSO', { selector: 'div' })).toBeInTheDocument();
});

test('search does NOT fire immediately on typing', async () => {
  render(<IntraPortal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => screen.getByTestId('knowledge-search'));

  const callsBefore = fetch.mock.calls.length;
  fireEvent.change(screen.getByTestId('knowledge-search'), { target: { value: 'QHSE' } });

  act(() => jest.advanceTimersByTime(100));
  expect(fetch.mock.calls.length).toBe(callsBefore);
});

test('search fires after 300ms debounce delay', async () => {
  render(<IntraPortal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => screen.getByTestId('knowledge-search'));

  const callsBefore = fetch.mock.calls.length;
  fireEvent.change(screen.getByTestId('knowledge-search'), { target: { value: 'QHSE' } });

  await act(async () => { jest.advanceTimersByTime(300); });
  expect(fetch.mock.calls.length).toBeGreaterThan(callsBefore);
});

test('shows empty state when no documents match search', async () => {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes('knowledge'))
      return Promise.resolve({ ok: true, json: async () => [] });
    if (url.includes('pinned-docs'))
      return Promise.resolve({ ok: true, json: async () => [] });
    if (url.includes('favourites'))
      return Promise.resolve({ ok: true, json: async () => [] });
    return Promise.resolve({ ok: true, json: async () => mockApps });
  });

  render(<IntraPortal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => screen.getByTestId('knowledge-search'));

  fireEvent.change(screen.getByTestId('knowledge-search'), { target: { value: 'xyz123notexist' } });
  await act(async () => { jest.advanceTimersByTime(300); });

  await waitFor(() =>
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  );
});

test('starring an app adds it to Favourites section', async () => {
  render(<IntraPortal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => screen.getAllByTestId('app-tile'));

  fireEvent.click(screen.getByTestId('star-btn-APP-001'));
  await waitFor(() =>
    expect(screen.getByText('Favourites')).toBeInTheDocument()
  );
});

test('pin button appears on knowledge card', async () => {
  render(<IntraPortal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => screen.getByTestId('knowledge-results'));

  await waitFor(() =>
    expect(screen.getByTestId('pin-btn-KB-001')).toBeInTheDocument()
  );
});

test('clicking History on a KB card loads and shows version history', async () => {
  render(<IntraPortal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => screen.getByTestId('history-btn-KB-001'));

  fireEvent.click(screen.getByTestId('history-btn-KB-001'));
  await waitFor(() =>
    expect(screen.getByText('Updated PPE section.')).toBeInTheDocument()
  );
});
