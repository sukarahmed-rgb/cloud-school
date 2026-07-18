import {
  voiceExamActive,
  setVoiceExamActive,
  voiceExamListening,
  setVoiceExamListening,
  voiceExamQuizId,
  setVoiceExamQuizId,
  updateVoiceExamStatus,
} from '../../src/modules/voice-exam-state.js';

describe('voice-exam-state.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="voice-exam-status"></div>';
    setVoiceExamActive(false);
    setVoiceExamListening(false);
    setVoiceExamQuizId(null);
  });

  test('voiceExamActive defaults to false', () => {
    expect(voiceExamActive).toBe(false);
  });

  test('setVoiceExamActive toggles state', () => {
    setVoiceExamActive(true);
    expect(voiceExamActive).toBe(true);
    setVoiceExamActive(false);
    expect(voiceExamActive).toBe(false);
  });

  test('voiceExamListening defaults to false', () => {
    expect(voiceExamListening).toBe(false);
  });

  test('setVoiceExamListening toggles state', () => {
    setVoiceExamListening(true);
    expect(voiceExamListening).toBe(true);
  });

  test('voiceExamQuizId defaults to null', () => {
    expect(voiceExamQuizId).toBeNull();
  });

  test('setVoiceExamQuizId sets the quiz id', () => {
    setVoiceExamQuizId('quiz-123');
    expect(voiceExamQuizId).toBe('quiz-123');
  });

  test('updateVoiceExamStatus updates DOM element', () => {
    updateVoiceExamStatus('testing');
    expect(document.getElementById('voice-exam-status').textContent).toBe('testing');
  });

  test('updateVoiceExamStatus does not throw when element missing', () => {
    document.body.innerHTML = '';
    expect(() => updateVoiceExamStatus('test')).not.toThrow();
  });
});
