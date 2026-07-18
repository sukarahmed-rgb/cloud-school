import {
  startDialogicClassroom,
  stopDialogicClassroom,
  triggerDialogicAnswer,
} from '../../src/modules/dialogic-learning.js';
import {
  stopSpeechRecognition,
  listenForSpeech,
  waitForSpeechEnd,
} from '../../src/modules/speech-recognition.js';
import { callGeminiAPI } from '../../src/modules/ai-utils.js';
import { speak } from '../../src/modules/speech.js';
import { __ } from '../../src/modules/i18n.js';

jest.mock('../../src/modules/speech.js', () => ({ speak: jest.fn() }));
jest.mock('../../src/modules/i18n.js', () => ({ __: jest.fn((k) => k) }));
jest.mock('../../src/modules/ai-utils.js', () => ({ callGeminiAPI: jest.fn() }));
jest.mock('../../src/modules/speech-recognition.js', () => ({
  listenForSpeech: jest.fn(),
  stopSpeechRecognition: jest.fn(),
  waitForSpeechEnd: jest.fn(),
}));

const MOCK_GEMINI_RESPONSE = JSON.stringify({
  assessment: 'ممتاز',
  explanation: 'أحسنت',
  question: 'ما هو حاصل 2+2؟',
  type: 'open',
});

beforeEach(() => {
  document.body.innerHTML = `
    <div id="btn-dialogic-start"></div>
    <div id="btn-dialogic-stop" class="hidden"></div>
    <div id="dialogic-conversation" class="hidden"></div>
    <div id="dialogic-status-text"></div>
    <div id="dialogic-voice-status"></div>
    <div id="dialogic-transcript"></div>
  `;
  window.escapeHtml = (s) => String(s);
  Element.prototype.scrollIntoView = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  stopDialogicClassroom();
});

describe('dialogic-learning.js - stopDialogicClassroom', () => {
  test('stops running, updates DOM and calls stopSpeechRecognition', () => {
    stopDialogicClassroom();
    expect(stopSpeechRecognition).toHaveBeenCalled();
    expect(document.getElementById('btn-dialogic-start').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('btn-dialogic-stop').classList.contains('hidden')).toBe(true);
    expect(speak).toHaveBeenCalled();
  });

  test('is idempotent', () => {
    stopDialogicClassroom();
    stopDialogicClassroom();
    expect(stopSpeechRecognition).toHaveBeenCalledTimes(2);
  });
});

describe('dialogic-learning.js - triggerDialogicAnswer', () => {
  test('does nothing when dialogicRunning is false', () => {
    expect(() => triggerDialogicAnswer()).not.toThrow();
  });
});

describe('dialogic-learning.js - addDialogicEntry', () => {
  test('transcript is empty initially', () => {
    const transcript = document.getElementById('dialogic-transcript');
    expect(transcript.children.length).toBe(0);
  });
});

describe('dialogic-learning.js - startDialogicClassroom', () => {
  test('sets up UI and waits for subject', async () => {
    callGeminiAPI.mockResolvedValue(MOCK_GEMINI_RESPONSE);

    const promise = startDialogicClassroom();

    expect(document.getElementById('btn-dialogic-start').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('btn-dialogic-stop').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('dialogic-conversation').classList.contains('hidden')).toBe(
      false,
    );
    expect(listenForSpeech).toHaveBeenCalledTimes(1);

    listenForSpeech.mock.calls[0][0]('الرياضيات');
    await promise;
  });

  test('runs first AI turn when subject is provided', async () => {
    callGeminiAPI.mockResolvedValue(MOCK_GEMINI_RESPONSE);

    const promise = startDialogicClassroom();
    listenForSpeech.mock.calls[0][0]('الرياضيات');
    await promise;

    expect(callGeminiAPI).toHaveBeenCalled();
    expect(speak).toHaveBeenCalled();
    const transcript = document.getElementById('dialogic-transcript');
    expect(transcript.children.length).toBeGreaterThanOrEqual(2);
  });

  test('does nothing if already running', async () => {
    callGeminiAPI.mockResolvedValue(MOCK_GEMINI_RESPONSE);

    const promise = startDialogicClassroom();
    listenForSpeech.mock.calls[0][0]('الرياضيات');
    await promise;

    const second = startDialogicClassroom();
    await expect(second).resolves.toBeUndefined();
  });
});
