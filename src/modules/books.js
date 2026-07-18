// @ts-check
/** @type {string|null} */
export let currentlyPlayingBookId = null;
/** @type {HTMLAudioElement|null} */
export let activeAudioElement = null;

/** Render the student books grid */
export function renderStudentBooks() {
  const grid = document.getElementById('student-books-grid');
  grid.innerHTML = '';

  window.localData.books.forEach((b) => {
    const item = document.createElement('div');
    item.className = 'card p-6 rounded-xl flex flex-col justify-between items-start gap-4';
    item.innerHTML = `
            <h4 class="text-2xl font-black">${window.escapeHtml(b.title)}</h4>
            <p class="text-sm line-clamp-3">${window.escapeHtml(b.content)}</p>
            <div class="flex gap-2 w-full flex-wrap">
                <button data-action="read-book" data-book-id="${window.escapeHtml(b.id)}" class="flex-1 p-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 btn-interactive">\u{1F4D6} ${window.__('btnReadAI')}</button>
                <button data-action="play-book" data-book-id="${window.escapeHtml(b.id)}" class="flex-1 p-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 btn-interactive">\u{1F3A7} ${window.__('btnListenAudio')}</button>
            </div>
        `;
    grid.appendChild(item);
  });

  grid.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const btn = /** @type {HTMLElement|null} */ (target.closest('[data-action]'));
    if (!btn) {
      return;
    }
    const bookId = btn.dataset.bookId;
    if (btn.dataset.action === 'read-book') {
      readBookAloud(bookId);
    }
    if (btn.dataset.action === 'play-book') {
      playBookAudio(bookId);
    }
  });
}

/**
 * @param {string} bookId
 */
export function readBookAloud(bookId) {
  const book = window.localData.books.find((b) => b.id === bookId);
  if (book) {
    window.speak(window.__('readBookAloud', book.title, book.content));
  }
}

/**
 * @param {string} bookId
 */
export function playBookAudio(bookId) {
  currentlyPlayingBookId = bookId;
  const book = window.localData.books.find((b) => b.id === bookId);
  if (book) {
    const player = document.getElementById('audiobook-player');
    player.classList.remove('hidden');
    document.getElementById('audiobook-playing-title').textContent = window.__(
      'listeningToBook',
      book.title,
    );
    window.speak(window.__('audioPlayerReady', book.title));
  }
}

/** Read the currently active book content aloud */
export function readActiveBookWithAi() {
  if (!currentlyPlayingBookId) {
    return;
  }
  const book = window.localData.books.find((b) => b.id === currentlyPlayingBookId);
  if (book) {
    window.speak(book.content);
  }
}

/**
 * @param {string} action
 */
export function controlAudiobook(action) {
  if (action === 'stop') {
    document.getElementById('audiobook-player').classList.add('hidden');
    document.getElementById('book-ai-summary-box').classList.add('hidden');
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement = null;
    }
    window.speak(window.__('audiobookStopped'));
  }
}
