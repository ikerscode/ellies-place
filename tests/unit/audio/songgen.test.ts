import { describe, expect, it } from 'vitest';
import { BEATS_PER_BAR, MAJOR_SCALE, MINOR_SCALE, THEME_SONG, barBeats, inScale } from '../../../src/audio/notes';
import {
  MELODY_HIGH,
  MELODY_LOW,
  PLAYLIST_LENGTH,
  STATIONS,
  degreeToMidi,
  diatonicChord,
  generateSong,
  stationBpmRange,
  stationMode,
  stationTrack,
} from '../../../src/audio/songgen';

describe('procedural radio', () => {
  it('degreeToMidi walks the scale across octaves', () => {
    expect(degreeToMidi(57, MINOR_SCALE, 0)).toBe(57);
    expect(degreeToMidi(57, MINOR_SCALE, 2)).toBe(60);
    expect(degreeToMidi(57, MINOR_SCALE, 7)).toBe(69);
    expect(degreeToMidi(57, MINOR_SCALE, -1)).toBe(55);
  });

  it('diatonic chords are voiced where game 1 voiced them', () => {
    const c = diatonicChord(57, MINOR_SCALE, 0);
    expect(c.b).toBe(45);
    expect([...c.v].sort()).toEqual([57, 60, 64]);
    for (const m of [...c.v, ...c.j]) {
      expect(m).toBeGreaterThanOrEqual(55);
      expect(m).toBeLessThanOrEqual(67);
    }
  });

  it('is deterministic per station and index', () => {
    for (const s of STATIONS) expect(stationTrack(s, 3)).toEqual(stationTrack(s, 3));
    expect(stationTrack('lofi', 2)).not.toEqual(stationTrack('lofi', 3));
  });

  it('track 0 of every playlist is the theme; the playlist wraps', () => {
    for (const s of STATIONS) {
      expect(stationTrack(s, 0)).toBe(THEME_SONG);
      expect(stationTrack(s, PLAYLIST_LENGTH)).toBe(THEME_SONG);
      expect(stationTrack(s, PLAYLIST_LENGTH + 2)).toEqual(stationTrack(s, 2));
      expect(stationTrack(s, -1)).toEqual(stationTrack(s, PLAYLIST_LENGTH - 1));
    }
  });

  it('generated songs: 8 bars of 4 beats, in key, in range, ending on the tonic', () => {
    for (const s of STATIONS) {
      const scale = stationMode(s) === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
      for (let seed = 1; seed < 40; seed++) {
        const song = generateSong(s, seed * 101);
        expect(song.chords).toHaveLength(8);
        expect(song.melody).toHaveLength(8);
        const [lo, hi] = stationBpmRange(s);
        expect(song.bpm).toBeGreaterThanOrEqual(lo);
        expect(song.bpm).toBeLessThanOrEqual(hi);
        const tonic = (song.melody[7]?.[0]?.[0] ?? 0) % 12;
        for (const bar of song.melody) {
          expect(barBeats(bar)).toBe(BEATS_PER_BAR);
          for (const [m] of bar) {
            expect(m).toBeGreaterThanOrEqual(MELODY_LOW);
            expect(m).toBeLessThanOrEqual(MELODY_HIGH);
            expect(inScale(m, tonic, scale)).toBe(true);
          }
        }
        expect(song.melody[7]).toHaveLength(1);
      }
    }
  });
});
