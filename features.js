// =============================================================================
// ميزات منصة Cloud School الجديدة
// 1. الفصل الذكي الحواري (Dialogic Learning)
// 2. المذاكر الجماعي الصوتي (Audio Study Groups)
// =============================================================================

// ===================== المساعد الصوتي للمتصفح (Speech-to-Text) =====================
let speechRecognition = null;
let isSpeechRecognitionActive = false;

function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        speak("التعرف على الصوت غير مدعوم في هذا المتصفح.");
        return null;
    }
    const rec = new SR();
    rec.lang = 'ar-SA';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    return rec;
}

function startMicrophone() {
    if (!speechRecognition) {
        speechRecognition = initSpeechRecognition();
        if (!speechRecognition) return null;
        speechRecognition.onresult = handleSpeechResult;
        speechRecognition.onerror = handleSpeechError;
        speechRecognition.onend = handleSpeechEnd;
    }
    try {
        speechRecognition.start();
        isSpeechRecognitionActive = true;
        return speechRecognition;
    } catch (e) {
        speak("خطأ في تشغيل الميكروفون.");
        return null;
    }
}

let currentSpeechCallback = null;

function handleSpeechResult(event) {
    isSpeechRecognitionActive = false;
    const transcript = event.results[0][0].transcript;
    if (currentSpeechCallback) {
        currentSpeechCallback(transcript);
        currentSpeechCallback = null;
    }
}

function handleSpeechError(event) {
    isSpeechRecognitionActive = false;
    const msg = event.error === 'no-speech' ? 'لم يتم التقاط أي صوت.' :
                event.error === 'aborted' ? '' :
                'حدث خطأ في التعرف على الصوت.';
    if (msg) speak(msg);
    if (currentSpeechCallback) {
        currentSpeechCallback(null);
        currentSpeechCallback = null;
    }
}

function handleSpeechEnd() {
    isSpeechRecognitionActive = false;
}

function listenForSpeech(callback, timeoutMs = 10000) {
    currentSpeechCallback = callback;
    const rec = startMicrophone();
    if (!rec) {
        if (callback) callback(null);
        return;
    }
    if (timeoutMs > 0) {
        setTimeout(() => {
            if (isSpeechRecognitionActive) {
                try { speechRecognition.stop(); } catch(e) {}
                isSpeechRecognitionActive = false;
                if (currentSpeechCallback) {
                    currentSpeechCallback(null);
                    currentSpeechCallback = null;
                }
            }
        }, timeoutMs);
    }
}

// ===================== الفصل الذكي الحواري =====================
let dialogicRunning = false;
let dialogicSubject = '';
let dialogicHistory = [];

const DIALOGIC_SYSTEM_PROMPT = `أنت مدرس خصوصي ذكي ومتخصص في التعليم للحوار الصوتي التفاعلي (Socratic Method). 
مهمتك: طرح أسئلة تعليمية متدرجة، الاستماع لإجابات الطالب، وتكييف صعوبة الأسئلة حسب مستوى فهمه.

القواعد:
1. ابدأ بسؤال افتتاحي بسيط عن الموضوع
2. بعد كل إجابة، قيّم الفهم (ممتاز/جيد/ضعيف)
3. لو الإجابة صحيحة→ اطرح سؤالاً أعمق
4. لو الإجابة ناقصة→ اشرح المعلومة بطريقة مبسطة ثم اسأل مرة أخرى
5. لو الإجابة خاطئة→ قدّم شرحاً تمهيدياً ثم اسأل سؤالاً أسهل
6. استخدم لغة عربية فصحى مبسطة ومناسبة للطلاب المكفوفين
7. اجعل كل رد قصيراً ومناسباً للنطق الصوتي (لا يزيد عن 3 جمل)
8. في نهاية كل رد، اطرح سؤالاً واحداً واضحاً
9. خاطب الطالب ب"أنت" وبأسلوب مشجع

صيغة الرد المطلوبة (JSON):
{
  "assessment": "ممتاز|جيد|ضعيف",
  "explanation": "شرح مختصر أو تعليق على إجابة الطالب",
  "question": "السؤال التالي للطالب",
  "type": "open|choice|truefalse"
}

تذكر: أنت مدرس صوتي، ردودك ستقرأ بصوت عالٍ للطالب الكفيف.`;

function updateDialogicStatus(text, isGreen = true) {
    const bar = document.getElementById('dialogic-status-text');
    if (bar) {
        bar.textContent = text;
        bar.className = 'text-lg font-bold ' + (isGreen ? 'text-green-400' : 'text-yellow-400');
    }
}

function addDialogicEntry(role, text) {
    const transcript = document.getElementById('dialogic-transcript');
    if (!transcript) return;
    const entry = document.createElement('div');
    const roleLabel = role === 'ai' ? '🤖 المدرس' : '🎤 الطالب';
    const color = role === 'ai' ? 'text-green-400' : 'text-blue-400';
    entry.className = `p-3 rounded-lg ${role === 'ai' ? 'bg-slate-800' : 'bg-slate-900 border border-blue-800'}`;
    entry.innerHTML = `<span class="font-bold ${color}">${roleLabel}:</span> <span class="text-white">${escapeHtml(text)}</span>`;
    transcript.appendChild(entry);
    entry.scrollIntoView({ behavior: 'smooth' });
}

function clearDialogicTranscript() {
    const transcript = document.getElementById('dialogic-transcript');
    if (transcript) transcript.innerHTML = '';
}

async function startDialogicClassroom() {
    if (dialogicRunning) return;
    dialogicRunning = true;
    dialogicHistory = [];

    document.getElementById('btn-dialogic-start').classList.add('hidden');
    document.getElementById('btn-dialogic-stop').classList.remove('hidden');
    document.getElementById('dialogic-conversation').classList.remove('hidden');
    clearDialogicTranscript();

    updateDialogicStatus('🎙️ المدرس الذكي يبدأ الدرس...');
    speak("مرحباً بك في الفصل الذكي. أنا مدرسك الخصوصي. سأطرح عليك أسئلة وأستمع لإجاباتك. اختر موضوعاً للدرس، أو سأبدأ بسؤال عام.");
    addDialogicEntry('ai', 'مرحباً بك في الفصل الذكي! أنا مدرسك الخصوصي.');

    // Ask for subject first
    updateDialogicStatus('🎤 تكلّم الآن لاختيار موضوع الدرس (أو انتظر 15 ثانية لبدء تلقائي)');
    document.getElementById('dialogic-voice-status').textContent = 'تحدث الآن لاختيار الموضوع...';

    const subject = await new Promise((resolve) => {
        listenForSpeech((text) => {
            resolve(text || 'العلوم العامة');
        }, 15000);
    });

    dialogicSubject = subject || 'العلوم العامة';
    addDialogicEntry('student', dialogicSubject);
    updateDialogicStatus(`📚 الموضوع: ${dialogicSubject}`);
    speak(`رائع! سنتحدث اليوم عن: ${dialogicSubject}. لنبدأ!`);

    await runDialogicLoop();
}

async function runDialogicLoop() {
    if (!dialogicRunning) return;

    // Generate first question using Gemini
    const firstPrompt = `الموضوع: "${dialogicSubject}". اطرح أول سؤال تعليمي للطالب.`;
    try {
        const result = await callGeminiAPI(firstPrompt, DIALOGIC_SYSTEM_PROMPT);
        const parsed = parseDialogicResponse(result);
        if (!parsed) throw new Error('Failed to parse');

        await askDialogicQuestion(parsed);
    } catch (e) {
        // Fallback: ask a generic question
        await askDialogicQuestion({
            assessment: 'جيد',
            explanation: 'لنبدأ بسؤال بسيط.',
            question: `ماذا تعرف عن ${dialogicSubject}؟`,
            type: 'open'
        });
    }
}

function parseDialogicResponse(text) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch(e) {}
    // Fallback: treat the whole text as an open question
    return {
        assessment: 'جيد',
        explanation: '',
        question: text,
        type: 'open'
    };
}

async function askDialogicQuestion(parsed) {
    if (!dialogicRunning) return;

    const questionText = parsed.question || parsed.explanation || 'ماذا تعرف عن هذا الموضوع؟';
    addDialogicEntry('ai', questionText);
    speak(questionText);

    updateDialogicStatus('🎤 تكلّم الآن للإجابة على السؤال');
    document.getElementById('dialogic-voice-status').textContent = 'المدرس يتحدث... انتظر حتى ينتهي ثم أجب.';

    // Wait for AI to finish speaking, then listen
    await waitForSpeechEnd(2000);

    updateDialogicStatus('🎤 استمع لإجابة الطالب...');
    document.getElementById('dialogic-voice-status').textContent = 'تحدث الآن للإجابة.';

    listenForSpeech(async (studentAnswer) => {
        if (!dialogicRunning) return;

        if (!studentAnswer || studentAnswer.trim() === '') {
            speak("لم أسمع إجابتك. هل يمكنك تكرارها؟");
            updateDialogicStatus('🎤 لم نسمع الإجابة. حاول مرة أخرى.');
            // Try again
            listenForSpeech(async (retry) => {
                if (retry && retry.trim()) {
                    await processStudentAnswer(retry);
                } else {
                    // Give up and continue
                    await processStudentAnswer('لا أجيب');
                }
            }, 15000);
            return;
        }

        await processStudentAnswer(studentAnswer);
    }, 30000);
}

async function processStudentAnswer(answer) {
    if (!dialogicRunning) return;

    addDialogicEntry('student', answer);
    updateDialogicStatus('🤖 المدرس يقيم الإجابة ويحضّر السؤال التالي...');
    speak("دعني أفكر في إجابتك...");

    dialogicHistory.push({ role: 'student', content: answer });

    const historyText = dialogicHistory.map(h =>
        h.role === 'ai' ? `المدرس: ${h.content}` : `الطالب: ${h.content}`
    ).join('\n');

    const prompt = `الموضوع: "${dialogicSubject}"
تاريخ الحوار:
${historyText}

الآن، قيّم آخر إجابة للطالب واطرح السؤال التالي حسب مستواه.`;

    try {
        const result = await callGeminiAPI(prompt, DIALOGIC_SYSTEM_PROMPT);
        const parsed = parseDialogicResponse(result);

        dialogicHistory.push({ role: 'ai', content: parsed.question || parsed.explanation });

        // Check if we should continue or wrap up
        if (dialogicHistory.length >= 12) {
            await wrapUpDialogicSession();
            return;
        }

        await askDialogicQuestion(parsed);
    } catch (e) {
        speak("عذراً، حدث خطأ في الاتصال. دعني أواصل بطرح سؤال آخر.");
        await askDialogicQuestion({
            assessment: 'جيد',
            explanation: 'دعنا ننتقل إلى سؤال آخر.',
            question: `أخبرني المزيد عن ${dialogicSubject}. ماذا تعلمت عنه؟`,
            type: 'open'
        });
    }
}

async function wrapUpDialogicSession() {
    if (!dialogicRunning) return;
    dialogicRunning = false;

    const summaryPrompt = `الطالب درس موضوع "${dialogicSubject}" في جلسة حوارية. 
الحوار كاملاً:
${dialogicHistory.map(h => `${h.role}: ${h.content}`).join('\n')}

قدّم ملخصاً تقييمياً من سطرين: مستوى الفهم، نقاط القوة، نقاط الضعف، ونصيحة للطالب.`;

    try {
        const summary = await callGeminiAPI(summaryPrompt, 'أنت معلم خبير');
        speak(`لنلخص ما تعلمناه اليوم. ${summary}. شكراً لك على المشاركة النشطة في الفصل الذكي!`);
        addDialogicEntry('ai', `📋 تقييم الجلسة: ${summary}`);
    } catch(e) {
        speak("شكراً لك! كانت جلسة رائعة. يمكنك العودة في أي وقت لمزيد من التعلم.");
    }

    updateDialogicStatus('✅ انتهت الجلسة. اضغط "بدء الفصل الذكي" لجلسة جديدة.');
    document.getElementById('btn-dialogic-start').classList.remove('hidden');
    document.getElementById('btn-dialogic-stop').classList.add('hidden');
    document.getElementById('dialogic-voice-status').textContent = 'انتهت الجلسة.';
}

function stopDialogicClassroom() {
    dialogicRunning = false;
    if (isSpeechRecognitionActive) {
        try { speechRecognition.stop(); } catch(e) {}
    }
    currentSpeechCallback = null;
    updateDialogicStatus('🛑 تم إنهاء الجلسة.');
    document.getElementById('btn-dialogic-start').classList.remove('hidden');
    document.getElementById('btn-dialogic-stop').classList.add('hidden');
    document.getElementById('dialogic-voice-status').textContent = 'جلسة منتهية.';
    speak("تم إنهاء الجلسة.");
}

// ===================== المذاكر الجماعي الصوتي =====================
let studyGroupRunning = false;
let studyGroupTopic = '';
let studyGroupHistory = [];
let studyGroupStudentCount = 3;
let studyGroupCurrentStudent = 0;

const STUDY_GROUP_SYSTEM_PROMPT = `أنت وسيط ذكي ومشرف على جلسة مذاكرة جماعية صوتية لطلاب مكفوفين.
مهمتك:
1. اطرح سؤالاً نقاشياً مفتوحاً حول الموضوع المختار
2. وجّه السؤال لطالب معين بالاسم
3. بعد إجابة كل طالب، قدّم تغذية راجعة قصيرة وشجّع الطلاب الآخرين على المشاركة
4. اجمع بين الإجابات واطرح أسئلة أعمق
5. في النهاية، لخّص النقاط الرئيسية التي توصلت لها المجموعة
6. استخدم لغة عربية فصحى بسيطة
7. ردودك ستقرأ بصوت عالٍ للطلاب

الطلاب في الجلسة: "فهد"، "سارة"، "محمد"

صيغة الرد (JSON):
{
  "feedback": "تغذية راجعة قصيرة على آخر إجابة",
  "nextSpeaker": "فهد|سارة|محمد",
  "question": "السؤال أو التوجيه للطالب التالي",
  "type": "discussion"
}`;

const STUDENT_NAMES = ['فهد', 'سارة', 'محمد'];

function updateStudyGroupStatus(text, isPurple = true) {
    const bar = document.getElementById('study-group-status-text');
    if (bar) {
        bar.textContent = text;
        bar.className = 'text-lg font-bold ' + (isPurple ? 'text-purple-400' : 'text-yellow-400');
    }
}

function addStudyGroupEntry(role, text) {
    const transcript = document.getElementById('study-group-transcript');
    if (!transcript) return;
    const entry = document.createElement('div');
    const roleLabel = role === 'ai' ? '🤖 الوسيط' : `🎤 ${role}`;
    const color = role === 'ai' ? 'text-purple-400' : 'text-blue-400';
    entry.className = `p-3 rounded-lg ${role === 'ai' ? 'bg-slate-800' : 'bg-slate-900 border border-blue-800'}`;
    entry.innerHTML = `<span class="font-bold ${color}">${roleLabel}:</span> <span class="text-white">${escapeHtml(text)}</span>`;
    transcript.appendChild(entry);
    entry.scrollIntoView({ behavior: 'smooth' });
}

function clearStudyGroupTranscript() {
    const transcript = document.getElementById('study-group-transcript');
    if (transcript) transcript.innerHTML = '';
}

async function startStudyGroup() {
    if (studyGroupRunning) return;
    studyGroupRunning = true;
    studyGroupCurrentStudent = 0;
    studyGroupHistory = [];

    const topicInput = document.getElementById('study-group-topic');
    studyGroupTopic = topicInput ? topicInput.value.trim() || 'العلوم العامة' : 'العلوم العامة';

    document.getElementById('btn-study-group-start').classList.add('hidden');
    document.getElementById('btn-study-group-stop').classList.remove('hidden');
    document.getElementById('study-group-conversation').classList.remove('hidden');
    clearStudyGroupTranscript();

    updateStudyGroupStatus(`👥 جلسة نقاش: ${studyGroupTopic}`);
    addStudyGroupEntry('ai', `مرحباً بالجميع! جلسة اليوم عن: ${studyGroupTopic}. لنبدأ!`);

    const intro = `مرحباً بالطلاب! أنا وسيطكم الذكي. سنناقش اليوم موضوع: ${studyGroupTopic}. 
المشاركون: فهد، سارة، محمد. سيأخذ كل منكم دوره في الكلام. ابدأ أنت يا فهد.`;

    speak(intro);

    // Start with first student
    await runStudyGroupTurn();
}

async function runStudyGroupTurn() {
    if (!studyGroupRunning) return;

    const currentName = STUDENT_NAMES[studyGroupCurrentStudent % 3];
    const historyText = studyGroupHistory.map(h => `${h.role}: ${h.content}`).join('\n');

    let prompt;
    if (studyGroupHistory.length === 0) {
        prompt = `الموضوع: "${studyGroupTopic}". اطرح سؤالاً افتتاحياً للطالب ${currentName} لبدء النقاش.`;
    } else {
        prompt = `الموضوع: "${studyGroupTopic}"
تاريخ الجلسة:
${historyText}

الآن دور ${currentName}. وجّه السؤال له.`;
    }

    updateStudyGroupStatus(`💬 ${currentName}، دورك الآن...`);

    try {
        const result = await callGeminiAPI(prompt, STUDY_GROUP_SYSTEM_PROMPT);
        const parsed = parseStudyGroupResponse(result);

        const questionText = parsed.question || `ماذا تعرف عن ${studyGroupTopic}؟`;
        addStudyGroupEntry('ai', `(${parsed.nextSpeaker || currentName}) ${questionText}`);
        speak(`سؤال لـ ${parsed.nextSpeaker || currentName}: ${questionText}`);

        await waitForSpeechEnd(2000);

        // Ask the user to speak as the current student
        updateStudyGroupStatus(`🎤 تحدث الآن بدور ${parsed.nextSpeaker || currentName}`);
        document.getElementById('study-group-voice-status').textContent =
            `اضغط "تحدث الآن" للرد بدور ${parsed.nextSpeaker || currentName}.`;

    } catch(e) {
        const questionText = `ماذا تعرف عن ${studyGroupTopic}؟`;
        addStudyGroupEntry('ai', `(${currentName}) ${questionText}`);
        speak(`سؤال لـ ${currentName}: ${questionText}`);

        updateStudyGroupStatus(`🎤 تحدث الآن بدور ${currentName}`);
        document.getElementById('study-group-voice-status').textContent =
            `اضغط "تحدث الآن" للرد بدور ${currentName}.`;
    }
}

function parseStudyGroupResponse(text) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch(e) {}
    return {
        feedback: '',
        nextSpeaker: STUDENT_NAMES[studyGroupCurrentStudent % 3],
        question: text,
        type: 'discussion'
    };
}

function handleStudyGroupSpeech() {
    if (!studyGroupRunning) return;

    updateStudyGroupStatus('🎤 جاري الاستماع...');
    document.getElementById('study-group-voice-status').textContent = 'تحدث الآن...';

    listenForSpeech(async (text) => {
        if (!studyGroupRunning) return;

        if (!text || text.trim() === '') {
            speak("لم أسمع الرد. حاول مرة أخرى.");
            return;
        }

        const currentName = STUDENT_NAMES[studyGroupCurrentStudent % 3];
        addStudyGroupEntry(currentName, text);
        studyGroupHistory.push({ role: currentName, content: text });

        studyGroupCurrentStudent++;

        // After all 3 students have spoken on this round, get AI summary
        if (studyGroupCurrentStudent >= 6) {
            await wrapUpStudyGroup();
            return;
        }

        await runStudyGroupTurn();
    }, 20000);
}

function skipStudyGroupTurn() {
    if (!studyGroupRunning) return;
    const currentName = STUDENT_NAMES[studyGroupCurrentStudent % 3];
    addStudyGroupEntry(currentName, '(تم التخطي)');
    studyGroupHistory.push({ role: currentName, content: 'لا يوجد رد' });
    studyGroupCurrentStudent++;

    if (studyGroupCurrentStudent >= 6) {
        wrapUpStudyGroup();
        return;
    }
    speak(`تم تخطي دور ${currentName}.`);
    runStudyGroupTurn();
}

async function wrapUpStudyGroup() {
    if (!studyGroupRunning) return;
    studyGroupRunning = false;

    const summaryPrompt = `لخّص جلسة المذاكرة الجماعية حول "${studyGroupTopic}".
الحوار:
${studyGroupHistory.map(h => `${h.role}: ${h.content}`).join('\n')}

قدّم ملخصاً تعليمياً من 3 جمل.`;

    try {
        const summary = await callGeminiAPI(summaryPrompt, 'أنت معلم خبير');
        speak(`ختام الجلسة. ${summary}. شكراً لكم جميعاً على المشاركة!`);
        addStudyGroupEntry('ai', `📋 ملخص الجلسة: ${summary}`);
    } catch(e) {
        speak("شكراً لكم جميعاً! كانت جلسة ممتازة.");
    }

    updateStudyGroupStatus('✅ انتهت الجلسة الجماعية.');
    document.getElementById('btn-study-group-start').classList.remove('hidden');
    document.getElementById('btn-study-group-stop').classList.add('hidden');
    document.getElementById('study-group-voice-status').textContent = 'جلسة منتهية.';
}

function stopStudyGroup() {
    studyGroupRunning = false;
    if (isSpeechRecognitionActive) {
        try { speechRecognition.stop(); } catch(e) {}
    }
    currentSpeechCallback = null;
    updateStudyGroupStatus('🛑 تم إنهاء الجلسة.');
    document.getElementById('btn-study-group-start').classList.remove('hidden');
    document.getElementById('btn-study-group-stop').classList.add('hidden');
    document.getElementById('study-group-voice-status').textContent = 'جلسة منتهية.';
    speak("تم إنهاء الجلسة الجماعية.");
}

// ===================== ربط مع الميزات القديمة =====================
// توفير speechRecognizer للمعلم الافتراضي القديم (cloud_school_app.js)
window.speechRecognizer = {
    start: function() {
        speak("تحدث الآن بعد الصافرة...");
        listenForSpeech(function(text) {
            if (text && text.trim()) {
                const queryField = document.getElementById('ai-tutor-query');
                if (queryField) {
                    queryField.value = text;
                    // Trigger the ask button
                    const askBtn = document.getElementById('btn-ask-ai');
                    if (askBtn) askBtn.click();
                }
            } else {
                speak("لم أسمع السؤال. حاول مرة أخرى.");
            }
        }, 15000);
    }
};

// ===================== أدوات مساعدة =====================
function waitForSpeechEnd(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===================== ربط الأزرار =====================
document.addEventListener('DOMContentLoaded', function() {
    // Dialogic Classroom
    const startBtn = document.getElementById('btn-dialogic-start');
    const stopBtn = document.getElementById('btn-dialogic-stop');
    const speakBtn = document.getElementById('btn-dialogic-speak');

    if (startBtn) startBtn.addEventListener('click', startDialogicClassroom);
    if (stopBtn) stopBtn.addEventListener('click', stopDialogicClassroom);
    if (speakBtn) {
        speakBtn.addEventListener('click', function() {
            if (dialogicRunning) {
                // Trigger listening manually
                updateDialogicStatus('🎤 استمع...');
                document.getElementById('dialogic-voice-status').textContent = 'تحدث الآن...';
                listenForSpeech(async (text) => {
                    if (text && text.trim()) {
                        await processStudentAnswer(text);
                    }
                }, 20000);
            }
        });
    }

    // Study Group
    const sgStartBtn = document.getElementById('btn-study-group-start');
    const sgStopBtn = document.getElementById('btn-study-group-stop');
    const sgSpeakBtn = document.getElementById('btn-study-group-speak');
    const sgNextBtn = document.getElementById('btn-study-group-next');

    if (sgStartBtn) sgStartBtn.addEventListener('click', startStudyGroup);
    if (sgStopBtn) sgStopBtn.addEventListener('click', stopStudyGroup);
    if (sgSpeakBtn) sgSpeakBtn.addEventListener('click', handleStudyGroupSpeech);
    if (sgNextBtn) sgNextBtn.addEventListener('click', skipStudyGroupTurn);
});
