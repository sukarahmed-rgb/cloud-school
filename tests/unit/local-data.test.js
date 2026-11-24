import { saveLocalData, loadLocalData } from '../../src/modules/local-data.js';
import { getAccountStorageKey, setCurrentUserSession, localData } from '../../src/modules/app-state.js';

describe('local-data.js', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    setCurrentUserSession({ serverId: 'test-user', role: 'student', name: 'Test', contact: 'test@example.invalid' });
    localData.books = [];
    localData.assignments = [];
    localData.submissions = [];
    localData.students = [];
    localData.notifications = [];
    delete localData.gameProgress;
  });

  test('saveLocalData writes to localStorage', () => {
    localData.books = [{ id: 1, title: 'Book 1' }];
    saveLocalData();
    const saved = JSON.parse(localStorage.getItem(getAccountStorageKey()));
    expect(saved.books).toHaveLength(1);
    expect(saved.books[0].title).toBe('Book 1');
  });

  test('saveLocalData handles localStorage error gracefully', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    saveLocalData();
    expect(console.warn).toHaveBeenCalled();
  });

  test('loadLocalData restores saved data', () => {
    localStorage.setItem(
      getAccountStorageKey(),
      JSON.stringify({
        books: [{ id: 1, title: 'Restored' }],
        assignments: [],
        submissions: [],
        students: [],
        notifications: [],
      }),
    );
    loadLocalData();
    expect(localData.books).toHaveLength(1);
    expect(localData.books[0].title).toBe('Restored');
  });

  test('loadLocalData initializes notifications if missing', () => {
    localData.notifications = undefined;
    loadLocalData();
    expect(localData.notifications).toEqual([]);
  });

  test('loadLocalData handles corrupt JSON gracefully', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(getAccountStorageKey(), 'not-json');
    loadLocalData();
    expect(console.warn).toHaveBeenCalled();
  });
});
