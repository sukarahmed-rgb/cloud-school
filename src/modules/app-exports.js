// @ts-check
export {
  updateBraillePreview,
  toggleDot,
  clearDots,
  commitBrailleChar,
  arabicBrailleMap,
} from './braille.js';
export {
  ERROR_LEVELS,
  listeners,
  secureRandomInt,
  notifyListeners,
  handleError,
  setupGlobalErrorHandler,
} from './error-handler.js';
export { speakToUser } from './audio-core.js';
export {
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
} from './i18n.js';
export {
  app as fbApp,
  db as fbDb,
  auth as fbAuth,
  userId as fbUserId,
  isAuthReady as fbIsAuthReady,
  snapshotUnsubscribers as fbSnapshotUnsubscribers,
  initFirebase,
} from './firebase-client.js';
export {
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
} from './gemini-client.js';
export { base64ToArrayBuffer, pcmToWav, blobToBase64 } from './helpers.js';
export { escapeHtml } from './helpers.js';
export {
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
} from './speech.js';
export {
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
} from './accessibility.js';
export { activeRole, switchRole } from './role-switcher.js';
export {
  _obfuscate,
  _deobfuscate,
  getGeminiKey,
  checkProxyHealth,
  updateProxyStatus,
} from './proxy.js';
export { addNotification, updateNotifBadge } from './notifications.js';

export {
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
} from './server-backend.js';
export {
  checkAgeLimitations,
  handleLoginSubmit,
  enterApp,
  handleRegistrationSubmit,
  logout,
  configureAuth,
} from './auth.js';
export {
  configureStudentDashboard,
  renderStudentStats,
  renderStudentDashboard,
} from './dashboards/student-dashboard.js';

export {
  callGeminiAPI,
  summarizeCurriculumBookWithAI,
  translateAndEvaluateBrailleWithAI,
} from './ai-utils.js';
export { openStudentSection, closeStudentSection, setupKeyboardShortcuts } from './router.js';
export {
  selectedQuizId,
  selectedOption,
  quizTimerInterval,
  renderStudentAssignments,
  startQuiz,
  selectQuizOption,
  submitQuizAnswer,
  clearQuizTimer,
} from './quizzes.js';
export {
  currentlyPlayingBookId,
  activeAudioElement,
  renderStudentBooks,
  readBookAloud,
  playBookAudio,
  readActiveBookWithAi,
  controlAudiobook,
} from './books.js';
export {
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
} from './teacher-management.js';
export { play3DTone, playSuccess3D, playFail3D, playTick3D } from './spatial-audio.js';
export {
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
} from './ui-core.js';
export {
  safeInit,
  dismissSplashScreen,
  clearAllTimers,
  isInitRan,
  markInitRan,
} from './app-init.js';
export {
  STORAGE_KEYS,
  localData,
  currentUserSession,
  initialAuthToken,
  setCurrentUserSession,
  getCurrentUserSession,
} from './app-state.js';
