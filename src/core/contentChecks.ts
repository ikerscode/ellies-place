/**
 * The deeper content checks behind validateContent (F38): key spellings, every id a Condition or
 * Effect mentions, sprite keys against the art registry, string keys against the tables, and, with
 * `complete`, the required cast, stations, aspirations and lot spots. Pure over the db.
 */
import { BRUCE_SPOTS, CAT_NAMES, HYROX_ORDER, PERSONALITY_NEED, TICKS_PER_GAME_MINUTE, VISITOR_NAMES, ASPIRATION_IDS, ASPIRATION_KEYS } from './types';
import type {
  Condition,
  ContentDb,
  ContentIndex,
  Effect,
  LotSpot,
  SpriteKey,
  StringKey,
  TileKind,
} from './types';
import { aspTierGoalKey, aspTierKey, aspTierRewardKey, intKey, itemDescKey, itemNameKey, mailBodyKey, mailSubjectKey, wishTitleKey } from './keys';
import { itemSpriteKeys } from './rules';

export interface ValidateOptions {
  /** The compiled art registry (`SpriteRegistry` or any set of keys): every sprite key the data mentions must be in it. */
  readonly sprites?: ReadonlySet<string> | ReadonlyMap<string, unknown>;
  /** The merged string table (`STRINGS`): every string key the data mentions must be in it. */
  readonly strings?: Readonly<Record<string, string>>;
  /** Activity ids registered with the activities module. */
  readonly activities?: ReadonlySet<string>;
  /**
   * Require the full cast: four cats, three visitors, eight Hyrox stations, the four aspirations with
   * four tiers, and every required lot spot. Off for small fixtures, on for the real db (the data test and soak).
   */
  readonly complete?: boolean;
}

/** Calls `fn` for a condition and every condition nested inside it. */
export function walkCondition(c: Condition, fn: (c: Condition) => void): void {
  fn(c);
  if (c.kind === 'not') walkCondition(c.of, fn);
  else if (c.kind === 'all' || c.kind === 'any') for (const x of c.of) walkCondition(x, fn);
}

/** Calls `onEffect` for an effect and every effect nested inside it, and `onCondition` for conditions inside `when`. */
export function walkEffect(e: Effect, onEffect: (e: Effect) => void, onCondition: (c: Condition) => void): void {
  onEffect(e);
  if (e.kind === 'chance') {
    for (const x of e.then) walkEffect(x, onEffect, onCondition);
    for (const x of e.else ?? []) walkEffect(x, onEffect, onCondition);
  } else if (e.kind === 'when') {
    walkCondition(e.if, onCondition);
    for (const x of e.then) walkEffect(x, onEffect, onCondition);
    for (const x of e.else ?? []) walkEffect(x, onEffect, onCondition);
  }
}

/** Where a condition or effect list lives, for messages. */
interface Site {
  readonly where: string;
  readonly conditions: readonly Condition[];
  readonly effects: readonly Effect[];
}

function sites(db: ContentDb): Site[] {
  const out: Site[] = [];
  for (const it of db.interactions) {
    out.push({
      where: `interactions: ${it.id}`,
      conditions: [...it.requires.map((r) => r.when), ...(it.visibleIf ? [it.visibleIf] : []), ...(it.unlock ? [it.unlock] : [])],
      effects: [...(it.onStart ?? []), ...it.effects],
    });
  }
  for (const w of db.wishes) out.push({ where: `wishes: ${w.id}`, conditions: [w.offerIf, w.goal], effects: w.rewards });
  for (const a of db.aspirations) a.tiers.forEach((t, i) => out.push({ where: `aspirations: ${a.id} tier ${i + 1}`, conditions: [t.goal], effects: t.rewards }));
  for (const o of db.outfits) out.push({ where: `outfits: ${o.id}`, conditions: [o.unlock], effects: [] });
  for (const m of db.mail) out.push({ where: `mail: ${m.id}`, conditions: [m.sendIf], effects: m.attachments ?? [] });
  for (const s of db.stickers) out.push({ where: `stickers: ${s.id}`, conditions: [s.goal], effects: s.rewards ?? [] });
  for (const o of db.onboarding) out.push({ where: `onboarding: ${o.id}`, conditions: o.waitFor ? [o.waitFor] : [], effects: [] });
  for (const v of db.visitors) out.push({ where: `visitors: ${v.name}`, conditions: [v.appearsIf], effects: [] });
  out.push({ where: 'tuning.housewarming', conditions: [db.tuning.housewarming.unlockIf], effects: [] });
  for (const [who, specs] of Object.entries(db.tuning.needs)) {
    if (typeof specs !== 'object') continue;
    for (const [need, spec] of Object.entries(specs as Record<string, { modifiers?: readonly { when: Condition }[] }>)) {
      out.push({ where: `tuning.needs.${who}.${need}`, conditions: (spec.modifiers ?? []).map((m) => m.when), effects: [] });
    }
  }
  return out;
}

const WALKABLE_SEED: ReadonlySet<TileKind> = new Set<TileKind>(['floor', 'grass', 'path']);

/** Required lot spots for a complete lot (home.md 7, sim.md 12 and 16, play.md 2.5). */
export const REQUIRED_SPOTS: readonly LotSpot[] = [
  'ellieSpawn',
  'mailbox',
  'frontDoor',
  'fence',
  'birdBath',
  'gardenWall',
  'raceTrackStart',
  'raceTrackEnd',
  'deliveryBox',
  'bruce.wall',
  ...BRUCE_SPOTS,
  ...CAT_NAMES.map((c): LotSpot => `${c}Spawn`),
];

export function contentProblems(db: ContentDb, index: ContentIndex, opts: ValidateOptions = {}): string[] {
  const problems: string[] = [];
  const bad = (s: string): number => problems.push(s);
  const hasSprite = (k: string): boolean => (opts.sprites ? opts.sprites.has(k) : true);
  const sprite = (where: string, k: SpriteKey | string | null | undefined): void => {
    if (opts.sprites && k && !hasSprite(k)) bad(`${where}: sprite ${k} is not in the art registry`);
  };
  const str = (where: string, k: StringKey | string | null | undefined): void => {
    if (opts.strings && k && !(k in opts.strings)) bad(`${where}: string ${k} is missing`);
  };
  const spelled = (where: string, got: string, want: string): void => {
    if (got !== want) bad(`${where}: key ${got} should be ${want}`);
  };

  // Key spellings (FROZEN 22) and strings.
  for (const i of db.items) {
    spelled(`items: ${i.id} name`, i.name, itemNameKey(i.id));
    spelled(`items: ${i.id} desc`, i.desc, itemDescKey(i.id));
    str(`items: ${i.id}`, i.name);
    str(`items: ${i.id}`, i.desc);
    str(`items: ${i.id}`, i.unlockHint);
    for (const k of itemSpriteKeys(i)) sprite(`items: ${i.id}`, k);
    if (i.fixture && i.unlock !== 'fixture') bad(`items: ${i.id} is a fixture but unlock is ${i.unlock}`);
    if (i.valueOverride !== undefined && !(i.valueOverride >= 0)) bad(`items: ${i.id} has a negative valueOverride`);
  }
  for (const it of db.interactions) {
    spelled(`interactions: ${it.id} label`, it.label, intKey(it.id));
    str(`interactions: ${it.id}`, it.label);
    sprite(`interactions: ${it.id} icon`, it.icon);
    for (const r of it.requires) str(`interactions: ${it.id} requires`, r.reason);
    if ((it.slotKinds ?? []).some((k) => (it.slotIds ?? []).includes(k))) bad(`interactions: ${it.id} lists a slot id that is also a kind`);
    if (it.duration.kind === 'activity' && opts.activities && !opts.activities.has(it.duration.activity)) {
      bad(`interactions: ${it.id} runs unknown activity ${it.duration.activity}`);
    }
  }
  for (const w of db.wishes) {
    spelled(`wishes: ${w.id} title`, w.title, wishTitleKey(w.id));
    str(`wishes: ${w.id}`, w.title);
    sprite(`wishes: ${w.id}`, w.icon);
    if (!(w.weight >= 0)) bad(`wishes: ${w.id} has a negative weight`);
    if (!(w.size in db.economy.wishHearts)) bad(`wishes: ${w.id} has unknown size ${w.size}`);
  }
  for (const m of db.mail) {
    spelled(`mail: ${m.id} subject`, m.subject, mailSubjectKey(m.id));
    spelled(`mail: ${m.id} body`, m.body, mailBodyKey(m.id));
    str(`mail: ${m.id}`, m.subject);
    str(`mail: ${m.id}`, m.body);
  }
  for (const a of db.aspirations) {
    const key = a.id.replace(/^asp\./, '');
    str(`aspirations: ${a.id}`, a.name);
    str(`aspirations: ${a.id}`, a.desc);
    sprite(`aspirations: ${a.id}`, a.icon);
    a.tiers.forEach((t, i) => {
      const n = (i + 1) as 1 | 2 | 3 | 4;
      const k = key as (typeof ASPIRATION_KEYS)[number];
      spelled(`aspirations: ${a.id} tier ${n} title`, t.title, aspTierKey(k, n));
      if (t.goalText) spelled(`aspirations: ${a.id} tier ${n} goalText`, t.goalText, aspTierGoalKey(k, n));
      if (t.rewardText) spelled(`aspirations: ${a.id} tier ${n} rewardText`, t.rewardText, aspTierRewardKey(k, n));
      str(`aspirations: ${a.id} tier ${n}`, t.title);
      str(`aspirations: ${a.id} tier ${n}`, t.goalText);
      str(`aspirations: ${a.id} tier ${n}`, t.rewardText);
    });
  }
  for (const o of db.outfits) {
    str(`outfits: ${o.id}`, o.name);
    sprite(`outfits: ${o.id}`, o.sprite);
  }
  for (const s of db.stickers) {
    str(`stickers: ${s.id}`, s.name);
    str(`stickers: ${s.id}`, s.desc);
    sprite(`stickers: ${s.id}`, s.icon);
  }
  for (const c of db.cats) str(`cats: ${c.name}`, c.displayName);
  for (const v of db.visitors) str(`visitors: ${v.name}`, v.displayName);
  for (const p of db.paints) {
    str(`paints: ${p.id}`, p.name);
    sprite(`paints: ${p.id} template`, p.template);
  }
  for (const c of db.catalog) {
    str(`catalog: ${c.id}`, c.label);
    sprite(`catalog: ${c.id}`, c.icon);
  }
  for (const r of db.lot.rooms) str(`rooms: ${r.id}`, r.name);
  for (const h of db.hyrox) str(`hyrox: ${h.station}`, h.name);
  for (const o of db.onboarding) {
    for (const l of o.lines) str(`onboarding: ${o.id}`, l);
    str(`onboarding: ${o.id}`, o.hint);
  }

  // Every id a Condition or Effect mentions.
  for (const site of sites(db)) {
    const cond = (c: Condition): void => {
      switch (c.kind) {
        case 'owns':
        case 'placed':
          if (c.item && !index.items.has(c.item)) bad(`${site.where}: unknown item ${c.item}`);
          break;
        case 'wearing':
          if (!index.outfits.has(c.outfit)) bad(`${site.where}: unknown outfit ${c.outfit}`);
          break;
        case 'aspirationTier':
          if (!index.aspirations.has(c.id)) bad(`${site.where}: unknown aspiration ${c.id}`);
          break;
        case 'sticker':
          if (!index.stickers.has(c.id)) bad(`${site.where}: unknown sticker ${c.id}`);
          break;
        case 'setBonus':
          if (!index.setBonuses.has(c.id)) bad(`${site.where}: unknown set bonus ${c.id}`);
          break;
        case 'inRoom':
          if (c.room !== 'outdoor' && c.room !== 'indoor' && !index.rooms.has(c.room)) bad(`${site.where}: unknown room ${c.room}`);
          break;
        case 'cosy':
          if (!['current', 'any', 'home'].includes(c.room) && !index.rooms.has(c.room as never)) bad(`${site.where}: unknown room ${c.room}`);
          break;
        case 'unlocked':
          unlockRef(site.where, c.what);
          break;
        default:
          break;
      }
    };
    const unlockRef = (where: string, w: { kind: string; id: string }): void => {
      const known =
        w.kind === 'item' ? index.items.has(w.id as never)
        : w.kind === 'interaction' ? index.interactions.has(w.id as never)
        : w.kind === 'outfit' ? index.outfits.has(w.id as never)
        : w.kind === 'paint' ? index.paints.has(w.id as never)
        : w.kind === 'activity' && opts.activities ? opts.activities.has(w.id)
        : true;
      if (!known) bad(`${where}: unknown ${w.kind} ${w.id}`);
    };
    const effect = (e: Effect): void => {
      switch (e.kind) {
        case 'grantItem':
        case 'spawn':
          if (!index.items.has(e.item)) bad(`${site.where}: unknown item ${e.item}`);
          break;
        case 'unlock':
          unlockRef(site.where, e.what);
          break;
        case 'sticker':
          if (!index.stickers.has(e.id)) bad(`${site.where}: unknown sticker ${e.id}`);
          break;
        case 'mail':
          if (!index.mail.has(e.id)) bad(`${site.where}: unknown mail ${e.id}`);
          break;
        case 'startActivity':
          if (opts.activities && !opts.activities.has(e.activity)) bad(`${site.where}: unknown activity ${e.activity}`);
          break;
        case 'say':
          str(site.where, e.line);
          break;
        case 'thought':
          sprite(site.where, e.icon);
          break;
        case 'feeling':
          str(site.where, e.label);
          if (e.icon) sprite(site.where, e.icon);
          break;
        default:
          break;
      }
    };
    for (const c of site.conditions) walkCondition(c, cond);
    for (const e of site.effects) walkEffect(e, effect, (c) => walkCondition(c, cond));
  }

  // Lot geometry.
  const { rows, legend } = db.lot;
  const tileAt = (tx: number, ty: number): TileKind | null => {
    const ch = rows[ty]?.[tx];
    return ch === undefined ? null : (legend[ch] ?? null);
  };
  for (const r of db.lot.rooms) {
    const kind = tileAt(r.seed.tx, r.seed.ty);
    if (kind === null || !WALKABLE_SEED.has(kind)) bad(`rooms: ${r.id} seed (${r.seed.tx},${r.seed.ty}) is not on a floor, grass or path tile`);
  }
  db.lot.windows.forEach((w, i) => {
    if (tileAt(w.tile.tx, w.tile.ty) !== 'window') bad(`lot.windows[${i}]: (${w.tile.tx},${w.tile.ty}) is not a window tile`);
  });
  for (const [name, t] of Object.entries(db.lot.spots)) {
    if (t.tx < 0 || t.ty < 0 || t.tx >= db.lot.w || t.ty >= db.lot.h) bad(`lot.spots: ${name} is off the map`);
  }
  for (const p of db.lot.start) {
    if (p.tile.tx < 0 || p.tile.ty < 0 || p.tile.tx >= db.lot.w || p.tile.ty >= db.lot.h) bad(`lot.start: ${p.item} is off the map`);
  }

  // Tuning and economy sanity.
  if (Math.abs(db.tuning.time.minutesPerTick * TICKS_PER_GAME_MINUTE - 1) > 1e-9) bad('tuning.time.minutesPerTick must be 1 / TICKS_PER_GAME_MINUTE (0.05)');
  for (const c of db.cats) {
    if (c.personalityNeed !== PERSONALITY_NEED[c.name]) bad(`cats: ${c.name} personality need ${c.personalityNeed} should be ${PERSONALITY_NEED[c.name]}`);
  }
  if (db.race.medals.length === 0 || db.race.medals[db.race.medals.length - 1]?.underSeconds !== null) bad('race: the last medal must be the finisher medal with underSeconds null');

  if (opts.complete) {
    for (const n of CAT_NAMES) if (!index.cats.has(n)) bad(`cats: missing ${n}`);
    for (const n of VISITOR_NAMES) if (!index.visitors.has(n)) bad(`visitors: missing ${n}`);
    for (const s of HYROX_ORDER) if (!index.hyrox.has(s)) bad(`hyrox: missing station ${s}`);
    for (const id of ASPIRATION_IDS) {
      const a = index.aspirations.get(id);
      if (!a) bad(`aspirations: missing ${id}`);
      else if (a.tiers.length !== 4) bad(`aspirations: ${id} has ${a.tiers.length} tiers, expected 4`);
    }
    for (const spot of REQUIRED_SPOTS) if (!(spot in db.lot.spots)) bad(`lot.spots: missing ${spot}`);
    if (db.lot.windows.length === 0) bad('lot.windows: no windows, so no sunbeams');
    const facings = new Set(db.lot.windows.map((w) => w.facing));
    for (const f of ['left', 'up', 'right'] as const) if (!facings.has(f)) bad(`lot.windows: no window facing ${f} (sim.md 11.3)`);
    if (db.wishes.length === 0) bad('wishes: none');
  }
  return problems;
}
