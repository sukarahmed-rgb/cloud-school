import { renderParentDashboard } from '../../src/modules/dashboards/parent-dashboard.js';
import { localData, setCurrentUserSession } from '../../src/modules/app-state.js';

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));

describe('parent-dashboard.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = `
      <div id="parent-linked-child-name"></div>
      <div id="parent-grades-list"></div>
      <div id="parent-notifications-list"></div>
    `;
    localData.submissions = [];
    localData.notifications = [];
    setCurrentUserSession(/** @type {any} */ ({ contact: '0550000000' }));
  });

  test('renderParentDashboard shows fallback when no submissions', () => {
    renderParentDashboard();
    expect(document.getElementById('parent-linked-child-name').textContent).toBe(
      'fallbackLinkedChild',
    );
    expect(document.getElementById('parent-grades-list').innerHTML).toContain('parentNoGrades');
  });

  test('renderParentDashboard renders child submissions', () => {
    setCurrentUserSession(/** @type {any} */ ({ childContact: '0551111111' }));
    localData.submissions = [
      {
        studentContact: '0551111111',
        studentName: 'Ali',
        quizTitle: 'Math',
        initialScore: 85,
        timestamp: '10:00',
      },
    ];
    renderParentDashboard();
    expect(document.getElementById('parent-linked-child-name').textContent).toBe('Ali');
    expect(document.getElementById('parent-grades-list').textContent).toContain('85');
  });

  test('renderParentDashboard renders notifications', () => {
    setCurrentUserSession(/** @type {any} */ ({ childContact: '0551111111' }));
    localData.submissions = [
      {
        studentContact: '0551111111',
        studentName: 'Ali',
        quizTitle: 'Math',
        initialScore: 85,
        timestamp: '10:00',
      },
    ];
    localData.notifications = [
      { title: 'New Grade', details: 'Math 85%', time: '10:00', read: false, type: 'submission' },
    ];
    renderParentDashboard();
    expect(document.getElementById('parent-notifications-list').textContent).toContain('New Grade');
  });

  test('renderParentDashboard shows empty notif state', () => {
    setCurrentUserSession(/** @type {any} */ ({ childContact: '0551111111' }));
    localData.submissions = [
      {
        studentContact: '0551111111',
        studentName: 'Ali',
        quizTitle: 'Math',
        initialScore: 85,
        timestamp: '10:00',
      },
    ];
    renderParentDashboard();
    expect(document.getElementById('parent-notifications-list').textContent).toContain(
      'notifEmpty',
    );
  });
});
