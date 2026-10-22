import {
  renderAdminDashboard,
  handleAdminCreateStudent,
} from '../../src/modules/dashboards/admin-dashboard.js';
import { localData } from '../../src/modules/app-state.js';
import { saveLocalData } from '../../src/modules/local-data.js';
import { saveStudentToFirebase } from '../../src/modules/teacher-management.js';
import { secureRandomInt } from '../../src/modules/error-handler.js';

jest.mock('../../src/modules/local-data.js', () => ({
  saveLocalData: jest.fn(),
}));
jest.mock('../../src/modules/teacher-management.js', () => ({
  saveStudentToFirebase: jest.fn(),
}));
jest.mock('../../src/modules/error-handler.js', () => ({
  secureRandomInt: jest.fn(() => 1234),
}));
jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
}));
jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));

describe('admin-dashboard.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = `
      <table>
        <tbody id="admin-students-tbody"></tbody>
      </table>
      <input id="admin-student-name" value="Ali" />
      <input id="admin-student-grade" value="5" />
    `;
    localData.students = [];
    secureRandomInt.mockReturnValue(1234);
  });

  test('renderAdminDashboard renders student rows', () => {
    localData.students = [
      { name: 'Ahmed', grade: '3', pin: '5678' },
      { name: 'Sara', grade: '5', pin: '9012' },
    ];
    renderAdminDashboard();
    const rows = document.querySelectorAll('#admin-students-tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Ahmed');
    expect(rows[0].textContent).toContain('5678');
  });

  test('renderAdminDashboard handles empty students', () => {
    renderAdminDashboard();
    expect(document.querySelectorAll('#admin-students-tbody tr')).toHaveLength(0);
  });

  test('handleAdminCreateStudent creates and saves student', () => {
    const e = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
    handleAdminCreateStudent(e);
    expect(localData.students).toHaveLength(1);
    expect(localData.students[0].name).toBe('Ali');
    expect(localData.students[0].grade).toBe('5');
    expect(localData.students[0].pin).toBe('1234');
    expect(saveLocalData).toHaveBeenCalled();
    expect(saveStudentToFirebase).toHaveBeenCalledWith({
      name: 'Ali',
      grade: '5',
      pin: '1234',
    });
    expect(e.preventDefault).toHaveBeenCalled();
  });
});
