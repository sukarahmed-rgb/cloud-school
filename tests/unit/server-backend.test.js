import {
  checkServerHealth,
  checkServerSession,
  serverLoginFirebase,
  serverRegisterFirebase,
  serverLogout,
  serverFetch,
  serverSave,
  initServerBackend,
  syncDataFromServer,
  getArabicRoleName,
} from '../../src/modules/server-backend.js';

function mockResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  };
}

describe('server-backend.js', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = jest.fn();
    document.body.innerHTML = `
      <div id="auth-gate"></div>
      <div id="dev-role-bar" class="hidden"></div>
      <div id="active-user-badge"></div>
      <div id="toast"></div>
    `;
    window.__ = jest.fn((k, ...args) => args[0] || k);
    window.speak = jest.fn();
    window.switchRole = jest.fn();
    window.syncDataFromServer = jest.fn();
    window.getArabicRoleName = jest.fn((r) => r);
    window.saveLocalData = jest.fn();
    window.localData = {};
    localStorage.clear();
  });

  afterEach(() => {
    delete globalThis.__server_base;
  });

  test('checkServerHealth sets serverAvailable on success', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ status: 'ok' }));
    await checkServerHealth();
    const mod = await import('../../src/modules/server-backend.js');
    expect(mod.serverAvailable).toBe(true);
  });

  test('checkServerHealth sets serverAvailable = false on failure', async () => {
    globalThis.fetch.mockRejectedValue(new Error('Network error'));
    await checkServerHealth();
    const mod = await import('../../src/modules/server-backend.js');
    expect(mod.serverAvailable).toBe(false);
  });

  test('checkServerSession returns null when server unavailable', async () => {
    const result = await checkServerSession();
    expect(result).toBeNull();
  });

  test('checkServerSession returns user when authenticated', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
      .mockResolvedValueOnce(mockResponse({ authenticated: true, user: { name: 'Test' } }));
    await checkServerHealth();
    const result = await checkServerSession();
    expect(result).toEqual({ name: 'Test' });
  });

  test('checkServerSession returns null when fetch fails', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
      .mockRejectedValueOnce(new Error('fail'));
    await checkServerHealth();
    const result = await checkServerSession();
    expect(result).toBeNull();
  });

  test('checkServerSession ignores unauthenticated response', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
      .mockResolvedValueOnce(mockResponse({ authenticated: false }));
    await checkServerHealth();
    const result = await checkServerSession();
    expect(result).toBeNull();
  });

  test('serverLoginFirebase calls POST and returns result', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ id: 'u1' }));
    const result = await serverLoginFirebase('test-token');
    expect(result.id).toBe('u1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/firebase-login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('serverLoginFirebase throws on failure', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ error: 'fail' }, 401));
    await expect(serverLoginFirebase('bad-token')).rejects.toThrow();
  });

  test('serverRegisterFirebase calls POST with registration data', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ id: 'u1' }));
    const result = await serverRegisterFirebase('token', 'Name', 'student', 10, 'parent@x.com');
    expect(result.id).toBe('u1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/firebase-register'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('serverRegisterFirebase throws on failure', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ error: 'fail' }, 409));
    await expect(serverRegisterFirebase('token', 'Name', 'student')).rejects.toThrow();
  });

  test('serverLogout calls logout endpoint', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({}));
    await serverLogout();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('serverLogout does not throw on failure', async () => {
    globalThis.fetch.mockRejectedValue(new Error('fail'));
    await expect(serverLogout()).resolves.toBeUndefined();
  });

  test('serverFetch fetches collection data', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse([{ id: '1' }]));
    const result = await serverFetch('curriculum_modules');
    expect(result).toEqual([{ id: '1' }]);
  });

  test('serverFetch throws on failure', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse(null, 500));
    await expect(serverFetch('bad')).rejects.toThrow();
  });

  test('serverSave posts data to collection', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ id: '1' }));
    const result = await serverSave('submissions', { content: 'test' });
    expect(result.id).toBe('1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/data/submissions'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('serverSave throws on failure', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse(null, 500));
    await expect(serverSave('bad', {})).rejects.toThrow('Failed to save bad');
  });

  test('getArabicRoleName returns correct Arabic names', () => {
    window.__ = jest.fn((k) => {
      const map = {
        roleStudent: 'طالب',
        roleTeacher: 'معلم',
        roleParent: 'ولي أمر',
        roleAdmin: 'مدير',
      };
      return map[k] || k;
    });
    expect(getArabicRoleName('student')).toBe('طالب');
    expect(getArabicRoleName('teacher')).toBe('معلم');
    expect(getArabicRoleName('parent')).toBe('ولي أمر');
    expect(getArabicRoleName('admin')).toBe('مدير');
    expect(getArabicRoleName('unknown')).toBe('unknown');
  });

  describe('initServerBackend', () => {
    test('handles missing DOM elements gracefully', async () => {
      document.body.innerHTML = '';
      globalThis.fetch.mockResolvedValue(mockResponse({ status: 'ok' }));
      await expect(initServerBackend()).resolves.toBeUndefined();
    });

    test('sets up user session when authenticated', async () => {
      const user = { name: 'Test', email: 'test@x.com', role: 'teacher', id: 'u1' };
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
        .mockResolvedValueOnce(mockResponse({ configured: true }))
        .mockResolvedValueOnce(mockResponse({ authenticated: true, user }));
      await initServerBackend();
      expect(window.currentUserSession).toBeDefined();
      expect(window.currentUserSession.name).toBe('Test');
      expect(window.currentUserSession.role).toBe('teacher');
      expect(window.currentUserSession.serverAuth).toBe(true);
    });

    test('removes gemini key from localStorage when server configured', async () => {
      localStorage.setItem('gemini_api_key', 'test-key');
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
        .mockResolvedValueOnce(mockResponse({ configured: true }))
        .mockResolvedValueOnce(
          mockResponse({ authenticated: true, user: { name: 'T', role: 'student', id: '1' } }),
        );
      await initServerBackend();
      expect(localStorage.getItem('gemini_api_key')).toBeNull();
    });

    test('handles gemini key check failure gracefully', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(mockResponse({ authenticated: false }));
      await expect(initServerBackend()).resolves.toBeUndefined();
    });

    test('uses contact field when email not available', async () => {
      const user = { name: 'T', contact: 'phone', role: 'student', id: '1' };
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
        .mockResolvedValueOnce(mockResponse({ configured: false }))
        .mockResolvedValueOnce(mockResponse({ authenticated: true, user }));
      await initServerBackend();
      expect(window.currentUserSession.contact).toBe('phone');
    });
  });

  describe('syncDataFromServer', () => {
    test('returns early when server is unavailable', async () => {
      globalThis.fetch.mockRejectedValue(new Error('fail'));
      await checkServerHealth();
      const result = syncDataFromServer();
      expect(result).toBeUndefined();
    });

    test('fetches and stores data from server', async () => {
      window.localData = { books: [], assignments: [], submissions: [], students: [] };
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
        .mockResolvedValueOnce(mockResponse([{ id: 'b1' }]))
        .mockResolvedValueOnce(mockResponse([{ id: 'a1' }]))
        .mockResolvedValueOnce(mockResponse([{ id: 's1' }]))
        .mockResolvedValueOnce(mockResponse([{ id: 'st1' }]));
      await checkServerHealth();
      syncDataFromServer();
      await new Promise((r) => setTimeout(r, 50));
      expect(window.localData.books).toEqual([{ id: 'b1' }]);
      expect(window.localData.assignments).toEqual([{ id: 'a1' }]);
      expect(window.localData.submissions).toEqual([{ id: 's1' }]);
      expect(window.localData.students).toEqual([{ id: 'st1' }]);
      expect(window.saveLocalData).toHaveBeenCalled();
    });

    test('handles empty data from server', async () => {
      window.localData = { books: [], assignments: [], submissions: [], students: [] };
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
        .mockResolvedValueOnce(mockResponse([]))
        .mockResolvedValueOnce(mockResponse([]))
        .mockResolvedValueOnce(mockResponse([]))
        .mockResolvedValueOnce(mockResponse([]));
      await checkServerHealth();
      syncDataFromServer();
      await new Promise((r) => setTimeout(r, 50));
      expect(window.localData.books).toEqual([]);
      expect(window.saveLocalData).toHaveBeenCalled();
    });

    test('continues on partial fetch failure', async () => {
      window.localData = { books: [], assignments: [], submissions: [], students: [] };
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse({ status: 'ok' }))
        .mockResolvedValueOnce(mockResponse([{ id: 'b1' }]))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(mockResponse([{ id: 's1' }]))
        .mockResolvedValueOnce(mockResponse([{ id: 'st1' }]));
      await checkServerHealth();
      syncDataFromServer();
      await new Promise((r) => setTimeout(r, 50));
      expect(window.localData.books).toEqual([{ id: 'b1' }]);
    });
  });
});
