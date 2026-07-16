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
