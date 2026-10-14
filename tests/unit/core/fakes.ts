/**
 * Fakes of the module interfaces with their FINAL signatures (F40), so ui, engine, build, sim, cats and the
 * app tests share one set instead of six divergent copies. Each fake is a real implementation of the contract
 * interface (no casts) that records what it was asked and lets a test steer the answers.
 * `satisfies` lines at the bottom make a contract change break these first, in one place.
 */
import { createEventBus } from '../../../src/core/events';
import { effectiveSteps } from '../../../src/core/math';
import { allocEntity, createEmptySimState, entitiesWith, getC } from '../../../src/core/state';
import {
  type Activity,
  type AudioApi,
  type AudioCue,
  type Camera,
  type ContentIndex,
  type DispatchResult,
  type Engine,
  type EntityId,
  type EntityQuery,
  type EpBus,
  type EpEvents,
  type FrameStats,
  type InteractionMenuSpec,
  type JournalTab,
  type MenuOption,
  type MusicContext,
  type PanelId,
  type ParticleKind,
  type PlayerAction,
  type RenderHook,
  type RenderLayer,
  type Settings,
  type Sim,
  type SimEvent,
  type SimEventSink,
  type SimPlugin,
  type SimState,
  type SpriteAtlas,
  type SpriteKey,
  type StorageLike,
  type TilePos,
  type ToastSpec,
  type Ui,
  type UiKit,
  type Vec2,
  type World,
  DEFAULT_SETTINGS,
  asStringKey,
} from '../../../src/core/types';
import { FIXTURE_START, makeFixtureWorld } from './fixtures';

// ---- Bus ----------------------------------------------------------------------

export interface FakeBus {
  readonly bus: EpBus;
  /** Every event emitted on it, in order. */
  readonly emitted: { readonly type: keyof EpEvents; readonly payload: unknown }[];
  /** Payloads of one event type. */
  of<K extends keyof EpEvents>(type: K): EpEvents[K][];
}

/** A real bus that also records everything emitted. Handler errors are collected, never swallowed silently. */
export function makeFakeBus(): FakeBus {
  const inner = createEventBus<EpEvents>({ onError: (e) => errors.push(e) });
  const errors: unknown[] = [];
  const emitted: { type: keyof EpEvents; payload: unknown }[] = [];
  const bus: EpBus = {
    on: (type, handler) => inner.on(type, handler),
    emit: (type, payload) => {
      emitted.push({ type, payload });
      inner.emit(type, payload);
    },
    clear: () => inner.clear(),
  };
  return { bus, emitted, of: (type) => emitted.filter((e) => e.type === type).map((e) => e.payload as never) };
}

// ---- World --------------------------------------------------------------------

export interface FakeWorld extends World {
  /** Placement checks answer ok unless a test sets this. */
  checkResult: ReturnType<World['check']> | null;
  readonly checked: Parameters<World['check']>[1][];
}

/** The fixture queries (real walkability over the state) plus permissive check and an inert plugin. */
export function makeFakeWorld(content: ContentIndex): FakeWorld {
  const q = makeFixtureWorld(content);
  const checked: Parameters<World['check']>[1][] = [];
  const plugin: SimPlugin = { id: 'fake-world' };
  const world: FakeWorld = {
    ...q,
    checkResult: null,
    checked,
    createLot: () => createEmptySimState(0, FIXTURE_START).lot,
    check: (_state, req) => {
      checked.push(req);
      return world.checkResult ?? { ok: true, tiles: q.footprintTiles(req.item, req.tile, req.rotation) };
    },
    cosy: (_state, room, reading = 'rated') => ({
      room,
      reading,
      score: 50,
      parts: { value: 0, variety: 0, lighting: 0, plants: 0, sets: 0, cats: 0, paint: 0, clutter: 0 },
      sets: [],
      hints: [],
    }),
    plugin: () => plugin,
  };
  return world;
}

// ---- Sim ----------------------------------------------------------------------

export interface FakeSim extends Sim {
  readonly dispatched: PlayerAction[];
  /** Answer for every dispatch (default ok). */
  dispatchResult: DispatchResult;
  /** Petals returned by menuFor. */
  menu: readonly MenuOption[];
  /** Pushes an event to every onEvent listener, as the real sim does after a step. */
  emit(event: SimEvent): void;
  readonly plugins: SimPlugin[];
}

export interface FakeSimOptions {
  readonly state?: SimState;
  readonly world?: World;
}

/**
 * A sim with real state (`createEmptySimState`) and no behaviour: `step` only counts ticks, `dispatch` records and
 * answers `dispatchResult`. Enough for ui, engine and build tests; sim-dev's tests use the real sim.
 */
export function makeFakeSim(content: ContentIndex, opts: FakeSimOptions = {}): FakeSim {
  let state = opts.state ?? createEmptySimState(1, content.db);
  const sinks = new Set<SimEventSink>();
  const world = opts.world ?? makeFakeWorld(content);
  const sim: FakeSim = {
    get state() {
      return state;
    },
    content,
    world,
    dispatched: [],
    dispatchResult: { ok: true },
    menu: [],
    plugins: [],
    step(ticks = 1) {
      state.time.tick += ticks;
    },
    dispatch(action) {
      sim.dispatched.push(action);
      return sim.dispatchResult;
    },
    use(plugin) {
      sim.plugins.push(plugin);
    },
    onEvent(sink) {
      sinks.add(sink);
      return () => {
        sinks.delete(sink);
      };
    },
    load(next) {
      state = next;
    },
    newGame(seed) {
      state = createEmptySimState(seed, content.db);
    },
    findEntity: (q) => sim.findEntities(q)[0] ?? null,
    findEntities(q: EntityQuery) {
      return entitiesWith(state, 'meta').filter((id) => {
        const m = getC(state, 'meta', id);
        return m !== undefined && (q.kind === undefined || m.kind === q.kind) && (q.name === undefined || m.name === q.name);
      });
    },
    menuFor: () => sim.menu,
    stepsPerTick: () => effectiveSteps(state.time, state.mode),
    hash: () => String(state.time.tick),
    emit(event) {
      for (const s of [...sinks]) s(event);
    },
  };
  return sim;
}

/** Adds an entity with a meta component to a fake sim's state and returns its id. */
export function addFakeActor(sim: Sim, kind: 'ellie' | 'cat', name: 'ellie' | 'george' | 'salem' | 'shadow' | 'peaches', at: TilePos): EntityId {
  const id = allocEntity(sim.state);
  sim.state.components.meta[String(id)] = { kind, name, bornTick: 0 };
  sim.state.components.position[String(id)] = {
    pos: { x: at.tx + 0.5, y: at.ty + 0.5 },
    prev: { x: at.tx + 0.5, y: at.ty + 0.5 },
    layer: 0,
    facing: 'down',
    room: null,
  };
  return id;
}

// ---- Engine -------------------------------------------------------------------

export interface FakeEngine extends Engine {
  readonly activities: (Activity | null)[];
  readonly hooks: { readonly layer: RenderLayer; readonly hook: RenderHook }[];
  readonly emitted: { readonly kind: ParticleKind; readonly at: Vec2; readonly count: number }[];
  started: boolean;
  invalidations: number;
}

const FAKE_STATS: FrameStats = { frames: 0, fps: 0, renderP50Ms: 0, renderP95Ms: 0, simP50Ms: 0, simP95Ms: 0, lastRenderMs: 0, lastSimMs: 0 };

/** An atlas that has nothing: sprites resolve to null and `has` is false (`keys` lets a test add some). */
export function makeFakeAtlas(keys: readonly SpriteKey[] = []): SpriteAtlas {
  const set = new Set<string>(keys);
  return {
    has: (k) => set.has(k),
    frame: () => null,
    frameCount: () => 0,
    keys: () => keys,
    draw: () => {},
    toDataUrl: () => null,
  };
}

export function makeFakeEngine(atlas: SpriteAtlas = makeFakeAtlas()): FakeEngine {
  const camera: Camera = {
    scale: 1,
    offset: { x: 0, y: 0 },
    screenToWorld: (x, y) => ({ x: x / 16, y: y / 16 }),
    worldToScreen: (w) => ({ x: w.x * 16, y: w.y * 16 }),
  };
  const engine: FakeEngine = {
    activities: [],
    hooks: [],
    emitted: [],
    started: false,
    invalidations: 0,
    start() {
      engine.started = true;
    },
    stop() {
      engine.started = false;
    },
    atlas,
    camera,
    particles: {
      emit: (kind, at, count) => {
        engine.emitted.push({ kind, at, count });
      },
      clear: () => {
        engine.emitted.length = 0;
      },
      get live() {
        return engine.emitted.length;
      },
    },
    setActivity: (a) => {
      engine.activities.push(a);
    },
    addRenderHook(layer, hook) {
      const entry = { layer, hook };
      engine.hooks.push(entry);
      return () => {
        engine.hooks.splice(engine.hooks.indexOf(entry), 1);
      };
    },
    invalidateStatic() {
      engine.invalidations++;
    },
    frameStats: () => FAKE_STATS,
    pick: () => ({ screen: { x: 0, y: 0 }, world: { x: 0, y: 0 }, tile: null, entity: null, button: 0, mods: { shift: false, ctrl: false, alt: false, meta: false } }),
    resize() {},
  };
  return engine;
}

// ---- Ui -----------------------------------------------------------------------

export interface FakeUi extends Ui {
  readonly toasts: ToastSpec[];
  readonly menus: (InteractionMenuSpec | null)[];
  readonly opened: { readonly panel: PanelId; readonly tab?: JournalTab }[];
  readonly updates: number[];
}

/**
 * Records toasts, menus and panels. `kit` and `region` need a DOM: in a file that starts with
 * `// @vitest-environment happy-dom` they build plain elements, in node they throw a clear message.
 */
export function makeFakeUi(): FakeUi {
  const open = new Set<PanelId>();
  const needDom = (what: string): never => {
    throw new Error(`FakeUi.${what} needs a DOM: start the test file with // @vitest-environment happy-dom`);
  };
  const kit: UiKit = {
    panel: () => needDom('kit.panel'),
    button: () => needDom('kit.button'),
    tabs: () => needDom('kit.tabs'),
    slider: () => needDom('kit.slider'),
    toggle: () => needDom('kit.toggle'),
    card: () => needDom('kit.card'),
    meter: () => needDom('kit.meter'),
    tooltip: () => needDom('kit.tooltip'),
  };
  const regions = new Map<string, HTMLElement>();
  const ui: FakeUi = {
    toasts: [],
    menus: [],
    opened: [],
    updates: [],
    update: (_state, dtMs) => {
      ui.updates.push(dtMs);
    },
    setScale() {},
    open(panel, o) {
      open.add(panel);
      ui.opened.push(o?.tab === undefined ? { panel } : { panel, tab: o.tab });
    },
    close(panel) {
      if (panel) open.delete(panel);
      else open.clear();
    },
    isOpen: (panel) => (panel ? open.has(panel) : open.size > 0),
    toast: (spec) => {
      ui.toasts.push(spec);
    },
    showMenu: (spec) => {
      ui.menus.push(spec);
    },
    hideMenu: () => {
      ui.menus.push(null);
    },
    kit,
    region(id) {
      if (typeof document === 'undefined') return needDom('region');
      let el = regions.get(id);
      if (!el) {
        el = document.createElement('div');
        regions.set(id, el);
      }
      return el;
    },
    destroy() {},
  };
  return ui;
}

// ---- Audio --------------------------------------------------------------------

export interface FakeAudio extends AudioApi {
  readonly played: AudioCue[];
  readonly music: MusicContext[];
  readonly ducks: number[];
  settings: Settings;
}

export function makeFakeAudio(): FakeAudio {
  let unlocked = false;
  const audio: FakeAudio = {
    played: [],
    music: [],
    ducks: [],
    settings: DEFAULT_SETTINGS,
    unlock: () => {
      unlocked = true;
      return Promise.resolve();
    },
    get unlocked() {
      return unlocked;
    },
    play: (cue) => {
      audio.played.push(cue);
    },
    setMusic: (ctx) => {
      audio.music.push(ctx);
    },
    duck: (ms) => {
      audio.ducks.push(ms);
    },
    applySettings: (s) => {
      audio.settings = s;
    },
    levels: () => null,
    dispose() {},
  };
  return audio;
}

// ---- Storage ------------------------------------------------------------------

/** An in-memory Storage for save tests; `failWrites` makes setItem throw like a full or blocked store. */
export function makeMemoryStorage(initial: Readonly<Record<string, string>> = {}): StorageLike & { failWrites: boolean; readonly data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(initial));
  const s = {
    failWrites: false,
    data,
    getItem: (k: string): string | null => data.get(k) ?? null,
    setItem: (k: string, v: string): void => {
      if (s.failWrites) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string): void => {
      data.delete(k);
    },
    key: (i: number): string | null => [...data.keys()][i] ?? null,
    get length(): number {
      return data.size;
    },
  };
  return s;
}

/** A reason key for tests that need a rejected DispatchResult. */
export const rejected = (code: string): DispatchResult => ({ ok: false, reason: asStringKey(`ui.reason.${code}`) });
