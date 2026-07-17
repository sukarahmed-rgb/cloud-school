// @ts-check
/**
 * @param {string} title
 * @param {string} details
 * @param {string} [type]
 */
export function addNotification(title, details, type) {
  if (!window.localData.notifications) {
    window.localData.notifications = [];
  }
  window.localData.notifications.unshift({
    title: title,
    details: details,
    type: type || 'info',
    time: new Date().toLocaleString('ar-EG'),
    read: false,
  });
  if (window.localData.notifications.length > 50) {
    window.localData.notifications.length = 50;
  }
  window.saveLocalData();
  updateNotifBadge();
  window.showToast(`${window.__('notifPrefix')} ${title}`);
}

/** Update the notification badge count */
export function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  const btn = document.getElementById('btn-notifications');
  if (!badge || !btn) {
    return;
  }
  const unread = (window.localData.notifications || []).filter(function (n) {
    return !n.read;
  }).length;
  badge.textContent = String(unread);
  if (unread > 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}
