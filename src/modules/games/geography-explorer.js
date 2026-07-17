// @ts-check
import { state, getAgeLevelDifficulty, clearGameTimer, endGame } from './game-state.js';

function getGeographyLevelText() {
  const d = getAgeLevelDifficulty();
  if (d <= 1) {
    return 'للأطفال في الابتدائية. اسأل عن القارات والمحيطات والعواصم الشهيرة والمعالم البسيطة.';
  }
  if (d <= 2) {
    return 'للمرحلة المتوسطة. اسأل عن المناخ والتضاريس والموارد الطبيعية والحدود الجغرافية.';
  }
  if (d <= 3) {
    return 'للمرحلة الثانوية. اسأل عن الجيوبوليتيك والتوزيع السكاني والظواهر الطبيعية المعقدة.';
  }
  return 'للمرحلة الجامعية. اسأل عن الجغرافيا الاقتصادية والجيوستراتيجية وتحليل الخرائط الديموغرافية.';
}

async function startGeographyRound() {
  const storyOptions = document.getElementById('game-story-options');
  storyOptions.innerHTML = '';
  document.getElementById('game-question').textContent = window.__('gameGeographyLoading');
  window.speak(window.__('gameGeographyLoading'));

  const levelText = getGeographyLevelText();
  const prompt = `أنشئ رحلة استكشافية جغرافية صوتية تفاعلية مناسبة ${levelText} صمم مغامرة يستكشف فيها الطالب منطقة من العالم. اصنع 4 أسئلة متسلسلة، كل سؤال يكشف معلومة جديدة عن المنطقة. لكل سؤال 3 خيارات وخيار واحد صحيح. أخرج النتيجة بصيغة JSON فقط بدون markdown: { "region": "اسم المنطقة", "intro": "مقدمة مشوقة عن الرحلة", "questions": [{ "q": "السؤال", "info": "معلومة تعليمية عن المنطقة", "options": ["خيار1", "خيار2", "خيار3"], "correct": 0 }] }`;

  try {
    const systemPrompt = window.getPrompt(
      window.getCurrentLang(),
      'أنت مستكشف جغرافي ومعلم تربوي متخصص في تعليم الجغرافيا للمكفوفين بطريقة مشوقة وتفاعلية. أخرج JSON نظيف فقط.',
      'You are a geographic explorer and educator specializing in teaching geography to blind students in an engaging interactive way. Output clean JSON only.',
    );
    const jsonText = await window.callGeminiAPI(prompt, systemPrompt);
    const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

    document.getElementById('game-question').textContent = `🌍 ${parsed.region}\n\n${parsed.intro}`;
    window.speak(`${window.__('gameGeographyWelcome')} ${parsed.region}! ${parsed.intro}`);
    state.currentAIGameData = { questions: parsed.questions, currentQ: 0 };

    setTimeout(function () {
      window.speak(window.__('gameGeographyStart'));
      setTimeout(showGeographyQuestion, 1500);
    }, 3000);
  } catch (e) {
    console.error('Geography explorer error:', e);
    document.getElementById('game-question').textContent = window.__('gameAIError');
    window.speak(window.__('gameAIError'));
  }
}

function showGeographyQuestion() {
  if (
    !state.currentAIGameData ||
    state.currentAIGameData.currentQ >= state.currentAIGameData.questions.length
  ) {
    window.speak(window.__('gameGeographyComplete', state.currentGameScore));
    endGame();
    return;
  }
  const qData = state.currentAIGameData.questions[state.currentAIGameData.currentQ];

  if (qData.info) {
    window.speak(qData.info);
  }

  setTimeout(function () {
    document.getElementById('game-question').textContent = qData.q;
    window.speak(qData.q);

    const storyOptions = document.getElementById('game-story-options');
    storyOptions.innerHTML = '';
    qData.options.forEach(function (opt, idx) {
      const btn = document.createElement('button');
      btn.className =
        'p-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive';
      btn.textContent = `${idx + 1}) ${opt}`;
      btn.setAttribute('aria-label', window.__('storyOptionLabel', idx + 1, opt));
      btn.addEventListener('click', function () {
        answerGeographyQuestion(idx);
      });
      storyOptions.appendChild(btn);
    });
  }, 2000);
}

function answerGeographyQuestion(selectedIdx) {
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
  setTimeout(showGeographyQuestion, 1500);
}

export function initGeographyExplorer() {
  state.activeGameType = 'geography-explorer';
  state.currentGameScore = 0;

  document.getElementById('active-game-panel').classList.remove('hidden');
  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-title').textContent = window.__('gameGeography');
  document.getElementById('game-timer-wrapper').classList.add('hidden');
  document.getElementById('game-binary-options').classList.add('hidden');
  document.getElementById('game-story-options').classList.remove('hidden');

  const inputArea = document.getElementById('game-input-area');
  if (inputArea) {
    inputArea.classList.add('hidden');
  }

  clearGameTimer();
  startGeographyRound();
  document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
}
