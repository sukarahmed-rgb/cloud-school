import {
  configureStudentDashboard,
  renderStudentStats,
  renderStudentDashboard,
} from '../../src/modules/dashboards/student-dashboard.js';

function makeCtx(overrides = {}) {
  return {
    getLocalData: () => window.localData,
    getCurrentUserSession: () => window.currentUserSession,
    __: (k) => k,
    escapeHtml: (s) => s,
    ...overrides,
  };
}

describe('student-dashboard.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="stat-quizzes">0</span>
      <span id="stat-avg-score">0</span>
      <span id="stat-books">0</span>
      <span id="stat-games">0</span>
      <div id="dashboard-quiz-stats"></div>
      <div id="dashboard-book-stats"></div>
      <div id="dashboard-game-stats"></div>
      <div id="dashboard-achievements"></div>
      <div id="dashboard-encouragement"></div>
    `;
    window.localData = { submissions: [], books: [] };
    window.currentUserSession = { name: 'Ali' };
  });

  test('configureStudentDashboard sets ctx', () => {
    const ctx = makeCtx();
    configureStudentDashboard(ctx);
    expect(() => renderStudentStats()).not.toThrow();
  });

  test('renderStudentStats does nothing without ctx', () => {
    renderStudentStats();
    expect(document.getElementById('stat-quizzes').textContent).toBe('0');
  });

  test('renderStudentStats updates stats', () => {
    configureStudentDashboard(makeCtx());
    window.localData.submissions = [
      { studentName: 'Ali', initialScore: 80 },
      { studentName: 'Ali', initialScore: 90 },
    ];
    window.localData.books = [{ id: 1 }, { id: 2 }, { id: 3 }];
    renderStudentStats();
    expect(document.getElementById('stat-quizzes').textContent).toBe('2');
    expect(document.getElementById('stat-avg-score').textContent).toBe('85%');
    expect(document.getElementById('stat-books').textContent).toBe('3');
  });

  test('renderStudentDashboard shows dashboard sections', () => {
    configureStudentDashboard(makeCtx());
    window.localData.submissions = [{ studentName: 'Ali', initialScore: 75, quizTitle: 'Quiz 1' }];
    window.localData.books = [{ title: 'Book A' }];
    renderStudentDashboard();
    expect(document.getElementById('dashboard-quiz-stats').textContent).toContain('Quiz 1');
    expect(document.getElementById('dashboard-book-stats').textContent).toContain('Book A');
    expect(document.getElementById('dashboard-game-stats').textContent).toContain(
      'dashboardGamesTitle',
    );
    expect(document.getElementById('dashboard-achievements').textContent).toContain(
      'badgeStudious',
    );
  });

  test('renderStudentDashboard shows empty states', () => {
    configureStudentDashboard(makeCtx());
    renderStudentDashboard();
    expect(document.getElementById('dashboard-quiz-stats').textContent).toContain(
      'dashboardNoQuizzes',
    );
    expect(document.getElementById('dashboard-book-stats').textContent).toContain(
      'dashboardNoBooks',
    );
    expect(document.getElementById('dashboard-achievements').textContent).toContain('badgeStart');
  });

  test('renderStudentDashboard awards excellent badge for avg >= 80', () => {
    configureStudentDashboard(makeCtx());
    window.localData.submissions = [
      { studentName: 'Ali', initialScore: 80 },
      { studentName: 'Ali', initialScore: 90 },
    ];
    renderStudentDashboard();
    expect(document.getElementById('dashboard-achievements').textContent).toContain(
      'badgeExcellent',
    );
  });

  test('renderStudentDashboard does not throw without ctx', () => {
    expect(() => renderStudentDashboard()).not.toThrow();
  });
});
