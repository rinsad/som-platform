import {
  createCapexV2Request,
  getCapexV2Import,
  getCapexV2Context,
  getCapexV2Requests,
  uploadCapexV2Import,
} from './capexV2Service';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

function response(body, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

beforeEach(() => {
  localStorage.setItem('som_token', 'v2-test-token');
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('CAPEX v2 service contracts', () => {
  test('loads the server-derived access context with bearer authentication', async () => {
    globalThis.fetch.mockResolvedValue(response({ workspaces: [] }));
    await getCapexV2Context();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/v2/me/context'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer v2-test-token' }) })
    );
  });

  test('sends request register filters to the server', async () => {
    globalThis.fetch.mockResolvedValue(response({ items: [], total: 0 }));
    await getCapexV2Requests({ search: 'canopy', urgency: 'URGENT', status: 'IN_REVIEW' });
    const [url] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('search=canopy');
    expect(url).toContain('urgency=URGENT');
    expect(url).toContain('status=IN_REVIEW');
  });

  test('posts OMR values as decimal strings', async () => {
    globalThis.fetch.mockResolvedValue(response({ id: 'request-id' }, true, 201));
    await createCapexV2Request({ title: 'Canopy', estimatedValue: '19250.075' });
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(JSON.parse(options.body).estimatedValue).toBe('19250.075');
  });

  test('uploads controlled SAC import metadata and CSV as multipart data', async () => {
    globalThis.fetch.mockResolvedValue(response({ id: 'batch-id' }, true, 201));
    const file = new File(['business_function,description,amount\nAviation,Canopy,1.000'], 'approved.csv', { type: 'text/csv' });
    await uploadCapexV2Import({ file, budgetCycleId: 'cycle-id', sourceReference: 'BOARD-2026-10' });
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('file')).toBe(file);
    expect(JSON.parse(options.body.get('payload'))).toMatchObject({ sourceSystem: 'SAC', importType: 'APPROVED_BUDGET' });
  });

  test('loads staged import rows before validation', async () => {
    globalThis.fetch.mockResolvedValue(response({
      id: 'batch-id',
      status: 'STAGED',
      rows: [{ rowNumber: 1, validationStatus: 'PENDING' }],
    }));
    const batch = await getCapexV2Import('batch-id');
    expect(batch.rows[0]).toMatchObject({ rowNumber: 1, validationStatus: 'PENDING' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/capex/v2/imports/batch-id'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer v2-test-token' }) })
    );
  });

  test('surfaces structured backend errors', async () => {
    globalThis.fetch.mockResolvedValue(response({ error: 'No active MOA', code: 'NO_ACTIVE_WORKFLOW' }, false, 409));
    await expect(getCapexV2Context()).rejects.toMatchObject({ message: 'No active MOA', code: 'NO_ACTIVE_WORKFLOW', status: 409 });
  });
});
