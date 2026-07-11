if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js').then(function(reg) {
            console.log('[SW] registered, scope:', reg.scope);
        }, function(err) {
            console.warn('[SW] registration failed:', err);
        });
    });
}

(function() {
    var tries = 0;
    function tryInit() {
        if (typeof runInit === 'function' && !window.INIT_RAN) {
            try { runInit(); console.log('[CS] fallback runInit OK'); } catch(e) { console.error('[CS] fallback error:', e); }
        } else if (tries++ < 8) {
            setTimeout(tryInit, 500);
        } else {
            console.warn('[CS] fallback: runInit not found');
        }
    }
    if (document.readyState === 'complete') { setTimeout(tryInit, 100); }
    else { window.addEventListener('load', function() { setTimeout(tryInit, 100); }); }
})();
