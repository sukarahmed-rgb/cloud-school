/** Firebase module - المصادقة والتخزين السحابي */

let app = null;
let db = null;
let auth = null;
let userId = null;
let isAuthReady = false;
let snapshotUnsubscribers = [];

const appId = typeof __app_id !== 'undefined' ? __app_id : 'cloud-school-blind-v1';
const rawConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : {};
const firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

export function getUserId() { return userId; }
export function isReady() { return isAuthReady; }
export function getDb() { return db; }
export function getAppId() { return appId; }

async function loadFirebaseSDK() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
  const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
  const { getFirestore, addDoc, collection, onSnapshot, serverTimestamp, enableIndexedDbPersistence } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
  return { initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, getFirestore, addDoc, collection, onSnapshot, serverTimestamp, enableIndexedDbPersistence };
}

export async function initFirebase() {
  if (Object.keys(firebaseConfig).length === 0) return;

  try {
    const fb = await loadFirebaseSDK();
    app = fb.initializeApp(firebaseConfig);
    db = fb.getFirestore(app);

    fb.enableIndexedDbPersistence(db).catch(err => {
      if (err.code === 'failed-precondition') console.warn('Firebase: multiple tabs open, offline disabled.');
      else if (err.code === 'unimplemented') console.warn('Firebase: browser does not support persistence.');
    });

    auth = fb.getAuth(app);
    fb.onAuthStateChanged(auth, async (user) => {
      if (user) {
        userId = user.uid;
        isAuthReady = true;
        const el = document.getElementById('user-id-display');
        if (el) el.textContent = `ID: ${userId.substring(0, 8)}`;
        syncFromFirebase();
      } else {
        try {
          if (initialAuthToken) await fb.signInWithCustomToken(auth, initialAuthToken);
          else await fb.signInAnonymously(auth);
        } catch (e) { console.error('Firebase auth failed:', e); }
      }
    });
  } catch (e) {
    console.warn('Firebase SDK not available (offline or blocked):', e.message);
  }
}

function getCollection(path) {
  return collection(db, 'artifacts', appId, 'public', 'data', path);
}

async function saveToFirebase(path, data) {
  if (!isAuthReady || !db) return;
  try {
    const colRef = getCollection(path);
    await addDoc(colRef, { ...data, userId, createdAt: serverTimestamp() });
  } catch (e) { console.error(`Firebase save error [${path}]:`, e); }
}

export function saveBook(book) { return saveToFirebase('curriculum_modules', book); }
export function saveQuiz(quiz) { return saveToFirebase('assignments', quiz); }
export function saveSubmission(sub) { return saveToFirebase('submissions', sub); }
export function saveStudent(student) { return saveToFirebase('students', student); }

function listenToCollection(path, callback) {
  if (!isAuthReady || !db) return;
  const colRef = getCollection(path);
  const unsub = onSnapshot(colRef, (snapshot) => {
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    if (items.length > 0) callback(items);
  }, err => console.error(`Firebase snapshot error [${path}]:`, err));
  snapshotUnsubscribers.push(unsub);
  return unsub;
}

function cleanupSnapshots() {
  snapshotUnsubscribers.forEach(unsub => unsub());
  snapshotUnsubscribers = [];
}

export function syncFromFirebase(onData) {
  if (!isAuthReady || !db) return;
  cleanupSnapshots();

  listenToCollection('curriculum_modules', (books) => {
    onData?.('books', books);
  });
  listenToCollection('assignments', (quizzes) => {
    onData?.('assignments', quizzes);
  });
  listenToCollection('submissions', (subs) => {
    onData?.('submissions', subs);
  });
}
