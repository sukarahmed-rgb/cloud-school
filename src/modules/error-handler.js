// @ts-check
import { __ } from './i18n.js';
import { showToast } from './ui-core.js';
import { speakToUser } from './audio-core.js';

const ERROR_LEVELS = { INFO: 'info', WARN: 'warn', ERROR: 'error', FATAL: 'fatal' };

const listeners = [];
const MAX_ERROR_LOG = 100;
const errorLog = [];

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

  if (errorLog.length >= MAX_ERROR_LOG) {
    errorLog.shift();
  }
  errorLog.push({ level, context, message, timestamp: Date.now() });

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
  if (typeof window.Sentry !== 'undefined' && window.Sentry.init) {
    try {
      window.Sentry.init({
        dsn: window.__SENTRY_DSN || '',
        tracesSampleRate: 0.2,
      });
    } catch (e) {}
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

function getErrorLog() {
  return [...errorLog];
}

function clearErrorLog() {
  errorLog.length = 0;
}

export {
  ERROR_LEVELS,
  listeners,
  secureRandomInt,
  notifyListeners,
  speakToUser,
  handleError,
  setupGlobalErrorHandler,
  getErrorLog,
  clearErrorLog,
};
