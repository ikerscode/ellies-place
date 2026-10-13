import { describe, expect, it } from 'vitest';
import {
  ARP,
  THEME_CHORDS,
  THEME_MELODY,
  THEME_PROGRESSION,
  THEME_SONG,
  barBeats,
  barSeconds,
  beatSeconds,
  chordTones,
  dbToGain,
  gainToDb,
  inScale,
  MINOR_SCALE,
  mf,
  splitBars,
  transposeChord,
} from '../../../src/audio/notes';

describe('note tables', () => {
  it('mf maps MIDI to Hz with A4 = 440', () => {
    expect(mf(69)).toBe(440);
    expect(mf(81)).toBeCloseTo(880, 9);
    expect(mf(57)).toBeCloseTo(220, 9);
    expect(mf(60)).toBeCloseTo(261.6256, 3);
  });

  it('keeps game 1 theme: Am F C G Am F E Am', () => {
    expect(THEME_PROGRESSION).toEqual(['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'Am']);
    expect(THEME_CHORDS.E.v).toEqual([56, 59, 64]); // G# leading tone
    expect(THEME_MELODY).toHaveLength(25);
  });

  it('splits the melody into 8 bars of exactly 4 beats', () => {
    const bars = splitBars(THEME_MELODY);
    expect(bars).toHaveLength(8);
    for (const b of bars) expect(barBeats(b)).toBe(4);
    expect(THEME_SONG.melody).toEqual(bars);
    expect(THEME_SONG.chords).toHaveLength(8);
  });

  it('melody notes sit in A minor (harmonic: G# allowed on the E bar)', () => {
    const bars = THEME_SONG.melody;
    bars.forEach((bar, i) => {
      for (const [m] of bar) {
        const ok = inScale(m, 57, MINOR_SCALE) || (THEME_PROGRESSION[i] === 'E' && m % 12 === 8);
        expect(ok, `bar ${i} note ${m}`).toBe(true);
      }
    });
  });

  it('ARP indexes the four chord tones', () => {
    expect(ARP).toHaveLength(8);
    for (const k of ARP) expect(k).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ARP)).toBe(3);
    expect(chordTones(THEME_CHORDS.Am)).toEqual([57, 60, 64, 69]);
  });

  it('transposes chords', () => {
    const t = transposeChord(THEME_CHORDS.Am, 2);
    expect(t.b).toBe(47);
    expect(t.v).toEqual([59, 62, 66]);
    expect(t.j).toEqual([57, 59, 62, 66]);
  });

  it('tempo maths', () => {
    expect(beatSeconds(60)).toBe(1);
    expect(beatSeconds(120)).toBe(0.5);
    expect(barSeconds(70)).toBeCloseTo(240 / 70, 12);
  });

  it('dB conversions round-trip', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(gainToDb(dbToGain(-12))).toBeCloseTo(-12, 9);
    expect(gainToDb(0)).toBe(-120);
  });
});
