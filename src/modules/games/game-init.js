// @ts-check
import {
  state,
  getAgeLevelDifficulty,
  pickQuestionByDifficulty,
  clearGameTimer,
  endGame,
} from './game-state.js';
import { initMathChallenge } from './math-challenge.js';
import { initListeningQuiz } from './listening-quiz.js';
import { initScienceLab } from './science-lab.js';
import { initGeographyExplorer } from './geography-explorer.js';
import {
  startAudioMemoryGame,
  addAudioMemoryStep,
  playAudioMemorySequence,
  answerAudioMemory,
  initAudioMemoryUI,
} from './audio-memory.js';

export function startNewGameRound() {
  if (state.activeGameType === 'audio-memory') {
    startAudioMemoryGame();
    return;
  }
  let level = 1;
  if (state.activeGameType === 'hero') {
    if (state.currentGameScore >= 80) {
      level = 3;
    } else if (state.currentGameScore >= 40) {
      level = 2;
    }
  }
  const questionData = pickQuestionByDifficulty(level);
  document.getElementById('game-question').textContent = questionData.q;
  state.currentCorrectAnswer = questionData.a;
  window.speak(questionData.q);
  setTimeout(function () {
    listenForGameAnswer();
  }, 1500);
}

export function listenForGameAnswer() {
  if (typeof window.listenForSpeech !== 'function') {
    return;
  }
  window.speak(window.__('gameSpeakAnswer'));
  window.listenForSpeech(function (text) {
    if (!text) {
      window.speak(window.__('gameNoAnswer'));
      setTimeout(function () {
        listenForGameAnswer();
      }, 1500);
      return;
    }
    const t = text.trim();
    if (
      t.indexOf('صح') !== -1 ||
      t.indexOf('صحيح') !== -1 ||
      t.indexOf('نعم') !== -1 ||
      t.indexOf('yes') !== -1
    ) {
      answerGame(true);
    } else if (
      t.indexOf('خطأ') !== -1 ||
      t.indexOf('غلط') !== -1 ||
      t.indexOf('لا') !== -1 ||
      t.indexOf('no') !== -1
    ) {
      answerGame(false);
    } else {
      window.speak(window.__('gameUnclear'));
      setTimeout(function () {
        listenForGameAnswer();
      }, 1500);
    }
  }, 8000);
}

export function answerGame(userAnswer) {
  if (userAnswer === state.currentCorrectAnswer) {
    state.currentGameScore += 10;
    document.getElementById('game-score').textContent = String(state.currentGameScore);
    window.playSuccess3D();
    window.speak(window.__('gameCorrect'));
    setTimeout(function () {
      startNewGameRound();
    }, 1000);
  } else {
    window.playFail3D();
    if (state.activeGameType === 'hero') {
      window.speak(window.__('gameWrongScore', state.currentGameScore));
      endGame();
    } else {
      window.speak(window.__('gameWrong'));
      setTimeout(function () {
        startNewGameRound();
      }, 1000);
    }
  }
}

export function initGame(gameType) {
  state.activeGameType = gameType;
  state.currentGameScore = 0;
  state.gameTimeLeft = 30;

  document.getElementById('active-game-panel').classList.remove('hidden');
  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-timer').textContent = '30';

  clearGameTimer();

  const binaryOptions = document.getElementById('game-binary-options');
  const storyOptions = document.getElementById('game-story-options');

  const inputArea = document.getElementById('game-input-area');
  if (inputArea) {
    inputArea.classList.add('hidden');
  }

  if (gameType === 'seconds') {
    document.getElementById('game-title').textContent = window.__('gameTrueFalse');
    document.getElementById('game-timer-wrapper').classList.remove('hidden');
    binaryOptions.classList.remove('hidden');
    storyOptions.classList.add('hidden');
    startNewGameRound();
    window.speak(window.__('gameTrueFalseStart'));
  } else if (gameType === 'hero') {
    document.getElementById('game-title').textContent = window.__('gameSpeed');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    binaryOptions.classList.remove('hidden');
    storyOptions.classList.add('hidden');
    startNewGameRound();
    window.speak(window.__('gameSpeedStart'));
  } else if (gameType === 'pvp') {
    document.getElementById('game-title').textContent = window.__('gamePvP');
    document.getElementById('game-timer-wrapper').classList.remove('hidden');
    binaryOptions.classList.remove('hidden');
    storyOptions.classList.add('hidden');
    startNewGameRound();
    window.speak(window.__('gamePvPStart'));
  } else if (gameType === 'ai-story') {
    document.getElementById('game-title').textContent = window.__('gameStory');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    window.startAiStoryRound(null);
  } else if (gameType === 'audio-memory') {
    document.getElementById('game-title').textContent = window.__('gameMemory');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    binaryOptions.classList.add('hidden');
    storyOptions.classList.add('hidden');
    initAudioMemoryUI();
    startAudioMemoryGame();
    return;
  } else if (gameType === 'math-challenge') {
    initMathChallenge();
    return;
  } else if (gameType === 'listening-quiz') {
    initListeningQuiz();
    return;
  } else if (gameType === 'science-lab') {
    initScienceLab();
    return;
  } else if (gameType === 'geography-explorer') {
    initGeographyExplorer();
    return;
  }

  if (gameType !== 'hero' && gameType !== 'ai-story' && gameType !== 'audio-memory') {
    state.gameTimerInterval = setInterval(() => {
      state.gameTimeLeft -= 1;
      document.getElementById('game-timer').textContent = String(state.gameTimeLeft);
      if (state.gameTimeLeft <= 5 && state.gameTimeLeft > 0) {
        window.playTick3D();
      }
      if (state.gameTimeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
  setTimeout(window.setupAccessibleVoices, 200);
}
