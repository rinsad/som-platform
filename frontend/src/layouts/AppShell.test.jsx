import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppShell from './AppShell';

beforeEach(() => {
  localStorage.setItem('som_token', 'fake-token');
  localStorage.setItem('som_user',
    JSON.stringify({ name: 'Ali Hassan', role: 'Admin', department: 'IT' }));
});

afterEach(() => localStorage.clear());

const renderShell = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route path="dashboard" element={<>Dashboard content</>} />
      </Route>
    </Routes>
  </MemoryRouter>
);

test('renders the SOM Platform brand name', () => {
  renderShell();
  expect(screen.getByText('SOM Platform')).toBeInTheDocument();
});

test('shows the logged-in user name in the navbar', () => {
  renderShell();
  expect(screen.getByText(/Ali Hassan/i)).toBeInTheDocument();
});

test('all 4 module links are visible in the sidebar', () => {
  renderShell();
  expect(screen.getByText(/Capex Planning/i)).toBeInTheDocument();
  expect(screen.getByText(/Purchase Requests/i)).toBeInTheDocument();
  expect(screen.getByText(/Assets/i)).toBeInTheDocument();
  expect(screen.getByText(/Intra Portal/i)).toBeInTheDocument();
});

test('renders child route content in the main area', () => {
  renderShell();
  expect(screen.getByText('Dashboard content')).toBeInTheDocument();
});
