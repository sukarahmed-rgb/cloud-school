// @ts-check
/**
 * @jest-environment jsdom
 */
import {
  renderTeacherDashboard,
  renderTeacherSubmissions,
} from '../../src/modules/dashboards/teacher-dashboard.js';

beforeEach(() => {
  document.body.innerHTML = `
    <span id="stat-total-students"></span>
    <span id="stat-total-quizzes"></span>
    <span id="stat-avg-score-teacher"></span>
    <span id="stat-completion"></span>
    <div id="grade-distribution"></div>
    <table><tbody id="teacher-performance-tbody"></tbody></table>
    <table><tbody id="teacher-submissions-tbody"></tbody></table>
    <button id="btn-export-report"></button>
  `;
  window.localData = {
    students: [
      { name: 'أحمد', grade: 'عاشر' },
      { name: 'سارة', grade: 'تاسع' },
    ],
    assignments: [
      { id: 'a1', title: 'اختبار 1', type: 'mcq' },
      { id: 'a2', title: 'اختبار 2', type: 'text' },
    ],
    submissions: [
      {
        studentName: 'أحمد',
        quizTitle: 'اختبار 1',
        studentAnswer: 'B',
        initialScore: 90,
        graderFeedback: 'ممتاز',
      },
      {
        studentName: 'أحمد',
        quizTitle: 'اختبار 2',
        studentAnswer: 'نص طويل',
        initialScore: 80,
        graderFeedback: 'جيد',
      },
      {
        studentName: 'سارة',
        quizTitle: 'اختبار 1',
        studentAnswer: 'C',
        initialScore: 50,
        graderFeedback: 'مقبول',
      },
    ],
    notifications: [],
  };
  window.__ = (key) => {
    const msgs = {
      activeStudentsSuffix: ' نشط',
      gradePoor: 'ضعيف',
      gradePass: 'مقبول',
      gradeGood: 'جيد',
      gradeExcellent: 'ممتاز',
      noGradesForDistribution: 'لا توجد درجات',
      totalCorrections: 'إجمالي التصحيحات:',
      noAnswersYet: 'لا توجد إجابات بعد',
      unknownStudent: 'طالب غير معروف',
      teacherNoData: 'لا توجد بيانات',
      gradeLabel: 'الدرجة:',
      btnAIGradeFeedback: 'تصحيح AI',
      reportTitle: 'التقرير',
      reportDate: 'التاريخ',
      reportStudents: 'الطلاب',
      reportQuizzes: 'الاختبارات',
      reportCorrections: 'التصحيحات',
      reportAvgScore: 'متوسط الدرجات',
      reportPerStudent: 'حسب الطالب',
      reportAvg: 'المتوسط',
      reportEnd: 'نهاية التقرير',
      reportNoData: 'لا توجد بيانات',
      reportCopied: 'تم النسخ',
      reportGenerated: 'تم إنشاء التقرير',
      teacherReportLabel: 'التقرير',
      teacherReport: 'تقرير المعلم',
      close: 'إغلاق',
    };
    return msgs[key] || key;
  };
  window.speak = jest.fn();
  window.escapeHtml = (s) => String(s);
  window.gradeSubmissionWithAI = jest.fn();
  global.navigator.clipboard = { writeText: jest.fn() };
});

describe('teacher-dashboard.js - renderTeacherDashboard', () => {
  test('renders stats correctly', () => {
    renderTeacherDashboard();
    expect(document.getElementById('stat-total-students').textContent).toContain('2');
    expect(document.getElementById('stat-total-quizzes').textContent).toBe('2');
    expect(document.getElementById('stat-avg-score-teacher').textContent).toContain('73');
    expect(document.getElementById('stat-completion').textContent).toContain('75');
  });

  test('renders grade distribution', () => {
    renderTeacherDashboard();
    const dist = document.getElementById('grade-distribution');
    expect(dist.innerHTML).toContain('ممتاز');
    expect(dist.innerHTML).toContain('مقبول');
  });

  test('handles empty submissions', () => {
    window.localData.submissions = [];
    renderTeacherDashboard();
    expect(document.getElementById('stat-total-students').textContent).toBe('2');
    expect(document.getElementById('grade-distribution').textContent).toContain('لا توجد درجات');
  });
});

describe('teacher-dashboard.js - renderTeacherSubmissions', () => {
  test('renders submission table', () => {
    renderTeacherSubmissions();
    const tbody = document.getElementById('teacher-submissions-tbody');
    expect(tbody.children.length).toBe(3);
    expect(tbody.textContent).toContain('أحمد');
    expect(tbody.textContent).toContain('سارة');
  });

  test('shows empty state', () => {
    window.localData.submissions = [];
    renderTeacherSubmissions();
    const tbody = document.getElementById('teacher-submissions-tbody');
    expect(tbody.innerHTML).toContain('لا توجد بيانات');
  });
});
