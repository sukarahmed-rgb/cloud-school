// @ts-check
import { escapeHtml } from './helpers.js';
import { saveLocalData } from './local-data.js';

export function showNotificationsPanel() {
  const existing = document.getElementById('notifications-panel-overlay');
  if (existing) {
    existing.remove();
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'notifications-panel-overlay';
  overlay.className =
    'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
  const notifs = window.localData.notifications || [];
  let html =
    `<div class="card p-6 rounded-3xl max-w-lg border-4 border-blue-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="${window.__('notifPanelLabel')}" aria-modal="true">` +
    `<h2 class="text-3xl font-black text-blue-400 mb-4 text-center">🔔 ${window.__('notifPanelTitle')}</h2>`;
  if (notifs.length === 0) {
    html += `<p class="text-center text-gray-400">${window.__('notifEmpty')}</p>`;
  } else {
    html += '<div class="space-y-2">';
    for (let i = 0; i < notifs.length; i++) {
      const n = notifs[i];
      const bg = n.read ? 'bg-slate-800' : 'bg-slate-700 border-r-4 border-yellow-400';
      html +=
        `<div class="p-3 rounded-lg ${bg}">` +
        `<p class="font-bold text-sm text-yellow-300">${escapeHtml(n.title)}</p>` +
        `<p class="text-gray-300 text-xs mt-1">${escapeHtml(n.details)}</p>` +
        `<p class="text-gray-500 text-[10px] mt-1">${escapeHtml(n.time)}</p></div>`;
    }
    html += '</div>';
  }
  html +=
    `<button id="btn-close-notifs" class="w-full mt-4 p-4 bg-blue-500 text-white font-black text-xl rounded-xl btn-interactive">${window.__('close')}</button>` +
    `<button id="btn-mark-read-notifs" class="w-full mt-2 p-2 bg-gray-700 text-white font-bold rounded-lg btn-interactive">${window.__('markAllRead')}</button></div>`;
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  document.getElementById('btn-close-notifs')?.addEventListener('click', function () {
    overlay.remove();
  });
  document.getElementById('btn-mark-read-notifs')?.addEventListener('click', function () {
    (window.localData.notifications || []).forEach(function (n) {
      n.read = true;
    });
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
