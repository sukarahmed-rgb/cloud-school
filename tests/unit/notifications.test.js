import { addNotification, updateNotifBadge } from '../../src/modules/notifications.js';

describe('notifications.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="notif-badge">0</span>
      <button id="btn-notifications" class="hidden"></button>
    `;
    window.localData = { notifications: [] };
    window.saveLocalData = jest.fn();
    window.__ = jest.fn((k) => k);
    window.showToast = jest.fn();
  });

  test('addNotification prepends and caps at 50', () => {
    for (let i = 0; i < 55; i++) {
      addNotification('Title', 'Details');
    }
    expect(window.localData.notifications.length).toBe(50);
    expect(window.localData.notifications[0].title).toBe('Title');
    expect(window.saveLocalData).toHaveBeenCalled();
    expect(window.showToast).toHaveBeenCalled();
  });

  test('addNotification defaults type to info', () => {
    addNotification('Test', 'Desc');
    expect(window.localData.notifications[0].type).toBe('info');
  });

  test('updateNotifBadge shows badge with unread count', () => {
    window.localData.notifications = [{ read: false }, { read: true }, { read: false }];
    updateNotifBadge();
    expect(document.getElementById('notif-badge').textContent).toBe('2');
    expect(document.getElementById('btn-notifications').classList.contains('hidden')).toBe(false);
  });

  test('updateNotifBadge hides button when no unread', () => {
    window.localData.notifications = [{ read: true }, { read: true }];
    updateNotifBadge();
    expect(document.getElementById('notif-badge').textContent).toBe('0');
    expect(document.getElementById('btn-notifications').classList.contains('hidden')).toBe(true);
  });

  test('updateNotifBadge does nothing when elements missing', () => {
    document.body.innerHTML = '';
    expect(() => updateNotifBadge()).not.toThrow();
  });
});
