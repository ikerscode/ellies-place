/**
 * Local AudioCue union. The architect owns the shared `AudioCue` in
 * src/core/types.ts; this is audio-dev's proposed full list (see
 * CONTRACT_REQUEST.md). It is a superset of the Wave 0 draft, so a core
 * `AudioCue` is always a valid `Cue` here.
 */
import type { CatName } from '../core/types';

/** Anything that meows with a game 1 signature: the four cats plus Bruce. */
export type Meower = CatName | 'bruce';
/** Dialogue blip voices (game 1's VOICE table plus Pickle). */
export type Voice = 'ellie' | Meower | 'poe' | 'pickle';

export type FloorKind = 'wood' | 'tile' | 'carpet' | 'rug' | 'grass' | 'stone' | 'gymMat' | 'gravel';
export const FLOOR_KINDS: readonly FloorKind[] = ['wood', 'tile', 'carpet', 'rug', 'grass', 'stone', 'gymMat', 'gravel'];

export type GymStation = 'ski' | 'sledPush' | 'sledPull' | 'burpee' | 'row' | 'carry' | 'lunge' | 'wallBall' | 'treadmill' | 'kettlebell';
export const GYM_STATIONS: readonly GymStation[] = ['ski', 'sledPush', 'sledPull', 'burpee', 'row', 'carry', 'lunge', 'wallBall', 'treadmill', 'kettlebell'];

/** Hit quality in timing minigames. A miss is soft, never a buzzer. */
export type HitGrade = 'perfect' | 'good' | 'miss';

/** Cues without a payload. */
export const SIMPLE_CUES = [
  // UI
  'ui.click',
  'ui.hover',
  'ui.open',
  'ui.close',
  'ui.confirm',
  'ui.back',
  'ui.nope',
  'ui.toggle',
  'ui.tab',
  'ui.page',
  'ui.toast',
  'ui.petals',
  'ui.queueAdd',
  'ui.queueCancel',
  'ui.speed',
  'ui.pause',
  'ui.hearts',
  'ui.wish',
  'ui.sticker',
  'ui.unlock',
  'ui.aspiration',
  // Modes
  'mode.build',
  'mode.live',
  'mode.photo',
  // Build mode
  'build.pickUp',
  'build.place',
  'build.blocked',
  'build.rotate',
  'build.sell',
  'build.paint',
  'build.undo',
  'build.redo',
  'build.duplicate',
  'build.eyedropper',
  // Home and things
  'door.knock',
  'door.open',
  'door.close',
  'mail.arrive',
  'mail.open',
  'mail.close',
  'box.open',
  'photo.shutter',
  'lamp.on',
  'lamp.off',
  'record.start',
  'record.stop',
  'tv.on',
  'tv.off',
  'console.boot',
  'kettle.boil',
  'coffee.pour',
  'rusk.dunk',
  'rusk.perfect',
  'rusk.plop',
  'sushi.chop',
  'sushi.roll',
  'sushi.plate',
  'lantern.light',
  'star.shoot',
  'star.wish',
  'eat.crunch',
  'sit.sofa',
  'bed.flop',
  'water.run',
  'dress.change',
  'housewarming',
  // Gym and race
  'gym.countdown',
  'gym.go',
  'gym.rep',
  'race.cheer',
  'race.finish',
  'race.pb',
  'race.medal',
  // Cats (general)
  'cat.land',
  'cat.knock',
  'cat.zoomies',
  'cat.scratch',
  'cat.boxIn',
  'cat.crunch',
  'cat.lap',
  'cat.bell',
  // Visitors
  'poe.caw',
  'pickle.ribbit',
] as const;

export type SimpleCueName = (typeof SIMPLE_CUES)[number];

export type Cue =
  | { readonly cue: SimpleCueName }
  | { readonly cue: 'meow'; readonly cat: Meower }
  | { readonly cue: 'purr'; readonly cat: Meower }
  | { readonly cue: 'mrrp'; readonly cat: Meower }
  | { readonly cue: 'chirp'; readonly cat: Meower }
  | { readonly cue: 'huff'; readonly cat: Meower }
  | { readonly cue: 'blip'; readonly voice: Voice }
  | { readonly cue: 'step'; readonly floor: FloorKind; readonly wet?: boolean }
  | { readonly cue: 'gym.stroke'; readonly station: GymStation }
  | { readonly cue: 'gym.hit'; readonly grade: HitGrade }
  | { readonly cue: 'race.crowd'; readonly intensity: number };

export type CueName = Cue['cue'];

export const CAT_CUES = ['meow', 'purr', 'mrrp', 'chirp', 'huff'] as const;
export type CatCueName = (typeof CAT_CUES)[number];

/** Every cue name, for completeness checks and the meter page. */
export const ALL_CUE_NAMES: readonly CueName[] = [
  ...SIMPLE_CUES,
  ...CAT_CUES,
  'blip',
  'step',
  'gym.stroke',
  'gym.hit',
  'race.crowd',
];

/** True when a value is a well-formed cue (used to guard untyped callers). */
export function isCue(x: unknown): x is Cue {
  if (typeof x !== 'object' || x === null) return false;
  const c = (x as { cue?: unknown }).cue;
  return typeof c === 'string' && (ALL_CUE_NAMES as readonly string[]).includes(c);
}
