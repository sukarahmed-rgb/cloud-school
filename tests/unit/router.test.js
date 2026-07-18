import {
  openStudentSection,
  closeStudentSection,
  setupKeyboardShortcuts,
} from '../../src/modules/router.js';
import { showKeyboardHelp, focusElement } from '../../src/modules/ui-core.js';
import { speak } from '../../src/modules/speech.js';

jest.mock('../../src/modules/ui-core.js', () => ({
  showKeyboardHelp: jest.fn(),
  focusElement: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
  document.body.innerHTML = `
    <div id="student-sub-books" class="hidden"></div>
    <div id="student-sub-assignments" class="hidden"></div>
    <div id="student-sub-image-describer" class="hidden"></div>
    <div id="student-sub-games" class="hidden"></div>
    <div id="student-sub-ai-tutor" class="hidden"></div>
    <div id="student-sub-dialogic-classroom" class="hidden"></div>
    <div id="student-sub-study-group" class="hidden"></div>
    <div id="student-sub-dashboard" class="hidden"></div>
    <div id="student-section-container" class="hidden"></div>
    <div id="student-section-title"></div>
    <div id="main-content"></div>
    <div id="dev-role-bar" class="hidden"></div>
    <button data-student-section="books" class="bg-yellow-400"></button>
    <button id="dot-1"></button>
  `;
  window.__ = jest.fn((key, ...args) => args[0] || key);
  window.speak = jest.fn();
  window.renderStudentBooks = jest.fn();
  window.renderStudentAssignments = jest.fn();
  window.renderStudentDashboard = jest.fn();
  window.setupAccessibleVoices = jest.fn();
  window.controlAudiobook = jest.fn();
  window.toggleAudioRecording = jest.fn();
  window.toggleScreenReaderMode = jest.fn();
  window.toggleAudioCoPilot = jest.fn();
  window.toggleTtsEngine = jest.fn();
  window.adjustTextSize = jest.fn();
  window.cycleTheme = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('router.js - openStudentSection', () => {
  test('opens books section', () => {
    openStudentSection('books');
    expect(document.getElementById('student-sub-books').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('student-section-container').classList.contains('hidden')).toBe(
      false,
    );
    expect(window.renderStudentBooks).toHaveBeenCalled();
    expect(window.speak).toHaveBeenCalled();
  });

  test('opens assignments section', () => {
    openStudentSection('assignments');
    expect(document.getElementById('student-sub-assignments').classList.contains('hidden')).toBe(
      false,
    );
    expect(window.renderStudentAssignments).toHaveBeenCalled();
  });

  test('opens image describer section', () => {
    openStudentSection('image-describer');
    expect(
      document.getElementById('student-sub-image-describer').classList.contains('hidden'),
    ).toBe(false);
    expect(window.speak).toHaveBeenCalled();
  });

  test('opens games section', () => {
    openStudentSection('games');
    expect(document.getElementById('student-sub-games').classList.contains('hidden')).toBe(false);
    expect(window.speak).toHaveBeenCalled();
  });

  test('opens ai-tutor section', () => {
    openStudentSection('ai-tutor');
    expect(document.getElementById('student-sub-ai-tutor').classList.contains('hidden')).toBe(
      false,
    );
    expect(window.speak).toHaveBeenCalled();
  });

  test('opens dialogic-classroom section', () => {
    openStudentSection('dialogic-classroom');
    expect(
      document.getElementById('student-sub-dialogic-classroom').classList.contains('hidden'),
    ).toBe(false);
  });

  test('opens study-group section', () => {
    openStudentSection('study-group');
    expect(document.getElementById('student-sub-study-group').classList.contains('hidden')).toBe(
      false,
    );
  });

  test('opens dashboard section', () => {
    openStudentSection('dashboard');
    expect(document.getElementById('student-sub-dashboard').classList.contains('hidden')).toBe(
      false,
    );
    expect(window.renderStudentDashboard).toHaveBeenCalled();
  });

  test('hides all previous sections when opening a new one', () => {
    openStudentSection('books');
    openStudentSection('games');
    expect(document.getElementById('student-sub-books').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('student-sub-games').classList.contains('hidden')).toBe(false);
  });
});

describe('router.js - closeStudentSection', () => {
  test('hides section container', () => {
    document.getElementById('student-section-container').classList.remove('hidden');
    closeStudentSection();
    expect(document.getElementById('student-section-container').classList.contains('hidden')).toBe(
      true,
    );
    expect(window.speak).toHaveBeenCalled();
  });

  test('calls controlAudiobook stop', () => {
    closeStudentSection();
    expect(window.controlAudiobook).toHaveBeenCalledWith('stop');
  });
});

describe('router.js - setupKeyboardShortcuts', () => {
  test('registers keydown listener', () => {
    setupKeyboardShortcuts();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    jest.advanceTimersByTime(100);
    expect(window.speak).toHaveBeenCalled();
  });

  test('keys 1-8 open corresponding sections', () => {
    setupKeyboardShortcuts();
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8'];
    keys.forEach((key) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key }));
    });
    expect(window.renderStudentBooks).toHaveBeenCalled();
    expect(window.renderStudentAssignments).toHaveBeenCalled();
    expect(window.renderStudentDashboard).toHaveBeenCalled();
  });

  test('key 0 closes section', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
    expect(window.speak).toHaveBeenCalled();
  });

  test('key h shows keyboard help', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
    expect(showKeyboardHelp).toHaveBeenCalled();
  });

  test('key t cycles theme', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    expect(window.cycleTheme).toHaveBeenCalled();
  });

  test('Ctrl+M toggles audio recording', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', ctrlKey: true }));
    expect(window.toggleAudioRecording).toHaveBeenCalled();
  });

  test('Ctrl+Shift+S toggles screen reader', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true }),
    );
    expect(window.toggleScreenReaderMode).toHaveBeenCalled();
  });

  test('Ctrl+Shift+A toggles audio co-pilot', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, shiftKey: true }),
    );
    expect(window.toggleAudioCoPilot).toHaveBeenCalled();
  });

  test('Ctrl+Shift+T toggles TTS engine', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 't', ctrlKey: true, shiftKey: true }),
    );
    expect(window.toggleTtsEngine).toHaveBeenCalled();
  });

  test('Ctrl+= increases text size', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '=', ctrlKey: true }));
    expect(window.adjustTextSize).toHaveBeenCalledWith(1);
  });

  test('Ctrl+- decreases text size', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '-', ctrlKey: true }));
    expect(window.adjustTextSize).toHaveBeenCalledWith(-1);
  });

  test('ignores keys when focus is in input', () => {
    setupKeyboardShortcuts();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
    expect(showKeyboardHelp).not.toHaveBeenCalled();
  });

  test('key F1 shows help', () => {
    setupKeyboardShortcuts();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }));
    expect(showKeyboardHelp).toHaveBeenCalled();
  });
});
