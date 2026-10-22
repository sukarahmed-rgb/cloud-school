// @ts-check
// Admin Dashboard Module - لوحة قيادة المسؤول (Lazy loaded)
import { localData } from '../app-state.js';
import { escapeHtml } from '../helpers.js';
import { saveLocalData } from '../local-data.js';
import { saveStudentToFirebase } from '../teacher-management.js';
import { secureRandomInt } from '../error-handler.js';
import { speak } from '../speech.js';
import { __ } from '../i18n.js';

export function renderAdminDashboard() {
  const tbody = document.getElementById('admin-students-tbody');
  tbody.innerHTML = '';

  localData.students.forEach((s) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td class="p-2 border font-bold">${escapeHtml(s.name)}</td>
            <td class="p-2 border">${escapeHtml(s.grade)}</td>
            <td class="p-2 border font-mono font-black text-lg tracking-widest text-yellow-400 text-center">${escapeHtml(s.pin)}</td>
        `;
    tbody.appendChild(tr);
  });
}

export function handleAdminCreateStudent(e) {
  e.preventDefault();

  const name = /** @type {HTMLInputElement} */ (document.getElementById('admin-student-name'))
    .value;
  const grade = /** @type {HTMLInputElement} */ (document.getElementById('admin-student-grade'))
    .value;
  const pin = secureRandomInt(1000, 10000).toString();

  const newStudent = { name, grade, pin };
  localData.students.push(newStudent);
  saveLocalData();
  saveStudentToFirebase(newStudent);

  speak(__('adminAccountCreated', name, pin));
  e.target.reset();
  renderAdminDashboard();
}
