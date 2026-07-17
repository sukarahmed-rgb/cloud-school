// @ts-check
export function saveLocalData() {
  try {
    window.localStorage.setItem(window.STORAGE_KEYS.localData, JSON.stringify(window.localData));
  } catch (e) {
    console.warn('Failed to save local data:', e);
  }
}

export function loadLocalData() {
  try {
    const saved = window.localStorage.getItem(window.STORAGE_KEYS.localData);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.books) {
        window.localData.books = parsed.books;
      }
      if (parsed.assignments) {
        window.localData.assignments = parsed.assignments;
      }
      if (parsed.submissions) {
        window.localData.submissions = parsed.submissions;
      }
      if (parsed.students) {
        window.localData.students = parsed.students;
      }
      if (parsed.notifications) {
        window.localData.notifications = parsed.notifications;
      }
    }
    if (!window.localData.notifications) {
      window.localData.notifications = [];
    }
  } catch (e) {
    console.warn('Failed to load local data:', e);
  }
}
