import { speakToUser } from './modules/audio-core.js';
import {
  ERROR_LEVELS, listeners, secureRandomInt, notifyListeners,
  handleError, setupGlobalErrorHandler,
} from './modules/error-handler.js';
import { escapeHtml, base64ToArrayBuffer, pcmToWav, blobToBase64 } from './modules/helpers.js';
import {
  configureAuth, checkAgeLimitations, handleLoginSubmit, enterApp, handleRegistrationSubmit, logout
} from './modules/auth.js';
import {
  arabicBrailleMap, updateBraillePreview, toggleDot, clearDots, commitBrailleChar
} from './modules/braille.js';
import {
  _toastTimer, sharedAudioContext, getAudioContext,
  showToast, showLoading, trapFocus, focusElement, announceToScreenReader,
  shortcutRow, showKeyboardHelp, showNotificationsPanel,
  saveLocalData, loadLocalData
} from './modules/ui-core.js';
import {
  openStudentSection, closeStudentSection, setupKeyboardShortcuts
} from './modules/router.js';
import {
  activeGameType, currentGameScore, gameTimeLeft,
  currentCorrectAnswer, questionBank,
  audioMemorySequence, audioMemoryStep, audioMemoryPatterns,
  pickQuestionByDifficulty, initGame, startNewGameRound,
  listenForGameAnswer, answerGame, endGame,
  startAudioMemoryGame, addAudioMemoryStep, playAudioMemorySequence,
  answerAudioMemory, initAudioMemoryUI, clearGameTimer
} from './modules/audio-game.js';
import {
  i18n, currentLang, getCurrentLang, setCurrentLang, __, getPrompt,
  applyTranslations, applyJsTranslations, initTtsLang, loadLocale, initI18n
} from './modules/i18n.js';
import {
  app as fbApp, db as fbDb, auth as fbAuth, userId as fbUserId,
  isAuthReady as fbIsAuthReady, snapshotUnsubscribers as fbSnapshotUnsubscribers,
  initFirebase
} from './modules/firebase-client.js';
import {
  getProxyBase, proxyFetch, buildTextPayload, buildMediaPayload,
  extractText, extractAudio, callGemini, callGeminiWithMedia,
  speakWithGeminiTTS, transcribeAudio, describeImage
} from './modules/gemini-client.js';


/** Firebase module - ط§ظ„ظ…طµط§ط¯ظ‚ط© ظˆط§ظ„طھط®ط²ظٹظ† ط§ظ„ط³ط­ط§ط¨ظٹ */

Object.defineProperty(window, 'userId', {
  get() { return fbUserId; },
  set(val) { /* read-only from module */ }
});

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
let currentCheatDots = new Set();


/** UI module - ط£ط¯ظˆط§طھ ظˆط§ط¬ظ‡ط© ط§ظ„ظ…ط³طھط®ط¯ظ… */

const STORAGE_KEYS = {
  sizeOffset: 'cloudSchoolSizeOffset',
  theme: 'cloudSchoolTheme',
  localData: 'cloudSchoolData',
};

// ====== Local Data ======
var localData = {
    books: [
        { id: 'b1', title: 'ظƒظٹظ…ظٹط§ط، ط§ظ„طµظپ ط§ظ„ط¹ط§ط´ط± - ط§ظ„ظˆط­ط¯ط© ط§ظ„ط£ظˆظ„ظ‰', content: 'ظ…ط±ط­ط¨ظ‹ط§ ط¨ظƒ ظپظٹ ظˆط­ط¯ط© ط§ظ„ظƒظٹظ…ظٹط§ط،. ظپظٹ ظ‡ط°ط§ ط§ظ„ط¯ط±ط³طŒ ط³ظ†طھط¹ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط¹ظ†ط§طµط± ظˆط§ظ„ط±ظˆط§ط¨ط· ط§ظ„طھط³ط§ظ‡ظ…ظٹط© ظˆط§ظ„ط£ظٹظˆظ†ظٹط© ظˆطھظپط§ط¹ظ„ط§طھ ط§ظ„ط·ط§ظ‚ط© ظˆط§ظ„ط­ط±ط§ط±ط©.', audio: '' },
        { id: 'b2', title: 'طھط§ط±ظٹط® ظˆط­ط¶ط§ط±ط© ط§ظ„ظˆط·ظ† ط§ظ„ط¹ط±ط¨ظٹ', content: 'ظ…ط±ط­ط¨ظ‹ط§ ط¨ظƒ ظپظٹ طھط§ط±ظٹط® ط§ظ„ط¹ط±ط¨ ط§ظ„ظ…ط¬ظٹط¯. ط³ظ†طھط¹ظ„ظ… ط§ظ„ظٹظˆظ… ط¹ظ† ط§ظ„ط­ط¶ط§ط±ط§طھ ط§ظ„ظ‚ط¯ظٹظ…ط© ط§ظ„طھظٹ ظ‚ط§ظ…طھ ظپظٹ ط´ط¨ظ‡ ط§ظ„ط¬ط²ظٹط±ط© ط§ظ„ط¹ط±ط¨ظٹط© ظˆط§ظ„ظ‡ظ„ط§ظ„ ط§ظ„ط®طµظٹط¨ ظˆظ…طµط± ط§ظ„ظپط±ط¹ظˆظ†ظٹط©.', audio: '' }
    ],
    assignments: [
        { id: 'a1', title: 'ظˆط§ط¬ط¨ ط§ظ„ط¹ظ„ظˆظ… ظˆط§ظ„ظپظٹط²ظٹط§ط، ط§ظ„ط£ظˆظ„', type: 'mcq', question: 'ظ…ط§ ظ‡ظˆ ط§ظ„ظ…ظƒظˆظ† ط§ظ„ط£ط³ط§ط³ظٹ ظ„ط؛ط§ط² ط§ظ„ط£ظˆط²ظˆظ†طں', options: { A: 'ط§ظ„ظ‡ظٹط¯ط±ظˆط¬ظٹظ†', B: 'ط§ظ„ط£ظƒط³ط¬ظٹظ† ط§ظ„ط«ظ„ط§ط«ظٹ', C: 'ط§ظ„ظ†ظٹطھط±ظˆط¬ظٹظ†', D: 'ط؛ط§ط² ط«ط§ظ†ظٹ ط£ظƒط³ظٹط¯ ط§ظ„ظƒط±ط¨ظˆظ†' }, correct: 'B' },
        { id: 'a2', title: 'ط§ط®طھط¨ط§ط± ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ظ…ظ‚ط§ظ„ظٹ', type: 'text', question: 'ط§ظƒطھط¨ ظپظ‚ط±ط© ظ‚طµظٹط±ط© طھطھط­ط¯ط« ظپظٹظ‡ط§ ط¹ظ† ظپط¶ظ„ ط§ظ„ظ…ط¹ظ„ظ… ظپظٹ ط§ظ„ظ…ط¬طھظ…ط¹ ظˆط£ظ‡ظ…ظٹط© ط§ظ„ط¹ظ„ظ…طں', ideal: 'ظٹط¹ط¯ ط§ظ„ط¹ظ„ظ… ط±ظƒظٹط²ط© ط§ظ„ظ…ط¬طھظ…ط¹ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©طŒ ظˆط§ظ„ظ…ط¹ظ„ظ… ظ‡ظˆ ط§ظ„ظ†ظˆط± ط§ظ„ط°ظٹ ظٹط¨ط¯ط¯ ط§ظ„ط¸ظ„ط§ظ…...' }
    ],
    submissions: [],
    notifications: [],
    students: [
        { name: 'ط£ط­ظ…ط¯ ط®ط§ظ„ط¯', grade: 'ط§ظ„طµظپ ط§ظ„ط¹ط§ط´ط±', pin: '0000' },
        { name: 'ط³ط§ط±ط© ط¹ط¨ط¯ ط§ظ„ظ„ظ‡', grade: 'ط§ظ„طµظپ ط§ظ„طھط§ط³ط¹', pin: '0000' }
    ]
};

// ====== Control Variables ======
var audioCoPilotEnabled = true;
var screenReaderMode = false;
var activeRole = 'student';
var currentBrailleDots = new Set();
var selectedQuizId = null;
var ttsEngineMode = localStorage.getItem('cloudSchoolTtsEngine') || 'browser';
var activeAudioElement = null;
var currentUserSession = null;
var currentAgeLevel = localStorage.getItem('cloudSchoolAgeLevel') || 'auto';
var currentlyPlayingBookId = null;
var selectedOption = null;
var quizTimerInterval = null;
var uploadedImageBase64 = null;
var uploadedImageMime = null;
var accessibleVoicesController = null;

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
      ? 'ًںژ™ï¸ڈ ' + __('ttsGemini')
      : 'ًںژ™ï¸ڈ ' + __('ttsBrowser');
  }
  speak(ttsEngineMode === 'gemini' ? __('ttsGeminiActivated') : __('ttsBrowserActivated'));
}

// ====== ط§ظ„ظ…ط±ط­ظ„ط© ط§ظ„ط¹ظ…ط±ظٹط© ======
function setupAgeLevel() {
    var btn = document.getElementById('btn-age-level');
    if (!btn) return;
    updateAgeLevelButton();
    btn.addEventListener('click', function() { toggleAgeLevel(); });
}

function toggleAgeLevel() {
    var levels = ['auto', 'child', 'teen', 'adult'];
    var labels = { auto: __('ageLevelAuto'), child: __('ageLevelChild'), teen: __('ageLevelTeen'), adult: __('ageLevelAdult') };
    var idx = levels.indexOf(currentAgeLevel);
    currentAgeLevel = levels[(idx + 1) % levels.length];
    localStorage.setItem('cloudSchoolAgeLevel', currentAgeLevel);
    updateAgeLevelButton();
    speak(__('ageSet', labels[currentAgeLevel]));
}

function updateAgeLevelButton() {
    var btn = document.getElementById('btn-age-level');
    var labels = { auto: __('ageLevelAuto'), child: __('ageLevelChild'), teen: __('ageLevelTeen'), adult: __('ageLevelAdult') };
    if (btn) btn.textContent = __('ageButton', labels[currentAgeLevel] || __('ageLevelAuto'));
}

function getAgeTone() {
    var age = currentUserSession?.age || 14;
    switch (currentAgeLevel) {
        case 'child': return 'ط§ط³طھط®ط¯ظ… ط£ط³ظ„ظˆط¨ط§ظ‹ ظ…ط¨ط³ط·ط§ظ‹ ط¬ط¯ط§ظ‹ ظ…ظ†ط§ط³ط¨ط§ظ‹ ظ„ظ„ط£ط·ظپط§ظ„طŒ ظ…ط¹ ط£ظ…ط«ظ„ط© ظٹظˆظ…ظٹط© ظ…ظ„ظ…ظˆط³ط©طŒ ظˆطھط´ط¬ظٹط¹ ظ…ط³طھظ…ط±.';
        case 'teen': return 'ط§ط³طھط®ط¯ظ… ط£ط³ظ„ظˆط¨ط§ظ‹ ط´ط¨ط§ط¨ظٹط§ظ‹ ظ…ظ†ط§ط³ط¨ط§ظ‹ ظ„ظ„ظ…ط±ط§ظ‡ظ‚ظٹظ†طŒ ظ…ط¹ طھط­ط¯ظٹط§طھ ظپظƒط±ظٹط© ظ…ظ†ط§ط³ط¨ط©طŒ ظˆظ„ط؛ط© ظˆط§ط¶ط­ط© ظ„ظƒظ†ظ‡ط§ ط؛ظٹط± ط·ظپظˆظ„ظٹط©.';
        case 'adult': return 'ط§ط³طھط®ط¯ظ… ط£ط³ظ„ظˆط¨ط§ظ‹ ط£ظƒط§ط¯ظٹظ…ظٹط§ظ‹ ط±طµظٹظ†ط§ظ‹ ظ…ظ†ط§ط³ط¨ط§ظ‹ ظ„ظ„ط¨ط§ظ„ط؛ظٹظ†طŒ ظ…ط¹ طھط­ظ„ظٹظ„ ط¹ظ…ظٹظ‚ ظˆظ…طµط·ظ„ط­ط§طھ ط¯ظ‚ظٹظ‚ط©.';
        default:
            if (age < 12) return 'ط§ط³طھط®ط¯ظ… ط£ط³ظ„ظˆط¨ط§ظ‹ ظ…ط¨ط³ط·ط§ظ‹ ط¬ط¯ط§ظ‹ ظ…ظ†ط§ط³ط¨ط§ظ‹ ظ„ظ„ط£ط·ظپط§ظ„.';
            if (age < 18) return 'ط§ط³طھط®ط¯ظ… ط£ط³ظ„ظˆط¨ط§ظ‹ ظ…ظ†ط§ط³ط¨ط§ظ‹ ظ„ظ„ظ…ط±ط§ظ‡ظ‚ظٹظ†طŒ ظˆط§ط¶ط­ ظˆط¬ط°ط§ط¨.';
            return 'ط§ط³طھط®ط¯ظ… ط£ط³ظ„ظˆط¨ط§ظ‹ ط£ظƒط§ط¯ظٹظ…ظٹط§ظ‹ ظ…ظ†ط§ط³ط¨ط§ظ‹ ظ„ظ„ط¨ط§ظ„ط؛ظٹظ†.';
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
    var labels = { 'dark-hc': __('themeDarkHC'), 'light-hc': __('themeLightHC'), 'classic': __('themeClassic') };
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

// ====== Audio Recording ======
var mediaRecorder = null;
var audioChunks = [];
var isRecording = false;

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

// ====== Gemini API Key (obfuscated at rest) ======
function _obfuscate(str) {
  const k = 'cs2026!';
  let r = '';
  for (let i = 0; i < str.length; i++) {
    r += String.fromCharCode(str.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  }
  return btoa(r);
}
function _deobfuscate(str) {
  try {
    const k = 'cs2026!';
    const d = atob(str);
    let r = '';
    for (let i = 0; i < d.length; i++) {
      r += String.fromCharCode(d.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }
    return r;
  } catch { return ''; }
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

// checkAgeLimitations has been moved to modules/auth.js

// handleLoginSubmit has been moved to modules/auth.js

// enterApp has been moved to modules/auth.js

// handleRegistrationSubmit has been moved to modules/auth.js

function clearAllTimers() {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    try {
        clearGameTimer();
    } catch(e) {}
}

// logout has been moved to modules/auth.js

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

    // ظ†ظ‚ظ„ ط§ظ„طھط±ظƒظٹط² ط¥ظ„ظ‰ ط¹ظ†ظˆط§ظ† ط§ظ„ظˆط§ط¬ظ‡ط© ط§ظ„ط¬ط¯ظٹط¯ط©
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
            return __('errorAIConnectionFailed');
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

    const prompt = `ظ„ظ‚ط¯ ظƒطھط¨ ط·ط§ظ„ط¨ ظƒظپظٹظپ ظ‡ط°ط§ ط§ظ„ظ†طµ ط§ظ„طھط¹ظ„ظٹظ…ظٹ ط¨ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©: "${answerText}". ظ‚ظ… ط¨ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط¥ظ…ظ„ط§ط،طŒ ظˆطھظˆط¶ظٹط­ ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„ظ…طھط±ط¬ظ…ط© ظˆط§ظ„طھط±ظƒظٹط¨ط§طھ ط§ظ„ظ†ط­ظˆظٹط©طŒ ظˆط¥ط¹ط·ط§ط¦ظ‡ طھظ‚ط±ظٹط±ط§ظ‹ طھط±ط¨ظˆظٹط§ظ‹ ظˆطµظˆطھظٹط§ظ‹ ظپط§ط¦ظ‚ ط§ظ„طھط´ط¬ظٹط¹ ظ„طھظ†ظ…ظٹط© ظ…ظ‡ط§ط±ط§طھ ط¨ط±ط§ظٹظ„ ظ„ط¯ظٹظ‡طŒ ظ…ط¹ طھظ‚ط¯ظٹظ… ط§ظ„ظ†طµ ط§ظ„ظ…طµط­ط­ ظˆط§ظ„ظ†ظ‡ط§ط¦ظٹ ط¨ط´ظƒظ„ ظˆط§ط¶ط­ ظˆط¨ط³ظٹط· ظˆظ…ط±ظٹط­ ظ„ظ„ظ‚ط±ط§ط،ط©.`;

    try {
        const resultText = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "ط£ظ†طھ ظ…ط¹ظ„ظ… ظ„ط؛ط© ط¹ط±ط¨ظٹط© ظ…طھظ…ظٹط² ظˆط®ط¨ظٹط± ظپظٹ طھط±ط¬ظ…ط© ظˆطھطµط­ظٹط­ ظ„ط؛ط© ط¨ط±ط§ظٹظ„ ظˆط·ط±ظٹظ‚ط© Perkins ظ„ظ„ظ…ظƒظپظˆظپظٹظ† ظ…ظ† ط¬ظ…ظٹط¹ ط§ظ„ظ…ط±ط§ط­ظ„ ط§ظ„ط¹ظ…ط±ظٹط©. ", "You are an excellent Arabic language teacher and expert in Braille translation and grading for blind students of all ages using the Perkins method. ") + getAgeTone());
        evalText.textContent = resultText;
        speak(resultText);
    } catch (error) {
        handleError(error, 'brailleEval');
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

    const prompt = `ظ‚ظ… ط¨طھظ„ط®ظٹطµ ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„طھط§ظ„ظٹ ط¨ط§ظ„طھظپطµظٹظ„ ط¨ط£ط³ظ„ظˆط¨ ظ†ظ‚ط§ط·ظٹ ط³ظ…ط¹ظٹ ظپط§ط¦ظ‚ ط§ظ„ظˆط¶ظˆط­ ظˆظ…ظ†ط§ط³ط¨ ظ„ظ„ظ…ظƒظپظˆظپظٹظ† ظ…ظ† ط¬ظ…ظٹط¹ ط§ظ„ط£ط¹ظ…ط§ط± ظ„طھط³ظ‡ظٹظ„ ط§ظ„ط­ظپط¸ ظƒط¨ط·ط§ظ‚ط§طھ ط§ط³طھط°ظƒط§ط± ط³ط±ظٹط¹ط©: "${book.content}". ظˆظ„ط¯ ط£ظٹط¶ط§ظ‹ ط«ظ„ط§ط«ط© ط£ط³ط¦ظ„ط© ظ…ط±ط§ط¬ط¹ط© ظˆطھظ†ط´ظٹط· ظ„ظ„ط°ط§ظƒط±ط© ظپظٹ ظ†ظ‡ط§ظٹط© ط§ظ„طھظ„ط®ظٹطµ. ` + getAgeTone();

    try {
        const resultText = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "ط£ظ†طھ ط®ط¨ظٹط± طھط¹ظ„ظٹظ…ظٹ ظ…طھظ…ظٹط² ظپظٹ طµظٹط§ط؛ط© ظˆطھظ„ط®ظٹطµ ط§ظ„ظ…ظ†ط§ظ‡ط¬ ط§ظ„ط¯ط±ط§ط³ظٹط© ظ„ط¶ط¹ط§ظپ ط§ظ„ط¨طµط± ط¨ط·ط±ظٹظ‚ط© ط³ظ…ط¹ظٹط© ظ…ط¨ط³ط·ط© ظ„ظ„ط؛ط§ظٹط©.", "You are an excellent educational expert in formulating and summarizing curricula for the visually impaired in a highly simplified audio manner."));
        document.getElementById('book-ai-summary-text').textContent = resultText;
        speak(resultText);
    } catch (error) {
        handleError(error, 'bookSummary');
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
        prompt = "ط§طµظ†ط¹ ظ‚طµط© طھط¹ظ„ظٹظ…ظٹط© طھظپط§ط¹ظ„ظٹط© ظ‚طµظٹط±ط© ظ…ط´ظˆظ‚ط© ظˆظ…ظ„ظ‡ظ…ط© ط¨ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ظپطµط­ظ‰ ظ„ط·ظ„ط§ط¨ ظ…ظƒظپظˆظپظٹظ† ط¹ظ† ظ…ط؛ط§ظ…ط±ط© ظپظٹ ط§ظ„ظ†ط¸ط§ظ… ط§ظ„ط´ظ…ط³ظٹ ظ„طھط¹ظ„ظ… ط§ظ„ظƒظˆط§ظƒط¨. ط£ظ†ظ‡ظگ ط§ظ„ظ…ظ‚ط·ط¹ ط§ظ„ط£ظˆظ„ ط¨ظ€ 3 ط®ظٹط§ط±ط§طھ ظ„ظ…ظˆط§طµظ„ط© ط§ظ„ظ…ط؛ط§ظ…ط±ط©. ط£ط®ط±ط¬ ط§ظ„ظ†طھظٹط¬ط© ط¨طµظٹط؛ط© JSON ظپظ‚ط· ط¨ط¯ظˆظ† ط¹ظ„ط§ظ…ط§طھ markdownطŒ ظˆطھط­طھظˆظٹ ط§ظ„ظ‡ظٹظƒظ„ ط§ظ„طھط§ظ„ظٹ: { 'story': 'ظ†طµ ط§ظ„ظ…ظ‚ط·ط¹ ط§ظ„ظ…ط«ظٹط± ظˆط§ظ„ظ…ط¨ط³ط· ظˆط¹ظ„ط§ظ‚طھظ‡ ط¨ط§ظ„ظ…ظ‚ط±ط± ط§ظ„ط¯ط±ط§ط³ظٹ', 'options': ['ط®ظٹط§ط± ط§ظ„ظ…ط؛ط§ظ…ط±ط© ط§ظ„ط£ظˆظ„ ط§ظ„ظ…ط«ظٹط± ظƒط¬ظ…ظ„ط© ظ‚طµظٹط±ط©', 'ط®ظٹط§ط± ط§ظ„ظ…ط؛ط§ظ…ط±ط© ط§ظ„ط«ط§ظ†ظٹ ط§ظ„ظ…ط«ظٹط± ظƒط¬ظ…ظ„ط© ظ‚طµظٹط±ط©', 'ط®ظٹط§ط± ط§ظ„ظ…ط؛ط§ظ…ط±ط© ط§ظ„ط«ط§ظ„ط« ط§ظ„ظ…ط«ظٹط± ظƒط¬ظ…ظ„ط© ظ‚طµظٹط±ط©'] }";
    } else {
        prompt = `ط§ط³طھظƒظ…ط§ظ„ط§ظ‹ ظ„ظ„ظ‚طµط© ط§ظ„ط³ط§ط¨ظ‚ط© ط§ظ„ظ…ط±ظˆظٹط©طŒ ط§ط®طھط§ط± ط§ظ„ط·ط§ظ„ط¨ ط§ظ„ط®ظٹط§ط± ط±ظ‚ظ… ${choiceIndex + 1}. طھط§ط¨ط¹ طھظپط§طµظٹظ„ ط§ظ„ظ…ط؛ط§ظ…ط±ط© ظپظٹ ط§ظ„ظپط¶ط§ط، ظˆط¹ظ„ظ…ظ‡ظ… ظ…ط¹ظ„ظˆظ…ط§طھ ط¬ط¯ظٹط¯ط© ظˆظ…ظپظٹط¯ط©طŒ ط«ظ… ط£ظ†ظ‡ظگ ط§ظ„ظ…ظ‚ط·ط¹ ظ…ط¬ط¯ط¯ط§ظ‹ ط¨ظ€ 3 ط®ظٹط§ط±ط§طھ ط¬ط¯ظٹط¯ط© ظ„ظ…طھط§ط¨ط¹ط© ط§ظ„ظ‚طµط© ظˆظ…ظˆط§طµظ„ط© ط§ظ„طھط­ط¯ظٹ. ط£ط®ط±ط¬ ط§ظ„ظ†طھظٹط¬ط© ط¨طµظٹط؛ط© JSON ظپظ‚ط· ط¨ظ†ظپط³ ط§ظ„طھظ†ط³ظٹظ‚: { 'story': 'ظ†طµ ط§ظ„ظ…ظ‚ط·ط¹ ط§ظ„ظ…ط«ظٹط± ظˆط§ظ„ظ…ط¨ط³ط· ظˆط¹ظ„ط§ظ‚طھظ‡ ط¨ط§ظ„ظ…ظ‚ط±ط± ط§ظ„ط¯ط±ط§ط³ظٹ', 'options': ['ط®ظٹط§ط± 1', 'ط®ظٹط§ط± 2', 'ط®ظٹط§ط± 3'] }`;
    }

    try {
        const jsonText = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "ط£ظ†طھ ظ…طµظ…ظ… ظ‚طµطµ طھظپط§ط¹ظ„ظٹط© ظˆطھط¹ظ„ظٹظ…ظٹط© ظ…ظ„ظ‡ظ…ط© ظˆظ…ط®طھطµ ظپظٹ طµظٹط§ط؛ط© ظ…ظ„ظپط§طھ JSON ظ†ظ‚ظٹط© ظˆظ…ط¨ط³ط·ط©.", "You are a designer of inspiring interactive educational stories and an expert in formulating clean and simplified JSON files."));
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        questionText.textContent = parsed.story;
        speak(parsed.story);

        parsed.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = "p-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive";
            btn.textContent = `${idx + 1}) ${opt}`;
            btn.setAttribute('aria-label', __('storyOptionLabel', idx + 1, opt));
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
        const responseText = await callGeminiAPI(queryText, getPrompt(getCurrentLang(), "ط£ظ†طھ ظ…ط¹ظ„ظ… ظˆط¯ظˆط¯ ظ…طھط®طµطµ ظپظٹ ط´ط±ط­ ط§ظ„ظ…ظ†ط§ظ‡ط¬ ط§ظ„ط¯ط±ط§ط³ظٹط© ظ„ظ„ظ…ظƒظپظˆظپظٹظ† ظˆط¶ط¹ط§ظپ ط§ظ„ط¨طµط± ظ…ظ† ط¬ظ…ظٹط¹ ط§ظ„ظ…ط±ط§ط­ظ„ ط§ظ„ط¹ظ…ط±ظٹط©. ظ‚ط¯ظ‘ظ… ط§ظ„ط´ط±ط­ ط¨ظ…ط³طھظˆظ‰ ظٹظ†ط§ط³ط¨ ط§ظ„ط·ط§ظ„ط¨: ظ„ظ„ط·ظپظ„ ط§ط³طھط®ط¯ظ… طھط¨ط³ظٹط·ط§ظ‹ ط´ط¯ظٹط¯ط§ظ‹ ظˆط£ظ…ط«ظ„ط© ظٹظˆظ…ظٹط©طŒ ظˆظ„ظ„ط´ط§ط¨ ظˆط§ظ„ط¨ط§ظ„ط؛ ط§ط³طھط®ط¯ظ… ط£ط³ظ„ظˆط¨ط§ظ‹ ط£ظƒط§ط¯ظٹظ…ظٹط§ظ‹ ظ…ظ†ط§ط³ط¨ط§ظ‹ ظ…ط¹ ط§ظ„ط­ظپط§ط¸ ط¹ظ„ظ‰ ط§ظ„ظˆط¶ظˆط­.", "You are a friendly teacher specialized in explaining curricula for blind and visually impaired students of all ages. Provide explanations at a level suitable for the student: use extreme simplification and daily examples for children, and an appropriate academic style for young people and adults while maintaining clarity."));
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

    const prompt = "ظˆظ„ط¯ ط³ط¤ط§ظ„ ط§ط®طھط¨ط§ط± ط­ظ‚ظٹظ‚ظٹ ظˆط§ط­ط¯ ظپظٹ ظ…ط§ط¯ط© ط§ظ„ط¹ظ„ظˆظ… ظٹطھظƒظˆظ† ظ…ظ† ط§ط®طھظٹط§ط± ظ…ظ† ظ…طھط¹ط¯ط¯ ظ…ط¹ ط£ط±ط¨ط¹ط© ط®ظٹط§ط±ط§طھ ظˆطھط­ط¯ظٹط¯ ط§ظ„ط®ظٹط§ط± ط§ظ„طµط­ظٹط­. ط£ط®ط±ط¬ ط§ظ„ظ†طھظٹط¬ط© ط¨طھظ†ط³ظٹظ‚ JSON ظ†ط¸ظٹظپ ظˆط¨ط³ظٹط· ظٹط­طھظˆظٹ ط¹ظ„ظ‰ ظ…ظپط§طھظٹط­: question, A, B, C, D, correct.";

    try {
        const jsonText = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "ط£ظ†طھ ظ…طµظ…ظ… ط§ط®طھط¨ط§ط±ط§طھ ط£ظƒط§ط¯ظٹظ…ظٹ ظ…طھظ…ظٹط². ", "You are an excellent academic quiz designer. ") + getAgeTone());
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        document.getElementById('teacher-quiz-title').value = __('autoGeneratedQuizTitle');
        document.getElementById('teacher-quiz-q').value = parsed.question;
        document.getElementById('teacher-quiz-oa').value = parsed.A;
        document.getElementById('teacher-quiz-ob').value = parsed.B;
        document.getElementById('teacher-quiz-oc').value = parsed.C;
        document.getElementById('teacher-quiz-od').value = parsed.D;
        document.getElementById('teacher-quiz-correct').value = parsed.correct;

        speak(__('quizReady'));
    } catch (e) {
        handleError(e, 'quizGeneration');
        speak(__('quizFailed'));
    } finally {
        btn.textContent = __('quizGenerateBtn');
    }
}

function toggleCheatDot(dotNum) {
    toggleDot(dotNum, currentCheatDots, 'cheat-dot', 'cheat-char-preview', __('brailleIncompleteShort'));
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
    clearDots(currentCheatDots, 'cheat-dot', 'cheat-char-preview', true);
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
                <button data-action="read-book" data-book-id="${escapeHtml(b.id)}" class="flex-1 p-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 btn-interactive">ًں“– ${__('btnReadAI')}</button>
                <button data-action="play-book" data-book-id="${escapeHtml(b.id)}" class="flex-1 p-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 btn-interactive">ًںژ§ ${__('btnListenAudio')}</button>
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
            <button data-action="start-quiz" data-quiz-id="${escapeHtml(a.id)}" class="p-4 bg-green-600 text-white font-black text-lg rounded-xl hover:bg-green-500 large-touch-target btn-interactive">${__('btnStartQuiz')} ًںڈپ</button>
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
        studentName: currentUserSession?.name || __('fallbackStudent'),
        studentContact: currentUserSession?.contact || "0555555555",
        parentContact: currentUserSession?.parentContact || "parent@cloudschool.com",
        quizId: selectedQuizId,
        quizTitle: quiz.title,
        studentAnswer: finalAnswer,
        initialScore: score,
        graderFeedback: quiz.type === 'mcq' ? __('autoGradingFeedback') : __('awaitingAIGrading'),
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
    if (!commitBrailleChar(dots.join(','))) {
        speak(__('brailleUnknown'));
    }
}

function toggleBrailleDot(dotNumber) {
    toggleDot(dotNumber, currentBrailleDots, 'dot', 'braille-char-preview', __('brailleUnknown'));
}

function enterBrailleChar() {
    const dotsArray = Array.from(currentBrailleDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    if (commitBrailleChar(keyString)) {
        clearBrailleDots();
    } else {
        speak(__('brailleInvalidChar'));
    }
}

function clearBrailleDots() {
    clearDots(currentBrailleDots, 'dot', 'braille-char-preview', false);
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

    const prompt = `ظ‚ط§ط±ظ† ط¥ط¬ط§ط¨ط© ط§ظ„ط·ط§ظ„ط¨: "${sub.studentAnswer}" ظ…ط¹ ط§ظ„ط³ط¤ط§ظ„ ط§ظ„ظ…ظ‚ط§ظ„ظٹ ظˆطµط­ط­ظ‡ ط¥ظ…ظ„ط§ط¦ظٹط§ظ‹ ظˆظ„ط؛ظˆظٹط§ظ‹ ظˆظ‚ط¯ظ… طھظ‚ط±ظٹط±ط§ظ‹ ظ…ظ† س·ط±ظٹظ† ظ…طھط¶ظ…ظ†ط§ظ‹ ط§ظ„ط¯ط±ط¬ط© ط§ظ„ظ…ظ‚طھط±ط­ط© (ظ…ظ† 100) ظ…ط¹ ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„ظ…ط´ط¬ط©ظ„ط© ظ„ظ„ط·ط§ظ„ط¨ ط§ظ„ظƒظپظٹظپ.`;

    try {
        const report = await callGeminiAPI(prompt, getPrompt(getCurrentLang(), "ط£ظ†طھ ظ…طµط­ط­ ظˆظ…ط¹ظ„ظ… طھط±ط¨ظˆظٹ. ", "You are a grader and educational teacher. ") + getAgeTone());
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

// ==================== ظ„ظˆط­ط© ظ‚ظٹط§ط¯ط© ط§ظ„ظ…ط¹ظ„ظ… ====================

function renderTeacherDashboard() {
    import('./modules/dashboards/teacher-dashboard.js').then(m => m.renderTeacherDashboard());
}

function renderTeacherSubmissions() {
    import('./modules/dashboards/teacher-dashboard.js').then(m => m.renderTeacherSubmissions());
}
function renderGradeDistribution() {}
function renderStudentPerformanceTable() {}
function generateTeacherReport() {}

// ==================== ظ†ط¸ط§ظ… ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ ====================

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
            '<p class="text-gray-300 text-sm">' + escapeHtml(__('dashboardLastQuiz')) + ' ' + escapeHtml(last.quizTitle || '') + ' â€” ' + (last.initialScore || 0) + '%</p>' +
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
            books.map(function(b) { return '<li>ًں“– ' + escapeHtml(b.title) + '</li>'; }).join('') +
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

// ==================== ظˆط§ط¬ظ‡ط© ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ====================

function renderParentDashboard() {
    import('./modules/dashboards/parent-dashboard.js').then(m => m.renderParentDashboard());
}

function handleAdminCreateStudent(e) {
    import('./modules/dashboards/admin-dashboard.js').then(m => m.handleAdminCreateStudent(e));
}

function renderAdminDashboard() {
    import('./modules/dashboards/admin-dashboard.js').then(m => m.renderAdminDashboard());
}

function saveBookToFirebase(book) { if (serverAvailable) serverSave('curriculum_modules', book); }
function saveQuizToFirebase(quiz) { if (serverAvailable) serverSave('assignments', quiz); }
function saveSubmissionToFirebase(sub) { if (serverAvailable) serverSave('submissions', sub); }
function saveStudentToFirebase(student) { if (serverAvailable) serverSave('students', student); }

// syncFromFirebase_cb was here â€” removed (dead code, never called)

// ==================== [ط¥طµظ„ط§ط­ #11] ط±ط¨ط· ط§ظ„ط£ط­ط¯ط§ط« ط¹ط¨ط± addEventListener ====================

function updateProxyStatus() {
    checkProxyHealth().then((ok) => {
        document.getElementById('proxy-status-icon').textContent = ok ? 'ًںں¢' : 'ًں”´';
        const el = document.getElementById('proxy-status');
        if (el) {
            el.textContent = ok ? __('proxyConnected') : __('proxyDisconnected');
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


// ====== Server Backend API (secure â€” replaces localStorage auth when server is running) ======
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

// ====== Audio Co-Pilot Init ======
function initAudioCoPilot() {
    var btn = document.getElementById('audio-co-pilot-toggle');
    if (btn) {
        btn.textContent = audioCoPilotEnabled ? __('audioCpOn') : __('audioCpOff');
        btn.setAttribute('aria-pressed', audioCoPilotEnabled ? 'true' : 'false');
    }
}

// ==================== طھظ‡ظٹط¦ط© ط§ظ„طھط·ط¨ظٹظ‚ ====================

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

    configureAuth({
        speak,
        __,
        showToast,
        serverAvailable: typeof serverAvailable !== 'undefined' ? serverAvailable : false,
        serverLoginFirebase,
        serverRegisterFirebase,
        serverLogout,
        syncDataFromServer,
        getArabicRoleName,
        switchRole,
        saveLocalData,
        clearAllTimers,
        getCurrentUserSession: () => currentUserSession,
        setCurrentUserSession: (val) => { currentUserSession = val; },
        getUserId: () => fbUserId,
        setUserId: () => {},
        getIsAuthReady: () => fbIsAuthReady,
        setIsAuthReady: () => {}
    });

    // طƒظ„ ط¯ط§ظ„ط© ط¨ظ†ط§ط¯ظٹظ‡ط§ ط¹ظ† ط·ط±ظٹظ‚ ط§ظ„ط§ط³ظ… ط¹ط´ط§ظ† ظ†طھط£ظƒط¯ ط¥ظ†ظ‡ط§ ظ…ظˆط¬ظˆط¯ط©
    var steps = [
        ['setupGlobalErrorHandler', __('initStepErrorHandler')],
        ['loadTheme', __('initStepThemes')],
        ['loadTextSize', __('initStepFontSize')],
        ['initFirebase', 'Firebase'],
        ['initServerBackend', __('initStepServer')],
        ['setupAccessibleVoices', __('initStepAudio')],
        ['setupPerkinsKeyboard', __('initStepBraille')],
        ['toggleRegFields', __('initStepFields')],
        ['setupKeyboardShortcuts', __('initStepShortcuts')],
        ['setupAgeLevel', __('initStepAge')],
        ['initI18n', __('initStepI18n')],
        ['bindAllEvents', __('initStepButtons')]
    ];

    var appFunctions = {
        setupGlobalErrorHandler,
        loadTheme,
        loadTextSize,
        initFirebase,
        initServerBackend,
        setupAccessibleVoices,
        setupPerkinsKeyboard,
        toggleRegFields,
        setupKeyboardShortcuts,
        setupAgeLevel,
        initI18n,
        bindAllEvents
    };

    for (var i = 0; i < steps.length; i++) {
        var fnName = steps[i][0];
        var label = steps[i][1];
        var fn = appFunctions[fnName];
        if (typeof fn === 'function') {
            safeInit(fn, label);
        } else {
            console.warn('[CS] Skipping ' + label + ': ' + fnName + ' not found');
        }
    }

    // طھط­ط¯ظٹط« ط´ط§ط±ط© ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ
    updateNotifBadge();

    // طھط­ط³ظٹظ† ط¥ظ…ظƒط§ظ†ظٹط© ط§ظ„ظˆطµظˆظ„ â€” ط¥ط¯ط§ط±ط© ط§ظ„طھط±ظƒظٹط²
    document.addEventListener('section-opened', function(e) {
        var sectionTitle = document.getElementById('student-section-title');
        if (sectionTitle) setTimeout(function() { sectionTitle.focus(); }, 100);
    });

    try {
        speak(__('welcomeMessage'));
    } catch (e) {
        console.error('Speak error:', e);
    }

    // ط¥ط®ظپط§ط، ط´ط§ط´ط© ط§ظ„طھط±ط­ظٹط¨
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
            // ظ†ظ‚ظ„ ط§ظ„طھط±ظƒظٹط² ط¥ظ„ظ‰ ط¨ظˆط§ط¨ط© طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„
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

// ط·ط±ظٹظ‚ط© 1: window.onload
window.onload = function () {
    runInit();
};

// ط·ط±ظٹظ‚ط© 2: ظ„ظˆ load ط­طµظ„ ظ‚ط¨ظ„ ظ…طھط¹ظٹظٹظ† onload (ط§ط­طھظ…ط§ظ„ ط¶ط¹ظٹظپ)
if (document.readyState === 'complete') {
    setTimeout(runInit, 0);
}

// Vite ES module exports
export {
  updateBraillePreview, toggleDot, clearDots, commitBrailleChar, arabicBrailleMap,
  ERROR_LEVELS, listeners, secureRandomInt,
  notifyListeners, speakToUser, handleError, setupGlobalErrorHandler,
  i18n, getCurrentLang, setCurrentLang, __, getPrompt, applyTranslations, applyJsTranslations,
  initTtsLang, loadLocale, initI18n,
  initFirebase, getProxyBase, proxyFetch, buildTextPayload, buildMediaPayload,
  extractText, extractAudio, callGemini, callGeminiWithMedia, speakWithGeminiTTS,
  transcribeAudio, describeImage, base64ToArrayBuffer, pcmToWav,
  STORAGE_KEYS, localData, audioCoPilotEnabled, screenReaderMode, activeRole,
  currentBrailleDots, selectedQuizId, activeGameType,
  currentGameScore, gameTimeLeft, ttsEngineMode, activeAudioElement,
  currentUserSession, currentAgeLevel, currentlyPlayingBookId, selectedOption,
  quizTimerInterval, currentCorrectAnswer, uploadedImageBase64,
  uploadedImageMime, accessibleVoicesController, sharedAudioContext,
  _toastTimer, showToast, showLoading, escapeHtml, speak, stopAllAudio,
  toggleTtsEngine, setupAgeLevel, toggleAgeLevel, updateAgeLevelButton, getAgeTone,
  toggleScreenReaderMode, toggleAudioCoPilot,
  adjustTextSize, loadTextSize, setTheme, loadTheme, cycleTheme,
  setupAccessibleVoices, checkProxyHealth, showKeyboardHelp, shortcutRow, setupKeyboardShortcuts,
  currentLang, stopAudioTracks, toggleAudioRecording, blobToBase64, trapFocus, focusElement,
  announceToScreenReader, _obfuscate, _deobfuscate, getGeminiKey,
  toggleRegFields, checkAgeLimitations, handleLoginSubmit, enterApp, handleRegistrationSubmit,
  logout, syncDataFromServer, getArabicRoleName, switchRole,
  callGeminiAPI, translateAndEvaluateBrailleWithAI, summarizeCurriculumBookWithAI,
  startAiStoryRound, analyzeImageWithGemini, askAITutor, generateAIQuiz,
  toggleCheatDot, pronounceCheatBraille, clearCheatDots,
  openStudentSection, closeStudentSection, renderStudentBooks,
  readBookAloud, playBookAudio, readActiveBookWithAi, controlAudiobook,
  renderStudentAssignments, startQuiz, selectQuizOption, submitQuizAnswer,
  setupPerkinsKeyboard, processPerkinsChord, toggleBrailleDot, enterBrailleChar,
  clearBrailleDots, addSpaceToAnswer, deleteLastChar,
  toggleBrailleKeyboard, previewVisionImage, speakVisionResponse,
  initGame, pickQuestionByDifficulty, startNewGameRound, listenForGameAnswer, answerGame,
  currentCheatDots, startAudioMemoryGame, addAudioMemoryStep, playAudioMemorySequence,
  answerAudioMemory, initAudioMemoryUI, endGame,
  startAITutorSpeech, speakAITutorResponse, gradeSubmissionWithAI,
  toggleTeacherQuizType, handleTeacherAddBook, handleTeacherAddQuiz,
  renderTeacherDashboard, renderGradeDistribution, renderStudentPerformanceTable,
  generateTeacherReport, renderTeacherSubmissions,
  addNotification, updateNotifBadge, showNotificationsPanel,
  renderStudentStats, renderStudentDashboard, renderParentDashboard,
  handleAdminCreateStudent, renderAdminDashboard,
  saveBookToFirebase, saveQuizToFirebase, saveSubmissionToFirebase, saveStudentToFirebase,
  updateProxyStatus, bindAllEvents, saveLocalData, loadLocalData,
  SERVER_BASE, serverAvailable,
  checkServerHealth, checkServerSession, serverLoginFirebase, serverRegisterFirebase,
  serverLogout, serverFetch, serverSave, initServerBackend,
  play3DTone, playSuccess3D, playFail3D, playTick3D, initAudioCoPilot,
  safeInit, runInit, dismissSplashScreen,
  INIT_RAN,
  mediaRecorder, audioChunks, isRecording, perkinsKeyupTimer, perkinsKeyupHandler,
  questionBank, audioMemorySequence, audioMemoryStep, audioMemoryPatterns
};

