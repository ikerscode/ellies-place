/**
 * Shared contracts between modules. FIRST DRAFT (Wave 0).
 *
 * Wave 1 (architect) fleshes this out together with design/spec/contracts.md.
 * Only the architect edits this file; everyone else files CONTRACT_REQUEST.md.
 *
 * Rules: plain serialisable data, discriminated unions, branded string ids,
 * no classes in simulation state, no `any`.
 */
import type { RngState } from './rng';

// ---------------------------------------------------------------------------
// Branding and ids
// ---------------------------------------------------------------------------

declare const brand: unique symbol;
/** Nominal typing for primitives: `Brand<string, 'ItemId'>` is not assignable from a plain string. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Runtime entity handle in the ECS store. */
export type EntityId = Brand<number, 'EntityId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type InteractionId = Brand<string, 'InteractionId'>;
export type StringKey = Brand<string, 'StringKey'>;
export type SpriteKey = Brand<string, 'SpriteKey'>;
export type ActivityId = Brand<string, 'ActivityId'>;
export type WishId = Brand<string, 'WishId'>;
export type AspirationId = Brand<string, 'AspirationId'>;
export type OutfitId = Brand<string, 'OutfitId'>;
export type MailId = Brand<string, 'MailId'>;
export type RoomId = Brand<string, 'RoomId'>;
export type StickerId = Brand<string, 'StickerId'>;

/** Unchecked casts for content tables and tests. Validate at load time where it matters. */
export const asItemId = (s: string): ItemId => s as ItemId;
export const asInteractionId = (s: string): InteractionId => s as InteractionId;
export const asStringKey = (s: string): StringKey => s as StringKey;
export const asSpriteKey = (s: string): SpriteKey => s as SpriteKey;
export const asEntityId = (n: number): EntityId => n as EntityId;

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

export type CatName = 'george' | 'salem' | 'shadow' | 'peaches';
export type VisitorName = 'bruce' | 'poe' | 'pickle';
export type ActorKind = 'ellie' | 'cat' | 'visitor';

/** Who an interaction or advertisement is for. */
export type ActorFilter =
  | { readonly kind: 'ellie' }
  | { readonly kind: 'anyCat' }
  | { readonly kind: 'cat'; readonly cat: CatName };

// ---------------------------------------------------------------------------
// Space
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}
/** Integer tile coordinates on the 30 x 17 lot. */
export interface TilePos {
  tx: number;
  ty: number;
}
/** 0 floor, 1 surface, 2 perch. */
export type Layer = 0 | 1 | 2;
export type Facing = 'down' | 'up' | 'left' | 'right';
export type Rotation = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Needs, mood, bond
// ---------------------------------------------------------------------------

export type EllieNeed = 'energy' | 'hunger' | 'fun' | 'fitness' | 'calm' | 'cosy';
export type CatSharedNeed = 'food' | 'play' | 'affection' | 'nap';
export type CatPersonalityNeed = 'royalty' | 'chaos' | 'solitude' | 'vibes';
export type CatNeed = CatSharedNeed | CatPersonalityNeed;
export type NeedKey = EllieNeed | CatNeed;

/** 0..100 per need. */
export type NeedValues<K extends NeedKey> = Record<K, number>;

/** 0..100, five levels. */
export type BondLevel = 0 | 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export type Speed = 0 | 1 | 2 | 3;
export const TICKS_PER_SECOND = 20;

export interface GameTime {
  /** Total simulation ticks since the save began. */
  tick: number;
  /** Day number, starting at 1. */
  day: number;
  /** Minutes since midnight, 0..1439 (may be fractional). */
  minuteOfDay: number;
  speed: Speed;
  /** "Real time" ambient mode follows the wall clock. */
  realTime: boolean;
}

// ---------------------------------------------------------------------------
// Entities and components (data-oriented store). Wave 1 completes this.
// ---------------------------------------------------------------------------

export interface PositionC {
  pos: Vec2;
  layer: Layer;
  facing: Facing;
}
export interface SpriteC {
  key: SpriteKey;
  anim: string;
  frame: number;
}
export interface AgentC {
  kind: ActorKind;
  cat?: CatName;
  /** Queued interaction requests, max 4 for Ellie. */
  queue: ActionRequest[];
}
export interface PlaceableC {
  item: ItemId;
  tile: TilePos;
  rotation: Rotation;
}

export interface Components {
  position: PositionC;
  sprite: SpriteC;
  agent: AgentC;
  placeable: PlaceableC;
  needs: Partial<NeedValues<NeedKey>>;
  bond: { value: number };
}
export type ComponentKey = keyof Components;

/** Component tables keyed by entity id (stringified for JSON). */
export type ComponentStore = { [K in ComponentKey]: Record<string, Components[K]> };

// ---------------------------------------------------------------------------
// Simulation state (fully serialisable)
// ---------------------------------------------------------------------------

export interface SimState {
  /** Schema version for save migrations. */
  version: number;
  rng: RngState;
  time: GameTime;
  nextEntityId: number;
  components: ComponentStore;
  hearts: number;
}

/** Fixed system order, see design/TECH.md. */
export type SystemName =
  | 'time'
  | 'needsDecay'
  | 'aiDecide'
  | 'actionExec'
  | 'movement'
  | 'triggers'
  | 'progression'
  | 'eventsOut';

/** A system is a pure-ish step over state; it may only mutate `state` and emit via `out`. */
export type System = (state: SimState, out: SimEventSink) => void;

// ---------------------------------------------------------------------------
// Actions (UI -> sim dispatch)
// ---------------------------------------------------------------------------

export type ActionRequest = {
  readonly interaction: InteractionId;
  readonly target: EntityId | null;
};

export type Action =
  | { readonly type: 'walkTo'; readonly tile: TilePos }
  | { readonly type: 'queueInteraction'; readonly actor: EntityId; readonly request: ActionRequest }
  | { readonly type: 'cancelQueued'; readonly actor: EntityId; readonly index: number }
  | { readonly type: 'setSpeed'; readonly speed: Speed };

export type Dispatch = (action: Action) => void;

// ---------------------------------------------------------------------------
// Events and the typed bus
// ---------------------------------------------------------------------------

/** Placeholder; Wave 1 defines the full AudioCue union. */
export type AudioCue =
  | { readonly cue: 'ui.click' }
  | { readonly cue: 'meow'; readonly cat: CatName }
  | { readonly cue: 'purr'; readonly cat: CatName };

/** Events the simulation emits outwards (audio, UI, progression). */
export type SimEvent =
  | { readonly type: 'audio'; readonly cue: AudioCue }
  | { readonly type: 'say'; readonly actor: EntityId; readonly line: StringKey }
  | { readonly type: 'heartsEarned'; readonly amount: number };

export type SimEventSink = (event: SimEvent) => void;

/** App-level events. Keys are event names, values are payloads. */
export interface EpEvents {
  sim: SimEvent;
  action: Action;
  modeChanged: { readonly mode: 'live' | 'build' | 'activity' };
  saved: { readonly ok: boolean };
}

export interface EventBus<M extends object> {
  /** Subscribes; returns an unsubscribe function. */
  on<K extends keyof M>(type: K, handler: (payload: M[K]) => void): () => void;
  emit<K extends keyof M>(type: K, payload: M[K]): void;
  clear(): void;
}

// ---------------------------------------------------------------------------
// Activities (minigames). Draft of the interface the BRIEF requires.
// ---------------------------------------------------------------------------

export type ActivityInput =
  | { readonly type: 'key'; readonly key: string; readonly down: boolean }
  | { readonly type: 'pointer'; readonly x: number; readonly y: number; readonly down: boolean };

export interface ActivityResult {
  readonly completed: boolean;
  readonly skipped: boolean;
  readonly hearts: number;
}

export interface Activity {
  readonly id: ActivityId;
  start(rng: RngState): void;
  update(dtMs: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  onInput(input: ActivityInput): void;
  /** True after two misses: the Skip button appears. */
  canSkip(): boolean;
  /** Non-null once the activity is over. */
  result(): ActivityResult | null;
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export const SAVE_KEY = 'ellies-place:save:v1';

export interface SaveFile {
  readonly version: number;
  readonly savedAtWallMs: number;
  readonly state: SimState;
}

// ---------------------------------------------------------------------------
// Test hooks (window.__EP__, only with ?test=1)
// ---------------------------------------------------------------------------

export interface TestHooks {
  step(ticks: number): void;
  setSpeed(speed: Speed): void;
  getState(): SimState;
  dispatch: Dispatch;
  findEntity(query: { readonly cat?: CatName; readonly kind?: ActorKind; readonly item?: ItemId }): EntityId | null;
  seed(n: number): void;
}
