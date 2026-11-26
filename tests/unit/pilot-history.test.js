import { buildPilotHistory, addPilotHistory } from '../../src/modules/pilot-history.js';
import { isPublished } from '../../src/modules/journey-state.js';

describe('pilot history lessons', () => {
  const { books, assignments } = buildPilotHistory();

  test('two lessons, eleven items, all drafts', () => {
    expect(books).toHaveLength(2);
    expect(assignments).toHaveLength(11);
    for (const item of [...books, ...assignments]) {
      expect(item.publicationStatus).toBe('draft');
      expect(isPublished(item)).toBe(false);
    }
  });

  test('every assignment points at a lesson and mcq keys match an option', () => {
    for (const a of assignments) {
      expect(books.some((b) => b.id === a.lessonId)).toBe(true);
      if (a.type === 'mcq') {
        expect(a.options[a.correct]).toBeTruthy();
      } else {
        expect(a.ideal).toBeTruthy();
      }
      expect(a.source).toMatch(/^ص \d+/);
    }
  });

  test('reviewer-only questions never reach lesson text or keys', () => {
    const all = JSON.stringify([books, assignments]);
    for (const banned of ['التحرير', 'مجدو', 'أسئلة للمراجع', 'الأوقاف', 'قرارات لسه']) {
      expect(all).not.toContain(banned);
    }
  });

  test('adding twice does not duplicate', () => {
    const data = { books: [], assignments: [] };
    expect(addPilotHistory(data)).toBe(true);
    expect(addPilotHistory(data)).toBe(false);
    expect(data.books).toHaveLength(2);
    expect(data.assignments).toHaveLength(11);
  });
});
