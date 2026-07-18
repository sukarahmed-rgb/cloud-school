// @ts-check
import { voiceExamActive, setVoiceExamQuizId } from './voice-exam-state.js';
import { readCurrentQuizAloud } from './voice-exam-listening.js';
import { toggleVoiceExamMode } from './voice-exam-mode.js';
import {
  startVoiceExamListening,
  confirmVoiceSubmit,
  doVoiceSubmit,
} from './voice-exam-listening.js';
import { updateVoiceExamStatus } from './voice-exam-state.js';

const _origStartQuiz = typeof startQuiz === 'function' ? startQuiz : null;
if (typeof startQuiz === 'function') {
  window.startQuiz = function (quizId) {
    _origStartQuiz(quizId);
    setVoiceExamQuizId(quizId);
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
