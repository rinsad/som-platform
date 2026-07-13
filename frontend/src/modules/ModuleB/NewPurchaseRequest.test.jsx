import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test } from 'vitest';
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
  expect(badge.textContent).toBe('LOW — Business GM authorization');
});

test('shows MEDIUM tier badge when total is 25001-300000', async () => {
  renderForm();
  await setTotalValue(80000);
  const badge = screen.getByTestId('tier-badge');
  expect(badge.textContent).toBe('MEDIUM — EMT + Head of CP authorization');
});

test('shows HIGH tier badge when total exceeds 300000', async () => {
  renderForm();
  await setTotalValue(500000);
  const badge = screen.getByTestId('tier-badge');
  expect(badge.textContent).toBe('HIGH — Contract Board authorization');
});

test('tier badge updates without submitting the form', async () => {
  renderForm();
  await setTotalValue(10000);
  expect(screen.getByTestId('tier-badge').textContent).toMatch(/LOW/i);
  await setTotalValue(200000);
  expect(screen.getByTestId('tier-badge').textContent).toMatch(/MEDIUM/i);
  // No form submission happened — badge updated purely from state
});

test('quote warning appears when fewer than 3 quotes are entered', async () => {
  renderForm();
  // No supplier quotes entered by default - warning should show.
  expect(screen.getByTestId('quote-warning')).toBeInTheDocument();
});

test('supplier selection checkbox allows one selected supplier or none', async () => {
  renderForm();

  fireEvent.change(screen.getByPlaceholderText('Supplier name'), { target: { value: 'Supplier A' } });
  await userEvent.click(screen.getByRole('button', { name: /\+ add supplier/i }));
  fireEvent.change(screen.getAllByPlaceholderText('Supplier name')[1], { target: { value: 'Supplier B' } });

  const supplierA = screen.getByRole('checkbox', { name: /select supplier a/i });
  const supplierB = screen.getByRole('checkbox', { name: /select supplier b/i });

  await userEvent.click(supplierA);
  expect(supplierA).toBeChecked();
  expect(supplierB).not.toBeChecked();

  await userEvent.click(supplierB);
  expect(supplierA).not.toBeChecked();
  expect(supplierB).toBeChecked();

  await userEvent.click(supplierB);
  expect(supplierA).not.toBeChecked();
  expect(supplierB).not.toBeChecked();
  expect(screen.queryByLabelText('Selected Supplier')).not.toBeInTheDocument();
});

test('risk selects render with Low defaults', () => {
  renderForm();
  expect(screen.getByLabelText('HSSE Risk')).toHaveTextContent('Low');
  expect(screen.getByLabelText('Worker Welfare Risk')).toHaveTextContent('Low');
});
