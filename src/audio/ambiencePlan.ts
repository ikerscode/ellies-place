/**
 * Ambience plan (pure): which beds and spot sounds are audible for a context,
 * and how loud. The engine glides each layer to these levels.
 */
import type { DayPhase, MusicContext } from '../core/types';
import { isOutdoor } from './musicState';

export interface AmbienceLevels {
  /** Spot chirps, 0..1 = how often and how loud. */
  readonly birds: number;
  /** Spot cricket trills. */
  readonly crickets: number;
  /** Rain bed (band-passed noise) plus drips. */
  readonly rain: number;
  /** Indoor room tone: a soft low hum. */
  readonly roomTone: number;
  /** Outdoor air: low-passed noise. */
  readonly gardenAir: number;
}

export const SILENT_AMBIENCE: AmbienceLevels = { birds: 0, crickets: 0, rain: 0, roomTone: 0, gardenAir: 0 };

/** Through a closed window, outdoor sounds drop to this share. */
export const WINDOW_SHARE = 0.3;

const BIRDS_BY_PHASE: Readonly<Record<DayPhase, number>> = { dawn: 1, day: 0.7, dusk: 0.25, night: 0 };
const CRICKETS_BY_PHASE: Readonly<Record<DayPhase, number>> = { dawn: 0, day: 0, dusk: 0.5, night: 1 };

export function ambiencePlan(ctx: MusicContext): AmbienceLevels {
  if (ctx.mode === 'title') return SILENT_AMBIENCE;
  const out = isOutdoor(ctx.room);
  const share = out ? 1 : WINDOW_SHARE;
  const raining = ctx.weather === 'rain';
  // Birds go quiet in the rain; crickets carry on, softer.
  const birds = BIRDS_BY_PHASE[ctx.phase] * share * (raining ? 0.15 : ctx.weather === 'cloudy' ? 0.7 : 1);
  const crickets = CRICKETS_BY_PHASE[ctx.phase] * share * (raining ? 0.4 : 1);
  return {
    birds,
    crickets,
    rain: raining ? (out ? 1 : 0.55) : 0,
    roomTone: out ? 0 : 1,
    gardenAir: out ? 1 : 0,
  };
}

/** Bed gains at full ambience volume (before the ambience bus). */
export const BED_GAIN = { rain: 0.1, roomTone: 0.035, gardenAir: 0.07 } as const;

/** Probability per 120 ms ambience tick of a spot sound at level 1. */
export const SPOT_RATE = { birds: 0.06, crickets: 0.22, drips: 0.1 } as const;
export const AMB_TICK_MS = 120;
