/**
 * Arrangements of the theme (and of generated radio songs). Each one is game
 * 1's scheduleBar idea: given a bar of a Song, schedule every instrument for
 * that bar. `alt` (odd loops) swaps the melody for an accompaniment figure so
 * a loop never repeats exactly twice in a row.
 */
import type { MusicTrack } from '../core/types';
import {
  vBass,
  vBell,
  vChug,
  vClap,
  vCrackle,
  vFlute,
  vHat,
  vKeys,
  vKick,
  vLead,
  vPad,
  vPluck,
  vRim,
  vSnare,
  vTom,
  type Kit,
} from './instruments';
import { ARP, chordTones, type Chord, type MelodyNote, type Song } from './notes';

export interface BarContext {
  readonly k: Kit;
  readonly song: Song;
  readonly bar: number;
  readonly loop: number;
  /** Audio time the bar starts. */
  readonly t: number;
  /** Seconds per beat. */
  readonly beat: number;
  readonly out: AudioNode;
}

export type PlayableTrack = Exclude<MusicTrack, 'none'>;

export interface Arrangement {
  /** Tempo for the theme. Generated radio songs bring their own. */
  readonly bpm: number;
  readonly play: (b: BarContext) => void;
}

const chordAt = (b: BarContext): Chord => b.song.chords[b.bar % b.song.chords.length] as Chord;
const barAt = (b: BarContext): readonly MelodyNote[] => b.song.melody[b.bar % b.song.melody.length] ?? [];

/** Calls `voice(midi, time, seconds)` for every melody note in the bar. */
function melody(b: BarContext, voice: (m: number, t: number, d: number) => void): void {
  let bt = 0;
  for (const [m, len] of barAt(b)) {
    voice(m, b.t + bt * b.beat, len * b.beat);
    bt += len;
  }
}

const isAlt = (b: BarContext): boolean => b.loop % 2 === 1;
const lastBar = (b: BarContext): boolean => b.bar % b.song.chords.length === b.song.chords.length - 1;

/** Title: game 1's "room" style. Pad, bass and bell melody. */
const title: Arrangement = {
  bpm: 70,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    vPad(k, c.v, t, beat * 4, 0.018, out);
    vBass(k, c.b, t, beat * 3.5, 0.07, out);
    if (!isAlt(b)) melody(b, (m, tt, d) => vBell(k, m, tt, 0.055, out, Math.max(1.2, d * 1.5)));
    else {
      const tones = chordTones(c);
      tones.slice(0, 3).forEach((m, i) => vBell(k, m + 12, t + i * beat, 0.035, out, 1.4));
      vBell(k, c.v[1] + 12, t + 3 * beat, 0.03, out, 1.4);
    }
  },
};

/** Home (calm day): game 1's "garden" style. Pluck arpeggio and a flute melody. */
const home: Arrangement = {
  bpm: 76,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    const tones = chordTones(c);
    vPad(k, c.v, t, beat * 4, 0.012, out);
    vBass(k, c.b, t, beat * 3.5, 0.06, out);
    ARP.forEach((idx, i) => vPluck(k, tones[idx] as number, t + (i * beat) / 2, 0.028, out));
    if (!isAlt(b)) melody(b, (m, tt, d) => vFlute(k, m, tt, d * 0.95, 0.03, out));
    else melody(b, (m, tt) => vPluck(k, m + 12, tt, 0.03, out));
  },
};

/** Night: game 1's "library" style, slower, low bells, a high star bell on alt loops. */
const night: Arrangement = {
  bpm: 58,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    vPad(k, c.v, t, beat * 4, 0.014, out);
    vBass(k, c.b, t, beat * 3.8, 0.05, out);
    if (!isAlt(b)) melody(b, (m, tt) => vBell(k, m - 12, tt, 0.05, out, 2.2));
    else {
      vBell(k, c.v[2] + 12, t, 0.03, out, 2.5);
      vBell(k, c.v[0] + 12, t + 2 * beat, 0.025, out, 2.5);
    }
  },
};

/** Gym (driving): four on the floor, eighth-note bass, offbeat hats, pluck lead. */
const gym: Arrangement = {
  bpm: 112,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    const tones = chordTones(c);
    for (let i = 0; i < 4; i++) vKick(k, t + i * beat, 0.12, out);
    vClap(k, t + beat, 0.05, out);
    vClap(k, t + 3 * beat, 0.05, out);
    for (let i = 0; i < 8; i++) {
      vBass(k, c.b + (i % 2 === 0 ? 0 : 12), t + (i * beat) / 2, beat * 0.4, 0.055, out);
      if (i % 2 === 1) vHat(k, t + (i * beat) / 2, 0.022, out);
    }
    vPad(k, c.v, t, beat * 4, 0.01, out);
    if (!isAlt(b)) melody(b, (m, tt) => vPluck(k, m, tt, 0.045, out));
    else for (let i = 0; i < 16; i++) vPluck(k, (tones[ARP[i % 8] as number] as number) + 12, t + (i * beat) / 4, 0.018, out);
    if (lastBar(b)) {
      vTom(k, 180, t + 3 * beat, 0.07, out);
      vTom(k, 140, t + 3.5 * beat, 0.07, out);
    }
  },
};

/** Heavy: game 1's metal remix, fuller. Chugs, double kick at the end of a phrase, lead melody. */
const heavy: Arrangement = {
  bpm: 84,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    const root = c.b + 12;
    for (let i = 0; i < 8; i++) vChug(k, root, t + (i * beat) / 2, beat * 0.42, 0.028, out);
    vKick(k, t, 0.11, out);
    vKick(k, t + beat * 2, 0.11, out);
    vKick(k, t + beat * 3.5, 0.08, out);
    if (lastBar(b)) for (let i = 0; i < 4; i++) vKick(k, t + beat * 2 + (i * beat) / 4, 0.07, out);
    vSnare(k, t + beat, 0.06, out);
    vSnare(k, t + beat * 3, 0.06, out);
    for (let i = 0; i < 8; i++) vHat(k, t + (i * beat) / 2, 0.013, out);
    if (!isAlt(b)) melody(b, (m, tt, d) => vLead(k, m, tt, d * 0.95, 0.03, out));
    else vLead(k, c.v[2] + 12, t + beat * 2, beat * 1.8, 0.02, out);
  },
};

/** Lo-fi: game 1's "shop" swing keys, slower, with rim clicks and vinyl crackle. */
const lofi: Arrangement = {
  bpm: 74,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    const sw = (i: number): number => (i % 2 === 1 ? ((i - 1) * beat) / 2 + beat * 0.66 : (i * beat) / 2);
    for (const m of c.j) {
      vKeys(k, m, t, 0.022, out, 1.3);
      vKeys(k, m, t + beat * 2.66, 0.014, out, 0.9);
    }
    vBass(k, c.b, t, beat * 1.8, 0.065, out);
    vBass(k, c.b + 7, t + beat * 2.5, beat * 1.2, 0.05, out);
    vKick(k, t, 0.1, out);
    vKick(k, t + beat * 2.5, 0.07, out);
    vRim(k, t + beat, 0.03, out);
    vRim(k, t + beat * 3, 0.03, out);
    for (let i = 0; i < 8; i++) vHat(k, t + sw(i), i % 2 === 1 ? 0.014 : 0.008, out);
    vCrackle(k, t, beat * 4, 0.02, out);
    if (!isAlt(b)) melody(b, (m, tt, d) => vKeys(k, m, tt + beat * 0.04, 0.04, out, d * 1.2));
    else vKeys(k, c.j[3] + 12, t + beat * 1.66, 0.02, out, 1);
  },
};

/** Cosy: game 1's "balcony" style. Pad, soft arpeggio, bell melody, flute and bell on alt loops. */
const cosy: Arrangement = {
  bpm: 66,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    const tones = chordTones(c);
    vPad(k, c.v, t, beat * 4, 0.02, out);
    vBass(k, c.b, t, beat * 3.8, 0.06, out);
    ARP.forEach((idx, i) => vPluck(k, tones[idx] as number, t + (i * beat) / 2, 0.016, out));
    if (!isAlt(b)) melody(b, (m, tt, d) => vBell(k, m, tt, 0.05, out, Math.max(1.2, d * 1.6)));
    else
      melody(b, (m, tt, d) => {
        vFlute(k, m, tt, d * 0.95, 0.028, out);
        vBell(k, m + 12, tt, 0.018, out, 1);
      });
  },
};

/** Race Day: a march. Kick on every beat, snare roll into each phrase, bell fanfare an octave up. */
const raceDay: Arrangement = {
  bpm: 124,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    for (let i = 0; i < 4; i++) vKick(k, t + i * beat, 0.11, out);
    vSnare(k, t + beat, 0.05, out);
    vSnare(k, t + 3 * beat, 0.05, out);
    vSnare(k, t + 3.5 * beat, 0.03, out);
    if (lastBar(b)) for (let i = 0; i < 8; i++) vSnare(k, t + 2 * beat + (i * beat) / 4, 0.02 + i * 0.004, out);
    for (let i = 0; i < 8; i++) vBass(k, c.b + (i % 4 === 2 ? 7 : 0), t + (i * beat) / 2, beat * 0.4, 0.055, out);
    vPad(k, c.v, t, beat * 4, 0.014, out);
    for (let i = 0; i < 8; i++) vHat(k, t + (i * beat) / 2, 0.012, out);
    if (!isAlt(b)) melody(b, (m, tt, d) => vBell(k, m + 12, tt, 0.04, out, Math.max(0.6, d * 1.2)));
    else melody(b, (m, tt, d) => vLead(k, m, tt, d * 0.9, 0.018, out));
  },
};

/** Housewarming: a party. Swing keys, claps on 2 and 4, bells on the melody. */
const housewarming: Arrangement = {
  bpm: 96,
  play(b) {
    const { k, t, beat, out } = b;
    const c = chordAt(b);
    const sw = (i: number): number => (i % 2 === 1 ? ((i - 1) * beat) / 2 + beat * 0.66 : (i * beat) / 2);
    for (const m of c.j) {
      vKeys(k, m, t, 0.024, out, 1);
      vKeys(k, m, t + beat * 1.66, 0.016, out, 0.7);
    }
    [c.b, c.b + 7, c.b + 12, c.b + 7].forEach((m, i) => vBass(k, m, t + i * beat, beat * 0.9, 0.06, out));
    vKick(k, t, 0.12, out);
    vKick(k, t + 2 * beat, 0.1, out);
    vClap(k, t + beat, 0.045, out);
    vClap(k, t + 3 * beat, 0.045, out);
    for (let i = 0; i < 8; i++) vHat(k, t + sw(i), i % 2 === 1 ? 0.02 : 0.012, out);
    melody(b, (m, tt, d) => vBell(k, m, tt, isAlt(b) ? 0.03 : 0.05, out, Math.max(0.8, d * 1.3)));
  },
};

export const ARRANGEMENTS: Readonly<Record<PlayableTrack, Arrangement>> = {
  title,
  home,
  night,
  gym,
  heavy,
  lofi,
  cosy,
  raceDay,
  housewarming,
};

export const PLAYABLE_TRACKS: readonly PlayableTrack[] = Object.keys(ARRANGEMENTS) as PlayableTrack[];
