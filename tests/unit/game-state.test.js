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

describe('game-state.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="active-game-panel" class="hidden"></div>';
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
    window.addNotification = jest.fn();
    window.currentUserSession = { name: 'Test' };
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
    window.currentAgeLevel = 'child';
    expect(getAgeLevelDifficulty()).toBe(1);
  });

  test('getAgeLevelDifficulty returns 2 for teen', () => {
    window.currentAgeLevel = 'teen';
    expect(getAgeLevelDifficulty()).toBe(2);
  });

  test('getAgeLevelDifficulty returns 4 for adult', () => {
    window.currentAgeLevel = 'adult';
    expect(getAgeLevelDifficulty()).toBe(4);
  });

  test('getAgeLevelDifficulty auto mode for age < 12 returns 1', () => {
    window.currentAgeLevel = 'auto';
    window.currentUserSession = { age: 10 };
    expect(getAgeLevelDifficulty()).toBe(1);
  });

  test('getAgeLevelDifficulty auto mode for age 14 returns 2', () => {
    window.currentAgeLevel = 'auto';
    window.currentUserSession = { age: 14 };
    expect(getAgeLevelDifficulty()).toBe(2);
  });

  test('getAgeLevelDifficulty auto mode for age 16 returns 3', () => {
    window.currentAgeLevel = 'auto';
    window.currentUserSession = { age: 16 };
    expect(getAgeLevelDifficulty()).toBe(3);
  });

  test('getAgeLevelDifficulty auto mode for age >= 18 returns 4', () => {
    window.currentAgeLevel = 'auto';
    window.currentUserSession = { age: 18 };
    expect(getAgeLevelDifficulty()).toBe(4);
  });

  test('getAgeLevelDifficulty defaults to 14 when no session', () => {
    window.currentAgeLevel = 'auto';
    window.currentUserSession = null;
    expect(getAgeLevelDifficulty()).toBe(2);
  });

  test('pickQuestionByDifficulty returns a question', () => {
    window.secureRandomInt = jest.fn().mockReturnValue(0);
    const q = pickQuestionByDifficulty(1);
    expect(q.q).toBeTruthy();
    expect(q.a).toBeDefined();
  });

  test('pickQuestionByDifficulty falls back to all levels when pool empty', () => {
    window.secureRandomInt = jest.fn().mockReturnValue(0);
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
    expect(window.speak).toHaveBeenCalled();
  });
});
