const mockSpeak = jest.fn();

jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((k) => k),
}));

jest.mock('../../src/modules/speech.js', () => ({
  speak: (...args) => mockSpeak(...args),
}));

describe('recording.js', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSpeak.mockClear();
    document.body.innerHTML = '<button id="btn-mic-input"></button>';
  });

  test('toggleAudioRecording shows unsupported when no getUserMedia', async () => {
    const { toggleAudioRecording } = await import('../../src/modules/recording.js');
    toggleAudioRecording();
    expect(mockSpeak).toHaveBeenCalledWith('micUnsupported');
  });

  test('toggleAudioRecording calls getUserMedia', async () => {
    const stream = { getTracks: () => [{ stop: jest.fn() }] };
    navigator.mediaDevices = { getUserMedia: jest.fn().mockResolvedValue(stream) };
    globalThis.MediaRecorder = class {
      constructor(s) {
        this.stream = s;
        this.state = 'inactive';
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
      }
    };
    const { toggleAudioRecording } = await import('../../src/modules/recording.js');
    toggleAudioRecording();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  test('toggleAudioRecording starts recording (via speak side effect)', async () => {
    const stream = { getTracks: () => [{ stop: jest.fn() }] };
    navigator.mediaDevices = { getUserMedia: jest.fn().mockResolvedValue(stream) };
    globalThis.MediaRecorder = class {
      constructor(s) {
        this.stream = s;
        this.state = 'inactive';
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
      }
    };
    const { toggleAudioRecording } = await import('../../src/modules/recording.js');
    toggleAudioRecording();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSpeak).toHaveBeenCalledWith('micStart');
  });

  test('toggleAudioRecording stops recording', async () => {
    const stream = { getTracks: () => [{ stop: jest.fn() }] };
    navigator.mediaDevices = { getUserMedia: jest.fn().mockResolvedValue(stream) };
    globalThis.MediaRecorder = class {
      constructor(s) {
        this.stream = s;
        this.state = 'inactive';
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
      }
    };
    const { toggleAudioRecording } = await import('../../src/modules/recording.js');
    toggleAudioRecording();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    toggleAudioRecording();
    expect(mockSpeak).toHaveBeenCalledWith('micStop');
  });
});
