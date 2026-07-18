import {
  startAudioMemoryGame,
  answerAudioMemory,
  addAudioMemoryStep,
  initAudioMemoryUI,
} from '../../src/modules/games/audio-memory.js';
import { state, audioMemoryPatterns, endGame } from '../../src/modules/games/game-state.js';

jest.mock('../../src/modules/games/game-state.js', () => {
  const audioMemoryPatterns = [
    { name: 'يسار', dir: 'left', freq: 400 },
    { name: 'يمين', dir: 'right', freq: 600 },
    { name: 'أمام', dir: 'front', freq: 800 },
    { name: 'خلف', dir: 'back', freq: 1000 },
  ];
  const state = {
    activeGameType: null,
    currentGameScore: 0,
    audioMemorySequence: [],
    audioMemoryStep: 0,
  };
  return {
    state,
    audioMemoryPatterns,
    endGame: jest.fn(),
  };
});

describe('audio-memory.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.activeGameType = null;
    state.currentGameScore = 0;
    state.audioMemorySequence = [];
    state.audioMemoryStep = 0;

    document.body.innerHTML = `
      <div id="active-game-panel" class="hidden"></div>
      <div id="game-score"></div>
      <div id="game-title"></div>
      <div id="game-timer-wrapper"></div>
      <div id="game-binary-options"></div>
      <div id="game-story-options" class="hidden"></div>
      <div id="game-question"></div>
    `;
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
    window.secureRandomInt = jest.fn().mockReturnValue(0);
    window.play3DTone = jest.fn();
    window.playSuccess3D = jest.fn();
    window.playFail3D = jest.fn();
  });

  test('startAudioMemoryGame sets up game state and DOM', () => {
    startAudioMemoryGame();
    expect(state.activeGameType).toBe('audio-memory');
    expect(state.currentGameScore).toBe(0);
    expect(Array.isArray(state.audioMemorySequence)).toBe(true);
    expect(document.getElementById('active-game-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('game-score').textContent).toBe('0');
    expect(document.getElementById('game-title').textContent).toBeTruthy();
    expect(document.getElementById('game-timer-wrapper').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('game-binary-options').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('game-story-options').classList.contains('hidden')).toBe(true);
  });

  test('answerAudioMemory correct answer advances step', () => {
    state.audioMemorySequence = [1, 2];
    state.audioMemoryStep = 0;
    answerAudioMemory(1);
    expect(state.audioMemoryStep).toBe(1);
  });

  test('answerAudioMemory correct answer completing sequence adds score', () => {
    state.audioMemorySequence = [0];
    state.audioMemoryStep = 0;
    answerAudioMemory(0);
    expect(state.currentGameScore).toBe(10);
    expect(window.playSuccess3D).toHaveBeenCalled();
  });

  test('answerAudioMemory wrong answer ends game', () => {
    state.audioMemorySequence = [0];
    state.audioMemoryStep = 0;
    answerAudioMemory(1);
    expect(endGame).toHaveBeenCalled();
    expect(window.playFail3D).toHaveBeenCalled();
  });

  test('addAudioMemoryStep adds to sequence', () => {
    state.audioMemorySequence = [];
    addAudioMemoryStep();
    expect(state.audioMemorySequence.length).toBe(1);
  });

  test('initAudioMemoryUI renders buttons for each pattern', () => {
    document.body.innerHTML = `
      <div id="game-story-options"></div>
    `;
    initAudioMemoryUI();
    const container = document.getElementById('game-story-options');
    expect(container.children.length).toBe(audioMemoryPatterns.length);
    expect(container.children[0].textContent).toBe('يسار');
  });

  test('initAudioMemoryUI button click calls answerAudioMemory', () => {
    document.body.innerHTML = `
      <div id="game-story-options"></div>
    `;
    state.audioMemorySequence = [0, 2];
    state.audioMemoryStep = 0;
    initAudioMemoryUI();
    const btn = document.getElementById('game-story-options').children[0];
    btn.click();
    expect(state.audioMemoryStep).toBe(1);
  });
});
