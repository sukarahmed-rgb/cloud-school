// @ts-check
/**
 * @jest-environment jsdom
 */
jest.mock('../../src/modules/helpers.js', () => ({
  blobToBase64: jest.fn(() => Promise.resolve('base64data')),
}));
jest.mock('../../src/modules/gemini-client.js', () => ({
  transcribeAudio: jest.fn(() => Promise.resolve('transcribed text')),
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
  window.__ = jest.fn((k) => k);
  window.speak = jest.fn();
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
    window.MediaRecorder = jest.fn(() => mockRec);
    navigator.mediaDevices = { getUserMedia: jest.fn(() => Promise.resolve(mockStream)) };

    mod.toggleAudioRecording();
    await new Promise((r) => setTimeout(r, 0));

    mod.stopAudioTracks();
    expect(stop).toHaveBeenCalledTimes(2);
  });

  test('toggleAudioRecording — speaks unsupported when no getUserMedia', () => {
    navigator.mediaDevices = undefined;
    mod.toggleAudioRecording();
    expect(window.speak).toHaveBeenCalledWith('micUnsupported');
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
    window.MediaRecorder = jest.fn(() => mockMediaRecorder);
    navigator.mediaDevices = { getUserMedia: jest.fn(() => Promise.resolve(mockStream)) };

    mod.toggleAudioRecording();
    await new Promise((r) => setTimeout(r, 0));

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(window.MediaRecorder).toHaveBeenCalledWith(mockStream);
    expect(mockMediaRecorder.start).toHaveBeenCalled();
    expect(mod.isRecording).toBe(true);
    expect(document.getElementById('btn-mic-input').classList.contains('bg-red-600')).toBe(true);
    expect(window.speak).toHaveBeenCalledWith('micStart');
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
    window.MediaRecorder = jest.fn(() => mockRec);
    navigator.mediaDevices = { getUserMedia: jest.fn(() => Promise.resolve(mockStream)) };

    mod.toggleAudioRecording();
    await new Promise((r) => setTimeout(r, 0));
    expect(mod.isRecording).toBe(true);

    mod.toggleAudioRecording();
    expect(stop).toHaveBeenCalled();
    expect(mod.isRecording).toBe(false);
    expect(document.getElementById('btn-mic-input').classList.contains('bg-red-600')).toBe(false);
    expect(window.speak).toHaveBeenCalledWith('micStop');
  });
});
