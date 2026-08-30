import { describe, expect, it } from 'vitest';
import { compareDecimalStrings, formatOmr } from './capexV2Format';

describe('CAPEX v2 decimal display', () => {
  it('formats OMR decimal strings without JavaScript floating point conversion', () => {
    expect(formatOmr('9007199254740992.125')).toBe('OMR 9,007,199,254,740,992.125');
    expect(formatOmr('1250000.075', true)).toBe('OMR 1.3m');
  });

  it('compares quotation values exactly at three decimal places', () => {
    expect(compareDecimalStrings('9007199254740992.126', '9007199254740992.125')).toBe(1);
    expect(compareDecimalStrings('19.250', '19.25')).toBe(0);
  });
});
