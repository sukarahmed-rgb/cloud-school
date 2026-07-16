let ctx = null;

export function configureStudentDashboard(context) {
  ctx = context;
}

export function renderStudentStats() {
  if (!ctx) return;
  const localData = ctx.getLocalData();
  const currentUserSession = ctx.getCurrentUserSession();

  const submissions = localData.submissions || [];
  const mySubs = submissions.filter((s) => {
    return s.studentName === (currentUserSession?.name || '');
  });
  const quizCount = mySubs.length;
  const avgScore = quizCount > 0 ? Math.round(mySubs.reduce((sum, s) => sum + (s.initialScore || 0), 0) / quizCount) : null;
  const bookCount = localData.books ? localData.books.length : 0;
  const gameCount = 0;

  document.getElementById('stat-quizzes').textContent = quizCount;
  document.getElementById('stat-avg-score').textContent = avgScore !== null ? avgScore + '%' : '--';
  document.getElementById('stat-books').textContent = bookCount;
  document.getElementById('stat-games').textContent = gameCount;
}

export function renderStudentDashboard() {
  if (!ctx) return;
  const localData = ctx.getLocalData();
  const currentUserSession = ctx.getCurrentUserSession();

  renderStudentStats();

  const submissions = localData.submissions || [];
  const mySubs = submissions.filter((s) => {
    return s.studentName === (currentUserSession?.name || '');
  });

  // Quiz stats
  const quizDiv = document.getElementById('dashboard-quiz-stats');
  if (mySubs.length === 0) {
    quizDiv.innerHTML = '<p class="text-gray-300">' + ctx.__('dashboardNoQuizzes') + '</p>';
  } else {
    const avg = Math.round(mySubs.reduce((sum, s) => sum + (s.initialScore || 0), 0) / mySubs.length);
    const last = mySubs[0];
    quizDiv.innerHTML = '<div class="space-y-2">' +
      '<p class="text-white font-bold text-lg">' + mySubs.length + ' ' + ctx.escapeHtml(ctx.__('dashboardQuizzesSolved')) + '</p>' +
      '<p class="text-yellow-400 text-2xl font-black">' + ctx.escapeHtml(ctx.__('dashboardAverage')) + ' ' + avg + '%</p>' +
      '<p class="text-gray-300 text-sm">' + ctx.escapeHtml(ctx.__('dashboardLastQuiz')) + ' ' + ctx.escapeHtml(last.quizTitle || '') + ' — ' + (last.initialScore || 0) + '%</p>' +
      '</div>';
  }

  // Book stats
  const bookDiv = document.getElementById('dashboard-book-stats');
  const books = localData.books || [];
  if (books.length === 0) {
    bookDiv.innerHTML = '<p class="text-gray-300">' + ctx.__('dashboardNoBooks') + '</p>';
  } else {
    bookDiv.innerHTML = '<div class="space-y-2">' +
      '<p class="text-white font-bold text-lg">' + books.length + ' ' + ctx.__('dashboardBooksAvailable') + '</p>' +
      '<ul class="text-sm text-gray-300 space-y-1">' +
      books.map((b) => '<li>📚 ' + ctx.escapeHtml(b.title) + '</li>').join('') +
      '</ul></div>';
  }

  // Game stats
  const gameDiv = document.getElementById('dashboard-game-stats');
  gameDiv.innerHTML = '<div class="space-y-2">' +
    '<p class="text-white font-bold text-lg">' + ctx.__('dashboardGamesTitle') + '</p>' +
    '<p class="text-gray-300">' + ctx.__('dashboardGamesDesc') + '</p>' +
    '<ul class="text-sm text-gray-300 space-y-1">' +
    '<li>' + ctx.__('dashboardGameQuiz') + '</li>' +
    '<li>' + ctx.__('dashboardGameMemory') + '</li>' +
    '<li>' + ctx.__('dashboardGameStory') + '</li>' +
    '</ul></div>';

  // Achievements
  const achDiv = document.getElementById('dashboard-achievements');
  const badges = [];
  if (mySubs.length >= 1) badges.push(ctx.__('badgeStudious'));
  if (mySubs.length >= 5) badges.push(ctx.__('badgeStar'));
  if ((mySubs.reduce((sum, s) => sum + (s.initialScore || 0), 0) / Math.max(mySubs.length, 1)) >= 80) badges.push(ctx.__('badgeExcellent'));
  if (badges.length === 0) badges.push(ctx.__('badgeStart'));

  achDiv.innerHTML = '<div class="space-y-2">' +
    badges.map((b) => '<p class="text-white font-bold text-lg">' + b + '</p>').join('') +
    '</div>';

  // Encouragement
  const encouragement = document.getElementById('dashboard-encouragement');
  const msgs = [
    ctx.__('encourage1'),
    ctx.__('encourage2'),
    ctx.__('encourage3'),
    ctx.__('encourage4')
  ];
  encouragement.textContent = msgs[Math.floor(Math.random() * msgs.length)];
}
