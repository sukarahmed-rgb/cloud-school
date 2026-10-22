// @ts-check
import { state, pickQuestionByDifficulty, clearGameTimer, endGame } from './game-state.js';
import { initMathChallenge } from './math-challenge.js';
import { initListeningQuiz } from './listening-quiz.js';
import { initScienceLab } from './science-lab.js';
import { initGeographyExplorer } from './geography-explorer.js';
import { startAudioMemoryGame, initAudioMemoryUI } from './audio-memory.js';
import { speak, setupAccessibleVoices } from '../speech.js';
import { listenForSpeech } from '../speech-recognition.js';
import { __ } from '../i18n.js';
import { playSuccess3D, playFail3D, playTick3D } from '../spatial-audio.js';
import { startAiStoryRound } from '../ai-tutor.js';

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
  speak(questionData.q);
  setTimeout(function () {
    listenForGameAnswer();
  }, 1500);
}

export function listenForGameAnswer() {
  speak(__('gameSpeakAnswer'));
  listenForSpeech(function (text) {
    if (!text) {
      speak(__('gameNoAnswer'));
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
      speak(__('gameUnclear'));
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
    playSuccess3D();
    speak(__('gameCorrect'));
    setTimeout(function () {
      startNewGameRound();
    }, 1000);
  } else {
    playFail3D();
    if (state.activeGameType === 'hero') {
      speak(__('gameWrongScore', state.currentGameScore));
      endGame();
    } else {
      speak(__('gameWrong'));
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
    document.getElementById('game-title').textContent = __('gameTrueFalse');
    document.getElementById('game-timer-wrapper').classList.remove('hidden');
    binaryOptions.classList.remove('hidden');
    storyOptions.classList.add('hidden');
    startNewGameRound();
    speak(__('gameTrueFalseStart'));
  } else if (gameType === 'hero') {
    document.getElementById('game-title').textContent = __('gameSpeed');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    binaryOptions.classList.remove('hidden');
    storyOptions.classList.add('hidden');
    startNewGameRound();
    speak(__('gameSpeedStart'));
  } else if (gameType === 'pvp') {
    document.getElementById('game-title').textContent = __('gamePvP');
    document.getElementById('game-timer-wrapper').classList.remove('hidden');
    binaryOptions.classList.remove('hidden');
    storyOptions.classList.add('hidden');
    startNewGameRound();
    speak(__('gamePvPStart'));
  } else if (gameType === 'ai-story') {
    document.getElementById('game-title').textContent = __('gameStory');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    startAiStoryRound(null);
  } else if (gameType === 'audio-memory') {
    document.getElementById('game-title').textContent = __('gameMemory');
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
        playTick3D();
      }
      if (state.gameTimeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
  setTimeout(setupAccessibleVoices, 200);
}
