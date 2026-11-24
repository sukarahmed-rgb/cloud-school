// @ts-check
import {
  localData,
  setCurrentUserSession,
  getAccountStorageKey,
  getCurrentUserSession,
} from './app-state.js';
import { saveLocalData } from './local-data.js';
import { __ } from './i18n.js';
import { switchRole } from './role-switcher.js';

const SERVER_BASE = (typeof __server_base !== 'undefined' && __server_base) || '';
/** @type {boolean} */
export let serverAvailable = false;

/**
 * @param {boolean} val
 */
export function setServerAvailable(val) {
  serverAvailable = val;
}

/** Check if the backend server is reachable */
export async function checkServerHealth() {
  try {
    const r = await fetch(`${SERVER_BASE}/api/health`, { credentials: 'include', cache:'no-store' });
    if (r.ok) {
      serverAvailable = true;
    }
  } catch (e) {
    serverAvailable = false;
  }
}

/** @returns {Promise<UserSession|null>} */
export async function checkServerSession() {
  if (!serverAvailable) {
    return null;
  }
  try {
    const r = await fetch(`${SERVER_BASE}/api/auth/session`, { credentials: 'include', cache:'no-store' });
    const data = await r.json();
    if (data.authenticated) {
      return data.user;
    }
  } catch (e) {}
  return null;
}

/**
 * @param {string} idToken
 * @returns {Promise<Object>}
 */
export async function serverLoginFirebase(idToken) {
  const r = await fetch(`${SERVER_BASE}/api/auth/firebase-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    credentials: 'include',
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || 'Firebase login failed');
  }
  return await r.json();
}

/**
 * @param {string} idToken
 * @param {string} name
 * @param {string} role
 * @param {number} [age]
 * @param {string} [parentContact]
 * @param {string} [adminInviteCode]
 * @returns {Promise<Object>}
 */
export async function serverRegisterFirebase(
  idToken,
  name,
  role,
  age,
  parentContact,
  adminInviteCode,
) {
  const r = await fetch(`${SERVER_BASE}/api/auth/firebase-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      name,
      role,
      age: age || 0,
      parentContact: parentContact || '',
      adminInviteCode: adminInviteCode || '',
    }),
    credentials: 'include',
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || 'Firebase registration failed');
  }
  return await r.json();
}

/** Log out from the backend server */
export async function serverLogout() {
  try {
    await fetch(`${SERVER_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {}
}

/**
 * @param {string} collection
 * @returns {Promise<Object>}
 */
export async function serverFetch(collection) {
  const r = await fetch(`${SERVER_BASE}/api/data/${collection}`, { credentials: 'include', cache:'no-store' });
  if (!r.ok) {
    throw new Error(`Failed to fetch ${collection}`);
  }
  return await r.json();
}

/**
 * @param {string} collection
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function serverSave(collection, data) {
  const owner = getAccountStorageKey();
  if (!owner) {
    throw new Error('Sign in before saving');
  }
  if (!data.clientMutationId) {data.clientMutationId = crypto.randomUUID();}
  const r = await fetch(`${SERVER_BASE}/api/data/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!r.ok) {
    const error = Object.assign(new Error(`Failed to save ${collection}`), { status: r.status });
    throw error;
  }
  return await r.json();
}

/** Initialize the server backend and restore session */
export async function initServerBackend() {
  await checkServerHealth();
  if (serverAvailable) {
    try {
      const r = await fetch(`${SERVER_BASE}/api/admin/gemini-key`, { credentials: 'include', cache:'no-store' });
      if (r.ok) {
        const data = await r.json();
        if (data.configured) {
          localStorage.removeItem('gemini_api_key');
        }
      }
    } catch (e) {
      /* not critical */
    }

    const user = await checkServerSession();
    if (user) {
      setCurrentUserSession({
        name: user.name,
        contact: user.email || user.contact || '',
        role: user.role,
        serverId: user.id || user.serverId,
        serverAuth: true,
      });
      document.getElementById('auth-gate').classList.add('hidden');
      document.getElementById('dev-role-bar').classList.add('hidden');
      document.querySelector('[data-action="logout"]')?.classList.remove('hidden');
      document.getElementById('active-user-badge').textContent = __(
        'userBadge',
        user.name,
        getArabicRoleName(user.role),
      );
      switchRole(user.role);
      syncDataFromServer();
    }
  }
}

/** Sync local data from the server */
export async function syncDataFromServer() {
  if (!serverAvailable) {
    return;
  }
  const owner = getAccountStorageKey();
  if (!owner) {
    return;
  }
  const session = getCurrentUserSession();
  const collections = [
    ['curriculum_modules', 'books'],
    ['assignments', 'assignments'],
    ['submissions', 'submissions'],
  ];
  if (['teacher', 'admin'].includes(session?.role)) {
    collections.push(['students', 'students']);
  }
  await Promise.all(
    collections.map(async ([collection, key]) => {
      try {
        const records = await serverFetch(collection);
        if (getAccountStorageKey() === owner && Array.isArray(records)) {
          localData[key] = records;
        }
      } catch (e) {
        console.warn(`Server sync failed for ${collection}:`, e.message);
      }
    }),
  );
  if (getAccountStorageKey() === owner) {
    saveLocalData();
    import('./learning-journey.js').then(m => m.renderLearningJourney()).catch(console.warn);
    import('./content-studio.js').then(m => m.renderContentStudio()).catch(console.warn);
  }
}

/**
 * @param {string} role
 * @returns {string}
 */
export function getArabicRoleName(role) {
  const roles = {
    student: __('roleStudent'),
    parent: __('roleParent'),
    teacher: __('roleTeacher'),
    admin: __('roleAdmin'),
  };
  return roles[role] || role;
}
