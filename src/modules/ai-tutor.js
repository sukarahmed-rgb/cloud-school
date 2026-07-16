let ctx = null;

export function configureAiTutor(context) {
  ctx = context;
}

export async function startAiStoryRound(choiceIndex = null) {
  if (!ctx) return;
  const questionText = document.getElementById('game-question');
  const binaryOptions = document.getElementById('game-binary-options');
  const storyOptions = document.getElementById('game-story-options');

  binaryOptions.classList.add('hidden');
  storyOptions.classList.remove('hidden');
  storyOptions.innerHTML = '';

  ctx.showLoading('game-question', ctx.__('loadingStory'));
  ctx.speak(ctx.__('storyGenerating'));

  let prompt = "";
  if (choiceIndex === null) {
    prompt = "اصنع قصة تعليمية تفاعلية قصيرة مشوقة وملهمة باللغة العربية الفصحى لطلاب مكفوفين عن مغامرة في النظام الشمسي لتعلم الكواكب. أنهِ المقطع الأول بـ 3 خيارات لمواصلة المغامرة. أخرج النتيجة بصيغة JSON فقط بدون علامات markdown، وتحتوي الهيكل التالي: { 'story': 'نص المقطع المثير والمبسط وعلاقته بالمقرر الدراسي', 'options': ['خيار المغامرة الأول المثير كجملة قصيرة', 'خيار المغامرة الثاني المثير كجملة قصيرة', 'خيار المغامرة الثالث المثير كجملة قصيرة'] }";
  } else {
    prompt = `استكمالاً للقصة السابقة المروية، اختار الطالب الخيار رقم ${choiceIndex + 1}. تابع تفاصيل المغامرة في الفضاء وعلمهم معلومات جديدة ومفيدة، ثم أنهِ المقطع مجدداً بـ 3 خيارات جديدة لمتابعة القصة ومواصلة التحدي. أخرج النتيجة بصيغة JSON فقط بنفس التنسيق: { 'story': 'نص المقطع المثير والمبسط وعلاقته بالمقرر الدراسي', 'options': ['خيار 1', 'خيار 2', 'خيار 3'] }`;
  }

  try {
    const jsonText = await ctx.callGeminiAPI(prompt, ctx.getPrompt(ctx.getCurrentLang(), "أنت مصمم قصص تفاعلية وتعليمية ملهمة ومختص في صياغة ملفات JSON نقية ومبسطة.", "You are a designer of inspiring interactive educational stories and an expert in formulating clean and simplified JSON files."));
    const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

    questionText.textContent = parsed.story;
    ctx.speak(parsed.story);

    parsed.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = "p-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl rounded-xl transition duration-150 text-right w-full large-touch-target border-2 border-current focus-ring btn-interactive";
      btn.textContent = `${idx + 1}) ${opt}`;
      btn.setAttribute('aria-label', ctx.__('storyOptionLabel', idx + 1, opt));
      btn.addEventListener('click', () => {
        ctx.playSuccess3D();
        startAiStoryRound(idx);
      });
      storyOptions.appendChild(btn);
    });

    setTimeout(ctx.setupAccessibleVoices, 200);
  } catch (error) {
    console.error("Storyteller Error:", error);
    questionText.textContent = ctx.__('storyError');
    ctx.speak(ctx.__('storyError'));
  }
}

export async function analyzeImageWithGemini() {
  if (!ctx) return;
  const uploadedImageBase64 = ctx.getUploadedImageBase64();
  const uploadedImageMime = ctx.getUploadedImageMime();
  if (!uploadedImageBase64) {
    ctx.speak(ctx.__('visionSelectImage'));
    return;
  }

  const responseBox = document.getElementById('vision-response-box');
  responseBox.classList.remove('hidden');
  ctx.showLoading('vision-response-text', ctx.__('loadingVision'));
  ctx.speak(ctx.__('visionAnalyzing'));

  try {
    const description = await ctx.describeImage(uploadedImageBase64, uploadedImageMime);
    document.getElementById('vision-response-text').textContent = description;
    ctx.speak(description);
  } catch (error) {
    ctx.handleError('analyzeImage', error);
    document.getElementById('vision-response-text').textContent = ctx.__('visionError');
  }
}

export async function askAITutor() {
  if (!ctx) return;
  const queryText = document.getElementById('ai-tutor-query').value.trim();
  if (!queryText) {
    ctx.speak(ctx.__('tutorAskFirst'));
    return;
  }

  document.getElementById('ai-tutor-response-box').classList.remove('hidden');
  ctx.showLoading('ai-tutor-response-text', ctx.__('loadingTutor'));
  ctx.speak(ctx.__('tutorThinking'));

  try {
    const responseText = await ctx.callGeminiAPI(queryText, ctx.getPrompt(ctx.getCurrentLang(), "أنت معلم ودود متخصص في شرح المناهج الدراسية للمكفوفين وضعاف البصر من جميع المراحل العمرية. قدّم الشرح بمستوى يناسب الطالب: للطفل استخدم تبسيطاً شديداً وأمثلة يومية، وللشاب والبالغ استخدم أسلوباً أكاديمياً مناسباً مع الحفاظ على الوضوح.", "You are a friendly teacher specialized in explaining curricula for blind and visually impaired students of all ages. Provide explanations at a level suitable for the student: use extreme simplification and daily examples for children, and an appropriate academic style for young people and adults while maintaining clarity."));
    document.getElementById('ai-tutor-response-text').textContent = responseText;
    ctx.speak(responseText);
  } catch (error) {
    document.getElementById('ai-tutor-response-text').textContent = ctx.__('tutorError');
    ctx.speak(ctx.__('tutorError'));
  }
}

export async function generateAIQuiz() {
  if (!ctx) return;
  ctx.speak(ctx.__('quizLoading'));
  const btn = document.getElementById('btn-ai-generate');
  btn.textContent = ctx.__('quizGenerating');

  const prompt = "ولد سؤال اختبار حقيقي واحد في مادة العلوم يتكون من اختيار من متعدد مع أربعة خيارات وتحديد الخيار الصحيح. أخرج النتيجة بتنسيق JSON نظيف وبسيط يحتوي على مفاتيح: question, A, B, C, D, correct.";

  try {
    const jsonText = await ctx.callGeminiAPI(prompt, ctx.getPrompt(ctx.getCurrentLang(), "أنت مصمم اختبارات أكاديمي متميز. ", "You are an excellent academic quiz designer. ") + ctx.getAgeTone());
    const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

    document.getElementById('teacher-quiz-title').value = ctx.__('autoGeneratedQuizTitle');
    document.getElementById('teacher-quiz-q').value = parsed.question;
    document.getElementById('teacher-quiz-oa').value = parsed.A;
    document.getElementById('teacher-quiz-ob').value = parsed.B;
    document.getElementById('teacher-quiz-oc').value = parsed.C;
    document.getElementById('teacher-quiz-od').value = parsed.D;
    document.getElementById('teacher-quiz-correct').value = parsed.correct;

    ctx.speak(ctx.__('quizReady'));
  } catch (e) {
    ctx.handleError(e, 'quizGeneration');
    ctx.speak(ctx.__('quizFailed'));
  } finally {
    btn.textContent = ctx.__('quizGenerateBtn');
  }
}

export function startAITutorSpeech() {
  if (!ctx) return;
  const speechRecognizer = ctx.getSpeechRecognizer();
  if (speechRecognizer) {
    speechRecognizer.start();
  } else {
    ctx.speak(ctx.__('speechUnavailable'));
  }
}

export function speakAITutorResponse() {
  if (!ctx) return;
  const responseText = document.getElementById('ai-tutor-response-text').textContent;
  ctx.speak(responseText);
}

export async function gradeSubmissionWithAI(index) {
  if (!ctx) return;
  const sub = ctx.localData.submissions[index];
  if (!sub) return;

  ctx.speak(ctx.__('gradingInProgress'));

  const prompt = `قارن إجابة الطالب: "${sub.studentAnswer}" مع السؤال المقالي وصححه إملائياً ولغوياً وقدم تقريراً من سطرين متضمناً الدرجة المقترحة (من 100) مع الكلمات المشجعة للطالب الكفيف.`;

  try {
    const report = await ctx.callGeminiAPI(prompt, ctx.getPrompt(ctx.getCurrentLang(), "أنت مصحح ومعلم تربوي. ", "You are a grader and educational teacher. ") + ctx.getAgeTone());
    sub.initialScore = 95;
    sub.graderFeedback = report;
    ctx.saveLocalData();

    ctx.renderTeacherSubmissions();
    ctx.speak(ctx.__('gradingDone'));
  } catch (e) {
    ctx.speak(ctx.__('gradingFailed'));
  }
}
