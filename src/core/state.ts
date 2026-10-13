/**
 * Entity store accessors and an empty SimState factory. The sim owns the
 * real new-game setup (spawning Ellie, cats and furniture); this file only
 * guarantees a valid, serialisable skeleton every module can build on.
 */
import { createRng } from './rng';
import {
  HYROX_ORDER,
  SAVE_VERSION,
  VISITOR_NAMES,
  asEntityId,
  type ComponentKey,
  type ComponentStore,
  type Components,
  type DayPhase,
  type EntityId,
  type HyroxStation,
  type LotState,
  type SimState,
  type VisitorName,
  type Weekday,
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
  };
}

/** Allocates a new entity id (does not add components). */
export function allocEntity(state: SimState): EntityId {
  const id = asEntityId(state.nextEntityId);
  state.nextEntityId += 1;
  return id;
}

export function getC<K extends ComponentKey>(state: SimState, key: K, id: EntityId): Components[K] | undefined {
  return state.components[key][String(id)];
}

export function hasC(state: SimState, key: ComponentKey, id: EntityId): boolean {
  return Object.prototype.hasOwnProperty.call(state.components[key], String(id));
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
export function entitiesWith(state: SimState, key: ComponentKey): EntityId[] {
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

function perVisitor<T>(v: T): Record<VisitorName, T> {
  const out = {} as Record<VisitorName, T>;
  for (const s of VISITOR_NAMES) out[s] = v;
  return out;
}

export interface EmptyStateOptions {
  readonly lot?: LotState;
  readonly startMinute?: number;
  readonly startWeekday?: Weekday;
  readonly phase?: DayPhase;
  readonly hearts?: number;
}

/** A valid SimState with no entities. JSON-safe and hashable. */
export function createEmptySimState(seed: number, opts: EmptyStateOptions = {}): SimState {
  return {
    version: SAVE_VERSION,
    rng: createRng(seed),
    time: {
      tick: 0,
      day: 1,
      minuteOfDay: opts.startMinute ?? 8 * 60,
      weekday: opts.startWeekday ?? 'mon',
      phase: opts.phase ?? 'morning',
      speed: 1,
      fastForward: 1,
      realTime: false,
    },
    mode: 'live',
    options: { freeWill: true },
    nextEntityId: 1,
    nextActionId: 1,
    components: emptyComponentStore(),
    lot: opts.lot ?? emptyLot(0, 0),
    environment: { weather: 'clear', music: null, starsTonight: 0 },
    hearts: { balance: opts.hearts ?? 0, earned: 0, spent: 0 },
    inventory: { stored: {}, trinkets: 0, orders: [], nextOrderId: 1 },
    unlocks: { items: {}, interactions: {}, outfits: {}, paints: {}, titles: {}, activities: {} },
    wishes: { active: [], rolledDay: 0, completedTotal: 0, history: {} },
    aspirations: { tiers: {}, title: null },
    mail: { inbox: [], sent: {}, personalSent: [], waiting: 0, scheduled: [] },
    stickers: { earned: {} },
    records: {
      hyrox: { skill: perStation(0), stationPbMs: perStation<number | null>(null), racePbMs: null, races: [], medals: [] },
      best: {},
    },
    wardrobe: { worn: { ellie: {}, george: {}, salem: {}, shadow: {}, peaches: {} }, streakColor: '#3fae6a' },
    album: { photos: [], nextPhotoNo: 1 },
    visitors: { nextCheckTick: perVisitor(0), visits: perVisitor(0), bruceSpotted: {}, poeOffers: [] },
    onboarding: { step: null, stepIndex: 0, done: false, skipped: false },
    housewarming: { status: 'locked', day: null },
    activity: null,
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
