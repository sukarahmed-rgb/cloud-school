/** i18n module - الترجمة */

export const i18n = {};
let currentLang = localStorage.getItem('cloudSchoolLang') || 'ar';

export function getCurrentLang() {
  return currentLang;
}

export function setCurrentLang(lang) {
  currentLang = lang;
  localStorage.setItem('cloudSchoolLang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[key]) {
      el.textContent = i18n[key];
    }
  });
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
  const langToggleBtn = document.getElementById('lang-toggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const newLang = currentLang === 'ar' ? 'en' : 'ar';
      setCurrentLang(newLang);
      loadLocale(newLang);
      langToggleBtn.textContent = newLang === 'ar' ? 'English' : 'العربية';
    });
    langToggleBtn.textContent = currentLang === 'ar' ? 'English' : 'العربية';
  }
}
