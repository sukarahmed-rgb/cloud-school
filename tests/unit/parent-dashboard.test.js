import { renderParentDashboard } from '../../src/modules/dashboards/parent-dashboard.js';

describe('parent-dashboard.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="parent-linked-child-name"></div>
      <div id="parent-grades-list"></div>
      <div id="parent-notifications-list"></div>
    `;
    window.localData = { submissions: [], notifications: [] };
    window.currentUserSession = { contact: '0550000000' };
    window.__ = jest.fn((k) => k);
    window.escapeHtml = jest.fn((s) => s);
  });

  test('renderParentDashboard shows fallback when no submissions', () => {
    renderParentDashboard();
    expect(document.getElementById('parent-linked-child-name').textContent).toBe(
      'fallbackLinkedChild',
    );
    expect(document.getElementById('parent-grades-list').innerHTML).toContain('parentNoGrades');
  });

  test('renderParentDashboard renders child submissions', () => {
    window.currentUserSession = { childContact: '0551111111' };
    window.localData.submissions = [
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
    window.currentUserSession = { childContact: '0551111111' };
    window.localData.submissions = [
      {
        studentContact: '0551111111',
        studentName: 'Ali',
        quizTitle: 'Math',
        initialScore: 85,
        timestamp: '10:00',
      },
    ];
    window.localData.notifications = [
      { title: 'New Grade', details: 'Math 85%', time: '10:00', read: false, type: 'submission' },
    ];
    renderParentDashboard();
    expect(document.getElementById('parent-notifications-list').textContent).toContain('New Grade');
  });

  test('renderParentDashboard shows empty notif state', () => {
    window.currentUserSession = { childContact: '0551111111' };
    window.localData.submissions = [
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
