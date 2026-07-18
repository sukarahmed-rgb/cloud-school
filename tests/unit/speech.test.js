import {
  speak,
  stopAllAudio,
  toggleTtsEngine,
  toggleScreenReaderMode,
  toggleAudioCoPilot,
  setupAccessibleVoices,
  initAudioCoPilot,
  audioCoPilotEnabled,
  ttsEngineMode,
  screenReaderMode,
} from '../../src/modules/speech.js';

jest.mock('../../src/modules/audio-core.js', () => ({
  speakToUser: jest.fn(),
}));

describe('speech.js', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <div id="aria-live"></div>
      <div id="tts-engine-toggle"></div>
      <div id="btn-screen-reader-mode"></div>
      <div id="audio-co-pilot-toggle"></div>
      <button id="view-student"></button>
    `;
    localStorage.clear();
    window.__ = jest.fn((k) => k);
    window.speechSynthesis = { cancel: jest.fn(), speak: jest.fn() };
    window.SpeechSynthesisUtterance = jest.fn(() => ({}));
    window.screenReaderMode = false;
  });

  test('speak sets aria-live text content', () => {
    speak('hello');
    expect(document.getElementById('aria-live').textContent).toBe('hello');
  });

  test('speak does not throw when called', () => {
    expect(() => speak('test')).not.toThrow();
  });

  test('stopAllAudio calls speechSynthesis.cancel', () => {
    stopAllAudio();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  test('toggleTtsEngine toggles between gemini and browser', () => {
    toggleTtsEngine();
    expect(ttsEngineMode).toBe('gemini');
    toggleTtsEngine();
    expect(ttsEngineMode).toBe('browser');
  });

  test('toggleScreenReaderMode toggles screenReaderMode', () => {
    toggleScreenReaderMode();
    expect(screenReaderMode).toBe(true);
    toggleScreenReaderMode();
    expect(screenReaderMode).toBe(false);
  });

  test('toggleAudioCoPilot toggles audioCoPilotEnabled', () => {
    toggleAudioCoPilot();
    expect(audioCoPilotEnabled).toBe(false);
    toggleAudioCoPilot();
    expect(audioCoPilotEnabled).toBe(true);
  });

  test('setupAccessibleVoices does not throw when no interactive elements', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => setupAccessibleVoices()).not.toThrow();
  });

  test('setupAccessibleVoices adds handlers to buttons', () => {
    document.body.innerHTML = '<button id="test-btn">Click me</button>';
    expect(() => setupAccessibleVoices()).not.toThrow();
  });

  test('initAudioCoPilot loads from localStorage', () => {
    initAudioCoPilot();
    expect(audioCoPilotEnabled).toBe(true);
  });
});
