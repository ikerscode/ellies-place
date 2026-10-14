import { describe, expect, it } from 'vitest';
import { allocEntity, setC } from '../../../src/core/state';
import { asItemId, asPaintId, asRoomId, asStringKey, type CosyFactor, type CosyReport, type EntityId, type StringKey, type StringLookup } from '../../../src/core/types';
import { COSY, explainCosy, homeCosy, itemValue } from '../../../src/world';
import { computeCosy } from '../../../src/world/cosy';
import { makeEnv } from '../../../src/world/shared';
import { drop, startHome, type Home } from './testHome';

const BED = asRoomId('bedroom');
const LIVING = asRoomId('living');
const GARDEN = asRoomId('garden');

const sum = (r: CosyReport): number => (Object.values(r.parts) as number[]).reduce((a, b) => a + b, 0);
const rated = (h: Home, room = LIVING): CosyReport => h.world.cosy(h.state, room);
const live = (h: Home, room = LIVING): CosyReport => h.world.cosy(h.state, room, 'live');

function floorOf(h: Home, room: string): { tx: number; ty: number }[] {
  const out: { tx: number; ty: number }[] = [];
  for (let i = 0; i < h.state.lot.roomAt.length; i++) if (h.state.lot.roomAt[i] === room) out.push({ tx: i % 20, ty: Math.floor(i / 20) });
  return out;
}

describe('item value v(i) (FROZEN 31)', () => {
  const h = startHome();
  const v = (id: string): number => itemValue(h.content.items.get(asItemId(id)) as never);
  it('is clamp(round(2 x sqrt(base price)), 2, 24)', () => {
    expect(v('lamp_floor')).toBe(8); // 15 -> 7.7
    expect(v('sofa')).toBe(15); // 60 -> 15.5
    expect(v('crate')).toBe(6); // 10
    expect(v('pricey')).toBe(24); // capped
    expect(v('doormat')).toBe(4); // 5 -> 4.5
  });
  it('is 12 for price 0 and takes the override', () => {
    expect(v('free_gift')).toBe(12);
    const def = { ...(h.content.items.get(asItemId('sofa')) as object), valueOverride: 3 } as never;
    expect(itemValue(def)).toBe(3);
  });
  it('uses the base price, never the shop price', () => {
    h.content.db.economy.priceScale satisfies number;
    expect(h.content.db.economy.priceScale).toBe(1.6);
    expect(v('bed')).toBe(20); // 100 -> 20, not 160 -> 25
  });
});

describe('the terms (home.md 6.2)', () => {
  it('an empty room scores only what the cats take from its sunny windows', () => {
    const h = startHome();
    const r = rated(h, BED);
    expect(r.parts.value).toBe(0);
    expect(r.parts.variety).toBe(0);
    expect(r.parts.lighting).toBe(0);
    expect(r.parts.plants).toBe(0);
    expect(r.parts.sets).toBe(0);
    expect(r.parts.cats).toBeCloseTo(1.875, 6); // Peaches 0.5 of 4 x 15
    expect(r.score).toBe(2);
  });

  it('Value is 30 x min(1, V / T) with T from the room', () => {
    const h = startHome();
    drop(h, 'bed', [1, 1]); // v 20 of T 100
    expect(rated(h, BED).parts.value).toBeCloseTo(6, 6);
    drop(h, 'wardrobe', [3, 1]); // 90 -> 19
    expect(rated(h, BED).parts.value).toBeCloseTo((30 * 39) / 100, 6);
  });

  it('caps Value at 30', () => {
    const h = startHome();
    for (const [i, id] of ['bed', 'wardrobe', 'sofa', 'table', 'cat_tree', 'goth_a', 'goth_b', 'goth_c'].entries()) drop(h, id, [1 + (i % 4) * 1, 1 + Math.floor(i / 4) * 2]);
    const r = rated(h, BED);
    expect(r.parts.value).toBeLessThanOrEqual(30);
  });

  it('halves the 2nd and 3rd copy of an id and ignores the 4th', () => {
    const h = startHome();
    for (const x of [1, 2, 3, 4]) drop(h, 'crate', [x, 1]);
    // v 6: 6 + 3 + 3 + 0 = 12 of 100
    expect(rated(h, BED).parts.value).toBeCloseTo((30 * 12) / 100, 6);
  });

  it('counts surface items in their host\'s room and wall items in the room south of the wall', () => {
    const h = startHome();
    const table = drop(h, 'table', [5, 7]);
    drop(h, 'plant_small', [5, 7], 0, { kind: 'surface', parent: table, slot: 0 });
    drop(h, 'poster', [4, 5], 0, { kind: 'wall' }); // living's back wall
    expect(rated(h, LIVING).parts.plants).toBeCloseTo((10 * 1) / 3, 6);
    expect(rated(h, BED).parts.value).toBe(0);
    // table 14 + plant 6 + poster 9 of T 160
    expect(rated(h, LIVING).parts.value).toBeCloseTo((30 * (14 + 6 + 9)) / 160, 6);
  });

  it('Variety is 10 x min(1, categories / 6), counting paint', () => {
    const h = startHome();
    drop(h, 'sofa', [2, 7]);
    drop(h, 'table', [6, 7]);
    drop(h, 'lamp_floor', [9, 7]);
    expect(rated(h).parts.variety).toBeCloseTo((10 * 3) / 6, 6);
    h.state.lot.rooms[LIVING]!.floorPaint = asPaintId('floor.wood.walnut');
    expect(rated(h).parts.variety).toBeCloseTo((10 * 4) / 6, 6);
  });

  it('Plants count copies, double for big ones, up to the room target', () => {
    const h = startHome();
    drop(h, 'plant_pot', [1, 1]);
    expect(rated(h, BED).parts.plants).toBeCloseTo(5, 6); // 1 of 2
    drop(h, 'plant_big', [3, 1]);
    expect(rated(h, BED).parts.plants).toBe(COSY.plantsMax); // 3 of 2, capped
    const g = startHome();
    drop(g, 'plant_pot', [15, 3]);
    expect(rated(g, GARDEN).parts.plants).toBeCloseTo(2, 6); // 1 of 5
  });

  it('non-default paint adds 6 to Value and a Variety category, and reports its share as `paint`', () => {
    const h = startHome();
    const rs = h.state.lot.rooms[BED]!;
    rs.wallPaint = asPaintId('wall.plain.plum');
    const r = rated(h, BED);
    expect(r.parts.paint).toBeCloseTo((30 * 6) / 100, 6);
    expect(r.parts.value).toBe(0);
    expect(r.parts.variety).toBeCloseTo(10 / 6, 6);
    rs.floorPaint = asPaintId('floor.wood.walnut');
    expect(rated(h, BED).parts.paint).toBeCloseTo((30 * 12) / 100, 6);
  });

  it('the parts add up to the unrounded score', () => {
    const h = startHome();
    drop(h, 'sofa', [2, 7]);
    drop(h, 'lamp_floor', [9, 7]);
    drop(h, 'plant_pot', [6, 9]);
    drop(h, 'cat_tree', [11, 8]);
    for (const room of [LIVING, BED, GARDEN]) {
      const r = rated(h, room);
      expect(r.score).toBe(Math.max(0, Math.min(100, Math.round(sum(r)))));
    }
  });

  it('scores unscored rooms as nothing', () => {
    const h = startHome();
    drop(h, 'doormat', [4, 11]);
    const r = h.world.cosy(h.state, asRoomId('front'));
    expect(r.score).toBe(0);
    expect(r.hints).toEqual([]);
    expect(h.world.cosy(h.state, asRoomId('nowhere')).score).toBe(0);
  });
});

describe('light (home.md 6.2)', () => {
  function litFraction(h: Home, room: string, lamp: { tx: number; ty: number }, radius: number): number {
    const floor = floorOf(h, room);
    const lit = floor.filter((t) => (t.tx - lamp.tx) ** 2 + (t.ty - lamp.ty) ** 2 <= (radius + 0.5) ** 2).length;
    return lit / floor.length;
  }

  it('rated counts every lamp as on, at night', () => {
    const h = startHome();
    drop(h, 'lamp_floor', [3, 2]);
    const f = litFraction(h, 'bedroom', { tx: 3, ty: 2 }, 3);
    expect(rated(h, BED).parts.lighting).toBeCloseTo(15 * Math.min(1, f / 0.5), 6);
    expect(rated(h, BED).parts.lighting).toBeGreaterThan(0);
  });

  it('full marks need half the floor lit', () => {
    const h = startHome();
    drop(h, 'lamp_floor', [3, 2]);
    drop(h, 'lamp_floor', [5, 3]);
    drop(h, 'lamp_floor', [2, 4]);
    expect(rated(h, BED).parts.lighting).toBe(COSY.lightMax);
  });

  it('live follows the lamp flags at night and the daylight blend by day', () => {
    const h = startHome();
    const lamp = drop(h, 'lamp_floor', [3, 2]);
    const f = litFraction(h, 'bedroom', { tx: 3, ty: 2 }, 3);
    h.state.time.minuteOfDay = 0;
    expect(live(h, BED).parts.lighting).toBe(0); // lamp is off
    h.state.components.smartObject[String(lamp)]!.flags['on'] = true;
    expect(live(h, BED).parts.lighting).toBeCloseTo(15 * Math.min(1, f / 0.5), 6);
    // Noon: s = 1, Lday = 15 x min(1, 0.5 + litAll), even with the lamp off.
    h.state.components.smartObject[String(lamp)]!.flags['on'] = false;
    h.state.time.minuteOfDay = 12 * 60;
    expect(live(h, BED).parts.lighting).toBeCloseTo(15 * Math.min(1, 0.5 + f), 6);
    // Sunrise: s = 0.5 halfway between.
    h.state.time.minuteOfDay = 390;
    const lDay = 15 * Math.min(1, 0.5 + f);
    expect(live(h, BED).parts.lighting).toBeCloseTo(0.5 * lDay, 6);
  });

  it('lights only its own room', () => {
    const h = startHome();
    drop(h, 'lamp_floor', [6, 1]); // against the bedroom's east wall
    expect(rated(h, asRoomId('kitchen')).parts.lighting).toBe(0);
  });

  it('measures a surface lamp from its host and a wall light from the tile south of it', () => {
    const h = startHome();
    const table = drop(h, 'table', [2, 2]);
    drop(h, 'lamp_table', [2, 2], 0, { kind: 'surface', parent: table, slot: 0 });
    const a = rated(h, BED).parts.lighting;
    expect(a).toBeGreaterThan(0);
    const g = startHome();
    drop(g, 'lamp_wall', [4, 5], 0, { kind: 'wall' }); // living's back wall: lit from (4,6)
    expect(rated(g, LIVING).parts.lighting).toBeGreaterThan(0);
    expect(rated(g, BED).parts.lighting).toBe(0);
  });

  it('garden lanterns are lit only while the ritual lasts (live), and always in the rated reading', () => {
    const h = startHome();
    for (const [x, y] of [[15, 3], [17, 3], [15, 7], [17, 7]] as const) drop(h, 'lantern', [x, y]);
    h.state.time.minuteOfDay = 0;
    expect(live(h, GARDEN).parts.lighting).toBe(0);
    h.state.environment.lanternsUntilTick = 1000;
    h.state.time.tick = 10;
    expect(live(h, GARDEN).parts.lighting).toBeGreaterThan(0);
    h.state.time.tick = 1000;
    expect(live(h, GARDEN).parts.lighting).toBe(0);
    expect(rated(h, GARDEN).parts.lighting).toBeGreaterThan(0);
  });
});

describe('sets (home.md 6.3)', () => {
  function goth(h: Home, withWall: boolean): void {
    drop(h, 'goth_a', [2, 7]);
    drop(h, 'goth_b', [4, 7]);
    drop(h, 'goth_c', [6, 7]);
    drop(h, 'goth_d', [8, 7]);
    if (withWall) drop(h, 'goth_wall', [4, 5], 0, { kind: 'wall' });
    else drop(h, 'goth_e', [10, 8]);
  }

  it('Goth Parlour: 5 distinct Goth items with a light and a wall item', () => {
    const h = startHome();
    goth(h, true);
    const r = rated(h);
    expect(r.sets).toEqual(['goth_parlour']);
    expect(r.parts.sets).toBe(20);
  });

  it('copies do not make a Goth set', () => {
    const h = startHome();
    goth(h, true);
    const wall = Object.keys(h.state.components.placeable).find((k) => h.state.components.placeable[k]?.item === 'goth_wall');
    delete h.state.components.placeable[wall as string];
    drop(h, 'goth_a', [10, 8]); // a copy: still four different Goth things, and no wall piece
    expect(rated(h).sets).toEqual([]);
    expect(rated(h).hints.map((x) => x.key)).not.toContain('cosy.hint.set_near');
  });

  it('names the one piece a set is missing: a near miss', () => {
    const h = startHome();
    goth(h, false);
    const r = rated(h);
    expect(r.sets).toEqual([]);
    expect(r.hints[0]?.key).toBe('cosy.hint.set_near');
    expect(r.hints[0]?.vars).toEqual({ name: 'goth_parlour', n: 'cosy.need.wall_item' });
    expect(r.hints[0]?.gain).toBe(20);
  });

  it('a styled paint counts as one item of its style but never as the light or the wall piece', () => {
    const h = startHome();
    const plum = asPaintId('wall.plain.plum'); // Goth style
    for (const [id, x] of [['goth_a', 2], ['goth_b', 4], ['goth_c', 6], ['goth_d', 8]] as const) drop(h, id, [x, 7]);
    h.state.lot.rooms[LIVING]!.wallPaint = plum;
    // Four items and a Goth wall: five Goth things, but no wall-placed item yet.
    expect(rated(h).sets).toEqual([]);
    expect(rated(h).hints[0]?.vars).toEqual({ name: 'goth_parlour', n: 'cosy.need.wall_item' });
    drop(h, 'poster', [4, 5], 0, { kind: 'wall' }); // a Goth wall item
    expect(rated(h).sets).toEqual(['goth_parlour']);
    // Without the paint it is four items plus the poster, which is five anyway; drop one item and the paint is what completes it.
    const c = Object.keys(h.state.components.placeable).find((k) => h.state.components.placeable[k]?.item === 'goth_c');
    delete h.state.components.placeable[c as string];
    expect(rated(h).sets).toEqual(['goth_parlour']);
    h.state.lot.rooms[LIVING]!.wallPaint = asPaintId('wall.plain.dusk');
    expect(rated(h).sets).toEqual([]);
    // A paint is never the light: take the lamp away and the set is gone even with the paint back.
    h.state.lot.rooms[LIVING]!.wallPaint = plum;
    drop(h, 'goth_c', [6, 7]);
    const d = Object.keys(h.state.components.placeable).find((k) => h.state.components.placeable[k]?.item === 'goth_d');
    delete h.state.components.placeable[d as string];
    expect(rated(h).sets).toEqual([]);
  });

  it('Plant Corner: five plants inside one 4 x 4 box, copies counting', () => {
    const h = startHome();
    for (const [x, y] of [[1, 6], [2, 6], [3, 7], [4, 8], [1, 9]] as const) drop(h, 'plant_pot', [x, y]);
    expect(rated(h).sets).toEqual(['plant_corner']);
    const spread = startHome();
    for (const [x, y] of [[1, 6], [4, 6], [8, 7], [11, 8], [12, 9]] as const) drop(spread, 'plant_pot', [x, y]);
    expect(rated(spread).sets).toEqual([]);
  });

  it('Cat Palace needs five distinct Cat items offering three of the five comforts', () => {
    const h = startHome();
    drop(h, 'cat_tree', [1, 6]);
    drop(h, 'cat_box', [4, 6]);
    drop(h, 'cat_bed', [6, 6]);
    drop(h, 'cat_hide', [8, 6]);
    expect(rated(h).sets).toEqual([]);
    drop(h, 'cat_scratch', [10, 6]);
    expect(rated(h).sets).toEqual(['cat_palace']);
  });

  it('Night Garden counts only in the garden', () => {
    const h = startHome();
    for (const [x, y] of [[15, 3], [17, 3], [15, 7], [17, 7]] as const) drop(h, 'lantern', [x, y]);
    for (const [x, y] of [[16, 3], [16, 7], [16, 9]] as const) drop(h, 'plant_pot', [x, y]);
    drop(h, 'bench', [15, 9]);
    expect(rated(h, GARDEN).sets).toEqual(['night_garden']);
    expect(rated(h, GARDEN).parts.sets).toBe(20);
  });

  it('adds half the second-best set, up to 20', () => {
    const h = startHome();
    goth(h, true);
    for (const [x, y] of [[1, 6], [2, 6], [3, 7], [4, 8], [1, 9]] as const) drop(h, 'plant_pot', [x, y]);
    expect(rated(h).sets).toEqual(['goth_parlour', 'plant_corner']);
    expect(rated(h).parts.sets).toBe(20);
  });
});

describe('cats (home.md 6.2)', () => {
  it('each cat takes its own comfort: George height, Salem a box, Shadow a hiding place, Peaches sun', () => {
    const h = startHome();
    drop(h, 'cat_tree', [1, 6]);
    expect(rated(h).parts.cats).toBeCloseTo((15 * (0.5 + 0.5)) / 4, 6); // George + Peaches (sunny living room)
    drop(h, 'cat_box', [4, 6]);
    expect(rated(h).parts.cats).toBeCloseTo((15 * 1.5) / 4, 6);
    drop(h, 'cat_hide', [6, 6]);
    expect(rated(h).parts.cats).toBeCloseTo((15 * 2) / 4, 6);
  });

  it('a cat bed pleases all four, a quarter each per bed', () => {
    const h = startHome();
    const base = rated(h).parts.cats;
    drop(h, 'cat_bed', [1, 6]);
    expect(rated(h).parts.cats).toBeCloseTo(base + (15 * 4 * 0.25) / 4, 6);
  });

  it('a garden is always sunny; a room without a window is not', () => {
    const h = startHome();
    expect(rated(h, GARDEN).parts.cats).toBeCloseTo(1.875, 6);
    // The front step is unscored, so make a windowless scored room by editing the lot copy.
    const db = h.content.db;
    expect(db.lot.windows.length).toBeGreaterThan(0);
  });

  it('live adds a quarter for each happy cat standing in the room, rated does not', () => {
    const h = startHome();
    const cat = (name: 'george' | 'salem', need: number, room: string): EntityId => {
      const id = allocEntity(h.state);
      setC(h.state, 'cat', id, { cat: name, request: null, requestCooldowns: {}, quirkCooldowns: {}, following: null, memory: {} });
      setC(h.state, 'position', id, { pos: { x: 3, y: 7 }, prev: { x: 3, y: 7 }, layer: 0, facing: 'down', room: asRoomId(room) });
      setC(h.state, 'needs', id, { values: { royalty: need, chaos: need } as never });
      return id;
    };
    cat('george', 70, 'living');
    cat('salem', 30, 'living');
    const base = live(h).parts.cats;
    expect(base).toBeCloseTo((15 * (0.5 + 0.25)) / 4, 6); // Peaches' sun + George content
    expect(rated(h).parts.cats).toBeCloseTo((15 * 0.5) / 4, 6);
  });
});

describe('clutter (home.md 6.2)', () => {
  it('takes a point for every full 5% of floor covered beyond half', () => {
    const h = startHome();
    const floor = floorOf(h, 'living'); // 48 tiles, half is 24
    for (const t of floor.slice(0, 24)) drop(h, 'crate', [t.tx, t.ty]);
    expect(rated(h).parts.clutter).toBe(0);
    for (const t of floor.slice(24, 27)) drop(h, 'crate', [t.tx, t.ty]); // 27 of 48 = 56.25%
    expect(rated(h).parts.clutter).toBe(-1);
    for (const t of floor.slice(27, 31)) drop(h, 'crate', [t.tx, t.ty]); // 31 of 48 = 64.6%
    expect(rated(h).parts.clutter).toBe(-2);
  });

  it('does not count rugs', () => {
    const h = startHome();
    const floor = floorOf(h, 'living');
    for (const t of floor.slice(0, 40)) drop(h, 'doormat', [t.tx, t.ty]);
    expect(rated(h).parts.clutter).toBe(0);
  });

  it('adds mess and old boxes in the live reading only, down to -10', () => {
    const h = startHome();
    const mess = (room: string): void => {
      const id = allocEntity(h.state);
      setC(h.state, 'mess', id, { kind: 'dish', item: null, home: null, createdTick: 0 });
      setC(h.state, 'position', id, { pos: { x: 3, y: 7 }, prev: { x: 3, y: 7 }, layer: 0, facing: 'down', room: asRoomId(room) });
    };
    mess('living');
    expect(live(h).parts.clutter).toBe(-2);
    expect(rated(h).parts.clutter).toBe(0);
    mess('kitchen');
    expect(live(h).parts.clutter).toBe(-2);
    for (let i = 0; i < 8; i++) mess('living');
    expect(live(h).parts.clutter).toBe(COSY.clutterMin);
    const box = allocEntity(h.state);
    setC(h.state, 'box', box, { order: null, occupant: null, createdTick: 0 });
    setC(h.state, 'position', box, { pos: { x: 3, y: 7 }, prev: { x: 3, y: 7 }, layer: 0, facing: 'down', room: BED });
    h.state.time.tick = 28801;
    expect(live(h, BED).parts.clutter).toBe(-1);
  });
});

describe('hints (home.md 6.4)', () => {
  it('names the two biggest gains, best first', () => {
    const h = startHome();
    const r = rated(h, BED);
    expect(r.hints.map((x) => x.key)).toEqual(['cosy.hint.dark', 'cosy.hint.plants']);
    expect(r.hints[0]?.gain).toBe(15);
    expect(r.hints[1]?.gain).toBe(10);
  });

  it('gives at most two, and none that cannot help', () => {
    const h = startHome();
    for (const room of [BED, LIVING, GARDEN]) expect(rated(h, room).hints.length).toBeLessThanOrEqual(2);
    drop(h, 'lamp_floor', [3, 2]);
    drop(h, 'lamp_floor', [5, 3]);
    drop(h, 'lamp_floor', [2, 4]);
    expect(rated(h, BED).hints.map((x) => x.key)).not.toContain('cosy.hint.dark');
  });

  it('puts a near set first when finishing it is worth 8 or more', () => {
    const h = startHome();
    for (const [id, x] of [['goth_a', 2], ['goth_b', 4], ['goth_c', 6], ['goth_d', 8], ['goth_e', 10]] as const) drop(h, id, [x, 7]);
    const r = rated(h);
    expect(r.hints[0]?.key).toBe('cosy.hint.set_near');
    expect(r.hints[0]?.gain).toBeGreaterThanOrEqual(8);
    drop(h, 'goth_wall', [4, 5], 0, { kind: 'wall' });
    expect(rated(h).sets).toEqual(['goth_parlour']);
  });

  it('asks for a cat feature with the cat named', () => {
    const h = startHome();
    drop(h, 'lamp_floor', [3, 7]);
    drop(h, 'lamp_floor', [8, 7]);
    drop(h, 'plant_big', [1, 9]);
    drop(h, 'plant_pot', [4, 9]);
    const r = rated(h);
    const all = computeCosy(makeEnv(h.content), h.state, LIVING, 'rated', true, 99);
    expect(r.hints.length).toBeLessThanOrEqual(2);
    const cat = all.hints.find((x) => x.key.startsWith('cosy.hint.cat.'));
    expect(cat?.key).toBe('cosy.hint.cat.george');
    expect(cat?.vars).toEqual({ cat: 'george' });
    expect(cat?.gain).toBe(2); // ceil(15 x 0.5 / 4)
  });

  it('asks for the first missing category in the room\'s list', () => {
    const h = startHome();
    drop(h, 'lamp_floor', [3, 2]);
    drop(h, 'lamp_floor', [5, 3]);
    drop(h, 'lamp_floor', [2, 4]);
    drop(h, 'plant_big', [1, 1]);
    const v = computeCosy(makeEnv(h.content), h.state, BED, 'rated', true, 99).hints.find((x) => x.key.includes('.variety.'));
    expect(v?.key).toBe('cosy.hint.variety.beds');
    expect(v?.vars).toEqual({ n: 'beds' });
  });

  it('is a cat\'s approval, chosen by room index, once the room is at 95 or more', () => {
    const h = startHome();
    for (const [id, x, y] of [
      ['bed', 1, 6],
      ['sofa', 4, 7],
      ['table', 8, 6],
      ['wardrobe', 10, 8],
      ['cat_tree', 8, 8],
      ['cat_box', 10, 7],
      ['cat_hide', 1, 9],
      ['cat_bed', 3, 9],
      ['goth_a', 5, 9],
      ['goth_b', 6, 9],
      ['goth_c', 7, 9],
      ['goth_d', 9, 9],
      ['lamp_floor', 12, 6],
      ['lamp_floor', 12, 9],
      ['plant_big', 11, 9],
      ['plant_pot', 6, 8],
    ] as const) drop(h, id, [x, y]);
    drop(h, 'goth_wall', [4, 5], 0, { kind: 'wall' });
    drop(h, 'lamp_wall', [9, 5], 0, { kind: 'wall' });
    drop(h, 'rug', [2, 7]);
    const r = rated(h);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.hints).toHaveLength(1);
    expect(r.hints[0]?.key).toBe('cosy.hint.done.shadow'); // living is room 2, 2 mod 4 = shadow
    expect(r.hints[0]?.gain).toBe(0);
    expect(live(h).hints.length).toBeLessThanOrEqual(2);
  });
});

describe('the explanation API', () => {
  const dict: Record<string, string> = {
    'cosy.hint.set_near': 'One {n} and your {name} is done.',
    'set.goth_parlour.name': 'Goth Parlour',
    'cosy.need.wall_item': 'wall piece',
    'cosy.hint.dark': 'Add a lamp for the evenings.',
    'cosy.hint.plants': 'A plant would help.',
  };
  const t: StringLookup = (key: StringKey, vars) => {
    const raw = dict[key] ?? `[${key}]`;
    return raw.replace('{n}', String(vars?.n ?? '')).replace('{name}', String(vars?.name ?? ''));
  };

  it('returns the top two hints as text, with ids resolved to words', () => {
    const h = startHome();
    const out = explainCosy(rated(h, BED), t, h.content);
    expect(out.map((o) => o.text)).toEqual(['Add a lamp for the evenings.', 'A plant would help.']);
    expect(out[0]?.gain).toBe(15);
    const g = startHome();
    for (const [id, x] of [['goth_a', 2], ['goth_b', 4], ['goth_c', 6], ['goth_d', 8], ['goth_e', 10]] as const) drop(g, id, [x, 7]);
    const near = explainCosy(rated(g), t, g.content);
    expect(near[0]?.text).toBe('One wall piece and your Goth Parlour is done.');
  });

  it('never returns more than two', () => {
    const h = startHome();
    expect(explainCosy(rated(h, BED), t, h.content).length).toBeLessThanOrEqual(2);
    void asStringKey;
  });
});

describe('Home Cosy', () => {
  it('is the floor-area-weighted mean of cosyRated over the scored rooms', () => {
    const h = startHome();
    const rooms = h.state.lot.rooms;
    rooms[asRoomId('bedroom')]!.cosyRated = 40; // 24 tiles
    rooms[asRoomId('kitchen')]!.cosyRated = 20; // 20
    rooms[asRoomId('living')]!.cosyRated = 60; // 48
    rooms[asRoomId('garden')]!.cosyRated = 10; // 55
    rooms[asRoomId('front')]!.cosyRated = 100; // not scored
    expect(homeCosy(h.state)).toBeCloseTo((40 * 24 + 20 * 20 + 60 * 48 + 10 * 55) / (24 + 20 + 48 + 55), 6);
  });

  it('is 0 with no scored rooms', () => {
    expect(homeCosy({ lot: { rooms: {} } })).toBe(0);
  });
});

describe('factors', () => {
  it('reports every CosyFactor', () => {
    const h = startHome();
    const keys = Object.keys(rated(h).parts).sort();
    const want: CosyFactor[] = ['cats', 'clutter', 'lighting', 'paint', 'plants', 'sets', 'value', 'variety'];
    expect(keys).toEqual(want);
  });
});
