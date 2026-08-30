const wholeNumberFormatter = new Intl.NumberFormat('en-GB');

export function formatOmr(value, compact = false) {
  if (value === undefined || value === null || value === '') return '—';
  const parsed = decimalMills(value);
  if (parsed === null) return `OMR ${value}`;
  const negative = parsed < 0n;
  const absolute = negative ? -parsed : parsed;
  if (compact && absolute >= 1_000_000_000n) {
    const tenths = (absolute + 50_000_000n) / 100_000_000n;
    return `OMR ${negative ? '-' : ''}${tenths / 10n}.${tenths % 10n}m`;
  }
  if (compact && absolute >= 1_000_000n) {
    const thousands = (absolute + 500_000n) / 1_000_000n;
    return `OMR ${negative ? '-' : ''}${thousands}k`;
  }
  const whole = absolute / 1000n;
  const fraction = String(absolute % 1000n).padStart(3, '0');
  return `OMR ${negative ? '-' : ''}${wholeNumberFormatter.format(whole)}.${fraction}`;
}

export function compareDecimalStrings(left, right) {
  const leftMills = decimalMills(left);
  const rightMills = decimalMills(right);
  if (leftMills === null || rightMills === null) return null;
  return leftMills === rightMills ? 0 : leftMills > rightMills ? 1 : -1;
}

function decimalMills(value) {
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d{1,3})?$/.test(value.trim())) return null;
  const normalized = value.trim();
  const negative = normalized.startsWith('-');
  const [whole, fraction = ''] = (negative ? normalized.slice(1) : normalized).split('.');
  const mills = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  return negative ? -mills : mills;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
