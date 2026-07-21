// @ts-check
let _userInteracted = false;
const _speechQueue = [];

function _flushSpeechQueue() {
  if (_userInteracted) {
    return;
  }
  _userInteracted = true;
  const q = _speechQueue.slice();
  _speechQueue.length = 0;
  for (const msg of q) {
    _speakNow(msg);
  }
}

function _speakNow(message) {
  try {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = window.__speechLang || 'ar-EG';
    window.speechSynthesis.speak(utterance);
  } catch {}
}

if (typeof document !== 'undefined') {
  const handler = () => _flushSpeechQueue();
  document.addEventListener('click', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
  document.addEventListener('touchstart', handler, { once: true });
}

export function speakToUser(message) {
  const ariaLive = document.getElementById('aria-live');
  if (ariaLive) {
    ariaLive.textContent = message;
  }
  if (!_userInteracted) {
    _speechQueue.push(message);
    return;
  }
  _speakNow(message);
}
