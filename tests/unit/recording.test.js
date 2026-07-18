describe('recording.js', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '<button id="btn-mic-input"></button>';
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
  });

  test('toggleAudioRecording shows unsupported when no getUserMedia', async () => {
    const { toggleAudioRecording } = await import('../../src/modules/recording.js');
    toggleAudioRecording();
    expect(window.speak).toHaveBeenCalledWith('micUnsupported');
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
    expect(window.speak).toHaveBeenCalledWith('micStart');
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
    expect(window.speak).toHaveBeenCalledWith('micStop');
  });
});
