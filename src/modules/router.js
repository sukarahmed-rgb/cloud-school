// @ts-check
/** Router Module - التنقل بين أقسام التطبيق */

import { escapeHtml } from './helpers.js';
import { showKeyboardHelp, focusElement } from './ui-core.js';

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
    title.textContent = window.__('sectionBooks');
    document.getElementById('student-sub-books').classList.remove('hidden');
    window.renderStudentBooks();
    window.speak(window.__('sectionOpened', window.__('sectionBooks')));
  } else if (section === 'assignments') {
    title.textContent = window.__('sectionAssignments');
    document.getElementById('student-sub-assignments').classList.remove('hidden');
    window.renderStudentAssignments();
    window.speak(window.__('sectionOpened', window.__('sectionAssignments')));
  } else if (section === 'image-describer') {
    title.textContent = window.__('sectionVision');
    document.getElementById('student-sub-image-describer').classList.remove('hidden');
    window.speak(window.__('sectionOpened', window.__('sectionVision')));
  } else if (section === 'games') {
    title.textContent = window.__('sectionGames');
    document.getElementById('student-sub-games').classList.remove('hidden');
    window.speak(window.__('sectionOpened', window.__('sectionGames')));
  } else if (section === 'ai-tutor') {
    title.textContent = window.__('sectionTutor');
    document.getElementById('student-sub-ai-tutor').classList.remove('hidden');
    window.speak(window.__('sectionOpened', window.__('sectionTutor')));
  } else if (section === 'dialogic-classroom') {
    title.textContent = window.__('sectionDialogic');
    document.getElementById('student-sub-dialogic-classroom')?.classList.remove('hidden');
    window.speak(window.__('sectionOpened', window.__('sectionDialogic')));
  } else if (section === 'study-group') {
    title.textContent = window.__('sectionStudyGroup');
    document.getElementById('student-sub-study-group')?.classList.remove('hidden');
    window.speak(window.__('sectionOpened', window.__('sectionStudyGroup')));
  } else if (section === 'dashboard') {
    title.textContent = window.__('sectionDashboard');
    document.getElementById('student-sub-dashboard')?.classList.remove('hidden');
    window.renderStudentDashboard();
    window.speak(window.__('sectionOpened', window.__('sectionDashboard')));
  }

  container.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    window.setupAccessibleVoices();
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
  window.controlAudiobook('stop');
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
  window.speak(window.__('sectionClosed'));
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
          window.speak(window.__('brailleBoardHelp'));
          break;
        case 't':
        case 'T':
          e.preventDefault();
          window.cycleTheme();
          break;
        case 'r':
        case 'R': {
          e.preventDefault();
          const roleBar = document.getElementById('dev-role-bar');
          if (roleBar) {
            roleBar.classList.toggle('hidden');
            window.speak(
              roleBar.classList.contains('hidden')
                ? window.__('roleBarHidden')
                : window.__('roleBarVisible'),
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
          window.toggleAudioRecording();
          break;
        case 's':
        case 'S':
          if (shift) {
            e.preventDefault();
            window.toggleScreenReaderMode();
          }
          break;
        case 'a':
        case 'A':
          if (shift) {
            e.preventDefault();
            window.toggleAudioCoPilot();
          }
          break;
        case 't':
        case 'T':
          if (shift) {
            e.preventDefault();
            window.toggleTtsEngine();
          }
          break;
        case '=':
          e.preventDefault();
          window.adjustTextSize(1);
          break;
        case '-':
          e.preventDefault();
          window.adjustTextSize(-1);
          break;
      }
    }
  });
}
