import {
  getDepartments,
  getSyncStatus,
  getGsapData,
  getInitiations,
  createInitiation,
  getManualEntries,
  createManualEntry,
  getCapexGovernanceDashboard,
  getCapexProcessReference,
  updateCapexAuc,
  createCapexBudgetVariation,
  DEPT_NAMES,
} from './capexService';

function makeFetch(body, ok = true) {
  return jest.fn().mockResolvedValue({ ok, json: async () => body });
}

beforeEach(() => {
  localStorage.setItem('som_token', 'test-token');
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ── DEPT_NAMES constant ───────────────────────────────────────────────────────
describe('DEPT_NAMES', () => {
  test('exports an array of 6 department names', () => {
    expect(DEPT_NAMES).toHaveLength(6);
    expect(DEPT_NAMES).toContain('Aviation');
    expect(DEPT_NAMES).toContain('Mobility');
    expect(DEPT_NAMES).toContain('HR & Real Estate');
  });
});

// ── getDepartments ────────────────────────────────────────────────────────────
describe('getDepartments', () => {
  test('makes one fetch call for department list', async () => {
    global.fetch = makeFetch([]);
    await getDepartments();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('calls the departments endpoint', async () => {
    global.fetch = makeFetch([]);
    await getDepartments();
    const calledUrls = global.fetch.mock.calls.map(([url]) => url);
    expect(calledUrls.some((u) => u.includes('/api/capex/departments'))).toBe(true);
  });

  test('sends Authorization header on every call', async () => {
    global.fetch = makeFetch({});
    await getDepartments();
    global.fetch.mock.calls.forEach(([, opts]) => {
      expect(opts.headers.Authorization).toBe('Bearer test-token');
    });
  });

  test('returns department objects', async () => {
    global.fetch = makeFetch([{ name: 'mock' }]);
    const result = await getDepartments();
    expect(result).toHaveLength(1);
  });

  test('throws when any department fetch returns non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(getDepartments()).rejects.toThrow('API error');
  });
});

// ── getSyncStatus ─────────────────────────────────────────────────────────────
describe('getSyncStatus', () => {
  test('calls /api/capex/sync-status', async () => {
    global.fetch = makeFetch({ status: 'success' });
    await getSyncStatus();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/sync-status'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  test('returns the response body', async () => {
    const body = { status: 'success', lastSynced: '2026-03-20T10:00:00Z' };
    global.fetch = makeFetch(body);
    const result = await getSyncStatus();
    expect(result).toEqual(body);
  });
});

// ── getGsapData ───────────────────────────────────────────────────────────────
describe('getGsapData', () => {
  test('calls /api/capex/gsap-data', async () => {
    global.fetch = makeFetch({ approvedBudgets: [] });
    await getGsapData();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/gsap-data'),
      expect.any(Object)
    );
  });

  test('throws when response is not ok', async () => {
    global.fetch = makeFetch({}, false);
    await expect(getGsapData()).rejects.toThrow('API error');
  });
});

// ── getInitiations ────────────────────────────────────────────────────────────
describe('getInitiations', () => {
  test('calls GET /api/capex/initiations', async () => {
    global.fetch = makeFetch([]);
    await getInitiations();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/initiations'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });
});

// ── createInitiation ──────────────────────────────────────────────────────────
describe('createInitiation', () => {
  const payload = { title: 'Solar Panels', department: 'Infrastructure', estimatedBudget: 320000 };

  test('calls POST /api/capex/initiations', async () => {
    global.fetch = makeFetch(payload);
    await createInitiation(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/initiations'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('sends the payload as JSON body', async () => {
    global.fetch = makeFetch(payload);
    await createInitiation(payload);
    const [, opts] = global.fetch.mock.calls[0];
    expect(JSON.parse(opts.body)).toEqual(payload);
  });

  test('sends Content-Type: application/json', async () => {
    global.fetch = makeFetch(payload);
    await createInitiation(payload);
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  test('returns the created resource', async () => {
    const created = { ...payload, id: 'CINIT-2026-004', status: 'Pending Approval' };
    global.fetch = makeFetch(created);
    const result = await createInitiation(payload);
    expect(result).toEqual(created);
  });

  test('throws on non-ok response', async () => {
    global.fetch = makeFetch({ error: 'Bad Request' }, false);
    await expect(createInitiation(payload)).rejects.toThrow('API error');
  });
});

// ── getManualEntries ──────────────────────────────────────────────────────────
describe('getManualEntries', () => {
  test('calls GET /api/capex/manual-entries', async () => {
    global.fetch = makeFetch([]);
    await getManualEntries();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/manual-entries'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });
});

// ── createManualEntry ─────────────────────────────────────────────────────────
describe('createManualEntry', () => {
  const payload = { entryType: 'Actual', department: 'Technology', amount: 42000 };

  test('calls POST /api/capex/manual-entries', async () => {
    global.fetch = makeFetch(payload);
    await createManualEntry(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/manual-entries'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('sends the payload as JSON body', async () => {
    global.fetch = makeFetch(payload);
    await createManualEntry(payload);
    const [, opts] = global.fetch.mock.calls[0];
    expect(JSON.parse(opts.body)).toEqual(payload);
  });

  test('returns the created entry', async () => {
    const created = { ...payload, id: 'ME-2026-004', status: 'Posted' };
    global.fetch = makeFetch(created);
    const result = await createManualEntry(payload);
    expect(result).toEqual(created);
  });

  test('throws on non-ok response', async () => {
    global.fetch = makeFetch({ error: 'Bad Request' }, false);
    await expect(createManualEntry(payload)).rejects.toThrow('API error');
  });
});

describe('governance service methods', () => {
  test('calls governance dashboard endpoint', async () => {
    global.fetch = makeFetch({ portfolio: {} });
    await getCapexGovernanceDashboard();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/dashboard/governance'),
      expect.any(Object)
    );
  });

  test('calls process reference endpoint', async () => {
    global.fetch = makeFetch({ businessUnits: [] });
    await getCapexProcessReference();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/process-reference'),
      expect.any(Object)
    );
  });

  test('patches AUC tracking', async () => {
    global.fetch = makeFetch({ status: 'Open' });
    await updateCapexAuc('CAPEX-1', { aucValue: 100 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/requests/CAPEX-1/auc'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  test('creates budget variation', async () => {
    global.fetch = makeFetch({ id: 1 });
    await createCapexBudgetVariation('CAPEX-1', { originalBudget: 100, revisedBudget: 120, justification: 'scope' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/requests/CAPEX-1/budget-variations'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
