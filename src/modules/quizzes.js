// @ts-check
import { saveSubmissionToFirebase } from './teacher-management.js';
import { localData, getCurrentUserSession } from './app-state.js';
import { saveLocalData } from './local-data.js';
import { escapeHtml } from './helpers.js';
import { __ } from './i18n.js';
import { speak, screenReaderMode, setupAccessibleVoices } from './speech.js';
import { announceToScreenReader } from './ui-core.js';
import { addNotification } from './notifications.js';
import { voiceExamActive, setVoiceExamQuizId } from './voice-exam-state.js';

/** @type {string|null} */
export let selectedQuizId = null;
/** @type {string|null} */
export let selectedOption = null;
/** @type {number|null} */
export let quizTimerInterval = null;

/** Render the student assignments list */
export function renderStudentAssignments() {
  const list = document.getElementById('student-assignments-list');
  list.innerHTML = '';

  localData.assignments.forEach((a) => {
    const item = document.createElement('div');
    item.className = 'card p-6 rounded-xl flex justify-between items-center flex-wrap gap-4';
    item.innerHTML = `
            <div>
                <h4 class="text-2xl font-black">${escapeHtml(a.title)}</h4>
                <span class="text-sm px-2 py-1 bg-yellow-400 text-black rounded font-bold">${a.type === 'mcq' ? __('typeMCQ') : __('typeEssay')}</span>
            </div>
            <button data-action="start-quiz" data-quiz-id="${escapeHtml(a.id)}" class="p-4 bg-green-600 text-white font-black text-lg rounded-xl hover:bg-green-500 large-touch-target btn-interactive">${__('btnStartQuiz')} \u{1F3DF}</button>
        `;
    list.appendChild(item);
  });

  list.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const btn = /** @type {HTMLElement|null} */ (target.closest('[data-action="start-quiz"]'));
    if (btn) {
      startQuiz(btn.dataset.quizId);
    }
  });
}

/**
 * @param {string} quizId
 */
export function startQuiz(quizId) {
  selectedQuizId = quizId;
  selectedOption = null;
  setVoiceExamQuizId(quizId);
  const quiz = localData.assignments.find((a) => a.id === quizId);
  if (!quiz) {
    return;
  }

  document.getElementById('active-quiz-panel').classList.remove('hidden');
  document.getElementById('active-quiz-title').textContent = quiz.title;

  if (quiz.type === 'mcq') {
    document.getElementById('quiz-question-container').classList.remove('hidden');
    document.getElementById('quiz-text-input-section').classList.add('hidden');

    document.getElementById('quiz-question-text').textContent = quiz.question;
    document.getElementById('btn-opt-A').querySelector('span').textContent =
      `${__('optA')} ${quiz.options.A}`;
    document.getElementById('btn-opt-B').querySelector('span').textContent =
      `${__('optB')} ${quiz.options.B}`;
    document.getElementById('btn-opt-C').querySelector('span').textContent =
      `${__('optC')} ${quiz.options.C}`;
    document.getElementById('btn-opt-D').querySelector('span').textContent =
      `${__('optD')} ${quiz.options.D}`;

    speak(__('quizStarted', quiz.title, quiz.question));
  } else {
    document.getElementById('quiz-question-container').classList.add('hidden');
    document.getElementById('quiz-text-input-section').classList.remove('hidden');

    /** @type {HTMLTextAreaElement} */ (
      document.getElementById('assignment-student-answer')
    ).value = '';
    document.getElementById('braille-evaluation-box').classList.add('hidden');
    speak(__('essayStarted', quiz.question));
  }

  let totalSecondsLeft = 10 * 60;
  let lastSpokenMinute = 10;
  const timerDisplay = document.getElementById('active-quiz-timer');
  timerDisplay.textContent = '10:00';

  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
  }
  quizTimerInterval = setInterval(() => {
    totalSecondsLeft -= 1;

    const mins = Math.floor(totalSecondsLeft / 60);
    const secs = totalSecondsLeft % 60;
    const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerDisplay.textContent = display;

    if (secs === 0 && mins !== lastSpokenMinute) {
      lastSpokenMinute = mins;
      announceToScreenReader(__('quizTimeRemaining', mins));
      if (mins > 0 && !screenReaderMode) {
        speak(__('quizTimeRemaining', mins));
      }
    }

    if (totalSecondsLeft === 5 * 60) {
      speak(__('quizWarn5min'));
    } else if (totalSecondsLeft === 60) {
      speak(__('quizWarn1min'));
    } else if (totalSecondsLeft === 10) {
      speak(__('quizWarn10sec'));
    }

    if (totalSecondsLeft <= 0) {
      clearInterval(quizTimerInterval);
      submitQuizAnswer();
    }
  }, 1000);

  document.getElementById('active-quiz-panel').scrollIntoView({ behavior: 'smooth' });
  setTimeout(setupAccessibleVoices, 200);
  if (voiceExamActive) {
    setTimeout(function () {
      import('./voice-exam-listening.js').then((m) => m.readCurrentQuizAloud());
    }, 2000);
  }
}

/**
 * @param {string} option
 */
export function selectQuizOption(option) {
  selectedOption = option;
  speak(__('quizOptionSelected', option));

  ['A', 'B', 'C', 'D'].forEach((opt) => {
    const btn = document.getElementById(`btn-opt-${opt}`);
    if (opt === option) {
      btn.classList.add('bg-yellow-400', 'text-black');
    } else {
      btn.classList.remove('bg-yellow-400', 'text-black');
    }
  });
}

/** Clear the active quiz timer */
export function clearQuizTimer() {
  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
    quizTimerInterval = null;
  }
}

/** Submit the current quiz answer */
export function submitQuizAnswer() {
  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
  }

  const quiz = localData.assignments.find((a) => a.id === selectedQuizId);
  if (!quiz) {
    return;
  }

  let finalAnswer;
  let score;
  if (quiz.type === 'mcq') {
    if (!selectedOption) {
      speak(__('quizSelectOption'));
      return;
    }
    finalAnswer = selectedOption;
    score = selectedOption === quiz.correct ? 100 : 0;
  } else {
    finalAnswer = /** @type {HTMLTextAreaElement} */ (
      document.getElementById('assignment-student-answer')
    ).value.trim();
    if (!finalAnswer) {
      speak(__('quizEmptyAnswer'));
      return;
    }
    score = finalAnswer.length > 10 ? 90 : 50;
  }

  const session = getCurrentUserSession();
  const submission = {
    studentName: session?.name || __('fallbackStudent'),
    studentContact: session?.contact || '0555555555',
    parentContact: session?.parentContact || 'parent@cloudschool.com',
    quizId: selectedQuizId,
    quizTitle: quiz.title,
    studentAnswer: finalAnswer,
    initialScore: score,
    graderFeedback: quiz.type === 'mcq' ? __('autoGradingFeedback') : __('awaitingAIGrading'),
    timestamp: new Date().toLocaleTimeString('ar-EG'),
  };

  localData.submissions.unshift(submission);
  saveLocalData();
  saveSubmissionToFirebase(submission);
  addNotification(
    __('notifNewAnswer'),
    `${submission.studentName} ${__('notifQuizDone')} ${submission.quizTitle || ''} ${__('notifScored')} ${score}%`,
    'submission',
  );
  if (score >= 80) {
    addNotification(
      __('notifAchievement'),
      `${submission.studentName} ${__('notifScoredAchievement')} ${score}% ${__('notifInQuiz')} ${submission.quizTitle || ''}!`,
      'achievement',
    );
  }

  speak(__('quizSubmitted'));
  document.getElementById('active-quiz-panel').classList.add('hidden');
  selectedQuizId = null;
}
