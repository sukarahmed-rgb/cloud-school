import { initGame, answerGame } from '../../src/modules/games/game-init.js';
import { state } from '../../src/modules/games/game-state.js';
import { playSuccess3D, playFail3D } from '../../src/modules/spatial-audio.js';
import { setCurrentUserSession } from '../../src/modules/app-state.js';

jest.mock('../../src/modules/games/math-challenge.js', () => ({ initMathChallenge: jest.fn() }));
jest.mock('../../src/modules/games/listening-quiz.js', () => ({ initListeningQuiz: jest.fn() }));
jest.mock('../../src/modules/games/science-lab.js', () => ({ initScienceLab: jest.fn() }));
jest.mock('../../src/modules/games/geography-explorer.js', () => ({
  initGeographyExplorer: jest.fn(),
}));
jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));
jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
  setupAccessibleVoices: jest.fn(),
}));
jest.mock('../../src/modules/speech-recognition.js', () => ({
  listenForSpeech: jest.fn(),
}));
jest.mock('../../src/modules/spatial-audio.js', () => ({
  playSuccess3D: jest.fn(),
  playFail3D: jest.fn(),
  playTick3D: jest.fn(),
}));
jest.mock('../../src/modules/ai-tutor.js', () => ({
  startAiStoryRound: jest.fn(),
}));
jest.mock('../../src/modules/error-handler.js', () => ({
  secureRandomInt: jest.fn(() => 0),
}));
jest.mock('../../src/modules/analytics.js', () => ({
  recordGameScore: jest.fn(),
}));
jest.mock('../../src/modules/notifications.js', () => ({
  addNotification: jest.fn(),
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
    setCurrentUserSession(null);
    Element.prototype.scrollIntoView = jest.fn();
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
    expect(playSuccess3D).toHaveBeenCalled();
  });

  test('answerGame wrong answer for hero ends game', () => {
    state.activeGameType = 'hero';
    state.currentCorrectAnswer = true;
    answerGame(false);
    expect(playFail3D).toHaveBeenCalled();
  });
});
