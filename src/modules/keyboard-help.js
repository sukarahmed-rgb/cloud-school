// @ts-check
import { initDialog } from './dom-utils.js';
import { escapeHtml } from './helpers.js';
import { speak } from './speech.js';
import { __ } from './i18n.js';

export function shortcutRow(key, desc) {
  return `<div class="grid grid-cols-2 gap-2 py-1"><span class="font-mono bg-gray-800 px-2 py-1 rounded text-yellow-300 text-center dir-ltr text-sm">${escapeHtml(key)}</span><span class="text-gray-200">${escapeHtml(desc)}</span></div>`;
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
    `<div class="card p-6 rounded-3xl max-w-lg border-4 border-yellow-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="${__('keyboardHelpLabel')}" aria-modal="true">` +
    `<h2 class="text-3xl font-black text-yellow-400 mb-4 text-center">⌨️ ${__('keyboardHelp')}</h2>` +
    '<div class="space-y-3 text-right" dir="rtl">' +
    `<div class="grid grid-cols-2 gap-2 font-bold border-b border-gray-600 pb-2 mb-2"><span>${__('keyboardColKey')}</span><span>${__('keyboardColFunc')}</span></div>${shortcutRow(
      __('keyboardShortcutHelpKey'),
      __('keyboardShortcutHelp'),
    )}${shortcutRow('Escape', __('keyboardShortcutClose'))}${shortcutRow(
      '1',
      __('sectionBooks'),
    )}${shortcutRow('2', __('sectionAssignments'))}${shortcutRow(
      '3',
      __('sectionGames'),
    )}${shortcutRow('4', __('keyboardSecTutor'))}${shortcutRow(
      '5',
      __('keyboardSecVision'),
    )}${shortcutRow('6', __('sectionDialogic'))}${shortcutRow(
      '7',
      __('sectionStudyGroup'),
    )}${shortcutRow('8', __('sectionDashboard'))}${shortcutRow(
      '0',
      __('keyboardHome'),
    )}${shortcutRow('B', __('keyboardBraille'))}${shortcutRow(
      'T',
      __('keyboardTheme'),
    )}${shortcutRow('R', __('keyboardRoles'))}${shortcutRow(
      'Ctrl+M',
      __('keyboardMic'),
    )}${shortcutRow('Ctrl+Shift+S', __('keyboardSR'))}${shortcutRow(
      'Ctrl+Shift+A',
      __('keyboardAudioCp'),
    )}${shortcutRow('Ctrl+Shift+T', __('keyboardTts'))}${shortcutRow(
      '+ / -',
      __('keyboardFontSize'),
    )}</div>` +
    `<button id="btn-close-help" class="w-full mt-4 p-4 bg-yellow-400 text-black font-black text-xl rounded-xl btn-interactive">${__('keyboardClose')}</button></div>`;
  document.body.appendChild(overlay);
  const closeHelp = initDialog(overlay);
  document.getElementById('btn-close-help')?.addEventListener('click', closeHelp);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      closeHelp();
    }
  });
  speak(__('keyboardHelpOpened'));
}
