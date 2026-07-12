import { describe, expect, test } from 'vitest';
import { buildPermMap, canView } from './permissions';

describe('permission utility', () => {
  test('does not let root CAPEX access unlock admin config', () => {
    const map = buildPermMap([
      {
        level: 'application',
        resource_key: 'capex',
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
      },
    ]);

    expect(canView(map, 'Manager', 'capex')).toBe(true);
    expect(canView(map, 'Manager', 'capex.admin')).toBe(false);
    expect(canView(map, 'Admin', 'capex.admin')).toBe(true);
  });

  test('allows page-level permissions to cover page fields', () => {
    const map = buildPermMap([
      {
        level: 'page',
        resource_key: 'capex.planning.dashboard',
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
      },
    ]);

    expect(canView(map, 'Manager', 'capex.planning.dashboard.total_budget')).toBe(true);
  });
});
