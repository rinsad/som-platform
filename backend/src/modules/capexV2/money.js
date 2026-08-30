const MONEY_RE = /^-?\d+(?:\.\d{1,3})?$/;

function toMills(value, { positive = false, allowZero = true } = {}) {
  if (typeof value !== 'string') throw new Error('Amount must be exchanged as a decimal string');
  const raw = String(value ?? '').trim().replace(/,/g, '');
  if (!MONEY_RE.test(raw)) throw new Error('Amount must be an OMR value with at most 3 decimal places');

  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ''] = unsigned.split('.');
  const mills = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  const signed = negative ? -mills : mills;

  if (positive && signed <= 0n) throw new Error('Amount must be greater than zero');
  if (!allowZero && signed === 0n) throw new Error('Amount cannot be zero');
  return signed;
}

function fromMills(value) {
  const mills = typeof value === 'bigint' ? value : BigInt(value);
  const negative = mills < 0n;
  const absolute = negative ? -mills : mills;
  const whole = absolute / 1000n;
  const fraction = String(absolute % 1000n).padStart(3, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

function normalizeMoney(value, options) {
  return fromMills(toMills(value, options));
}

function addMoney(...values) {
  return fromMills(values.reduce((total, value) => total + toMills(value), 0n));
}

function subtractMoney(left, right) {
  return fromMills(toMills(left) - toMills(right));
}

function compareMoney(left, right) {
  const a = toMills(left);
  const b = toMills(right);
  return a === b ? 0 : a > b ? 1 : -1;
}

module.exports = {
  toMills,
  fromMills,
  normalizeMoney,
  addMoney,
  subtractMoney,
  compareMoney,
};
