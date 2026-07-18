import {
  _obfuscate,
  _deobfuscate,
  getGeminiKey,
  checkProxyHealth,
  updateProxyStatus,
} from '../../src/modules/proxy.js';

jest.mock('../../src/modules/gemini-client.js', () => ({
  getProxyBase: jest.fn(() => 'http://localhost:8787'),
}));

describe('proxy.js', () => {
  beforeEach(() => {
    localStorage.clear();
    window.__ = jest.fn((k) => k);
  });

  test('_obfuscate and _deobfuscate round-trip', () => {
    const original = 'test-key-123';
    const obf = _obfuscate(original);
    expect(obf).not.toBe(original);
    expect(_deobfuscate(obf)).toBe(original);
  });

  test('_obfuscate handles empty string', () => {
    expect(_obfuscate('')).toBe('');
  });

  test('_deobfuscate handles invalid input', () => {
    expect(_deobfuscate('!!!invalid!!!')).toBe('');
  });

  test('getGeminiKey returns stored key', () => {
    const key = 'my-secret-key';
    localStorage.setItem('gemini_api_key', _obfuscate(key));
    expect(getGeminiKey()).toBe(key);
  });

  test('getGeminiKey prompts when no stored key', () => {
    window.prompt = jest.fn(() => '');
    const result = getGeminiKey();
    expect(result).toBe('');
    expect(window.prompt).toHaveBeenCalled();
  });

  test('checkProxyHealth returns true on success', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ status: 'ok' }),
    });
    const result = await checkProxyHealth();
    expect(result).toBe(true);
  });

  test('checkProxyHealth returns false on failure', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('fail'));
    const result = await checkProxyHealth();
    expect(result).toBe(false);
  });

  test('updateProxyStatus updates DOM elements', (done) => {
    document.body.innerHTML = `
      <span id="proxy-status-icon"></span>
      <span id="proxy-status"></span>
    `;
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ status: 'ok' }),
    });
    updateProxyStatus();
    setTimeout(() => {
      expect(document.getElementById('proxy-status-icon').textContent).toBeTruthy();
      expect(document.getElementById('proxy-status').textContent).toBe('proxyConnected');
      done();
    }, 10);
  });
});
