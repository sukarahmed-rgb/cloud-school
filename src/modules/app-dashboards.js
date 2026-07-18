// @ts-check

export function renderGradeDistribution() {}
export function renderStudentPerformanceTable() {}
export function generateTeacherReport() {}

export function renderParentDashboard() {
  import('./dashboards/parent-dashboard.js').then((m) => m.renderParentDashboard());
}

/** @param {Event} e */
export function handleAdminCreateStudent(e) {
  import('./dashboards/admin-dashboard.js').then((m) => m.handleAdminCreateStudent(e));
}

export function renderAdminDashboard() {
  import('./dashboards/admin-dashboard.js').then((m) => m.renderAdminDashboard());
}
