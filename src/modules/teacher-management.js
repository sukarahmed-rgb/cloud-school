import { removeAnswerDraft } from './journey-state.js';
import { readContentFields, refreshContentViews } from './content-studio.js';
import { getAccountStorageKey } from './app-state.js';
// @ts-check
import { queueOfflineSave } from './offline-sync.js';
import { serverAvailable, serverSave } from './server-backend.js';
import { localData } from './app-state.js';
import { saveLocalData } from './local-data.js';
import { speak } from './speech.js';
import { __ } from './i18n.js';

/** Toggle between MCQ and text quiz fields */
export function toggleTeacherQuizType() {
  const type = /** @type {HTMLSelectElement} */ (document.getElementById('teacher-quiz-type'))
    .value;
  if (type === 'mcq') {
    document.getElementById('teacher-mcq-fields').classList.remove('hidden');
    document.getElementById('teacher-text-fields').classList.add('hidden');
  } else {
    document.getElementById('teacher-mcq-fields').classList.add('hidden');
    document.getElementById('teacher-text-fields').classList.remove('hidden');
  }
}

/**
 * @param {Event} e
 */
export function handleTeacherAddBook(e) {
  e.preventDefault();
  const title = /** @type {HTMLInputElement} */ (document.getElementById('teacher-book-title'))
    .value;
  const content = /** @type {HTMLInputElement} */ (document.getElementById('teacher-book-content'))
    .value;
  const audio = /** @type {HTMLInputElement} */ (document.getElementById('teacher-book-audio'))
    .value;

  const classId = /** @type {HTMLSelectElement|null} */ (
    document
      .getElementById('teacher-book-title')
      ?.closest('form')
      ?.querySelector('select[name=classId]')
  )?.value;
  const newBook = { ...readContentFields(document.getElementById('teacher-book-title')?.closest('form')), classId, id: `b${localData.books.length + 1}`, title, content, audio };
  localData.books.push(newBook);
  saveLocalData();

  saveBookToFirebase(newBook);
  speak(newBook.publicationStatus === 'draft' ? 'تم حفظ مسودة الدرس' : __('bookPublished'));
  refreshContentViews();
  const form = /** @type {HTMLFormElement|null} */ (e.target);
  if (form) {
    form.reset();
  }
}

/**
 * @param {Event} e
 */
export function handleTeacherAddQuiz(e) {
  e.preventDefault();
  const title = /** @type {HTMLInputElement} */ (document.getElementById('teacher-quiz-title'))
    .value;
  const type = /** @type {HTMLSelectElement} */ (document.getElementById('teacher-quiz-type'))
    .value;

  const newQuiz = /** @type {Assignment} */ ({
    classId: /** @type {HTMLSelectElement|null} */ (
      document
        .getElementById('teacher-quiz-title')
        ?.closest('form')
        ?.querySelector('select[name=classId]')
    )?.value,
    id: `a${localData.assignments.length + 1}`,
    title,
    type,
    ...readContentFields(document.getElementById('teacher-quiz-title')?.closest('form')),
  });

  if (type === 'mcq') {
    newQuiz.question = /** @type {HTMLInputElement} */ (
      document.getElementById('teacher-quiz-q')
    ).value;
    newQuiz.options = {
      A: /** @type {HTMLInputElement} */ (document.getElementById('teacher-quiz-oa')).value,
      B: /** @type {HTMLInputElement} */ (document.getElementById('teacher-quiz-ob')).value,
      C: /** @type {HTMLInputElement} */ (document.getElementById('teacher-quiz-oc')).value,
      D: /** @type {HTMLInputElement} */ (document.getElementById('teacher-quiz-od')).value,
    };
    newQuiz.correct = /** @type {HTMLInputElement} */ (
      document.getElementById('teacher-quiz-correct')
    ).value;
  } else {
    newQuiz.question = /** @type {HTMLInputElement} */ (
      document.getElementById('teacher-quiz-text-q')
    ).value;
    newQuiz.ideal = /** @type {HTMLInputElement} */ (
      document.getElementById('teacher-quiz-ideal-ans')
    ).value;
  }

  localData.assignments.push(newQuiz);
  saveLocalData();
  saveQuizToFirebase(newQuiz);
  speak(newQuiz.publicationStatus === 'draft' ? 'تم حفظ مسودة الواجب' : __('quizPublished'));
  refreshContentViews();
  const form = /** @type {HTMLFormElement|null} */ (e.target);
  if (form) {
    form.reset();
  }
}

/** Render the teacher dashboard */
export function renderTeacherDashboard() {
  import('./dashboards/teacher-dashboard.js').then((m) => m.renderTeacherDashboard());
}

/** Render the teacher submissions list */
export function renderTeacherSubmissions() {
  import('./dashboards/teacher-dashboard.js').then((m) => m.renderTeacherSubmissions());
}

export function renderGradeDistribution() {}
export function renderStudentPerformanceTable() {}
export function generateTeacherReport() {}

/**
 * @param {Book} book
 */
export function saveBookToFirebase(book) {
  const owner = getAccountStorageKey();
  if (serverAvailable) {
    return serverSave('curriculum_modules', book).then(saved => { if (getAccountStorageKey() === owner) { Object.assign(book, saved); saveLocalData(); refreshContentViews(); } return saved; }).catch(() => {
      if (getAccountStorageKey() === owner) {
        return queueOfflineSave('curriculum_modules', book);
      }
      return false;
    });
  }
  return queueOfflineSave('curriculum_modules', book);
}

/**
 * @param {Assignment} quiz
 */
export function saveQuizToFirebase(quiz) {
  const owner = getAccountStorageKey();
  if (serverAvailable) {
    return serverSave('assignments', quiz).then(saved => { if (getAccountStorageKey() === owner) { Object.assign(quiz, saved); saveLocalData(); refreshContentViews(); } return saved; }).catch(() => {
      if (getAccountStorageKey() === owner) {
        return queueOfflineSave('assignments', quiz);
      }
      return false;
    });
  }
  return queueOfflineSave('assignments', quiz);
}

/**
 * @param {Submission} sub
 */
export async function saveSubmissionToFirebase(sub) {
  const owner = getAccountStorageKey();
  sub.syncStatus = 'pending';
  saveLocalData();
  if (serverAvailable) {
    try {
      const saved = await serverSave('submissions', sub);
      if (getAccountStorageKey() === owner) {
        Object.assign(sub, saved, { syncStatus: 'sent' });
        removeAnswerDraft(sub.quizId);
        saveLocalData();
        speak('تم إرسال الإجابة إلى المدرسة');
        import('./learning-journey.js').then(m => m.renderLearningJourney());
      }
      return;
    } catch (error) {
      if (getAccountStorageKey() !== owner) {
        return;
      }
      if (error.status >= 400 && error.status < 500) {
        sub.syncStatus = 'failed';
        saveLocalData();
        speak('لم يتم تسليم الإجابة. تحقق من صلاحية الواجب ثم حاول مرة أخرى.');
        return;
      }
    }
  }
  const queued = await queueOfflineSave('submissions', sub);
  if (getAccountStorageKey() === owner) {
    sub.syncStatus = queued ? 'pending' : 'failed';
    saveLocalData();
    import('./learning-journey.js').then(m => m.renderLearningJourney());
    speak(
      queued
        ? 'الإجابة محفوظة على هذا الجهاز وتنتظر الاتصال. لم يتم تسليمها بعد.'
        : 'تعذر حفظ الإجابة أو إرسالها. حاول مرة أخرى.',
    );
  }
}

/**
 * @param {Student} student
 */
export function saveStudentToFirebase(student) {
  const owner = getAccountStorageKey();
  if (serverAvailable) {
    return serverSave('students', student).catch(() => {
      if (getAccountStorageKey() === owner) {
        return queueOfflineSave('students', student);
      }
      return false;
    });
  }
  return queueOfflineSave('students', student);
}
