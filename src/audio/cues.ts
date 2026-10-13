/**
 * Local cue union. The shared `AudioCue` lives in src/core/types.ts; this file
 * keeps audio-dev's local `Cue`, which must stay a superset of it. The
 * compile-time checks at the bottom fail the typecheck if core ever gains a
 * cue this file does not know.
 */
import type {
  AudioCue,
  BlipVoice,
  FloorSound,
  HitGrade,
  HyroxStation,
  Meower,
  SimpleCueName as CoreSimpleCueName,
} from '../core/types';
import { HYROX_ORDER } from '../core/types';

export type { Meower, HitGrade };
/** Dialogue blip voices (game 1's VOICE table plus Pickle). */
export type Voice = BlipVoice;

export type FloorKind = FloorSound;
export const FLOOR_KINDS: readonly FloorKind[] = ['wood', 'tile', 'carpet', 'rug', 'grass', 'stone', 'gymMat', 'gravel'];

/** The eight Hyrox stations plus two home-gym extras. */
export type GymStation = HyroxStation | 'treadmill' | 'kettlebell';
export const GYM_STATIONS: readonly GymStation[] = [...HYROX_ORDER, 'treadmill', 'kettlebell'];

export const MEOWERS: readonly Meower[] = ['george', 'salem', 'shadow', 'peaches', 'bruce'];
export const VOICES: readonly Voice[] = ['ellie', ...MEOWERS, 'poe', 'pickle'];

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
  // Local extras (see CONTRACT_REQUEST.md)
  'build.wall',
  'build.floor',
  'race.horn',
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

/** Core cues are always local cues: this assignment is the superset check. */
export const fromCore = (c: AudioCue): Cue => c;

/** Fails the typecheck if a core simple cue is missing from SIMPLE_CUES. */
type MissingSimple = Exclude<CoreSimpleCueName, SimpleCueName>;
export const SIMPLE_CUES_COVER_CORE: [MissingSimple] extends [never] ? true : MissingSimple = true;
