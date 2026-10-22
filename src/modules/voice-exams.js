// @ts-check
import { readCurrentQuizAloud } from './voice-exam-listening.js';
import { toggleVoiceExamMode } from './voice-exam-mode.js';
import {
  startVoiceExamListening,
  confirmVoiceSubmit,
  doVoiceSubmit,
} from './voice-exam-listening.js';
import { updateVoiceExamStatus } from './voice-exam-state.js';

export {
  toggleVoiceExamMode,
  readCurrentQuizAloud,
  startVoiceExamListening,
  confirmVoiceSubmit,
  doVoiceSubmit,
  updateVoiceExamStatus,
};
