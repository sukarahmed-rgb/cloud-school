import { showNotificationsPanel } from '../../src/modules/ui-core.js';

jest.mock('../../src/modules/local-data.js', () => ({ saveLocalData: jest.fn() }));

describe('notifications-panel.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
    window.updateNotifBadge = jest.fn();
    window.localData = { notifications: [] };
  });

  test('showNotificationsPanel creates overlay with dialog', () => {
    showNotificationsPanel();
    const overlay = document.getElementById('notifications-panel-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.querySelector('[role="dialog"]')).toBeTruthy();
  });

  test('showNotificationsPanel renders empty state', () => {
    showNotificationsPanel();
    expect(document.getElementById('notifications-panel-overlay').innerHTML).toContain(
      'notifEmpty',
    );
  });

  test('showNotificationsPanel removes existing overlay on second call', () => {
    showNotificationsPanel();
    expect(document.getElementById('notifications-panel-overlay')).toBeTruthy();
    showNotificationsPanel();
    expect(document.getElementById('notifications-panel-overlay')).toBeFalsy();
  });

  test('showNotificationsPanel renders notification items', () => {
    window.localData.notifications = [
      { title: 'Test', details: 'Detail', time: '10:00', read: false },
    ];
    showNotificationsPanel();
    const html = document.getElementById('notifications-panel-overlay').innerHTML;
    expect(html).toContain('Test');
    expect(html).toContain('Detail');
  });

  test('close button removes overlay', () => {
    showNotificationsPanel();
    document.getElementById('btn-close-notifs').click();
    expect(document.getElementById('notifications-panel-overlay')).toBeFalsy();
  });

  test('mark-all-read button calls updateNotifBadge', () => {
    window.localData.notifications = [{ title: 'N1', details: 'D1', time: '10:00', read: false }];
    showNotificationsPanel();
    document.getElementById('btn-mark-read-notifs').click();
    expect(window.updateNotifBadge).toHaveBeenCalled();
  });
});
