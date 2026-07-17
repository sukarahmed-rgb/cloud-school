// @ts-check
import { speak } from './speech.js';
import { __ } from './i18n.js';
import { listenForSpeech, stopSpeechRecognition } from './speech-recognition.js';

let voiceExamActive = false;
let voiceExamListening = false;
let voiceExamQuizId = null;

function toggleVoiceExamMode() {
  const toggleBtn = document.getElementById('btn-voice-exam-toggle');
  const statusEl = document.getElementById('voice-exam-status');

  if (voiceExamActive) {
    voiceExamActive = false;
    voiceExamListening = false;
    stopSpeechRecognition();
    if (toggleBtn) {
      toggleBtn.textContent = __('voiceExamActivate');
      toggleBtn.classList.remove('bg-red-600', 'animate-pulse');
      toggleBtn.classList.add('bg-yellow-500');
    }
    if (statusEl) {
      statusEl.textContent = __('voiceExamModeInactive');
    }
    speak(__('voiceExamModeInactive'));
    return;
  }

  const quizPanel = document.getElementById('active-quiz-panel');
  if (!quizPanel || quizPanel.classList.contains('hidden')) {
    speak(__('voiceExamNoQuiz'));
    return;
  }

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    speak(__('voiceExamNotAvailable'));
    return;
  }

  voiceExamActive = true;
  if (toggleBtn) {
    toggleBtn.textContent = __('voiceExamDeactivate');
    toggleBtn.classList.remove('bg-yellow-500');
    toggleBtn.classList.add('bg-red-600', 'animate-pulse');
  }
  if (statusEl) {
    statusEl.textContent = __('voiceExamModeActive');
  }
  speak(__('voiceExamModeActive'));

  setTimeout(function () {
    readCurrentQuizAloud();
  }, 1000);
}

function readCurrentQuizAloud() {
  if (!voiceExamActive) {
    return;
  }

  const quizTitle = document.getElementById('active-quiz-title');
  const questionText = document.getElementById('quiz-question-text');
  const quizContainer = document.getElementById('quiz-question-container');
  const textSection = document.getElementById('quiz-text-input-section');

  if (quizTitle) {
    speak(quizTitle.textContent);
  }
  if (questionText && !quizContainer.classList.contains('hidden')) {
    speak(questionText.textContent);

    const options = [];
    const optA = document.querySelector('#btn-opt-A span');
    const optB = document.querySelector('#btn-opt-B span');
    const optC = document.querySelector('#btn-opt-C span');
    const optD = document.querySelector('#btn-opt-D span');
    if (optA) {
      options.push(optA.textContent);
    }
    if (optB) {
      options.push(optB.textContent);
    }
    if (optC) {
      options.push(optC.textContent);
    }
    if (optD) {
      options.push(optD.textContent);
    }

    if (options.length > 0) {
      setTimeout(function () {
        speak(__('voiceExamOptions', options.join(' ، ')));
        setTimeout(function () {
          startVoiceExamListening();
        }, 2000);
      }, 1500);
    } else {
      setTimeout(function () {
        startVoiceExamListening();
      }, 1500);
    }
  } else if (textSection && !textSection.classList.contains('hidden')) {
    speak(__('voiceExamEssayPrompt'));
    setTimeout(function () {
      updateVoiceExamStatus(__('voiceExamListening'));
      listenForSpeech(function (essayText) {
        if (!voiceExamActive) {
          return;
        }
        if (essayText && essayText.trim()) {
          const ansField = /** @type {HTMLTextAreaElement|null} */ (
            document.getElementById('assignment-student-answer')
          );
          if (ansField) {
            ansField.value = essayText.trim();
          }
          speak(__('voiceExamEssayRecorded'));
        }
        setTimeout(function () {
          startVoiceExamListening();
        }, 1500);
      }, 30000);
    }, 1500);
  }
}

function startVoiceExamListening() {
  if (!voiceExamActive || voiceExamListening) {
    return;
  }
  voiceExamListening = true;

  const statusEl = document.getElementById('voice-exam-status');
  if (statusEl) {
    statusEl.textContent = __('voiceExamListening');
  }
  speak(__('voiceExamListening'));
  updateVoiceExamStatus(__('voiceExamHelp'));

  listenForSpeech(function (text) {
    voiceExamListening = false;
    if (!voiceExamActive) {
      return;
    }
    if (!text || !text.trim()) {
      speak(__('dialogicRetry'));
      setTimeout(function () {
        startVoiceExamListening();
      }, 1000);
      return;
    }

    const normalized = text.trim().toLowerCase();
    const statusEl = document.getElementById('voice-exam-status');
    if (statusEl) {
      statusEl.textContent = __('voiceExamHeard', normalized);
    }

    if (
      normalized === __('voiceExamCommandRepeat') ||
      normalized === 'repeat' ||
      normalized === 'كرر' ||
      normalized === 'اعادة'
    ) {
      speak(__('voiceExamRepeat'));
      setTimeout(function () {
        readCurrentQuizAloud();
      }, 1000);
      return;
    }

    if (
      normalized === __('voiceExamCommandSubmit') ||
      normalized === 'submit' ||
      normalized === 'إرسال' ||
      normalized === 'ارسال'
    ) {
      confirmVoiceSubmit();
      return;
    }

    if (
      normalized === __('voiceExamCommandCancel') ||
      normalized === 'cancel' ||
      normalized === 'إلغاء' ||
      normalized === 'الغاء'
    ) {
      speak(__('voiceExamCancelled'));
      setTimeout(function () {
        startVoiceExamListening();
      }, 1000);
      return;
    }

    if (normalized === __('voiceExamCommandYes') || normalized === 'yes' || normalized === 'نعم') {
      if (window._voiceExamPendingSubmit) {
        window._voiceExamPendingSubmit = false;
        doVoiceSubmit();
        return;
      }
      if (window._voiceExamPendingOption) {
        const opt = window._voiceExamPendingOption;
        window._voiceExamPendingOption = null;
        selectQuizOption(opt);
        speak(__('voiceExamConfirmed'));
        setTimeout(function () {
          startVoiceExamListening();
        }, 1000);
        return;
      }
      setTimeout(function () {
        startVoiceExamListening();
      }, 500);
      return;
    }

    if (normalized === __('voiceExamCommandNo') || normalized === 'no' || normalized === 'لا') {
      window._voiceExamPendingSubmit = false;
      window._voiceExamPendingOption = null;
      speak(__('voiceExamCancelled'));
      setTimeout(function () {
        startVoiceExamListening();
      }, 1000);
      return;
    }

    const quizContainer = document.getElementById('quiz-question-container');
    if (quizContainer && !quizContainer.classList.contains('hidden')) {
      const optionMap = {
        1: 'A',
        2: 'B',
        3: 'C',
        4: 'D',
        أ: 'A',
        ب: 'B',
        ج: 'C',
        د: 'D',
        a: 'A',
        b: 'B',
        c: 'C',
        d: 'D',
        one: 'A',
        two: 'B',
        three: 'C',
        four: 'D',
        واحد: 'A',
        اثنين: 'B',
        ثلاثة: 'C',
        أربعة: 'D',
      };

      const firstWord = normalized.split(' ')[0];
      const matched = optionMap[firstWord] || optionMap[normalized];
      if (matched) {
        window._voiceExamPendingOption = matched;
        speak(__('voiceExamConfirm', __(`opt${matched}`)));
        updateVoiceExamStatus(__('voiceExamConfirm', __(`opt${matched}`)));
        voiceExamListening = true;
        listenForSpeech(function (confirmText) {
          voiceExamListening = false;
          if (!voiceExamActive) {
            return;
          }
          const ct = confirmText ? confirmText.trim().toLowerCase() : '';
          if (ct === __('voiceExamCommandYes') || ct === 'yes' || ct === 'نعم') {
            selectQuizOption(matched);
            speak(__('voiceExamConfirmed'));
            setTimeout(function () {
              startVoiceExamListening();
            }, 1000);
          } else {
            window._voiceExamPendingOption = null;
            speak(__('voiceExamCancelled'));
            setTimeout(function () {
              startVoiceExamListening();
            }, 1000);
          }
        }, 8000);
        return;
      }

      speak(__('voiceExamHelp'));
      setTimeout(function () {
        startVoiceExamListening();
      }, 1000);
      return;
    }

    speak(__('voiceExamEssayRecorded'));
    setTimeout(function () {
      startVoiceExamListening();
    }, 1000);
  }, 15000);
}

function confirmVoiceSubmit() {
  window._voiceExamPendingSubmit = true;
  speak(__('voiceExamSubmitConfirm'));
  updateVoiceExamStatus(__('voiceExamSubmitConfirm'));
  voiceExamListening = true;
  listenForSpeech(function (text) {
    voiceExamListening = false;
    if (!voiceExamActive) {
      return;
    }
    const ct = text ? text.trim().toLowerCase() : '';
    if (ct === __('voiceExamCommandYes') || ct === 'yes' || ct === 'نعم') {
      window._voiceExamPendingSubmit = false;
      doVoiceSubmit();
    } else {
      window._voiceExamPendingSubmit = false;
      speak(__('voiceExamCancelled'));
      setTimeout(function () {
        startVoiceExamListening();
      }, 1000);
    }
  }, 8000);
}

function doVoiceSubmit() {
  if (typeof submitQuizAnswer === 'function') {
    submitQuizAnswer();
    speak(__('voiceExamSubmitted'));
    voiceExamActive = false;
    const toggleBtn = document.getElementById('btn-voice-exam-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = __('voiceExamActivate');
      toggleBtn.classList.remove('bg-red-600', 'animate-pulse');
      toggleBtn.classList.add('bg-yellow-500');
    }
    const statusEl = document.getElementById('voice-exam-status');
    if (statusEl) {
      statusEl.textContent = __('voiceExamSubmitted');
    }
  }
}

function updateVoiceExamStatus(text) {
  const el = document.getElementById('voice-exam-status');
  if (el) {
    el.textContent = text;
  }
}

// Auto-read quiz when started in voice mode
const _origStartQuiz = typeof startQuiz === 'function' ? startQuiz : null;
if (typeof startQuiz === 'function') {
  window.startQuiz = function (quizId) {
    _origStartQuiz(quizId);
    voiceExamQuizId = quizId;
    if (voiceExamActive) {
      setTimeout(function () {
        readCurrentQuizAloud();
      }, 2000);
    }
  };
}

export {
  toggleVoiceExamMode,
  readCurrentQuizAloud,
  startVoiceExamListening,
  confirmVoiceSubmit,
  doVoiceSubmit,
  updateVoiceExamStatus,
};
