// @ts-check
import { getProxyBase } from './gemini-client.js';

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
  const key = prompt(window.__('promptApiKey'));
  if (key) {
    localStorage.setItem('gemini_api_key', _obfuscate(key));
    return key;
  }
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
      el.textContent = ok ? window.__('proxyConnected') : window.__('proxyDisconnected');
    }
  });
}
