import {
  renderStudentBooks,
  readBookAloud,
  playBookAudio,
  readActiveBookWithAi,
  controlAudiobook,
} from '../../src/modules/books.js';

describe('books.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="student-books-grid"></div>
      <div id="audiobook-player" class="hidden"></div>
      <div id="audiobook-playing-title"></div>
      <div id="book-ai-summary-box" class="hidden"></div>
    `;
    window.localData = {
      books: [
        { id: 'b1', title: 'Book 1', content: 'Content 1' },
        { id: 'b2', title: 'Book 2', content: 'Content 2' },
      ],
    };
    window.escapeHtml = jest.fn((s) => s);
    window.__ = jest.fn((k, ...args) => {
      if (args.length) {
        return `${k} ${args.join(', ')}`;
      }
      return k;
    });
    window.speak = jest.fn();
    jest.clearAllMocks();
  });

  test('renderStudentBooks renders book cards', () => {
    renderStudentBooks();
    const grid = document.getElementById('student-books-grid');
    expect(grid.children.length).toBe(2);
    expect(grid.children[0].querySelector('h4').textContent).toBe('Book 1');
    expect(grid.children[1].querySelector('h4').textContent).toBe('Book 2');
  });

  test('renderStudentBooks renders read and play buttons for each book', () => {
    renderStudentBooks();
    const firstBook = document.getElementById('student-books-grid').children[0];
    const buttons = firstBook.querySelectorAll('[data-action]');
    expect(buttons.length).toBe(2);
    expect(buttons[0].dataset.action).toBe('read-book');
    expect(buttons[1].dataset.action).toBe('play-book');
  });

  test('renderStudentBooks handles empty books array', () => {
    window.localData.books = [];
    renderStudentBooks();
    const grid = document.getElementById('student-books-grid');
    expect(grid.children.length).toBe(0);
  });

  test('readBookAloud speaks the book content', () => {
    readBookAloud('b1');
    expect(window.speak).toHaveBeenCalled();
  });

  test('readBookAloud does nothing for unknown book', () => {
    readBookAloud('nonexistent');
    expect(window.speak).not.toHaveBeenCalled();
  });

  test('playBookAudio shows audiobook player and speaks', () => {
    playBookAudio('b1');
    const player = document.getElementById('audiobook-player');
    expect(player.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('audiobook-playing-title').textContent).toBeTruthy();
    expect(window.speak).toHaveBeenCalled();
  });

  test('readActiveBookWithAi does nothing when no book is playing', () => {
    jest.isolateModules(() => {
      const { readActiveBookWithAi } = require('../../src/modules/books.js');
      readActiveBookWithAi();
      expect(window.speak).not.toHaveBeenCalled();
    });
  });

  test('playBookAudio does nothing for unknown book', () => {
    playBookAudio('nonexistent');
    expect(document.getElementById('audiobook-player').classList.contains('hidden')).toBe(true);
  });

  test('readActiveBookWithAi reads currently playing book', () => {
    playBookAudio('b1');
    readActiveBookWithAi();
    expect(window.speak).toHaveBeenCalled();
  });

  test('controlAudiobook stop hides player and summary and speaks', () => {
    playBookAudio('b1');
    document.getElementById('audiobook-player').classList.remove('hidden');
    document.getElementById('book-ai-summary-box').classList.remove('hidden');
    controlAudiobook('stop');
    expect(document.getElementById('audiobook-player').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('book-ai-summary-box').classList.contains('hidden')).toBe(true);
    expect(window.speak).toHaveBeenCalled();
  });
});
