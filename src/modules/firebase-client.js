// @ts-check
/** Firebase module - المصادقة والتخزين السحابي */

export let app = null;
export const db = null;
export let auth = null;
export let userId = null;
export let isAuthReady = false;
export const snapshotUnsubscribers = [];

const rawConfig = typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : {};
let firebaseConfig = rawConfig;
if (typeof rawConfig === 'string') {
  try {
    firebaseConfig = JSON.parse(rawConfig);
  } catch (e) {
    firebaseConfig = {};
  }
}

export async function initFirebase() {
  if (typeof window.firebase === 'undefined') {
    console.warn('Firebase SDK not loaded');
    return;
  }
  if (Object.keys(firebaseConfig).length === 0) {
    return;
  }

  try {
    app = window.firebase.initializeApp(firebaseConfig);
    auth = window.firebase.auth();
    auth.useDeviceLanguage();

    if (typeof window.firebase.analytics === 'function') {
      window.firebase.analytics();
    }

    window.firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        userId = user.uid;
        isAuthReady = true;
        const el = document.getElementById('user-id-display');
        if (el) {
          el.textContent = `${user.email || userId.substring(0, 8)}`;
        }
      } else {
        userId = null;
        isAuthReady = false;
      }
    });
  } catch (e) {
    console.warn('Firebase init error:', e.message);
  }
}
