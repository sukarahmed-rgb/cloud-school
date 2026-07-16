import { base64ToArrayBuffer, pcmToWav, blobToBase64 } from '../../src/modules/helpers.js';

function arrayBufferToString(buf) {
  const view = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < view.length; i++) {
    s += String.fromCharCode(view[i]);
  }
  return s;
}

describe('base64ToArrayBuffer', () => {
  test('converts base64 string to ArrayBuffer', () => {
    const base64 = btoa('Hello World');
    const buf = base64ToArrayBuffer(base64);
    expect(arrayBufferToString(buf)).toBe('Hello World');
  });

  test('handles empty string', () => {
    const buf = base64ToArrayBuffer(btoa(''));
    expect(buf.byteLength).toBe(0);
  });
});

describe('pcmToWav', () => {
  test('creates a WAV Blob from PCM buffer', () => {
    const pcm = new Int16Array([100, 200, -100, -200]);
    const blob = pcmToWav(pcm.buffer, 16000);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + pcm.buffer.byteLength);
  });

  test('WAV header has correct RIFF signature', (done) => {
    const pcm = new Int16Array([0]);
    const blob = pcmToWav(pcm.buffer, 44100);
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      const header = new Uint8Array(buf, 0, 4);
      expect(arrayBufferToString(header)).toBe('RIFF');
      done();
    };
    reader.readAsArrayBuffer(blob);
  });

  test('WAV header has WAVE format', (done) => {
    const pcm = new Int16Array([0]);
    const blob = pcmToWav(pcm.buffer, 22050);
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      const format = new Uint8Array(buf, 8, 4);
      expect(arrayBufferToString(format)).toBe('WAVE');
      done();
    };
    reader.readAsArrayBuffer(blob);
  });
});

describe('blobToBase64', () => {
  test('converts a Blob to base64 string', async () => {
    const blob = new Blob(['test data'], { type: 'text/plain' });
    const result = await blobToBase64(blob);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('round-trips correctly', async () => {
    const original = 'Hello World!';
    const blob = new Blob([original], { type: 'text/plain' });
    const base64 = await blobToBase64(blob);
    const binary = atob(base64);
    let decoded = '';
    for (let i = 0; i < binary.length; i++) {
      decoded += String.fromCharCode(binary.charCodeAt(i));
    }
    expect(decoded).toBe(original);
  });

  test('handles empty Blob', async () => {
    const blob = new Blob([]);
    const result = await blobToBase64(blob);
    expect(typeof result).toBe('string');
  });
});
