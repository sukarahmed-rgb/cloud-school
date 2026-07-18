import { saveLocalData, loadLocalData } from '../../src/modules/local-data.js';

describe('local-data.js', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
    window.STORAGE_KEYS = { localData: 'cloud_school_localData' };
    window.localData = {
      books: [],
      assignments: [],
      submissions: [],
      students: [],
      notifications: [],
    };
  });

  test('saveLocalData writes to localStorage', () => {
    window.localData.books = [{ id: 1, title: 'Book 1' }];
    saveLocalData();
    const saved = JSON.parse(window.localStorage.getItem(window.STORAGE_KEYS.localData));
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
    window.localStorage.setItem(
      window.STORAGE_KEYS.localData,
      JSON.stringify({
        books: [{ id: 1, title: 'Restored' }],
        assignments: [],
        submissions: [],
        students: [],
        notifications: [],
      }),
    );
    loadLocalData();
    expect(window.localData.books).toHaveLength(1);
    expect(window.localData.books[0].title).toBe('Restored');
  });

  test('loadLocalData initializes notifications if missing', () => {
    window.localData.notifications = undefined;
    loadLocalData();
    expect(window.localData.notifications).toEqual([]);
  });

  test('loadLocalData handles corrupt JSON gracefully', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.setItem(window.STORAGE_KEYS.localData, 'not-json');
    loadLocalData();
    expect(console.warn).toHaveBeenCalled();
  });
});
