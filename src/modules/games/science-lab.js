// @ts-check
import { __, getPrompt, getCurrentLang } from '../i18n.js';
import { speak } from '../speech.js';
import { play3DTone, playSuccess3D, playFail3D } from '../spatial-audio.js';
import { callGeminiAPI } from '../ai-utils.js';
import { state, getAgeLevelDifficulty, clearGameTimer, endGame } from './game-state.js';

function getScienceLabLevelText() {
  const d = getAgeLevelDifficulty();
  if (d <= 1) {
    return 'للأطفال في الابتدائية. تجربة بسيطة جداً عن الماء أو الهواء أو النباتات.';
  }
  if (d <= 2) {
    return 'للمرحلة المتوسطة. تجربة في الكيمياء أو الفيزياء الأساسية.';
  }
  if (d <= 3) {
    return 'للمرحلة الثانوية. تجربة معقدة في الفيزياء أو الأحياء أو الكيمياء.';
  }
  return 'للمرحلة الجامعية. تجربة مختبرية متقدمة في الكيمياء العضوية أو الفيزياء الحديثة.';
}

async function startScienceLabRound() {
  const storyOptions = document.getElementById('game-story-options');
  storyOptions.innerHTML = '';
  document.getElementById('game-question').textContent = __('gameScienceLoading');
  speak(__('gameScienceLoading'));

  play3DTone(200, 600, 'sine', 0.2, 0, 0, 2);

  const levelText = getScienceLabLevelText();
  const prompt = `صمم تجربة علمية تفاعلية صوتية مناسبة ${levelText} اجعل التجربة من 3 خطوات متسلسلة. في كل خطوة، اوصف ما يحدث في المختبر بشكل مشوق، ثم اعرض 3 خيارات للطالب ليختار الإجراء الصحيح. أخرج النتيجة بصيغة JSON فقط بدون markdown: { "title": "اسم التجربة", "intro": "مقدمة مشوقة عن التجربة", "steps": [{ "description": "وصف الخطوة", "options": ["إجراء 1", "إجراء 2", "إجراء 3"], "correct": 0, "explanation": "شرح لماذا هذا الإجراء صحيح" }] }`;

  try {
    const systemPrompt = getPrompt(
      getCurrentLang(),
      'أنت عالم متخصص في تصميم تجارب علمية تفاعلية ومشوقة للطلاب المكفوفين. أخرج JSON نظيف فقط.',
      'You are a scientist specializing in designing interactive and exciting experiments for blind students. Output clean JSON only.',
    );
    const jsonText = await callGeminiAPI(prompt, systemPrompt);
    const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

    document.getElementById('game-question').textContent = `🧪 ${parsed.title}\n\n${parsed.intro}`;
    speak(`${parsed.title}. ${parsed.intro}`);
    state.currentAIGameData = { steps: parsed.steps, currentStep: 0 };

    setTimeout(function () {
      speak(__('gameScienceReady'));
      setTimeout(showScienceStep, 1500);
    }, 3000);
  } catch (e) {
    console.error('Science lab error:', e);
    document.getElementById('game-question').textContent = __('gameAIError');
    speak(__('gameAIError'));
  }
}

function showScienceStep() {
  if (
    !state.currentAIGameData ||
    state.currentAIGameData.currentStep >= state.currentAIGameData.steps.length
  ) {
    speak(__('gameScienceComplete', state.currentGameScore));
    play3DTone(800, 1200, 'sine', 0.3, 0, 1, 0);
    endGame();
    return;
  }
  const step = state.currentAIGameData.steps[state.currentAIGameData.currentStep];
  const stepText = `${__('gameScienceStep', state.currentAIGameData.currentStep + 1)}: ${step.description}`;
  document.getElementById('game-question').textContent = stepText;
  speak(stepText);

  const storyOptions = document.getElementById('game-story-options');
  storyOptions.innerHTML = '';
  step.options.forEach(function (opt, idx) {
    const btn = document.createElement('button');
    btn.className =
      'p-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive';
    btn.textContent = `${idx + 1}) ${opt}`;
    btn.setAttribute('aria-label', __('storyOptionLabel', idx + 1, opt));
    btn.addEventListener('click', function () {
      answerScienceStep(idx);
    });
    storyOptions.appendChild(btn);
  });
}

function answerScienceStep(selectedIdx) {
  const step = state.currentAIGameData.steps[state.currentAIGameData.currentStep];
  if (selectedIdx === step.correct) {
    state.currentGameScore += 20;
    document.getElementById('game-score').textContent = String(state.currentGameScore);
    playSuccess3D();
    play3DTone(600, 900, 'sine', 0.2, 0, 0, 1);
    speak(`${__('gameCorrect')}! ${step.explanation}`);
  } else {
    playFail3D();
    speak(`${__('gameWrong')}. ${step.explanation}`);
  }
  state.currentAIGameData.currentStep++;
  setTimeout(showScienceStep, 2000);
}

export function initScienceLab() {
  state.activeGameType = 'science-lab';
  state.currentGameScore = 0;

  document.getElementById('active-game-panel').classList.remove('hidden');
  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-title').textContent = __('gameScienceLab');
  document.getElementById('game-timer-wrapper').classList.add('hidden');
  document.getElementById('game-binary-options').classList.add('hidden');
  document.getElementById('game-story-options').classList.remove('hidden');

  const inputArea = document.getElementById('game-input-area');
  if (inputArea) {
    inputArea.classList.add('hidden');
  }

  clearGameTimer();
  startScienceLabRound();
  document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
}
