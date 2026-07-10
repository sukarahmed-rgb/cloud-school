/**
 * اختبارات للدوال الجديدة: الإشعارات، لوحة المتابعة، البيانات المحلية
 */

// ====== محاكاة المتغيرات العامة ======
var currentUserSession = null;
var localData = {
    books: [
        { id: 'b1', title: 'كيمياء', content: 'محتوى الكيمياء' },
        { id: 'b2', title: 'تاريخ', content: 'محتوى التاريخ' }
    ],
    assignments: [
        { id: 'a1', title: 'اختبار 1', type: 'mcq', question: 'س؟', options: { A: 'أ', B: 'ب', C: 'ج', D: 'د' }, correct: 'B' }
    ],
    submissions: [
        { studentName: 'أحمد', quizTitle: 'اختبار 1', initialScore: 90, timestamp: '10:00' },
        { studentName: 'أحمد', quizTitle: 'اختبار 2', initialScore: 70, timestamp: '11:00' }
    ],
    students: [
        { name: 'أحمد خالد', grade: 'الصف العاشر', pin: '7429' }
    ],
    notifications: []
};

var STORAGE_KEYS = { localData: 'cloudSchoolData' };

// ====== دوال الإشعارات ======
function addNotification(title, details, type) {
    if (!localData.notifications) localData.notifications = [];
    localData.notifications.unshift({
        title: title,
        details: details,
        type: type || 'info',
        time: new Date().toLocaleString('ar-EG'),
        read: false
    });
    if (localData.notifications.length > 50) localData.notifications.length = 50;
}

function updateNotifBadge() {
    var unread = (localData.notifications || []).filter(function(n) { return !n.read; }).length;
    return unread;
}

// ====== دوال لوحة المتابعة ======
function renderStudentStats() {
    var submissions = localData.submissions || [];
    var mySubs = submissions.filter(function(s) {
        return s.studentName === (currentUserSession ? currentUserSession.name : '');
    });
    var quizCount = mySubs.length;
    var avgScore = quizCount > 0 ? Math.round(mySubs.reduce(function(sum, s) { return sum + (s.initialScore || 0); }, 0) / quizCount) : null;
    var bookCount = localData.books ? localData.books.length : 0;
    return { quizCount: quizCount, avgScore: avgScore, bookCount: bookCount };
}

// ====== دوال البيانات المحلية ======
function saveLocalData() {
    try {
        localStorage.setItem(STORAGE_KEYS.localData, JSON.stringify(localData));
        return true;
    } catch (e) {
        return false;
    }
}

function loadLocalData() {
    try {
        var saved = localStorage.getItem(STORAGE_KEYS.localData);
        if (saved) {
            var parsed = JSON.parse(saved);
            if (parsed.books) localData.books = parsed.books;
            if (parsed.assignments) localData.assignments = parsed.assignments;
            if (parsed.submissions) localData.submissions = parsed.submissions;
            if (parsed.students) localData.students = parsed.students;
            if (parsed.notifications) localData.notifications = parsed.notifications;
        }
        if (!localData.notifications) localData.notifications = [];
        return true;
    } catch (e) {
        return false;
    }
}

// ====== دوال السمة والنص ======
function adjustTextSize(direction, currentOffset) {
    var offset = currentOffset + direction;
    if (offset < -2) offset = -2;
    if (offset > 6) offset = 6;
    var sizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
    var chosen = sizes[1 + Math.min(Math.max(offset, -2), 6)] || 1.125;
    return { offset: offset, size: chosen };
}

var themes = ['dark-hc', 'light-hc', 'classic'];

function cycleTheme(currentTheme) {
    var idx = themes.indexOf(currentTheme);
    var next = themes[(idx + 1) % themes.length];
    return next;
}

// ====== الاختبارات ======

describe('Notifications Module', () => {
    beforeEach(() => {
        localData.notifications = [];
    });

    test('addNotification adds a notification to the list', () => {
        addNotification('اختبار', 'تفاصيل', 'info');
        expect(localData.notifications.length).toBe(1);
        expect(localData.notifications[0].title).toBe('اختبار');
        expect(localData.notifications[0].read).toBe(false);
    });

    test('addNotification caps at 50 notifications', () => {
        for (var i = 0; i < 60; i++) addNotification('n' + i, '', 'info');
        expect(localData.notifications.length).toBe(50);
    });

    test('addNotification prepends (newest first)', () => {
        addNotification('first', '', 'info');
        addNotification('second', '', 'info');
        expect(localData.notifications[0].title).toBe('second');
    });

    test('updateNotifBadge counts unread correctly', () => {
        addNotification('n1', '', 'info');
        addNotification('n2', '', 'info');
        localData.notifications[0].read = true;
        expect(updateNotifBadge()).toBe(1);
    });
});

describe('Student Dashboard Logic', () => {
    test('renderStudentStats returns correct counts', () => {
        currentUserSession = { name: 'أحمد' };
        var stats = renderStudentStats();
        expect(stats.quizCount).toBe(2);
        expect(stats.avgScore).toBe(80);
        expect(stats.bookCount).toBe(2);
    });

    test('renderStudentStats handles no submissions', () => {
        var oldSubs = localData.submissions;
        localData.submissions = [];
        currentUserSession = { name: 'لا يوجد' };
        var stats = renderStudentStats();
        expect(stats.quizCount).toBe(0);
        expect(stats.avgScore).toBeNull();
        localData.submissions = oldSubs;
    });
});

describe('Local Data Persistence', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('saveLocalData and loadLocalData round-trip', () => {
        localData.books = [{ id: 'x', title: 'اختبار', content: 'محتوى' }];
        localData.notifications = [{ title: 'n1', details: 'd', read: false }];
        expect(saveLocalData()).toBe(true);

        // Reset and load
        localData.books = [];
        localData.notifications = [];
        expect(loadLocalData()).toBe(true);
        expect(localData.books.length).toBe(1);
        expect(localData.books[0].title).toBe('اختبار');
        expect(localData.notifications.length).toBe(1);
    });

    test('loadLocalData initializes notifications if missing', () => {
        localStorage.setItem(STORAGE_KEYS.localData, JSON.stringify({ books: [], assignments: [], submissions: [], students: [] }));
        localData.notifications = null;
        loadLocalData();
        expect(localData.notifications).toEqual([]);
    });
});

describe('Text Size Adjustment', () => {
    test('adjustTextSize increases size', () => {
        var result = adjustTextSize(1, 0);
        expect(result.offset).toBe(1);
        expect(result.size).toBe(1.25);
    });

    test('adjustTextSize decreases size', () => {
        var result = adjustTextSize(-1, 0);
        expect(result.offset).toBe(-1);
        expect(result.size).toBe(1);
    });

    test('adjustTextSize clamps at minimum -2', () => {
        var result = adjustTextSize(-1, -2);
        expect(result.offset).toBe(-2);
        expect(result.size).toBe(1.125);
    });

    test('adjustTextSize clamps at maximum 6', () => {
        var result = adjustTextSize(1, 6);
        expect(result.offset).toBe(6);
        expect(result.size).toBe(3);
    });
});

describe('Theme Cycling', () => {
    test('cycleTheme goes from dark-hc to light-hc', () => {
        expect(cycleTheme('dark-hc')).toBe('light-hc');
    });

    test('cycleTheme wraps around from classic to dark-hc', () => {
        expect(cycleTheme('classic')).toBe('dark-hc');
    });

    test('cycleTheme goes to classic from light-hc', () => {
        expect(cycleTheme('light-hc')).toBe('classic');
    });
});
