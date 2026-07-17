// @ts-check
import { queueOfflineSave } from './offline-sync.js';

/** @type {boolean} */
export let serverAvailable = false;

/**
 * @param {boolean} val
 */
export function setServerAvailable(val) {
  serverAvailable = val;
}

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

  const newBook = { id: `b${window.localData.books.length + 1}`, title, content, audio };
  window.localData.books.push(newBook);
  window.saveLocalData();

  saveBookToFirebase(newBook);
  window.speak(window.__('bookPublished'));
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
    id: `a${window.localData.assignments.length + 1}`,
    title,
    type,
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

  window.localData.assignments.push(newQuiz);
  window.saveLocalData();
  saveQuizToFirebase(newQuiz);
  window.speak(window.__('quizPublished'));
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
  if (serverAvailable) {
    window
      .serverSave('curriculum_modules', book)
      .catch(() => queueOfflineSave('curriculum_modules', book));
  } else {
    queueOfflineSave('curriculum_modules', book);
  }
}

/**
 * @param {Assignment} quiz
 */
export function saveQuizToFirebase(quiz) {
  if (serverAvailable) {
    window.serverSave('assignments', quiz).catch(() => queueOfflineSave('assignments', quiz));
  } else {
    queueOfflineSave('assignments', quiz);
  }
}

/**
 * @param {Submission} sub
 */
export function saveSubmissionToFirebase(sub) {
  if (serverAvailable) {
    window.serverSave('submissions', sub).catch(() => queueOfflineSave('submissions', sub));
  } else {
    queueOfflineSave('submissions', sub);
  }
}

/**
 * @param {Student} student
 */
export function saveStudentToFirebase(student) {
  if (serverAvailable) {
    window.serverSave('students', student).catch(() => queueOfflineSave('students', student));
  } else {
    queueOfflineSave('students', student);
  }
}
