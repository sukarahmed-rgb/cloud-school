// @ts-check
import { __ } from './i18n.js';
import { showToast } from './ui-core.js';
import { speakToUser } from './audio-core.js';

const ERROR_LEVELS = { INFO: 'info', WARN: 'warn', ERROR: 'error', FATAL: 'fatal' };

const listeners = [];

// Global timer monkey-patching removed to restore native browser APIs.
// Timers are now cleaned up explicitly via clearAllTimers in cloud_school_app.js.

function secureRandomInt(min, max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return min + (array[0] % (max - min + 1));
}

function notifyListeners(level, context, error) {
  listeners.forEach((fn) => fn(level, context, error));
}

function handleError(context, error) {
  const message = error?.message || String(error);
  const level = error?.fatal ? ERROR_LEVELS.FATAL : ERROR_LEVELS.ERROR;

  console.error(`[${context}] ${message}`, error);
  notifyListeners(level, context, error);

  if (typeof window.firebase !== 'undefined' && typeof window.firebase.analytics === 'function') {
    try {
      window.firebase.analytics().logEvent('exception', {
        description: `[${context}] ${message}`,
        fatal: level === ERROR_LEVELS.FATAL,
      });
    } catch (e) {}
  }

  const userMessages = {
    'api key': __('errorApiKey'),
    network: __('errorNetwork'),
    fetch: __('errorFetch'),
    timeout: __('errorTimeout'),
    permission: __('errorPermission'),
    audio: __('errorAudio'),
    firebase: __('errorFirebase'),
  };

  let userMessage = __('errorDefault');
  const lowerMsg = message.toLowerCase();
  for (const [key, msg] of Object.entries(userMessages)) {
    if (lowerMsg.includes(key)) {
      userMessage = msg;
      break;
    }
  }

  showToast(userMessage);

  if (typeof window.Sentry !== 'undefined') {
    window.Sentry.captureException(new Error(`[${level}] ${message}`), { extra: { context } });
  }

  if (level === ERROR_LEVELS.FATAL) {
    speakToUser(__('criticalError', userMessage));
  } else {
    speakToUser(userMessage);
  }

  return { level, context, message };
}

function setupGlobalErrorHandler() {
  if (typeof window.Sentry !== 'undefined') {
    window.Sentry.init({
      dsn: 'https://7c44e976db57fcf7c7c34d3d2db73b18@o4505678229340160.ingest.us.sentry.io/4508930292725760',
      tracesSampleRate: 1.0,
    });
  }
  window.addEventListener('unhandledrejection', (event) => {
    if (typeof window.Sentry !== 'undefined') {
      window.Sentry.captureException(event.reason);
    }
    handleError('unhandledRejection', event.reason);
  });
  window.addEventListener('error', (event) => {
    if (typeof window.Sentry !== 'undefined') {
      window.Sentry.captureException(event.error || event.message);
    }
    handleError('unhandledException', event.error || event.message);
  });
}

export {
  ERROR_LEVELS,
  listeners,
  secureRandomInt,
  notifyListeners,
  speakToUser,
  handleError,
  setupGlobalErrorHandler,
};
