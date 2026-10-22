// @ts-check
/** Router Module - التنقل بين أقسام التطبيق */

import { showKeyboardHelp, focusElement } from './ui-core.js';
import { __ } from './i18n.js';
import {
  speak,
  setupAccessibleVoices,
  toggleScreenReaderMode,
  toggleAudioCoPilot,
  toggleTtsEngine,
} from './speech.js';
import { renderStudentBooks, controlAudiobook } from './books.js';
import { renderStudentAssignments } from './quizzes.js';
import { renderStudentDashboard } from './dashboards/student-dashboard.js';
import { cycleTheme, adjustTextSize } from './accessibility.js';
import { toggleAudioRecording } from './recording.js';

export function openStudentSection(section) {
  document.getElementById('student-sub-books').classList.add('hidden');
  document.getElementById('student-sub-assignments').classList.add('hidden');
  document.getElementById('student-sub-image-describer').classList.add('hidden');
  document.getElementById('student-sub-games').classList.add('hidden');
  document.getElementById('student-sub-ai-tutor').classList.add('hidden');
  document.getElementById('student-sub-dialogic-classroom')?.classList.add('hidden');
  document.getElementById('student-sub-study-group')?.classList.add('hidden');
  document.getElementById('student-sub-dashboard')?.classList.add('hidden');

  const container = document.getElementById('student-section-container');
  container.classList.remove('hidden');
  const title = document.getElementById('student-section-title');

  if (section === 'books') {
    title.textContent = __('sectionBooks');
    document.getElementById('student-sub-books').classList.remove('hidden');
    renderStudentBooks();
    speak(__('sectionOpened', __('sectionBooks')));
  } else if (section === 'assignments') {
    title.textContent = __('sectionAssignments');
    document.getElementById('student-sub-assignments').classList.remove('hidden');
    renderStudentAssignments();
    speak(__('sectionOpened', __('sectionAssignments')));
  } else if (section === 'image-describer') {
    title.textContent = __('sectionVision');
    document.getElementById('student-sub-image-describer').classList.remove('hidden');
    speak(__('sectionOpened', __('sectionVision')));
  } else if (section === 'games') {
    title.textContent = __('sectionGames');
    document.getElementById('student-sub-games').classList.remove('hidden');
    speak(__('sectionOpened', __('sectionGames')));
  } else if (section === 'ai-tutor') {
    title.textContent = __('sectionTutor');
    document.getElementById('student-sub-ai-tutor').classList.remove('hidden');
    speak(__('sectionOpened', __('sectionTutor')));
  } else if (section === 'dialogic-classroom') {
    title.textContent = __('sectionDialogic');
    document.getElementById('student-sub-dialogic-classroom')?.classList.remove('hidden');
    speak(__('sectionOpened', __('sectionDialogic')));
  } else if (section === 'study-group') {
    title.textContent = __('sectionStudyGroup');
    document.getElementById('student-sub-study-group')?.classList.remove('hidden');
    speak(__('sectionOpened', __('sectionStudyGroup')));
  } else if (section === 'dashboard') {
    title.textContent = __('sectionDashboard');
    document.getElementById('student-sub-dashboard')?.classList.remove('hidden');
    renderStudentDashboard();
    speak(__('sectionOpened', __('sectionDashboard')));
  }

  container.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    setupAccessibleVoices();
    const activeEl = document.activeElement;
    const inDialog =
      activeEl instanceof HTMLElement &&
      Boolean(activeEl.closest('[role="dialog"], [aria-modal="true"]'));
    if (inDialog) {
      return;
    }
    const sectionEl = document.getElementById(`student-sub-${section}`);
    if (sectionEl) {
      const firstBtn = sectionEl.querySelector(
        'button, [tabindex="0"], input, select, textarea, a',
      );
      if (firstBtn) {
        /** @type {HTMLElement} */ (firstBtn).focus();
      } else {
        focusElement('student-section-title');
      }
    } else {
      focusElement('student-section-title');
    }
  }, 200);
}

export function closeStudentSection() {
  document.getElementById('student-section-container').classList.add('hidden');
  controlAudiobook('stop');
  const activeBtn = /** @type {HTMLElement|null} */ (
    document.querySelector('[data-student-section].bg-yellow-400')
  );
  if (activeBtn) {
    activeBtn.focus();
  } else {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
    }
  }
  speak(__('sectionClosed'));
}

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    const tag = document.activeElement?.tagName || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }
    const helpOverlay = document.getElementById('shortcuts-help-overlay');
    const key = e.key;
    const ctrl = e.ctrlKey;

    if (key === 'h' || key === 'H' || key === 'F1') {
      e.preventDefault();
      showKeyboardHelp();
      return;
    }
    if (key === 'Escape') {
      if (helpOverlay) {
        helpOverlay.remove();
        return;
      }
      closeStudentSection();
      return;
    }
    if (document.getElementById('view-student')?.classList.contains('hidden')) {
      return;
    }
    if (helpOverlay) {
      return;
    }

    if (!ctrl) {
      switch (key) {
        case '1':
          e.preventDefault();
          openStudentSection('books');
          break;
        case '2':
          e.preventDefault();
          openStudentSection('assignments');
          break;
        case '3':
          e.preventDefault();
          openStudentSection('games');
          break;
        case '4':
          e.preventDefault();
          openStudentSection('ai-tutor');
          break;
        case '5':
          e.preventDefault();
          openStudentSection('image-describer');
          break;
        case '6':
          e.preventDefault();
          openStudentSection('dialogic-classroom');
          break;
        case '7':
          e.preventDefault();
          openStudentSection('study-group');
          break;
        case '8':
          e.preventDefault();
          openStudentSection('dashboard');
          break;
        case '0':
          e.preventDefault();
          closeStudentSection();
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          document.getElementById('dot-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document.getElementById('dot-1')?.focus();
          speak(__('brailleBoardHelp'));
          break;
        case 't':
        case 'T':
          e.preventDefault();
          cycleTheme();
          break;
        case 'r':
        case 'R': {
          e.preventDefault();
          const roleBar = document.getElementById('dev-role-bar');
          if (roleBar) {
            roleBar.classList.toggle('hidden');
            speak(
              roleBar.classList.contains('hidden') ? __('roleBarHidden') : __('roleBarVisible'),
            );
          }
          break;
        }
      }
    } else {
      const shift = e.shiftKey;
      switch (key) {
        case 'm':
        case 'M':
          e.preventDefault();
          toggleAudioRecording();
          break;
        case 's':
        case 'S':
          if (shift) {
            e.preventDefault();
            toggleScreenReaderMode();
          }
          break;
        case 'a':
        case 'A':
          if (shift) {
            e.preventDefault();
            toggleAudioCoPilot();
          }
          break;
        case 't':
        case 'T':
          if (shift) {
            e.preventDefault();
            toggleTtsEngine();
          }
          break;
        case '=':
          e.preventDefault();
          adjustTextSize(1);
          break;
        case '-':
          e.preventDefault();
          adjustTextSize(-1);
          break;
      }
    }
  });
}
