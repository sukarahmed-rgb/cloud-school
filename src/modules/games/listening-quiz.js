// @ts-check
import { state, getAgeLevelDifficulty, clearGameTimer, endGame } from './game-state.js';

function getListeningLevelText() {
  const d = getAgeLevelDifficulty();
  if (d <= 1) {
    return 'للأطفال في المرحلة الابتدائية. استخدم لغة بسيطة جداً وقصة قصيرة ممتعة عن الحيوانات أو الطبيعة.';
  }
  if (d <= 2) {
    return 'للمرحلة المتوسطة. استخدم فقرة علمية أو تاريخية متوسطة المستوى.';
  }
  if (d <= 3) {
    return 'للمرحلة الثانوية. استخدم مقالة أدبية أو علمية معمقة.';
  }
  return 'للمرحلة الجامعية. استخدم نص أكاديمي متقدم في العلوم أو الفلسفة أو التكنولوجيا.';
}

async function startListeningRound() {
  const storyOptions = document.getElementById('game-story-options');
  storyOptions.innerHTML = '';
  document.getElementById('game-question').textContent = window.__('gameListeningLoading');
  window.speak(window.__('gameListeningLoading'));

  const levelText = getListeningLevelText();
  const prompt = `أنشئ فقرة تعليمية قصيرة (3-5 أسطر) مناسبة ${levelText} ثم أنشئ 3 أسئلة اختيار من متعدد عن الفقرة، لكل سؤال 3 خيارات وخيار واحد صحيح. أخرج النتيجة بصيغة JSON فقط بدون markdown: { "passage": "نص الفقرة", "questions": [{ "q": "السؤال", "options": ["خيار1", "خيار2", "خيار3"], "correct": 0 }] }`;

  try {
    const systemPrompt = window.getPrompt(
      window.getCurrentLang(),
      'أنت معلم تربوي محترف متخصص في إنشاء اختبارات الفهم السمعي للطلاب المكفوفين. أخرج JSON نظيف فقط.',
      'You are a professional educational teacher specializing in creating listening comprehension tests for blind students. Output clean JSON only.',
    );
    const jsonText = await window.callGeminiAPI(prompt, systemPrompt);
    const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

    document.getElementById('game-question').textContent = parsed.passage;
    window.speak(`${window.__('gameListeningPassage')}: ${parsed.passage}`);
    state.currentAIGameData = { questions: parsed.questions, currentQ: 0 };

    setTimeout(function () {
      window.speak(window.__('gameListeningNowQuestions'));
      setTimeout(showListeningQuestion, 1500);
    }, 3000);
  } catch (e) {
    console.error('Listening quiz error:', e);
    document.getElementById('game-question').textContent = window.__('gameAIError');
    window.speak(window.__('gameAIError'));
  }
}

function showListeningQuestion() {
  if (
    !state.currentAIGameData ||
    state.currentAIGameData.currentQ >= state.currentAIGameData.questions.length
  ) {
    window.speak(window.__('gameListeningComplete', state.currentGameScore));
    endGame();
    return;
  }
  const qData = state.currentAIGameData.questions[state.currentAIGameData.currentQ];
  document.getElementById('game-question').textContent = qData.q;
  window.speak(qData.q);

  const storyOptions = document.getElementById('game-story-options');
  storyOptions.innerHTML = '';
  qData.options.forEach(function (opt, idx) {
    const btn = document.createElement('button');
    btn.className =
      'p-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive';
    btn.textContent = `${idx + 1}) ${opt}`;
    btn.setAttribute('aria-label', window.__('storyOptionLabel', idx + 1, opt));
    btn.addEventListener('click', function () {
      answerListeningQuestion(idx);
    });
    storyOptions.appendChild(btn);
  });
}

function answerListeningQuestion(selectedIdx) {
  const qData = state.currentAIGameData.questions[state.currentAIGameData.currentQ];
  if (selectedIdx === qData.correct) {
    state.currentGameScore += 15;
    document.getElementById('game-score').textContent = String(state.currentGameScore);
    window.playSuccess3D();
    window.speak(`${window.__('gameCorrect')}! +15`);
  } else {
    window.playFail3D();
    window.speak(
      `${window.__('gameWrong')}. ${window.__('gameCorrectAnswer')}: ${qData.options[qData.correct]}`,
    );
  }
  state.currentAIGameData.currentQ++;
  setTimeout(showListeningQuestion, 1500);
}

export function initListeningQuiz() {
  state.activeGameType = 'listening-quiz';
  state.currentGameScore = 0;

  document.getElementById('active-game-panel').classList.remove('hidden');
  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-title').textContent = window.__('gameListeningQuiz');
  document.getElementById('game-timer-wrapper').classList.add('hidden');
  document.getElementById('game-binary-options').classList.add('hidden');
  document.getElementById('game-story-options').classList.remove('hidden');

  const inputArea = document.getElementById('game-input-area');
  if (inputArea) {
    inputArea.classList.add('hidden');
  }

  clearGameTimer();
  startListeningRound();
  document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
}
