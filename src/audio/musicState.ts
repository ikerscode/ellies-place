/**
 * Music state machine (pure). MusicContext in, a track decision and a
 * transition plan out. The engine applies the plan to the Web Audio graph.
 * See design/spec/audio.md "Music state machine".
 */
import type { ActivityId, MusicContext, MusicTrack, RadioStation, RoomKind } from '../core/types';

/** Everything the engine needs to know about what should be playing. */
export interface MusicDecision {
  readonly track: MusicTrack;
  /** Radio heard from outside: low-passed and quieter. */
  readonly muffled: boolean;
  /** Music bus level multiplier for this state (photo mode sits back a little). */
  readonly level: number;
}

export type MusicTransition =
  | { readonly kind: 'none' }
  | { readonly kind: 'crossfade'; readonly from: MusicTrack; readonly to: MusicTrack; readonly seconds: number }
  /** Same track, different muffle or level: glide the filter and gain. */
  | { readonly kind: 'adjust'; readonly muffled: boolean; readonly level: number; readonly seconds: number };

const OUTDOOR: ReadonlySet<RoomKind> = new Set<RoomKind>(['garden', 'frontStep']);

export const isOutdoor = (room: RoomKind | null): boolean => room !== null && OUTDOOR.has(room);

const GYM_RE = /gym|hyrox|treadmill|ski|row|sled|burpee|lunge|wallball|wall-ball|kettlebell|carry|workout/i;
const RACE_RE = /race/i;

export const isGymActivity = (id: ActivityId | string | null): boolean => id !== null && GYM_RE.test(id);
export const isRaceActivity = (id: ActivityId | string | null): boolean => id !== null && RACE_RE.test(id);

export const STATION_TRACK: Readonly<Record<RadioStation, MusicTrack>> = { heavy: 'heavy', lofi: 'lofi', cosy: 'cosy' };

/** Level multiplier in photo mode (the shutter ducks on top of this). */
export const PHOTO_LEVEL = 0.7;

/**
 * Picks the track. Priority, highest first:
 * title, housewarming, race (race day or a race activity), gym activity,
 * radio, then time of day (night at night, home otherwise).
 */
export function chooseTrack(ctx: MusicContext): MusicDecision {
  const level = ctx.mode === 'photo' ? PHOTO_LEVEL : 1;
  if (ctx.mode === 'title') return { track: 'title', muffled: false, level: 1 };
  if (ctx.housewarming) return { track: 'housewarming', muffled: false, level };
  if (ctx.raceDay || isRaceActivity(ctx.activity)) return { track: 'raceDay', muffled: false, level };
  if (ctx.mode === 'activity' && isGymActivity(ctx.activity)) return { track: 'gym', muffled: false, level };
  if (ctx.radio !== null) return { track: STATION_TRACK[ctx.radio], muffled: isOutdoor(ctx.room), level };
  return { track: ctx.phase === 'night' ? 'night' : 'home', muffled: false, level };
}

/** Crossfade length in seconds between two tracks. */
export function crossfadeSeconds(from: MusicTrack, to: MusicTrack): number {
  if (from === to) return 0;
  if (to === 'none') return 1.5;
  if (from === 'none') return 2;
  const radio = (t: MusicTrack): boolean => t === 'heavy' || t === 'lofi' || t === 'cosy';
  // The needle drops or lifts: quick.
  if (radio(from) || radio(to)) return 0.6;
  const energetic = (t: MusicTrack): boolean => t === 'gym' || t === 'raceDay';
  if (energetic(from) || energetic(to)) return 1;
  if (from === 'title') return 3;
  if (to === 'housewarming') return 1.5;
  // Home and night follow the clock: slow, so the change is felt more than heard.
  return 4;
}

/** Seconds for a muffle or level glide on the same track. */
export const ADJUST_SECONDS = 0.8;

/** Plans the move from the current decision to the one for `ctx`. */
export function planTransition(current: MusicDecision | null, ctx: MusicContext): { next: MusicDecision; transition: MusicTransition } {
  const next = chooseTrack(ctx);
  if (current === null) {
    return { next, transition: { kind: 'crossfade', from: 'none', to: next.track, seconds: crossfadeSeconds('none', next.track) } };
  }
  if (current.track !== next.track) {
    return { next, transition: { kind: 'crossfade', from: current.track, to: next.track, seconds: crossfadeSeconds(current.track, next.track) } };
  }
  if (current.muffled !== next.muffled || current.level !== next.level) {
    return { next, transition: { kind: 'adjust', muffled: next.muffled, level: next.level, seconds: ADJUST_SECONDS } };
  }
  return { next, transition: { kind: 'none' } };
}

// ---- Ducking ---------------------------------------------------------------

/** Duck depth (linear gain on the music bus): about -12 dB. */
export const DUCK_GAIN = 0.25;
export const DUCK_ATTACK_S = 0.08;
export const DUCK_RELEASE_S = 0.6;
/** Default hold for the shutter. */
export const SHUTTER_DUCK_MS = 700;
/** A letter holds the duck until mail.close; this caps it if close never comes. */
export const LETTER_DUCK_MAX_MS = 60_000;

/**
 * Overlapping ducks: given active duck end times (seconds) and now, returns the
 * time the music should start releasing, or null if nothing holds it.
 */
export function duckReleaseAt(ends: readonly number[], now: number): number | null {
  let latest: number | null = null;
  for (const e of ends) if (e > now && (latest === null || e > latest)) latest = e;
  return latest;
}

/** Breakpoints for one duck of `ms` starting at `t`, as [time, gain] pairs. */
export function duckEnvelope(t: number, ms: number): readonly (readonly [number, number])[] {
  const hold = Math.max(0, ms / 1000);
  return [
    [t, 1],
    [t + DUCK_ATTACK_S, DUCK_GAIN],
    [t + DUCK_ATTACK_S + hold, DUCK_GAIN],
    [t + DUCK_ATTACK_S + hold + DUCK_RELEASE_S, 1],
  ];
}
