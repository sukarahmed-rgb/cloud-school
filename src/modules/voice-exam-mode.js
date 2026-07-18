// @ts-check
import { speak } from './speech.js';
import { __ } from './i18n.js';
import { stopSpeechRecognition } from './speech-recognition.js';
import { voiceExamActive, setVoiceExamActive, setVoiceExamListening } from './voice-exam-state.js';
import { readCurrentQuizAloud } from './voice-exam-listening.js';

export function toggleVoiceExamMode() {
  const toggleBtn = document.getElementById('btn-voice-exam-toggle');
  const statusEl = document.getElementById('voice-exam-status');

  if (voiceExamActive) {
    setVoiceExamActive(false);
    setVoiceExamListening(false);
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

  setVoiceExamActive(true);
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
