import { localData, getCurrentUserSession, getAccountStorageKey } from './app-state.js';
import {
  contentPath,
  readJourney,
  markLesson,
  isPublished,
  saveAnswerDraft,
} from './journey-state.js';
import { hasConfirmedGrade } from './analytics.js';
import { speak } from './speech.js';

function node(tag, text, parent) {
  const el = document.createElement(tag);
  if (text) {
    el.textContent = text;
  }
  if (parent) {
    parent.append(el);
  }
  return el;
}
function button(text, parent, action) {
  const el = node('button', text, parent);
  el.type = 'button';
  el.className = 'p-3 m-2 border-2 rounded font-bold';
  el.addEventListener('click', action);
  return el;
}
export function renderLearningJourney() {
  document.getElementById('learning-journey')?.remove();
  if (getCurrentUserSession()?.role !== 'student') {
    return;
  }
  const view = document.getElementById('view-student');
  if (!view) {
    return;
  }
  const section = node('section', '', null);
  section.id = 'learning-journey';
  section.className = 'card p-6 my-4 rounded-xl border-2';
  section.setAttribute('aria-labelledby', 'journey-heading');
  const heading = node('h2', 'خطوتي التالية', section);
  heading.id = 'journey-heading';
  heading.tabIndex = -1;
  heading.className = 'text-2xl font-bold';
  const state = readJourney();
  const books = localData.books.filter(isPublished);
  const next =
    books.find((b) => b.id === state.lastLesson && !state.lessons[b.id]?.completed) ||
    books.find((b) => !state.lessons[b.id]?.completed);
  if (next) {
    node('p', contentPath(next), section);
    node('p', next.title, section);
    button(state.lessons[next.id] ? 'أكمل الدرس' : 'ابدأ الدرس', section, () =>
      openLesson(next.id),
    );
  } else {
    node(
      'p',
      books.length
        ? 'أنهيت الدروس المتاحة. راجع واجباتك أو استمع مرة أخرى.'
        : 'لم يضف المدرس دروسا بعد.',
      section,
    );
  }
  const drafts = Object.keys(state.drafts).filter(
    (id) =>
      localData.assignments.some((a) => a.id === id && isPublished(a)) &&
      !localData.submissions.some(
        (s) => s.quizId === id && (hasConfirmedGrade(s) || s.syncStatus === 'sent'),
      ),
  );
  if (drafts.length) {
    node('p', `لديك ${drafts.length} إجابة محفوظة على هذا الجهاز ولم تسلم بعد.`, section);
  }
  const assignments = localData.assignments.filter(isPublished);
  const todo = assignments.find(
    (a) => !localData.submissions.some((s) => s.quizId === a.id && s.syncStatus !== 'failed'),
  );
  if (todo) {
    button(`واجب: ${todo.title}${state.drafts[todo.id] ? ' (مسودة محفوظة)' : ''}`, section, () =>
      launchAssignment(todo.id),
    );
  }
  const results = node('div', '', section);
  results.id = 'journey-results';
  node('h3', 'التسليم وملاحظات المدرس', results).className = 'text-xl font-bold my-3';
  if (!localData.submissions.length) {node('p', 'لا توجد إجابات مسلمة بعد.', results);}
  for (const sub of localData.submissions.slice(0, 8)) {
    const article = node('article', '', results);
    article.className = 'p-3 my-2 border rounded';
    node('h4', sub.quizTitle || 'واجب', article);
    const status = hasConfirmedGrade(sub)
      ? `الدرجة المؤكدة: ${sub.initialScore}%`
      : sub.syncStatus === 'failed'
        ? 'لم يتم التسليم. احتفظ بإجابتك وحاول مجددا.'
        : sub.syncStatus === 'pending'
          ? 'محفوظة على الجهاز، تنتظر الإرسال. ليست مسلمة بعد.'
          : 'تم التسليم، بانتظار التصحيح.';
    node('p', status, article);
    if (hasConfirmedGrade(sub) && sub.graderFeedback) {
      node('p', `ملاحظات المدرس: ${sub.graderFeedback}`, article);
    }
    if (sub.syncStatus === 'failed') {
      button('راجع الإجابة وحاول مرة أخرى', article, () => {
        saveAnswerDraft(sub.quizId, sub.studentAnswer);
        launchAssignment(sub.quizId);
      });
    }
  }
  view.prepend(section);
}
export async function launchAssignment(id) {
  const { openStudentSection } = await import('./router.js');
  const { startQuiz } = await import('./quizzes.js');
  openStudentSection('assignments');
  startQuiz(id);
}
export function openLesson(id) {
  const book = localData.books.find((b) => b.id === id && isPublished(b));
  if (!book) {
    return;
  }
  const owner = getAccountStorageKey();
  document.getElementById('journey-reader')?.remove();
  const section = node(
    'section',
    '',
    document.getElementById('learning-journey') || document.getElementById('view-student'),
  );
  section.id = 'journey-reader';
  section.className = 'p-4 my-4 border-2 rounded';
  node('p', contentPath(book), section);
  const heading = node('h3', book.title, section);
  heading.tabIndex = -1;
  heading.className = 'text-xl font-bold';
  const paragraphs = (book.content || '').split(/\n+/).filter(Boolean);
  if (!paragraphs.length) {
    paragraphs.push('لا يوجد نص لهذا الدرس.');
  }
  let index = Math.min(
    Math.max(0, readJourney().lessons[id]?.paragraph || 0),
    paragraphs.length - 1,
  );
  const progress = node('p', '', section);
  progress.setAttribute('role', 'status');
  const text = node('p', '', section);
  text.className = 'my-4';
  function show() {
    if (getAccountStorageKey() !== owner) {
      return;
    }
    text.textContent = paragraphs[index];
    progress.textContent = `جزء ${index + 1} من ${paragraphs.length}`;
    markLesson(id, { paragraph: index });
  }
  button('الجزء السابق', section, () => {
    index = Math.max(0, index - 1);
    show();
  });
  button('استمع إلى الجزء', section, () => speak(paragraphs[index]));
  button('الجزء التالي', section, () => {
    index = Math.min(paragraphs.length - 1, index + 1);
    show();
  });
  let audioUrl;
  try {
    const url = new URL(book.audio);
    if (url.protocol === 'https:') {
      audioUrl = url.href;
    }
  } catch {
    /* no audio */
  }
  if (audioUrl) {
    const label = node('p', 'تسجيل الدرس. موضع الاستماع محفوظ على هذا الجهاز.', section);
    label.id = 'journey-audio-label';
    const audio = node('audio', '', section);
    audio.controls = true;
    audio.preload = 'none';
    audio.src = audioUrl;
    audio.setAttribute('aria-labelledby', label.id);
    audio.addEventListener('loadedmetadata', () => {
      if (getAccountStorageKey() !== owner) {
        return;
      }
      audio.currentTime = Math.min(readJourney().lessons[id]?.audioTime || 0, audio.duration || 0);
    });
    let lastAudioSave = 0;
    audio.addEventListener('timeupdate', () => {
      if (getAccountStorageKey() === owner && Date.now() - lastAudioSave > 2000) {
        markLesson(id, { audioTime: audio.currentTime });
        lastAudioSave = Date.now();
      }
    });
    audio.addEventListener('pause', () => {
      if (getAccountStorageKey() === owner) {
        markLesson(id, { audioTime: audio.currentTime });
      }
    });
    audio.addEventListener('error', () => {
      label.textContent = 'تعذر تشغيل التسجيل. يمكنك قراءة النص أو الاستماع إليه بالصوت الآلي.';
    });
  }
  button('أنهيت قراءة الدرس', section, () => {
    if (getAccountStorageKey() !== owner) {
      return;
    }
    markLesson(id, { completed: true });
    renderLearningJourney();
    document.getElementById('journey-heading')?.focus();
  });
  for (const a of localData.assignments.filter((a) => a.lessonId === id && isPublished(a))) {
    button(`تدرب: ${a.title}`, section, () => launchAssignment(a.id));
  }
  show();
  heading.focus();
}
