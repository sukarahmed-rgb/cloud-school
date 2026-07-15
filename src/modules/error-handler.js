import { __ } from '../cloud_school_app.js';
import { showToast } from '../cloud_school_app.js';
import { speakToUser } from './audio-core.js';

const ERROR_LEVELS = { INFO: 'info', WARN: 'warn', ERROR: 'error', FATAL: 'fatal' };

const listeners = [];

var activeIntervals = [];
var activeTimeouts = new Set();
var originalSetInterval = setInterval;
setInterval = function(cb, delay) {
  var id = originalSetInterval(cb, delay);
  activeIntervals.push(id);
  return id;
};
var originalSetTimeout = setTimeout;
setTimeout = function(cb, delay) {
  var wrapped = function() {
    activeTimeouts.delete(id);
    return cb.apply(this, arguments);
  };
  var id = originalSetTimeout(wrapped, delay);
  activeTimeouts.add(id);
  return id;
};

function cleanupTimers() {
  activeIntervals.forEach(function(id) { try { clearInterval(id); } catch(e) {} });
  activeIntervals = [];
  activeTimeouts.forEach(function(id) { try { clearTimeout(id); } catch(e) {} });
  activeTimeouts = new Set();
}

window.addEventListener('beforeunload', cleanupTimers);

function secureRandomInt(min, max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return min + (array[0] % (max - min + 1));
}

function notifyListeners(level, context, error) {
  listeners.forEach(fn => fn(level, context, error));
}

function handleError(context, error) {
  const message = error?.message || String(error);
  const level = error?.fatal ? ERROR_LEVELS.FATAL : ERROR_LEVELS.ERROR;

  console.error(`[${context}] ${message}`, error);
  notifyListeners(level, context, error);

  const userMessages = {
    'api key': __('errorApiKey'),
    'network': __('errorNetwork'),
    'fetch': __('errorFetch'),
    'timeout': __('errorTimeout'),
    'permission': __('errorPermission'),
    'audio': __('errorAudio'),
    'firebase': __('errorFirebase'),
  };

  let userMessage = __('errorDefault');
  const lowerMsg = message.toLowerCase();
  for (const [key, msg] of Object.entries(userMessages)) {
    if (lowerMsg.includes(key)) { userMessage = msg; break; }
  }

  showToast(userMessage);

  if (level === ERROR_LEVELS.FATAL) {
    speakToUser(__('criticalError', userMessage));
  } else {
    speakToUser(userMessage);
  }

  return { level, context, message };
}

function setupGlobalErrorHandler() {
  window.addEventListener('unhandledrejection', (event) => {
    handleError('unhandledRejection', event.reason);
  });
  window.addEventListener('error', (event) => {
    handleError('unhandledException', event.error || event.message);
  });
}

export {
  ERROR_LEVELS, listeners, activeIntervals, activeTimeouts,
  originalSetInterval, originalSetTimeout,
  cleanupTimers, secureRandomInt, notifyListeners,
  speakToUser, handleError, setupGlobalErrorHandler,
};
