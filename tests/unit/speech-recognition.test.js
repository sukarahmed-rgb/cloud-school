import {
  initSpeechRecognition,
  startMicrophone,
  listenForSpeech,
  stopSpeechRecognition,
  waitForSpeechEnd,
} from '../../src/modules/speech-recognition.js';

jest.mock('../../src/modules/speech.js', () => ({ speak: jest.fn() }));
jest.mock('../../src/modules/i18n.js', () => ({ __: jest.fn((k) => k) }));

describe('speech-recognition.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initSpeechRecognition returns null when SpeechRecognition unavailable', () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    const rec = initSpeechRecognition();
    expect(rec).toBeNull();
  });

  test('initSpeechRecognition creates instance when available', () => {
    window.SpeechRecognition = jest.fn().mockImplementation(() => ({
      lang: '',
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
    }));
    const rec = initSpeechRecognition();
    expect(rec).toBeTruthy();
    expect(rec.lang).toBe('ar-EG');
  });

  test('startMicrophone returns null when SpeechRecognition unavailable', () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    const rec = startMicrophone();
    expect(rec).toBeNull();
  });

  test('startMicrophone starts recognition', () => {
    const startMock = jest.fn();
    window.SpeechRecognition = jest.fn().mockImplementation(() => ({
      start: startMock,
      lang: '',
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
    }));
    const rec = startMicrophone();
    expect(startMock).toHaveBeenCalled();
    expect(rec).toBeTruthy();
  });

  test('listenForSpeech calls startMicrophone', () => {
    jest.isolateModules(() => {
      const startMock = jest.fn();
      window.SpeechRecognition = jest.fn().mockImplementation(() => ({
        start: startMock,
        lang: '',
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
      }));
      const { listenForSpeech: listen } = require('../../src/modules/speech-recognition.js');
      const callback = jest.fn();
      listen(callback, 100);
      expect(startMock).toHaveBeenCalled();
    });
  });

  test('stopSpeechRecognition does not throw', () => {
    expect(() => stopSpeechRecognition()).not.toThrow();
  });

  test('waitForSpeechEnd resolves after ms', async () => {
    const before = Date.now();
    await waitForSpeechEnd(5);
    const after = Date.now();
    expect(after - before).toBeGreaterThanOrEqual(4);
  });
});
