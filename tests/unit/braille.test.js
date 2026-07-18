import {
  updateBraillePreview,
  toggleDot,
  clearDots,
  commitBrailleChar,
  arabicBrailleMap,
} from '../../src/modules/braille.js';

beforeEach(() => {
  document.body.innerHTML = '';
  window.__ = jest.fn((key, ...args) => args[0] || key);
  window.speak = jest.fn();
});

describe('braille.js - arabicBrailleMap', () => {
  test('maps dot pattern 1 to ا', () => {
    expect(arabicBrailleMap['1']).toBe('ا');
  });
  test('maps dot pattern 1,2 to ب', () => {
    expect(arabicBrailleMap['1,2']).toBe('ب');
  });
  test('returns undefined for unknown pattern', () => {
    expect(arabicBrailleMap['1,6']).toBeUndefined();
  });
});

describe('braille.js - updateBraillePreview', () => {
  test('updates preview element with mapped char', () => {
    const preview = document.createElement('div');
    preview.id = 'braille-preview';
    document.body.appendChild(preview);
    const dots = new Set([1, 2]);
    updateBraillePreview(dots, 'braille-preview', '?');
    expect(window.__).toHaveBeenCalledWith('brailleCurrentChar', 'ب', '1,2');
  });

  test('uses fallback when no mapping found', () => {
    const preview = document.createElement('div');
    preview.id = 'braille-preview';
    document.body.appendChild(preview);
    const dots = new Set([1, 6]);
    updateBraillePreview(dots, 'braille-preview', '?');
    expect(window.__).toHaveBeenCalledWith('brailleCurrentChar', '?', '1,6');
  });

  test('does nothing when preview element missing', () => {
    const dots = new Set([1]);
    expect(() => updateBraillePreview(dots, 'nonexistent', '?')).not.toThrow();
  });
});

describe('braille.js - toggleDot', () => {
  test('adds dot to set and activates button', () => {
    const btn = document.createElement('button');
    btn.id = 'braille-1';
    document.body.appendChild(btn);
    const preview = document.createElement('div');
    preview.id = 'braille-preview';
    document.body.appendChild(preview);
    const dots = new Set();
    toggleDot(1, dots, 'braille', 'braille-preview', '?');
    expect(dots.has(1)).toBe(true);
    expect(btn.classList.contains('active')).toBe(true);
  });

  test('removes dot from set and deactivates button', () => {
    const btn = document.createElement('button');
    btn.id = 'braille-1';
    btn.classList.add('active');
    document.body.appendChild(btn);
    const preview = document.createElement('div');
    preview.id = 'braille-preview';
    document.body.appendChild(preview);
    const dots = new Set([1]);
    toggleDot(1, dots, 'braille', 'braille-preview', '?');
    expect(dots.has(1)).toBe(false);
    expect(btn.classList.contains('active')).toBe(false);
  });
});

describe('braille.js - clearDots', () => {
  test('clears all dots and deactivates buttons', () => {
    for (let i = 1; i <= 6; i++) {
      const btn = document.createElement('button');
      btn.id = `braille-${i}`;
      btn.classList.add('active');
      document.body.appendChild(btn);
    }
    const preview = document.createElement('div');
    preview.id = 'braille-preview';
    document.body.appendChild(preview);
    const dots = new Set([1, 2, 3]);
    clearDots(dots, 'braille', 'braille-preview', true);
    expect(dots.size).toBe(0);
    for (let i = 1; i <= 6; i++) {
      expect(document.getElementById(`braille-${i}`).classList.contains('active')).toBe(false);
    }
    expect(window.speak).toHaveBeenCalled();
  });

  test('does not speak when speakOnClear is false', () => {
    const preview = document.createElement('div');
    preview.id = 'braille-preview';
    document.body.appendChild(preview);
    clearDots(new Set([1]), 'braille', 'braille-preview', false);
    expect(window.speak).not.toHaveBeenCalled();
  });
});

describe('braille.js - commitBrailleChar', () => {
  test('appends mapped char to answer textarea and speaks', () => {
    const textarea = document.createElement('textarea');
    textarea.id = 'assignment-student-answer';
    document.body.appendChild(textarea);
    const result = commitBrailleChar('1,2');
    expect(result).toBe(true);
    expect(textarea.value).toBe('ب');
    expect(window.speak).toHaveBeenCalledWith('ب');
  });

  test('returns false for unknown pattern', () => {
    const textarea = document.createElement('textarea');
    textarea.id = 'assignment-student-answer';
    document.body.appendChild(textarea);
    const result = commitBrailleChar('1,6');
    expect(result).toBe(false);
    expect(textarea.value).toBe('');
  });

  test('does not throw when textarea is missing', () => {
    expect(() => commitBrailleChar('1,2')).not.toThrow();
  });
});
