// @ts-check
import { toggleTtsEngine, toggleAudioCoPilot, toggleScreenReaderMode } from './speech.js';
import { setTheme, adjustTextSize, toggleRegFields } from './accessibility.js';
import { setCurrentLang, getCurrentLang } from './i18n.js';
import { showKeyboardHelp, showNotificationsPanel } from './ui-core.js';
import {
  logout,
  handleLoginSubmit,
  checkAgeLimitations,
  handleRegistrationSubmit,
} from './auth.js';
import { switchRole } from './role-switcher.js';
import { openStudentSection, closeStudentSection } from './router.js';
import { readActiveBookWithAi, controlAudiobook } from './books.js';
import { selectQuizOption, submitQuizAnswer } from './quizzes.js';
import { toggleAudioRecording } from './recording.js';
import {
  toggleBrailleKeyboard,
  toggleBrailleDot,
  enterBrailleChar,
  clearBrailleDots,
  addSpaceToAnswer,
  deleteLastChar,
  toggleCheatDot,
  pronounceCheatBraille,
  clearCheatDots,
} from './braille-input.js';
import { initGame, answerGame } from './audio-game.js';
import {
  startAITutorSpeech,
  askAITutor,
  speakAITutorResponse,
  generateAIQuiz,
  analyzeImageWithGemini,
} from './ai-tutor.js';
import {
  toggleTeacherQuizType,
  handleTeacherAddBook,
  handleTeacherAddQuiz,
} from './teacher-management.js';
import { previewVisionImage, speakVisionResponse } from './vision.js';
import { updateProxyStatus } from './proxy.js';

/**
 * @param {Object} deps
 * @param {() => void} deps.summarizeCurriculumBookWithAI
 * @param {() => void} deps.translateAndEvaluateBrailleWithAI
 * @param {(e: Event) => void} deps.handleAdminCreateStudent
 * @returns {void}
 */
export function bindAllEvents({
  summarizeCurriculumBookWithAI,
  translateAndEvaluateBrailleWithAI,
  handleAdminCreateStudent,
}) {
  document.getElementById('tts-engine-toggle')?.addEventListener('click', toggleTtsEngine);
  document.getElementById('audio-co-pilot-toggle')?.addEventListener('click', toggleAudioCoPilot);

  document.querySelectorAll('[data-theme]').forEach((btn) => {
    const b = /** @type {HTMLElement} */ (btn);
    b.addEventListener('click', () => setTheme(b.dataset.theme));
  });

  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    setCurrentLang(getCurrentLang() === 'ar' ? 'en' : 'ar');
  });

  document.querySelectorAll('[data-size-dir]').forEach((btn) => {
    const b = /** @type {HTMLElement} */ (btn);
    b.addEventListener('click', () => adjustTextSize(parseInt(b.dataset.sizeDir)));
  });

  document.getElementById('btn-help-shortcuts')?.addEventListener('click', showKeyboardHelp);
  document.getElementById('btn-notifications')?.addEventListener('click', showNotificationsPanel);
  document.querySelector('[data-action="logout"]')?.addEventListener('click', logout);
  document
    .querySelector('[data-action="login-form"]')
    ?.addEventListener('submit', handleLoginSubmit);

  document.getElementById('btn-show-register')?.addEventListener('click', () => {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.remove('hidden');
    document.getElementById('auth-warning-box').classList.add('hidden');
    window.speak(window.__('registerFormOpen'));
  });
  document.getElementById('btn-show-login')?.addEventListener('click', () => {
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('login-form-container').classList.remove('hidden');
    document.getElementById('auth-warning-box').classList.add('hidden');
    window.speak(window.__('backToLogin'));
  });

  /** @type {HTMLSelectElement|null} */ (document.getElementById('reg-role'))?.addEventListener(
    'change',
    toggleRegFields,
  );
  document.getElementById('reg-age')?.addEventListener('input', checkAgeLimitations);
  document
    .querySelector('[data-action="auth-form"]')
    ?.addEventListener('submit', handleRegistrationSubmit);

  document.querySelectorAll('[data-role-switch]').forEach((btn) => {
    const b = /** @type {HTMLElement} */ (btn);
    b.addEventListener('click', () => switchRole(b.dataset.roleSwitch));
  });

  document.querySelectorAll('[data-student-section]').forEach((btn) => {
    const b = /** @type {HTMLElement} */ (btn);
    b.addEventListener('click', () => openStudentSection(b.dataset.studentSection));
  });
  document
    .querySelector('[data-action="close-section"]')
    ?.addEventListener('click', closeStudentSection);

  document
    .querySelector('[data-action="audiobook-tts"]')
    ?.addEventListener('click', readActiveBookWithAi);
  document
    .querySelector('[data-action="summarize-book"]')
    ?.addEventListener('click', summarizeCurriculumBookWithAI);
  document
    .querySelector('[data-action="audiobook-stop"]')
    ?.addEventListener('click', () => controlAudiobook('stop'));

  ['A', 'B', 'C', 'D'].forEach((opt) => {
    document
      .getElementById(`btn-opt-${opt}`)
      ?.addEventListener('click', () => selectQuizOption(opt));
  });
  document
    .querySelector('[data-action="submit-quiz"]')
    ?.addEventListener('click', submitQuizAnswer);

  document.getElementById('btn-mic-input')?.addEventListener('click', toggleAudioRecording);
  document.getElementById('btn-ai-mic')?.addEventListener('click', toggleAudioRecording);

  document
    .querySelector('[data-action="toggle-screen-braille"]')
    ?.addEventListener('click', () => toggleBrailleKeyboard('screen'));
  document
    .querySelector('[data-action="toggle-perkins"]')
    ?.addEventListener('click', () => toggleBrailleKeyboard('perkins'));
  document
    .querySelector('[data-action="braille-evaluate"]')
    ?.addEventListener('click', translateAndEvaluateBrailleWithAI);

  document
    .getElementById('btn-screen-reader-mode')
    ?.addEventListener('click', toggleScreenReaderMode);

  const savedProxyUrl = localStorage.getItem('cloudSchoolProxyUrl');
  const proxyUrlInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById('proxy-url-input')
  );
  if (proxyUrlInput) {
    proxyUrlInput.value = savedProxyUrl || 'http://localhost:3001';
  }
  updateProxyStatus();

  document.getElementById('btn-save-proxy-url')?.addEventListener('click', () => {
    const val = /** @type {HTMLInputElement|null} */ (
      document.getElementById('proxy-url-input')
    )?.value.trim();
    if (val) {
      localStorage.setItem('cloudSchoolProxyUrl', val);
      updateProxyStatus();
      window.speak(window.__('proxyUrlSaved'));
    }
  });
  document.getElementById('btn-reset-proxy-url')?.addEventListener('click', () => {
    localStorage.removeItem('cloudSchoolProxyUrl');
    if (proxyUrlInput) {
      proxyUrlInput.value = 'http://localhost:3001';
    }
    updateProxyStatus();
    window.speak(window.__('proxyUrlReset'));
  });

  for (let i = 1; i <= 6; i++) {
    document.getElementById(`dot-${i}`)?.addEventListener('click', () => toggleBrailleDot(i));
  }
  document
    .querySelector('[data-action="enter-braille"]')
    ?.addEventListener('click', enterBrailleChar);
  document
    .querySelector('[data-action="clear-braille"]')
    ?.addEventListener('click', clearBrailleDots);
  document.querySelector('[data-action="add-space"]')?.addEventListener('click', addSpaceToAnswer);
  document.querySelector('[data-action="delete-char"]')?.addEventListener('click', deleteLastChar);

  for (let i = 1; i <= 6; i++) {
    document.getElementById(`cheat-dot-${i}`)?.addEventListener('click', () => toggleCheatDot(i));
  }
  document
    .querySelector('[data-action="pronounce-cheat"]')
    ?.addEventListener('click', pronounceCheatBraille);
  document.querySelector('[data-action="clear-cheat"]')?.addEventListener('click', clearCheatDots);

  document.querySelectorAll('[data-game-type]').forEach((btn) => {
    const b = /** @type {HTMLElement} */ (btn);
    b.addEventListener('click', () => initGame(b.dataset.gameType));
  });
  document
    .querySelector('[data-action="answer-true"]')
    ?.addEventListener('click', () => answerGame(true));
  document
    .querySelector('[data-action="answer-false"]')
    ?.addEventListener('click', () => answerGame(false));

  document
    .querySelector('[data-action="ai-tutor-speech"]')
    ?.addEventListener('click', startAITutorSpeech);
  document.querySelector('[data-action="ask-ai"]')?.addEventListener('click', askAITutor);
  document
    .querySelector('[data-action="speak-ai-response"]')
    ?.addEventListener('click', speakAITutorResponse);

  document.getElementById('teacher-quiz-type')?.addEventListener('change', toggleTeacherQuizType);
  document
    .querySelector('[data-action="generate-ai-quiz"]')
    ?.addEventListener('click', generateAIQuiz);
  document
    .querySelector('[data-action="teacher-book-form"]')
    ?.addEventListener('submit', handleTeacherAddBook);
  document
    .querySelector('[data-action="teacher-quiz-form"]')
    ?.addEventListener('submit', handleTeacherAddQuiz);

  document
    .querySelector('[data-action="admin-student-form"]')
    ?.addEventListener('submit', handleAdminCreateStudent);

  document.getElementById('vision-image-input')?.addEventListener('change', previewVisionImage);
  document
    .querySelector('[data-action="analyze-image"]')
    ?.addEventListener('click', analyzeImageWithGemini);
  document
    .querySelector('[data-action="speak-vision"]')
    ?.addEventListener('click', speakVisionResponse);
}
