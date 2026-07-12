const SESSION_COOKIE = 'cloud_school_sid';
const SESSION_TTL = 86400; // 24 hours (seconds for KV TTL)
const ALLOWED_COLLECTIONS = new Set([
  'curriculum_modules', 'assignments', 'submissions', 'students', 'notifications', 'exam_results'
]);
const MODELS = {
  text: 'gemini-2.5-flash-preview-09-2025',
  vision: 'gemini-2.5-flash-preview-09-2025',
  tts: 'gemini-2.5-flash-preview-tts',
  transcribe: 'gemini-2.5-flash-preview-09-2025',
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
  return `${name}=; Path=/; HttpOnly; Max-Age=0`;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"'`]/g, '').trim();
}

function generateId() {
  return crypto.randomUUID();
}

async function verifyFirebaseToken(idToken, apiKey) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error('Firebase token verification failed: ' + err);
  }
  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    throw new Error('No Firebase user found');
  }
  return data.users[0];
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get('Origin') || '';
    const corsOrigin = env.CORS_ORIGIN || 'https://cloud-school-6251a.web.app';
    const cors = corsHeaders(corsOrigin);

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Helper: get session
    async function getSession(token) {
      if (!token) return null;
      const raw = await env.SESSIONS.get(`sess:${token}`);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session.expiresAt < Date.now()) {
        await env.SESSIONS.delete(`sess:${token}`);
        return null;
      }
      return session;
    }

    // Helper: create session
    async function createSession(user) {
      const token = generateId();
      const session = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'student',
        ageGroup: user.ageGroup || '7-12',
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL * 1000,
      };
      await env.SESSIONS.put(`sess:${token}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
      return { token, session };
    }

    // Helper: require auth
    async function requireAuth() {
      const cookies = parseCookies(request.headers.get('Cookie'));
      const session = await getSession(cookies[SESSION_COOKIE]);
      if (!session) return null;
      return session;
    }

    // Helper: read collection
    async function readCollection(name) {
      const raw = await env.DATA.get(`col:${name}`);
      return raw ? JSON.parse(raw) : [];
    }

    // Helper: write collection
    async function writeCollection(name, data) {
      await env.DATA.put(`col:${name}`, JSON.stringify(data));
    }

    // Build response with CORS
    function respond(data, status = 200) {
      const resp = json(data, status);
      for (const [key, value] of Object.entries(cors)) {
        resp.headers.set(key, value);
      }
      return resp;
    }

    // ====== Health Check ======
    if (path === '/api/health' && method === 'GET') {
      return respond({ status: 'ok', timestamp: new Date().toISOString(), env: 'cloudflare' });
    }

    // ====== Auth Routes ======
    if (path === '/api/auth/session' && method === 'GET') {
      const cookies = parseCookies(request.headers.get('Cookie'));
      const session = await getSession(cookies[SESSION_COOKIE]);
      if (!session) return respond({ authenticated: false });
      return respond({
        authenticated: true,
        user: {
          id: session.userId, email: session.email,
          name: session.name, role: session.role,
        },
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
        const { idToken } = await request.json();
        if (!idToken || typeof idToken !== 'string') {
          return respond({ error: 'Firebase ID token is required' }, 400);
        }
        const apiKey = env.FIREBASE_API_KEY || '';
        const fbUser = await verifyFirebaseToken(idToken, apiKey);
        const email = (fbUser.email || '').toLowerCase();
        const users = await readCollection('users');
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
          await writeCollection('users', users);
        } else if (!user.firebaseUid) {
          user.firebaseUid = fbUser.localId;
          await writeCollection('users', users);
        }
        const { token } = await createSession(user);
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
        const { idToken, name, role, age, parentContact } = await request.json();
        if (!idToken || typeof idToken !== 'string') {
          return respond({ error: 'Firebase ID token is required' }, 400);
        }
        const apiKey = env.FIREBASE_API_KEY || '';
        const fbUser = await verifyFirebaseToken(idToken, apiKey);
        const email = (fbUser.email || '').toLowerCase();
        const displayName = name || fbUser.displayName || email.split('@')[0] || 'User';
        const userRole = ['student', 'teacher', 'parent', 'admin'].includes(role) ? role : 'student';
        const users = await readCollection('users');
        if (users.some(u => u.email === email)) {
          return respond({ error: 'Email already registered' }, 409);
        }
        const user = {
          id: generateId(),
          firebaseUid: fbUser.localId,
          email,
          name: sanitizeString(displayName),
          role: userRole,
          ageGroup: age ? (age + '-17') : '7-12',
          parentContact: sanitizeString(parentContact || ''),
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        await writeCollection('users', users);
        const { token } = await createSession(user);
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
      const { apiKey } = await request.json();
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
        return respond({ error: `Unknown collection: ${collection}` }, 400);
      }

      // List collection
      if (!id && method === 'GET') {
        const data = await readCollection(collection);
        return respond(data);
      }
      // Get single item
      if (id && method === 'GET') {
        const data = await readCollection(collection);
        const item = data.find(d => d.id === id || d._id === id);
        if (!item) return respond({ error: 'Item not found' }, 404);
        return respond(item);
      }
      // Create item
      if (!id && method === 'POST') {
        const body = await request.json();
        const data = await readCollection(collection);
        const newItem = {
          ...body,
          id: body.id || generateId(),
          _createdBy: session.userId,
          _createdAt: new Date().toISOString(),
        };
        data.push(newItem);
        await writeCollection(collection, data);
        return respond(newItem, 201);
      }
      // Update item
      if (id && method === 'PUT') {
        const body = await request.json();
        const data = await readCollection(collection);
        const idx = data.findIndex(d => d.id === id || d._id === id);
        if (idx === -1) return respond({ error: 'Item not found' }, 404);
        data[idx] = {
          ...data[idx],
          ...body,
          id: data[idx].id,
          _updatedBy: session.userId,
          _updatedAt: new Date().toISOString(),
          _createdBy: data[idx]._createdBy,
          _createdAt: data[idx]._createdAt,
        };
        await writeCollection(collection, data);
        return respond(data[idx]);
      }
      // Delete item
      if (id && method === 'DELETE') {
        const data = await readCollection(collection);
        const idx = data.findIndex(d => d.id === id || d._id === id);
        if (idx === -1) return respond({ error: 'Item not found' }, 404);
        data.splice(idx, 1);
        await writeCollection(collection, data);
        return respond({ success: true });
      }
    }

    // ====== Gemini Proxy ======
    if (path.startsWith('/api/gemini/') && method === 'POST') {
      let apiKey = env.GEMINI_API_KEY || await env.CONFIG.get('gemini_key');
      if (!apiKey) {
        return respond({ error: 'Gemini API key is not configured on the server.' }, 400);
      }
      const modelName = path.replace('/api/gemini/', '');
      const model = MODELS[modelName];
      if (!model) return respond({ error: `Unknown model: ${modelName}` }, 400);
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
        return respond({ error: 'Failed to reach Gemini API', details: err.message }, 502);
      }
    }

    // ====== 404 ======
    return respond({ error: 'Not found' }, 404);
  },
};
