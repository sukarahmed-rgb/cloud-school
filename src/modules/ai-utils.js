// @ts-check
import { callGemini } from './gemini-client.js';
import { handleError } from './error-handler.js';
import { currentlyPlayingBookId } from './books.js';
import { getAgeTone } from './accessibility.js';
import { showLoading } from './ui-core.js';
import { speak } from './speech.js';
import { getPrompt, getCurrentLang, __ } from './i18n.js';

/**
 * @param {string} userQuery
 * @param {string} systemPrompt
 * @param {number} [maxRetries=5]
 * @returns {Promise<string>}
 */
export async function callGeminiAPI(userQuery, systemPrompt, maxRetries = 5) {
  try {
    return await callGemini(userQuery, systemPrompt, maxRetries);
  } catch (error) {
    handleError('GeminiAPI', error);
    return __('errorAIConnectionFailed');
  }
}

/**
 * @param {Object} deps
 * @param {Book[]} deps.books
 * @returns {Promise<void>}
 */
export async function summarizeCurriculumBookWithAI({ books }) {
  if (!currentlyPlayingBookId) {
    return;
  }
  const book = /** @type {Book|undefined} */ (books.find((b) => b.id === currentlyPlayingBookId));
  if (!book) {
    return;
  }

  const summaryBox = document.getElementById('book-ai-summary-box');
  summaryBox.classList.remove('hidden');
  showLoading('book-ai-summary-text', __('loadingBookSummary'));
  speak(__('bookSummarizing'));

  const prompt = `قم بتلخيص المحتوى الدراسي التالي بالتفصيل بأسلوب نقاطي سمعي فائق الوضوح ومناسب للمكفوفين من جميع الأعمار لتسهيل الحفظ كبطاقات استذكار سريعة: "${book.content}". وولد أيضاً ثلاثة أسئلة مراجعة وتنشيط للذاكرة في نهاية التلخيص. ${getAgeTone()}`;

  try {
    const resultText = await callGeminiAPI(
      prompt,
      getPrompt(
        getCurrentLang(),
        'أنت خبير تعليمي متميز في صياغة وتلخيص المناهج الدراسية لضعاف البصر بطريقة سمعية مبسطة للغاية.',
        'You are an excellent educational expert in formulating and summarizing curricula for the visually impaired in a highly simplified audio manner.',
      ),
    );
    document.getElementById('book-ai-summary-text').textContent = resultText;
    speak(resultText);
  } catch (error) {
    handleError(error, 'bookSummary');
    document.getElementById('book-ai-summary-text').textContent = __('bookSummaryError');
    speak(__('bookSummaryFailed'));
  }
}

/** @returns {Promise<void>} */
export async function translateAndEvaluateBrailleWithAI() {
  const answerTextarea = document.getElementById('assignment-student-answer');
  const answerText = /** @type {HTMLTextAreaElement} */ (answerTextarea).value.trim();

  if (!answerText) {
    speak(__('brailleFirst'));
    return;
  }

  const evalBox = document.getElementById('braille-evaluation-box');
  const evalText = document.getElementById('braille-evaluation-text');

  evalBox.classList.remove('hidden');
  showLoading('braille-evaluation-text', __('loadingBrailleTranslate'));
  speak(__('brailleChecking'));

  const prompt = `لقد كتب طالب كفيف هذا النص التعليمي باللغة العربية: "${answerText}". قم بمراجعة الإملاء، وتوضيح الكلمات المترجمة والتركيبات النحوية، وإعطائه تقريراً تربوياً وصوتياً فائق التشجيع لتنمية مهارات برايل لديه، مع تقديم النص المصحح والنهائي بشكل واضح وبسيط ومريح للقراءة.`;

  try {
    const resultText = await callGeminiAPI(
      prompt,
      getPrompt(
        getCurrentLang(),
        'أنت معلم لغة عربية متميز وخبير في ترجمة وتصحيح لغة برايل وطريقة Perkins للمكفوفين من جميع المراحل العمرية. ',
        'You are an excellent Arabic language teacher and expert in Braille translation and grading for blind students of all ages using the Perkins method. ',
      ) + getAgeTone(),
    );
    evalText.textContent = resultText;
    speak(resultText);
  } catch (error) {
    handleError(error, 'brailleEval');
    evalText.textContent = __('brailleEvalError');
    speak(__('brailleEvalFailed'));
  }
}
