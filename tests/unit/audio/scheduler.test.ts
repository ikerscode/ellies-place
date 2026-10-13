import { describe, expect, it } from 'vitest';
import {
  ANCHOR_OFFSET_S,
  LOOKAHEAD_S,
  createDeckState,
  nextBeatAt,
  planBars,
  type TrackShape,
} from '../../../src/audio/scheduler';

const loop8 = (bpm: number): (() => TrackShape) => () => ({ bpm, bars: 8, loops: Infinity });

describe('lookahead bar scheduler', () => {
  it('plans only bars that start inside the lookahead window', () => {
    const s = createDeckState(1);
    expect(planBars(s, 0, loop8(60))).toEqual([]);
    const got = planBars(s, 0.7, loop8(60));
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ t: 1, bar: 0, loop: 0, beat: 1 });
    expect(s.next).toBe(5); // 4 beats at 60 bpm
    // Nothing more until the next bar enters the window.
    expect(planBars(s, 4.6, loop8(60))).toEqual([]);
    expect(planBars(s, 5 - LOOKAHEAD_S + 0.01, loop8(60))).toHaveLength(1);
  });

  it('advances bars and loops, wrapping after 8 bars', () => {
    const s = createDeckState(0);
    const bars = planBars(s, 0, loop8(240), 100, 20); // 1 s per bar
    expect(bars).toHaveLength(20);
    expect(bars.map((b) => b.bar).slice(6, 10)).toEqual([6, 7, 0, 1]);
    expect(bars[8]?.loop).toBe(1);
    expect(bars[19]?.t).toBe(19);
  });

  it('bar starts are evenly spaced: no drift over many bars', () => {
    const s = createDeckState(0.2);
    const bars = planBars(s, 0, loop8(70), 1000, 64);
    const bar = (60 / 70) * 4;
    bars.forEach((b, i) => expect(b.t).toBeCloseTo(0.2 + i * bar, 9));
  });

  it('re-anchors after a background tab instead of catching up', () => {
    const s = createDeckState(1);
    const got = planBars(s, 50, loop8(60));
    expect(got).toHaveLength(1);
    expect(got[0]?.t).toBeCloseTo(50 + ANCHOR_OFFSET_S, 9);
  });

  it('walks a playlist: loops per track, then the next track with its own tempo', () => {
    const shape = (track: number): TrackShape => ({ bpm: track === 0 ? 240 : 120, bars: 2, loops: 2 });
    const s = createDeckState(0);
    const bars = planBars(s, 0, shape, 9, 64);
    // Track 0: 4 bars of 1 s; then track 1 bars of 2 s.
    expect(bars.map((b) => [b.track, b.loop, b.bar])).toEqual([
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
    ]);
    expect(bars[4]?.t).toBe(4);
    expect(bars[5]?.t).toBe(6);
    expect(bars[5]?.beat).toBe(0.5);
  });

  it('maxBars bounds runaway shapes', () => {
    const s = createDeckState(0);
    expect(planBars(s, 0, () => ({ bpm: 1e6, bars: 8, loops: Infinity }), 1e9, 16)).toHaveLength(16);
  });

  it('nextBeatAt snaps to the following beat boundary', () => {
    expect(nextBeatAt(0.5, 1, 0.5)).toBe(1);
    expect(nextBeatAt(1, 1, 0.5)).toBe(1);
    expect(nextBeatAt(1.2, 1, 0.5)).toBe(1.5);
    expect(nextBeatAt(1.5, 1, 0.5)).toBe(1.5);
    expect(nextBeatAt(2.01, 1, 0.5)).toBe(2.5);
  });
});
