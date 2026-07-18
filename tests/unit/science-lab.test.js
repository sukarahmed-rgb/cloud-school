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

const MOCK_STEPS = {
  title: 'Volcano',
  intro: 'Make a volcano',
  steps: [
    {
      description: 'Step 1',
      options: ['Add water', 'Add vinegar', 'Add oil'],
      correct: 1,
      explanation: 'Vinegar reacts',
    },
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

describe('science-lab.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDOM();
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
    window.playSuccess3D = jest.fn();
    window.playFail3D = jest.fn();
    window.play3DTone = jest.fn();
    window.callGeminiAPI = jest.fn();
    window.getPrompt = jest.fn((l, ar, en) => ar);
    window.getCurrentLang = jest.fn(() => 'ar');
    Element.prototype.scrollIntoView = jest.fn();
    state.activeGameType = '';
    state.currentGameScore = 0;
    state.currentAIGameData = null;
  });

  test('initScienceLab sets up UI', async () => {
    const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
    window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
    initScienceLab();
    expect(document.getElementById('active-game-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('game-title').textContent).toBe('gameScienceLab');
    expect(document.getElementById('game-binary-options').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('game-story-options').classList.contains('hidden')).toBe(false);
  });

  test('initScienceLab handles callGeminiAPI error', async () => {
    const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
    window.callGeminiAPI.mockRejectedValue(new Error('fail'));
    initScienceLab();
    await Promise.resolve();
    await Promise.resolve();
    expect(window.speak).toHaveBeenCalledWith('gameAIError');
  });

  describe('getScienceLabLevelText', () => {
    test('uses level-specific prompt for difficulty <= 1', async () => {
      getAgeLevelDifficulty.mockReturnValue(1);
      const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
      initScienceLab();
      expect(window.callGeminiAPI.mock.calls[0][0]).toContain('الابتدائية');
    });

    test('uses level-specific prompt for difficulty 2', async () => {
      getAgeLevelDifficulty.mockReturnValue(2);
      const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
      initScienceLab();
      expect(window.callGeminiAPI.mock.calls[0][0]).toContain('المتوسطة');
    });

    test('uses level-specific prompt for difficulty 3', async () => {
      getAgeLevelDifficulty.mockReturnValue(3);
      const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
      initScienceLab();
      expect(window.callGeminiAPI.mock.calls[0][0]).toContain('الثانوية');
    });

    test('uses level-specific prompt for difficulty >= 4', async () => {
      getAgeLevelDifficulty.mockReturnValue(4);
      const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
      initScienceLab();
      expect(window.callGeminiAPI.mock.calls[0][0]).toContain('الجامعية');
    });
  });

  describe('showScienceStep', () => {
    test('renders step and options on timer fire', async () => {
      const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
      initScienceLab();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      const storyOptions = document.getElementById('game-story-options');
      expect(storyOptions.children.length).toBe(3);
      expect(window.speak).toHaveBeenCalledWith(expect.stringContaining('gameScienceStep'));
    });

    test('ends game when no more steps', async () => {
      const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
      const { endGame } = await import('../../src/modules/games/game-state.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
      initScienceLab();
      await Promise.resolve();
      state.currentAIGameData.currentStep = 1;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      expect(endGame).toHaveBeenCalled();
    });
  });

  describe('answerScienceStep', () => {
    test('correct answer increments score and plays success', async () => {
      const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
      initScienceLab();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      const buttons = document.getElementById('game-story-options').querySelectorAll('button');
      buttons[1].click();
      expect(window.playSuccess3D).toHaveBeenCalled();
      expect(state.currentGameScore).toBe(20);
    });

    test('wrong answer plays fail', async () => {
      const { initScienceLab } = await import('../../src/modules/games/science-lab.js');
      window.callGeminiAPI.mockResolvedValue(JSON.stringify(MOCK_STEPS));
      initScienceLab();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      const buttons = document.getElementById('game-story-options').querySelectorAll('button');
      buttons[0].click();
      expect(window.playFail3D).toHaveBeenCalled();
      expect(window.speak).toHaveBeenCalledWith(expect.stringContaining('gameWrong'));
    });
  });
});
