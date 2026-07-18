import {
  play3DTone,
  playSuccess3D,
  playFail3D,
  playTick3D,
} from '../../src/modules/spatial-audio.js';

jest.mock('../../src/modules/ui-core.js', () => ({ getAudioContext: jest.fn() }));

describe('spatial-audio.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getAudioContext } = require('../../src/modules/ui-core.js');
    getAudioContext.mockReturnValue(null);
  });

  test('play3DTone does not throw when AudioContext is null', () => {
    expect(() => play3DTone(400, 800, 'sine', 0.3, 0, 0, 0)).not.toThrow();
  });

  test('playSuccess3D does not throw', () => {
    expect(() => playSuccess3D()).not.toThrow();
  });

  test('playFail3D does not throw', () => {
    expect(() => playFail3D()).not.toThrow();
  });

  test('playTick3D does not throw', () => {
    expect(() => playTick3D()).not.toThrow();
  });
});
