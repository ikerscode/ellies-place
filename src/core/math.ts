/**
 * Small pure helpers for time, bands and levels, shared by sim, UI and audio.
 */
import {
  MINUTES_PER_DAY,
  MOOD_BANDS,
  MOOD_STEPS,
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

/** Linear map of a 0..100 value onto [lo, hi] (e.g. bond to the scorer's bond weight). */
export function lerpRange(range: readonly [number, number], value100: number): number {
  return lerp(range[0], range[1], clamp100(value100) / 100);
}

/** Bond level from a 0..100 value and the four thresholds for levels 1..4. */
export function bondLevelOf(value: number, thresholds: readonly [number, number, number, number]): BondLevel {
  let level = 0;
  for (const t of thresholds) if (value >= t) level++;
  return level as BondLevel;
}

/** Lowest mood value of each display band, from the frozen MOOD_STEPS (mopey 0, low 25, okay 45, good 65, great 80). */
export const MOOD_BAND_FLOORS: Readonly<Record<MoodBand, number>> = (() => {
  const out: Record<MoodBand, number> = { mopey: 0, low: 0, okay: 0, good: 0, great: 0 };
  for (const b of MOOD_BANDS) out[b] = Math.min(...MOOD_STEPS.filter((s) => s.band === b).map((s) => s.atLeast));
  return out;
})();

/** Highest band whose lower bound is at or below the value. */
export function moodBandOf(value: number, bands: Readonly<Record<MoodBand, number>> = MOOD_BAND_FLOORS): MoodBand {
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
 * Sim ticks the engine runs per fixed step. Live: `speed`, or `fastForward`
 * instead while sleep fast-forward is on (and not paused). Cutscenes: 1.
 * Build, photo and activity modes: 0.
 */
export function effectiveSteps(time: GameTime, mode: GameMode): number {
  if (mode === 'cutscene') return 1;
  if (mode !== 'live' || time.speed === 0) return 0;
  const ff = Math.floor(time.fastForward);
  return ff > 1 && !time.realTime ? ff : time.speed;
}

/**
 * Night-layer alpha at a minute of the day (sim.md 1.5): `night` from the night
 * phase to the morning phase, ramping to 0 across `morning` (dawn), 0 through
 * `day`, ramping back up across `evening` (dusk).
 */
export function darknessAt(minuteOfDay: number, phases: Readonly<Record<DayPhase, number>>, night: number): number {
  const m = ((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const span = (from: number, to: number): number => (((to - from) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const since = (from: number): number => span(from, m);
  const dawn = span(phases.morning, phases.day);
  const dusk = span(phases.evening, phases.night);
  if (since(phases.morning) < dawn) return night * (1 - since(phases.morning) / dawn);
  if (since(phases.day) < span(phases.day, phases.evening)) return 0;
  if (since(phases.evening) < dusk) return night * (since(phases.evening) / dusk);
  return night;
}
