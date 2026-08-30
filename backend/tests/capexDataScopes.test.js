const {
  SCOPE_TIERS,
  PORTFOLIO_ROLES,
  BUSINESS_ROLES,
  isGlobalRole,
  scopeTierForRole,
  roleScopeCatalog,
  canAccessOrganization,
  buildScopePredicate,
} = require('../src/config/capexDataScopes');

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const USER = '33333333-3333-3333-3333-333333333333';

describe('scopeTierForRole', () => {
  it.each(PORTFOLIO_ROLES)('treats %s as portfolio', (role) => {
    expect(scopeTierForRole(role)).toBe(SCOPE_TIERS.PORTFOLIO);
    expect(isGlobalRole(role)).toBe(true);
  });

  it.each(['Business GM', 'Manager', 'Finance in Business', 'CP Lead', 'HSSE Focal'])(
    'scopes %s to its business',
    (role) => {
      expect(scopeTierForRole(role)).toBe(SCOPE_TIERS.BUSINESS);
      expect(isGlobalRole(role)).toBe(false);
    }
  );

  it.each(['Project Owner', 'Project Engineer'])('limits %s to own and assigned requests', (role) => {
    expect(scopeTierForRole(role)).toBe(SCOPE_TIERS.OWN);
  });

  // Fail closed: an unrecognised role must never inherit portfolio visibility.
  it.each([
    ['Employee'],
    ['Finance'],
    ['Department Manager'],
    ['manager'],
    ['Buisness GM'],
    [''],
    [null],
    [undefined],
  ])('falls back to own-requests for %p', (role) => {
    expect(scopeTierForRole(role)).toBe(SCOPE_TIERS.OWN);
  });

  it('covers every role the permission presets can assign', () => {
    const catalog = roleScopeCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    for (const entry of catalog) {
      expect(Object.values(SCOPE_TIERS)).toContain(entry.tier);
      expect(entry.requiresBusiness).toBe(entry.tier !== SCOPE_TIERS.PORTFOLIO);
    }
    for (const role of [...PORTFOLIO_ROLES, ...BUSINESS_ROLES]) {
      expect(catalog.some((entry) => entry.role === role)).toBe(true);
    }
  });
});

describe('canAccessOrganization', () => {
  it('lets portfolio users and admins reach any business', () => {
    expect(canAccessOrganization({ tier: SCOPE_TIERS.PORTFOLIO }, ORG_B)).toBe(true);
    expect(canAccessOrganization({ isAdmin: true, tier: SCOPE_TIERS.OWN }, ORG_B)).toBe(true);
  });

  it('limits business users to their assigned businesses', () => {
    const context = { tier: SCOPE_TIERS.BUSINESS, organizationUnitIds: [ORG_A] };
    expect(canAccessOrganization(context, ORG_A)).toBe(true);
    expect(canAccessOrganization(context, ORG_B)).toBe(false);
    expect(canAccessOrganization(context, null)).toBe(false);
  });
});

describe('buildScopePredicate', () => {
  it('is unrestricted for portfolio users and admins', () => {
    expect(buildScopePredicate({ tier: SCOPE_TIERS.PORTFOLIO })).toEqual({ sql: 'TRUE', params: [] });
    expect(buildScopePredicate({ isAdmin: true, tier: SCOPE_TIERS.OWN })).toEqual({ sql: 'TRUE', params: [] });
  });

  it('shows nothing when the user has no basis for visibility', () => {
    expect(buildScopePredicate({ tier: SCOPE_TIERS.BUSINESS, organizationUnitIds: [] }))
      .toEqual({ sql: 'FALSE', params: [] });
  });

  it('ORs business, ownership and assigned-approver arms', () => {
    const { sql, params } = buildScopePredicate({
      tier: SCOPE_TIERS.BUSINESS,
      organizationUnitIds: [ORG_A, ORG_A, ORG_B],
      userId: USER,
      identityKeys: ['Ali@shell.om', ' Ali Said '],
    });

    expect(sql).toContain('r.organization_unit_id = ANY($1::uuid[])');
    expect(sql).toContain('r.requester_id = $2');
    expect(sql).toContain('lower(btrim(s_scope.assigned_to)) = ANY($3::text[])');
    expect(sql.startsWith('(')).toBe(true);
    expect(sql).toContain(' OR ');
    // Businesses de-duplicated, identity keys normalised for comparison.
    expect(params).toEqual([[ORG_A, ORG_B], USER, ['ali@shell.om', 'ali said']]);
  });

  it('drops the business arm at own-requests tier', () => {
    const { sql, params } = buildScopePredicate({
      tier: SCOPE_TIERS.OWN,
      organizationUnitIds: [ORG_A],
      userId: USER,
      identityKeys: ['sam@shell.om'],
    });

    expect(sql).not.toContain('organization_unit_id');
    expect(sql).toContain('r.requester_id = $1');
    expect(params).toEqual([USER, ['sam@shell.om']]);
  });

  it('numbers parameters from the requested offset', () => {
    const { sql, params } = buildScopePredicate(
      { tier: SCOPE_TIERS.BUSINESS, organizationUnitIds: [ORG_A], userId: USER, identityKeys: ['x@shell.om'] },
      { startIndex: 4 }
    );

    expect(sql).toContain('$4::uuid[]');
    expect(sql).toContain('r.requester_id = $5');
    expect(sql).toContain('$6::text[]');
    expect(params).toHaveLength(3);
  });

  it('honours table-specific columns and can omit the assigned arm', () => {
    const { sql } = buildScopePredicate(
      { tier: SCOPE_TIERS.BUSINESS, organizationUnitIds: [ORG_A], userId: USER, identityKeys: ['x@shell.om'] },
      { alias: 'p', ownerColumn: 'requestor_id', includeAssignedArm: false }
    );

    expect(sql).toContain('p.organization_unit_id');
    expect(sql).toContain('p.requestor_id');
    expect(sql).not.toContain('s_scope');
  });

  it('skips the ownership arm for synthetic non-UUID identities', () => {
    const { sql, params } = buildScopePredicate({
      tier: SCOPE_TIERS.BUSINESS,
      organizationUnitIds: [ORG_A],
      userId: 1,
      identityKeys: [],
    });

    expect(sql).not.toContain('requester_id');
    expect(params).toEqual([[ORG_A]]);
  });
});
