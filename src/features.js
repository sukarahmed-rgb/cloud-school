// =============================================================================
// ميزات منصة Cloud School الجديدة
// 1. الفصل الذكي الحواري (Dialogic Learning)
// 2. المذاكر الجماعي الصوتي (Audio Study Groups)
// =============================================================================

import { speak, __, callGeminiAPI } from './cloud_school_app.js';

// ===================== المساعد الصوتي للمتصفح (Speech-to-Text) =====================
let speechRecognition = null;
let isSpeechRecognitionActive = false;
let currentSpeechCallback = null;
let _speechResolved = false;
let _speechTimeoutId = null;

function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        speak(__('micUnsupported'));
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
        speak(__('micError'));
        return null;
    }
}

function resolveSpeech(result) {
    if (_speechResolved) return;
    _speechResolved = true;
    if (_speechTimeoutId) {
        clearTimeout(_speechTimeoutId);
        _speechTimeoutId = null;
    }
    isSpeechRecognitionActive = false;
    if (currentSpeechCallback) {
        currentSpeechCallback(result);
        currentSpeechCallback = null;
    }
}

function handleSpeechResult(event) {
    const transcript = event.results[0][0].transcript;
    resolveSpeech(transcript);
}

function handleSpeechError(event) {
    const msg = event.error === 'no-speech' ? __('noSpeech') :
                event.error === 'aborted' ? '' :
                __('speechError');
    if (msg) speak(msg);
    resolveSpeech(null);
}

function handleSpeechEnd() {
    isSpeechRecognitionActive = false;
}

function listenForSpeech(callback, timeoutMs = 10000) {
    // If there's a pending callback, resolve it as cancelled
    if (currentSpeechCallback) {
        currentSpeechCallback(null);
        currentSpeechCallback = null;
    }
    _speechResolved = false;
    currentSpeechCallback = callback;
    const rec = startMicrophone();
    if (!rec) {
        if (callback) callback(null);
        return;
    }
    if (timeoutMs > 0) {
        _speechTimeoutId = setTimeout(() => {
            if (isSpeechRecognitionActive) {
                try { speechRecognition.stop(); } catch(e) {}
                isSpeechRecognitionActive = false;
            }
            resolveSpeech(null);
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
    const roleLabel = role === 'ai' ? __('roleTeacher') : __('roleStudent');
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

    updateDialogicStatus(__('dialogicStarting'));
    speak(__('dialogicWelcome'));
    addDialogicEntry('ai', __('dialogicWelcomeEntry'));

    // Ask for subject first
    updateDialogicStatus(__('dialogicAskTopic'));
    document.getElementById('dialogic-voice-status').textContent = __('dialogicSpeakToChoose');

    const subject = await new Promise((resolve) => {
        listenForSpeech((text) => {
            resolve(text || __('defaultSubject'));
        }, 15000);
    });

    dialogicSubject = subject || __('defaultSubject');
    addDialogicEntry('student', dialogicSubject);
    updateDialogicStatus(__('dialogicSubjectLabel', dialogicSubject));
    speak(__('dialogicLetsStart', dialogicSubject));

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

    updateDialogicStatus(__('dialogicListen'));
    document.getElementById('dialogic-voice-status').textContent = __('dialogicTeacherSpeaking');

    // Wait for AI to finish speaking, then listen
    await waitForSpeechEnd(2000);

    updateDialogicStatus(__('dialogicListen'));
    document.getElementById('dialogic-voice-status').textContent = __('dialogicSpeakToAnswer');

    listenForSpeech(async (studentAnswer) => {
        if (!dialogicRunning) return;

        if (!studentAnswer || studentAnswer.trim() === '') {
            speak(__('dialogicRetry'));
            updateDialogicStatus(__('dialogicRetryStatus'));
            // Try again
            listenForSpeech(async (retry) => {
                if (retry && retry.trim()) {
                    await processStudentAnswer(retry);
                } else {
                    // Give up and continue
                    await processStudentAnswer(__('dialogicNoAnswer'));
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
    updateDialogicStatus(__('dialogicEvaluating'));
    speak(__('dialogicThinking'));

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
        speak(__('dialogicConnectionError'));
        await askDialogicQuestion({
            assessment: 'جيد',
            explanation: __('dialogicNextQuestion'),
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
        speak(__('dialogicSummary', summary));
        addDialogicEntry('ai', __('dialogicSessionEval', summary));
    } catch(e) {
        speak(__('dialogicThankYou'));
    }

    updateDialogicStatus(__('dialogicSessionEnded'));
    document.getElementById('btn-dialogic-start').classList.remove('hidden');
    document.getElementById('btn-dialogic-stop').classList.add('hidden');
    document.getElementById('dialogic-voice-status').textContent = __('dialogicSessionComplete');
}

function stopDialogicClassroom() {
    dialogicRunning = false;
    if (isSpeechRecognitionActive) {
        try { speechRecognition.stop(); } catch(e) {}
    }
    currentSpeechCallback = null;
    updateDialogicStatus(__('dialogicSessionStopped'));
    document.getElementById('btn-dialogic-start').classList.remove('hidden');
    document.getElementById('btn-dialogic-stop').classList.add('hidden');
    document.getElementById('dialogic-voice-status').textContent = __('sessionEnded');
    speak(__('dialogicEnd'));
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
    const roleLabel = role === 'ai' ? __('roleModerator') : `🎤 ${role}`;
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
    studyGroupTopic = topicInput ? topicInput.value.trim() || __('defaultSubject') : __('defaultSubject');

    document.getElementById('btn-study-group-start').classList.add('hidden');
    document.getElementById('btn-study-group-stop').classList.remove('hidden');
    document.getElementById('study-group-conversation').classList.remove('hidden');
    clearStudyGroupTranscript();

    updateStudyGroupStatus(__('studyGroupIntro', studyGroupTopic));
    addStudyGroupEntry('ai', __('studyGroupWelcome', studyGroupTopic));

    speak(__('studyGroupIntroduction', studyGroupTopic));

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

    updateStudyGroupStatus(__('studyGroupTurn', currentName));

    try {
        const result = await callGeminiAPI(prompt, STUDY_GROUP_SYSTEM_PROMPT);
        const parsed = parseStudyGroupResponse(result);

        const questionText = parsed.question || `ماذا تعرف عن ${studyGroupTopic}؟`;
        addStudyGroupEntry('ai', `(${parsed.nextSpeaker || currentName}) ${questionText}`);
        speak(__('studyGroupQuestionFor', parsed.nextSpeaker || currentName, questionText));

        await waitForSpeechEnd(2000);

        // Ask the user to speak as the current student
        updateStudyGroupStatus(__('studyGroupSpeakAs', parsed.nextSpeaker || currentName));
        document.getElementById('study-group-voice-status').textContent =
            __('studyGroupPressSpeak', parsed.nextSpeaker || currentName);

    } catch(e) {
        const questionText = `ماذا تعرف عن ${studyGroupTopic}؟`;
        addStudyGroupEntry('ai', `(${currentName}) ${questionText}`);
        speak(__('studyGroupQuestionFor', currentName, questionText));

        updateStudyGroupStatus(__('studyGroupSpeakAs', currentName));
        document.getElementById('study-group-voice-status').textContent =
            __('studyGroupPressSpeak', currentName);
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

    updateStudyGroupStatus(__('studyGroupListening'));
    document.getElementById('study-group-voice-status').textContent = __('studyGroupSpeakNow');

    listenForSpeech(async (text) => {
        if (!studyGroupRunning) return;

        if (!text || text.trim() === '') {
            speak(__('dialogicRetry'));
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
    addStudyGroupEntry(currentName, __('studyGroupSkipped'));
    studyGroupHistory.push({ role: currentName, content: __('studyGroupNoResponse') });
    studyGroupCurrentStudent++;

    if (studyGroupCurrentStudent >= 6) {
        wrapUpStudyGroup();
        return;
    }
    speak(__('studyGroupSkip', currentName));
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
        speak(__('studyGroupSummary', summary));
        addStudyGroupEntry('ai', __('studyGroupSessionSummary', summary));
    } catch(e) {
        speak(__('studyGroupThankYou'));
    }

    updateStudyGroupStatus(__('studyGroupSessionEnded'));
    document.getElementById('btn-study-group-start').classList.remove('hidden');
    document.getElementById('btn-study-group-stop').classList.add('hidden');
    document.getElementById('study-group-voice-status').textContent = __('sessionEnded');
}

function stopStudyGroup() {
    studyGroupRunning = false;
    if (isSpeechRecognitionActive) {
        try { speechRecognition.stop(); } catch(e) {}
    }
    currentSpeechCallback = null;
    updateStudyGroupStatus(__('dialogicSessionStopped'));
    document.getElementById('btn-study-group-start').classList.remove('hidden');
    document.getElementById('btn-study-group-stop').classList.add('hidden');
    document.getElementById('study-group-voice-status').textContent = __('sessionEnded');
    speak(__('studyGroupEnd'));
}

// ===================== ربط مع الميزات القديمة =====================
// توفير speechRecognizer للمعلم الافتراضي القديم (cloud_school_app.js)
window.speechRecognizer = {
    start: function() {
        speak(__('speakAfterBeep'));
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
                speak(__('micRetry'));
            }
        }, 15000);
    }
};

// ===================== الاختبارات الناطقة (Voice Exams) =====================
let voiceExamActive = false;
let voiceExamListening = false;
let voiceExamQuizId = null;

function toggleVoiceExamMode() {
    const toggleBtn = document.getElementById('btn-voice-exam-toggle');
    const statusEl = document.getElementById('voice-exam-status');

    if (voiceExamActive) {
        voiceExamActive = false;
        voiceExamListening = false;
        if (isSpeechRecognitionActive) {
            try { speechRecognition.stop(); } catch(e) {}
        }
        currentSpeechCallback = null;
        if (toggleBtn) {
            toggleBtn.textContent = __('voiceExamActivate');
            toggleBtn.classList.remove('bg-red-600', 'animate-pulse');
            toggleBtn.classList.add('bg-yellow-500');
        }
        if (statusEl) statusEl.textContent = __('voiceExamModeInactive');
        speak(__('voiceExamModeInactive'));
        return;
    }

    // Check if there's an active quiz
    const quizPanel = document.getElementById('active-quiz-panel');
    if (!quizPanel || quizPanel.classList.contains('hidden')) {
        speak(__('voiceExamNoQuiz'));
        return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        speak(__('voiceExamNotAvailable'));
        return;
    }

    voiceExamActive = true;
    if (toggleBtn) {
        toggleBtn.textContent = __('voiceExamDeactivate');
        toggleBtn.classList.remove('bg-yellow-500');
        toggleBtn.classList.add('bg-red-600', 'animate-pulse');
    }
    if (statusEl) statusEl.textContent = __('voiceExamModeActive');
    speak(__('voiceExamModeActive'));

    // Start reading the current quiz aloud
    setTimeout(function() { readCurrentQuizAloud(); }, 1000);
}

function readCurrentQuizAloud() {
    if (!voiceExamActive) return;

    const quizTitle = document.getElementById('active-quiz-title');
    const questionText = document.getElementById('quiz-question-text');
    const quizContainer = document.getElementById('quiz-question-container');
    const textSection = document.getElementById('quiz-text-input-section');

    if (quizTitle) speak(quizTitle.textContent);
    if (questionText && !quizContainer.classList.contains('hidden')) {
        speak(questionText.textContent);

        // Read options
        var options = [];
        var optA = document.querySelector('#btn-opt-A span');
        var optB = document.querySelector('#btn-opt-B span');
        var optC = document.querySelector('#btn-opt-C span');
        var optD = document.querySelector('#btn-opt-D span');
        if (optA) options.push(optA.textContent);
        if (optB) options.push(optB.textContent);
        if (optC) options.push(optC.textContent);
        if (optD) options.push(optD.textContent);

        if (options.length > 0) {
            setTimeout(function() {
                speak(__('voiceExamOptions', options.join(' ، ')));
                setTimeout(function() { startVoiceExamListening(); }, 2000);
            }, 1500);
        } else {
            setTimeout(function() { startVoiceExamListening(); }, 1500);
        }
    } else if (textSection && !textSection.classList.contains('hidden')) {
        // Essay type: use SpeechRecognition directly instead of MediaRecorder
        speak(__('voiceExamEssayPrompt'));
        setTimeout(function() {
            updateVoiceExamStatus(__('voiceExamListening'));
            listenForSpeech(function(essayText) {
                if (!voiceExamActive) return;
                if (essayText && essayText.trim()) {
                    var ansField = document.getElementById('assignment-student-answer');
                    if (ansField) ansField.value = essayText.trim();
                    speak(__('voiceExamEssayRecorded'));
                }
                // After capturing essay, listen for commands
                setTimeout(function() { startVoiceExamListening(); }, 1500);
            }, 30000);
        }, 1500);
    }
}

function startVoiceExamListening() {
    if (!voiceExamActive) return;
    if (voiceExamListening) return;
    voiceExamListening = true;

    var statusEl = document.getElementById('voice-exam-status');
    if (statusEl) statusEl.textContent = __('voiceExamListening');
    speak(__('voiceExamListening'));
    updateVoiceExamStatus(__('voiceExamHelp'));

    listenForSpeech(function(text) {
        voiceExamListening = false;
        if (!voiceExamActive) return;
        if (!text || !text.trim()) {
            speak(__('dialogicRetry'));
            setTimeout(function() { startVoiceExamListening(); }, 1000);
            return;
        }

        var normalized = text.trim().toLowerCase();
        var statusEl = document.getElementById('voice-exam-status');
        if (statusEl) statusEl.textContent = __('voiceExamHeard', normalized);

        // Check voice commands
        if (normalized === __('voiceExamCommandRepeat') || normalized === 'repeat' || normalized === 'كرر' || normalized === 'اعادة') {
            speak(__('voiceExamRepeat'));
            setTimeout(function() { readCurrentQuizAloud(); }, 1000);
            return;
        }

        if (normalized === __('voiceExamCommandSubmit') || normalized === 'submit' || normalized === 'إرسال' || normalized === 'ارسال') {
            confirmVoiceSubmit();
            return;
        }

        if (normalized === __('voiceExamCommandCancel') || normalized === 'cancel' || normalized === 'إلغاء' || normalized === 'الغاء') {
            speak(__('voiceExamCancelled'));
            setTimeout(function() { startVoiceExamListening(); }, 1000);
            return;
        }

        if (normalized === __('voiceExamCommandYes') || normalized === 'yes' || normalized === 'نعم') {
            // Handle confirmations
            if (window._voiceExamPendingSubmit) {
                window._voiceExamPendingSubmit = false;
                doVoiceSubmit();
                return;
            }
            if (window._voiceExamPendingOption) {
                var opt = window._voiceExamPendingOption;
                window._voiceExamPendingOption = null;
                selectQuizOption(opt);
                speak(__('voiceExamConfirmed'));
                setTimeout(function() { startVoiceExamListening(); }, 1000);
                return;
            }
            setTimeout(function() { startVoiceExamListening(); }, 500);
            return;
        }

        if (normalized === __('voiceExamCommandNo') || normalized === 'no' || normalized === 'لا') {
            window._voiceExamPendingSubmit = false;
            window._voiceExamPendingOption = null;
            speak(__('voiceExamCancelled'));
            setTimeout(function() { startVoiceExamListening(); }, 1000);
            return;
        }

        // Handle MCQ option selection
        var quizContainer = document.getElementById('quiz-question-container');
        if (quizContainer && !quizContainer.classList.contains('hidden')) {
            var optionMap = {
                '1': 'A', '2': 'B', '3': 'C', '4': 'D',
                'أ': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
                'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
                'one': 'A', 'two': 'B', 'three': 'C', 'four': 'D',
                'واحد': 'A', 'اثنين': 'B', 'ثلاثة': 'C', 'أربعة': 'D'
            };

            // Check if normalized text is just a single letter/number
            var firstWord = normalized.split(' ')[0];
            var matched = optionMap[firstWord] || optionMap[normalized];
            if (matched) {
                window._voiceExamPendingOption = matched;
                speak(__('voiceExamConfirm', __('opt' + matched)));
                updateVoiceExamStatus(__('voiceExamConfirm', __('opt' + matched)));
                voiceExamListening = true;
                listenForSpeech(function(confirmText) {
                    voiceExamListening = false;
                    if (!voiceExamActive) return;
                    var ct = confirmText ? confirmText.trim().toLowerCase() : '';
                    if (ct === __('voiceExamCommandYes') || ct === 'yes' || ct === 'نعم') {
                        selectQuizOption(matched);
                        speak(__('voiceExamConfirmed'));
                        setTimeout(function() { startVoiceExamListening(); }, 1000);
                    } else {
                        window._voiceExamPendingOption = null;
                        speak(__('voiceExamCancelled'));
                        setTimeout(function() { startVoiceExamListening(); }, 1000);
                    }
                }, 8000);
                return;
            }

            // If no option matched, just listen again
            speak(__('voiceExamHelp'));
            setTimeout(function() { startVoiceExamListening(); }, 1000);
            return;
        }

        // Essay: text was already captured via toggleAudioRecording
        // Just confirm and listen for more commands
        speak(__('voiceExamEssayRecorded'));
        setTimeout(function() { startVoiceExamListening(); }, 1000);

    }, 15000);
}

function confirmVoiceSubmit() {
    window._voiceExamPendingSubmit = true;
    speak(__('voiceExamSubmitConfirm'));
    updateVoiceExamStatus(__('voiceExamSubmitConfirm'));
    voiceExamListening = true;
    listenForSpeech(function(text) {
        voiceExamListening = false;
        if (!voiceExamActive) return;
        var ct = text ? text.trim().toLowerCase() : '';
        if (ct === __('voiceExamCommandYes') || ct === 'yes' || ct === 'نعم') {
            window._voiceExamPendingSubmit = false;
            doVoiceSubmit();
        } else {
            window._voiceExamPendingSubmit = false;
            speak(__('voiceExamCancelled'));
            setTimeout(function() { startVoiceExamListening(); }, 1000);
        }
    }, 8000);
}

function doVoiceSubmit() {
    if (typeof submitQuizAnswer === 'function') {
        submitQuizAnswer();
        speak(__('voiceExamSubmitted'));
        voiceExamActive = false;
        var toggleBtn = document.getElementById('btn-voice-exam-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = __('voiceExamActivate');
            toggleBtn.classList.remove('bg-red-600', 'animate-pulse');
            toggleBtn.classList.add('bg-yellow-500');
        }
        var statusEl = document.getElementById('voice-exam-status');
        if (statusEl) statusEl.textContent = __('voiceExamSubmitted');
    }
}

function updateVoiceExamStatus(text) {
    var el = document.getElementById('voice-exam-status');
    if (el) el.textContent = text;
}

// Auto-read quiz when started in voice mode
var _origStartQuiz = typeof startQuiz === 'function' ? startQuiz : null;
if (typeof startQuiz === 'function') {
    window.startQuiz = function(quizId) {
        _origStartQuiz(quizId);
        voiceExamQuizId = quizId;
        // If voice mode is active, read the quiz aloud after it loads
        if (voiceExamActive) {
            setTimeout(function() { readCurrentQuizAloud(); }, 2000);
        }
    };
}

// ===================== أدوات مساعدة =====================
function waitForSpeechEnd(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// escapeHtml is defined in cloud_school_app.js (loaded first)

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
                updateDialogicStatus(__('dialogicListening'));
                document.getElementById('dialogic-voice-status').textContent = __('dialogicSpeakNow');
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

    // Voice Exam Mode
    const voiceExamToggleBtn = document.getElementById('btn-voice-exam-toggle');
    if (voiceExamToggleBtn) {
        voiceExamToggleBtn.addEventListener('click', toggleVoiceExamMode);
    }
});

export {
  initSpeechRecognition, startMicrophone, listenForSpeech,
  startDialogicClassroom, stopDialogicClassroom,
  startStudyGroup, stopStudyGroup,
  toggleVoiceExamMode, startVoiceExamListening,
  confirmVoiceSubmit, doVoiceSubmit, updateVoiceExamStatus
};
