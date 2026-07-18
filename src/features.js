// @ts-check
import { speak } from './modules/speech.js';
import { __ } from './modules/i18n.js';
import {
  initSpeechRecognition,
  startMicrophone,
  listenForSpeech,
} from './modules/speech-recognition.js';

// ===================== Lazy-loading wrappers =====================
async function _lazyDialogic() {
  return import('./modules/dialogic-learning.js');
}
async function _lazyStudyGroups() {
  return import('./modules/study-groups.js');
}
async function _lazyVoiceExams() {
  return import('./modules/voice-exams.js');
}

export async function startDialogicClassroom() {
  const m = await _lazyDialogic();
  return m.startDialogicClassroom.apply(this, arguments);
}
export async function stopDialogicClassroom() {
  const m = await _lazyDialogic();
  return m.stopDialogicClassroom.apply(this, arguments);
}
async function triggerDialogicAnswer() {
  const m = await _lazyDialogic();
  return m.triggerDialogicAnswer.apply(this, arguments);
}

export async function startStudyGroup() {
  const m = await _lazyStudyGroups();
  return m.startStudyGroup.apply(this, arguments);
}
export async function stopStudyGroup() {
  const m = await _lazyStudyGroups();
  return m.stopStudyGroup.apply(this, arguments);
}
async function handleStudyGroupSpeech() {
  const m = await _lazyStudyGroups();
  return m.handleStudyGroupSpeech.apply(this, arguments);
}
async function skipStudyGroupTurn() {
  const m = await _lazyStudyGroups();
  return m.skipStudyGroupTurn.apply(this, arguments);
}

export async function toggleVoiceExamMode() {
  const m = await _lazyVoiceExams();
  return m.toggleVoiceExamMode.apply(this, arguments);
}
export async function readCurrentQuizAloud() {
  const m = await _lazyVoiceExams();
  return m.readCurrentQuizAloud.apply(this, arguments);
}
export async function startVoiceExamListening() {
  const m = await _lazyVoiceExams();
  return m.startVoiceExamListening.apply(this, arguments);
}
export async function confirmVoiceSubmit() {
  const m = await _lazyVoiceExams();
  return m.confirmVoiceSubmit.apply(this, arguments);
}
export async function doVoiceSubmit() {
  const m = await _lazyVoiceExams();
  return m.doVoiceSubmit.apply(this, arguments);
}
export async function updateVoiceExamStatus() {
  const m = await _lazyVoiceExams();
  return m.updateVoiceExamStatus.apply(this, arguments);
}

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
    speakBtn.addEventListener('click', async function () {
      document.getElementById('dialogic-voice-status').textContent = __('dialogicSpeakNow');
      await triggerDialogicAnswer();
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

export { initSpeechRecognition, startMicrophone, listenForSpeech };
