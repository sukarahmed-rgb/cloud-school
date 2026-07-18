// @ts-check
/** @type {Object} */
export let perkinsKeysPressed = {};
/** @type {number|null} */
export let perkinsKeyupTimer = null;
/** @type {Set<number>} */
export const currentBrailleDots = new Set();
/** @type {Set<number>} */
export const currentCheatDots = new Set();

/** @returns {Function} */
export function setupPerkinsKeyboard() {
  const perkinsKeyupHandler = function (e) {
    const key = e.key.toLowerCase();
    if (perkinsKeysPressed[key]) {
      clearTimeout(perkinsKeyupTimer);
      perkinsKeyupTimer = setTimeout(() => {
        processPerkinsChord();
        perkinsKeysPressed = {};
      }, 150);
    }
  };
  window.addEventListener('keyup', perkinsKeyupHandler);
  return perkinsKeyupHandler;
}

/** Process the current Perkins keyboard chord */
export function processPerkinsChord() {
  const dots = [1, 2, 3, 4, 5, 6];
  const keyMap = { 7: 1, 8: 2, 9: 3, u: 4, i: 5, o: 6 };
  const chord = [];
  for (const d of dots) {
    const k = Object.keys(keyMap).find((key) => keyMap[key] === d);
    if (k && perkinsKeysPressed[k]) {
      chord.push(d);
    }
  }
  if (chord.length > 0) {
    window.toggleBrailleDot(chord);
  }
}

/**
 * @param {number|number[]} dotNumber
 */
export function toggleBrailleDot(dotNumber) {
  if (Array.isArray(dotNumber)) {
    dotNumber.forEach((d) => {
      if (currentBrailleDots.has(d)) {
        currentBrailleDots.delete(d);
      } else {
        currentBrailleDots.add(d);
      }
    });
  } else {
    if (currentBrailleDots.has(dotNumber)) {
      currentBrailleDots.delete(dotNumber);
    } else {
      currentBrailleDots.add(dotNumber);
    }
  }
  window.updateBraillePreview();
}

/** Convert a set of dots to a string key (sorted, comma-separated) */
function dotsToKey(dots) {
  return Array.from(dots)
    .sort((a, b) => a - b)
    .join(',');
}

/** Enter the current braille character into the answer field */
export function enterBrailleChar() {
  const char = window.arabicBrailleMap?.[dotsToKey(currentBrailleDots)];
  if (char) {
    const answer = /** @type {HTMLTextAreaElement|null} */ (
      document.getElementById('assignment-student-answer')
    );
    if (answer) {
      answer.value += char;
      window.speak(char);
    }
  }
  clearBrailleDots();
}

/** Clear all active braille dots */
export function clearBrailleDots() {
  currentBrailleDots.clear();
  window.updateBraillePreview();
}

/** Add a space to the answer field */
export function addSpaceToAnswer() {
  const answer = /** @type {HTMLTextAreaElement|null} */ (
    document.getElementById('assignment-student-answer')
  );
  if (answer) {
    answer.value += ' ';
    window.speak(window.__('space'));
  }
}

/** Delete the last character from the answer field */
export function deleteLastChar() {
  const answer = /** @type {HTMLTextAreaElement|null} */ (
    document.getElementById('assignment-student-answer')
  );
  if (answer && answer.value.length > 0) {
    answer.value = answer.value.slice(0, -1);
  }
}

/**
 * @param {string} type
 */
export function toggleBrailleKeyboard(type) {
  const screenKb = document.getElementById('screen-braille-keyboard');
  const perkinsKb = document.getElementById('perkins-braille-keyboard');
  if (type === 'screen') {
    if (screenKb) {
      const hidden = screenKb.classList.toggle('hidden');
      window.speak(hidden ? window.__('brailleKbClosed') : window.__('screenBrailleKbOpened'));
      if (!hidden) {
        document.getElementById('dot-1')?.focus();
      }
    }
  } else if (type === 'perkins') {
    if (perkinsKb) {
      const hidden = perkinsKb.classList.toggle('hidden');
      window.speak(hidden ? window.__('brailleKbClosed') : window.__('perkinsBrailleKbOpened'));
      if (!hidden) {
        document.getElementById('perkins-key-7')?.focus();
      }
    }
  }
}

/**
 * @param {number} dotNum
 */
export function toggleCheatDot(dotNum) {
  if (currentCheatDots.has(dotNum)) {
    currentCheatDots.delete(dotNum);
  } else {
    currentCheatDots.add(dotNum);
  }
  window.updateCheatPreview();
}

/** Pronounce the current cheat braille character */
export function pronounceCheatBraille() {
  const char = window.arabicBrailleMap?.[dotsToKey(currentCheatDots)];
  if (char) {
    window.speak(char);
  }
}

/** Clear all cheat braille dots */
export function clearCheatDots() {
  currentCheatDots.clear();
  window.updateCheatPreview();
}
