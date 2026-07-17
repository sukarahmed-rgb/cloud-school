// Unit tests for audio-game.js questions and difficulty picker

import { questionBank, pickQuestionByDifficulty } from '../../src/modules/audio-game.js';

describe('audio-game.js - pickQuestionByDifficulty', () => {
  beforeEach(() => {
    window.secureRandomInt = jest.fn().mockReturnValue(0);
  });

  test('picks question of level 1 successfully', () => {
    const question = pickQuestionByDifficulty(1);
    expect(question.d).toBe(1);
    expect(question.q).toBe('الماء يتكون من ذرتي هيدروجين وذرة أكسجين.');
  });

  test('picks question of level 2 successfully', () => {
    const question = pickQuestionByDifficulty(2);
    expect(question.d).toBe(2);
  });

  test('falls back to all questions if target level pool is empty', () => {
    const question = pickQuestionByDifficulty(99);
    expect(question).toBeDefined();
    expect(questionBank).toContainEqual(question);
  });
});
