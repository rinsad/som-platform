const {
  CANONICAL_STATUSES,
  LEGACY_STATUS_MAP,
  canonicalStatus,
  canEditProcurement,
  canCreateMilestone,
  canUpdateMilestone,
  canResubmit,
  canDecide,
  decisionAuthority,
  requestStatusForStep,
} = require('../src/config/capexStateMachine');

describe('CAPEX state machine', () => {
  test('decisionAuthority returns all authority outcomes', () => {
    const user = { full_name: 'Approver One', email: 'approver@shell.om', role: 'Finance Manager' };

    expect(decisionAuthority(user, { assigned_to: 'approver@shell.om' }, [])).toBe('assigned');
    expect(decisionAuthority(user, {}, ['Finance Manager'])).toBe('role-allowed');
    expect(decisionAuthority(user, {}, ['CFO'])).toBe('denied');
    expect(decisionAuthority({ ...user, role: 'Admin' }, {}, ['CFO'])).toBe('admin-override');
    expect(decisionAuthority(user, {}, [])).toBe('unconfigured');
    expect(decisionAuthority({ ...user, role: 'Admin' }, {}, [])).toBe('admin-override');
  });

  test('legacy statuses map to canonical status names', () => {
    const expected = {
      'Pending Vendor Registration / NDA / DPA': 'Procurement in progress',
      'GSAP Project Created': 'GSAP project created',
      'PR Created': 'PR created',
      'PO Created': 'PO created',
      'PO Uploaded': 'PO uploaded',
      'In Execution': 'In execution',
      'Pending Financial Closure': 'Pending final closure',
      'Approved for Procurement': 'Approved',
      'Returned for Correction': 'Returned for correction',
      'Pending FiB Validation': 'Pending FIB validation',
      'Pending HSSE Approval': 'Pending HSSE / worker welfare review',
      'Pending CP Review': 'Pending CP review',
      'Pending Contract Board Approval': 'Pending Contract Board approval',
      'Pending Management Approval': 'Pending GM approval',
      'Pending Line Manager Endorsement': 'Pending line manager endorsement',
    };

    expect(LEGACY_STATUS_MAP).toMatchObject(expected);
    for (const [legacy, canonical] of Object.entries(expected)) {
      expect(canonicalStatus(legacy)).toBe(canonical);
      expect(CANONICAL_STATUSES).toContain(canonical);
    }
  });

  test('gates are driven by canonical status windows', () => {
    expect(canEditProcurement('Approved')).toBe(true);
    expect(canEditProcurement('Approved for Procurement')).toBe(true);
    expect(canEditProcurement('Submitted')).toBe(false);

    expect(canCreateMilestone('PO created')).toBe(false);
    expect(canCreateMilestone('PO Created')).toBe(false);
    expect(canCreateMilestone('PO uploaded')).toBe(true);
    expect(canCreateMilestone('Approved')).toBe(false);

    expect(canUpdateMilestone('In execution')).toBe(true);
    expect(canUpdateMilestone('Returned for Correction')).toBe(false);
    expect(canUpdateMilestone('Closed')).toBe(false);

    expect(canResubmit('Returned for correction')).toBe(true);
    expect(canResubmit('Returned for Correction')).toBe(true);
    expect(canResubmit('Rejected')).toBe(false);

    expect(canDecide({ current_step_id: 10 })).toBe(true);
    expect(canDecide({ current_step_id: null })).toBe(false);
  });

  test('requestStatusForStep uses explicit role mapping', () => {
    expect(requestStatusForStep({ approver_role: 'Line Manager' })).toBe('Pending line manager endorsement');
    expect(requestStatusForStep({ approver_role: 'Manager' })).toBe('Pending line manager endorsement');
    expect(requestStatusForStep({ approver_role: 'FiB' })).toBe('Pending FIB validation');
    expect(requestStatusForStep({ approver_role: 'Finance in Business' })).toBe('Pending FIB validation');
    expect(requestStatusForStep({ approver_role: 'CEO/Board', label: 'EMT Approval' })).toBe('Pending EMT approval');
    expect(requestStatusForStep({ approver_role: 'CEO/Board', label: 'Contract Board Approval' })).toBe('Pending Contract Board approval');
    expect(requestStatusForStep({ approver_role: 'Unknown Role' })).toBe('Pending GM approval');
    expect(requestStatusForStep(null)).toBe('Approved');
  });
});
