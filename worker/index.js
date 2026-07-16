const SESSION_COOKIE = 'cloud_school_sid';
const SESSION_TTL = 86400;
const ALLOWED_COLLECTIONS = new Set([
  'curriculum_modules',
  'assignments',
  'submissions',
  'students',
  'notifications',
  'exam_results',
]);
const COLLECTION_PERMISSIONS = {
  curriculum_modules: {
    read: ['student', 'teacher', 'admin', 'parent'],
    write: ['teacher', 'admin'],
  },
  assignments: { read: ['student', 'teacher', 'admin', 'parent'], write: ['teacher', 'admin'] },
  submissions: {
    read: ['teacher', 'admin', 'parent'],
    writeOwn: ['student'],
    write: ['teacher', 'admin'],
  },
  students: { read: ['teacher', 'admin'], write: ['teacher', 'admin'] },
  notifications: { read: ['student', 'teacher', 'admin', 'parent'], write: ['admin'] },
  exam_results: {
    read: ['teacher', 'admin', 'parent'],
    writeOwn: ['student'],
    write: ['teacher', 'admin'],
  },
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

const TABLE_MAP = {
  curriculum_modules: 'curriculum_modules',
  assignments: 'assignments',
  submissions: 'submissions',
  students: 'students',
  notifications: 'notifications',
  exam_results: 'exam_results',
  users: 'users',
};

// Common typed columns per table (subsets of the body keys to extract)
const EXTRACT_COLUMNS = {
  curriculum_modules: ['title', 'subject', 'grade_level'],
  assignments: ['title', 'subject', 'grade_level'],
  submissions: ['assignment_id', 'student_id', 'student_name', 'status'],
  students: ['name', 'email', 'parent_email', 'grade_level', 'age_group'],
  notifications: ['title', 'category', 'is_read'],
  exam_results: ['student_id', 'exam_title', 'score', 'total'],
  users: ['firebase_uid', 'email', 'name', 'role', 'age_group', 'parent_contact'],
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
  (header || '').split(';').forEach((pair) => {
    const [key, ...val] = pair.trim().split('=');
    if (key) {
      cookies[key.trim()] = decodeURIComponent(val.join('='));
    }
  });
  return cookies;
}

function setCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.httpOnly) {
    parts.push('HttpOnly');
  }
  if (opts.secure) {
    parts.push('Secure');
  }
  if (opts.sameSite) {
    parts.push(`SameSite=${opts.sameSite}`);
  }
  if (opts.path) {
    parts.push(`Path=${opts.path}`);
  }
  if (opts.maxAge) {
    parts.push(`Max-Age=${opts.maxAge}`);
  }
  return parts.join('; ');
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}

function sanitizeString(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str
    .replace(/[<>&"'`]/g, '')
    .trim()
    .slice(0, MAX_STRING_LENGTH);
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

function collectionToTable(name) {
  return TABLE_MAP[name] || name;
}

function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Convert a DB row (with data JSON + typed columns) to a frontend item (camelCase)
function rowToItem(row) {
  if (!row) {
    return null;
  }
  let data;
  try {
    data = JSON.parse(row.data || '{}');
  } catch (e) {
    data = {};
  }
  const item = { ...data, id: row.id };
  // Typed columns may have values that are not in data (e.g., created_by, created_at)
  // But data from the client already has camelCase versions; prefer data values
  if (!item.created_by && row.created_by) {
    item.created_by = row.created_by;
  }
  if (!item.created_at && row.created_at) {
    item.created_at = row.created_at;
  }
  if (!item.updated_at && row.updated_at) {
    item.updated_at = row.updated_at;
  }
  // Ensure snake_case columns are also exposed as camelCase for the frontend
  for (const [key, value] of Object.entries(row)) {
    if (key === 'id' || key === 'data') {
      continue;
    }
    const camel = snakeToCamel(key);
    if (item[camel] === undefined && value !== null) {
      item[camel] = value;
    }
  }
  return item;
}

function rowsToItems(rows) {
  return (rows || []).map(rowToItem);
}

// Extract known fields from a body object and return { column -> value } map
function extractTypedFields(table, body) {
  const extracted = {};
  const cols = EXTRACT_COLUMNS[table] || [];
  for (const col of cols) {
    // Try camelCase key first, then snake_case
    const camelKey = snakeToCamel(col);
    const val = body[camelKey] !== undefined ? body[camelKey] : body[col];
    if (val !== undefined) {
      extracted[col] = typeof val === 'string' ? val.slice(0, MAX_STRING_LENGTH) : val;
    }
  }
  return extracted;
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
  if (count >= max) {
    return false;
  }
  await env.DATA.put(rateKey, String(count + 1), { expirationTtl: windowSec * 2 });
  return true;
}

async function safeGetSession(env, token) {
  if (!token) {
    return null;
  }
  try {
    const raw = await env.SESSIONS.get(`sess:${token}`);
    if (!raw) {
      return null;
    }
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

export default {
  async fetch(request, env, ctx) {
    try {
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

      // Health Check
      if (path === '/api/health' && method === 'GET') {
        return respond({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // Rate limiting
      const rlKey = rateLimitKey(request);
      if (!(await checkRateLimit(env, `gen:${rlKey}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW))) {
        return respond({ error: 'Rate limit exceeded. Try again later.' }, 429);
      }

      // ====== Auth Routes ======
      if (path === '/api/auth/session' && method === 'GET') {
        const session = await requireAuth();
        if (!session) {
          return respond({ authenticated: false });
        }
        return respond({
          authenticated: true,
          user: {
            id: session.userId,
            email: session.email,
            name: session.name,
            role: session.role,
          },
        });
      }

      if (path === '/api/auth/logout' && method === 'POST') {
        const cookies = parseCookies(request.headers.get('Cookie'));
        const token = cookies[SESSION_COOKIE];
        if (token) {
          await env.SESSIONS.delete(`sess:${token}`);
        }
        const resp = respond({ success: true });
        resp.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
        return resp;
      }

      if (path === '/api/auth/me' && method === 'GET') {
        const session = await requireAuth();
        if (!session) {
          return respond({ error: 'Not authenticated' }, 401);
        }
        return respond({
          id: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
          ageGroup: session.ageGroup,
        });
      }

      if (path === '/api/auth/firebase-login' && method === 'POST') {
        try {
          let body;
          try {
            body = await request.json();
          } catch {
            return respond({ error: 'Invalid JSON' }, 400);
          }
          const { idToken } = body;
          if (!idToken || typeof idToken !== 'string') {
            return respond({ error: 'Firebase ID token is required' }, 400);
          }
          const apiKey = env.FIREBASE_API_KEY || '';
          const fbUser = await verifyFirebaseToken(idToken, apiKey);
          const email = (fbUser.email || '').toLowerCase();

          let user = await env.DB.prepare('SELECT * FROM users WHERE email = ? OR firebase_uid = ?')
            .bind(email, fbUser.localId)
            .first();

          if (!user) {
            const newId = generateId();
            const now = new Date().toISOString();
            const name = fbUser.displayName || email.split('@')[0] || 'User';
            const data = JSON.stringify({ name, email, firebaseUid: fbUser.localId });
            await env.DB.prepare(
              `INSERT INTO users (id, data, firebase_uid, email, name, role, age_group, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'student', '7-12', ?, ?)`,
            )
              .bind(newId, data, fbUser.localId, email, name, now, now)
              .run();
            user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(newId).first();
          } else if (!user.firebase_uid) {
            const now = new Date().toISOString();
            const existingData = JSON.parse(user.data || '{}');
            existingData.firebaseUid = fbUser.localId;
            await env.DB.prepare(
              'UPDATE users SET firebase_uid = ?, data = ?, updated_at = ? WHERE id = ?',
            )
              .bind(fbUser.localId, JSON.stringify(existingData), now, user.id)
              .run();
          }

          if (!user) {
            return respond({ error: 'User not found after registration' }, 500);
          }

          const token = generateId();
          const session = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'student',
            ageGroup: user.age_group || '7-12',
            createdAt: Date.now(),
            expiresAt: Date.now() + SESSION_TTL * 1000,
          };
          await env.SESSIONS.put(`sess:${token}`, JSON.stringify(session), {
            expirationTtl: SESSION_TTL,
          });

          const resp = respond({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            ageGroup: user.age_group,
          });
          resp.headers.append(
            'Set-Cookie',
            setCookie(SESSION_COOKIE, token, {
              httpOnly: true,
              sameSite: 'none',
              secure: true,
              path: '/',
              maxAge: SESSION_TTL,
            }),
          );
          return resp;
        } catch (err) {
          return respond({ error: 'Firebase authentication failed' }, 401);
        }
      }

      if (path === '/api/auth/firebase-register' && method === 'POST') {
        try {
          let body;
          try {
            body = await request.json();
          } catch {
            return respond({ error: 'Invalid JSON' }, 400);
          }
          const { idToken, name, role, age, parentContact, adminInviteCode } = body;
          if (!idToken || typeof idToken !== 'string') {
            return respond({ error: 'Firebase ID token is required' }, 400);
          }
          const apiKey = env.FIREBASE_API_KEY || '';
          const fbUser = await verifyFirebaseToken(idToken, apiKey);
          const email = (fbUser.email || '').toLowerCase();
          const displayName = sanitizeString(
            name || fbUser.displayName || email.split('@')[0] || 'User',
          );
          const userRole = (() => {
            const allowed = ['student', 'teacher', 'parent'];
            if (role === 'admin' && adminInviteCode && adminInviteCode === env.ADMIN_INVITE_CODE) {
              return 'admin';
            }
            return allowed.includes(role) ? role : 'student';
          })();

          const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
            .bind(email)
            .first();
          if (existing) {
            return respond({ error: 'Email already registered' }, 409);
          }

          const newId = generateId();
          const now = new Date().toISOString();
          const ageGroup = age ? `${age}-17` : '7-12';
          const parentContactSanitized = sanitizeString(parentContact || '');
          const data = JSON.stringify({
            name: displayName,
            email,
            firebaseUid: fbUser.localId,
            role: userRole,
            ageGroup,
            parentContact: parentContactSanitized,
          });

          await env.DB.prepare(
            `INSERT INTO users (id, data, firebase_uid, email, name, role, age_group, parent_contact, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
            .bind(
              newId,
              data,
              fbUser.localId,
              email,
              displayName,
              userRole,
              ageGroup,
              parentContactSanitized,
              now,
              now,
            )
            .run();

          const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(newId).first();
          if (!user) {
            return respond({ error: 'Registration failed' }, 500);
          }

          const token = generateId();
          const session = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'student',
            ageGroup: user.age_group || '7-12',
            createdAt: Date.now(),
            expiresAt: Date.now() + SESSION_TTL * 1000,
          };
          await env.SESSIONS.put(`sess:${token}`, JSON.stringify(session), {
            expirationTtl: SESSION_TTL,
          });

          const resp = respond(
            {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              ageGroup: user.age_group,
            },
            201,
          );
          resp.headers.append(
            'Set-Cookie',
            setCookie(SESSION_COOKIE, token, {
              httpOnly: true,
              sameSite: 'none',
              secure: true,
              path: '/',
              maxAge: SESSION_TTL,
            }),
          );
          return resp;
        } catch (err) {
          return respond({ error: 'Firebase registration failed' }, 401);
        }
      }

      // ====== Gemini Admin Routes ======
      if (path === '/api/admin/gemini-key' && method === 'GET') {
        const session = await requireAuth();
        if (!session) {
          return respond({ error: 'Not authenticated' }, 401);
        }
        const configured = !!(env.GEMINI_API_KEY || (await env.CONFIG.get('gemini_key')));
        return respond({ configured });
      }

      if (path === '/api/admin/gemini-key' && method === 'POST') {
        const session = await requireAuth();
        if (!session) {
          return respond({ error: 'Not authenticated' }, 401);
        }
        if (session.role !== 'teacher' && session.role !== 'admin') {
          return respond({ error: 'Only teachers and admins can update the API key' }, 403);
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return respond({ error: 'Invalid JSON' }, 400);
        }
        const { apiKey } = body;
        if (!apiKey || typeof apiKey !== 'string') {
          return respond({ error: 'API key is required' }, 400);
        }
        await env.CONFIG.put('gemini_key', apiKey.replace(/[^a-zA-Z0-9_-]/g, ''));
        return respond({ success: true });
      }

      if (path === '/api/admin/migrate' && method === 'POST') {
        const session = await requireAuth();
        if (!session) {
          return respond({ error: 'Not authenticated' }, 401);
        }
        if (session.role !== 'admin') {
          return respond({ error: 'Only admins can trigger data migration' }, 403);
        }

        const collections = [
          { name: 'users', table: 'users' },
          { name: 'curriculum_modules', table: 'curriculum_modules' },
          { name: 'assignments', table: 'assignments' },
          { name: 'submissions', table: 'submissions' },
          { name: 'notifications', table: 'notifications' },
          { name: 'exam_results', table: 'exam_results' },
        ];

        const report = {};
        for (const col of collections) {
          try {
            const raw = await env.DATA.get(`col:${col.name}`);
            if (!raw) {
              report[col.name] = 0;
              continue;
            }
            let items = [];
            try {
              items = JSON.parse(raw);
            } catch {
              items = [];
            }
            let count = 0;
            for (const item of items) {
              const id = item.id;
              if (!id) {
                continue;
              }
              const safeBody = stripMetaFields(item);
              const dataJson = JSON.stringify(safeBody);
              const now = new Date().toISOString();
              const createdBy = item._createdBy || session.userId;
              const createdAt = item._createdAt || now;
              const updatedAt = item.updatedAt || now;

              const extracted = extractTypedFields(col.table, safeBody);
              const columns = ['id', 'data', 'created_by', 'created_at', 'updated_at'];
              const values = [id, dataJson, createdBy, createdAt, updatedAt];
              for (const [column, val] of Object.entries(extracted)) {
                columns.push(column);
                values.push(val);
              }
              const placeholders = columns.map(() => '?');
              await env.DB.prepare(
                `INSERT OR REPLACE INTO ${col.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
              )
                .bind(...values)
                .run();
              count++;
            }
            report[col.name] = count;
          } catch (err) {
            report[col.name] = `Error: ${err.message}`;
          }
        }

        return respond({ success: true, report });
      }

      // ====== Data CRUD Routes ======
      const dataMatch = path.match(/^\/api\/data\/([^/]+)(?:\/([^/]+))?$/);
      if (dataMatch) {
        const session = await requireAuth();
        if (!session) {
          return respond({ error: 'Not authenticated' }, 401);
        }
        const collection = dataMatch[1];
        const id = dataMatch[2];
        if (!ALLOWED_COLLECTIONS.has(collection)) {
          return respond({ error: 'Unknown collection' }, 400);
        }

        const perms = COLLECTION_PERMISSIONS[collection];
        const role = session.role;
        const table = collectionToTable(collection);

        function canRead() {
          return perms.read.includes(role);
        }
        function canWrite(item) {
          if (perms.write.includes(role)) {
            return true;
          }
          if (perms.writeOwn && perms.writeOwn.includes(role) && item) {
            return item.created_by === session.userId;
          }
          return false;
        }

        // Build filtered list query based on role
        async function getFilteredItems() {
          let query = `SELECT * FROM ${table}`;
          const params = [];
          const conditions = [];

          if (perms.writeOwn && perms.writeOwn.includes(role) && !perms.write.includes(role)) {
            conditions.push('created_by = ?');
            params.push(session.userId);
          }

          if (
            role === 'parent' &&
            (collection === 'submissions' || collection === 'exam_results')
          ) {
            const parentUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
              .bind(session.userId)
              .first();
            const children = await env.DB.prepare('SELECT id FROM users WHERE parent_contact = ?')
              .bind(parentUser?.email || '')
              .all();
            const childIds = (children.results || []).map((c) => c.id);
            if (childIds.length > 0) {
              const placeholders = childIds.map(() => '?').join(',');
              conditions.push(`student_id IN (${placeholders})`);
              params.push(...childIds);
            } else {
              conditions.push('1=0');
            }
          }

          if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
          }
          query += ' ORDER BY created_at DESC';

          const { results } = await env.DB.prepare(query)
            .bind(...params)
            .all();
          return rowsToItems(results);
        }

        // List collection
        if (!id && method === 'GET') {
          if (!canRead()) {
            return respond({ error: 'Forbidden' }, 403);
          }
          const items = await getFilteredItems();
          return respond(items);
        }

        // Get single item
        if (id && method === 'GET') {
          if (!canRead()) {
            return respond({ error: 'Forbidden' }, 403);
          }
          const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
          if (!row) {
            return respond({ error: 'Item not found' }, 404);
          }
          const item = rowToItem(row);
          if (!canWrite(item) && !canRead()) {
            return respond({ error: 'Forbidden' }, 403);
          }
          return respond(item);
        }

        // Create item
        if (!id && method === 'POST') {
          if (!canWrite(null)) {
            return respond({ error: 'Forbidden' }, 403);
          }
          let body;
          try {
            body = await request.json();
          } catch {
            return respond({ error: 'Invalid JSON' }, 400);
          }
          const safeBody = stripMetaFields(body);

          // Check collection size limit
          const { total } = await env.DB.prepare(`SELECT COUNT(*) as total FROM ${table}`).first();
          if (total >= MAX_ARRAY_ITEMS) {
            return respond({ error: 'Collection size limit exceeded' }, 413);
          }

          const newId = generateId();
          const now = new Date().toISOString();

          // Store the full body as data JSON
          const dataJson = JSON.stringify(safeBody);

          // Extract known typed fields
          const extracted = extractTypedFields(table, safeBody);

          // Build INSERT with data + known columns
          const columns = ['id', 'data', 'created_by', 'created_at', 'updated_at'];
          const values = [newId, dataJson, session.userId, now, now];

          for (const [col, val] of Object.entries(extracted)) {
            columns.push(col);
            values.push(val);
          }

          const placeholders = columns.map(() => '?');
          await env.DB.prepare(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
          )
            .bind(...values)
            .run();

          const created = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`)
            .bind(newId)
            .first();
          return respond(rowToItem(created), 201);
        }

        // Update item
        if (id && method === 'PUT') {
          let body;
          try {
            body = await request.json();
          } catch {
            return respond({ error: 'Invalid JSON' }, 400);
          }
          const safeBody = stripMetaFields(body);

          const existing = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`)
            .bind(id)
            .first();
          if (!existing) {
            return respond({ error: 'Item not found' }, 404);
          }
          if (!canWrite(rowToItem(existing))) {
            return respond({ error: 'Forbidden' }, 403);
          }

          // Merge existing data with new body
          let existingData = {};
          try {
            existingData = JSON.parse(existing.data || '{}');
          } catch (e) {
            existingData = {};
          }
          const mergedData = { ...existingData, ...safeBody };
          const dataJson = JSON.stringify(mergedData);
          const now = new Date().toISOString();

          // Extract known typed fields
          const extracted = extractTypedFields(table, mergedData);

          const setClauses = ['data = ?', 'updated_at = ?'];
          const params = [dataJson, now];

          for (const [col, val] of Object.entries(extracted)) {
            setClauses.push(`${col} = ?`);
            params.push(val);
          }

          params.push(id);
          await env.DB.prepare(`UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`)
            .bind(...params)
            .run();

          const updated = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`)
            .bind(id)
            .first();
          return respond(rowToItem(updated));
        }

        // Delete item
        if (id && method === 'DELETE') {
          const existing = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`)
            .bind(id)
            .first();
          if (!existing) {
            return respond({ error: 'Item not found' }, 404);
          }
          if (!canWrite(rowToItem(existing))) {
            return respond({ error: 'Forbidden' }, 403);
          }

          await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
          return respond({ success: true });
        }
      }

      // ====== Gemini Proxy ======
      if (path.startsWith('/api/gemini/') && method === 'POST') {
        if (
          !(await checkRateLimit(env, `gemini:${rlKey}`, RATE_LIMIT_GEMINI_MAX, RATE_LIMIT_WINDOW))
        ) {
          return respond({ error: 'Rate limit exceeded for AI requests. Try again later.' }, 429);
        }
        const session = await requireAuth();
        if (!session) {
          return respond({ error: 'Authentication required to use AI features' }, 401);
        }

        const apiKey = env.GEMINI_API_KEY || (await env.CONFIG.get('gemini_key'));
        if (!apiKey) {
          return respond({ error: 'Gemini API key is not configured on the server.' }, 400);
        }
        const modelName = path.replace('/api/gemini/', '');
        const model = MODELS[modelName];
        if (!model) {
          return respond({ error: 'Unknown model' }, 400);
        }
        try {
          const body = await request.json();
          const bodyText = JSON.stringify(body);

          // Compute prompt SHA-256 hash
          const encoder = new TextEncoder();
          const dataBuffer = encoder.encode(bodyText);
          const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

          // Check if response is cached
          try {
            const cached = await env.DB.prepare(
              'SELECT response FROM gemini_cache WHERE prompt_hash = ?',
            )
              .bind(hashHex)
              .first();
            if (cached) {
              const cachedData = JSON.parse(cached.response);
              return respond(cachedData);
            }
          } catch (dbErr) {}

          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const geminiResp = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: bodyText,
          });
          const data = await geminiResp.json();

          // Cache the successful response
          if (geminiResp.status === 200 && data) {
            try {
              await env.DB.prepare(
                'INSERT OR REPLACE INTO gemini_cache (prompt_hash, prompt, response, created_at) VALUES (?, ?, ?, ?)',
              )
                .bind(hashHex, bodyText, JSON.stringify(data), new Date().toISOString())
                .run();
            } catch (dbErr) {}
          }

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
    } catch (err) {
      ctx.waitUntil(reportErrorToSentry(err, request, env));
      const origin = request.headers.get('origin');
      return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || 'https://cloud-school-6251a.web.app',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
  },
};

async function reportErrorToSentry(err, request, env) {
  const dsn =
    env.SENTRY_DSN ||
    'https://7c44e976db57fcf7c7c34d3d2db73b18@o4505678229340160.ingest.us.sentry.io/4508930292725760';
  if (!dsn) {
    return;
  }

  try {
    const dsnUrl = new URL(dsn);
    const projectId = dsnUrl.pathname.replace('/', '');
    const sentryUrl = `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/store/`;

    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString().split('.')[0],
      platform: 'javascript',
      exception: {
        values: [
          {
            type: err.name || 'Error',
            value: err.message || String(err),
            stacktrace: err.stack
              ? {
                  frames: err.stack
                    .split('\n')
                    .slice(1)
                    .map((line) => ({ filename: line.trim() })),
                }
              : undefined,
          },
        ],
      },
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
      },
      environment: env.ENVIRONMENT || 'production',
    };

    await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7,sentry_client=cloudflare-worker-custom/1.0.0,sentry_key=${dsnUrl.username}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (sentryErr) {
    console.error('Failed to send error to Sentry:', sentryErr);
  }
}
