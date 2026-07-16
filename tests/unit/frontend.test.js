/**
 * Unit tests for frontend utility functions
 */

function escapeHtml(str) {
  if (!str && str !== 0) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function secureRandomInt(min, max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return min + (array[0] % (max - min + 1));
}

const i18n = {};

function __(key, ...args) {
  let val = i18n[key];
  if (!val) {
    return key;
  }
  if (args.length) {
    args.forEach((arg, i) => {
      val = val.replace(`{${i}}`, arg);
    });
  }
  return val;
}

function getPrompt(lang, arabicText, englishText) {
  return lang === 'en' ? englishText : arabicText;
}

describe('escapeHtml', () => {
  test('escapes HTML special chars', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&lt;/script&gt;');
    expect(result).not.toContain('<script>');
  });
  test('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
  test('converts numbers to string', () => {
    expect(escapeHtml(42)).toBe('42');
  });
  test('handles ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });
});

describe('secureRandomInt', () => {
  test('returns number within range', () => {
    for (let i = 0; i < 100; i++) {
      const val = secureRandomInt(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    }
  });
  test('returns different values (not constant)', () => {
    const results = new Set(Array.from({ length: 20 }, () => secureRandomInt(1, 100)));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('i18n __()', () => {
  beforeEach(() => {
    i18n.hello = 'مرحبا';
    i18n.welcome = 'أهلا بك يا {0}';
    i18n.score = 'الدرجة: {0} من {1}';
  });

  test('returns translation for existing key', () => {
    expect(__('hello')).toBe('مرحبا');
  });

  test('returns key itself for missing key', () => {
    expect(__('nonexistent')).toBe('nonexistent');
  });

  test('substitutes positional args', () => {
    expect(__('welcome', 'أحمد')).toBe('أهلا بك يا أحمد');
  });

  test('substitutes multiple args', () => {
    expect(__('score', 85, 100)).toBe('الدرجة: 85 من 100');
  });

  test('empty args does not affect output', () => {
    expect(__('hello')).toBe('مرحبا');
  });
});

describe('getPrompt', () => {
  test('returns Arabic text for Arabic lang', () => {
    expect(getPrompt('ar', 'نص عربي', 'English text')).toBe('نص عربي');
  });
  test('returns English text for English lang', () => {
    expect(getPrompt('en', 'نص عربي', 'English text')).toBe('English text');
  });
  test('falls back to Arabic for unknown lang', () => {
    expect(getPrompt('fr', 'نص عربي', 'English text')).toBe('نص عربي');
  });
});
