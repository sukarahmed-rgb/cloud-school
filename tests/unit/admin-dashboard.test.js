import {
  renderAdminDashboard,
  handleAdminCreateStudent,
} from '../../src/modules/dashboards/admin-dashboard.js';

describe('admin-dashboard.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table>
        <tbody id="admin-students-tbody"></tbody>
      </table>
      <input id="admin-student-name" value="Ali" />
      <input id="admin-student-grade" value="5" />
    `;
    window.localData = { students: [] };
    window.escapeHtml = jest.fn((s) => s);
    window.saveLocalData = jest.fn();
    window.saveStudentToFirebase = jest.fn();
    window.secureRandomInt = jest.fn().mockReturnValue(1234);
    window.speak = jest.fn();
    window.__ = jest.fn((k) => k);
  });

  test('renderAdminDashboard renders student rows', () => {
    window.localData.students = [
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
    expect(window.localData.students).toHaveLength(1);
    expect(window.localData.students[0].name).toBe('Ali');
    expect(window.localData.students[0].grade).toBe('5');
    expect(window.localData.students[0].pin).toBe('1234');
    expect(window.saveLocalData).toHaveBeenCalled();
    expect(window.saveStudentToFirebase).toHaveBeenCalledWith({
      name: 'Ali',
      grade: '5',
      pin: '1234',
    });
    expect(e.preventDefault).toHaveBeenCalled();
  });
});
