import { describe, expect, it } from 'vitest';
import {
  CEILING,
  KNEE_START,
  clamp01,
  fillBrown,
  fillImpulse,
  fillNoise,
  makeDistCurve,
  makeRand,
  makeSoftClipCurve,
  peakOf,
  rmsOf,
  softClip,
} from '../../../src/audio/dsp';

describe('dsp', () => {
  it('soft clip is linear below the knee and never reaches the ceiling', () => {
    expect(softClip(0)).toBe(0);
    expect(softClip(0.3)).toBe(0.3);
    expect(softClip(-KNEE_START)).toBe(-KNEE_START);
    for (const x of [0.61, 0.8, 1, 2]) {
      expect(softClip(x)).toBeLessThan(CEILING);
      expect(softClip(-x)).toBeGreaterThan(-CEILING);
    }
    expect(softClip(1e6)).toBeLessThanOrEqual(CEILING);
    // Monotonic and continuous at the knee.
    expect(softClip(0.6001) - softClip(0.6)).toBeCloseTo(0.0001, 6);
    expect(softClip(0.9)).toBeGreaterThan(softClip(0.7));
  });

  it('soft clip curve stays within the 0.8 ceiling', () => {
    const c = makeSoftClipCurve();
    expect(peakOf(c)).toBeLessThanOrEqual(CEILING);
    expect(c[(c.length - 1) / 2]).toBe(0);
  });

  it('distortion curve is odd and bounded', () => {
    const c = makeDistCurve();
    expect(peakOf(c)).toBeLessThanOrEqual(1);
    expect(c[0]).toBeCloseTo(-1, 3);
  });

  it('impulse decays to silence', () => {
    const b = new Float32Array(48000);
    fillImpulse(b, 2.6, makeRand(1));
    const head = rmsOf(b.subarray(0, 4800));
    const tail = rmsOf(b.subarray(43200));
    expect(head).toBeGreaterThan(0.3);
    expect(tail).toBeLessThan(head / 100);
  });

  it('noise fills are bounded and seeded', () => {
    const a = new Float32Array(1000);
    const b = new Float32Array(1000);
    fillNoise(a, makeRand(7));
    fillNoise(b, makeRand(7));
    expect(a).toEqual(b);
    expect(peakOf(a)).toBeLessThanOrEqual(1);
    const br = new Float32Array(10000);
    fillBrown(br, makeRand(3));
    expect(peakOf(br)).toBeCloseTo(1, 6);
  });

  it('levels and clamps', () => {
    expect(peakOf([0.1, -0.5, 0.2])).toBe(0.5);
    expect(rmsOf([1, -1])).toBe(1);
    expect(rmsOf([])).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});
