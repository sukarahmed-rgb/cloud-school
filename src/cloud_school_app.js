// @ts-check
import { speakToUser } from './modules/audio-core.js';
import {
  ERROR_LEVELS,
  listeners,
  secureRandomInt,
  notifyListeners,
  handleError,
  setupGlobalErrorHandler,
} from './modules/error-handler.js';
import { escapeHtml, base64ToArrayBuffer, pcmToWav, blobToBase64 } from './modules/helpers.js';
import {
  configureAuth,
  checkAgeLimitations,
  handleLoginSubmit,
  enterApp,
  handleRegistrationSubmit,
  logout,
} from './modules/auth.js';
import { queueOfflineSave } from './modules/offline-sync.js';
import { getStudentStats, recordGameScore } from './modules/analytics.js';
import {
  configureStudentDashboard,
  renderStudentStats,
  renderStudentDashboard,
} from './modules/dashboards/student-dashboard.js';
import {
  arabicBrailleMap,
  updateBraillePreview,
  toggleDot,
  clearDots,
  commitBrailleChar,
} from './modules/braille.js';
import {
  _toastTimer,
  sharedAudioContext,
  getAudioContext,
  showToast,
  showLoading,
  trapFocus,
  focusElement,
  announceToScreenReader,
  shortcutRow,
  showKeyboardHelp,
  showNotificationsPanel,
  saveLocalData,
  loadLocalData,
} from './modules/ui-core.js';
import {
  openStudentSection,
  closeStudentSection,
  setupKeyboardShortcuts,
} from './modules/router.js';
import {
  i18n,
  currentLang,
  getCurrentLang,
  setCurrentLang,
  __,
  getPrompt,
  applyTranslations,
  applyJsTranslations,
  initTtsLang,
  loadLocale,
  initI18n,
} from './modules/i18n.js';
import {
  app as fbApp,
  db as fbDb,
  auth as fbAuth,
  userId as fbUserId,
  isAuthReady as fbIsAuthReady,
  snapshotUnsubscribers as fbSnapshotUnsubscribers,
  initFirebase,
} from './modules/firebase-client.js';
import {
  getProxyBase,
  proxyFetch,
  buildTextPayload,
  buildMediaPayload,
  extractText,
  extractAudio,
  callGemini,
  callGeminiWithMedia,
  speakWithGeminiTTS,
  transcribeAudio,
  describeImage,
} from './modules/gemini-client.js';
import { play3DTone, playSuccess3D, playFail3D, playTick3D } from './modules/spatial-audio.js';
import {
  audioCoPilotEnabled,
  accessibleVoicesController,
  speak,
  stopAllAudio,
  ttsEngineMode,
  toggleTtsEngine,
  screenReaderMode,
  toggleScreenReaderMode,
  toggleAudioCoPilot,
  setupAccessibleVoices,
  initAudioCoPilot,
} from './modules/speech.js';
import {
  currentAgeLevel,
  setupAgeLevel,
  toggleAgeLevel,
  updateAgeLevelButton,
  getAgeTone,
  toggleRegFields,
  adjustTextSize,
  loadTextSize,
  setTheme,
  loadTheme,
  cycleTheme,
} from './modules/accessibility.js';
import {
  _obfuscate,
  _deobfuscate,
  getGeminiKey,
  checkProxyHealth,
  updateProxyStatus,
} from './modules/proxy.js';
import { addNotification, updateNotifBadge } from './modules/notifications.js';
import { toggleAudioRecording } from './modules/recording.js';
import {
  serverAvailable,
  checkServerHealth,
  checkServerSession,
  serverLoginFirebase,
  serverRegisterFirebase,
  serverLogout,
  serverFetch,
  serverSave,
  initServerBackend,
  syncDataFromServer,
  getArabicRoleName,
} from './modules/server-backend.js';
import { activeRole, switchRole } from './modules/role-switcher.js';
import {
  selectedQuizId,
  selectedOption,
  quizTimerInterval,
  renderStudentAssignments,
  startQuiz,
  selectQuizOption,
  submitQuizAnswer,
  clearQuizTimer,
} from './modules/quizzes.js';
import {
  currentlyPlayingBookId,
  activeAudioElement,
  renderStudentBooks,
  readBookAloud,
  playBookAudio,
  readActiveBookWithAi,
  controlAudiobook,
} from './modules/books.js';
import { bindAllEvents as bindAllEventsModule } from './modules/event-bindings.js';
import {
  callGeminiAPI,
  summarizeCurriculumBookWithAI,
  translateAndEvaluateBrailleWithAI,
} from './modules/ai-utils.js';
import {
  safeInit,
  dismissSplashScreen,
  clearAllTimers,
  isInitRan,
  markInitRan,
} from './modules/app-init.js';
import {
  STORAGE_KEYS,
  localData,
  currentUserSession,
  initialAuthToken,
  setCurrentUserSession,
  getCurrentUserSession,
} from './modules/app-state.js';
import {
  toggleTeacherQuizType,
  handleTeacherAddBook,
  handleTeacherAddQuiz,
  renderTeacherDashboard,
  renderTeacherSubmissions,
  setServerAvailable,
  saveBookToFirebase,
  saveQuizToFirebase,
  saveSubmissionToFirebase,
  saveStudentToFirebase,
} from './modules/teacher-management.js';
import {
  renderGradeDistribution,
  renderStudentPerformanceTable,
  generateTeacherReport,
  renderParentDashboard,
  handleAdminCreateStudent,
  renderAdminDashboard,
} from './modules/app-dashboards.js';

// Firebase userId exposed on window for legacy inline script access
Object.defineProperty(window, 'userId', {
  get() {
    return fbUserId;
  },
  set(val) {
    /* read-only from module */
  },
});

// ==================== Lazy-loading wrappers for heavy modules ====================
/** @type {((config: Object) => void)|null} */
let _configureAiTutor = null;
async function lazyAiTutor() {
  if (!_configureAiTutor) {
    const m = await import('./modules/ai-tutor.js');
    _configureAiTutor = m.configureAiTutor;
  }
  return _configureAiTutor;
}
async function configureAiTutor(config) {
  const fn = await lazyAiTutor();
  fn(config);
}
export async function startAiStoryRound() {
  const m = await import('./modules/ai-tutor.js');
  return m.startAiStoryRound.apply(this, arguments);
}
export async function analyzeImageWithGemini() {
  const m = await import('./modules/ai-tutor.js');
  return m.analyzeImageWithGemini.apply(this, arguments);
}
export async function askAITutor() {
  const m = await import('./modules/ai-tutor.js');
  return m.askAITutor.apply(this, arguments);
}
export async function generateAIQuiz() {
  const m = await import('./modules/ai-tutor.js');
  return m.generateAIQuiz.apply(this, arguments);
}
export async function startAITutorSpeech() {
  const m = await import('./modules/ai-tutor.js');
  return m.startAITutorSpeech.apply(this, arguments);
}
export async function speakAITutorResponse() {
  const m = await import('./modules/ai-tutor.js');
  return m.speakAITutorResponse.apply(this, arguments);
}
export async function gradeSubmissionWithAI() {
  const m = await import('./modules/ai-tutor.js');
  return m.gradeSubmissionWithAI.apply(this, arguments);
}

/** @type {(() => Function)|null} */
let _setupPerkinsKeyboard = null;
async function lazyBrailleInput() {
  if (!_setupPerkinsKeyboard) {
    const m = await import('./modules/braille-input.js');
    _setupPerkinsKeyboard = m.setupPerkinsKeyboard;
  }
  return _setupPerkinsKeyboard;
}
async function setupPerkinsKeyboard() {
  const fn = await lazyBrailleInput();
  fn();
}

// ==================== ط±ط¨ط· ط§ظ„ط£ط­ط¯ط§ط« ط¹ط¨ط± addEventListener ====================

/** @returns {void} */
function bindAllEvents() {
  bindAllEventsModule({
    summarizeCurriculumBookWithAI: () => summarizeCurriculumBookWithAI({ books: localData.books }),
    translateAndEvaluateBrailleWithAI,
    handleAdminCreateStudent,
  });
}

// ==================== طھظ‡ظٹط¦ط© ط§ظ„طھط·ط¨ظٹظ‚ ====================

/** @returns {void} */
function runInit() {
  if (isInitRan()) {
    return;
  }
  markInitRan();

  configureAiTutor({
    speak,
    __,
    getCurrentLang,
    getPrompt,
    describeImage,
    handleError,
    getAgeTone,
    localData,
    saveLocalData,
    renderTeacherSubmissions,
    playSuccess3D,
    setupAccessibleVoices,
    showLoading,
    getUploadedImageBase64: () => window._visionBase64,
    getUploadedImageMime: () => window._visionMime,
    getSpeechRecognizer: () => window.speechRecognizer,
  });

  configureStudentDashboard({
    getLocalData: () => localData,
    getCurrentUserSession: () => currentUserSession,
    __: __,
    escapeHtml: escapeHtml,
  });

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
    getCurrentUserSession,
    setCurrentUserSession,
    getUserId: () => fbUserId,
    setUserId: () => {},
    getIsAuthReady: () => fbIsAuthReady,
    setIsAuthReady: () => {},
  });

  // طƒظ„ ط¯ط§ظ„ط© ط¨ظ†ط§ط¯ظٹظ‡ط§ ط¹ظ† ط·ط±ظٹظ‚ ط§ظ„ط§ط³ظ… ط¹ط´ط§ظ† ظ†طھط£ظƒط¯ ط¥ظ†ظ‡ط§ ظ…ظˆط¬ظˆط¯ط©
  const steps = [
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
    ['bindAllEvents', __('initStepButtons')],
  ];

  const appFunctions = {
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
    bindAllEvents,
  };

  for (let i = 0; i < steps.length; i++) {
    const fnName = steps[i][0];
    const label = steps[i][1];
    const fn = appFunctions[fnName];
    if (typeof fn === 'function') {
      safeInit(fn, label);
    } else {
      console.warn(`[CS] Skipping ${label}: ${fnName} not found`);
    }
  }

  // طھط­ط¯ظٹط« ط´ط§ط±ط© ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ
  updateNotifBadge();

  setupOfflineDetection();

  // طھط­ط³ظٹظ† ط¥ظ…ظƒط§ظ†ظٹط© ط§ظ„ظˆطµظˆظ„ â€” ط¥ط¯ط§ط±ط© ط§ظ„طھط±ظƒظٹط²
  document.addEventListener('section-opened', function (e) {
    const sectionTitle = document.getElementById('student-section-title');
    if (sectionTitle) {
      setTimeout(function () {
        sectionTitle.focus();
      }, 100);
    }
  });

  try {
    speak(__('welcomeMessage'));
  } catch (e) {
    console.error('Speak error:', e);
  }

  // ط¥ط®ظپط§ط، ط´ط§ط´ط© ط§ظ„طھط±ط­ظٹط¨
  dismissSplashScreen();
}

function setupOfflineDetection() {
  const banner = document.getElementById('offline-banner');
  const textEl = document.getElementById('offline-text');
  if (!banner) {
    return;
  }

  function updateOnlineStatus() {
    if (navigator.onLine) {
      banner.classList.add('hidden');
    } else {
      banner.classList.remove('hidden');
      if (textEl) {
        textEl.textContent = __('offlineStatus');
      }
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

function buildReportHTML(name, stats) {
  const rows = stats.recentActivity
    .map(
      (a) =>
        `<tr><td class="p-2 border">${a.type === 'quiz' ? '📝' : '🎮'}</td><td class="p-2 border">${escapeHtml(a.title)}</td><td class="p-2 border text-center">${a.score}%</td><td class="p-2 border">${a.date ? a.date.slice(0, 10) : ''}</td></tr>`,
    )
    .join('');

  const gradeDist = stats.gradeDistribution || [0, 0, 0, 0];
  const barStyle = 'height:20px;border-radius:4px;margin:2px 0';
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];
  const gradeLabels = [__('gradePoor'), __('gradePass'), __('gradeGood'), __('gradeExcellent')];
  const maxVal = Math.max(...gradeDist, 1);
  const bars = gradeDist
    .map(
      (v, i) =>
        `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
          <span style="width:80px;font-size:14px">${gradeLabels[i]}</span>
          <div style="${barStyle};width:${(v / maxVal) * 200}px;background:${colors[i]}"></div>
          <span style="font-size:13px">${v}</span>
        </div>`,
    )
    .join('');

  return `
    <h1>${__('reportTitle')}</h1>
    <p>${__('reportGenerated')}: ${new Date().toLocaleDateString('ar-SA')}</p>
    <p><strong>${escapeHtml(name)}</strong></p>
    <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin:16px 0">
      <div class="report-stat"><div class="report-stat-value">${stats.quizCount}</div><div>${__('reportQuizSummary')}</div></div>
      <div class="report-stat"><div class="report-stat-value">${stats.quizAvg !== null ? `${stats.quizAvg}%` : '--'}</div><div>${__('dashboardAverage')}</div></div>
      <div class="report-stat"><div class="report-stat-value">${stats.gameCount}</div><div>${__('reportGameSummary')}</div></div>
    </div>
    <h2>${__('dashboardQuizzesSolved')}</h2>
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead><tr style="background:#1e3a5f;color:white">
        <th style="padding:8px;border:1px solid #ccc;text-align:center">${__('reportQuizSummary')}</th>
        <th style="padding:8px;border:1px solid #ccc;text-align:center">${__('defaultQuizTitle')}</th>
        <th style="padding:8px;border:1px solid #ccc;text-align:center">${__('reportScore')}</th>
        <th style="padding:8px;border:1px solid #ccc;text-align:center">${__('reportDate')}</th>
      </tr></thead><tbody>
        ${rows || `<tr><td colspan="4" style="text-align:center;padding:16px">${__('reportNoQuizData')}</td></tr>`}
      </tbody></table>
    <h2 style="margin-top:16px">${__('dashboardGradeDistribution')}</h2>
    ${bars}`;
}

function showReportOnPlatform() {
  const localData = /** @type {LocalData} */ (window.localData) || {};
  const session = /** @type {UserSession|undefined} */ (window.currentUserSession);
  const name = session?.name || __('defaultStudentName');
  const stats = getStudentStats(name, localData);
  const content = buildReportHTML(name, stats);

  const overlay = document.createElement('div');
  overlay.id = 'report-overlay';
  overlay.className =
    'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="card p-6 rounded-3xl max-w-2xl border-4 border-blue-400 bg-slate-900 text-white w-full max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div style="text-align:left;margin-bottom:8px">
        <button id="btn-close-report-overlay" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition btn-interactive">${__('reportClose')}</button>
        <button id="btn-print-report-overlay" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition btn-interactive" style="margin-left:8px">🖨️ ${__('reportPdf')}</button>
      </div>
      <div id="report-content" style="direction:rtl;text-align:right">${content}</div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('btn-close-report-overlay').addEventListener('click', function () {
    overlay.remove();
  });
  document.getElementById('btn-print-report-overlay').addEventListener('click', function () {
    exportReportAsPdf();
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

function exportReportAsPdf() {
  const localData = /** @type {LocalData} */ (window.localData) || {};
  const session = /** @type {UserSession|undefined} */ (window.currentUserSession);
  const name = session?.name || __('defaultStudentName');
  const stats = getStudentStats(name, localData);
  const bodyContent = buildReportHTML(name, stats);

  const printWin = window.open('', '_blank', 'width=800,height=600');
  if (!printWin) {
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${__('reportTitle')}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 2rem; direction:rtl; text-align:right; }
      .report-stat { display:inline-block; margin:8px; padding:16px; background:#f3f4f6; border-radius:8px; text-align:center; }
      .report-stat-value { font-size:2rem; font-weight:bold; color:#1a56db; }
      @media print { body { padding:0; } }
    </style></head><body>${bodyContent}
    <scr${''}ipt>window.onload = function() { window.print(); window.close(); }</scr${''}ipt>
    </body></html>
  `);
  printWin.document.close();
}

function printStudentReport() {
  const overlay = document.createElement('div');
  overlay.id = 'report-choice-overlay';
  overlay.className =
    'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="card p-8 rounded-3xl max-w-md border-4 border-yellow-400 bg-slate-900 text-white w-full" role="dialog" aria-modal="true" aria-labelledby="report-choice-title">
      <h2 id="report-choice-title" class="text-2xl font-bold mb-6 text-center">${__('reportChooseOption')}</h2>
      <div class="flex flex-col gap-4">
        <button id="report-choice-pdf" class="flex items-center gap-4 p-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-lg font-bold transition btn-interactive">
          <span style="font-size:2rem">📄</span>
          <div style="text-align:right">
            <div>${__('reportPdf')}</div>
            <div style="font-size:14px;font-weight:normal;opacity:0.8">${__('reportPdfDesc')}</div>
          </div>
        </button>
        <button id="report-choice-platform" class="flex items-center gap-4 p-4 rounded-xl bg-green-700 hover:bg-green-600 text-white text-lg font-bold transition btn-interactive">
          <span style="font-size:2rem">🖥️</span>
          <div style="text-align:right">
            <div>${__('reportOnPlatform')}</div>
            <div style="font-size:14px;font-weight:normal;opacity:0.8">${__('reportOnPlatformDesc')}</div>
          </div>
        </button>
      </div>
      <div class="text-center mt-6">
        <button id="btn-close-report-choice" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition btn-interactive">${__('close')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('report-choice-pdf').addEventListener('click', function () {
    overlay.remove();
    exportReportAsPdf();
  });
  document.getElementById('report-choice-platform').addEventListener('click', function () {
    overlay.remove();
    showReportOnPlatform();
  });
  document.getElementById('btn-close-report-choice').addEventListener('click', function () {
    overlay.remove();
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

// Boot: run on load
window.onload = function () {
  runInit();
};
if (document.readyState === 'complete') {
  setTimeout(runInit, 0);
}

// Locally-defined exports (stubs, wrappers, and main functions)
export {
  toggleAudioRecording,
  renderGradeDistribution,
  renderStudentPerformanceTable,
  generateTeacherReport,
  renderParentDashboard,
  handleAdminCreateStudent,
  renderAdminDashboard,
  bindAllEvents,
  runInit,
  printStudentReport,
  setupOfflineDetection,
  recordGameScore,
};

// Re-export all module APIs
export * from './modules/app-exports.js';
