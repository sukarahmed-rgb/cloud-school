import {
  buildTextPayload,
  buildMediaPayload,
  extractText,
  extractAudio,
} from '../../src/modules/gemini-client.js';

describe('buildTextPayload', () => {
  test('builds payload with text only', () => {
    const result = buildTextPayload('Hello');
    expect(result).toEqual({
      contents: [{ parts: [{ text: 'Hello' }] }],
    });
  });

  test('builds payload with text and system prompt', () => {
    const result = buildTextPayload('Hello', 'Be helpful');
    expect(result).toEqual({
      contents: [{ parts: [{ text: 'Hello' }] }],
      systemInstruction: { parts: [{ text: 'Be helpful' }] },
    });
  });

  test('handles empty text', () => {
    const result = buildTextPayload('');
    expect(result.contents[0].parts[0].text).toBe('');
  });
});

describe('buildMediaPayload', () => {
  test('builds payload with parts only', () => {
    const parts = [{ text: 'desc' }, { inlineData: { mimeType: 'image/png', data: 'abc' } }];
    const result = buildMediaPayload(parts);
    expect(result).toEqual({
      contents: [{ parts }],
    });
  });

  test('builds payload with parts and system prompt', () => {
    const parts = [{ text: 'desc' }];
    const result = buildMediaPayload(parts, 'Analyze');
    expect(result.systemInstruction).toEqual({ parts: [{ text: 'Analyze' }] });
  });
});

describe('extractText', () => {
  test('extracts text from valid Gemini response', () => {
    const result = extractText({
      candidates: [{ content: { parts: [{ text: 'Hello AI' }] } }],
    });
    expect(result).toBe('Hello AI');
  });

  test('returns fallback for empty response', () => {
    expect(extractText({})).toBe('No response.');
    expect(extractText(null)).toBe('No response.');
    expect(extractText(undefined)).toBe('No response.');
  });

  test('returns fallback when candidates is empty', () => {
    expect(extractText({ candidates: [] })).toBe('No response.');
  });

  test('returns fallback when parts missing', () => {
    expect(extractText({ candidates: [{ content: {} }] })).toBe('No response.');
  });
});

describe('extractAudio', () => {
  test('extracts audio from valid response', () => {
    const result = extractAudio({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: { data: 'base64audio', mimeType: 'audio/wav' },
              },
            ],
          },
        },
      ],
    });
    expect(result).toEqual({ audioData: 'base64audio', mimeType: 'audio/wav' });
  });

  test('returns null when no audio data', () => {
    expect(extractAudio({ candidates: [{ content: { parts: [{}] } }] })).toBeNull();
  });

  test('returns null when mimeType is not audio', () => {
    const result = extractAudio({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: 'img', mimeType: 'image/png' } }],
          },
        },
      ],
    });
    expect(result).toBeNull();
  });

  test('returns null for null input', () => {
    expect(extractAudio(null)).toBeNull();
  });
});
