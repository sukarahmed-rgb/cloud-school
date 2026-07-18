/**
 * @jest-environment node
 */

import worker from '../../worker/index.js';

let idCounter = 0;

function mockFetch(impl) {
  globalThis.fetch = jest.fn(impl);
}

function makeRequest(url, opts = {}) {
  return new Request(`http://localhost${url}`, {
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:8080',
      Cookie: '',
      ...opts.headers,
    },
    ...opts,
  });
}

function makeSessionCookie(token) {
  return `cloud_school_sid=${token}`;
}

function makeToken() {
  idCounter++;
  return `sess-${String(idCounter).padStart(12, '0')}`;
}

function createEnv(overrides = {}) {
  const defaultEnv = {
    DB: createMockDb(),
    SESSIONS: createMockKv(),
    DATA: createMockKv(),
    CONFIG: createMockKv(),
    GEMINI_API_KEY: '',
    FIREBASE_API_KEY: 'test-fb-key',
    ADMIN_INVITE_CODE: '',
    CORS_ORIGIN: 'http://localhost:8080',
  };
  return { ...defaultEnv, ...overrides };
}

function createMockDb() {
  let lastSql = '';
  let lastBindings = [];
  const mock = {
    prepare: jest.fn((sql) => {
      lastSql = sql;
      lastBindings = [];
      return mock;
    }),
    bind: jest.fn((...args) => {
      lastBindings = args;
      return mock;
    }),
    first: jest.fn().mockResolvedValue(null),
    run: jest.fn().mockResolvedValue({ success: true }),
    all: jest.fn().mockResolvedValue({ results: [] }),
    _getLastSql: () => lastSql,
    _getLastBindings: () => lastBindings,
  };
  return mock;
}

function createMockKv() {
  const store = new Map();
  return {
    _store: store,
    get: jest.fn(async (key) => store.get(key) ?? null),
    put: jest.fn(async (key, value, opts) => {
      store.set(key, value);
    }),
    delete: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
}

async function respondJson(resp) {
  return { status: resp.status, body: await resp.json(), headers: resp.headers };
}

function startServer(session) {
  const token = makeToken();
  if (session) {
    const env = createEnv();
    env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
    return { env, token };
  }
  return { env: createEnv(), token };
}

describe('Worker Routes', () => {
  const ctx = { waitUntil: jest.fn() };
  let fetchMock;

  beforeEach(() => {
    idCounter = 0;
    jest.restoreAllMocks();
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CORS (OPTIONS)', () => {
    test('returns 204 with CORS headers', async () => {
      const { env } = startServer();
      const req = new Request('http://localhost/api/health', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:8080' },
      });
      const resp = await worker.fetch(req, env, ctx);
      expect(resp.status).toBe(204);
      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8080');
      expect(resp.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('GET /api/health', () => {
    test('returns ok status', async () => {
      const { env } = startServer();
      const req = makeRequest('/api/health');
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/auth/session', () => {
    test('returns authenticated: false without cookie', async () => {
      const { env } = startServer();
      const req = makeRequest('/api/auth/session');
      const { body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(body.authenticated).toBe(false);
    });

    test('returns authenticated: true with valid session', async () => {
      const session = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: 'student',
        expiresAt: Date.now() + 999999,
      };
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      const req = makeRequest('/api/auth/session', {
        headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
      });
      const { body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(body.authenticated).toBe(true);
      expect(body.user.id).toBe('u1');
      expect(body.user.role).toBe('student');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('clears session and returns Set-Cookie', async () => {
      const token = 'test-token';
      const session = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: 'student',
        expiresAt: Date.now() + 999999,
      };
      const { env } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      const req = makeRequest('/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
      });
      const resp = await worker.fetch(req, env, ctx);
      const { body } = await respondJson(resp);
      expect(body.success).toBe(true);
      expect(resp.headers.get('Set-Cookie')).toContain('cloud_school_sid=');
      expect(resp.headers.get('Set-Cookie')).toContain('Max-Age=0');
      expect(env.SESSIONS._store.has(`sess:${token}`)).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    test('returns 401 without session', async () => {
      const { env } = startServer();
      const req = makeRequest('/api/auth/me');
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(401);
      expect(body.error).toBe('Not authenticated');
    });

    test('returns user data with session', async () => {
      const session = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: 'teacher',
        ageGroup: '13-17',
        expiresAt: Date.now() + 999999,
      };
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      const req = makeRequest('/api/auth/me', {
        headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
      });
      const { body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(body.id).toBe('u1');
      expect(body.role).toBe('teacher');
      expect(body.ageGroup).toBe('13-17');
    });
  });

  describe('POST /api/auth/firebase-login', () => {
    const fbUser = { localId: 'fb1', email: 'test@example.com', displayName: 'Test' };
    const fbResponse = { users: [fbUser] };

    test('returns 400 without idToken', async () => {
      const { env } = startServer();
      const req = makeRequest('/api/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
      });
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(400);
      expect(body.error).toBe('Firebase ID token is required');
    });

    test('creates new user on first login', async () => {
      mockFetch(() => Promise.resolve(new Response(JSON.stringify(fbResponse), { status: 200 })));
      const { env } = startServer();
      env.DB.first.mockResolvedValueOnce(null);
      env.DB.first.mockResolvedValueOnce({
        id: 'new-u1',
        data: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
        email: 'test@example.com',
        name: 'Test',
        role: 'student',
      });

      const req = makeRequest('/api/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({ idToken: 'valid-token' }),
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
      });
      const resp = await worker.fetch(req, env, ctx);
      const { status, body } = await respondJson(resp);
      expect(status).toBe(200);
      expect(body.name).toBe('Test');
      expect(resp.headers.get('Set-Cookie')).toContain('cloud_school_sid=');
      expect(env.DB.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'));
    });

    test('logs in existing user', async () => {
      mockFetch(() => Promise.resolve(new Response(JSON.stringify(fbResponse), { status: 200 })));
      const { env } = startServer();
      env.DB.first.mockResolvedValueOnce({
        id: 'existing-u1',
        data: JSON.stringify({ name: 'Existing', email: 'test@example.com' }),
        email: 'test@example.com',
        name: 'Existing',
        role: 'student',
        firebase_uid: null,
      });

      const req = makeRequest('/api/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({ idToken: 'valid-token' }),
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
      });
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(200);
      expect(body.name).toBe('Existing');
    });
  });

  describe('POST /api/auth/firebase-register', () => {
    const fbUser = { localId: 'fb1', email: 'new@example.com', displayName: 'NewUser' };
    const fbResponse = { users: [fbUser] };

    test('returns 400 without idToken', async () => {
      const { env } = startServer();
      const req = makeRequest('/api/auth/firebase-register', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
      });
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(400);
    });

    test('registers new user', async () => {
      mockFetch(() => Promise.resolve(new Response(JSON.stringify(fbResponse), { status: 200 })));
      const { env } = startServer();
      env.DB.first.mockResolvedValueOnce(null);
      env.DB.first.mockResolvedValueOnce({
        id: 'new-u2',
        data: JSON.stringify({}),
        email: 'new@example.com',
        name: 'NewUser',
        role: 'student',
      });

      const req = makeRequest('/api/auth/firebase-register', {
        method: 'POST',
        body: JSON.stringify({ idToken: 'valid-token', name: 'NewUser', role: 'student' }),
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
      });
      const resp = await worker.fetch(req, env, ctx);
      const { status, body } = await respondJson(resp);
      expect(status).toBe(201);
      expect(resp.headers.get('Set-Cookie')).toContain('cloud_school_sid=');
    });

    test('returns 409 if email already registered', async () => {
      mockFetch(() => Promise.resolve(new Response(JSON.stringify(fbResponse), { status: 200 })));
      const { env } = startServer();
      env.DB.first.mockResolvedValueOnce({ id: 'existing' });

      const req = makeRequest('/api/auth/firebase-register', {
        method: 'POST',
        body: JSON.stringify({ idToken: 'valid-token', name: 'Dup', role: 'student' }),
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
      });
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(409);
      expect(body.error).toContain('already registered');
    });
  });

  describe('GET /api/admin/gemini-key', () => {
    test('returns configured: false when no key', async () => {
      const session = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: 'admin',
        expiresAt: Date.now() + 999999,
      };
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      const req = makeRequest('/api/admin/gemini-key', {
        headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
      });
      const { body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(body.configured).toBe(false);
    });

    test('returns 401 without auth', async () => {
      const { env } = startServer();
      const req = makeRequest('/api/admin/gemini-key');
      const { status } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(401);
    });
  });

  describe('POST /api/admin/gemini-key', () => {
    test('teacher can update the key', async () => {
      const session = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: 'teacher',
        expiresAt: Date.now() + 999999,
      };
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      const req = makeRequest('/api/admin/gemini-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'abc123' }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: makeSessionCookie(token),
          Origin: 'http://localhost:8080',
        },
      });
      const { body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(body.success).toBe(true);
      expect(env.CONFIG._store.get('gemini_key')).toBe('abc123');
    });

    test('student cannot update the key', async () => {
      const session = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: 'student',
        expiresAt: Date.now() + 999999,
      };
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      const req = makeRequest('/api/admin/gemini-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'abc123' }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: makeSessionCookie(token),
          Origin: 'http://localhost:8080',
        },
      });
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(403);
    });
  });

  describe('Data CRUD', () => {
    const now = Date.now() + 999999;
    const adminSession = {
      userId: 'a1',
      email: 'admin@x.com',
      name: 'Admin',
      role: 'admin',
      expiresAt: now,
    };
    const studentSession = {
      userId: 's1',
      email: 'stu@x.com',
      name: 'Stu',
      role: 'student',
      expiresAt: now,
    };
    const teacherSession = {
      userId: 't1',
      email: 'tch@x.com',
      name: 'Tch',
      role: 'teacher',
      expiresAt: now,
    };

    describe('GET /api/data/:collection (list)', () => {
      test('admin can list all items', async () => {
        const { env, token } = startServer(adminSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(adminSession));
        env.DB.all.mockResolvedValueOnce({
          results: [{ id: 'm1', data: JSON.stringify({ title: 'Math' }), created_by: 'a1' }],
        });
        const req = makeRequest('/api/data/curriculum_modules', {
          headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
        });
        const { body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(1);
        expect(body[0].title).toBe('Math');
      });

      test('student gets 403 for students collection', async () => {
        const { env, token } = startServer(studentSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(studentSession));
        const req = makeRequest('/api/data/students', {
          headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
        });
        const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(403);
      });

      test('returns error for unknown collection', async () => {
        const { env, token } = startServer(adminSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(adminSession));
        const req = makeRequest('/api/data/secret_stuff', {
          headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
        });
        const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(400);
        expect(body.error).toBe('Unknown collection');
      });
    });

    describe('GET /api/data/:collection/:id (single)', () => {
      test('returns item when found', async () => {
        const { env, token } = startServer(teacherSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(teacherSession));
        env.DB.first.mockResolvedValueOnce({
          id: 'm1',
          data: JSON.stringify({ title: 'Physics' }),
          created_by: 't1',
        });
        const req = makeRequest('/api/data/curriculum_modules/m1', {
          headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
        });
        const { body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(body.title).toBe('Physics');
      });

      test('returns 404 when not found', async () => {
        const { env, token } = startServer(teacherSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(teacherSession));
        const req = makeRequest('/api/data/curriculum_modules/nonexist', {
          headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
        });
        const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(404);
      });
    });

    describe('POST /api/data/:collection (create)', () => {
      test('teacher can create curriculum module', async () => {
        const { env, token } = startServer(teacherSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(teacherSession));
        env.DB.first.mockResolvedValueOnce({ total: 5 });
        env.DB.first.mockResolvedValueOnce({
          id: 'new-m1',
          data: JSON.stringify({ title: 'NewModule' }),
          created_by: 't1',
        });
        const req = makeRequest('/api/data/curriculum_modules', {
          method: 'POST',
          body: JSON.stringify({ title: 'NewModule', content: 'stuff' }),
          headers: {
            'Content-Type': 'application/json',
            Cookie: makeSessionCookie(token),
            Origin: 'http://localhost:8080',
          },
        });
        const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(201);
      });

      test('student cannot create curriculum module', async () => {
        const { env, token } = startServer(studentSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(studentSession));
        const req = makeRequest('/api/data/curriculum_modules', {
          method: 'POST',
          body: JSON.stringify({ title: 'NewModule' }),
          headers: {
            'Content-Type': 'application/json',
            Cookie: makeSessionCookie(token),
            Origin: 'http://localhost:8080',
          },
        });
        const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(403);
      });

      test('student cannot create exam_results (writeOwn-only, no write)', async () => {
        const { env, token } = startServer(studentSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(studentSession));
        const req = makeRequest('/api/data/exam_results', {
          method: 'POST',
          body: JSON.stringify({ answers: ['a'] }),
          headers: {
            'Content-Type': 'application/json',
            Cookie: makeSessionCookie(token),
            Origin: 'http://localhost:8080',
          },
        });
        const { status } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(403);
      });

      test('rejects mutation from invalid origin', async () => {
        const { env, token } = startServer(teacherSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(teacherSession));
        const req = makeRequest('/api/data/curriculum_modules', {
          method: 'POST',
          body: JSON.stringify({ title: 'X' }),
          headers: {
            'Content-Type': 'application/json',
            Cookie: makeSessionCookie(token),
            Origin: 'https://evil.com',
          },
        });
        const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(403);
        expect(body.error).toBe('Forbidden');
      });
    });

    describe('PUT /api/data/:collection/:id (update)', () => {
      test('teacher can update own item', async () => {
        const { env, token } = startServer(teacherSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(teacherSession));
        env.DB.first.mockResolvedValueOnce({
          id: 'm1',
          data: JSON.stringify({ title: 'Old' }),
          created_by: 't1',
        });
        env.DB.first.mockResolvedValueOnce({
          id: 'm1',
          data: JSON.stringify({ title: 'Updated' }),
          created_by: 't1',
        });
        const req = makeRequest('/api/data/curriculum_modules/m1', {
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated' }),
          headers: {
            'Content-Type': 'application/json',
            Cookie: makeSessionCookie(token),
            Origin: 'http://localhost:8080',
          },
        });
        const { body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(body.title).toBe('Updated');
      });

      test('student cannot update others submission', async () => {
        const { env, token } = startServer(studentSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(studentSession));
        env.DB.first.mockResolvedValueOnce({
          id: 'sub1',
          data: JSON.stringify({ content: 'x' }),
          created_by: 's2',
        });
        const req = makeRequest('/api/data/submissions/sub1', {
          method: 'PUT',
          body: JSON.stringify({ content: 'y' }),
          headers: {
            'Content-Type': 'application/json',
            Cookie: makeSessionCookie(token),
            Origin: 'http://localhost:8080',
          },
        });
        const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(403);
      });
    });

    describe('DELETE /api/data/:collection/:id', () => {
      test('admin can delete any item', async () => {
        const { env, token } = startServer(adminSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(adminSession));
        env.DB.first.mockResolvedValueOnce({ id: 'm1', data: '{}', created_by: 't1' });
        const req = makeRequest('/api/data/curriculum_modules/m1', {
          method: 'DELETE',
          headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
        });
        const { body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(body.success).toBe(true);
      });

      test('returns 404 for missing item', async () => {
        const { env, token } = startServer(adminSession);
        env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(adminSession));
        const req = makeRequest('/api/data/curriculum_modules/nonexist', {
          method: 'DELETE',
          headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
        });
        const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
        expect(status).toBe(404);
      });
    });
  });

  describe('Gemini Proxy', () => {
    const session = {
      userId: 'u1',
      email: 'a@b.com',
      name: 'A',
      role: 'student',
      expiresAt: Date.now() + 999999,
    };

    test('POST /api/gemini/text returns cached response', async () => {
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      env.GEMINI_API_KEY = 'test-gemini-key';
      env.DB.first.mockResolvedValueOnce({
        response: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'cached' }] } }] }),
      });

      const req = makeRequest('/api/gemini/text', {
        method: 'POST',
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hello' }] }] }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: makeSessionCookie(token),
          Origin: 'http://localhost:8080',
        },
      });
      const { body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(body.candidates[0].content.parts[0].text).toBe('cached');
    });

    test('POST /api/gemini/text proxies to Gemini API', async () => {
      const geminiBody = { candidates: [{ content: { parts: [{ text: 'hello back' }] } }] };
      mockFetch(() => Promise.resolve(new Response(JSON.stringify(geminiBody), { status: 200 })));
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      env.GEMINI_API_KEY = 'test-gemini-key';
      env.DB.first.mockResolvedValueOnce(null);

      const req = makeRequest('/api/gemini/text', {
        method: 'POST',
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: makeSessionCookie(token),
          Origin: 'http://localhost:8080',
        },
      });
      const { body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(body.candidates[0].content.parts[0].text).toBe('hello back');
    });

    test('returns 400 for unknown model', async () => {
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      env.GEMINI_API_KEY = 'key';
      const req = makeRequest('/api/gemini/unknown-model', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          Cookie: makeSessionCookie(token),
          Origin: 'http://localhost:8080',
        },
      });
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(400);
      expect(body.error).toBe('Unknown model');
    });
  });

  describe('404 handling', () => {
    test('returns 404 for unknown route', async () => {
      const { env } = startServer();
      const req = makeRequest('/api/unknown');
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(404);
      expect(body.error).toBe('Not found');
    });
  });

  describe('Rate Limiting', () => {
    test('returns 429 when rate limit exceeded', async () => {
      const session = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: 'admin',
        expiresAt: Date.now() + 999999,
      };
      const { env, token } = startServer(session);
      env.SESSIONS._store.set(`sess:${token}`, JSON.stringify(session));
      const windowKey = Math.floor(Math.floor(Date.now() / 1000) / 60);
      env.DATA._store.set(`ratelimit:gen:${token}:${windowKey}`, '60');

      const req = makeRequest('/api/auth/me', {
        headers: { Cookie: makeSessionCookie(token), Origin: 'http://localhost:8080' },
      });
      const { status, body } = await respondJson(await worker.fetch(req, env, ctx));
      expect(status).toBe(429);
      expect(body.error).toContain('Rate limit');
    });
  });

  describe('CORS on all responses', () => {
    test('every response has CORS headers', async () => {
      const { env } = startServer();
      const req = makeRequest('/api/health', { headers: { Origin: 'http://localhost:8080' } });
      const resp = await worker.fetch(req, env, ctx);
      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8080');
    });
  });
});
