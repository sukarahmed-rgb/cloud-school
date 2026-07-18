import {
  startStudyGroup,
  stopStudyGroup,
  handleStudyGroupSpeech,
  skipStudyGroupTurn,
} from '../../src/modules/study-groups.js';
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
  feedback: 'إجابة جيدة',
  nextSpeaker: 'فهد',
  question: 'ما هو حاصل 2+2؟',
  type: 'discussion',
});

beforeEach(() => {
  document.body.innerHTML = `
    <div id="btn-study-group-start"></div>
    <div id="btn-study-group-stop" class="hidden"></div>
    <div id="study-group-conversation" class="hidden"></div>
    <div id="study-group-voice-status"></div>
    <div id="study-group-status-text"></div>
    <div id="study-group-transcript"></div>
    <input id="study-group-topic" value="الرياضيات" />
  `;
  window.escapeHtml = (s) => String(s);
  Element.prototype.scrollIntoView = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  stopStudyGroup();
});

describe('study-groups.js - stopStudyGroup', () => {
  test('stops running, updates DOM and calls stopSpeechRecognition', () => {
    stopStudyGroup();
    expect(stopSpeechRecognition).toHaveBeenCalled();
    expect(document.getElementById('btn-study-group-start').classList.contains('hidden')).toBe(
      false,
    );
    expect(document.getElementById('btn-study-group-stop').classList.contains('hidden')).toBe(true);
    expect(speak).toHaveBeenCalled();
  });

  test('is idempotent', () => {
    stopStudyGroup();
    stopStudyGroup();
    expect(stopSpeechRecognition).toHaveBeenCalledTimes(2);
  });
});

describe('study-groups.js - handleStudyGroupSpeech', () => {
  test('does nothing when not running', () => {
    expect(() => handleStudyGroupSpeech()).not.toThrow();
  });
});

describe('study-groups.js - skipStudyGroupTurn', () => {
  test('does nothing when not running', () => {
    expect(() => skipStudyGroupTurn()).not.toThrow();
  });
});

describe('study-groups.js - UI helpers', () => {
  test('updateStudyGroupStatus updates status bar', () => {
    stopStudyGroup();
    const statusBar = document.getElementById('study-group-status-text');
    expect(statusBar.textContent).toBeTruthy();
  });
});

describe('study-groups.js - startStudyGroup', () => {
  test('sets up UI and runs first AI turn', async () => {
    callGeminiAPI.mockResolvedValue(MOCK_GEMINI_RESPONSE);

    const promise = startStudyGroup();

    expect(document.getElementById('btn-study-group-start').classList.contains('hidden')).toBe(
      true,
    );
    expect(document.getElementById('btn-study-group-stop').classList.contains('hidden')).toBe(
      false,
    );
    expect(document.getElementById('study-group-conversation').classList.contains('hidden')).toBe(
      false,
    );

    await promise;
    expect(callGeminiAPI).toHaveBeenCalled();
    expect(speak).toHaveBeenCalled();
  });

  test('does nothing if already running', async () => {
    callGeminiAPI.mockResolvedValue(MOCK_GEMINI_RESPONSE);

    const promise = startStudyGroup();
    await promise;

    const second = startStudyGroup();
    await expect(second).resolves.toBeUndefined();
  });
});
