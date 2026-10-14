/**
 * One builder per string-key and sprite-key family (FROZEN 22, 39, 40; review B3).
 * Code, data and tests build keys here and nowhere else, so a spelling change is a
 * one-line edit and the coverage test can walk the contract enums.
 *
 * Spellings follow design/spec/voice.md and FROZEN 22:
 *   int.<interactionId>, wish.<wishId>, mail.<mailId>.subject|body, item.<ItemId>.name|desc,
 *   build.err.<PlacementError>, ui.need.<need>.name|help, asp.<key>.tier.<n>(.goal|.reward),
 *   ui.<mood|bond|phase|mode|speed|day|category|style|cosy|journal|radio|hyrox>.<value>.
 * Sprite families: icon.int.<glyph>, struct.wall.<style>, struct.door.<kind>,
 * struct.window.<kind>, paint.<paintId>, pattern.<surface>.<variant>, item.<ItemId> (rules.ts).
 */
import {
  ACTIVITY_GRADES,
  CAT_SHARED_NEEDS,
  DAY_PHASES,
  ELLIE_NEEDS,
  GAME_MODES,
  HYROX_ORDER,
  MOOD_BANDS,
  STYLE_TAGS,
  WEEKDAYS,
  asSpriteKey,
  asStringKey,
  type ActivityGrade,
  type AspirationKey,
  type AspirationTierNo,
  type BondLevel,
  type CatNeed,
  type CosyFactor,
  type DayPhase,
  type EllieNeed,
  type GameMode,
  type HyroxStation,
  type InteractionId,
  type ItemCategory,
  type ItemId,
  type JournalTab,
  type MailId,
  type MoodBand,
  type NeedKey,
  type PaintId,
  type PaintSurface,
  type PaintVariant,
  type PlacementError,
  type RadioStation,
  type SkillId,
  type Speed,
  type SpriteKey,
  type StringKey,
  type StyleTag,
  type Weekday,
  type WishId,
} from './types';

// ---- Runtime lists for enums that key strings but had none --------------------
// Built from exhaustive records, so adding a member to the type without listing it here is a compile error.

const rec = <K extends string>(r: Record<K, true>): readonly K[] => Object.keys(r) as K[];

export const PLACEMENT_ERRORS: readonly PlacementError[] = rec<PlacementError>({
  outOfBounds: true,
  blocked: true,
  notFloor: true,
  needsWall: true,
  needsSurface: true,
  surfaceFull: true,
  tooBig: true,
  blocksDoor: true,
  breaksPath: true,
  rotationNotAllowed: true,
  notOwned: true,
  cannotAfford: true,
  fixed: true,
  needsIndoor: true,
  needsOutdoor: true,
  needsWindow: true,
  needsFrontStep: true,
  oneRugPerTile: true,
  maxCopies: true,
});

export const ITEM_CATEGORIES: readonly ItemCategory[] = rec<ItemCategory>({
  seating: true,
  beds: true,
  tables: true,
  storage: true,
  kitchen: true,
  bath: true,
  gym: true,
  lighting: true,
  plants: true,
  catFurniture: true,
  wallDecor: true,
  rugs: true,
  electronics: true,
  garden: true,
  decor: true,
  special: true,
});

export const COSY_FACTORS: readonly CosyFactor[] = rec<CosyFactor>({
  value: true,
  variety: true,
  lighting: true,
  plants: true,
  sets: true,
  cats: true,
  paint: true,
  clutter: true,
});

export const JOURNAL_TABS: readonly JournalTab[] = rec<JournalTab>({
  wishes: true,
  aspirations: true,
  collection: true,
  cats: true,
  photos: true,
  stickers: true,
  records: true,
  mail: true,
  settings: true,
});

export const RADIO_STATIONS: readonly RadioStation[] = rec<RadioStation>({ heavy: true, lofi: true, cosy: true });

export const BOND_LEVELS: readonly BondLevel[] = [0, 1, 2, 3, 4];
export const SPEEDS: readonly Speed[] = [0, 1, 2, 3];

/**
 * Why the sim rejects an action or greys a petal when no `requires` entry gave its own reason
 * (`DispatchResult.reason`, FROZEN 29). Text lives under `ui.reason.<code>`.
 */
export type ReasonCode =
  | 'queueFull'
  | 'queueDropped'
  | 'notNow'
  | 'unreachable'
  | 'slotTaken'
  | 'locked'
  | 'needsItem'
  | 'outsideWindow'
  | 'cooldown'
  | 'asleep'
  | 'busy'
  | 'cannotAfford'
  | 'notOwned'
  | 'orderFull'
  | 'wrongMode'
  | 'debugOnly'
  | 'unknown';
export const REASON_CODES: readonly ReasonCode[] = rec<ReasonCode>({
  queueFull: true,
  queueDropped: true,
  notNow: true,
  unreachable: true,
  slotTaken: true,
  locked: true,
  needsItem: true,
  outsideWindow: true,
  cooldown: true,
  asleep: true,
  busy: true,
  cannotAfford: true,
  notOwned: true,
  orderFull: true,
  wrongMode: true,
  debugOnly: true,
  unknown: true,
});

// ---- String keys ----------------------------------------------------------------

const k = (s: string): StringKey => asStringKey(s);

/** Petal and queue-card label: `int.sofa.sit`. */
export const intKey = (id: InteractionId | string): StringKey => k(`int.${id}`);
/** A requirement reason written for one interaction: `int.sofa.sit.why.1`. */
export const intWhyKey = (id: InteractionId | string, n: number): StringKey => k(`int.${id}.why.${n}`);
/** Wish title: ids do not repeat the prefix, so `wish.bow_george`. */
export const wishTitleKey = (id: WishId | string): StringKey => k(`wish.${id}`);
export const mailSubjectKey = (id: MailId | string): StringKey => k(`mail.${id}.subject`);
export const mailBodyKey = (id: MailId | string): StringKey => k(`mail.${id}.body`);
export const itemNameKey = (id: ItemId | string): StringKey => k(`item.${id}.name`);
export const itemDescKey = (id: ItemId | string): StringKey => k(`item.${id}.desc`);
export const placementErrorKey = (e: PlacementError): StringKey => k(`build.err.${e}`);
export const needNameKey = (n: NeedKey): StringKey => k(`ui.need.${n}.name`);
export const needHelpKey = (n: NeedKey): StringKey => k(`ui.need.${n}.help`);
export const reasonKey = (code: ReasonCode): StringKey => k(`ui.reason.${code}`);

const asp = (a: AspirationKey): string => `asp.${a}`;
export const aspNameKey = (a: AspirationKey): StringKey => k(`${asp(a)}.name`);
export const aspDescKey = (a: AspirationKey): StringKey => k(`${asp(a)}.desc`);
/** Tier title `asp.hyrox.tier.2`, goal text `.goal`, reward text `.reward`. */
export const aspTierKey = (a: AspirationKey, n: AspirationTierNo): StringKey => k(`${asp(a)}.tier.${n}`);
export const aspTierGoalKey = (a: AspirationKey, n: AspirationTierNo): StringKey => k(`${asp(a)}.tier.${n}.goal`);
export const aspTierRewardKey = (a: AspirationKey, n: AspirationTierNo): StringKey => k(`${asp(a)}.tier.${n}.reward`);

export const moodKey = (b: MoodBand): StringKey => k(`ui.mood.${b}`);
export const bondKey = (l: BondLevel): StringKey => k(`ui.bond.${l}`);
export const phaseKey = (p: DayPhase): StringKey => k(`ui.phase.${p}`);
export const modeKey = (m: GameMode): StringKey => k(`ui.mode.${m}`);
export const speedKey = (s: Speed): StringKey => k(`ui.speed.${s}`);
export const dayKey = (d: Weekday): StringKey => k(`ui.day.${d}`);
export const categoryKey = (c: ItemCategory): StringKey => k(`ui.category.${c}`);
export const styleKey = (s: StyleTag): StringKey => k(`ui.style.${s}`);
export const cosyFactorKey = (f: CosyFactor): StringKey => k(`ui.cosy.${f}`);
export const journalKey = (t: JournalTab): StringKey => k(`ui.journal.${t}`);
export const radioKey = (r: RadioStation): StringKey => k(`ui.radio.${r}`);
export const hyroxKey = (s: HyroxStation): StringKey => k(`ui.hyrox.${s}`);
export const skillKey = (s: SkillId): StringKey => (s === 'kitchen' ? k('ui.skill.kitchen') : hyroxKey(s));
export const gradeKey = (g: ActivityGrade): StringKey => k(`grade.${g}`);

/** One row per enum-keyed family the coverage test walks. */
export interface EnumKeyFamily {
  readonly family: string;
  readonly values: readonly string[];
  readonly build: (value: string) => StringKey;
}

const family = <T extends string | number>(name: string, values: readonly T[], build: (v: T) => StringKey): EnumKeyFamily => ({
  family: name,
  values: values.map(String),
  build: (v) => build((typeof values[0] === 'number' ? Number(v) : v) as T),
});

/**
 * Every string key code can build from a contract enum. tests/unit/core/keyCoverage.test.ts checks the
 * real string tables hold each one (a ratchet: the writer empties its allowlist). Keys from content
 * tables (`int.<id>`, items, wishes, mail) are checked by validateContent(db, { strings }) instead.
 */
export const ENUM_KEY_FAMILIES: readonly EnumKeyFamily[] = [
  family('ui.need.name', [...ELLIE_NEEDS, ...CAT_SHARED_NEEDS, 'royalty', 'chaos', 'solitude', 'vibes'] as (EllieNeed | CatNeed)[], needNameKey),
  family('ui.need.help', [...ELLIE_NEEDS, ...CAT_SHARED_NEEDS, 'royalty', 'chaos', 'solitude', 'vibes'] as (EllieNeed | CatNeed)[], needHelpKey),
  family('ui.mood', MOOD_BANDS, moodKey),
  family('ui.bond', BOND_LEVELS, bondKey),
  family('ui.phase', DAY_PHASES, phaseKey),
  family('ui.mode', GAME_MODES, modeKey),
  family('ui.speed', SPEEDS, speedKey),
  family('ui.day', WEEKDAYS, dayKey),
  family('ui.category', ITEM_CATEGORIES, categoryKey),
  family('ui.style', STYLE_TAGS, styleKey),
  family('ui.cosy', COSY_FACTORS, cosyFactorKey),
  family('ui.journal', JOURNAL_TABS, journalKey),
  family('ui.radio', RADIO_STATIONS, radioKey),
  family('ui.hyrox', HYROX_ORDER, hyroxKey),
  family('build.err', PLACEMENT_ERRORS, placementErrorKey),
  family('ui.reason', REASON_CODES, reasonKey),
  family('grade', ACTIVITY_GRADES, gradeKey),
];

/** Flat list of every key the enum families require. */
export function requiredEnumKeys(): StringKey[] {
  return ENUM_KEY_FAMILIES.flatMap((f) => f.values.map((v) => f.build(v)));
}

// ---- Sprite keys ----------------------------------------------------------------

const sk = (s: string): SpriteKey => asSpriteKey(s);

/** Shared interaction glyph (10 x 10): `icon.int.sit`. The fallback is `icon.int.default`. */
export const interactionIconKey = (glyph: string): SpriteKey => sk(`icon.int.${glyph}`);
export const DEFAULT_INTERACTION_ICON: SpriteKey = sk('icon.int.default');
/** Wall pieces by style (`struct.wall.goth`), doors by kind (`struct.door.front`), windows by kind (`struct.window.sash`). */
export const structWallKey = (style: string): SpriteKey => sk(`struct.wall.${style}`);
export const structDoorKey = (kind: string): SpriteKey => sk(`struct.door.${kind}`);
export const structWindowKey = (kind: string): SpriteKey => sk(`struct.window.${kind}`);
/** A one-off paint template: `paint.<paintId>` (FROZEN 40). */
export const paintKey = (id: PaintId | string): SpriteKey => sk(`paint.${id}`);
/** A shared recolourable pattern: `pattern.floor.hex`, `pattern.wall.band` (art-checklist). */
export const patternKey = (surface: PaintSurface, variant: PaintVariant): SpriteKey => sk(`pattern.${surface}.${variant}`);
