import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// Mock fetch so tests don't make real HTTP calls
beforeEach(() => {
  global.fetch = jest.fn();
  localStorage.clear();
});

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

test('renders email and password fields', () => {
  renderLogin();
  expect(screen.getByPlaceholderText(/you@shell\.om/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
});

test('shows error message on failed login', async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'Invalid credentials' }),
  });

  renderLogin();
  fireEvent.change(screen.getByPlaceholderText(/you@shell\.om/i),
    { target: { value: 'wrong@email.com' } });
  fireEvent.change(screen.getByPlaceholderText(/••••••••/i),
    { target: { value: 'badpass' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() =>
    expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
  );
});

test('saves token to localStorage on success', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ token: 'fake.jwt.token', user: { email: 'admin@shell.om', role: 'Admin' } }),
  });

  renderLogin();
  fireEvent.change(screen.getByPlaceholderText(/you@shell\.om/i),
    { target: { value: 'admin@shell.om' } });
  fireEvent.change(screen.getByPlaceholderText(/••••••••/i),
    { target: { value: 'admin123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() =>
    expect(localStorage.getItem('som_token')).toBe('fake.jwt.token')
  );
});

test('button is disabled while loading', async () => {
  fetch.mockImplementation(() => new Promise(() => {})); // never resolves

  renderLogin();
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(screen.getByRole('button', { name: /sign in|signing in/i })).toBeDisabled();
});
