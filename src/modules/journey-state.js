// Account-scoped learning progress. No shared or legacy key is imported.
import { getAccountStorageKey } from './app-state.js';
export function readJourney() {
  const key = getAccountStorageKey();
  if (!key) {
    return { drafts: {}, lessons: {} };
  }
  try {
    const data = JSON.parse(localStorage.getItem(`${key}:journey`) || '{}');
    return {
      drafts:
        (data && typeof data.drafts === 'object' && !Array.isArray(data.drafts) && data.drafts) ||
        {},
      lessons:
        (data &&
          typeof data.lessons === 'object' &&
          !Array.isArray(data.lessons) &&
          data.lessons) ||
        {},
      lastLesson: data?.lastLesson,
    };
  } catch {
    return { drafts: {}, lessons: {} };
  }
}
export function updateJourney(update) {
  const key = getAccountStorageKey();
  if (!key) {
    return false;
  }
  try {
    const state = readJourney();
    update(state);
    localStorage.setItem(`${key}:journey`, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function saveAnswerDraft(id, answer) {
  return updateJourney((s) => {
    s.drafts[id] = { answer, at: Date.now() };
  });
}
export function removeAnswerDraft(id) {
  return updateJourney((s) => {
    delete s.drafts[id];
  });
}
export function markLesson(id, patch) {
  return updateJourney((s) => {
    s.lessons[id] = { ...s.lessons[id], ...patch, at: Date.now() };
    s.lastLesson = id;
  });
}
export function contentPath(item) {
  return (
    [item.subject, item.unitTitle, item.lessonTitle].filter(Boolean).join(' / ') || 'محتوى غير مصنف'
  );
}
export function isPublished(item) {
  return item.publicationStatus !== 'draft';
}
