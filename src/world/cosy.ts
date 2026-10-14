/**
 * The Cosy score (home.md 6): Value + Variety + Light + Plants + Sets + Cats + Clutter, per room,
 * in a `rated` reading (night, all lights on, no cats or mess) and a `live` one.
 * Everything comes from content (items, paints, set bonuses, room targets); nothing is hard-coded
 * per item. The few rules the data format cannot express are in SET_EXTRA below.
 */
import {
  asStringKey,
  clamp,
  getC,
  entitiesWith,
  minutesToTicks,
  type CatName,
  type CosyFactor,
  type CosyHint,
  type CosyReading,
  type CosyReport,
  type DeepReadonly,
  type EntityId,
  type ItemCategory,
  type ItemDef,
  type RoomId,
  type RoomKind,
  type SetBonusDef,
  type SetBonusId,
  type SimState,
  type StringKey,
  type TilePos,
} from '../core';
import { FLOORISH, isRug, placedItems, roomOfPlaced, tilesOf, windowInside, type Placed, type WorldEnv } from './shared';
import { sunRooms } from './sun';

type St = DeepReadonly<SimState>;

export const COSY = {
  /** home.md 5: a non-default wall or floor paint each add this much item value. */
  paintValue: 6,
  valueMax: 30,
  varietyMax: 10,
  varietyCategories: 6,
  lightMax: 15,
  lightHalfLit: 0.5,
  plantsMax: 10,
  setsMax: 20,
  catsMax: 15,
  clutterMin: -10,
  /** Overcrowding starts above this share of floor tiles covered. */
  crowdStart: 0.5,
  crowdStep: 0.05,
  liveCatNeed: 60,
} as const;

const CAT_ORDER: readonly CatName[] = ['george', 'salem', 'shadow', 'peaches'];

/** home.md 6.4 variety lists, by room kind, in hint order. Item categories use the contract names. */
const VARIETY: Readonly<Partial<Record<RoomKind, readonly ItemCategory[]>>> = {
  bedroom: ['beds', 'lighting', 'storage', 'rugs', 'wallDecor', 'plants', 'tables', 'catFurniture'],
  bathroom: ['bath', 'lighting', 'plants', 'wallDecor', 'rugs', 'storage'],
  spare: ['gym', 'lighting', 'rugs', 'wallDecor', 'plants', 'seating'],
  living: ['seating', 'electronics', 'lighting', 'rugs', 'wallDecor', 'plants', 'tables', 'catFurniture'],
  kitchen: ['kitchen', 'tables', 'seating', 'lighting', 'plants', 'wallDecor', 'catFurniture'],
  garden: ['garden', 'lighting', 'plants', 'seating', 'catFurniture', 'decor'],
};

/** Where a set may be earned (home.md 6.3 "Room" column), which SetBonusDef has no field for. */
const SET_ROOM: Readonly<Record<string, 'indoor' | RoomKind>> = {
  goth_parlour: 'indoor',
  cottage_kitchen: 'indoor',
  retro_lounge: 'indoor',
  royal_court: 'indoor',
  neon_den: 'indoor',
  night_garden: 'garden',
  candlelit_bath: 'bathroom',
};

const CAT_FEATURES: readonly (readonly string[])[] = [
  ['cat_perch_high'],
  ['cat_hide'],
  ['cat_play', 'cat_box'],
  ['cat_nap'],
  ['cat_scratch'],
];

export const daylight = (minute: number): number => {
  if (minute >= 450 && minute <= 1110) return 1;
  if (minute <= 330 || minute >= 1230) return 0;
  return minute < 450 ? (minute - 330) / 120 : (1230 - minute) / 120;
};

/** v(i) from the base price (FROZEN 31), or the override. */
export function itemValue(def: ItemDef): number {
  if (def.valueOverride !== undefined) return def.valueOverride;
  if (def.price <= 0) return 12;
  return clamp(Math.round(2 * Math.sqrt(def.price)), 2, 24);
}

interface RItem extends Placed {
  readonly traits: ReadonlySet<string>;
  /** Tile used for light, plant corner and sun: host tile for surface items, the floor tile south of a wall item. */
  readonly anchor: TilePos;
}

interface SetEval {
  readonly def: SetBonusDef;
  readonly met: boolean;
  /** Requirement entries not met (count of entries). */
  readonly missing: readonly number[];
  /** 0..1 share of required units present. */
  readonly progress: number;
  readonly allowed: boolean;
}

interface Ctx {
  readonly env: WorldEnv;
  readonly state: St;
  readonly room: RoomId;
  readonly reading: CosyReading;
  readonly kind: RoomKind;
  readonly floor: readonly number[];
  readonly items: readonly RItem[];
  readonly nonDefaultWall: boolean;
  readonly nonDefaultFloor: boolean;
  readonly roomIndex: number;
}

function wallPaintStyle(env: WorldEnv, state: St, room: RoomId, surface: 'wall' | 'floor'): readonly string[] {
  const rs = state.lot.rooms[room];
  if (!rs) return [];
  const id = surface === 'wall' ? rs.wallPaint : rs.floorPaint;
  return env.content.paints.get(id)?.styles ?? [];
}

function itemsInRoom(env: WorldEnv, state: St, room: RoomId): RItem[] {
  const placed = placedItems(state, env.content);
  const byId = new Map<EntityId, Placed>(placed.map((p) => [p.id, p]));
  const out: RItem[] = [];
  for (const p of placed) {
    if (roomOfPlaced(env, state, p, byId) !== room) continue;
    let anchor: TilePos = p.pl.tile;
    const m = p.pl.mount;
    if (m.kind === 'wall') anchor = { tx: p.pl.tile.tx, ty: p.pl.tile.ty + 1 };
    else if (m.kind === 'window') anchor = windowInside(env, state, p.pl.tile) ?? p.pl.tile;
    else if (m.kind === 'surface') {
      const host = byId.get(m.parent);
      if (host) anchor = host.pl.tile;
    }
    out.push({ ...p, traits: env.traits.get(p.def.id) ?? new Set<string>(), anchor });
  }
  return out;
}

// ---- Value, variety, plants -----------------------------------------------------

function valueOf(c: Ctx): { value: number; paintPart: number; sum: number } {
  const copies = new Map<string, number>();
  let sum = 0;
  for (const it of c.items) {
    const n = (copies.get(it.def.id) ?? 0) + 1;
    copies.set(it.def.id, n);
    const v = itemValue(it.def);
    sum += n === 1 ? v : n <= 3 ? v / 2 : 0;
  }
  const paint = (c.nonDefaultWall ? COSY.paintValue : 0) + (c.nonDefaultFloor ? COSY.paintValue : 0);
  const rd = c.env.content.rooms.get(c.room);
  const target = rd?.cosyTarget ?? Math.max(1, c.floor.length * 2.2);
  const value = COSY.valueMax * Math.min(1, (sum + paint) / target);
  const without = COSY.valueMax * Math.min(1, sum / target);
  return { value, paintPart: value - without, sum: sum + paint };
}

function categoriesOf(c: Ctx): Set<string> {
  const s = new Set<string>();
  for (const it of c.items) s.add(it.def.category);
  if (c.nonDefaultWall || c.nonDefaultFloor) s.add('paint');
  return s;
}

const isPlant = (it: RItem): boolean => it.traits.has('plant') || it.def.category === 'plants';
const plantWeight = (it: RItem): number => (it.def.footprint.w * it.def.footprint.h >= 2 ? 2 : 1);

function plantsOf(c: Ctx): number {
  const rd = c.env.content.rooms.get(c.room);
  const target = rd?.plantTarget ?? 2;
  let n = 0;
  for (const it of c.items) if (isPlant(it)) n += plantWeight(it);
  return COSY.plantsMax * Math.min(1, n / Math.max(1, target));
}

// ---- Light ------------------------------------------------------------------------

function lightOn(c: Ctx, it: RItem): boolean {
  if (!it.def.light) return false;
  if (c.reading === 'rated') return true;
  const isLantern = it.traits.has('lantern') || it.def.id.includes('lantern');
  if (isLantern) {
    const until = c.state.environment.lanternsUntilTick;
    return until !== null && c.state.time.tick < until;
  }
  const flag = it.def.light.flag;
  if (flag === undefined) return true;
  const so = getC(c.state, 'smartObject', it.id);
  const flags = so?.flags ?? it.def.flags ?? {};
  return flags[flag] === true;
}

function lightOf(c: Ctx): { light: number; litOn: number; litAll: number } {
  const area = c.floor.length;
  if (area === 0) return { light: 0, litOn: 0, litAll: 0 };
  const w = c.state.lot.w;
  const litAll = new Set<number>();
  const litOn = new Set<number>();
  for (const it of c.items) {
    const spec = it.def.light;
    if (!spec) continue;
    const on = lightOn(c, it);
    const r2 = (spec.radius + 0.5) * (spec.radius + 0.5);
    for (const i of c.floor) {
      const dx = (i % w) - it.anchor.tx;
      const dy = Math.floor(i / w) - it.anchor.ty;
      if (dx * dx + dy * dy <= r2) {
        litAll.add(i);
        if (on) litOn.add(i);
      }
    }
  }
  const fAll = litAll.size / area;
  const fOn = (c.reading === 'rated' ? litAll.size : litOn.size) / area;
  const lNight = COSY.lightMax * Math.min(1, fOn / COSY.lightHalfLit);
  const lDay = COSY.lightMax * Math.min(1, 0.5 + fAll);
  const s = c.reading === 'rated' ? 0 : daylight(c.state.time.minuteOfDay);
  return { light: s * lDay + (1 - s) * lNight, litOn: fOn, litAll: fAll };
}

// ---- Sets ---------------------------------------------------------------------------

function roomAllowsSet(c: Ctx, id: string): boolean {
  const rule = SET_ROOM[id];
  if (rule === undefined) return true;
  const rs = c.state.lot.rooms[c.room];
  if (rule === 'indoor') return !!rs && !rs.outdoor && rs.kind !== 'frontStep';
  return c.kind === rule;
}

function plantBoxOk(c: Ctx, need: number): boolean {
  const plants = c.items.filter(isPlant);
  const pts: { x: number; y: number }[] = plants.map((p) => ({ x: p.anchor.tx, y: p.anchor.ty }));
  if (pts.length < need) return false;
  for (const p of pts) {
    for (let ox = 0; ox < 4; ox++) {
      for (let oy = 0; oy < 4; oy++) {
        const x0 = p.x - ox;
        const y0 = p.y - oy;
        const n = pts.filter((q) => q.x >= x0 && q.x < x0 + 4 && q.y >= y0 && q.y < y0 + 4).length;
        if (n >= need) return true;
      }
    }
  }
  return false;
}

function evalSet(c: Ctx, def: SetBonusDef): SetEval {
  const allowed = roomAllowsSet(c, def.id);
  const missing: number[] = [];
  let have = 0;
  let want = 0;
  def.requires.forEach((req, idx) => {
    const ids = new Set<string>();
    let copies = 0;
    for (const it of c.items) {
      if (req.item !== undefined && it.def.id !== req.item) continue;
      if (req.style !== undefined && !it.def.styles.includes(req.style)) continue;
      if (req.tag !== undefined && !it.traits.has(req.tag)) continue;
      ids.add(it.def.id);
      copies++;
    }
    // Plants and tags count copies (home.md 6.3); every other style counts distinct ids.
    const byCopies = req.item !== undefined || (req.tag !== undefined && req.style === undefined) || req.style === 'plant';
    let n = byCopies ? copies : ids.size;
    if (req.style !== undefined && req.tag === undefined && req.item === undefined) {
      if (c.nonDefaultWall && wallPaintStyle(c.env, c.state, c.room, 'wall').includes(req.style)) n++;
      if (c.nonDefaultFloor && wallPaintStyle(c.env, c.state, c.room, 'floor').includes(req.style)) n++;
    }
    have += Math.min(n, req.count);
    want += req.count;
    if (n < req.count) missing.push(idx);
  });
  let met = missing.length === 0 && def.requires.length > 0;
  if (met && def.id === 'cat_palace') {
    const feats = new Set<number>();
    for (const it of c.items) CAT_FEATURES.forEach((g, i) => g.some((t) => it.traits.has(t)) && feats.add(i));
    if (feats.size < 3) met = false;
  }
  if (met && def.id === 'plant_corner' && !plantBoxOk(c, Math.max(...def.requires.map((r) => r.count), 1))) met = false;
  return { def, met: met && allowed, missing, progress: want === 0 ? 0 : have / want, allowed };
}

function setsTerm(bonuses: readonly number[]): number {
  const sorted = [...bonuses].sort((a, b) => b - a);
  return Math.min(COSY.setsMax, (sorted[0] ?? 0) + 0.5 * (sorted[1] ?? 0));
}

// ---- Cats ----------------------------------------------------------------------------

type Comfort = Record<CatName, number>;

function catComfort(c: Ctx): Comfort {
  const cm: Comfort = { george: 0, salem: 0, shadow: 0, peaches: 0 };
  const has = (it: RItem, tags: readonly string[]) => tags.some((t) => it.traits.has(t));
  let nap = 0;
  let sunny = c.kind === 'garden' || sunRooms(c.env, c.state).has(c.room);
  let warm = false;
  for (const it of c.items) {
    if (has(it, ['cat_perch_high', 'cat_throne'])) cm.george += 0.5;
    if (has(it, ['cat_play', 'cat_box'])) cm.salem += 0.5;
    if (has(it, ['cat_hide'])) cm.shadow += 0.5;
    if (it.traits.has('cat_sunbathe')) sunny = true;
    if (has(it, ['listen_records', 'listen_radio', 'cat_warm'])) warm = true;
    if (it.def.category === 'catFurniture' && it.traits.has('cat_nap')) nap += 0.25;
  }
  if (sunny) cm.peaches += 0.5;
  if (warm) cm.peaches += 0.5;
  for (const k of CAT_ORDER) cm[k] += nap;
  if (c.reading === 'live') {
    for (const id of entitiesWith(c.state, 'cat')) {
      const cat = getC(c.state, 'cat', id);
      const pos = getC(c.state, 'position', id);
      if (!cat || !pos || pos.room !== c.room) continue;
      const need = c.env.content.cats.get(cat.cat)?.personalityNeed;
      const v = need ? (getC(c.state, 'needs', id)?.values[need] ?? 0) : 0;
      if (v >= COSY.liveCatNeed) cm[cat.cat] += 0.25;
    }
  }
  for (const k of CAT_ORDER) cm[k] = Math.min(1, cm[k]);
  return cm;
}

// ---- Clutter -------------------------------------------------------------------------

function overcrowding(c: Ctx): number {
  if (c.floor.length === 0) return 0;
  const w = c.state.lot.w;
  const inRoom = new Set(c.floor);
  const covered = new Set<number>();
  for (const it of c.items) {
    if (it.pl.mount.kind !== 'floor' || isRug(it.def)) continue;
    for (const t of tilesOf(it)) {
      const i = t.ty * w + t.tx;
      if (inRoom.has(i)) covered.add(i);
    }
  }
  const b = covered.size / c.floor.length;
  if (b <= COSY.crowdStart) return 0;
  return -Math.floor((b - COSY.crowdStart) / COSY.crowdStep + 1e-9);
}

function liveMess(c: Ctx): number {
  let pen = 0;
  for (const id of entitiesWith(c.state, 'mess')) {
    if (getC(c.state, 'position', id)?.room === c.room) pen -= 2;
  }
  const day = minutesToTicks(1440);
  for (const id of entitiesWith(c.state, 'box')) {
    const box = getC(c.state, 'box', id);
    if (box && box.occupant === null && getC(c.state, 'position', id)?.room === c.room && c.state.time.tick - box.createdTick > day) pen -= 1;
  }
  return pen;
}

// ---- Report ----------------------------------------------------------------------------

function makeCtx(env: WorldEnv, state: St, room: RoomId, reading: CosyReading): Ctx | null {
  const rs = state.lot.rooms[room];
  if (!rs) return null;
  const rd = env.content.rooms.get(room);
  const floor: number[] = [];
  for (let i = 0; i < state.lot.roomAt.length; i++) if (state.lot.roomAt[i] === room && FLOORISH.has(state.lot.tiles[i] as never)) floor.push(i);
  return {
    env,
    state,
    room,
    reading,
    kind: rs.kind,
    floor,
    items: itemsInRoom(env, state, room),
    nonDefaultWall: !!rd && rd.kind !== 'garden' && rd.kind !== 'frontStep' && rs.wallPaint !== rd.wallPaint,
    nonDefaultFloor: !!rd && rs.floorPaint !== rd.floorPaint,
    roomIndex: env.content.db.lot.rooms.findIndex((r) => r.id === room),
  };
}

const ZERO_PARTS: Readonly<Record<CosyFactor, number>> = { value: 0, variety: 0, lighting: 0, plants: 0, sets: 0, cats: 0, paint: 0, clutter: 0 };

export function computeCosy(env: WorldEnv, state: St, room: RoomId, reading: CosyReading = 'rated', withHints = true): CosyReport {
  const c = makeCtx(env, state, room, reading);
  if (!c || !c.state.lot.rooms[room]?.scored) return { room, reading, score: 0, parts: ZERO_PARTS, sets: [], hints: [] };

  const val = valueOf(c);
  const cats = categoriesOf(c);
  const variety = COSY.varietyMax * Math.min(1, cats.size / COSY.varietyCategories);
  const lt = lightOf(c);
  const plants = plantsOf(c);
  const evals = env.content.db.setBonuses.map((d) => evalSet(c, d));
  const metSets = evals.filter((e) => e.met).sort((a, b) => b.def.cosy - a.def.cosy || (a.def.id < b.def.id ? -1 : 1));
  const sets = setsTerm(metSets.map((e) => e.def.cosy));
  const comfort = catComfort(c);
  const catsTerm = (COSY.catsMax * CAT_ORDER.reduce((s, k) => s + comfort[k], 0)) / 4;
  const crowd = overcrowding(c);
  const clutter = Math.max(COSY.clutterMin, crowd + (reading === 'live' ? liveMess(c) : 0));

  const raw = val.value + variety + lt.light + plants + sets + catsTerm + clutter;
  const score = clamp(Math.round(raw), 0, 100);
  const parts: Record<CosyFactor, number> = {
    value: val.value - val.paintPart,
    variety,
    lighting: lt.light,
    plants,
    sets,
    cats: catsTerm,
    // The share of the Value term that non-default paint earns; `value` is the rest, so the parts sum to the raw score.
    paint: val.paintPart,
    clutter,
  };
  const hints = withHints ? makeHints(c, { parts, score, evals, metSets, comfort, cats, crowd }) : [];
  return { room, reading, score, parts, sets: metSets.map((e) => e.def.id as SetBonusId), hints };
}

// ---- Hints (home.md 6.4) -------------------------------------------------------------

interface HintInput {
  readonly parts: Readonly<Record<CosyFactor, number>>;
  readonly score: number;
  readonly evals: readonly SetEval[];
  readonly metSets: readonly SetEval[];
  readonly comfort: Comfort;
  readonly cats: ReadonlySet<string>;
  readonly crowd: number;
}

const k = (s: string): StringKey => asStringKey(s);

function needKey(def: SetBonusDef, idx: number): string {
  const r = def.requires[idx];
  if (!r) return 'cosy.need.item';
  if (r.tag === 'lighting' || r.tag === 'light') return 'cosy.need.light';
  if (r.tag === 'wall') return 'cosy.need.wall_item';
  if (r.tag !== undefined && r.tag.startsWith('cat_')) return `cosy.need.cat_feature.${r.tag.slice(4)}`;
  if (r.style !== undefined) return `cosy.need.${r.style}_item`;
  if (r.tag !== undefined) return `cosy.need.${r.tag}`;
  return 'cosy.need.item';
}

function makeHints(c: Ctx, h: HintInput): readonly CosyHint[] {
  if (c.reading === 'rated' && h.score >= 95) {
    const cat = CAT_ORDER[(c.roomIndex < 0 ? 0 : c.roomIndex) % 4] as CatName;
    return [{ key: k(`cosy.hint.done.${cat}`), gain: 0 }];
  }
  if (h.score >= 95) return [];
  const cands: { order: number; hint: CosyHint }[] = [];
  const bonuses = h.metSets.map((e) => e.def.cosy);
  const currentSets = setsTerm(bonuses);

  // set_near: a set missing exactly one requirement entry.
  let bestNear: CosyHint | null = null;
  for (const e of h.evals) {
    if (e.met || !e.allowed || e.missing.length !== 1) continue;
    const gain = setsTerm([...bonuses, e.def.cosy]) - currentSets;
    if (gain <= 0) continue;
    if (!bestNear || gain > bestNear.gain) {
      bestNear = { key: k('cosy.hint.set_near'), vars: { name: e.def.id, n: needKey(e.def, e.missing[0] as number) }, gain };
    }
  }
  if (bestNear) cands.push({ order: 0, hint: bestNear });

  if (h.parts.lighting < 10) cands.push({ order: 1, hint: { key: k('cosy.hint.dark'), gain: COSY.lightMax - h.parts.lighting } });

  let lowest: CatName = 'george';
  for (const cat of CAT_ORDER) if (h.comfort[cat] < h.comfort[lowest]) lowest = cat;
  if (h.comfort[lowest] < 0.5) {
    cands.push({ order: 2, hint: { key: k(`cosy.hint.cat.${lowest}`), vars: { cat: lowest }, gain: Math.ceil((COSY.catsMax * (0.5 - h.comfort[lowest])) / 4) } });
  }
  if (h.parts.plants < COSY.plantsMax) cands.push({ order: 3, hint: { key: k('cosy.hint.plants'), gain: COSY.plantsMax - h.parts.plants } });

  if (h.parts.variety < COSY.varietyMax) {
    const list = VARIETY[c.kind] ?? [];
    const missing = list.find((cat) => !h.cats.has(cat));
    if (missing) cands.push({ order: 4, hint: { key: k(`cosy.hint.variety.${missing}`), vars: { n: missing }, gain: COSY.varietyMax / COSY.varietyCategories } });
  }
  if (h.parts.value < COSY.valueMax) cands.push({ order: 5, hint: { key: k('cosy.hint.value'), gain: Math.min(COSY.valueMax - h.parts.value, 3) } });

  if (h.metSets.length === 0) {
    const open = h.evals.filter((e) => e.allowed && e.def.requires.length > 0);
    if (open.length > 0 && !open.some((e) => e.progress >= 0.5)) {
      const best = [...open].sort((a, b) => b.progress - a.progress)[0] as SetEval;
      cands.push({ order: 6, hint: { key: k('cosy.hint.set_idea'), vars: { name: best.def.id }, gain: 0.25 * best.def.cosy } });
    }
  }
  if (h.crowd < 0) cands.push({ order: 7, hint: { key: k('cosy.hint.crowded'), gain: -h.crowd } });

  cands.sort((a, b) => {
    const aw = a.order === 0 && a.hint.gain >= 8 ? 0 : 1;
    const bw = b.order === 0 && b.hint.gain >= 8 ? 0 : 1;
    if (aw !== bw) return aw - bw;
    return b.hint.gain - a.hint.gain || a.order - b.order;
  });
  return cands.slice(0, 2).map((x) => x.hint);
}

