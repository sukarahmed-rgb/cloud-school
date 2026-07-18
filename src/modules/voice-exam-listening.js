// @ts-check
import { speak } from './speech.js';
import { __ } from './i18n.js';
import { listenForSpeech } from './speech-recognition.js';
import { selectQuizOption, submitQuizAnswer } from './quizzes.js';
import {
  voiceExamActive,
  voiceExamListening,
  setVoiceExamActive,
  setVoiceExamListening,
  updateVoiceExamStatus,
} from './voice-exam-state.js';

export function readCurrentQuizAloud() {
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

export function startVoiceExamListening() {
  if (!voiceExamActive || voiceExamListening) {
    return;
  }
  setVoiceExamListening(true);

  const statusEl = document.getElementById('voice-exam-status');
  if (statusEl) {
    statusEl.textContent = __('voiceExamListening');
  }
  speak(__('voiceExamListening'));
  updateVoiceExamStatus(__('voiceExamHelp'));

  listenForSpeech(function (text) {
    setVoiceExamListening(false);
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
        setVoiceExamListening(true);
        listenForSpeech(function (confirmText) {
          setVoiceExamListening(false);
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

export function confirmVoiceSubmit() {
  window._voiceExamPendingSubmit = true;
  speak(__('voiceExamSubmitConfirm'));
  updateVoiceExamStatus(__('voiceExamSubmitConfirm'));
  setVoiceExamListening(true);
  listenForSpeech(function (text) {
    setVoiceExamListening(false);
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

export function doVoiceSubmit() {
  if (typeof submitQuizAnswer === 'function') {
    submitQuizAnswer();
    speak(__('voiceExamSubmitted'));
    setVoiceExamActive(false);
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
