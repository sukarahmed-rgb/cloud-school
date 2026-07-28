// @ts-check
/**
 * @jest-environment jsdom
 */
jest.mock('../../src/modules/audio-core.js', () => ({
  speakToUser: jest.fn(),
}));

function setupDom() {
  document.body.innerHTML = `
    <div id="aria-live"></div>
    <button id="tts-engine-toggle"></button>
    <button id="btn-screen-reader-mode"></button>
    <button id="audio-co-pilot-toggle"></button>
    <div id="view-student"></div>
  `;
}

beforeEach(() => {
  setupDom();
  localStorage.clear();
  window.speechSynthesis = { cancel: jest.fn() };
  window.__ = jest.fn((k) => k);
  window.screenReaderMode = undefined;
  Element.prototype.scrollIntoView = jest.fn();
});

describe('speech module', () => {
  let mod;
  let speakToUser;

  beforeEach(async () => {
    jest.resetModules();
    mod = await import('../../src/modules/speech.js');
    speakToUser = require('../../src/modules/audio-core.js').speakToUser;
    mod.audioCoPilotEnabled = true;
    mod.screenReaderMode = false;
    mod.ttsEngineMode = 'browser';
    mod.accessibleVoicesController = null;
  });

  afterEach(() => {
    if (mod.accessibleVoicesController) {
      mod.accessibleVoicesController.abort();
    }
  });

  test('speak — does nothing when audioCoPilotEnabled is false', () => {
    mod.toggleAudioCoPilot();
    mod.speak('hello');
    expect(speakToUser).not.toHaveBeenCalled();
  });

  test('speak — calls speakToUser when enabled', () => {
    mod.speak('hi there');
    expect(document.getElementById('aria-live').textContent).toBe('hi there');
    expect(speakToUser).toHaveBeenCalledWith('hi there');
  });

  test('speak — returns early when window.screenReaderMode is true', () => {
    window.screenReaderMode = true;
    mod.speak('test');
    expect(document.getElementById('aria-live').textContent).toBe('test');
    expect(speakToUser).not.toHaveBeenCalled();
  });

  test('stopAllAudio — calls speechSynthesis.cancel', () => {
    mod.stopAllAudio();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  test('toggleTtsEngine — toggles from browser to gemini', () => {
    mod.ttsEngineMode = 'browser';
    mod.toggleTtsEngine();
    expect(localStorage.getItem('cloudSchoolTtsEngine')).toBe('gemini');
    expect(document.getElementById('tts-engine-toggle').textContent).toContain('ttsGemini');
  });

  test('toggleTtsEngine — toggles from gemini to browser', async () => {
    localStorage.setItem('cloudSchoolTtsEngine', 'gemini');
    jest.resetModules();
    mod = await import('../../src/modules/speech.js');
    mod.toggleTtsEngine();
    expect(mod.ttsEngineMode).toBe('browser');
    expect(localStorage.getItem('cloudSchoolTtsEngine')).toBe('browser');
    expect(document.getElementById('tts-engine-toggle').textContent).toContain('ttsBrowser');
  });

  test('toggleScreenReaderMode — enables screen reader mode', () => {
    mod.screenReaderMode = false;
    mod.toggleScreenReaderMode();
    expect(mod.screenReaderMode).toBe(true);
    expect(document.getElementById('btn-screen-reader-mode').textContent).toBe('srModeOn');
    expect(document.getElementById('aria-live').textContent).toBe('srModeActive');
  });

  test('toggleScreenReaderMode — disables screen reader mode', () => {
    mod.toggleScreenReaderMode();
    expect(mod.screenReaderMode).toBe(true);
    mod.toggleScreenReaderMode();
    expect(mod.screenReaderMode).toBe(false);
    expect(document.getElementById('btn-screen-reader-mode').textContent).toBe('srModeOff');
  });

  test('toggleScreenReaderMode — does nothing if btn missing', () => {
    document.getElementById('btn-screen-reader-mode').remove();
    mod.screenReaderMode = false;
    mod.toggleScreenReaderMode();
    expect(mod.screenReaderMode).toBe(true);
  });

  test('toggleAudioCoPilot — enables co-pilot', () => {
    mod.toggleAudioCoPilot();
    expect(mod.audioCoPilotEnabled).toBe(false);
    mod.toggleAudioCoPilot();
    expect(mod.audioCoPilotEnabled).toBe(true);
    expect(document.getElementById('audio-co-pilot-toggle').textContent).toBe('audioCpOn');
    expect(document.getElementById('audio-co-pilot-toggle').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  test('toggleAudioCoPilot — disables co-pilot', () => {
    mod.audioCoPilotEnabled = true;
    mod.toggleAudioCoPilot();
    expect(mod.audioCoPilotEnabled).toBe(false);
    expect(document.getElementById('audio-co-pilot-toggle').textContent).toBe('audioCpOff');
    expect(document.getElementById('audio-co-pilot-toggle').getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  test('toggleAudioCoPilot — does nothing if btn missing', () => {
    document.getElementById('audio-co-pilot-toggle').remove();
    mod.audioCoPilotEnabled = true;
    mod.toggleAudioCoPilot();
    expect(mod.audioCoPilotEnabled).toBe(false);
  });

  test('setupAccessibleVoices — sets up event listeners', () => {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Submit');
    document.body.appendChild(btn);

    mod.setupAccessibleVoices();
    mod.audioCoPilotEnabled = true;
    mod.screenReaderMode = false;

    btn.dispatchEvent(new Event('focus'));
    expect(speakToUser).toHaveBeenCalledWith('Submit');
  });

  test('setupAccessibleVoices — aborts previous controller', () => {
    mod.setupAccessibleVoices();
    const firstController = mod.accessibleVoicesController;
    const abortSpy = jest.spyOn(firstController, 'abort');

    mod.setupAccessibleVoices();
    expect(abortSpy).toHaveBeenCalled();
    expect(mod.accessibleVoicesController).not.toBe(firstController);
  });

  test('initAudioCoPilot — restores from localStorage true', () => {
    localStorage.setItem('cloudSchoolAudioCoPilot', 'true');
    mod.initAudioCoPilot();
    expect(mod.audioCoPilotEnabled).toBe(true);
    expect(document.getElementById('audio-co-pilot-toggle').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  test('initAudioCoPilot — restores from localStorage false', () => {
    localStorage.setItem('cloudSchoolAudioCoPilot', 'false');
    mod.initAudioCoPilot();
    expect(mod.audioCoPilotEnabled).toBe(false);
    expect(document.getElementById('audio-co-pilot-toggle').getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  test('initAudioCoPilot — no saved value uses default', () => {
    mod.audioCoPilotEnabled = true;
    mod.initAudioCoPilot();
    expect(mod.audioCoPilotEnabled).toBe(true);
    expect(document.getElementById('audio-co-pilot-toggle').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
});
