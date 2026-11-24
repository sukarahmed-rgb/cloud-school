// Minimal accessible administrator/guardian controls for the enforced access model.
import { getCurrentUserSession } from './app-state.js';
import { getProxyBase } from './gemini-client.js';
import { showToast } from './dom-utils.js';

async function api(path, body) {
  const response = await fetch(`${getProxyBase()}/api/access/${path}`, {
    credentials: 'include',
    ...(body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  const value = await response.json();
  if (!response.ok) {
    throw new Error(value.error || 'تعذر تنفيذ الطلب');
  }
  return value;
}
function field(form, label, name, type = 'text') {
  const wrapper = document.createElement('label');
  wrapper.className = 'block my-3 font-bold';
  wrapper.textContent = label;
  const input = document.createElement('input');
  input.name = name;
  input.type = type;
  input.required = true;
  input.className = 'block w-full p-3 rounded';
  wrapper.append(input);
  form.append(wrapper);
  return input;
}
function select(form, label, name, choices) {
  const wrapper = document.createElement('label');
  wrapper.className = 'block my-3 font-bold';
  wrapper.textContent = label;
  const input = document.createElement('select');
  input.name = name;
  input.required = true;
  input.className = 'block w-full p-3 rounded';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'اختر';
  input.append(blank);
  for (const [value, text] of choices) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    input.append(option);
  }
  wrapper.append(input);
  form.append(wrapper);
}
function action(container, title, build, submit) {
  const form = document.createElement('form');
  form.className = 'card p-4 my-4 border-2 rounded-xl';
  const heading = document.createElement('h3');
  heading.textContent = title;
  form.append(heading);
  build(form);
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'p-3 rounded font-bold my-3';
  button.textContent = title;
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  form.append(button, status);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const result = await submit(data);
      status.textContent = result?.token
        ? `رمز دعوة ولي الأمر، صالح ٧ أيام: ${result.token}`
        : 'تم حفظ التغيير بنجاح';
      showToast('تم حفظ التغيير');
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  container.append(form);
}
export async function refreshAccessControls() {
  const session = getCurrentUserSession();
  document.getElementById('school-access-controls')?.remove();
  if (!session?.serverAuth) {
    return;
  }
  const container = document.createElement('section');
  container.id = 'school-access-controls';
  container.className = 'card p-6 my-4';
  const heading = document.createElement('h2');
  heading.textContent = 'إدارة الفصول والصلاحيات';
  container.append(heading);
  const view = document.getElementById(`view-${session.role}`);
  if (!view) {
    return;
  }
  view.append(container);
  try {
    const status = await api('status');
    if (getCurrentUserSession() !== session) {
      container.remove();
      return;
    }
    if (session.role === 'teacher') {
      const text = document.createElement('p');
      text.setAttribute('role', 'status');
      text.textContent = status.teacherApproved
        ? 'الحساب معتمد. المحتوى والطلاب متاحون في فصولك فقط.'
        : 'حسابك بانتظار موافقة الإدارة. لا توجد صلاحية لبيانات الطلاب حتى الاعتماد وتعيين فصل.';
      container.append(text);
    }
    if (['teacher', 'admin'].includes(session.role)) {
      const classes = session.role === 'admin' ? (await api('directory')).classes : status.classes;
      for (const id of ['teacher-book-title', 'teacher-quiz-title']) {
        const form = document.getElementById(id)?.closest('form');
        if (form) {
          form.querySelector('[data-class-field]')?.remove();
          const group = document.createElement('div');
          group.dataset.classField = 'true';
          select(
            group,
            'الفصل',
            'classId',
            classes.map((c) => [c.id, c.name]),
          );
          form.prepend(group);
        }
      }
    }
    if (session.role === 'parent') {
      action(
        container,
        'قبول دعوة ربط الطالب',
        (form) => field(form, 'رمز الدعوة من إدارة المدرسة', 'token'),
        (data) => api('accept-guardian', data),
      );
      return;
    }
    if (session.role !== 'admin') {
      return;
    }
    const directory = await api('directory');
    if (getCurrentUserSession() !== session) {
      container.remove();
      return;
    }
    const users = directory.users;
    const choices = (role) =>
      users.filter((u) => u.role === role).map((u) => [u.id, `${u.name || u.email} (${u.email})`]);
    action(
      container,
      'إنشاء فصل',
      (form) => field(form, 'اسم الفصل', 'name'),
      (data) => api('classes', data),
    );
    action(
      container,
      'اعتماد أو إيقاف مدرس',
      (form) => {
        select(form, 'المدرس', 'userId', choices('teacher'));
        select(form, 'الحالة', 'approved', [
          ['true', 'اعتماد'],
          ['false', 'إيقاف'],
        ]);
      },
      (data) => api('approve-teacher', { ...data, approved: data.approved === 'true' }),
    );
    action(
      container,
      'تعيين أو إزالة عضو فصل',
      (form) => {
        select(
          form,
          'الفصل',
          'classId',
          directory.classes.map((c) => [c.id, c.name]),
        );
        select(
          form,
          'الطالب أو المدرس',
          'userId',
          users
            .filter((u) => ['student', 'teacher'].includes(u.role))
            .map((u) => [u.id, `${u.name || u.email} (${u.role})`]),
        );
        select(form, 'الإجراء', 'remove', [
          ['false', 'إضافة'],
          ['true', 'إزالة'],
        ]);
      },
      (data) => api('memberships', { ...data, remove: data.remove === 'true' }),
    );
    action(
      container,
      'إنشاء دعوة ولي أمر',
      (form) => {
        select(form, 'الطالب', 'studentId', choices('student'));
        field(form, 'بريد ولي الأمر المسجل', 'parentEmail', 'email');
      },
      (data) => api('invite-guardian', data),
    );
    action(
      container,
      'إلغاء ربط ولي أمر',
      (form) => {
        select(form, 'الطالب', 'studentId', choices('student'));
        select(form, 'ولي الأمر', 'parentId', choices('parent'));
      },
      (data) => api('revoke-guardian', data),
    );
    action(
      container,
      'تعيين محتوى قديم لفصل',
      (form) => {
        select(form, 'نوع السجل', 'collection', [
          ['curriculum_modules', 'درس'],
          ['assignments', 'واجب'],
          ['students', 'سجل طالب'],
          ['notifications', 'إشعار'],
        ]);
        field(form, 'معرف السجل، من بيانات الإدارة', 'recordId');
        select(
          form,
          'الفصل',
          'classId',
          directory.classes.map((c) => [c.id, c.name]),
        );
      },
      (data) => api('assign-record', data),
    );
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'تحديث قائمة الفصول والحسابات';
    refresh.className = 'p-3 rounded';
    refresh.addEventListener('click', () => refreshAccessControls());
    container.append(refresh);
  } catch (error) {
    const text = document.createElement('p');
    text.setAttribute('role', 'alert');
    text.textContent = error.message;
    container.append(text);
  }
}
