// @ts-check
import { clearQuizTimer } from './quizzes.js';
import { clearGameTimer } from './games/game-state.js';
import { __ } from './i18n.js';

/** @type {boolean} */
let _INIT_RAN = false;

/** @returns {boolean} */
export function isInitRan() {
  return _INIT_RAN;
}
/** @returns {void} */
export function markInitRan() {
  _INIT_RAN = true;
}

/** @returns {void} */
export function clearAllTimers() {
  clearQuizTimer();
  try {
    clearGameTimer();
  } catch (e) {}
}

/**
 * @param {Function} fn
 * @param {string} name
 * @returns {void}
 */
export function safeInit(fn, name) {
  try {
    fn();
  } catch (e) {
    console.error(`Init error in ${name}:`, e);
    try {
      const msg = __('initError', name, /** @type {Error} */ (e).message || '');
      const toast = document.getElementById('toast-message');
      if (toast) {
        toast.textContent = msg;
        toast.classList.remove('hidden');
      }
    } catch (e2) {}
  }
}

/** @returns {void} */
export function dismissSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) {
    return;
  }
  const handler = function () {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(function () {
      splash.style.display = 'none';
      const authGate = document.getElementById('auth-gate');
      if (authGate) {
        const firstInput = /** @type {HTMLElement|null} */ (
          authGate.querySelector('input, button, [tabindex]:not([tabindex="-1"])')
        );
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 700);
    document.removeEventListener('keydown', handler);
    splash.removeEventListener('click', handler);
  };
  splash.addEventListener('click', handler);
  document.addEventListener('keydown', handler);
  setTimeout(handler, 5000);
}
