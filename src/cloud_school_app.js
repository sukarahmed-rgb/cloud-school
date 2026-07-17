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
import {
  configureStudentDashboard,
  renderStudentStats,
  renderStudentDashboard,
} from './modules/dashboards/student-dashboard.js';
import {
  configureAiTutor,
  startAiStoryRound,
  analyzeImageWithGemini,
  askAITutor,
  generateAIQuiz,
  startAITutorSpeech,
  speakAITutorResponse,
  gradeSubmissionWithAI,
} from './modules/ai-tutor.js';
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
  state,
  questionBank,
  audioMemoryPatterns,
  pickQuestionByDifficulty,
  initGame,
  startNewGameRound,
  listenForGameAnswer,
  answerGame,
  endGame,
  startAudioMemoryGame,
  addAudioMemoryStep,
  playAudioMemorySequence,
  answerAudioMemory,
  initAudioMemoryUI,
  clearGameTimer,
  initMathChallenge,
  initListeningQuiz,
  initScienceLab,
  initGeographyExplorer,
} from './modules/audio-game.js';
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
import {
  mediaRecorder,
  audioChunks,
  isRecording,
  stopAudioTracks,
  toggleAudioRecording,
} from './modules/recording.js';
import {
  uploadedImageBase64,
  uploadedImageMime,
  previewVisionImage,
  speakVisionResponse,
} from './modules/vision.js';
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
  perkinsKeysPressed,
  perkinsKeyupTimer,
  currentBrailleDots,
  currentCheatDots,
  setupPerkinsKeyboard,
  processPerkinsChord,
  toggleBrailleDot,
  enterBrailleChar,
  clearBrailleDots,
  addSpaceToAnswer,
  deleteLastChar,
  toggleBrailleKeyboard,
  toggleCheatDot,
  pronounceCheatBraille,
  clearCheatDots,
} from './modules/braille-input.js';
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

// Firebase userId exposed on window for legacy inline script access
Object.defineProperty(window, 'userId', {
  get() {
    return fbUserId;
  },
  set(val) {
    /* read-only from module */
  },
});

// ==================== ظ„ظˆط­ط© ظ‚ظٹط§ط¯ط© ط§ظ„ظ…ط¹ظ„ظ… ====================
/** @returns {void} */
function renderGradeDistribution() {}
/** @returns {void} */
function renderStudentPerformanceTable() {}
/** @returns {void} */
function generateTeacherReport() {}

// ==================== ظ†ط¸ط§ظ… ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ ====================

// renderStudentStats, renderStudentDashboard refactored and moved to student-dashboard.js

/** @returns {void} */
function renderParentDashboard() {
  import('./modules/dashboards/parent-dashboard.js').then((m) => m.renderParentDashboard());
}

/** @param {Event} e */
function handleAdminCreateStudent(e) {
  import('./modules/dashboards/admin-dashboard.js').then((m) => m.handleAdminCreateStudent(e));
}

/** @returns {void} */
function renderAdminDashboard() {
  import('./modules/dashboards/admin-dashboard.js').then((m) => m.renderAdminDashboard());
}

// Save functions moved earlier to support offline sync.

// syncFromFirebase_cb was here â€” removed (dead code, never called)

// ==================== [ط¥طµظ„ط§ط­ #11] ط±ط¨ط· ط§ظ„ط£ط­ط¯ط§ط« ط¹ط¨ط± addEventListener ====================

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
    getUploadedImageBase64: () => uploadedImageBase64,
    getUploadedImageMime: () => uploadedImageMime,
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

// Boot: run on load
window.onload = function () {
  runInit();
};
if (document.readyState === 'complete') {
  setTimeout(runInit, 0);
}

// Locally-defined exports (stubs, wrappers, and main functions)
export {
  renderGradeDistribution,
  renderStudentPerformanceTable,
  generateTeacherReport,
  renderParentDashboard,
  handleAdminCreateStudent,
  renderAdminDashboard,
  bindAllEvents,
  runInit,
};

// Re-export all module APIs
export * from './modules/app-exports.js';
