import { toggleVoiceExamMode } from '../../src/modules/voice-exam-mode.js';
import {
  voiceExamActive,
  voiceExamListening,
  setVoiceExamActive,
  setVoiceExamListening,
} from '../../src/modules/voice-exam-state.js';

jest.mock('../../src/modules/speech.js', () => ({ speak: jest.fn() }));
jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((key) => {
    const map = {
      voiceExamActivate: 'Activate',
      voiceExamDeactivate: 'Deactivate',
      voiceExamModeActive: 'Active',
      voiceExamModeInactive: 'Inactive',
      voiceExamNoQuiz: 'No quiz',
      voiceExamNotAvailable: 'Not available',
    };
    return map[key] || key;
  }),
}));
jest.mock('../../src/modules/speech-recognition.js', () => ({ stopSpeechRecognition: jest.fn() }));

describe('voice-exam-mode.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btn-voice-exam-toggle">Activate</button>
      <div id="voice-exam-status">Inactive</div>
      <div id="active-quiz-panel" class="">
        <div id="active-quiz-title">Quiz 1</div>
      </div>
    `;
    jest.useFakeTimers();
    setVoiceExamActive(false);
    setVoiceExamListening(false);
    delete window.webkitSpeechRecognition;
    delete window.SpeechRecognition;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('deactivates when already active', () => {
    setVoiceExamActive(true);
    const btn = document.getElementById('btn-voice-exam-toggle');
    toggleVoiceExamMode();
    expect(voiceExamActive).toBe(false);
    expect(voiceExamListening).toBe(false);
    expect(btn.textContent).toBe('Activate');
    expect(btn.classList.contains('bg-yellow-500')).toBe(true);
    expect(document.getElementById('voice-exam-status').textContent).toBe('Inactive');
  });

  test('refuses activation when quiz panel is hidden', () => {
    document.getElementById('active-quiz-panel').classList.add('hidden');
    toggleVoiceExamMode();
    expect(voiceExamActive).toBe(false);
  });

  test('refuses activation when SpeechRecognition unavailable', () => {
    toggleVoiceExamMode();
    expect(voiceExamActive).toBe(false);
  });

  test('activates when quiz panel visible and SpeechRecognition available', () => {
    window.SpeechRecognition = function () {};
    toggleVoiceExamMode();
    expect(voiceExamActive).toBe(true);
    const btn = document.getElementById('btn-voice-exam-toggle');
    expect(btn.textContent).toBe('Deactivate');
    expect(btn.classList.contains('bg-red-600')).toBe(true);
    expect(document.getElementById('voice-exam-status').textContent).toBe('Active');
  });
});
