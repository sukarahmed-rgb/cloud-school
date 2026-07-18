/**
 * @jest-environment jsdom
 */
import { recordGameScore, getStudentStats } from '../../src/modules/analytics.js';

beforeEach(() => {
  window.saveLocalData = jest.fn();
  window.localData = { submissions: [], gameProgress: [], books: [] };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('recordGameScore', () => {
  it('appends score to gameProgress', () => {
    const dateSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-07-18T12:00:00.000Z');
    recordGameScore('geography', 85);
    expect(window.localData.gameProgress).toHaveLength(1);
    expect(window.localData.gameProgress[0]).toEqual({
      gameType: 'geography',
      score: 85,
      date: '2026-07-18T12:00:00.000Z',
    });
    expect(window.saveLocalData).toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  it('appends to existing gameProgress', () => {
    window.localData.gameProgress = [{ gameType: 'math', score: 90, date: '2026-07-17T10:00:00.000Z' }];
    recordGameScore('science', 75);
    expect(window.localData.gameProgress).toHaveLength(2);
  });

  it('handles missing gameProgress gracefully', () => {
    delete window.localData.gameProgress;
    recordGameScore('listening', 60);
    expect(window.localData.gameProgress).toHaveLength(1);
    expect(window.localData.gameProgress[0].gameType).toBe('listening');
  });
});

describe('getStudentStats', () => {
  it('computes quiz count and average', () => {
    const stats = getStudentStats('Ahmed', {
      submissions: [
        { studentName: 'Ahmed', initialScore: 80, timestamp: '2026-07-18T10:00:00.000Z', quizTitle: 'Quiz 1' },
        { studentName: 'Ahmed', initialScore: 90, timestamp: '2026-07-17T10:00:00.000Z', quizTitle: 'Quiz 2' },
        { studentName: 'Sara', initialScore: 100, timestamp: '2026-07-16T10:00:00.000Z', quizTitle: 'Quiz 3' },
      ],
      gameProgress: [],
      books: [],
    });
    expect(stats.quizCount).toBe(2);
    expect(stats.quizAvg).toBe(85);
  });

  it('returns null quizAvg when no submissions', () => {
    const stats = getStudentStats('Ahmed', { submissions: [], gameProgress: [], books: [] });
    expect(stats.quizCount).toBe(0);
    expect(stats.quizAvg).toBeNull();
  });

  it('computes game count and average', () => {
    const stats = getStudentStats('Ahmed', {
      submissions: [],
      gameProgress: [
        { gameType: 'geo', score: 70, date: '2026-07-18T10:00:00.000Z' },
        { gameType: 'math', score: 90, date: '2026-07-17T10:00:00.000Z' },
      ],
      books: [],
    });
    expect(stats.gameCount).toBe(2);
    expect(stats.gameAvg).toBe(80);
  });

  it('computes book count', () => {
    const stats = getStudentStats('Ahmed', {
      submissions: [],
      gameProgress: [],
      books: [{ id: '1', title: 'B1' }, { id: '2', title: 'B2' }],
    });
    expect(stats.bookCount).toBe(2);
  });

  it('gradeDistribution categorizes scores', () => {
    const stats = getStudentStats('Ahmed', {
      submissions: [
        { studentName: 'Ahmed', initialScore: 30 },  // poor
        { studentName: 'Ahmed', initialScore: 55 },  // pass
        { studentName: 'Ahmed', initialScore: 75 },  // good
        { studentName: 'Ahmed', initialScore: 95 },  // excellent
        { studentName: 'Ahmed', initialScore: 100 }, // excellent
      ],
      gameProgress: [],
      books: [],
    });
    expect(stats.gradeDistribution).toEqual([1, 1, 1, 2]);
  });

  it('gradeDistribution handles empty submissions', () => {
    const stats = getStudentStats('Ahmed', { submissions: [], gameProgress: [], books: [] });
    expect(stats.gradeDistribution).toEqual([0, 0, 0, 0]);
  });

  it('streak returns consecutive days', () => {
    // Force today to a known date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));

    const stats = getStudentStats('Ahmed', {
      submissions: [],
      gameProgress: [
        { gameType: 'geo', score: 70, date: '2026-07-18T10:00:00.000Z' },
        { gameType: 'math', score: 80, date: '2026-07-17T10:00:00.000Z' },
      ],
      books: [],
    });
    expect(stats.streak).toBe(2);
  });

  it('streak breaks on gap', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));

    const stats = getStudentStats('Ahmed', {
      submissions: [
        { studentName: 'Ahmed', initialScore: 80, timestamp: '2026-07-18T10:00:00.000Z' },
        { studentName: 'Ahmed', initialScore: 70, timestamp: '2026-07-16T10:00:00.000Z' },
      ],
      gameProgress: [],
      books: [],
    });
    expect(stats.streak).toBe(1);
  });

  it('streak is 0 when no activity', () => {
    const stats = getStudentStats('Ahmed', { submissions: [], gameProgress: [], books: [] });
    expect(stats.streak).toBe(0);
  });

  it('recentActivity returns last 5 entries sorted by date desc', () => {
    const stats = getStudentStats('Ahmed', {
      submissions: [
        { studentName: 'Ahmed', initialScore: 80, timestamp: '2026-07-18T10:00:00.000Z', quizTitle: 'Q1' },
        { studentName: 'Ahmed', initialScore: 70, timestamp: '2026-07-17T10:00:00.000Z', quizTitle: 'Q2' },
      ],
      gameProgress: [
        { gameType: 'geo', score: 90, date: '2026-07-19T10:00:00.000Z' },
      ],
      books: [],
    });
    expect(stats.recentActivity).toHaveLength(3);
    expect(stats.recentActivity[0].type).toBe('game');
    expect(stats.recentActivity[0].title).toBe('geo');
    expect(stats.recentActivity[0].score).toBe(90);
    expect(stats.recentActivity[1].title).toBe('Q1');
    expect(stats.recentActivity[2].title).toBe('Q2');
  });
});
