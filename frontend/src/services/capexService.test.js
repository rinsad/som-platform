import {
  getDepartments,
  getSyncStatus,
  getGsapData,
  getInitiations,
  createInitiation,
  getManualEntries,
  createManualEntry,
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
  test('exports an array of 4 department names', () => {
    expect(DEPT_NAMES).toHaveLength(4);
    expect(DEPT_NAMES).toContain('Retail Operations');
    expect(DEPT_NAMES).toContain('Infrastructure');
    expect(DEPT_NAMES).toContain('Technology');
    expect(DEPT_NAMES).toContain('QHSE');
  });
});

// ── getDepartments ────────────────────────────────────────────────────────────
describe('getDepartments', () => {
  test('makes one fetch call per department', async () => {
    const deptData = { name: 'Retail Operations', totalBudget: 1200000 };
    global.fetch = makeFetch(deptData);
    await getDepartments();
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  test('calls the department endpoint with encoded department name', async () => {
    global.fetch = makeFetch({});
    await getDepartments();
    const calledUrls = global.fetch.mock.calls.map(([url]) => url);
    expect(calledUrls.some((u) => u.includes('/api/capex/department/Retail%20Operations'))).toBe(true);
    expect(calledUrls.some((u) => u.includes('/api/capex/department/Infrastructure'))).toBe(true);
  });

  test('sends Authorization header on every call', async () => {
    global.fetch = makeFetch({});
    await getDepartments();
    global.fetch.mock.calls.forEach(([, opts]) => {
      expect(opts.headers.Authorization).toBe('Bearer test-token');
    });
  });

  test('returns an array of 4 dept objects', async () => {
    global.fetch = makeFetch({ name: 'mock' });
    const result = await getDepartments();
    expect(result).toHaveLength(4);
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
