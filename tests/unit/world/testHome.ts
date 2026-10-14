/**
 * A small flat for the world tests: bedroom, kitchen, living room, a garden and a front step, with
 * windows on three walls, three doors and one item of every placement kind. It is built on the shared
 * fixture content, so nothing here depends on the real tables in src/content/data.
 */
import { buildContentIndex } from '../../../src/core/content';
import { allocEntity, createEmptySimState, getC } from '../../../src/core/state';
import {
  asEntityId,
  asItemId,
  asPaintId,
  asRoomId,
  asSetBonusId,
  asSpriteKey,
  asStringKey,
  type ContentDb,
  type ContentIndex,
  type EntityId,
  type ItemDef,
  type ItemId,
  type JsonPrimitive,
  type LotDef,
  type MountRef,
  type PaintDef,
  type RoomDef,
  type Rotation,
  type SetBonusDef,
  type SimEvent,
  type SimPlugin,
  type SimState,
  type SlotDef,
  type StyleTag,
  type SystemContext,
  type TilePos,
  type World,
} from '../../../src/core/types';
import { createManualClock } from '../../../src/core/clock';
import { createWorld } from '../../../src/world';
import { FIXTURE_START, makeFixtureContent } from '../core/fixtures';

export const ROWS: readonly string[] = [
  '#^^######^^###======',
  '#bbbbbb#kkkkk#pgggg|',
  '#bbbbbb#kkkkk>pgggg|',
  '<bbbbbb#kkkkkDpgggg|',
  '#bbbbbb#kkkkk#pgggg|',
  '###d######d###pgggg|',
  '#llllllllllll#pgggg|',
  '<llllllllllll>pgggg|',
  '<llllllllllll#pgggg|',
  '#llllllllllll#pgggg|',
  '####D###vv####pgggg|',
  'hhhooohhhhhhhhpgggg-',
];

export const LEGEND: LotDef['legend'] = {
  '#': 'wall',
  '=': 'wall',
  '^': 'window',
  v: 'window',
  '<': 'window',
  '>': 'window',
  b: 'floor',
  k: 'floor',
  l: 'floor',
  p: 'floor',
  o: 'floor',
  g: 'grass',
  d: 'door',
  D: 'door',
  '|': 'fence',
  '-': 'fence',
  h: 'fence',
};

const room = (id: string, kind: RoomDef['kind'], outdoor: boolean, seed: TilePos, wall: string, floor: string, scored: boolean, cosyTarget?: number, plantTarget?: number): RoomDef => ({
  id: asRoomId(id),
  name: asStringKey(`room.${id}`),
  kind,
  outdoor,
  seed,
  wallPaint: asPaintId(wall),
  floorPaint: asPaintId(floor),
  scored,
  ...(cosyTarget !== undefined ? { cosyTarget } : {}),
  ...(plantTarget !== undefined ? { plantTarget } : {}),
});

export const ROOMS: readonly RoomDef[] = [
  room('bedroom', 'bedroom', false, { tx: 2, ty: 2 }, 'wall.plain.lavender', 'floor.carpet.plum', true, 100, 2),
  room('kitchen', 'kitchen', false, { tx: 9, ty: 2 }, 'wall.tiles.cream', 'floor.check.cream', true, 130, 2),
  room('living', 'living', false, { tx: 3, ty: 7 }, 'wall.plain.dusk', 'floor.wood.oak', true, 160, 3),
  room('garden', 'garden', true, { tx: 16, ty: 5 }, 'wall.plain.plaster', 'floor.patio.stone', true, 150, 5),
  room('front', 'frontStep', true, { tx: 4, ty: 11 }, 'wall.plain.plaster', 'floor.patio.stone', false),
];

const paint = (id: string, surface: 'wall' | 'floor', unlock: PaintDef['unlock'] = 'start', styles: readonly StyleTag[] = []): PaintDef => ({
  id: asPaintId(id),
  name: asStringKey(`paint.${id}`),
  surface,
  variant: 'plain',
  template: asSpriteKey('pattern.wall.plain'),
  sound: 'wood',
  colors: ['#ffffff'],
  styles,
  price: 0,
  cosy: 1,
  unlock,
});

export const PAINTS: readonly PaintDef[] = [
  paint('wall.plain.lavender', 'wall'),
  paint('wall.tiles.cream', 'wall'),
  paint('wall.plain.dusk', 'wall'),
  paint('wall.plain.plaster', 'wall'),
  paint('wall.plain.plum', 'wall', 'start', ['goth']),
  paint('wall.paper.roses', 'wall', 'asp.home.1', ['cottage']),
  paint('floor.carpet.plum', 'floor'),
  paint('floor.check.cream', 'floor'),
  paint('floor.wood.oak', 'floor'),
  paint('floor.patio.stone', 'floor'),
  paint('floor.patio.brick', 'floor', 'asp.home.1'),
  paint('floor.wood.walnut', 'floor'),
];

const sit: SlotDef = { id: 'sit', kind: 'sit', dx: 0, dy: 0, facing: 'down', layer: 0, for: [{ kind: 'anyone' }] };

type ItemSpec = Partial<Omit<ItemDef, 'id'>>;

export const item = (id: string, spec: ItemSpec = {}): ItemDef => ({
  id: asItemId(id),
  name: asStringKey(`item.${id}.name`),
  desc: asStringKey(`item.${id}.desc`),
  category: 'decor',
  styles: [],
  tags: [],
  price: 40,
  placement: 'floor',
  footprint: { w: 1, h: 1 },
  rotations: [0, 1, 2, 3],
  slots: [],
  interactions: [],
  unlock: 'start',
  mvp: true,
  ...spec,
});

const surfaceOne = { dx: 0, dy: 0, maxW: 1, maxH: 1 } as const;

/** One item per placement kind, plus the pieces the Cosy and set tests lean on. */
export const ITEMS: readonly ItemDef[] = [
  item('bed', { category: 'beds', price: 100, placement: 'in', footprint: { w: 2, h: 3 }, topLayer: 1, slots: [{ ...sit, id: 'lie', kind: 'lie' }] }),
  item('sofa', { category: 'seating', price: 60, placement: 'in', footprint: { w: 3, h: 1 }, topLayer: 1, slots: [sit, { ...sit, id: 'seat2', dx: 1 }] }),
  item('table', {
    category: 'tables',
    price: 50,
    placement: 'in',
    footprint: { w: 2, h: 1 },
    topLayer: 1,
    surfaceSlots: [surfaceOne, { ...surfaceOne, dx: 1 }],
  }),
  item('shelf_wall', { category: 'storage', price: 30, placement: 'wall', footprint: { w: 1, h: 1 }, rotations: [0], surfaceSlots: [surfaceOne] }),
  item('crate', { category: 'storage', price: 10, placement: 'floor', footprint: { w: 1, h: 1 } }),
  item('wardrobe', { category: 'storage', price: 90, placement: 'in', footprint: { w: 2, h: 1 }, topLayer: 2, tags: ['cat_perch_high'] }),
  item('lamp_floor', { category: 'lighting', price: 15, placement: 'floor', light: { radius: 3, color: '#ffd9a0', intensity: 0.8, flag: 'on' }, flags: { on: false } }),
  item('lamp_table', { category: 'lighting', price: 15, placement: 'surface', rotations: [0], light: { radius: 2, color: '#ffd9a0', intensity: 0.6, flag: 'on' }, flags: { on: false } }),
  item('lamp_wall', { category: 'lighting', price: 20, placement: 'wall', rotations: [0], light: { radius: 3, color: '#ffd9a0', intensity: 0.6 } }),
  item('lantern', { category: 'lighting', price: 15, placement: 'out', tags: ['lantern'], light: { radius: 3, color: '#ffe9a0', intensity: 0.7, flag: 'on' }, flags: { on: false } }),
  item('plant_pot', { category: 'plants', price: 10, placement: 'floor', styles: ['plant'], tags: ['plant'] }),
  item('plant_big', { category: 'plants', price: 30, placement: 'floor', styles: ['plant'], tags: ['plant'], footprint: { w: 2, h: 1 } }),
  item('tray', { category: 'decor', price: 12, placement: 'surface', rotations: [0], footprint: { w: 2, h: 1 } }),
  item('plant_small', { category: 'plants', price: 8, placement: 'surface', rotations: [0], styles: ['plant'], tags: ['plant'] }),
  item('rug', { category: 'rugs', price: 25, placement: 'rug', footprint: { w: 2, h: 2 }, rotations: [0, 1], blocksPath: false }),
  item('doormat', { category: 'rugs', price: 5, placement: 'rug', rotations: [0], blocksPath: false }),
  item('poster', { category: 'wallDecor', price: 20, placement: 'wall', rotations: [0], styles: ['goth'] }),
  item('banner', { category: 'wallDecor', price: 20, placement: 'wall', footprint: { w: 2, h: 1 }, rotations: [0] }),
  item('curtain', { category: 'decor', price: 20, placement: 'window', rotations: [0] }),
  item('bench', { category: 'seating', price: 40, placement: 'out', footprint: { w: 2, h: 1 }, tags: ['sit'], slots: [sit] }),
  item('fridge', { category: 'kitchen', price: 80, placement: 'in', tags: ['cottage'], styles: ['cottage'] }),
  item('cat_tree', { category: 'catFurniture', price: 70, placement: 'in', footprint: { w: 1, h: 2 }, topLayer: 2, styles: ['cat'], tags: ['cat_perch_high'] }),
  item('cat_box', { category: 'catFurniture', price: 20, placement: 'floor', styles: ['cat'], tags: ['cat_box', 'cat_play'] }),
  item('cat_bed', { category: 'catFurniture', price: 30, placement: 'in', styles: ['cat'], tags: ['cat_nap'], blocksPath: false }),
  item('cat_hide', { category: 'catFurniture', price: 30, placement: 'in', styles: ['cat'], tags: ['cat_hide'] }),
  item('cat_scratch', { category: 'catFurniture', price: 30, placement: 'in', styles: ['cat'], tags: ['cat_scratch'] }),
  item('goth_a', { category: 'seating', price: 40, styles: ['goth'], placement: 'in' }),
  item('goth_b', { category: 'tables', price: 40, styles: ['goth'], placement: 'in' }),
  item('goth_c', { category: 'storage', price: 40, styles: ['goth'], placement: 'in' }),
  item('goth_d', { category: 'lighting', price: 40, styles: ['goth'], placement: 'in', light: { radius: 2, color: '#fff', intensity: 0.5 } }),
  item('goth_e', { category: 'decor', price: 40, styles: ['goth'], placement: 'in' }),
  item('goth_wall', { category: 'wallDecor', price: 40, styles: ['goth'], placement: 'wall', rotations: [0] }),
  item('mailbox', { category: 'special', price: 20, placement: 'front', fixture: true, unlock: 'fixture', hidden: true, rotations: [0] }),
  item('old_tree', { category: 'plants', price: 80, placement: 'out', footprint: { w: 2, h: 2 }, fixture: true, unlock: 'fixture', hidden: true, styles: ['plant'], tags: ['plant'], rotations: [0] }),
  item('locked_thing', { category: 'decor', price: 40, unlock: 'asp.home.1' }),
  item('only_one', { category: 'decor', price: 40, maxCopies: 1 }),
  item('pricey', { category: 'decor', price: 20000 }),
  item('free_gift', { category: 'decor', price: 0, unlock: 'secret:gift' }),
];

export const SETS: readonly SetBonusDef[] = [
  {
    id: asSetBonusId('goth_parlour'),
    name: asStringKey('set.goth_parlour.name'),
    requires: [{ style: 'goth', count: 5 }, { tag: 'lighting', count: 1 }, { tag: 'wall', count: 1 }],
    cosy: 20,
  },
  { id: asSetBonusId('plant_corner'), name: asStringKey('set.plant_corner.name'), requires: [{ style: 'plant', count: 5 }], cosy: 12 },
  { id: asSetBonusId('cat_palace'), name: asStringKey('set.cat_palace.name'), requires: [{ style: 'cat', count: 5 }], cosy: 20 },
  {
    id: asSetBonusId('night_garden'),
    name: asStringKey('set.night_garden.name'),
    requires: [{ tag: 'lighting', count: 4 }, { tag: 'plant', count: 3 }, { tag: 'sit', count: 1 }],
    cosy: 20,
  },
];

export interface Spec {
  readonly item: string;
  readonly tile: readonly [number, number];
  readonly rotation?: Rotation;
  readonly onto?: { readonly index: number; readonly slot: number };
}

export function makeHomeDb(start: readonly Spec[] = []): ContentDb {
  const base = makeFixtureContent();
  const lot: LotDef = {
    w: 20,
    h: 12,
    rows: ROWS,
    legend: LEGEND,
    rooms: ROOMS,
    start: start.map((s) => ({ item: asItemId(s.item), tile: { tx: s.tile[0], ty: s.tile[1] }, rotation: s.rotation ?? 0, ...(s.onto ? { onto: s.onto } : {}) })),
    spots: { ellieSpawn: { tx: 3, ty: 7 }, frontDoor: { tx: 4, ty: 10 } },
    windows: ROWS.flatMap((row, ty) =>
      [...row].flatMap((ch, tx) => {
        const facing = ({ '^': 'up', v: 'down', '>': 'right', '<': 'left' } as const)[ch as '^' | 'v' | '>' | '<'];
        return facing ? [{ tile: { tx, ty }, facing }] : [];
      }),
    ),
  };
  return { ...base, lot, items: ITEMS, paints: PAINTS, setBonuses: SETS, interactions: [], aspirations: [] };
}

export interface Home {
  readonly content: ContentIndex;
  readonly world: World;
  readonly plugin: SimPlugin;
  readonly state: SimState;
  readonly events: SimEvent[];
  readonly ctx: SystemContext;
}

/** A started game on the test flat: `init('newGame')` has run, so the lot and the start furniture exist. */
export function startHome(start: readonly Spec[] = [], seed = 7): Home {
  const content = buildContentIndex(makeHomeDb(start));
  const world = createWorld(content);
  const plugin = world.plugin();
  const state = createEmptySimState(seed, FIXTURE_START);
  const events: SimEvent[] = [];
  const ctx: SystemContext = {
    state,
    content,
    world,
    emit: (e) => events.push(e),
    dtGameMin: 0.05,
    dtActionMin: 0.05,
    dtMinutes: 0.05,
    clock: createManualClock(),
  };
  plugin.init?.(ctx, 'newGame');
  state.hearts.balance = 5000;
  return { content, world, plugin, state, events, ctx };
}

export const ground = (): MountRef => ({ kind: 'floor' });

export function at(tx: number, ty: number): TilePos {
  return { tx, ty };
}

/** Dispatches through the plugin's handler the way the sim would. */
export function act(h: Home, action: Parameters<NonNullable<NonNullable<SimPlugin['actions']>['build.place']>>[1] | Record<string, unknown>) {
  const a = action as { type: string };
  const handler = (h.plugin.actions as Record<string, ((ctx: SystemContext, action: unknown) => unknown) | undefined>)[a.type];
  if (!handler) throw new Error(`no handler for ${a.type}`);
  return handler(h.ctx, action) as { ok: true } | { ok: false; reason: string };
}

export function mountFor(def: ItemDef): MountRef {
  const p = def.placement;
  return p === 'rug' ? { kind: 'rug' } : p === 'wall' ? { kind: 'wall' } : p === 'window' ? { kind: 'window' } : { kind: 'floor' };
}

/** Places an item through `build.place` (bought), returning its entity. Throws on a refusal. */
export function buy(h: Home, id: string, tile: readonly [number, number], rotation: Rotation = 0, mount?: MountRef): EntityId {
  const def = h.content.items.get(asItemId(id)) as ItemDef;
  const before = h.state.nextEntityId;
  const r = act(h, {
    type: 'build.place',
    source: 'buy',
    request: { item: def.id, tile: at(tile[0], tile[1]), rotation, mount: mount ?? mountFor(def) },
  });
  if (!r.ok) throw new Error(`buy ${id} at ${tile.join(',')}: ${r.reason}`);
  return asEntityId(before);
}

/** Spawns an item straight into the state (no Hearts, no checks), for arranging a scene. */
export function drop(h: Home, id: string, tile: readonly [number, number], rotation: Rotation = 0, mount?: MountRef, flags?: Record<string, JsonPrimitive>): EntityId {
  const def = h.content.items.get(asItemId(id)) as ItemDef;
  const eid = allocEntity(h.state);
  const m = mount ?? mountFor(def);
  h.state.components.meta[String(eid)] = { kind: 'item', name: null, bornTick: 0 };
  h.state.components.placeable[String(eid)] = { item: def.id, tile: at(tile[0], tile[1]), rotation, mount: m, placedTick: 0, origin: 'bought' };
  h.state.components.smartObject[String(eid)] = { reservations: {}, flags: { ...(def.flags ?? {}), ...(flags ?? {}) } };
  h.state.lot.revision += 1;
  return eid;
}

export const placeableOf = (h: Home, id: EntityId) => getC(h.state, 'placeable', id);
export const itemId = (s: string): ItemId => asItemId(s);
