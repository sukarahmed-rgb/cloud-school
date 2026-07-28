import {
  getProxyBase,
  proxyFetch,
  buildTextPayload,
  buildMediaPayload,
  extractText,
  extractAudio,
  callGemini,
  callGeminiWithMedia,
  speakWithGeminiTTS,
  transcribeAudio,
  describeImage,
} from '../../src/modules/gemini-client.js';

jest.mock('../../src/modules/helpers.js', () => ({
  base64ToArrayBuffer: jest.fn(() => new ArrayBuffer(8)),
  pcmToWav: jest.fn(() => new Blob(['wav'], { type: 'audio/wav' })),
}));

jest.mock('../../src/modules/i18n.js', () => ({
  getPrompt: jest.fn((lang, ar, en) => (lang === 'ar' ? ar : en)),
  getCurrentLang: jest.fn(() => 'ar'),
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.serverAvailable = false;
  localStorage.clear();
  global.fetch = jest.fn();
  URL.createObjectURL = jest.fn(() => 'blob:mock');
  URL.revokeObjectURL = jest.fn();
  window.getGeminiKey = jest.fn(() => 'test-key');
});

describe('getProxyBase', () => {
  it('returns empty string when serverAvailable is true', () => {
    window.serverAvailable = true;
    expect(getProxyBase()).toBe('');
  });

  it('returns localStorage override when set', () => {
    localStorage.setItem('cloudSchoolProxyUrl', 'http://custom:8080');
    expect(getProxyBase()).toBe('http://custom:8080');
  });

  it('returns default localhost when no override', () => {
    expect(getProxyBase()).toBe('http://localhost:3001');
  });
});

describe('buildTextPayload', () => {
  it('builds payload without system prompt', () => {
    const payload = buildTextPayload('hello');
    expect(payload).toEqual({
      contents: [{ parts: [{ text: 'hello' }] }],
    });
    expect(payload.systemInstruction).toBeUndefined();
  });

  it('builds payload with system prompt', () => {
    const payload = buildTextPayload('hello', 'system msg');
    expect(payload).toEqual({
      contents: [{ parts: [{ text: 'hello' }] }],
      systemInstruction: { parts: [{ text: 'system msg' }] },
    });
  });
});

describe('buildMediaPayload', () => {
  it('builds payload without system prompt', () => {
    const parts = [{ text: 'hi' }, { inlineData: { mimeType: 'image/png', data: 'abc' } }];
    const payload = buildMediaPayload(parts);
    expect(payload).toEqual({
      contents: [{ parts }],
    });
    expect(payload.systemInstruction).toBeUndefined();
  });

  it('builds payload with system prompt', () => {
    const parts = [{ text: 'hi' }];
    const payload = buildMediaPayload(parts, 'system msg');
    expect(payload).toEqual({
      contents: [{ parts }],
      systemInstruction: { parts: [{ text: 'system msg' }] },
    });
  });
});

describe('extractText', () => {
  it('returns text from valid result', () => {
    const result = { candidates: [{ content: { parts: [{ text: 'hello world' }] } }] };
    expect(extractText(result)).toBe('hello world');
  });

  it('returns "No response." for null', () => {
    expect(extractText(null)).toBe('No response.');
  });

  it('returns "No response." for undefined', () => {
    expect(extractText(undefined)).toBe('No response.');
  });

  it('returns "No response." for empty object', () => {
    expect(extractText({})).toBe('No response.');
  });
});

describe('extractAudio', () => {
  it('returns audio data for valid result', () => {
    const result = {
      candidates: [
        {
          content: { parts: [{ inlineData: { mimeType: 'audio/wav', data: 'base64data' } }] },
        },
      ],
    };
    expect(extractAudio(result)).toEqual({ audioData: 'base64data', mimeType: 'audio/wav' });
  });

  it('returns null for no inlineData', () => {
    const result = { candidates: [{ content: { parts: [{ text: 'just text' }] } }] };
    expect(extractAudio(result)).toBeNull();
  });

  it('returns null for non-audio mime type', () => {
    const result = {
      candidates: [
        {
          content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'abc' } }] },
        },
      ],
    };
    expect(extractAudio(result)).toBeNull();
  });

  it('returns null for null/undefined result', () => {
    expect(extractAudio(null)).toBeNull();
    expect(extractAudio(undefined)).toBeNull();
  });
});

describe('proxyFetch', () => {
  it('makes fetch with correct URL and headers when server is available', async () => {
    window.serverAvailable = true;
    const mockJson = { ok: true };
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(mockJson) });

    const result = await proxyFetch('text', { contents: [] });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/gemini/text',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(result).toBe(mockJson);
  });

  it('includes x-api-key header when server not available', async () => {
    window.serverAvailable = false;
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });

    await proxyFetch('text', {});

    const callHeaders = global.fetch.mock.calls[0][1].headers;
    expect(callHeaders['x-api-key']).toBe('test-key');
  });

  it('does not include x-api-key when getGeminiKey returns empty', async () => {
    window.serverAvailable = false;
    window.getGeminiKey = jest.fn(() => '');
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });

    await proxyFetch('text', {});

    const callHeaders = global.fetch.mock.calls[0][1].headers;
    expect(callHeaders['x-api-key']).toBeUndefined();
  });

  it('does not include x-api-key when getGeminiKey is not a function', async () => {
    window.serverAvailable = false;
    window.getGeminiKey = undefined;
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });

    await proxyFetch('text', {});

    const callHeaders = global.fetch.mock.calls[0][1].headers;
    expect(callHeaders['x-api-key']).toBeUndefined();
  });

  it('throws on non-ok response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Server Error'),
    });

    await expect(proxyFetch('text', {})).rejects.toThrow(
      'Proxy error (500): Internal Server Error',
    );
  });
});

describe('callGemini', () => {
  it('returns text on first success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'result' }] } }],
      }),
    });

    const result = await callGemini('query', 'sys');
    expect(result).toBe('result');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    global.fetch.mockRejectedValueOnce(new Error('fail 1')).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'recovered' }] } }],
      }),
    });

    const result = await callGemini('query', 'sys', 2);
    expect(result).toBe('recovered');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries exhausted', async () => {
    global.fetch.mockRejectedValue(new Error('always fail'));

    await expect(callGemini('query', 'sys', 2)).rejects.toThrow('always fail');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('callGeminiWithMedia', () => {
  it('calls proxyFetch and extracts text', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'media result' }] } }],
      }),
    });

    const parts = [{ text: 'describe' }, { inlineData: { mimeType: 'image/png', data: 'img' } }];
    const result = await callGeminiWithMedia(parts, 'sys prompt', 'vision');

    expect(result).toBe('media result');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'sys prompt' }] });
  });
});

describe('speakWithGeminiTTS', () => {
  it('returns blob URL on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'cG1jZGF0YQ==' } }],
            },
          },
        ],
      }),
    });

    const result = await speakWithGeminiTTS('مرحبا');
    expect(result).toBe('blob:mock');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('returns null on fetch failure', async () => {
    global.fetch.mockRejectedValue(new Error('network error'));

    const result = await speakWithGeminiTTS('مرحبا');
    expect(result).toBeNull();
  });

  it('returns null when no audio in response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'text only' }] } }],
      }),
    });

    const result = await speakWithGeminiTTS('مرحبا');
    expect(result).toBeNull();
  });
});

describe('transcribeAudio', () => {
  it('calls callGeminiWithMedia with correct params', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'transcribed text' }] } }],
      }),
    });

    const result = await transcribeAudio('base64aud', 'audio/wav');
    expect(result).toBe('transcribed text');

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toBe('فرغ ما يقال حرفياً بالعربية بدون إضافات.');
    expect(body.contents[0].parts[1]).toEqual({
      inlineData: { mimeType: 'audio/wav', data: 'base64aud' },
    });
  });
});

describe('describeImage', () => {
  it('calls callGeminiWithMedia with correct params', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'image description' }] } }],
      }),
    });

    const result = await describeImage('base64img', 'image/png');
    expect(result).toBe('image description');

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toBe('صف هذه الصورة بالتفصيل لطالب كفيف بالعربية.');
    expect(body.contents[0].parts[1]).toEqual({
      inlineData: { mimeType: 'image/png', data: 'base64img' },
    });
  });
});
