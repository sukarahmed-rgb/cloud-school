import { showNotificationsPanel } from '../../src/modules/ui-core.js';
import { localData } from '../../src/modules/app-state.js';
import { updateNotifBadge } from '../../src/modules/notifications.js';

const mockT = jest.fn((key) => key);
jest.mock('../../src/modules/i18n.js', () => ({
  __: (...args) => mockT(...args),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
}));

jest.mock('../../src/modules/notifications.js', () => ({
  updateNotifBadge: jest.fn(),
}));

jest.mock('../../src/modules/local-data.js', () => ({ saveLocalData: jest.fn() }));

describe('notifications-panel.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    mockT.mockImplementation((key) => key);
    localData.notifications = [];
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
    localData.notifications = [{ title: 'Test', details: 'Detail', time: '10:00', read: false }];
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
    localData.notifications = [{ title: 'N1', details: 'D1', time: '10:00', read: false }];
    showNotificationsPanel();
    document.getElementById('btn-mark-read-notifs').click();
    expect(updateNotifBadge).toHaveBeenCalled();
  });
});
