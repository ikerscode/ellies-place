/**
 * Instruments, ported from game 1 (vBell, vPad, vBass, vPluck, vKeys, vFlute,
 * vHat, vKick, vSnare, vChug, vLead) plus a few new ones for the new
 * arrangements (vClap, vTom, vCrackle, vRim). Every function schedules nodes
 * at audio time `t` into `dest` and returns nothing the caller must keep.
 */
import { fillNoise, makeDistCurve, makeRand } from './dsp';
import { mf } from './notes';

/** Shared per-context resources. */
export interface Kit {
  readonly ac: BaseAudioContext;
  /** Two seconds of white noise. */
  readonly noise: AudioBuffer;
  readonly dist: Float32Array<ArrayBuffer>;
  /** Seeded texture randomness (never used by the sim). */
  readonly rand: () => number;
}

export function makeKit(ac: BaseAudioContext, seed = 0x0e11e): Kit {
  const rand = makeRand(seed);
  const len = Math.floor(ac.sampleRate * 2);
  const noise = ac.createBuffer(1, len, ac.sampleRate);
  fillNoise(noise.getChannelData(0), rand);
  return { ac, noise, dist: makeDistCurve() as Float32Array<ArrayBuffer>, rand };
}

const FLOOR = 0.0001;

/** Game 1's envelope: silent, linear attack to `peak`, exponential decay over `d`. */
export function env(g: GainNode, t: number, a: number, peak: number, d: number): void {
  const p = Math.max(peak, FLOOR * 2);
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.linearRampToValueAtTime(p, t + a);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + a + d);
}

export function gainNode(k: Kit, dest: AudioNode, value = 1): GainNode {
  const g = k.ac.createGain();
  g.gain.value = value;
  g.connect(dest);
  return g;
}

export function osc(k: Kit, type: OscillatorType, f: number, t: number, dur: number, dest: AudioNode): OscillatorNode {
  const o = k.ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.1);
  return o;
}

export function filter(k: Kit, type: BiquadFilterType, freq: number, q: number, dest: AudioNode): BiquadFilterNode {
  const f = k.ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.connect(dest);
  return f;
}

/** Filtered noise burst (game 1's noiseHit). Returns the filter so callers can sweep it. */
export function noiseHit(
  k: Kit,
  t: number,
  vol: number,
  type: BiquadFilterType,
  freq: number,
  dur: number,
  q: number,
  dest: AudioNode,
): BiquadFilterNode {
  const s = k.ac.createBufferSource();
  s.buffer = k.noise;
  const g = gainNode(k, dest, 0);
  env(g, t, 0.003, vol, dur);
  const f = filter(k, type, freq, q, g);
  s.connect(f);
  s.start(t, k.rand() * 1.5);
  s.stop(t + dur + 0.05);
  return f;
}

/** A plain tone with an exponential pitch glide from f0 to f1. */
export function tone(
  k: Kit,
  type: OscillatorType,
  f0: number,
  f1: number,
  t: number,
  dur: number,
  vol: number,
  dest: AudioNode,
  attack = 0.005,
): OscillatorNode {
  const g = gainNode(k, dest, 0);
  env(g, t, attack, vol, dur);
  const o = osc(k, type, f0, t, dur, g);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  return o;
}

// ---- Game 1 instruments ------------------------------------------------------

export function vBell(k: Kit, m: number, t: number, vol: number, dest: AudioNode, len = 1.6): void {
  const g = gainNode(k, dest, 0);
  env(g, t, 0.005, vol, len);
  osc(k, 'sine', mf(m), t, len, g);
  const g2 = gainNode(k, dest, 0);
  env(g2, t, 0.005, vol * 0.35, len * 0.5);
  osc(k, 'sine', mf(m + 12), t, len * 0.5, g2);
  const g3 = gainNode(k, dest, 0);
  env(g3, t, 0.002, vol * 0.12, 0.25);
  osc(k, 'triangle', mf(m + 19), t, 0.25, g3);
}

export function vPad(k: Kit, ms: readonly number[], t: number, dur: number, vol: number, dest: AudioNode): void {
  const g = gainNode(k, dest, 0);
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(vol * 0.8, t + dur * 0.85);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.7);
  const f = filter(k, 'lowpass', 950, 0.5, g);
  for (const m of ms) {
    for (const dt of [-7, 7]) {
      const o = osc(k, 'sawtooth', mf(m), t, dur + 0.8, f);
      o.detune.value = dt;
    }
  }
}

export function vBass(k: Kit, m: number, t: number, dur: number, vol: number, dest: AudioNode): void {
  const g = gainNode(k, dest, 0);
  env(g, t, 0.02, vol, dur);
  osc(k, 'sine', mf(m), t, dur, g);
  const g2 = gainNode(k, dest, 0);
  env(g2, t, 0.01, vol * 0.25, dur * 0.4);
  osc(k, 'triangle', mf(m + 12), t, dur * 0.4, g2);
}

export function vPluck(k: Kit, m: number, t: number, vol: number, dest: AudioNode): void {
  const g = gainNode(k, dest, 0);
  env(g, t, 0.003, vol, 0.9);
  const f = filter(k, 'lowpass', 4200, 1, g);
  f.frequency.setValueAtTime(4200, t);
  f.frequency.exponentialRampToValueAtTime(600, t + 0.6);
  osc(k, 'triangle', mf(m), t, 0.9, f);
}

export function vKeys(k: Kit, m: number, t: number, vol: number, dest: AudioNode, len = 1.2): void {
  const tr = gainNode(k, dest, 1);
  const g = gainNode(k, tr, 0);
  env(g, t, 0.01, vol, len);
  const l = k.ac.createOscillator();
  l.frequency.value = 4.5;
  const lg = k.ac.createGain();
  lg.gain.value = 0.22;
  l.connect(lg);
  lg.connect(tr.gain);
  l.start(t);
  l.stop(t + len + 0.1);
  osc(k, 'sine', mf(m), t, len, g);
  const g2 = gainNode(k, dest, 0);
  env(g2, t, 0.002, vol * 0.25, 0.12);
  osc(k, 'sine', mf(m) * 4.01, t, 0.12, g2);
}

export function vFlute(k: Kit, m: number, t: number, dur: number, vol: number, dest: AudioNode): void {
  const g = gainNode(k, dest, 0);
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.08);
  g.gain.setValueAtTime(vol, t + Math.max(0.09, dur - 0.1));
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.25);
  const o = osc(k, 'sine', mf(m), t, dur + 0.3, g);
  const v = k.ac.createOscillator();
  v.frequency.value = 5.2;
  const vg = k.ac.createGain();
  vg.gain.value = mf(m) * 0.006;
  v.connect(vg);
  vg.connect(o.frequency);
  v.start(t + 0.15);
  v.stop(t + dur + 0.3);
}

export function vHat(k: Kit, t: number, vol: number, dest: AudioNode): void {
  noiseHit(k, t, vol, 'highpass', 7000, 0.05, 1, dest);
}

export function vKick(k: Kit, t: number, vol: number, dest: AudioNode): void {
  const g = gainNode(k, dest, 0);
  env(g, t, 0.003, vol, 0.22);
  const o = k.ac.createOscillator();
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.3);
}

export function vSnare(k: Kit, t: number, vol: number, dest: AudioNode): void {
  noiseHit(k, t, vol, 'bandpass', 1900, 0.13, 0.7, dest);
  const g = gainNode(k, dest, 0);
  env(g, t, 0.002, vol * 0.8, 0.08);
  osc(k, 'triangle', 190, t, 0.1, g);
}

/** Distorted power-chord chug (root and fifth), game 1's metal remix. */
export function vChug(k: Kit, m: number, t: number, dur: number, vol: number, dest: AudioNode): void {
  const g = gainNode(k, dest, 0);
  env(g, t, 0.003, vol, dur);
  const f = filter(k, 'lowpass', 1500, 1, g);
  const ws = k.ac.createWaveShaper();
  ws.curve = k.dist;
  ws.connect(f);
  for (const iv of [0, 7]) osc(k, 'sawtooth', mf(m + iv), t, dur, ws);
}

/** Distorted square lead with delayed vibrato. */
export function vLead(k: Kit, m: number, t: number, dur: number, vol: number, dest: AudioNode): void {
  const g = gainNode(k, dest, 0);
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.setValueAtTime(vol, t + Math.max(0.03, dur - 0.05));
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.15);
  const f = filter(k, 'lowpass', 2400, 1, g);
  const ws = k.ac.createWaveShaper();
  ws.curve = k.dist;
  ws.connect(f);
  const o = osc(k, 'square', mf(m), t, dur + 0.2, ws);
  const v = k.ac.createOscillator();
  v.frequency.value = 5.5;
  const vg = k.ac.createGain();
  vg.gain.value = mf(m) * 0.008;
  v.connect(vg);
  vg.connect(o.frequency);
  v.start(t + 0.1);
  v.stop(t + dur + 0.2);
}

// ---- New for Ellie's Place --------------------------------------------------

/** Hand clap: three fast noise bursts and a tail. */
export function vClap(k: Kit, t: number, vol: number, dest: AudioNode): void {
  for (let i = 0; i < 3; i++) noiseHit(k, t + i * 0.011, vol * 0.7, 'bandpass', 1300, 0.02, 1.2, dest);
  noiseHit(k, t + 0.033, vol, 'bandpass', 1100, 0.14, 0.9, dest);
}

/** Floor tom: pitched sine thump. */
export function vTom(k: Kit, f: number, t: number, vol: number, dest: AudioNode): void {
  tone(k, 'sine', f, f * 0.6, t, 0.28, vol, dest, 0.003);
  noiseHit(k, t, vol * 0.25, 'lowpass', 900, 0.05, 0.7, dest);
}

/** Rim click for lo-fi. */
export function vRim(k: Kit, t: number, vol: number, dest: AudioNode): void {
  tone(k, 'triangle', 1700, 1700, t, 0.03, vol, dest, 0.001);
  noiseHit(k, t, vol * 0.5, 'bandpass', 3200, 0.025, 3, dest);
}

/** Vinyl crackle: sparse high clicks across `dur` seconds. */
export function vCrackle(k: Kit, t: number, dur: number, vol: number, dest: AudioNode): void {
  const n = Math.floor(dur * 7);
  for (let i = 0; i < n; i++) {
    noiseHit(k, t + k.rand() * dur, vol * (0.4 + k.rand() * 0.6), 'highpass', 2500, 0.012, 1, dest);
  }
}
