// @ts-check
import { speak } from './modules/speech.js';
import { __ } from './modules/i18n.js';
import {
  initSpeechRecognition,
  startMicrophone,
  listenForSpeech,
} from './modules/speech-recognition.js';
import {
  startDialogicClassroom,
  stopDialogicClassroom,
  triggerDialogicAnswer,
} from './modules/dialogic-learning.js';
import {
  startStudyGroup,
  stopStudyGroup,
  handleStudyGroupSpeech,
  skipStudyGroupTurn,
} from './modules/study-groups.js';
import {
  toggleVoiceExamMode,
  readCurrentQuizAloud,
  startVoiceExamListening,
  confirmVoiceSubmit,
  doVoiceSubmit,
  updateVoiceExamStatus,
} from './modules/voice-exams.js';

// ===================== ربط مع الميزات القديمة =====================
window.speechRecognizer = {
  start: function () {
    speak(__('speakAfterBeep'));
    listenForSpeech(function (text) {
      if (text && text.trim()) {
        const queryField = /** @type {HTMLInputElement|null} */ (
          document.getElementById('ai-tutor-query')
        );
        if (queryField) {
          queryField.value = text;
          const askBtn = document.getElementById('btn-ask-ai');
          if (askBtn) {
            askBtn.click();
          }
        }
      } else {
        speak(__('micRetry'));
      }
    }, 15000);
  },
};

// ===================== ربط الأزرار =====================
document.addEventListener('DOMContentLoaded', function () {
  const startBtn = document.getElementById('btn-dialogic-start');
  const stopBtn = document.getElementById('btn-dialogic-stop');
  const speakBtn = document.getElementById('btn-dialogic-speak');

  if (startBtn) {
    startBtn.addEventListener('click', startDialogicClassroom);
  }
  if (stopBtn) {
    stopBtn.addEventListener('click', stopDialogicClassroom);
  }
  if (speakBtn) {
    speakBtn.addEventListener('click', function () {
      document.getElementById('dialogic-voice-status').textContent = __('dialogicSpeakNow');
      triggerDialogicAnswer();
    });
  }

  const sgStartBtn = document.getElementById('btn-study-group-start');
  const sgStopBtn = document.getElementById('btn-study-group-stop');
  const sgSpeakBtn = document.getElementById('btn-study-group-speak');
  const sgNextBtn = document.getElementById('btn-study-group-next');

  if (sgStartBtn) {
    sgStartBtn.addEventListener('click', startStudyGroup);
  }
  if (sgStopBtn) {
    sgStopBtn.addEventListener('click', stopStudyGroup);
  }
  if (sgSpeakBtn) {
    sgSpeakBtn.addEventListener('click', handleStudyGroupSpeech);
  }
  if (sgNextBtn) {
    sgNextBtn.addEventListener('click', skipStudyGroupTurn);
  }

  const voiceExamToggleBtn = document.getElementById('btn-voice-exam-toggle');
  if (voiceExamToggleBtn) {
    voiceExamToggleBtn.addEventListener('click', toggleVoiceExamMode);
  }
});

export {
  initSpeechRecognition,
  startMicrophone,
  listenForSpeech,
  startDialogicClassroom,
  stopDialogicClassroom,
  startStudyGroup,
  stopStudyGroup,
  toggleVoiceExamMode,
  readCurrentQuizAloud,
  startVoiceExamListening,
  confirmVoiceSubmit,
  doVoiceSubmit,
  updateVoiceExamStatus,
};
