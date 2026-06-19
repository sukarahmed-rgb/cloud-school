/**
 * Gemini module - جميع استدعاءات الذكاء الاصطناعي
 * 
 * جميع الطلبات تذهب عبر الـ proxy server لحماية مفتاح API.
 * المفتاح موجود فقط في .env على السيرفر، وليس في الواجهة الأمامية.
 */

function getProxyBase() {
  const override = localStorage.getItem('cloudSchoolProxyUrl');
  return override || 'http://127.0.0.1:3001';
}

async function proxyFetch(endpoint, payload) {
  const url = `${getProxyBase()}/api/gemini/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Proxy error (${response.status}): ${errText}`);
  }

  return response.json();
}

function buildTextPayload(text, systemPrompt) {
  const payload = { contents: [{ parts: [{ text }] }] };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return payload;
}

function buildMediaPayload(parts, systemPrompt) {
  const payload = { contents: [{ parts }] };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return payload;
}

function extractText(result) {
  return result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

function extractAudio(result) {
  const part = result?.candidates?.[0]?.content?.parts?.[0];
  const audioData = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType;
  if (!audioData || !mimeType?.startsWith('audio/')) return null;
  return { audioData, mimeType };
}

/** استدعاء Gemini نصوص مع إعادة محاولة */
export async function callGemini(userQuery, systemPrompt, maxRetries = 3) {
  const payload = buildTextPayload(userQuery, systemPrompt);
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await proxyFetch('text', payload);
      return extractText(result);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/** استدعاء مع وسائط (صور/صوت) */
async function callGeminiWithMedia(parts, systemPrompt, endpoint = 'vision') {
  const payload = buildMediaPayload(parts, systemPrompt);
  const result = await proxyFetch(endpoint, payload);
  return extractText(result);
}

/** تحويل النص إلى كلام عبر Gemini TTS */
export async function speakWithGeminiTTS(text) {
  try {
    const payload = {
      contents: [{
        parts: [{ text: `تحدث باللغة العربية الفصحى بصوت دافئ: ${text}` }],
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    };

    const result = await proxyFetch('tts', payload);
    const audio = extractAudio(result);
    if (!audio) return null;

    const { audioData, mimeType } = audio;
    const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)?.[1] || '24000', 10);
    const pcmBuffer = base64ToArrayBuffer(audioData);
    const wavBlob = pcmToWav(pcmBuffer, sampleRate);
    return URL.createObjectURL(wavBlob);
  } catch {
    return null;
  }
}

/** تفريغ الصوت إلى نص */
export async function transcribeAudio(base64Audio, mimeType) {
  const text = await callGeminiWithMedia(
    [
      { text: 'فرغ ما يقال حرفياً بالعربية بدون إضافات.' },
      { inlineData: { mimeType, data: base64Audio } },
    ],
    null,
    'transcribe'
  );
  return text;
}

/** تحليل الصور */
export async function describeImage(base64Image, mimeType) {
  return callGeminiWithMedia([
    { text: 'صف هذه الصورة بالتفصيل لطالب كفيف بالعربية.' },
    { inlineData: { mimeType, data: base64Image } },
  ]);
}

/** سؤال المعلم الافتراضي */
export async function askTutor(question) {
  return callGemini(question, 'أنت معلم ودود تشرح للطلاب المكفوفين ببساطة.');
}

/** تلخيص كتاب */
export async function summarizeBook(content) {
  return callGemini(
    `لخص: "${content}" مع 3 أسئلة مراجعة.`,
    'أنت خبير تلخيص مناهج للمكفوفين.'
  );
}

/** تقييم إجابة برايل */
export async function evaluateBraille(text) {
  return callGemini(
    `صحح النص: "${text}" وقدم تقريراً تشجيعياً.`,
    'أنت معلم لغة عربية وخبير برايل.'
  );
}

/** توليد اختبار */
export async function generateQuiz() {
  const json = await callGemini(
    'ولد سؤال اختيار من متعدد في العلوم. أخرج JSON فقط: {question, A, B, C, D, correct}.',
    'أنت مصمم اختبارات.'
  );
  return JSON.parse(json.replace(/```json|```/g, '').trim());
}

/** قصة تفاعلية */
export async function generateStory(choiceIndex) {
  const prompt =
    choiceIndex === null
      ? 'اصنع قصة تفاعلية عن الفضاء بـ JSON: {story, options:[]}. 3 خيارات.'
      : `استمرار القصة. اختار الطالب الخيار ${choiceIndex + 1}. أخرج JSON: {story, options:[]}.`;

  const json = await callGemini(prompt, 'أنت راوي قصص.');
  return JSON.parse(json.replace(/```json|```/g, '').trim());
}

/** تصحيح إجابة مقالية */
export async function gradeAnswer(studentAnswer) {
  return callGemini(
    `قيم الإجابة: "${studentAnswer}" وأعط درجة من 100 مع تعليق.`,
    'أنت مصحح.'
  );
}

// ====== مساعدات صوتية (محلية، لا تحتاج API) ======
function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function pcmToWav(pcmBuffer, sampleRate) {
  const buf = new ArrayBuffer(44 + pcmBuffer.byteLength);
  const v = new DataView(buf);
  const w = (o, s, l) => { if (l) v.setUint32(o, s, true); else v.setUint32(o, s, false); };
  w(0, 0x52494646, false);
  w(4, 36 + pcmBuffer.byteLength, true);
  w(8, 0x57415645, false);
  w(12, 0x666d7420, false);
  w(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  w(24, sampleRate, true);
  w(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 0x64617461, false);
  w(40, pcmBuffer.byteLength, true);
  const pcm = new Int16Array(pcmBuffer);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, pcm[i], true);
  return new Blob([buf], { type: 'audio/wav' });
}
