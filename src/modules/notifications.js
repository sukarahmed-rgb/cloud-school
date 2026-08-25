// @ts-check
import { localData } from './app-state.js';
import { saveLocalData } from './local-data.js';
import { showToast } from './ui-core.js';
import { __ } from './i18n.js';

/**
 * @param {string} title
 * @param {string} details
 * @param {'submission'|'achievement'|'info'} [type]
 */
export function addNotification(title, details, type) {
  if (!localData.notifications) {
    localData.notifications = [];
  }
  localData.notifications.unshift({
    title: title,
    details: details,
    type: type || 'info',
    time: new Date().toLocaleString('ar-EG'),
    read: false,
  });
  if (localData.notifications.length > 50) {
    localData.notifications.length = 50;
  }
  saveLocalData();
  updateNotifBadge();
  showToast(`${__('notifPrefix')} ${title}`);
}

/** Update the notification badge count */
export function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  const btn = document.getElementById('btn-notifications');
  if (!badge || !btn) {
    return;
  }
  const unread = (localData.notifications || []).filter(function (n) {
    return !n.read;
  }).length;
  badge.textContent = String(unread);
  const hasAny = (localData.notifications || []).length > 0;
  if (hasAny) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}
