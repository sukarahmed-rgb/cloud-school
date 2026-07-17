// @ts-check
import { speak } from './speech.js';
import { __ } from './i18n.js';
import { callGeminiAPI } from './ai-utils.js';
import { listenForSpeech, stopSpeechRecognition, waitForSpeechEnd } from './speech-recognition.js';

let studyGroupRunning = false;
let studyGroupTopic = '';
let studyGroupHistory = [];
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
    bar.className = `text-lg font-bold ${isPurple ? 'text-purple-400' : 'text-yellow-400'}`;
  }
}

function addStudyGroupEntry(role, text) {
  const transcript = document.getElementById('study-group-transcript');
  if (!transcript) {
    return;
  }
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
  if (transcript) {
    transcript.innerHTML = '';
  }
}

async function startStudyGroup() {
  if (studyGroupRunning) {
    return;
  }
  studyGroupRunning = true;
  studyGroupCurrentStudent = 0;
  studyGroupHistory = [];

  const topicInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById('study-group-topic')
  );
  studyGroupTopic = topicInput
    ? topicInput.value.trim() || __('defaultSubject')
    : __('defaultSubject');

  document.getElementById('btn-study-group-start').classList.add('hidden');
  document.getElementById('btn-study-group-stop').classList.remove('hidden');
  document.getElementById('study-group-conversation').classList.remove('hidden');
  clearStudyGroupTranscript();

  updateStudyGroupStatus(__('studyGroupIntro', studyGroupTopic));
  addStudyGroupEntry('ai', __('studyGroupWelcome', studyGroupTopic));
  speak(__('studyGroupIntroduction', studyGroupTopic));

  await runStudyGroupTurn();
}

async function runStudyGroupTurn() {
  if (!studyGroupRunning) {
    return;
  }
  const currentName = STUDENT_NAMES[studyGroupCurrentStudent % 3];
  const historyText = studyGroupHistory.map((h) => `${h.role}: ${h.content}`).join('\n');

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

    updateStudyGroupStatus(__('studyGroupSpeakAs', parsed.nextSpeaker || currentName));
    document.getElementById('study-group-voice-status').textContent = __(
      'studyGroupPressSpeak',
      parsed.nextSpeaker || currentName,
    );
  } catch (e) {
    const questionText = `ماذا تعرف عن ${studyGroupTopic}؟`;
    addStudyGroupEntry('ai', `(${currentName}) ${questionText}`);
    speak(__('studyGroupQuestionFor', currentName, questionText));

    updateStudyGroupStatus(__('studyGroupSpeakAs', currentName));
    document.getElementById('study-group-voice-status').textContent = __(
      'studyGroupPressSpeak',
      currentName,
    );
  }
}

function parseStudyGroupResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}
  return {
    feedback: '',
    nextSpeaker: STUDENT_NAMES[studyGroupCurrentStudent % 3],
    question: text,
    type: 'discussion',
  };
}

function handleStudyGroupSpeech() {
  if (!studyGroupRunning) {
    return;
  }

  updateStudyGroupStatus(__('studyGroupListening'));
  document.getElementById('study-group-voice-status').textContent = __('studyGroupSpeakNow');

  listenForSpeech(async (text) => {
    if (!studyGroupRunning) {
      return;
    }
    if (!text || text.trim() === '') {
      speak(__('dialogicRetry'));
      return;
    }

    const currentName = STUDENT_NAMES[studyGroupCurrentStudent % 3];
    addStudyGroupEntry(currentName, text);
    studyGroupHistory.push({ role: currentName, content: text });

    studyGroupCurrentStudent++;

    if (studyGroupCurrentStudent >= 6) {
      await wrapUpStudyGroup();
      return;
    }

    await runStudyGroupTurn();
  }, 20000);
}

function skipStudyGroupTurn() {
  if (!studyGroupRunning) {
    return;
  }
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
  if (!studyGroupRunning) {
    return;
  }
  studyGroupRunning = false;

  const summaryPrompt = `لخّص جلسة المذاكرة الجماعية حول "${studyGroupTopic}".
الحوار:
${studyGroupHistory.map((h) => `${h.role}: ${h.content}`).join('\n')}

قدّم ملخصاً تعليمياً من 3 جمل.`;

  try {
    const summary = await callGeminiAPI(summaryPrompt, 'أنت معلم خبير');
    speak(__('studyGroupSummary', summary));
    addStudyGroupEntry('ai', __('studyGroupSessionSummary', summary));
  } catch (e) {
    speak(__('studyGroupThankYou'));
  }

  updateStudyGroupStatus(__('studyGroupSessionEnded'));
  document.getElementById('btn-study-group-start').classList.remove('hidden');
  document.getElementById('btn-study-group-stop').classList.add('hidden');
  document.getElementById('study-group-voice-status').textContent = __('sessionEnded');
}

function stopStudyGroup() {
  studyGroupRunning = false;
  stopSpeechRecognition();
  updateStudyGroupStatus(__('dialogicSessionStopped'));
  document.getElementById('btn-study-group-start').classList.remove('hidden');
  document.getElementById('btn-study-group-stop').classList.add('hidden');
  document.getElementById('study-group-voice-status').textContent = __('sessionEnded');
  speak(__('studyGroupEnd'));
}

export { startStudyGroup, stopStudyGroup, handleStudyGroupSpeech, skipStudyGroupTurn };
