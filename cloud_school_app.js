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

/** Centralized Error Handler */

const ERROR_LEVELS = { INFO: 'info', WARN: 'warn', ERROR: 'error', FATAL: 'fatal' };

const listeners = [];

// ==== Timer tracking ==== 
let activeIntervals = [];
let activeTimeouts = [];
const originalSetInterval = setInterval;
setInterval = (callback, delay, ...args) => {
  const id = originalSetInterval(callback, delay, ...args);
  activeIntervals.push(id);
  return id;
};
const originalSetTimeout = setTimeout;
setTimeout = (callback, delay, ...args) => {
  const id = originalSetTimeout(callback, delay, ...args);
  activeTimeouts.push(id);
  return id;
};

function cleanupTimers() {
  // Clear all active intervals
  activeIntervals.forEach(id => {
    try { clearInterval(id); } catch (e) { console.warn('Failed to clear interval', id, e); }
  });
  activeIntervals = [];
  // Clear all active timeouts
  activeTimeouts.forEach(id => {
    try { clearTimeout(id); } catch (e) { console.warn('Failed to clear timeout', id, e); }
  });
  activeTimeouts = [];
}

window.addEventListener('beforeunload', cleanupTimers);

// Secure Random
function secureRandomInt(min, max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return min + (array[0] % (max - min + 1));
}

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
    utterance.lang = window.__speechLang || 'ar-SA';
    window.speechSynthesis.speak(utterance);
  } catch { /* speech not available */ }
}

function handleError(context, error) {
  const message = error?.message || String(error);
  const level = error?.fatal ? ERROR_LEVELS.FATAL : ERROR_LEVELS.ERROR;

  console.error(`[${context}] ${message}`, error);
  notifyListeners(level, context, error);

  const userMessages = {
    'api key': __('errorApiKey'),
    'network': __('errorNetwork'),
    'fetch': __('errorFetch'),
    'timeout': __('errorTimeout'),
    'permission': __('errorPermission'),
    'audio': __('errorAudio'),
    'firebase': __('errorFirebase'),
  };

  let userMessage = __('errorDefault');
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
  // تحديث نص زر اللغة
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = lang === 'ar' ? 'English' : 'عربي';
  // إعادة تطبيق كل الترجمات
  applyTranslations();
  applyJsTranslations();
  // تحديث لغة TTS
  initTtsLang();
  speak(__('langChanged'));
}

function __(key, ...args) {
  let val = i18n[key];
  if (!val) return key;
  if (args.length) {
    args.forEach((arg, i) => { val = val.replace(`{${i}}`, arg); });
  }
  return val;
}

function getPrompt(lang, arabicText, englishText) {
  return lang === 'ar' ? arabicText : englishText;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[key]) el.textContent = i18n[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[key]) el.placeholder = i18n[key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (i18n[key]) el.title = i18n[key];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (i18n[key]) el.setAttribute('aria-label', i18n[key]);
  });
}

function applyJsTranslations() {
  // تحديث النصوص الديناميكية في الـ JS
  const ageLevelBtn = document.getElementById('btn-age-level');
  if (ageLevelBtn && typeof ageLevelLabels !== 'undefined') {
    const labels = window['ageLevelLabels'] || ['تلقائي', 'طفل', 'شاب', 'بالغ'];
    const level = typeof currentAgeLevel !== 'undefined' ? currentAgeLevel : 0;
    ageLevelBtn.textContent = __('ageLevelLabel', labels[level] || labels[0]);
  }
}

function initTtsLang() {
  const speechLang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
  // تحديث النصوص الصوتية الثابتة (بناءً على اللغة الحالية)
  window.__speechLang = speechLang;
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
}
/** Firebase module - المصادقة والتخزين السحابي */

let app = null;
let db = null;
let auth = null;
let userId = null;
let isAuthReady = false;
let snapshotUnsubscribers = [];

const rawConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : {};
let firebaseConfig = rawConfig;
if (typeof rawConfig === 'string') {
    try { firebaseConfig = JSON.parse(rawConfig); } catch (e) { firebaseConfig = {}; }
}
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

function getUserId() { return userId; }
function isReady() { return isAuthReady; }
function getAppId() { return typeof __app_id !== 'undefined' ? __app_id : 'cloud-school-blind-v1'; }

async function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded');
    return;
  }
  if (Object.keys(firebaseConfig).length === 0) return;

  try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    auth.useDeviceLanguage();

    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        userId = user.uid;
        isAuthReady = true;
        const el = document.getElementById('user-id-display');
        if (el) el.textContent = `${user.email || userId.substring(0, 8)}`;
      } else {
        userId = null;
        isAuthReady = false;
      }
    });
  } catch (e) {
    console.warn('Firebase init error:', e.message);
  }
}
/**
 * Gemini module - جميع استدعاءات الذكاء الاصطناعي
 * 
 * جميع الطلبات تذهب عبر الـ proxy server لحماية مفتاح API.
 * المفتاح موجود فقط في .env على السيرفر، وليس في الواجهة الأمامية.
 */

function getProxyBase() {
    if (serverAvailable) return '';
    const override = localStorage.getItem('cloudSchoolProxyUrl');
    return override || 'http://localhost:3001';
}

async function proxyFetch(endpoint, payload) {
  const url = `${getProxyBase()}/api/gemini/${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  // عندما الخادم متاح، هو اللي عنده المفتاح — ما نرسل header
  if (!serverAvailable) {
    const apiKey = getGeminiKey();
    if (apiKey) headers['x-api-key'] = apiKey;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
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
      { text: getPrompt(getCurrentLang(), 'فرغ ما يقال حرفياً بالعربية بدون إضافات.', 'Transcribe the speech verbatim in English without any additions.') },
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
    { text: getPrompt(getCurrentLang(), 'صف هذه الصورة بالتفصيل لطالب كفيف بالعربية.', 'Describe this image in detail for a blind student in English. Describe the scene, colors, people, and details accurately.') },
    { inlineData: { mimeType, data: base64Image } },
  ]);
}

/** سؤال المعلم الافتراضي */
async function askTutor(question) {
  return callGemini(question, getPrompt(getCurrentLang(), 'أنت معلم ودود تشرح للمكفوفين ببساطة. ', 'You are a friendly teacher who explains things simply for blind students. ') + getAgeTone());
}


/** تلخيص كتاب */
async function summarizeBook(content) {
  return callGemini(
    `لخص: "${content}" مع 3 أسئلة مراجعة.`,
    getPrompt(getCurrentLang(), 'أنت خبير تلخيص مناهج للمكفوفين. ', 'You are an expert in summarizing curricula for blind students. ') + getAgeTone()
  );
}

/** تقييم إجابة برايل */
async function evaluateBraille(text) {
  return callGemini(
    `صحح النص: "${text}" وقدم تقريراً تشجيعياً.`,
    getPrompt(getCurrentLang(), 'أنت معلم لغة عربية وخبير برايل. ', 'You are an Arabic language teacher and Braille expert. ') + getAgeTone()
  );
}

/** توليد اختبار */
async function generateQuiz() {
  const json = await callGemini(
    'ولد سؤال اختيار من متعدد في العلوم. أخرج JSON فقط: {question, A, B, C, D, correct}.',
    getPrompt(getCurrentLang(), 'أنت مصمم اختبارات. ', 'You are a quiz designer. ') + getAgeTone()
  );
  try { return JSON.parse(json.replace(/```json|```/g, '').trim()); }
  catch (e) { return { question: 'خطأ في توليد السؤال', A: 'نعم', B: 'لا', C: '', D: '', correct: 'A' }; }
}

/** قصة تفاعلية */
async function generateStory(choiceIndex) {
  const prompt =
    choiceIndex === null
      ? 'اصنع قصة تفاعلية عن الفضاء بـ JSON: {story, options:[]}. 3 خيارات.'
      : `استمرار القصة. اختار الطالب الخيار ${choiceIndex + 1}. أخرج JSON: {story, options:[]}.`;

  const json = await callGemini(prompt, getPrompt(getCurrentLang(), 'أنت راوي قصص. ', 'You are a storyteller. ') + getAgeTone());
  try { return JSON.parse(json.replace(/```json|```/g, '').trim()); }
  catch (e) { return { story: 'عذراً، تعذر توليد القصة. حاول مرة أخرى.', options: ['حاول مرة أخرى', 'العودة للقائمة الرئيسية', 'اختيار قصة أخرى'] }; }
}

/** تصحيح إجابة مقالية */
async function gradeAnswer(studentAnswer) {
  return callGemini(
    `قيم الإجابة: "${studentAnswer}" وأعط درجة من 100 مع تعليق.`,
    getPrompt(getCurrentLang(), 'أنت مصحح.', 'You are a grader.')
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
  localData: 'cloudSchoolData',
};

// ====== Local Data ======
var localData = {
    books: [
        { id: 'b1', title: 'كيمياء الصف العاشر - الوحدة الأولى', content: 'مرحبًا بك في وحدة الكيمياء. في هذا الدرس، سنتعرف على العناصر والروابط التساهمية والأيونية وتفاعلات الطاقة والحرارة.', audio: '' },
        { id: 'b2', title: 'تاريخ وحضارة الوطن العربي', content: 'مرحبًا بك في تاريخ العرب المجيد. سنتعلم اليوم عن الحضارات القديمة التي قامت في شبه الجزيرة العربية والهلال الخصيب ومصر الفرعونية.', audio: '' }
    ],
    assignments: [
        { id: 'a1', title: 'واجب العلوم والفيزياء الأول', type: 'mcq', question: 'ما هو المكون الأساسي لغاز الأوزون؟', options: { A: 'الهيدروجين', B: 'الأكسجين الثلاثي', C: 'النيتروجين', D: 'غاز ثاني أكسيد الكربون' }, correct: 'B' },
        { id: 'a2', title: 'اختبار اللغة العربية المقالي', type: 'text', question: 'اكتب فقرة قصيرة تتحدث فيها عن فضل المعلم في المجتمع وأهمية العلم؟', ideal: 'يعد العلم ركيزة المجتمعات الأساسية، والمعلم هو النور الذي يبدد الظلام...' }
    ],
    submissions: [],
    notifications: [],
    students: [
        { name: 'أحمد خالد', grade: 'الصف العاشر', pin: '0000' },
        { name: 'سارة عبد الله', grade: 'الصف التاسع', pin: '0000' }
    ]
};

// ====== Control Variables ======
var audioCoPilotEnabled = true;
var screenReaderMode = false;
var activeRole = 'student';
var currentBrailleDots = new Set();
var selectedQuizId = null;
var activeGameTimer = null;
var activeGameType = '';
var currentGameScore = 0;
var gameTimeLeft = 30;
var ttsEngineMode = localStorage.getItem('cloudSchoolTtsEngine') || 'browser';
var activeAudioElement = null;
var currentUserSession = null;
var currentAgeLevel = localStorage.getItem('cloudSchoolAgeLevel') || 'auto';
var currentlyPlayingBookId = null;
var selectedOption = null;
var quizTimerInterval = null;
var currentCorrectAnswer = null;
var gameTimerInterval = null;
var uploadedImageBase64 = null;
var uploadedImageMime = null;
var accessibleVoicesController = null;
var gameAudioContext = null;

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
function showToast(text, isError = false) {
  const toast = document.getElementById('toast-message');
  if (!toast) return;
  toast.textContent = text;
  toast.className = `fixed bottom-4 right-4 z-50 p-4 font-bold rounded-xl shadow-xl text-xl border-2 ${isError ? 'bg-red-600 text-white border-red-800' : 'bg-yellow-400 text-black border-black'} hidden`;
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

// ====== Password Hashing (SHA-256 via SubtleCrypto) ======
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isHashed(password) {
  return /^[a-f0-9]{64}$/.test(password);
}

// ====== Speech ======
function speak(text) {
  if (!audioCoPilotEnabled) return;
  const ariaLive = document.getElementById('aria-live');
  if (ariaLive) ariaLive.textContent = text;
  if (screenReaderMode) return;
  speakToUser(text);
}

function stopAllAudio() {
  window.speechSynthesis.cancel();
}

// ====== TTS Engine Toggle ======
function toggleTtsEngine() {
  ttsEngineMode = ttsEngineMode === 'gemini' ? 'browser' : 'gemini';
  localStorage.setItem('cloudSchoolTtsEngine', ttsEngineMode);
  const btn = document.getElementById('tts-engine-toggle');
  if (btn) {
    btn.textContent = ttsEngineMode === 'gemini'
      ? '🎙️ ' + __('ttsGemini')
      : '🎙️ ' + __('ttsBrowser');
  }
  speak(ttsEngineMode === 'gemini' ? __('ttsGeminiActivated') : __('ttsBrowserActivated'));
}

// ====== المرحلة العمرية ======
function setupAgeLevel() {
    var btn = document.getElementById('btn-age-level');
    if (!btn) return;
    updateAgeLevelButton();
    btn.addEventListener('click', function() { toggleAgeLevel(); });
}

function toggleAgeLevel() {
    var levels = ['auto', 'child', 'teen', 'adult'];
    var labels = { auto: 'تلقائي', child: 'طفل', teen: 'شاب', adult: 'بالغ' };
    var idx = levels.indexOf(currentAgeLevel);
    currentAgeLevel = levels[(idx + 1) % levels.length];
    localStorage.setItem('cloudSchoolAgeLevel', currentAgeLevel);
    updateAgeLevelButton();
    speak(__('ageSet', labels[currentAgeLevel]));
}

function updateAgeLevelButton() {
    var btn = document.getElementById('btn-age-level');
    var labels = { auto: 'تلقائي', child: 'طفل', teen: 'شاب', adult: 'بالغ' };
    if (btn) btn.textContent = __('ageButton', labels[currentAgeLevel] || 'تلقائي');
}

function getAgeTone() {
    var age = currentUserSession?.age || 14;
    switch (currentAgeLevel) {
        case 'child': return 'استخدم أسلوباً مبسطاً جداً مناسباً للأطفال، مع أمثلة يومية ملموسة، وتشجيع مستمر.';
        case 'teen': return 'استخدم أسلوباً شبابياً مناسباً للمراهقين، مع تحديات فكرية مناسبة، ولغة واضحة لكنها غير طفولية.';
        case 'adult': return 'استخدم أسلوباً أكاديمياً رصيناً مناسباً للبالغين، مع تحليل عميق ومصطلحات دقيقة.';
        default:
            if (age < 12) return 'استخدم أسلوباً مبسطاً جداً مناسباً للأطفال.';
            if (age < 18) return 'استخدم أسلوباً مناسباً للمراهقين، واضح وجذاب.';
            return 'استخدم أسلوباً أكاديمياً مناسباً للبالغين.';
    }
}

// ====== Screen Reader Mode ======
function toggleScreenReaderMode() {
  screenReaderMode = !screenReaderMode;
  const btn = document.getElementById('btn-screen-reader-mode');
  if (!btn) return;
  if (screenReaderMode) {
    btn.textContent = __('srModeOn');
    stopAllAudio();
    const ariaLive = document.getElementById('aria-live');
    if (ariaLive) ariaLive.textContent = __('srModeActive');
  } else {
    btn.textContent = __('srModeOff');
    speak(__('srModeOffSpoken'));
  }
}

// ====== Audio Co-Pilot ======
function toggleAudioCoPilot() {
  audioCoPilotEnabled = !audioCoPilotEnabled;
  const btn = document.getElementById('audio-co-pilot-toggle');
  if (!btn) return;
  if (audioCoPilotEnabled) {
    btn.textContent = __('audioCpOn');
    btn.setAttribute('aria-pressed', 'true');
    speak(__('audioCpActivated'));
  } else {
    btn.textContent = __('audioCpOff');
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
  const chosen = sizes[1 + Math.min(Math.max(offset, -2), 6)] || 1.125;
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

function cycleTheme() {
    var themes = ['dark-hc', 'light-hc', 'classic'];
    var current = localStorage.getItem(STORAGE_KEYS.theme) || 'dark-hc';
    var idx = themes.indexOf(current);
    var next = themes[(idx + 1) % themes.length];
    setTheme(next);
    var labels = { 'dark-hc': 'أصفر على أسود', 'light-hc': 'أسود على أبيض', 'classic': 'كلاسيك أزرق' };
    speak(__('themeSet', labels[next] || next));
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

// ====== Proxy Health Check ======
async function checkProxyHealth() {
  try {
    const base = getProxyBase();
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

// ====== Keyboard Shortcuts Help ======
function showKeyboardHelp() {
    var existing = document.getElementById('shortcuts-help-overlay');
    if (existing) { existing.remove(); return; }
    var overlay = document.createElement('div');
    overlay.id = 'shortcuts-help-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
    overlay.innerHTML = '<div class="card p-6 rounded-3xl max-w-lg border-4 border-yellow-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="' + __('keyboardHelpLabel') + '" aria-modal="true">' +
        '<h2 class="text-3xl font-black text-yellow-400 mb-4 text-center">⌨️ ' + __('keyboardHelp') + '</h2>' +
        '<div class="space-y-3 text-right" dir="rtl">' +
        '<div class="grid grid-cols-2 gap-2 font-bold border-b border-gray-600 pb-2 mb-2"><span>' + __('keyboardColKey') + '</span><span>' + __('keyboardColFunc') + '</span></div>' +
        shortcutRow('H أو F1', __('keyboardShortcutHelp')) +
        shortcutRow('Escape', __('keyboardShortcutClose')) +
        shortcutRow('1', __('sectionBooks')) +
        shortcutRow('2', __('sectionAssignments')) +
        shortcutRow('3', __('sectionGames')) +
        shortcutRow('4', __('keyboardSecTutor')) +
        shortcutRow('5', __('keyboardSecVision')) +
        shortcutRow('6', __('sectionDialogic')) +
        shortcutRow('7', __('sectionStudyGroup')) +
        shortcutRow('8', __('sectionDashboard')) +
        shortcutRow('0', __('keyboardHome')) +
        shortcutRow('B', __('keyboardBraille')) +
        shortcutRow('T', __('keyboardTheme')) +
        shortcutRow('R', __('keyboardRoles')) +
        shortcutRow('Ctrl+M', __('keyboardMic')) +
        shortcutRow('Ctrl+Shift+S', __('keyboardSR')) +
        shortcutRow('Ctrl+Shift+A', __('keyboardAudioCp')) +
        shortcutRow('Ctrl+Shift+T', __('keyboardTts')) +
        shortcutRow('+ / -', __('keyboardFontSize')) +
        '</div>' +
        '<button id="btn-close-help" class="w-full mt-4 p-4 bg-yellow-400 text-black font-black text-xl rounded-xl btn-interactive">' + __('keyboardClose') + '</button></div>';
    document.body.appendChild(overlay);
    document.getElementById('btn-close-help')?.addEventListener('click', function() { overlay.remove(); });
    document.getElementById('btn-close-help')?.focus();
    trapFocus(overlay);
    speak(__('keyboardHelpOpened'));
}

function shortcutRow(key, desc) {
    return '<div class="grid grid-cols-2 gap-2 py-1"><span class="font-mono bg-gray-800 px-2 py-1 rounded text-yellow-300 text-center dir-ltr text-sm">' + key + '</span><span class="text-gray-200">' + desc + '</span></div>';
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        var tag = document.activeElement?.tagName || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        var helpOverlay = document.getElementById('shortcuts-help-overlay');
        var key = e.key;
        var ctrl = e.ctrlKey;

        // Help
        if (key === 'h' || key === 'H' || key === 'F1') {
            e.preventDefault();
            showKeyboardHelp();
            return;
        }
        // Close help / go back
        if (key === 'Escape') {
            if (helpOverlay) { helpOverlay.remove(); return; }
            closeStudentSection();
            return;
        }
        // Only work when student view is active
        if (document.getElementById('view-student')?.classList.contains('hidden')) return;
        if (helpOverlay) return;

        if (!ctrl) {
            // Navigation shortcuts (single key)
            switch (key) {
                case '1': e.preventDefault(); openStudentSection('books'); break;
                case '2': e.preventDefault(); openStudentSection('assignments'); break;
                case '3': e.preventDefault(); openStudentSection('games'); break;
                case '4': e.preventDefault(); openStudentSection('ai-tutor'); break;
                case '5': e.preventDefault(); openStudentSection('image-describer'); break;
                case '6': e.preventDefault(); openStudentSection('dialogic-classroom'); break;
                case '7': e.preventDefault(); openStudentSection('study-group'); break;
                case '8': e.preventDefault(); openStudentSection('dashboard'); break;
                case '0': e.preventDefault(); closeStudentSection(); break;
                case 'b': case 'B':
                    e.preventDefault();
                    document.getElementById('dot-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    document.getElementById('dot-1')?.focus();
                    speak(__('brailleBoardHelp'));
                    break;
                case 't': case 'T':
                    e.preventDefault();
                    cycleTheme();
                    break;
                case 'r': case 'R':
                    e.preventDefault();
                    var roleBar = document.getElementById('dev-role-bar');
                    if (roleBar) {
                        roleBar.classList.toggle('hidden');
                        speak(roleBar.classList.contains('hidden') ? __('roleBarHidden') : __('roleBarVisible'));
                    }
                    break;
            }
        } else {
            // Ctrl+ combinations
            var shift = e.shiftKey;
            switch (key) {
                case 'm': case 'M': e.preventDefault(); toggleAudioRecording(); break;
                case 's': case 'S': if (shift) { e.preventDefault(); toggleScreenReaderMode(); } break;
                case 'a': case 'A': if (shift) { e.preventDefault(); toggleAudioCoPilot(); } break;
                case 't': case 'T': if (shift) { e.preventDefault(); toggleTtsEngine(); } break;
                case '=': e.preventDefault(); adjustTextSize(1); break;
                case '-': e.preventDefault(); adjustTextSize(-1); break;
            }
        }
    });
}

// ====== Audio Recording ======
var mediaRecorder = null;
var audioChunks = [];
var isRecording = false;

function getIsRecording() { return isRecording; }

function stopAudioTracks() {
  if (mediaRecorder && mediaRecorder.stream) {
    mediaRecorder.stream.getTracks().forEach(function(t) { t.stop(); });
  }
}

function toggleAudioRecording() {
  var micBtn = document.getElementById('btn-mic-input');
  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    stopAudioTracks();
    isRecording = false;
    if (micBtn) micBtn.classList.remove('bg-red-600', 'animate-pulse');
    speak(__('micStop'));
  } else {
    if (!navigator.mediaDevices?.getUserMedia) {
      speak(__('micUnsupported'));
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = async function() {
        var blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        audioChunks = [];
        try {
          var base64 = await blobToBase64(blob);
          var text = await transcribeAudio(base64, mediaRecorder.mimeType);
          if (text?.trim()) {
            var ans = document.getElementById('assignment-student-answer');
            if (ans) ans.value += (ans.value ? ' ' : '') + text.trim();
            var aiQ = document.getElementById('ai-tutor-query');
            if (aiQ && document.getElementById('student-sub-ai-tutor') && !document.getElementById('student-sub-ai-tutor').classList.contains('hidden')) {
              aiQ.value = text.trim();
            }
            speak(__('micCaptureOk'));
          }
        } catch(e) { speak(__('micError')); }
        stopAudioTracks();
      };
      mediaRecorder.start();
      isRecording = true;
      if (micBtn) micBtn.classList.add('bg-red-600', 'animate-pulse');
      speak(__('micStart'));
    }).catch(function() { speak(__('micPermission')); });
  }
}

function blobToBase64(blob) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onloadend = function() { resolve(reader.result.split(',')[1]); };
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
function trapFocus(container) {
  var focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    var elements = container.querySelectorAll(focusableSelector);
    if (elements.length === 0) return;
    var first = elements[0];
    var last = elements[elements.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  container.addEventListener('keydown', handleKeyDown);
  var observer = new MutationObserver(function() {
    if (!document.body.contains(container)) {
      observer.disconnect();
      container.removeEventListener('keydown', handleKeyDown);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

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

// ====== Gemini API Key (obfuscated at rest) ======
function _obfuscate(str) {
  return btoa(str.split('').reverse().join(''));
}
function _deobfuscate(str) {
  try { return atob(str).split('').reverse().join(''); } catch { return ''; }
}

function getGeminiKey() {
  const stored = localStorage.getItem('gemini_api_key');
  if (stored) {
    const decoded = _deobfuscate(stored);
    if (decoded) return decoded;
  }
  const key = prompt(__('promptApiKey'));
  if (key) {
    localStorage.setItem('gemini_api_key', _obfuscate(key));
    return key;
  }
  return '';
}

function setGeminiKey(key) {
  if (key) {
    localStorage.setItem('gemini_api_key', _obfuscate(key));
  } else {
    localStorage.removeItem('gemini_api_key');
  }
}

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
        const msg = __("ageUnder12");
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

        labelParentContact.innerHTML = __('parentContactLabel');

        speak(__('ageConfirm12'));
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const warningBox = document.getElementById('auth-warning-box');
    const warningText = document.getElementById('auth-warning-text');
    warningBox.classList.add('hidden');

    if (!email || !password) {
        warningText.textContent = __('loginRequired');
        warningBox.classList.remove('hidden');
        speak(__('loginRequired'));
        return;
    }

    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
            // After Firebase Auth success, get/create proxy session
            if (serverAvailable && cred.user) {
                try {
                    const idToken = await cred.user.getIdToken();
                    const user = await serverLoginFirebase(idToken);
                    currentUserSession = {
                        name: user.name || email,
                        contact: email,
                        role: user.role || 'student',
                        serverId: user.id || cred.user.uid,
                        serverAuth: true
                    };
                    syncDataFromServer();
                } catch (e) {
                    console.warn('Proxy session after Firebase login failed:', e.message);
                    currentUserSession = {
                        name: email.split('@')[0],
                        contact: email,
                        role: 'student',
                        userId: cred.user.uid,
                        serverAuth: false
                    };
                }
            } else {
                currentUserSession = {
                    name: email.split('@')[0],
                    contact: email,
                    role: 'student',
                    userId: cred.user.uid,
                    serverAuth: false
                };
            }
            enterApp(currentUserSession);
        } else {
            // Fallback: localStorage accounts
            let savedAccounts = [];
            try { savedAccounts = JSON.parse(localStorage.getItem('cloudSchoolAccounts') || '[]'); } catch (e) { savedAccounts = []; }
            const hashedInput = await hashPassword(password);
            let account = savedAccounts.find(a => a.contact === email && a.password === hashedInput);
            if (!account) {
                account = savedAccounts.find(a => a.contact === email && a.password === password);
                if (account && !isHashed(password)) {
                    account.password = hashedInput;
                    localStorage.setItem('cloudSchoolAccounts', JSON.stringify(savedAccounts));
                }
            }
            if (account) {
                currentUserSession = account;
                enterApp(currentUserSession);
            } else {
                warningText.textContent = __('loginFailed');
                warningBox.classList.remove('hidden');
                speak(__('loginFailed'));
            }
        }
    } catch (err) {
        console.error('Login error:', err);
        let msg = __('loginFailed');
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            msg = __('loginFailed');
        } else if (err.code === 'auth/invalid-email') {
            msg = __('loginFailed');
        } else if (err.code === 'auth/too-many-requests') {
            msg = __('loginTooMany');
        }
        warningText.textContent = msg;
        warningBox.classList.remove('hidden');
        speak(msg);
    }
}

function enterApp(session) {
    currentUserSession = session;
    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('dev-role-bar').classList.remove('hidden');
    document.querySelector('[data-action="logout"]')?.classList.remove('hidden');
    document.getElementById('active-user-badge').textContent = __('userBadge', session.name, getArabicRoleName(session.role));
    switchRole(session.role);
    showToast(__('loginSuccess', session.name));
    if (session.serverAuth) syncDataFromServer();
}

async function handleRegistrationSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const contact = document.getElementById('reg-contact').value.trim();
    const role = document.getElementById('reg-role').value;
    const age = parseInt(document.getElementById('reg-age').value, 10);
    const plainPassword = document.getElementById('reg-password-new').value;

    const warningBox = document.getElementById('auth-warning-box');
    const warningText = document.getElementById('auth-warning-text');
    warningBox.classList.add('hidden');

    let parentContact = '';
    if (role === 'student') {
        if (age < 12) {
            const msg = __("registerAgeRestriction");
            warningText.textContent = msg;
            warningBox.classList.remove('hidden');
            speak(msg);
            return;
        }
        parentContact = document.getElementById('reg-parent-contact').value.trim();
        if (!parentContact) {
            const msg = __("registerParentRequired");
            warningText.textContent = msg;
            warningBox.classList.remove('hidden');
            speak(msg);
            document.getElementById('reg-parent-contact').focus();
            return;
        }
    }

    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            // Firebase Auth: create user with email/password
            const cred = await firebase.auth().createUserWithEmailAndPassword(contact, plainPassword);
            // Update Firebase profile with display name
            await cred.user.updateProfile({ displayName: name });

            // Create user profile on proxy server
            if (serverAvailable) {
                try {
                    const idToken = await cred.user.getIdToken();
                    const user = await serverRegisterFirebase(idToken, name, role, age, parentContact);
                    enterApp({
                        name: user.name || name,
                        contact: user.email || contact,
                        role: user.role || role,
                        serverId: user.id || cred.user.uid,
                        serverAuth: true
                    });
                    return;
                } catch (e) {
                    console.warn('Proxy registration after Firebase failed:', e.message);
                }
            }

            // Firebase only (no proxy)
            enterApp({
                name: name,
                contact: contact,
                role: role,
                age: age,
                parentContact: parentContact,
                userId: cred.user.uid,
                serverAuth: false
            });
        } else {
            // Fallback: localStorage
            const hashedPassword = await hashPassword(plainPassword);
            if (role === 'parent') {
                const childContact = document.getElementById('reg-child-contact').value.trim();
                currentUserSession = { name, contact, role, childContact, password: hashedPassword };
            } else {
                currentUserSession = { name, contact, role, age, parentContact, password: hashedPassword };
            }
            let savedAccounts = [];
            try { savedAccounts = JSON.parse(localStorage.getItem('cloudSchoolAccounts') || '[]'); } catch (e) { savedAccounts = []; }
            savedAccounts.push(currentUserSession);
            localStorage.setItem('cloudSchoolAccounts', JSON.stringify(savedAccounts));
            enterApp(currentUserSession);
        }
    } catch (err) {
        console.error('Registration error:', err);
        let msg = __('loginFailed');
        if (err.code === 'auth/email-already-in-use') msg = __('loginFailed');
        else if (err.code === 'auth/weak-password') msg = __('loginFailed');
        else if (err.code === 'auth/invalid-email') msg = __('loginFailed');
        warningText.textContent = msg;
        warningBox.classList.remove('hidden');
        speak(msg);
    }
}

// DEV-ONLY: bypass for testing — disabled unless __DEV__ flag is set
window.__DEV__ = false;
function bypassAuthDemo() {
    if (!window.__DEV__) { console.warn('[SECURITY] bypassAuthDemo is disabled in production'); return; }
    currentUserSession = {
        name: "أحمد خالد (طالب)",
        contact: "0555555555",
        role: "student",
        age: 14,
        parentContact: "parent@cloudschool.com"
    };
    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('dev-role-bar').classList.remove('hidden');
    document.querySelector('[data-action="logout"]')?.classList.remove('hidden');
    document.getElementById('active-user-badge').textContent = __('demoUserBadge');
    switchRole('student');
}

function logout() {
    if (currentUserSession?.serverAuth) serverLogout();
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().catch(function(e) { console.warn('Firebase signOut error:', e); });
    }
    currentUserSession = null;
    userId = null;
    isAuthReady = false;
    cleanupTimers();
    document.getElementById('auth-gate').classList.remove('hidden');
    document.getElementById('dev-role-bar').classList.add('hidden');
    document.querySelector('[data-action="logout"]')?.classList.add('hidden');
    document.getElementById('login-form-container').classList.remove('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    speak(__('logoutSuccess'));
}

async function syncDataFromServer() {
    if (!serverAvailable) return;
    try {
        const [books, assignments, submissions, students] = await Promise.all([
            serverFetch('curriculum_modules'),
            serverFetch('assignments'),
            serverFetch('submissions'),
            serverFetch('students')
        ]);
        if (books && books.length > 0) localData.books = books;
        if (assignments && assignments.length > 0) localData.assignments = assignments;
        if (submissions && submissions.length > 0) localData.submissions = submissions;
        if (students && students.length > 0) localData.students = students;
        saveLocalData();
    } catch (e) {
        console.warn('Server sync failed (using local data):', e.message);
    }
}

function getArabicRoleName(role) {
    const roles = { student: __('roleStudent'), parent: __('roleParent'), teacher: __('roleTeacher'), admin: __('roleAdmin') };
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
        renderStudentStats();
        speak(__('studentViewActive'));
    } else if (role === 'teacher') {
        document.getElementById('view-teacher').classList.remove('hidden');
        speak(__('teacherViewActive'));
        renderTeacherDashboard();
        renderTeacherSubmissions();
    } else if (role === 'parent') {
        document.getElementById('view-parent').classList.remove('hidden');
        speak(__('parentViewActive'));
        renderParentDashboard();
    } else if (role === 'admin') {
        document.getElementById('view-admin').classList.remove('hidden');
        speak(__('adminViewActive'));
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
        speak(__('brailleFirst'));
        return;
    }

    const evalBox = document.getElementById('braille-evaluation-box');
    const evalText = document.getElementById('braille-evaluation-text');

    evalBox.classList.remove('hidden');
    showLoading('braille-evaluation-text', __('loadingBrailleTranslate'));
    speak(__('brailleChecking'));

    const prompt = `لقد كتب طالب كفيف هذا النص التعليمي باللغة العربية: "${answerText}". قم بمراجعة الإملاء، وتوضيح الكلمات المترجمة والتركيبات النحوية، وإعطائه تقريراً تربوياً وصوتياً فائق التشجيع لتنمية مهارات برايل لديه، مع تقديم النص المصحح والنهائي بشكل واضح وبسيط ومريح للقراءة.`;

    try {
        const resultText = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "أنت معلم لغة عربية متميز وخبير في ترجمة وتصحيح لغة برايل وطريقة Perkins للمكفوفين من جميع المراحل العمرية. ", "You are an excellent Arabic language teacher and expert in Braille translation and grading for blind students of all ages using the Perkins method. ") + getAgeTone());
        evalText.textContent = resultText;
        speak(resultText);
    } catch (error) {
        console.error(error);
        evalText.textContent = __('brailleEvalError');
        speak(__('brailleEvalFailed'));
    }
}

async function summarizeCurriculumBookWithAI() {
    if (!currentlyPlayingBookId) return;
    const book = localData.books.find(b => b.id === currentlyPlayingBookId);
    if (!book) return;

    const summaryBox = document.getElementById('book-ai-summary-box');
    summaryBox.classList.remove('hidden');
    showLoading('book-ai-summary-text', __('loadingBookSummary'));
    speak(__('bookSummarizing'));

    const prompt = `قم بتلخيص المحتوى الدراسي التالي بالتفصيل بأسلوب نقاطي سمعي فائق الوضوح ومناسب للمكفوفين من جميع الأعمار لتسهيل الحفظ كبطاقات استذكار سريعة: "${book.content}". ولد أيضاً ثلاثة أسئلة مراجعة وتنشيط للذاكرة في نهاية التلخيص. ` + getAgeTone();

    try {
        const resultText = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "أنت خبير تعليمي متميز في صياغة وتلخيص المناهج الدراسية لضعاف البصر بطريقة سمعية مبسطة للغاية.", "You are an excellent educational expert in formulating and summarizing curricula for the visually impaired in a highly simplified audio manner."));
        document.getElementById('book-ai-summary-text').textContent = resultText;
        speak(resultText);
    } catch (error) {
        console.error(error);
        document.getElementById('book-ai-summary-text').textContent = __('bookSummaryError');
        speak(__('bookSummaryFailed'));
    }
}

async function startAiStoryRound(choiceIndex = null) {
    const questionText = document.getElementById('game-question');
    const binaryOptions = document.getElementById('game-binary-options');
    const storyOptions = document.getElementById('game-story-options');

    binaryOptions.classList.add('hidden');
    storyOptions.classList.remove('hidden');
    storyOptions.innerHTML = '';

    showLoading('game-question', __('loadingStory'));
    speak(__('storyGenerating'));

    let prompt = "";
    if (choiceIndex === null) {
        prompt = "اصنع قصة تعليمية تفاعلية قصيرة مشوقة وملهمة باللغة العربية الفصحى لطلاب مكفوفين عن مغامرة في النظام الشمسي لتعلم الكواكب. أنهِ المقطع الأول بـ 3 خيارات لمواصلة المغامرة. أخرج النتيجة بصيغة JSON فقط بدون علامات markdown، وتحتوي الهيكل التالي: { 'story': 'نص المقطع المثير والمبسط وعلاقته بالمقرر الدراسي', 'options': ['خيار المغامرة الأول المثير كجملة قصيرة', 'خيار المغامرة الثاني المثير كجملة قصيرة', 'خيار المغامرة الثالث المثير كجملة قصيرة'] }";
    } else {
        prompt = `استكمالاً للقصة السابقة المروية، اختار الطالب الخيار رقم ${choiceIndex + 1}. تابع تفاصيل المغامرة في الفضاء وعلمهم معلومات جديدة ومفيدة، ثم أنهِ المقطع مجدداً بـ 3 خيارات جديدة لمتابعة القصة ومواصلة التحدي. أخرج النتيجة بصيغة JSON فقط بنفس التنسيق: { 'story': 'نص المقطع المثير والمبسط وعلاقته بالمقرر الدراسي', 'options': ['خيار 1', 'خيار 2', 'خيار 3'] }`;
    }

    try {
        const jsonText = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "أنت مصمم قصص تفاعلية وتعليمية ملهمة ومختص في صياغة ملفات JSON نقية ومبسطة.", "You are a designer of inspiring interactive educational stories and an expert in formulating clean and simplified JSON files."));
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        questionText.textContent = parsed.story;
        speak(parsed.story);

        parsed.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = "p-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive";
            btn.textContent = `${idx + 1}) ${opt}`;
            btn.setAttribute('aria-label', `الخيار ${idx + 1}: ${opt}`);
            btn.addEventListener('click', () => {
                playSuccess3D();
                startAiStoryRound(idx);
            });
            storyOptions.appendChild(btn);
        });

        setTimeout(setupAccessibleVoices, 200);

    } catch (error) {
        console.error("Storyteller Error:", error);
        questionText.textContent = __('storyError');
        speak(__('storyError'));
    }
}

async function analyzeImageWithGemini() {
    if (!uploadedImageBase64) {
        speak(__('visionSelectImage'));
        return;
    }

    const responseBox = document.getElementById('vision-response-box');
    responseBox.classList.remove('hidden');
    showLoading('vision-response-text', __('loadingVision'));
       speak(__('visionAnalyzing'));

    try {
        const description = await describeImage(uploadedImageBase64, uploadedImageMime);
        document.getElementById('vision-response-text').textContent = description;
        speak(description);
    } catch (error) {
        handleError('analyzeImage', error);
        document.getElementById('vision-response-text').textContent = __('visionError');
    }
}

async function askAITutor() {
    const queryText = document.getElementById('ai-tutor-query').value.trim();
    if (!queryText) {
        speak(__('tutorAskFirst'));
        return;
    }

    document.getElementById('ai-tutor-response-box').classList.remove('hidden');
    showLoading('ai-tutor-response-text', __('loadingTutor'));
    speak(__('tutorThinking'));

    try {
        const responseText = await callGeminiAPI(queryText, getPrompt(getCurrentLang(), "أنت معلم ودود متخصص في شرح المناهج الدراسية للمكفوفين وضعاف البصر من جميع المراحل العمرية. قدّم الشرح بمستوى يناسب الطالب: للطفل استخدم تبسيطاً شديداً وأمثلة يومية، وللشاب والبالغ استخدم أسلوباً أكاديمياً مناسباً مع الحفاظ على الوضوح.", "You are a friendly teacher specialized in explaining curricula for blind and visually impaired students of all ages. Provide explanations at a level suitable for the student: use extreme simplification and daily examples for children, and an appropriate academic style for young people and adults while maintaining clarity."));
        document.getElementById('ai-tutor-response-text').textContent = responseText;
        speak(responseText);
    } catch (error) {
        document.getElementById('ai-tutor-response-text').textContent = __('tutorError');
        speak(__('tutorError'));
    }
}

async function generateAIQuiz() {
    speak(__('quizLoading'));
    const btn = document.getElementById('btn-ai-generate');
    btn.textContent = __('quizGenerating');

    const prompt = "ولد سؤال اختبار حقيقي واحد في مادة العلوم يتكون من اختيار من متعدد مع أربعة خيارات وتحديد الخيار الصحيح. أخرج النتيجة بتنسيق JSON نظيف وبسيط يحتوي على مفاتيح: question, A, B, C, D, correct.";

    try {
        const jsonText = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "أنت مصمم اختبارات أكاديمي متميز. ", "You are an excellent academic quiz designer. ") + getAgeTone());
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        document.getElementById('teacher-quiz-title').value = "اختبار العلوم الذكي التوليدي";
        document.getElementById('teacher-quiz-q').value = parsed.question;
        document.getElementById('teacher-quiz-oa').value = parsed.A;
        document.getElementById('teacher-quiz-ob').value = parsed.B;
        document.getElementById('teacher-quiz-oc').value = parsed.C;
        document.getElementById('teacher-quiz-od').value = parsed.D;
        document.getElementById('teacher-quiz-correct').value = parsed.correct;

        speak(__('quizReady'));
    } catch (e) {
        console.error(e);
        speak(__('quizFailed'));
    } finally {
        btn.textContent = __('quizGenerateBtn');
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
    document.getElementById('cheat-char-preview').textContent = __('brailleCurrentChar', mappedChar, keyString || '');
}

function pronounceCheatBraille() {
    const dotsArray = Array.from(currentCheatDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString];

    if (mappedChar) {
        speak(__('brailleCharInfo', mappedChar));
    } else {
        speak(__('brailleIncomplete'));
    }
}

function clearCheatDots() {
    currentCheatDots.clear();
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`cheat-dot-${i}`);
        if (dot) dot.classList.remove('active');
    }
    document.getElementById('cheat-char-preview').textContent = __('brailleNoChar');
    speak(__('brailleCleared'));
}

function openStudentSection(section) {
    document.getElementById('student-sub-books').classList.add('hidden');
    document.getElementById('student-sub-assignments').classList.add('hidden');
    document.getElementById('student-sub-image-describer').classList.add('hidden');
    document.getElementById('student-sub-games').classList.add('hidden');
    document.getElementById('student-sub-ai-tutor').classList.add('hidden');
    document.getElementById('student-sub-dialogic-classroom')?.classList.add('hidden');
    document.getElementById('student-sub-study-group')?.classList.add('hidden');
    document.getElementById('student-sub-dashboard')?.classList.add('hidden');

    const container = document.getElementById('student-section-container');
    container.classList.remove('hidden');
    const title = document.getElementById('student-section-title');

    if (section === 'books') {
        title.textContent = __('sectionBooks');
        document.getElementById('student-sub-books').classList.remove('hidden');
        renderStudentBooks();
        speak(__('sectionOpened', __('sectionBooks')));
    } else if (section === 'assignments') {
        title.textContent = __('sectionAssignments');
        document.getElementById('student-sub-assignments').classList.remove('hidden');
        renderStudentAssignments();
        speak(__('sectionOpened', __('sectionAssignments')));
    } else if (section === 'image-describer') {
        title.textContent = __('sectionVision');
        document.getElementById('student-sub-image-describer').classList.remove('hidden');
        speak(__('sectionOpened', __('sectionVision')));
    } else if (section === 'games') {
        title.textContent = __('sectionGames');
        document.getElementById('student-sub-games').classList.remove('hidden');
        speak(__('sectionOpened', __('sectionGames')));
    } else if (section === 'ai-tutor') {
        title.textContent = __('sectionTutor');
        document.getElementById('student-sub-ai-tutor').classList.remove('hidden');
        speak(__('sectionOpened', __('sectionTutor')));
    } else if (section === 'dialogic-classroom') {
        title.textContent = __('sectionDialogic');
        document.getElementById('student-sub-dialogic-classroom')?.classList.remove('hidden');
        speak(__('sectionOpened', __('sectionDialogic')));
    } else if (section === 'study-group') {
        title.textContent = __('sectionStudyGroup');
        document.getElementById('student-sub-study-group')?.classList.remove('hidden');
        speak(__('sectionOpened', __('sectionStudyGroup')));
    } else if (section === 'dashboard') {
        title.textContent = __('sectionDashboard');
        document.getElementById('student-sub-dashboard')?.classList.remove('hidden');
        renderStudentDashboard();
        speak(__('sectionOpened', __('sectionDashboard')));
    }

    container.scrollIntoView({ behavior: 'smooth' });
    // نقل التركيز إلى أول عنصر تفاعلي في القسم
    setTimeout(() => {
        setupAccessibleVoices();
        var sectionEl = document.getElementById('student-sub-' + section);
        if (sectionEl) {
            var firstBtn = sectionEl.querySelector('button, [tabindex="0"], input, select, textarea, a');
            if (firstBtn) {
                firstBtn.focus();
            } else {
                focusElement('student-section-title');
            }
        } else {
            focusElement('student-section-title');
        }
    }, 200);
}

function closeStudentSection() {
    document.getElementById('student-section-container').classList.add('hidden');
    controlAudiobook('stop');
    // إعادة التركيز إلى زر القسم المفتوح سابقاً
    var activeBtn = document.querySelector('[data-student-section].bg-yellow-400');
    if (activeBtn) {
        activeBtn.focus();
    } else {
        var mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.setAttribute('tabindex', '-1');
            mainContent.focus();
        }
    }
    speak(__('sectionClosed'));
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
                <button data-action="read-book" data-book-id="${escapeHtml(b.id)}" class="flex-1 p-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 btn-interactive">📖 ${__('btnReadAI')}</button>
                <button data-action="play-book" data-book-id="${escapeHtml(b.id)}" class="flex-1 p-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 btn-interactive">🎧 ${__('btnListenAudio')}</button>
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
        speak(__('readBookAloud', book.title, book.content));
    }
}

let perkinsKeyupTimer = null;
let perkinsKeyupHandler = (e) => {
    if (document.getElementById('perkins-braille-keyboard').classList.contains('hidden')) return;
    const key = e.key.toLowerCase();
    if (perkinsKeysPressed[key]) {
        clearTimeout(perkinsKeyupTimer);
        perkinsKeyupTimer = setTimeout(() => {
            processPerkinsChord();
            perkinsKeysPressed = {};
        }, 150);
    }
};
window.addEventListener('keyup', perkinsKeyupHandler);

function playBookAudio(bookId) {
    currentlyPlayingBookId = bookId;
    const book = localData.books.find(b => b.id === bookId);
    if (book) {
        const player = document.getElementById('audiobook-player');
        player.classList.remove('hidden');
        document.getElementById('audiobook-playing-title').textContent = __('listeningToBook', book.title);
        speak(__('audioPlayerReady', book.title));
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
        speak(__('audiobookStopped'));
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
                <span class="text-sm px-2 py-1 bg-yellow-400 text-black rounded font-bold">${a.type === 'mcq' ? __('typeMCQ') : __('typeEssay')}</span>
            </div>
            <button data-action="start-quiz" data-quiz-id="${escapeHtml(a.id)}" class="p-4 bg-green-600 text-white font-black text-lg rounded-xl hover:bg-green-500 large-touch-target btn-interactive">${__('btnStartQuiz')} 🏁</button>
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
        document.getElementById('btn-opt-A').querySelector('span').textContent = `${__('optA')} ${quiz.options.A}`;
        document.getElementById('btn-opt-B').querySelector('span').textContent = `${__('optB')} ${quiz.options.B}`;
        document.getElementById('btn-opt-C').querySelector('span').textContent = `${__('optC')} ${quiz.options.C}`;
        document.getElementById('btn-opt-D').querySelector('span').textContent = `${__('optD')} ${quiz.options.D}`;

        speak(__('quizStarted', quiz.title, quiz.question));
    } else {
        document.getElementById('quiz-question-container').classList.add('hidden');
        document.getElementById('quiz-text-input-section').classList.remove('hidden');

        document.getElementById('assignment-student-answer').value = '';
        document.getElementById('braille-evaluation-box').classList.add('hidden');
        speak(__('essayStarted', quiz.question));
    }

    let totalSecondsLeft = 10 * 60;
    let lastSpokenMinute = 10;
    const timerDisplay = document.getElementById('active-quiz-timer');
    timerDisplay.textContent = "10:00";
    timerDisplay.setAttribute('aria-live', 'polite');
    timerDisplay.setAttribute('aria-atomic', 'true');

    if (quizTimerInterval) clearInterval(quizTimerInterval);
    quizTimerInterval = setInterval(() => {
        totalSecondsLeft -= 1;

        const mins = Math.floor(totalSecondsLeft / 60);
        const secs = totalSecondsLeft % 60;
        const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        timerDisplay.textContent = display;

        // Speak the minute countdown silently (for screen readers and voice)
        if (secs === 0 && mins !== lastSpokenMinute) {
            lastSpokenMinute = mins;
            announceToScreenReader(__('quizTimeRemaining', mins));
            if (mins > 0 && !screenReaderMode) {
                speak(__('quizTimeRemaining', mins));
            }
        }

        if (totalSecondsLeft === 5 * 60) {
            speak(__('quizWarn5min'));
        } else if (totalSecondsLeft === 60) {
            speak(__('quizWarn1min'));
        } else if (totalSecondsLeft === 10) {
            speak(__('quizWarn10sec'));
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
    speak(__('quizOptionSelected', option));

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
            speak(__('quizSelectOption'));
            return;
        }
        finalAnswer = selectedOption;
        score = (selectedOption === quiz.correct) ? 100 : 0;
    } else {
        finalAnswer = document.getElementById('assignment-student-answer').value.trim();
        if (!finalAnswer) {
            speak(__('quizEmptyAnswer'));
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
    saveLocalData();
    saveSubmissionToFirebase(submission);
    addNotification(__('notifNewAnswer'), submission.studentName + ' ' + __('notifQuizDone') + ' ' + (submission.quizTitle || '') + ' ' + __('notifScored') + ' ' + score + '%', 'submission');
    if (score >= 80) addNotification(__('notifAchievement'), submission.studentName + ' ' + __('notifScoredAchievement') + ' ' + score + '% ' + __('notifInQuiz') + ' ' + (submission.quizTitle || '') + '!', 'achievement');

    speak(__('quizSubmitted'));
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
        speak(__('brailleUnknown'));
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
    document.getElementById('braille-char-preview').textContent = __('brailleCurrentChar', mappedChar, keyString || '');
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
        speak(__('brailleInvalidChar'));
    }
}

function clearBrailleDots() {
    currentBrailleDots.clear();
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) dot.classList.remove('active');
    }
    document.getElementById('braille-char-preview').textContent = __('brailleNoChar');
}

function addSpaceToAnswer() {
    const ansTextarea = document.getElementById('assignment-student-answer');
    ansTextarea.value += " ";
    speak(__('brailleSpace'));
}

function deleteLastChar() {
    const ansTextarea = document.getElementById('assignment-student-answer');
    if (ansTextarea.value.length > 0) {
        ansTextarea.value = ansTextarea.value.slice(0, -1);
        speak(__('brailleDeleted'));
    }
}

function toggleBrailleKeyboard(type) {
    const screenKbd = document.getElementById('screen-braille-keyboard');
    const perkinsKbd = document.getElementById('perkins-braille-keyboard');

    if (type === 'screen') {
        screenKbd.classList.toggle('hidden');
        perkinsKbd.classList.add('hidden');
        speak(__('brailleScreenKbd'));
    } else {
        perkinsKbd.classList.toggle('hidden');
        screenKbd.classList.add('hidden');
        speak(__('braillePerkinsKbd'));
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
        speak(__('visionImageLoaded'));
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
        document.getElementById('game-title').textContent = __('gameTrueFalse');
        document.getElementById('game-timer-wrapper').classList.remove('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak(__('gameTrueFalseStart'));
    } else if (gameType === 'hero') {
        document.getElementById('game-title').textContent = __('gameSpeed');
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak(__('gameSpeedStart'));
    } else if (gameType === 'pvp') {
        document.getElementById('game-title').textContent = __('gamePvP');
        document.getElementById('game-timer-wrapper').classList.remove('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak(__('gamePvPStart'));
    } else if (gameType === 'ai-story') {
        document.getElementById('game-title').textContent = __('gameStory');
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        startAiStoryRound(null);
    } else if (gameType === 'audio-memory') {
        document.getElementById('game-title').textContent = __('gameMemory');
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        binaryOptions.classList.add('hidden');
        storyOptions.classList.add('hidden');
        initAudioMemoryUI();
        startAudioMemoryGame();
        return;
    }

    if (gameType !== 'hero' && gameType !== 'ai-story' && gameType !== 'audio-memory') {
        gameTimerInterval = setInterval(() => {
            gameTimeLeft -= 1;
            document.getElementById('game-timer').textContent = gameTimeLeft;
            if (gameTimeLeft <= 5 && gameTimeLeft > 0) playTick3D();
            if (gameTimeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
    setTimeout(setupAccessibleVoices, 200);
}

var questionBank = [
    // ===== علوم - سهل =====
    { q: "الماء يتكون من ذرتي هيدروجين وذرة أكسجين.", a: true, d: 1 },
    { q: "الأرض هي الكوكب الثالث في المجموعة الشمسية.", a: true, d: 1 },
    { q: "الضوء ينتقل أسرع من الصوت.", a: true, d: 1 },
    { q: "الجهاز المسؤول عن ضخ الدم في جسم الإنسان هو الكبد.", a: false, d: 1 },
    { q: "التمثيل الضوئي يحدث في أوراق النباتات.", a: true, d: 1 },
    { q: "جسم الإنسان يحتوي على 206 عظمة.", a: true, d: 1 },
    { q: "الماء يغلي عند درجة حرارة 100 سيليسيوس.", a: true, d: 1 },
    { q: "البكتيريا كائنات حية دقيقة ترى بالعين المجردة.", a: false, d: 1 },
    { q: "الجلد هو أكبر عضو في جسم الإنسان.", a: true, d: 1 },
    // ===== علوم - متوسط =====
    { q: "الأكسجين يمثل المكون الأساسي لغاز النيتروجين.", a: false, d: 2 },
    { q: "الأوزون هو غاز يحمي الأرض من الأشعة فوق البنفسجية.", a: true, d: 2 },
    { q: "يتكون الدماغ البشري من ثلاثة أقسام رئيسية.", a: true, d: 2 },
    { q: "النباتات تصنع غذاءها بنفسها بعملية تسمى التنفس.", a: false, d: 2 },
    { q: "الكواكب الداخلية في مجموعتنا الشمسية هي عطارد والزهرة والمريخ.", a: false, d: 2 },
    // ===== علوم - صعب =====
    { q: "العظام هي أصلب مادة في جسم الإنسان.", a: true, d: 3 },
    { q: "الكلوروبلاست هي المسؤولة عن عملية البناء الضوئي في الخلية.", a: true, d: 3 },
    { q: "الرقم الهيدروجيني للحمض النقي أقل من 7.", a: true, d: 3 },
    // ===== رياضيات - سهل =====
    { q: "العدد 9 هو مربع العدد 3.", a: true, d: 1 },
    { q: "المجموع الكلي لزوايا المثلث يساوي 180 درجة.", a: true, d: 1 },
    { q: "ناتج 12 ÷ 4 يساوي 3.", a: true, d: 1 },
    { q: "الزاوية القائمة تساوي 90 درجة.", a: true, d: 1 },
    { q: "العدد 17 هو عدد زوجي.", a: false, d: 1 },
    { q: "الكسر ½ يساوي 0.5 في النظام العشري.", a: true, d: 1 },
    // ===== رياضيات - متوسط =====
    { q: "حاصل ضرب 8 × 7 يساوي 54.", a: false, d: 2 },
    { q: "القطر هو ضعف نصف القطر.", a: true, d: 2 },
    { q: "العدد الأولي هو عدد يقبل القسمة على 1 وعلى نفسه فقط.", a: true, d: 2 },
    { q: "مجموع زوايا المربع يساوي 360 درجة.", a: true, d: 2 },
    { q: "المساحة تقاس بالوحدات المربعة.", a: true, d: 2 },
    { q: "الجذر التربيعي للعدد 64 هو 8.", a: true, d: 2 },
    // ===== رياضيات - صعب =====
    { q: "العدد 100 هو أصغر عدد مكون من ثلاث خانات.", a: false, d: 3 },
    { q: "النسبة المئوية تعني جزءاً من 100.", a: true, d: 3 },
    { q: "المتوسط الحسابي للأعداد 2، 4، 6 يساوي 4.", a: true, d: 3 },
    { q: "العدد -3 أكبر من العدد 2.", a: false, d: 3 },
    // ===== لغة عربية - سهل =====
    { q: "الفعل الماضي يدل على حدث وقع في الزمن الماضي.", a: true, d: 1 },
    { q: "الفاعل في الجملة العربية مرفوع دائماً.", a: true, d: 1 },
    { q: "حروف العطف هي: الفاء، ثم، الواو، أو.", a: false, d: 1 },
    { q: "المثنى يدل على اثنين بزيادة ألف ونون أو ياء ونون.", a: true, d: 1 },
    { q: "جمع المؤنث السالم ينصب بالفتحة.", a: true, d: 1 },
    // ===== لغة عربية - متوسط =====
    { q: "الهمزة في كلمة (سأل) همزة قطع.", a: true, d: 2 },
    { q: "جمع كلمة (كتاب) هو (كتبة).", a: false, d: 2 },
    { q: "اللام في (الكتاب) شمسية.", a: false, d: 2 },
    { q: "كلمة (مدرسة) هي اسم مكان.", a: true, d: 2 },
    { q: "كلمة (جميل) في جملة (رأيت طالباً جميلاً) نعت.", a: true, d: 2 },
    // ===== لغة عربية - صعب =====
    { q: "الأفعال الخمسة ترفع بثبوت النون وتنصب وتجزم بحذفها.", a: true, d: 3 },
    { q: "الفعل المضارع المعتل الآخر يرفع بالضمة المقدرة.", a: true, d: 3 },
    { q: "كلمة (استغفار) مصدر خماسي.", a: true, d: 3 },
    // ===== تاريخ - سهل =====
    { q: "النبي محمد ﷺ ولد في عام الفيل.", a: true, d: 1 },
    { q: "الحضارة الفرعونية نشأت في بلاد الرافدين.", a: false, d: 1 },
    { q: "الجزائر كانت تحت الاستعمار الفرنسي.", a: true, d: 1 },
    { q: "الحرب العالمية الثانية انتهت عام 1945.", a: true, d: 1 },
    // ===== تاريخ - متوسط =====
    { q: "معركة حطين قادها صلاح الدين الأيوبي.", a: true, d: 2 },
    { q: "فتح الأندلس كان بقيادة طارق بن زياد.", a: true, d: 2 },
    { q: "الثورة الفرنسية حدثت في القرن الثامن عشر.", a: true, d: 2 },
    { q: "سور الصين العظيم بني لحماية الصين من الغزوات.", a: true, d: 2 },
    // ===== تاريخ - صعب =====
    { q: "الدولة العباسية عاصمتها دمشق.", a: false, d: 3 },
    { q: "العلم العربي ابن الهيثم اشتهر في الطب.", a: false, d: 3 },
    { q: "معركة اليرموك كانت بين المسلمين والفرس.", a: false, d: 3 },
    // ===== جغرافيا - سهل =====
    { q: "نهر النيل هو أطول نهر في العالم.", a: true, d: 1 },
    { q: "عاصمة مصر هي الإسكندرية.", a: false, d: 1 },
    { q: "أستراليا هي أصغر قارة في العالم.", a: true, d: 1 },
    { q: "المحيط الهادئ هو أكبر محيط في العالم.", a: true, d: 1 },
    // ===== جغرافيا - متوسط =====
    { q: "القارة القطبية الجنوبية هي أبرد قارة على الأرض.", a: true, d: 2 },
    { q: "البحر الميت هو أخفض نقطة على سطح الأرض.", a: true, d: 2 },
    { q: "الصحراء الكبرى تقع في قارة آسيا.", a: false, d: 2 },
    { q: "جبال الألب تقع في أوروبا.", a: true, d: 2 },
    // ===== إسلاميات - سهل =====
    { q: "عدد أركان الإسلام خمسة.", a: true, d: 1 },
    { q: "الصيام في شهر رمضان هو أحد أركان الإسلام.", a: true, d: 1 },
    { q: "المسجد الأقصى يقع في مكة المكرمة.", a: false, d: 1 },
    { q: "الفاتحة هي أعظم سورة في القرآن.", a: true, d: 1 },
    // ===== إسلاميات - متوسط =====
    { q: "عدد الأنبياء والرسل المذكورين في القرآن هو 25.", a: true, d: 2 },
    { q: "ليلة القدر في العشر الأواخر من رمضان.", a: true, d: 2 },
    { q: "القرآن نزل على النبي محمد ﷺ في 23 سنة.", a: true, d: 2 },
    // ===== إسلاميات - صعب =====
    { q: "الحج واجب على كل مسلم مرة واحدة في العمر.", a: true, d: 3 },
    { q: "سورة الإخلاص تعدل ثلث القرآن.", a: true, d: 3 },
    // ===== عامة - سهل =====
    { q: "الكرة الأرضية تدور حول الشمس كل 365 يوماً.", a: true, d: 1 },
    { q: "لغة برايل هي نظام كتابة وقراءة للمكفوفين.", a: true, d: 1 },
    { q: "الذهب معدن ثمين لا يصدأ.", a: true, d: 1 },
    { q: "الإنترنت اخترع في القرن العشرين.", a: true, d: 1 },
    { q: "طائر البطريق يستطيع الطيران لمسافات طويلة.", a: false, d: 1 },
    // ===== عامة - متوسط =====
    { q: "العين البشرية تستطيع رؤية جميع ألوان الطيف.", a: true, d: 2 },
    { q: "ساعة العقارب تخبر الوقت عن طريق عقربي الساعة والدقيقة.", a: true, d: 2 },
    { q: "الكهرباء هي تدفق الإلكترونات في الموصل.", a: true, d: 2 },
    { q: "المغناطيس يجذب جميع أنواع المعادن.", a: false, d: 2 },
];

function pickQuestionByDifficulty(targetLevel) {
    var pool = questionBank.filter(function(q) { return q.d === targetLevel; });
    if (pool.length === 0) pool = questionBank;
    return pool[secureRandomInt(0, pool.length)];
}

function startNewGameRound() {
    if (activeGameType === 'audio-memory') {
        startAudioMemoryGame();
        return;
    }
    var level = 1;
    if (activeGameType === 'hero') {
        if (currentGameScore >= 80) level = 3;
        else if (currentGameScore >= 40) level = 2;
    }
    var questionData = pickQuestionByDifficulty(level);

    document.getElementById('game-question').textContent = questionData.q;
    currentCorrectAnswer = questionData.a;

    speak(questionData.q);

    setTimeout(function() { listenForGameAnswer(); }, 1500);
}

function listenForGameAnswer() {
    if (typeof listenForSpeech !== 'function') return;
    speak(__('gameSpeakAnswer'));
    listenForSpeech(function(text) {
        if (!text) {
            speak(__('gameNoAnswer'));
            setTimeout(function() { listenForGameAnswer(); }, 1500);
            return;
        }
        var t = text.trim();
        if (t.indexOf('صح') !== -1 || t.indexOf('صحيح') !== -1 || t.indexOf('نعم') !== -1 || t.indexOf('yes') !== -1) {
            answerGame(true);
        } else if (t.indexOf('خطأ') !== -1 || t.indexOf('غلط') !== -1 || t.indexOf('لا') !== -1 || t.indexOf('no') !== -1) {
            answerGame(false);
        } else {
            speak(__('gameUnclear'));
            setTimeout(function() { listenForGameAnswer(); }, 1500);
        }
    }, 8000);
}

function answerGame(userAnswer) {
    if (userAnswer === currentCorrectAnswer) {
        currentGameScore += 10;
        document.getElementById('game-score').textContent = currentGameScore;

        playSuccess3D();
        speak(__('gameCorrect'));

        setTimeout(function() { startNewGameRound(); }, 1000);
    } else {
        playFail3D();
        if (activeGameType === 'hero') {
            speak(__('gameWrongScore', currentGameScore));
            endGame();
        } else {
            speak(__('gameWrong'));
            setTimeout(function() { startNewGameRound(); }, 1000);
        }
    }
}

// ===== لعبة الذاكرة السمعية =====
var audioMemorySequence = [];
var audioMemoryStep = 0;
var audioMemoryPatterns = [
    { name: 'قطة', freq: 800, dir: 'left' },
    { name: 'كلب', freq: 400, dir: 'right' },
    { name: 'ديك', freq: 1200, dir: 'front' },
    { name: 'بقرة', freq: 150, dir: 'back' },
    { name: 'قطار', freq: 300, dir: 'left' },
    { name: 'جرس', freq: 1400, dir: 'right' },
    { name: 'ماء', freq: 2000, dir: 'front' },
    { name: 'باب', freq: 250, dir: 'back' },
];

function startAudioMemoryGame() {
    activeGameType = 'audio-memory';
    currentGameScore = 0;
    audioMemorySequence = [];
    audioMemoryStep = 0;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-title').textContent = __('gameMemory');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    document.getElementById('game-binary-options').classList.add('hidden');
    document.getElementById('game-story-options').classList.add('hidden');
    document.getElementById('game-question').textContent = __('gameMemoryListen');

    speak(__('gameMemoryStart'));
    setTimeout(function() { addAudioMemoryStep(); }, 2000);
}

function addAudioMemoryStep() {
    var idx = secureRandomInt(0, audioMemoryPatterns.length);
    audioMemorySequence.push(idx);
    playAudioMemorySequence();
}

function playAudioMemorySequence() {
    var i = 0;
    function playNext() {
        if (i >= audioMemorySequence.length) {
            speak(__('gameMemoryYourTurn'));
            return;
        }
        var pattern = audioMemoryPatterns[audioMemorySequence[i]];
        var pos = { left: [-2,0,0], right: [2,0,0], front: [0,0,2], back: [0,0,-2] };
        var p = pos[pattern.dir] || [0, 0, 0];
        play3DTone(pattern.freq, pattern.freq * 1.5, 'sine', 0.3, p[0], p[1], p[2]);
        speak(pattern.name);
        i++;
        setTimeout(playNext, 1200);
    }
    speak(__('gameMemoryNew'));
    setTimeout(playNext, 500);
}

function answerAudioMemory(patternIdx) {
    if (patternIdx === audioMemorySequence[audioMemoryStep]) {
        playSuccess3D();
        audioMemoryStep++;
        if (audioMemoryStep >= audioMemorySequence.length) {
            currentGameScore += 10;
            document.getElementById('game-score').textContent = currentGameScore;
            speak(__('gameMemoryComplete'));
            audioMemoryStep = 0;
            setTimeout(function() { addAudioMemoryStep(); }, 1500);
        }
    } else {
        playFail3D();
        speak(__('gameMemoryWrong', audioMemorySequence.map(function(i) { return audioMemoryPatterns[i].name; }).join(', ')));
        endGame();
    }
}

function initAudioMemoryUI() {
    var container = document.getElementById('game-story-options');
    container.innerHTML = '';
    container.classList.remove('hidden');
    audioMemoryPatterns.forEach(function(p, idx) {
        var btn = document.createElement('button');
        btn.className = 'p-4 bg-purple-700 text-white font-bold text-xl rounded-xl btn-interactive';
        btn.textContent = p.name;
        btn.addEventListener('click', function() { answerAudioMemory(idx); });
        container.appendChild(btn);
    });
}

function endGame() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    document.getElementById('active-game-panel').classList.add('hidden');
    speak(__('gameOver', currentGameScore));
    if (currentGameScore >= 50) {
        addNotification(__('notifGameAchievement'), (currentUserSession?.name || __('notifStudent')) + ' ' + __('notifGotScore') + ' ' + currentGameScore + ' ' + __('notifPointsInGame') + ' ' + (activeGameType === 'audio-memory' ? __('notifMemoryGame') : __('notifQuizGame')) + '!', 'achievement');
    }
}

// (playSuccessChime and playFailChime defined above)

function startAITutorSpeech() {
    if (speechRecognizer) {
        speechRecognizer.start();
    } else {
        speak(__('speechUnavailable'));
    }
}

function speakAITutorResponse() {
    const responseText = document.getElementById('ai-tutor-response-text').textContent;
    speak(responseText);
}

async function gradeSubmissionWithAI(index) {
    const sub = localData.submissions[index];
    if (!sub) return;

    speak(__('gradingInProgress'));

    const prompt = `قارن إجابة الطالب: "${sub.studentAnswer}" مع السؤال المقالي وصححه إملائياً ولغوياً وقدم تقريراً من سطرين متضمناً الدرجة المقترحة (من 100) مع الكلمات المشجعة للطالب الكفيف.`;

    try {
        const report = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "أنت مصحح ومعلم تربوي. ", "You are a grader and educational teacher. ") + getAgeTone());
        sub.initialScore = 95;
        sub.graderFeedback = report;
        saveLocalData();

        renderTeacherSubmissions();
        speak(__('gradingDone'));
    } catch (e) {
        speak(__('gradingFailed'));
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
    saveLocalData();

    saveBookToFirebase(newBook);
    speak(__('bookPublished'));
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
    saveLocalData();
    saveQuizToFirebase(newQuiz);
    speak(__('quizPublished'));
    e.target.reset();
}

// ==================== لوحة قيادة المعلم ====================

function renderTeacherDashboard() {
    var submissions = localData.submissions || [];
    var students = localData.students || [];
    var assignments = localData.assignments || [];

    // 1. إحصائيات سريعة
    var totalStudents = students.length;
    var activeStudents = new Set(submissions.map(function(s) { return s.studentName; })).size;
    var totalQuizzes = assignments.length;
    var totalSubmissions = submissions.length;
    var avgScore = totalSubmissions > 0
        ? Math.round(submissions.reduce(function(sum, s) { return sum + (s.initialScore || 0); }, 0) / totalSubmissions)
        : 0;
    var completionRate = totalQuizzes > 0 && activeStudents > 0
        ? Math.round((totalSubmissions / (totalQuizzes * activeStudents)) * 100)
        : 0;

    document.getElementById('stat-total-students').textContent = totalStudents + (activeStudents > 0 ? ' (' + activeStudents + ' نشط)' : '');
    document.getElementById('stat-total-quizzes').textContent = totalQuizzes;
    document.getElementById('stat-avg-score').textContent = avgScore + '%';
    document.getElementById('stat-completion').textContent = Math.min(completionRate, 100) + '%';

    renderGradeDistribution(submissions);
    renderStudentPerformanceTable(submissions, assignments);
    var exportBtn = document.getElementById('btn-export-report');
    if (exportBtn) {
        exportBtn.onclick = function() { generateTeacherReport(); };
    }
}

function renderGradeDistribution(submissions) {
    var container = document.getElementById('grade-distribution');
    var ranges = [
        { label: __('gradePoor'), min: 0, max: 49, color: 'bg-red-500' },
        { label: __('gradePass'), min: 50, max: 69, color: 'bg-orange-500' },
        { label: __('gradeGood'), min: 70, max: 89, color: 'bg-blue-500' },
        { label: __('gradeExcellent'), min: 90, max: 100, color: 'bg-green-500' }
    ];
    var counts = [0, 0, 0, 0];
    submissions.forEach(function(s) {
        var score = s.initialScore || 0;
        for (var i = 0; i < ranges.length; i++) {
            if (score >= ranges[i].min && score <= ranges[i].max) { counts[i]++; break; }
        }
    });
    var maxCount = Math.max.apply(null, counts) || 1;
    var html = '';
    for (var i = 0; i < ranges.length; i++) {
        var pct = Math.round((counts[i] / maxCount) * 100);
        html += '<div class="flex items-center gap-3">' +
            '<span class="text-sm w-28 shrink-0">' + ranges[i].label + '</span>' +
            '<div class="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">' +
            '<div class="h-full ' + ranges[i].color + ' rounded-full transition-all duration-500" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="text-sm font-bold w-10 text-left">' + counts[i] + '</span>' +
            '</div>';
    }
    if (submissions.length === 0) {
        container.innerHTML = '<p class="text-gray-400">' + __('noGradesForDistribution') + '</p>';
    } else {
        container.innerHTML = '<div class="space-y-3">' + html + '</div>' +
            '<p class="text-xs text-gray-400 mt-2">' + __('totalCorrections') + ' ' + submissions.length + '</p>';
    }
}

function renderStudentPerformanceTable(submissions, assignments) {
    var tbody = document.getElementById('teacher-performance-tbody');
    tbody.innerHTML = '';
    if (submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">' + __('noAnswersYet') + '</td></tr>';
        return;
    }
    var studentMap = {};
    submissions.forEach(function(s) {
        var name = s.studentName || 'غير معروف';
        if (!studentMap[name]) studentMap[name] = [];
        studentMap[name].push(s.initialScore || 0);
    });
    var studentNames = Object.keys(studentMap).sort();
    studentNames.forEach(function(name) {
        var scores = studentMap[name];
        var avg = Math.round(scores.reduce(function(a, b) { return a + b; }, 0) / scores.length);
        var max = Math.max.apply(null, scores);
        var min = Math.min.apply(null, scores);
        var tr = document.createElement('tr');
        var gradeClass = avg >= 90 ? 'text-green-400' : (avg >= 70 ? 'text-blue-400' : (avg >= 50 ? 'text-yellow-400' : 'text-red-400'));
        tr.innerHTML = '<td class="p-2 border border-current font-bold">' + escapeHtml(name) + '</td>' +
            '<td class="p-2 border border-current text-center">' + scores.length + '</td>' +
            '<td class="p-2 border border-current font-bold text-center ' + gradeClass + '">' + avg + '%</td>' +
            '<td class="p-2 border border-current text-center text-green-300">' + max + '%</td>' +
            '<td class="p-2 border border-current text-center text-red-300">' + min + '%</td>';
        tbody.appendChild(tr);
    });
}

function generateTeacherReport() {
    var submissions = localData.submissions || [];
    var students = localData.students || [];
    var assignments = localData.assignments || [];
    if (submissions.length === 0) {
        speak(__('reportNoData'));
        return;
    }
    var report = '--- ' + __('reportTitle') + ' ---\n';
    report += __('reportDate') + ': ' + new Date().toLocaleString('ar-EG') + '\n';
    report += __('reportStudents') + ': ' + students.length + '\n';
    report += __('reportQuizzes') + ': ' + assignments.length + '\n';
    report += __('reportCorrections') + ': ' + submissions.length + '\n\n';
    var avg = submissions.length > 0
        ? Math.round(submissions.reduce(function(s, sub) { return s + (sub.initialScore || 0); }, 0) / submissions.length)
        : 0;
    report += __('reportAvgScore') + ': ' + avg + '%\n\n';
    report += '--- ' + __('reportPerStudent') + ' ---\n';
    var studentMap = {};
    submissions.forEach(function(s) {
        var name = s.studentName || 'غير معروف';
        if (!studentMap[name]) studentMap[name] = [];
        studentMap[name].push({ title: s.quizTitle || 'اختبار', score: s.initialScore || 0 });
    });
    Object.keys(studentMap).sort().forEach(function(name) {
        var subs = studentMap[name];
        var avgS = Math.round(subs.reduce(function(a, b) { return a + b.score; }, 0) / subs.length);
        report += '\n' + name + ' — ' + __('reportAvg') + ': ' + avgS + '%\n';
        subs.forEach(function(sub) {
            report += '  - ' + sub.title + ': ' + sub.score + '%\n';
        });
    });
    report += '\n--- ' + __('reportEnd') + ' ---';
    try {
        navigator.clipboard.writeText(report);
        speak(__('reportCopied'));
    } catch (e) {
        speak(__('reportGenerated'));
    }
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
    overlay.innerHTML = '<div class="card p-6 rounded-3xl max-w-2xl border-4 border-yellow-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="' + __('teacherReportLabel') + '">' +
        '<h2 class="text-3xl font-black text-yellow-400 mb-4 text-center">' + __('teacherReport') + '</h2>' +
        '<pre class="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">' + escapeHtml(report) + '</pre>' +
        '<button id="btn-close-report" class="w-full mt-4 p-4 bg-yellow-500 text-black font-black text-xl rounded-xl btn-interactive">' + __('close') + '</button></div>';
    document.body.appendChild(overlay);
    document.getElementById('btn-close-report').addEventListener('click', function() { overlay.remove(); });
    document.getElementById('btn-close-report').focus();
}

function renderTeacherSubmissions() {
    const tbody = document.getElementById('teacher-submissions-tbody');
    tbody.innerHTML = '';

    if (localData.submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">' + __('teacherNoData') + '</td></tr>';
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

// ==================== نظام الإشعارات ====================

function addNotification(title, details, type) {
    if (!localData.notifications) localData.notifications = [];
    localData.notifications.unshift({
        title: title,
        details: details,
        type: type || 'info',
        time: new Date().toLocaleString('ar-EG'),
        read: false
    });
    // Keep max 50 notifications
    if (localData.notifications.length > 50) localData.notifications.length = 50;
    saveLocalData();
    updateNotifBadge();
    showToast(__('notifPrefix') + ' ' + title);
}

function updateNotifBadge() {
    var badge = document.getElementById('notif-badge');
    var btn = document.getElementById('btn-notifications');
    if (!badge || !btn) return;
    var unread = (localData.notifications || []).filter(function(n) { return !n.read; }).length;
    badge.textContent = unread;
    if (unread > 0) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}

function showNotificationsPanel() {
    var existing = document.getElementById('notifications-panel-overlay');
    if (existing) { existing.remove(); return; }
    var overlay = document.createElement('div');
    overlay.id = 'notifications-panel-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
    var notifs = localData.notifications || [];
    var html = '<div class="card p-6 rounded-3xl max-w-lg border-4 border-blue-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="' + __('notifPanelLabel') + '" aria-modal="true">' +
        '<h2 class="text-3xl font-black text-blue-400 mb-4 text-center">🔔 ' + __('notifPanelTitle') + '</h2>';
    if (notifs.length === 0) {
        html += '<p class="text-center text-gray-400">' + __('notifEmpty') + '</p>';
    } else {
        html += '<div class="space-y-2">';
        for (var i = 0; i < notifs.length; i++) {
            var n = notifs[i];
            var bg = n.read ? 'bg-slate-800' : 'bg-slate-700 border-r-4 border-yellow-400';
            html += '<div class="p-3 rounded-lg ' + bg + '">' +
                '<p class="font-bold text-sm text-yellow-300">' + escapeHtml(n.title) + '</p>' +
                '<p class="text-gray-300 text-xs mt-1">' + escapeHtml(n.details) + '</p>' +
                '<p class="text-gray-500 text-[10px] mt-1">' + escapeHtml(n.time) + '</p></div>';
        }
        html += '</div>';
    }
    html += '<button id="btn-close-notifs" class="w-full mt-4 p-4 bg-blue-500 text-white font-black text-xl rounded-xl btn-interactive">' + __('close') + '</button>' +
        '<button id="btn-mark-read-notifs" class="w-full mt-2 p-2 bg-gray-700 text-white font-bold rounded-lg btn-interactive">' + __('markAllRead') + '</button></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    document.getElementById('btn-close-notifs')?.addEventListener('click', function() { overlay.remove(); });
    document.getElementById('btn-mark-read-notifs')?.addEventListener('click', function() {
        (localData.notifications || []).forEach(function(n) { n.read = true; });
        saveLocalData();
        updateNotifBadge();
        showNotificationsPanel();
    });
    document.getElementById('btn-close-notifs')?.focus();
    // Mark notifications as read when panel is opened
    if (notifs.length > 0) {
        notifs[0].read = true;
        saveLocalData();
        updateNotifBadge();
    }
    speak(__('notifPanelOpened'));
}

// ==================== لوحة متابعة الطالب ====================

function renderStudentStats() {
    var submissions = localData.submissions || [];
    var mySubs = submissions.filter(function(s) {
        return s.studentName === (currentUserSession?.name || '');
    });
    var quizCount = mySubs.length;
    var avgScore = quizCount > 0 ? Math.round(mySubs.reduce(function(sum, s) { return sum + (s.initialScore || 0); }, 0) / quizCount) : null;
    var bookCount = localData.books ? localData.books.length : 0;
    var gameCount = 0;

    document.getElementById('stat-quizzes').textContent = quizCount;
    document.getElementById('stat-avg-score').textContent = avgScore !== null ? avgScore + '%' : '--';
    document.getElementById('stat-books').textContent = bookCount;
    document.getElementById('stat-games').textContent = gameCount;
}

function renderStudentDashboard() {
    renderStudentStats();

    var submissions = localData.submissions || [];
    var mySubs = submissions.filter(function(s) {
        return s.studentName === (currentUserSession?.name || '');
    });

    // Quiz stats
    var quizDiv = document.getElementById('dashboard-quiz-stats');
    if (mySubs.length === 0) {
        quizDiv.innerHTML = '<p class="text-gray-300">' + __('dashboardNoQuizzes') + '</p>';
    } else {
        var avg = Math.round(mySubs.reduce(function(sum, s) { return sum + (s.initialScore || 0); }, 0) / mySubs.length);
        var last = mySubs[0];
        quizDiv.innerHTML = '<div class="space-y-2">' +
            '<p class="text-white font-bold text-lg">' + mySubs.length + ' ' + escapeHtml(__('dashboardQuizzesSolved')) + '</p>' +
            '<p class="text-yellow-400 text-2xl font-black">' + escapeHtml(__('dashboardAverage')) + ' ' + avg + '%</p>' +
            '<p class="text-gray-300 text-sm">' + escapeHtml(__('dashboardLastQuiz')) + ' ' + escapeHtml(last.quizTitle || '') + ' — ' + (last.initialScore || 0) + '%</p>' +
            '</div>';
    }

    // Book stats
    var bookDiv = document.getElementById('dashboard-book-stats');
    var books = localData.books || [];
    if (books.length === 0) {
        bookDiv.innerHTML = '<p class="text-gray-300">' + __('dashboardNoBooks') + '</p>';
    } else {
        bookDiv.innerHTML = '<div class="space-y-2">' +
            '<p class="text-white font-bold text-lg">' + books.length + ' ' + __('dashboardBooksAvailable') + '</p>' +
            '<ul class="text-sm text-gray-300 space-y-1">' +
            books.map(function(b) { return '<li>📖 ' + escapeHtml(b.title) + '</li>'; }).join('') +
            '</ul></div>';
    }

    // Game stats
    var gameDiv = document.getElementById('dashboard-game-stats');
    gameDiv.innerHTML = '<div class="space-y-2">' +
        '<p class="text-white font-bold text-lg">' + __('dashboardGamesTitle') + '</p>' +
        '<p class="text-gray-300">' + __('dashboardGamesDesc') + '</p>' +
        '<ul class="text-sm text-gray-300 space-y-1">' +
        '<li>' + __('dashboardGameQuiz') + '</li>' +
        '<li>' + __('dashboardGameMemory') + '</li>' +
        '<li>' + __('dashboardGameStory') + '</li>' +
        '</ul></div>';

    // Achievements
    var achDiv = document.getElementById('dashboard-achievements');
    var badges = [];
    if (mySubs.length >= 1) badges.push(__('badgeStudious'));
    if (mySubs.length >= 5) badges.push(__('badgeStar'));
    if ((mySubs.reduce(function(sum, s) { return sum + (s.initialScore || 0); }, 0) / Math.max(mySubs.length, 1)) >= 80) badges.push(__('badgeExcellent'));
    if (badges.length === 0) badges.push(__('badgeStart'));

    achDiv.innerHTML = '<div class="space-y-2">' +
        badges.map(function(b) { return '<p class="text-white font-bold text-lg">' + b + '</p>'; }).join('') +
        '</div>';

    // Encouragement
    var encouragement = document.getElementById('dashboard-encouragement');
    var msgs = [
        __('encourage1'),
        __('encourage2'),
        __('encourage3'),
        __('encourage4')
    ];
    encouragement.textContent = msgs[Math.floor(Math.random() * msgs.length)];
}

// ==================== واجهة ولي الأمر ====================

function renderParentDashboard() {
    const list = document.getElementById('parent-grades-list');
    list.innerHTML = '';

    const linkedContact = currentUserSession?.childContact || "0555555555";
    const childSubmissions = localData.submissions.filter(s => s.studentContact === linkedContact || s.parentContact === currentUserSession?.contact);

    const childName = childSubmissions.length > 0 ? childSubmissions[0].studentName : "عبد الرحمن (حساب مرتبط)";
    document.getElementById('parent-linked-child-name').textContent = childName;

    if (childSubmissions.length === 0) {
        list.innerHTML = '<p class="p-4 text-center text-yellow-400">' + escapeHtml(__('parentNoGrades', childName)) + '</p>';
        return;
    }

    childSubmissions.forEach(s => {
        const item = document.createElement('div');
        item.className = 'p-4 border-2 border-current rounded-xl flex justify-between items-center';
        item.innerHTML = `
            <div>
                <h4 class="font-bold text-xl">${escapeHtml(s.quizTitle)}</h4>
                <p class="text-xs text-gray-300">${escapeHtml(__('solveTime'))}: ${escapeHtml(s.timestamp)}</p>
            </div>
            <span class="text-2xl font-black text-yellow-400">${escapeHtml(String(s.initialScore))} / 100</span>
        `;
        list.appendChild(item);
    });

    // Render notifications
    var notifList = document.getElementById('parent-notifications-list');
    if (!notifList) return;
    var myNotifs = (localData.notifications || []).filter(function(n) {
        return n.type === 'submission' || n.type === 'achievement';
    });
    if (myNotifs.length === 0) {
        notifList.innerHTML = '<p class="text-gray-400">' + __('notifEmpty') + '</p>';
    } else {
        notifList.innerHTML = myNotifs.slice(0, 20).map(function(n) {
            var bg = n.read ? 'bg-slate-800' : 'bg-slate-700 border-r-2 border-yellow-400';
            return '<div class="p-2 rounded-lg ' + bg + '">' +
                '<p class="font-bold text-xs text-yellow-300">' + escapeHtml(n.title) + '</p>' +
                '<p class="text-gray-300 text-[10px]">' + escapeHtml(n.details) + '</p>' +
                '<p class="text-gray-500 text-[9px]">' + escapeHtml(n.time) + '</p></div>';
        }).join('');
    }
}

// ==================== واجهة الإدارة ====================

function handleAdminCreateStudent(e) {
    e.preventDefault();
    const name = document.getElementById('admin-student-name').value;
    const grade = document.getElementById('admin-student-grade').value;
    const pin = secureRandomInt(1000, 10000).toString();

    const newStudent = { name, grade, pin };
    localData.students.push(newStudent);
    saveLocalData();
    saveStudentToFirebase(newStudent);

    speak(__('adminAccountCreated', name, pin));
    e.target.reset();
    renderAdminDashboard();
}

function renderAdminDashboard() {
    const tbody = document.getElementById('admin-students-tbody');
    tbody.innerHTML = '';

    localData.students.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2 border font-bold">${escapeHtml(s.name)}</td>
            <td class="p-2 border">${escapeHtml(s.grade)}</td>
            <td class="p-2 border font-mono font-black text-lg tracking-widest text-yellow-400 text-center">${escapeHtml(s.pin)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== Firebase ====================

function saveBookToFirebase(book) { if (serverAvailable) serverSave('curriculum_modules', book); }
function saveQuizToFirebase(quiz) { if (serverAvailable) serverSave('assignments', quiz); }
function saveSubmissionToFirebase(sub) { if (serverAvailable) serverSave('submissions', sub); }
function saveStudentToFirebase(student) { if (serverAvailable) serverSave('students', student); }

// syncFromFirebase_cb was here — removed (dead code, never called)

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

    // Language toggle
    document.getElementById('lang-toggle')?.addEventListener('click', () => {
        setCurrentLang(getCurrentLang() === 'ar' ? 'en' : 'ar');
    });

    // Text size
    document.querySelectorAll('[data-size-dir]').forEach(btn => {
        btn.addEventListener('click', () => adjustTextSize(parseInt(btn.dataset.sizeDir)));
    });

    // Help shortcuts
    document.getElementById('btn-help-shortcuts')?.addEventListener('click', showKeyboardHelp);

    // Notifications
    document.getElementById('btn-notifications')?.addEventListener('click', showNotificationsPanel);

    // Logout
    document.querySelector('[data-action="logout"]')?.addEventListener('click', logout);

    // Login form
    document.querySelector('[data-action="login-form"]')?.addEventListener('submit', handleLoginSubmit);

    // Toggle between login and register
    document.getElementById('btn-show-register')?.addEventListener('click', () => {
        document.getElementById('login-form-container').classList.add('hidden');
        document.getElementById('register-form-container').classList.remove('hidden');
        document.getElementById('auth-warning-box').classList.add('hidden');
        speak(__('registerFormOpen'));
    });
    document.getElementById('btn-show-login')?.addEventListener('click', () => {
        document.getElementById('register-form-container').classList.add('hidden');
        document.getElementById('login-form-container').classList.remove('hidden');
        document.getElementById('auth-warning-box').classList.add('hidden');
        speak(__('backToLogin'));
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
        proxyUrlInput.value = savedProxyUrl || 'http://localhost:3001';
    }
    updateProxyStatus();

    // Proxy URL save/reset
    document.getElementById('btn-save-proxy-url')?.addEventListener('click', () => {
        const val = document.getElementById('proxy-url-input')?.value.trim();
        if (val) {
            localStorage.setItem('cloudSchoolProxyUrl', val);
            updateProxyStatus();
            speak(__('proxyUrlSaved'));
        }
    });
    document.getElementById('btn-reset-proxy-url')?.addEventListener('click', () => {
        localStorage.removeItem('cloudSchoolProxyUrl');
        if (proxyUrlInput) proxyUrlInput.value = 'http://localhost:3001';
        updateProxyStatus();
        speak(__('proxyUrlReset'));
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

// ====== Local Data Persistence ======
function saveLocalData() {
    try {
        localStorage.setItem(STORAGE_KEYS.localData, JSON.stringify(localData));
    } catch (e) {
        console.warn('Failed to save local data:', e);
    }
}

function loadLocalData() {
    try {
        var saved = localStorage.getItem(STORAGE_KEYS.localData);
        if (saved) {
            var parsed = JSON.parse(saved);
            if (parsed.books) localData.books = parsed.books;
            if (parsed.assignments) localData.assignments = parsed.assignments;
            if (parsed.submissions) localData.submissions = parsed.submissions;
            if (parsed.students) localData.students = parsed.students;
            if (parsed.notifications) localData.notifications = parsed.notifications;
        }
        if (!localData.notifications) localData.notifications = [];
    } catch (e) {
        console.warn('Failed to load local data:', e);
    }
}

// ====== Server Backend API (secure — replaces localStorage auth when server is running) ======
const SERVER_BASE = (typeof __server_base !== 'undefined' && __server_base) || '';
let serverAvailable = false;

async function checkServerHealth() {
    try {
        const r = await fetch(SERVER_BASE + '/api/health', { credentials: 'include' });
        if (r.ok) { serverAvailable = true; }
    } catch (e) { serverAvailable = false; }
}

async function checkServerSession() {
    if (!serverAvailable) return null;
    try {
        const r = await fetch(SERVER_BASE + '/api/auth/session', { credentials: 'include' });
        const data = await r.json();
        if (data.authenticated) return data.user;
    } catch (e) {}
    return null;
}

async function serverLoginFirebase(idToken) {
    const r = await fetch(SERVER_BASE + '/api/auth/firebase-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include'
    });
    if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Firebase login failed'); }
    return await r.json();
}

async function serverRegisterFirebase(idToken, name, role, age, parentContact) {
    const r = await fetch(SERVER_BASE + '/api/auth/firebase-register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, name, role, age: age || 0, parentContact: parentContact || '' }),
        credentials: 'include'
    });
    if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Firebase registration failed'); }
    return await r.json();
}

async function serverLogout() {
    try { await fetch(SERVER_BASE + '/api/auth/logout', { method: 'POST', credentials: 'include' }); }
    catch (e) {}
}

async function serverFetch(collection) {
    const r = await fetch(SERVER_BASE + '/api/data/' + collection, { credentials: 'include' });
    if (!r.ok) throw new Error('Failed to fetch ' + collection);
    return await r.json();
}

async function serverSave(collection, data) {
    const r = await fetch(SERVER_BASE + '/api/data/' + collection, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), credentials: 'include'
    });
    if (!r.ok) throw new Error('Failed to save ' + collection);
    return await r.json();
}

async function serverUpdate(collection, id, data) {
    const r = await fetch(SERVER_BASE + '/api/data/' + collection + '/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), credentials: 'include'
    });
    if (!r.ok) throw new Error('Failed to update ' + collection);
    return await r.json();
}

async function serverDelete(collection, id) {
    const r = await fetch(SERVER_BASE + '/api/data/' + collection + '/' + id, {
        method: 'DELETE', credentials: 'include'
    });
    if (!r.ok) throw new Error('Failed to delete ' + collection);
    return await r.json();
}

async function initServerBackend() {
    await checkServerHealth();
    if (serverAvailable) {
        // If server has the Gemini API key, clear it from browser storage
        try {
            const r = await fetch(SERVER_BASE + '/api/admin/gemini-key', { credentials: 'include' });
            if (r.ok) {
                const data = await r.json();
                if (data.configured) {
                    localStorage.removeItem('gemini_api_key');
                }
            }
        } catch (e) { /* not critical */ }

        const user = await checkServerSession();
        if (user) {
            currentUserSession = {
                name: user.name, contact: user.email, role: user.role,
                serverId: user.id, serverAuth: true
            };
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('dev-role-bar').classList.remove('hidden');
            document.querySelector('[data-action="logout"]')?.classList.remove('hidden');
            document.getElementById('active-user-badge').textContent = __('userBadge', user.name, getArabicRoleName(user.role));
            switchRole(user.role);
            syncDataFromServer();
        }
    }
}

// ====== 3D Spatial Audio Effects ======
function play3DTone(startFreq, endFreq, type, duration, panX, panY, panZ) {
    try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var panner = ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'linear';
        panner.setPosition(panX || 0, panY || 0, panZ || 0);
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq || startFreq, ctx.currentTime + duration * 0.7);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.connect(panner);
        panner.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) { /* audio not available */ }
}

function playSuccess3D() {
    play3DTone(523.25, 880, 'sine', 0.3, -0.5, 0.5, 0.5);
}

function playFail3D() {
    play3DTone(150, 80, 'sawtooth', 0.3, 0.5, -0.5, 0.5);
}

function playTick3D() {
    play3DTone(800, 1200, 'square', 0.1, 0, 0.8, 0.3);
}

function playDirectionSound(direction) {
    var x = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    var y = direction === 'up' ? 1 : direction === 'down' ? -1 : 0;
    play3DTone(440, 660, 'sine', 0.2, x, y, 0.5);
}

// ====== Audio Co-Pilot Init ======
function initAudioCoPilot() {
    var btn = document.getElementById('audio-co-pilot-toggle');
    if (btn) {
        btn.textContent = audioCoPilotEnabled ? __('audioCpOn') : __('audioCpOff');
        btn.setAttribute('aria-pressed', audioCoPilotEnabled ? 'true' : 'false');
    }
}

// ==================== تهيئة التطبيق ====================

var INIT_RAN = false;

function safeInit(fn, name) {
    try {
        fn();
    } catch (e) {
        console.error('Init error in ' + name + ':', e);
        try {
            const msg = __('initError', name, e.message || '');
            const toast = document.getElementById('toast-message');
            if (toast) { toast.textContent = msg; toast.classList.remove('hidden'); }
        } catch(e2) {}
    }
}

function runInit() {
    if (INIT_RAN) return;
    INIT_RAN = true;

    // كل دالة بناديها عن طريق الاسم عشان نتأكد إنها موجودة
    var steps = [
        ['setupGlobalErrorHandler', 'معالج الأخطاء'],
        ['loadTheme', 'السمات'],
        ['loadTextSize', 'حجم الخط'],
        ['initFirebase', 'Firebase'],
        ['initServerBackend', 'الخادم'],
        ['setupAccessibleVoices', 'الصوت'],
        ['setupPerkinsKeyboard', 'برايل'],
        ['toggleRegFields', 'الحقول'],
        ['setupKeyboardShortcuts', 'اختصارات'],
        ['setupAgeLevel', 'العمر'],
        ['initI18n', 'الترجمة'],
        ['bindAllEvents', 'الأزرار']
    ];

    for (var i = 0; i < steps.length; i++) {
        var fnName = steps[i][0];
        var label = steps[i][1];
        if (typeof window[fnName] === 'function') {
            safeInit(window[fnName], label);
        } else {
            console.warn('[CS] Skipping ' + label + ': ' + fnName + ' not found');
        }
    }

    // تحديث شارة الإشعارات
    updateNotifBadge();

    // تحسين إمكانية الوصول — إدارة التركيز
    document.addEventListener('section-opened', function(e) {
        var sectionTitle = document.getElementById('student-section-title');
        if (sectionTitle) setTimeout(function() { sectionTitle.focus(); }, 100);
    });

    try {
        speak(__('welcomeMessage'));
    } catch (e) {
        console.error('Speak error:', e);
    }

    // إخفاء شاشة الترحيب
    dismissSplashScreen();
}

function dismissSplashScreen() {
    var splash = document.getElementById('splash-screen');
    if (!splash) return;
    var handler = function() {
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        setTimeout(function() {
            splash.style.display = 'none';
            // نقل التركيز إلى بوابة تسجيل الدخول
            var authGate = document.getElementById('auth-gate');
            if (authGate) {
                var firstInput = authGate.querySelector('input, button, [tabindex]:not([tabindex="-1"])');
                if (firstInput) firstInput.focus();
            }
        }, 700);
        document.removeEventListener('keydown', handler);
        splash.removeEventListener('click', handler);
    };
    splash.addEventListener('click', handler);
    document.addEventListener('keydown', handler);
    setTimeout(handler, 5000);
}

// طريقة 1: window.onload
window.onload = function () {
    runInit();
};

// طريقة 2: لو load حصل قبل متعيين onload (احتمال ضعيف)
if (document.readyState === 'complete') {
    setTimeout(runInit, 0);
}

