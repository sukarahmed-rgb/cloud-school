// @ts-check
/**
 * @jest-environment jsdom
 */
import { bindAllEvents } from '../../src/modules/event-bindings.js';

beforeEach(() => {
  jest.useFakeTimers();
  Element.prototype.scrollIntoView = jest.fn();
  // Mock indexedDB for offline-sync
  global.indexedDB = {
    open: jest.fn(() => {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => req.onerror?.({ target: { error: new Error('mock') } }), 0);
      return req;
    }),
  };
  // Mock fetch for proxy health check
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ status: 'ok' }) }));

  document.body.innerHTML = `
    <button id="tts-engine-toggle"></button>
    <button id="audio-co-pilot-toggle"></button>
    <button data-theme="dark-hc"></button>
    <button data-theme="light-hc"></button>
    <button id="lang-toggle"></button>
    <button data-size-dir="1"></button>
    <button data-size-dir="-1"></button>
    <button id="btn-help-shortcuts"></button>
    <button id="btn-notifications"></button>
    <button data-action="logout"></button>
    <form data-action="login-form"><input /><button>دخول</button></form>
    <input id="login-username" />
    <input id="login-password" />
    <button id="btn-show-register"></button>
    <button id="btn-show-login"></button>
    <select id="reg-role"><option value="student">طالب</option></select>
    <input id="reg-age" />
    <input id="reg-name" />
    <input id="reg-contact" />
    <input id="reg-password-new" />
    <form data-action="auth-form"><input /><button>تسجيل</button></form>
    <button data-role-switch="student"></button>
    <button data-role-switch="teacher"></button>
    <span id="proxy-status-icon"></span>
    <span id="proxy-status"></span>
    <div id="view-student" class="hidden"><h2 id="student-welcome-msg"></h2></div>
    <div id="view-teacher" class="hidden"></div>
    <div id="view-parent" class="hidden"></div>
    <div id="view-admin" class="hidden"></div>
    <button id="role-btn-student"></button>
    <button id="role-btn-teacher"></button>
    <button id="role-btn-parent"></button>
    <button id="role-btn-admin"></button>
    <div id="student-section-container" class="hidden">
      <h2 id="student-section-title"></h2>
      <div id="student-sub-books" class="hidden"></div>
      <div id="student-sub-assignments" class="hidden"></div>
      <div id="student-sub-image-describer" class="hidden"></div>
      <div id="student-sub-games" class="hidden"></div>
      <div id="student-sub-ai-tutor" class="hidden"></div>
      <div id="student-sub-dialogic-classroom" class="hidden"></div>
      <div id="student-sub-study-group" class="hidden"></div>
      <div id="student-sub-dashboard" class="hidden"></div>
    </div>
    <div id="main-content"></div>
    <button data-student-section="books"></button>
    <button data-action="close-section"></button>
    <button data-action="audiobook-tts"></button>
    <button data-action="summarize-book"></button>
    <button data-action="audiobook-stop"></button>
    <button id="btn-opt-A"></button>
    <button id="btn-opt-B"></button>
    <button id="btn-opt-C"></button>
    <button id="btn-opt-D"></button>
    <button data-action="submit-quiz"></button>
    <button id="btn-mic-input"></button>
    <button id="btn-ai-mic"></button>
    <button data-action="toggle-screen-braille"></button>
    <button data-action="toggle-perkins"></button>
    <button data-action="braille-evaluate"></button>
    <button id="btn-screen-reader-mode"></button>
    <input id="proxy-url-input" />
    <button id="btn-save-proxy-url"></button>
    <button id="btn-reset-proxy-url"></button>
    <button id="dot-1"></button><button id="dot-2"></button><button id="dot-3"></button>
    <button id="dot-4"></button><button id="dot-5"></button><button id="dot-6"></button>
    <button data-action="enter-braille"></button>
    <button data-action="clear-braille"></button>
    <button data-action="add-space"></button>
    <button data-action="delete-char"></button>
    <button id="cheat-dot-1"></button><button id="cheat-dot-2"></button><button id="cheat-dot-3"></button>
    <button id="cheat-dot-4"></button><button id="cheat-dot-5"></button><button id="cheat-dot-6"></button>
    <button data-action="pronounce-cheat"></button>
    <button data-action="clear-cheat"></button>
    <button data-game-type="math"></button>
    <button data-action="answer-true"></button>
    <button data-action="answer-false"></button>
    <button data-action="ai-tutor-speech"></button>
    <button data-action="ask-ai"></button>
    <button data-action="speak-ai-response"></button>
    <select id="teacher-quiz-type"><option value="mcq">اختياري</option></select>
    <input id="teacher-quiz-title" />
    <input id="teacher-quiz-q" />
    <input id="teacher-quiz-oa" />
    <input id="teacher-quiz-ob" />
    <input id="teacher-quiz-oc" />
    <input id="teacher-quiz-od" />
    <input id="teacher-quiz-correct" />
    <button data-action="generate-ai-quiz"></button>
    <form data-action="teacher-book-form"><input /><button>إضافة</button></form>
    <input id="teacher-book-title" />
    <input id="teacher-book-content" />
    <input id="teacher-book-audio" />
    <form data-action="teacher-quiz-form"><input /><button>إضافة</button></form>
    <form data-action="admin-student-form"><input /><button>إضافة</button></form>
    <input id="vision-image-input" type="file" />
    <button data-action="analyze-image"></button>
    <button data-action="speak-vision"></button>
    <div id="auth-warning-box" class="hidden"></div>
    <div id="auth-warning-text"></div>
    <div id="login-form-container"></div>
    <div id="register-form-container" class="hidden"></div>
    <div id="dev-role-bar" class="hidden"></div>
  `;

  window.__ = (key) => {
    const msgs = {
      registerFormOpen: 'نموذج التسجيل',
      backToLogin: 'العودة لتسجيل الدخول',
      proxyUrlSaved: 'تم الحفظ',
      proxyUrlReset: 'تم الإعادة',
    };
    return msgs[key] || key;
  };
  window.speak = jest.fn();
  window.announceToScreenReader = jest.fn();
  window.screenReaderMode = false;
  window.localData = { books: [], assignments: [], submissions: [] };
  window.saveLocalData = jest.fn();
  window.addNotification = jest.fn();
  window.serverSave = jest.fn(() => Promise.reject(new Error('offline')));
  window.currentUserSession = { name: 'test', contact: 'test@test.com' };
  window.escapeHtml = (s) => String(s);
  // Dashboard/role-switcher globals
  window.renderStudentStats = jest.fn();
  window.renderTeacherDashboard = jest.fn();
  window.renderTeacherSubmissions = jest.fn();
  window.renderParentDashboard = jest.fn();
  window.renderAdminDashboard = jest.fn();
  window.renderStudentBooks = jest.fn();
  window.renderStudentDashboard = jest.fn();
  window.setupAccessibleVoices = jest.fn();
  window.getArabicRoleName = jest.fn(() => 'طالب');
  window.showToast = jest.fn();
  window.syncDataFromServer = jest.fn();
  window.controlAudiobook = jest.fn();
  window.toggleAudioRecording = jest.fn();
  window.escapeHtml = (s) => String(s);
  localStorage.setItem('cloudSchoolProxyUrl', 'http://localhost:3001');

  const deps = {
    summarizeCurriculumBookWithAI: jest.fn(),
    translateAndEvaluateBrailleWithAI: jest.fn(),
    handleAdminCreateStudent: jest.fn(),
  };

  bindAllEvents(deps);
});

describe('event-bindings.js - bindAllEvents', () => {
  test('binds click events without throwing', () => {
    expect(() => {
      document.getElementById('tts-engine-toggle').click();
      document.getElementById('lang-toggle').click();
      document.getElementById('btn-help-shortcuts').click();
      document.querySelector('[data-action="logout"]').click();
      document.querySelector('[data-role-switch="student"]').click();
      document.querySelector('[data-student-section="books"]').click();
      document.getElementById('btn-opt-A').click();
      document.querySelector('[data-action="submit-quiz"]').click();
    }).not.toThrow();
  });

  test('registers form submit handlers', () => {
    expect(() => {
      document.querySelector('[data-action="login-form"]').dispatchEvent(new Event('submit'));
      document.querySelector('[data-action="auth-form"]').dispatchEvent(new Event('submit'));
      document
        .querySelector('[data-action="teacher-book-form"]')
        .dispatchEvent(new Event('submit'));
      document
        .querySelector('[data-action="teacher-quiz-form"]')
        .dispatchEvent(new Event('submit'));
    }).not.toThrow();
  });

  test('proxy URL input is populated', () => {
    expect(document.getElementById('proxy-url-input').value).toBe('http://localhost:3001');
  });

  test('save proxy URL button works', () => {
    localStorage.removeItem('cloudSchoolProxyUrl');
    document.getElementById('btn-save-proxy-url').click();
    expect(localStorage.getItem('cloudSchoolProxyUrl')).toBe('http://localhost:3001');
  });

  afterEach(() => {
    delete global.indexedDB;
  });
});
