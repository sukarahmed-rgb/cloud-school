// @ts-check
/**
 * @jest-environment jsdom
 */
const mockSpeak = jest.fn();

jest.mock('../../src/modules/helpers.js', () => ({
  blobToBase64: jest.fn(() => Promise.resolve('base64data')),
}));
jest.mock('../../src/modules/gemini-client.js', () => ({
  transcribeAudio: jest.fn(() => Promise.resolve('transcribed text')),
}));
jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));
jest.mock('../../src/modules/speech.js', () => ({
  speak: (...args) => mockSpeak(...args),
}));

function setupDom() {
  document.body.innerHTML = `
    <button id="btn-mic-input"></button>
    <input id="assignment-student-answer" value="" />
    <input id="ai-tutor-query" value="" />
    <div id="student-sub-ai-tutor"></div>
  `;
}

beforeEach(() => {
  setupDom();
  localStorage.clear();
  mockSpeak.mockClear();
  Element.prototype.scrollIntoView = jest.fn();
});

describe('recording module', () => {
  let mod;

  beforeEach(async () => {
    jest.resetModules();
    mod = await import('../../src/modules/recording.js');
  });

  test('stopAudioTracks — does nothing when mediaRecorder is null', () => {
    expect(() => mod.stopAudioTracks()).not.toThrow();
  });

  test('stopAudioTracks — stops all tracks from mediaRecorder stream', async () => {
    const stop = jest.fn();
    const mockStream = { getTracks: () => [{ stop }, { stop }] };
    const mockRec = {
      state: 'inactive',
      start: jest.fn(function () {
        this.state = 'recording';
      }),
      stop: jest.fn(function () {
        this.state = 'inactive';
      }),
      stream: mockStream,
      ondataavailable: null,
      onstop: null,
      mimeType: 'audio/webm',
    };
    window.MediaRecorder = /** @type {any} */ (jest.fn(() => mockRec));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: jest.fn(() => Promise.resolve(mockStream)) },
      configurable: true,
      writable: true,
    });

    mod.toggleAudioRecording();
    await new Promise((r) => setTimeout(r, 0));

    mod.stopAudioTracks();
    expect(stop).toHaveBeenCalledTimes(2);
  });

  test('toggleAudioRecording — speaks unsupported when no getUserMedia', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    mod.toggleAudioRecording();
    expect(mockSpeak).toHaveBeenCalledWith('micUnsupported');
  });

  test('toggleAudioRecording — starts recording', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }]),
    };
    const mockMediaRecorder = {
      state: 'inactive',
      start: jest.fn(function () {
        this.state = 'recording';
      }),
      stop: jest.fn(function () {
        this.state = 'inactive';
      }),
      stream: mockStream,
      ondataavailable: null,
      onstop: null,
      mimeType: 'audio/webm',
    };
    window.MediaRecorder = /** @type {any} */ (jest.fn(() => mockMediaRecorder));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: jest.fn(() => Promise.resolve(mockStream)) },
      configurable: true,
      writable: true,
    });

    mod.toggleAudioRecording();
    await new Promise((r) => setTimeout(r, 0));

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(window.MediaRecorder).toHaveBeenCalledWith(mockStream);
    expect(mockMediaRecorder.start).toHaveBeenCalled();
    expect(mod.isRecording).toBe(true);
    expect(document.getElementById('btn-mic-input').classList.contains('bg-red-600')).toBe(true);
    expect(mockSpeak).toHaveBeenCalledWith('micStart');
  });

  test('toggleAudioRecording — stops recording when already recording', async () => {
    const stop = jest.fn(function () {
      this.state = 'inactive';
    });
    const mockStream = { getTracks: () => [{ stop: jest.fn() }] };
    const mockRec = {
      state: 'inactive',
      start: jest.fn(function () {
        this.state = 'recording';
      }),
      stop,
      stream: mockStream,
      ondataavailable: null,
      onstop: null,
      mimeType: 'audio/webm',
    };
    window.MediaRecorder = /** @type {any} */ (jest.fn(() => mockRec));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: jest.fn(() => Promise.resolve(mockStream)) },
      configurable: true,
      writable: true,
    });

    mod.toggleAudioRecording();
    await new Promise((r) => setTimeout(r, 0));
    expect(mod.isRecording).toBe(true);

    mod.toggleAudioRecording();
    expect(stop).toHaveBeenCalled();
    expect(mod.isRecording).toBe(false);
    expect(document.getElementById('btn-mic-input').classList.contains('bg-red-600')).toBe(false);
    expect(mockSpeak).toHaveBeenCalledWith('micStop');
  });
});
