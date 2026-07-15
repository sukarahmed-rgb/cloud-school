/** UI Core Module - أدوات واجهة المستخدم الأساسية */

import { escapeHtml } from './helpers.js';

export var _toastTimer = null;

export let sharedAudioContext = null;

export function getAudioContext() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor();
  }
  if (sharedAudioContext.state === 'suspended') sharedAudioContext.resume();
  return sharedAudioContext;
}

export function showToast(text, isError) {
  var toast = document.getElementById('toast-message');
  if (!toast) return;
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  toast.textContent = text;
  toast.className = 'fixed bottom-4 right-4 z-50 p-4 font-bold rounded-xl shadow-xl text-xl border-2 ' + (isError ? 'bg-red-600 text-white border-red-800' : 'bg-yellow-400 text-black border-black') + ' hidden';
  toast.classList.remove('hidden');
  _toastTimer = setTimeout(function() { toast.classList.add('hidden'); _toastTimer = null; }, 4000);
}

export function showLoading(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="loading-overlay"><span class="loading-spinner"></span><span>${escapeHtml(message)}</span></div>`;
}

export function trapFocus(container) {
  var focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    var elements = container.querySelectorAll(focusableSelector);
    if (elements.length === 0) return;
    var first = elements[0];
    var last = elements[elements.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  container.addEventListener('keydown', handleKeyDown);
  var observer = new MutationObserver(function() {
    if (!document.body.contains(container)) {
      observer.disconnect();
      container.removeEventListener('keydown', handleKeyDown);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function focusElement(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function announceToScreenReader(text) {
  const ariaLive = document.getElementById('aria-live');
  if (!ariaLive) return;
  ariaLive.textContent = '';
  requestAnimationFrame(() => { ariaLive.textContent = text; });
}

export function shortcutRow(key, desc) {
    return '<div class="grid grid-cols-2 gap-2 py-1"><span class="font-mono bg-gray-800 px-2 py-1 rounded text-yellow-300 text-center dir-ltr text-sm">' + key + '</span><span class="text-gray-200">' + desc + '</span></div>';
}

export function showKeyboardHelp() {
    var existing = document.getElementById('shortcuts-help-overlay');
    if (existing) { existing.remove(); return; }
    var overlay = document.createElement('div');
    overlay.id = 'shortcuts-help-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
    overlay.innerHTML = '<div class="card p-6 rounded-3xl max-w-lg border-4 border-yellow-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="' + window.__('keyboardHelpLabel') + '" aria-modal="true">' +
        '<h2 class="text-3xl font-black text-yellow-400 mb-4 text-center">⌨️ ' + window.__('keyboardHelp') + '</h2>' +
        '<div class="space-y-3 text-right" dir="rtl">' +
        '<div class="grid grid-cols-2 gap-2 font-bold border-b border-gray-600 pb-2 mb-2"><span>' + window.__('keyboardColKey') + '</span><span>' + window.__('keyboardColFunc') + '</span></div>' +
        shortcutRow(window.__('keyboardShortcutHelpKey'), window.__('keyboardShortcutHelp')) +
        shortcutRow('Escape', window.__('keyboardShortcutClose')) +
        shortcutRow('1', window.__('sectionBooks')) +
        shortcutRow('2', window.__('sectionAssignments')) +
        shortcutRow('3', window.__('sectionGames')) +
        shortcutRow('4', window.__('keyboardSecTutor')) +
        shortcutRow('5', window.__('keyboardSecVision')) +
        shortcutRow('6', window.__('sectionDialogic')) +
        shortcutRow('7', window.__('sectionStudyGroup')) +
        shortcutRow('8', window.__('sectionDashboard')) +
        shortcutRow('0', window.__('keyboardHome')) +
        shortcutRow('B', window.__('keyboardBraille')) +
        shortcutRow('T', window.__('keyboardTheme')) +
        shortcutRow('R', window.__('keyboardRoles')) +
        shortcutRow('Ctrl+M', window.__('keyboardMic')) +
        shortcutRow('Ctrl+Shift+S', window.__('keyboardSR')) +
        shortcutRow('Ctrl+Shift+A', window.__('keyboardAudioCp')) +
        shortcutRow('Ctrl+Shift+T', window.__('keyboardTts')) +
        shortcutRow('+ / -', window.__('keyboardFontSize')) +
        '</div>' +
        '<button id="btn-close-help" class="w-full mt-4 p-4 bg-yellow-400 text-black font-black text-xl rounded-xl btn-interactive">' + window.__('keyboardClose') + '</button></div>';
    document.body.appendChild(overlay);
    document.getElementById('btn-close-help')?.addEventListener('click', function() { overlay.remove(); });
    document.getElementById('btn-close-help')?.focus();
    trapFocus(overlay);
    window.speak(window.__('keyboardHelpOpened'));
}

export function saveLocalData() {
    try {
        window.localStorage.setItem(window.STORAGE_KEYS.localData, JSON.stringify(window.localData));
    } catch (e) {
        console.warn('Failed to save local data:', e);
    }
}

export function loadLocalData() {
    try {
        var saved = window.localStorage.getItem(window.STORAGE_KEYS.localData);
        if (saved) {
            var parsed = JSON.parse(saved);
            if (parsed.books) window.localData.books = parsed.books;
            if (parsed.assignments) window.localData.assignments = parsed.assignments;
            if (parsed.submissions) window.localData.submissions = parsed.submissions;
            if (parsed.students) window.localData.students = parsed.students;
            if (parsed.notifications) window.localData.notifications = parsed.notifications;
        }
        if (!window.localData.notifications) window.localData.notifications = [];
    } catch (e) {
        console.warn('Failed to load local data:', e);
    }
}

export function showNotificationsPanel() {
    var existing = document.getElementById('notifications-panel-overlay');
    if (existing) { existing.remove(); return; }
    var overlay = document.createElement('div');
    overlay.id = 'notifications-panel-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
    var notifs = window.localData.notifications || [];
    var html = '<div class="card p-6 rounded-3xl max-w-lg border-4 border-blue-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="' + window.__('notifPanelLabel') + '" aria-modal="true">' +
        '<h2 class="text-3xl font-black text-blue-400 mb-4 text-center">🔔 ' + window.__('notifPanelTitle') + '</h2>';
    if (notifs.length === 0) {
        html += '<p class="text-center text-gray-400">' + window.__('notifEmpty') + '</p>';
    } else {
        html += '<div class="space-y-2">';
        for (var i = 0; i < notifs.length; i++) {
            var n = notifs[i];
            var bg = n.read ? 'bg-slate-800' : 'bg-slate-700 border-r-4 border-yellow-400';
            html += '<div class="p-3 rounded-lg ' + bg + '">' +
                '<p class="font-bold text-sm text-yellow-300">' + escapeHtml(n.title) + '</p>' +
                '<p class="text-gray-300 text-xs mt-1">' + escapeHtml(n.details) + '</p>' +
                '<p class="text-gray-500 text-[10px] mt-1">' + escapeHtml(n.time) + '</p></div>';
        }
        html += '</div>';
    }
    html += '<button id="btn-close-notifs" class="w-full mt-4 p-4 bg-blue-500 text-white font-black text-xl rounded-xl btn-interactive">' + window.__('close') + '</button>' +
        '<button id="btn-mark-read-notifs" class="w-full mt-2 p-2 bg-gray-700 text-white font-bold rounded-lg btn-interactive">' + window.__('markAllRead') + '</button></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    document.getElementById('btn-close-notifs')?.addEventListener('click', function() { overlay.remove(); });
    document.getElementById('btn-mark-read-notifs')?.addEventListener('click', function() {
        (window.localData.notifications || []).forEach(function(n) { n.read = true; });
        saveLocalData();
        window.updateNotifBadge();
        showNotificationsPanel();
    });
    document.getElementById('btn-close-notifs')?.focus();
    if (notifs.length > 0) {
        notifs[0].read = true;
        saveLocalData();
        window.updateNotifBadge();
    }
    window.speak(window.__('notifPanelOpened'));
}
