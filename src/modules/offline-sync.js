// @ts-check
import { removeAnswerDraft } from './journey-state.js';
import { saveLocalData } from './local-data.js';
import { getAccountStorageKey, localData } from './app-state.js';
import { serverSave } from './server-backend.js';

const DB_NAME = 'cloud_school_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_saves';

let dbInstance = null;

function getDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = /** @type {IDBRequest} */ (e.target).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      dbInstance = /** @type {IDBRequest} */ (e.target).result;
      resolve(dbInstance);
    };
    request.onerror = (e) => {
      reject(/** @type {IDBRequest} */ (e.target).error);
    };
  });
}

export async function queueOfflineSave(collection, data) {
  const owner = getAccountStorageKey();
  if (!owner) {
    return false;
  }
  try {
    if (!data.clientMutationId) {data.clientMutationId = crypto.randomUUID();}
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add({ collection, data, owner, timestamp: Date.now() });
      request.onsuccess = () => {
        console.log(`[Offline Sync] Queued offline save for ${collection}`);
        // Request background sync if service worker is active
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then((/** @type {any} */ reg) => {
            reg.sync.register('sync-offline-data').catch((err) => {
              console.warn('[Offline Sync] Sync registration failed:', err);
            });
          });
        }
        resolve(true);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('[Offline Sync] IndexedDB failed:', err);
    return false;
  }
}

export async function getPendingSaves() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    return [];
  }
}

export async function clearPendingSave(id) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    return false;
  }
}

// Function to process and flush all pending saves
export async function syncOfflineData(serverSaveFn) {
  const owner = getAccountStorageKey();
  if (!owner) {
    return;
  }
  const pending = (await getPendingSaves()).filter((item) => item.owner === owner);
  if (pending.length === 0) {
    return;
  }

  console.log(`[Offline Sync] Processing ${pending.length} pending offline saves...`);
  for (const item of pending) {
    if (getAccountStorageKey() !== owner) {
      break;
    }
    try {
      if (typeof serverSaveFn !== 'function') {
        return;
      }
      if (typeof serverSaveFn === 'function') {
        const saved = await serverSaveFn(item.collection, {...item.data, clientMutationId: item.data.clientMutationId || `offline-${item.id}-${item.timestamp}`});
        if (getAccountStorageKey() === owner && saved && item.collection === 'submissions') {
          const sub = localData.submissions.find(s => s.clientMutationId === item.data.clientMutationId);
          if (sub) { Object.assign(sub, saved, { syncStatus: 'sent' }); removeAnswerDraft(sub.quizId); saveLocalData(); }
          import('./learning-journey.js').then(m => m.renderLearningJourney()).catch(console.warn);
        }
      }
      await clearPendingSave(item.id);
      console.log(
        `[Offline Sync] Successfully synced offline save ID: ${item.id} for ${item.collection}`,
      );
    } catch (err) {
      console.warn(`[Offline Sync] Failed to sync offline item ${item.id}:`, err.message);
      // Stop syncing rest if server is still down
      break;
    }
  }
}

// Auto-trigger sync when returning online
window.addEventListener('online', () => {
  console.log('[Offline Sync] Browser returned online. Triggering sync...');
  syncOfflineData(serverSave).catch(console.error);
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'trigger-sync-offline') {
      console.log('[Offline Sync] Service worker triggered background sync...');
      syncOfflineData(serverSave).catch(console.error);
    }
  });
}
