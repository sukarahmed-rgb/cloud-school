// @ts-check
import { getAudioContext } from './ui-core.js';

/**
 * @param {number} startFreq
 * @param {number} endFreq
 * @param {string} type
 * @param {number} duration
 * @param {number} panX
 * @param {number} panY
 * @param {number} panZ
 */
export function play3DTone(startFreq, endFreq, type, duration, panX, panY, panZ) {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    panner.setPosition(panX || 0, panY || 0, panZ || 0);
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      endFreq || startFreq,
      ctx.currentTime + duration * 0.7,
    );
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    /* audio not available */
  }
}

/** Play a 3D success sound */
export function playSuccess3D() {
  play3DTone(523.25, 880, 'sine', 0.3, -0.5, 0.5, 0.5);
}

/** Play a 3D failure sound */
export function playFail3D() {
  play3DTone(150, 80, 'sawtooth', 0.3, 0.5, -0.5, 0.5);
}

/** Play a 3D tick sound */
export function playTick3D() {
  play3DTone(800, 1200, 'square', 0.1, 0, 0.8, 0.3);
}
