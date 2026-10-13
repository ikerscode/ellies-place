/**
 * Small pure helpers for time, bands and levels, shared by sim, UI and audio.
 */
import {
  MINUTES_PER_DAY,
  MOOD_BANDS,
  WEEKDAYS,
  type BondLevel,
  type DayPhase,
  type GameMode,
  type GameTime,
  type MoodBand,
  type Weekday,
} from './types';

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Clamp a need or bond value into 0..100. */
export function clamp100(v: number): number {
  return clamp(v, 0, 100);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear map of a 0..100 value onto [lo, hi] (e.g. mood to the Hearts multiplier). */
export function lerpRange(range: readonly [number, number], value100: number): number {
  return lerp(range[0], range[1], clamp100(value100) / 100);
}

/** Bond level from a 0..100 value and the four thresholds for levels 1..4. */
export function bondLevelOf(value: number, thresholds: readonly [number, number, number, number]): BondLevel {
  let level = 0;
  for (const t of thresholds) if (value >= t) level++;
  return level as BondLevel;
}

/** Highest band whose lower bound is at or below the value. */
export function moodBandOf(value: number, bands: Readonly<Record<MoodBand, number>>): MoodBand {
  let out: MoodBand = 'mopey';
  for (const b of MOOD_BANDS) if (value >= bands[b]) out = b;
  return out;
}

/** True if band a is at least band b. */
export function bandAtLeast(a: MoodBand, b: MoodBand): boolean {
  return MOOD_BANDS.indexOf(a) >= MOOD_BANDS.indexOf(b);
}

/** Phase for a minute of the day, given each phase's start minute (wraps past midnight). */
export function phaseAt(minuteOfDay: number, phases: Readonly<Record<DayPhase, number>>): DayPhase {
  const order = (Object.keys(phases) as DayPhase[]).sort((a, b) => phases[a] - phases[b]);
  let current = order[order.length - 1] as DayPhase;
  for (const p of order) if (minuteOfDay >= phases[p]) current = p;
  return current;
}

/** Weekday of a 1-based day number. */
export function weekdayOf(day: number, startWeekday: Weekday): Weekday {
  const start = WEEKDAYS.indexOf(startWeekday);
  return WEEKDAYS[(((start + day - 1) % 7) + 7) % 7] as Weekday;
}

/** True if minute m is in [from, to), wrapping midnight when from > to. */
export function minuteInRange(m: number, from: number, to: number): boolean {
  return from <= to ? m >= from && m < to : m >= from || m < to;
}

export function hourOf(minuteOfDay: number): number {
  return Math.floor(minuteOfDay / 60) % 24;
}

/** "07:30" from minutes since midnight. */
export function clockText(minuteOfDay: number): string {
  const m = Math.floor(((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Sim ticks the engine runs per fixed step: speed * fastForward in live mode
 * (and cutscenes at speed 1); 0 in build, photo and activity modes.
 */
export function effectiveSteps(time: GameTime, mode: GameMode): number {
  if (mode === 'cutscene') return 1;
  if (mode !== 'live') return 0;
  return time.speed * Math.max(1, Math.floor(time.fastForward));
}
