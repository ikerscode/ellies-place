/**
 * Pure helpers for the frozen Wave 1 rules (design/spec/FROZEN.md): mood steps
 * and the Hearts multiplier, need floors, minigame result scores, shop prices
 * and unlock codes. Sim, activities, data and tests share these so the
 * formulas exist once.
 */
import {
  ASPIRATION_KEYS,
  AUTO_NEED_FACTOR,
  CAT_NAMES,
  MOOD_STEPS,
  NEED_FLOORS,
  PASS_SCORE,
  SKIP_NEED_FACTOR,
  type ActivityResult,
  type AspirationKey,
  type ActionSource,
  type AspirationTierNo,
  type CatName,
  type EconomyTable,
  type FlagKey,
  type ItemDef,
  type ItemSpriteState,
  type JsonPrimitive,
  type Mount,
  type MoodStepDef,
  type NeedKey,
  type ParsedUnlock,
  type Placement,
  type Rotation,
  type SpriteKey,
  type UnlockCode,
  asSpriteKey,
} from './types';

/** Rounds half up, robust to float noise (10 x 1.15 is 11.4999... and rounds to 12). */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

// ---- Mood -------------------------------------------------------------------

/** The mood step for a 0..100 mood value (sim.md 3.3). */
export function moodStepOf(mood: number): MoodStepDef {
  let out = MOOD_STEPS[0] as MoodStepDef;
  for (const s of MOOD_STEPS) if (mood >= s.atLeast) out = s;
  return out;
}

/** Hearts multiplier (x0.8 to x1.5) at a mood value. */
export function heartsMultiplierOf(mood: number): number {
  return moodStepOf(mood).hearts;
}

/** A mood-scaled Hearts amount: base x multiplier, rounded half up (sim.md 3.3). */
export function scaleHearts(base: number, mood: number): number {
  return roundHalfUp(base * heartsMultiplierOf(mood));
}

/** Base trickle for one awake game hour before scaling: the highest row met, else 0 (FROZEN 2). */
export function trickleBase(mood: number, economy: Pick<EconomyTable, 'trickle'>): number {
  let out = 0;
  let best = -Infinity;
  for (const row of economy.trickle) {
    if (mood >= row.atMood && row.atMood > best) {
      best = row.atMood;
      out = row.hearts;
    }
  }
  return out;
}

// ---- Needs ------------------------------------------------------------------

export function needFloor(need: NeedKey): number {
  return NEED_FLOORS[need];
}

/** Clamps a need value into [floor, 100]. */
export function clampNeed(need: NeedKey, value: number): number {
  const lo = NEED_FLOORS[need];
  return value < lo ? lo : value > 100 ? 100 : value;
}

// ---- Minigame results (FROZEN 4) ---------------------------------------------

/** The score used for Hearts, XP, race time and wishes. */
export function resultScore(r: Pick<ActivityResult, 'skipped' | 'score'>): number {
  return r.skipped ? PASS_SCORE : r.score;
}

/** The multiplier on positive need and Fitness effects. */
export function needFactor(r: Pick<ActivityResult, 'skipped' | 'score' | 'auto'>): number {
  if (r.skipped) return SKIP_NEED_FACTOR;
  if (r.auto) return AUTO_NEED_FACTOR;
  return 0.8 + 0.4 * Math.min(1, Math.max(0, r.score));
}

/** Skips and auto-play never set a PB. */
export function canSetPb(r: Pick<ActivityResult, 'skipped' | 'auto'>): boolean {
  return !r.skipped && !r.auto;
}

// ---- Prices (FROZEN 13) ------------------------------------------------------

/** Shop price from a home.md base price: base x scale to the nearest step, at least one step; 0 stays 0. */
export function priceOf(base: number, economy: Pick<EconomyTable, 'priceScale' | 'priceStep'>): number {
  if (base <= 0) return 0;
  const step = economy.priceStep;
  return Math.max(step, roundHalfUp((base * economy.priceScale) / step) * step);
}

// ---- Unlock codes ------------------------------------------------------------

function posInt(s: string): number | null {
  return /^[1-9][0-9]*$/.test(s) ? Number(s) : null;
}

/** Parses an unlock code; null if it is malformed. */
export function parseUnlockCode(code: string): ParsedUnlock | null {
  if (code === 'start') return { kind: 'start' };
  if (code === 'fixture') return { kind: 'fixture' };
  let m = /^day:(.+)$/.exec(code);
  if (m) {
    const day = posInt(m[1] ?? '');
    return day === null ? null : { kind: 'day', day };
  }
  m = /^asp\.([a-z]+)\.([1-4])$/.exec(code);
  if (m) {
    const key = m[1] as AspirationKey;
    if (!ASPIRATION_KEYS.includes(key)) return null;
    return { kind: 'aspiration', aspiration: key, tier: Number(m[2]) as AspirationTierNo };
  }
  m = /^bond:([a-z]+):([1-4])$/.exec(code);
  if (m) {
    const cat = m[1] as CatName;
    if (!CAT_NAMES.includes(cat)) return null;
    return { kind: 'bond', cat, level: Number(m[2]) as 1 | 2 | 3 | 4 };
  }
  m = /^poe:(.+)$/.exec(code);
  if (m) {
    const trinkets = posInt(m[1] ?? '');
    return trinkets === null ? null : { kind: 'poe', trinkets };
  }
  m = /^secret:([a-z0-9_]+)$/.exec(code);
  if (m) return { kind: 'secret', secret: m[1] ?? '' };
  return null;
}

export function isUnlockCode(code: string): code is UnlockCode {
  return parseUnlockCode(code) !== null;
}

/** Secret and Poe unlocks arrive with a free first copy; every other unlock gives none (FROZEN 12). */
export function unlockGivesFreeCopy(code: UnlockCode): boolean {
  const p = parseUnlockCode(code);
  return p !== null && (p.kind === 'secret' || p.kind === 'poe');
}

/** The flag a `secret:<id>` code reads. */
export function secretFlag(secret: string): FlagKey {
  return `secret.${secret}`;
}

// ---- Placement ---------------------------------------------------------------

/** home.md orientations column to allowed rotations. */
export function rotationsFor(orientations: 1 | 2 | 4): readonly Rotation[] {
  return orientations === 4 ? [0, 1, 2, 3] : orientations === 2 ? [0, 1] : [0];
}

/**
 * How an item with this placement code attaches once placed. Fixtures keep their real
 * mount (FROZEN 30): they move and rotate like anything else, they just cannot be sold or stored.
 */
export function mountOf(placement: Placement): Mount {
  switch (placement) {
    case 'rug':
      return 'rug';
    case 'wall':
      return 'wall';
    case 'window':
      return 'window';
    case 'surface':
      return 'surface';
    default:
      return 'floor';
  }
}

// ---- Flags -------------------------------------------------------------------

/** Cat discovery flag for the journal (ui.md 25): `known.<cat>.<kind>.<id>`. */
export function knownFlag(cat: CatName, kind: 'like' | 'dislike' | 'quirk', id: string): FlagKey {
  return `known.${cat}.${kind}.${id}`;
}

// ---- Actions -----------------------------------------------------------------

/** Free will and the cat AI queue autonomous entries (sim.md 6.3); the player and scripts do not. */
export function isAutonomousSource(source: ActionSource): boolean {
  return source === 'freeWill' || source === 'ai';
}

// ---- Item sprites (FROZEN 21, F14) --------------------------------------------

type SpriteItem = Pick<ItemDef, 'id' | 'rotations' | 'states'>;

const ROTATION_SUFFIX: Readonly<Record<Rotation, string>> = { 0: '', 1: '.r1', 2: '.r2', 3: '.r1' };

/** Rotation key part: none for 0, `.r1` for 1 and 3 (3 is 1 flipped), `.r2` for 2. */
function baseItemKey(item: Pick<ItemDef, 'id'>, rotation: Rotation): string {
  return `item.${item.id}${ROTATION_SUFFIX[rotation]}`;
}

/** The state suffix the flags select: `on`, then `open`, then `full` (a flag that is exactly `true`), if the item has that state. */
function activeState(item: Pick<ItemDef, 'states'>, flags: Readonly<Record<string, JsonPrimitive>> | undefined): ItemSpriteState | null {
  const states = item.states ?? [];
  for (const st of ['on', 'open', 'full'] as const) if (states.includes(st) && flags?.[st] === true) return st;
  return null;
}

export interface ItemSpriteRef {
  /** The key to draw. */
  readonly key: SpriteKey;
  /** Rotation 3 draws the `.r1` sprite mirrored. */
  readonly flipX: boolean;
  /** The companion drawn on the overhead layer (canopy, blanket, box front), or null. */
  readonly overhead: SpriteKey | null;
}

/**
 * Which sprite an item shows (F14): `item.<id>`, plus `.r1` (rotation 1, and rotation 3 flipped)
 * or `.r2`, then `.on`, `.open` or `.full` when that flag is true in `smartObject.flags` and the
 * item has the state. Rotation comes before state: `item.record_player.r1.on`. If `has` is given and
 * a state or rotation sprite is missing from the atlas (the checklist leaves back-view states
 * undrawn), it falls back state first, then to the plain rotation key.
 * `.overhead` is a second sprite on the overhead layer with the same rotation suffix.
 */
export function itemSpriteKey(
  item: SpriteItem,
  rotation: Rotation,
  flags?: Readonly<Record<string, JsonPrimitive>>,
  has?: (key: SpriteKey) => boolean,
): ItemSpriteRef {
  const base = baseItemKey(item, rotation);
  const st = activeState(item, flags);
  let key = asSpriteKey(st ? `${base}.${st}` : base);
  if (has && !has(key)) key = asSpriteKey(base);
  const ovKey = asSpriteKey(`${base}.overhead`);
  const overhead = (item.states ?? []).includes('overhead') && (!has || has(ovKey)) ? ovKey : null;
  return { key, flipX: rotation === 3, overhead };
}

/**
 * Every sprite key an item needs in the atlas: each allowed rotation, with and without each of
 * its states (rotation 3 reuses `.r1`). validateContent checks these against the registry; the
 * art checklist is generated from the same rule.
 */
export function itemSpriteKeys(item: SpriteItem): SpriteKey[] {
  const out = new Set<string>();
  for (const r of item.rotations) {
    const base = baseItemKey(item, r);
    out.add(base);
    for (const st of item.states ?? []) out.add(`${base}.${st}`);
  }
  return [...out].map(asSpriteKey);
}
