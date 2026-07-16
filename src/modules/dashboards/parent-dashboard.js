// Parent Dashboard Module - لوحة قيادة ولي الأمر (Lazy loaded)

export function renderParentDashboard() {
  const currentUserSession = window.currentUserSession;
  const localData = window.localData;
  const __ = window.__;
  const escapeHtml = window.escapeHtml;

  const list = document.getElementById('parent-grades-list');
  list.innerHTML = '';

  const linkedContact = currentUserSession?.childContact || '0555555555';
  const childSubmissions = localData.submissions.filter(
    (s) => s.studentContact === linkedContact || s.parentContact === currentUserSession?.contact,
  );

  const childName =
    childSubmissions.length > 0 ? childSubmissions[0].studentName : __('fallbackLinkedChild');
  document.getElementById('parent-linked-child-name').textContent = childName;

  if (childSubmissions.length === 0) {
    list.innerHTML = `<p class="p-4 text-center text-yellow-400">${escapeHtml(__('parentNoGrades', childName))}</p>`;
    return;
  }

  childSubmissions.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'p-4 border-2 border-current rounded-xl flex justify-between items-center';
    item.innerHTML = `
            <div>
                <h4 class="font-bold text-xl">${escapeHtml(s.quizTitle)}</h4>
                <p class="text-xs text-gray-300">${escapeHtml(__('solveTime'))}: ${escapeHtml(s.timestamp)}</p>
            </div>
            <span class="text-2xl font-black text-yellow-400">${escapeHtml(String(s.initialScore))} / 100</span>
        `;
    list.appendChild(item);
  });

  // Render notifications
  const notifList = document.getElementById('parent-notifications-list');
  if (!notifList) {
    return;
  }
  const myNotifs = (localData.notifications || []).filter(function (n) {
    return n.type === 'submission' || n.type === 'achievement';
  });
  if (myNotifs.length === 0) {
    notifList.innerHTML = `<p class="text-gray-400">${__('notifEmpty')}</p>`;
  } else {
    notifList.innerHTML = myNotifs
      .slice(0, 20)
      .map(function (n) {
        const bg = n.read ? 'bg-slate-800' : 'bg-slate-700 border-r-2 border-yellow-400';
        return (
          `<div class="p-2 rounded-lg ${bg}">` +
          `<p class="font-bold text-xs text-yellow-300">${escapeHtml(n.title)}</p>` +
          `<p class="text-gray-300 text-[10px]">${escapeHtml(n.details)}</p>` +
          `<p class="text-gray-500 text-[9px]">${escapeHtml(n.time)}</p></div>`
        );
      })
      .join('');
  }
}
