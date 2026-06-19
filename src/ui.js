/** UI module - أدوات واجهة المستخدم */

const STORAGE_KEYS = {
  sizeOffset: 'cloudSchoolSizeOffset',
  theme: 'cloudSchoolTheme',
};

export let audioCoPilotEnabled = true;
export let screenReaderMode = false;
export let ttsEngineMode = localStorage.getItem('cloudSchoolTtsEngine') || 'gemini';
export let activeAudioElement = null;
export let accessibleVoicesController = null;
let sharedAudioContext = null;

// ====== Audio Context Singleton ======
export function getAudioContext() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor();
  }
  if (sharedAudioContext.state === 'suspended') sharedAudioContext.resume();
  return sharedAudioContext;
}

// ====== Toast ======
export function showToast(text) {
  const toast = document.getElementById('toast-message');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ====== Loading Spinner ======
export function showLoading(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="loading-overlay"><span class="loading-spinner"></span><span>${escapeHtml(message)}</span></div>`;
}

export function hideLoading(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = '';
}

// ====== Escape HTML (XSS Protection) ======
export function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ====== Speech ======
export function speak(text) {
  if (!audioCoPilotEnabled) return;

  const ariaLive = document.getElementById('aria-live');
  if (ariaLive) ariaLive.textContent = text;

  if (screenReaderMode) return;

  stopAllAudio();

  const wave = document.getElementById('audio-visual-wave');
  if (wave) wave.classList.add('playing');

  if (ttsEngineMode === 'gemini') {
    speakWithGemini(text);
  } else {
    speakWithBrowser(text, wave);
  }
}

function stopAllAudio() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }
  window.speechSynthesis.cancel();
}

async function speakWithGemini(text) {
  const wave = document.getElementById('audio-visual-wave');
  try {
    const { speakWithGeminiTTS } = await import('./gemini.js');
    const audioUrl = await speakWithGeminiTTS(text);
    if (!audioUrl) return fallbackSpeak(text, wave);

    if (activeAudioElement) activeAudioElement.pause();
    activeAudioElement = new Audio(audioUrl);
    activeAudioElement.onended = () => { if (wave) wave.classList.remove('playing'); };
    activeAudioElement.play().catch(() => {
      if (wave) wave.classList.remove('playing');
      showAutoplayPrompt(text);
    });
  } catch {
    fallbackSpeak(text, wave);
  }
}

function speakWithBrowser(text, wave) {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.1;
    utterance.onend = () => { if (wave) wave.classList.remove('playing'); };
    window.speechSynthesis.speak(utterance);
  } catch {
    if (wave) wave.classList.remove('playing');
  }
}

function fallbackSpeak(text, wave) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-EG';
  utterance.onend = () => { if (wave) wave.classList.remove('playing'); };
  window.speechSynthesis.speak(utterance);
}

function showAutoplayPrompt(pendingText) {
  let prompt = document.getElementById('autoplay-unlock-prompt');
  if (prompt) return;
  prompt = document.createElement('div');
  prompt.id = 'autoplay-unlock-prompt';
  prompt.className = 'fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4';
  prompt.innerHTML = `
    <div class="card p-8 rounded-3xl max-w-md border-4 border-yellow-400 space-y-6 bg-slate-900 text-yellow-400 text-center">
      <p class="text-white font-bold text-lg">اضغط لتفعيل الصوت</p>
      <button id="btn-unlock-audio" class="w-full p-4 bg-yellow-400 text-black font-black text-xl rounded-xl btn-interactive">تشغيل الصوت 🎙️</button>
    </div>`;
  document.body.appendChild(prompt);
  document.getElementById('btn-unlock-audio')?.addEventListener('click', () => {
    prompt.remove();
    const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
    silent.play().then(() => speak(pendingText)).catch(() => speak(pendingText));
  });
  setupAccessibleVoices();
}

// ====== TTS Engine Toggle ======
export function toggleTtsEngine() {
  ttsEngineMode = ttsEngineMode === 'gemini' ? 'browser' : 'gemini';
  localStorage.setItem('cloudSchoolTtsEngine', ttsEngineMode);
  const btn = document.getElementById('tts-engine-toggle');
  if (btn) {
    btn.textContent = ttsEngineMode === 'gemini'
      ? '🎙️ صوت القراءة: ذكاء اصطناعي (Gemini)'
      : '🎙️ صوت القراءة: قارئ المتصفح المحلي';
  }
  speak(ttsEngineMode === 'gemini' ? 'تم تفعيل صوت Gemini.' : 'تم تفعيل قارئ المتصفح.');
}

// ====== Screen Reader Mode ======
export function toggleScreenReaderMode() {
  screenReaderMode = !screenReaderMode;
  const btn = document.getElementById('btn-screen-reader-mode');
  if (!btn) return;
  if (screenReaderMode) {
    btn.textContent = '🔇 قارئ خارجي: مفعل';
    stopAllAudio();
    const ariaLive = document.getElementById('aria-live');
    if (ariaLive) ariaLive.textContent = 'وضع توافق قارئ الشاشة مفعل.';
  } else {
    btn.textContent = '🔊 قارئ خارجي: معطل';
    speak('تم إيقاف وضع قارئ الشاشة.');
  }
}

// ====== Audio Co-Pilot ======
export function toggleAudioCoPilot() {
  audioCoPilotEnabled = !audioCoPilotEnabled;
  const btn = document.getElementById('audio-co-pilot-toggle');
  if (!btn) return;
  if (audioCoPilotEnabled) {
    btn.textContent = '🔊 المساعد الداخلي: مفعل';
    btn.setAttribute('aria-pressed', 'true');
    speak('تم تفعيل المساعد الصوتي.');
  } else {
    btn.textContent = '🔇 المساعد الداخلي: معطل';
    btn.setAttribute('aria-pressed', 'false');
    stopAllAudio();
  }
}

// ====== Text Size ======
export function adjustTextSize(direction) {
  let offset = parseInt(localStorage.getItem(STORAGE_KEYS.sizeOffset) || '0', 10);
  offset += direction;
  if (offset < -2) offset = -2;
  if (offset > 6) offset = 6;
  localStorage.setItem(STORAGE_KEYS.sizeOffset, offset);

  const sizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const chosen = sizes[1 + offset] || 1.125;
  document.documentElement.style.setProperty('--base-text-size', `${chosen}rem`);
  speak(`${Math.round(chosen * 100)}%`);
}

export function loadTextSize() {
  const offset = parseInt(localStorage.getItem(STORAGE_KEYS.sizeOffset) || '0', 10);
  const sizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const chosen = sizes[1 + Math.min(Math.max(offset, -2), 6)] || 1.125;
  document.documentElement.style.setProperty('--base-text-size', `${chosen}rem`);
}

// ====== Themes ======
export function setTheme(theme) {
  const body = document.body;
  body.className = body.className.replace(/theme-\S+/g, '');
  body.classList.add(`theme-${theme === 'dark-hc' ? 'dark-high-contrast' : theme === 'light-hc' ? 'light-high-contrast' : 'classic'}`);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved) setTheme(saved);
}

// ====== Accessible Voices (Hover/Focus) ======
export function setupAccessibleVoices() {
  if (accessibleVoicesController) accessibleVoicesController.abort();
  accessibleVoicesController = new AbortController();
  const signal = accessibleVoicesController.signal;

  document.querySelectorAll('button, a, input, textarea, select, [role="button"], [role="tab"]').forEach(el => {
    el.addEventListener('focus', () => {
      const t = el.getAttribute('aria-label') || el.innerText || el.placeholder || '';
      if (t) speak(t);
    }, { signal });

    el.addEventListener('mouseenter', () => {
      const isStudent = document.getElementById('view-student') && !document.getElementById('view-student').classList.contains('hidden');
      if (isStudent) {
        const t = el.getAttribute('aria-label') || el.innerText || el.placeholder || '';
        if (t) speak(t);
      }
    }, { signal });
  });
}

// ====== Proxy URL Configuration ======
export function getProxyBaseUrl() {
  // Allow override via localStorage for development
  const devOverride = localStorage.getItem('cloudSchoolProxyUrl');
  if (devOverride) return devOverride;
  // In production, use the same origin with /api prefix via reverse proxy
  // For now, default to localhost:3001
  return 'http://127.0.0.1:3001';
}

export async function checkProxyHealth() {
  try {
    const base = getProxyBaseUrl();
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

// ====== Audio Recording ======
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

export function getIsRecording() { return isRecording; }

export function toggleAudioRecording() {
  const micBtn = document.getElementById('btn-mic-input');
  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    isRecording = false;
    if (micBtn) micBtn.classList.remove('bg-red-600', 'animate-pulse');
    speak('انتهى التسجيل. جاري التفريغ...');
  } else {
    if (!navigator.mediaDevices?.getUserMedia) {
      speak('الميكروفون غير مدعوم.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        audioChunks = [];
        try {
          const { transcribeAudio } = await import('./gemini.js');
          const base64 = await blobToBase64(blob);
          const text = await transcribeAudio(base64, mediaRecorder.mimeType);
          if (text?.trim()) {
            const ans = document.getElementById('assignment-student-answer');
            if (ans) ans.value += (ans.value ? ' ' : '') + text.trim();
            const aiQ = document.getElementById('ai-tutor-query');
            if (aiQ && document.getElementById('student-sub-ai-tutor') && !document.getElementById('student-sub-ai-tutor').classList.contains('hidden')) {
              aiQ.value = text.trim();
            }
            speak('تم التقاط الصوت.');
          }
        } catch { speak('خطأ في معالجة الصوت.'); }
      };
      mediaRecorder.start();
      isRecording = true;
      if (micBtn) micBtn.classList.add('bg-red-600', 'animate-pulse');
      speak('بدء التسجيل.');
    }).catch(() => speak('لم أتمكن من الوصول للميكروفون.'));
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ====== Sound Effects ======
export function playSuccessChime() {
  playTone(523.25, 880, 'sine', 0.3);
}

export function playFailChime() {
  playTone(150, 80, 'sawtooth', 0.3);
}

function playTone(startFreq, endFreq, type, duration) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration * 0.7);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio not available */ }
}

// ====== Focus Management ======
export function focusElement(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function announceToScreenReader(text) {
  const ariaLive = document.getElementById('aria-live');
  if (!ariaLive) return;
  ariaLive.textContent = '';
  requestAnimationFrame(() => { ariaLive.textContent = text; });
}
