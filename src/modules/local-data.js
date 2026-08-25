// @ts-check
import { STORAGE_KEYS, localData } from './app-state.js';

export function saveLocalData() {
  try {
    localStorage.setItem(STORAGE_KEYS.localData, JSON.stringify(localData));
  } catch (e) {
    console.warn('Failed to save local data:', e);
  }
}

export function loadLocalData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.localData);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.books) {
        localData.books = parsed.books;
      }
      if (parsed.assignments) {
        localData.assignments = parsed.assignments;
      }
      if (parsed.submissions) {
        localData.submissions = parsed.submissions;
      }
      if (parsed.students) {
        localData.students = parsed.students;
      }
      if (parsed.notifications) {
        localData.notifications = parsed.notifications;
      }
      if (parsed.gameProgress) {
        localData.gameProgress = parsed.gameProgress;
      }
    }
    if (!localData.notifications) {
      localData.notifications = [];
    }
    if (!localData.gameProgress) {
      localData.gameProgress = [];
    }
  } catch (e) {
    console.warn('Failed to load local data:', e);
  }
}
