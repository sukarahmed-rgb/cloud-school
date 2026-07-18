import { initGame, startNewGameRound, answerGame } from '../../src/modules/games/game-init.js';
import { state } from '../../src/modules/games/game-state.js';

jest.mock('../../src/modules/games/math-challenge.js', () => ({ initMathChallenge: jest.fn() }));
jest.mock('../../src/modules/games/listening-quiz.js', () => ({ initListeningQuiz: jest.fn() }));
jest.mock('../../src/modules/games/science-lab.js', () => ({ initScienceLab: jest.fn() }));
jest.mock('../../src/modules/games/geography-explorer.js', () => ({
  initGeographyExplorer: jest.fn(),
}));

describe('game-init.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = `
      <div id="active-game-panel" class="hidden"></div>
      <div id="game-score">0</div>
      <div id="game-timer">30</div>
      <div id="game-title"></div>
      <div id="game-question"></div>
      <div id="game-timer-wrapper"></div>
      <div id="game-binary-options" class="hidden"></div>
      <div id="game-story-options" class="hidden"></div>
    `;
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
    window.playSuccess3D = jest.fn();
    window.playFail3D = jest.fn();
    window.playTick3D = jest.fn();
    window.secureRandomInt = jest.fn().mockReturnValue(0);
    window.currentUserSession = null;
    Element.prototype.scrollIntoView = jest.fn();
    window.listenForSpeech = jest.fn();
    window.setupAccessibleVoices = jest.fn();
    state.activeGameType = '';
    state.currentGameScore = 0;
    state.gameTimeLeft = 30;
    state.currentCorrectAnswer = null;
    state.gameTimerInterval = null;
  });

  test('initGame with seconds type shows binary options', () => {
    initGame('seconds');
    expect(document.getElementById('active-game-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('game-binary-options').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('game-title').textContent).toBe('gameTrueFalse');
  });

  test('initGame with hero type shows appropriate UI', () => {
    initGame('hero');
    expect(document.getElementById('game-binary-options').classList.contains('hidden')).toBe(false);
  });

  test('answerGame correct answer increments score', () => {
    state.currentCorrectAnswer = true;
    state.currentGameScore = 0;
    answerGame(true);
    expect(state.currentGameScore).toBe(10);
    expect(window.playSuccess3D).toHaveBeenCalled();
  });

  test('answerGame wrong answer for hero ends game', () => {
    state.activeGameType = 'hero';
    state.currentCorrectAnswer = true;
    answerGame(false);
    expect(window.playFail3D).toHaveBeenCalled();
  });
});
