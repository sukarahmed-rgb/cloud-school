import { state, getAgeLevelDifficulty } from '../../src/modules/games/game-state.js';
import { speak } from '../../src/modules/speech.js';
import { playSuccess3D, playFail3D } from '../../src/modules/spatial-audio.js';
import { callGeminiAPI } from '../../src/modules/ai-utils.js';

jest.mock('../../src/modules/games/game-state.js', () => {
  const actual = jest.requireActual('../../src/modules/games/game-state.js');
  return {
    ...actual,
    getAgeLevelDifficulty: jest.fn(),
    clearGameTimer: jest.fn(),
    endGame: jest.fn(),
  };
});

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
  getPrompt: jest.fn((l, ar) => ar),
  getCurrentLang: jest.fn(() => 'ar'),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
}));

jest.mock('../../src/modules/spatial-audio.js', () => ({
  playSuccess3D: jest.fn(),
  playFail3D: jest.fn(),
}));

jest.mock('../../src/modules/ai-utils.js', () => ({
  callGeminiAPI: jest.fn(),
}));

jest.useFakeTimers();

const MOCK_QUESTIONS = {
  passage: 'A short story about animals.',
  questions: [{ q: 'Q1', options: ['Dog', 'Cat', 'Bird'], correct: 0 }],
};

function setupDOM() {
  document.body.innerHTML = `
    <div id="active-game-panel" class="hidden"></div>
    <div id="game-score">0</div>
    <div id="game-title"></div>
    <div id="game-question"></div>
    <div id="game-timer-wrapper"></div>
    <div id="game-binary-options" class="hidden"></div>
    <div id="game-story-options" class="hidden"></div>
    <div id="game-input-area"></div>
  `;
}

describe('listening-quiz.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDOM();
    Element.prototype.scrollIntoView = jest.fn();
    state.activeGameType = '';
    state.currentGameScore = 0;
    state.currentAIGameData = null;
  });

  test('initListeningQuiz sets up UI', async () => {
    const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
    callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
    initListeningQuiz();
    expect(document.getElementById('active-game-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('game-title').textContent).toBe('gameListeningQuiz');
    expect(document.getElementById('game-binary-options').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('game-story-options').classList.contains('hidden')).toBe(false);
  });

  test('initListeningQuiz handles callGeminiAPI error', async () => {
    const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
    callGeminiAPI.mockRejectedValue(new Error('fail'));
    initListeningQuiz();
    await Promise.resolve();
    await Promise.resolve();
    expect(speak).toHaveBeenCalledWith('gameAIError');
  });

  describe('getListeningLevelText', () => {
    test('uses level-specific prompt for difficulty <= 1', async () => {
      getAgeLevelDifficulty.mockReturnValue(1);
      const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
      callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
      initListeningQuiz();
      const prompt = callGeminiAPI.mock.calls[0][0];
      expect(prompt).toContain('المرحلة الابتدائية');
    });

    test('uses level-specific prompt for difficulty 2', async () => {
      getAgeLevelDifficulty.mockReturnValue(2);
      const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
      callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
      initListeningQuiz();
      const prompt = callGeminiAPI.mock.calls[0][0];
      expect(prompt).toContain('المتوسطة');
    });

    test('uses level-specific prompt for difficulty 3', async () => {
      getAgeLevelDifficulty.mockReturnValue(3);
      const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
      callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
      initListeningQuiz();
      const prompt = callGeminiAPI.mock.calls[0][0];
      expect(prompt).toContain('الثانوية');
    });

    test('uses level-specific prompt for difficulty >= 4', async () => {
      getAgeLevelDifficulty.mockReturnValue(4);
      const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
      callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
      initListeningQuiz();
      const prompt = callGeminiAPI.mock.calls[0][0];
      expect(prompt).toContain('الجامعية');
    });
  });

  describe('showListeningQuestion', () => {
    test('renders question and options on timer fire', async () => {
      const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
      callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
      initListeningQuiz();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      const storyOptions = document.getElementById('game-story-options');
      expect(storyOptions.children.length).toBe(3);
      expect(speak).toHaveBeenCalledWith(expect.stringContaining('gameListeningPassage'));
    });

    test('ends game when no more questions', async () => {
      const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
      const endGame = (await import('../../src/modules/games/game-state.js')).endGame;
      callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
      initListeningQuiz();
      await Promise.resolve();
      state.currentAIGameData.currentQ = 1;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      expect(endGame).toHaveBeenCalled();
    });
  });

  describe('answerListeningQuestion', () => {
    test('correct answer increments score and plays success', async () => {
      const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
      callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
      initListeningQuiz();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      const buttons = document.getElementById('game-story-options').querySelectorAll('button');
      buttons[0].click();
      expect(playSuccess3D).toHaveBeenCalled();
      expect(state.currentGameScore).toBe(15);
      expect(document.getElementById('game-score').textContent).toBe('15');
    });

    test('wrong answer plays fail', async () => {
      const { initListeningQuiz } = await import('../../src/modules/games/listening-quiz.js');
      callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_QUESTIONS));
      initListeningQuiz();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      const buttons = document.getElementById('game-story-options').querySelectorAll('button');
      buttons[1].click();
      expect(playFail3D).toHaveBeenCalled();
      expect(speak).toHaveBeenCalledWith(expect.stringContaining('gameCorrectAnswer'));
    });
  });
});
