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

describe('braille-input.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="assignment-student-answer"></textarea>
      <div id="screen-braille-keyboard" class="hidden"></div>
      <div id="perkins-braille-keyboard" class="hidden"></div>
      <button id="dot-1"></button>
      <button id="perkins-key-7"></button>
    `;

    window.speak = jest.fn();
    window.__ = jest.fn((key) => {
      const map = {
        space: 'مسافة',
        brailleKbClosed: 'braille keyboard closed',
        screenBrailleKbOpened: 'screen braille keyboard opened',
        perkinsBrailleKbOpened: 'perkins braille keyboard opened',
      };
      return map[key] || key;
    });
    window.updateBraillePreview = jest.fn();
    window.updateCheatPreview = jest.fn();
    window.arabicBrailleMap = {
      1: 'ا',
      '1,2': 'ب',
      '1,2,3,4,5,6': 'ظ',
    };
    window.toggleBrailleDot = jest.fn();

    currentBrailleDots.clear();
    currentCheatDots.clear();
    // Clear perkins state
    Object.keys(perkinsKeysPressed).forEach((k) => delete perkinsKeysPressed[k]);
  });

  describe('toggleBrailleDot', () => {
    test('toggles single dot', () => {
      toggleBrailleDot(1);
      expect(currentBrailleDots.has(1)).toBe(true);
      expect(window.updateBraillePreview).toHaveBeenCalled();
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
    test('clears all dots', () => {
      currentBrailleDots.add(1).add(2).add(3);
      clearBrailleDots();
      expect(currentBrailleDots.size).toBe(0);
      expect(window.updateBraillePreview).toHaveBeenCalled();
    });
  });

  describe('enterBrailleChar', () => {
    test('appends braille char to answer field', () => {
      currentBrailleDots.add(1);
      const answer = document.getElementById('assignment-student-answer');
      enterBrailleChar();
      expect(answer.value).toBe('ا');
      expect(window.speak).toHaveBeenCalledWith('ا');
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
      expect(window.speak).toHaveBeenCalledWith('مسافة');
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
    test('toggleCheatDot adds and removes dots', () => {
      toggleCheatDot(1);
      expect(currentCheatDots.has(1)).toBe(true);
      toggleCheatDot(1);
      expect(currentCheatDots.has(1)).toBe(false);
      expect(window.updateCheatPreview).toHaveBeenCalledTimes(2);
    });

    test('clearCheatDots resets cheat state', () => {
      currentCheatDots.add(1).add(2);
      clearCheatDots();
      expect(currentCheatDots.size).toBe(0);
    });

    test('pronounceCheatBraille speaks matching char', () => {
      currentCheatDots.add(1);
      pronounceCheatBraille();
      expect(window.speak).toHaveBeenCalledWith('ا');
    });

    test('pronounceCheatBraille does nothing for unknown pattern', () => {
      currentCheatDots.add(6);
      pronounceCheatBraille();
      expect(window.speak).not.toHaveBeenCalled();
    });
  });

  describe('setupPerkinsKeyboard', () => {
    test('returns handler and registers keyup listener', () => {
      const handler = setupPerkinsKeyboard();
      expect(typeof handler).toBe('function');
    });
  });

  describe('processPerkinsChord', () => {
    beforeEach(() => {
      window.toggleBrailleDot = jest.fn();
    });

    test('calls toggleBrailleDot with chorded dots', () => {
      perkinsKeysPressed['7'] = true;
      perkinsKeysPressed['8'] = true;
      processPerkinsChord();
      expect(window.toggleBrailleDot).toHaveBeenCalledWith([1, 2]);
    });

    test('does nothing for empty chord', () => {
      processPerkinsChord();
      expect(window.toggleBrailleDot).not.toHaveBeenCalled();
    });
  });
});
