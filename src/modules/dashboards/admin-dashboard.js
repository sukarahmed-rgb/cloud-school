// Admin Dashboard Module - لوحة قيادة المسؤول (Lazy loaded)

export function renderAdminDashboard() {
  const localData = window.localData;
  const escapeHtml = window.escapeHtml;

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
  const localData = window.localData;
  const saveLocalData = window.saveLocalData;
  const saveStudentToFirebase = window.saveStudentToFirebase;
  const secureRandomInt = window.secureRandomInt;
  const speak = window.speak;
  const __ = window.__;

  const name = document.getElementById('admin-student-name').value;
  const grade = document.getElementById('admin-student-grade').value;
  const pin = secureRandomInt(1000, 10000).toString();

  const newStudent = { name, grade, pin };
  localData.students.push(newStudent);
  saveLocalData();
  saveStudentToFirebase(newStudent);

  speak(__('adminAccountCreated', name, pin));
  e.target.reset();
  renderAdminDashboard();
}
