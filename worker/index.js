const SESSION_COOKIE = 'cloud_school_sid';
const SESSION_TTL = 86400;
const ALLOWED_COLLECTIONS = new Set([
  'curriculum_modules', 'assignments', 'submissions', 'students', 'notifications', 'exam_results'
]);

// Role-based access: who can read/write each collection
const COLLECTION_PERMISSIONS = {
  curriculum_modules: { read: ['student','teacher','admin','parent'], write: ['teacher','admin'] },
  assignments:        { read: ['student','teacher','admin','parent'], write: ['teacher','admin'] },
  submissions:        { read: ['teacher','admin','parent'], writeOwn: ['student'], write: ['teacher','admin'] },
  students:           { read: ['teacher','admin'],                   write: ['teacher','admin'] },
  notifications:      { read: ['student','teacher','admin','parent'], write: ['admin'] },
  exam_results:       { read: ['teacher','admin','parent'], writeOwn: ['student'], write: ['teacher','admin'] },
};
const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_GEMINI_MAX = 10;
const MAX_BODY_SIZE = 65536;
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_ITEMS = 2000;
const MODELS = {
  text: 'gemini-2.5-flash-preview-09-2025',
  vision: 'gemini-2.5-flash-preview-09-2025',
  tts: 'gemini-2.5-flash-preview-tts',
  transcribe: 'gemini-2.5-flash-preview-09-2025',
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || 'https://cloud-school-6251a.web.app',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const [key, ...val] = pair.trim().split('=');
    if (key) cookies[key.trim()] = decodeURIComponent(val.join('='));
  });
  return cookies;
}

function setCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join('; ');
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"'`]/g, '').trim().slice(0, MAX_STRING_LENGTH);
}

function generateId() {
  return crypto.randomUUID();
}

function stripMetaFields(obj) {
  const safe = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('_') && key !== 'id') {
      safe[key] = typeof value === 'string' ? value.slice(0, MAX_STRING_LENGTH) : value;
    }
  }
  return safe;
}

async function verifyFirebaseToken(idToken, apiKey) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    throw new Error('Firebase token verification failed');
  }
  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    throw new Error('No Firebase user found');
  }
  return data.users[0];
}

async function checkRateLimit(env, key, max, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(now / windowSec);
  const rateKey = `ratelimit:${key}:${windowKey}`;
  const current = await env.DATA.get(rateKey);
  const count = current ? Number(current) : 0;
  if (count >= max) return false;
  await env.DATA.put(rateKey, String(count + 1), { expirationTtl: windowSec * 2 });
  return true;
}

async function safeReadCollection(env, name) {
  try {
    const raw = await env.DATA.get(`col:${name}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

async function safeWriteCollection(env, name, data) {
  try {
    await env.DATA.put(`col:${name}`, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

async function safeGetSession(env, token) {
  if (!token) return null;
  try {
    const raw = await env.SESSIONS.get(`sess:${token}`);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt < Date.now()) {
      await env.SESSIONS.delete(`sess:${token}`);
      return null;
    }
    return session;
  } catch (err) {
    return null;
  }
}

async function acquireLock(env, name, ttl = 5) {
  const lockKey = `lock:col:${name}`;
  const locked = await env.DATA.get(lockKey);
  if (locked === '1') return false;
  await env.DATA.put(lockKey, '1', { expirationTtl: ttl });
  return true;
}

async function releaseLock(env, name) {
  try {
    await env.DATA.delete(`lock:col:${name}`);
  } catch (_) {}
}

async function withCollectionLock(env, name, fn, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (await acquireLock(env, name)) {
      try {
        const data = await safeReadCollection(env, name);
        const result = await fn(data);
        if (result !== null) {
          const wrote = await safeWriteCollection(env, name, result);
          return wrote ? result : null;
        }
        return null;
      } finally {
        await releaseLock(env, name);
      }
    }
    await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const corsOrigin = env.CORS_ORIGIN || 'https://cloud-school-6251a.web.app';
    const cors = corsHeaders(corsOrigin);

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    async function requireAuth() {
      const cookies = parseCookies(request.headers.get('Cookie'));
      return await safeGetSession(env, cookies[SESSION_COOKIE]);
    }

    function respond(data, status = 200) {
      const resp = json(data, status);
      for (const [key, value] of Object.entries(cors)) {
        resp.headers.set(key, value);
      }
      return resp;
    }

    function rateLimitKey(req) {
      const cookies = parseCookies(req.headers.get('Cookie'));
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      const session = cookies[SESSION_COOKIE] || ip;
      return session.slice(0, 64);
    }

    // ====== Health Check (no rate limit) ======
    if (path === '/api/health' && method === 'GET') {
      return respond({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Rate limiting for general endpoints
    const rlKey = rateLimitKey(request);
    if (!(await checkRateLimit(env, 'gen:' + rlKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW))) {
      return respond({ error: 'Rate limit exceeded. Try again later.' }, 429);
    }

    // ====== Auth Routes ======
    if (path === '/api/auth/session' && method === 'GET') {
      const session = await requireAuth();
      if (!session) return respond({ authenticated: false });
      return respond({
        authenticated: true,
        user: { id: session.userId, email: session.email, name: session.name, role: session.role },
      });
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      const cookies = parseCookies(request.headers.get('Cookie'));
      const token = cookies[SESSION_COOKIE];
      if (token) await env.SESSIONS.delete(`sess:${token}`);
      const resp = respond({ success: true });
      resp.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
      return resp;
    }

    if (path === '/api/auth/me' && method === 'GET') {
      const session = await requireAuth();
      if (!session) return respond({ error: 'Not authenticated' }, 401);
      return respond({
        id: session.userId, email: session.email,
        name: session.name, role: session.role, ageGroup: session.ageGroup,
      });
    }

    if (path === '/api/auth/firebase-login' && method === 'POST') {
      try {
        let body;
        try { body = await request.json(); } catch { return respond({ error: 'Invalid JSON' }, 400); }
        const { idToken } = body;
        if (!idToken || typeof idToken !== 'string') {
          return respond({ error: 'Firebase ID token is required' }, 400);
        }
        const apiKey = env.FIREBASE_API_KEY || '';
        const fbUser = await verifyFirebaseToken(idToken, apiKey);
        const email = (fbUser.email || '').toLowerCase();

        let loginResult = await withCollectionLock(env, 'users', async (users) => {
          let user = users.find(u => u.email === email || u.firebaseUid === fbUser.localId);
          if (!user) {
            user = {
              id: generateId(),
              firebaseUid: fbUser.localId,
              email,
              name: fbUser.displayName || email.split('@')[0] || 'User',
              role: 'student',
              ageGroup: '7-12',
              parentContact: '',
              createdAt: new Date().toISOString(),
            };
            users.push(user);
          } else if (!user.firebaseUid) {
            user.firebaseUid = fbUser.localId;
          }
          return users;
        });

        if (!loginResult) return respond({ error: 'Failed to process login' }, 500);

        // Re-read user after lock to get the latest
        const users = await safeReadCollection(env, 'users');
        let user = users.find(u => u.email === email || u.firebaseUid === fbUser.localId);
        if (!user) return respond({ error: 'User not found after registration' }, 500);

        const { token } = await (async () => {
          const t = generateId();
          const session = {
            userId: user.id, email: user.email, name: user.name,
            role: user.role || 'student', ageGroup: user.ageGroup || '7-12',
            createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL * 1000,
          };
          await env.SESSIONS.put(`sess:${t}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
          return { token: t, session };
        })();

        const resp = respond({
          id: user.id, email: user.email, name: user.name,
          role: user.role, ageGroup: user.ageGroup,
        });
        resp.headers.append('Set-Cookie', setCookie(SESSION_COOKIE, token, {
          httpOnly: true, sameSite: 'none', secure: true, path: '/', maxAge: SESSION_TTL,
        }));
        return resp;
      } catch (err) {
        return respond({ error: 'Firebase authentication failed' }, 401);
      }
    }

    if (path === '/api/auth/firebase-register' && method === 'POST') {
      try {
        let body;
        try { body = await request.json(); } catch { return respond({ error: 'Invalid JSON' }, 400); }
        const { idToken, name, role, age, parentContact, adminInviteCode } = body;
        if (!idToken || typeof idToken !== 'string') {
          return respond({ error: 'Firebase ID token is required' }, 400);
        }
        const apiKey = env.FIREBASE_API_KEY || '';
        const fbUser = await verifyFirebaseToken(idToken, apiKey);
        const email = (fbUser.email || '').toLowerCase();
        const displayName = sanitizeString(name || fbUser.displayName || email.split('@')[0] || 'User');
        const userRole = (() => {
          const allowed = ['student', 'teacher', 'parent'];
          if (role === 'admin' && adminInviteCode && adminInviteCode === env.ADMIN_INVITE_CODE) return 'admin';
          return allowed.includes(role) ? role : 'student';
        })();

        let registered = await withCollectionLock(env, 'users', async (users) => {
          if (users.some(u => u.email === email)) return null;
          const newUser = {
            id: generateId(),
            firebaseUid: fbUser.localId,
            email,
            name: displayName,
            role: userRole,
            ageGroup: age ? (age + '-17') : '7-12',
            parentContact: sanitizeString(parentContact || ''),
            createdAt: new Date().toISOString(),
          };
          users.push(newUser);
          return users;
        });

        if (!registered) {
          return respond({ error: 'Email already registered or registration failed' }, 409);
        }

        // Re-read to get the actual user
        const userList = await safeReadCollection(env, 'users');
        const user = userList.find(u => u.email === email);
        if (!user) return respond({ error: 'Registration failed' }, 500);

        const { token } = await (async () => {
          const t = generateId();
          const session = {
            userId: user.id, email: user.email, name: user.name,
            role: user.role || 'student', ageGroup: user.ageGroup || '7-12',
            createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL * 1000,
          };
          await env.SESSIONS.put(`sess:${t}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
          return { token: t, session };
        })();

        const resp = respond({
          id: user.id, email: user.email, name: user.name,
          role: user.role, ageGroup: user.ageGroup,
        }, 201);
        resp.headers.append('Set-Cookie', setCookie(SESSION_COOKIE, token, {
          httpOnly: true, sameSite: 'none', secure: true, path: '/', maxAge: SESSION_TTL,
        }));
        return resp;
      } catch (err) {
        return respond({ error: 'Firebase registration failed' }, 401);
      }
    }

    // ====== Gemini Admin Routes ======
    if (path === '/api/admin/gemini-key' && method === 'GET') {
      const session = await requireAuth();
      if (!session) return respond({ error: 'Not authenticated' }, 401);
      const configured = !!(env.GEMINI_API_KEY || await env.CONFIG.get('gemini_key'));
      return respond({ configured });
    }

    if (path === '/api/admin/gemini-key' && method === 'POST') {
      const session = await requireAuth();
      if (!session) return respond({ error: 'Not authenticated' }, 401);
      if (session.role !== 'teacher' && session.role !== 'admin') {
        return respond({ error: 'Only teachers and admins can update the API key' }, 403);
      }
      let body;
      try { body = await request.json(); } catch { return respond({ error: 'Invalid JSON' }, 400); }
      const { apiKey } = body;
      if (!apiKey || typeof apiKey !== 'string') {
        return respond({ error: 'API key is required' }, 400);
      }
      await env.CONFIG.put('gemini_key', apiKey.replace(/[^a-zA-Z0-9_-]/g, ''));
      return respond({ success: true });
    }

    // ====== Data CRUD Routes ======
    const dataMatch = path.match(/^\/api\/data\/([^/]+)(?:\/([^/]+))?$/);
    if (dataMatch) {
      const session = await requireAuth();
      if (!session) return respond({ error: 'Not authenticated' }, 401);
      const collection = dataMatch[1];
      const id = dataMatch[2];
      if (!ALLOWED_COLLECTIONS.has(collection)) {
        return respond({ error: 'Unknown collection' }, 400);
      }

      const perms = COLLECTION_PERMISSIONS[collection];
      const role = session.role;

      function canRead() { return perms.read.includes(role); }
      function canWrite(item) {
        if (perms.write.includes(role)) return true;
        if (perms.writeOwn && perms.writeOwn.includes(role) && item) {
          return item.studentId === session.userId || item._createdBy === session.userId;
        }
        return false;
      }

      // List collection
      if (!id && method === 'GET') {
        if (!canRead()) return respond({ error: 'Forbidden' }, 403);
        const data = await safeReadCollection(env, collection);
        // Filter for writeOwn roles: only return own items
        if (perms.writeOwn && perms.writeOwn.includes(role) && !perms.write.includes(role)) {
          return respond(data.filter(d => d.studentId === session.userId || d._createdBy === session.userId));
        }
        // Filter for parent: only return items belonging to linked children
        if (role === 'parent' && (collection === 'submissions' || collection === 'exam_results')) {
          const users = await safeReadCollection(env, 'users');
          const parent = users.find(u => u.id === session.userId);
          const childIds = users.filter(u => u.parentContact === parent?.email).map(u => u.id);
          return respond(data.filter(d => childIds.includes(d.studentId)));
        }
        return respond(data);
      }
      // Get single item
      if (id && method === 'GET') {
        if (!canRead()) return respond({ error: 'Forbidden' }, 403);
        const data = await safeReadCollection(env, collection);
        const item = data.find(d => d.id === id || d._id === id);
        if (!item) return respond({ error: 'Item not found' }, 404);
        if (!canWrite(item) && !canRead()) return respond({ error: 'Forbidden' }, 403);
        return respond(item);
      }
      // Create item with lock
      if (!id && method === 'POST') {
        if (!canWrite(null)) return respond({ error: 'Forbidden' }, 403);
        let body;
        try { body = await request.json(); } catch { return respond({ error: 'Invalid JSON' }, 400); }
        const safeBody = stripMetaFields(body);

        let result = await withCollectionLock(env, collection, async (data) => {
          if (data.length >= MAX_ARRAY_ITEMS) return null;
          const newItem = {
            ...safeBody,
            id: generateId(),
            _createdBy: session.userId,
            _createdAt: new Date().toISOString(),
          };
          data.push(newItem);
          return data;
        });

        if (!result) {
          if ((await safeReadCollection(env, collection)).length >= MAX_ARRAY_ITEMS) {
            return respond({ error: 'Collection size limit exceeded' }, 413);
          }
          return respond({ error: 'Failed to create item' }, 500);
        }

        const items = await safeReadCollection(env, collection);
        const created = items[items.length - 1];
        return respond(created, 201);
      }
      // Update item with lock
      if (id && method === 'PUT') {
        let body;
        try { body = await request.json(); } catch { return respond({ error: 'Invalid JSON' }, 400); }
        const safeBody = stripMetaFields(body);

        let result = await withCollectionLock(env, collection, async (data) => {
          const idx = data.findIndex(d => d.id === id || d._id === id);
          if (idx === -1) return null;
          if (!canWrite(data[idx])) return null;
          data[idx] = {
            ...data[idx],
            ...safeBody,
            id: data[idx].id,
            _updatedBy: session.userId,
            _updatedAt: new Date().toISOString(),
            _createdBy: data[idx]._createdBy,
            _createdAt: data[idx]._createdAt,
          };
          return data;
        });

        if (!result) {
          const existing = await safeReadCollection(env, collection);
          if (!existing.find(d => d.id === id || d._id === id)) {
            return respond({ error: 'Item not found' }, 404);
          }
          return respond({ error: 'Forbidden or update failed' }, 403);
        }

        const items = await safeReadCollection(env, collection);
        const updated = items.find(d => d.id === id || d._id === id);
        return respond(updated);
      }
      // Delete item with lock
      if (id && method === 'DELETE') {
        let result = await withCollectionLock(env, collection, async (data) => {
          const idx = data.findIndex(d => d.id === id || d._id === id);
          if (idx === -1) return null;
          if (!canWrite(data[idx])) { return 'forbidden'; }
          data.splice(idx, 1);
          return data;
        });

        if (!result) return respond({ error: 'Item not found' }, 404);
        if (result === 'forbidden') return respond({ error: 'Forbidden' }, 403);
        return respond({ success: true });
      }
    }

    // ====== Gemini Proxy (Authenticated) ======
    if (path.startsWith('/api/gemini/') && method === 'POST') {
      // Apply stricter rate limit for Gemini
      if (!(await checkRateLimit(env, 'gemini:' + rlKey, RATE_LIMIT_GEMINI_MAX, RATE_LIMIT_WINDOW))) {
        return respond({ error: 'Rate limit exceeded for AI requests. Try again later.' }, 429);
      }

      // Require authentication
      const session = await requireAuth();
      if (!session) return respond({ error: 'Authentication required to use AI features' }, 401);

      let apiKey = env.GEMINI_API_KEY || await env.CONFIG.get('gemini_key');
      if (!apiKey) {
        return respond({ error: 'Gemini API key is not configured on the server.' }, 400);
      }
      const modelName = path.replace('/api/gemini/', '');
      const model = MODELS[modelName];
      if (!model)         return respond({ error: 'Unknown model' }, 400);
      try {
        const body = await request.json();
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const geminiResp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await geminiResp.json();
        const resp = json(data, geminiResp.status);
        for (const [key, value] of Object.entries(cors)) {
          resp.headers.set(key, value);
        }
        return resp;
      } catch (err) {
        return respond({ error: 'Failed to reach Gemini API' }, 502);
      }
    }

    return respond({ error: 'Not found' }, 404);
  },
};
