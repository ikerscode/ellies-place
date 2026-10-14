/**
 * The names of counters (`SimState.stats`, `statsToday`), flags (`SimState.flags`) and records
 * (`records.best`) that more than one module reads or writes (F20). The sim, the activities,
 * the data and the tests all import these, so `boxSat.salem` is never `box.sat.salem` in one
 * place and `boxSat.salem` in another. Convention: dotted lower camelCase. play.md's one-word
 * counter names (`racesCompleted`, `salemBoxSits`...) are void; this file wins.
 *
 * Who increments what is in design/spec/contracts.md section 7 ("Stats table").
 */
import type { CatName, FlagKey, HyroxStation, InteractionId, ProgressEvent, ProgressKind, StatKey } from './types';

// ---- Stats: families --------------------------------------------------------------

/** `interaction.<id>`: recorded automatically each time an interaction completes (also `interaction`). */
export const statInteraction = (id: InteractionId | string): StatKey => `interaction.${id}`;

/**
 * The two counters a ProgressEvent bumps: `<kind>` and, with a subject, `<kind>.<subject>`
 * (also in `statsToday`). `boxSat.salem`, `pb.skiErg`, `activityGrade.perfect`, `race.gold`.
 */
export function progressStats(e: Pick<ProgressEvent, 'kind' | 'subject'>): readonly StatKey[] {
  return e.subject === undefined ? [e.kind] : [e.kind, `${e.kind}.${e.subject}`];
}
export const statProgress = (kind: ProgressKind, subject?: string): StatKey => (subject === undefined ? kind : `${kind}.${subject}`);

/** Photos by tag: `photo.all_four`, `photo.zoomies_3am` (a `photo` progress event per tag). */
export const statPhotoTag = (tag: string): StatKey => `photo.${tag}`;
/** Minutes a cat spent in an observed state today, for `catState` with `forMinutes`: `catState.shadow.on_lap`. */
export const statCatState = (cat: CatName, state: string): StatKey => `catState.${cat}.${state}`;

// ---- Stats: named counters ----------------------------------------------------------

export const STAT = {
  /** Races finished (progress kind `race`, subject = the medal id). */
  racesCompleted: 'race',
  /** Salem's box sits (progress kind `boxSat`, subject `salem`; each new sit after leaving counts). */
  salemBoxSits: 'boxSat.salem',
  /** Items Salem knocked off a surface (progress kind `knockOff`). */
  knockOffs: 'knockOff',
  perfectDunks: 'dunk.perfect',
  ritualsDone: 'ritual.done',
  sushiMade: 'sushi.made',
  fishDenied: 'sushi.fishDenied',
  danceCount: 'dance.count',
  headbangCount: 'headbang.count',
  recordMinutes: 'record.minutes',
  stargazes: 'star.gaze',
  starWishes: 'star.wish',
  readMinutes: 'read.minutes',
  nightsSlept: 'sleep.nights',
  /** Cats on her bed at the 03:00 check (`bed.sleep`). */
  catsOnBed: 'sleep.catsOnBed',
  /** Game minutes Shadow has spent on her lap, ever. */
  shadowLapMinutes: 'shadow.lapMinutes',
  wishesFullSets: 'wish.fullSets',
  /** Tick of the last finished coffee, for the race `coffee` bonus (a tick, not a count). */
  lastCoffeeTick: 'coffee.lastTick',
} as const satisfies Record<string, StatKey>;

// ---- Flags --------------------------------------------------------------------------

export const FLAG = {
  /** Bruce lives on the garden wall for good. */
  bruceOnWall: 'bruce.onWall',
  /** George has knighted her (`Sir {name}`). */
  georgeKnighted: 'george.knighted',
  housewarmingHeld: 'housewarming.held',
  /** The 3 a.m. zoomies are running (also `quirk.zoomies3am`, set by the sim for the duration). */
  zoomiesRunning: 'quirk.zoomies3am',
} as const satisfies Record<string, FlagKey>;

/** `secret.<id>`: a secret found (an unlock code `secret:<id>` reads it). */
export const secretFlagKey = (id: string): FlagKey => `secret.${id}`;
/** `quirk.<id>`: a quirk is running right now. */
export const quirkFlagKey = (id: string): FlagKey => `quirk.${id}`;

// ---- Records (`records.best`, read by recordAtMost / recordAtLeast) -------------------

export const RECORD = {
  /** Best race total in ms (lower is better). Mirrors `records.hyrox.racePbMs`; "a race under 1:30" is at most 5400000. */
  raceTotalMs: 'race.totalMs',
  /** Best run split in ms. */
  runSplitMs: 'race.runSplitMs',
  bestSushi: 'sushi.best',
} as const satisfies Record<string, StatKey>;

/** Best race split for a station in ms: `race.splitMs.skiErg`. */
export const recordSplit = (station: HyroxStation): StatKey => `race.splitMs.${station}`;
/** Best training score for a station in points 0..100 (mirrors `records.hyrox.stationPb`). */
export const recordTrain = (station: HyroxStation): StatKey => `train.points.${station}`;
