import { state, getAgeLevelDifficulty } from '../../src/modules/games/game-state.js';

jest.mock('../../src/modules/games/game-state.js', () => {
  const actual = jest.requireActual('../../src/modules/games/game-state.js');
  return {
    ...actual,
    getAgeLevelDifficulty: jest.fn(),
    clearGameTimer: jest.fn(),
    endGame: jest.fn(),
  };
});

jest.useFakeTimers();

const MOCK_GEO = {
  region: 'Africa',
  intro: 'Explore Africa',
  questions: [
    { q: 'Q1', options: ['Sahara', 'Nile', 'Atlas'], correct: 1, info: 'The Nile is longest' },
  ],
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

describe('geography-explorer.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDOM();
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
    window.playSuccess3D = jest.fn();
    window.playFail3D = jest.fn();
    window.callGeminiAPI = jest.fn();
    window.getPrompt = jest.fn((l, ar, en) => ar);
    window.getCurrentLang = jest.fn(() => 'ar');
    Element.prototype.scrollIntoView = jest.fn();
    state.activeGameType = '';
    state.currentGameScore = 0;
    state.currentAIGameData = null;
  });

  test('initGeographyExplorer sets up UI', async () => {
    const { initGeographyExplorer } = await import('../../src/modules/games/geography-explorer.js');
    window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
    initGeographyExplorer();
    expect(document.getElementById('active-game-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('game-title').textContent).toBe('gameGeography');
    expect(document.getElementById('game-binary-options').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('game-story-options').classList.contains('hidden')).toBe(false);
  });

  test('initGeographyExplorer handles callGeminiAPI error', async () => {
    const { initGeographyExplorer } = await import('../../src/modules/games/geography-explorer.js');
    window.callGeminiAPI.mockRejectedValue(new Error('fail'));
    initGeographyExplorer();
    await Promise.resolve();
    await Promise.resolve();
    expect(window.speak).toHaveBeenCalledWith('gameAIError');
  });

  describe('getGeographyLevelText', () => {
    test('uses level-specific prompt for difficulty <= 1', async () => {
      getAgeLevelDifficulty.mockReturnValue(1);
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
      initGeographyExplorer();
      expect(window.callGeminiAPI.mock.calls[0][0]).toContain('الابتدائية');
    });

    test('uses level-specific prompt for difficulty 2', async () => {
      getAgeLevelDifficulty.mockReturnValue(2);
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
      initGeographyExplorer();
      expect(window.callGeminiAPI.mock.calls[0][0]).toContain('المتوسطة');
    });

    test('uses level-specific prompt for difficulty 3', async () => {
      getAgeLevelDifficulty.mockReturnValue(3);
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
      initGeographyExplorer();
      expect(window.callGeminiAPI.mock.calls[0][0]).toContain('الثانوية');
    });

    test('uses level-specific prompt for difficulty >= 4', async () => {
      getAgeLevelDifficulty.mockReturnValue(4);
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
      initGeographyExplorer();
      expect(window.callGeminiAPI.mock.calls[0][0]).toContain('الجامعية');
    });
  });

  describe('showGeographyQuestion', () => {
    test('renders question and options on timer fire', async () => {
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
      initGeographyExplorer();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      const storyOptions = document.getElementById('game-story-options');
      expect(storyOptions.children.length).toBe(3);
      expect(window.speak).toHaveBeenCalledWith(MOCK_GEO.questions[0].info);
    });

    test('skips info speech when qData.info is missing', async () => {
      const noInfoGeo = {
        region: 'Asia',
        intro: 'Explore Asia',
        questions: [{ q: 'Q1', options: ['A', 'B', 'C'], correct: 0 }],
      };
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(noInfoGeo));
      initGeographyExplorer();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      const storyOptions = document.getElementById('game-story-options');
      expect(storyOptions.children.length).toBe(3);
    });

    test('ends game when no more questions', async () => {
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      const { endGame } = await import('../../src/modules/games/game-state.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
      initGeographyExplorer();
      await Promise.resolve();
      state.currentAIGameData.currentQ = 1;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      expect(endGame).toHaveBeenCalled();
    });
  });

  describe('answerGeographyQuestion', () => {
    test('correct answer increments score and plays success', async () => {
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
      initGeographyExplorer();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      const buttons = document.getElementById('game-story-options').querySelectorAll('button');
      buttons[1].click();
      expect(window.playSuccess3D).toHaveBeenCalled();
      expect(state.currentGameScore).toBe(15);
    });

    test('wrong answer plays fail', async () => {
      const { initGeographyExplorer } =
        await import('../../src/modules/games/geography-explorer.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_GEO));
      initGeographyExplorer();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      const buttons = document.getElementById('game-story-options').querySelectorAll('button');
      buttons[0].click();
      expect(window.playFail3D).toHaveBeenCalled();
      expect(window.speak).toHaveBeenCalledWith(expect.stringContaining('gameCorrectAnswer'));
    });
  });
});
