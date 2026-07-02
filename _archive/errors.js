/** Centralized Error Handler */

const ERROR_LEVELS = { INFO: 'info', WARN: 'warn', ERROR: 'error', FATAL: 'fatal' };

const listeners = [];

function onError(callback) {
  listeners.push(callback);
}

function notifyListeners(level, context, error) {
  listeners.forEach(fn => fn(level, context, error));
}

function speakToUser(message) {
  const ariaLive = document.getElementById('aria-live');
  if (ariaLive) ariaLive.textContent = message;
  try {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ar-SA';
    window.speechSynthesis.speak(utterance);
  } catch { /* speech not available */ }
}

function showToast(message, isError = true) {
  const toast = document.getElementById('toast-message');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 z-50 p-4 font-bold rounded-xl shadow-xl text-xl border-2 ${isError ? 'bg-red-600 text-white border-red-800' : 'bg-yellow-400 text-black border-black'} hidden`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 5000);
}

function handleError(context, error) {
  const message = error?.message || String(error);
  const level = error?.fatal ? ERROR_LEVELS.FATAL : ERROR_LEVELS.ERROR;

  console.error(`[${context}] ${message}`, error);
  notifyListeners(level, context, error);

  const userMessages = {
    'api key': 'خطأ في مفتاح API. تأكد من إدخاله في لوحة الإدارة.',
    'network': 'خطأ في الاتصال بالشبكة. تحقق من اتصالك بالإنترنت.',
    'fetch': 'تعذر الاتصال بالخادم. حاول مرة أخرى لاحقاً.',
    'timeout': 'انتهت مهلة الاتصال. حاول مرة أخرى.',
    'permission': 'ليس لديك صلاحية لهذه العملية.',
    'audio': 'حدث خطأ في النظام الصوتي.',
    'firebase': 'خطأ في الاتصال بقاعدة البيانات.',
  };

  let userMessage = 'عذراً، حدث خطأ غير متوقع. حاول مرة أخرى.';
  const lowerMsg = message.toLowerCase();
  for (const [key, msg] of Object.entries(userMessages)) {
    if (lowerMsg.includes(key)) { userMessage = msg; break; }
  }

  showToast(userMessage);

  if (level === ERROR_LEVELS.FATAL) {
    speakToUser(`خطأ حرج: ${userMessage}`);
  } else {
    speakToUser(userMessage);
  }

  return { level, context, message };
}

function wrapAsync(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(context, error);
    }
  };
}

function setupGlobalErrorHandler() {
  window.addEventListener('unhandledrejection', (event) => {
    handleError('unhandledRejection', event.reason);
  });
  window.addEventListener('error', (event) => {
    handleError('unhandledException', event.error || event.message);
  });
  console.info('Global error handler initialized.');
}
