// @ts-check
/**
 * @jest-environment jsdom
 */
import {
  configureAuth,
  checkAgeLimitations,
  handleLoginSubmit,
  enterApp,
  handleRegistrationSubmit,
  logout,
} from '../../src/modules/auth.js';

let mockCtx;
let mockAuth;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();

  Element.prototype.scrollIntoView = jest.fn();

  document.body.innerHTML = `
    <div id="auth-gate" class="hidden"></div>
    <div id="dev-role-bar" class="hidden"></div>
    <div id="active-user-badge"></div>
    <div id="auth-warning-box" class="hidden"></div>
    <span id="auth-warning-text"></span>
    <select id="reg-role"><option value="student">Student</option><option value="teacher">Teacher</option></select>
    <input id="reg-age" value="14" />
    <input id="reg-parent-contact" value="" />
    <span id="label-parent-contact"></span>
    <button id="btn-auth-submit"></button>
    <input id="login-username" value="" />
    <input id="login-password" value="" />
    <input id="reg-name" value="Test" />
    <input id="reg-contact" value="test@test.com" />
    <input id="reg-password-new" value="password123" />
    <div id="login-form-container"></div>
    <div id="register-form-container" class="hidden"></div>
    <button data-action="logout"></button>
  `;

  mockAuth = {
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
  };

  window.firebase = {
    auth: jest.fn(() => mockAuth),
  };

  mockCtx = {
    __: jest.fn((key, ...args) => args[0] || key),
    speak: jest.fn(),
    setCurrentUserSession: jest.fn(),
    setUserId: jest.fn(),
    setIsAuthReady: jest.fn(),
    serverAvailable: false,
    switchRole: jest.fn(),
    showToast: jest.fn(),
    syncDataFromServer: jest.fn(),
    clearAllTimers: jest.fn(),
    serverLoginFirebase: jest.fn(),
    serverRegisterFirebase: jest.fn(),
    serverLogout: jest.fn(),
    getCurrentUserSession: jest.fn(() => null),
    getArabicRoleName: jest.fn((r) => r),
  };

  configureAuth(mockCtx);

  window.__ = jest.fn((k, ...args) => args[0] || k);
  window.speak = jest.fn();
  window.escapeHtml = jest.fn((s) => (s === null || s === undefined ? '' : String(s)));
});

afterEach(() => {
  jest.useRealTimers();
});

function makeEvent() {
  return { preventDefault: jest.fn() };
}

// ─── configureAuth ───────────────────────────────────────────────────────────

describe('configureAuth', () => {
  test('sets ctx so exported functions can use it', () => {
    const custom = { __: jest.fn(() => ''), speak: jest.fn() };
    configureAuth(custom);
    document.getElementById('reg-role').value = 'student';
    document.getElementById('reg-age').value = '15';
    expect(() => checkAgeLimitations()).not.toThrow();
  });
});

// ─── checkAgeLimitations ─────────────────────────────────────────────────────

describe('checkAgeLimitations', () => {
  test('no ctx does nothing', () => {
    configureAuth(null);
    expect(() => checkAgeLimitations()).not.toThrow();
  });

  test('non-student role returns early', () => {
    document.getElementById('reg-role').value = 'teacher';
    checkAgeLimitations();
    expect(mockCtx.__).not.toHaveBeenCalled();
    expect(document.getElementById('btn-auth-submit').disabled).toBe(false);
  });

  test('age < 12 disables submit and shows warning', () => {
    document.getElementById('reg-age').value = '8';
    checkAgeLimitations();

    const warningBox = document.getElementById('auth-warning-box');
    expect(warningBox.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('auth-warning-text').textContent).toBeTruthy();
    expect(document.getElementById('btn-auth-submit').disabled).toBe(true);
    expect(document.getElementById('btn-auth-submit').classList.contains('opacity-50')).toBe(true);
    expect(
      document.getElementById('btn-auth-submit').classList.contains('cursor-not-allowed'),
    ).toBe(true);
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('age >= 12 enables submit and sets parent contact required', () => {
    document.getElementById('reg-age').value = '15';
    checkAgeLimitations();

    expect(document.getElementById('btn-auth-submit').disabled).toBe(false);
    expect(document.getElementById('btn-auth-submit').classList.contains('opacity-50')).toBe(false);
    expect(document.getElementById('reg-parent-contact').required).toBe(true);
    expect(document.getElementById('reg-parent-contact').getAttribute('required')).toBe('required');
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('NaN age returns early without showing warning or disabling button', () => {
    document.getElementById('reg-age').value = 'abc';
    checkAgeLimitations();

    const warningBox = document.getElementById('auth-warning-box');
    expect(warningBox.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('btn-auth-submit').disabled).toBe(false);
    expect(mockCtx.speak).not.toHaveBeenCalled();
  });
});

// ─── enterApp ────────────────────────────────────────────────────────────────

describe('enterApp', () => {
  test('no ctx does nothing', () => {
    configureAuth(null);
    const el = document.getElementById('auth-gate');
    expect(el.classList.contains('hidden')).toBe(true);
    enterApp({ name: 'Test', role: 'student' });
    expect(el.classList.contains('hidden')).toBe(true);
  });

  test('shows dev bar, hides auth gate, calls switchRole', () => {
    const session = { name: 'Alice', role: 'teacher', contact: 'a@b.com' };
    enterApp(session);

    expect(document.getElementById('auth-gate').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('dev-role-bar').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('[data-action="logout"]').classList.contains('hidden')).toBe(
      false,
    );
    expect(document.getElementById('active-user-badge').textContent).toBeTruthy();
    expect(mockCtx.switchRole).toHaveBeenCalledWith('teacher');
    expect(mockCtx.setCurrentUserSession).toHaveBeenCalledWith(session);
    expect(mockCtx.showToast).toHaveBeenCalled();
  });

  test('with serverAuth calls syncDataFromServer', () => {
    enterApp({ name: 'Bob', role: 'student', contact: 'b@b.com', serverAuth: true });
    expect(mockCtx.syncDataFromServer).toHaveBeenCalledTimes(1);
  });

  test('without serverAuth does not sync', () => {
    enterApp({ name: 'Bob', role: 'student', contact: 'b@b.com', serverAuth: false });
    expect(mockCtx.syncDataFromServer).not.toHaveBeenCalled();
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────

describe('logout', () => {
  test('no ctx does nothing', () => {
    configureAuth(null);
    expect(() => logout()).not.toThrow();
  });

  test('resets session, hides dev bar, shows login form', () => {
    logout();

    expect(mockCtx.setCurrentUserSession).toHaveBeenCalledWith(null);
    expect(mockCtx.setUserId).toHaveBeenCalledWith(null);
    expect(mockCtx.setIsAuthReady).toHaveBeenCalledWith(false);
    expect(mockCtx.clearAllTimers).toHaveBeenCalledTimes(1);
    expect(document.getElementById('auth-gate').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('dev-role-bar').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('[data-action="logout"]').classList.contains('hidden')).toBe(
      true,
    );
    expect(document.getElementById('login-form-container').classList.contains('hidden')).toBe(
      false,
    );
    expect(document.getElementById('register-form-container').classList.contains('hidden')).toBe(
      true,
    );
    expect(document.getElementById('login-username').value).toBe('');
    expect(document.getElementById('login-password').value).toBe('');
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('with serverAuth calls serverLogout', () => {
    mockCtx.getCurrentUserSession.mockReturnValue({ serverAuth: true });
    logout();
    expect(mockCtx.serverLogout).toHaveBeenCalledTimes(1);
  });

  test('without serverAuth does not call serverLogout', () => {
    mockCtx.getCurrentUserSession.mockReturnValue({ serverAuth: false });
    logout();
    expect(mockCtx.serverLogout).not.toHaveBeenCalled();
  });

  test('without session does not call serverLogout', () => {
    mockCtx.getCurrentUserSession.mockReturnValue(null);
    logout();
    expect(mockCtx.serverLogout).not.toHaveBeenCalled();
  });
});

// ─── handleLoginSubmit ───────────────────────────────────────────────────────

describe('handleLoginSubmit', () => {
  test('no ctx does nothing', async () => {
    configureAuth(null);
    const e = makeEvent();
    await expect(handleLoginSubmit(e)).resolves.toBeUndefined();
  });

  test('empty email/password shows warning', async () => {
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    const e = makeEvent();

    await handleLoginSubmit(e);

    expect(e.preventDefault).toHaveBeenCalled();
    const warningBox = document.getElementById('auth-warning-box');
    expect(warningBox.classList.contains('hidden')).toBe(false);
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('empty password only shows warning', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = '';
    const e = makeEvent();

    await handleLoginSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
  });

  test('firebase unavailable shows network error', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = 'pass123';
    delete window.firebase;
    const e = makeEvent();

    await handleLoginSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('firebase.auth is falsy shows network error', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = 'pass123';
    window.firebase = { auth: null };
    const e = makeEvent();

    await handleLoginSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
  });

  test('successful login with server', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = 'pass123';
    mockCtx.serverAvailable = true;

    const mockUser = {
      uid: 'uid-123',
      getIdToken: jest.fn().mockResolvedValue('token-abc'),
    };
    const mockCred = { user: mockUser };
    mockAuth.signInWithEmailAndPassword.mockResolvedValue(mockCred);
    mockCtx.serverLoginFirebase.mockResolvedValue({
      name: 'ServerUser',
      email: 'user@test.com',
      role: 'teacher',
      id: 'server-id-1',
    });

    const e = makeEvent();
    await handleLoginSubmit(e);

    expect(mockCtx.serverLoginFirebase).toHaveBeenCalledWith('token-abc');
    expect(mockCtx.syncDataFromServer).toHaveBeenCalled();
    expect(mockCtx.setCurrentUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ServerUser',
        serverAuth: true,
        serverId: 'server-id-1',
      }),
    );
  });

  test('successful login without server', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = 'pass123';
    mockCtx.serverAvailable = false;

    const mockUser = { uid: 'uid-456' };
    const mockCred = { user: mockUser };
    mockAuth.signInWithEmailAndPassword.mockResolvedValue(mockCred);

    const e = makeEvent();
    await handleLoginSubmit(e);

    expect(mockCtx.serverLoginFirebase).not.toHaveBeenCalled();
    expect(mockCtx.syncDataFromServer).not.toHaveBeenCalled();
    expect(mockCtx.setCurrentUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'user',
        role: 'student',
        serverAuth: false,
        userId: 'uid-456',
      }),
    );
  });

  test('login failure with auth/user-not-found', async () => {
    document.getElementById('login-username').value = 'missing@test.com';
    document.getElementById('login-password').value = 'pass123';

    const error = new Error('user not found');
    error.code = 'auth/user-not-found';
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(error);

    const e = makeEvent();
    await handleLoginSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('login failure with auth/wrong-password', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = 'wrong';

    const error = new Error('wrong password');
    error.code = 'auth/wrong-password';
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(error);

    const e = makeEvent();
    await handleLoginSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
  });

  test('login failure with auth/invalid-email', async () => {
    document.getElementById('login-username').value = 'invalid';
    document.getElementById('login-password').value = 'pass123';

    const error = new Error('invalid email');
    error.code = 'auth/invalid-email';
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(error);

    const e = makeEvent();
    await handleLoginSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
  });

  test('login failure with auth/too-many-requests', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = 'pass123';

    const error = new Error('too many requests');
    error.code = 'auth/too-many-requests';
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(error);

    const e = makeEvent();
    await handleLoginSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
    expect(mockCtx.__).toHaveBeenCalledWith('loginTooMany');
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('login failure with unknown error code', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = 'pass123';

    const error = new Error('something else');
    error.code = 'auth/unknown-error';
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(error);

    const e = makeEvent();
    await handleLoginSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
    expect(mockCtx.__).toHaveBeenCalledWith('loginFailed');
  });

  test('successful login with server but serverLoginFirebase fails falls back to local', async () => {
    document.getElementById('login-username').value = 'user@test.com';
    document.getElementById('login-password').value = 'pass123';
    mockCtx.serverAvailable = true;

    const mockUser = {
      uid: 'uid-fallback',
      getIdToken: jest.fn().mockResolvedValue('token-fallback'),
    };
    mockAuth.signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockCtx.serverLoginFirebase.mockRejectedValue(new Error('server down'));

    const e = makeEvent();
    await handleLoginSubmit(e);

    expect(mockCtx.syncDataFromServer).not.toHaveBeenCalled();
    expect(mockCtx.setCurrentUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        serverAuth: false,
        userId: 'uid-fallback',
      }),
    );
  });
});

// ─── handleRegistrationSubmit ────────────────────────────────────────────────

describe('handleRegistrationSubmit', () => {
  test('no ctx does nothing', async () => {
    configureAuth(null);
    const e = makeEvent();
    await expect(handleRegistrationSubmit(e)).resolves.toBeUndefined();
  });

  test('student age < 12 shows restriction warning', async () => {
    document.getElementById('reg-role').value = 'student';
    document.getElementById('reg-age').value = '10';
    document.getElementById('reg-contact').value = 'kid@test.com';
    document.getElementById('reg-name').value = 'Little Kid';
    document.getElementById('reg-password-new').value = 'pass123';
    document.getElementById('reg-parent-contact').value = 'parent@test.com';

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(e.preventDefault).toHaveBeenCalled();
    const warningBox = document.getElementById('auth-warning-box');
    expect(warningBox.classList.contains('hidden')).toBe(false);
    expect(mockCtx.__).toHaveBeenCalledWith('registerAgeRestriction');
    expect(mockCtx.speak).toHaveBeenCalled();
    expect(mockCtx.setCurrentUserSession).not.toHaveBeenCalled();
  });

  test('student without parent contact shows warning', async () => {
    document.getElementById('reg-role').value = 'student';
    document.getElementById('reg-age').value = '14';
    document.getElementById('reg-contact').value = 'teen@test.com';
    document.getElementById('reg-name').value = 'Teen';
    document.getElementById('reg-password-new').value = 'pass123';
    document.getElementById('reg-parent-contact').value = '';

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    const warningBox = document.getElementById('auth-warning-box');
    expect(warningBox.classList.contains('hidden')).toBe(false);
    expect(mockCtx.__).toHaveBeenCalledWith('registerParentRequired');
    expect(mockCtx.speak).toHaveBeenCalled();
    expect(mockCtx.setCurrentUserSession).not.toHaveBeenCalled();
  });

  test('teacher skips parent contact check', async () => {
    document.getElementById('reg-role').value = 'teacher';
    document.getElementById('reg-age').value = '30';
    document.getElementById('reg-contact').value = 'teacher@test.com';
    document.getElementById('reg-name').value = 'Mr Teacher';
    document.getElementById('reg-password-new').value = 'pass123';
    document.getElementById('reg-parent-contact').value = '';

    mockCtx.serverAvailable = false;
    const mockUser = {
      uid: 'uid-teach',
      updateProfile: jest.fn().mockResolvedValue(undefined),
    };
    mockAuth.createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(mockCtx.__).not.toHaveBeenCalledWith('registerParentRequired');
    expect(mockCtx.setCurrentUserSession).toHaveBeenCalled();
  });

  test('successful registration with server', async () => {
    document.getElementById('reg-role').value = 'student';
    document.getElementById('reg-age').value = '14';
    document.getElementById('reg-contact').value = 'new@test.com';
    document.getElementById('reg-name').value = 'NewStudent';
    document.getElementById('reg-password-new').value = 'pass123';
    document.getElementById('reg-parent-contact').value = 'parent@test.com';

    mockCtx.serverAvailable = true;
    const mockUser = {
      uid: 'uid-reg',
      getIdToken: jest.fn().mockResolvedValue('reg-token'),
      updateProfile: jest.fn().mockResolvedValue(undefined),
    };
    mockAuth.createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockCtx.serverRegisterFirebase.mockResolvedValue({
      name: 'ServerStudent',
      email: 'new@test.com',
      role: 'student',
      id: 'server-reg-id',
    });

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(mockUser.updateProfile).toHaveBeenCalledWith({ displayName: 'NewStudent' });
    expect(mockCtx.serverRegisterFirebase).toHaveBeenCalledWith(
      'reg-token',
      'NewStudent',
      'student',
      14,
      'parent@test.com',
    );
    expect(mockCtx.setCurrentUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ServerStudent',
        serverAuth: true,
      }),
    );
  });

  test('successful registration without server', async () => {
    document.getElementById('reg-role').value = 'student';
    document.getElementById('reg-age').value = '13';
    document.getElementById('reg-contact').value = 'local@test.com';
    document.getElementById('reg-name').value = 'LocalStudent';
    document.getElementById('reg-password-new').value = 'pass123';
    document.getElementById('reg-parent-contact').value = 'p@test.com';

    mockCtx.serverAvailable = false;
    const mockUser = {
      uid: 'uid-local',
      updateProfile: jest.fn().mockResolvedValue(undefined),
    };
    mockAuth.createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(mockCtx.serverRegisterFirebase).not.toHaveBeenCalled();
    expect(mockCtx.setCurrentUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'LocalStudent',
        role: 'student',
        age: 13,
        parentContact: 'p@test.com',
        userId: 'uid-local',
        serverAuth: false,
      }),
    );
  });

  test('registration failure with auth/email-already-in-use', async () => {
    document.getElementById('reg-role').value = 'teacher';
    document.getElementById('reg-age').value = '25';
    document.getElementById('reg-contact').value = 'dup@test.com';
    document.getElementById('reg-name').value = 'Dup';
    document.getElementById('reg-password-new').value = 'pass123';

    const error = new Error('email in use');
    error.code = 'auth/email-already-in-use';
    mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error);

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
    expect(mockCtx.__).toHaveBeenCalledWith('loginFailed');
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('registration failure with auth/weak-password', async () => {
    document.getElementById('reg-role').value = 'teacher';
    document.getElementById('reg-age').value = '25';
    document.getElementById('reg-contact').value = 'weak@test.com';
    document.getElementById('reg-name').value = 'Weak';
    document.getElementById('reg-password-new').value = '1';

    const error = new Error('weak password');
    error.code = 'auth/weak-password';
    mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error);

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
  });

  test('registration failure with auth/invalid-email', async () => {
    document.getElementById('reg-role').value = 'teacher';
    document.getElementById('reg-age').value = '25';
    document.getElementById('reg-contact').value = 'bad';
    document.getElementById('reg-name').value = 'Bad';
    document.getElementById('reg-password-new').value = 'pass123';

    const error = new Error('invalid email');
    error.code = 'auth/invalid-email';
    mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error);

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
  });

  test('firebase unavailable shows network error', async () => {
    document.getElementById('reg-role').value = 'teacher';
    document.getElementById('reg-age').value = '25';
    document.getElementById('reg-contact').value = 'user@test.com';
    document.getElementById('reg-name').value = 'User';
    document.getElementById('reg-password-new').value = 'pass123';
    delete window.firebase;

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
    expect(mockCtx.__).toHaveBeenCalledWith('errorNetwork');
    expect(mockCtx.speak).toHaveBeenCalled();
  });

  test('firebase.auth is falsy shows network error', async () => {
    document.getElementById('reg-role').value = 'teacher';
    document.getElementById('reg-age').value = '25';
    document.getElementById('reg-contact').value = 'user@test.com';
    document.getElementById('reg-name').value = 'User';
    document.getElementById('reg-password-new').value = 'pass123';
    window.firebase = { auth: null };

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(document.getElementById('auth-warning-box').classList.contains('hidden')).toBe(false);
    expect(mockCtx.__).toHaveBeenCalledWith('errorNetwork');
  });

  test('registration with server but serverRegisterFirebase fails falls back to local', async () => {
    document.getElementById('reg-role').value = 'student';
    document.getElementById('reg-age').value = '14';
    document.getElementById('reg-contact').value = 'fb@test.com';
    document.getElementById('reg-name').value = 'FBStudent';
    document.getElementById('reg-password-new').value = 'pass123';
    document.getElementById('reg-parent-contact').value = 'par@test.com';

    mockCtx.serverAvailable = true;
    const mockUser = {
      uid: 'uid-fb-fallback',
      updateProfile: jest.fn().mockResolvedValue(undefined),
    };
    mockAuth.createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockCtx.serverRegisterFirebase.mockRejectedValue(new Error('proxy down'));

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(mockCtx.setCurrentUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'FBStudent',
        serverAuth: false,
        userId: 'uid-fb-fallback',
      }),
    );
  });

  test('registration with server success then enterApp called', async () => {
    document.getElementById('reg-role').value = 'teacher';
    document.getElementById('reg-age').value = '30';
    document.getElementById('reg-contact').value = 'serv@test.com';
    document.getElementById('reg-name').value = 'ServTeacher';
    document.getElementById('reg-password-new').value = 'pass123';

    mockCtx.serverAvailable = true;
    const mockUser = {
      uid: 'uid-serv',
      getIdToken: jest.fn().mockResolvedValue('serv-token'),
      updateProfile: jest.fn().mockResolvedValue(undefined),
    };
    mockAuth.createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockCtx.serverRegisterFirebase.mockResolvedValue({
      name: 'ServTeacher',
      email: 'serv@test.com',
      role: 'teacher',
      id: 'serv-id',
    });

    const e = makeEvent();
    await handleRegistrationSubmit(e);

    expect(mockCtx.switchRole).toHaveBeenCalledWith('teacher');
    expect(mockCtx.showToast).toHaveBeenCalled();
  });
});
