// Teacher Dashboard Module - لوحة قيادة المعلم (Lazy loaded)

export function renderTeacherDashboard() {
    var localData = window.localData;
    var __ = window.__;
    var submissions = localData.submissions || [];
    var students = localData.students || [];
    var assignments = localData.assignments || [];

    var totalStudents = students.length;
    var activeStudents = new Set(submissions.map(function(s) { return s.studentName; })).size;
    var totalQuizzes = assignments.length;
    var totalSubmissions = submissions.length;
    var avgScore = totalSubmissions > 0
        ? Math.round(submissions.reduce(function(sum, s) { return sum + (s.initialScore || 0); }, 0) / totalSubmissions)
        : 0;
    var completionRate = totalQuizzes > 0 && activeStudents > 0
        ? Math.round((totalSubmissions / (totalQuizzes * activeStudents)) * 100)
        : 0;

    document.getElementById('stat-total-students').textContent = totalStudents + (activeStudents > 0 ? ' (' + activeStudents + __('activeStudentsSuffix') + ')' : '');
    document.getElementById('stat-total-quizzes').textContent = totalQuizzes;
    document.getElementById('stat-avg-score').textContent = avgScore + '%';
    document.getElementById('stat-completion').textContent = Math.min(completionRate, 100) + '%';

    renderGradeDistribution(submissions);
    renderStudentPerformanceTable(submissions, assignments);
    var exportBtn = document.getElementById('btn-export-report');
    if (exportBtn) {
        exportBtn.onclick = function() { generateTeacherReport(); };
    }
}

function renderGradeDistribution(submissions) {
    var __ = window.__;
    var container = document.getElementById('grade-distribution');
    var ranges = [
        { label: __('gradePoor'), min: 0, max: 49, color: 'bg-red-500' },
        { label: __('gradePass'), min: 50, max: 69, color: 'bg-orange-500' },
        { label: __('gradeGood'), min: 70, max: 89, color: 'bg-blue-500' },
        { label: __('gradeExcellent'), min: 90, max: 100, color: 'bg-green-500' }
    ];
    var counts = [0, 0, 0, 0];
    submissions.forEach(function(s) {
        var score = s.initialScore || 0;
        for (var i = 0; i < ranges.length; i++) {
            if (score >= ranges[i].min && score <= ranges[i].max) { counts[i]++; break; }
        }
    });
    var maxCount = Math.max.apply(null, counts) || 1;
    var html = '';
    for (var i = 0; i < ranges.length; i++) {
        var pct = Math.round((counts[i] / maxCount) * 100);
        html += '<div class="flex items-center gap-3">' +
            '<span class="text-sm w-28 shrink-0">' + ranges[i].label + '</span>' +
            '<div class="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">' +
            '<div class="h-full ' + ranges[i].color + ' rounded-full transition-all duration-500" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="text-sm font-bold w-10 text-left">' + counts[i] + '</span>' +
            '</div>';
    }
    if (submissions.length === 0) {
        container.innerHTML = '<p class="text-gray-400">' + __('noGradesForDistribution') + '</p>';
    } else {
        container.innerHTML = '<div class="space-y-3">' + html + '</div>' +
            '<p class="text-xs text-gray-400 mt-2">' + __('totalCorrections') + ' ' + submissions.length + '</p>';
    }
}

function renderStudentPerformanceTable(submissions, assignments) {
    var __ = window.__;
    var escapeHtml = window.escapeHtml;
    var tbody = document.getElementById('teacher-performance-tbody');
    tbody.innerHTML = '';
    if (submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">' + __('noAnswersYet') + '</td></tr>';
        return;
    }
    var studentMap = {};
    submissions.forEach(function(s) {
        var name = s.studentName || __('unknownStudent');
        if (!studentMap[name]) studentMap[name] = [];
        studentMap[name].push(s.initialScore || 0);
    });
    var studentNames = Object.keys(studentMap).sort();
    studentNames.forEach(function(name) {
        var scores = studentMap[name];
        var avg = Math.round(scores.reduce(function(a, b) { return a + b; }, 0) / scores.length);
        var max = Math.max.apply(null, scores);
        var min = Math.min.apply(null, scores);
        var tr = document.createElement('tr');
        var gradeClass = avg >= 90 ? 'text-green-400' : (avg >= 70 ? 'text-blue-400' : (avg >= 50 ? 'text-yellow-400' : 'text-red-400'));
        tr.innerHTML = '<td class="p-2 border border-current font-bold">' + escapeHtml(name) + '</td>' +
            '<td class="p-2 border border-current text-center">' + scores.length + '</td>' +
            '<td class="p-2 border border-current font-bold text-center ' + gradeClass + '">' + avg + '%</td>' +
            '<td class="p-2 border border-current text-center text-green-300">' + max + '%</td>' +
            '<td class="p-2 border border-current text-center text-red-300">' + min + '%</td>';
        tbody.appendChild(tr);
    });
}

function generateTeacherReport() {
    var localData = window.localData;
    var __ = window.__;
    var speak = window.speak;
    var escapeHtml = window.escapeHtml;
    var submissions = localData.submissions || [];
    var students = localData.students || [];
    var assignments = localData.assignments || [];
    if (submissions.length === 0) {
        speak(__('reportNoData'));
        return;
    }
    var report = '--- ' + __('reportTitle') + ' ---\n';
    report += __('reportDate') + ': ' + new Date().toLocaleString('ar-EG') + '\n';
    report += __('reportStudents') + ': ' + students.length + '\n';
    report += __('reportQuizzes') + ': ' + assignments.length + '\n';
    report += __('reportCorrections') + ': ' + submissions.length + '\n\n';
    var avg = submissions.length > 0
        ? Math.round(submissions.reduce(function(s, sub) { return s + (sub.initialScore || 0); }, 0) / submissions.length)
        : 0;
    report += __('reportAvgScore') + ': ' + avg + '%\n\n';
    report += '--- ' + __('reportPerStudent') + ' ---\n';
    var studentMap = {};
    submissions.forEach(function(s) {
        var name = s.studentName || __('unknownStudent');
        if (!studentMap[name]) studentMap[name] = [];
        studentMap[name].push({ title: s.quizTitle || __('defaultQuizTitle'), score: s.initialScore || 0 });
    });
    Object.keys(studentMap).sort().forEach(function(name) {
        var subs = studentMap[name];
        var avgS = Math.round(subs.reduce(function(a, b) { return a + b.score; }, 0) / subs.length);
        report += '\n' + name + ' — ' + __('reportAvg') + ': ' + avgS + '%\n';
        subs.forEach(function(sub) {
            report += '  - ' + sub.title + ': ' + sub.score + '%\n';
        });
    });
    report += '\n--- ' + __('reportEnd') + ' ---';
    try {
        navigator.clipboard.writeText(report);
        speak(__('reportCopied'));
    } catch (e) {
        speak(__('reportGenerated'));
    }
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4';
    overlay.innerHTML = '<div class="card p-6 rounded-3xl max-w-2xl border-4 border-yellow-400 bg-slate-900 text-white w-full max-h-[80vh] overflow-y-auto" role="dialog" aria-label="' + __('teacherReportLabel') + '">' +
        '<h2 class="text-3xl font-black text-yellow-400 mb-4 text-center">' + __('teacherReport') + '</h2>' +
        '<pre class="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">' + escapeHtml(report) + '</pre>' +
        '<button id="btn-close-report" class="w-full mt-4 p-4 bg-yellow-500 text-black font-black text-xl rounded-xl btn-interactive">' + __('close') + '</button></div>';
    document.body.appendChild(overlay);
    document.getElementById('btn-close-report').addEventListener('click', function() { overlay.remove(); });
    document.getElementById('btn-close-report').focus();
}

export function renderTeacherSubmissions() {
    var localData = window.localData;
    var __ = window.__;
    var escapeHtml = window.escapeHtml;
    const tbody = document.getElementById('teacher-submissions-tbody');
    tbody.innerHTML = '';

    if (localData.submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">' + __('teacherNoData') + '</td></tr>';
        return;
    }

    localData.submissions.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3 border border-current font-bold">${escapeHtml(s.studentName)}</td>
            <td class="p-3 border border-current">${escapeHtml(s.quizTitle)}</td>
            <td class="p-3 border border-current font-mono text-xs">${escapeHtml(s.studentAnswer)}</td>
            <td class="p-3 border border-current">
                <span class="font-bold text-yellow-400">${__('gradeLabel')} ${escapeHtml(String(s.initialScore))}</span><br>
                <span class="text-xs text-gray-300 block max-w-xs overflow-hidden text-ellipsis">${escapeHtml(s.graderFeedback)}</span>
            </td>
            <td class="p-3 border border-current">
                <button data-action="grade-ai" data-index="${idx}" class="px-2 py-1 bg-purple-600 text-white font-bold rounded text-xs btn-interactive">${__('btnAIGradeFeedback')}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="grade-ai"]');
        if (btn && window.gradeSubmissionWithAI) {
            window.gradeSubmissionWithAI(parseInt(btn.dataset.index));
        }
    });
}
