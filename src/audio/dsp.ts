/**
 * Pure DSP helpers: shaper curves, buffer fills and level maths. No Web Audio
 * calls here, so everything is unit-testable in Node.
 */
import { createRng, nextFloat } from '../core/rng';

/** Hard output ceiling. Nothing the engine makes can leave the master above this. */
export const CEILING = 0.8;
/** The ceiling shaper is exactly linear below this level. */
export const KNEE_START = 0.6;

/**
 * Safety ceiling: linear up to KNEE_START, then a tanh knee that approaches
 * CEILING and never reaches it. Continuous with slope 1 at the knee.
 */
export function softClip(x: number): number {
  const a = Math.abs(x);
  if (a <= KNEE_START) return x;
  const span = CEILING - KNEE_START;
  const y = KNEE_START + span * Math.tanh((a - KNEE_START) / span);
  return x < 0 ? -y : y;
}

/** WaveShaper curve for softClip over the shaper's input range [-1, 1]. */
export function makeSoftClipCurve(n = 4097): Float32Array {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = softClip((i / (n - 1)) * 2 - 1);
  return c;
}

/** Game 1's distortion curve for vChug and vLead: tanh(6x). */
export function makeDistCurve(n = 1024, drive = 6): Float32Array {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = Math.tanh(((i / n) * 2 - 1) * drive);
  return c;
}

/** A seeded uniform source in [0, 1). Audio texture only, never the sim. */
export function makeRand(seed: number): () => number {
  const s = createRng(seed);
  return () => nextFloat(s);
}

/** Game 1's reverb impulse: white noise under a (1 - t)^decay envelope. */
export function fillImpulse(out: Float32Array, decay: number, rand: () => number): void {
  const len = out.length;
  for (let i = 0; i < len; i++) out[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, decay);
}

/** White noise in [-1, 1). */
export function fillNoise(out: Float32Array, rand: () => number): void {
  for (let i = 0; i < out.length; i++) out[i] = rand() * 2 - 1;
}

/** Brown-ish noise (leaky integrated white), normalised to peak 1. Used for room tone. */
export function fillBrown(out: Float32Array, rand: () => number): void {
  let last = 0;
  let peak = 1e-9;
  for (let i = 0; i < out.length; i++) {
    last = (last + 0.02 * (rand() * 2 - 1)) / 1.02;
    out[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) / peak;
}

export function peakOf(samples: ArrayLike<number>): number {
  let p = 0;
  for (let i = 0; i < samples.length; i++) p = Math.max(p, Math.abs(samples[i] as number));
  return p;
}

export function rmsOf(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < samples.length; i++) s += (samples[i] as number) ** 2;
  return Math.sqrt(s / samples.length);
}

/** Linear gain from decibels. */
export const dbToGain = (db: number): number => Math.pow(10, db / 20);

/** Clamps a settings volume to 0..1 (NaN becomes 0). */
export const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
