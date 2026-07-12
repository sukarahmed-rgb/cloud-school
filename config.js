var __app_id = 'cloud-school-blind-v1';
var __firebase_config = {
    apiKey: "AIzaSyCB-560lR7KyRyD9TYShxdJbkoP8rELBuw",
    authDomain: "cloud-school-6251a.firebaseapp.com",
    projectId: "cloud-school-6251a",
    storageBucket: "cloud-school-6251a.firebasestorage.app",
    messagingSenderId: "87142350368",
    appId: "1:87142350368:web:0949d5cfa3bbd852904645",
    measurementId: "G-V7CZJK62S6"
};
var __initial_auth_token = null;
// Backend API URL — Cloudflare Worker
var __server_base = 'https://cloud-school-api.cloud-school-subdomain.workers.dev';

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
