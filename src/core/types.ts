/**
 * Shared contracts between modules (Wave 1, architect#1). Prose version:
 * design/spec/contracts.md. Only the architect edits this file; everyone else
 * files CONTRACT_REQUEST.md at the root of their branch.
 *
 * Rules:
 * - Simulation state is plain JSON data: no classes, Maps, Sets, functions,
 *   undefined-as-value, NaN or Infinity. `null` is fine.
 * - Table ids are branded strings (ItemId, WishId...). Entity ids are branded numbers.
 * - Small open vocabularies (tags, carry kinds, stat keys, flags, anim keys)
 *   use `Known | (string & {})`: autocomplete for the known values, open for data.
 * - Unions are discriminated by `kind` (data) or `type` (events and actions).
 * - Numbers come from content (SimTuning and tables), never from code constants,
 *   except the engineering limits in LIMITS.
 */
import type { RngState } from './rng';
import type { Clock } from './clock';

// ===========================================================================
// 1. Branding, ids, JSON
// ===========================================================================

declare const brand: unique symbol;
/** Nominal typing for primitives: `Brand<string, 'ItemId'>` is not assignable from a plain string. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Runtime entity handle in the entity store. Serialised as a number. */
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
export type PaintId = Brand<string, 'PaintId'>;
export type SetBonusId = Brand<string, 'SetBonusId'>;
export type PhotoId = Brand<string, 'PhotoId'>;
export type TitleId = Brand<string, 'TitleId'>;
export type OnboardingStepId = Brand<string, 'OnboardingStepId'>;
export type CatalogCategoryId = Brand<string, 'CatalogCategoryId'>;

/** Unchecked casts for content tables and tests. Validate with buildContentIndex at boot. */
export const asEntityId = (n: number): EntityId => n as EntityId;
export const asItemId = (s: string): ItemId => s as ItemId;
export const asInteractionId = (s: string): InteractionId => s as InteractionId;
export const asStringKey = (s: string): StringKey => s as StringKey;
export const asSpriteKey = (s: string): SpriteKey => s as SpriteKey;
export const asActivityId = (s: string): ActivityId => s as ActivityId;
export const asWishId = (s: string): WishId => s as WishId;
export const asAspirationId = (s: string): AspirationId => s as AspirationId;
export const asOutfitId = (s: string): OutfitId => s as OutfitId;
export const asMailId = (s: string): MailId => s as MailId;
export const asRoomId = (s: string): RoomId => s as RoomId;
export const asStickerId = (s: string): StickerId => s as StickerId;
export const asPaintId = (s: string): PaintId => s as PaintId;
export const asSetBonusId = (s: string): SetBonusId => s as SetBonusId;
export const asPhotoId = (s: string): PhotoId => s as PhotoId;
export const asTitleId = (s: string): TitleId => s as TitleId;
export const asOnboardingStepId = (s: string): OnboardingStepId => s as OnboardingStepId;
export const asCatalogCategoryId = (s: string): CatalogCategoryId => s as CatalogCategoryId;

/** A map keyed by a branded id, stored as a plain JSON object. Missing keys read as undefined. */
export type IdMap<K extends string, V> = Partial<Record<K, V>>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

// ===========================================================================
// 2. Engineering constants (not design numbers)
// ===========================================================================

export const TICKS_PER_SECOND = 20;
export const TICK_MS = 1000 / TICKS_PER_SECOND;
export const TILE_PX = 16;
export const CANVAS_W = 480;
export const CANVAS_H = 270;
export const LOT_W = 30;
export const LOT_H = 17;
export const MINUTES_PER_DAY = 1440;

/** Hard caps the soak test checks. Design numbers live in SimTuning instead. */
export const LIMITS = {
  /** Ellie's action queue (BRIEF section 5). */
  queue: 4,
  /** Cats and visitors hold at most this many queued actions. */
  agentQueue: 2,
  mailInbox: 60,
  historyLog: 120,
  photos: 60,
  races: 50,
  particles: 256,
  speechOnScreen: 2,
  pendingOrders: 20,
  buildUndo: 100,
  entities: 600,
} as const;

// ===========================================================================
// 3. Actors and space
// ===========================================================================

export type CatName = 'george' | 'salem' | 'shadow' | 'peaches';
export type VisitorName = 'bruce' | 'poe' | 'pickle';
export type ActorKind = 'ellie' | 'cat' | 'visitor';
/** Every named character. */
export type CharacterName = 'ellie' | CatName | VisitorName;

export const CAT_NAMES: readonly CatName[] = ['george', 'salem', 'shadow', 'peaches'];
export const VISITOR_NAMES: readonly VisitorName[] = ['bruce', 'poe', 'pickle'];

/** Who an interaction, advertisement or slot is for. */
export type ActorFilter =
  | { readonly kind: 'ellie' }
  | { readonly kind: 'anyCat' }
  | { readonly kind: 'cat'; readonly cat: CatName }
  | { readonly kind: 'visitor'; readonly visitor: VisitorName }
  | { readonly kind: 'anyone' };

/** Logical position in tile units (fractional while walking). (0,0) is the top-left tile's top-left. */
export interface Vec2 {
  x: number;
  y: number;
}
/** Integer tile coordinates on the lot (tx 0..LOT_W-1, ty 0..LOT_H-1). */
export interface TilePos {
  tx: number;
  ty: number;
}
/** Height layer for cats and placement: 0 floor, 1 surface (tables, beds), 2 perch (wardrobe top, cat tree top). */
export type Layer = 0 | 1 | 2;
export type Facing = 'down' | 'up' | 'left' | 'right';
/** Quarter turns clockwise. Rotation 0 is the item's front facing down (towards the camera). */
export type Rotation = 0 | 1 | 2 | 3;

export interface Size {
  w: number;
  h: number;
}

// ===========================================================================
// 4. Time
// ===========================================================================

/** 0 pause, 1 normal (one game day is about 24 real minutes), 2, 3. */
export type Speed = 0 | 1 | 2 | 3;
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
/** Coarse time of day; boundaries come from SimTuning.time.phases. */
export type DayPhase = 'morning' | 'day' | 'evening' | 'night';

export interface GameTime {
  /** Total simulation ticks since the save began. Canonical; everything else derives from it. */
  tick: number;
  /** Day number, starting at 1. */
  day: number;
  /** Minutes since midnight, 0 <= m < 1440 (fractional). */
  minuteOfDay: number;
  weekday: Weekday;
  phase: DayPhase;
  /** Player-chosen speed. Build mode and open panels force an effective 0 without changing this. */
  speed: Speed;
  /**
   * Extra sub-steps per tick the sim requests (1 normally; raised while Ellie sleeps).
   * The engine steps `speed * fastForward` ticks per fixed step. See effectiveSteps().
   */
  fastForward: number;
  /** Ambient "real time" mode: the time system follows the injected Clock's wall time. */
  realTime: boolean;
}

// ===========================================================================
// 5. Needs, mood, bond
// ===========================================================================

export type EllieNeed = 'energy' | 'hunger' | 'fun' | 'fitness' | 'calm' | 'cosy';
export type CatSharedNeed = 'food' | 'play' | 'affection' | 'nap';
export type CatPersonalityNeed = 'royalty' | 'chaos' | 'solitude' | 'vibes';
export type CatNeed = CatSharedNeed | CatPersonalityNeed;
export type NeedKey = EllieNeed | CatNeed;

export const ELLIE_NEEDS: readonly EllieNeed[] = ['energy', 'hunger', 'fun', 'fitness', 'calm', 'cosy'];
export const CAT_SHARED_NEEDS: readonly CatSharedNeed[] = ['food', 'play', 'affection', 'nap'];
export const PERSONALITY_NEED: Readonly<Record<CatName, CatPersonalityNeed>> = {
  george: 'royalty',
  salem: 'chaos',
  shadow: 'solitude',
  peaches: 'vibes',
};

/** 0..100 per need. Only the needs an actor has are present. */
export type NeedValues = Partial<Record<NeedKey, number>>;
/** Signed changes to needs (per hour, per use, or advertised). */
export type NeedDeltas = Partial<Record<NeedKey, number>>;

export type MoodBand = 'mopey' | 'low' | 'okay' | 'good' | 'great';
export const MOOD_BANDS: readonly MoodBand[] = ['mopey', 'low', 'okay', 'good', 'great'];

/** Five bond levels over a 0..100 value (thresholds in SimTuning.bond). */
export type BondLevel = 0 | 1 | 2 | 3 | 4;

/** A temporary mood modifier ("had a perfect dunk"). Original name; not a Sims term. */
export interface Feeling {
  /** Stable id from data, e.g. `feeling.perfectDunk`. Re-adding refreshes it. */
  id: string;
  label: StringKey;
  icon: SpriteKey | null;
  /** Added to the 0..100 mood value while active. */
  mood: number;
  untilTick: number;
}

// ===========================================================================
// 6. Vocabularies (open unions)
// ===========================================================================

export type KnownTag =
  | 'music'
  | 'heavy'
  | 'lofi'
  | 'cosyMusic'
  | 'food'
  | 'drink'
  | 'coffee'
  | 'rusk'
  | 'sushi'
  | 'sleep'
  | 'rest'
  | 'read'
  | 'bath'
  | 'gym'
  | 'hyrox'
  | 'game'
  | 'social'
  | 'petting'
  | 'play'
  | 'chaos'
  | 'box'
  | 'perch'
  | 'dark'
  | 'quiet'
  | 'warm'
  | 'sunny'
  | 'surface'
  | 'knockable'
  | 'trinket'
  | 'plant'
  | 'lamp'
  | 'mess'
  | 'outdoor'
  | 'photo'
  | 'stars'
  | 'royal'
  | 'mail'
  | 'wardrobe'
  | 'mirror'
  | 'laptop';
/** Free-form tag on items and interactions; used by personalities, wishes and the cosy score. */
export type Tag = KnownTag | (string & {});

export type KnownCarry = 'mug' | 'coffee' | 'rusk' | 'plate' | 'sushi' | 'trinket' | 'box' | 'book' | 'ham' | 'toy';
/** What an actor can hold. Cats can carry 'toy' or 'trinket' in the mouth. */
export type CarryKind = KnownCarry | (string & {});

export type KnownAnim =
  | 'idle'
  | 'walk'
  | 'sit'
  | 'lie'
  | 'sleep'
  | 'eat'
  | 'drink'
  | 'use'
  | 'dance'
  | 'headbang'
  | 'train'
  | 'pet'
  | 'carry'
  | 'groom'
  | 'zoomies'
  | 'knock'
  | 'jump'
  | 'bow'
  | 'stretch';
/** Animation name; resolved to a SpriteKey as `${actorSpriteBase}.${anim}` (see spriteFor). */
export type AnimKey = KnownAnim | (string & {});

/**
 * Counters in SimState.stats / statsToday, e.g. `int.makeCoffee`, `dunk.perfect`,
 * `box.sat.salem`, `photo.allCats`. Convention: dotted lower camelCase.
 */
export type StatKey = string;
/** Boolean story flags in SimState.flags, e.g. `bruce.onWall`, `george.knighted`. */
export type FlagKey = string;

export type StyleTag = 'goth' | 'cottage' | 'neon' | 'gym' | 'cat' | 'plant' | 'retro';
export const STYLE_TAGS: readonly StyleTag[] = ['goth', 'cottage', 'neon', 'gym', 'cat', 'plant', 'retro'];

export type HyroxStation =
  | 'skiErg'
  | 'sledPush'
  | 'sledPull'
  | 'burpeeBroadJump'
  | 'rowing'
  | 'farmersCarry'
  | 'sandbagLunges'
  | 'wallBalls';
/** Race order (BRIEF 10.1). */
export const HYROX_ORDER: readonly HyroxStation[] = [
  'skiErg',
  'sledPush',
  'sledPull',
  'burpeeBroadJump',
  'rowing',
  'farmersCarry',
  'sandbagLunges',
  'wallBalls',
];

export type RadioStation = 'heavy' | 'lofi' | 'cosy';

// ===========================================================================
// 7. Conditions and effects (one evaluator for requirements, wishes, unlocks)
// ===========================================================================

/** Whose needs, bond or position a condition or effect refers to. */
export type Who = 'actor' | 'target' | 'ellie' | CatName | 'allCats' | 'catsInRoom';

/**
 * A pure predicate over SimState. Used for interaction requirements, wish
 * context, wish goals, aspiration tiers, unlocks, mail triggers and decay
 * modifiers. Evaluated relative to an optional actor and target.
 */
export type Condition =
  | { readonly kind: 'always' }
  | { readonly kind: 'never' }
  | { readonly kind: 'not'; readonly of: Condition }
  | { readonly kind: 'all'; readonly of: readonly Condition[] }
  | { readonly kind: 'any'; readonly of: readonly Condition[] }
  // time
  | { readonly kind: 'timeBetween'; readonly from: number; readonly to: number } // minutes, wraps midnight
  | { readonly kind: 'phase'; readonly phases: readonly DayPhase[] }
  | { readonly kind: 'weekday'; readonly days: readonly Weekday[] }
  | { readonly kind: 'dayAtLeast'; readonly day: number }
  // actors
  | { readonly kind: 'actorIs'; readonly filter: ActorFilter }
  | { readonly kind: 'need'; readonly who: Who; readonly need: NeedKey; readonly op: 'lt' | 'gte'; readonly value: number }
  | { readonly kind: 'mood'; readonly atLeast: MoodBand }
  | { readonly kind: 'moodBelow'; readonly band: MoodBand }
  | { readonly kind: 'bond'; readonly cat: CatName | 'target' | 'actor' | 'any' | 'all'; readonly atLeast: BondLevel }
  | { readonly kind: 'carrying'; readonly who?: Who; readonly carry: CarryKind | null }
  | { readonly kind: 'asleep'; readonly who: Who }
  | { readonly kind: 'catNear'; readonly cat?: CatName; readonly radius: number }
  | { readonly kind: 'inRoom'; readonly who: Who; readonly room: RoomId | 'outdoor' | 'indoor' }
  | { readonly kind: 'wearing'; readonly who: 'ellie' | CatName; readonly outfit: OutfitId }
  | { readonly kind: 'skill'; readonly station: HyroxStation | 'any'; readonly atLeast: number }
  // objects and world
  | { readonly kind: 'objectFlag'; readonly flag: string; readonly equals: JsonPrimitive }
  | { readonly kind: 'targetHasTag'; readonly tag: Tag }
  | { readonly kind: 'musicPlaying'; readonly station?: RadioStation }
  | { readonly kind: 'placed'; readonly item?: ItemId; readonly tag?: Tag; readonly style?: StyleTag; readonly atLeast: number }
  | { readonly kind: 'setBonus'; readonly id: SetBonusId }
  | { readonly kind: 'cosy'; readonly room: RoomId | 'current' | 'any' | 'home'; readonly atLeast: number }
  | { readonly kind: 'weather'; readonly weather: Weather }
  // progression
  | { readonly kind: 'flag'; readonly flag: FlagKey; readonly value?: boolean }
  | { readonly kind: 'stat'; readonly stat: StatKey; readonly atLeast: number; readonly scope?: 'ever' | 'today' }
  | { readonly kind: 'hearts'; readonly atLeast: number }
  | { readonly kind: 'heartsEarned'; readonly atLeast: number }
  | { readonly kind: 'owns'; readonly item: ItemId; readonly atLeast?: number }
  | { readonly kind: 'unlocked'; readonly what: UnlockRef }
  | { readonly kind: 'aspirationTier'; readonly id: AspirationId; readonly atLeast: number }
  | { readonly kind: 'sticker'; readonly id: StickerId }
  | { readonly kind: 'wishesDone'; readonly atLeast: number; readonly scope?: 'ever' | 'today' }
  | { readonly kind: 'onboardingDone' };

/** Something unlockable. */
export type UnlockRef =
  | { readonly kind: 'item'; readonly id: ItemId }
  | { readonly kind: 'interaction'; readonly id: InteractionId }
  | { readonly kind: 'outfit'; readonly id: OutfitId }
  | { readonly kind: 'paint'; readonly id: PaintId }
  | { readonly kind: 'title'; readonly id: TitleId }
  | { readonly kind: 'activity'; readonly id: ActivityId };

/**
 * A state change, applied by the sim's effect interpreter. Used for interaction
 * completion, wish and aspiration rewards, mail attachments and activity results.
 */
export type Effect =
  | { readonly kind: 'need'; readonly who: Who; readonly need: NeedKey; readonly delta: number }
  | { readonly kind: 'bond'; readonly cat: CatName | 'target' | 'actor' | 'all' | 'catsInRoom'; readonly delta: number }
  | { readonly kind: 'hearts'; readonly amount: number; readonly reason: HeartsReason; readonly moodScaled?: boolean }
  | { readonly kind: 'feeling'; readonly id: string; readonly label: StringKey; readonly icon?: SpriteKey; readonly mood: number; readonly minutes: number }
  | { readonly kind: 'carry'; readonly who?: Who; readonly carry: CarryKind | null }
  | { readonly kind: 'objectFlag'; readonly flag: string; readonly value: JsonPrimitive }
  | { readonly kind: 'flag'; readonly flag: FlagKey; readonly value: boolean }
  | { readonly kind: 'stat'; readonly stat: StatKey; readonly delta: number }
  | { readonly kind: 'record'; readonly stat: StatKey; readonly value: number; readonly better: 'higher' | 'lower' }
  | { readonly kind: 'skillXp'; readonly station: HyroxStation; readonly xp: number }
  | { readonly kind: 'unlock'; readonly what: UnlockRef }
  | { readonly kind: 'grantItem'; readonly item: ItemId; readonly count?: number }
  | { readonly kind: 'trinkets'; readonly delta: number }
  | { readonly kind: 'sticker'; readonly id: StickerId }
  | { readonly kind: 'mail'; readonly id: MailId; readonly delayDays?: number }
  | { readonly kind: 'spawn'; readonly item: ItemId; readonly at: 'target' | 'actor' | 'mailbox' | 'door' }
  | { readonly kind: 'removeTarget' }
  | { readonly kind: 'startActivity'; readonly activity: ActivityId; readonly params?: ActivityParams }
  | { readonly kind: 'cue'; readonly cue: AudioCue }
  | { readonly kind: 'say'; readonly who: Who; readonly line: StringKey; readonly chance?: number }
  | { readonly kind: 'thought'; readonly who: Who; readonly icon: SpriteKey }
  | { readonly kind: 'particles'; readonly particle: ParticleKind; readonly at: 'actor' | 'target'; readonly count?: number }
  | { readonly kind: 'chance'; readonly p: number; readonly then: readonly Effect[]; readonly else?: readonly Effect[] }
  | { readonly kind: 'when'; readonly if: Condition; readonly then: readonly Effect[]; readonly else?: readonly Effect[] };

export type HeartsReason = 'wish' | 'aspiration' | 'bond' | 'race' | 'mood' | 'activity' | 'interaction' | 'sell' | 'buy' | 'trade' | 'mail' | 'debug';

/**
 * Progress events: the sim records each into stats (`${kind}` and
 * `${kind}.${subject}`) so Conditions of kind 'stat' can count them.
 */
export type ProgressKind =
  | 'interaction'
  | 'activity'
  | 'activityGrade'
  | 'itemBought'
  | 'itemPlaced'
  | 'itemSold'
  | 'paint'
  | 'photo'
  | 'trade'
  | 'pb'
  | 'race'
  | 'bondLevel'
  | 'wish'
  | 'mailRead'
  | 'bruceSpotted'
  | 'boxSat'
  | 'knockOff'
  | 'outfitWorn'
  | 'shootingStar';
export interface ProgressEvent {
  readonly kind: ProgressKind;
  /** e.g. an interaction id, cat name, station or grade. */
  readonly subject?: string;
  readonly n: number;
}

// ===========================================================================
// 8. Items, catalog, placement, paint
// ===========================================================================

export type ItemCategory =
  | 'seating'
  | 'beds'
  | 'tables'
  | 'storage'
  | 'kitchen'
  | 'bath'
  | 'gym'
  | 'lighting'
  | 'plants'
  | 'catFurniture'
  | 'wallDecor'
  | 'rugs'
  | 'electronics'
  | 'garden'
  | 'decor'
  | 'special';

/**
 * Where an item goes:
 * - floor: occupies its footprint on floor tiles (blocks unless `blocksPath: false`)
 * - rug: floor layer under everything, never blocks
 * - wall: hangs on a back wall tile run of width `footprint.w`
 * - surface: sits in a surface slot of another placed item (small decor)
 * - fixed: part of the flat (doors, mailbox); cannot be moved or sold
 */
export type Mount = 'floor' | 'rug' | 'wall' | 'surface' | 'fixed';

export type SlotKind = 'stand' | 'sit' | 'lie' | 'use' | 'perch' | 'inside' | 'beside';

/** Where an actor goes to use an item. Offsets are in tiles from the footprint origin at rotation 0. */
export interface SlotDef {
  readonly id: string;
  readonly kind: SlotKind;
  readonly dx: number;
  readonly dy: number;
  /** Facing at rotation 0; rotated with the item. */
  readonly facing: Facing;
  /** Layer the actor occupies while in the slot (cats on a bed are on layer 1). */
  readonly layer: Layer;
  readonly for: readonly ActorFilter[];
}

/** A spot on top of an item where surface decor can sit. Offsets at rotation 0. */
export interface SurfaceSlotDef {
  readonly dx: number;
  readonly dy: number;
  /** Max decor footprint that fits (usually 1x1). */
  readonly maxW: number;
  readonly maxH: number;
}

export interface LightSpec {
  /** Radius in tiles. */
  readonly radius: number;
  /** CSS colour, e.g. '#ffd9a0'. */
  readonly color: string;
  /** 0..1 */
  readonly intensity: number;
  readonly flicker?: boolean;
  /** Object flag that switches the light (default 'on'). Absent flag means always on. */
  readonly flag?: string;
}

export interface ItemDef {
  readonly id: ItemId;
  readonly name: StringKey;
  readonly desc: StringKey;
  readonly category: ItemCategory;
  readonly styles: readonly StyleTag[];
  readonly tags: readonly Tag[];
  /** Hearts. Selling always refunds this in full. */
  readonly price: number;
  /** Cosy value contribution (home.md). */
  readonly cosy: number;
  readonly mount: Mount;
  /** Tiles at rotation 0 (w across, h down). Wall items: h is 1. */
  readonly footprint: Size;
  /** Allowed rotations; [0] for symmetric or wall items. */
  readonly rotations: readonly Rotation[];
  /** Sprite per rotation. Missing rotations use rotation 0 (and 3 may be 1 flipped, see flipFor). */
  readonly sprites: Readonly<Partial<Record<Rotation, SpriteKey>>>;
  /** Rotations drawn by flipping another rotation's sprite horizontally. */
  readonly flipFor?: Readonly<Partial<Record<Rotation, Rotation>>>;
  /** Floor items block walking by default. */
  readonly blocksPath?: boolean;
  /** The layer the top of this item provides for cats (1 surface, 2 perch). Absent: cannot be jumped on. */
  readonly topLayer?: Layer;
  readonly slots: readonly SlotDef[];
  readonly surfaceSlots?: readonly SurfaceSlotDef[];
  readonly interactions: readonly InteractionId[];
  readonly light?: LightSpec;
  /** Initial object flags, e.g. { on: false, station: 'lofi' }. */
  readonly flags?: Readonly<Record<string, JsonPrimitive>>;
  /** When it becomes buyable. { kind: 'always' } for the ~40 starter items. */
  readonly unlock: Condition;
  /** Hint shown on locked catalog cards. */
  readonly unlockHint?: StringKey;
  /** Not buyable (story items, the delivery box, mess). */
  readonly hidden?: boolean;
  readonly mvp: boolean;
}

export interface CatalogCategoryDef {
  readonly id: CatalogCategoryId;
  readonly label: StringKey;
  readonly icon: SpriteKey;
  readonly categories: readonly ItemCategory[];
}

export type PaintPattern = 'plain' | 'stripes' | 'checks' | 'wood' | 'tiles' | 'wallpaper';
export type PaintSurface = 'wall' | 'floor';

export interface PaintDef {
  readonly id: PaintId;
  readonly name: StringKey;
  readonly surface: PaintSurface;
  readonly pattern: PaintPattern;
  /** Up to 3 CSS colours used by the pattern. */
  readonly colors: readonly string[];
  /** Optional motif sprite for wallpaper. */
  readonly motif?: SpriteKey;
  readonly styles: readonly StyleTag[];
  readonly price: number;
  readonly cosy: number;
  readonly unlock: Condition;
}

export interface SetBonusDef {
  readonly id: SetBonusId;
  readonly name: StringKey;
  /** All requirements must hold within one room. */
  readonly requires: readonly { readonly style?: StyleTag; readonly tag?: Tag; readonly item?: ItemId; readonly count: number }[];
  readonly cosy: number;
}

/** How an item is attached once placed. */
export type MountRef =
  | { readonly kind: 'floor' }
  | { readonly kind: 'rug' }
  | { readonly kind: 'wall' }
  | { readonly kind: 'surface'; readonly parent: EntityId; readonly slot: number }
  | { readonly kind: 'fixed' };

export interface PlacementRequest {
  readonly item: ItemId;
  readonly tile: TilePos;
  readonly rotation: Rotation;
  readonly mount: MountRef;
  /** When moving an existing item, its id (ignored for overlap checks). */
  readonly moving?: EntityId;
}

export type PlacementError =
  | 'outOfBounds'
  | 'blocked'
  | 'notFloor'
  | 'needsWall'
  | 'needsSurface'
  | 'surfaceFull'
  | 'tooBig'
  | 'blocksDoor'
  | 'breaksPath'
  | 'rotationNotAllowed'
  | 'notOwned'
  | 'cannotAfford'
  | 'fixed';

export type PlacementCheck =
  | { readonly ok: true; readonly tiles: readonly TilePos[] }
  | { readonly ok: false; readonly reason: PlacementError; readonly tiles: readonly TilePos[] };

// ===========================================================================
// 9. Lot, rooms, cosy
// ===========================================================================

export type TileKind = 'void' | 'floor' | 'wall' | 'door' | 'window' | 'grass' | 'path' | 'fence' | 'gate';

export type RoomKind = 'bedroom' | 'living' | 'kitchen' | 'bathroom' | 'spare' | 'garden' | 'frontStep' | 'hall';

export interface RoomDef {
  readonly id: RoomId;
  readonly name: StringKey;
  readonly kind: RoomKind;
  readonly outdoor: boolean;
  /** Any tile inside the room; rooms are found by flood fill from it. */
  readonly seed: TilePos;
  readonly wallPaint: PaintId;
  readonly floorPaint: PaintId;
}

export interface StartPlacement {
  readonly item: ItemId;
  readonly tile: TilePos;
  readonly rotation: Rotation;
  /** For surface items: index into LotDef.start of the parent, plus slot. */
  readonly onto?: { readonly index: number; readonly slot: number };
  readonly flags?: Readonly<Record<string, JsonPrimitive>>;
}

export type LotSpot =
  | 'ellieSpawn'
  | 'mailbox'
  | 'frontDoor'
  | 'fence'
  | 'birdBath'
  | 'gardenWall'
  | 'raceTrackStart'
  | 'raceTrackEnd'
  | 'bruce.fence'
  | 'bruce.kitchenTable'
  | 'bruce.behindTv'
  | 'bruce.fridgeTop'
  | 'bruce.box'
  | `${CatName}Spawn`;

/** The authored flat (home.md). */
export interface LotDef {
  readonly w: number;
  readonly h: number;
  /** h strings of w characters. */
  readonly rows: readonly string[];
  readonly legend: Readonly<Record<string, TileKind>>;
  readonly rooms: readonly RoomDef[];
  readonly start: readonly StartPlacement[];
  readonly spots: Readonly<Partial<Record<LotSpot, TilePos>>>;
  /** Windows that cast sunbeams: tile plus the direction light enters. */
  readonly windows: readonly { readonly tile: TilePos; readonly facing: Facing }[];
}

/** Serialisable lot state inside SimState. */
export interface LotState {
  w: number;
  h: number;
  /** Row-major, length w*h. */
  tiles: TileKind[];
  /** Row-major room id per tile, null for walls and void. */
  roomAt: (RoomId | null)[];
  rooms: IdMap<RoomId, RoomState>;
  /** Bumped on every build or paint change; caches key off it. */
  revision: number;
}

export interface RoomState {
  id: RoomId;
  kind: RoomKind;
  outdoor: boolean;
  wallPaint: PaintId;
  floorPaint: PaintId;
  /** Last computed cosy score 0..100 (world module keeps it fresh). */
  cosy: number;
}

export type CosyFactor = 'value' | 'variety' | 'lighting' | 'plants' | 'sets' | 'cats' | 'paint' | 'clutter';

export interface CosyHint {
  readonly key: StringKey;
  readonly vars?: StringVars;
  /** Estimated score gain if followed. */
  readonly gain: number;
}

export interface CosyReport {
  readonly room: RoomId;
  readonly score: number;
  readonly parts: Readonly<Record<CosyFactor, number>>;
  readonly sets: readonly SetBonusId[];
  /** Best two, highest gain first. */
  readonly hints: readonly CosyHint[];
}

/** A moving light patch on the floor (computed, not stored). Peaches seeks these. */
export interface SunbeamPatch {
  readonly room: RoomId;
  readonly tiles: readonly TilePos[];
  /** 0..1 */
  readonly strength: number;
}

/** Walkability for pathfinding (derived from LotState + placed items; never saved). */
export interface NavGrid {
  readonly w: number;
  readonly h: number;
  readonly revision: number;
  /** Per layer, row-major movement cost; 0 means blocked. Layer 0 floor, 1 surface, 2 perch. */
  readonly cost: readonly [readonly number[], readonly number[], readonly number[]];
  /** Cat-only jumps between layers. */
  readonly jumps: readonly NavJump[];
}
export interface NavJump {
  readonly from: TilePos;
  readonly fromLayer: Layer;
  readonly to: TilePos;
  readonly toLayer: Layer;
  readonly cost: number;
}

// ===========================================================================
// 10. Interactions and smart objects
// ===========================================================================

/** What an interaction is used on. */
export type TargetKind = 'object' | 'cat' | 'ellie' | 'self' | 'tile' | 'visitor';

/** What the interaction promises an actor kind, for the utility scorer. */
export interface Advertisement {
  readonly for: ActorFilter;
  /** Expected need change over the whole interaction. */
  readonly needs: NeedDeltas;
  /** Extra flat score (quirks, fun-for-its-own-sake). Default 0. */
  readonly bias?: number;
}

export type InteractionDuration =
  | { readonly kind: 'instant' }
  | { readonly kind: 'fixed'; readonly minutes: number }
  /** Runs until the need reaches `atLeast` or `maxMinutes` passes (sleep, eat). */
  | { readonly kind: 'untilNeed'; readonly need: NeedKey; readonly atLeast: number; readonly maxMinutes: number }
  /** Hands over to a minigame; the sim waits for activity.finish. */
  | { readonly kind: 'activity'; readonly activity: ActivityId; readonly params?: ActivityParams };

export interface InteractionAnims {
  readonly approach?: AnimKey;
  readonly loop: AnimKey;
  readonly end?: AnimKey;
}

export interface InteractionDef {
  readonly id: InteractionId;
  /** Petal label, 22 characters or fewer. */
  readonly label: StringKey;
  readonly icon?: SpriteKey;
  readonly target: TargetKind;
  /** Who may perform it. */
  readonly actors: readonly ActorFilter[];
  /** For target 'cat': which cats may be the target. Default any. */
  readonly targetCats?: readonly CatName[];
  readonly tags: readonly Tag[];
  readonly adverts: readonly Advertisement[];
  /** Slot kinds (or slot ids) on the target the actor may use, in preference order. */
  readonly slots?: readonly (SlotKind | string)[];
  readonly duration: InteractionDuration;
  /** Need change per game hour while running, for the actor. */
  readonly perHour?: NeedDeltas;
  /** Need change per game hour for the target actor (petting a cat). */
  readonly targetPerHour?: NeedDeltas;
  readonly anims: Readonly<Partial<Record<ActorKind, InteractionAnims>>>;
  /** Must all hold to show (enabled) in the menu and to start. */
  readonly requires: readonly Condition[];
  /** If set and false, the petal is hidden instead of greyed out. */
  readonly visibleIf?: Condition;
  /** Applied when started. */
  readonly onStart?: readonly Effect[];
  /** Applied when completed (not when cancelled). */
  readonly effects: readonly Effect[];
  /** May free will (Ellie) or the cat AI pick this on its own? */
  readonly autonomous: boolean;
  /** Game minutes before the same actor may pick it autonomously again. */
  readonly cooldownMinutes?: number;
  /** Player-queued actions can cancel it; default true. Sleep is false. */
  readonly interruptible?: boolean;
  /** Played on start. */
  readonly cue?: AudioCue;
  readonly unlock?: Condition;
  readonly mvp: boolean;
}

/** One choice produced by the scorer or the menu builder. */
export interface Candidate {
  readonly interaction: InteractionId;
  readonly target: EntityId | null;
  readonly tile?: TilePos;
  readonly slot?: number;
  /** Path distance in tiles (Infinity if unknown is not allowed: use -1). */
  readonly distance: number;
}

export interface ScoredCandidate extends Candidate {
  readonly score: number;
  /** Per-need contributions for the debug overlay. */
  readonly terms: NeedDeltas;
}

/** A petal in the interaction menu. */
export interface MenuOption {
  readonly interaction: InteractionId;
  readonly label: StringKey;
  readonly icon: SpriteKey | null;
  readonly enabled: boolean;
  /** Why it is disabled, if it is. */
  readonly reason: StringKey | null;
}

// ===========================================================================
// 11. Cats and visitors (content)
// ===========================================================================

export interface CatDef {
  readonly name: CatName;
  readonly displayName: StringKey;
  /** Sprite key prefix, e.g. 'cat.george'. */
  readonly sprite: SpriteKey;
  readonly personalityNeed: CatPersonalityNeed;
  /** Multipliers on advertised need gains (sim.md). */
  readonly needWeights: Readonly<Partial<Record<NeedKey, number>>>;
  /** Multipliers by interaction or item tag (likes > 1, dislikes < 1). */
  readonly tagWeights: Readonly<Partial<Record<string, number>>>;
  readonly likes: readonly Tag[];
  readonly dislikes: readonly Tag[];
  /** Tiles per second at speed 1. */
  readonly walkSpeed: number;
  /** Bond gain multiplier (Shadow is slow). */
  readonly bondRate: number;
  readonly startBond: number;
}

export interface VisitorDef {
  readonly name: VisitorName;
  readonly displayName: StringKey;
  readonly sprite: SpriteKey;
  /** When they may appear. */
  readonly appearsIf: Condition;
  /** Chance per game hour to start a visit while appearsIf holds. */
  readonly chancePerHour: number;
  readonly visitMinutes: number;
  readonly spots: readonly LotSpot[];
}

// ===========================================================================
// 12. Wishes, aspirations, outfits, mail, stickers, onboarding (content)
// ===========================================================================

export interface WishDef {
  readonly id: WishId;
  /** 40 characters or fewer. */
  readonly title: StringKey;
  readonly icon: SpriteKey;
  /** May be offered today? (time, weekday, unlocks, which cats are around). */
  readonly offerIf: Condition;
  /** Done when this holds; stat conditions with scope 'today' count since the morning roll. */
  readonly goal: Condition;
  readonly rewards: readonly Effect[];
  /** Relative pick weight in the morning draw. */
  readonly weight: number;
  readonly mvp: boolean;
}

export interface AspirationTierDef {
  readonly title: StringKey;
  readonly goal: Condition;
  readonly rewards: readonly Effect[];
}

export interface AspirationDef {
  readonly id: AspirationId;
  readonly name: StringKey;
  readonly desc: StringKey;
  readonly icon: SpriteKey;
  readonly tiers: readonly AspirationTierDef[];
  readonly mvp: boolean;
}

export type OutfitSlot = 'head' | 'hair' | 'face' | 'neck' | 'top' | 'feet' | 'accessory';

export interface OutfitDef {
  readonly id: OutfitId;
  readonly name: StringKey;
  readonly wearer: 'ellie' | CatName;
  readonly slot: OutfitSlot;
  /** Overlay sprite drawn over the wearer (game 1 drawOutfit style). */
  readonly sprite: SpriteKey;
  readonly unlock: Condition;
  readonly mvp: boolean;
}

export type MailSender = 'pickle' | 'poe' | 'bruce' | CatName | 'race' | 'personal';

export interface MailDef {
  readonly id: MailId;
  readonly from: MailSender;
  readonly subject: StringKey;
  /** Four short lines or fewer. */
  readonly body: StringKey;
  /** Checked each morning; sent at most once unless `repeatable`. */
  readonly sendIf: Condition;
  readonly attachments?: readonly Effect[];
  readonly repeatable?: boolean;
  readonly mvp: boolean;
}

/** Personal mail, filled by the giver in src/content/personal.ts. Text is literal, not keyed. */
export interface PersonalMail {
  /** Real calendar date 'YYYY-MM-DD' (wall clock) on or after which it arrives. */
  readonly date: string;
  readonly subject: string;
  readonly body: string;
}

export interface PersonalConfig {
  readonly playerName: string;
  /** "Grazie per essere te stessa" framed print available (default true). */
  readonly framedPrint: boolean;
  readonly mail: readonly PersonalMail[];
}

export interface StickerDef {
  readonly id: StickerId;
  readonly name: StringKey;
  readonly desc: StringKey;
  readonly icon: SpriteKey;
  readonly goal: Condition;
  /** Secrets show as "???" until found. */
  readonly secret: boolean;
  readonly rewards?: readonly Effect[];
}

export interface HyroxStationDef {
  readonly station: HyroxStation;
  readonly name: StringKey;
  /** The minigame that trains or races it. */
  readonly activity: ActivityId;
  /** Gym item that hosts it. */
  readonly item: ItemId;
  /** Race time model (play.md): seconds at skill 0 and skill 10, before performance and Fitness. */
  readonly baseSeconds: number;
  readonly skilledSeconds: number;
}

export type OnboardingSpeaker = CatName | 'pickle' | 'ellie';

export interface OnboardingStepDef {
  readonly id: OnboardingStepId;
  readonly speaker: OnboardingSpeaker;
  readonly lines: readonly StringKey[];
  /** Step completes when this holds (or immediately if absent, after the lines). */
  readonly waitFor?: Condition;
  /** Optional thing to point at. */
  readonly highlight?: { readonly kind: 'ui'; readonly id: string } | { readonly kind: 'item'; readonly item: ItemId } | { readonly kind: 'spot'; readonly spot: LotSpot };
}

// ===========================================================================
// 13. Tuning (all design numbers, sim.md and play.md)
// ===========================================================================

/** Maps a 0..100 need value to urgency 0..1 (higher when the need is low). */
export type ResponseCurve =
  | { readonly kind: 'linear' }
  | { readonly kind: 'power'; readonly exponent: number }
  | { readonly kind: 'logistic'; readonly midpoint: number; readonly steepness: number }
  | { readonly kind: 'points'; readonly points: readonly (readonly [number, number])[] };

export interface DecayModifier {
  readonly when: Condition;
  readonly multiplier?: number;
  readonly addPerHour?: number;
}

export interface NeedSpec {
  readonly start: number;
  /** Points lost per game hour (positive number). 0 for cosy, which is computed. */
  readonly decayPerHour: number;
  readonly modifiers?: readonly DecayModifier[];
  /** Below this the need counts as low (thought bubbles, mopey). */
  readonly lowAt: number;
  readonly curve: ResponseCurve;
  /** Utility weight of this need in the scorer. */
  readonly gain: number;
}

export interface SimTuning {
  readonly time: {
    /** Game minutes per tick at speed 1 (1 game minute per real second gives 0.05). */
    readonly minutesPerTick: number;
    /** Day 1 starts at this minute. */
    readonly startMinute: number;
    readonly startWeekday: Weekday;
    /** Phase start minutes. */
    readonly phases: Readonly<Record<DayPhase, number>>;
    readonly sleepFastForward: number;
  };
  readonly needs: {
    readonly ellie: Readonly<Record<EllieNeed, NeedSpec>>;
    readonly cat: Readonly<Record<CatNeed, NeedSpec>>;
  };
  readonly mood: {
    readonly weights: Readonly<Record<EllieNeed, number>>;
    /** Lowest mood value for each band, ascending. */
    readonly bands: Readonly<Record<MoodBand, number>>;
    /** Hearts multiplier at mood 0 and mood 100 (0.8 and 1.5), linear between. */
    readonly heartsMultiplier: readonly [number, number];
    /** Walk speed multiplier at mood 0 and 100. */
    readonly walkMultiplier: readonly [number, number];
  };
  readonly bond: {
    /** Bond value needed for levels 1..4. */
    readonly thresholds: readonly [number, number, number, number];
    readonly decayPerDay: number;
  };
  readonly ai: {
    readonly topK: number;
    /** Multiplicative noise range, e.g. [0.9, 1.1]. */
    readonly noise: readonly [number, number];
    /** Score multiplier per tile of distance: 1 / (1 + falloff * d). */
    readonly distanceFalloff: number;
    readonly bondWeight: readonly [number, number];
    /** Seconds of empty queue before Ellie's free will acts. */
    readonly freeWillIdleSeconds: number;
    readonly catDecideEveryTicks: number;
    readonly minScore: number;
  };
  readonly movement: {
    readonly ellieTilesPerSecond: number;
    readonly jumpTicks: number;
  };
  readonly hearts: {
    readonly startBalance: number;
    /** Hearts per game hour while mood is good or great (scaled by mood multiplier). */
    readonly goodMoodPerHour: number;
    readonly bondLevelUp: number;
  };
  readonly wishes: {
    readonly perDay: number;
    /** Minute the morning roll happens. */
    readonly rollMinute: number;
  };
  readonly delivery: {
    /** Game minutes from order to Pickle's knock in Live mode. */
    readonly minutes: number;
  };
  readonly housewarming: {
    readonly unlockIf: Condition;
  };
  /** Escape hatch for numbers the spec adds later; read with a default. */
  readonly extra: Readonly<Record<string, number>>;
}

// ===========================================================================
// 14. ContentDb (authored tables) and ContentIndex (lookup maps)
// ===========================================================================

export interface ContentDb {
  readonly tuning: SimTuning;
  readonly lot: LotDef;
  readonly items: readonly ItemDef[];
  readonly interactions: readonly InteractionDef[];
  readonly paints: readonly PaintDef[];
  readonly setBonuses: readonly SetBonusDef[];
  readonly catalog: readonly CatalogCategoryDef[];
  readonly cats: readonly CatDef[];
  readonly visitors: readonly VisitorDef[];
  readonly wishes: readonly WishDef[];
  readonly aspirations: readonly AspirationDef[];
  readonly outfits: readonly OutfitDef[];
  readonly mail: readonly MailDef[];
  readonly stickers: readonly StickerDef[];
  readonly hyrox: readonly HyroxStationDef[];
  readonly onboarding: readonly OnboardingStepDef[];
}

/** Built once at boot by buildContentIndex(db). Not serialised. */
export interface ContentIndex {
  readonly db: ContentDb;
  readonly items: ReadonlyMap<ItemId, ItemDef>;
  readonly interactions: ReadonlyMap<InteractionId, InteractionDef>;
  readonly paints: ReadonlyMap<PaintId, PaintDef>;
  readonly setBonuses: ReadonlyMap<SetBonusId, SetBonusDef>;
  readonly cats: ReadonlyMap<CatName, CatDef>;
  readonly visitors: ReadonlyMap<VisitorName, VisitorDef>;
  readonly wishes: ReadonlyMap<WishId, WishDef>;
  readonly aspirations: ReadonlyMap<AspirationId, AspirationDef>;
  readonly outfits: ReadonlyMap<OutfitId, OutfitDef>;
  readonly mail: ReadonlyMap<MailId, MailDef>;
  readonly stickers: ReadonlyMap<StickerId, StickerDef>;
  readonly hyrox: ReadonlyMap<HyroxStation, HyroxStationDef>;
  readonly rooms: ReadonlyMap<RoomId, RoomDef>;
}

// ===========================================================================
// 15. Entities and components
// ===========================================================================

export type EntityKind = 'ellie' | 'cat' | 'visitor' | 'item' | 'box' | 'mess' | 'trinket';

export interface MetaC {
  kind: EntityKind;
  /** Character name for actors. */
  name: CharacterName | null;
  /** Ticks since spawn when created (for stable tie-breaks). */
  bornTick: number;
}

export interface PositionC {
  /** Tile units, fractional while moving; the actor's feet or the item's footprint origin. */
  pos: Vec2;
  /** Position at the previous tick, for render interpolation. */
  prev: Vec2;
  layer: Layer;
  facing: Facing;
  room: RoomId | null;
}

export interface MotionC {
  /** Remaining path, next step first. */
  path: { tx: number; ty: number; layer: Layer }[];
  /** Tiles per second before mood and speed multipliers. */
  speed: number;
  /** Ticks spent without progress (soak "stuck" check). */
  stuckTicks: number;
  /** Mid-jump between layers, 0..1, or null. */
  jump: number | null;
}

export interface SpriteC {
  /** Sprite key prefix for actors ('ellie', 'cat.salem'), full key for items. */
  base: SpriteKey;
  anim: AnimKey;
  /** Tick the current animation started (frame = elapsed * fps). */
  animStartTick: number;
  flipX: boolean;
  /** Hidden (Bruce not present, Shadow under the bed). */
  hidden: boolean;
}

export type ActionSource = 'player' | 'freeWill' | 'ai' | 'script';

export interface QueuedAction {
  /** Unique per save (from SimState.nextActionId). */
  id: number;
  interaction: InteractionId;
  target: EntityId | null;
  tile: TilePos | null;
  source: ActionSource;
  queuedTick: number;
}

export type ActionPhase = 'pathing' | 'approach' | 'running' | 'activity' | 'ending';

export interface ActiveAction extends QueuedAction {
  phase: ActionPhase;
  /** Index into the target's slots, or null. */
  slot: number | null;
  startedTick: number;
  /** Game minutes elapsed in the running phase. */
  elapsedMinutes: number;
}

export interface AgentC {
  kind: ActorKind;
  name: CharacterName;
  queue: QueuedAction[];
  current: ActiveAction | null;
  carrying: CarryKind | null;
  /** Ticks with no queued or current action (free will timer). */
  idleTicks: number;
  asleep: boolean;
  /** Per-interaction cooldowns: interaction id -> tick when allowed again. */
  cooldowns: Record<string, number>;
  /** Last decision, for the debug overlay. */
  lastPick: { interaction: InteractionId; score: number; tick: number } | null;
}

export interface NeedsC {
  values: NeedValues;
}

export interface MoodC {
  /** 0..100, from weighted needs plus feelings. */
  value: number;
  band: MoodBand;
  feelings: Feeling[];
}

export interface BondC {
  /** 0..100 bond with Ellie. */
  value: number;
  level: BondLevel;
}

export interface BubbleC {
  thought: { icon: SpriteKey; untilTick: number } | null;
  speech: { line: StringKey; vars: StringVars | null; untilTick: number } | null;
  /** No new speech before this tick. */
  speechCooldownUntil: number;
}

/** Cat-only state owned by src/sim/cats. Free-form memory stays JSON. */
export interface CatC {
  cat: CatName;
  /** Quirk id -> tick when it may fire again. */
  quirkCooldowns: Record<string, number>;
  /** Entity being followed (Salem follows Ellie). */
  following: EntityId | null;
  /** Small JSON scratchpad for quirks (sightings, last reaction...). */
  memory: Record<string, JsonPrimitive>;
}

export interface VisitorC {
  visitor: VisitorName;
  /** Tick the visit ends. */
  leavesTick: number;
  spot: LotSpot | null;
}

export interface PlaceableC {
  item: ItemId;
  tile: TilePos;
  rotation: Rotation;
  mount: MountRef;
  /** Tick placed, so cats can react to new things. */
  placedTick: number;
}

export interface SmartObjectC {
  /** Slot index -> entity holding it. */
  reservations: Record<string, EntityId>;
  /** Object state (on/off, station, uses), seeded from ItemDef.flags. */
  flags: Record<string, JsonPrimitive>;
}

export interface CarryableC {
  carry: CarryKind;
}

export interface LightC {
  on: boolean;
}

export interface BoxC {
  /** Order this box came from, or null for an empty box Salem may sit in. */
  order: number | null;
  /** Salem (or any cat) currently inside. */
  occupant: EntityId | null;
}

export interface Components {
  meta: MetaC;
  position: PositionC;
  motion: MotionC;
  sprite: SpriteC;
  agent: AgentC;
  needs: NeedsC;
  mood: MoodC;
  bond: BondC;
  bubble: BubbleC;
  cat: CatC;
  visitor: VisitorC;
  placeable: PlaceableC;
  smartObject: SmartObjectC;
  carryable: CarryableC;
  light: LightC;
  box: BoxC;
}
export type ComponentKey = keyof Components;

/** Component tables keyed by stringified entity id (JSON object keys). */
export type ComponentStore = { [K in ComponentKey]: Record<string, Components[K]> };

/** Find-entity query used by the test hooks and modules. */
export interface EntityQuery {
  readonly kind?: EntityKind;
  readonly name?: CharacterName;
  readonly item?: ItemId;
  readonly tag?: Tag;
  readonly room?: RoomId;
}

// ===========================================================================
// 16. SimState (fully serialisable)
// ===========================================================================

export type GameMode = 'live' | 'build' | 'activity' | 'photo' | 'cutscene';
export type Weather = 'clear' | 'cloudy' | 'rain';

export interface HeartsState {
  balance: number;
  earned: number;
  spent: number;
}

export interface ActiveWish {
  id: WishId;
  done: boolean;
  /** Tick it was completed, or null. */
  doneTick: number | null;
}

export interface WishesState {
  active: ActiveWish[];
  /** Day the current set was rolled. */
  rolledDay: number;
  completedTotal: number;
  /** Wish id -> times completed. */
  history: IdMap<WishId, number>;
}

export interface AspirationsState {
  /** Aspiration id -> tiers completed (0..4). */
  tiers: IdMap<AspirationId, number>;
  /** Chosen title shown in the journal. */
  title: TitleId | null;
}

export type MailRef = { kind: 'def'; id: MailId } | { kind: 'personal'; index: number };

export interface MailEntry {
  ref: MailRef;
  arrivedDay: number;
  read: boolean;
  attachmentsClaimed: boolean;
}

export interface MailState {
  inbox: MailEntry[];
  /** Mail ids already sent (non-repeatable). */
  sent: IdMap<MailId, number>;
  /** Personal mail indices already delivered. */
  personalSent: number[];
  /** Waiting at the mailbox, not yet collected. */
  waiting: number;
  /** Scheduled sends from effects: [mail id, day]. */
  scheduled: { id: MailId; day: number }[];
}

export interface Order {
  id: number;
  items: ItemId[];
  placedTick: number;
  arriveTick: number;
}

export interface InventoryState {
  /** Bought but not placed. */
  stored: IdMap<ItemId, number>;
  trinkets: number;
  orders: Order[];
  nextOrderId: number;
}

export interface UnlocksState {
  items: IdMap<ItemId, true>;
  interactions: IdMap<InteractionId, true>;
  outfits: IdMap<OutfitId, true>;
  paints: IdMap<PaintId, true>;
  titles: IdMap<TitleId, true>;
  activities: IdMap<ActivityId, true>;
}

export interface StickersState {
  earned: IdMap<StickerId, number>;
}

export interface RaceRecord {
  day: number;
  totalMs: number;
  /** 16 splits: run, station, run, station... */
  splitsMs: number[];
  pb: boolean;
}

export interface HyroxState {
  /** Skill 0..10 per station (fractional XP). */
  skill: Record<HyroxStation, number>;
  /** Best training time per station in ms, or null. */
  stationPbMs: Record<HyroxStation, number | null>;
  racePbMs: number | null;
  races: RaceRecord[];
  medals: string[];
}

export interface RecordsState {
  hyrox: HyroxState;
  /** Generic best values (sushi neatness, dunk count...): stat -> value. */
  best: Record<StatKey, number>;
}

export interface WardrobeState {
  worn: Record<'ellie' | CatName, Partial<Record<OutfitSlot, OutfitId>>>;
  /** Ellie's streak colour, CSS hex. */
  streakColor: string;
}

export type PhotoFilter = 'none' | 'polaroid' | 'night' | 'warm';

export interface PhotoMeta {
  id: PhotoId;
  day: number;
  minute: number;
  filter: PhotoFilter;
  caption: StringKey;
  captionBy: CatName;
  cats: CatName[];
  room: RoomId | null;
  /** The PNG lives in its own storage key (save module). */
  storageKey: string;
}

export interface AlbumState {
  photos: PhotoMeta[];
  nextPhotoNo: number;
}

export interface VisitorsState {
  /** Next tick each visitor may be rolled for a visit. */
  nextCheckTick: Record<VisitorName, number>;
  visits: Record<VisitorName, number>;
  /** Bruce sightings per hiding spot. */
  bruceSpotted: Partial<Record<LotSpot, number>>;
  /** Poe's current trade offers. */
  poeOffers: ItemId[];
}

export interface OnboardingState {
  step: OnboardingStepId | null;
  stepIndex: number;
  done: boolean;
  skipped: boolean;
}

export interface HousewarmingState {
  status: 'locked' | 'ready' | 'happening' | 'done';
  day: number | null;
}

export interface EnvironmentState {
  weather: Weather;
  /** What the record player is playing, if anything. */
  music: { station: RadioStation; source: EntityId } | null;
  /** Shooting stars seen tonight (stargazing). */
  starsTonight: number;
}

export interface LogEntry {
  tick: number;
  key: StringKey;
  vars: StringVars | null;
}

export interface SimOptions {
  freeWill: boolean;
}

/** Activity in progress (the activity's own runtime state lives in the activity object). */
export interface ActivitySession {
  activity: ActivityId;
  params: ActivityParams;
  actor: EntityId;
  interaction: InteractionId | null;
  /** Action id waiting on activity.finish. */
  actionId: number | null;
  startedTick: number;
}

export interface SimState {
  /** Schema version (== SAVE_VERSION when written). */
  version: number;
  rng: RngState;
  time: GameTime;
  mode: GameMode;
  options: SimOptions;
  nextEntityId: number;
  nextActionId: number;
  components: ComponentStore;
  lot: LotState;
  environment: EnvironmentState;
  hearts: HeartsState;
  inventory: InventoryState;
  unlocks: UnlocksState;
  wishes: WishesState;
  aspirations: AspirationsState;
  mail: MailState;
  stickers: StickersState;
  records: RecordsState;
  wardrobe: WardrobeState;
  album: AlbumState;
  visitors: VisitorsState;
  onboarding: OnboardingState;
  housewarming: HousewarmingState;
  activity: ActivitySession | null;
  /** Lifetime counters (progress events, interactions...). */
  stats: Record<StatKey, number>;
  /** Counters since the morning wish roll. */
  statsToday: Record<StatKey, number>;
  flags: Record<FlagKey, boolean>;
  /** Saved summaries from activities (Critterbound party...), keyed by activity id. */
  activitySaves: Record<string, JsonValue>;
  /** Recent notable things, capped at LIMITS.historyLog. */
  log: LogEntry[];
}

// ===========================================================================
// 17. Systems
// ===========================================================================

/** Fixed system order (TECH.md). */
export type SystemName =
  | 'time'
  | 'needsDecay'
  | 'aiDecide'
  | 'actionExec'
  | 'movement'
  | 'triggers'
  | 'progression'
  | 'eventsOut';

export const SYSTEM_ORDER: readonly SystemName[] = [
  'time',
  'needsDecay',
  'aiDecide',
  'actionExec',
  'movement',
  'triggers',
  'progression',
  'eventsOut',
];

export interface SystemContext {
  readonly state: SimState;
  readonly content: ContentIndex;
  readonly emit: SimEventSink;
  /** Game minutes this tick covers. */
  readonly dtMinutes: number;
  /** Injected clock; only the time system (real-time mode) and mail by date read it. */
  readonly clock: Clock;
}

/** A step over state. May only mutate ctx.state and emit events. Must be deterministic. */
export type System = (ctx: SystemContext) => void;

// ===========================================================================
// 18. Player actions (UI and input -> sim)
// ===========================================================================

/** Every input that changes SimState goes through dispatch, so replays are exact. */
export type PlayerAction =
  // Live mode
  | { readonly type: 'walkTo'; readonly tile: TilePos }
  | { readonly type: 'interact'; readonly interaction: InteractionId; readonly target: EntityId | null; readonly tile?: TilePos }
  | { readonly type: 'queue.cancel'; readonly actionId: number }
  | { readonly type: 'time.setSpeed'; readonly speed: Speed }
  | { readonly type: 'time.togglePause' }
  | { readonly type: 'mode.set'; readonly mode: 'live' | 'build' | 'photo' }
  | { readonly type: 'options.set'; readonly freeWill?: boolean; readonly realTime?: boolean }
  // Build mode (undo and redo are build-module history replayed as these)
  | { readonly type: 'build.place'; readonly request: PlacementRequest; readonly source: 'stored' | 'buy' }
  | { readonly type: 'build.move'; readonly entity: EntityId; readonly request: PlacementRequest }
  | { readonly type: 'build.sell'; readonly entity: EntityId }
  | { readonly type: 'build.store'; readonly entity: EntityId }
  | { readonly type: 'build.paint'; readonly room: RoomId; readonly surface: PaintSurface; readonly paint: PaintId }
  | { readonly type: 'catalog.order'; readonly items: readonly ItemId[] }
  // Activities
  | { readonly type: 'activity.finish'; readonly result: ActivityResult }
  // Journal, wardrobe, mail, photos
  | { readonly type: 'wardrobe.wear'; readonly who: 'ellie' | CatName; readonly slot: OutfitSlot; readonly outfit: OutfitId | null }
  | { readonly type: 'wardrobe.streak'; readonly color: string }
  | { readonly type: 'mail.collect' }
  | { readonly type: 'mail.read'; readonly index: number }
  | { readonly type: 'photo.save'; readonly photo: PhotoMeta }
  | { readonly type: 'photo.delete'; readonly id: PhotoId }
  | { readonly type: 'title.set'; readonly id: TitleId | null }
  | { readonly type: 'trade.accept'; readonly item: ItemId }
  | { readonly type: 'onboarding.next' }
  | { readonly type: 'onboarding.skip' }
  // Test and debug only (rejected unless the sim was created with debug: true)
  | { readonly type: 'debug.setNeed'; readonly entity: EntityId; readonly need: NeedKey; readonly value: number }
  | { readonly type: 'debug.addHearts'; readonly amount: number }
  | { readonly type: 'debug.setTime'; readonly day?: number; readonly minute?: number }
  | { readonly type: 'debug.unlockAll' }
  | { readonly type: 'debug.setBond'; readonly cat: CatName; readonly value: number };

export type PlayerActionType = PlayerAction['type'];
export type ActionOf<T extends PlayerActionType> = Extract<PlayerAction, { readonly type: T }>;

/** Result of dispatching: rejected actions explain why (UI may toast the reason). */
export type DispatchResult = { readonly ok: true } | { readonly ok: false; readonly reason: StringKey | string };

export type Dispatch = (action: PlayerAction) => DispatchResult;

/** @deprecated Wave 0 name. Use PlayerAction. */
export type Action = PlayerAction;

// ===========================================================================
// 19. Audio cues
// ===========================================================================

/** Voices that meow with a game 1 signature. */
export type Meower = CatName | 'bruce';
/** Dialogue blip voices. */
export type BlipVoice = 'ellie' | Meower | 'poe' | 'pickle';
export type FloorSound = 'wood' | 'tile' | 'carpet' | 'rug' | 'grass' | 'stone' | 'gymMat' | 'gravel';
export type HitGrade = 'perfect' | 'good' | 'miss';
export type MusicTrack = 'title' | 'home' | 'night' | 'gym' | 'heavy' | 'lofi' | 'cosy' | 'raceDay' | 'housewarming' | 'none';

/** Cue names without a payload. src/audio's local Cue union is a superset of AudioCue. */
export type SimpleCueName =
  | 'ui.click'
  | 'ui.hover'
  | 'ui.open'
  | 'ui.close'
  | 'ui.confirm'
  | 'ui.back'
  | 'ui.nope'
  | 'ui.toggle'
  | 'ui.tab'
  | 'ui.page'
  | 'ui.toast'
  | 'ui.petals'
  | 'ui.queueAdd'
  | 'ui.queueCancel'
  | 'ui.speed'
  | 'ui.pause'
  | 'ui.hearts'
  | 'ui.wish'
  | 'ui.sticker'
  | 'ui.unlock'
  | 'ui.aspiration'
  | 'mode.build'
  | 'mode.live'
  | 'mode.photo'
  | 'build.pickUp'
  | 'build.place'
  | 'build.blocked'
  | 'build.rotate'
  | 'build.sell'
  | 'build.paint'
  | 'build.undo'
  | 'build.redo'
  | 'build.duplicate'
  | 'build.eyedropper'
  | 'door.knock'
  | 'door.open'
  | 'door.close'
  | 'mail.arrive'
  | 'mail.open'
  | 'mail.close'
  | 'box.open'
  | 'photo.shutter'
  | 'lamp.on'
  | 'lamp.off'
  | 'record.start'
  | 'record.stop'
  | 'tv.on'
  | 'tv.off'
  | 'console.boot'
  | 'kettle.boil'
  | 'coffee.pour'
  | 'rusk.dunk'
  | 'rusk.perfect'
  | 'rusk.plop'
  | 'sushi.chop'
  | 'sushi.roll'
  | 'sushi.plate'
  | 'lantern.light'
  | 'star.shoot'
  | 'star.wish'
  | 'eat.crunch'
  | 'sit.sofa'
  | 'bed.flop'
  | 'water.run'
  | 'dress.change'
  | 'housewarming'
  | 'gym.countdown'
  | 'gym.go'
  | 'gym.rep'
  | 'race.cheer'
  | 'race.finish'
  | 'race.pb'
  | 'race.medal'
  | 'cat.land'
  | 'cat.knock'
  | 'cat.zoomies'
  | 'cat.scratch'
  | 'cat.boxIn'
  | 'cat.crunch'
  | 'cat.lap'
  | 'cat.bell'
  | 'poe.caw'
  | 'pickle.ribbit';

export type AudioCue =
  | { readonly cue: SimpleCueName }
  | { readonly cue: 'meow'; readonly cat: Meower }
  | { readonly cue: 'purr'; readonly cat: Meower }
  | { readonly cue: 'mrrp'; readonly cat: Meower }
  | { readonly cue: 'chirp'; readonly cat: Meower }
  | { readonly cue: 'huff'; readonly cat: Meower }
  | { readonly cue: 'blip'; readonly voice: BlipVoice }
  | { readonly cue: 'step'; readonly floor: FloorSound }
  | { readonly cue: 'gym.stroke'; readonly station: HyroxStation }
  | { readonly cue: 'gym.hit'; readonly grade: HitGrade }
  | { readonly cue: 'race.crowd'; readonly intensity: number };

export type AudioCueName = AudioCue['cue'];

/** What the music state machine listens to. */
export interface MusicContext {
  readonly mode: GameMode | 'title';
  readonly activity: ActivityId | null;
  readonly room: RoomKind | null;
  readonly phase: DayPhase;
  readonly radio: RadioStation | null;
  readonly weather: Weather;
  readonly raceDay: boolean;
  readonly housewarming: boolean;
}

// ===========================================================================
// 20. Sim events (sim -> outside) and the app event bus
// ===========================================================================

export type ParticleKind = 'heart' | 'sparkle' | 'dust' | 'zz' | 'note' | 'steam' | 'rain' | 'star' | 'confetti';
export type Emote = 'happy' | 'mopey' | 'love' | 'surprised' | 'annoyed' | 'sleepy' | 'music';

export type WorldChangeReason = 'newGame' | 'load' | 'place' | 'move' | 'sell' | 'store' | 'paint' | 'spawn' | 'remove' | 'flags';

export interface WorldChanged {
  readonly reason: WorldChangeReason;
  readonly revision: number;
  readonly rooms: readonly RoomId[];
  readonly entities: readonly EntityId[];
}

/** Emitted by the simulation through SimEventSink. Pure data; may be logged and replayed. */
export type SimEvent =
  | { readonly type: 'cue'; readonly cue: AudioCue; readonly at: Vec2 | null }
  | { readonly type: 'say'; readonly entity: EntityId; readonly line: StringKey; readonly vars: StringVars | null }
  | { readonly type: 'thought'; readonly entity: EntityId; readonly icon: SpriteKey }
  | { readonly type: 'emote'; readonly entity: EntityId; readonly emote: Emote }
  | { readonly type: 'particles'; readonly particle: ParticleKind; readonly at: Vec2; readonly count: number }
  | { readonly type: 'toast'; readonly key: StringKey; readonly vars: StringVars | null; readonly icon: SpriteKey | null }
  | { readonly type: 'hearts'; readonly delta: number; readonly balance: number; readonly reason: HeartsReason }
  | { readonly type: 'progress'; readonly event: ProgressEvent }
  | { readonly type: 'interaction.start'; readonly entity: EntityId; readonly interaction: InteractionId; readonly target: EntityId | null }
  | { readonly type: 'interaction.end'; readonly entity: EntityId; readonly interaction: InteractionId; readonly target: EntityId | null; readonly completed: boolean }
  | { readonly type: 'activity.request'; readonly session: ActivitySession }
  | { readonly type: 'wish.rolled'; readonly wishes: readonly WishId[] }
  | { readonly type: 'wish.completed'; readonly wish: WishId }
  | { readonly type: 'aspiration.tier'; readonly aspiration: AspirationId; readonly tier: number }
  | { readonly type: 'sticker'; readonly sticker: StickerId }
  | { readonly type: 'unlock'; readonly what: UnlockRef }
  | { readonly type: 'mail.arrived'; readonly ref: MailRef }
  | { readonly type: 'delivery'; readonly order: number; readonly items: readonly ItemId[] }
  | { readonly type: 'mood.band'; readonly band: MoodBand }
  | { readonly type: 'bond.level'; readonly cat: CatName; readonly level: BondLevel }
  | { readonly type: 'time.hour'; readonly day: number; readonly hour: number }
  | { readonly type: 'time.day'; readonly day: number; readonly weekday: Weekday }
  | { readonly type: 'mode'; readonly mode: GameMode }
  | { readonly type: 'world.changed'; readonly change: WorldChanged }
  | { readonly type: 'onboarding.step'; readonly step: OnboardingStepId | null }
  | { readonly type: 'housewarming'; readonly status: HousewarmingState['status'] };

export type SimEventType = SimEvent['type'];
export type SimEventSink = (event: SimEvent) => void;

/** Modifier keys on pointer input. */
export interface InputMods {
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly meta: boolean;
}

export interface PointerInfo {
  /** Logical canvas pixels (0..CANVAS_W, 0..CANVAS_H). */
  readonly screen: Vec2;
  /** World position in tile units. */
  readonly world: Vec2;
  readonly tile: TilePos | null;
  /** Topmost entity under the pointer (sprite bounds). */
  readonly entity: EntityId | null;
  readonly button: 0 | 1 | 2;
  readonly mods: InputMods;
}

/** Semantic keyboard actions (bindings in ui.md; engine maps raw keys). */
export type KeyAction =
  | 'toggleBuild'
  | 'rotate'
  | 'sell'
  | 'duplicate'
  | 'eyedropper'
  | 'undo'
  | 'redo'
  | 'journal'
  | 'catalog'
  | 'photo'
  | 'fullscreen'
  | 'pause'
  | 'speed1'
  | 'speed2'
  | 'speed3'
  | 'cancel'
  | 'confirm'
  | 'primary'
  | 'up'
  | 'down'
  | 'left'
  | 'right';

export type PanelId =
  | 'title'
  | 'journal'
  | 'catalog'
  | 'settings'
  | 'wardrobe'
  | 'cats'
  | 'mail'
  | 'trade'
  | 'raceBoard'
  | 'photo'
  | 'credits'
  | 'confirm';

export type JournalTab = 'wishes' | 'aspirations' | 'collection' | 'cats' | 'photos' | 'stickers' | 'records' | 'mail' | 'settings';

export interface ToastSpec {
  readonly key: StringKey;
  readonly vars?: StringVars;
  readonly icon?: SpriteKey;
  readonly tone?: 'info' | 'hearts' | 'unlock' | 'gentle';
}

/** App-level events. Keys are event names, values are payloads. */
export interface EpEvents {
  /** Every SimEvent, forwarded by the app after each tick. */
  'sim.event': SimEvent;
  /** Static layers (floor, walls, nav) must refresh. */
  'world.changed': WorldChanged;
  'build.opened': { readonly revision: number };
  /** Build mode closed: what changed, so the cats can react. */
  'build.closed': {
    readonly added: readonly EntityId[];
    readonly moved: readonly EntityId[];
    readonly removed: readonly ItemId[];
    readonly painted: readonly RoomId[];
  };
  'mode.changed': { readonly mode: GameMode | 'title'; readonly prev: GameMode | 'title' };
  'audio.cue': AudioCue;
  'music.context': MusicContext;
  'action.dispatched': { readonly action: PlayerAction; readonly result: DispatchResult };
  'input.click': PointerInfo;
  'input.hover': PointerInfo;
  'input.drag': PointerInfo & { readonly phase: 'start' | 'move' | 'end' };
  'input.wheel': { readonly dy: number; readonly pointer: PointerInfo };
  'input.key': { readonly action: KeyAction; readonly down: boolean; readonly repeat: boolean };
  'ui.toast': ToastSpec;
  'ui.panel': { readonly panel: PanelId; readonly open: boolean };
  'ui.menu': { readonly target: EntityId | null; readonly open: boolean };
  'activity.started': { readonly session: ActivitySession };
  'activity.ended': { readonly result: ActivityResult };
  'settings.changed': Settings;
  'save.result': { readonly kind: 'auto' | 'manual' | 'export' | 'import'; readonly ok: boolean; readonly reason: string | null };
  'app.visibility': { readonly hidden: boolean };
  'photo.captured': { readonly photo: PhotoMeta; readonly dataUrl: string };
}

export interface EventBus<M extends object> {
  /** Subscribes; returns an unsubscribe function. */
  on<K extends keyof M>(type: K, handler: (payload: M[K]) => void): () => void;
  emit<K extends keyof M>(type: K, payload: M[K]): void;
  clear(): void;
}

export type EpBus = EventBus<EpEvents>;

// ===========================================================================
// 21. Activities (minigames)
// ===========================================================================

export type ActivityParams = Readonly<Record<string, string | number | boolean>>;

/** Semantic buttons; the engine maps keys, clicks and taps onto these. */
export type ActivityButton = 'primary' | 'secondary' | 'up' | 'down' | 'left' | 'right' | 'cancel';

export type ActivityInput =
  | { readonly type: 'button'; readonly button: ActivityButton; readonly down: boolean }
  /** Logical canvas pixels. */
  | { readonly type: 'pointer'; readonly x: number; readonly y: number; readonly down: boolean }
  | { readonly type: 'pointerMove'; readonly x: number; readonly y: number };

export type ActivityGrade = 'perfect' | 'great' | 'good' | 'okay';

export interface ActivityResult {
  readonly activity: ActivityId;
  /** Ran to the end (true) or was skipped (also counts as a pass). */
  readonly completed: boolean;
  readonly skipped: boolean;
  /** 0..1 performance. Skipped results use the spec's skip score. */
  readonly score: number;
  readonly grade: ActivityGrade;
  /** Time taken or scored in ms, where meaningful (Hyrox stations, race). */
  readonly timeMs: number | null;
  /** All state changes, applied by the sim (needs, skillXp, records, hearts, stats, feelings). */
  readonly effects: readonly Effect[];
  /** Counted toward wishes, aspirations and stickers. */
  readonly progress: readonly ProgressEvent[];
  /** Replaces SimState.activitySaves[activity] when present (Critterbound). */
  readonly save?: JsonValue;
}

/** Read-only snapshot handed to an activity. Activities never mutate SimState. */
export interface ActivityContext {
  /** A private stream forked from the sim RNG (forkRng), so results are deterministic. */
  readonly rng: RngState;
  readonly params: ActivityParams;
  readonly state: Readonly<SimState>;
  readonly content: ContentIndex;
  readonly actor: EntityId;
  readonly strings: StringLookup;
  /** The engine's atlas; null in unit tests. */
  readonly sprites: SpriteAtlas | null;
  /** Play a sound. */
  readonly cue: (cue: AudioCue) => void;
  /** Ask a cat to say a line in the world (cooldowns still apply). */
  readonly say: (cat: CatName, line: StringKey) => void;
  /** Ask for particles at canvas pixels. */
  readonly particles: (kind: ParticleKind, at: Vec2, count: number) => void;
}

export interface Activity {
  readonly id: ActivityId;
  start(ctx: ActivityContext): void;
  /** Real milliseconds since the last update (clamped by the engine to <= 100). */
  update(dtMs: number): void;
  /** Draw on the 480x270 logical canvas (already scaled, smoothing off). */
  render(ctx: CanvasRenderingContext2D): void;
  onInput(input: ActivityInput): void;
  /** True after two misses: the UI shows Skip. */
  canSkip(): boolean;
  /** Ends now as a pass; result() is non-null afterwards. */
  skip(): void;
  /** Non-null once the activity is over. */
  result(): ActivityResult | null;
}

export interface ActivityDef {
  readonly id: ActivityId;
  readonly title: StringKey;
  /** One short line shown before it starts. */
  readonly instructions: StringKey;
  /** Owner instance (hyrox, kitchen, console, life). */
  readonly family: 'hyrox' | 'kitchen' | 'console' | 'life';
  /** Fresh instance per run. */
  create(params: ActivityParams): Activity;
}

// ===========================================================================
// 22. Strings
// ===========================================================================

/** One domain file: dotted keys (`cat.george.idle.01`) to text. */
export type StringTable = Readonly<Record<string, string>>;
/** Placeholder values: {name}, {cat}, {n}. */
export interface StringVars {
  readonly name?: string;
  readonly cat?: string;
  readonly n?: number | string;
}
/** Resolves a key to text with placeholders filled. Missing keys return `[key]` in dev. */
export type StringLookup = (key: StringKey, vars?: StringVars) => string;

// ===========================================================================
// 23. Sprites
// ===========================================================================

/** Equal-width rows, one character per pixel, `.` is transparent. */
export type Grid = readonly string[];
/** Grid character -> '#rrggbb'. */
export type Palette = Readonly<Record<string, string>>;
/** Drawn directions; left is side flipped. `side` faces right. */
export type SpriteDir = 'down' | 'up' | 'side';

/** Anchor in grid coordinates: the point that sits on the entity's ground position. */
export interface Anchor {
  readonly x: number;
  readonly y: number;
}

export interface SpriteDef {
  /** Dotted lower-case key: `ellie.walk`, `cat.salem.idle`, `item.bed_single`, `icon.need.energy`. */
  readonly key: SpriteKey;
  readonly grid: Grid;
  readonly palette: Palette;
  readonly anchor: Anchor;
  readonly frames?: readonly Grid[];
  readonly dirs?: Readonly<Partial<Record<SpriteDir, readonly Grid[]>>>;
  /** Outline colour override (black cats and Poe use the lavender rim). */
  readonly outline?: string;
  /** Frames per second (default 6). */
  readonly fps?: number;
}

/** What each src/art/<batch>/index.ts exports as `BATCH`. */
export interface ArtBatch {
  readonly id: string;
  readonly title: string;
  readonly sprites: readonly SpriteDef[];
}

/** All sprites by key, built from every batch at boot. */
export type SpriteRegistry = ReadonlyMap<SpriteKey, SpriteDef>;

/** One drawable frame in the compiled atlas. */
export interface AtlasFrame {
  readonly image: CanvasImageSource;
  readonly sx: number;
  readonly sy: number;
  readonly w: number;
  readonly h: number;
  /** Anchor in pixels within the frame (after outline). */
  readonly ax: number;
  readonly ay: number;
  readonly flipX: boolean;
}

export interface SpriteAtlas {
  has(key: SpriteKey): boolean;
  /** Frame for a facing at an animation time; null if the key is unknown. */
  frame(key: SpriteKey, facing: Facing, timeMs: number): AtlasFrame | null;
  frameCount(key: SpriteKey, facing: Facing): number;
  keys(): readonly SpriteKey[];
  /** Draw a sprite with its anchor at logical pixel (x, y). */
  draw(ctx: CanvasRenderingContext2D, key: SpriteKey, x: number, y: number, facing?: Facing, timeMs?: number): void;
  /** A data URL of one frame, for DOM UI icons and portraits. */
  toDataUrl(key: SpriteKey, scale?: number): string | null;
}

// ===========================================================================
// 24. Settings and save
// ===========================================================================

export type TextSize = 'small' | 'normal' | 'large';
export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

/** Player preferences. Saved next to SimState (not inside it: not part of determinism). */
export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  textSize: TextSize;
  textSpeed: TextSpeed;
  reducedMotion: 'system' | 'on' | 'off';
  showHints: boolean;
  /** Sessions started (drives the export reminder every 5 sessions). */
  sessions: number;
  lastExportSession: number;
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  ambienceVolume: 0.6,
  textSize: 'normal',
  textSpeed: 'normal',
  reducedMotion: 'system',
  showHints: true,
  sessions: 0,
  lastExportSession: 0,
};

export const SAVE_KEY = 'ellies-place:save:v1';
export const SAVE_BACKUP_KEY = 'ellies-place:save:v1:backup';
export const PHOTO_KEY_PREFIX = 'ellies-place:photo:';
export const SAVE_VERSION = 1;

export interface SaveFile {
  readonly format: 'ellies-place';
  readonly version: number;
  readonly savedAtWallMs: number;
  /** Game build id that wrote it (for bug reports). */
  readonly build: string;
  readonly state: SimState;
  readonly settings: Settings;
}

/** Upgrades raw JSON one version. Registered in src/save; tested per step. */
export interface Migration {
  readonly from: number;
  readonly to: number;
  migrate(raw: JsonObject): JsonObject;
}

export type LoadResult =
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly file: SaveFile }
  | { readonly kind: 'recovered'; readonly file: SaveFile; readonly from: 'backup' }
  | { readonly kind: 'corrupt' }
  | { readonly kind: 'unavailable' };

export type SaveResult = { readonly ok: true } | { readonly ok: false; readonly reason: 'unavailable' | 'quota' | 'error' };

export type ImportResult = { readonly ok: true; readonly file: SaveFile } | { readonly ok: false; readonly reason: 'parse' | 'format' | 'version' | 'invalid' };

/** The subset of Storage the save module needs (injectable for tests). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

// ===========================================================================
// 25. Test hooks (window.__EP__, only with ?test=1)
// ===========================================================================

export interface FrameStats {
  readonly frames: number;
  readonly fps: number;
  readonly renderP50Ms: number;
  readonly renderP95Ms: number;
  readonly simP50Ms: number;
  readonly simP95Ms: number;
  readonly lastRenderMs: number;
  readonly lastSimMs: number;
}

export interface TestHooks {
  /** Advances the sim exactly n ticks, synchronously, regardless of speed. */
  step(ticks: number): void;
  setSpeed(speed: Speed): void;
  /** A deep copy (JSON round-trip) of the current state. */
  getState(): SimState;
  dispatch: Dispatch;
  findEntity(query: EntityQuery): EntityId | null;
  /** Starts a fresh game with this seed. */
  seed(n: number): void;
  frameStats(): FrameStats;
  /** hashState of the current state. */
  hash(): string;
  /** Screen position (CSS pixels) of an entity's anchor, for Playwright clicks. */
  screenOf(entity: EntityId): { x: number; y: number } | null;
  /** Screen position (CSS pixels) of a tile centre. */
  screenOfTile(tile: TilePos): { x: number; y: number } | null;
  /** True once the app has booted and the first frame rendered. */
  ready(): boolean;
  readonly version: number;
}

declare global {
  interface Window {
    __EP__?: TestHooks;
  }
}

// ===========================================================================
// 26. Module entry points (implemented in each module's index.ts)
// ===========================================================================

// ---- src/sim -------------------------------------------------------------

export interface AiContext {
  readonly state: Readonly<SimState>;
  readonly content: ContentIndex;
  readonly actor: EntityId;
}

/** How src/sim/cats (and others) plug into the shared scorer. Never fork the scorer. */
export interface AiHooks {
  /** Multiplier on a candidate's score (personality, likes, quirks). 1 = no change. */
  personality?(ctx: AiContext, candidate: Candidate, interaction: InteractionDef): number;
  /** Extra candidates (follow Ellie, chase a sunbeam tile). */
  candidates?(ctx: AiContext): readonly Candidate[];
  /** Veto a candidate entirely. */
  allow?(ctx: AiContext, candidate: Candidate, interaction: InteractionDef): boolean;
}

export type ActionHandler<T extends PlayerActionType> = (
  ctx: SystemContext,
  action: ActionOf<T>,
) => DispatchResult;

export type ActionHandlers = { readonly [T in PlayerActionType]?: ActionHandler<T> };

/** A bundle of behaviour registered with sim.use(). */
export interface SimPlugin {
  readonly id: string;
  /** Run after the core system of each phase, in registration order. */
  readonly systems?: Readonly<Partial<Record<SystemName, readonly System[]>>>;
  readonly ai?: AiHooks;
  /** Handlers for actions the core does not own (build.*, trade.accept...). */
  readonly actions?: ActionHandlers;
  /** Called after a new game is created (spawn cats, visitors) and after load. */
  init?(ctx: SystemContext, reason: 'newGame' | 'load'): void;
}

export interface CreateSimOptions {
  readonly content: ContentIndex;
  readonly seed: number;
  readonly clock: Clock;
  /** Load this state instead of a new game. */
  readonly state?: SimState;
  readonly plugins?: readonly SimPlugin[];
  /** Accept debug.* actions (test mode and unit tests only). */
  readonly debug?: boolean;
}

export interface Sim {
  /** The live state. Treat as read-only outside src/sim; change it with dispatch. */
  readonly state: SimState;
  readonly content: ContentIndex;
  /** Advances n fixed ticks (default 1). */
  step(ticks?: number): void;
  dispatch: Dispatch;
  use(plugin: SimPlugin): void;
  /** Subscribes to SimEvents; returns unsubscribe. */
  onEvent(sink: SimEventSink): () => void;
  /** Replaces state (after load); runs plugin init('load'). */
  load(state: SimState): void;
  /** Fresh game with this seed; runs plugin init('newGame'). */
  newGame(seed: number): void;
  findEntity(query: EntityQuery): EntityId | null;
  findEntities(query: EntityQuery): readonly EntityId[];
  /** Petals for the interaction menu (Ellie as actor). */
  menuFor(target: EntityId | null, tile?: TilePos): readonly MenuOption[];
  /** Ticks to run per engine fixed step: speed * fastForward, or 0 when paused or in build. */
  stepsPerTick(): number;
  hash(): string;
}

export type CreateSim = (opts: CreateSimOptions) => Sim;

// ---- src/sim/cats ----------------------------------------------------------

/** Registers the cat and visitor plugins on a sim. */
export type RegisterCats = (sim: Sim) => void;

// ---- src/world -------------------------------------------------------------

export interface World {
  /** Fresh lot state from content.lot (tiles, rooms, paint). Start placements are spawned by the sim plugin. */
  createLot(): LotState;
  check(state: Readonly<SimState>, req: PlacementRequest): PlacementCheck;
  roomAt(state: Readonly<SimState>, tile: TilePos): RoomId | null;
  cosy(state: Readonly<SimState>, room: RoomId): CosyReport;
  navGrid(state: Readonly<SimState>): NavGrid;
  sunbeams(state: Readonly<SimState>): readonly SunbeamPatch[];
  /** Tiles an item occupies at a placement. */
  footprintTiles(item: ItemId, tile: TilePos, rotation: Rotation): readonly TilePos[];
  /** World-space slot position and facing for a placed item. */
  slotPose(state: Readonly<SimState>, entity: EntityId, slot: number): { pos: Vec2; facing: Facing; layer: Layer } | null;
  /** Sim plugin: build.* action handlers, start placements, cosy refresh, world.changed events. */
  plugin(): SimPlugin;
}

export type CreateWorld = (content: ContentIndex) => World;

// ---- src/build -------------------------------------------------------------

export interface BuildDeps {
  readonly world: World;
  readonly sim: Sim;
  readonly bus: EpBus;
  readonly ui: Ui;
  readonly engine: Engine;
  readonly strings: StringLookup;
}

export interface BuildMode {
  readonly isOpen: boolean;
  open(): void;
  /** Closes and emits build.closed. */
  close(): void;
  /** Pick an item to place (from the catalog or storage). */
  select(item: ItemId | null): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  destroy(): void;
}

export type CreateBuild = (deps: BuildDeps) => BuildMode;

// ---- src/engine ------------------------------------------------------------

export type RenderLayer = 'floor' | 'rugs' | 'walls' | 'objects' | 'overhead' | 'lighting' | 'particles' | 'weather' | 'hints';
export const RENDER_LAYERS: readonly RenderLayer[] = ['floor', 'rugs', 'walls', 'objects', 'overhead', 'lighting', 'particles', 'weather', 'hints'];

export interface RenderFrame {
  readonly state: Readonly<SimState>;
  readonly content: ContentIndex;
  readonly atlas: SpriteAtlas;
  /** Interpolation between previous and current tick, 0..1. */
  readonly alpha: number;
  /** Real milliseconds since boot (animations). */
  readonly timeMs: number;
}

/** Extra drawing on a layer (build ghost, debug overlay). Logical pixels. */
export type RenderHook = (ctx: CanvasRenderingContext2D, frame: RenderFrame) => void;

export interface Camera {
  /** CSS pixels per logical pixel. */
  readonly scale: number;
  /** Logical pixel offset of the view (panning). */
  readonly offset: Vec2;
  screenToWorld(clientX: number, clientY: number): Vec2;
  worldToScreen(world: Vec2): { x: number; y: number };
}

export interface ParticleApi {
  emit(kind: ParticleKind, at: Vec2, count: number): void;
  clear(): void;
  readonly live: number;
}

export interface EngineOptions {
  readonly canvas: HTMLCanvasElement;
  readonly clock: Clock;
  readonly bus: EpBus;
  readonly content: ContentIndex;
  readonly sprites: readonly ArtBatch[];
  readonly sim: Sim;
}

export interface Engine {
  start(): void;
  stop(): void;
  readonly atlas: SpriteAtlas;
  readonly camera: Camera;
  readonly particles: ParticleApi;
  /** Hand the canvas to a minigame (null returns to the world). */
  setActivity(activity: Activity | null): void;
  addRenderHook(layer: RenderLayer, hook: RenderHook): () => void;
  /** Redraw cached floor and walls (also done on world.changed). */
  invalidateStatic(): void;
  frameStats(): FrameStats;
  /** Pick the topmost entity at a client point. */
  pick(clientX: number, clientY: number): PointerInfo;
  resize(): void;
}

export type CreateEngine = (opts: EngineOptions) => Engine;

// ---- src/ui ----------------------------------------------------------------

export interface UiDeps {
  readonly root: HTMLElement;
  readonly bus: EpBus;
  readonly strings: StringLookup;
  readonly dispatch: Dispatch;
  readonly sim: Sim;
  readonly content: ContentIndex;
  readonly settings: () => Settings;
  /** null until the engine has built the atlas. */
  readonly atlas: () => SpriteAtlas | null;
  /** Logical world (tile units) to CSS pixels, for anchoring bubbles and menus. */
  readonly worldToScreen: (world: Vec2) => { x: number; y: number };
}

export interface InteractionMenuSpec {
  readonly target: EntityId | null;
  readonly tile: TilePos | null;
  /** Anchor in world tile units. */
  readonly anchor: Vec2;
  readonly options: readonly MenuOption[];
}

export interface Ui {
  /** Called once per rendered frame. */
  update(state: Readonly<SimState>, dtMs: number): void;
  /** The canvas scale changed; UI units follow it. */
  setScale(scale: number): void;
  open(panel: PanelId, opts?: { readonly tab?: JournalTab }): void;
  close(panel?: PanelId): void;
  isOpen(panel?: PanelId): boolean;
  toast(spec: ToastSpec): void;
  showMenu(spec: InteractionMenuSpec): void;
  hideMenu(): void;
  /** A panel container for other modules (build's catalog) styled by the kit. */
  readonly kit: UiKit;
  destroy(): void;
}

export interface UiComponent<E extends HTMLElement = HTMLElement> {
  readonly el: E;
  destroy(): void;
}

export interface ButtonOptions {
  readonly label: StringKey;
  readonly icon?: SpriteKey;
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'petal';
  readonly tooltip?: StringKey;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}
export interface PanelOptions {
  readonly title: StringKey;
  readonly closable?: boolean;
  readonly paper?: boolean;
  readonly onClose?: () => void;
}
export interface TabsOptions<T extends string> {
  readonly tabs: readonly { readonly id: T; readonly label: StringKey; readonly icon?: SpriteKey }[];
  readonly selected: T;
  readonly onSelect: (id: T) => void;
}
export interface SliderOptions {
  readonly label: StringKey;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly onChange: (value: number) => void;
}
export interface ToggleOptions {
  readonly label: StringKey;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}
export interface CardOptions {
  readonly title: StringKey;
  readonly body?: StringKey;
  readonly icon?: SpriteKey;
  readonly vars?: StringVars;
  readonly locked?: boolean;
  readonly onClick?: () => void;
}
export interface MeterOptions {
  readonly label: StringKey;
  readonly icon?: SpriteKey;
  readonly value: number;
  readonly max: number;
}

/** ui-dev's component kit; other modules (build) build panels with it. */
export interface UiKit {
  panel(opts: PanelOptions): UiComponent & { readonly body: HTMLElement };
  button(opts: ButtonOptions): UiComponent<HTMLButtonElement> & { setDisabled(d: boolean): void };
  tabs<T extends string>(opts: TabsOptions<T>): UiComponent & { select(id: T): void };
  slider(opts: SliderOptions): UiComponent & { set(value: number): void };
  toggle(opts: ToggleOptions): UiComponent & { set(value: boolean): void };
  card(opts: CardOptions): UiComponent;
  meter(opts: MeterOptions): UiComponent & { set(value: number): void };
  tooltip(target: HTMLElement, text: StringKey, vars?: StringVars): UiComponent;
}

export type CreateUi = (deps: UiDeps) => Ui;

// ---- src/audio -------------------------------------------------------------

export interface AudioDeps {
  readonly bus: EpBus;
  readonly settings: () => Settings;
}

export interface AudioLevels {
  readonly peak: number;
  readonly rms: number;
}

export interface AudioApi {
  /** Create or resume the AudioContext; call from the first user gesture. */
  unlock(): Promise<void>;
  readonly unlocked: boolean;
  play(cue: AudioCue): void;
  setMusic(ctx: MusicContext): void;
  /** Duck music for letters and the shutter (ms). */
  duck(ms: number): void;
  applySettings(settings: Settings): void;
  levels(): AudioLevels | null;
  dispose(): void;
}

export type CreateAudio = (deps: AudioDeps) => AudioApi;

// ---- src/save --------------------------------------------------------------

export interface SaveDeps {
  /** null when storage is blocked (the game still plays). */
  readonly storage: StorageLike | null;
  readonly clock: Clock;
  readonly bus?: EpBus;
  readonly build?: string;
}

export interface SaveApi {
  readonly available: boolean;
  hasSave(): boolean;
  load(): LoadResult;
  /** Writes the current save, rotating the previous good one into the backup slot. */
  save(file: SaveFile): SaveResult;
  makeFile(state: SimState, settings: Settings): SaveFile;
  /** Filename `ellies-place-<date>.json` and its JSON text. */
  exportFile(file: SaveFile): { readonly filename: string; readonly json: string };
  /** Validates and migrates; does not replace anything. */
  importText(text: string): ImportResult;
  /** Raw JSON -> current SaveFile, applying migrations. Throws on invalid input. */
  migrate(raw: unknown): SaveFile;
  savePhoto(id: PhotoId, dataUrl: string): SaveResult;
  loadPhoto(id: PhotoId): string | null;
  deletePhoto(id: PhotoId): void;
  /** Autosave on time.hour, mode change, visibilitychange, pagehide; returns stop. */
  startAutosave(getFile: () => SaveFile | null): () => void;
}

export type CreateSave = (deps: SaveDeps) => SaveApi;

// ---- src/activities --------------------------------------------------------

export type RegisterActivity = (def: ActivityDef) => void;

// ---- src/testing -----------------------------------------------------------

export interface TestHookDeps {
  readonly sim: Sim;
  readonly engine: Engine | null;
  readonly content: ContentIndex;
}

/** Installs window.__EP__ only when the URL has ?test=1. Returns the hooks or null. */
export type InstallTestHooks = (deps: TestHookDeps, search: string, target: { __EP__?: TestHooks }) => TestHooks | null;
