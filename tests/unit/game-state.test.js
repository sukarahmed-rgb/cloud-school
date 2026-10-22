import {
  state,
  questionBank,
  mathQuestionBank,
  audioMemoryPatterns,
  getAgeLevelDifficulty,
  pickQuestionByDifficulty,
  clearGameTimer,
  endGame,
} from '../../src/modules/games/game-state.js';
import { setCurrentUserSession } from '../../src/modules/app-state.js';
import { speak } from '../../src/modules/speech.js';
import { secureRandomInt } from '../../src/modules/error-handler.js';

let mockCurrentAgeLevel = 'auto';
jest.mock('../../src/modules/accessibility.js', () => ({
  get currentAgeLevel() {
    return mockCurrentAgeLevel;
  },
}));

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
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

describe('game-state.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="active-game-panel" class="hidden"></div>';
    mockCurrentAgeLevel = 'auto';
    setCurrentUserSession(/** @type {any} */ ({ name: 'Test' }));
  });

  test('state has correct initial values', () => {
    expect(state.activeGameType).toBe('');
    expect(state.currentGameScore).toBe(0);
    expect(state.gameTimeLeft).toBe(30);
  });

  test('audioMemoryPatterns has 8 patterns', () => {
    expect(audioMemoryPatterns.length).toBe(8);
  });

  test('questionBank has questions', () => {
    expect(questionBank.length).toBeGreaterThan(50);
  });

  test('mathQuestionBank has questions', () => {
    expect(mathQuestionBank.length).toBeGreaterThan(20);
  });

  test('getAgeLevelDifficulty returns 1 for child', () => {
    mockCurrentAgeLevel = 'child';
    expect(getAgeLevelDifficulty()).toBe(1);
  });

  test('getAgeLevelDifficulty returns 2 for teen', () => {
    mockCurrentAgeLevel = 'teen';
    expect(getAgeLevelDifficulty()).toBe(2);
  });

  test('getAgeLevelDifficulty returns 4 for adult', () => {
    mockCurrentAgeLevel = 'adult';
    expect(getAgeLevelDifficulty()).toBe(4);
  });

  test('getAgeLevelDifficulty auto mode for age < 12 returns 1', () => {
    mockCurrentAgeLevel = 'auto';
    setCurrentUserSession(/** @type {any} */ ({ age: 10 }));
    expect(getAgeLevelDifficulty()).toBe(1);
  });

  test('getAgeLevelDifficulty auto mode for age 14 returns 2', () => {
    mockCurrentAgeLevel = 'auto';
    setCurrentUserSession(/** @type {any} */ ({ age: 14 }));
    expect(getAgeLevelDifficulty()).toBe(2);
  });

  test('getAgeLevelDifficulty auto mode for age 16 returns 3', () => {
    mockCurrentAgeLevel = 'auto';
    setCurrentUserSession(/** @type {any} */ ({ age: 16 }));
    expect(getAgeLevelDifficulty()).toBe(3);
  });

  test('getAgeLevelDifficulty auto mode for age >= 18 returns 4', () => {
    mockCurrentAgeLevel = 'auto';
    setCurrentUserSession(/** @type {any} */ ({ age: 18 }));
    expect(getAgeLevelDifficulty()).toBe(4);
  });

  test('getAgeLevelDifficulty defaults to 14 when no session', () => {
    mockCurrentAgeLevel = 'auto';
    setCurrentUserSession(null);
    expect(getAgeLevelDifficulty()).toBe(2);
  });

  test('pickQuestionByDifficulty returns a question', () => {
    secureRandomInt.mockReturnValue(0);
    const q = pickQuestionByDifficulty(1);
    expect(q.q).toBeTruthy();
    expect(q.a).toBeDefined();
  });

  test('pickQuestionByDifficulty falls back to all levels when pool empty', () => {
    secureRandomInt.mockReturnValue(0);
    const q = pickQuestionByDifficulty(99);
    expect(q).toBeTruthy();
  });

  test('clearGameTimer clears interval', () => {
    jest.useFakeTimers();
    state.gameTimerInterval = setInterval(() => {}, 1000);
    clearGameTimer();
    expect(state.gameTimerInterval).toBeNull();
    jest.useRealTimers();
  });

  test('endGame hides panel and speaks', () => {
    state.currentGameScore = 0;
    endGame();
    expect(document.getElementById('active-game-panel').classList.contains('hidden')).toBe(true);
    expect(speak).toHaveBeenCalled();
  });
});
