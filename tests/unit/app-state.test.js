import * as appState from '../../src/modules/app-state.js';

describe('app-state.js', () => {
  describe('STORAGE_KEYS', () => {
    it('has expected shape', () => {
      expect(appState.STORAGE_KEYS).toEqual({
        sizeOffset: 'cloudSchoolSizeOffset',
        theme: 'cloudSchoolTheme',
        localData: 'cloudSchoolData',
      });
    });
  });

  describe('localData', () => {
    it('has default books array', () => {
      expect(Array.isArray(appState.localData.books)).toBe(true);
      expect(appState.localData.books.length).toBeGreaterThanOrEqual(2);
    });

    it('has default assignments', () => {
      expect(Array.isArray(appState.localData.assignments)).toBe(true);
      expect(appState.localData.assignments.length).toBeGreaterThanOrEqual(2);
    });

    it('has empty submissions, notifications arrays', () => {
      expect(appState.localData.submissions).toEqual([]);
      expect(appState.localData.notifications).toEqual([]);
    });

    it('has default students list', () => {
      expect(Array.isArray(appState.localData.students)).toBe(true);
      expect(appState.localData.students.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('currentUserSession getter/setter', () => {
    beforeEach(() => {
      appState.setCurrentUserSession(null);
    });

    it('defaults to null', () => {
      expect(appState.getCurrentUserSession()).toBeNull();
      expect(appState.currentUserSession).toBeNull();
    });

    it('setter updates the value', () => {
      const session = { name: 'Test User', role: 'student', contact: 'test@test.com' };
      appState.setCurrentUserSession(session);
      expect(appState.getCurrentUserSession()).toEqual(session);
      expect(appState.currentUserSession).toEqual(session);
    });

    it('setter can clear to null', () => {
      appState.setCurrentUserSession({ name: 'X', role: 'teacher', contact: 'x@x.com' });
      appState.setCurrentUserSession(null);
      expect(appState.getCurrentUserSession()).toBeNull();
    });

    it('setter overwrites previous value', () => {
      appState.setCurrentUserSession({ name: 'First', role: 'student', contact: 'a' });
      appState.setCurrentUserSession({ name: 'Second', role: 'teacher', contact: 'b' });
      expect(appState.getCurrentUserSession().name).toBe('Second');
    });
  });

  describe('initialAuthToken', () => {
    it('is null when global is not defined', () => {
      expect(appState.initialAuthToken).toBeNull();
    });
  });
});
