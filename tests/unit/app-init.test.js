import { isInitRan, markInitRan } from '../../src/modules/app-init.js';
import * as appInit from '../../src/modules/app-init.js';

jest.mock('../../src/modules/quizzes.js', () => ({
  clearQuizTimer: jest.fn(),
}));

jest.mock('../../src/modules/audio-game.js', () => ({
  clearGameTimer: jest.fn(),
}));

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((key, ...args) => `[${key}] ${args.join(', ')}`),
}));

describe('app-init.js', () => {
  describe('isInitRan / markInitRan', () => {
    it('starts as false, becomes true after markInitRan', () => {
      expect(isInitRan()).toBe(false);
      markInitRan();
      expect(isInitRan()).toBe(true);
    });
  });

  describe('clearAllTimers', () => {
    it('calls clearQuizTimer and clearGameTimer without throwing', () => {
      expect(() => appInit.clearAllTimers()).not.toThrow();
    });
  });

  describe('safeInit', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('calls the function if provided', () => {
      const fn = jest.fn();
      appInit.safeInit(fn, 'testFn');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('logs error when function throws', () => {
      const fn = jest.fn(() => {
        throw new Error('boom');
      });
      appInit.safeInit(fn, 'crashFn');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Init error in crashFn'),
        expect.any(Error),
      );
    });

    it('does not throw when fn throws', () => {
      const fn = () => {
        throw new Error('boom');
      };
      expect(() => appInit.safeInit(fn, 'crashFn')).not.toThrow();
    });

    it('handles fn that is not a function gracefully', () => {
      expect(() => appInit.safeInit(undefined, 'missing')).not.toThrow();
    });
  });

  describe('dismissSplashScreen', () => {
    it('exists and is a function', () => {
      expect(typeof appInit.dismissSplashScreen).toBe('function');
    });
  });
});
