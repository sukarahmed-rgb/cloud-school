import { addNotification, updateNotifBadge } from '../../src/modules/notifications.js';
import { localData } from '../../src/modules/app-state.js';
import { showToast } from '../../src/modules/ui-core.js';
import { saveLocalData } from '../../src/modules/local-data.js';

const mockT = jest.fn((key) => key);
jest.mock('../../src/modules/i18n.js', () => ({
  __: (...args) => mockT(...args),
}));

jest.mock('../../src/modules/ui-core.js', () => ({
  showToast: jest.fn(),
}));

jest.mock('../../src/modules/local-data.js', () => ({
  saveLocalData: jest.fn(),
}));

describe('notifications.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="notif-badge">0</span>
      <button id="btn-notifications" class="hidden"></button>
    `;
    jest.clearAllMocks();
    mockT.mockImplementation((key) => key);
    localData.notifications = [];
  });

  test('addNotification prepends and caps at 50', () => {
    for (let i = 0; i < 55; i++) {
      addNotification('Title', 'Details');
    }
    expect(localData.notifications.length).toBe(50);
    expect(localData.notifications[0].title).toBe('Title');
    expect(saveLocalData).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });

  test('addNotification defaults type to info', () => {
    addNotification('Test', 'Desc');
    expect(localData.notifications[0].type).toBe('info');
  });

  test('updateNotifBadge shows badge with unread count', () => {
    localData.notifications = [{ read: false }, { read: true }, { read: false }];
    updateNotifBadge();
    expect(document.getElementById('notif-badge').textContent).toBe('2');
    expect(document.getElementById('btn-notifications').classList.contains('hidden')).toBe(false);
  });

  test('updateNotifBadge keeps button visible with read notifications', () => {
    localData.notifications = [{ read: true }, { read: true }];
    updateNotifBadge();
    expect(document.getElementById('notif-badge').textContent).toBe('0');
    expect(document.getElementById('btn-notifications').classList.contains('hidden')).toBe(false);
  });

  test('updateNotifBadge hides button when there are no notifications', () => {
    localData.notifications = [];
    updateNotifBadge();
    expect(document.getElementById('notif-badge').textContent).toBe('0');
    expect(document.getElementById('btn-notifications').classList.contains('hidden')).toBe(true);
  });

  test('updateNotifBadge does nothing when elements missing', () => {
    document.body.innerHTML = '';
    expect(() => updateNotifBadge()).not.toThrow();
  });
});
