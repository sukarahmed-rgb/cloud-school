/**
 * Cloud School Server
 * 
 * Secure all-in-one backend:
 * - Static file serving (replaces serve.js)
 * - Auth with HTTP-only cookies + server-side password hashing
 * - Data CRUD with JSON file persistence
 * - Gemini AI proxy
 *
 * تشغيل: node proxy/server.js
 * الخادم على: http://localhost:{PORT} (افتراضي 8081)
 * 
 * الأمان:
 * - كلمات السر مشفرة بـ scrypt على السيرفر (مش في المتصفح)
 * - الجلسات عبر HTTP-only cookies (مش localStorage)
 * - البيانات محفوظة في proxy/data/ (مش في المتصفح)
 * - API key للـ Gemini يبقى على السيرفر
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 8081;

// ====== Configuration ======
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_COOKIE = 'cloud_school_sid';
const GEMINI_API_KEY_PROXY = process.env.GEMINI_API_KEY || '';

// Ensure data directory exists
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { /* exists */ }

// Initialize users file if needed
if (!fs.existsSync(USERS_FILE)) {
  try { fs.writeFileSync(USERS_FILE, '[]', 'utf-8'); } catch (e) { /* ignore */ }
}

// Allowed collections (whitelist prevents path traversal)
const ALLOWED_COLLECTIONS = new Set([
  'curriculum_modules', 'assignments', 'submissions', 'students', 'notifications', 'exam_results'
]);

// Gemini models
const MODELS = {
  text: 'gemini-2.5-flash-preview-09-2025',
  vision: 'gemini-2.5-flash-preview-09-2025',
  tts: 'gemini-2.5-flash-preview-tts',
  transcribe: 'gemini-2.5-flash-preview-09-2025',
};

// ====== Session Store (in-memory) ======
const sessions = new Map();

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}, 60 * 60 * 1000);

function createSession(user) {
  const token = crypto.randomUUID();
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'student',
    ageGroup: user.ageGroup || '7-12',
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL,
  };
  sessions.set(token, session);
  return { token, session };
}

function getSession(token) {
  if (!token || !sessions.has(token)) return null;
  const session = sessions.get(token);
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// ====== Data File Helpers ======
function readCollection(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeCollection(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

function findIndex(arr, id) {
  return arr.findIndex(item => item.id === id || item._id === id);
}

function generateId() {
  return crypto.randomUUID();
}

// ====== Password Helpers ======
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

// ====== Auth Middleware ======
function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.session = session;
  next();
}

// ====== Cookie parsing middleware ======
function cookieParser(req, _res, next) {
  const header = req.headers['cookie'] || '';
  req.cookies = {};
  header.split(';').forEach(pair => {
    const [key, ...val] = pair.trim().split('=');
    if (key) req.cookies[key.trim()] = decodeURIComponent(val.join('='));
  });
  next();
}

app.use(cookieParser);
app.use(express.json({ limit: '10mb' }));

// ====== Security Headers ======
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'microphone=self, camera=()');
  next();
});

// Set cookie helper
function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: SESSION_TTL,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

// ====== Auth Routes ======

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name, role, ageGroup } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const users = readCollection('users');
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = {
      id: generateId(),
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(password),
      role: role || 'student',
      ageGroup: ageGroup || '7-12',
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    writeCollection('users', users);

    // Create session
    const { token } = createSession(user);
    setSessionCookie(res, token);

    return res.status(201).json({
      id: user.id, email: user.email, name: user.name,
      role: user.role, ageGroup: user.ageGroup,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = readCollection('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { token } = createSession(user);
    setSessionCookie(res, token);

    return res.json({
      id: user.id, email: user.email, name: user.name,
      role: user.role, ageGroup: user.ageGroup,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) sessions.delete(token);
  clearSessionCookie(res);
  return res.json({ success: true });
});

// Get current user
app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({
    id: req.session.userId,
    email: req.session.email,
    name: req.session.name,
    role: req.session.role,
    ageGroup: req.session.ageGroup,
  });
});

// ====== Session check (public — just tells client if logged in) ======
app.get('/api/auth/session', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = getSession(token);
  if (!session) {
    return res.json({ authenticated: false });
  }
  return res.json({
    authenticated: true,
    user: {
      id: session.userId, email: session.email,
      name: session.name, role: session.role,
    },
  });
});

// ====== Gemini API Key management ======
// Teacher/admin can update the server-side Gemini key
app.post('/api/admin/gemini-key', requireAuth, (req, res) => {
  if (req.session.role !== 'teacher' && req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Only teachers and admins can update the API key' });
  }
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }
  // Store in a server-side config file
  const configFile = path.join(DATA_DIR, 'config.json');
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  } catch (e) { /* new file */ }
  config.geminiApiKey = apiKey;
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
  return res.json({ success: true });
});

// Check if key exists on server
app.get('/api/admin/gemini-key', requireAuth, (req, res) => {
  const configFile = path.join(DATA_DIR, 'config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    return res.json({ configured: !!config.geminiApiKey });
  } catch (e) {
    return res.json({ configured: !!GEMINI_API_KEY_PROXY });
  }
});

// ====== Data CRUD Routes ======

// List collection
app.get('/api/data/:collection', requireAuth, (req, res) => {
  const { collection } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(400).json({ error: `Unknown collection: ${collection}` });
  }
  const data = readCollection(collection);
  return res.json(data);
});

// Get single item
app.get('/api/data/:collection/:id', requireAuth, (req, res) => {
  const { collection, id } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(400).json({ error: `Unknown collection: ${collection}` });
  }
  const data = readCollection(collection);
  const item = data.find(d => d.id === id || d._id === id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  return res.json(item);
});

// Create item
app.post('/api/data/:collection', requireAuth, (req, res) => {
  const { collection } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(400).json({ error: `Unknown collection: ${collection}` });
  }
  const data = readCollection(collection);
  const newItem = {
    ...req.body,
    id: req.body.id || generateId(),
    _createdBy: req.session.userId,
    _createdAt: new Date().toISOString(),
  };
  data.push(newItem);
  writeCollection(collection, data);
  return res.status(201).json(newItem);
});

// Update item
app.put('/api/data/:collection/:id', requireAuth, (req, res) => {
  const { collection, id } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(400).json({ error: `Unknown collection: ${collection}` });
  }
  const data = readCollection(collection);
  const idx = findIndex(data, id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });

  data[idx] = {
    ...data[idx],
    ...req.body,
    id: data[idx].id,
    _updatedBy: req.session.userId,
    _updatedAt: new Date().toISOString(),
    _createdBy: data[idx]._createdBy,
    _createdAt: data[idx]._createdAt,
  };
  writeCollection(collection, data);
  return res.json(data[idx]);
});

// Delete item
app.delete('/api/data/:collection/:id', requireAuth, (req, res) => {
  const { collection, id } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(400).json({ error: `Unknown collection: ${collection}` });
  }
  const data = readCollection(collection);
  const idx = findIndex(data, id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  data.splice(idx, 1);
  writeCollection(collection, data);
  return res.json({ success: true });
});

// ====== Gemini Proxy ======
function getApiKey(req) {
  const configFile = path.join(DATA_DIR, 'config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    if (config.geminiApiKey) return config.geminiApiKey;
  } catch (e) { /* fall through */ }
  return GEMINI_API_KEY_PROXY;
}

async function proxyToGemini(modelName, payload, res, apiKey) {
  const model = MODELS[modelName];
  if (!model) {
    return res.status(400).json({ error: `Unknown model: ${modelName}` });
  }
  if (!apiKey) {
    return res.status(400).json({
      error: 'Gemini API key is not configured on the server. A teacher can set it in Settings > Server Settings.'
    });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error(`Gemini proxy error (${modelName}):`, err.message);
    return res.status(502).json({ error: 'Failed to reach Gemini API', details: err.message });
  }
}

app.post('/api/gemini/text', async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    await proxyToGemini('text', req.body, res, apiKey);
  } catch (err) {
    console.error('Proxy text error:', err);
    res.status(500).json({ error: 'Proxy text error', details: err.message });
  }
});

app.post('/api/gemini/vision', async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    await proxyToGemini('vision', req.body, res, apiKey);
  } catch (err) {
    console.error('Proxy vision error:', err);
    res.status(500).json({ error: 'Proxy vision error', details: err.message });
  }
});

app.post('/api/gemini/tts', async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    await proxyToGemini('tts', req.body, res, apiKey);
  } catch (err) {
    console.error('Proxy TTS error:', err);
    res.status(500).json({ error: 'Proxy TTS error', details: err.message });
  }
});

app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    await proxyToGemini('transcribe', req.body, res, apiKey);
  } catch (err) {
    console.error('Proxy transcribe error:', err);
    res.status(500).json({ error: 'Proxy transcribe error', details: err.message });
  }
});

// ====== Health Check ======
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ====== Serve Static Files ======
// Serve root project directory as static files
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback (for client-side routing)
app.get('*', (req, res) => {
  // Don't catch API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`\n☁️  Cloud School Server`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Static files: ✓`);
  console.log(`   Auth API: ✓ (HTTP-only cookies)`);
  console.log(`   Data API: ✓ (${DATA_DIR})`);
  console.log(`   Gemini proxy: ${GEMINI_API_KEY_PROXY || '(configurable in Settings > Server Settings)'}`);
  console.log(`\n   ℹ️  هذا الخادم يغني عن serve.js — شغّل هذا فقط.\n`);
});
