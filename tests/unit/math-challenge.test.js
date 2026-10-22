import { state } from '../../src/modules/games/game-state.js';

jest.mock('../../src/modules/games/game-state.js', () => {
  const actual = jest.requireActual('../../src/modules/games/game-state.js');
  return {
    ...actual,
    endGame: jest.fn(),
  };
});

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
}));

jest.mock('../../src/modules/spatial-audio.js', () => ({
  playSuccess3D: jest.fn(),
  playFail3D: jest.fn(),
  playTick3D: jest.fn(),
}));

jest.mock('../../src/modules/error-handler.js', () => ({
  secureRandomInt: jest.fn(() => 0),
}));

jest.useFakeTimers();

describe('math-challenge.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    document.body.innerHTML = `
      <div id="active-game-panel" class="hidden"></div>
      <div id="game-score">0</div>
      <div id="game-title"></div>
      <div id="game-question"></div>
      <div id="game-timer">60</div>
      <div id="game-timer-wrapper"></div>
      <div id="game-binary-options" class="hidden"></div>
      <div id="game-story-options" class="hidden"></div>
      <div id="game-arena"></div>
    `;
    Element.prototype.scrollIntoView = jest.fn();
    state.activeGameType = '';
    state.currentGameScore = 0;
    state.currentMathAnswer = null;
    state.gameTimerInterval = null;
    state.gameTimeLeft = 60;
  });

  test('initMathChallenge sets up UI and starts timer', async () => {
    const { initMathChallenge } = await import('../../src/modules/games/math-challenge.js');
    initMathChallenge();
    expect(document.getElementById('active-game-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('game-title').textContent).toBe('gameMathChallenge');
    expect(document.getElementById('game-timer-wrapper').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('game-question').textContent.length).toBeGreaterThan(0);
  });

  test('timer counts down', async () => {
    const { initMathChallenge } = await import('../../src/modules/games/math-challenge.js');
    initMathChallenge();
    const startTime = state.gameTimeLeft;
    jest.advanceTimersByTime(3000);
    expect(state.gameTimeLeft).toBe(startTime - 3);
  });
});
