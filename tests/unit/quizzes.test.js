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
} from '../../src/modules/quizzes.js';
import { localData, setCurrentUserSession } from '../../src/modules/app-state.js';
import { saveLocalData } from '../../src/modules/local-data.js';
import { speak } from '../../src/modules/speech.js';
import { addNotification } from '../../src/modules/notifications.js';

const MSGS = {
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

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((key, ...args) => {
    let msg = MSGS[key] || key;
    args.forEach((a, i) => {
      msg = msg.replace('{0}', String(a)).replace(`{${i}}`, String(a));
    });
    return msg;
  }),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
  screenReaderMode: false,
  setupAccessibleVoices: jest.fn(),
}));

jest.mock('../../src/modules/local-data.js', () => ({
  saveLocalData: jest.fn(),
}));

jest.mock('../../src/modules/notifications.js', () => ({
  addNotification: jest.fn(),
}));

jest.mock('../../src/modules/ui-core.js', () => ({
  announceToScreenReader: jest.fn(),
}));

jest.mock('../../src/modules/teacher-management.js', () => ({
  saveSubmissionToFirebase: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  Element.prototype.scrollIntoView = jest.fn();
  jest.useFakeTimers();
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

  localData.assignments = [
    {
      id: 'a1',
      title: 'اختبار العلوم',
      type: 'mcq',
      question: 'ما هو الأوزون؟',
      options: { A: 'O2', B: 'O3', C: 'CO2', D: 'H2O' },
      correct: 'B',
    },
    { id: 'a2', title: 'موضوع تعبير', type: 'text', question: 'اكتب فقرة', ideal: 'نص طويل' },
  ];
  localData.submissions = [];
  localData.notifications = [];
  setCurrentUserSession(/** @type {any} */ ({ name: 'أحمد', contact: 'ahmed@test.com' }));
});

afterEach(() => {
  jest.useRealTimers();
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
    localData.assignments = [];
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
    startQuiz('a1');
    const spy = jest.spyOn(global, 'clearInterval');
    clearQuizTimer();
    expect(spy).toHaveBeenCalled();
  });
});

describe('quizzes.js - submitQuizAnswer', () => {
  test('submits MCQ answer', () => {
    startQuiz('a1');
    selectQuizOption('B');
    submitQuizAnswer();
    expect(saveLocalData).toHaveBeenCalled();
    expect(addNotification).toHaveBeenCalled();
    expect(document.getElementById('active-quiz-panel').classList.contains('hidden')).toBe(true);
  });

  test('rejects MCQ without selection', () => {
    startQuiz('a1');
    submitQuizAnswer();
    expect(speak).toHaveBeenCalledWith('اختر إجابة');
  });
});
