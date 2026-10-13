/**
 * Lookahead bar scheduler maths (pure). Game 1 ran a 50 ms timer that
 * scheduled every whole bar starting within 350 ms of the audio clock, and
 * re-anchored the clock when a background tab fell over a second behind.
 * This module keeps exactly that logic, minus the Web Audio calls, and adds
 * track advance for radio playlists.
 */
import { BEATS_PER_BAR, beatSeconds } from './notes';

/** Timer period of the scheduler loop (ms). */
export const TICK_MS = 50;
/** Schedule bars that start before now + LOOKAHEAD_S. */
export const LOOKAHEAD_S = 0.35;
/** If the next bar is this far in the past, re-anchor instead of catching up. */
export const REANCHOR_S = 1;
/** Offset used when (re)anchoring. */
export const ANCHOR_OFFSET_S = 0.1;

export interface DeckState {
  /** Audio-clock time at which the next bar starts. */
  next: number;
  /** Bar index within the current loop (0-based). */
  bar: number;
  /** How many times the current track has looped. */
  loop: number;
  /** Playlist track index (always 0 for plain arrangements). */
  track: number;
}

/** Shape of one track as the scheduler sees it. */
export interface TrackShape {
  readonly bpm: number;
  readonly bars: number;
  /** Loops before advancing to the next track. Infinity for plain arrangements. */
  readonly loops: number;
}

export interface PlannedBar {
  readonly t: number;
  readonly bar: number;
  readonly loop: number;
  readonly track: number;
  /** Seconds per beat for this bar. */
  readonly beat: number;
}

export function createDeckState(startAt: number): DeckState {
  return { next: startAt, bar: 0, loop: 0, track: 0 };
}

/**
 * Plans every bar whose start falls before `now + lookahead`, advancing `state`.
 * `shapeOf(track)` describes each track (tempo, bars per loop, loops per track).
 * `maxBars` bounds the loop so a bad shape can never hang the main thread.
 */
export function planBars(
  state: DeckState,
  now: number,
  shapeOf: (track: number) => TrackShape,
  lookahead = LOOKAHEAD_S,
  maxBars = 64,
): PlannedBar[] {
  const out: PlannedBar[] = [];
  if (state.next < now - REANCHOR_S) state.next = now + ANCHOR_OFFSET_S;
  while (state.next < now + lookahead && out.length < maxBars) {
    const shape = shapeOf(state.track);
    const beat = beatSeconds(shape.bpm);
    out.push({ t: state.next, bar: state.bar, loop: state.loop, track: state.track, beat });
    state.next += beat * BEATS_PER_BAR;
    state.bar += 1;
    if (state.bar >= shape.bars) {
      state.bar = 0;
      state.loop += 1;
      if (state.loop >= shape.loops) {
        state.loop = 0;
        state.track += 1;
      }
    }
  }
  return out;
}

/** Start time of the next beat boundary at or after `now`, given a bar that started at `barStart`. */
export function nextBeatAt(now: number, barStart: number, beat: number): number {
  if (now <= barStart) return barStart;
  const k = Math.ceil((now - barStart) / beat - 1e-9);
  return barStart + k * beat;
}
