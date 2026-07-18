import { getStudentStats } from '../analytics.js';

let ctx = null;

export function configureStudentDashboard(context) {
  ctx = context;
}

function statCard(label, value, color = 'text-white') {
  return `<div class="bg-slate-800 p-3 rounded-lg text-center"><p class="text-sm text-gray-400">${label}</p><p class="text-2xl font-black ${color}">${value}</p></div>`;
}

function barChart(labels, values, colors) {
  const max = Math.max(...values, 1);
  return labels
    .map(
      (l, i) =>
        `<div class="flex items-center gap-2 text-sm"><span class="w-16 shrink-0 text-gray-300">${l}</span><div class="flex-1 bg-slate-700 rounded-full h-4"><div class="h-full rounded-full ${colors[i] || 'bg-blue-500'}" style="width:${Math.round((values[i] / max) * 100)}%"></div></div><span class="w-8 text-right text-gray-300">${values[i]}</span></div>`,
    )
    .join('');
}

export function renderStudentStats() {
  if (!ctx) {
    return;
  }
  const localData = ctx.getLocalData();
  const currentUserSession = ctx.getCurrentUserSession();
  const name = currentUserSession?.name || '';
  const stats = getStudentStats(name, localData);

  document.getElementById('stat-quizzes').textContent = stats.quizCount;
  document.getElementById('stat-avg-score').textContent =
    stats.quizAvg !== null ? `${stats.quizAvg}%` : '--';
  document.getElementById('stat-books').textContent = stats.bookCount;
  document.getElementById('stat-games').textContent = stats.gameCount;
}

export function renderStudentDashboard() {
  if (!ctx) {
    return;
  }
  const localData = ctx.getLocalData();
  const currentUserSession = ctx.getCurrentUserSession();
  const name = currentUserSession?.name || '';
  const stats = getStudentStats(name, localData);

  renderStudentStats();

  const submissions = (localData.submissions || []).filter((s) => s.studentName === name);

  // Quiz stats
  const quizDiv = document.getElementById('dashboard-quiz-stats');
  if (submissions.length === 0) {
    quizDiv.innerHTML = `<p class="text-gray-300">${ctx.__('dashboardNoQuizzes')}</p>`;
  } else {
    const avg = stats.quizAvg;
    const last = submissions[0];
    quizDiv.innerHTML =
      '<div class="space-y-3">' +
      `<div class="grid grid-cols-2 gap-2">${statCard(ctx.__('dashboardQuizzesSolved'), submissions.length, 'text-yellow-400')}${statCard(ctx.__('dashboardAverage'), `${avg}%`, avg >= 80 ? 'text-green-400' : avg >= 50 ? 'text-yellow-400' : 'text-red-400')}</div>` +
      `<p class="text-gray-300 text-sm">${ctx.escapeHtml(ctx.__('dashboardLastQuiz'))} ${ctx.escapeHtml(last.quizTitle || '')} — ${last.initialScore || 0}%</p>${renderGradeDistribution(
        ctx,
        stats.gradeDistribution,
      )}</div>`;
  }

  // Book stats
  const bookDiv = document.getElementById('dashboard-book-stats');
  const books = localData.books || [];
  if (books.length === 0) {
    bookDiv.innerHTML = `<p class="text-gray-300">${ctx.__('dashboardNoBooks')}</p>`;
  } else {
    bookDiv.innerHTML =
      '<div class="space-y-2">' +
      `<p class="text-white font-bold text-lg">${books.length} ${ctx.__('dashboardBooksAvailable')}</p>` +
      `<ul class="text-sm text-gray-300 space-y-1">${books
        .map((b) => `<li>📚 ${ctx.escapeHtml(b.title)}</li>`)
        .join('')}</ul></div>`;
  }

  // Game stats
  const gameDiv = document.getElementById('dashboard-game-stats');
  const myGames = localData.gameProgress || [];
  if (myGames.length === 0) {
    gameDiv.innerHTML =
      '<div class="space-y-2">' +
      `<p class="text-white font-bold text-lg">${ctx.__('dashboardGamesTitle')}</p>` +
      `<p class="text-gray-300">${ctx.__('dashboardGamesDesc')}</p>` +
      '</div>';
  } else {
    const gameAvg = stats.gameAvg;
    const gamesByType = {};
    myGames.forEach((g) => {
      gamesByType[g.gameType] = (gamesByType[g.gameType] || 0) + 1;
    });
    gameDiv.innerHTML =
      '<div class="space-y-3">' +
      `<div class="grid grid-cols-2 gap-2">${statCard(ctx.__('dashboardGamesPlayed'), myGames.length, 'text-purple-400')}${statCard(ctx.__('dashboardGameAvg'), gameAvg !== null ? `${gameAvg}%` : '--', 'text-purple-400')}</div>` +
      `<div class="text-sm text-gray-300 space-y-1">${Object.entries(gamesByType)
        .map(([t, c]) => `<p>🎮 ${ctx.escapeHtml(t)}: ${c}</p>`)
        .join('')}</div>` +
      '</div>';
  }

  // Achievements
  const achDiv = document.getElementById('dashboard-achievements');
  const badges = [];
  if (stats.streak >= 3) {
    badges.push(`🔥 ${ctx.__('badgeStreak')} (${stats.streak} ${ctx.__('badgeDays')})`);
  }
  if (submissions.length >= 1) {
    badges.push(ctx.__('badgeStudious'));
  }
  if (submissions.length >= 5) {
    badges.push(ctx.__('badgeStar'));
  }
  if (stats.quizAvg !== null && stats.quizAvg >= 80) {
    badges.push(ctx.__('badgeExcellent'));
  }
  if (myGames.length >= 3) {
    badges.push(ctx.__('badgeGamer'));
  }
  if (badges.length === 0) {
    badges.push(ctx.__('badgeStart'));
  }

  achDiv.innerHTML = `<div class="space-y-2">${badges.map((b) => `<p class="text-white font-bold text-lg">${b}</p>`).join('')}</div>`;

  // Recent activity
  const recentDiv = document.getElementById('dashboard-recent-activity');
  if (recentDiv) {
    if (stats.recentActivity.length === 0) {
      recentDiv.innerHTML = `<p class="text-gray-300">${ctx.__('dashboardNoActivity')}</p>`;
    } else {
      recentDiv.innerHTML = `<div class="space-y-1 text-sm">${stats.recentActivity
        .map(
          (a) =>
            `<p class="text-gray-300">${a.type === 'quiz' ? '📝' : '🎮'} ${ctx.escapeHtml(a.title || '')} — ${a.score}% <span class="text-gray-500">${a.date ? a.date.slice(0, 10) : ''}</span></p>`,
        )
        .join('')}</div>`;
    }
  }

  // Encouragement
  const encouragement = document.getElementById('dashboard-encouragement');
  const msgs = [
    ctx.__('encourage1'),
    ctx.__('encourage2'),
    ctx.__('encourage3'),
    ctx.__('encourage4'),
  ];
  encouragement.textContent = msgs[Math.floor(Math.random() * msgs.length)];
}

function renderGradeDistribution(ctx, dist) {
  const labels = [
    ctx.__('gradePoor'),
    ctx.__('gradePass'),
    ctx.__('gradeGood'),
    ctx.__('gradeExcellent'),
  ];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-blue-500', 'bg-green-500'];
  if (dist.reduce((a, b) => a + b, 0) === 0) {
    return '';
  }
  return `<div class="mt-3 space-y-1">${barChart(labels, dist, colors)}</div>`;
}
