// @ts-check
import { localData, setCurrentUserSession } from './app-state.js';
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
    const r = await fetch(`${SERVER_BASE}/api/health`, { credentials: 'include' });
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
    const r = await fetch(`${SERVER_BASE}/api/auth/session`, { credentials: 'include' });
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
 * @returns {Promise<Object>}
 */
export async function serverRegisterFirebase(idToken, name, role, age, parentContact) {
  const r = await fetch(`${SERVER_BASE}/api/auth/firebase-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      name,
      role,
      age: age || 0,
      parentContact: parentContact || '',
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
  const r = await fetch(`${SERVER_BASE}/api/data/${collection}`, { credentials: 'include' });
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
  const r = await fetch(`${SERVER_BASE}/api/data/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!r.ok) {
    throw new Error(`Failed to save ${collection}`);
  }
  return await r.json();
}

/** Initialize the server backend and restore session */
export async function initServerBackend() {
  await checkServerHealth();
  if (serverAvailable) {
    try {
      const r = await fetch(`${SERVER_BASE}/api/admin/gemini-key`, { credentials: 'include' });
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
      document.getElementById('dev-role-bar').classList.remove('hidden');
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
export function syncDataFromServer() {
  if (!serverAvailable) {
    return;
  }
  serverFetch('curriculum_modules')
    .then((books) => {
      if (books && books.length > 0) {
        localData.books = books;
      }
      return serverFetch('assignments');
    })
    .then((assignments) => {
      if (assignments && assignments.length > 0) {
        localData.assignments = assignments;
      }
      return serverFetch('submissions');
    })
    .then((submissions) => {
      if (submissions && submissions.length > 0) {
        localData.submissions = submissions;
      }
      return serverFetch('students');
    })
    .then((students) => {
      if (students && students.length > 0) {
        localData.students = students;
      }
      saveLocalData();
    })
    .catch((e) => {
      console.warn('Server sync failed (using local data):', e.message);
    });
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
