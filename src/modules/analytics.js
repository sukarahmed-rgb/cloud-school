export function recordGameScore(gameType, score) {
  const progress = window.localData.gameProgress || [];
  progress.push({
    gameType,
    score,
    date: new Date().toISOString(),
  });
  window.localData.gameProgress = progress;
  window.saveLocalData();
}

export function getStudentStats(studentName, localData) {
  const submissions = (localData.submissions || []).filter((s) => s.studentName === studentName);
  const gameProgress = localData.gameProgress || [];
  const myGames = gameProgress;
  const books = localData.books || [];

  const quizCount = submissions.length;
  const quizAvg =
    quizCount > 0
      ? Math.round(submissions.reduce((sum, s) => sum + (s.initialScore || 0), 0) / quizCount)
      : null;
  const bookCount = books.length;
  const gameCount = myGames.length;
  const gameAvg =
    gameCount > 0
      ? Math.round(myGames.reduce((sum, g) => sum + (g.score || 0), 0) / gameCount)
      : null;

  const gradeDistribution = [0, 0, 0, 0];
  submissions.forEach((s) => {
    const sc = s.initialScore || 0;
    if (sc < 50) {
      gradeDistribution[0]++;
    } else if (sc < 70) {
      gradeDistribution[1]++;
    } else if (sc < 90) {
      gradeDistribution[2]++;
    } else {
      gradeDistribution[3]++;
    }
  });

  const streak = computeStudyStreak(submissions, gameProgress);
  const recentActivity = buildRecentActivity(submissions, myGames);

  return {
    quizCount,
    quizAvg,
    bookCount,
    gameCount,
    gameAvg,
    gradeDistribution,
    streak,
    recentActivity,
  };
}

function computeStudyStreak(submissions, gameProgress) {
  const dates = new Set();
  submissions.forEach((s) => {
    if (s.timestamp) {
      dates.add(s.timestamp.slice(0, 10));
    }
  });
  gameProgress.forEach((g) => {
    if (g.date) {
      dates.add(g.date.slice(0, 10));
    }
  });
  if (dates.size === 0) {
    return 0;
  }

  const sorted = [...dates].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (sorted[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function buildRecentActivity(submissions, gameProgress) {
  const all = [
    ...submissions.map((s) => ({
      type: 'quiz',
      title: s.quizTitle || '',
      score: s.initialScore || 0,
      date: s.timestamp || '',
    })),
    ...gameProgress.map((g) => ({
      type: 'game',
      title: g.gameType || '',
      score: g.score || 0,
      date: g.date || '',
    })),
  ];
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return all.slice(0, 5);
}
