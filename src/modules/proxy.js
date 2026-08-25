// @ts-check
import { getProxyBase } from './gemini-client.js';
import { showToast } from './ui-core.js';
import { speak } from './speech.js';
import { __ } from './i18n.js';

/**
 * @param {string} str
 * @returns {string}
 */
export function _obfuscate(str) {
  const k = 'cs2026!';
  let r = '';
  for (let i = 0; i < str.length; i++) {
    r += String.fromCharCode(str.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  }
  return btoa(r);
}

/**
 * @param {string} str
 * @returns {string}
 */
export function _deobfuscate(str) {
  try {
    const k = 'cs2026!';
    const d = atob(str);
    let r = '';
    for (let i = 0; i < d.length; i++) {
      r += String.fromCharCode(d.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }
    return r;
  } catch {
    return '';
  }
}

/** @returns {string} */
export function getGeminiKey() {
  const stored = localStorage.getItem('gemini_api_key');
  if (stored) {
    const decoded = _deobfuscate(stored);
    if (decoded) {
      return decoded;
    }
  }
  // Non-blocking notice instead of a modal prompt(): blocking dialogs
  // freeze screen readers — the exact audience of this app. The user can
  // enter a key from the toolbar settings (setupGeminiKeyControls).
  showToast(__('promptApiKey'));
  speak(__('promptApiKey'));
  return '';
}

/** @returns {Promise<boolean>} */
export async function checkProxyHealth() {
  try {
    const base = getProxyBase();
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/** Update the proxy status indicator in the UI */
export function updateProxyStatus() {
  checkProxyHealth().then((ok) => {
    document.getElementById('proxy-status-icon').textContent = ok ? '\u2705' : '\u{1F534}';
    const el = document.getElementById('proxy-status');
    if (el) {
      el.textContent = ok ? __('proxyConnected') : __('proxyDisconnected');
    }
  });
}

/** Wire the Gemini API key toolbar controls */
export function setupGeminiKeyControls() {
  const toggleBtn = document.getElementById('btn-gemini-key-toggle');
  const container = document.getElementById('gemini-key-input-container');
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById('gemini-key-input'));
  const saveBtn = document.getElementById('btn-gemini-key-save');
  if (!toggleBtn || !container || !input || !saveBtn) {
    return;
  }
  const close = () => {
    container.classList.add('hidden');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();
  };
  const open = () => {
    const stored = localStorage.getItem('gemini_api_key');
    input.value = stored ? _deobfuscate(stored) : '';
    container.classList.remove('hidden');
    toggleBtn.setAttribute('aria-expanded', 'true');
    input.focus();
    speak(__('geminiKeyPrompt'));
  };
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.addEventListener('click', () => {
    if (container.classList.contains('hidden')) {
      open();
    } else {
      close();
    }
  });
  saveBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (val) {
      localStorage.setItem('gemini_api_key', _obfuscate(val));
      speak(__('geminiKeySaved'));
    } else {
      localStorage.removeItem('gemini_api_key');
      speak(__('geminiKeyCleared'));
    }
    close();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
}
