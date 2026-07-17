/**
 * اختبارات للدوال الجديدة: الإشعارات، لوحة المتابعة، البيانات المحلية
 */

import { addNotification, updateNotifBadge } from '../../src/modules/notifications.js';
import { saveLocalData, loadLocalData } from '../../src/modules/ui-core.js';

// ====== محاكاة المتغيرات العامة ======
let currentUserSession = null;
let localData = {};

// ====== دوال لوحة المتابعة (local - real version uses ctx pattern) ======
function renderStudentStats() {
  const submissions = localData.submissions || [];
  const mySubs = submissions.filter(function (s) {
    return s.studentName === (currentUserSession ? currentUserSession.name : '');
  });
  const quizCount = mySubs.length;
  const avgScore =
    quizCount > 0
      ? Math.round(
          mySubs.reduce(function (sum, s) {
            return sum + (s.initialScore || 0);
          }, 0) / quizCount,
        )
      : null;
  const bookCount = localData.books ? localData.books.length : 0;
  return { quizCount: quizCount, avgScore: avgScore, bookCount: bookCount };
}

// ====== دوال السمة والنص (local - real versions use DOM/localStorage) ======
function adjustTextSize(direction, currentOffset) {
  let offset = currentOffset + direction;
  if (offset < -2) {
    offset = -2;
  }
  if (offset > 6) {
    offset = 6;
  }
  const sizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const chosen = sizes[1 + Math.min(Math.max(offset, -2), 6)] || 1.125;
  return { offset: offset, size: chosen };
}

const themes = ['dark-hc', 'light-hc', 'classic'];

function cycleTheme(currentTheme) {
  const idx = themes.indexOf(currentTheme);
  const next = themes[(idx + 1) % themes.length];
  return next;
}

// ====== الاختبارات ======

describe('Notifications Module', () => {
  beforeEach(() => {
    window.localData = { notifications: [] };
    window.saveLocalData = jest.fn();
    window.__ = jest.fn((key) => key);
    window.showToast = jest.fn();
    document.body.innerHTML =
      '<span id="notif-badge"></span><button id="btn-notifications"></button>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('addNotification adds a notification to the list', () => {
    addNotification('اختبار', 'تفاصيل', 'info');
    expect(window.localData.notifications.length).toBe(1);
    expect(window.localData.notifications[0].title).toBe('اختبار');
    expect(window.localData.notifications[0].read).toBe(false);
  });

  test('addNotification caps at 50 notifications', () => {
    for (let i = 0; i < 60; i++) {
      addNotification(`n${i}`, '', 'info');
    }
    expect(window.localData.notifications.length).toBe(50);
  });

  test('addNotification prepends (newest first)', () => {
    addNotification('first', '', 'info');
    addNotification('second', '', 'info');
    expect(window.localData.notifications[0].title).toBe('second');
  });

  test('updateNotifBadge updates DOM with unread count', () => {
    addNotification('n1', '', 'info');
    addNotification('n2', '', 'info');
    window.localData.notifications[0].read = true;
    updateNotifBadge();
    expect(document.getElementById('notif-badge').textContent).toBe('1');
  });
});

describe('Student Dashboard Logic', () => {
  beforeEach(() => {
    localData = {
      books: [
        { id: 'b1', title: 'كيمياء', content: 'محتوى الكيمياء' },
        { id: 'b2', title: 'تاريخ', content: 'محتوى التاريخ' },
      ],
      submissions: [
        { studentName: 'أحمد', quizTitle: 'اختبار 1', initialScore: 90, timestamp: '10:00' },
        { studentName: 'أحمد', quizTitle: 'اختبار 2', initialScore: 70, timestamp: '11:00' },
      ],
    };
  });

  test('renderStudentStats returns correct counts', () => {
    currentUserSession = { name: 'أحمد' };
    const stats = renderStudentStats();
    expect(stats.quizCount).toBe(2);
    expect(stats.avgScore).toBe(80);
    expect(stats.bookCount).toBe(2);
  });

  test('renderStudentStats handles no submissions', () => {
    localData.submissions = [];
    currentUserSession = { name: 'لا يوجد' };
    const stats = renderStudentStats();
    expect(stats.quizCount).toBe(0);
    expect(stats.avgScore).toBeNull();
  });
});

describe('Local Data Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    window.STORAGE_KEYS = { localData: 'cloudSchoolData' };
    window.localData = {
      books: [],
      assignments: [],
      submissions: [],
      students: [],
      notifications: [],
    };
  });

  test('saveLocalData and loadLocalData round-trip', () => {
    window.localData.books = [{ id: 'x', title: 'اختبار', content: 'محتوى' }];
    window.localData.notifications = [{ title: 'n1', details: 'd', read: false }];
    saveLocalData();

    window.localData.books = [];
    window.localData.notifications = [];
    loadLocalData();
    expect(window.localData.books.length).toBe(1);
    expect(window.localData.books[0].title).toBe('اختبار');
    expect(window.localData.notifications.length).toBe(1);
  });

  test('loadLocalData initializes notifications if missing', () => {
    localStorage.setItem(
      window.STORAGE_KEYS.localData,
      JSON.stringify({ books: [], assignments: [], submissions: [], students: [] }),
    );
    window.localData.notifications = null;
    loadLocalData();
    expect(window.localData.notifications).toEqual([]);
  });
});

describe('Text Size Adjustment', () => {
  test('adjustTextSize increases size', () => {
    const result = adjustTextSize(1, 0);
    expect(result.offset).toBe(1);
    expect(result.size).toBe(1.25);
  });

  test('adjustTextSize decreases size', () => {
    const result = adjustTextSize(-1, 0);
    expect(result.offset).toBe(-1);
    expect(result.size).toBe(1);
  });

  test('adjustTextSize clamps at minimum -2', () => {
    const result = adjustTextSize(-1, -2);
    expect(result.offset).toBe(-2);
    expect(result.size).toBe(1.125);
  });

  test('adjustTextSize clamps at maximum 6', () => {
    const result = adjustTextSize(1, 6);
    expect(result.offset).toBe(6);
    expect(result.size).toBe(3);
  });
});

describe('Theme Cycling', () => {
  test('cycleTheme goes from dark-hc to light-hc', () => {
    expect(cycleTheme('dark-hc')).toBe('light-hc');
  });

  test('cycleTheme wraps around from classic to dark-hc', () => {
    expect(cycleTheme('classic')).toBe('dark-hc');
  });

  test('cycleTheme goes to classic from light-hc', () => {
    expect(cycleTheme('light-hc')).toBe('classic');
  });
});
