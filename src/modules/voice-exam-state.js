// @ts-check
export let voiceExamActive = false;
export let voiceExamListening = false;
export let voiceExamQuizId = null;

export function setVoiceExamActive(val) {
  voiceExamActive = val;
}

export function setVoiceExamListening(val) {
  voiceExamListening = val;
}

export function setVoiceExamQuizId(val) {
  voiceExamQuizId = val;
}

export function updateVoiceExamStatus(text) {
  const el = document.getElementById('voice-exam-status');
  if (el) {
    el.textContent = text;
  }
}
