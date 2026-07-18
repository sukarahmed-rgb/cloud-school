import {
  toggleTeacherQuizType,
  handleTeacherAddBook,
  handleTeacherAddQuiz,
  setServerAvailable,
  serverAvailable,
} from '../../src/modules/teacher-management.js';

jest.mock('../../src/modules/offline-sync.js', () => ({
  queueOfflineSave: jest.fn(),
}));

describe('teacher-management.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="teacher-quiz-type">
        <option value="mcq">MCQ</option>
        <option value="text">Text</option>
      </select>
      <div id="teacher-mcq-fields" class="hidden"></div>
      <div id="teacher-text-fields" class="hidden"></div>
      <input id="teacher-book-title" value="Book 3" />
      <input id="teacher-book-content" value="Content" />
      <input id="teacher-book-audio" value="audio.mp3" />
      <input id="teacher-quiz-title" value="Quiz 3" />
      <input id="teacher-quiz-q" value="Question?" />
      <input id="teacher-quiz-oa" value="A" />
      <input id="teacher-quiz-ob" value="B" />
      <input id="teacher-quiz-oc" value="C" />
      <input id="teacher-quiz-od" value="D" />
      <input id="teacher-quiz-correct" value="A" />
      <input id="teacher-quiz-text-q" value="Essay?" />
      <input id="teacher-quiz-ideal-ans" value="Ideal" />
    `;
    window.localData = { books: [], assignments: [] };
    window.saveLocalData = jest.fn();
    window.speak = jest.fn();
    window.__ = jest.fn((k) => k);
    window.serverSave = jest.fn();
  });

  test('toggleTeacherQuizType shows MCQ fields', () => {
    toggleTeacherQuizType();
    expect(document.getElementById('teacher-mcq-fields').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('teacher-text-fields').classList.contains('hidden')).toBe(true);
  });

  test('toggleTeacherQuizType shows text fields', () => {
    document.getElementById('teacher-quiz-type').value = 'text';
    toggleTeacherQuizType();
    expect(document.getElementById('teacher-mcq-fields').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('teacher-text-fields').classList.contains('hidden')).toBe(false);
  });

  test('handleTeacherAddBook adds book and speaks', () => {
    const e = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
    handleTeacherAddBook(e);
    expect(window.localData.books.length).toBe(1);
    expect(window.localData.books[0].title).toBe('Book 3');
    expect(window.speak).toHaveBeenCalledWith('bookPublished');
    expect(e.preventDefault).toHaveBeenCalled();
  });

  test('handleTeacherAddQuiz adds MCQ quiz', () => {
    const e = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
    handleTeacherAddQuiz(e);
    expect(window.localData.assignments.length).toBe(1);
    expect(window.localData.assignments[0].type).toBe('mcq');
    expect(window.speak).toHaveBeenCalledWith('quizPublished');
  });

  test('handleTeacherAddQuiz adds text quiz', () => {
    document.getElementById('teacher-quiz-type').value = 'text';
    const e = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
    handleTeacherAddQuiz(e);
    expect(window.localData.assignments.length).toBe(1);
    expect(window.localData.assignments[0].type).toBe('text');
  });

  test('setServerAvailable updates serverAvailable', () => {
    expect(serverAvailable).toBe(false);
    setServerAvailable(true);
    expect(serverAvailable).toBe(true);
  });
});
