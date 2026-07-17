// @ts-check
/** Braille module - لغة برايل */

export const arabicBrailleMap = {
  1: 'ا',
  '1,2': 'ب',
  '2,3,4,5': 'ت',
  '1,4,5,6': 'ث',
  '2,4,5': 'ج',
  '1,5,6': 'ح',
  '1,3,4,6': 'خ',
  '1,4,5': 'د',
  '2,3,4,6': 'ذ',
  '1,2,3,5': 'ر',
  '1,3,5,6': 'ز',
  '2,3,4': 'س',
  '1,4,6': 'ش',
  '1,2,3,4,6': 'ص',
  '1,2,4,6': 'ض',
  '2,3,4,5,6': 'ط',
  '1,2,3,4,5,6': 'ظ',
  '1,2,3,5,6': 'ع',
  '1,2,6': 'غ',
  '1,2,4': 'ف',
  '1,2,3,4,5': 'ق',
  '1,3': 'ك',
  '1,2,3': 'ل',
  '1,3,4': 'م',
  '1,3,4,5': 'ن',
  '1,2,5': 'هـ',
  '2,4,5,6': 'و',
  '2,4': 'ي',
  '2,3,5': '!',
  '2,5,6': '؟',
};

/** Shared Braille helpers */
export function updateBraillePreview(dotsSet, previewId, fallback) {
  const dotsArray = Array.from(dotsSet).sort((a, b) => a - b);
  const keyString = dotsArray.join(',');
  const mappedChar = arabicBrailleMap[keyString] || fallback;
  const translateFn = window.__ || ((k) => k);
  const previewEl = document.getElementById(previewId);
  if (previewEl) {
    previewEl.textContent = translateFn('brailleCurrentChar', mappedChar, keyString || '');
  }
}

export function toggleDot(dotNumber, dotsSet, prefix, previewId, fallback) {
  const btn = document.getElementById(`${prefix}-${dotNumber}`);
  if (dotsSet.has(dotNumber)) {
    dotsSet.delete(dotNumber);
    if (btn) {
      btn.classList.remove('active');
    }
  } else {
    dotsSet.add(dotNumber);
    if (btn) {
      btn.classList.add('active');
    }
  }
  updateBraillePreview(dotsSet, previewId, fallback);
}

export function clearDots(dotsSet, prefix, previewId, speakOnClear) {
  dotsSet.clear();
  for (let i = 1; i <= 6; i++) {
    const dot = document.getElementById(`${prefix}-${i}`);
    if (dot) {
      dot.classList.remove('active');
    }
  }
  const translateFn = window.__ || ((k) => k);
  const previewEl = document.getElementById(previewId);
  if (previewEl) {
    previewEl.textContent = translateFn('brailleNoChar');
  }
  if (speakOnClear && typeof window.speak === 'function') {
    window.speak(translateFn('brailleCleared'));
  }
}

export function commitBrailleChar(keyString) {
  const mappedChar = arabicBrailleMap[keyString];
  if (mappedChar) {
    const ansTextarea = /** @type {HTMLTextAreaElement} */ (
      document.getElementById('assignment-student-answer')
    );
    if (ansTextarea) {
      ansTextarea.value += mappedChar;
    }
    if (typeof window.speak === 'function') {
      window.speak(mappedChar);
    }
    return true;
  }
  return false;
}
