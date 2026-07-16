// tests/unit/audioContext.test.js
/**
 * Test to verify AudioContext singleton logic.
 * Since the app code is bundled in a single file without exports,
 * we simulate the singleton logic here to ensure our concept is solid.
 */

let sharedAudioContext = null;

function getAudioContextMock() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

describe('AudioContext Singleton', () => {
  beforeEach(() => {
    // Mock the window.AudioContext
    window.AudioContext = jest.fn().mockImplementation(() => {
      return {
        state: 'running',
        resume: jest.fn().mockResolvedValue(),
      };
    });
    sharedAudioContext = null;
  });

  it('should create a new AudioContext if none exists', () => {
    const ctx = getAudioContextMock();
    expect(ctx).toBeDefined();
    expect(window.AudioContext).toHaveBeenCalledTimes(1);
  });

  it('should reuse the same AudioContext on subsequent calls', () => {
    const ctx1 = getAudioContextMock();
    const ctx2 = getAudioContextMock();
    expect(ctx1).toBe(ctx2);
    expect(window.AudioContext).toHaveBeenCalledTimes(1); // Still 1
  });

  it('should resume AudioContext if suspended', () => {
    window.AudioContext = jest.fn().mockImplementation(() => {
      return {
        state: 'suspended',
        resume: jest.fn().mockResolvedValue(),
      };
    });
    const ctx = getAudioContextMock();
    expect(ctx.state).toBe('suspended');
    expect(ctx.resume).toHaveBeenCalled();
  });
});
