// @ts-check
/** @type {string} */
export let activeRole = 'student';

/**
 * @param {string} role
 */
export function switchRole(role) {
  activeRole = role;

  document.getElementById('view-student').classList.add('hidden');
  document.getElementById('view-teacher').classList.add('hidden');
  document.getElementById('view-parent').classList.add('hidden');
  document.getElementById('view-admin').classList.add('hidden');

  ['student', 'teacher', 'parent', 'admin'].forEach((r) => {
    const btn = document.getElementById(`role-btn-${r}`);
    if (btn) {
      if (r === role) {
        btn.className =
          'px-3 py-1 rounded bg-black text-white font-black border-2 border-yellow-400';
      } else {
        btn.className = 'px-3 py-1 rounded bg-gray-200 text-black hover:bg-gray-300 transition';
      }
    }
  });

  if (role === 'student') {
    document.getElementById('view-student').classList.remove('hidden');
    window.renderStudentStats();
    window.speak(window.__('studentViewActive'));
  } else if (role === 'teacher') {
    document.getElementById('view-teacher').classList.remove('hidden');
    window.speak(window.__('teacherViewActive'));
    window.renderTeacherDashboard();
    window.renderTeacherSubmissions();
  } else if (role === 'parent') {
    document.getElementById('view-parent').classList.remove('hidden');
    window.speak(window.__('parentViewActive'));
    window.renderParentDashboard();
  } else if (role === 'admin') {
    document.getElementById('view-admin').classList.remove('hidden');
    window.speak(window.__('adminViewActive'));
    window.renderAdminDashboard();
  }

  setTimeout(() => {
    window.setupAccessibleVoices();
    const viewMap = {
      student: 'student-welcome-msg',
      teacher: 'view-teacher',
      parent: 'view-parent',
      admin: 'view-admin',
    };
    const targetId = viewMap[role];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el && el.tagName === 'H2') {
        el.focus();
      }
    }
  }, 200);
}
