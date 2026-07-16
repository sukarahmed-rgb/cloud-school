/** i18n module - الترجمة */

export const i18n = {};
export let currentLang = localStorage.getItem('cloudSchoolLang') || 'ar';

export function getCurrentLang() {
  return currentLang;
}

export function setCurrentLang(lang) {
  currentLang = lang;
  localStorage.setItem('cloudSchoolLang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  // تحديث نص زر اللغة
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = lang === 'ar' ? __('langEnglish') : __('langArabic');
  // إعادة تطبيق كل الترجمات
  applyTranslations();
  applyJsTranslations();
  // تحديث لغة TTS
  initTtsLang();
  if (typeof window.speak === 'function') {
    window.speak(__('langChanged'));
  }
}

export function __(key, ...args) {
  let val = i18n[key];
  if (!val) return key;
  if (args.length) {
    args.forEach((arg, i) => { val = val.replace(`{${i}}`, arg); });
  }
  return val;
}

export function getPrompt(lang, arabicText, englishText) {
  return lang === 'ar' ? arabicText : englishText;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[key]) el.textContent = i18n[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[key]) el.placeholder = i18n[key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (i18n[key]) el.title = i18n[key];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (i18n[key]) el.setAttribute('aria-label', i18n[key]);
  });
}

export function applyJsTranslations() {
  // تحديث النصوص الديناميكية في الـ JS
  const ageLevelBtn = document.getElementById('btn-age-level');
  if (ageLevelBtn && typeof ageLevelLabels !== 'undefined') {
    const labels = window['ageLevelLabels'] || [__('ageLevelAuto'), __('ageLevelChild'), __('ageLevelTeen'), __('ageLevelAdult')];
    const level = typeof currentAgeLevel !== 'undefined' ? currentAgeLevel : 0;
    ageLevelBtn.textContent = __('ageLevelLabel', labels[level] || labels[0]);
  }
}

export function initTtsLang() {
  const speechLang = currentLang === 'ar' ? 'ar-EG' : 'en-US';
  // تحديث النصوص الصوتية الثابتة (بناءً على اللغة الحالية)
  window.__speechLang = speechLang;
}

export function loadLocale(lang) {
  return fetch(`i18n/${lang}.json`)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to load locale: ${lang}`);
      return r.json();
    })
    .then(data => {
      Object.assign(i18n, data);
      applyTranslations();
    })
    .catch(err => console.error('i18n load error:', err));
}

export function initI18n() {
  loadLocale(currentLang);
}
