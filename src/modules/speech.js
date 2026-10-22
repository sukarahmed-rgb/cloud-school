// @ts-check
import { speakToUser } from './audio-core.js';
import { __ } from './i18n.js';

/** @type {boolean} */
export let audioCoPilotEnabled = true;
/** @type {AbortController|null} */
export let accessibleVoicesController = null;

/**
 * @param {string} text
 */
export function speak(text) {
  if (!audioCoPilotEnabled) {
    return;
  }
  const ariaLive = document.getElementById('aria-live');
  if (ariaLive) {
    ariaLive.textContent = text;
  }
  if (screenReaderMode) {
    return;
  }
  speakToUser(text);
}

/** Stop all speech synthesis */
export function stopAllAudio() {
  window.speechSynthesis.cancel();
}

/** @type {string} */
export let ttsEngineMode = localStorage.getItem('cloudSchoolTtsEngine') || 'browser';

/** Toggle between gemini and browser TTS engines */
export function toggleTtsEngine() {
  ttsEngineMode = ttsEngineMode === 'gemini' ? 'browser' : 'gemini';
  localStorage.setItem('cloudSchoolTtsEngine', ttsEngineMode);
  const btn = document.getElementById('tts-engine-toggle');
  if (btn) {
    btn.textContent =
      ttsEngineMode === 'gemini'
        ? `\u{1F3B9}\uFE0F ${__('ttsGemini')}`
        : `\u{1F3B9}\uFE0F ${__('ttsBrowser')}`;
  }
  speak(ttsEngineMode === 'gemini' ? __('ttsGeminiActivated') : __('ttsBrowserActivated'));
}

/** @type {boolean} */
export let screenReaderMode = false;

/** Toggle screen reader mode on/off */
export function toggleScreenReaderMode() {
  screenReaderMode = !screenReaderMode;
  const btn = document.getElementById('btn-screen-reader-mode');
  if (!btn) {
    return;
  }
  if (screenReaderMode) {
    btn.textContent = __('srModeOn');
    stopAllAudio();
    const ariaLive = document.getElementById('aria-live');
    if (ariaLive) {
      ariaLive.textContent = __('srModeActive');
    }
  } else {
    btn.textContent = __('srModeOff');
    speak(__('srModeOffSpoken'));
  }
}

/** Toggle the audio co-pilot feature */
export function toggleAudioCoPilot() {
  audioCoPilotEnabled = !audioCoPilotEnabled;
  const btn = document.getElementById('audio-co-pilot-toggle');
  if (!btn) {
    return;
  }
  if (audioCoPilotEnabled) {
    btn.textContent = __('audioCpOn');
    btn.setAttribute('aria-pressed', 'true');
    speak(__('audioCpActivated'));
  } else {
    btn.textContent = __('audioCpOff');
    btn.setAttribute('aria-pressed', 'false');
    stopAllAudio();
  }
}

/** Attach focus/hover speech to all interactive elements */
export function setupAccessibleVoices() {
  if (accessibleVoicesController) {
    accessibleVoicesController.abort();
  }
  accessibleVoicesController = new AbortController();
  const signal = accessibleVoicesController.signal;
  document
    .querySelectorAll('button, a, input, textarea, select, [role="button"], [role="tab"]')
    .forEach((el) => {
      el.addEventListener(
        'focus',
        () => {
          const t =
            el.getAttribute('aria-label') ||
            /** @type {HTMLElement} */ (el).innerText ||
            /** @type {HTMLInputElement} */ (el).placeholder ||
            '';
          if (t) {
            speak(t);
          }
        },
        { signal },
      );
      el.addEventListener(
        'mouseenter',
        () => {
          const isStudent =
            document.getElementById('view-student') &&
            !document.getElementById('view-student').classList.contains('hidden');
          if (isStudent) {
            const t =
              el.getAttribute('aria-label') ||
              /** @type {HTMLElement} */ (el).innerText ||
              /** @type {HTMLInputElement} */ (el).placeholder ||
              '';
            if (t) {
              speak(t);
            }
          }
        },
        { signal },
      );
    });
}

/** Initialize audio co-pilot state from localStorage */
export function initAudioCoPilot() {
  const saved = localStorage.getItem('cloudSchoolAudioCoPilot');
  if (saved !== null) {
    audioCoPilotEnabled = saved === 'true';
  }
  const btn = document.getElementById('audio-co-pilot-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', audioCoPilotEnabled ? 'true' : 'false');
  }
}
