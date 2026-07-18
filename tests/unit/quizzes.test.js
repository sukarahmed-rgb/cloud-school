// @ts-check
/**
 * @jest-environment jsdom
 */
import {
  renderStudentAssignments,
  startQuiz,
  selectQuizOption,
  clearQuizTimer,
  submitQuizAnswer,
  selectedOption,
} from '../../src/modules/quizzes.js';

beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
  jest.useFakeTimers();
  global.indexedDB = {
    open: jest.fn(() => {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => req.onerror?.({ target: { error: new Error('mock') } }), 0);
      return req;
    }),
  };
  document.body.innerHTML = `
    <div id="student-assignments-list"></div>
    <div id="active-quiz-panel" class="hidden"></div>
    <div id="active-quiz-title"></div>
    <div id="quiz-question-container" class="hidden"></div>
    <div id="quiz-question-text"></div>
    <div id="quiz-text-input-section" class="hidden"></div>
    <div id="active-quiz-timer"></div>
    <div id="braille-evaluation-box" class="hidden"></div>
    <textarea id="assignment-student-answer"></textarea>
    <button id="btn-opt-A"><span></span></button>
    <button id="btn-opt-B"><span></span></button>
    <button id="btn-opt-C"><span></span></button>
    <button id="btn-opt-D"><span></span></button>
  `;

  window.localData = {
    assignments: [
      {
        id: 'a1',
        title: 'اختبار العلوم',
        type: 'mcq',
        question: 'ما هو الأوزون؟',
        options: { A: 'O2', B: 'O3', C: 'CO2', D: 'H2O' },
        correct: 'B',
      },
      { id: 'a2', title: 'موضوع تعبير', type: 'text', question: 'اكتب فقرة', ideal: 'نص طويل' },
    ],
    submissions: [],
    notifications: [],
  };
  window.__ = (key, ...args) => {
    const msgs = {
      typeMCQ: 'اختياري',
      typeEssay: 'مقالي',
      btnStartQuiz: 'ابدأ',
      optA: 'أ)',
      optB: 'ب)',
      optC: 'ج)',
      optD: 'د)',
      quizStarted: 'بدأ الاختبار',
      essayStarted: 'بدأ المقال',
      quizTimeRemaining: 'تبقى {0} دقائق',
      quizWarn5min: 'تبقى 5 دقائق',
      quizWarn1min: 'دقيقة واحدة',
      quizWarn10sec: '10 ثوان',
      quizSelectOption: 'اختر إجابة',
      quizEmptyAnswer: 'الإجابة فارغة',
      quizSubmitted: 'تم الإرسال',
      fallbackStudent: 'طالب',
      autoGradingFeedback: 'تصحيح تلقائي',
      awaitingAIGrading: 'بانتظار تصحيح AI',
      notifNewAnswer: 'إجابة جديدة',
      notifQuizDone: 'حل',
      notifScored: 'الدرجة',
      notifAchievement: 'إنجاز',
      notifScoredAchievement: 'حقق',
      notifInQuiz: 'في',
    };
    let msg = msgs[key] || key;
    args.forEach((a, i) => {
      msg = msg.replace('{0}', a).replace(`{${i}}`, a);
    });
    return msg;
  };
  window.speak = jest.fn();
  window.escapeHtml = (s) => String(s);
  window.saveLocalData = jest.fn();
  window.addNotification = jest.fn();
  window.announceToScreenReader = jest.fn();
  window.screenReaderMode = false;
  window.currentUserSession = { name: 'أحمد', contact: 'ahmed@test.com' };
  window.setupAccessibleVoices = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  delete global.indexedDB;
});

describe('quizzes.js - renderStudentAssignments', () => {
  test('renders assignment list', () => {
    renderStudentAssignments();
    const list = document.getElementById('student-assignments-list');
    expect(list.children.length).toBe(2);
    expect(list.textContent).toContain('اختبار العلوم');
    expect(list.textContent).toContain('موضوع تعبير');
  });

  test('handles empty assignments', () => {
    window.localData.assignments = [];
    renderStudentAssignments();
    expect(document.getElementById('student-assignments-list').children.length).toBe(0);
  });
});

describe('quizzes.js - startQuiz', () => {
  test('starts MCQ quiz', () => {
    startQuiz('a1');
    expect(document.getElementById('active-quiz-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('quiz-question-container').classList.contains('hidden')).toBe(
      false,
    );
    expect(document.getElementById('active-quiz-title').textContent).toBe('اختبار العلوم');
  });

  test('starts essay quiz', () => {
    startQuiz('a2');
    expect(document.getElementById('quiz-question-container').classList.contains('hidden')).toBe(
      true,
    );
    expect(document.getElementById('quiz-text-input-section').classList.contains('hidden')).toBe(
      false,
    );
  });

  test('does nothing for unknown quiz', () => {
    expect(() => startQuiz('unknown')).not.toThrow();
  });
});

describe('quizzes.js - selectQuizOption', () => {
  test('highlights selected option', () => {
    selectQuizOption('A');
    expect(document.getElementById('btn-opt-A').classList.contains('bg-yellow-400')).toBe(true);
    expect(document.getElementById('btn-opt-B').classList.contains('bg-yellow-400')).toBe(false);
  });
});

describe('quizzes.js - clearQuizTimer', () => {
  test('clears interval', () => {
    const spy = jest.spyOn(global, 'clearInterval');
    const { quizTimerInterval } = require('../../src/modules/quizzes.js');
    clearQuizTimer();
    expect(spy).toHaveBeenCalled();
  });
});

describe('quizzes.js - submitQuizAnswer', () => {
  test('submits MCQ answer', () => {
    startQuiz('a1');
    selectQuizOption('B');
    submitQuizAnswer();
    expect(window.saveLocalData).toHaveBeenCalled();
    expect(window.addNotification).toHaveBeenCalled();
    expect(document.getElementById('active-quiz-panel').classList.contains('hidden')).toBe(true);
  });

  test('rejects MCQ without selection', () => {
    startQuiz('a1');
    submitQuizAnswer();
    expect(window.speak).toHaveBeenCalledWith('اختر إجابة');
  });
});
