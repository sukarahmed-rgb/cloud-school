// @ts-check
import { __ } from '../i18n.js';
import { speak } from '../speech.js';
import { playSuccess3D, playFail3D, playTick3D } from '../spatial-audio.js';
import { secureRandomInt } from '../error-handler.js';
import { escapeHtml } from '../helpers.js';
import {
  state,
  mathQuestionBank,
  getAgeLevelDifficulty,
  clearGameTimer,
  endGame,
} from './game-state.js';

function pickMathQuestion(level) {
  let pool = mathQuestionBank.filter(function (q) {
    return q.d === level;
  });
  if (pool.length === 0) {
    pool = mathQuestionBank.filter(function (q) {
      return q.d <= level;
    });
  }
  if (pool.length === 0) {
    pool = mathQuestionBank;
  }
  return pool[secureRandomInt(0, pool.length)];
}

function startMathRound() {
  const level = getAgeLevelDifficulty();
  const q = pickMathQuestion(level);
  state.currentMathAnswer = q.a;
  document.getElementById('game-question').textContent = q.q;
  speak(q.q);
  const inp = /** @type {HTMLInputElement|null} */ (document.getElementById('math-answer-input'));
  if (inp) {
    inp.value = '';
    inp.focus();
  }
}

function checkMathAnswer() {
  const inp = /** @type {HTMLInputElement|null} */ (document.getElementById('math-answer-input'));
  if (!inp) {
    return;
  }
  const userAns = inp.value.trim();
  if (!userAns) {
    speak(__('gameMathNoAnswer'));
    return;
  }
  if (
    userAns === String(state.currentMathAnswer) ||
    userAns.replace(/\s/g, '') === String(state.currentMathAnswer).replace(/\s/g, '')
  ) {
    const level = getAgeLevelDifficulty();
    const points = level <= 1 ? 5 : level <= 2 ? 10 : 20;
    state.currentGameScore += points;
    document.getElementById('game-score').textContent = String(state.currentGameScore);
    playSuccess3D();
    speak(`${__('gameCorrect')}! +${points}`);
    setTimeout(startMathRound, 800);
  } else {
    playFail3D();
    speak(__('gameMathWrongAnswer', state.currentMathAnswer));
    setTimeout(startMathRound, 1500);
  }
}

export function initMathChallenge() {
  state.activeGameType = 'math-challenge';
  state.currentGameScore = 0;
  state.gameTimeLeft = 60;

  document.getElementById('active-game-panel').classList.remove('hidden');
  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-timer').textContent = '60';
  document.getElementById('game-title').textContent = __('gameMathChallenge');
  document.getElementById('game-timer-wrapper').classList.remove('hidden');
  document.getElementById('game-binary-options').classList.add('hidden');
  document.getElementById('game-story-options').classList.add('hidden');

  let inputArea = document.getElementById('game-input-area');
  if (!inputArea) {
    inputArea = document.createElement('div');
    inputArea.id = 'game-input-area';
    inputArea.className = 'flex flex-col items-center gap-3 mt-4';
    document.getElementById('game-arena').appendChild(inputArea);
  }
  inputArea.classList.remove('hidden');
  const label = escapeHtml(__('gameMathTypeAnswer'));
  inputArea.innerHTML =
    `<label for="math-answer-input" class="text-lg font-bold text-yellow-300">${label}</label>` +
    `<input id="math-answer-input" type="text" inputmode="text" autocomplete="off" class="p-4 text-2xl text-center rounded-xl bg-gray-800 text-white border-2 border-yellow-400 w-64 focus-ring" aria-label="${label}">` +
    `<button id="math-submit-btn" class="p-4 bg-green-600 hover:bg-green-700 text-white font-bold text-xl rounded-xl btn-interactive w-64">${escapeHtml(__('gameMathSubmit'))}</button>`;

  document.getElementById('math-submit-btn').addEventListener('click', checkMathAnswer);
  document.getElementById('math-answer-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      checkMathAnswer();
    }
  });

  clearGameTimer();
  state.gameTimerInterval = setInterval(function () {
    state.gameTimeLeft -= 1;
    document.getElementById('game-timer').textContent = String(state.gameTimeLeft);
    if (state.gameTimeLeft <= 5 && state.gameTimeLeft > 0) {
      playTick3D();
    }
    if (state.gameTimeLeft <= 0) {
      endGame();
    }
  }, 1000);

  startMathRound();
  speak(__('gameMathStart'));
  document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
}
