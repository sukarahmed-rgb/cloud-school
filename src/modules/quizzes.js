// @ts-check
import { speakToUser } from './audio-core.js';
import { saveSubmissionToFirebase } from './teacher-management.js';

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

  window.localData.assignments.forEach((a) => {
    const item = document.createElement('div');
    item.className = 'card p-6 rounded-xl flex justify-between items-center flex-wrap gap-4';
    item.innerHTML = `
            <div>
                <h4 class="text-2xl font-black">${window.escapeHtml(a.title)}</h4>
                <span class="text-sm px-2 py-1 bg-yellow-400 text-black rounded font-bold">${a.type === 'mcq' ? window.__('typeMCQ') : window.__('typeEssay')}</span>
            </div>
            <button data-action="start-quiz" data-quiz-id="${window.escapeHtml(a.id)}" class="p-4 bg-green-600 text-white font-black text-lg rounded-xl hover:bg-green-500 large-touch-target btn-interactive">${window.__('btnStartQuiz')} \u{1F3DF}</button>
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
  const quiz = window.localData.assignments.find((a) => a.id === quizId);
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
      `${window.__('optA')} ${quiz.options.A}`;
    document.getElementById('btn-opt-B').querySelector('span').textContent =
      `${window.__('optB')} ${quiz.options.B}`;
    document.getElementById('btn-opt-C').querySelector('span').textContent =
      `${window.__('optC')} ${quiz.options.C}`;
    document.getElementById('btn-opt-D').querySelector('span').textContent =
      `${window.__('optD')} ${quiz.options.D}`;

    window.speak(window.__('quizStarted', quiz.title, quiz.question));
  } else {
    document.getElementById('quiz-question-container').classList.add('hidden');
    document.getElementById('quiz-text-input-section').classList.remove('hidden');

    /** @type {HTMLTextAreaElement} */ (
      document.getElementById('assignment-student-answer')
    ).value = '';
    document.getElementById('braille-evaluation-box').classList.add('hidden');
    window.speak(window.__('essayStarted', quiz.question));
  }

  let totalSecondsLeft = 10 * 60;
  let lastSpokenMinute = 10;
  const timerDisplay = document.getElementById('active-quiz-timer');
  timerDisplay.textContent = '10:00';
  timerDisplay.setAttribute('aria-live', 'polite');
  timerDisplay.setAttribute('aria-atomic', 'true');

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
      window.announceToScreenReader(window.__('quizTimeRemaining', mins));
      if (mins > 0 && !window.screenReaderMode) {
        window.speak(window.__('quizTimeRemaining', mins));
      }
    }

    if (totalSecondsLeft === 5 * 60) {
      window.speak(window.__('quizWarn5min'));
    } else if (totalSecondsLeft === 60) {
      window.speak(window.__('quizWarn1min'));
    } else if (totalSecondsLeft === 10) {
      window.speak(window.__('quizWarn10sec'));
    }

    if (totalSecondsLeft <= 0) {
      clearInterval(quizTimerInterval);
      submitQuizAnswer();
    }
  }, 1000);

  document.getElementById('active-quiz-panel').scrollIntoView({ behavior: 'smooth' });
  setTimeout(window.setupAccessibleVoices, 200);
}

/**
 * @param {string} option
 */
export function selectQuizOption(option) {
  selectedOption = option;
  window.speak(window.__('quizOptionSelected', option));

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

  const quiz = window.localData.assignments.find((a) => a.id === selectedQuizId);
  if (!quiz) {
    return;
  }

  let finalAnswer;
  let score;
  if (quiz.type === 'mcq') {
    if (!selectedOption) {
      window.speak(window.__('quizSelectOption'));
      return;
    }
    finalAnswer = selectedOption;
    score = selectedOption === quiz.correct ? 100 : 0;
  } else {
    finalAnswer = /** @type {HTMLTextAreaElement} */ (
      document.getElementById('assignment-student-answer')
    ).value.trim();
    if (!finalAnswer) {
      window.speak(window.__('quizEmptyAnswer'));
      return;
    }
    score = finalAnswer.length > 10 ? 90 : 50;
  }

  const submission = {
    studentName: window.currentUserSession?.name || window.__('fallbackStudent'),
    studentContact: window.currentUserSession?.contact || '0555555555',
    parentContact: window.currentUserSession?.parentContact || 'parent@cloudschool.com',
    quizId: selectedQuizId,
    quizTitle: quiz.title,
    studentAnswer: finalAnswer,
    initialScore: score,
    graderFeedback:
      quiz.type === 'mcq' ? window.__('autoGradingFeedback') : window.__('awaitingAIGrading'),
    timestamp: new Date().toLocaleTimeString('ar-EG'),
  };

  window.localData.submissions.unshift(submission);
  window.saveLocalData();
  saveSubmissionToFirebase(submission);
  window.addNotification(
    window.__('notifNewAnswer'),
    `${submission.studentName} ${window.__('notifQuizDone')} ${submission.quizTitle || ''} ${window.__('notifScored')} ${score}%`,
    'submission',
  );
  if (score >= 80) {
    window.addNotification(
      window.__('notifAchievement'),
      `${submission.studentName} ${window.__('notifScoredAchievement')} ${score}% ${window.__('notifInQuiz')} ${submission.quizTitle || ''}!`,
      'achievement',
    );
  }

  window.speak(window.__('quizSubmitted'));
  document.getElementById('active-quiz-panel').classList.add('hidden');
  selectedQuizId = null;
}
