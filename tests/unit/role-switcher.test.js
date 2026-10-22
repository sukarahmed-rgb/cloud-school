import { switchRole, activeRole } from '../../src/modules/role-switcher.js';
import { speak, setupAccessibleVoices } from '../../src/modules/speech.js';
import { renderStudentStats } from '../../src/modules/dashboards/student-dashboard.js';
import {
  renderTeacherDashboard,
  renderTeacherSubmissions,
} from '../../src/modules/teacher-management.js';

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
  setupAccessibleVoices: jest.fn(),
}));

jest.mock('../../src/modules/dashboards/student-dashboard.js', () => ({
  renderStudentStats: jest.fn(),
}));

jest.mock('../../src/modules/teacher-management.js', () => ({
  renderTeacherDashboard: jest.fn(),
  renderTeacherSubmissions: jest.fn(),
}));

jest.mock('../../src/modules/app-dashboards.js', () => ({
  renderParentDashboard: jest.fn(),
  renderAdminDashboard: jest.fn(),
}));

describe('role-switcher.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(renderStudentStats).toHaveBeenCalled();
    expect(speak).toHaveBeenCalled();
  });

  test('switchRole shows teacher view and calls teacher renderers', () => {
    switchRole('teacher');
    expect(document.getElementById('view-teacher').classList.contains('hidden')).toBe(false);
    expect(renderTeacherDashboard).toHaveBeenCalled();
    expect(renderTeacherSubmissions).toHaveBeenCalled();
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
    expect(setupAccessibleVoices).toHaveBeenCalled();
  });
});
