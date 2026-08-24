/**
 * @jest-environment jsdom
 */

jest.mock('../../src/modules/server-backend.js', () => ({
  serverSave: jest.fn(() => Promise.resolve()),
  serverAvailable: false,
}));

let mod;
let mockDbStore;

function createMockIndexedDB() {
  mockDbStore = [];

  function makeRequest(result, shouldFail = false) {
    const req = { onsuccess: null, onerror: null, onupgradeneeded: null };
    Object.defineProperty(req, 'target', { get: () => req });
    req.result = result;
    setTimeout(() => {
      if (shouldFail) {
        req.onerror?.({ target: { error: new Error('mock error') } });
      } else {
        req.onsuccess?.({ target: { result } });
      }
    }, 0);
    return req;
  }

  const store = {
    add: jest.fn((item) => {
      const id = mockDbStore.length + 1;
      mockDbStore.push({ ...item, id });
      return makeRequest(id);
    }),
    getAll: jest.fn(() => makeRequest([...mockDbStore])),
    delete: jest.fn((id) => {
      mockDbStore = mockDbStore.filter((i) => i.id !== id);
      return makeRequest(true);
    }),
  };

  const db = {
    objectStoreNames: { contains: jest.fn(() => true) },
    createObjectStore: jest.fn(),
    transaction: jest.fn(() => ({
      objectStore: jest.fn(() => store),
    })),
  };

  return {
    open: jest.fn(() => makeRequest(db)),
  };
}

beforeEach(() => {
  jest.resetModules();
  global.indexedDB = createMockIndexedDB();

  global.navigator.serviceWorker = {
    ready: Promise.resolve({
      sync: { register: jest.fn(() => Promise.resolve()) },
    }),
    addEventListener: jest.fn(),
  };
});

afterEach(() => {
  delete global.indexedDB;
  delete global.window.SyncManager;
});

describe('offline-sync.js', () => {
  test('queueOfflineSave queues a save and returns true', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    const result = await mod.queueOfflineSave('submissions', { answer: 'test' });
    expect(result).toBe(true);
  });

  test('queueOfflineSave stores data with collection and timestamp', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('assignments', { title: 'hw1' });
    expect(mockDbStore.length).toBe(1);
    expect(mockDbStore[0].collection).toBe('assignments');
    expect(mockDbStore[0].data.title).toBe('hw1');
    expect(mockDbStore[0].timestamp).toBeGreaterThan(0);
  });

  test('queueOfflineSave registers background sync when SyncManager is available', async () => {
    global.window.SyncManager = class {};
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', {});
    const reg = await global.navigator.serviceWorker.ready;
    expect(reg.sync.register).toHaveBeenCalledWith('sync-offline-data');
  });

  test('queueOfflineSave does not register sync when SyncManager is absent', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', {});
    const reg = await global.navigator.serviceWorker.ready;
    expect(reg.sync.register).not.toHaveBeenCalled();
  });

  test('queueOfflineSave returns false when indexedDB fails', async () => {
    global.indexedDB.open = jest.fn(() => {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => req.onerror?.({ target: { error: new Error('open failed') } }), 0);
      return req;
    });
    mod = await import('../../src/modules/offline-sync.js');
    const result = await mod.queueOfflineSave('submissions', {});
    expect(result).toBe(false);
  });

  test('getPendingSaves returns queued items', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', { answer: 'a1' });
    await mod.queueOfflineSave('submissions', { answer: 'a2' });
    const items = await mod.getPendingSaves();
    expect(items.length).toBe(2);
    expect(items[0].data.answer).toBe('a1');
    expect(items[1].data.answer).toBe('a2');
  });

  test('getPendingSaves returns empty array when no items', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    const items = await mod.getPendingSaves();
    expect(items).toEqual([]);
  });

  test('getPendingSaves returns [] when indexedDB fails', async () => {
    global.indexedDB.open = jest.fn(() => {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => req.onerror?.({ target: { error: new Error('fail') } }), 0);
      return req;
    });
    mod = await import('../../src/modules/offline-sync.js');
    const items = await mod.getPendingSaves();
    expect(items).toEqual([]);
  });

  test('clearPendingSave removes an item by id', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', { answer: 'test' });
    const id = mockDbStore[0].id;
    const cleared = await mod.clearPendingSave(id);
    expect(cleared).toBe(true);
    const items = await mod.getPendingSaves();
    expect(items.length).toBe(0);
  });

  test('clearPendingSave returns false when indexedDB fails', async () => {
    global.indexedDB.open = jest.fn(() => {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => req.onerror?.({ target: { error: new Error('fail') } }), 0);
      return req;
    });
    mod = await import('../../src/modules/offline-sync.js');
    const result = await mod.clearPendingSave(1);
    expect(result).toBe(false);
  });

  test('syncOfflineData processes all pending saves', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', { answer: 'a1' });
    await mod.queueOfflineSave('submissions', { answer: 'a2' });
    const serverSaveFn = jest.fn(() => Promise.resolve());
    await mod.syncOfflineData(serverSaveFn);
    expect(serverSaveFn).toHaveBeenCalledTimes(2);
    expect(serverSaveFn).toHaveBeenNthCalledWith(1, 'submissions', { answer: 'a1' });
    expect(serverSaveFn).toHaveBeenNthCalledWith(2, 'submissions', { answer: 'a2' });
    const remaining = await mod.getPendingSaves();
    expect(remaining.length).toBe(0);
  });

  test('syncOfflineData does nothing when no pending saves', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    const serverSaveFn = jest.fn();
    await mod.syncOfflineData(serverSaveFn);
    expect(serverSaveFn).not.toHaveBeenCalled();
  });

  test('syncOfflineData stops processing after a failure', async () => {
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', { answer: 'ok1' });
    await mod.queueOfflineSave('submissions', { answer: 'ok2' });
    const serverSaveFn = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('server down'))
      .mockResolvedValueOnce(undefined);
    await mod.syncOfflineData(serverSaveFn);
    expect(serverSaveFn).toHaveBeenCalledTimes(2);
    const remaining = await mod.getPendingSaves();
    expect(remaining.length).toBe(1);
    expect(remaining[0].data.answer).toBe('ok2');
  });

  test('online event triggers sync through backend serverSave', async () => {
    const backend = await import('../../src/modules/server-backend.js');
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', { answer: 'sync-me' });
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 50));
    expect(backend.serverSave).toHaveBeenCalledWith('submissions', { answer: 'sync-me' });
  });

  test('online event swallows backend save failures', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const backend = await import('../../src/modules/server-backend.js');
    backend.serverSave.mockRejectedValueOnce(new Error('down'));
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', { answer: 'x' });
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 50));
    expect(backend.serverSave).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('service worker message triggers sync', async () => {
    const backend = await import('../../src/modules/server-backend.js');
    mod = await import('../../src/modules/offline-sync.js');
    await mod.queueOfflineSave('submissions', { answer: 'sw-sync' });
    const handler = global.navigator.serviceWorker.addEventListener.mock.calls.find(
      ([event]) => event === 'message',
    )[1];
    handler({ data: { type: 'trigger-sync-offline' } });
    await new Promise((r) => setTimeout(r, 50));
    expect(backend.serverSave).toHaveBeenCalledWith('submissions', { answer: 'sw-sync' });
  });
});
