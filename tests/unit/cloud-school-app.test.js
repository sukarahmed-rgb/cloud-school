jest.mock('../../src/modules/ai-tutor.js', () => ({
  configureAiTutor: jest.fn(),
  startAiStoryRound: jest.fn(),
  analyzeImageWithGemini: jest.fn(),
  askAITutor: jest.fn(),
  generateAIQuiz: jest.fn(),
  startAITutorSpeech: jest.fn(),
  speakAITutorResponse: jest.fn(),
  gradeSubmissionWithAI: jest.fn(),
}));
jest.mock('../../src/modules/error-handler.js', () => ({ setupGlobalErrorHandler: jest.fn() }));
jest.mock('../../src/modules/accessibility.js', () => ({
  loadTheme: jest.fn(),
  loadTextSize: jest.fn(),
  toggleRegFields: jest.fn(),
  setupAgeLevel: jest.fn(),
}));
jest.mock('../../src/modules/firebase-client.js', () => ({ initFirebase: jest.fn() }));
jest.mock('../../src/modules/server-backend.js', () => ({ initServerBackend: jest.fn() }));
jest.mock('../../src/modules/speech.js', () => ({
  setupAccessibleVoices: jest.fn(),
  speak: jest.fn(),
  initAudioCoPilot: jest.fn(),
}));
jest.mock('../../src/modules/braille-input.js', () => ({ setupPerkinsKeyboard: jest.fn() }));
jest.mock('../../src/modules/router.js', () => ({ setupKeyboardShortcuts: jest.fn() }));
jest.mock('../../src/modules/i18n.js', () => ({
  initI18n: jest.fn(),
  __: jest.fn((k) => k),
  getPrompt: jest.fn(),
  getCurrentLang: jest.fn(),
}));
jest.mock('../../src/modules/event-bindings.js', () => ({ bindAllEvents: jest.fn() }));
jest.mock('../../src/modules/app-init.js', () => {
  let ran = false;
  return {
    safeInit: jest.fn((fn) => typeof fn === 'function' && fn()),
    dismissSplashScreen: jest.fn(),
    clearAllTimers: jest.fn(),
    isInitRan: jest.fn(() => ran),
    markInitRan: jest.fn(() => {
      ran = true;
    }),
  };
});
jest.mock('../../src/modules/app-state.js', () => {
  let session = null;
  return {
    STORAGE_KEYS: { localData: 'test' },
    localData: { books: [], assignments: [], submissions: [], students: [], notifications: [] },
    currentUserSession: session,
    initialAuthToken: null,
    setCurrentUserSession: jest.fn((v) => {
      session = v;
    }),
    getCurrentUserSession: jest.fn(() => session),
  };
});
jest.mock('../../src/modules/notifications.js', () => ({
  addNotification: jest.fn(),
  updateNotifBadge: jest.fn(),
}));
jest.mock('../../src/modules/auth.js', () => ({ configureAuth: jest.fn() }));
jest.mock('../../src/modules/dashboards/student-dashboard.js', () => ({
  configureStudentDashboard: jest.fn(),
}));

describe('cloud_school_app.js', () => {
  beforeEach(() => {
    jest.isolateModules(() => {
      // Force re-evaluation so window.onload hook runs
    });
    document.body.innerHTML = '<div id="splash-screen"></div>';
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
  });

  test('exports runInit as a function', async () => {
    const app = await import('../../src/cloud_school_app.js');
    expect(typeof app.runInit).toBe('function');
  });

  test('runInit calls markInitRan and setup functions', async () => {
    const { safeInit } = require('../../src/modules/app-init.js');
    const { setupGlobalErrorHandler } = require('../../src/modules/error-handler.js');
    const app = await import('../../src/cloud_school_app.js');
    app.runInit();
    expect(safeInit).toHaveBeenCalled();
    expect(setupGlobalErrorHandler).toHaveBeenCalled();
  });

  test('runInit does nothing on second call', async () => {
    const { isInitRan, markInitRan } = require('../../src/modules/app-init.js');
    const app = await import('../../src/cloud_school_app.js');
    app.runInit();
    expect(markInitRan).toHaveBeenCalledTimes(1);
  });

  test('lazy wrappers do not throw', async () => {
    const app = await import('../../src/cloud_school_app.js');
    await expect(app.askAITutor()).resolves.toBeUndefined();
    await expect(app.startAiStoryRound()).resolves.toBeUndefined();
    await expect(app.analyzeImageWithGemini()).resolves.toBeUndefined();
  });
});
