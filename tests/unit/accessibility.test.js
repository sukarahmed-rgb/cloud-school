import * as accessibility from '../../src/modules/accessibility.js';

describe('accessibility.js', () => {
  describe('getAgeTone', () => {
    it('returns child-like tone for auto mode with age < 12', () => {
      window.currentUserSession = { age: 8 };
      const result = accessibility.getAgeTone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });

    it('returns teen tone for auto mode with age between 12 and 18', () => {
      window.currentUserSession = { age: 15 };
      const result = accessibility.getAgeTone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });

    it('returns adult tone for auto mode with age >= 18', () => {
      window.currentUserSession = { age: 25 };
      const result = accessibility.getAgeTone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });

    it('defaults to age 14 when no user session', () => {
      window.currentUserSession = null;
      const result = accessibility.getAgeTone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('cycleTheme', () => {
    beforeEach(() => {
      localStorage.removeItem('cloudSchoolTheme');
      document.documentElement.removeAttribute('data-theme');
      window.speak = jest.fn();
      window.__ = jest.fn((key) => key);
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
      window.speak = jest.fn();
      document.documentElement.style.removeProperty('--base-text-size');
      Object.defineProperty(window, 'STORAGE_KEYS', {
        value: { sizeOffset: 'cloudSchoolSizeOffset' },
        configurable: true,
      });
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
