if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js');
  });
}

(function () {
  let tries = 0;
  function tryInit() {
    if (typeof runInit === 'function' && !window.INIT_RAN) {
      try {
        runInit();
      } catch (e) {
        window.__csErrors = window.__csErrors || [];
        window.__csErrors.push(`[CS] fallback error: ${e && e.message ? e.message : e}`);
      }
    } else if (tries++ < 8) {
      setTimeout(tryInit, 500);
    }
  }
  if (document.readyState === 'complete') {
    setTimeout(tryInit, 100);
  } else {
    window.addEventListener('load', function () {
      setTimeout(tryInit, 100);
    });
  }
})();
