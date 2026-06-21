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
 * 10. إعادة هيكلة إلى وحدات منفصلة (src/*.js)
 * 11. معالج أخطاء مركزي
 * 12. إدارة تركيز محسّنة
 */

// ==================== Module Imports ====================
import { initFirebase as initFirebaseModule, syncFromFirebase, saveBook, saveQuiz, saveSubmission, saveStudent } from './src/firebase.js';
import { initI18n, loadLocale, i18n, applyTranslations, getCurrentLang, setCurrentLang } from './src/i18n.js';
import { arabicBrailleMap as braileMap, getBrailleChar, getBraillePreview } from './src/braille.js';
import { speakWithGeminiTTS, transcribeAudio, describeImage, askTutor, summarizeBook, evaluateBraille, generateQuiz, generateStory, gradeAnswer, callGemini } from './src/gemini.js';
import { handleError, setupGlobalErrorHandler, wrapAsync } from './src/errors.js';
import * as ui from './src/ui.js';

// ==================== تهيئة المتغيرات العامة ====================
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cloud-school-blind-v1';

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

// متغيرات الصوت والسمات — تديرها ui module
let accessibleVoicesController = null;
// ==================== [إصلاح #9] Language Support (via module) ====================
// Uses imported i18n module functions — see ./src/i18n.js
loadLocale(getCurrentLang());
const langToggleBtn = document.getElementById('lang-toggle');
if (langToggleBtn) {
  langToggleBtn.addEventListener('click', () => {
    const newLang = getCurrentLang() === 'ar' ? 'en' : 'ar';
    setCurrentLang(newLang);
    loadLocale(newLang);
    langToggleBtn.textContent = newLang === 'ar' ? 'English' : 'العربية';
  });
  langToggleBtn.textContent = getCurrentLang() === 'ar' ? 'English' : 'العربية';
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

// ==================== دوال أمان ومنع XSS (via module) ====================
const escapeHtml = ui.escapeHtml;

// ==================== [إصلاح #5] دوال مؤشر التحميل (via module) ====================
const showLoadingSpinner = ui.showLoading;

// ==================== دوال النطق والصوت (via module) ====================

function showToast(text) {
    ui.showToast(text);
}

function speak(text) {
    ui.speak(text);
}
window.speak = speak;

function toggleTtsEngine() {
    ui.toggleTtsEngine();
    // Sync the local variable
    ttsEngineMode = ui.ttsEngineMode;
}

function toggleScreenReaderMode() {
    ui.toggleScreenReaderMode();
    screenReaderMode = ui.screenReaderMode;
}

async // TTS, Audio, and conversion functions — managed by src/ui.js and src/gemini.js modules

function setupAccessibleVoices() {
    ui.setupAccessibleVoices();
}

function toggleAudioCoPilot() {
    ui.toggleAudioCoPilot();
}

function adjustTextSize(direction) {
    ui.adjustTextSize(direction);
}

function setTheme(theme) {
    ui.setTheme(theme);
}

function toggleAudioRecording() {
    ui.toggleAudioRecording();
    isRecording = ui.getIsRecording();
}

// Audio transcription — managed by src/ui.js module

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
    } else if (role === 'admin') {
        ageField.classList.add('hidden');
        document.getElementById('reg-age').required = false;
        studentFields.classList.add('hidden');
        parentFields.classList.add('hidden');
        document.getElementById('reg-parent-contact').required = false;
    } else {
        ageField.classList.remove('hidden');
        document.getElementById('reg-age').required = true;
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

function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const warningBox = document.getElementById('auth-warning-box');
    const warningText = document.getElementById('auth-warning-text');
    warningBox.classList.add('hidden');

    if (!username || !password) {
        warningText.textContent = "يرجى إدخال اسم المستخدم وكلمة المرور.";
        warningBox.classList.remove('hidden');
        speak("يرجى إدخال اسم المستخدم وكلمة المرور.");
        return;
    }

    // Check saved accounts in localStorage
    const savedAccounts = JSON.parse(localStorage.getItem('cloudSchoolAccounts') || '[]');
    const account = savedAccounts.find(a => a.contact === username && a.password === password);

    if (account) {
        currentUserSession = account;
        document.getElementById('auth-gate').classList.add('hidden');
        document.getElementById('dev-role-bar').classList.remove('hidden');
        document.getElementById('active-user-badge').textContent = `المستخدم: ${account.name} (${getArabicRoleName(account.role)})`;
        switchRole(account.role);
        showToast(`أهلاً بك يا ${account.name} في Cloud School`);
    } else {
        warningText.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة. إذا لم يكن لديك حساب، اضغط على 'إنشاء حساب جديد'.";
        warningBox.classList.remove('hidden');
        speak("اسم المستخدم أو كلمة المرور غير صحيحة.");
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

    currentUserSession = { name, contact, role, age, parentContact, password: document.getElementById('reg-password-new').value };
    } else if (role === 'parent') {
        const childContact = document.getElementById('reg-child-contact').value.trim();
        currentUserSession = { name, contact, role, childContact, password: document.getElementById('reg-password-new').value };
    } else {
        currentUserSession = { name, contact, role, age, password: document.getElementById('reg-password-new').value };
    }

    // Save account to localStorage
    const savedAccounts = JSON.parse(localStorage.getItem('cloudSchoolAccounts') || '[]');
    savedAccounts.push(currentUserSession);
    localStorage.setItem('cloudSchoolAccounts', JSON.stringify(savedAccounts));

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
    // Show login form, hide register form
    document.getElementById('login-form-container').classList.remove('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
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

    // نقل التركيز إلى عنوان الواجهة الجديدة
    setTimeout(() => {
        setupAccessibleVoices();
        const viewMap = { student: 'student-welcome-msg', teacher: 'view-teacher', parent: 'view-parent', admin: 'view-admin' };
        const targetId = viewMap[role];
        if (targetId) {
            const el = document.getElementById(targetId);
            if (el && el.tagName === 'H2') el.focus();
        }
    }, 200);
}

async function callGeminiAPI(userQuery, systemPrompt, maxRetries = 5) {
    try {
        return await callGemini(userQuery, systemPrompt, maxRetries);
    } catch (error) {
        handleError('GeminiAPI', error);
        return "عذراً، تعذر الاتصال بخادم الذكاء الاصطناعي.";
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
        speak("الرجاء تحديد ملف صورة توضيحية أولاً.");
        return;
    }

    const responseBox = document.getElementById('vision-response-box');
    responseBox.classList.remove('hidden');
    showLoadingSpinner('vision-response-text', 'جاري تحليل الصورة...');
    speak("بدأ التحليل، يرجى الانتظار.");

    try {
        const description = await describeImage(uploadedImageBase64, uploadedImageMime);
        document.getElementById('vision-response-text').textContent = description;
        speak(description);
    } catch (error) {
        handleError('analyzeImage', error);
        document.getElementById('vision-response-text').textContent = "تعذر تحليل الصورة.";
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
    // تحسين إمكانية الوصول — نقل التركيز إلى عنوان القسم
    setTimeout(() => {
        setupAccessibleVoices();
        ui.focusElement('student-section-title');
    }, 200);
}

function closeStudentSection() {
    document.getElementById('student-section-container').classList.add('hidden');
    controlAudiobook('stop');
    // إعادة التركيز إلى زر القسم المفتوح سابقاً
    const sections = ['books', 'assignments', 'image-describer', 'games', 'ai-tutor'];
    const activeBtn = document.querySelector(`[data-student-section].bg-yellow-400`);
    if (activeBtn) {
        activeBtn.focus();
    } else {
        document.getElementById('main-content')?.focus();
    }
    speak("تم العودة إلى الشاشة الرئيسية للطالب.");
}

function renderStudentBooks() {
    const grid = document.getElementById('student-books-grid');
    grid.innerHTML = '';

    localData.books.forEach(b => {
        const item = document.createElement('div');
        item.className = 'card p-6 rounded-xl flex flex-col justify-between items-start gap-4';
        item.innerHTML = `
            <h4 class="text-2xl font-black">${escapeHtml(b.title)}</h4>
            <p class="text-sm line-clamp-3">${escapeHtml(b.content)}</p>
            <div class="flex gap-2 w-full flex-wrap">
                <button data-action="read-book" data-book-id="${escapeHtml(b.id)}" class="flex-1 p-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 btn-interactive">📖 قراءة بذكاء اصطناعي فائق</button>
                <button data-action="play-book" data-book-id="${escapeHtml(b.id)}" class="flex-1 p-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 btn-interactive">🎧 الاستماع للكتاب الصوتي</button>
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
                <h4 class="text-2xl font-black">${escapeHtml(a.title)}</h4>
                <span class="text-sm px-2 py-1 bg-yellow-400 text-black rounded font-bold">${a.type === 'mcq' ? 'اختبار اختيار من متعدد' : 'واجب مقالي نصي'}</span>
            </div>
            <button data-action="start-quiz" data-quiz-id="${escapeHtml(a.id)}" class="p-4 bg-green-600 text-white font-black text-lg rounded-xl hover:bg-green-500 large-touch-target btn-interactive">بدء الحل الفوري 🏁</button>
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
    ui.playSuccessChime();
}
function playFailChime() {
    ui.playFailChime();
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
            <td class="p-3 border border-current font-bold">${escapeHtml(s.studentName)}</td>
            <td class="p-3 border border-current">${escapeHtml(s.quizTitle)}</td>
            <td class="p-3 border border-current font-mono text-xs">${escapeHtml(s.studentAnswer)}</td>
            <td class="p-3 border border-current">
                <span class="font-bold text-yellow-400">الدرجة: ${escapeHtml(String(s.initialScore))}</span><br>
                <span class="text-xs text-gray-300 block max-w-xs overflow-hidden text-ellipsis">${escapeHtml(s.graderFeedback)}</span>
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
                <h4 class="font-bold text-xl">${escapeHtml(s.quizTitle)}</h4>
                <p class="text-xs text-gray-300">وقت الحل: ${escapeHtml(s.timestamp)}</p>
            </div>
            <span class="text-2xl font-black text-yellow-400">${escapeHtml(String(s.initialScore))} / 100</span>
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
    initFirebaseModule();
}

function saveBookToFirebase(book) { saveBook(book); }
function saveQuizToFirebase(quiz) { saveQuiz(quiz); }
function saveSubmissionToFirebase(sub) { saveSubmission(sub); }
function saveStudentToFirebase(student) { saveStudent(student); }

function syncFromFirebase() {
    syncFromFirebaseModule((collectionName, items) => {
        if (collectionName === 'books') {
            localData.books = items;
            if (!document.getElementById('student-sub-books')?.classList.contains('hidden')) {
                renderStudentBooks();
            }
        } else if (collectionName === 'assignments') {
            localData.assignments = items;
            if (!document.getElementById('student-sub-assignments')?.classList.contains('hidden')) {
                renderStudentAssignments();
            }
        } else if (collectionName === 'submissions') {
            localData.submissions = items;
            renderTeacherSubmissions();
            renderParentDashboard();
        }
    });
}

// ==================== [إصلاح #11] ربط الأحداث عبر addEventListener ====================

function updateProxyStatus() {
    ui.checkProxyHealth().then((ok) => {
        document.getElementById('proxy-status-icon').textContent = ok ? '🟢' : '🔴';
        const el = document.getElementById('proxy-status');
        if (el) {
            el.textContent = ok ? (i18n.proxyConnected || 'متصل') : (i18n.proxyDisconnected || 'غير متصل');
        }
    });
}

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

    // Login form
    document.querySelector('[data-action="login-form"]')?.addEventListener('submit', handleLoginSubmit);

    // Toggle between login and register
    document.getElementById('btn-show-register')?.addEventListener('click', () => {
        document.getElementById('login-form-container').classList.add('hidden');
        document.getElementById('register-form-container').classList.remove('hidden');
        document.getElementById('auth-warning-box').classList.add('hidden');
        speak("نموذج إنشاء حساب جديد. اختر نوع الحساب وأدخل بياناتك.");
    });
    document.getElementById('btn-show-login')?.addEventListener('click', () => {
        document.getElementById('register-form-container').classList.add('hidden');
        document.getElementById('login-form-container').classList.remove('hidden');
        document.getElementById('auth-warning-box').classList.add('hidden');
        speak("العودة لنموذج تسجيل الدخول.");
    });

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

    // Proxy health check
    const savedProxyUrl = localStorage.getItem('cloudSchoolProxyUrl');
    const proxyUrlInput = document.getElementById('proxy-url-input');
    if (proxyUrlInput) {
        proxyUrlInput.value = savedProxyUrl || 'http://127.0.0.1:3001';
    }
    updateProxyStatus();

    // Proxy URL save/reset
    document.getElementById('btn-save-proxy-url')?.addEventListener('click', () => {
        const val = document.getElementById('proxy-url-input')?.value.trim();
        if (val) {
            localStorage.setItem('cloudSchoolProxyUrl', val);
            updateProxyStatus();
            speak('تم حفظ رابط الخادم الوسيط');
        }
    });
    document.getElementById('btn-reset-proxy-url')?.addEventListener('click', () => {
        localStorage.removeItem('cloudSchoolProxyUrl');
        if (proxyUrlInput) proxyUrlInput.value = 'http://127.0.0.1:3001';
        updateProxyStatus();
        speak('تم إعادة تعيين رابط الخادم الوسيط إلى الإعدادات الافتراضية');
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
    // تهيئة معالج الأخطاء العام
    setupGlobalErrorHandler();

    // تحميل السمات وحجم الخط المحفوظ
    ui.loadTheme();
    ui.loadTextSize();

    // تهيئة Firebase
    initFirebase();

    // تهيئة الصوت وبرايل
    setupAccessibleVoices();
    setupPerkinsKeyboard();
    toggleRegFields();
    
    bindAllEvents();

    // تحسين إمكانية الوصول — إدارة التركيز
    document.addEventListener('section-opened', (e) => {
        const sectionTitle = document.getElementById('student-section-title');
        if (sectionTitle) setTimeout(() => sectionTitle.focus(), 100);
    });

    speak("مرحباً بك في منصة كلاود سكول التعليمية المحدثة لضعاف البصر والمكفوفين. يرجى تسجيل الدخول أولاً للبدء.");
};
