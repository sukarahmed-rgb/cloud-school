import {
  ERROR_LEVELS,
  secureRandomInt,
  handleError,
  notifyListeners,
  listeners,
  setupGlobalErrorHandler,
} from '../../src/modules/error-handler.js';
import { showToast } from '../../src/modules/ui-core.js';
import { speakToUser } from '../../src/modules/audio-core.js';

jest.mock('../../src/modules/ui-core.js', () => ({ showToast: jest.fn() }));
jest.mock('../../src/modules/audio-core.js', () => ({ speakToUser: jest.fn() }));

beforeEach(() => {
  listeners.length = 0;
  window.__ = jest.fn((key, ...args) => args[0] || key);
  window.speak = jest.fn();
  window.crypto = {
    getRandomValues: jest.fn((arr) => {
      arr[0] = 42;
    }),
  };
  document.body.innerHTML = '<div id="toast"></div>';
  delete window.firebase;
  delete window.Sentry;
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('error-handler.js - ERROR_LEVELS', () => {
  test('has expected levels', () => {
    expect(ERROR_LEVELS).toEqual({ INFO: 'info', WARN: 'warn', ERROR: 'error', FATAL: 'fatal' });
  });
});

describe('error-handler.js - secureRandomInt', () => {
  test('returns number within range', () => {
    const result = secureRandomInt(1, 10);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(10);
  });
});

describe('error-handler.js - notifyListeners', () => {
  test('calls registered listeners with error details', () => {
    const fn = jest.fn();
    listeners.push(fn);
    notifyListeners('error', 'testContext', new Error('test'));
    expect(fn).toHaveBeenCalledWith('error', 'testContext', expect.any(Error));
  });

  test('handles multiple listeners', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    listeners.push(fn1, fn2);
    notifyListeners('info', 'ctx', 'msg');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});

describe('error-handler.js - handleError', () => {
  test('returns level, context, and message', () => {
    const result = handleError('test', new Error('boom'));
    expect(result).toEqual({ level: 'error', context: 'test', message: 'boom' });
    expect(showToast).toHaveBeenCalled();
    expect(speakToUser).toHaveBeenCalled();
  });

  test('returns fatal level when error has fatal property', () => {
    const err = new Error('fatal error');
    err.fatal = true;
    const result = handleError('crash', err);
    expect(result.level).toBe('fatal');
    expect(speakToUser).toHaveBeenCalled();
  });

  test('handles non-Error objects', () => {
    const result = handleError('test', 'string error');
    expect(result.message).toBe('string error');
  });

  test('matches known error keywords for user messages', () => {
    handleError('test', new Error('network error'));
    expect(showToast).toHaveBeenCalledWith('errorNetwork');
  });

  test('matches api key keyword', () => {
    handleError('test', new Error('invalid api key'));
    expect(showToast).toHaveBeenCalledWith('errorApiKey');
  });

  test('matches timeout keyword', () => {
    handleError('test', new Error('request timeout'));
    expect(showToast).toHaveBeenCalledWith('errorTimeout');
  });

  test('matches permission keyword', () => {
    handleError('test', new Error('permission denied'));
    expect(showToast).toHaveBeenCalledWith('errorPermission');
  });

  test('matches audio keyword', () => {
    handleError('test', new Error('audio error'));
    expect(showToast).toHaveBeenCalledWith('errorAudio');
  });

  test('matches firebase keyword', () => {
    handleError('test', new Error('firebase error'));
    expect(showToast).toHaveBeenCalledWith('errorFirebase');
  });

  test('uses default message for unknown errors', () => {
    handleError('test', new Error('something random'));
    expect(showToast).toHaveBeenCalledWith('errorDefault');
  });

  test('fires Firebase analytics when available', () => {
    const logEvent = jest.fn();
    window.firebase = { analytics: jest.fn(() => ({ logEvent })) };
    handleError('test', new Error('boom'));
    expect(logEvent).toHaveBeenCalledWith('exception', {
      description: '[test] boom',
      fatal: false,
    });
  });

  test('does not throw when Firebase analytics fails', () => {
    window.firebase = {
      analytics: jest.fn(() => {
        throw new Error('fb fail');
      }),
    };
    expect(() => handleError('test', new Error('boom'))).not.toThrow();
  });

  test('sends to Sentry when available', () => {
    window.Sentry = { captureException: jest.fn() };
    handleError('test', new Error('boom'));
    expect(window.Sentry.captureException).toHaveBeenCalled();
  });

  test('speaks different message for fatal errors', () => {
    const err = new Error('fatal crash');
    err.fatal = true;
    handleError('crash', err);
    expect(speakToUser).toHaveBeenCalledWith('criticalError');
  });

  test('speaks user message for non-fatal errors', () => {
    handleError('test', new Error('boom'));
    expect(speakToUser).not.toHaveBeenCalledWith('criticalError');
  });
});

describe('error-handler.js - setupGlobalErrorHandler', () => {
  let addEventListenerSpy;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  });

  test('registers unhandledrejection and error listeners', () => {
    setupGlobalErrorHandler();
    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('unhandledrejection handler calls handleError', () => {
    setupGlobalErrorHandler();
    const handler = addEventListenerSpy.mock.calls.find((c) => c[0] === 'unhandledrejection')[1];
    const reason = new Error('async fail');
    handler({ reason });
    expect(showToast).toHaveBeenCalled();
  });

  test('unhandledrejection handler sends to Sentry when available', () => {
    window.Sentry = { captureException: jest.fn(), init: jest.fn() };
    setupGlobalErrorHandler();
    const handler = addEventListenerSpy.mock.calls.find((c) => c[0] === 'unhandledrejection')[1];
    handler({ reason: new Error('async fail') });
    expect(window.Sentry.captureException).toHaveBeenCalled();
  });

  test('error handler calls handleError', () => {
    setupGlobalErrorHandler();
    const handler = addEventListenerSpy.mock.calls.find((c) => c[0] === 'error')[1];
    handler({ error: new Error('dom fail'), message: 'dom fail' });
    expect(showToast).toHaveBeenCalled();
  });

  test('error handler sends to Sentry when available', () => {
    window.Sentry = { captureException: jest.fn(), init: jest.fn() };
    setupGlobalErrorHandler();
    const handler = addEventListenerSpy.mock.calls.find((c) => c[0] === 'error')[1];
    handler({ error: new Error('dom fail') });
    expect(window.Sentry.captureException).toHaveBeenCalled();
  });

  test('error handler uses event.message when event.error is missing', () => {
    window.Sentry = { captureException: jest.fn(), init: jest.fn() };
    setupGlobalErrorHandler();
    const handler = addEventListenerSpy.mock.calls.find((c) => c[0] === 'error')[1];
    handler({ message: 'string message' });
    expect(window.Sentry.captureException).toHaveBeenCalled();
  });

  test('initializes Sentry when available', () => {
    window.Sentry = { init: jest.fn(), captureException: jest.fn() };
    setupGlobalErrorHandler();
    expect(window.Sentry.init).toHaveBeenCalled();
  });

  test('does not init Sentry when unavailable', () => {
    setupGlobalErrorHandler();
    expect(window.Sentry).toBeUndefined();
  });
});
