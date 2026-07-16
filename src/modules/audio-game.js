/** Audio Games Module - نظام الألعاب الصوتية */

export var activeGameType = '';
export var currentGameScore = 0;
export var gameTimeLeft = 30;
export var gameTimerInterval = null;
export var currentCorrectAnswer = null;

export var audioMemorySequence = [];
export var audioMemoryStep = 0;
export var audioMemoryPatterns = [
    { name: 'قطة', freq: 800, dir: 'left' },
    { name: 'كلب', freq: 400, dir: 'right' },
    { name: 'ديك', freq: 1200, dir: 'front' },
    { name: 'بقرة', freq: 150, dir: 'back' },
    { name: 'قطار', freq: 300, dir: 'left' },
    { name: 'جرس', freq: 1400, dir: 'right' },
    { name: 'ماء', freq: 2000, dir: 'front' },
    { name: 'باب', freq: 250, dir: 'back' },
];

export var questionBank = [
    { q: "الماء يتكون من ذرتي هيدروجين وذرة أكسجين.", a: true, d: 1 },
    { q: "الأرض هي الكوكب الثالث في المجموعة الشمسية.", a: true, d: 1 },
    { q: "الضوء ينتقل أسرع من الصوت.", a: true, d: 1 },
    { q: "الجهاز المسؤول عن ضخ الدم في جسم الإنسان هو الكبد.", a: false, d: 1 },
    { q: "التمثيل الضوئي يحدث في أوراق النباتات.", a: true, d: 1 },
    { q: "جسم الإنسان يحتوي على 206 عظمة.", a: true, d: 1 },
    { q: "الماء يغلي عند درجة حرارة 100 سيليسيوس.", a: true, d: 1 },
    { q: "البكتيريا كائنات حية دقيقة ترى بالعين المجردة.", a: false, d: 1 },
    { q: "الجلد هو أكبر عضو في جسم الإنسان.", a: true, d: 1 },
    { q: "الأكسجين يمثل المكون الأساسي لغاز النيتروجين.", a: false, d: 2 },
    { q: "الأوزون هو غاز يحمي الأرض من الأشعة فوق البنفسجية.", a: true, d: 2 },
    { q: "يتكون الدماغ البشري من ثلاثة أقسام رئيسية.", a: true, d: 2 },
    { q: "النباتات تصنع غذاءها بنفسها بعملية تسمى التنفس.", a: false, d: 2 },
    { q: "الكواكب الداخلية في مجموعتنا الشمسية هي عطارد والزهرة والمريخ.", a: false, d: 2 },
    { q: "العظام هي أصلب مادة في جسم الإنسان.", a: true, d: 3 },
    { q: "الكلوروبلاست هي المسؤولة عن عملية البناء الضوئي في الخلية.", a: true, d: 3 },
    { q: "الرقم الهيدروجيني للحمض النقي أقل من 7.", a: true, d: 3 },
    { q: "العدد 9 هو مربع العدد 3.", a: true, d: 1 },
    { q: "المجموع الكلي لزوايا المثلث يساوي 180 درجة.", a: true, d: 1 },
    { q: "ناتج 12 ÷ 4 يساوي 3.", a: true, d: 1 },
    { q: "الزاوية القائمة تساوي 90 درجة.", a: true, d: 1 },
    { q: "العدد 17 هو عدد زوجي.", a: false, d: 1 },
    { q: "الكسر ½ يساوي 0.5 في النظام العشري.", a: true, d: 1 },
    { q: "حاصل ضرب 8 × 7 يساوي 54.", a: false, d: 2 },
    { q: "القطر هو ضعف نصف القطر.", a: true, d: 2 },
    { q: "العدد الأولي هو عدد يقبل القسمة على 1 وعلى نفسه فقط.", a: true, d: 2 },
    { q: "مجموع زوايا المربع يساوي 360 درجة.", a: true, d: 2 },
    { q: "المساحة تقاس بالوحدات المربعة.", a: true, d: 2 },
    { q: "الجذر التربيعي للعدد 64 هو 8.", a: true, d: 2 },
    { q: "العدد 100 هو أصغر عدد مكون من ثلاث خانات.", a: false, d: 3 },
    { q: "النسبة المئوية تعني جزءاً من 100.", a: true, d: 3 },
    { q: "المتوسط الحسابي للأعداد 2، 4، 6 يساوي 4.", a: true, d: 3 },
    { q: "العدد -3 أكبر من العدد 2.", a: false, d: 3 },
    { q: "الفعل الماضي يدل على حدث وقع في الزمن الماضي.", a: true, d: 1 },
    { q: "الفاعل في الجملة العربية مرفوع دائماً.", a: true, d: 1 },
    { q: "حروف العطف هي: الفاء، ثم، الواو، أو.", a: false, d: 1 },
    { q: "المثنى يدل على اثنين بزيادة ألف ونون أو ياء ونون.", a: true, d: 1 },
    { q: "جمع المؤنث السالم ينصب بالفتحة.", a: true, d: 1 },
    { q: "الهمزة في كلمة (سأل) همزة قطع.", a: true, d: 2 },
    { q: "جمع كلمة (كتاب) هو (كتبة).", a: false, d: 2 },
    { q: "اللام في (الكتاب) شمسية.", a: false, d: 2 },
    { q: "كلمة (مدرسة) هي اسم مكان.", a: true, d: 2 },
    { q: "كلمة (جميل) في جملة (رأيت طالباً جميلاً) نعت.", a: true, d: 2 },
    { q: "الأفعال الخمسة ترفع بثبوت النون وتنصب وتجزم بحذفها.", a: true, d: 3 },
    { q: "الفعل المضارع المعتل الآخر يرفع بالضمة المقدرة.", a: true, d: 3 },
    { q: "كلمة (استغفار) مصدر خماسي.", a: true, d: 3 },
    { q: "النبي محمد ﷺ ولد في عام الفيل.", a: true, d: 1 },
    { q: "الحضارة الفرعونية نشأت في بلاد الرافدين.", a: false, d: 1 },
    { q: "الجزائر كانت تحت الاستعمار الفرنسي.", a: true, d: 1 },
    { q: "الحرب العالمية الثانية انتهت عام 1945.", a: true, d: 1 },
    { q: "معركة حطين قادها صلاح الدين الأيوبي.", a: true, d: 2 },
    { q: "فتح الأندلس كان بقيادة طارق بن زياد.", a: true, d: 2 },
    { q: "الثورة الفرنسية حدثت في القرن الثامن عشر.", a: true, d: 2 },
    { q: "سور الصين العظيم بني لحماية الصين من الغزوات.", a: true, d: 2 },
    { q: "الدولة العباسية عاصمتها دمشق.", a: false, d: 3 },
    { q: "العلم العربي ابن الهيثم اشتهر في الطب.", a: false, d: 3 },
    { q: "معركة اليرموك كانت بين المسلمين والفرس.", a: false, d: 3 },
    { q: "نهر النيل هو أطول نهر في العالم.", a: true, d: 1 },
    { q: "عاصمة مصر هي الإسكندرية.", a: false, d: 1 },
    { q: "أستراليا هي أصغر قارة في العالم.", a: true, d: 1 },
    { q: "المحيط الهادئ هو أكبر محيط في العالم.", a: true, d: 1 },
    { q: "القارة القطبية الجنوبية هي أبرد قارة على الأرض.", a: true, d: 2 },
    { q: "البحر الميت هو أخفض نقطة على سطح الأرض.", a: true, d: 2 },
    { q: "الصحراء الكبرى تقع في قارة آسيا.", a: false, d: 2 },
    { q: "جبال الألب تقع في أوروبا.", a: true, d: 2 },
    { q: "عدد أركان الإسلام خمسة.", a: true, d: 1 },
    { q: "الصيام في شهر رمضان هو أحد أركان الإسلام.", a: true, d: 1 },
    { q: "المسجد الأقصى يقع في مكة المكرمة.", a: false, d: 1 },
    { q: "الفاتحة هي أعظم سورة في القرآن.", a: true, d: 1 },
    { q: "عدد الأنبياء والرسل المذكورين في القرآن هو 25.", a: true, d: 2 },
    { q: "ليلة القدر في العشر الأواخر من رمضان.", a: true, d: 2 },
    { q: "القرآن نزل على النبي محمد ﷺ في 23 سنة.", a: true, d: 2 },
    { q: "الحج واجب على كل مسلم مرة واحدة في العمر.", a: true, d: 3 },
    { q: "سورة الإخلاص تعدل ثلث القرآن.", a: true, d: 3 },
    { q: "الكرة الأرضية تدور حول الشمس كل 365 يوماً.", a: true, d: 1 },
    { q: "لغة برايل هي نظام كتابة وقراءة للمكفوفين.", a: true, d: 1 },
    { q: "الذهب معدن ثمين لا يصدأ.", a: true, d: 1 },
    { q: "الإنترنت اخترع في القرن العشرين.", a: true, d: 1 },
    { q: "طائر البطريق يستطيع الطيران لمسافات طويلة.", a: false, d: 1 },
    { q: "العين البشرية تستطيع رؤية جميع ألوان الطيف.", a: true, d: 2 },
    { q: "ساعة العقارب تخبر الوقت عن طريق عقربي الساعة والدقيقة.", a: true, d: 2 },
    { q: "الكهرباء هي تدفق الإلكترونات في الموصل.", a: true, d: 2 },
    { q: "المغناطيس يجذب جميع أنواع المعادن.", a: false, d: 2 },
];

export var mathQuestionBank = [
    // Level 1: Elementary (ابتدائي)
    { q: "كم ناتج 7 + 5؟", a: "12", d: 1 },
    { q: "كم ناتج 15 - 8؟", a: "7", d: 1 },
    { q: "كم ناتج 6 × 3؟", a: "18", d: 1 },
    { q: "كم ناتج 20 ÷ 4؟", a: "5", d: 1 },
    { q: "كم ناتج 9 + 11؟", a: "20", d: 1 },
    { q: "كم ناتج 8 × 4؟", a: "32", d: 1 },
    { q: "كم ناتج 100 - 37؟", a: "63", d: 1 },
    { q: "كم ناتج 12 × 5؟", a: "60", d: 1 },
    { q: "كم ناتج 45 + 55؟", a: "100", d: 1 },
    { q: "كم ناتج 36 ÷ 6؟", a: "6", d: 1 },
    // Level 2: Middle School (متوسط)
    { q: "ما هو 25% من 80؟", a: "20", d: 2 },
    { q: "ما هو الجذر التربيعي لـ 49؟", a: "7", d: 2 },
    { q: "كم ناتج 3 أس 3؟", a: "27", d: 2 },
    { q: "إذا كان x + 7 = 15، ما قيمة x؟", a: "8", d: 2 },
    { q: "ما هو 10% من 250؟", a: "25", d: 2 },
    { q: "كم ناتج 0.5 × 60؟", a: "30", d: 2 },
    { q: "ما هو محيط مربع طول ضلعه 9 سنتيمتر؟", a: "36", d: 2 },
    { q: "ما ناتج ثلاثة أرباع العدد 40؟", a: "30", d: 2 },
    { q: "كم ناتج 2 أس 5؟", a: "32", d: 2 },
    { q: "ما مساحة مستطيل طوله 8 وعرضه 5؟", a: "40", d: 2 },
    // Level 3: High School (ثانوي)
    { q: "ما الجذر التربيعي لـ 144؟", a: "12", d: 3 },
    { q: "إذا كانت 2x - 4 = 10، ما قيمة x؟", a: "7", d: 3 },
    { q: "ما ناتج log بالأساس 10 للعدد 1000؟", a: "3", d: 3 },
    { q: "كم عدد أضلاع الشكل السداسي المنتظم؟", a: "6", d: 3 },
    { q: "ما ناتج sin 90 درجة؟", a: "1", d: 3 },
    { q: "ما مجموع زوايا المثلث بالدرجات؟", a: "180", d: 3 },
    { q: "كم يساوي 5 مضروب (5!)؟", a: "120", d: 3 },
    { q: "إذا كانت x تربيع = 81، ما القيمة الموجبة لـ x؟", a: "9", d: 3 },
    // Level 4: University (جامعي)
    { q: "ما مشتقة الدالة x تربيع + 3x؟", a: "2x + 3", d: 4 },
    { q: "ما تكامل 2x dx؟", a: "x تربيع", d: 4 },
    { q: "ما قيمة e أس صفر؟", a: "1", d: 4 },
    { q: "ما محدد المصفوفة الوحدية 2 × 2؟", a: "1", d: 4 },
    { q: "ما نهاية الدالة sin x على x عندما x تؤول إلى الصفر؟", a: "1", d: 4 },
    { q: "ما مشتقة الدالة e أس x؟", a: "e أس x", d: 4 },
];

export var currentMathAnswer = null;
export var currentAIGameData = null;

export function getAgeLevelDifficulty() {
    var ageLevel = window.currentAgeLevel || 'auto';
    var age = window.currentUserSession?.age || 14;
    switch (ageLevel) {
        case 'child': return 1;
        case 'teen': return 2;
        case 'adult': return 4;
        default:
            if (age < 12) return 1;
            if (age < 15) return 2;
            if (age < 18) return 3;
            return 4;
    }
}

function pickMathQuestion(level) {
    var pool = mathQuestionBank.filter(function(q) { return q.d === level; });
    if (pool.length === 0) pool = mathQuestionBank.filter(function(q) { return q.d <= level; });
    if (pool.length === 0) pool = mathQuestionBank;
    return pool[window.secureRandomInt(0, pool.length)];
}

// ==================== Math Challenge ====================

export function initMathChallenge() {
    activeGameType = 'math-challenge';
    currentGameScore = 0;
    gameTimeLeft = 60;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-timer').textContent = "60";
    document.getElementById('game-title').textContent = window.__('gameMathChallenge');
    document.getElementById('game-timer-wrapper').classList.remove('hidden');
    document.getElementById('game-binary-options').classList.add('hidden');
    document.getElementById('game-story-options').classList.add('hidden');

    var inputArea = document.getElementById('game-input-area');
    if (!inputArea) {
        inputArea = document.createElement('div');
        inputArea.id = 'game-input-area';
        inputArea.className = 'flex flex-col items-center gap-3 mt-4';
        document.getElementById('game-arena').appendChild(inputArea);
    }
    inputArea.classList.remove('hidden');
    inputArea.innerHTML = '<label for="math-answer-input" class="text-lg font-bold text-yellow-300">' + window.__('gameMathTypeAnswer') + '</label>' +
        '<input id="math-answer-input" type="text" inputmode="text" autocomplete="off" class="p-4 text-2xl text-center rounded-xl bg-gray-800 text-white border-2 border-yellow-400 w-64 focus-ring" aria-label="' + window.__('gameMathTypeAnswer') + '">' +
        '<button id="math-submit-btn" class="p-4 bg-green-600 hover:bg-green-700 text-white font-bold text-xl rounded-xl btn-interactive w-64">' + window.__('gameMathSubmit') + '</button>';

    document.getElementById('math-submit-btn').addEventListener('click', checkMathAnswer);
    document.getElementById('math-answer-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') checkMathAnswer();
    });

    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(function() {
        gameTimeLeft -= 1;
        document.getElementById('game-timer').textContent = gameTimeLeft;
        if (gameTimeLeft <= 5 && gameTimeLeft > 0) window.playTick3D();
        if (gameTimeLeft <= 0) endGame();
    }, 1000);

    startMathRound();
    window.speak(window.__('gameMathStart'));
    document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
}

function startMathRound() {
    var level = getAgeLevelDifficulty();
    var q = pickMathQuestion(level);
    currentMathAnswer = q.a;
    document.getElementById('game-question').textContent = q.q;
    window.speak(q.q);
    var inp = document.getElementById('math-answer-input');
    if (inp) { inp.value = ''; inp.focus(); }
}

function checkMathAnswer() {
    var inp = document.getElementById('math-answer-input');
    if (!inp) return;
    var userAns = inp.value.trim();
    if (!userAns) {
        window.speak(window.__('gameMathNoAnswer'));
        return;
    }
    if (userAns === String(currentMathAnswer) || userAns.replace(/\s/g, '') === String(currentMathAnswer).replace(/\s/g, '')) {
        var level = getAgeLevelDifficulty();
        var points = level <= 1 ? 5 : level <= 2 ? 10 : 20;
        currentGameScore += points;
        document.getElementById('game-score').textContent = currentGameScore;
        window.playSuccess3D();
        window.speak(window.__('gameCorrect') + '! +' + points);
        setTimeout(startMathRound, 800);
    } else {
        window.playFail3D();
        window.speak(window.__('gameMathWrongAnswer', currentMathAnswer));
        setTimeout(startMathRound, 1500);
    }
}

// ==================== Listening Comprehension Quiz ====================

export function initListeningQuiz() {
    activeGameType = 'listening-quiz';
    currentGameScore = 0;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-title').textContent = window.__('gameListeningQuiz');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    document.getElementById('game-binary-options').classList.add('hidden');
    document.getElementById('game-story-options').classList.remove('hidden');

    var inputArea = document.getElementById('game-input-area');
    if (inputArea) inputArea.classList.add('hidden');

    if (gameTimerInterval) clearInterval(gameTimerInterval);
    startListeningRound();
    document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
}

function getListeningLevelText() {
    var d = getAgeLevelDifficulty();
    if (d <= 1) return "للأطفال في المرحلة الابتدائية. استخدم لغة بسيطة جداً وقصة قصيرة ممتعة عن الحيوانات أو الطبيعة.";
    if (d <= 2) return "للمرحلة المتوسطة. استخدم فقرة علمية أو تاريخية متوسطة المستوى.";
    if (d <= 3) return "للمرحلة الثانوية. استخدم مقالة أدبية أو علمية معمقة.";
    return "للمرحلة الجامعية. استخدم نص أكاديمي متقدم في العلوم أو الفلسفة أو التكنولوجيا.";
}

async function startListeningRound() {
    var storyOptions = document.getElementById('game-story-options');
    storyOptions.innerHTML = '';
    document.getElementById('game-question').textContent = window.__('gameListeningLoading');
    window.speak(window.__('gameListeningLoading'));

    var levelText = getListeningLevelText();
    var prompt = "أنشئ فقرة تعليمية قصيرة (3-5 أسطر) مناسبة " + levelText + " ثم أنشئ 3 أسئلة اختيار من متعدد عن الفقرة، لكل سؤال 3 خيارات وخيار واحد صحيح. أخرج النتيجة بصيغة JSON فقط بدون markdown: { \"passage\": \"نص الفقرة\", \"questions\": [{ \"q\": \"السؤال\", \"options\": [\"خيار1\", \"خيار2\", \"خيار3\"], \"correct\": 0 }] }";

    try {
        var systemPrompt = window.getPrompt(window.getCurrentLang(), "أنت معلم تربوي محترف متخصص في إنشاء اختبارات الفهم السمعي للطلاب المكفوفين. أخرج JSON نظيف فقط.", "You are a professional educational teacher specializing in creating listening comprehension tests for blind students. Output clean JSON only.");
        var jsonText = await window.callGeminiAPI(prompt, systemPrompt);
        var parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        document.getElementById('game-question').textContent = parsed.passage;
        window.speak(window.__('gameListeningPassage') + ': ' + parsed.passage);

        currentAIGameData = { questions: parsed.questions, currentQ: 0 };

        setTimeout(function() {
            window.speak(window.__('gameListeningNowQuestions'));
            setTimeout(function() { showListeningQuestion(); }, 1500);
        }, 3000);
    } catch (e) {
        console.error("Listening quiz error:", e);
        document.getElementById('game-question').textContent = window.__('gameAIError');
        window.speak(window.__('gameAIError'));
    }
}

function showListeningQuestion() {
    if (!currentAIGameData || currentAIGameData.currentQ >= currentAIGameData.questions.length) {
        window.speak(window.__('gameListeningComplete', currentGameScore));
        endGame();
        return;
    }
    var qData = currentAIGameData.questions[currentAIGameData.currentQ];
    document.getElementById('game-question').textContent = qData.q;
    window.speak(qData.q);

    var storyOptions = document.getElementById('game-story-options');
    storyOptions.innerHTML = '';
    qData.options.forEach(function(opt, idx) {
        var btn = document.createElement('button');
        btn.className = "p-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive";
        btn.textContent = (idx + 1) + ') ' + opt;
        btn.setAttribute('aria-label', window.__('storyOptionLabel', idx + 1, opt));
        btn.addEventListener('click', function() { answerListeningQuestion(idx); });
        storyOptions.appendChild(btn);
    });
}

function answerListeningQuestion(selectedIdx) {
    var qData = currentAIGameData.questions[currentAIGameData.currentQ];
    if (selectedIdx === qData.correct) {
        currentGameScore += 15;
        document.getElementById('game-score').textContent = currentGameScore;
        window.playSuccess3D();
        window.speak(window.__('gameCorrect') + '! +15');
    } else {
        window.playFail3D();
        window.speak(window.__('gameWrong') + '. ' + window.__('gameCorrectAnswer') + ': ' + qData.options[qData.correct]);
    }
    currentAIGameData.currentQ++;
    setTimeout(showListeningQuestion, 1500);
}

// ==================== Science Lab Simulator ====================

export function initScienceLab() {
    activeGameType = 'science-lab';
    currentGameScore = 0;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-title').textContent = window.__('gameScienceLab');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    document.getElementById('game-binary-options').classList.add('hidden');
    document.getElementById('game-story-options').classList.remove('hidden');

    var inputArea = document.getElementById('game-input-area');
    if (inputArea) inputArea.classList.add('hidden');

    if (gameTimerInterval) clearInterval(gameTimerInterval);
    startScienceLabRound();
    document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
}

function getScienceLabLevelText() {
    var d = getAgeLevelDifficulty();
    if (d <= 1) return "للأطفال في الابتدائية. تجربة بسيطة جداً عن الماء أو الهواء أو النباتات.";
    if (d <= 2) return "للمرحلة المتوسطة. تجربة في الكيمياء أو الفيزياء الأساسية.";
    if (d <= 3) return "للمرحلة الثانوية. تجربة معقدة في الفيزياء أو الأحياء أو الكيمياء.";
    return "للمرحلة الجامعية. تجربة مختبرية متقدمة في الكيمياء العضوية أو الفيزياء الحديثة.";
}

async function startScienceLabRound() {
    var storyOptions = document.getElementById('game-story-options');
    storyOptions.innerHTML = '';
    document.getElementById('game-question').textContent = window.__('gameScienceLoading');
    window.speak(window.__('gameScienceLoading'));

    window.play3DTone(200, 600, 'sine', 0.2, 0, 0, 2);

    var levelText = getScienceLabLevelText();
    var prompt = "صمم تجربة علمية تفاعلية صوتية مناسبة " + levelText + " اجعل التجربة من 3 خطوات متسلسلة. في كل خطوة، اوصف ما يحدث في المختبر بشكل مشوق، ثم اعرض 3 خيارات للطالب ليختار الإجراء الصحيح. أخرج النتيجة بصيغة JSON فقط بدون markdown: { \"title\": \"اسم التجربة\", \"intro\": \"مقدمة مشوقة عن التجربة\", \"steps\": [{ \"description\": \"وصف الخطوة\", \"options\": [\"إجراء 1\", \"إجراء 2\", \"إجراء 3\"], \"correct\": 0, \"explanation\": \"شرح لماذا هذا الإجراء صحيح\" }] }";

    try {
        var systemPrompt = window.getPrompt(window.getCurrentLang(), "أنت عالم متخصص في تصميم تجارب علمية تفاعلية ومشوقة للطلاب المكفوفين. أخرج JSON نظيف فقط.", "You are a scientist specializing in designing interactive and exciting experiments for blind students. Output clean JSON only.");
        var jsonText = await window.callGeminiAPI(prompt, systemPrompt);
        var parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        document.getElementById('game-question').textContent = '🧪 ' + parsed.title + '\n\n' + parsed.intro;
        window.speak(parsed.title + '. ' + parsed.intro);

        currentAIGameData = { steps: parsed.steps, currentStep: 0 };

        setTimeout(function() {
            window.speak(window.__('gameScienceReady'));
            setTimeout(showScienceStep, 1500);
        }, 3000);
    } catch (e) {
        console.error("Science lab error:", e);
        document.getElementById('game-question').textContent = window.__('gameAIError');
        window.speak(window.__('gameAIError'));
    }
}

function showScienceStep() {
    if (!currentAIGameData || currentAIGameData.currentStep >= currentAIGameData.steps.length) {
        window.speak(window.__('gameScienceComplete', currentGameScore));
        window.play3DTone(800, 1200, 'sine', 0.3, 0, 1, 0);
        endGame();
        return;
    }
    var step = currentAIGameData.steps[currentAIGameData.currentStep];
    var stepText = window.__('gameScienceStep', currentAIGameData.currentStep + 1) + ': ' + step.description;
    document.getElementById('game-question').textContent = stepText;
    window.speak(stepText);

    var storyOptions = document.getElementById('game-story-options');
    storyOptions.innerHTML = '';
    step.options.forEach(function(opt, idx) {
        var btn = document.createElement('button');
        btn.className = "p-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive";
        btn.textContent = (idx + 1) + ') ' + opt;
        btn.setAttribute('aria-label', window.__('storyOptionLabel', idx + 1, opt));
        btn.addEventListener('click', function() { answerScienceStep(idx); });
        storyOptions.appendChild(btn);
    });
}

function answerScienceStep(selectedIdx) {
    var step = currentAIGameData.steps[currentAIGameData.currentStep];
    if (selectedIdx === step.correct) {
        currentGameScore += 20;
        document.getElementById('game-score').textContent = currentGameScore;
        window.playSuccess3D();
        window.play3DTone(600, 900, 'sine', 0.2, 0, 0, 1);
        window.speak(window.__('gameCorrect') + '! ' + step.explanation);
    } else {
        window.playFail3D();
        window.speak(window.__('gameWrong') + '. ' + step.explanation);
    }
    currentAIGameData.currentStep++;
    setTimeout(showScienceStep, 2000);
}

// ==================== Geography Explorer ====================

export function initGeographyExplorer() {
    activeGameType = 'geography-explorer';
    currentGameScore = 0;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-title').textContent = window.__('gameGeography');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    document.getElementById('game-binary-options').classList.add('hidden');
    document.getElementById('game-story-options').classList.remove('hidden');

    var inputArea = document.getElementById('game-input-area');
    if (inputArea) inputArea.classList.add('hidden');

    if (gameTimerInterval) clearInterval(gameTimerInterval);
    startGeographyRound();
    document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
}

function getGeographyLevelText() {
    var d = getAgeLevelDifficulty();
    if (d <= 1) return "للأطفال في الابتدائية. اسأل عن القارات والمحيطات والعواصم الشهيرة والمعالم البسيطة.";
    if (d <= 2) return "للمرحلة المتوسطة. اسأل عن المناخ والتضاريس والموارد الطبيعية والحدود الجغرافية.";
    if (d <= 3) return "للمرحلة الثانوية. اسأل عن الجيوبوليتيك والتوزيع السكاني والظواهر الطبيعية المعقدة.";
    return "للمرحلة الجامعية. اسأل عن الجغرافيا الاقتصادية والجيوستراتيجية وتحليل الخرائط الديموغرافية.";
}

async function startGeographyRound() {
    var storyOptions = document.getElementById('game-story-options');
    storyOptions.innerHTML = '';
    document.getElementById('game-question').textContent = window.__('gameGeographyLoading');
    window.speak(window.__('gameGeographyLoading'));

    var levelText = getGeographyLevelText();
    var prompt = "أنشئ رحلة استكشافية جغرافية صوتية تفاعلية مناسبة " + levelText + " صمم مغامرة يستكشف فيها الطالب منطقة من العالم. اصنع 4 أسئلة متسلسلة، كل سؤال يكشف معلومة جديدة عن المنطقة. لكل سؤال 3 خيارات وخيار واحد صحيح. أخرج النتيجة بصيغة JSON فقط بدون markdown: { \"region\": \"اسم المنطقة\", \"intro\": \"مقدمة مشوقة عن الرحلة\", \"questions\": [{ \"q\": \"السؤال\", \"info\": \"معلومة تعليمية عن المنطقة\", \"options\": [\"خيار1\", \"خيار2\", \"خيار3\"], \"correct\": 0 }] }";

    try {
        var systemPrompt = window.getPrompt(window.getCurrentLang(), "أنت مستكشف جغرافي ومعلم تربوي متخصص في تعليم الجغرافيا للمكفوفين بطريقة مشوقة وتفاعلية. أخرج JSON نظيف فقط.", "You are a geographic explorer and educator specializing in teaching geography to blind students in an engaging interactive way. Output clean JSON only.");
        var jsonText = await window.callGeminiAPI(prompt, systemPrompt);
        var parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        document.getElementById('game-question').textContent = '🌍 ' + parsed.region + '\n\n' + parsed.intro;
        window.speak(window.__('gameGeographyWelcome') + ' ' + parsed.region + '! ' + parsed.intro);

        currentAIGameData = { questions: parsed.questions, currentQ: 0 };

        setTimeout(function() {
            window.speak(window.__('gameGeographyStart'));
            setTimeout(showGeographyQuestion, 1500);
        }, 3000);
    } catch (e) {
        console.error("Geography explorer error:", e);
        document.getElementById('game-question').textContent = window.__('gameAIError');
        window.speak(window.__('gameAIError'));
    }
}

function showGeographyQuestion() {
    if (!currentAIGameData || currentAIGameData.currentQ >= currentAIGameData.questions.length) {
        window.speak(window.__('gameGeographyComplete', currentGameScore));
        endGame();
        return;
    }
    var qData = currentAIGameData.questions[currentAIGameData.currentQ];

    if (qData.info) {
        window.speak(qData.info);
    }

    setTimeout(function() {
        document.getElementById('game-question').textContent = qData.q;
        window.speak(qData.q);

        var storyOptions = document.getElementById('game-story-options');
        storyOptions.innerHTML = '';
        qData.options.forEach(function(opt, idx) {
            var btn = document.createElement('button');
            btn.className = "p-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive";
            btn.textContent = (idx + 1) + ') ' + opt;
            btn.setAttribute('aria-label', window.__('storyOptionLabel', idx + 1, opt));
            btn.addEventListener('click', function() { answerGeographyQuestion(idx); });
            storyOptions.appendChild(btn);
        });
    }, 2000);
}

function answerGeographyQuestion(selectedIdx) {
    var qData = currentAIGameData.questions[currentAIGameData.currentQ];
    if (selectedIdx === qData.correct) {
        currentGameScore += 15;
        document.getElementById('game-score').textContent = currentGameScore;
        window.playSuccess3D();
        window.speak(window.__('gameCorrect') + '! +15');
    } else {
        window.playFail3D();
        window.speak(window.__('gameWrong') + '. ' + window.__('gameCorrectAnswer') + ': ' + qData.options[qData.correct]);
    }
    currentAIGameData.currentQ++;
    setTimeout(showGeographyQuestion, 1500);
}

export function pickQuestionByDifficulty(targetLevel) {
    var pool = questionBank.filter(function(q) { return q.d === targetLevel; });
    if (pool.length === 0) pool = questionBank;
    return pool[window.secureRandomInt(0, pool.length)];
}

export function initGame(gameType) {
    activeGameType = gameType;
    currentGameScore = 0;
    gameTimeLeft = 30;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-timer').textContent = "30";

    if (gameTimerInterval) clearInterval(gameTimerInterval);

    const binaryOptions = document.getElementById('game-binary-options');
    const storyOptions = document.getElementById('game-story-options');

    // Hide math input area for non-math games
    var inputArea = document.getElementById('game-input-area');
    if (inputArea) inputArea.classList.add('hidden');

    if (gameType === 'seconds') {
        document.getElementById('game-title').textContent = window.__('gameTrueFalse');
        document.getElementById('game-timer-wrapper').classList.remove('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        window.speak(window.__('gameTrueFalseStart'));
    } else if (gameType === 'hero') {
        document.getElementById('game-title').textContent = window.__('gameSpeed');
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        window.speak(window.__('gameSpeedStart'));
    } else if (gameType === 'pvp') {
        document.getElementById('game-title').textContent = window.__('gamePvP');
        document.getElementById('game-timer-wrapper').classList.remove('hidden');
        binaryOptions.classList.remove('hidden');
        storyOptions.classList.add('hidden');
        startNewGameRound();
        window.speak(window.__('gamePvPStart'));
    } else if (gameType === 'ai-story') {
        document.getElementById('game-title').textContent = window.__('gameStory');
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        window.startAiStoryRound(null);
    } else if (gameType === 'audio-memory') {
        document.getElementById('game-title').textContent = window.__('gameMemory');
        document.getElementById('game-timer-wrapper').classList.add('hidden');
        binaryOptions.classList.add('hidden');
        storyOptions.classList.add('hidden');
        initAudioMemoryUI();
        startAudioMemoryGame();
        return;
    } else if (gameType === 'math-challenge') {
        initMathChallenge();
        return;
    } else if (gameType === 'listening-quiz') {
        initListeningQuiz();
        return;
    } else if (gameType === 'science-lab') {
        initScienceLab();
        return;
    } else if (gameType === 'geography-explorer') {
        initGeographyExplorer();
        return;
    }

    if (gameType !== 'hero' && gameType !== 'ai-story' && gameType !== 'audio-memory') {
        gameTimerInterval = setInterval(() => {
            gameTimeLeft -= 1;
            document.getElementById('game-timer').textContent = gameTimeLeft;
            if (gameTimeLeft <= 5 && gameTimeLeft > 0) window.playTick3D();
            if (gameTimeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    document.getElementById('active-game-panel').scrollIntoView({ behavior: 'smooth' });
    setTimeout(window.setupAccessibleVoices, 200);
}

export function startNewGameRound() {
    if (activeGameType === 'audio-memory') {
        startAudioMemoryGame();
        return;
    }
    var level = 1;
    if (activeGameType === 'hero') {
        if (currentGameScore >= 80) level = 3;
        else if (currentGameScore >= 40) level = 2;
    }
    var questionData = pickQuestionByDifficulty(level);

    document.getElementById('game-question').textContent = questionData.q;
    currentCorrectAnswer = questionData.a;

    window.speak(questionData.q);

    setTimeout(function() { listenForGameAnswer(); }, 1500);
}

export function listenForGameAnswer() {
    if (typeof window.listenForSpeech !== 'function') return;
    window.speak(window.__('gameSpeakAnswer'));
    window.listenForSpeech(function(text) {
        if (!text) {
            window.speak(window.__('gameNoAnswer'));
            setTimeout(function() { listenForGameAnswer(); }, 1500);
            return;
        }
        var t = text.trim();
        if (t.indexOf('صح') !== -1 || t.indexOf('صحيح') !== -1 || t.indexOf('نعم') !== -1 || t.indexOf('yes') !== -1) {
            answerGame(true);
        } else if (t.indexOf('خطأ') !== -1 || t.indexOf('غلط') !== -1 || t.indexOf('لا') !== -1 || t.indexOf('no') !== -1) {
            answerGame(false);
        } else {
            window.speak(window.__('gameUnclear'));
            setTimeout(function() { listenForGameAnswer(); }, 1500);
        }
    }, 8000);
}

export function answerGame(userAnswer) {
    if (userAnswer === currentCorrectAnswer) {
        currentGameScore += 10;
        document.getElementById('game-score').textContent = currentGameScore;

        window.playSuccess3D();
        window.speak(window.__('gameCorrect'));

        setTimeout(function() { startNewGameRound(); }, 1000);
    } else {
        window.playFail3D();
        if (activeGameType === 'hero') {
            window.speak(window.__('gameWrongScore', currentGameScore));
            endGame();
        } else {
            window.speak(window.__('gameWrong'));
            setTimeout(function() { startNewGameRound(); }, 1000);
        }
    }
}

export function endGame() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    document.getElementById('active-game-panel').classList.add('hidden');
    window.speak(window.__('gameOver', currentGameScore));
    if (currentGameScore >= 50) {
        window.addNotification(window.__('notifGameAchievement'),
            (window.currentUserSession?.name || window.__('notifStudent')) + ' ' +
            window.__('notifGotScore') + ' ' + currentGameScore + ' ' + window.__('notifPointsInGame') + ' ' +
            (activeGameType === 'audio-memory' ? window.__('notifMemoryGame') : window.__('notifQuizGame')) + '!',
            'achievement');
    }
}

export function startAudioMemoryGame() {
    activeGameType = 'audio-memory';
    currentGameScore = 0;
    audioMemorySequence = [];
    audioMemoryStep = 0;

    document.getElementById('active-game-panel').classList.remove('hidden');
    document.getElementById('game-score').textContent = "0";
    document.getElementById('game-title').textContent = window.__('gameMemory');
    document.getElementById('game-timer-wrapper').classList.add('hidden');
    document.getElementById('game-binary-options').classList.add('hidden');
    document.getElementById('game-story-options').classList.add('hidden');
    document.getElementById('game-question').textContent = window.__('gameMemoryListen');

    window.speak(window.__('gameMemoryStart'));
    setTimeout(function() { addAudioMemoryStep(); }, 2000);
}

export function addAudioMemoryStep() {
    var idx = window.secureRandomInt(0, audioMemoryPatterns.length);
    audioMemorySequence.push(idx);
    playAudioMemorySequence();
}

export function playAudioMemorySequence() {
    var i = 0;
    function playNext() {
        if (i >= audioMemorySequence.length) {
            window.speak(window.__('gameMemoryYourTurn'));
            return;
        }
        var pattern = audioMemoryPatterns[audioMemorySequence[i]];
        var pos = { left: [-2,0,0], right: [2,0,0], front: [0,0,2], back: [0,0,-2] };
        var p = pos[pattern.dir] || [0, 0, 0];
        window.play3DTone(pattern.freq, pattern.freq * 1.5, 'sine', 0.3, p[0], p[1], p[2]);
        window.speak(pattern.name);
        i++;
        setTimeout(playNext, 1200);
    }
    window.speak(window.__('gameMemoryNew'));
    setTimeout(playNext, 500);
}

export function answerAudioMemory(patternIdx) {
    if (patternIdx === audioMemorySequence[audioMemoryStep]) {
        window.playSuccess3D();
        audioMemoryStep++;
        if (audioMemoryStep >= audioMemorySequence.length) {
            currentGameScore += 10;
            document.getElementById('game-score').textContent = currentGameScore;
            window.speak(window.__('gameMemoryComplete'));
            audioMemoryStep = 0;
            setTimeout(function() { addAudioMemoryStep(); }, 1500);
        }
    } else {
        window.playFail3D();
        window.speak(window.__('gameMemoryWrong', audioMemorySequence.map(function(i) { return audioMemoryPatterns[i].name; }).join(', ')));
        endGame();
    }
}

export function initAudioMemoryUI() {
    var container = document.getElementById('game-story-options');
    container.innerHTML = '';
    container.classList.remove('hidden');
    audioMemoryPatterns.forEach(function(p, idx) {
        var btn = document.createElement('button');
        btn.className = 'p-4 bg-purple-700 text-white font-bold text-xl rounded-xl btn-interactive';
        btn.textContent = p.name;
        btn.addEventListener('click', function() { answerAudioMemory(idx); });
        container.appendChild(btn);
    });
}

export function clearGameTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
}
