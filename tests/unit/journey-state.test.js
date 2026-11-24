import { setCurrentUserSession } from '../../src/modules/app-state.js';
import {
  saveAnswerDraft,
  readJourney,
  markLesson,
  contentPath,
  isPublished,
} from '../../src/modules/journey-state.js';
beforeEach(() => {
  localStorage.clear();
  setCurrentUserSession(null);
});
test('drafts and lesson position survive reload per account without crossing owners', () => {
  setCurrentUserSession({ serverId: 'a', role: 'student' });
  saveAnswerDraft('q', 'answer A');
  markLesson('b', { paragraph: 2, audioTime: 18 });
  expect(readJourney().lastLesson).toBe('b');
  setCurrentUserSession({ serverId: 'b', role: 'student' });
  expect(readJourney().drafts).toEqual({});
  expect(readJourney().lessons).toEqual({});
  setCurrentUserSession({ serverId: 'a', role: 'student' });
  expect(readJourney().drafts.q.answer).toBe('answer A');
  expect(readJourney().lessons.b.audioTime).toBe(18);
});
test('signed out cannot write a journey and malformed storage resets safely', () => {
  expect(saveAnswerDraft('q', 'x')).toBe(false);
  expect(readJourney().drafts).toEqual({});
});
test('legacy published content remains visible, draft is explicit and structure does not require a subject choice', () => {
  expect(isPublished({})).toBe(true);
  expect(isPublished({ publicationStatus: 'draft' })).toBe(false);
  expect(contentPath({ subject: 'Subject', unitTitle: 'Unit', lessonTitle: 'Lesson' })).toBe(
    'Subject / Unit / Lesson',
  );
});
