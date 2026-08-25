import {
  toggleBrailleDot,
  clearBrailleDots,
  enterBrailleChar,
  addSpaceToAnswer,
  deleteLastChar,
  toggleBrailleKeyboard,
  currentBrailleDots,
  currentCheatDots,
  toggleCheatDot,
  clearCheatDots,
  pronounceCheatBraille,
  setupPerkinsKeyboard,
  processPerkinsChord,
  perkinsKeysPressed,
} from '../../src/modules/braille-input.js';
import { speak } from '../../src/modules/speech.js';

const translations = {
  space: 'مسافة',
  brailleKbClosed: 'braille keyboard closed',
  screenBrailleKbOpened: 'screen braille keyboard opened',
  perkinsBrailleKbOpened: 'perkins braille keyboard opened',
};
const mockT = jest.fn((key, ...args) => args[0] || translations[key] || key);
jest.mock('../../src/modules/i18n.js', () => ({
  __: (...args) => mockT(...args),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
}));

describe('braille-input.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="assignment-student-answer"></textarea>
      <div id="screen-braille-keyboard" class="hidden"></div>
      <div id="perkins-braille-keyboard" class="hidden"></div>
      <button id="dot-1"></button>
      <button id="perkins-key-7"></button>
      <div id="braille-char-preview">x</div>
      <div id="cheat-char-preview">y</div>
    `;
    jest.clearAllMocks();
    mockT.mockImplementation((key, ...args) => args[0] || translations[key] || key);

    currentBrailleDots.clear();
    currentCheatDots.clear();
    // Clear perkins state
    Object.keys(perkinsKeysPressed).forEach((k) => delete perkinsKeysPressed[k]);
  });

  describe('toggleBrailleDot', () => {
    test('toggles single dot and refreshes preview', () => {
      toggleBrailleDot(1);
      expect(currentBrailleDots.has(1)).toBe(true);
      expect(document.getElementById('braille-char-preview').textContent).toBe('ا');
    });

    test('toggles dot off when already active', () => {
      currentBrailleDots.add(1);
      toggleBrailleDot(1);
      expect(currentBrailleDots.has(1)).toBe(false);
    });

    test('toggles multiple dots with array', () => {
      toggleBrailleDot([1, 2, 3]);
      expect(currentBrailleDots.has(1)).toBe(true);
      expect(currentBrailleDots.has(2)).toBe(true);
      expect(currentBrailleDots.has(3)).toBe(true);
      expect(currentBrailleDots.size).toBe(3);
    });

    test('toggles off already active dots in array', () => {
      currentBrailleDots.add(1);
      currentBrailleDots.add(2);
      toggleBrailleDot([1, 3]);
      expect(currentBrailleDots.has(1)).toBe(false);
      expect(currentBrailleDots.has(2)).toBe(true);
      expect(currentBrailleDots.has(3)).toBe(true);
    });
  });

  describe('clearBrailleDots', () => {
    test('clears all dots and resets preview', () => {
      currentBrailleDots.add(1).add(2).add(3);
      clearBrailleDots();
      expect(currentBrailleDots.size).toBe(0);
      expect(document.getElementById('braille-char-preview').textContent).toContain('—');
    });
  });

  describe('enterBrailleChar', () => {
    test('appends braille char to answer field', () => {
      currentBrailleDots.add(1);
      const answer = document.getElementById('assignment-student-answer');
      enterBrailleChar();
      expect(answer.value).toBe('ا');
      expect(speak).toHaveBeenCalledWith('ا');
    });

    test('clears dots after entering char', () => {
      currentBrailleDots.add(1).add(2);
      enterBrailleChar();
      expect(currentBrailleDots.size).toBe(0);
    });

    test('does nothing for unknown pattern', () => {
      currentBrailleDots.add(1).add(6);
      enterBrailleChar();
      expect(document.getElementById('assignment-student-answer').value).toBe('');
    });
  });

  describe('addSpaceToAnswer', () => {
    test('appends space and speaks', () => {
      addSpaceToAnswer();
      expect(document.getElementById('assignment-student-answer').value).toBe(' ');
      expect(speak).toHaveBeenCalledWith('مسافة');
    });
  });

  describe('deleteLastChar', () => {
    test('removes last character', () => {
      const answer = document.getElementById('assignment-student-answer');
      answer.value = 'اختبار';
      deleteLastChar();
      expect(answer.value).toBe('اختبا');
    });

    test('does nothing when empty', () => {
      deleteLastChar();
      expect(document.getElementById('assignment-student-answer').value).toBe('');
    });
  });

  describe('toggleBrailleKeyboard', () => {
    test('toggles screen braille keyboard', () => {
      const kb = document.getElementById('screen-braille-keyboard');
      expect(kb.classList.contains('hidden')).toBe(true);
      toggleBrailleKeyboard('screen');
      expect(kb.classList.contains('hidden')).toBe(false);
      toggleBrailleKeyboard('screen');
      expect(kb.classList.contains('hidden')).toBe(true);
    });

    test('toggles perkins braille keyboard', () => {
      const kb = document.getElementById('perkins-braille-keyboard');
      expect(kb.classList.contains('hidden')).toBe(true);
      toggleBrailleKeyboard('perkins');
      expect(kb.classList.contains('hidden')).toBe(false);
      toggleBrailleKeyboard('perkins');
      expect(kb.classList.contains('hidden')).toBe(true);
    });

    test('focuses dot-1 when opening screen keyboard', () => {
      const dot1 = document.getElementById('dot-1');
      jest.spyOn(dot1, 'focus');
      toggleBrailleKeyboard('screen');
      expect(dot1.focus).toHaveBeenCalled();
    });
  });

  describe('cheat dots', () => {
    test('toggleCheatDot adds and removes dots with preview refresh', () => {
      toggleCheatDot(1);
      expect(currentCheatDots.has(1)).toBe(true);
      expect(document.getElementById('cheat-char-preview').textContent).toBe('ا');
      toggleCheatDot(1);
      expect(currentCheatDots.has(1)).toBe(false);
      expect(document.getElementById('cheat-char-preview').textContent).toContain('—');
    });

    test('clearCheatDots resets cheat state', () => {
      currentCheatDots.add(1).add(2);
      clearCheatDots();
      expect(currentCheatDots.size).toBe(0);
    });

    test('pronounceCheatBraille speaks matching char', () => {
      currentCheatDots.add(1);
      pronounceCheatBraille();
      expect(speak).toHaveBeenCalledWith('ا');
    });

    test('pronounceCheatBraille does nothing for unknown pattern', () => {
      currentCheatDots.add(6);
      pronounceCheatBraille();
      expect(speak).not.toHaveBeenCalled();
    });
  });

  describe('setupPerkinsKeyboard', () => {
    test('returns handler and registers keyup listener', () => {
      const handler = setupPerkinsKeyboard();
      expect(typeof handler).toBe('function');
    });
  });

  describe('processPerkinsChord', () => {
    test('adds chorded dots to the braille set', () => {
      perkinsKeysPressed['f'] = true;
      perkinsKeysPressed['d'] = true;
      processPerkinsChord();
      expect(currentBrailleDots.has(1)).toBe(true);
      expect(currentBrailleDots.has(2)).toBe(true);
    });

    test('does nothing for empty chord', () => {
      processPerkinsChord();
      expect(currentBrailleDots.size).toBe(0);
    });
  });
});
