var __app_id = 'cloud-school-blind-v1';
var __firebase_config = {};
var __initial_auth_token = null;

window.__csErrors = [];
window.onerror = function(msg, url, line) {
    var text = 'خطأ: ' + msg;
    window.__csErrors.push(text);
    try {
        var utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ar-SA';
        window.speechSynthesis.speak(utter);
    } catch(e) {}
    console.error('[CS early error]', msg, url, line);
};
window.addEventListener('unhandledrejection', function(e) {
    var text = 'خطأ في الخلفية: ' + (e.reason && e.reason.message ? e.reason.message : 'غير معروف');
    window.__csErrors.push(text);
    try {
        var utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ar-SA';
        window.speechSynthesis.speak(utter);
    } catch(e) {}
    console.error('[CS early rejection]', e.reason);
});
