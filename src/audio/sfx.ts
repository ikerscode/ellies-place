/**
 * Sound effects. Cat voices keep game 1's exact signatures (MEOW pitch and
 * length, purr LFO rate and filter, mrrp trill); everything else is new.
 * Misses and "nope" sounds are soft and low: there is no buzzer anywhere.
 */
import type { HitGrade } from '../core/types';
import type { Cue, FloorKind, GymStation, Meower, SimpleCueName, Voice } from './cues';
import { env, filter, gainNode, noiseHit, osc, tone, vBell, vPad, type Kit } from './instruments';
import { mf } from './notes';

/** Where a cue is routed. Minigame cues skip the music duck and follow the sfx volume. */
export interface SfxOut {
  readonly sfx: AudioNode;
  readonly mini: AudioNode;
}

/** Game 1's per-cat meow signature: [pitch multiplier, length in seconds]. */
export const MEOW: Readonly<Record<Meower, readonly [pitch: number, dur: number]>> = {
  george: [0.95, 0.55],
  salem: [1.55, 0.32],
  shadow: [0.7, 0.62],
  peaches: [1.2, 0.45],
  bruce: [0.85, 0.5],
};

/** Game 1's purr signature: LFO rate (Hz) and low-pass (Hz). Bruce is new. */
export const PURR: Readonly<Record<Meower, readonly [lfoHz: number, lowpassHz: number]>> = {
  george: [23, 320],
  salem: [27, 320],
  shadow: [23, 220],
  peaches: [23, 320],
  bruce: [21, 280],
};

/** Game 1's dialogue blip voices: [base MIDI, waveform]. Pickle is new. */
export const VOICE: Readonly<Record<Voice, readonly [midi: number, type: OscillatorType]>> = {
  ellie: [76, 'sine'],
  george: [60, 'triangle'],
  salem: [84, 'sine'],
  shadow: [53, 'triangle'],
  peaches: [70, 'triangle'],
  bruce: [62, 'triangle'],
  poe: [57, 'square'],
  pickle: [50, 'square'],
};

/** Footstep per floor: filter type, frequency, level, length. Wood and stone come from game 1. */
export const FLOOR: Readonly<Record<FloorKind, readonly [type: BiquadFilterType, freq: number, vol: number, dur: number]>> = {
  wood: ['bandpass', 700, 0.05, 0.045],
  tile: ['bandpass', 1500, 0.035, 0.04],
  carpet: ['lowpass', 520, 0.03, 0.06],
  rug: ['lowpass', 680, 0.028, 0.055],
  grass: ['highpass', 2600, 0.022, 0.07],
  stone: ['bandpass', 950, 0.045, 0.045],
  gymMat: ['lowpass', 320, 0.05, 0.05],
  gravel: ['bandpass', 2200, 0.04, 0.06],
};

// ---- small building blocks ----------------------------------------------------

function bells(k: Kit, notes: readonly number[], t: number, gap: number, vol: number, len: number, dest: AudioNode): void {
  notes.forEach((n, i) => vBell(k, n, t + i * gap, vol, dest, len));
}

function thump(k: Kit, t: number, f: number, vol: number, dest: AudioNode, dur = 0.12): void {
  tone(k, 'sine', f, f * 0.5, t, dur, vol, dest, 0.004);
}

function tick(k: Kit, t: number, f: number, vol: number, dest: AudioNode): void {
  tone(k, 'sine', f, f, t, 0.05, vol, dest, 0.001);
}

/** A swept noise whoosh between two band centres. */
function whoosh(k: Kit, t: number, f0: number, f1: number, dur: number, vol: number, dest: AudioNode, q = 1): void {
  const f = noiseHit(k, t, vol, 'bandpass', f0, dur, q, dest);
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
}

/** A held noise texture with a gentle swell (water, kettle, crowd). */
function bed(k: Kit, t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q: number, dest: AudioNode): BiquadFilterNode {
  const s = k.ac.createBufferSource();
  s.buffer = k.noise;
  s.loop = true;
  const g = gainNode(k, dest, 0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.25, dur * 0.3));
  g.gain.setValueAtTime(vol, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = filter(k, type, freq, q, g);
  s.connect(f);
  s.start(t, k.rand());
  s.stop(t + dur + 0.05);
  return f;
}

// ---- game 1 voices ----------------------------------------------------------

export function meow(k: Kit, id: Meower, t: number, dest: AudioNode): void {
  const [pm, dur] = MEOW[id];
  const base = 520 * pm;
  const g = gainNode(k, dest, 0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.13, t + 0.05);
  g.gain.setValueAtTime(0.13, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = filter(k, 'bandpass', 700 * pm, 3, g);
  f.frequency.setValueAtTime(700 * pm, t);
  f.frequency.linearRampToValueAtTime(1800 * pm, t + dur * 0.35);
  f.frequency.linearRampToValueAtTime(900 * pm, t + dur);
  const o = osc(k, 'sawtooth', base * 0.8, t, dur, f);
  o.frequency.linearRampToValueAtTime(base * 1.25, t + dur * 0.35);
  o.frequency.exponentialRampToValueAtTime(base * 0.7, t + dur);
}

export function purr(k: Kit, id: Meower, t: number, dest: AudioNode, len = 1.4): void {
  const [lfoHz, lp] = PURR[id];
  const g = gainNode(k, dest, 0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.55, t + 0.15);
  g.gain.linearRampToValueAtTime(0.45, t + len - 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const am = gainNode(k, g, 0);
  const lfo = k.ac.createOscillator();
  lfo.frequency.value = lfoHz;
  const lg = k.ac.createGain();
  lg.gain.value = 0.6;
  lfo.connect(lg);
  lg.connect(am.gain);
  const f = filter(k, 'lowpass', lp, 1, am);
  const src = k.ac.createBufferSource();
  src.buffer = k.noise;
  src.loop = true;
  src.connect(f);
  src.start(t, k.rand());
  src.stop(t + len + 0.1);
  lfo.start(t);
  lfo.stop(t + len + 0.1);
}

export function mrrp(k: Kit, id: Meower, t: number, dest: AudioNode): void {
  const [pm] = MEOW[id];
  const g = gainNode(k, dest, 0);
  env(g, t, 0.02, 0.08, 0.24);
  const o = osc(k, 'triangle', 380 * pm, t, 0.2, g);
  o.frequency.linearRampToValueAtTime(640 * pm, t + 0.12);
  o.frequency.linearRampToValueAtTime(560 * pm, t + 0.22);
  const l = k.ac.createOscillator();
  l.frequency.value = 28;
  const lg = k.ac.createGain();
  lg.gain.value = 30 * pm;
  l.connect(lg);
  lg.connect(o.frequency);
  l.start(t);
  l.stop(t + 0.3);
}

/** New: a bird-watching chirp, two quick upward blips. */
export function chirp(k: Kit, id: Meower, t: number, dest: AudioNode): void {
  const [pm] = MEOW[id];
  for (let i = 0; i < 2; i++) tone(k, 'triangle', 620 * pm, 1150 * pm, t + i * 0.11, 0.07, 0.06, dest, 0.01);
}

/** New: an unimpressed huff through the nose. Not a hiss. */
export function huff(k: Kit, id: Meower, t: number, dest: AudioNode): void {
  const [pm] = MEOW[id];
  whoosh(k, t, 1100 * pm, 600 * pm, 0.18, 0.07, dest, 1.5);
}

export function caw(k: Kit, t: number, dest: AudioNode): void {
  for (let i = 0; i < 2; i++) {
    const tt = t + i * 0.22;
    const g = gainNode(k, dest, 0);
    env(g, tt, 0.01, 0.1, 0.17);
    const f = filter(k, 'bandpass', 1100, 1.5, g);
    const o = osc(k, 'sawtooth', 430, tt, 0.1, f);
    o.frequency.exponentialRampToValueAtTime(260, tt + 0.16);
    noiseHit(k, tt, 0.04, 'bandpass', 1500, 0.15, 2, dest);
  }
}

export function ribbit(k: Kit, t: number, dest: AudioNode): void {
  for (let i = 0; i < 2; i++) {
    const tt = t + i * 0.13;
    const g = gainNode(k, dest, 0);
    env(g, tt, 0.005, 0.09, 0.09);
    const f = filter(k, 'lowpass', 900, 1, g);
    const o = osc(k, 'square', 190, tt, 0.02, f);
    o.frequency.exponentialRampToValueAtTime(115, tt + 0.08);
  }
}

export function blip(k: Kit, voice: Voice, t: number, dest: AudioNode): void {
  const [m, type] = VOICE[voice];
  const step = [0, 2, 4, 7][Math.floor(k.rand() * 4)] ?? 0;
  tone(k, type, mf(m + step), mf(m + step), t, 0.06, type === 'square' ? 0.016 : 0.032, dest, 0.004);
}

export function step(k: Kit, floor: FloorKind, wet: boolean, t: number, dest: AudioNode): void {
  const [type, freq, vol, dur] = FLOOR[floor];
  noiseHit(k, t, vol, type, freq * (0.92 + k.rand() * 0.16), dur, 1.4, dest);
  if (floor === 'gymMat') thump(k, t, 90, 0.04, dest, 0.06);
  if (floor === 'gravel') noiseHit(k, t + 0.025, vol * 0.6, 'bandpass', 2800, 0.04, 1.4, dest);
  if (wet && k.rand() < 0.4) noiseHit(k, t + 0.02, 0.02, 'highpass', 4000, 0.08, 1, dest);
}

export function gymStroke(k: Kit, station: GymStation, t: number, dest: AudioNode): void {
  switch (station) {
    case 'skiErg':
      whoosh(k, t, 500, 1600, 0.35, 0.09, dest);
      tone(k, 'sawtooth', 90, 60, t, 0.4, 0.015, dest, 0.02);
      break;
    case 'sledPush':
      bed(k, t, 0.5, 0.09, 'lowpass', 260, 0.8, dest);
      thump(k, t, 70, 0.08, dest, 0.15);
      break;
    case 'sledPull':
      whoosh(k, t, 1400, 700, 0.22, 0.07, dest, 1.2);
      bed(k, t + 0.1, 0.4, 0.06, 'lowpass', 300, 0.8, dest);
      break;
    case 'burpeeBroadJump':
      thump(k, t, 75, 0.14, dest, 0.18);
      noiseHit(k, t, 0.05, 'lowpass', 500, 0.1, 0.7, dest);
      whoosh(k, t + 0.15, 900, 500, 0.2, 0.03, dest);
      break;
    case 'rowing':
      whoosh(k, t, 400, 1100, 0.45, 0.07, dest);
      tone(k, 'sawtooth', 110, 70, t, 0.6, 0.012, dest, 0.05);
      break;
    case 'farmersCarry':
      vBell(k, 98, t, 0.02, dest, 0.25);
      step(k, 'gymMat', false, t + 0.1, dest);
      break;
    case 'sandbagLunges':
      thump(k, t, 85, 0.1, dest, 0.15);
      noiseHit(k, t, 0.06, 'lowpass', 350, 0.18, 0.7, dest);
      break;
    case 'wallBalls':
      thump(k, t, 150, 0.1, dest, 0.08);
      thump(k, t + 0.35, 110, 0.08, dest, 0.1);
      break;
    case 'treadmill':
      bed(k, t, 0.5, 0.04, 'lowpass', 220, 0.8, dest);
      step(k, 'gymMat', false, t, dest);
      break;
    case 'kettlebell':
      whoosh(k, t, 600, 1200, 0.3, 0.05, dest);
      vBell(k, 96, t + 0.3, 0.02, dest, 0.25);
      break;
  }
}

export function gymHit(k: Kit, grade: HitGrade, t: number, dest: AudioNode): void {
  if (grade === 'perfect') bells(k, [88, 95], t, 0.05, 0.05, 0.6, dest);
  else if (grade === 'good') vBell(k, 88, t, 0.04, dest, 0.5);
  // A miss is a soft low tap: no buzzer, no shame.
  else tone(k, 'sine', 220, 180, t, 0.12, 0.04, dest, 0.01);
}

export function crowd(k: Kit, intensity: number, t: number, dest: AudioNode): void {
  const x = Math.min(1, Math.max(0, intensity));
  const dur = 1.2 + x * 0.8;
  bed(k, t, dur, 0.03 + 0.08 * x, 'bandpass', 900, 0.6, dest);
  bed(k, t + 0.05, dur, 0.02 + 0.05 * x, 'bandpass', 2000, 0.8, dest);
  if (x > 0.6) {
    const n = Math.round(1 + x * 3);
    for (let i = 0; i < n; i++) {
      const tt = t + 0.1 + k.rand() * dur * 0.6;
      tone(k, 'sine', 1400 + k.rand() * 300, 2400 + k.rand() * 400, tt, 0.18, 0.012, dest, 0.02);
    }
  }
}

// ---- simple cues --------------------------------------------------------------

type Recipe = (k: Kit, t: number, d: AudioNode) => void;

/** Every simple cue has a recipe; a missing one is a type error. */
export const SIMPLE: Readonly<Record<SimpleCueName, Recipe>> = {
  // UI
  'ui.click': (k, t, d) => tone(k, 'triangle', mf(84), mf(84), t, 0.04, 0.02, d, 0.002),
  'ui.hover': (k, t, d) => tick(k, t, 2200, 0.006, d),
  'ui.open': (k, t, d) => {
    noiseHit(k, t, 0.03, 'bandpass', 2800, 0.08, 0.8, d);
    bells(k, [76, 83], t + 0.02, 0.05, 0.03, 0.5, d);
  },
  'ui.close': (k, t, d) => {
    noiseHit(k, t, 0.025, 'bandpass', 2200, 0.08, 0.8, d);
    bells(k, [83, 76], t + 0.02, 0.05, 0.025, 0.4, d);
  },
  'ui.confirm': (k, t, d) => bells(k, [81, 88], t, 0.12, 0.05, 1.2, d),
  'ui.back': (k, t, d) => tone(k, 'triangle', 620, 420, t, 0.1, 0.03, d),
  'ui.nope': (k, t, d) => {
    tone(k, 'sine', 330, 330, t, 0.09, 0.04, d, 0.01);
    tone(k, 'sine', 294, 294, t + 0.11, 0.12, 0.035, d, 0.01);
  },
  'ui.toggle': (k, t, d) => tick(k, t, 1500, 0.045, d),
  'ui.tab': (k, t, d) => {
    noiseHit(k, t, 0.025, 'bandpass', 3000, 0.04, 1, d);
    tick(k, t, 1200, 0.02, d);
  },
  'ui.page': (k, t, d) => {
    noiseHit(k, t, 0.08, 'bandpass', 3000, 0.18, 0.8, d);
    noiseHit(k, t + 0.13, 0.06, 'bandpass', 2200, 0.22, 0.8, d);
    vPad(k, [57, 64, 72], t + 0.1, 1.4, 0.016, d);
  },
  'ui.toast': (k, t, d) => vBell(k, 88, t, 0.03, d, 0.6),
  'ui.petals': (k, t, d) => bells(k, [84, 88, 91], t, 0.05, 0.025, 0.6, d),
  'ui.queueAdd': (k, t, d) => bells(k, [79, 84], t, 0.05, 0.03, 0.4, d),
  'ui.queueCancel': (k, t, d) => bells(k, [84, 79], t, 0.05, 0.025, 0.4, d),
  'ui.speed': (k, t, d) => {
    tick(k, t, 1500, 0.035, d);
    tick(k, t + 0.06, 1800, 0.03, d);
  },
  'ui.pause': (k, t, d) => tick(k, t, 900, 0.04, d),
  'ui.hearts': (k, t, d) => bells(k, [76, 80, 83, 88, 92], t, 0.07, 0.05, 0.9, d),
  'ui.wish': (k, t, d) => {
    vPad(k, [69, 76, 81], t, 1.2, 0.012, d);
    bells(k, [81, 85, 88, 93], t, 0.08, 0.04, 1.2, d);
  },
  'ui.sticker': (k, t, d) => {
    whoosh(k, t, 1800, 3600, 0.15, 0.05, d, 2);
    bells(k, [84, 88], t + 0.15, 0.07, 0.045, 0.8, d);
  },
  'ui.unlock': (k, t, d) => {
    noiseHit(k, t, 0.12, 'bandpass', 2600, 0.04, 4, d);
    noiseHit(k, t + 0.09, 0.1, 'bandpass', 1800, 0.05, 4, d);
    bells(k, [76, 81, 88], t + 0.18, 0.09, 0.06, 1.1, d);
  },
  'ui.aspiration': (k, t, d) => bells(k, [69, 76, 81, 84, 88], t, 0.08, 0.05, 1.4, d),
  // Modes
  'mode.build': (k, t, d) => {
    noiseHit(k, t, 0.06, 'bandpass', 800, 0.1, 1.2, d);
    tone(k, 'triangle', 220, 220, t + 0.03, 0.15, 0.04, d);
  },
  'mode.live': (k, t, d) => bells(k, [76, 81], t, 0.07, 0.04, 0.8, d),
  'mode.photo': (k, t, d) => {
    const f = filter(k, 'lowpass', 1400, 1, d);
    tone(k, 'sawtooth', 300, 900, t, 0.18, 0.02, f, 0.02);
  },
  // Build mode
  'build.pickUp': (k, t, d) => {
    tone(k, 'sine', 300, 520, t, 0.08, 0.05, d);
    noiseHit(k, t, 0.02, 'bandpass', 1600, 0.05, 1, d);
  },
  'build.place': (k, t, d) => {
    thump(k, t, 140, 0.14, d);
    noiseHit(k, t, 0.05, 'bandpass', 900, 0.06, 1.4, d);
    vBell(k, 88, t + 0.04, 0.012, d, 0.3);
  },
  'build.blocked': (k, t, d) => {
    thump(k, t, 160, 0.07, d, 0.08);
    thump(k, t + 0.1, 150, 0.06, d, 0.08);
  },
  'build.rotate': (k, t, d) => {
    for (let i = 0; i < 3; i++) noiseHit(k, t + i * 0.03, 0.04 - i * 0.008, 'bandpass', 2500, 0.015, 3, d);
  },
  'build.sell': (k, t, d) => {
    whoosh(k, t, 800, 3000, 0.2, 0.04, d);
    bells(k, [88, 93], t + 0.08, 0.06, 0.04, 0.7, d);
  },
  'build.paint': (k, t, d) => {
    whoosh(k, t, 1500, 2100, 0.2, 0.05, d, 0.8);
    whoosh(k, t + 0.22, 2000, 1400, 0.2, 0.045, d, 0.8);
  },
  'build.undo': (k, t, d) => tone(k, 'triangle', 700, 480, t, 0.1, 0.035, d),
  'build.redo': (k, t, d) => tone(k, 'triangle', 480, 700, t, 0.1, 0.035, d),
  'build.duplicate': (k, t, d) => bells(k, [84, 84], t, 0.07, 0.03, 0.3, d),
  'build.eyedropper': (k, t, d) => tone(k, 'sine', 1200, 1900, t, 0.08, 0.035, d),
  'build.wall': (k, t, d) => {
    thump(k, t, 100, 0.13, d, 0.16);
    noiseHit(k, t, 0.06, 'bandpass', 600, 0.1, 1, d);
  },
  'build.floor': (k, t, d) => {
    noiseHit(k, t, 0.04, 'bandpass', 1200, 0.05, 1.2, d);
    noiseHit(k, t + 0.06, 0.035, 'bandpass', 1100, 0.05, 1.2, d);
  },
  // Home and things
  'door.knock': (k, t, d) => {
    for (let i = 0; i < 3; i++) {
      thump(k, t + i * 0.18, 180, 0.12, d, 0.08);
      noiseHit(k, t + i * 0.18, 0.07, 'bandpass', 420, 0.06, 2, d);
    }
  },
  'door.open': (k, t, d) => {
    const f = noiseHit(k, t, 0.09, 'bandpass', 300, 0.6, 1.2, d);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
  },
  'door.close': (k, t, d) => {
    thump(k, t, 90, 0.13, d, 0.15);
    noiseHit(k, t, 0.05, 'lowpass', 300, 0.1, 0.8, d);
  },
  'mail.arrive': (k, t, d) => {
    noiseHit(k, t, 0.05, 'bandpass', 1500, 0.05, 1.2, d);
    thump(k, t + 0.04, 220, 0.06, d, 0.06);
    vBell(k, 88, t + 0.2, 0.035, d, 0.9);
  },
  'mail.open': (k, t, d) => {
    noiseHit(k, t, 0.07, 'bandpass', 3000, 0.18, 0.8, d);
    noiseHit(k, t + 0.13, 0.05, 'bandpass', 2200, 0.2, 0.8, d);
  },
  'mail.close': (k, t, d) => noiseHit(k, t, 0.045, 'bandpass', 2600, 0.1, 0.8, d),
  'box.open': (k, t, d) => {
    whoosh(k, t, 2000, 4500, 0.25, 0.06, d, 1.5);
    thump(k, t + 0.27, 130, 0.07, d, 0.1);
  },
  'photo.shutter': (k, t, d) => {
    noiseHit(k, t, 0.12, 'highpass', 3000, 0.02, 1, d);
    noiseHit(k, t + 0.06, 0.08, 'bandpass', 1200, 0.03, 1.5, d);
    tick(k, t + 0.06, 600, 0.02, d);
  },
  'lamp.on': (k, t, d) => {
    tick(k, t, 1300, 0.04, d);
    tone(k, 'sine', 900, 1000, t + 0.02, 0.15, 0.008, d);
  },
  'lamp.off': (k, t, d) => tick(k, t, 1000, 0.035, d),
  'record.start': (k, t, d) => {
    thump(k, t, 60, 0.05, d, 0.08);
    for (let i = 0; i < 6; i++) noiseHit(k, t + 0.05 + k.rand() * 0.5, 0.025, 'highpass', 2500, 0.012, 1, d);
  },
  'record.stop': (k, t, d) => {
    const f = filter(k, 'lowpass', 900, 0.8, d);
    tone(k, 'sawtooth', 220, 40, t, 0.45, 0.03, f, 0.01);
  },
  'tv.on': (k, t, d) => {
    noiseHit(k, t, 0.03, 'bandpass', 4000, 0.3, 0.5, d);
    thump(k, t, 120, 0.05, d, 0.06);
  },
  'tv.off': (k, t, d) => tone(k, 'sine', 900, 60, t, 0.15, 0.03, d),
  'console.boot': (k, t, d) => bells(k, [69, 76, 83, 88], t, 0.06, 0.035, 0.9, d),
  'kettle.boil': (k, t, d) => {
    const f = bed(k, t, 2, 0.05, 'bandpass', 1500, 1, d);
    f.frequency.exponentialRampToValueAtTime(3500, t + 1.8);
    for (let i = 0; i < 6; i++) tone(k, 'sine', 500 + k.rand() * 400, 900, t + 0.6 + i * 0.2, 0.04, 0.01, d);
  },
  'coffee.pour': (k, t, d) => bed(k, t, 0.9, 0.05, 'bandpass', 900, 1.2, d),
  'rusk.dunk': (k, t, d) => {
    tone(k, 'sine', 320, 130, t, 0.18, 0.06, d);
    noiseHit(k, t, 0.04, 'lowpass', 600, 0.12, 0.8, d);
  },
  'rusk.perfect': (k, t, d) => bells(k, [81, 85, 88, 93], t, 0.07, 0.05, 1, d),
  'rusk.plop': (k, t, d) => {
    thump(k, t, 90, 0.08, d);
    tone(k, 'sine', 520, 200, t + 0.03, 0.15, 0.04, d);
    noiseHit(k, t + 0.03, 0.03, 'bandpass', 1800, 0.12, 1, d);
  },
  'sushi.chop': (k, t, d) => {
    noiseHit(k, t, 0.05, 'bandpass', 3500, 0.03, 2, d);
    thump(k, t, 300, 0.06, d, 0.05);
  },
  'sushi.roll': (k, t, d) => bed(k, t, 0.35, 0.04, 'lowpass', 700, 0.8, d),
  'sushi.plate': (k, t, d) => {
    tone(k, 'triangle', 1800, 1800, t, 0.3, 0.025, d, 0.001);
    tone(k, 'sine', 2700, 2700, t, 0.2, 0.012, d, 0.001);
  },
  'lantern.light': (k, t, d) => {
    noiseHit(k, t, 0.06, 'highpass', 2500, 0.15, 1, d);
    noiseHit(k, t + 0.12, 0.05, 'lowpass', 300, 0.3, 0.7, d);
    vBell(k, 81, t + 0.25, 0.03, d, 1.2);
  },
  'star.shoot': (k, t, d) => {
    tone(k, 'sine', 2000, 600, t, 0.6, 0.02, d, 0.02);
    bells(k, [93, 96, 100], t + 0.1, 0.08, 0.015, 0.8, d);
  },
  'star.wish': (k, t, d) => {
    vPad(k, [57, 64, 69, 72, 76], t, 3, 0.02, d);
    bells(k, [81, 84, 88, 91], t + 0.4, 0.35, 0.035, 2, d);
  },
  'eat.crunch': (k, t, d) => {
    for (let i = 0; i < 3; i++) noiseHit(k, t + i * 0.12, 0.05, 'bandpass', 1800 + k.rand() * 600, 0.05, 1.2, d);
  },
  'sit.sofa': (k, t, d) => {
    noiseHit(k, t, 0.06, 'lowpass', 400, 0.2, 0.7, d);
    thump(k, t, 80, 0.05, d, 0.15);
  },
  'bed.flop': (k, t, d) => {
    noiseHit(k, t, 0.08, 'lowpass', 450, 0.3, 0.7, d);
    thump(k, t, 70, 0.07, d, 0.2);
    tone(k, 'sine', 320, 300, t + 0.08, 0.25, 0.008, d, 0.01);
  },
  'water.run': (k, t, d) => bed(k, t, 1.2, 0.05, 'bandpass', 1800, 0.7, d),
  'dress.change': (k, t, d) => {
    whoosh(k, t, 900, 1700, 0.3, 0.05, d);
    vBell(k, 84, t + 0.3, 0.03, d, 0.7);
  },
  housewarming: (k, t, d) => {
    vPad(k, [57, 64, 69, 72], t, 2.5, 0.02, d);
    bells(k, [69, 72, 76, 81, 84, 88], t, 0.09, 0.05, 1.6, d);
  },
  // Gym and race
  'gym.countdown': (k, t, d) => tone(k, 'sine', 880, 880, t, 0.12, 0.05, d, 0.003),
  'gym.go': (k, t, d) => {
    tone(k, 'sine', 1320, 1320, t, 0.3, 0.06, d, 0.003);
    bells(k, [88, 93], t + 0.05, 0.05, 0.03, 0.8, d);
  },
  'gym.rep': (k, t, d) => {
    tone(k, 'triangle', 660, 660, t, 0.06, 0.03, d, 0.002);
    thump(k, t, 120, 0.04, d, 0.06);
  },
  'race.cheer': (k, t, d) => crowd(k, 0.8, t, d),
  'race.finish': (k, t, d) => {
    crowd(k, 1, t, d);
    bells(k, [69, 76, 81, 88], t, 0.12, 0.05, 1.6, d);
  },
  'race.pb': (k, t, d) => bells(k, [76, 81, 84, 88, 93], t, 0.08, 0.055, 1.6, d),
  'race.medal': (k, t, d) => {
    bells(k, [93, 100], t, 0.05, 0.045, 1.4, d);
    noiseHit(k, t, 0.02, 'highpass', 6000, 0.6, 1, d);
  },
  'race.horn': (k, t, d) => {
    const f = filter(k, 'lowpass', 1600, 0.7, d);
    for (const hz of [233, 294]) tone(k, 'sawtooth', hz, hz, t, 1.1, 0.025, f, 0.04);
  },
  // Cats
  'cat.land': (k, t, d) => {
    thump(k, t, 120, 0.06, d, 0.08);
    noiseHit(k, t, 0.025, 'lowpass', 500, 0.06, 0.7, d);
  },
  'cat.knock': (k, t, d) => {
    thump(k, t, 200, 0.05, d, 0.06);
    for (let i = 0; i < 3; i++) noiseHit(k, t + 0.25 + i * 0.09, 0.07 - i * 0.02, 'bandpass', 2500, 0.05, 1.5, d);
  },
  'cat.zoomies': (k, t, d) => {
    for (let i = 0; i < 8; i++) noiseHit(k, t + i * 0.07, 0.03, 'lowpass', 600, 0.04, 1, d);
  },
  'cat.scratch': (k, t, d) => {
    for (let i = 0; i < 4; i++) whoosh(k, t + i * 0.14, 2600, 3400, 0.1, 0.04, d, 1.5);
  },
  'cat.boxIn': (k, t, d) => {
    noiseHit(k, t, 0.05, 'bandpass', 1500, 0.15, 0.8, d);
    thump(k, t + 0.12, 140, 0.05, d, 0.1);
  },
  'cat.crunch': (k, t, d) => {
    for (let i = 0; i < 2; i++) noiseHit(k, t + i * 0.1, 0.035, 'bandpass', 2400, 0.04, 1.4, d);
  },
  'cat.lap': (k, t, d) => {
    for (let i = 0; i < 4; i++) tone(k, 'sine', 700, 900, t + i * 0.16, 0.04, 0.02, d, 0.003);
  },
  'cat.bell': (k, t, d) => bells(k, [96, 98], t, 0.04, 0.02, 0.35, d),
  'poe.caw': (k, t, d) => caw(k, t, d),
  'pickle.ribbit': (k, t, d) => ribbit(k, t, d),
};

const MINI_PREFIX = ['gym.', 'race.', 'rusk.', 'sushi.'];

/** True when a cue plays on the minigame bus. */
export const isMinigameCue = (name: string): boolean => MINI_PREFIX.some((p) => name.startsWith(p));

/** Plays one cue at audio time `t`. `wet` adds rain splashes to outdoor steps. */
export function playCue(k: Kit, out: SfxOut, cue: Cue, t: number, wet = false): void {
  const d = isMinigameCue(cue.cue) ? out.mini : out.sfx;
  switch (cue.cue) {
    case 'meow':
      meow(k, cue.cat, t, d);
      return;
    case 'purr':
      purr(k, cue.cat, t, d);
      return;
    case 'mrrp':
      mrrp(k, cue.cat, t, d);
      return;
    case 'chirp':
      chirp(k, cue.cat, t, d);
      return;
    case 'huff':
      huff(k, cue.cat, t, d);
      return;
    case 'blip':
      blip(k, cue.voice, t, d);
      return;
    case 'step':
      step(k, cue.floor, cue.wet ?? wet, t, d);
      return;
    case 'gym.stroke':
      gymStroke(k, cue.station, t, d);
      return;
    case 'gym.hit':
      gymHit(k, cue.grade, t, d);
      return;
    case 'race.crowd':
      crowd(k, cue.intensity, t, d);
      return;
    default:
      SIMPLE[cue.cue](k, t, d);
  }
}
