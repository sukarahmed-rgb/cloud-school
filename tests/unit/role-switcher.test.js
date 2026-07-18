import { switchRole, activeRole } from '../../src/modules/role-switcher.js';

describe('role-switcher.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="view-student" class="hidden"></div>
      <div id="view-teacher" class="hidden"></div>
      <div id="view-parent" class="hidden"></div>
      <div id="view-admin" class="hidden"></div>
      <button id="role-btn-student"></button>
      <button id="role-btn-teacher"></button>
      <button id="role-btn-parent"></button>
      <button id="role-btn-admin"></button>
      <h2 id="student-welcome-msg">Welcome</h2>
    `;
    window.renderStudentStats = jest.fn();
    window.renderTeacherDashboard = jest.fn();
    window.renderTeacherSubmissions = jest.fn();
    window.renderParentDashboard = jest.fn();
    window.renderAdminDashboard = jest.fn();
    window.speak = jest.fn();
    window.__ = jest.fn((k) => k);
    window.setupAccessibleVoices = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('switchRole updates activeRole', () => {
    switchRole('teacher');
    expect(activeRole).toBe('teacher');
  });

  test('switchRole shows student view and calls renderStudentStats', () => {
    switchRole('student');
    const view = document.getElementById('view-student');
    expect(view.classList.contains('hidden')).toBe(false);
    expect(window.renderStudentStats).toHaveBeenCalled();
    expect(window.speak).toHaveBeenCalled();
  });

  test('switchRole shows teacher view and calls teacher renderers', () => {
    switchRole('teacher');
    expect(document.getElementById('view-teacher').classList.contains('hidden')).toBe(false);
    expect(window.renderTeacherDashboard).toHaveBeenCalled();
    expect(window.renderTeacherSubmissions).toHaveBeenCalled();
  });

  test('switchRole hides all other role views', () => {
    switchRole('student');
    switchRole('admin');
    expect(document.getElementById('view-student').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('view-teacher').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('view-parent').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('view-admin').classList.contains('hidden')).toBe(false);
  });

  test('switchRole sets focus after timeout', () => {
    switchRole('student');
    jest.advanceTimersByTime(200);
    expect(window.setupAccessibleVoices).toHaveBeenCalled();
  });
});
