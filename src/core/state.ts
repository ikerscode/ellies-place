/**
 * Entity store accessors and an empty SimState factory. The sim owns the
 * real new-game setup (spawning Ellie, cats and furniture); this file only
 * guarantees a valid, serialisable skeleton every module can build on.
 */
import { createRng } from './rng';
import { timeAtTick } from './math';
import {
  CAT_NAMES,
  HYROX_ORDER,
  SAVE_VERSION,
  SKILL_IDS,
  VISITOR_NAMES,
  asEntityId,
  type CatName,
  type ComponentKey,
  type ComponentStore,
  type ContentDb,
  type DailyState,
  type Components,
  type DeepReadonly,
  type EntityId,
  type HyroxStation,
  type SkillId,
  type LotState,
  type SimState,
  type VisitorName,
} from './types';

const COMPONENT_KEYS: readonly ComponentKey[] = [
  'meta',
  'position',
  'motion',
  'sprite',
  'agent',
  'needs',
  'mood',
  'bond',
  'bubble',
  'cat',
  'visitor',
  'placeable',
  'smartObject',
  'carryable',
  'light',
  'box',
  'mess',
];

export function componentKeys(): readonly ComponentKey[] {
  return COMPONENT_KEYS;
}

export function emptyComponentStore(): ComponentStore {
  return {
    meta: {},
    position: {},
    motion: {},
    sprite: {},
    agent: {},
    needs: {},
    mood: {},
    bond: {},
    bubble: {},
    cat: {},
    visitor: {},
    placeable: {},
    smartObject: {},
    carryable: {},
    light: {},
    box: {},
    mess: {},
  };
}

/** Allocates a new entity id (does not add components). */
export function allocEntity(state: SimState): EntityId {
  const id = asEntityId(state.nextEntityId);
  state.nextEntityId += 1;
  return id;
}

/**
 * Component lookup. The table is indexed by the number itself: JS turns it into the same
 * property key as `String(id)` without allocating a string on every call (hot per tick, N10).
 * A read-only state gives back a read-only component.
 */
export function getC<K extends ComponentKey>(state: SimState, key: K, id: EntityId): Components[K] | undefined;
export function getC<K extends ComponentKey>(state: DeepReadonly<SimState>, key: K, id: EntityId): DeepReadonly<Components[K]> | undefined;
export function getC<K extends ComponentKey>(state: DeepReadonly<SimState>, key: K, id: EntityId): unknown {
  return (state.components[key] as unknown as Record<number, unknown>)[id];
}

export function hasC(state: DeepReadonly<SimState>, key: ComponentKey, id: EntityId): boolean {
  return Object.prototype.hasOwnProperty.call(state.components[key], id);
}

export function setC<K extends ComponentKey>(state: SimState, key: K, id: EntityId, value: Components[K]): void {
  const table: Record<string, Components[K]> = state.components[key];
  table[String(id)] = value;
}

export function removeC(state: SimState, key: ComponentKey, id: EntityId): void {
  delete state.components[key][String(id)];
}

/** Removes an entity from every table. */
export function removeEntity(state: SimState, id: EntityId): void {
  for (const k of COMPONENT_KEYS) delete state.components[k][String(id)];
}

/**
 * Ids that have a component, in ascending numeric order (JS orders integer
 * keys ascending, which keeps iteration deterministic).
 */
export function entitiesWith(state: DeepReadonly<SimState>, key: ComponentKey): EntityId[] {
  return Object.keys(state.components[key]).map((k) => asEntityId(Number(k)));
}

export function emptyLot(w: number, h: number): LotState {
  return {
    w,
    h,
    tiles: new Array<LotState['tiles'][number]>(w * h).fill('void'),
    roomAt: new Array<LotState['roomAt'][number]>(w * h).fill(null),
    rooms: {},
    revision: 0,
  };
}

function perStation<T>(v: T): Record<HyroxStation, T> {
  const out = {} as Record<HyroxStation, T>;
  for (const s of HYROX_ORDER) out[s] = v;
  return out;
}

function perSkill<T>(v: T): Record<SkillId, T> {
  const out = {} as Record<SkillId, T>;
  for (const s of SKILL_IDS) out[s] = v;
  return out;
}

function perCat<T>(v: T): Record<CatName, T> {
  const out = {} as Record<CatName, T>;
  for (const c of CAT_NAMES) out[c] = v;
  return out;
}

/** Fresh per-day counters for a day (reset at 00:00). */
export function emptyDaily(day: number): DailyState {
  return {
    day,
    coffees: 0,
    knocks: 0,
    knockTrinkets: 0,
    bondGained: perCat(0),
    bondLost: perCat(0),
    shadowTrust: 0,
    uses: {},
    minigamesPaid: 0,
    photosPaid: 0,
    racePaid: false,
    sparWinsPaid: 0,
    extra: {},
  };
}

function perVisitor<T>(v: T): Record<VisitorName, T> {
  const out = {} as Record<VisitorName, T>;
  for (const s of VISITOR_NAMES) out[s] = v;
  return out;
}

export interface EmptyStateOptions {
  readonly lot?: LotState;
}

/**
 * A valid SimState with no entities. JSON-safe and hashable. The start time, weekday, phase
 * and Hearts come from content (SimTuning.time and EconomyTable.startHearts), so nothing is
 * hard-coded here and forgetting them is impossible (N6): pass `content.db`.
 */
export function createEmptySimState(seed: number, content: Pick<ContentDb, 'tuning' | 'economy'>, opts: EmptyStateOptions = {}): SimState {
  const tt = content.tuning.time;
  const start = timeAtTick(0, tt);
  return {
    version: SAVE_VERSION,
    rng: createRng(seed),
    time: {
      tick: 0,
      day: start.day,
      minuteOfDay: start.minuteOfDay,
      weekday: start.weekday,
      phase: start.phase,
      speed: 1,
      lastSpeed: 1,
      fastForward: 1,
      realTime: false,
    },
    mode: 'live',
    options: { freeWill: true },
    nextEntityId: 1,
    nextActionId: 1,
    components: emptyComponentStore(),
    lot: opts.lot ?? emptyLot(0, 0),
    environment: { weather: 'clear', rain: null, lastRainDay: null, music: null, lanternsUntilTick: null, starsTonight: 0 },
    hearts: { balance: content.economy.startHearts, earnedTotal: 0, spent: 0, earnedToday: 0 },
    inventory: { stored: {}, storedFree: {}, freeOrigin: {}, trinkets: 0, orders: [], nextOrderId: 1 },
    unlocks: { items: {}, interactions: {}, outfits: {}, paints: {}, titles: {}, activities: {}, codes: {} },
    wishes: { active: [], rolledDay: 0, completedTotal: 0, fullSets: 0, history: {}, lastDone: {}, offered: {} },
    aspirations: { tiers: {}, title: null },
    mail: { inbox: [], sent: {}, personalSent: [], waiting: 0, scheduled: [] },
    daily: emptyDaily(1),
    quirks: { active: {}, zoomiesAt: null },
    stickers: { earned: {} },
    records: {
      hyrox: { skill: perSkill(0), stationPb: perStation<number | null>(null), racePbMs: null, races: [], medals: [] },
      best: {},
    },
    wardrobe: { worn: { ellie: {}, george: {}, salem: {}, shadow: {}, peaches: {} }, streakColor: '#3fae6a' },
    album: { photos: [], nextPhotoNo: 1 },
    visitors: {
      nextCheckTick: perVisitor(0),
      visits: perVisitor(0),
      bruce: { spotted: 0, found: {}, movedIn: false, visitsToday: 0, lastVisitTick: null, visit: null },
      poe: { visit: null, lastVisitDay: null, offers: [], trades: 0 },
      pickle: { visit: null, deliveries: 0 },
    },
    onboarding: { step: null, stepIndex: 0, done: false, skipped: false },
    housewarming: { status: 'locked', day: null },
    activity: null,
    lastBuild: null,
    stats: {},
    statsToday: {},
    flags: {},
    activitySaves: {},
    log: [],
  };
}

/** Deep copy through JSON (state is JSON by contract). */
export function cloneState(state: SimState): SimState {
  return JSON.parse(JSON.stringify(state)) as SimState;
}

/** Throws with a name, for typed stubs that a later wave replaces. */
export function notImplemented(what: string): never {
  throw new Error(`${what} is not implemented yet (Wave 1 stub)`);
}

/**
 * What `Sim.load` does to a loaded state before running (FROZEN 23, F34), as a pure function so the
 * sim, the app and the tests share it: mode back to `live`; any activity session dropped and the
 * action waiting on it cancelled (no Activity object survives a reload, so keeping it would soft-lock
 * Continue); a soft-pause speed 0 restored from `time.lastSpeed`; fast-forward cleared. A `cutscene`
 * is not resumed here: the onboarding system restarts its step from `onboarding.step`.
 */
export function normaliseLoadedState(state: SimState): void {
  const session = state.activity;
  if (session) {
    const agent = getC(state, 'agent', session.actor);
    if (agent?.current && (session.actionId === null || agent.current.id === session.actionId)) agent.current = null;
    state.activity = null;
  }
  state.mode = 'live';
  state.time.fastForward = 1;
  if (state.time.speed === 0) state.time.speed = state.time.lastSpeed;
}
