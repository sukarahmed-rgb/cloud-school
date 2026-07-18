jest.mock('../../src/modules/dialogic-learning.js', () => ({
  startDialogicClassroom: jest.fn(),
  stopDialogicClassroom: jest.fn(),
  triggerDialogicAnswer: jest.fn(),
}));

jest.mock('../../src/modules/study-groups.js', () => ({
  startStudyGroup: jest.fn(),
  stopStudyGroup: jest.fn(),
  handleStudyGroupSpeech: jest.fn(),
  skipStudyGroupTurn: jest.fn(),
}));

jest.mock('../../src/modules/voice-exams.js', () => ({
  toggleVoiceExamMode: jest.fn(),
  readCurrentQuizAloud: jest.fn(),
  startVoiceExamListening: jest.fn(),
  confirmVoiceSubmit: jest.fn(),
  doVoiceSubmit: jest.fn(),
  updateVoiceExamStatus: jest.fn(),
}));

import {
  startDialogicClassroom,
  stopDialogicClassroom,
  startStudyGroup,
  stopStudyGroup,
  toggleVoiceExamMode,
  readCurrentQuizAloud,
  startVoiceExamListening,
  confirmVoiceSubmit,
  doVoiceSubmit,
  updateVoiceExamStatus,
} from '../../src/features.js';

beforeEach(() => {
  window.__ = jest.fn((key) => key);
  window.speak = jest.fn();
  document.body.innerHTML = '';
});

describe('features.js - lazy-loading wrappers', () => {
  test('startDialogicClassroom resolves without throwing', async () => {
    await expect(startDialogicClassroom()).resolves.toBeUndefined();
  });

  test('stopDialogicClassroom resolves without throwing', async () => {
    await expect(stopDialogicClassroom()).resolves.toBeUndefined();
  });

  test('startStudyGroup resolves without throwing', async () => {
    await expect(startStudyGroup()).resolves.toBeUndefined();
  });

  test('stopStudyGroup resolves without throwing', async () => {
    await expect(stopStudyGroup()).resolves.toBeUndefined();
  });

  test('toggleVoiceExamMode resolves without throwing', async () => {
    await expect(toggleVoiceExamMode()).resolves.toBeUndefined();
  });

  test('readCurrentQuizAloud resolves without throwing', async () => {
    await expect(readCurrentQuizAloud()).resolves.toBeUndefined();
  });

  test('startVoiceExamListening resolves without throwing', async () => {
    await expect(startVoiceExamListening()).resolves.toBeUndefined();
  });

  test('confirmVoiceSubmit resolves without throwing', async () => {
    await expect(confirmVoiceSubmit()).resolves.toBeUndefined();
  });

  test('doVoiceSubmit resolves without throwing', async () => {
    await expect(doVoiceSubmit()).resolves.toBeUndefined();
  });

  test('updateVoiceExamStatus resolves without throwing', async () => {
    await expect(updateVoiceExamStatus()).resolves.toBeUndefined();
  });
});
