import { base64ToArrayBuffer, pcmToWav } from './helpers.js';
import { getPrompt, getCurrentLang } from './i18n.js';

export function getProxyBase() {
  if (window.serverAvailable) {
    return '';
  }
  const override = localStorage.getItem('cloudSchoolProxyUrl');
  return override || 'http://localhost:3001';
}

export async function proxyFetch(endpoint, payload) {
  const url = `${getProxyBase()}/api/gemini/${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };

  if (!window.serverAvailable) {
    if (typeof window.getGeminiKey === 'function') {
      const apiKey = window.getGeminiKey();
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }
    }
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Proxy error (${response.status}): ${errText}`);
  }

  return response.json();
}

export function buildTextPayload(text, systemPrompt) {
  const payload = { contents: [{ parts: [{ text }] }] };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return payload;
}

export function buildMediaPayload(parts, systemPrompt) {
  const payload = { contents: [{ parts }] };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return payload;
}

export function extractText(result) {
  return result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

export function extractAudio(result) {
  const part = result?.candidates?.[0]?.content?.parts?.[0];
  const audioData = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType;
  if (!audioData || !mimeType?.startsWith('audio/')) {
    return null;
  }
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
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/** استدعاء مع وسائط (صور/صوت) */
export async function callGeminiWithMedia(parts, systemPrompt, endpoint = 'vision') {
  const payload = buildMediaPayload(parts, systemPrompt);
  const result = await proxyFetch(endpoint, payload);
  return extractText(result);
}

/** تحويل النص إلى كلام عبر Gemini TTS */
export async function speakWithGeminiTTS(text) {
  try {
    const payload = {
      contents: [
        {
          parts: [{ text: `تحدث باللغة العربية الفصحى بصوت دافئ: ${text}` }],
        },
      ],
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
    if (!audio) {
      return null;
    }

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
      {
        text: getPrompt(
          getCurrentLang(),
          'فرغ ما يقال حرفياً بالعربية بدون إضافات.',
          'Transcribe the speech verbatim in English without any additions.',
        ),
      },
      { inlineData: { mimeType, data: base64Audio } },
    ],
    null,
    'transcribe',
  );
  return text;
}

/** تحليل الصور */
export async function describeImage(base64Image, mimeType) {
  return callGeminiWithMedia([
    {
      text: getPrompt(
        getCurrentLang(),
        'صف هذه الصورة بالتفصيل لطالب كفيف بالعربية.',
        'Describe this image in detail for a blind student in English. Describe the scene, colors, people, and details accurately.',
      ),
    },
    { inlineData: { mimeType, data: base64Image } },
  ]);
}
