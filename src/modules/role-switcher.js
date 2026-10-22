// @ts-check
import { __ } from './i18n.js';
import { speak, setupAccessibleVoices } from './speech.js';
import { renderStudentStats } from './dashboards/student-dashboard.js';
import { renderTeacherDashboard, renderTeacherSubmissions } from './teacher-management.js';
import { renderParentDashboard, renderAdminDashboard } from './app-dashboards.js';

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
    renderStudentStats();
    speak(__('studentViewActive'));
  } else if (role === 'teacher') {
    document.getElementById('view-teacher').classList.remove('hidden');
    speak(__('teacherViewActive'));
    renderTeacherDashboard();
    renderTeacherSubmissions();
  } else if (role === 'parent') {
    document.getElementById('view-parent').classList.remove('hidden');
    speak(__('parentViewActive'));
    renderParentDashboard();
  } else if (role === 'admin') {
    document.getElementById('view-admin').classList.remove('hidden');
    speak(__('adminViewActive'));
    renderAdminDashboard();
  }

  setTimeout(() => {
    setupAccessibleVoices();
    const activeEl = document.activeElement;
    const inDialog =
      activeEl instanceof HTMLElement &&
      Boolean(activeEl.closest('[role="dialog"], [aria-modal="true"]'));
    if (inDialog) {
      return;
    }
    const viewMap = {
      student: 'student-welcome-msg',
      teacher: 'teacher-dashboard-heading',
      parent: 'parent-dashboard-heading',
      admin: 'admin-dashboard-heading',
    };
    const targetId = viewMap[role];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el && typeof el.focus === 'function') {
        el.focus();
      }
    }
  }, 200);
}
