/* eslint-disable no-unused-vars */
const __app_id = 'cloud-school-blind-v1';
const __firebase_config = {
  // SECURITY: Restrict this API key in Firebase Console → Project Settings → API Key → Application restrictions
  // Set HTTP referrer restrictions to: cloud-school-6251a.web.app, cloud-school-6251a.firebaseapp.com, localhost
  apiKey: 'AIzaSyCB-560lR7KyRyD9TYShxdJbkoP8rELBuw',
  authDomain: 'cloud-school-6251a.firebaseapp.com',
  projectId: 'cloud-school-6251a',
  storageBucket: 'cloud-school-6251a.firebasestorage.app',
  messagingSenderId: '87142350368',
  appId: '1:87142350368:web:0949d5cfa3bbd852904645',
  measurementId: 'G-V7CZJK62S6',
};
const __initial_auth_token = null;
const __server_base = 'https://cloud-school-api.cloud-school-subdomain.workers.dev';
// Sentry DSN for client-side error monitoring (public by design — safe to ship in the bundle).
// Leave empty to disable client Sentry. Worker-side Sentry is configured separately via the
// SENTRY_DSN Cloudflare secret (npx wrangler secret put SENTRY_DSN).
const __SENTRY_DSN = '';

let _speechQueue = [];
let _userInteracted = false;
function _flushSpeechQueue() {
  if (_userInteracted) {
    return;
  }
  _userInteracted = true;
  for (const text of _speechQueue) {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ar-SA';
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }
  _speechQueue = [];
}
document.addEventListener('click', _flushSpeechQueue, { once: true });
document.addEventListener('keydown', _flushSpeechQueue, { once: true });
document.addEventListener('touchstart', _flushSpeechQueue, { once: true });

function _safeSpeak(text) {
  if (_userInteracted) {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ar-SA';
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  } else {
    _speechQueue.push(text);
  }
}

window.__csErrors = [];
window.onerror = function (msg, url, line) {
  const text = `خطأ: ${msg}`;
  window.__csErrors.push(text);
  _safeSpeak(text);
  console.error('[CS early error]', msg, url, line);
};
window.addEventListener('unhandledrejection', function (e) {
  const text = `خطأ في الخلفية: ${e.reason && e.reason.message ? e.reason.message : 'غير معروف'}`;
  window.__csErrors.push(text);
  _safeSpeak(text);
  console.error('[CS early rejection]', e.reason);
});
