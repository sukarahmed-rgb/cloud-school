import {
  toggleTeacherQuizType,
  handleTeacherAddBook,
  handleTeacherAddQuiz,
  saveBookToFirebase,
} from '../../src/modules/teacher-management.js';
import {
  setServerAvailable,
  serverAvailable,
  serverSave,
} from '../../src/modules/server-backend.js';
import { queueOfflineSave } from '../../src/modules/offline-sync.js';
import { localData } from '../../src/modules/app-state.js';
import { speak } from '../../src/modules/speech.js';

jest.mock('../../src/modules/offline-sync.js', () => ({
  queueOfflineSave: jest.fn(),
}));

jest.mock('../../src/modules/local-data.js', () => ({
  saveLocalData: jest.fn(),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
}));

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));

let mockServerAvailable = false;

jest.mock('../../src/modules/server-backend.js', () => ({
  get serverAvailable() {
    return mockServerAvailable;
  },
  setServerAvailable: (val) => {
    mockServerAvailable = val;
  },
  serverSave: jest.fn(() => Promise.resolve()),
}));

describe('teacher-management.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    localData.books = [];
    localData.assignments = [];
    mockServerAvailable = false;
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
    expect(localData.books.length).toBe(1);
    expect(localData.books[0].title).toBe('Book 3');
    expect(speak).toHaveBeenCalledWith('bookPublished');
    expect(e.preventDefault).toHaveBeenCalled();
  });

  test('handleTeacherAddQuiz adds MCQ quiz', () => {
    const e = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
    handleTeacherAddQuiz(e);
    expect(localData.assignments.length).toBe(1);
    expect(localData.assignments[0].type).toBe('mcq');
    expect(speak).toHaveBeenCalledWith('quizPublished');
  });

  test('handleTeacherAddQuiz adds text quiz', () => {
    document.getElementById('teacher-quiz-type').value = 'text';
    const e = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
    handleTeacherAddQuiz(e);
    expect(localData.assignments.length).toBe(1);
    expect(localData.assignments[0].type).toBe('text');
  });

  test('setServerAvailable flips the live binding', () => {
    expect(serverAvailable).toBe(false);
    setServerAvailable(true);
    expect(serverAvailable).toBe(true);
  });

  test('saveBookToFirebase posts to server when available', async () => {
    setServerAvailable(true);
    const book = { id: 'b1', title: 'T', content: 'C', audio: '' };
    await saveBookToFirebase(book);
    expect(serverSave).toHaveBeenCalledWith('curriculum_modules', book);
    expect(queueOfflineSave).not.toHaveBeenCalled();
  });

  test('saveBookToFirebase queues offline when server unavailable', () => {
    setServerAvailable(false);
    const book = { id: 'b2', title: 'T2', content: 'C2', audio: '' };
    saveBookToFirebase(book);
    expect(queueOfflineSave).toHaveBeenCalledWith('curriculum_modules', book);
    expect(serverSave).not.toHaveBeenCalled();
  });
});
