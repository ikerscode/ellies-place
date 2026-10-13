/**
 * Note tables and the theme (ported from game 1). Pure data and maths only.
 *
 * Everything musical in Ellie's Place is built from one A-minor theme:
 * Am F C G Am F E Am, with a 25-note melody over 8 bars of 4/4.
 */

/** MIDI note number to frequency in Hz (A4 = 69 = 440 Hz). */
export const mf = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** A chord as game 1 voiced it: bass note, close triad voicing, and a four-note "jazz" voicing. */
export interface Chord {
  /** Bass note (MIDI). */
  readonly b: number;
  /** Triad voicing, three notes (MIDI). */
  readonly v: readonly [number, number, number];
  /** Four-note seventh-ish voicing used by keys (MIDI). */
  readonly j: readonly [number, number, number, number];
}

/** One melody note: MIDI pitch and length in beats. */
export type MelodyNote = readonly [midi: number, beats: number];

/** A song is a looping chord progression with one melody bar per chord. */
export interface Song {
  /** Stable id, used for logs and tests. */
  readonly id: string;
  /** Tempo override. Theme songs leave this undefined and take the arrangement's tempo. */
  readonly bpm?: number;
  /** One chord per bar. */
  readonly chords: readonly Chord[];
  /** One melody bar per chord; each bar's beats sum to 4. */
  readonly melody: readonly (readonly MelodyNote[])[];
}

export const BEATS_PER_BAR = 4;

/** Game 1's chord table (verbatim). */
export const THEME_CHORDS = {
  Am: { b: 45, v: [57, 60, 64], j: [55, 57, 60, 64] },
  F: { b: 41, v: [57, 60, 65], j: [53, 57, 60, 64] },
  C: { b: 48, v: [55, 60, 64], j: [55, 59, 60, 64] },
  G: { b: 43, v: [55, 59, 62], j: [53, 55, 59, 62] },
  E: { b: 40, v: [56, 59, 64], j: [56, 59, 62, 64] },
} as const satisfies Record<string, Chord>;

export type ThemeChordName = keyof typeof THEME_CHORDS;

export const THEME_PROGRESSION: readonly ThemeChordName[] = ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'Am'];

/** The 25-note theme melody (verbatim from game 1). */
export const THEME_MELODY: readonly MelodyNote[] = [
  [76, 1.5], [74, 0.5], [72, 1], [71, 1],
  [72, 1.5], [69, 0.5], [69, 2],
  [76, 1], [79, 1], [77, 1], [76, 1],
  [74, 3], [71, 1],
  [76, 1.5], [74, 0.5], [72, 1], [76, 1],
  [81, 2], [77, 1], [76, 1],
  [74, 1], [72, 1], [71, 1], [68, 1],
  [69, 4],
];

/** Arpeggio pattern over [root, third, fifth, root+12] (game 1's ARP). */
export const ARP: readonly number[] = [0, 1, 2, 3, 2, 1, 0, 1];

/**
 * Splits a flat melody into bars of `beatsPerBar` beats, exactly as game 1 did:
 * a new bar opens once the running total reaches the bar length.
 */
export function splitBars(notes: readonly MelodyNote[], beatsPerBar = BEATS_PER_BAR): MelodyNote[][] {
  const bars: MelodyNote[][] = [[]];
  let acc = 0;
  for (const n of notes) {
    if (acc >= beatsPerBar) {
      bars.push([]);
      acc = 0;
    }
    (bars[bars.length - 1] as MelodyNote[]).push(n);
    acc += n[1];
  }
  return bars;
}

/** Sum of beats in one bar. */
export const barBeats = (bar: readonly MelodyNote[]): number => bar.reduce((s, n) => s + n[1], 0);

/** The theme as a Song. */
export const THEME_SONG: Song = {
  id: 'theme',
  chords: THEME_PROGRESSION.map((n) => THEME_CHORDS[n]),
  melody: splitBars(THEME_MELODY),
};

/** Arpeggio tones for a chord: triad plus the root an octave up. */
export const chordTones = (c: Chord): readonly [number, number, number, number] => [c.v[0], c.v[1], c.v[2], c.v[0] + 12];

/** Transposes a chord by `semis` semitones. */
export function transposeChord(c: Chord, semis: number): Chord {
  return {
    b: c.b + semis,
    v: [c.v[0] + semis, c.v[1] + semis, c.v[2] + semis],
    j: [c.j[0] + semis, c.j[1] + semis, c.j[2] + semis, c.j[3] + semis],
  };
}

/** Seconds per beat at a tempo. */
export const beatSeconds = (bpm: number): number => 60 / bpm;

/** Seconds per bar at a tempo. */
export const barSeconds = (bpm: number, beatsPerBar = BEATS_PER_BAR): number => beatsPerBar * beatSeconds(bpm);

/** Linear gain from decibels. */
export const dbToGain = (db: number): number => Math.pow(10, db / 20);

/** Decibels from linear gain (floor at -120 dB). */
export const gainToDb = (g: number): number => (g <= 1e-6 ? -120 : 20 * Math.log10(g));

/** Natural minor and major scale steps from the tonic. */
export const MINOR_SCALE: readonly number[] = [0, 2, 3, 5, 7, 8, 10];
export const MAJOR_SCALE: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** True when `midi` belongs to the scale rooted at `tonic` (any octave). */
export function inScale(midi: number, tonic: number, scale: readonly number[]): boolean {
  const pc = (((midi - tonic) % 12) + 12) % 12;
  return scale.includes(pc);
}
