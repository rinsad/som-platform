import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import NewPurchaseRequest from './NewPurchaseRequest';

beforeEach(() => localStorage.setItem('som_token', 'fake-token'));
afterEach(() => localStorage.clear());

const renderForm = () =>
  render(
    <MemoryRouter>
      <NewPurchaseRequest />
    </MemoryRouter>
  );

// Helper: set total value via the first line item's quantity and unit price inputs
async function setTotalValue(value) {
  const qty   = screen.getAllByPlaceholderText(/quantity/i)[0];
  const price = screen.getAllByPlaceholderText(/price|unit/i)[0];
  await userEvent.clear(qty);   await userEvent.type(qty,   '1');
  await userEvent.clear(price); await userEvent.type(price, String(value));
}

test('shows LOW tier badge when total is under 25000', async () => {
  renderForm();
  await setTotalValue(10000);
  const badge = screen.getByTestId('tier-badge');
  expect(badge.textContent).toMatch(/LOW/i);
});

test('shows MEDIUM tier badge when total is 25001-300000', async () => {
  renderForm();
  await setTotalValue(80000);
  const badge = screen.getByTestId('tier-badge');
  expect(badge.textContent).toMatch(/MEDIUM/i);
});

test('shows HIGH tier badge when total exceeds 300000', async () => {
  renderForm();
  await setTotalValue(500000);
  const badge = screen.getByTestId('tier-badge');
  expect(badge.textContent).toMatch(/HIGH/i);
});

test('tier badge updates without submitting the form', async () => {
  renderForm();
  await setTotalValue(10000);
  expect(screen.getByTestId('tier-badge').textContent).toMatch(/LOW/i);
  await setTotalValue(200000);
  expect(screen.getByTestId('tier-badge').textContent).toMatch(/MEDIUM/i);
  // No form submission happened — badge updated purely from state
});

test('quote warning appears when fewer than 3 quotes attached', async () => {
  renderForm();
  // No files attached by default — warning should show
  expect(screen.getByTestId('quote-warning')).toBeInTheDocument();
});
