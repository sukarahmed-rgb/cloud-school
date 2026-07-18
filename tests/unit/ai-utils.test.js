import { callGeminiAPI } from '../../src/modules/ai-utils.js';

jest.mock('../../src/modules/gemini-client.js', () => ({
  callGemini: jest.fn(),
}));

jest.mock('../../src/modules/error-handler.js', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../src/modules/books.js', () => ({
  currentlyPlayingBookId: null,
}));

describe('ai-utils.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__ = jest.fn((k) => k);
  });

  test('callGeminiAPI returns result on success', async () => {
    const { callGemini } = require('../../src/modules/gemini-client.js');
    callGemini.mockResolvedValue('AI response');
    const result = await callGeminiAPI('query', 'system prompt');
    expect(result).toBe('AI response');
  });

  test('callGeminiAPI returns error message on failure', async () => {
    const { callGemini } = require('../../src/modules/gemini-client.js');
    callGemini.mockRejectedValue(new Error('fail'));
    const result = await callGeminiAPI('query', 'prompt');
    expect(result).toBe('errorAIConnectionFailed');
  });
});
