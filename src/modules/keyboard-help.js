// @ts-check
import { trapFocus } from './dom-utils.js';

export function shortcutRow(key, desc) {
  return `<div class="grid grid-cols-2 gap-2 py-1"><span class="font-mono bg-gray-800 px-2 py-1 rounded text-yellow-300 text-center dir-ltr text-sm">${key}</span><span class="text-gray-200">${desc}</span></div>`;
}

export function showKeyboardHelp() {
  const existing = document.getElementById('shortcuts-help-overlay');
  if (existing) {
    existing.remove();
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'shortcuts-help-overlay';
  overlay.className =
    'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
  overlay.innerHTML =
    `<div class="card p-6 rounded-3xl max-w-lg border-4 border-yellow-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="${window.__('keyboardHelpLabel')}" aria-modal="true">` +
    `<h2 class="text-3xl font-black text-yellow-400 mb-4 text-center">⌨️ ${window.__('keyboardHelp')}</h2>` +
    '<div class="space-y-3 text-right" dir="rtl">' +
    `<div class="grid grid-cols-2 gap-2 font-bold border-b border-gray-600 pb-2 mb-2"><span>${window.__('keyboardColKey')}</span><span>${window.__('keyboardColFunc')}</span></div>${shortcutRow(
      window.__('keyboardShortcutHelpKey'),
      window.__('keyboardShortcutHelp'),
    )}${shortcutRow('Escape', window.__('keyboardShortcutClose'))}${shortcutRow(
      '1',
      window.__('sectionBooks'),
    )}${shortcutRow('2', window.__('sectionAssignments'))}${shortcutRow(
      '3',
      window.__('sectionGames'),
    )}${shortcutRow('4', window.__('keyboardSecTutor'))}${shortcutRow(
      '5',
      window.__('keyboardSecVision'),
    )}${shortcutRow('6', window.__('sectionDialogic'))}${shortcutRow(
      '7',
      window.__('sectionStudyGroup'),
    )}${shortcutRow('8', window.__('sectionDashboard'))}${shortcutRow(
      '0',
      window.__('keyboardHome'),
    )}${shortcutRow('B', window.__('keyboardBraille'))}${shortcutRow(
      'T',
      window.__('keyboardTheme'),
    )}${shortcutRow('R', window.__('keyboardRoles'))}${shortcutRow(
      'Ctrl+M',
      window.__('keyboardMic'),
    )}${shortcutRow('Ctrl+Shift+S', window.__('keyboardSR'))}${shortcutRow(
      'Ctrl+Shift+A',
      window.__('keyboardAudioCp'),
    )}${shortcutRow('Ctrl+Shift+T', window.__('keyboardTts'))}${shortcutRow(
      '+ / -',
      window.__('keyboardFontSize'),
    )}</div>` +
    `<button id="btn-close-help" class="w-full mt-4 p-4 bg-yellow-400 text-black font-black text-xl rounded-xl btn-interactive">${window.__('keyboardClose')}</button></div>`;
  document.body.appendChild(overlay);
  document.getElementById('btn-close-help')?.addEventListener('click', function () {
    overlay.remove();
  });
  document.getElementById('btn-close-help')?.focus();
  trapFocus(overlay);
  window.speak(window.__('keyboardHelpOpened'));
}
