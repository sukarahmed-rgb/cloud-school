// @ts-check
/** @type {string} */
export let currentAgeLevel = localStorage.getItem('cloudSchoolAgeLevel') || 'auto';

/** Initialize the age level toggle button */
export function setupAgeLevel() {
  const btn = document.getElementById('btn-age-level');
  if (!btn) {
    return;
  }
  updateAgeLevelButton();
  btn.addEventListener('click', function () {
    toggleAgeLevel();
  });
}

/** Cycle to the next age level */
export function toggleAgeLevel() {
  const levels = ['auto', 'child', 'teen', 'adult'];
  const labels = {
    auto: window.__('ageLevelAuto'),
    child: window.__('ageLevelChild'),
    teen: window.__('ageLevelTeen'),
    adult: window.__('ageLevelAdult'),
  };
  const idx = levels.indexOf(currentAgeLevel);
  currentAgeLevel = levels[(idx + 1) % levels.length];
  localStorage.setItem('cloudSchoolAgeLevel', currentAgeLevel);
  updateAgeLevelButton();
  window.speak(window.__('ageSet', labels[currentAgeLevel]));
}

/** Update the age level button label */
export function updateAgeLevelButton() {
  const btn = document.getElementById('btn-age-level');
  const labels = {
    auto: window.__('ageLevelAuto'),
    child: window.__('ageLevelChild'),
    teen: window.__('ageLevelTeen'),
    adult: window.__('ageLevelAdult'),
  };
  if (btn) {
    btn.textContent = window.__('ageButton', labels[currentAgeLevel] || window.__('ageLevelAuto'));
  }
}

/** @returns {string} */
export function getAgeTone() {
  const age = window.currentUserSession?.age || 14;
  switch (currentAgeLevel) {
    case 'child':
      return '\u0627\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0644\u0648\u0628\u0627\u064B \u0645\u0628\u0633\u0637\u0627\u064B \u062C\u062F\u0627\u064B \u0645\u0646\u0627\u0633\u0628\u0627\u064B \u0644\u0644\u0623\u0637\u0641\u0627\u0644\u060C \u0645\u0639 \u0623\u0645\u062B\u0644\u0629 \u064A\u0648\u0645\u064A\u0629 \u0645\u0644\u0645\u0648\u0633\u0629\u060C \u0648\u062A\u0634\u062C\u064A\u0639 \u0645\u0633\u062A\u0645\u0631.';
    case 'teen':
      return '\u0627\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0644\u0648\u0628\u0627\u064B \u0634\u0628\u0627\u0628\u064A\u0627\u064B \u0645\u0646\u0627\u0633\u0628\u0627\u064B \u0644\u0644\u0645\u0631\u0627\u0647\u0642\u064A\u0646\u060C \u0645\u0639 \u062A\u062D\u062F\u064A\u0627\u062A \u0641\u0643\u0631\u064A\u0629 \u0645\u0646\u0627\u0633\u0628\u0629\u060C \u0648\u0644\u063A\u0629 \u0648\u0627\u0636\u062D\u0629 \u0644\u0643\u0646\u0647\u0627 \u063A\u064A\u0631 \u0637\u0641\u0648\u0644\u064A\u0629.';
    case 'adult':
      return '\u0627\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0644\u0648\u0628\u0627\u064B \u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0627\u064B \u0631\u0635\u064A\u0646\u0627\u064B \u0645\u0646\u0627\u0633\u0628\u0627\u064B \u0644\u0644\u0628\u0627\u0644\u063A\u064A\u0646\u060C \u0645\u0639 \u062A\u062D\u0644\u064A\u0644 \u0639\u0645\u064A\u0642 \u0648\u0645\u0635\u0637\u0644\u062D\u0627\u062A \u062F\u0642\u064A\u0642\u0629.';
    default:
      if (age < 12) {
        return '\u0627\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0644\u0648\u0628\u0627\u064B \u0645\u0628\u0633\u0637\u0627\u064B \u062C\u062F\u0627\u064B \u0645\u0646\u0627\u0633\u0628\u0627\u064B \u0644\u0644\u0623\u0637\u0641\u0627\u0644.';
      }
      if (age < 18) {
        return '\u0627\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0644\u0648\u0628\u0627\u064B \u0645\u0646\u0627\u0633\u0628\u0627\u064B \u0644\u0644\u0645\u0631\u0627\u0647\u0642\u064A\u0646\u060C \u0648\u0627\u0636\u062D \u0648\u062C\u0630\u0627\u0628.';
      }
      return '\u0627\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0644\u0648\u0628\u0627\u064B \u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0627\u064B \u0645\u0646\u0627\u0633\u0628\u0627\u064B \u0644\u0644\u0628\u0627\u0644\u063A\u064A\u0646.';
  }
}

/** Toggle registration form fields based on selected role */
export function toggleRegFields() {
  const role = /** @type {HTMLSelectElement} */ (document.getElementById('reg-role')).value;
  const ageField = document.getElementById('age-field-container');
  const studentFields = document.getElementById('student-linked-fields');
  const parentFields = document.getElementById('parent-linked-fields');

  if (role === 'student') {
    ageField.classList.remove('hidden');
    studentFields.classList.remove('hidden');
    parentFields.classList.add('hidden');
    window.checkAgeLimitations();
  } else if (role === 'parent') {
    ageField.classList.add('hidden');
    studentFields.classList.add('hidden');
    parentFields.classList.remove('hidden');
    /** @type {HTMLInputElement} */ (document.getElementById('reg-parent-contact')).required =
      false;
  } else if (role === 'admin') {
    ageField.classList.add('hidden');
    /** @type {HTMLInputElement} */ (document.getElementById('reg-age')).required = false;
    studentFields.classList.add('hidden');
    parentFields.classList.add('hidden');
    /** @type {HTMLInputElement} */ (document.getElementById('reg-parent-contact')).required =
      false;
  } else {
    ageField.classList.remove('hidden');
    /** @type {HTMLInputElement} */ (document.getElementById('reg-age')).required = true;
    studentFields.classList.add('hidden');
    parentFields.classList.add('hidden');
    /** @type {HTMLInputElement} */ (document.getElementById('reg-parent-contact')).required =
      false;
  }
}

/**
 * @param {number} direction
 */
export function adjustTextSize(direction) {
  let offset = parseInt(localStorage.getItem(window.STORAGE_KEYS.sizeOffset) || '0', 10);
  offset += direction;
  if (offset < -2) {
    offset = -2;
  }
  if (offset > 6) {
    offset = 6;
  }
  localStorage.setItem(window.STORAGE_KEYS.sizeOffset, String(offset));
  const sizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const chosen = sizes[1 + Math.min(Math.max(offset, -2), 6)] || 1.125;
  document.documentElement.style.setProperty('--base-text-size', `${chosen}rem`);
  window.speak(`${Math.round(chosen * 100)}%`);
}

/** Load saved text size from localStorage */
export function loadTextSize() {
  const offset = parseInt(localStorage.getItem(window.STORAGE_KEYS.sizeOffset) || '0', 10);
  const sizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const chosen = sizes[1 + Math.min(Math.max(offset, -2), 6)] || 1.125;
  document.documentElement.style.setProperty('--base-text-size', `${chosen}rem`);
}

/**
 * @param {string} theme
 */
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cloudSchoolTheme', theme);
  window.speak(window.__('themeSet', theme));
}

/** Load and apply saved theme */
export function loadTheme() {
  const saved = localStorage.getItem('cloudSchoolTheme') || 'classic';
  setTheme(saved);
}

/** Cycle to the next theme */
export function cycleTheme() {
  const themes = ['dark-hc', 'light-hc', 'classic'];
  const current = localStorage.getItem('cloudSchoolTheme') || 'classic';
  const idx = themes.indexOf(current);
  const next = themes[(idx + 1) % themes.length];
  setTheme(next);
}
