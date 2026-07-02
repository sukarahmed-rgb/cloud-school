/** Braille module - لغة برايل */

const arabicBrailleMap = {
  '1': 'ا', '1,2': 'ب', '2,3,4,5': 'ت', '1,4,5,6': 'ث',
  '2,4,5': 'ج', '1,5,6': 'ح', '1,3,4,6': 'خ', '1,4,5': 'د',
  '2,3,4,6': 'ذ', '1,2,3,5': 'ر', '1,3,5,6': 'ز', '2,3,4': 'س',
  '1,4,6': 'ش', '1,2,3,4,6': 'ص', '1,2,4,6': 'ض', '2,3,4,5,6': 'ط',
  '1,2,3,4,5,6': 'ظ', '1,2,3,5,6': 'ع', '1,2,6': 'غ', '1,2,4': 'ف',
  '1,2,3,4,5': 'ق', '1,3': 'ك', '1,2,3': 'ل', '1,3,4': 'م',
  '1,3,4,5': 'ن', '1,2,5': 'هـ', '2,4,5,6': 'و', '2,4': 'ي',
  '2,3,5': '!', '2,5,6': '؟'
};

function getBrailleChar(dotsSet) {
  const sorted = Array.from(dotsSet).sort((a, b) => a - b);
  return arabicBrailleMap[sorted.join(',')] || null;
}

function getBraillePreview(dotsSet) {
  const sorted = Array.from(dotsSet).sort((a, b) => a - b);
  const keyString = sorted.join(',');
  const mapped = arabicBrailleMap[keyString] || (dotsSet.size > 0 ? 'غير مكتمل' : 'لا يوجد');
  return { keyString, mapped };
}
/** Centralized Error Handler */

const ERROR_LEVELS = { INFO: 'info', WARN: 'warn', ERROR: 'error', FATAL: 'fatal' };

const listeners = [];

function onError(callback) {
  listeners.push(callback);
}

function notifyListeners(level, context, error) {
  listeners.forEach(fn => fn(level, context, error));
}

function speakToUser(message) {
  const ariaLive = document.getElementById('aria-live');
  if (ariaLive) ariaLive.textContent = message;
  try {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ar-SA';
    window.speechSynthesis.speak(utterance);
  } catch { /* speech not available */ }
}

function showToast(message, isError = true) {
  const toast = document.getElementById('toast-message');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 z-50 p-4 font-bold rounded-xl shadow-xl text-xl border-2 ${isError ? 'bg-red-600 text-white border-red-800' : 'bg-yellow-400 text-black border-black'} hidden`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 5000);
}

function handleError(context, error) {
  const message = error?.message || String(error);
  const level = error?.fatal ? ERROR_LEVELS.FATAL : ERROR_LEVELS.ERROR;

  console.error(`[${context}] ${message}`, error);
  notifyListeners(level, context, error);

  const userMessages = {
    'api key': 'خطأ في مفتاح API. تأكد من إدخاله في لوحة الإدارة.',
    'network': 'خطأ في الاتصال بالشبكة. تحقق من اتصالك بالإنترنت.',
    'fetch': 'تعذر الاتصال بالخادم. حاول مرة أخرى لاحقاً.',
    'timeout': 'انتهت مهلة الاتصال. حاول مرة أخرى.',
    'permission': 'ليس لديك صلاحية لهذه العملية.',
    'audio': 'حدث خطأ في النظام الصوتي.',
    'firebase': 'خطأ في الاتصال بقاعدة البيانات.',
  };

  let userMessage = 'عذراً، حدث خطأ غير متوقع. حاول مرة أخرى.';
  const lowerMsg = message.toLowerCase();
  for (const [key, msg] of Object.entries(userMessages)) {
    if (lowerMsg.includes(key)) { userMessage = msg; break; }
  }

  showToast(userMessage);

  if (level === ERROR_LEVELS.FATAL) {
    speakToUser(`خطأ حرج: ${userMessage}`);
  } else {
    speakToUser(userMessage);
  }

  return { level, context, message };
}

function wrapAsync(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(context, error);
    }
  };
}

function setupGlobalErrorHandler() {
  window.addEventListener('unhandledrejection', (event) => {
    handleError('unhandledRejection', event.reason);
  });
  window.addEventListener('error', (event) => {
    handleError('unhandledException', event.error || event.message);
  });
  console.info('Global error handler initialized.');
}
/** i18n module - الترجمة */

const i18n = {};
let currentLang = localStorage.getItem('cloudSchoolLang') || 'ar';

function getCurrentLang() {
  return currentLang;
}

function setCurrentLang(lang) {
  currentLang = lang;
  localStorage.setItem('cloudSchoolLang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[key]) {
      el.textContent = i18n[key];
    }
  });
}

function loadLocale(lang) {
  return fetch(`i18n/${lang}.json`)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to load locale: ${lang}`);
      return r.json();
    })
    .then(data => {
      Object.assign(i18n, data);
      applyTranslations();
    })
    .catch(err => console.error('i18n load error:', err));
}

function initI18n() {
  loadLocale(currentLang);
  const langToggleBtn = document.getElementById('lang-toggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const newLang = currentLang === 'ar' ? 'en' : 'ar';
      setCurrentLang(newLang);
      loadLocale(newLang);
      langToggleBtn.textContent = newLang === 'ar' ? 'English' : 'العربية';
    });
    langToggleBtn.textContent = currentLang === 'ar' ? 'English' : 'العربية';
  }
}
/** Firebase module - المصادقة والتخزين السحابي */

let app = null;
let db = null;
let auth = null;
let userId = null;
let isAuthReady = false;
let snapshotUnsubscribers = [];

const rawConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : {};
const firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

function getUserId() { return userId; }
function isReady() { return isAuthReady; }
function getDb() { return db; }
function getAppId() { return typeof __app_id !== 'undefined' ? __app_id : 'cloud-school-blind-v1'; }

async function loadFirebaseSDK() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
  const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
  const { getFirestore, addDoc, collection, onSnapshot, serverTimestamp, enableIndexedDbPersistence } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
  return { initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, getFirestore, addDoc, collection, onSnapshot, serverTimestamp, enableIndexedDbPersistence };
}

async function initFirebase() {
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
  return collection(db, 'artifacts', getAppId(), 'public', 'data', path);
}

async function saveToFirebase(path, data) {
  if (!isAuthReady || !db) return;
  try {
    const colRef = getCollection(path);
    await addDoc(colRef, { ...data, userId, createdAt: serverTimestamp() });
  } catch (e) { console.error(`Firebase save error [${path}]:`, e); }
}

function saveBook(book) { return saveToFirebase('curriculum_modules', book); }
function saveQuiz(quiz) { return saveToFirebase('assignments', quiz); }
function saveSubmission(sub) { return saveToFirebase('submissions', sub); }
function saveStudent(student) { return saveToFirebase('students', student); }

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

function syncFromFirebase(onData) {
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
/**
 * Gemini module - جميع استدعاءات الذكاء الاصطناعي
 * 
 * جميع الطلبات تذهب عبر الـ proxy server لحماية مفتاح API.
 * المفتاح موجود فقط في .env على السيرفر، وليس في الواجهة الأمامية.
 */

function getProxyBase() {
  const override = localStorage.getItem('cloudSchoolProxyUrl');
  return override || 'http://127.0.0.1:3001';
}

async function proxyFetch(endpoint, payload) {
  const url = `${getProxyBase()}/api/gemini/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Proxy error (${response.status}): ${errText}`);
  }

  return response.json();
}

function buildTextPayload(text, systemPrompt) {
  const payload = { contents: [{ parts: [{ text }] }] };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return payload;
}

function buildMediaPayload(parts, systemPrompt) {
  const payload = { contents: [{ parts }] };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return payload;
}

function extractText(result) {
  return result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

function extractAudio(result) {
  const part = result?.candidates?.[0]?.content?.parts?.[0];
  const audioData = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType;
  if (!audioData || !mimeType?.startsWith('audio/')) return null;
  return { audioData, mimeType };
}

/** استدعاء Gemini نصوص مع إعادة محاولة */
async function callGemini(userQuery, systemPrompt, maxRetries = 3) {
  const payload = buildTextPayload(userQuery, systemPrompt);
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await proxyFetch('text', payload);
      return extractText(result);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/** استدعاء مع وسائط (صور/صوت) */
async function callGeminiWithMedia(parts, systemPrompt, endpoint = 'vision') {
  const payload = buildMediaPayload(parts, systemPrompt);
  const result = await proxyFetch(endpoint, payload);
  return extractText(result);
}

/** تحويل النص إلى كلام عبر Gemini TTS */
async function speakWithGeminiTTS(text) {
  try {
    const payload = {
      contents: [{
        parts: [{ text: `تحدث باللغة العربية الفصحى بصوت دافئ: ${text}` }],
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    };

    const result = await proxyFetch('tts', payload);
    const audio = extractAudio(result);
    if (!audio) return null;

    const { audioData, mimeType } = audio;
    const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)?.[1] || '24000', 10);
    const pcmBuffer = base64ToArrayBuffer(audioData);
    const wavBlob = pcmToWav(pcmBuffer, sampleRate);
    return URL.createObjectURL(wavBlob);
  } catch {
    return null;
  }
}

/** تفريغ الصوت إلى نص */
async function transcribeAudio(base64Audio, mimeType) {
  const text = await callGeminiWithMedia(
    [
      { text: 'فرغ ما يقال حرفياً بالعربية بدون إضافات.' },
      { inlineData: { mimeType, data: base64Audio } },
    ],
    null,
    'transcribe'
  );
  return text;
}

/** تحليل الصور */
async function describeImage(base64Image, mimeType) {
  return callGeminiWithMedia([
    { text: 'صف هذه الصورة بالتفصيل لطالب كفيف بالعربية.' },
    { inlineData: { mimeType, data: base64Image } },
  ]);
}

/** سؤال المعلم الافتراضي */
async function askTutor(question) {
  return callGemini(question, 'أنت معلم ودود تشرح للطلاب المكفوفين ببساطة.');
}

/** تلخيص كتاب */
async function summarizeBook(content) {
  return callGemini(
    `لخص: "${content}" مع 3 أسئلة مراجعة.`,
    'أنت خبير تلخيص مناهج للمكفوفين.'
  );
}

/** تقييم إجابة برايل */
async function evaluateBraille(text) {
  return callGemini(
    `صحح النص: "${text}" وقدم تقريراً تشجيعياً.`,
    'أنت معلم لغة عربية وخبير برايل.'
  );
}

/** توليد اختبار */
async function generateQuiz() {
  const json = await callGemini(
    'ولد سؤال اختيار من متعدد في العلوم. أخرج JSON فقط: {question, A, B, C, D, correct}.',
    'أنت مصمم اختبارات.'
  );
  return JSON.parse(json.replace(/```json|```/g, '').trim());
}

/** قصة تفاعلية */
async function generateStory(choiceIndex) {
  const prompt =
    choiceIndex === null
      ? 'اصنع قصة تفاعلية عن الفضاء بـ JSON: {story, options:[]}. 3 خيارات.'
      : `استمرار القصة. اختار الطالب الخيار ${choiceIndex + 1}. أخرج JSON: {story, options:[]}.`;

  const json = await callGemini(prompt, 'أنت راوي قصص.');
  return JSON.parse(json.replace(/```json|```/g, '').trim());
}

/** تصحيح إجابة مقالية */
async function gradeAnswer(studentAnswer) {
  return callGemini(
    `قيم الإجابة: "${studentAnswer}" وأعط درجة من 100 مع تعليق.`,
    'أنت مصحح.'
  );
}

// ====== مساعدات صوتية (محلية، لا تحتاج API) ======
function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function pcmToWav(pcmBuffer, sampleRate) {
  const buf = new ArrayBuffer(44 + pcmBuffer.byteLength);
  const v = new DataView(buf);
  const w = (o, s, l) => { if (l) v.setUint32(o, s, true); else v.setUint32(o, s, false); };
  w(0, 0x52494646, false);
  w(4, 36 + pcmBuffer.byteLength, true);
  w(8, 0x57415645, false);
  w(12, 0x666d7420, false);
  w(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  w(24, sampleRate, true);
  w(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 0x64617461, false);
  w(40, pcmBuffer.byteLength, true);
  const pcm = new Int16Array(pcmBuffer);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, pcm[i], true);
  return new Blob([buf], { type: 'audio/wav' });
}
/** UI module - أدوات واجهة المستخدم */

const STORAGE_KEYS = {
  sizeOffset: 'cloudSchoolSizeOffset',
  theme: 'cloudSchoolTheme',
};

let sharedAudioContext = null;

// ====== Audio Context Singleton ======
function getAudioContext() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor();
  }
  if (sharedAudioContext.state === 'suspended') sharedAudioContext.resume();
  return sharedAudioContext;
}

// ====== Toast ======
function showToast(text) {
  const toast = document.getElementById('toast-message');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ====== Loading Spinner ======
function showLoading(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="loading-overlay"><span class="loading-spinner"></span><span>${escapeHtml(message)}</span></div>`;
}

function hideLoading(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = '';
}

// ====== Escape HTML (XSS Protection) ======
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ====== Speech ======
function speak(text) {
  if (!audioCoPilotEnabled) return;

  const ariaLive = document.getElementById('aria-live');
  if (ariaLive) ariaLive.textContent = text;

  if (screenReaderMode) return;

  stopAllAudio();

  const wave = document.getElementById('audio-visual-wave');
  if (wave) wave.classList.add('playing');

  if (ttsEngineMode === 'gemini') {
    speakWithGemini(text);
  } else {
    speakWithBrowser(text, wave);
  }
}

function stopAllAudio() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }
  window.speechSynthesis.cancel();
}

async function speakWithGemini(text) {
  const wave = document.getElementById('audio-visual-wave');
  try {
    const audioUrl = await speakWithGeminiTTS(text);
    if (!audioUrl) return fallbackSpeak(text, wave);

    if (activeAudioElement) activeAudioElement.pause();
    activeAudioElement = new Audio(audioUrl);
    activeAudioElement.onended = () => { if (wave) wave.classList.remove('playing'); };
    activeAudioElement.play().catch(() => {
      if (wave) wave.classList.remove('playing');
      showAutoplayPrompt(text);
    });
  } catch {
    fallbackSpeak(text, wave);
  }
}

function speakWithBrowser(text, wave) {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.1;
    utterance.onend = () => { if (wave) wave.classList.remove('playing'); };
    window.speechSynthesis.speak(utterance);
  } catch {
    if (wave) wave.classList.remove('playing');
  }
}

function fallbackSpeak(text, wave) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-EG';
  utterance.onend = () => { if (wave) wave.classList.remove('playing'); };
  window.speechSynthesis.speak(utterance);
}

function showAutoplayPrompt(pendingText) {
  let prompt = document.getElementById('autoplay-unlock-prompt');
  if (prompt) return;
  prompt = document.createElement('div');
  prompt.id = 'autoplay-unlock-prompt';
  prompt.className = 'fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4';
  prompt.innerHTML = `
    <div class="card p-8 rounded-3xl max-w-md border-4 border-yellow-400 space-y-6 bg-slate-900 text-yellow-400 text-center">
      <p class="text-white font-bold text-lg">اضغط لتفعيل الصوت</p>
      <button id="btn-unlock-audio" class="w-full p-4 bg-yellow-400 text-black font-black text-xl rounded-xl btn-interactive">تشغيل الصوت 🎙️</button>
    </div>`;
  document.body.appendChild(prompt);
  document.getElementById('btn-unlock-audio')?.addEventListener('click', () => {
    prompt.remove();
    const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
    silent.play().then(() => speak(pendingText)).catch(() => speak(pendingText));
  });
  setupAccessibleVoices();
}

// ====== TTS Engine Toggle ======
function toggleTtsEngine() {
  ttsEngineMode = ttsEngineMode === 'gemini' ? 'browser' : 'gemini';
  localStorage.setItem('cloudSchoolTtsEngine', ttsEngineMode);
  const btn = document.getElementById('tts-engine-toggle');
  if (btn) {
    btn.textContent = ttsEngineMode === 'gemini'
      ? '🎙️ صوت القراءة: ذكاء اصطناعي (Gemini)'
      : '🎙️ صوت القراءة: قارئ المتصفح المحلي';
  }
  speak(ttsEngineMode === 'gemini' ? 'تم تفعيل صوت Gemini.' : 'تم تفعيل قارئ المتصفح.');
}

// ====== Screen Reader Mode ======
function toggleScreenReaderMode() {
  screenReaderMode = !screenReaderMode;
  const btn = document.getElementById('btn-screen-reader-mode');
  if (!btn) return;
  if (screenReaderMode) {
    btn.textContent = '🔇 قارئ خارجي: مفعل';
    stopAllAudio();
    const ariaLive = document.getElementById('aria-live');
    if (ariaLive) ariaLive.textContent = 'وضع توافق قارئ الشاشة مفعل.';
  } else {
    btn.textContent = '🔊 قارئ خارجي: معطل';
    speak('تم إيقاف وضع قارئ الشاشة.');
  }
}

// ====== Audio Co-Pilot ======
function toggleAudioCoPilot() {
  audioCoPilotEnabled = !audioCoPilotEnabled;
  const btn = document.getElementById('audio-co-pilot-toggle');
  if (!btn) return;
  if (audioCoPilotEnabled) {
    btn.textContent = '🔊 المساعد الداخلي: مفعل';
    btn.setAttribute('aria-pressed', 'true');
    speak('تم تفعيل المساعد الصوتي.');
  } else {
    btn.textContent = '🔇 المساعد الداخلي: معطل';
    btn.setAttribute('aria-pressed', 'false');
    stopAllAudio();
  }
}

// ====== Text Size ======
function adjustTextSize(direction) {
  let offset = parseInt(localStorage.getItem(STORAGE_KEYS.sizeOffset) || '0', 10);
  offset += direction;
  if (offset < -2) offset = -2;
  if (offset > 6) offset = 6;
  localStorage.setItem(STORAGE_KEYS.sizeOffset, offset);

  const sizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const chosen = sizes[1 + offset] || 1.125;
  document.documentElement.style.setProperty('--base-text-size', `${chosen}rem`);
  speak(`${Math.round(chosen * 100)}%`);
}

function loadTextSize() {
  const offset = parseInt(localStorage.getItem(STORAGE_KEYS.sizeOffset) || '0', 10);
  const sizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const chosen = sizes[1 + Math.min(Math.max(offset, -2), 6)] || 1.125;
  document.documentElement.style.setProperty('--base-text-size', `${chosen}rem`);
}

// ====== Themes ======
function setTheme(theme) {
  const body = document.body;
  body.className = body.className.replace(/theme-\S+/g, '');
  body.classList.add(`theme-${theme === 'dark-hc' ? 'dark-high-contrast' : theme === 'light-hc' ? 'light-high-contrast' : 'classic'}`);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved) setTheme(saved);
}

// ====== Accessible Voices (Hover/Focus) ======
function setupAccessibleVoices() {
  if (accessibleVoicesController) accessibleVoicesController.abort();
  accessibleVoicesController = new AbortController();
  const signal = accessibleVoicesController.signal;

  document.querySelectorAll('button, a, input, textarea, select, [role="button"], [role="tab"]').forEach(el => {
    el.addEventListener('focus', () => {
      const t = el.getAttribute('aria-label') || el.innerText || el.placeholder || '';
      if (t) speak(t);
    }, { signal });

    el.addEventListener('mouseenter', () => {
      const isStudent = document.getElementById('view-student') && !document.getElementById('view-student').classList.contains('hidden');
      if (isStudent) {
        const t = el.getAttribute('aria-label') || el.innerText || el.placeholder || '';
        if (t) speak(t);
      }
    }, { signal });
  });
}

// ====== Proxy URL Configuration ======
function getProxyBaseUrl() {
  // Allow override via localStorage for development
  const devOverride = localStorage.getItem('cloudSchoolProxyUrl');
  if (devOverride) return devOverride;
  // In production, use the same origin with /api prefix via reverse proxy
  // For now, default to localhost:3001
  return 'http://127.0.0.1:3001';
}

async function checkProxyHealth() {
  try {
    const base = getProxyBaseUrl();
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

// ====== Audio Recording ======
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function getIsRecording() { return isRecording; }

function toggleAudioRecording() {
  const micBtn = document.getElementById('btn-mic-input');
  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    isRecording = false;
    if (micBtn) micBtn.classList.remove('bg-red-600', 'animate-pulse');
    speak('انتهى التسجيل. جاري التفريغ...');
  } else {
    if (!navigator.mediaDevices?.getUserMedia) {
      speak('الميكروفون غير مدعوم.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        audioChunks = [];
        try {
          const base64 = await blobToBase64(blob);
          const text = await transcribeAudio(base64, mediaRecorder.mimeType);
          if (text?.trim()) {
            const ans = document.getElementById('assignment-student-answer');
            if (ans) ans.value += (ans.value ? ' ' : '') + text.trim();
            const aiQ = document.getElementById('ai-tutor-query');
            if (aiQ && document.getElementById('student-sub-ai-tutor') && !document.getElementById('student-sub-ai-tutor').classList.contains('hidden')) {
              aiQ.value = text.trim();
            }
            speak('تم التقاط الصوت.');
          }
        } catch { speak('خطأ في معالجة الصوت.'); }
      };
      mediaRecorder.start();
      isRecording = true;
      if (micBtn) micBtn.classList.add('bg-red-600', 'animate-pulse');
      speak('بدء التسجيل.');
    }).catch(() => speak('لم أتمكن من الوصول للميكروفون.'));
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ====== Sound Effects ======
function playSuccessChime() {
  playTone(523.25, 880, 'sine', 0.3);
}

function playFailChime() {
  playTone(150, 80, 'sawtooth', 0.3);
}

function playTone(startFreq, endFreq, type, duration) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration * 0.7);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio not available */ }
}

// ====== Focus Management ======
function focusElement(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function announceToScreenReader(text) {
  const ariaLive = document.getElementById('aria-live');
  if (!ariaLive) return;
  ariaLive.textContent = '';
  requestAnimationFrame(() => { ariaLive.textContent = text; });
}
/**
 * Cloud School — المنصة السحابية التعليمية الشاملة للمكفوفين
 * ملف التطبيق الرئيسي (JavaScript)
 * 
 * الإصلاحات المطبقة:
 * 1. إصلاح مؤقت الاختبار ليعد الثواني بشكل صحيح
 * 2. إصلاح تسرب الذاكرة في setupAccessibleVoices باستخدام AbortController
 * 3. توحيد فحص إخفاء العناصر باستخدام classList.contains('hidden')
 * 4. إعادة استخدام AudioContext واحد بدلاً من إنشاء جديد كل مرة
 * 5. إضافة مؤشرات تحميل بصرية عند الاتصال بالذكاء الاصطناعي
 * 6. إصلاح الأخطاء الإملائية
 * 7. تحويل inline onclick إلى addEventListener
 * 8. تنظيم الكود بنمط Module Pattern
 * 9. إضافة دعم اللغات (i18n)
 * 10. إعادة هيكلة إلى وحدات منفصلة (src/*.js)
 * 11. معالج أخطاء مركزي
 * 12. إدارة تركيز محسّنة
 */

// ==================== تهيئة المتغيرات العامة ====================
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cloud-school-blind-v1';

// ==================== بيانات التطبيق المحلية (Offline Cache) ====================
let localData = {
    books: [
        { id: 'b1', title: 'كيمياء الصف العاشر - الوحدة الأولى', content: 'مرحبًا بك في وحدة الكيمياء. في هذا الدرس، سنتعرف على العناصر والروابط التساهمية والأيونية وتفاعلات الطاقة والحرارة.', audio: '' },
        { id: 'b2', title: 'تاريخ وحضارة الوطن العربي', content: 'مرحبًا بك في تاريخ العرب المجيد. سنتعلم اليوم عن الحضارات القديمة التي قامت في شبه الجزيرة العربية والهلال الخصيب ومصر الفرعونية.', audio: '' }
    ],
    assignments: [
        { id: 'a1', title: 'واجب العلوم والفيزياء الأول', type: 'mcq', question: 'ما هو المكون الأساسي لغاز الأوزون؟', options: { A: 'الهيدروجين', B: 'الأكسجين الثلاثي', C: 'النيتروجين', D: 'غاز ثاني أكسيد الكربون' }, correct: 'B' },
        { id: 'a2', title: 'اختبار اللغة العربية المقالي', type: 'text', question: 'اكتب فقرة قصيرة تتحدث فيها عن فضل المعلم في المجتمع وأهمية العلم؟', ideal: 'يعد العلم ركيزة المجتمعات الأساسية، والمعلم هو النور الذي يبدد الظلام...' }
    ],
    submissions: [],
    students: [
        { name: 'عبد الرحمن الشمري', grade: 'الصف العاشر', pin: '7429' },
        { name: 'سارة عبد الله', grade: 'الصف التاسع', pin: '5120' }
    ]
};

// ==================== متغيرات التحكم ====================
let audioCoPilotEnabled = true;
let screenReaderMode = false;
let activeRole = 'student';
// REMOVED_DUPLICATE: let mediaRecorder = null;
// REMOVED_DUPLICATE: let audioChunks = [];
// REMOVED_DUPLICATE: let isRecording = false;
let currentBrailleDots = new Set();
let currentCheatDots = new Set();
let selectedQuizId = null;
let activeGameTimer = null;
let activeGameType = '';
let currentGameScore = 0;
let gameTimeLeft = 30;
let ttsEngineMode = 'gemini';
let activeAudioElement = null;
let currentUserSession = null;
let currentlyPlayingBookId = null;
let selectedOption = null;
let quizTimerInterval = null;
let currentCorrectAnswer = null;
let gameTimerInterval = null;
let uploadedImageBase64 = null;
let uploadedImageMime = null;
let currentSizeOffset = 0;
let perkinsKeysPressed = {};

// متغيرات الصوت والسمات — تديرها ui module
let accessibleVoicesController = null;
// ==================== [إصلاح #9] Language Support (via module) ====================
// Uses imported i18n module functions — see ./src/i18n.js
loadLocale(getCurrentLang());
const langToggleBtn = document.getElementById('lang-toggle');
if (langToggleBtn) {
  langToggleBtn.addEventListener('click', () => {
    const newLang = getCurrentLang() === 'ar' ? 'en' : 'ar';
    setCurrentLang(newLang);
    loadLocale(newLang);
    langToggleBtn.textContent = newLang === 'ar' ? 'English' : 'العربية';
  });
  langToggleBtn.textContent = getCurrentLang() === 'ar' ? 'English' : 'العربية';
}

// ==================== قاموس برايل العربية (معرّف أعلاه) ====================

// ==================== دوال أمان ومنع XSS (via module) ====================
// (escapeHtml function declared above)

// ==================== [إصلاح #5] دوال مؤشر التحميل (via module) ====================
// (showLoadingSpinner is showLoading - declared above)

// ==================== دوال النطق والصوت (via module) ====================
// (all functions defined above in the main app scope)

function toggleRegFields() {
    const role = document.getElementById('reg-role').value;
    const ageField = document.getElementById('age-field-container');
    const studentFields = document.getElementById('student-linked-fields');
    const parentFields = document.getElementById('parent-linked-fields');

    if (role === 'student') {
        ageField.classList.remove('hidden');
        studentFields.classList.remove('hidden');
        parentFields.classList.add('hidden');
        checkAgeLimitations();
    } else if (role === 'parent') {
        ageField.classList.add('hidden');
        studentFields.classList.add('hidden');
        parentFields.classList.remove('hidden');
        document.getElementById('reg-parent-contact').required = false;
    } else if (role === 'admin') {
        ageField.classList.add('hidden');
        document.getElementById('reg-age').required = false;
        studentFields.classList.add('hidden');
        parentFields.classList.add('hidden');
        document.getElementById('reg-parent-contact').required = false;
    } else {
        ageField.classList.remove('hidden');
        document.getElementById('reg-age').required = true;
        studentFields.classList.add('hidden');
        parentFields.classList.add('hidden');
        document.getElementById('reg-parent-contact').required = false;
    }
}

function checkAgeLimitations() {
    const role = document.getElementById('reg-role').value;
    if (role !== 'student') return;

    const ageInput = document.getElementById('reg-age');
    const age = parseInt(ageInput.value, 10);
    const warningBox = document.getElementById('auth-warning-box');
    const warningText = document.getElementById('auth-warning-text');
    const parentContactInput = document.getElementById('reg-parent-contact');
    const labelParentContact = document.getElementById('label-parent-contact');
    const btnAuthSubmit = document.getElementById('btn-auth-submit');

    warningBox.classList.add('hidden');
    parentContactInput.required = false;

    if (isNaN(age)) return;

    if (age < 12) {
        const msg = "أهلاً بك يا بطل. نظراً لأن عمرك أقل من 12 عاماً، يتوجب على ولي أمرك أو مدرستك إنشاء الحساب الخاص بك من جهتهم والإشراف التام على تصفحك على كلاود سكول. لا يمكنك التسجيل بنفسك حالياً.";
        warningText.textContent = msg;
        warningBox.classList.remove('hidden');
        btnAuthSubmit.disabled = true;
        btnAuthSubmit.classList.add('opacity-50', 'cursor-not-allowed');
        speak(msg);
    } else {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
        parentContactInput.required = true;
        parentContactInput.setAttribute('required', 'required');

        labelParentContact.innerHTML = 'حساب ولي أمرك (حقل إجباري - اكتب رقم هاتف، بريد، أو ID ولي الأمر المسجل) *';

        speak("لقد قمت بتحديد عمرك 12 عاماً أو أكثر. يتوجب عليك الآن ربط حسابك بولي أمرك بكتابة رقم هاتفه، بريده الإلكتروني، أو معرف حسابه الشخصي على المنصة. هذا الحقل لا يمكن تجاوزه أبداً.");
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const warningBox = document.getElementById('auth-warning-box');
    const warningText = document.getElementById('auth-warning-text');
    warningBox.classList.add('hidden');

    if (!username || !password) {
        warningText.textContent = "يرجى إدخال اسم المستخدم وكلمة المرور.";
        warningBox.classList.remove('hidden');
        speak("يرجى إدخال اسم المستخدم وكلمة المرور.");
        return;
    }

    // Check saved accounts in localStorage
    const savedAccounts = JSON.parse(localStorage.getItem('cloudSchoolAccounts') || '[]');
    const account = savedAccounts.find(a => a.contact === username && a.password === password);

    if (account) {
        currentUserSession = account;
        document.getElementById('auth-gate').classList.add('hidden');
        document.getElementById('dev-role-bar').classList.remove('hidden');
        document.getElementById('active-user-badge').textContent = `المستخدم: ${account.name} (${getArabicRoleName(account.role)})`;
        switchRole(account.role);
        showToast(`أهلاً بك يا ${account.name} في Cloud School`);
    } else {
        warningText.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة. إذا لم يكن لديك حساب، اضغط على 'إنشاء حساب جديد'.";
        warningBox.classList.remove('hidden');
        speak("اسم المستخدم أو كلمة المرور غير صحيحة.");
    }
}

function handleRegistrationSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const contact = document.getElementById('reg-contact').value.trim();
    const role = document.getElementById('reg-role').value;
    const age = parseInt(document.getElementById('reg-age').value, 10);

    const warningBox = document.getElementById('auth-warning-box');
    const warningText = document.getElementById('auth-warning-text');
    warningBox.classList.add('hidden');

    if (role === 'student') {
        if (age < 12) {
            const msg = "عذراً! لا يمكن إكمال التسجيل للطلاب دون 12 عاماً بشكل مستقل. يرجى دعوة ولي أمرك للتسجيل أولاً.";
            warningText.textContent = msg;
            warningBox.classList.remove('hidden');
            speak(msg);
            return;
        }

        const parentContact = document.getElementById('reg-parent-contact').value.trim();
        if (!parentContact) {
            const msg = "تنبيه صارم: لا يمكن إتمام التسجيل وتجاوز هذه الخطوة أبداً دون إدخال رقم هاتف، بريد إلكتروني، أو معرف (ID) ولي الأمر لربط الحسابين.";
            warningText.textContent = msg;
            warningBox.classList.remove('hidden');
            speak(msg);
            document.getElementById('reg-parent-contact').focus();
            return;
        }

    currentUserSession = { name, contact, role, age, parentContact, password: document.getElementById('reg-password-new').value };
    } else if (role === 'parent') {
        const childContact = document.getElementById('reg-child-contact').value.trim();
        currentUserSession = { name, contact, role, childContact, password: document.getElementById('reg-password-new').value };
    } else {
        currentUserSession = { name, contact, role, age, password: document.getElementById('reg-password-new').value };
    }

    // Save account to localStorage
    const savedAccounts = JSON.parse(localStorage.getItem('cloudSchoolAccounts') || '[]');
    savedAccounts.push(currentUserSession);
    localStorage.setItem('cloudSchoolAccounts', JSON.stringify(savedAccounts));

    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('dev-role-bar').classList.remove('hidden');
    document.getElementById('active-user-badge').textContent = `المستخدم: ${name} (${getArabicRoleName(role)})`;

    switchRole(role);
    showToast(`أهلاً بك يا ${name} في Cloud School`);
}

function bypassAuthDemo() {
    currentUserSession = {
        name: "علي أحمد الغامدي (طالب)",
        contact: "0555555555",
        role: "student",
        age: 14,
        parentContact: "parent@cloudschool.com"
    };
    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('dev-role-bar').classList.remove('hidden');
    document.getElementById('active-user-badge').textContent = "المستخدم: علي أحمد الغامدي (طالب تجريبي)";
    switchRole('student');
}

function logout() {
    currentUserSession = null;
    document.getElementById('auth-gate').classList.remove('hidden');
    document.getElementById('dev-role-bar').classList.add('hidden');
    // Show login form, hide register form
    document.getElementById('login-form-container').classList.remove('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    speak("تم تسجيل الخروج بنجاح.");
}

function getArabicRoleName(role) {
    const roles = { student: 'طالب', parent: 'ولي أمر', teacher: 'معلم', admin: 'إدارة المدرسة' };
    return roles[role] || role;
}

function switchRole(role) {
    activeRole = role;

    document.getElementById('view-student').classList.add('hidden');
    document.getElementById('view-teacher').classList.add('hidden');
    document.getElementById('view-parent').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');

    ['student', 'teacher', 'parent', 'admin'].forEach(r => {
        const btn = document.getElementById(`role-btn-${r}`);
        if (btn) {
            if (r === role) {
                btn.className = "px-3 py-1 rounded bg-black text-white font-black border-2 border-yellow-400";
            } else {
                btn.className = "px-3 py-1 rounded bg-gray-200 text-black hover:bg-gray-300 transition";
            }
        }
    });

    if (role === 'student') {
        document.getElementById('view-student').classList.remove('hidden');
        speak("واجهة الطالب نشطة الآن في كلاود سكول. تصفح المناهج والواجبات والألعاب بصوت الذكاء الاصطناعي.");
    } else if (role === 'teacher') {
        document.getElementById('view-teacher').classList.remove('hidden');
        speak("لوحة تحكم المعلم مفتوحة لتوليد الأسئلة ونشر المناهج.");
        renderTeacherSubmissions();
    } else if (role === 'parent') {
        document.getElementById('view-parent').classList.remove('hidden');
        speak("لوحة تحكم ولي الأمر نشطة لمتابعة تقدم الطالب وتشخيص صعوبات التعلم.");
        renderParentDashboard();
    } else if (role === 'admin') {
        document.getElementById('view-admin').classList.remove('hidden');
        speak("واجهة إدارة المدرسة مفتوحة لتوليد حسابات المكفوفين.");
        renderAdminDashboard();
    }

    // نقل التركيز إلى عنوان الواجهة الجديدة
    setTimeout(() => {
        setupAccessibleVoices();
        const viewMap = { student: 'student-welcome-msg', teacher: 'view-teacher', parent: 'view-parent', admin: 'view-admin' };
        const targetId = viewMap[role];
        if (targetId) {
            const el = document.getElementById(targetId);
            if (el && el.tagName === 'H2') el.focus();
        }
    }, 200);
}

async function callGeminiAPI(userQuery, systemPrompt, maxRetries = 5) {
    try {
        return await callGemini(userQuery, systemPrompt, maxRetries);
    } catch (error) {
        handleError('GeminiAPI', error);
        return "عذراً، تعذر الاتصال بخادم الذكاء الاصطناعي.";
    }
}

async function translateAndEvaluateBrailleWithAI() {
    const answerTextarea = document.getElementById('assignment-student-answer');
    const answerText = answerTextarea.value.trim();

    if (!answerText) {
        speak("الرجاء كتابة إجابة ببرايل أو بالصوت أولاً قبل الفحص والتقييم.");
        return;
    }

    const evalBox = document.getElementById('braille-evaluation-box');
    const evalText = document.getElementById('braille-evaluation-text');

    evalBox.classList.remove('hidden');
    showLoading('braille-evaluation-text', 'جاري تواصل المترجم الذكي مع خادم Gemini...');
    speak("جاري فحص وتصحيح النص المكتوب ببرايل، انتظر لحظات من فضلك.");

    const prompt = `لقد كتب طالب كفيف هذا النص التعليمي باللغة العربية: "${answerText}". قم بمراجعة الإملاء، وتوضيح الكلمات المترجمة والتركيبات النحوية، وإعطائه تقريراً تربوياً وصوتياً فائق التشجيع لتنمية مهارات برايل لديه، مع تقديم النص المصحح والنهائي بشكل واضح وبسيط ومريح للقراءة.`;

    try {
        const resultText = await callGeminiAPI(prompt, "أنت معلم لغة عربية متميز وخبير في ترجمة وتصحيح لغة برايل وطريقة Perkins للأطفال والطلاب المكفوفين.");
        evalText.textContent = resultText;
        speak(resultText);
    } catch (error) {
        console.error(error);
        evalText.textContent = "تعذر تقييم لغة برايل حالياً لعدم استقرار الشبكة. يرجى المحاولة مجدداً.";
        speak("عذراً، فشل المترجم الذكي في تقييم النص.");
    }
}

async function summarizeCurriculumBookWithAI() {
    if (!currentlyPlayingBookId) return;
    const book = localData.books.find(b => b.id === currentlyPlayingBookId);
    if (!book) return;

    const summaryBox = document.getElementById('book-ai-summary-box');
    summaryBox.classList.remove('hidden');
    showLoading('book-ai-summary-text', 'جاري قراءة المنهج وتوليد تلخيص ذكي...');
    speak("جاري تحضير التلخيص السمعي الذكي وبطاقات الاستذكار الفورية، يرجى الانتظار.");

    const prompt = `قم بتلخيص المحتوى الدراسي التالي بالتفصيل بأسلوب نقاطي سمعي فائق الوضوح ومناسب للأطفال المكفوفين ليسهل عليهم حفظه كبطاقات استذكار سريعة: "${book.content}". ولد أيضاً ثلاثة أسئلة مراجعة وتنشيط للذاكرة في نهاية التلخيص.`;

    try {
        const resultText = await callGeminiAPI(prompt, "أنت خبير تعليمي متميز في صياغة وتلخيص المناهج الدراسية لضعاف البصر بطريقة سمعية مبسطة للغاية.");
        document.getElementById('book-ai-summary-text').textContent = resultText;
        speak(resultText);
    } catch (error) {
        console.error(error);
        document.getElementById('book-ai-summary-text').textContent = "تعذر تحضير التلخيص حالياً. يرجى مراجعة الاتصال بالإنترنت.";
        speak("عذراً، واجهت مشكلة في تلخيص الكتاب.");
    }
}

async function startAiStoryRound(choiceIndex = null) {
    const questionText = document.getElementById('game-question');
    const binaryOptions = document.getElementById('game-binary-options');
    const storyOptions = document.getElementById('game-story-options');

    binaryOptions.classList.add('hidden');
    storyOptions.classList.remove('hidden');
    storyOptions.innerHTML = '';

    showLoading('game-question', 'جاري صياغة فصل المغامرة...');
    speak("جاري نسج فصول قصتك التفاعلية بالذكاء الاصطناعي، انتظر ثوانٍ لتستمع للمغامرة.");

    let prompt = "";
    if (choiceIndex === null) {
        prompt = "اصنع قصة تعليمية تفاعلية قصيرة مشوقة وملهمة باللغة العربية الفصحى لطلاب مكفوفين عن مغامرة في النظام الشمسي لتعلم الكواكب. أنهِ المقطع الأول بـ 3 خيارات لمواصلة المغامرة. أخرج النتيجة بصيغة JSON فقط بدون علامات markdown، وتحتوي الهيكل التالي: { 'story': 'نص المقطع المثير والمبسط وعلاقته بالمقرر الدراسي', 'options': ['خيار المغامرة الأول المثير كجملة قصيرة', 'خيار المغامرة الثاني المثير كجملة قصيرة', 'خيار المغامرة الثالث المثير كجملة قصيرة'] }";
    } else {
        prompt = `استكمالاً للقصة السابقة المروية، اختار الطالب الخيار رقم ${choiceIndex + 1}. تابع تفاصيل المغامرة في الفضاء وعلمهم معلومات جديدة ومفيدة، ثم أنهِ المقطع مجدداً بـ 3 خيارات جديدة لمتابعة القصة ومواصلة التحدي. أخرج النتيجة بصيغة JSON فقط بنفس التنسيق: { 'story': 'نص المقطع المثير والمبسط وعلاقته بالمقرر الدراسي', 'options': ['خيار 1', 'خيار 2', 'خيار 3'] }`;
    }

    try {
        const jsonText = await callGeminiAPI(prompt, "أنت مصمم قصص تفاعلية وتعليمية ملهمة ومختص في صياغة ملفات JSON نقية ومبسطة.");
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        questionText.textContent = parsed.story;
        speak(parsed.story);

        parsed.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = "p-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive";
            btn.textContent = `${idx + 1}) ${opt}`;
            btn.setAttribute('aria-label', `الخيار ${idx + 1}: ${opt}`);
            btn.addEventListener('click', () => {
                playSuccessChime();
                startAiStoryRound(idx);
            });
            storyOptions.appendChild(btn);
        });

        setTimeout(setupAccessibleVoices, 200);

    } catch (error) {
        console.error("Storyteller Error:", error);
        questionText.textContent = "حدث خطأ أثناء محاولة جلب فصول القصة التفاعلية.";
        speak("عذراً، تعذر صياغة القصة حالياً.");
    }
}

async function analyzeImageWithGemini() {
    if (!uploadedImageBase64) {
        speak("الرجاء تحديد ملف صورة توضيحية أولاً.");
        return;
    }

    const responseBox = document.getElementById('vision-response-box');
    responseBox.classList.remove('hidden');
    showLoading('vision-response-text', 'جاري تحليل الصورة...');
    speak("بدأ التحليل، يرجى الانتظار.");

    try {
        const description = await describeImage(uploadedImageBase64, uploadedImageMime);
        document.getElementById('vision-response-text').textContent = description;
        speak(description);
    } catch (error) {
        handleError('analyzeImage', error);
        document.getElementById('vision-response-text').textContent = "تعذر تحليل الصورة.";
    }
}

async function askAITutor() {
    const queryText = document.getElementById('ai-tutor-query').value.trim();
    if (!queryText) {
        speak("يرجى كتابة سؤالك أولاً.");
        return;
    }

    document.getElementById('ai-tutor-response-box').classList.remove('hidden');
    showLoading('ai-tutor-response-text', 'جاري الاتصال بمعلم الذكاء الاصطناعي...');
    speak("جاري التواصل مع المعلم الافتراضي لإعداد شرح مبسط، يرجى الانتظار ثوانٍ معدودة.");

    try {
        const responseText = await callGeminiAPI(queryText, "أنت معلم ودود ولطيف جداً متخصص في شرح المناهج الدراسية للأطفال المكفوفين وضعاف البصر بتبسيط شديد وضرب أمثلة ملموسة من واقع الحياة اليومية لتيسير الاستيعاب السمعي.");
        document.getElementById('ai-tutor-response-text').textContent = responseText;
        speak(responseText);
    } catch (error) {
        document.getElementById('ai-tutor-response-text').textContent = "حدث خطأ أثناء محاولة جلب الإجابة من خوادم الذكاء الاصطناعي المباشرة.";
        speak("عذراً، واجهت مشكلة في إعداد الإجابة.");
    }
}

async function generateAIQuiz() {
    speak("جاري توليد أسئلة الاختبار التفاعلي ديناميكياً من المنهج باستخدام الذكاء الاصطناعي.");
    const btn = document.getElementById('btn-ai-generate');
    btn.textContent = "🪄 جاري التوليد...";

    const prompt = "ولد سؤال اختبار حقيقي واحد في مادة العلوم يتكون من اختيار من متعدد مع أربعة خيارات وتحديد الخيار الصحيح. أخرج النتيجة بتنسيق JSON نظيف وبسيط يحتوي على مفاتيح: question, A, B, C, D, correct.";

    try {
        const jsonText = await callGeminiAPI(prompt, "أنت مصمم اختبارات أكاديمي متميز لوزارة التعليم.");
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        document.getElementById('teacher-quiz-title').value = "اختبار العلوم الذكي التوليدي";
        document.getElementById('teacher-quiz-q').value = parsed.question;
        document.getElementById('teacher-quiz-oa').value = parsed.A;
        document.getElementById('teacher-quiz-ob').value = parsed.B;
        document.getElementById('teacher-quiz-oc').value = parsed.C;
        document.getElementById('teacher-quiz-od').value = parsed.D;
        document.getElementById('teacher-quiz-correct').value = parsed.correct;

        speak("تم توليد السؤال وتعبئة الحقول بنجاح!");
    } catch (e) {
        console.error(e);
        speak("فشل توليد الاختبار التلقائي.");
    } finally {
        btn.textContent = "🪄 توليد ذكي بالذكاء الاصطناعي";
    }
}

function toggleCheatDot(dotNum) {
    const btn = document.getElementById(`cheat-dot-${dotNum}`);
    if (currentCheatDots.has(dotNum)) {
        currentCheatDots.delete(dotNum);
        btn.classList.remove('active');
    } else {
        currentCheatDots.add(dotNum);
        btn.classList.add('active');
    }

    const dotsArray = Array.from(currentCheatDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString] || "غير مكتمل";
    document.getElementById('cheat-char-preview').textContent = `الحرف المشكل حالياً: ${mappedChar} (نقاط: ${keyString || 'لا يوجد'})`;
}

function pronounceCheatBraille() {
    const dotsArray = Array.from(currentCheatDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString];

    if (mappedChar) {
        speak(`هذه التركيبة تمثل الحرف العربي: ${mappedChar}. تذكر كيف تضع أصابعك لتشكيله على لوحة كلاود سكول!`);
    } else {
        speak("لم تقم بتشكيل حرف عربي كامل بعد، جرب تشكيلات أخرى ملموسة.");
    }
}

function clearCheatDots() {
    currentCheatDots.clear();
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`cheat-dot-${i}`);
        if (dot) dot.classList.remove('active');
    }
    document.getElementById('cheat-char-preview').textContent = "الحرف المشكل حالياً: لا يوجد";
    speak("تم تفريغ لوحة تعليم برايل.");
}

function openStudentSection(section) {
    document.getElementById('student-sub-books').classList.add('hidden');
    document.getElementById('student-sub-assignments').classList.add('hidden');
    document.getElementById('student-sub-image-describer').classList.add('hidden');
    document.getElementById('student-sub-games').classList.add('hidden');
    document.getElementById('student-sub-ai-tutor').classList.add('hidden');
    document.getElementById('student-sub-dialogic-classroom')?.classList.add('hidden');
    document.getElementById('student-sub-study-group')?.classList.add('hidden');

    const container = document.getElementById('student-section-container');
    container.classList.remove('hidden');
    const title = document.getElementById('student-section-title');

    if (section === 'books') {
        title.textContent = "📚 مستودع المناهج والكتب الدراسية";
        document.getElementById('student-sub-books').classList.remove('hidden');
        renderStudentBooks();
        speak("قسم الكتب الدراسية مفتوح. اختر أحد الكتب لقراءته أو الاستماع إليه.");
    } else if (section === 'assignments') {
        title.textContent = "✏️ الواجبات والاختبارات التفاعلية";
        document.getElementById('student-sub-assignments').classList.remove('hidden');
        renderStudentAssignments();
        speak("قسم الاختبارات والواجبات مفتوح. يمكنك اختيار الواجب وحله بالصوت أو بطريقة برايل.");
    } else if (section === 'image-describer') {
        title.textContent = "👁️ واصف الرسوم التوضيحية بالذكاء الاصطناعي";
        document.getElementById('student-sub-image-describer').classList.remove('hidden');
        speak("واصف الرسوم مفتوح. ارفع صورة توضيحية لدرسك وسأشرحها لك بالكامل.");
    } else if (section === 'games') {
        title.textContent = "🎮 ساحة الألعاب التنافسية الذكية وبرايل";
        document.getElementById('student-sub-games').classList.remove('hidden');
        speak("أهلاً بك في ساحة الألعاب واللوحة التفاعلية لتعليم برايل. اختر التحدي لتبدأ المتعة.");
    } else if (section === 'ai-tutor') {
        title.textContent = "🤖 معلم الذكاء الاصطناعي الافتراضي";
        document.getElementById('student-sub-ai-tutor').classList.remove('hidden');
        speak("معلمك الخاص المدعوم بالذكاء الاصطناعي مستعد لمساعدتك على مدار الساعة. اضغط على التحدث واطرح سؤالك.");
    } else if (section === 'dialogic-classroom') {
        title.textContent = "🎙️ الفصل الذكي الحواري";
        document.getElementById('student-sub-dialogic-classroom')?.classList.remove('hidden');
        speak("الفصل الذكي الحواري مفتوح. اضغط على بدء الفصل الذكي لبدء جلسة تعليمية صوتية تفاعلية.");
    } else if (section === 'study-group') {
        title.textContent = "👥 المذاكر الجماعي الصوتي";
        document.getElementById('student-sub-study-group')?.classList.remove('hidden');
        speak("المذاكر الجماعي الصوتي مفتوح. اختر موضوعاً وابدأ جلسة مذاكرة جماعية بوساطة الذكاء الاصطناعي.");
    }

    container.scrollIntoView({ behavior: 'smooth' });
    // تحسين إمكانية الوصول — نقل التركيز إلى عنوان القسم
    setTimeout(() => {
        setupAccessibleVoices();
        focusElement('student-section-title');
    }, 200);
}

function closeStudentSection() {
    document.getElementById('student-section-container').classList.add('hidden');
    controlAudiobook('stop');
    // إعادة التركيز إلى زر القسم المفتوح سابقاً
    const sections = ['books', 'assignments', 'image-describer', 'games', 'ai-tutor'];
    const activeBtn = document.querySelector(`[data-student-section].bg-yellow-400`);
    if (activeBtn) {
        activeBtn.focus();
    } else {
        document.getElementById('main-content')?.focus();
    }
    speak("تم العودة إلى الشاشة الرئيسية للطالب.");
}

function renderStudentBooks() {
    const grid = document.getElementById('student-books-grid');
    grid.innerHTML = '';

    localData.books.forEach(b => {
        const item = document.createElement('div');
        item.className = 'card p-6 rounded-xl flex flex-col justify-between items-start gap-4';
        item.innerHTML = `
            <h4 class="text-2xl font-black">${escapeHtml(b.title)}</h4>
            <p class="text-sm line-clamp-3">${escapeHtml(b.content)}</p>
            <div class="flex gap-2 w-full flex-wrap">
                <button data-action="read-book" data-book-id="${escapeHtml(b.id)}" class="flex-1 p-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 btn-interactive">📖 قراءة بذكاء اصطناعي فائق</button>
                <button data-action="play-book" data-book-id="${escapeHtml(b.id)}" class="flex-1 p-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 btn-interactive">🎧 الاستماع للكتاب الصوتي</button>
            </div>
        `;
        grid.appendChild(item);
    });

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const bookId = btn.dataset.bookId;
        if (btn.dataset.action === 'read-book') readBookAloud(bookId);
        if (btn.dataset.action === 'play-book') playBookAudio(bookId);
    });
}

function readBookAloud(bookId) {
    const book = localData.books.find(b => b.id === bookId);
    if (book) {
        speak(`جاري قراءة كتاب: ${book.title}. المحتوى كالتالي: ${book.content}`);
    }
}

function playBookAudio(bookId) {
    currentlyPlayingBookId = bookId;
    const book = localData.books.find(b => b.id === bookId);
    if (book) {
        const player = document.getElementById('audiobook-player');
        player.classList.remove('hidden');
        document.getElementById('audiobook-playing-title').textContent = `🎧 جاري الاستماع لكتاب: ${book.title} (صوت طبيعي مجسم)`;
        speak(`تم تجهيز المشغل الصوتي لـ ${book.title}. اضغط زر التشغيل للبدء.`);
    }
}

function readActiveBookWithAi() {
    if (!currentlyPlayingBookId) return;
    const book = localData.books.find(b => b.id === currentlyPlayingBookId);
    if (book) {
        speak(book.content);
    }
}

function controlAudiobook(action) {
    if (action === 'stop') {
        document.getElementById('audiobook-player').classList.add('hidden');
        document.getElementById('book-ai-summary-box').classList.add('hidden');
        if (activeAudioElement) {
            activeAudioElement.pause();
            activeAudioElement = null;
        }
        speak("تم إيقاف تشغيل الكتاب الصوتي.");
    }
}

function renderStudentAssignments() {
    const list = document.getElementById('student-assignments-list');
    list.innerHTML = '';

    localData.assignments.forEach(a => {
        const item = document.createElement('div');
        item.className = 'card p-6 rounded-xl flex justify-between items-center flex-wrap gap-4';
        item.innerHTML = `
            <div>
                <h4 class="text-2xl font-black">${escapeHtml(a.title)}</h4>
                <span class="text-sm px-2 py-1 bg-yellow-400 text-black rounded font-bold">${a.type === 'mcq' ? 'اختبار اختيار من متعدد' : 'واجب مقالي نصي'}</span>
            </div>
            <button data-action="start-quiz" data-quiz-id="${escapeHtml(a.id)}" class="p-4 bg-green-600 text-white font-black text-lg rounded-xl hover:bg-green-500 large-touch-target btn-interactive">بدء الحل الفوري 🏁</button>
        `;
        list.appendChild(item);
    });

    list.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="start-quiz"]');
        if (btn) startQuiz(btn.dataset.quizId);
    });
}

function startQuiz(quizId) {
    selectedQuizId = quizId;
    const quiz = localData.assignments.find(a => a.id === quizId);
    if (!quiz) return;

    document.getElementById('active-quiz-panel').classList.remove('hidden');
    document.getElementById('active-quiz-title').textContent = quiz.title;

    if (quiz.type === 'mcq') {
        document.getElementById('quiz-question-container').classList.remove('hidden');
        document.getElementById('quiz-text-input-section').classList.add('hidden');

        document.getElementById('quiz-question-text').textContent = quiz.question;
        document.getElementById('btn-opt-A').querySelector('span').textContent = `أ) ${quiz.options.A}`;
        document.getElementById('btn-opt-B').querySelector('span').textContent = `ب) ${quiz.options.B}`;
        document.getElementById('btn-opt-C').querySelector('span').textContent = `ج) ${quiz.options.C}`;
        document.getElementById('btn-opt-D').querySelector('span').textContent = `د) ${quiz.options.D}`;

        speak(`بدأ الاختبار الفوري. عنوان الاختبار: ${quiz.title}. السؤال هو: ${quiz.question}`);
    } else {
        document.getElementById('quiz-question-container').classList.add('hidden');
        document.getElementById('quiz-text-input-section').classList.remove('hidden');

        document.getElementById('assignment-student-answer').value = '';
        document.getElementById('braille-evaluation-box').classList.add('hidden');
        speak(`بدأ الواجب المقالي. السؤال هو: ${quiz.question}. يمكنك حل هذا الواجب بالكلام الصوتي أو بلوحة برايل.`);
    }

    let totalSecondsLeft = 10 * 60;
    const timerDisplay = document.getElementById('active-quiz-timer');
    timerDisplay.textContent = "10:00";

    if (quizTimerInterval) clearInterval(quizTimerInterval);
    quizTimerInterval = setInterval(() => {
        totalSecondsLeft -= 1;

        const mins = Math.floor(totalSecondsLeft / 60);
        const secs = totalSecondsLeft % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (totalSecondsLeft === 5 * 60) {
            speak("تنبيه هادئ: متبقي من الوقت خمس دقائق للاختبار.");
        } else if (totalSecondsLeft === 60) {
            speak("تنبيه عاجل: متبقي من الوقت دقيقة واحدة فقط.");
        } else if (totalSecondsLeft === 10) {
            speak("عشر ثوانٍ متبقية!");
        }

        if (totalSecondsLeft <= 0) {
            clearInterval(quizTimerInterval);
            submitQuizAnswer();
        }
    }, 1000);

    document.getElementById('active-quiz-panel').scrollIntoView({ behavior: 'smooth' });
    setTimeout(setupAccessibleVoices, 200);
}

function selectQuizOption(option) {
    selectedOption = option;
    speak(`تم اختيار الحرف ${option} كإجابتك المحتملة.`);

    ['A', 'B', 'C', 'D'].forEach(opt => {
        const btn = document.getElementById(`btn-opt-${opt}`);
        if (opt === option) {
            btn.classList.add('bg-yellow-400', 'text-black');
        } else {
            btn.classList.remove('bg-yellow-400', 'text-black');
        }
    });
}

function submitQuizAnswer() {
    if (quizTimerInterval) clearInterval(quizTimerInterval);

    const quiz = localData.assignments.find(a => a.id === selectedQuizId);
    if (!quiz) return;

    let finalAnswer = "";
    let score = 0;

    if (quiz.type === 'mcq') {
        if (!selectedOption) {
            speak("الرجاء تحديد خيار إجابة قبل الإرسال.");
            return;
        }
        finalAnswer = selectedOption;
        score = (selectedOption === quiz.correct) ? 100 : 0;
    } else {
        finalAnswer = document.getElementById('assignment-student-answer').value.trim();
        if (!finalAnswer) {
            speak("لا يمكنك إرسال إجابة فارغة.");
            return;
        }
        score = finalAnswer.length > 10 ? 90 : 50;
    }

    const submission = {
        studentName: currentUserSession?.name || "طالب تجريبي",
        studentContact: currentUserSession?.contact || "0555555555",
        parentContact: currentUserSession?.parentContact || "parent@cloudschool.com",
        quizId: selectedQuizId,
        quizTitle: quiz.title,
        studentAnswer: finalAnswer,
        initialScore: score,
        graderFeedback: quiz.type === 'mcq' ? "تصحيح فوري آلي" : "بانتظار المراجعة الذكية للذكاء الاصطناعي",
        timestamp: new Date().toLocaleTimeString('ar-EG')
    };

    localData.submissions.unshift(submission);
    saveSubmissionToFirebase(submission);

    speak("تم حفظ وإرسال إجابتك بنجاح. رائع يا بطل!");
    document.getElementById('active-quiz-panel').classList.add('hidden');
    selectedQuizId = null;
}

function setupPerkinsKeyboard() {
    window.addEventListener('keydown', (e) => {
        if (document.getElementById('perkins-braille-keyboard').classList.contains('hidden')) return;

        const key = e.key.toLowerCase();
        const validKeys = ['s', 'd', 'f', 'j', 'k', 'l', ' ', 'backspace', 'enter'];

        if (validKeys.includes(key)) {
            e.preventDefault();

            if (key === ' ') { addSpaceToAnswer(); return; }
            if (key === 'backspace') { deleteLastChar(); return; }
            if (key === 'enter') { submitQuizAnswer(); return; }

            perkinsKeysPressed[key] = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (document.getElementById('perkins-braille-keyboard').classList.contains('hidden')) return;

        const key = e.key.toLowerCase();
        if (perkinsKeysPressed[key]) {
            processPerkinsChord();
            perkinsKeysPressed = {};
        }
    });
}

function processPerkinsChord() {
    let dots = [];
    if (perkinsKeysPressed['f']) dots.push(1);
    if (perkinsKeysPressed['d']) dots.push(2);
    if (perkinsKeysPressed['s']) dots.push(3);
    if (perkinsKeysPressed['j']) dots.push(4);
    if (perkinsKeysPressed['k']) dots.push(5);
    if (perkinsKeysPressed['l']) dots.push(6);

    if (dots.length === 0) return;

    dots.sort((a, b) => a - b);
    const keyString = dots.join(',');
    const mappedChar = arabicBrailleMap[keyString];

    if (mappedChar) {
        const ansTextarea = document.getElementById('assignment-student-answer');
        ansTextarea.value += mappedChar;
        speak(mappedChar);
    } else {
        speak("تركيبة برايل غير معروفة.");
    }
}

function toggleBrailleDot(dotNumber) {
    const btn = document.getElementById(`dot-${dotNumber}`);
    if (currentBrailleDots.has(dotNumber)) {
        currentBrailleDots.delete(dotNumber);
        btn.classList.remove('active');
    } else {
        currentBrailleDots.add(dotNumber);
        btn.classList.add('active');
    }

    const dotsArray = Array.from(currentBrailleDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString] || "غير معروف";
    document.getElementById('braille-char-preview').textContent = `الحرف المشكل حالياً: ${mappedChar} (نقاط: ${keyString || 'لا يوجد'})`;
}

function enterBrailleChar() {
    const dotsArray = Array.from(currentBrailleDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString];

    if (mappedChar) {
        const ansTextarea = document.getElementById('assignment-student-answer');
        ansTextarea.value += mappedChar;
        speak(mappedChar);
        clearBrailleDots();
    } else {
        speak("التركيبة الحالية لا تمثل حرفاً عربياً صحيحاً.");
    }
}

function clearBrailleDots() {
    currentBrailleDots.clear();
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) dot.classList.remove('active');
    }
    document.getElementById('braille-char-preview').textContent = "الحرف المشكل حالياً: لا يوجد";
}

function addSpaceToAnswer() {
    const ansTextarea = document.getElementById('assignment-student-answer');
    ansTextarea.value += " ";
    speak("مسافة");
}

function deleteLastChar() {
    const ansTextarea = document.getElementById('assignment-student-answer');
    if (ansTextarea.value.length > 0) {
        ansTextarea.value = ansTextarea.value.slice(0, -1);
        speak("تم مسح الحرف الأخير");
    }
}

function toggleBrailleKeyboard(type) {
    const screenKbd = document.getElementById('screen-braille-keyboard');
    const perkinsKbd = document.getElementById('perkins-braille-keyboard');

    if (type === 'screen') {
        screenKbd.classList.toggle('hidden');
        perkinsKbd.classList.add('hidden');
        speak("تم تبديل لوحة برايل للشاشة التفاعلية.");
    } else {
        perkinsKbd.classList.toggle('hidden');
        screenKbd.classList.add('hidden');
        speak("تم تفعيل محاكي Perkins لسطح المكتب.");
    }
}

function previewVisionImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    uploadedImageMime = file.type;
    const reader = new FileReader();
    reader.onloadend = function () {
        uploadedImageBase64 = reader.result.split(',')[1];
        document.getElementById('vision-preview-container').classList.remove('hidden');
        document.getElementById('vision-image-preview').src = reader.result;
        speak("تم تحميل الصورة بنجاح. انقر على زر التحليل بالأسفل لتلقي الوصف الصوتي.");
    };
    reader.readAsDataURL(file);
}

function speakVisionResponse() {
    const text = document.getElementById('vision-response-text').textContent;
    speak(text);
}

function initGame(gameType) {
    activeGameType = gameType;
    currentGameScore = 0;
    gameTimeLeft = 30;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-timer').textContent = "30";

    if (gameTimerInterval) clearInterval(gameTimerInterval);

    const binaryOptions = document.getElementById('game-binary-options');
    const storyOptions = document.getElementById('game-story-options');

    if (gameType === 'seconds') {
        document.getElementById('game-title').textContent = "⏱️ لعبة تحدي الثواني (صواب أم خطأ)";
        document.getElementById('game-timer-wrapper').classList.remove('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak("بدأت لعبة تحدي الثواني. أمامك ثلاثون ثانية للإجابة على أكبر عدد ممكن!");
    } else if (gameType === 'hero') {
        document.getElementById('game-title').textContent = "🏆 لعبة البطل ضد الوقت";
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak("بدأت لعبة البطل ضد الوقت. الإجابة الخاطئة تنهي اللعبة، حاول كسر رقمك القياسي!");
    } else if (gameType === 'pvp') {
        document.getElementById('game-title').textContent = "⚔️ المبارزة الثنائية المباشرة (PvP)";
        document.getElementById('game-timer-wrapper').classList.remove('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak("بدأت المبارزة مع زميلك المحاكى ماجد الشريف. الأسرع في الإجابة يفوز بالدورة!");
    } else if (gameType === 'ai-story') {
        document.getElementById('game-title').textContent = "📖 الحكواتي الذكي التفاعلي (مغامرات مغطاة بالمنهج) ✨";
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        startAiStoryRound(null);
    }

    if (gameType !== 'hero' && gameType !== 'ai-story') {
        gameTimerInterval = setInterval(() => {
            gameTimeLeft -= 1;
            document.getElementById('game-timer').textContent = gameTimeLeft;
            if (gameTimeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
    setTimeout(setupAccessibleVoices, 200);
}

const randomMathQuestions = [
    { q: "العدد 9 هو مربع العدد 3؟", a: true },
    { q: "الأكسجين يمثل المكون الأساسي لغاز النيتروجين؟", a: false },
    { q: "المجموع الكلي لزوايا المثلث يساوي 180 درجة؟", a: true },
    { q: "الصيغة الكيميائية لملح الطعام هي H2O؟", a: false },
    { q: "الأرض تدور حول الشمس دورة كاملة كل 365 يوماً؟", a: true }
];

function startNewGameRound() {
    const randomIndex = Math.floor(Math.random() * randomMathQuestions.length);
    const questionData = randomMathQuestions[randomIndex];

    document.getElementById('game-question').textContent = questionData.q;
    currentCorrectAnswer = questionData.a;

    speak(questionData.q);
}

function answerGame(userAnswer) {
    if (userAnswer === currentCorrectAnswer) {
        currentGameScore += 10;
        document.getElementById('game-score').textContent = currentGameScore;

        playSuccessChime();
        speak("أحسنت! إجابة صحيحة.");

        startNewGameRound();
    } else {
        playFailChime();
        if (activeGameType === 'hero') {
            speak(`للأسف الإجابة خاطئة. انتهت اللعبة وحققت رصيد بطل يبلغ ${currentGameScore} نقطة.`);
            endGame();
        } else {
            speak("إجابة خاطئة، حاول مجدداً مع السؤال التالي.");
            startNewGameRound();
        }
    }
}

function endGame() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    document.getElementById('active-game-panel').classList.add('hidden');
    speak(`انتهت اللعبة بنجاح! نتيجتك النهائية هي ${currentGameScore} نقطة. رائع جداً يا بطل!`);
}

// (playSuccessChime and playFailChime defined above)

function startAITutorSpeech() {
    if (speechRecognizer) {
        speechRecognizer.start();
    } else {
        speak("الإدخال الصوتي غير متاح حالياً.");
    }
}

function speakAITutorResponse() {
    const responseText = document.getElementById('ai-tutor-response-text').textContent;
    speak(responseText);
}

async function gradeSubmissionWithAI(index) {
    const sub = localData.submissions[index];
    if (!sub) return;

    speak("جاري قياس جودة إجابة الطالب عبر المصحح المؤتمت للذكاء الاصطناعي.");

    const prompt = `قارن إجابة الطالب: "${sub.studentAnswer}" مع السؤال المقالي وصححه إملائياً ولغوياً وقدم تقريراً من سطرين متضمناً الدرجة المقترحة (من 100) مع الكلمات المشجعة للطالب الكفيف.`;

    try {
        const report = await callGeminiAPI(prompt, "أنت مصحح ومعلم تربوي للتعليم الفني والمدمج.");
        sub.initialScore = 95;
        sub.graderFeedback = report;

        renderTeacherSubmissions();
        speak("تم إنهاء التقييم الذكي بنجاح وتحديث واجهة المعلم.");
    } catch (e) {
        speak("فشل الاتصال بالمصحح التلقائي.");
    }
}

function toggleTeacherQuizType() {
    const type = document.getElementById('teacher-quiz-type').value;
    if (type === 'mcq') {
        document.getElementById('teacher-mcq-fields').classList.remove('hidden');
        document.getElementById('teacher-text-fields').classList.add('hidden');
    } else {
        document.getElementById('teacher-mcq-fields').classList.add('hidden');
        document.getElementById('teacher-text-fields').classList.remove('hidden');
    }
}

function handleTeacherAddBook(e) {
    e.preventDefault();
    const title = document.getElementById('teacher-book-title').value;
    const content = document.getElementById('teacher-book-content').value;
    const audio = document.getElementById('teacher-book-audio').value;

    const newBook = { id: 'b' + (localData.books.length + 1), title, content, audio };
    localData.books.push(newBook);

    saveBookToFirebase(newBook);
    speak("تم نشر الكتاب والمقرر بنجاح لجميع طلابك.");
    e.target.reset();
}

function handleTeacherAddQuiz(e) {
    e.preventDefault();
    const title = document.getElementById('teacher-quiz-title').value;
    const type = document.getElementById('teacher-quiz-type').value;

    let newQuiz = { id: 'a' + (localData.assignments.length + 1), title, type };

    if (type === 'mcq') {
        newQuiz.question = document.getElementById('teacher-quiz-q').value;
        newQuiz.options = {
            A: document.getElementById('teacher-quiz-oa').value,
            B: document.getElementById('teacher-quiz-ob').value,
            C: document.getElementById('teacher-quiz-oc').value,
            D: document.getElementById('teacher-quiz-od').value
        };
        newQuiz.correct = document.getElementById('teacher-quiz-correct').value;
    } else {
        newQuiz.question = document.getElementById('teacher-quiz-text-q').value;
        newQuiz.ideal = document.getElementById('teacher-quiz-ideal-ans').value;
    }

    localData.assignments.push(newQuiz);
    saveQuizToFirebase(newQuiz);
    speak("تم نشر الواجب والاختبار بنجاح للطلاب.");
    e.target.reset();
}

function renderTeacherSubmissions() {
    const tbody = document.getElementById('teacher-submissions-tbody');
    tbody.innerHTML = '';

    if (localData.submissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center">لا توجد إجابات مرفوعة من الطلاب حتى الآن.</td></tr>`;
        return;
    }

    localData.submissions.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3 border border-current font-bold">${escapeHtml(s.studentName)}</td>
            <td class="p-3 border border-current">${escapeHtml(s.quizTitle)}</td>
            <td class="p-3 border border-current font-mono text-xs">${escapeHtml(s.studentAnswer)}</td>
            <td class="p-3 border border-current">
                <span class="font-bold text-yellow-400">الدرجة: ${escapeHtml(String(s.initialScore))}</span><br>
                <span class="text-xs text-gray-300 block max-w-xs overflow-hidden text-ellipsis">${escapeHtml(s.graderFeedback)}</span>
            </td>
            <td class="p-3 border border-current">
                <button data-action="grade-ai" data-index="${idx}" class="px-2 py-1 bg-purple-600 text-white font-bold rounded text-xs btn-interactive">🤖 تصحيح وتغذية AI</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="grade-ai"]');
        if (btn) gradeSubmissionWithAI(parseInt(btn.dataset.index));
    });
}

// ==================== واجهة ولي الأمر ====================

function renderParentDashboard() {
    const list = document.getElementById('parent-grades-list');
    list.innerHTML = '';

    const linkedContact = currentUserSession?.childContact || "0555555555";
    const childSubmissions = localData.submissions.filter(s => s.studentContact === linkedContact || s.parentContact === currentUserSession?.contact);

    const childName = childSubmissions.length > 0 ? childSubmissions[0].studentName : "عبد الرحمن الشمري (حساب مرتبط)";
    document.getElementById('parent-linked-child-name').textContent = childName;

    if (childSubmissions.length === 0) {
        list.innerHTML = `<p class="p-4 text-center text-yellow-400">لا توجد درجات مسجلة للابن ${childName} حالياً. قم بحل بعض الواجبات بحساب الطالب لتراها هنا.</p>`;
        return;
    }

    childSubmissions.forEach(s => {
        const item = document.createElement('div');
        item.className = 'p-4 border-2 border-current rounded-xl flex justify-between items-center';
        item.innerHTML = `
            <div>
                <h4 class="font-bold text-xl">${escapeHtml(s.quizTitle)}</h4>
                <p class="text-xs text-gray-300">وقت الحل: ${escapeHtml(s.timestamp)}</p>
            </div>
            <span class="text-2xl font-black text-yellow-400">${escapeHtml(String(s.initialScore))} / 100</span>
        `;
        list.appendChild(item);
    });
}

// ==================== واجهة الإدارة ====================

function handleAdminCreateStudent(e) {
    e.preventDefault();
    const name = document.getElementById('admin-student-name').value;
    const grade = document.getElementById('admin-student-grade').value;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const newStudent = { name, grade, pin };
    localData.students.push(newStudent);
    saveStudentToFirebase(newStudent);

    speak(`تم إنشاء حساب جديد للطالب ${name}. ورمز الدخول الخاص به هو ${pin}.`);
    e.target.reset();
    renderAdminDashboard();
}

function renderAdminDashboard() {
    const tbody = document.getElementById('admin-students-tbody');
    tbody.innerHTML = '';

    localData.students.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2 border font-bold">${s.name}</td>
            <td class="p-2 border">${s.grade}</td>
            <td class="p-2 border font-mono font-black text-lg tracking-widest text-yellow-400 text-center">${s.pin}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== Firebase ====================

function saveBookToFirebase(book) { saveBook(book); }
function saveQuizToFirebase(quiz) { saveQuiz(quiz); }
function saveSubmissionToFirebase(sub) { saveSubmission(sub); }
function saveStudentToFirebase(student) { saveStudent(student); }

function syncFromFirebase_cb() {
    syncFromFirebase((collectionName, items) => {
        if (collectionName === 'books') {
            localData.books = items;
            if (!document.getElementById('student-sub-books')?.classList.contains('hidden')) {
                renderStudentBooks();
            }
        } else if (collectionName === 'assignments') {
            localData.assignments = items;
            if (!document.getElementById('student-sub-assignments')?.classList.contains('hidden')) {
                renderStudentAssignments();
            }
        } else if (collectionName === 'submissions') {
            localData.submissions = items;
            renderTeacherSubmissions();
            renderParentDashboard();
        }
    });
}

// ==================== [إصلاح #11] ربط الأحداث عبر addEventListener ====================

function updateProxyStatus() {
    checkProxyHealth().then((ok) => {
        document.getElementById('proxy-status-icon').textContent = ok ? '🟢' : '🔴';
        const el = document.getElementById('proxy-status');
        if (el) {
            el.textContent = ok ? (i18n.proxyConnected || 'متصل') : (i18n.proxyDisconnected || 'غير متصل');
        }
    });
}

function bindAllEvents() {
    // Header controls
    document.getElementById('tts-engine-toggle')?.addEventListener('click', toggleTtsEngine);
    document.getElementById('audio-co-pilot-toggle')?.addEventListener('click', toggleAudioCoPilot);

    // Theme buttons
    document.querySelectorAll('[data-theme]').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    // Text size
    document.querySelectorAll('[data-size-dir]').forEach(btn => {
        btn.addEventListener('click', () => adjustTextSize(parseInt(btn.dataset.sizeDir)));
    });

    // Logout
    document.querySelector('[data-action="logout"]')?.addEventListener('click', logout);

    // Login form
    document.querySelector('[data-action="login-form"]')?.addEventListener('submit', handleLoginSubmit);

    // Toggle between login and register
    document.getElementById('btn-show-register')?.addEventListener('click', () => {
        document.getElementById('login-form-container').classList.add('hidden');
        document.getElementById('register-form-container').classList.remove('hidden');
        document.getElementById('auth-warning-box').classList.add('hidden');
        speak("نموذج إنشاء حساب جديد. اختر نوع الحساب وأدخل بياناتك.");
    });
    document.getElementById('btn-show-login')?.addEventListener('click', () => {
        document.getElementById('register-form-container').classList.add('hidden');
        document.getElementById('login-form-container').classList.remove('hidden');
        document.getElementById('auth-warning-box').classList.add('hidden');
        speak("العودة لنموذج تسجيل الدخول.");
    });

    // Registration
    document.getElementById('reg-role')?.addEventListener('change', toggleRegFields);
    document.getElementById('reg-age')?.addEventListener('input', checkAgeLimitations);
    document.querySelector('[data-action="auth-form"]')?.addEventListener('submit', handleRegistrationSubmit);
    document.querySelector('[data-action="bypass-demo"]')?.addEventListener('click', bypassAuthDemo);

    // Role switcher
    document.querySelectorAll('[data-role-switch]').forEach(btn => {
        btn.addEventListener('click', () => switchRole(btn.dataset.roleSwitch));
    });

    // Student sections
    document.querySelectorAll('[data-student-section]').forEach(btn => {
        btn.addEventListener('click', () => openStudentSection(btn.dataset.studentSection));
    });
    document.querySelector('[data-action="close-section"]')?.addEventListener('click', closeStudentSection);

    // Audiobook player
    document.querySelector('[data-action="audiobook-tts"]')?.addEventListener('click', readActiveBookWithAi);
    document.querySelector('[data-action="summarize-book"]')?.addEventListener('click', summarizeCurriculumBookWithAI);
    document.querySelector('[data-action="audiobook-stop"]')?.addEventListener('click', () => controlAudiobook('stop'));

    // Quiz options
    ['A', 'B', 'C', 'D'].forEach(opt => {
        document.getElementById(`btn-opt-${opt}`)?.addEventListener('click', () => selectQuizOption(opt));
    });
    document.querySelector('[data-action="submit-quiz"]')?.addEventListener('click', submitQuizAnswer);

    // Speech to text
    document.getElementById('btn-mic-input')?.addEventListener('click', toggleAudioRecording);
    // Bind AI Tutor mic button if it exists
    document.getElementById('btn-ai-mic')?.addEventListener('click', toggleAudioRecording);

    // Braille keyboards
    document.querySelector('[data-action="toggle-screen-braille"]')?.addEventListener('click', () => toggleBrailleKeyboard('screen'));
    document.querySelector('[data-action="toggle-perkins"]')?.addEventListener('click', () => toggleBrailleKeyboard('perkins'));
    document.querySelector('[data-action="braille-evaluate"]')?.addEventListener('click', translateAndEvaluateBrailleWithAI);

    // Screen Reader Mode Toggle
    document.getElementById('btn-screen-reader-mode')?.addEventListener('click', toggleScreenReaderMode);

    // Proxy health check
    const savedProxyUrl = localStorage.getItem('cloudSchoolProxyUrl');
    const proxyUrlInput = document.getElementById('proxy-url-input');
    if (proxyUrlInput) {
        proxyUrlInput.value = savedProxyUrl || 'http://127.0.0.1:3001';
    }
    updateProxyStatus();

    // Proxy URL save/reset
    document.getElementById('btn-save-proxy-url')?.addEventListener('click', () => {
        const val = document.getElementById('proxy-url-input')?.value.trim();
        if (val) {
            localStorage.setItem('cloudSchoolProxyUrl', val);
            updateProxyStatus();
            speak('تم حفظ رابط الخادم الوسيط');
        }
    });
    document.getElementById('btn-reset-proxy-url')?.addEventListener('click', () => {
        localStorage.removeItem('cloudSchoolProxyUrl');
        if (proxyUrlInput) proxyUrlInput.value = 'http://127.0.0.1:3001';
        updateProxyStatus();
        speak('تم إعادة تعيين رابط الخادم الوسيط إلى الإعدادات الافتراضية');
    });

    // Screen braille dots
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`dot-${i}`)?.addEventListener('click', () => toggleBrailleDot(i));
    }
    document.querySelector('[data-action="enter-braille"]')?.addEventListener('click', enterBrailleChar);
    document.querySelector('[data-action="clear-braille"]')?.addEventListener('click', clearBrailleDots);
    document.querySelector('[data-action="add-space"]')?.addEventListener('click', addSpaceToAnswer);
    document.querySelector('[data-action="delete-char"]')?.addEventListener('click', deleteLastChar);

    // Cheat sheet braille dots
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`cheat-dot-${i}`)?.addEventListener('click', () => toggleCheatDot(i));
    }
    document.querySelector('[data-action="pronounce-cheat"]')?.addEventListener('click', pronounceCheatBraille);
    document.querySelector('[data-action="clear-cheat"]')?.addEventListener('click', clearCheatDots);

    // Games
    document.querySelectorAll('[data-game-type]').forEach(btn => {
        btn.addEventListener('click', () => initGame(btn.dataset.gameType));
    });
    document.querySelector('[data-action="answer-true"]')?.addEventListener('click', () => answerGame(true));
    document.querySelector('[data-action="answer-false"]')?.addEventListener('click', () => answerGame(false));

    // AI Tutor
    document.querySelector('[data-action="ai-tutor-speech"]')?.addEventListener('click', startAITutorSpeech);
    document.querySelector('[data-action="ask-ai"]')?.addEventListener('click', askAITutor);
    document.querySelector('[data-action="speak-ai-response"]')?.addEventListener('click', speakAITutorResponse);

    // Teacher
    document.getElementById('teacher-quiz-type')?.addEventListener('change', toggleTeacherQuizType);
    document.querySelector('[data-action="generate-ai-quiz"]')?.addEventListener('click', generateAIQuiz);
    document.querySelector('[data-action="teacher-book-form"]')?.addEventListener('submit', handleTeacherAddBook);
    document.querySelector('[data-action="teacher-quiz-form"]')?.addEventListener('submit', handleTeacherAddQuiz);

    // Admin
    document.querySelector('[data-action="admin-student-form"]')?.addEventListener('submit', handleAdminCreateStudent);

    // Vision
    document.getElementById('vision-image-input')?.addEventListener('change', previewVisionImage);
    document.querySelector('[data-action="analyze-image"]')?.addEventListener('click', analyzeImageWithGemini);
    document.querySelector('[data-action="speak-vision"]')?.addEventListener('click', speakVisionResponse);
}

// ==================== تهيئة التطبيق ====================

function safeInit(fn, name) {
    try {
        fn();
    } catch (e) {
        console.error('Init error in ' + name + ':', e);
        try {
            const msg = 'خطأ في تهيئة ' + name + ': ' + (e.message || '');
            const toast = document.getElementById('toast-message');
            if (toast) { toast.textContent = msg; toast.classList.remove('hidden'); }
        } catch(e2) {}
    }
}

window.onload = function () {
    safeInit(setupGlobalErrorHandler, 'معالج الأخطاء');
    safeInit(loadTheme, 'السمات');
    safeInit(loadTextSize, 'حجم الخط');
    safeInit(function(){ initFirebase(); }, 'Firebase');
    safeInit(setupAccessibleVoices, 'الصوت');
    safeInit(setupPerkinsKeyboard, 'برايل');
    safeInit(toggleRegFields, 'الحقول');
    safeInit(bindAllEvents, 'الأزرار');

    // تحسين إمكانية الوصول — إدارة التركيز
    document.addEventListener('section-opened', (e) => {
        const sectionTitle = document.getElementById('student-section-title');
        if (sectionTitle) setTimeout(() => sectionTitle.focus(), 100);
    });

    try {
        speak("مرحباً بك في منصة كلاود سكول التعليمية المحدثة لضعاف البصر والمكفوفين. يرجى تسجيل الدخول أولاً للبدء.");
    } catch (e) {
        console.error('Speak error:', e);
    }
};

