import { localData, getCurrentUserSession, getAccountStorageKey } from './app-state.js';
import { saveLocalData } from './local-data.js';
import { getProxyBase } from './gemini-client.js';
import { contentPath } from './journey-state.js';
import { addPilotHistory } from './pilot-history.js';

window.addEventListener('school-account-changed', () => {
  document.querySelectorAll('[data-content-fields]').forEach((group) => group.remove());
});

function el(tag, text, parent) {
  const n = document.createElement(tag);
  if (text) {
    n.textContent = text;
  }
  if (parent) {
    parent.append(n);
  }
  return n;
}
function btn(text, parent, action) {
  const n = el('button', text, parent);
  n.type = 'button';
  n.className = 'p-3 m-2 border-2 rounded font-bold';
  n.onclick = action;
  return n;
}
export function readContentFields(form) {
  return /** @type {any} */ (
    Object.fromEntries(
      ['subject', 'unitTitle', 'lessonTitle', 'lessonId', 'publicationStatus'].map((name) => [
        name,
        form?.querySelector(`[name=${name}]`)?.value ||
          (name === 'publicationStatus' ? 'published' : ''),
      ]),
    )
  );
}
export function refreshContentViews() {
  renderContentStudio();
  import('./learning-journey.js').then((m) => m.renderLearningJourney()).catch(console.warn);
}
export function renderContentStudio() {
  document.getElementById('content-studio')?.remove();
  const session = getCurrentUserSession();
  if (!['teacher', 'admin'].includes(session?.role)) {
    return;
  }
  for (const id of ['teacher-book-title', 'teacher-quiz-title']) {
    const form = document.getElementById(id)?.closest('form');
    if (!form || form.querySelector('[data-content-fields]')) {
      continue;
    }
    const group = el('fieldset', '', null);
    group.dataset.contentFields = 'true';
    group.className = 'p-3 my-3 border rounded';
    el('legend', 'تنظيم المحتوى', group);
    for (const [name, title] of [
      ['subject', 'المادة'],
      ['unitTitle', 'الوحدة'],
      ['lessonTitle', 'الدرس'],
    ]) {
      const label = el('label', title, group);
      label.className = 'block my-2';
      const input = el('input', '', label);
      input.name = name;
      input.className = 'block w-full p-2 border rounded';
      input.maxLength = 200;
    }
    if (id === 'teacher-quiz-title') {
      const label = el('label', 'الدرس المرتبط (اختياري)', group);
      const input = el('select', '', label);
      input.name = 'lessonId';
      input.className = 'block w-full p-2 border rounded';
    }
    const label = el('label', 'الحالة', group);
    const select = el('select', '', label);
    select.name = 'publicationStatus';
    select.className = 'block p-2 border rounded';
    for (const [value, text] of [
      ['draft', 'مسودة، لا تظهر للطالب'],
      ['published', 'نشر للطلاب في الفصل'],
    ]) {
      const option = el('option', text, select);
      option.value = value;
    }
    const preview = el('div', '', group);
    preview.setAttribute('role', 'status');
    btn('معاينة قبل الحفظ', group, () => {
      const data = readContentFields(form);
      const content = /** @type {HTMLInputElement} */ (
        document.getElementById(
          id === 'teacher-book-title'
            ? 'teacher-book-content'
            : /** @type {HTMLSelectElement} */ (document.getElementById('teacher-quiz-type'))
                  .value === 'mcq'
              ? 'teacher-quiz-q'
              : 'teacher-quiz-text-q',
        )
      ).value;
      preview.textContent = `معاينة خاصة بالمدرس: ${contentPath(data)}. ${/** @type {HTMLInputElement} */ (document.getElementById(id)).value}. ${content}. الحالة: ${data.publicationStatus === 'draft' ? 'مسودة' : 'للنشر'}`;
    });
    form.prepend(group);
  }
  const lessonSelect = document.querySelector('select[name=lessonId]');
  if (lessonSelect) {
    const selected = /** @type {HTMLSelectElement} */ (lessonSelect).value;
    lessonSelect.replaceChildren();
    const empty = el('option', 'بلا درس مرتبط', lessonSelect);
    empty.value = '';
    for (const book of localData.books) {
      const option = el('option', `${contentPath(book)}: ${book.title}`, lessonSelect);
      option.value = book.id;
    }
    /** @type {HTMLSelectElement} */ (lessonSelect).value = selected;
  }
  const view = document.getElementById(`view-${session.role}`);
  if (!view) {
    return;
  }
  const section = el('section', '', view);
  section.id = 'content-studio';
  section.className = 'card p-6 my-4 border-2 rounded';
  el('h2', 'تنظيم الدروس والواجبات', section).className = 'text-2xl font-bold';
  el(
    'p',
    'المسودة لا تظهر للطالب أو ولي الأمر. النشر والتعديل على الخادم يحتاجان اتصالا وصلاحية الفصل. معرف الدرس يستخدم لربط الواجب.',
    section,
  );
  const owner = getAccountStorageKey();
  for (const [key, collection, label] of [
    ['books', 'curriculum_modules', 'درس'],
    ['assignments', 'assignments', 'واجب'],
  ]) {
    const ordered = [...localData[key]].sort((a, b) =>
      contentPath(a).localeCompare(contentPath(b), 'ar'),
    );
    let previousPath = null;
    for (const item of ordered) {
      const path = contentPath(item);
      if (path !== previousPath) {
        el('h3', path, section).className = 'text-xl font-bold my-4';
        previousPath = path;
      }
      const card = el('article', '', section);
      card.className = 'p-3 my-3 border rounded';
      el('h3', `${label}: ${item.title}`, card);
      el('p', contentPath(item), card);
      el('p', `المعرف: ${item.id}`, card);
      const status = el(
        'p',
        item.publicationStatus === 'draft' ? 'مسودة خاصة' : 'منشور للفصل',
        card,
      );
      status.setAttribute('role', 'status');
      btn('معاينة', card, () => {
        const box = el('div', '', card);
        el('p', item.content || item.question || '', box);
        if (item.options) {
          for (const [key, value] of Object.entries(item.options)) {
            el('p', `${key}: ${value}`, box);
          }
        }
        btn('إغلاق المعاينة', box, () => box.remove());
      });
      const publish = btn(
        item.publicationStatus === 'draft' ? 'نشر للفصل' : 'إرجاع لمسودة',
        card,
        async () => {
          if (getAccountStorageKey() !== owner) {
            return;
          }
          publish.disabled = true;
          const publicationStatus = item.publicationStatus === 'draft' ? 'published' : 'draft';
          try {
            if (session.serverAuth) {
              const response = await fetch(
                `${getProxyBase()}/api/data/${collection}/${encodeURIComponent(item.id)}`,
                {
                  method: 'PUT',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ publicationStatus }),
                },
              );
              if (!response.ok) {
                throw Error('لم يحفظ تغيير النشر. تحقق من الاتصال وصلاحية الفصل.');
              }
              await response.json();
            }
            if (getAccountStorageKey() !== owner) {
              return;
            }
            item.publicationStatus = publicationStatus;
            saveLocalData();
            renderContentStudio();
          } catch (error) {
            if (getAccountStorageKey() === owner) {
              status.textContent = error.message;
            }
          } finally {
            publish.disabled = false;
          }
        },
      );
    }
  }
  if (!session.serverAuth) {
    btn('أضف درسي التاريخ التجريبيين كمسودة خاصة', section, () => {
      if (addPilotHistory(localData)) {
        saveLocalData();
        renderContentStudio();
      }
    });
    btn('أضف مثالا تجريبيا للدراسات الاجتماعية', section, () => {
      if (localData.books.some((b) => b.id === 'social-demo-lesson')) {
        return;
      }
      localData.books.push({
        id: 'social-demo-lesson',
        title: 'المكان من حولنا (مثال تجريبي)',
        subject: 'دراسات اجتماعية تجريبية',
        unitTitle: 'فهم المكان',
        lessonTitle: 'وصف الطريق',
        content:
          'هذا مثال لا يتبع صفا أو منهجا رسميا.\nعند وصف طريق نستخدم نقطة بداية وعلامة واضحة وترتيب الخطوات.\nتدرب بوصف طريق قصير داخل مكان مألوف، ولا تجرب طريقا خارجيا دون مساعدة مناسبة.',
        audio: '',
        publicationStatus: 'published',
      });
      localData.assignments.push({
        id: 'social-demo-task',
        lessonId: 'social-demo-lesson',
        title: 'صف طريقا مألوفا (تجريبي)',
        type: 'text',
        question: 'اكتب وصفا قصيرا لطريق داخل مكان مألوف، مع نقطة بداية وعلامة واضحة.',
        subject: 'دراسات اجتماعية تجريبية',
        unitTitle: 'فهم المكان',
        lessonTitle: 'وصف الطريق',
        publicationStatus: 'published',
      });
      saveLocalData();
      renderContentStudio();
    });
  }
}
