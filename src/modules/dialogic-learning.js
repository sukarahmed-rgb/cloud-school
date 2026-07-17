// @ts-check
import { speak } from './speech.js';
import { __ } from './i18n.js';
import { callGeminiAPI } from './ai-utils.js';
import { listenForSpeech, stopSpeechRecognition, waitForSpeechEnd } from './speech-recognition.js';

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
    bar.className = `text-lg font-bold ${isGreen ? 'text-green-400' : 'text-yellow-400'}`;
  }
}

function addDialogicEntry(role, text) {
  const transcript = document.getElementById('dialogic-transcript');
  if (!transcript) {
    return;
  }
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
  if (transcript) {
    transcript.innerHTML = '';
  }
}

async function startDialogicClassroom() {
  if (dialogicRunning) {
    return;
  }
  dialogicRunning = true;
  dialogicHistory = [];

  document.getElementById('btn-dialogic-start').classList.add('hidden');
  document.getElementById('btn-dialogic-stop').classList.remove('hidden');
  document.getElementById('dialogic-conversation').classList.remove('hidden');
  clearDialogicTranscript();

  updateDialogicStatus(__('dialogicStarting'));
  speak(__('dialogicWelcome'));
  addDialogicEntry('ai', __('dialogicWelcomeEntry'));

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
  if (!dialogicRunning) {
    return;
  }
  const firstPrompt = `الموضوع: "${dialogicSubject}". اطرح أول سؤال تعليمي للطالب.`;
  try {
    const result = await callGeminiAPI(firstPrompt, DIALOGIC_SYSTEM_PROMPT);
    const parsed = parseDialogicResponse(result);
    if (!parsed) {
      throw new Error('Failed to parse');
    }
    await askDialogicQuestion(parsed);
  } catch (e) {
    await askDialogicQuestion({
      assessment: 'جيد',
      explanation: 'لنبدأ بسؤال بسيط.',
      question: `ماذا تعرف عن ${dialogicSubject}؟`,
      type: 'open',
    });
  }
}

function parseDialogicResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}
  return {
    assessment: 'جيد',
    explanation: '',
    question: text,
    type: 'open',
  };
}

async function askDialogicQuestion(parsed) {
  if (!dialogicRunning) {
    return;
  }
  const questionText = parsed.question || parsed.explanation || 'ماذا تعرف عن هذا الموضوع؟';
  addDialogicEntry('ai', questionText);
  speak(questionText);

  updateDialogicStatus(__('dialogicListen'));
  document.getElementById('dialogic-voice-status').textContent = __('dialogicTeacherSpeaking');
  await waitForSpeechEnd(2000);

  updateDialogicStatus(__('dialogicListen'));
  document.getElementById('dialogic-voice-status').textContent = __('dialogicSpeakToAnswer');

  listenForSpeech(async (studentAnswer) => {
    if (!dialogicRunning) {
      return;
    }
    if (!studentAnswer || studentAnswer.trim() === '') {
      speak(__('dialogicRetry'));
      updateDialogicStatus(__('dialogicRetryStatus'));
      listenForSpeech(async (retry) => {
        if (retry && retry.trim()) {
          await processStudentAnswer(retry);
        } else {
          await processStudentAnswer(__('dialogicNoAnswer'));
        }
      }, 15000);
      return;
    }
    await processStudentAnswer(studentAnswer);
  }, 30000);
}

async function processStudentAnswer(answer) {
  if (!dialogicRunning) {
    return;
  }
  addDialogicEntry('student', answer);
  updateDialogicStatus(__('dialogicEvaluating'));
  speak(__('dialogicThinking'));

  dialogicHistory.push({ role: 'student', content: answer });

  const historyText = dialogicHistory
    .map((h) => (h.role === 'ai' ? `المدرس: ${h.content}` : `الطالب: ${h.content}`))
    .join('\n');

  const prompt = `الموضوع: "${dialogicSubject}"
تاريخ الحوار:
${historyText}

الآن، قيّم آخر إجابة للطالب واطرح السؤال التالي حسب مستواه.`;

  try {
    const result = await callGeminiAPI(prompt, DIALOGIC_SYSTEM_PROMPT);
    const parsed = parseDialogicResponse(result);
    dialogicHistory.push({ role: 'ai', content: parsed.question || parsed.explanation });

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
      type: 'open',
    });
  }
}

async function wrapUpDialogicSession() {
  if (!dialogicRunning) {
    return;
  }
  dialogicRunning = false;

  const summaryPrompt = `الطالب درس موضوع "${dialogicSubject}" في جلسة حوارية. 
الحوار كاملاً:
${dialogicHistory.map((h) => `${h.role}: ${h.content}`).join('\n')}

قدّم ملخصاً تقييمياً من سطرين: مستوى الفهم، نقاط القوة، نقاط الضعف، ونصيحة للطالب.`;

  try {
    const summary = await callGeminiAPI(summaryPrompt, 'أنت معلم خبير');
    speak(__('dialogicSummary', summary));
    addDialogicEntry('ai', __('dialogicSessionEval', summary));
  } catch (e) {
    speak(__('dialogicThankYou'));
  }

  updateDialogicStatus(__('dialogicSessionEnded'));
  document.getElementById('btn-dialogic-start').classList.remove('hidden');
  document.getElementById('btn-dialogic-stop').classList.add('hidden');
  document.getElementById('dialogic-voice-status').textContent = __('dialogicSessionComplete');
}

function stopDialogicClassroom() {
  dialogicRunning = false;
  stopSpeechRecognition();
  updateDialogicStatus(__('dialogicSessionStopped'));
  document.getElementById('btn-dialogic-start').classList.remove('hidden');
  document.getElementById('btn-dialogic-stop').classList.add('hidden');
  document.getElementById('dialogic-voice-status').textContent = __('sessionEnded');
  speak(__('dialogicEnd'));
}

export function triggerDialogicAnswer() {
  if (!dialogicRunning) {
    return;
  }
  updateDialogicStatus(__('dialogicListening'));
  document.getElementById('dialogic-voice-status').textContent = __('dialogicSpeakNow');
  listenForSpeech(async (text) => {
    if (text && text.trim()) {
      await processStudentAnswer(text);
    }
  }, 20000);
}

export { startDialogicClassroom, stopDialogicClassroom };
