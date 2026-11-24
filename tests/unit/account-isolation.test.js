import {
  localData,
  setCurrentUserSession,
  getAccountStorageKey,
} from '../../src/modules/app-state.js';
import { saveLocalData } from '../../src/modules/local-data.js';

beforeEach(() => {
  localStorage.clear();
  setCurrentUserSession(null);
});

test('account switch hides previous student data and restores only the correct account', () => {
  setCurrentUserSession({
    serverId: 'a',
    name: 'A',
    role: 'student',
    contact: 'a@example.invalid',
    serverAuth: true,
  });
  localData.submissions = [{ studentAnswer: 'private A' }];
  saveLocalData();
  const keyA = getAccountStorageKey();
  setCurrentUserSession({
    serverId: 'b',
    name: 'B',
    role: 'student',
    contact: 'b@example.invalid',
    serverAuth: true,
  });
  expect(getAccountStorageKey()).not.toBe(keyA);
  expect(localData.submissions).toEqual([]);
  expect(localData.books).toEqual([]);
  setCurrentUserSession(null);
  expect(localData.submissions).toEqual([]);
  setCurrentUserSession({
    serverId: 'a',
    name: 'A',
    role: 'student',
    contact: 'a@example.invalid',
    serverAuth: true,
  });
  expect(localData.submissions[0].studentAnswer).toBe('private A');
});

test('legacy shared storage is preserved but never silently imported into a new account', () => {
  localStorage.setItem(
    'cloudSchoolData',
    JSON.stringify({ submissions: [{ studentAnswer: 'legacy private' }] }),
  );
  setCurrentUserSession({
    serverId: 'new',
    name: 'New',
    role: 'student',
    contact: 'new@example.invalid',
    serverAuth: true,
  });
  expect(localData.submissions).toEqual([]);
  expect(localStorage.getItem('cloudSchoolData')).toContain('legacy private');
});
