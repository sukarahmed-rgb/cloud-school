import {
  configureAiTutor,
  askAITutor,
  speakAITutorResponse,
  startAITutorSpeech,
} from '../../src/modules/ai-tutor.js';
import { callGeminiAPI } from '../../src/modules/ai-utils.js';

jest.mock('../../src/modules/ai-utils.js', () => ({
  callGeminiAPI: jest.fn(),
}));

describe('ai-tutor.js', () => {
  let ctx;
  let queryInput;
  let responseBox;
  let responseText;

  beforeEach(() => {
    document.body.innerHTML = `
      <input id="ai-tutor-query" value="" />
      <div id="ai-tutor-response-box" class="hidden">
        <div id="ai-tutor-response-text"></div>
      </div>
    `;
    queryInput = document.getElementById('ai-tutor-query');
    responseBox = document.getElementById('ai-tutor-response-box');
    responseText = document.getElementById('ai-tutor-response-text');

    ctx = {
      __: jest.fn((key) => {
        const map = {
          tutorAskFirst: 'ask something first',
          loadingTutor: 'loading',
          tutorThinking: 'thinking',
          tutorError: 'error',
        };
        return map[key] || key;
      }),
      speak: jest.fn(),
      showLoading: jest.fn(),
      getCurrentLang: jest.fn(() => 'ar'),
      getPrompt: jest.fn(() => 'system prompt'),
    };

    callGeminiAPI.mockReset();
  });

  test('configureAiTutor sets context', () => {
    const fakeCtx = { test: true };
    configureAiTutor(fakeCtx);
    expect(fakeCtx.test).toBe(true);
  });

  test('askAITutor bails out when query is empty', async () => {
    configureAiTutor(ctx);
    queryInput.value = '';
    await askAITutor();
    expect(ctx.speak).toHaveBeenCalledWith('ask something first');
    expect(callGeminiAPI).not.toHaveBeenCalled();
  });

  test('askAITutor shows response and speaks on success', async () => {
    configureAiTutor(ctx);
    queryInput.value = 'ما هو الماء؟';
    callGeminiAPI.mockResolvedValue('الماء سائل شفاف');
    await askAITutor();
    expect(responseBox.classList.contains('hidden')).toBe(false);
    expect(responseText.textContent).toBe('الماء سائل شفاف');
    expect(ctx.speak).toHaveBeenCalledWith('الماء سائل شفاف');
  });

  test('askAITutor shows error message on failure', async () => {
    configureAiTutor(ctx);
    queryInput.value = 'ما هو الضوء؟';
    callGeminiAPI.mockRejectedValue(new Error('API error'));
    await askAITutor();
    expect(responseText.textContent).toBe('error');
  });

  test('speakAITutorResponse reads response text aloud', () => {
    configureAiTutor(ctx);
    responseText.textContent = 'جواب المدرس الخصوصي';
    speakAITutorResponse();
    expect(ctx.speak).toHaveBeenCalledWith('جواب المدرس الخصوصي');
  });

  test('startAITutorSpeech calls speech recognizer start', () => {
    const mockRecognizer = { start: jest.fn() };
    ctx.getSpeechRecognizer = jest.fn(() => mockRecognizer);
    configureAiTutor(ctx);
    startAITutorSpeech();
    expect(mockRecognizer.start).toHaveBeenCalled();
  });

  test('startAITutorSpeech falls back when recognizer unavailable', () => {
    ctx.getSpeechRecognizer = jest.fn(() => null);
    ctx.__ = jest.fn(() => 'speech unavailable');
    configureAiTutor(ctx);
    startAITutorSpeech();
    expect(ctx.speak).toHaveBeenCalledWith('speech unavailable');
  });

  test('functions bail out when ctx is null', async () => {
    configureAiTutor(null);
    queryInput.value = 'test';
    await askAITutor();
    expect(callGeminiAPI).not.toHaveBeenCalled();
  });
});
