import {
  i18n,
  currentLang,
  getCurrentLang,
  setCurrentLang,
  __,
  getPrompt,
  applyTranslations,
  applyJsTranslations,
  initTtsLang,
  loadLocale,
  initI18n,
} from '../../src/modules/i18n.js';

describe('i18n.js', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    window.__ = jest.fn((k) => k);
  });

  test('getCurrentLang returns currentLang', () => {
    const lang = getCurrentLang();
    expect(typeof lang).toBe('string');
  });

  test('setCurrentLang updates currentLang and localStorage', () => {
    document.body.innerHTML = '<div id="lang-toggle"></div>';
    setCurrentLang('en');
    expect(getCurrentLang()).toBe('en');
    expect(localStorage.getItem('cloudSchoolLang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  test('setCurrentLang sets rtl for Arabic', () => {
    document.body.innerHTML = '<div id="lang-toggle"></div>';
    setCurrentLang('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  test('__ returns translation for existing key', () => {
    i18n.greeting = 'مرحبا';
    expect(__('greeting')).toBe('مرحبا');
  });

  test('__ returns key itself for missing key', () => {
    expect(__('nonexistent')).toBe('nonexistent');
  });

  test('__ substitutes positional args', () => {
    i18n.welcome = 'أهلا {0}';
    expect(__('welcome', 'سارة')).toBe('أهلا سارة');
  });

  test('__ substitutes multiple args', () => {
    i18n.score = '{0} من {1}';
    expect(__('score', '5', '10')).toBe('5 من 10');
  });

  test('getPrompt returns Arabic text for Arabic lang', () => {
    expect(getPrompt('ar', 'نص عربي', 'English text')).toBe('نص عربي');
  });

  test('getPrompt returns English text for English lang', () => {
    expect(getPrompt('en', 'نص عربي', 'English text')).toBe('English text');
  });

  test('applyTranslations translates data-i18n elements', () => {
    document.body.innerHTML = '<span data-i18n="hello">original</span>';
    i18n.hello = 'مرحبا';
    applyTranslations();
    expect(document.querySelector('[data-i18n="hello"]').textContent).toBe('مرحبا');
  });

  test('applyTranslations handles data-i18n-placeholder', () => {
    document.body.innerHTML = '<input data-i18n-placeholder="search" placeholder="old" />';
    i18n.search = 'بحث';
    applyTranslations();
    expect(document.querySelector('[data-i18n-placeholder]').placeholder).toBe('بحث');
  });

  test('applyTranslations handles data-i18n-title', () => {
    document.body.innerHTML = '<div data-i18n-title="tooltip">text</div>';
    i18n.tooltip = 'تلميح';
    applyTranslations();
    expect(document.querySelector('[data-i18n-title]').title).toBe('تلميح');
  });

  test('applyTranslations handles data-i18n-aria', () => {
    document.body.innerHTML = '<button data-i18n-aria="closeBtn">X</button>';
    i18n.closeBtn = 'إغلاق';
    applyTranslations();
    expect(document.querySelector('[data-i18n-aria]').getAttribute('aria-label')).toBe('إغلاق');
  });

  test('initTtsLang sets window.__speechLang', () => {
    initTtsLang();
    expect(window.__speechLang).toBeTruthy();
  });

  test('loadLocale fetches and applies locale data', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'مرحبا' }),
    });
    await loadLocale('ar');
    expect(i18n.hello).toBe('مرحبا');
  });

  test('loadLocale handles fetch failure', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    await expect(loadLocale('fr')).resolves.toBeUndefined();
  });

  test('initI18n calls loadLocale', () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    expect(() => initI18n()).not.toThrow();
  });
});

describe('applyJsTranslations', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="btn-age-level"></div>';
  });

  test('updates age level button when element exists', () => {
    window.ageLevelLabels = ['تلقائي', 'طفل', 'مراهق', 'بالغ'];
    applyJsTranslations();
    const btn = document.getElementById('btn-age-level');
    expect(btn).toBeTruthy();
  });
});
