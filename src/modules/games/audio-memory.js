// @ts-check
import { state, audioMemoryPatterns, endGame } from './game-state.js';

export function startAudioMemoryGame() {
  state.activeGameType = 'audio-memory';
  state.currentGameScore = 0;
  state.audioMemorySequence = [];
  state.audioMemoryStep = 0;

  document.getElementById('active-game-panel').classList.remove('hidden');
  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-title').textContent = window.__('gameMemory');
  document.getElementById('game-timer-wrapper').classList.add('hidden');
  document.getElementById('game-binary-options').classList.add('hidden');
  document.getElementById('game-story-options').classList.add('hidden');
  document.getElementById('game-question').textContent = window.__('gameMemoryListen');

  window.speak(window.__('gameMemoryStart'));
  setTimeout(function () {
    addAudioMemoryStep();
  }, 2000);
}

export function addAudioMemoryStep() {
  const idx = window.secureRandomInt(0, audioMemoryPatterns.length);
  state.audioMemorySequence.push(idx);
  playAudioMemorySequence();
}

export function playAudioMemorySequence() {
  let i = 0;
  function playNext() {
    if (i >= state.audioMemorySequence.length) {
      window.speak(window.__('gameMemoryYourTurn'));
      return;
    }
    const pattern = audioMemoryPatterns[state.audioMemorySequence[i]];
    const pos = { left: [-2, 0, 0], right: [2, 0, 0], front: [0, 0, 2], back: [0, 0, -2] };
    const p = pos[pattern.dir] || [0, 0, 0];
    window.play3DTone(pattern.freq, pattern.freq * 1.5, 'sine', 0.3, p[0], p[1], p[2]);
    window.speak(pattern.name);
    i++;
    setTimeout(playNext, 1200);
  }
  window.speak(window.__('gameMemoryNew'));
  setTimeout(playNext, 500);
}

export function answerAudioMemory(patternIdx) {
  if (patternIdx === state.audioMemorySequence[state.audioMemoryStep]) {
    window.playSuccess3D();
    state.audioMemoryStep++;
    if (state.audioMemoryStep >= state.audioMemorySequence.length) {
      state.currentGameScore += 10;
      document.getElementById('game-score').textContent = String(state.currentGameScore);
      window.speak(window.__('gameMemoryComplete'));
      state.audioMemoryStep = 0;
      setTimeout(function () {
        addAudioMemoryStep();
      }, 1500);
    }
  } else {
    window.playFail3D();
    window.speak(
      window.__(
        'gameMemoryWrong',
        state.audioMemorySequence
          .map(function (i) {
            return audioMemoryPatterns[i].name;
          })
          .join(', '),
      ),
    );
    endGame();
  }
}

export function initAudioMemoryUI() {
  const container = document.getElementById('game-story-options');
  container.innerHTML = '';
  container.classList.remove('hidden');
  audioMemoryPatterns.forEach(function (p, idx) {
    const btn = document.createElement('button');
    btn.className = 'p-4 bg-purple-700 text-white font-bold text-xl rounded-xl btn-interactive';
    btn.textContent = p.name;
    btn.addEventListener('click', function () {
      answerAudioMemory(idx);
    });
    container.appendChild(btn);
  });
}
