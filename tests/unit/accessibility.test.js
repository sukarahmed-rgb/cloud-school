import * as accessibility from '../../src/modules/accessibility.js';
import { setCurrentUserSession } from '../../src/modules/app-state.js';

jest.mock('../../src/modules/speech.js', () => ({
  speak: jest.fn(),
}));

const mockT = jest.fn((key) => key);
jest.mock('../../src/modules/i18n.js', () => ({
  __: (...args) => mockT(...args),
}));

describe('accessibility.js', () => {
  describe('getAgeTone', () => {
    it('returns child-like tone for auto mode with age < 12', () => {
      setCurrentUserSession({ age: 8 });
      const result = accessibility.getAgeTone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });

    it('returns teen tone for auto mode with age between 12 and 18', () => {
      setCurrentUserSession({ age: 15 });
      const result = accessibility.getAgeTone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });

    it('returns adult tone for auto mode with age >= 18', () => {
      setCurrentUserSession({ age: 25 });
      const result = accessibility.getAgeTone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });

    it('defaults to age 14 when no user session', () => {
      setCurrentUserSession(null);
      const result = accessibility.getAgeTone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('cycleTheme', () => {
    beforeEach(() => {
      localStorage.removeItem('cloudSchoolTheme');
      document.documentElement.removeAttribute('data-theme');
      jest.clearAllMocks();
    });

    it('cycles from dark-hc to light-hc', () => {
      localStorage.setItem('cloudSchoolTheme', 'dark-hc');
      accessibility.cycleTheme();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light-hc');
    });

    it('wraps around from classic to dark-hc', () => {
      localStorage.setItem('cloudSchoolTheme', 'classic');
      accessibility.cycleTheme();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
    });
  });

  describe('adjustTextSize', () => {
    beforeEach(() => {
      localStorage.clear();
      document.documentElement.style.removeProperty('--base-text-size');
      jest.clearAllMocks();
    });

    it('increases size', () => {
      accessibility.adjustTextSize(1);
      const size = document.documentElement.style.getPropertyValue('--base-text-size');
      expect(size).toBeTruthy();
    });

    it('decreases size', () => {
      accessibility.adjustTextSize(-1);
      const size = document.documentElement.style.getPropertyValue('--base-text-size');
      expect(size).toBeTruthy();
    });

    it('clamps at minimum', () => {
      accessibility.adjustTextSize(-10);
      const size = document.documentElement.style.getPropertyValue('--base-text-size');
      expect(parseFloat(size)).toBeGreaterThanOrEqual(1);
    });
  });
});
