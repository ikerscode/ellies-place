/**
 * Procedural radio tracks. Pure and seeded: the same station and track index
 * always give the same song, so "her" stations sound the same every session.
 *
 * Every track is generated from generic building blocks (diatonic scale-degree
 * progressions and a constrained melodic walk). Nothing here is transcribed
 * from, or shaped after, any real song.
 */
import { createRng, nextFloat, nextInt, pick, type RngState } from '../core/rng';
import {
  BEATS_PER_BAR,
  MAJOR_SCALE,
  MINOR_SCALE,
  THEME_SONG,
  type Chord,
  type MelodyNote,
  type Song,
} from './notes';

export type StationId = 'heavy' | 'lofi' | 'cosy';
export const STATIONS: readonly StationId[] = ['heavy', 'lofi', 'cosy'];

interface StationRules {
  readonly mode: 'minor' | 'major';
  readonly bpm: readonly [number, number];
  /** Tonic choices as MIDI notes around A3..D4. */
  readonly tonics: readonly number[];
  /** Progressions as zero-based scale degrees, 8 bars each. */
  readonly progressions: readonly (readonly number[])[];
  /** Rhythm cells for one bar (beats summing to 4). */
  readonly rhythms: readonly (readonly number[])[];
  /** How many 8-bar loops each track plays before the next track. */
  readonly loops: number;
  /** Fixed seed so the station's playlist is stable across sessions. */
  readonly seed: number;
}

const STATION_RULES: Record<StationId, StationRules> = {
  heavy: {
    mode: 'minor',
    bpm: [88, 108],
    tonics: [52, 50, 55, 57], // E, D, G, A
    progressions: [
      [0, 0, 5, 6, 0, 0, 3, 4],
      [0, 5, 3, 4, 0, 5, 6, 0],
      [0, 6, 5, 6, 0, 3, 4, 0],
      [0, 2, 5, 4, 0, 2, 6, 0],
    ],
    rhythms: [
      [1, 1, 1, 1],
      [0.5, 0.5, 1, 2],
      [1.5, 0.5, 1, 1],
      [2, 1, 1],
      [0.5, 0.5, 0.5, 0.5, 2],
    ],
    loops: 2,
    seed: 0x5eed_0001,
  },
  lofi: {
    mode: 'minor',
    bpm: [68, 82],
    tonics: [57, 55, 53, 60],
    progressions: [
      [0, 3, 6, 2, 0, 3, 4, 0],
      [0, 5, 3, 4, 0, 5, 1, 4],
      [3, 4, 2, 5, 3, 4, 0, 0],
      [0, 6, 5, 4, 0, 6, 5, 0],
    ],
    rhythms: [
      [1.5, 0.5, 2],
      [1, 1, 2],
      [0.5, 1, 0.5, 2],
      [3, 1],
      [1, 0.5, 0.5, 1, 1],
    ],
    loops: 3,
    seed: 0x5eed_0002,
  },
  cosy: {
    mode: 'major',
    bpm: [62, 76],
    tonics: [60, 55, 62, 57], // C, G, D, A major
    progressions: [
      [0, 4, 5, 3, 0, 4, 3, 0],
      [0, 3, 0, 4, 5, 3, 4, 0],
      [0, 5, 1, 4, 0, 5, 3, 0],
      [3, 0, 4, 5, 3, 0, 4, 0],
    ],
    rhythms: [
      [2, 2],
      [1.5, 0.5, 2],
      [1, 1, 2],
      [4],
      [1, 1, 1, 1],
    ],
    loops: 2,
    seed: 0x5eed_0003,
  },
};

export const stationLoops = (s: StationId): number => STATION_RULES[s].loops;
export const stationBpmRange = (s: StationId): readonly [number, number] => STATION_RULES[s].bpm;

const scaleFor = (mode: 'minor' | 'major'): readonly number[] => (mode === 'minor' ? MINOR_SCALE : MAJOR_SCALE);

/** MIDI of scale degree `deg` (may exceed 7 or go negative) above `tonic`. */
export function degreeToMidi(tonic: number, scale: readonly number[], deg: number): number {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const idx = ((deg % n) + n) % n;
  return tonic + oct * 12 + (scale[idx] as number);
}

/** Diatonic triad on a degree, voiced like game 1: bass in octave 2, triad near middle C. */
export function diatonicChord(tonic: number, scale: readonly number[], deg: number): Chord {
  const root = degreeToMidi(tonic, scale, deg);
  const third = degreeToMidi(tonic, scale, deg + 2);
  const fifth = degreeToMidi(tonic, scale, deg + 4);
  const seventh = degreeToMidi(tonic, scale, deg + 6);
  // Fold the voicing into 55..67 so it sits where game 1's pads sit.
  const fold = (m: number): number => {
    let x = m;
    while (x < 55) x += 12;
    while (x > 67) x -= 12;
    return x;
  };
  const v = [fold(root), fold(third), fold(fifth)].sort((a, b) => a - b) as [number, number, number];
  const j = [fold(seventh), fold(root), fold(third), fold(fifth)].sort((a, b) => a - b) as [
    number,
    number,
    number,
    number,
  ];
  let b = root;
  while (b >= 48) b -= 12;
  while (b < 36) b += 12;
  return { b, v, j };
}

export const MELODY_LOW = 64;
export const MELODY_HIGH = 83;

/** Picks the scale note nearest to `target` whose pitch is one of `options`. */
function nearest(options: readonly number[], target: number): number {
  let best = options[0] as number;
  for (const o of options) if (Math.abs(o - target) < Math.abs(best - target)) best = o;
  return best;
}

function generateMelody(
  rng: RngState,
  tonic: number,
  scale: readonly number[],
  degrees: readonly number[],
  rhythms: readonly (readonly number[])[],
): MelodyNote[][] {
  // All scale notes in range.
  const pool: number[] = [];
  for (let m = MELODY_LOW; m <= MELODY_HIGH; m++) {
    const pc = (((m - tonic) % 12) + 12) % 12;
    if (scale.includes(pc)) pool.push(m);
  }
  let prev = nearest(pool, degreeToMidi(tonic, scale, 7 + 2));
  const bars: MelodyNote[][] = [];
  degrees.forEach((deg, i) => {
    const last = i === degrees.length - 1;
    const chordPcs = [0, 2, 4].map((k) => (((degreeToMidi(tonic, scale, deg + k) - tonic) % 12) + 12) % 12);
    const chordPool = pool.filter((m) => chordPcs.includes((((m - tonic) % 12) + 12) % 12));
    if (last) {
      // Land on the tonic, held for the whole bar.
      const tonics = pool.filter((m) => (((m - tonic) % 12) + 12) % 12 === 0);
      bars.push([[nearest(tonics, prev), BEATS_PER_BAR]]);
      return;
    }
    const rhythm = pick(rng, rhythms);
    const bar: MelodyNote[] = [];
    rhythm.forEach((len, k) => {
      let note: number;
      if (k === 0) {
        // Strong beat: a chord tone near the previous note.
        const near = chordPool.filter((m) => Math.abs(m - prev) <= 7);
        note = near.length > 0 ? pick(rng, near) : nearest(chordPool, prev);
      } else {
        // Weak beat: a step of one or two scale notes.
        const idx = pool.indexOf(nearest(pool, prev));
        const step = (nextFloat(rng) < 0.5 ? -1 : 1) * nextInt(rng, 1, 2);
        note = pool[Math.max(0, Math.min(pool.length - 1, idx + step))] as number;
      }
      bar.push([note, len]);
      prev = note;
    });
    bars.push(bar);
  });
  return bars;
}

/** Generates one original track for a station. Pure: same inputs, same song. */
export function generateSong(station: StationId, seed: number): Song {
  const rules = STATION_RULES[station];
  const rng = createRng(seed);
  const scale = scaleFor(rules.mode);
  const tonic = pick(rng, rules.tonics);
  const degrees = pick(rng, rules.progressions);
  const bpm = nextInt(rng, rules.bpm[0], rules.bpm[1]);
  const chords = degrees.map((d) => diatonicChord(tonic, scale, d));
  const melody = generateMelody(rng, tonic, scale, degrees, rules.rhythms);
  return { id: `${station}-${seed >>> 0}`, bpm, chords, melody };
}

/** Tracks per playlist before it repeats (track 0 is always the theme in the station's style). */
export const PLAYLIST_LENGTH = 6;

/**
 * The song for a station at a track index. Index 0 (mod playlist length) is
 * the game's own theme arranged in the station style; the rest are generated.
 */
export function stationTrack(station: StationId, index: number): Song {
  const i = ((Math.trunc(index) % PLAYLIST_LENGTH) + PLAYLIST_LENGTH) % PLAYLIST_LENGTH;
  if (i === 0) return THEME_SONG;
  return generateSong(station, (STATION_RULES[station].seed + i * 7919) >>> 0);
}

/** Tonic and mode of a generated track, for tests. */
export function stationMode(station: StationId): 'minor' | 'major' {
  return STATION_RULES[station].mode;
}
