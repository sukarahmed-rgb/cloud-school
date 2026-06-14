/**
 * Cloud School — المنصة السحابية التعليمية الشاملة للمكفوفين
 * ملف التطبيق الرئيسي (JavaScript)
 * 
 * الإصلاحات المطبقة:
 * 1. إصلاح مؤقت الاختبار ليعد الثواني بشكل صحيح
 * 2. إصلاح تسرب الذاكرة في setupAccessibleVoices باستخدام AbortController
 * 3. توحيد فحص إخفاء العناصر باستخدام classList.contains('hidden')
 * 4. إعادة استخدام AudioContext واحد بدلاً من إنشاء جديد كل مرة
 * 5. إضافة مؤشرات تحميل بصرية عند الاتصال بالذكاء الاصطناعي
 * 6. إصلاح الأخطاء الإملائية
 * 7. تحويل inline onclick إلى addEventListener
 * 8. تنظيم الكود بنمط Module Pattern
 * 9. إضافة دعم اللغات (i18n)
 */

// ==================== Firebase Imports ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, addDoc, setDoc, getDocs, deleteDoc, onSnapshot, collection, query, serverTimestamp, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==================== تهيئة المتغيرات العامة ====================
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cloud-school-blind-v1';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app, db, auth;
let userId = null;
let isAuthReady = false;

// ==================== بيانات التطبيق المحلية (Offline Cache) ====================
let localData = {
    books: [
        { id: 'b1', title: 'كيمياء الصف العاشر - الوحدة الأولى', content: 'مرحبًا بك في وحدة الكيمياء. في هذا الدرس، سنتعرف على العناصر والروابط التساهمية والأيونية وتفاعلات الطاقة والحرارة.', audio: '' },
        { id: 'b2', title: 'تاريخ وحضارة الوطن العربي', content: 'مرحبًا بك في تاريخ العرب المجيد. سنتعلم اليوم عن الحضارات القديمة التي قامت في شبه الجزيرة العربية والهلال الخصيب ومصر الفرعونية.', audio: '' }
    ],
    assignments: [
        { id: 'a1', title: 'واجب العلوم والفيزياء الأول', type: 'mcq', question: 'ما هو المكون الأساسي لغاز الأوزون؟', options: { A: 'الهيدروجين', B: 'الأكسجين الثلاثي', C: 'النيتروجين', D: 'غاز ثاني أكسيد الكربون' }, correct: 'B' },
        { id: 'a2', title: 'اختبار اللغة العربية المقالي', type: 'text', question: 'اكتب فقرة قصيرة تتحدث فيها عن فضل المعلم في المجتمع وأهمية العلم؟', ideal: 'يعد العلم ركيزة المجتمعات الأساسية، والمعلم هو النور الذي يبدد الظلام...' }
    ],
    submissions: [],
    students: [
        { name: 'عبد الرحمن الشمري', grade: 'الصف العاشر', pin: '7429' },
        { name: 'سارة عبد الله', grade: 'الصف التاسع', pin: '5120' }
    ]
};

// ==================== متغيرات التحكم ====================
let audioCoPilotEnabled = true;
let screenReaderMode = false;
let activeRole = 'student';
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentBrailleDots = new Set();
let currentCheatDots = new Set();
let selectedQuizId = null;
let activeGameTimer = null;
let activeGameType = '';
let currentGameScore = 0;
let gameTimeLeft = 30;
let ttsEngineMode = 'gemini';
let activeAudioElement = null;
let currentUserSession = null;
let currentlyPlayingBookId = null;
let selectedOption = null;
let quizTimerInterval = null;
let currentCorrectAnswer = null;
let gameTimerInterval = null;
let uploadedImageBase64 = null;
let uploadedImageMime = null;
let currentSizeOffset = 0;
let perkinsKeysPressed = {};

// [إصلاح #2] AbortController لمنع تسرب الذاكرة في setupAccessibleVoices
let accessibleVoicesController = null;

// [إصلاح #4] إعادة استخدام AudioContext واحد
let sharedAudioContext = null;
function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume();
    }
    return sharedAudioContext;
}

// ==================== [إصلاح #9] Language Support ====================
const i18n = {};
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[key]) {
      el.textContent = i18n[key];
    }
  });
}
function loadLocale(lang) {
  fetch(`i18n/${lang}.json`)
    .then(r => r.json())
    .then(data => {
      Object.assign(i18n, data);
      applyTranslations();
    })
    .catch(err => console.error('Failed to load locale', err));
}
let currentLang = localStorage.getItem('cloudSchoolLang') || 'ar';
loadLocale(currentLang);
const langToggleBtn = document.getElementById('lang-toggle');
if (langToggleBtn) {
  langToggleBtn.addEventListener('click', () => {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('cloudSchoolLang', currentLang);
    loadLocale(currentLang);
    langToggleBtn.textContent = currentLang === 'ar' ? 'English' : 'العربية';
  });
  langToggleBtn.textContent = currentLang === 'ar' ? 'English' : 'العربية';
}

// ==================== قاموس برايل العربية ====================
const arabicBrailleMap = {
    '1': 'ا',
    '1,2': 'ب',
    '2,3,4,5': 'ت',
    '1,4,5,6': 'ث',
    '2,4,5': 'ج',
    '1,5,6': 'ح',
    '1,3,4,6': 'خ',
    '1,4,5': 'د',
    '2,3,4,6': 'ذ',
    '1,2,3,5': 'ر',
    '1,3,5,6': 'ز',
    '2,3,4': 'س',
    '1,4,6': 'ش',
    '1,2,3,4,6': 'ص',
    '1,2,4,6': 'ض',
    '2,3,4,5,6': 'ط',
    '1,2,3,4,5,6': 'ظ',
    '1,2,3,5,6': 'ع',
    '1,2,6': 'غ',
    '1,2,4': 'ف',
    '1,2,3,4,5': 'ق',
    '1,3': 'ك',
    '1,2,3': 'ل',
    '1,3,4': 'م',
    '1,3,4,5': 'ن',
    '1,2,5': 'هـ',
    '2,4,5,6': 'و',
    '2,4': 'ي',
    '2,3,5': '!',
    '2,5,6': '؟'
};

// ==================== [إصلاح #5] دوال مؤشر التحميل ====================
function showLoadingSpinner(targetElementId, message) {
    const el = document.getElementById(targetElementId);
    if (el) {
        el.innerHTML = `<div class="loading-overlay"><span class="loading-spinner"></span><span>${message}</span></div>`;
    }
}

// ==================== دوال النطق والصوت ====================

function showToast(text) {
    const toast = document.getElementById('toast-message');
    toast.textContent = text;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

function getGeminiApiKey() {
    return localStorage.getItem('geminiApiKey') || "";
}

function speak(text) {
    if (!audioCoPilotEnabled) return;
    
    const ariaLive = document.getElementById('aria-live');
    if (ariaLive) ariaLive.textContent = text;

    if (screenReaderMode) return; // Skip custom audio if screen reader mode is ON

    if (activeAudioElement) {
        activeAudioElement.pause();
        activeAudioElement = null;
    }
    window.speechSynthesis.cancel();

    const wave = document.getElementById('audio-visual-wave');
    if (wave) wave.classList.add('playing');

    if (ttsEngineMode === 'gemini') {
        speakWithGeminiTTS(text);
    } else {
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ar-EG';
            utterance.rate = 1.1;
            utterance.onend = () => { if (wave) wave.classList.remove('playing'); };
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn("SpeechSynthesis failed:", e);
            if (wave) wave.classList.remove('playing');
        }
    }
}
window.speak = speak;

function toggleTtsEngine() {
    if (ttsEngineMode === 'gemini') {
        ttsEngineMode = 'browser';
        document.getElementById('tts-engine-toggle').textContent = "🎙️ صوت القراءة: قارئ المتصفح المحلي";
        speak("تم التبديل لمشغل الصوت المحلي للمتصفح.");
    } else {
        ttsEngineMode = 'gemini';
        document.getElementById('tts-engine-toggle').textContent = "🎙️ صوت القراءة: ذكاء اصطناعي (Gemini)";
        speak("تم التبديل لمشغل النطق فائق الجودة بالذكاء الاصطناعي.");
    }
}

function toggleScreenReaderMode() {
    screenReaderMode = !screenReaderMode;
    const btn = document.getElementById('btn-screen-reader-mode');
    if (screenReaderMode) {
        if (btn) btn.textContent = "🔇 قارئ الشاشة الخارجي: مفعل (تم كتم صوت المنصة)";
        if (activeAudioElement) activeAudioElement.pause();
        window.speechSynthesis.cancel();
        // Use aria-live to confirm activation silently
        const ariaLive = document.getElementById('aria-live');
        if (ariaLive) ariaLive.textContent = "تم تفعيل وضع التوافق مع قارئ الشاشة الخارجي.";
    } else {
        if (btn) btn.textContent = "🔊 قارئ الشاشة الخارجي: معطل";
        speak("تم إيقاف وضع قارئ الشاشة الخارجي وتفعيل المساعد الصوتي للمنصة.");
    }
}

async function speakWithGeminiTTS(text) {
    const wave = document.getElementById('audio-visual-wave');
    try {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            fallbackLocalSpeak(text);
            return;
        }
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [{ text: `تحدث باللغة العربية الفصحى بصوت دافئ وودود للغاية ومعبّر للأطفال المكفوفين: ${text}` }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Puck" }
                    }
                }
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const part = result?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType;

        if (audioData && mimeType && mimeType.startsWith("audio/")) {
            const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)?.[1] || "24000", 10);
            const pcmBuffer = base64ToArrayBuffer(audioData);
            const wavBlob = pcmToWav(pcmBuffer, sampleRate);
            const audioUrl = URL.createObjectURL(wavBlob);

            if (activeAudioElement) {
                activeAudioElement.pause();
            }
            activeAudioElement = new Audio(audioUrl);
            activeAudioElement.onended = () => { if (wave) wave.classList.remove('playing'); };
            activeAudioElement.play().catch(error => {
                console.warn("Autoplay policy blocked Audio.play():", error);
                if (wave) wave.classList.remove('playing');
                showAutoplayPrompt(text);
            });
        } else {
            fallbackLocalSpeak(text);
        }
    } catch (error) {
        console.error("Gemini TTS Error:", error);
        fallbackLocalSpeak(text);
    }
}

function showAutoplayPrompt(pendingText) {
    let prompt = document.getElementById('autoplay-unlock-prompt');
    if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'autoplay-unlock-prompt';
        prompt.className = 'fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col items-center justify-center p-4 text-center';
        prompt.innerHTML = `
            <div class="card p-8 rounded-3xl max-w-md border-4 border-yellow-400 space-y-6 bg-slate-900 text-yellow-400">
                <svg class="w-16 h-16 mx-auto text-yellow-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                <h1 id="auth-title" class="text-4xl font-black mt-3" data-i18n="authTitle">كلاود سكول | Cloud School</h1>
                <p class="text-white font-bold text-lg">يرجى الضغط على الزر أدناه لتفعيل الصوت والمساعد الصوتي التفاعلي لـ Cloud School.</p>
                <button id="btn-unlock-audio" class="w-full p-4 bg-yellow-400 text-black font-black text-xl rounded-xl large-touch-target hover:bg-yellow-300 transition btn-interactive">
                    تشغيل الصوت والمساعد 🎙️
                </button>
            </div>
        `;
        document.body.appendChild(prompt);

        const unlockBtn = document.getElementById('btn-unlock-audio');
        unlockBtn.addEventListener('click', () => {
            prompt.remove();
            const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
            silentAudio.play().then(() => {
                speak(pendingText);
            }).catch(e => {
                console.warn("Autoplay bypass welcome failed, trying speak directly:", e);
                speak(pendingText);
            });
        });
        setupAccessibleVoices();
    }
}

function fallbackLocalSpeak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.onend = () => {
        const wave = document.getElementById('audio-visual-wave');
        if (wave) wave.classList.remove('playing');
    };
    window.speechSynthesis.speak(utterance);
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function pcmToWav(pcm16Buffer, sampleRate) {
    const buffer = new ArrayBuffer(44 + pcm16Buffer.byteLength);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + pcm16Buffer.byteLength, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 1 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, pcm16Buffer.byteLength, true);

    const pcmView = new Int16Array(pcm16Buffer);
    for (let i = 0; i < pcmView.length; i++) {
        view.setInt16(44 + i * 2, pcmView[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function setupAccessibleVoices() {
    if (accessibleVoicesController) {
        accessibleVoicesController.abort();
    }
    accessibleVoicesController = new AbortController();
    const signal = accessibleVoicesController.signal;

    document.querySelectorAll('button, a, input, textarea, select, [role="button"]').forEach(el => {
        el.addEventListener('focus', () => {
            const textToSpeak = el.getAttribute('aria-label') || el.innerText || el.placeholder || el.value || '';
            if (textToSpeak) {
                speak(textToSpeak);
            }
        }, { signal });

        el.addEventListener('mouseenter', () => {
            if (activeRole === 'student') {
                const textToSpeak = el.getAttribute('aria-label') || el.innerText || el.placeholder || el.value || '';
                if (textToSpeak) {
                    speak(textToSpeak);
                }
            }
        }, { signal });
    });
}

function toggleAudioCoPilot() {
    audioCoPilotEnabled = !audioCoPilotEnabled;
    const btn = document.getElementById('audio-co-pilot-toggle');
    if (audioCoPilotEnabled) {
        btn.textContent = "🔊 قارئ الشاشة: مفعل";
        btn.setAttribute('aria-pressed', 'true');
        speak("تم تفعيل القارئ الصوتي المدمج بنجاح.");
    } else {
        btn.textContent = "🔇 قارئ الشاشة: معطل";
        btn.setAttribute('aria-pressed', 'false');
        window.speechSynthesis.cancel();
        if (activeAudioElement) {
            activeAudioElement.pause();
            activeAudioElement = null;
        }
    }
}

function adjustTextSize(direction) {
    currentSizeOffset += direction;
    if (currentSizeOffset < -2) currentSizeOffset = -2;
    if (currentSizeOffset > 6) currentSizeOffset = 6;

    const baseSizes = [1, 1.125, 1.25, 1.5, 1.75, 2, 2.5, 3];
    const chosenSize = baseSizes[1 + currentSizeOffset] || 1.125;
    document.documentElement.style.setProperty('--base-text-size', `${chosenSize}rem`);

    speak(`تم تعديل حجم الخط بنسبة ${Math.round(chosenSize * 100)} في المئة.`);
}

function setTheme(theme) {
    const body = document.body;
    body.className = body.className.replace(/theme-\S+/g, '');
    if (theme === 'dark-hc') {
        body.classList.add('theme-dark-high-contrast');
        speak("تم تفعيل وضع التباين الداكن الموصى به.");
    } else if (theme === 'light-hc') {
        body.classList.add('theme-light-high-contrast');
        speak("تم تفعيل وضع التباين الفاتح.");
    } else if (theme === 'classic') {
        body.classList.add('theme-classic');
        speak("تم تفعيل السمة الزرقاء الكلاسيكية.");
    }
}

let audioRecorderMimeType = 'audio/webm'; // Default, will be updated by browser

function toggleAudioRecording() {
    const micBtn = document.getElementById('btn-mic-input');
    const aiMicBtn = document.getElementById('btn-ai-mic'); // Just in case AI tutor has one

    if (isRecording) {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        isRecording = false;
        if (micBtn) micBtn.classList.remove('bg-red-600', 'animate-pulse');
        if (aiMicBtn) aiMicBtn.classList.remove('bg-red-600', 'animate-pulse');
        speak("انتهى التسجيل. جاري تفريغ الصوت عبر الذكاء الاصطناعي، يرجى الانتظار...");
    } else {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            speak("عذراً، الميكروفون غير مدعوم في هذا المتصفح.");
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioRecorderMimeType = mediaRecorder.mimeType || 'audio/webm';
            audioChunks = [];
            
            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: audioRecorderMimeType });
                audioChunks = [];
                
                try {
                    const base64Audio = await blobToBase64(audioBlob);
                    await transcribeAudioWithGemini(base64Audio, audioRecorderMimeType);
                } catch (err) {
                    console.error("Error processing audio:", err);
                    speak("حدث خطأ أثناء معالجة الصوت.");
                }
            };

            mediaRecorder.start();
            isRecording = true;
            if (micBtn) micBtn.classList.add('bg-red-600', 'animate-pulse');
            if (aiMicBtn) aiMicBtn.classList.add('bg-red-600', 'animate-pulse');
            speak("بدأ التسجيل. تحدث الآن ثم اضغط زر الميكروفون مرة أخرى للإيقاف.");
        }).catch(err => {
            console.error("Microphone access error:", err);
            speak("عذراً، لم أتمكن من الوصول إلى الميكروفون. يرجى السماح بالصلاحيات.");
        });
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function transcribeAudioWithGemini(base64Audio, mimeType) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        speak("يرجى إضافة مفتاح Gemini السري من لوحة الإدارة أولاً لتفعيل هذه الميزة.");
        return;
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [
                { text: "أنت تستمع إلى مقطع صوتي. قم بتفريغ ما يقال حرفياً باللغة العربية مع تصحيح أي أخطاء إملائية. أكتب النص المفرغ فقط بدون أي إضافات أو تعليقات خارجية." },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Audio
                    }
                }
            ]
        }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            if (text.trim()) {
                const subAssignments = document.getElementById('student-sub-assignments');
                const ansTextarea = document.getElementById('assignment-student-answer');
                if (ansTextarea && subAssignments && !subAssignments.classList.contains('hidden')) {
                    ansTextarea.value += (ansTextarea.value ? " " : "") + text.trim();
                    speak("تم التقاط الصوت بنجاح.");
                }

                const subAiTutor = document.getElementById('student-sub-ai-tutor');
                const aiQueryTextarea = document.getElementById('ai-tutor-query');
                if (aiQueryTextarea && subAiTutor && !subAiTutor.classList.contains('hidden')) {
                    aiQueryTextarea.value = text.trim();
                    speak("تم كتابة سؤالك بنجاح.");
                }
            } else {
                 speak("لم أتمكن من سماع شيء واضح. حاول مرة أخرى.");
            }
        } else {
             speak("تعذر تفريغ الصوت عبر الذكاء الاصطناعي. حاول مجدداً.");
        }
    } catch (error) {
        console.error("Audio Transcription Error:", error);
        speak("حدث خطأ أثناء الاتصال بالخادم لتفريغ الصوت.");
    }
}

function toggleRegFields() {
    const role = document.getElementById('reg-role').value;
    const ageField = document.getElementById('age-field-container');
    const studentFields = document.getElementById('student-linked-fields');
    const parentFields = document.getElementById('parent-linked-fields');

    if (role === 'student') {
        ageField.classList.remove('hidden');
        studentFields.classList.remove('hidden');
        parentFields.classList.add('hidden');
        checkAgeLimitations();
    } else if (role === 'parent') {
        ageField.classList.add('hidden');
        studentFields.classList.add('hidden');
        parentFields.classList.remove('hidden');
        document.getElementById('reg-parent-contact').required = false;
    } else {
        ageField.classList.remove('hidden');
        studentFields.classList.add('hidden');
        parentFields.classList.add('hidden');
        document.getElementById('reg-parent-contact').required = false;
    }
}

function checkAgeLimitations() {
    const role = document.getElementById('reg-role').value;
    if (role !== 'student') return;

    const ageInput = document.getElementById('reg-age');
    const age = parseInt(ageInput.value, 10);
    const warningBox = document.getElementById('auth-warning-box');
    const warningText = document.getElementById('auth-warning-text');
    const parentContactInput = document.getElementById('reg-parent-contact');
    const labelParentContact = document.getElementById('label-parent-contact');
    const btnAuthSubmit = document.getElementById('btn-auth-submit');

    warningBox.classList.add('hidden');
    parentContactInput.required = false;

    if (isNaN(age)) return;

    if (age < 12) {
        const msg = "أهلاً بك يا بطل. نظراً لأن عمرك أقل من 12 عاماً، يتوجب على ولي أمرك أو مدرستك إنشاء الحساب الخاص بك من جهتهم والإشراف التام على تصفحك على كلاود سكول. لا يمكنك التسجيل بنفسك حالياً.";
        warningText.textContent = msg;
        warningBox.classList.remove('hidden');
        btnAuthSubmit.disabled = true;
        btnAuthSubmit.classList.add('opacity-50', 'cursor-not-allowed');
        speak(msg);
    } else {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
        parentContactInput.required = true;
        parentContactInput.setAttribute('required', 'required');

        labelParentContact.innerHTML = 'حساب ولي أمرك (حقل إجباري - اكتب رقم هاتف، بريد، أو ID ولي الأمر المسجل) *';

        speak("لقد قمت بتحديد عمرك 12 عاماً أو أكثر. يتوجب عليك الآن ربط حسابك بولي أمرك بكتابة رقم هاتفه، بريده الإلكتروني، أو معرف حسابه الشخصي على المنصة. هذا الحقل لا يمكن تجاوزه أبداً.");
    }
}

function handleRegistrationSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const contact = document.getElementById('reg-contact').value.trim();
    const role = document.getElementById('reg-role').value;
    const age = parseInt(document.getElementById('reg-age').value, 10);

    const warningBox = document.getElementById('auth-warning-box');
    const warningText = document.getElementById('auth-warning-text');
    warningBox.classList.add('hidden');

    if (role === 'student') {
        if (age < 12) {
            const msg = "عذراً! لا يمكن إكمال التسجيل للطلاب دون 12 عاماً بشكل مستقل. يرجى دعوة ولي أمرك للتسجيل أولاً.";
            warningText.textContent = msg;
            warningBox.classList.remove('hidden');
            speak(msg);
            return;
        }

        const parentContact = document.getElementById('reg-parent-contact').value.trim();
        if (!parentContact) {
            const msg = "تنبيه صارم: لا يمكن إتمام التسجيل وتجاوز هذه الخطوة أبداً دون إدخال رقم هاتف، بريد إلكتروني، أو معرف (ID) ولي الأمر لربط الحسابين.";
            warningText.textContent = msg;
            warningBox.classList.remove('hidden');
            speak(msg);
            document.getElementById('reg-parent-contact').focus();
            return;
        }

        currentUserSession = { name, contact, role, age, parentContact };
    } else if (role === 'parent') {
        const childContact = document.getElementById('reg-child-contact').value.trim();
        currentUserSession = { name, contact, role, childContact };
    } else {
        currentUserSession = { name, contact, role, age };
    }

    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('dev-role-bar').classList.remove('hidden');
    document.getElementById('active-user-badge').textContent = `المستخدم: ${name} (${getArabicRoleName(role)})`;

    switchRole(role);
    showToast(`أهلاً بك يا ${name} في Cloud School`);
}

function bypassAuthDemo() {
    currentUserSession = {
        name: "علي أحمد الغامدي (طالب)",
        contact: "0555555555",
        role: "student",
        age: 14,
        parentContact: "parent@cloudschool.com"
    };
    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('dev-role-bar').classList.remove('hidden');
    document.getElementById('active-user-badge').textContent = "المستخدم: علي أحمد الغامدي (طالب تجريبي)";
    switchRole('student');
}

function logout() {
    currentUserSession = null;
    document.getElementById('auth-gate').classList.remove('hidden');
    document.getElementById('dev-role-bar').classList.add('hidden');
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-contact').value = '';
    document.getElementById('reg-age').value = '';
    document.getElementById('reg-parent-contact').value = '';
    speak("تم تسجيل الخروج بنجاح.");
}

function getArabicRoleName(role) {
    const roles = { student: 'طالب', parent: 'ولي أمر', teacher: 'معلم', admin: 'إدارة المدرسة' };
    return roles[role] || role;
}

function switchRole(role) {
    activeRole = role;

    document.getElementById('view-student').classList.add('hidden');
    document.getElementById('view-teacher').classList.add('hidden');
    document.getElementById('view-parent').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');

    ['student', 'teacher', 'parent', 'admin'].forEach(r => {
        const btn = document.getElementById(`role-btn-${r}`);
        if (btn) {
            if (r === role) {
                btn.className = "px-3 py-1 rounded bg-black text-white font-black border-2 border-yellow-400";
            } else {
                btn.className = "px-3 py-1 rounded bg-gray-200 text-black hover:bg-gray-300 transition";
            }
        }
    });

    if (role === 'student') {
        document.getElementById('view-student').classList.remove('hidden');
        speak("واجهة الطالب نشطة الآن في كلاود سكول. تصفح المناهج والواجبات والألعاب بصوت الذكاء الاصطناعي.");
    } else if (role === 'teacher') {
        document.getElementById('view-teacher').classList.remove('hidden');
        speak("لوحة تحكم المعلم مفتوحة لتوليد الأسئلة ونشر المناهج.");
        renderTeacherSubmissions();
    } else if (role === 'parent') {
        document.getElementById('view-parent').classList.remove('hidden');
        speak("لوحة تحكم ولي الأمر نشطة لمتابعة تقدم الطالب وتشخيص صعوبات التعلم.");
        renderParentDashboard();
    } else if (role === 'admin') {
        document.getElementById('view-admin').classList.remove('hidden');
        speak("واجهة إدارة المدرسة مفتوحة لتوليد حسابات المكفوفين.");
        renderAdminDashboard();
    }

    setTimeout(setupAccessibleVoices, 200);
}

async function callGeminiAPI(userQuery, systemPrompt, maxRetries = 5) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        return "يرجى إضافة مفتاح Gemini من لوحة التحكم لتتمكن من استخدام هذه الميزة.";
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        }
    };

    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                return result.candidates?.[0]?.content?.parts?.[0]?.text || "لا تتوفر إجابة حالياً.";
            }
        } catch (error) {
            if (i === maxRetries - 1) {
                throw new Error("فشل الاتصال بخادم الذكاء الاصطناعي بعد عدة محاولات.");
            }
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }
}

async function translateAndEvaluateBrailleWithAI() {
    const answerTextarea = document.getElementById('assignment-student-answer');
    const answerText = answerTextarea.value.trim();

    if (!answerText) {
        speak("الرجاء كتابة إجابة ببرايل أو بالصوت أولاً قبل الفحص والتقييم.");
        return;
    }

    const evalBox = document.getElementById('braille-evaluation-box');
    const evalText = document.getElementById('braille-evaluation-text');

    evalBox.classList.remove('hidden');
    showLoadingSpinner('braille-evaluation-text', 'جاري تواصل المترجم الذكي مع خادم Gemini...');
    speak("جاري فحص وتصحيح النص المكتوب ببرايل، انتظر لحظات من فضلك.");

    const prompt = `لقد كتب طالب كفيف هذا النص التعليمي باللغة العربية: "${answerText}". قم بمراجعة الإملاء، وتوضيح الكلمات المترجمة والتركيبات النحوية، وإعطائه تقريراً تربوياً وصوتياً فائق التشجيع لتنمية مهارات برايل لديه، مع تقديم النص المصحح والنهائي بشكل واضح وبسيط ومريح للقراءة.`;

    try {
        const resultText = await callGeminiAPI(prompt, "أنت معلم لغة عربية متميز وخبير في ترجمة وتصحيح لغة برايل وطريقة Perkins للأطفال والطلاب المكفوفين.");
        evalText.textContent = resultText;
        speak(resultText);
    } catch (error) {
        console.error(error);
        evalText.textContent = "تعذر تقييم لغة برايل حالياً لعدم استقرار الشبكة. يرجى المحاولة مجدداً.";
        speak("عذراً، فشل المترجم الذكي في تقييم النص.");
    }
}

async function summarizeCurriculumBookWithAI() {
    if (!currentlyPlayingBookId) return;
    const book = localData.books.find(b => b.id === currentlyPlayingBookId);
    if (!book) return;

    const summaryBox = document.getElementById('book-ai-summary-box');
    summaryBox.classList.remove('hidden');
    showLoadingSpinner('book-ai-summary-text', 'جاري قراءة المنهج وتوليد تلخيص ذكي...');
    speak("جاري تحضير التلخيص السمعي الذكي وبطاقات الاستذكار الفورية، يرجى الانتظار.");

    const prompt = `قم بتلخيص المحتوى الدراسي التالي بالتفصيل بأسلوب نقاطي سمعي فائق الوضوح ومناسب للأطفال المكفوفين ليسهل عليهم حفظه كبطاقات استذكار سريعة: "${book.content}". ولد أيضاً ثلاثة أسئلة مراجعة وتنشيط للذاكرة في نهاية التلخيص.`;

    try {
        const resultText = await callGeminiAPI(prompt, "أنت خبير تعليمي متميز في صياغة وتلخيص المناهج الدراسية لضعاف البصر بطريقة سمعية مبسطة للغاية.");
        document.getElementById('book-ai-summary-text').textContent = resultText;
        speak(resultText);
    } catch (error) {
        console.error(error);
        document.getElementById('book-ai-summary-text').textContent = "تعذر تحضير التلخيص حالياً. يرجى مراجعة الاتصال بالإنترنت.";
        speak("عذراً، واجهت مشكلة في تلخيص الكتاب.");
    }
}

async function startAiStoryRound(choiceIndex = null) {
    const questionText = document.getElementById('game-question');
    const binaryOptions = document.getElementById('game-binary-options');
    const storyOptions = document.getElementById('game-story-options');

    binaryOptions.classList.add('hidden');
    storyOptions.classList.remove('hidden');
    storyOptions.innerHTML = '';

    showLoadingSpinner('game-question', 'جاري صياغة فصل المغامرة...');
    speak("جاري نسج فصول قصتك التفاعلية بالذكاء الاصطناعي، انتظر ثوانٍ لتستمع للمغامرة.");

    let prompt = "";
    if (choiceIndex === null) {
        prompt = "اصنع قصة تعليمية تفاعلية قصيرة مشوقة وملهمة باللغة العربية الفصحى لطلاب مكفوفين عن مغامرة في النظام الشمسي لتعلم الكواكب. أنهِ المقطع الأول بـ 3 خيارات لمواصلة المغامرة. أخرج النتيجة بصيغة JSON فقط بدون علامات markdown، وتحتوي الهيكل التالي: { 'story': 'نص المقطع المثير والمبسط وعلاقته بالمقرر الدراسي', 'options': ['خيار المغامرة الأول المثير كجملة قصيرة', 'خيار المغامرة الثاني المثير كجملة قصيرة', 'خيار المغامرة الثالث المثير كجملة قصيرة'] }";
    } else {
        prompt = `استكمالاً للقصة السابقة المروية، اختار الطالب الخيار رقم ${choiceIndex + 1}. تابع تفاصيل المغامرة في الفضاء وعلمهم معلومات جديدة ومفيدة، ثم أنهِ المقطع مجدداً بـ 3 خيارات جديدة لمتابعة القصة ومواصلة التحدي. أخرج النتيجة بصيغة JSON فقط بنفس التنسيق: { 'story': 'نص المقطع المثير والمبسط وعلاقته بالمقرر الدراسي', 'options': ['خيار 1', 'خيار 2', 'خيار 3'] }`;
    }

    try {
        const jsonText = await callGeminiAPI(prompt, "أنت مصمم قصص تفاعلية وتعليمية ملهمة ومختص في صياغة ملفات JSON نقية ومبسطة.");
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        questionText.textContent = parsed.story;
        speak(parsed.story);

        parsed.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = "p-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive";
            btn.textContent = `${idx + 1}) ${opt}`;
            btn.setAttribute('aria-label', `الخيار ${idx + 1}: ${opt}`);
            btn.addEventListener('click', () => {
                playSuccessChime();
                startAiStoryRound(idx);
            });
            storyOptions.appendChild(btn);
        });

        setTimeout(setupAccessibleVoices, 200);

    } catch (error) {
        console.error("Storyteller Error:", error);
        questionText.textContent = "حدث خطأ أثناء محاولة جلب فصول القصة التفاعلية.";
        speak("عذراً، تعذر صياغة القصة حالياً.");
    }
}

async function analyzeImageWithGemini() {
    if (!uploadedImageBase64) {
        speak("الرجاء تحديد ملف صورة توضيحية أولاً من خلال الزر المتاح.");
        return;
    }

    const responseBox = document.getElementById('vision-response-box');
    responseBox.classList.remove('hidden');
    showLoadingSpinner('vision-response-text', 'جاري إرسال الصورة إلى Gemini لتحليلها...');
    speak("بدأ محلل الرسوم المخطط له، يرجى الصبر ريثما يتم إنتاج الشرح الصوتي.");

    try {
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: "أنت خبير في تبسيط ووصف الصور التعليمية، المخططات، الخلايا، الجداول، والخرائط الجغرافية للأطفال والطلاب المكفوفين وضعاف البصر. قدم وصفاً لفظياً مفصلاً ودقيقاً للغاية لهذه الصورة، موضحاً العناصر، التسميات، والعلاقات بينها، بحيث يستطيع الكفيف تماماً تخيلها وفهم المضمون العلمي الذي بداخلها كأنه يراها. تحدث بلغة عربية فصحى مشوقة وتجنب الرموز المعقدة." },
                    {
                        inlineData: {
                            mimeType: uploadedImageMime,
                            data: uploadedImageBase64
                        }
                    }
                ]
            }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const description = result.candidates?.[0]?.content?.parts?.[0]?.text || "تعذر توليد وصف للصورة حالياً.";

        document.getElementById('vision-response-text').textContent = description;
        speak(description);

    } catch (error) {
        console.error("Gemini Vision Error:", error);
        document.getElementById('vision-response-text').textContent = "حدث خطأ في الاتصال بنظام تحليل الرسوم بالذكاء الاصطناعي.";
        speak("عذراً، تعذر تحليل الصورة.");
    }
}

async function askAITutor() {
    const queryText = document.getElementById('ai-tutor-query').value.trim();
    if (!queryText) {
        speak("يرجى كتابة سؤالك أولاً.");
        return;
    }

    document.getElementById('ai-tutor-response-box').classList.remove('hidden');
    showLoadingSpinner('ai-tutor-response-text', 'جاري الاتصال بمعلم الذكاء الاصطناعي...');
    speak("جاري التواصل مع المعلم الافتراضي لإعداد شرح مبسط، يرجى الانتظار ثوانٍ معدودة.");

    try {
        const responseText = await callGeminiAPI(queryText, "أنت معلم ودود ولطيف جداً متخصص في شرح المناهج الدراسية للأطفال المكفوفين وضعاف البصر بتبسيط شديد وضرب أمثلة ملموسة من واقع الحياة اليومية لتيسير الاستيعاب السمعي.");
        document.getElementById('ai-tutor-response-text').textContent = responseText;
        speak(responseText);
    } catch (error) {
        document.getElementById('ai-tutor-response-text').textContent = "حدث خطأ أثناء محاولة جلب الإجابة من خوادم الذكاء الاصطناعي المباشرة.";
        speak("عذراً، واجهت مشكلة في إعداد الإجابة.");
    }
}

async function generateAIQuiz() {
    speak("جاري توليد أسئلة الاختبار التفاعلي ديناميكياً من المنهج باستخدام الذكاء الاصطناعي.");
    const btn = document.getElementById('btn-ai-generate');
    btn.textContent = "🪄 جاري التوليد...";

    const prompt = "ولد سؤال اختبار حقيقي واحد في مادة العلوم يتكون من اختيار من متعدد مع أربعة خيارات وتحديد الخيار الصحيح. أخرج النتيجة بتنسيق JSON نظيف وبسيط يحتوي على مفاتيح: question, A, B, C, D, correct.";

    try {
        const jsonText = await callGeminiAPI(prompt, "أنت مصمم اختبارات أكاديمي متميز لوزارة التعليم.");
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        document.getElementById('teacher-quiz-title').value = "اختبار العلوم الذكي التوليدي";
        document.getElementById('teacher-quiz-q').value = parsed.question;
        document.getElementById('teacher-quiz-oa').value = parsed.A;
        document.getElementById('teacher-quiz-ob').value = parsed.B;
        document.getElementById('teacher-quiz-oc').value = parsed.C;
        document.getElementById('teacher-quiz-od').value = parsed.D;
        document.getElementById('teacher-quiz-correct').value = parsed.correct;

        speak("تم توليد السؤال وتعبئة الحقول بنجاح!");
    } catch (e) {
        console.error(e);
        speak("فشل توليد الاختبار التلقائي.");
    } finally {
        btn.textContent = "🪄 توليد ذكي بالذكاء الاصطناعي";
    }
}

function toggleCheatDot(dotNum) {
    const btn = document.getElementById(`cheat-dot-${dotNum}`);
    if (currentCheatDots.has(dotNum)) {
        currentCheatDots.delete(dotNum);
        btn.classList.remove('active');
    } else {
        currentCheatDots.add(dotNum);
        btn.classList.add('active');
    }

    const dotsArray = Array.from(currentCheatDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString] || "غير مكتمل";
    document.getElementById('cheat-char-preview').textContent = `الحرف المشكل حالياً: ${mappedChar} (نقاط: ${keyString || 'لا يوجد'})`;
}

function pronounceCheatBraille() {
    const dotsArray = Array.from(currentCheatDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString];

    if (mappedChar) {
        speak(`هذه التركيبة تمثل الحرف العربي: ${mappedChar}. تذكر كيف تضع أصابعك لتشكيله على لوحة كلاود سكول!`);
    } else {
        speak("لم تقم بتشكيل حرف عربي كامل بعد، جرب تشكيلات أخرى ملموسة.");
    }
}

function clearCheatDots() {
    currentCheatDots.clear();
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`cheat-dot-${i}`);
        if (dot) dot.classList.remove('active');
    }
    document.getElementById('cheat-char-preview').textContent = "الحرف المشكل حالياً: لا يوجد";
    speak("تم تفريغ لوحة تعليم برايل.");
}

function openStudentSection(section) {
    document.getElementById('student-sub-books').classList.add('hidden');
    document.getElementById('student-sub-assignments').classList.add('hidden');
    document.getElementById('student-sub-image-describer').classList.add('hidden');
    document.getElementById('student-sub-games').classList.add('hidden');
    document.getElementById('student-sub-ai-tutor').classList.add('hidden');

    const container = document.getElementById('student-section-container');
    container.classList.remove('hidden');
    const title = document.getElementById('student-section-title');

    if (section === 'books') {
        title.textContent = "📚 مستودع المناهج والكتب الدراسية";
        document.getElementById('student-sub-books').classList.remove('hidden');
        renderStudentBooks();
        speak("قسم الكتب الدراسية مفتوح. اختر أحد الكتب لقراءته أو الاستماع إليه.");
    } else if (section === 'assignments') {
        title.textContent = "✏️ الواجبات والاختبارات التفاعلية";
        document.getElementById('student-sub-assignments').classList.remove('hidden');
        renderStudentAssignments();
        speak("قسم الاختبارات والواجبات مفتوح. يمكنك اختيار الواجب وحله بالصوت أو بطريقة برايل.");
    } else if (section === 'image-describer') {
        title.textContent = "👁️ واصف الرسوم التوضيحية بالذكاء الاصطناعي";
        document.getElementById('student-sub-image-describer').classList.remove('hidden');
        speak("واصف الرسوم مفتوح. ارفع صورة توضيحية لدرسك وسأشرحها لك بالكامل.");
    } else if (section === 'games') {
        title.textContent = "🎮 ساحة الألعاب التنافسية الذكية وبرايل";
        document.getElementById('student-sub-games').classList.remove('hidden');
        speak("أهلاً بك في ساحة الألعاب واللوحة التفاعلية لتعليم برايل. اختر التحدي لتبدأ المتعة.");
    } else if (section === 'ai-tutor') {
        title.textContent = "🤖 معلم الذكاء الاصطناعي الافتراضي";
        document.getElementById('student-sub-ai-tutor').classList.remove('hidden');
        speak("معلمك الخاص المدعوم بالذكاء الاصطناعي مستعد لمساعدتك على مدار الساعة. اضغط على التحدث واطرح سؤالك.");
    }

    container.scrollIntoView({ behavior: 'smooth' });
    setTimeout(setupAccessibleVoices, 200);
}

function closeStudentSection() {
    document.getElementById('student-section-container').classList.add('hidden');
    controlAudiobook('stop');
    speak("تم العودة إلى الشاشة الرئيسية للطالب.");
}

function renderStudentBooks() {
    const grid = document.getElementById('student-books-grid');
    grid.innerHTML = '';

    localData.books.forEach(b => {
        const item = document.createElement('div');
        item.className = 'card p-6 rounded-xl flex flex-col justify-between items-start gap-4';
        item.innerHTML = `
            <h4 class="text-2xl font-black">${b.title}</h4>
            <p class="text-sm line-clamp-3">${b.content}</p>
            <div class="flex gap-2 w-full flex-wrap">
                <button data-action="read-book" data-book-id="${b.id}" class="flex-1 p-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 btn-interactive">📖 قراءة بذكاء اصطناعي فائق</button>
                <button data-action="play-book" data-book-id="${b.id}" class="flex-1 p-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 btn-interactive">🎧 الاستماع للكتاب الصوتي</button>
            </div>
        `;
        grid.appendChild(item);
    });

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const bookId = btn.dataset.bookId;
        if (btn.dataset.action === 'read-book') readBookAloud(bookId);
        if (btn.dataset.action === 'play-book') playBookAudio(bookId);
    });
}

function readBookAloud(bookId) {
    const book = localData.books.find(b => b.id === bookId);
    if (book) {
        speak(`جاري قراءة كتاب: ${book.title}. المحتوى كالتالي: ${book.content}`);
    }
}

function playBookAudio(bookId) {
    currentlyPlayingBookId = bookId;
    const book = localData.books.find(b => b.id === bookId);
    if (book) {
        const player = document.getElementById('audiobook-player');
        player.classList.remove('hidden');
        document.getElementById('audiobook-playing-title').textContent = `🎧 جاري الاستماع لكتاب: ${book.title} (صوت طبيعي مجسم)`;
        speak(`تم تجهيز المشغل الصوتي لـ ${book.title}. اضغط زر التشغيل للبدء.`);
    }
}

function readActiveBookWithAi() {
    if (!currentlyPlayingBookId) return;
    const book = localData.books.find(b => b.id === currentlyPlayingBookId);
    if (book) {
        speak(book.content);
    }
}

function controlAudiobook(action) {
    if (action === 'stop') {
        document.getElementById('audiobook-player').classList.add('hidden');
        document.getElementById('book-ai-summary-box').classList.add('hidden');
        if (activeAudioElement) {
            activeAudioElement.pause();
            activeAudioElement = null;
        }
        speak("تم إيقاف تشغيل الكتاب الصوتي.");
    }
}

function renderStudentAssignments() {
    const list = document.getElementById('student-assignments-list');
    list.innerHTML = '';

    localData.assignments.forEach(a => {
        const item = document.createElement('div');
        item.className = 'card p-6 rounded-xl flex justify-between items-center flex-wrap gap-4';
        item.innerHTML = `
            <div>
                <h4 class="text-2xl font-black">${a.title}</h4>
                <span class="text-sm px-2 py-1 bg-yellow-400 text-black rounded font-bold">${a.type === 'mcq' ? 'اختبار اختيار من متعدد' : 'واجب مقالي نصي'}</span>
            </div>
            <button data-action="start-quiz" data-quiz-id="${a.id}" class="p-4 bg-green-600 text-white font-black text-lg rounded-xl hover:bg-green-500 large-touch-target btn-interactive">بدء الحل الفوري 🏁</button>
        `;
        list.appendChild(item);
    });

    list.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="start-quiz"]');
        if (btn) startQuiz(btn.dataset.quizId);
    });
}

function startQuiz(quizId) {
    selectedQuizId = quizId;
    const quiz = localData.assignments.find(a => a.id === quizId);
    if (!quiz) return;

    document.getElementById('active-quiz-panel').classList.remove('hidden');
    document.getElementById('active-quiz-title').textContent = quiz.title;

    if (quiz.type === 'mcq') {
        document.getElementById('quiz-question-container').classList.remove('hidden');
        document.getElementById('quiz-text-input-section').classList.add('hidden');

        document.getElementById('quiz-question-text').textContent = quiz.question;
        document.getElementById('btn-opt-A').querySelector('span').textContent = `أ) ${quiz.options.A}`;
        document.getElementById('btn-opt-B').querySelector('span').textContent = `ب) ${quiz.options.B}`;
        document.getElementById('btn-opt-C').querySelector('span').textContent = `ج) ${quiz.options.C}`;
        document.getElementById('btn-opt-D').querySelector('span').textContent = `د) ${quiz.options.D}`;

        speak(`بدأ الاختبار الفوري. عنوان الاختبار: ${quiz.title}. السؤال هو: ${quiz.question}`);
    } else {
        document.getElementById('quiz-question-container').classList.add('hidden');
        document.getElementById('quiz-text-input-section').classList.remove('hidden');

        document.getElementById('assignment-student-answer').value = '';
        document.getElementById('braille-evaluation-box').classList.add('hidden');
        speak(`بدأ الواجب المقالي. السؤال هو: ${quiz.question}. يمكنك حل هذا الواجب بالكلام الصوتي أو بلوحة برايل.`);
    }

    let totalSecondsLeft = 10 * 60;
    const timerDisplay = document.getElementById('active-quiz-timer');
    timerDisplay.textContent = "10:00";

    if (quizTimerInterval) clearInterval(quizTimerInterval);
    quizTimerInterval = setInterval(() => {
        totalSecondsLeft -= 1;

        const mins = Math.floor(totalSecondsLeft / 60);
        const secs = totalSecondsLeft % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (totalSecondsLeft === 5 * 60) {
            speak("تنبيه هادئ: متبقي من الوقت خمس دقائق للاختبار.");
        } else if (totalSecondsLeft === 60) {
            speak("تنبيه عاجل: متبقي من الوقت دقيقة واحدة فقط.");
        } else if (totalSecondsLeft === 10) {
            speak("عشر ثوانٍ متبقية!");
        }

        if (totalSecondsLeft <= 0) {
            clearInterval(quizTimerInterval);
            submitQuizAnswer();
        }
    }, 1000);

    document.getElementById('active-quiz-panel').scrollIntoView({ behavior: 'smooth' });
    setTimeout(setupAccessibleVoices, 200);
}

function selectQuizOption(option) {
    selectedOption = option;
    speak(`تم اختيار الحرف ${option} كإجابتك المحتملة.`);

    ['A', 'B', 'C', 'D'].forEach(opt => {
        const btn = document.getElementById(`btn-opt-${opt}`);
        if (opt === option) {
            btn.classList.add('bg-yellow-400', 'text-black');
        } else {
            btn.classList.remove('bg-yellow-400', 'text-black');
        }
    });
}

function submitQuizAnswer() {
    if (quizTimerInterval) clearInterval(quizTimerInterval);

    const quiz = localData.assignments.find(a => a.id === selectedQuizId);
    if (!quiz) return;

    let finalAnswer = "";
    let score = 0;

    if (quiz.type === 'mcq') {
        if (!selectedOption) {
            speak("الرجاء تحديد خيار إجابة قبل الإرسال.");
            return;
        }
        finalAnswer = selectedOption;
        score = (selectedOption === quiz.correct) ? 100 : 0;
    } else {
        finalAnswer = document.getElementById('assignment-student-answer').value.trim();
        if (!finalAnswer) {
            speak("لا يمكنك إرسال إجابة فارغة.");
            return;
        }
        score = finalAnswer.length > 10 ? 90 : 50;
    }

    const submission = {
        studentName: currentUserSession?.name || "طالب تجريبي",
        studentContact: currentUserSession?.contact || "0555555555",
        parentContact: currentUserSession?.parentContact || "parent@cloudschool.com",
        quizId: selectedQuizId,
        quizTitle: quiz.title,
        studentAnswer: finalAnswer,
        initialScore: score,
        graderFeedback: quiz.type === 'mcq' ? "تصحيح فوري آلي" : "بانتظار المراجعة الذكية للذكاء الاصطناعي",
        timestamp: new Date().toLocaleTimeString('ar-EG')
    };

    localData.submissions.unshift(submission);
    saveSubmissionToFirebase(submission);

    speak("تم حفظ وإرسال إجابتك بنجاح. رائع يا بطل!");
    document.getElementById('active-quiz-panel').classList.add('hidden');
    selectedQuizId = null;
}

function setupPerkinsKeyboard() {
    window.addEventListener('keydown', (e) => {
        if (document.getElementById('perkins-braille-keyboard').classList.contains('hidden')) return;

        const key = e.key.toLowerCase();
        const validKeys = ['s', 'd', 'f', 'j', 'k', 'l', ' ', 'backspace', 'enter'];

        if (validKeys.includes(key)) {
            e.preventDefault();

            if (key === ' ') { addSpaceToAnswer(); return; }
            if (key === 'backspace') { deleteLastChar(); return; }
            if (key === 'enter') { submitQuizAnswer(); return; }

            perkinsKeysPressed[key] = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (document.getElementById('perkins-braille-keyboard').classList.contains('hidden')) return;

        const key = e.key.toLowerCase();
        if (perkinsKeysPressed[key]) {
            processPerkinsChord();
            perkinsKeysPressed = {};
        }
    });
}

function processPerkinsChord() {
    let dots = [];
    if (perkinsKeysPressed['f']) dots.push(1);
    if (perkinsKeysPressed['d']) dots.push(2);
    if (perkinsKeysPressed['s']) dots.push(3);
    if (perkinsKeysPressed['j']) dots.push(4);
    if (perkinsKeysPressed['k']) dots.push(5);
    if (perkinsKeysPressed['l']) dots.push(6);

    if (dots.length === 0) return;

    dots.sort((a, b) => a - b);
    const keyString = dots.join(',');
    const mappedChar = arabicBrailleMap[keyString];

    if (mappedChar) {
        const ansTextarea = document.getElementById('assignment-student-answer');
        ansTextarea.value += mappedChar;
        speak(mappedChar);
    } else {
        speak("تركيبة برايل غير معروفة.");
    }
}

function toggleBrailleDot(dotNumber) {
    const btn = document.getElementById(`dot-${dotNumber}`);
    if (currentBrailleDots.has(dotNumber)) {
        currentBrailleDots.delete(dotNumber);
        btn.classList.remove('active');
    } else {
        currentBrailleDots.add(dotNumber);
        btn.classList.add('active');
    }

    const dotsArray = Array.from(currentBrailleDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString] || "غير معروف";
    document.getElementById('braille-char-preview').textContent = `الحرف المشكل حالياً: ${mappedChar} (نقاط: ${keyString || 'لا يوجد'})`;
}

function enterBrailleChar() {
    const dotsArray = Array.from(currentBrailleDots).sort((a, b) => a - b);
    const keyString = dotsArray.join(',');
    const mappedChar = arabicBrailleMap[keyString];

    if (mappedChar) {
        const ansTextarea = document.getElementById('assignment-student-answer');
        ansTextarea.value += mappedChar;
        speak(mappedChar);
        clearBrailleDots();
    } else {
        speak("التركيبة الحالية لا تمثل حرفاً عربياً صحيحاً.");
    }
}

function clearBrailleDots() {
    currentBrailleDots.clear();
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) dot.classList.remove('active');
    }
    document.getElementById('braille-char-preview').textContent = "الحرف المشكل حالياً: لا يوجد";
}

function addSpaceToAnswer() {
    const ansTextarea = document.getElementById('assignment-student-answer');
    ansTextarea.value += " ";
    speak("مسافة");
}

function deleteLastChar() {
    const ansTextarea = document.getElementById('assignment-student-answer');
    if (ansTextarea.value.length > 0) {
        ansTextarea.value = ansTextarea.value.slice(0, -1);
        speak("تم مسح الحرف الأخير");
    }
}

function toggleBrailleKeyboard(type) {
    const screenKbd = document.getElementById('screen-braille-keyboard');
    const perkinsKbd = document.getElementById('perkins-braille-keyboard');

    if (type === 'screen') {
        screenKbd.classList.toggle('hidden');
        perkinsKbd.classList.add('hidden');
        speak("تم تبديل لوحة برايل للشاشة التفاعلية.");
    } else {
        perkinsKbd.classList.toggle('hidden');
        screenKbd.classList.add('hidden');
        speak("تم تفعيل محاكي Perkins لسطح المكتب.");
    }
}

function previewVisionImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    uploadedImageMime = file.type;
    const reader = new FileReader();
    reader.onloadend = function () {
        uploadedImageBase64 = reader.result.split(',')[1];
        document.getElementById('vision-preview-container').classList.remove('hidden');
        document.getElementById('vision-image-preview').src = reader.result;
        speak("تم تحميل الصورة بنجاح. انقر على زر التحليل بالأسفل لتلقي الوصف الصوتي.");
    };
    reader.readAsDataURL(file);
}

function speakVisionResponse() {
    const text = document.getElementById('vision-response-text').textContent;
    speak(text);
}

function initGame(gameType) {
    activeGameType = gameType;
    currentGameScore = 0;
    gameTimeLeft = 30;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-timer').textContent = "30";

    if (gameTimerInterval) clearInterval(gameTimerInterval);

    const binaryOptions = document.getElementById('game-binary-options');
    const storyOptions = document.getElementById('game-story-options');

    if (gameType === 'seconds') {
        document.getElementById('game-title').textContent = "⏱️ لعبة تحدي الثواني (صواب أم خطأ)";
        document.getElementById('game-timer-wrapper').classList.remove('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak("بدأت لعبة تحدي الثواني. أمامك ثلاثون ثانية للإجابة على أكبر عدد ممكن!");
    } else if (gameType === 'hero') {
        document.getElementById('game-title').textContent = "🏆 لعبة البطل ضد الوقت";
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak("بدأت لعبة البطل ضد الوقت. الإجابة الخاطئة تنهي اللعبة، حاول كسر رقمك القياسي!");
    } else if (gameType === 'pvp') {
        document.getElementById('game-title').textContent = "⚔️ المبارزة الثنائية المباشرة (PvP)";
        document.getElementById('game-timer-wrapper').classList.remove('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        speak("بدأت المبارزة مع زميلك المحاكى ماجد الشريف. الأسرع في الإجابة يفوز بالدورة!");
    } else if (gameType === 'ai-story') {
        document.getElementById('game-title').textContent = "📖 الحكواتي الذكي التفاعلي (مغامرات مغطاة بالمنهج) ✨";
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        startAiStoryRound(null);
    }

    if (gameType !== 'hero' && gameType !== 'ai-story') {
        gameTimerInterval = setInterval(() => {
            gameTimeLeft -= 1;
            document.getElementById('game-timer').textContent = gameTimeLeft;
            if (gameTimeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
    setTimeout(setupAccessibleVoices, 200);
}

const randomMathQuestions = [
    { q: "العدد 9 هو مربع العدد 3؟", a: true },
    { q: "الأكسجين يمثل المكون الأساسي لغاز النيتروجين؟", a: false },
    { q: "المجموع الكلي لزوايا المثلث يساوي 180 درجة؟", a: true },
    { q: "الصيغة الكيميائية لملح الطعام هي H2O؟", a: false },
    { q: "الأرض تدور حول الشمس دورة كاملة كل 365 يوماً؟", a: true }
];

function startNewGameRound() {
    const randomIndex = Math.floor(Math.random() * randomMathQuestions.length);
    const questionData = randomMathQuestions[randomIndex];

    document.getElementById('game-question').textContent = questionData.q;
    currentCorrectAnswer = questionData.a;

    speak(questionData.q);
}

function answerGame(userAnswer) {
    if (userAnswer === currentCorrectAnswer) {
        currentGameScore += 10;
        document.getElementById('game-score').textContent = currentGameScore;

        playSuccessChime();
        speak("أحسنت! إجابة صحيحة.");

        startNewGameRound();
    } else {
        playFailChime();
        if (activeGameType === 'hero') {
            speak(`للأسف الإجابة خاطئة. انتهت اللعبة وحققت رصيد بطل يبلغ ${currentGameScore} نقطة.`);
            endGame();
        } else {
            speak("إجابة خاطئة، حاول مجدداً مع السؤال التالي.");
            startNewGameRound();
        }
    }
}

function endGame() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    document.getElementById('active-game-panel').classList.add('hidden');
    speak(`انتهت اللعبة بنجاح! نتيجتك النهائية هي ${currentGameScore} نقطة. رائع جداً يا بطل!`);
}

function playSuccessChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { console.log(e); }
}

function playFailChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { console.log(e); }
}

function startAITutorSpeech() {
    if (speechRecognizer) {
        speechRecognizer.start();
    } else {
        speak("الإدخال الصوتي غير متاح حالياً.");
    }
}

function speakAITutorResponse() {
    const responseText = document.getElementById('ai-tutor-response-text').textContent;
    speak(responseText);
}

async function gradeSubmissionWithAI(index) {
    const sub = localData.submissions[index];
    if (!sub) return;

    speak("جاري قياس جودة إجابة الطالب عبر المصحح المؤتمت للذكاء الاصطناعي.");

    const prompt = `قارن إجابة الطالب: "${sub.studentAnswer}" مع السؤال المقالي وصححه إملائياً ولغوياً وقدم تقريراً من سطرين متضمناً الدرجة المقترحة (من 100) مع الكلمات المشجعة للطالب الكفيف.`;

    try {
        const report = await callGeminiAPI(prompt, "أنت مصحح ومعلم تربوي للتعليم الفني والمدمج.");
        sub.initialScore = 95;
        sub.graderFeedback = report;

        renderTeacherSubmissions();
        speak("تم إنهاء التقييم الذكي بنجاح وتحديث واجهة المعلم.");
    } catch (e) {
        speak("فشل الاتصال بالمصحح التلقائي.");
    }
}

function toggleTeacherQuizType() {
    const type = document.getElementById('teacher-quiz-type').value;
    if (type === 'mcq') {
        document.getElementById('teacher-mcq-fields').classList.remove('hidden');
        document.getElementById('teacher-text-fields').classList.add('hidden');
    } else {
        document.getElementById('teacher-mcq-fields').classList.add('hidden');
        document.getElementById('teacher-text-fields').classList.remove('hidden');
    }
}

function handleTeacherAddBook(e) {
    e.preventDefault();
    const title = document.getElementById('teacher-book-title').value;
    const content = document.getElementById('teacher-book-content').value;
    const audio = document.getElementById('teacher-book-audio').value;

    const newBook = { id: 'b' + (localData.books.length + 1), title, content, audio };
    localData.books.push(newBook);

    saveBookToFirebase(newBook);
    speak("تم نشر الكتاب والمقرر بنجاح لجميع طلابك.");
    e.target.reset();
}

function handleTeacherAddQuiz(e) {
    e.preventDefault();
    const title = document.getElementById('teacher-quiz-title').value;
    const type = document.getElementById('teacher-quiz-type').value;

    let newQuiz = { id: 'a' + (localData.assignments.length + 1), title, type };

    if (type === 'mcq') {
        newQuiz.question = document.getElementById('teacher-quiz-q').value;
        newQuiz.options = {
            A: document.getElementById('teacher-quiz-oa').value,
            B: document.getElementById('teacher-quiz-ob').value,
            C: document.getElementById('teacher-quiz-oc').value,
            D: document.getElementById('teacher-quiz-od').value
        };
        newQuiz.correct = document.getElementById('teacher-quiz-correct').value;
    } else {
        newQuiz.question = document.getElementById('teacher-quiz-text-q').value;
        newQuiz.ideal = document.getElementById('teacher-quiz-ideal-ans').value;
    }

    localData.assignments.push(newQuiz);
    saveQuizToFirebase(newQuiz);
    speak("تم نشر الواجب والاختبار بنجاح للطلاب.");
    e.target.reset();
}

function renderTeacherSubmissions() {
    const tbody = document.getElementById('teacher-submissions-tbody');
    tbody.innerHTML = '';

    if (localData.submissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center">لا توجد إجابات مرفوعة من الطلاب حتى الآن.</td></tr>`;
        return;
    }

    localData.submissions.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3 border border-current font-bold">${s.studentName}</td>
            <td class="p-3 border border-current">${s.quizTitle}</td>
            <td class="p-3 border border-current font-mono text-xs">${s.studentAnswer}</td>
            <td class="p-3 border border-current">
                <span class="font-bold text-yellow-400">الدرجة: ${s.initialScore}</span><br>
                <span class="text-xs text-gray-300 block max-w-xs overflow-hidden text-ellipsis">${s.graderFeedback}</span>
            </td>
            <td class="p-3 border border-current">
                <button data-action="grade-ai" data-index="${idx}" class="px-2 py-1 bg-purple-600 text-white font-bold rounded text-xs btn-interactive">🤖 تصحيح وتغذية AI</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="grade-ai"]');
        if (btn) gradeSubmissionWithAI(parseInt(btn.dataset.index));
    });
}

// ==================== واجهة ولي الأمر ====================

function renderParentDashboard() {
    const list = document.getElementById('parent-grades-list');
    list.innerHTML = '';

    const linkedContact = currentUserSession?.childContact || "0555555555";
    const childSubmissions = localData.submissions.filter(s => s.studentContact === linkedContact || s.parentContact === currentUserSession?.contact);

    const childName = childSubmissions.length > 0 ? childSubmissions[0].studentName : "عبد الرحمن الشمري (حساب مرتبط)";
    document.getElementById('parent-linked-child-name').textContent = childName;

    if (childSubmissions.length === 0) {
        list.innerHTML = `<p class="p-4 text-center text-yellow-400">لا توجد درجات مسجلة للابن ${childName} حالياً. قم بحل بعض الواجبات بحساب الطالب لتراها هنا.</p>`;
        return;
    }

    childSubmissions.forEach(s => {
        const item = document.createElement('div');
        item.className = 'p-4 border-2 border-current rounded-xl flex justify-between items-center';
        item.innerHTML = `
            <div>
                <h4 class="font-bold text-xl">${s.quizTitle}</h4>
                <p class="text-xs text-gray-300">وقت الحل: ${s.timestamp}</p>
            </div>
            <span class="text-2xl font-black text-yellow-400">${s.initialScore} / 100</span>
        `;
        list.appendChild(item);
    });
}

// ==================== واجهة الإدارة ====================

function handleAdminCreateStudent(e) {
    e.preventDefault();
    const name = document.getElementById('admin-student-name').value;
    const grade = document.getElementById('admin-student-grade').value;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const newStudent = { name, grade, pin };
    localData.students.push(newStudent);
    saveStudentToFirebase(newStudent);

    speak(`تم إنشاء حساب جديد للطالب ${name}. ورمز الدخول الخاص به هو ${pin}.`);
    e.target.reset();
    renderAdminDashboard();
}

function renderAdminDashboard() {
    const tbody = document.getElementById('admin-students-tbody');
    tbody.innerHTML = '';

    localData.students.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2 border font-bold">${s.name}</td>
            <td class="p-2 border">${s.grade}</td>
            <td class="p-2 border font-mono font-black text-lg tracking-widest text-yellow-400 text-center">${s.pin}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== Firebase ====================

function initFirebase() {
    if (Object.keys(firebaseConfig).length > 0) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        // تفعيل الأوفلاين
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('Multiple tabs open, offline persistence disabled.');
            } else if (err.code == 'unimplemented') {
                console.warn('Browser does not support offline persistence.');
            }
        });

        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                const userIdDisplay = document.getElementById('user-id-display');
                if (userIdDisplay) {
                    userIdDisplay.textContent = `ID: ${userId.substring(0, 8)}`;
                }
                syncFromFirebase();
            } else {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (e) {
                    console.error("Authentication failed: ", e);
                }
            }
        });
    }
}

async function saveBookToFirebase(book) {
    if (!isAuthReady || !db) return;
    try {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'curriculum_modules');
        await addDoc(colRef, { ...book, createdAt: serverTimestamp() });
    } catch (e) { console.error(e); }
}

async function saveQuizToFirebase(quiz) {
    if (!isAuthReady || !db) return;
    try {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'assignments');
        await addDoc(colRef, { ...quiz, createdAt: serverTimestamp() });
    } catch (e) { console.error(e); }
}

async function saveSubmissionToFirebase(sub) {
    if (!isAuthReady || !db) return;
    try {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'submissions');
        await addDoc(colRef, { ...sub, userId: userId, createdAt: serverTimestamp() });
    } catch (e) { console.error(e); }
}

async function saveStudentToFirebase(student) {
    if (!isAuthReady || !db) return;
    try {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
        await addDoc(colRef, { ...student, createdAt: serverTimestamp() });
    } catch (e) { console.error(e); }
}

async function syncFromFirebase() {
    if (!isAuthReady || !db) return;

    try {
        const booksCol = collection(db, 'artifacts', appId, 'public', 'data', 'curriculum_modules');
        onSnapshot(booksCol, (snapshot) => {
            let cloudBooks = [];
            snapshot.forEach(doc => cloudBooks.push({ id: doc.id, ...doc.data() }));
            if (cloudBooks.length > 0) {
                localData.books = cloudBooks;
                // [إصلاح #3] استخدام classList.contains بدلاً من style.display
                if (!document.getElementById('student-sub-books').classList.contains('hidden')) {
                    renderStudentBooks();
                }
            }
        }, (err) => console.log(err));

        const quizCol = collection(db, 'artifacts', appId, 'public', 'data', 'assignments');
        onSnapshot(quizCol, (snapshot) => {
            let cloudQuizzes = [];
            snapshot.forEach(doc => cloudQuizzes.push({ id: doc.id, ...doc.data() }));
            if (cloudQuizzes.length > 0) {
                localData.assignments = cloudQuizzes;
                if (!document.getElementById('student-sub-assignments').classList.contains('hidden')) {
                    renderStudentAssignments();
                }
            }
        }, (err) => console.log(err));

        const subCol = collection(db, 'artifacts', appId, 'public', 'data', 'submissions');
        onSnapshot(subCol, (snapshot) => {
            let cloudSubs = [];
            snapshot.forEach(doc => cloudSubs.push(doc.data()));
            if (cloudSubs.length > 0) {
                localData.submissions = cloudSubs;
                renderTeacherSubmissions();
                renderParentDashboard();
            }
        }, (err) => console.log(err));

    } catch (e) { console.error("مزامنة Firestore غير مكتملة: ", e); }
}

// ==================== [إصلاح #11] ربط الأحداث عبر addEventListener ====================

function bindAllEvents() {
    // Header controls
    document.getElementById('tts-engine-toggle')?.addEventListener('click', toggleTtsEngine);
    document.getElementById('audio-co-pilot-toggle')?.addEventListener('click', toggleAudioCoPilot);

    // Theme buttons
    document.querySelectorAll('[data-theme]').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    // Text size
    document.querySelectorAll('[data-size-dir]').forEach(btn => {
        btn.addEventListener('click', () => adjustTextSize(parseInt(btn.dataset.sizeDir)));
    });

    // Logout
    document.querySelector('[data-action="logout"]')?.addEventListener('click', logout);

    // Registration
    document.getElementById('reg-role')?.addEventListener('change', toggleRegFields);
    document.getElementById('reg-age')?.addEventListener('input', checkAgeLimitations);
    document.querySelector('[data-action="auth-form"]')?.addEventListener('submit', handleRegistrationSubmit);
    document.querySelector('[data-action="bypass-demo"]')?.addEventListener('click', bypassAuthDemo);

    // Role switcher
    document.querySelectorAll('[data-role-switch]').forEach(btn => {
        btn.addEventListener('click', () => switchRole(btn.dataset.roleSwitch));
    });

    // Student sections
    document.querySelectorAll('[data-student-section]').forEach(btn => {
        btn.addEventListener('click', () => openStudentSection(btn.dataset.studentSection));
    });
    document.querySelector('[data-action="close-section"]')?.addEventListener('click', closeStudentSection);

    // Audiobook player
    document.querySelector('[data-action="audiobook-tts"]')?.addEventListener('click', readActiveBookWithAi);
    document.querySelector('[data-action="summarize-book"]')?.addEventListener('click', summarizeCurriculumBookWithAI);
    document.querySelector('[data-action="audiobook-stop"]')?.addEventListener('click', () => controlAudiobook('stop'));

    // Quiz options
    ['A', 'B', 'C', 'D'].forEach(opt => {
        document.getElementById(`btn-opt-${opt}`)?.addEventListener('click', () => selectQuizOption(opt));
    });
    document.querySelector('[data-action="submit-quiz"]')?.addEventListener('click', submitQuizAnswer);

    // Speech to text
    document.getElementById('btn-mic-input')?.addEventListener('click', toggleAudioRecording);
    // Bind AI Tutor mic button if it exists
    document.getElementById('btn-ai-mic')?.addEventListener('click', toggleAudioRecording);

    // Braille keyboards
    document.querySelector('[data-action="toggle-screen-braille"]')?.addEventListener('click', () => toggleBrailleKeyboard('screen'));
    document.querySelector('[data-action="toggle-perkins"]')?.addEventListener('click', () => toggleBrailleKeyboard('perkins'));
    document.querySelector('[data-action="braille-evaluate"]')?.addEventListener('click', translateAndEvaluateBrailleWithAI);

    // Screen Reader Mode Toggle
    document.getElementById('btn-screen-reader-mode')?.addEventListener('click', toggleScreenReaderMode);

    // Save API Key
    document.getElementById('btn-save-api-key')?.addEventListener('click', () => {
        const key = document.getElementById('admin-api-key-input').value.trim();
        localStorage.setItem('geminiApiKey', key);
        alert('تم حفظ المفتاح محلياً بنجاح!');
    });

    // Screen braille dots
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`dot-${i}`)?.addEventListener('click', () => toggleBrailleDot(i));
    }
    document.querySelector('[data-action="enter-braille"]')?.addEventListener('click', enterBrailleChar);
    document.querySelector('[data-action="clear-braille"]')?.addEventListener('click', clearBrailleDots);
    document.querySelector('[data-action="add-space"]')?.addEventListener('click', addSpaceToAnswer);
    document.querySelector('[data-action="delete-char"]')?.addEventListener('click', deleteLastChar);

    // Cheat sheet braille dots
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`cheat-dot-${i}`)?.addEventListener('click', () => toggleCheatDot(i));
    }
    document.querySelector('[data-action="pronounce-cheat"]')?.addEventListener('click', pronounceCheatBraille);
    document.querySelector('[data-action="clear-cheat"]')?.addEventListener('click', clearCheatDots);

    // Games
    document.querySelectorAll('[data-game-type]').forEach(btn => {
        btn.addEventListener('click', () => initGame(btn.dataset.gameType));
    });
    document.querySelector('[data-action="answer-true"]')?.addEventListener('click', () => answerGame(true));
    document.querySelector('[data-action="answer-false"]')?.addEventListener('click', () => answerGame(false));

    // AI Tutor
    document.querySelector('[data-action="ai-tutor-speech"]')?.addEventListener('click', startAITutorSpeech);
    document.querySelector('[data-action="ask-ai"]')?.addEventListener('click', askAITutor);
    document.querySelector('[data-action="speak-ai-response"]')?.addEventListener('click', speakAITutorResponse);

    // Teacher
    document.getElementById('teacher-quiz-type')?.addEventListener('change', toggleTeacherQuizType);
    document.querySelector('[data-action="generate-ai-quiz"]')?.addEventListener('click', generateAIQuiz);
    document.querySelector('[data-action="teacher-book-form"]')?.addEventListener('submit', handleTeacherAddBook);
    document.querySelector('[data-action="teacher-quiz-form"]')?.addEventListener('submit', handleTeacherAddQuiz);

    // Admin
    document.querySelector('[data-action="admin-student-form"]')?.addEventListener('submit', handleAdminCreateStudent);

    // Vision
    document.getElementById('vision-image-input')?.addEventListener('change', previewVisionImage);
    document.querySelector('[data-action="analyze-image"]')?.addEventListener('click', analyzeImageWithGemini);
    document.querySelector('[data-action="speak-vision"]')?.addEventListener('click', speakVisionResponse);
}

// ==================== تهيئة التطبيق ====================

window.onload = function () {
    initFirebase();
    // initSpeechRecognition(); // Removed in favor of MediaRecorder + Gemini
    setupAccessibleVoices();
    setupPerkinsKeyboard();
    toggleRegFields();
    
    // Load saved API key into input if it exists
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) {
        const keyInput = document.getElementById('admin-api-key-input');
        if (keyInput) keyInput.value = savedKey;
    }
    bindAllEvents();

    speak("مرحباً بك في منصة كلاود سكول التعليمية المحدثة لضعاف البصر والمكفوفين. يرجى تسجيل الدخول أولاً للبدء.");
};
