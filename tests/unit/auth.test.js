// @ts-check
/**
 * @jest-environment jsdom
 */
import { configureAuth, checkAgeLimitations, enterApp, logout } from '../../src/modules/auth.js';

beforeEach(() => {
  document.body.innerHTML = `
    <div id="auth-gate"></div>
    <div id="dev-role-bar" class="hidden"></div>
    <div id="active-user-badge"></div>
    <div id="login-form-container"></div>
    <div id="register-form-container"></div>
    <select id="reg-role"><option value="student">طالب</option><option value="teacher">معلم</option></select>
    <input id="reg-age" value="14" />
    <input id="reg-parent-contact" />
    <div id="auth-warning-box" class="hidden"></div>
    <span id="auth-warning-text"></span>
    <span id="label-parent-contact"></span>
    <button id="btn-auth-submit"></button>
    <input id="login-username" />
    <input id="login-password" />
    <button data-action="logout" class="hidden"></button>
  `;
  const mockCtx = {
    __: (key, ...args) => {
      const msgs = {
        ageUnder12: 'العمر أقل من 12 سنة',
        ageConfirm12: 'تم تأكيد العمر',
        parentContactLabel: 'جهة اتصال ولي الأمر',
        loginSuccess: 'مرحباً',
        userBadge: '{0} - {1}',
        logoutSuccess: 'تم تسجيل الخروج',
      };
      let msg = msgs[key] || key;
      args.forEach((a, i) => {
        msg = msg.replace(`{${i}}`, a);
      });
      return msg;
    },
    speak: jest.fn(),
    showToast: jest.fn(),
    setCurrentUserSession: jest.fn(),
    getCurrentUserSession: jest.fn(() => null),
    getArabicRoleName: (r) => r,
    switchRole: jest.fn(),
    setUserId: jest.fn(),
    setIsAuthReady: jest.fn(),
    clearAllTimers: jest.fn(),
    syncDataFromServer: jest.fn(),
    serverLoginFirebase: jest.fn(),
    serverLogout: jest.fn(),
    serverAvailable: false,
  };
  configureAuth(mockCtx);
  window.__ = mockCtx.__;
});

describe('auth.js - checkAgeLimitations', () => {
  test('does nothing when ctx is null', () => {
    configureAuth(null);
    expect(() => checkAgeLimitations()).not.toThrow();
  });

  test('does nothing for non-student role', () => {
    document.getElementById('reg-role').value = 'teacher';
    expect(() => checkAgeLimitations()).not.toThrow();
  });

  test('shows warning for age under 12', () => {
    document.getElementById('reg-age').value = '10';
    checkAgeLimitations();
    const warningBox = document.getElementById('auth-warning-box');
    expect(warningBox.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('btn-auth-submit').disabled).toBe(true);
  });

  test('accepts age 12 or above', () => {
    document.getElementById('reg-age').value = '14';
    checkAgeLimitations();
    expect(document.getElementById('btn-auth-submit').disabled).toBe(false);
    expect(document.getElementById('reg-parent-contact').required).toBe(true);
  });
});

describe('auth.js - enterApp', () => {
  test('does nothing when ctx is null', () => {
    configureAuth(null);
    expect(() => enterApp({ name: 'Test', role: 'student' })).not.toThrow();
  });

  test('hides auth gate and shows role bar', () => {
    enterApp({ name: 'Test', role: 'student', contact: 'test@test.com' });
    expect(document.getElementById('auth-gate').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('dev-role-bar').classList.contains('hidden')).toBe(false);
  });
});

describe('auth.js - logout', () => {
  test('does nothing when ctx is null', () => {
    configureAuth(null);
    expect(() => logout()).not.toThrow();
  });

  test('clears session and shows auth gate', () => {
    logout();
    expect(document.getElementById('auth-gate').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('dev-role-bar').classList.contains('hidden')).toBe(true);
  });
});
