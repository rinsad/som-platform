const { toMills, fromMills, normalizeMoney, addMoney, subtractMoney } = require('../src/modules/capexV2/money');
const { parseCsv } = require('../src/modules/capexV2/csv');
const { confirmedValueBand } = require('../src/modules/capexV2/workflowService');
const { requestScopePredicate } = require('../src/modules/capexV2/access');

describe('CAPEX v2 OMR money handling', () => {
  test('preserves all three OMR decimal places without floating point arithmetic', () => {
    expect(toMills('19,250.075')).toBe(19250075n);
    expect(fromMills(19250075n)).toBe('19250.075');
    expect(normalizeMoney('8')).toBe('8.000');
    expect(addMoney('0.001', '0.002', '10.117')).toBe('10.120');
    expect(subtractMoney('25000.000', '12750.125')).toBe('12249.875');
  });

  test('rejects more than three decimal places', () => {
    expect(() => normalizeMoney('1.0009')).toThrow('at most 3 decimal places');
  });

  test('rejects JavaScript numbers at API/service boundaries', () => {
    expect(() => normalizeMoney(19.25)).toThrow('decimal string');
  });
});

describe('CAPEX v2 confirmed pilot bands', () => {
  test.each([
    ['0.001', 'LOW'],
    ['24999.999', 'LOW'],
    ['25000.000', 'MEDIUM'],
    ['300000.000', 'MEDIUM'],
    ['300000.001', 'HIGH'],
  ])('%s maps to %s', (amount, expected) => {
    expect(confirmedValueBand(amount)).toBe(expected);
  });
});

describe('CAPEX v2 controlled CSV imports', () => {
  test('parses quoted descriptions and normalizes headers', () => {
    const rows = parseCsv('Business Function,Description,Amount\r\nAviation,"Canopy, phase 2",1234.567\r\n');
    expect(rows).toEqual([{ business_function: 'Aviation', description: 'Canopy, phase 2', amount: '1234.567' }]);
  });
});

describe('CAPEX v2 request scoping predicates', () => {
  test('portfolio scope remains server-side unrestricted', () => {
    expect(requestScopePredicate({ isAdmin: false, scopes: [{ type: 'PORTFOLIO' }] })).toEqual({ sql: 'TRUE', params: [] });
  });

  test('BU and own scope produce parameterized SQL instead of client filtering', () => {
    const predicate = requestScopePredicate({
      isAdmin: false,
      userId: '00000000-0000-0000-0000-000000000001',
      scopes: [{ type: 'BUSINESS_UNIT', organizationUnitId: '00000000-0000-0000-0000-000000000002' }],
    });
    expect(predicate.sql).toContain('organization_unit_id = ANY($1::uuid[])');
    expect(predicate.sql).toContain('owner_user_id = $2');
    expect(predicate.sql).toContain('workflow_instance_steps');
    expect(predicate.params).toHaveLength(2);
  });
});
