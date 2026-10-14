/**
 * The flat and its garden (design/spec/home.md 2 and 3): tile map, rooms, doors, windows, the
 * starting furniture and the named spots the systems look up.
 *
 * Legend notes (FROZEN 27, 30):
 * - `^ v > <` are window tiles; the char is the direction the window faces OUTWARD, so the lot's
 *   `windows` list is derived from the rows and cannot drift from them.
 * - `a` (archway) and the interior and exterior doors are `door` tiles; they belong to no room.
 * - `m` (mailbox) is a walkable `path` tile: the mailbox fixture blocks it, and keeping it walkable lets the
 *   front step flood-fill as one room (home.md 2.2 lists 6 front tiles; this makes it 7 with the mailbox tile).
 * - `h` hedge and the garden fences are `fence`; the garden wall `=` is a `wall` tile that takes wall items.
 */
import {
  asItemId,
  asPaintId,
  asRoomId,
  asStringKey,
  type Facing,
  type LotDef,
  type Rotation,
  type RoomDef,
  type StartPlacement,
  type TileKind,
  type TilePos,
} from '../../core';

export const LOT_ROWS: readonly string[] = [
  '###^^#####^#####^^###=========',
  '#bbbbbbb#tttt#ssssss#pggggggg|',
  '#bbbbbbb#tttt#ssssss>pggggggg|',
  '<bbbbbbb#tttt#ssssss#pggggggg|',
  '#bbbbbbb#tttt#ssssssDpggggggg|',
  '#bbbbbbb#tttt#ssssss#pggggggg|',
  '#bbbbbbb#tttt#ssssss#pggggggg|',
  '####d#####d#####d####pggggggg|',
  '#llllllllll#kkkkkkkk#pggggggg|',
  '#llllllllll#kkkkkkkk>pggggggg|',
  '<llllllllllakkkkkkkk#pggggggg|',
  '<llllllllllakkkkkkkk#pggggggg|',
  '#llllllllll#kkkkkkkkDpggggggg|',
  '#llllllllll#kkkkkkkk#pggggggg|',
  '#llllllllll#kkkkkkkk#pggggggg|',
  '#####D#vv######vv####pggggggg|',
  'hh.mooo..hhhhhhhhhhhh---------',
];

export const LOT_LEGEND: Readonly<Record<string, TileKind>> = {
  '#': 'wall',
  '^': 'window',
  v: 'window',
  '>': 'window',
  '<': 'window',
  d: 'door',
  D: 'door',
  a: 'door',
  b: 'floor',
  t: 'floor',
  s: 'floor',
  l: 'floor',
  k: 'floor',
  p: 'floor',
  g: 'grass',
  '=': 'wall',
  '|': 'fence',
  '-': 'fence',
  o: 'floor',
  '.': 'path',
  m: 'path',
  h: 'fence',
};

const OUTWARD: Readonly<Record<string, Facing>> = { '^': 'up', v: 'down', '>': 'right', '<': 'left' };

/** Every window tile with its outward facing (home.md 2.4: 14 tiles in 9 openings). */
export const LOT_WINDOWS: readonly { readonly tile: TilePos; readonly facing: Facing }[] = LOT_ROWS.flatMap((row, ty) =>
  [...row].flatMap((ch, tx) => {
    const facing = OUTWARD[ch];
    return facing ? [{ tile: { tx, ty }, facing }] : [];
  }),
);

/** home.md 2.3 (for tests and the world's door checks). `inside` tiles must stay walkable. */
export const LOT_DOORS: readonly { readonly id: string; readonly tiles: readonly TilePos[]; readonly connects: readonly [string, string] }[] = [
  { id: 'door.bed_living', tiles: [{ tx: 4, ty: 7 }], connects: ['bedroom', 'living'] },
  { id: 'door.bath_living', tiles: [{ tx: 10, ty: 7 }], connects: ['bathroom', 'living'] },
  { id: 'door.spare_kitchen', tiles: [{ tx: 16, ty: 7 }], connects: ['spare', 'kitchen'] },
  {
    id: 'arch.living_kitchen',
    tiles: [
      { tx: 11, ty: 10 },
      { tx: 11, ty: 11 },
    ],
    connects: ['living', 'kitchen'],
  },
  { id: 'door.front', tiles: [{ tx: 5, ty: 15 }], connects: ['living', 'front'] },
  { id: 'door.patio', tiles: [{ tx: 20, ty: 4 }], connects: ['spare', 'garden'] },
  { id: 'door.back', tiles: [{ tx: 20, ty: 12 }], connects: ['kitchen', 'garden'] },
];

const room = (
  id: string,
  kind: RoomDef['kind'],
  outdoor: boolean,
  seed: TilePos,
  wall: string,
  floor: string,
  extra: { scored: boolean; cosyTarget?: number; plantTarget?: number },
): RoomDef => ({
  id: asRoomId(id),
  name: asStringKey(`room.${id}`),
  kind,
  outdoor,
  seed,
  wallPaint: asPaintId(wall),
  floorPaint: asPaintId(floor),
  ...extra,
});

/**
 * home.md 2.2. The garden wall (brick) and grass cannot be painted, so the garden and front step carry a
 * placeholder wall paint; the front step is not scored (no T or P).
 */
export const LOT_ROOMS: readonly RoomDef[] = [
  room('bedroom', 'bedroom', false, { tx: 2, ty: 3 }, 'wall.plain.lavender', 'floor.carpet.plum', { scored: true, cosyTarget: 100, plantTarget: 2 }),
  room('bathroom', 'bathroom', false, { tx: 10, ty: 3 }, 'wall.tiles.mint', 'floor.tiles.hex_white', { scored: true, cosyTarget: 60, plantTarget: 1 }),
  room('spare', 'spare', false, { tx: 16, ty: 4 }, 'wall.plain.plaster', 'floor.plain.concrete', { scored: true, cosyTarget: 90, plantTarget: 2 }),
  room('living', 'living', false, { tx: 3, ty: 9 }, 'wall.plain.dusk', 'floor.wood.oak', { scored: true, cosyTarget: 160, plantTarget: 3 }),
  room('kitchen', 'kitchen', false, { tx: 14, ty: 10 }, 'wall.tiles.cream', 'floor.check.ink_cream', { scored: true, cosyTarget: 130, plantTarget: 2 }),
  room('garden', 'garden', true, { tx: 24, ty: 9 }, 'wall.plain.plaster', 'floor.patio.stone', { scored: true, cosyTarget: 150, plantTarget: 5 }),
  room('front', 'frontStep', true, { tx: 5, ty: 16 }, 'wall.plain.plaster', 'floor.patio.stone', { scored: false }),
];

// ---- Starting furniture (home.md 3.2): 21 catalog instances and 5 fixtures ----------------------

interface Spec {
  readonly key: string;
  readonly item: string;
  readonly tile: readonly [number, number];
  readonly rotation?: Rotation;
  readonly onto?: { readonly parent: string; readonly slot: number };
}

const START_SPECS: readonly Spec[] = [
  { key: 'bed', item: 'bed_double_basic', tile: [5, 1] },
  { key: 'wardrobe', item: 'wardrobe_basic', tile: [1, 1] },
  { key: 'lamp', item: 'lamp_small_floor', tile: [7, 1] },
  { key: 'mirror', item: 'mirror_standing', tile: [1, 4], rotation: 3 },
  { key: 'bath', item: 'bath_basic', tile: [9, 1] },
  { key: 'sink_bath', item: 'sink_bath_basic', tile: [12, 3], rotation: 1 },
  { key: 'tv', item: 'tv_small_unit', tile: [6, 8] },
  { key: 'console', item: 'console_home', tile: [6, 8], onto: { parent: 'tv', slot: 0 } },
  { key: 'records', item: 'record_player', tile: [1, 8] },
  { key: 'sofa', item: 'sofa_basic', tile: [5, 11], rotation: 2 },
  { key: 'counter1', item: 'counter_basic', tile: [12, 8] },
  { key: 'counter2', item: 'counter_basic', tile: [13, 8] },
  { key: 'counter3', item: 'counter_basic', tile: [14, 8] },
  { key: 'rusks', item: 'rusk_tin', tile: [13, 8], onto: { parent: 'counter2', slot: 0 } },
  { key: 'kettle', item: 'kettle_basic', tile: [14, 8], onto: { parent: 'counter3', slot: 0 } },
  { key: 'fridge', item: 'fridge_basic', tile: [15, 8] },
  { key: 'table', item: 'table_small_round', tile: [16, 11] },
  { key: 'chair1', item: 'chair_basic', tile: [15, 12], rotation: 3 },
  { key: 'chair2', item: 'chair_basic', tile: [18, 11], rotation: 1 },
  { key: 'bowls', item: 'cat_bowls_basic', tile: [12, 14] },
  { key: 'doormat', item: 'doormat_basic', tile: [5, 16] },
  // Fixtures (home.md 3.2): they can be moved and rotated, never sold.
  { key: 'race_board', item: 'race_board', tile: [14, 0] },
  { key: 'tree', item: 'garden_tree_old', tile: [26, 4] },
  { key: 'bird_bath', item: 'garden_bird_bath', tile: [24, 7] },
  { key: 'washing_line', item: 'garden_washing_line', tile: [23, 13] },
  { key: 'mailbox', item: 'front_mailbox', tile: [3, 16] },
];

export const LOT_START: readonly StartPlacement[] = START_SPECS.map((s): StartPlacement => {
  const base = { item: asItemId(s.item), tile: { tx: s.tile[0], ty: s.tile[1] }, rotation: (s.rotation ?? 0) as Rotation };
  if (!s.onto) return base;
  const index = START_SPECS.findIndex((p) => p.key === s.onto?.parent);
  return { ...base, onto: { index, slot: s.onto.slot } };
});

/** The 18 catalog items placed at the start (21 instances): fixtures excluded. */
export const START_CATALOG_ITEMS: readonly string[] = [...new Set(START_SPECS.slice(0, 21).map((s) => s.item))];

const t = (tx: number, ty: number): TilePos => ({ tx, ty });

export const LOT: LotDef = {
  w: 30,
  h: 17,
  rows: LOT_ROWS,
  legend: LOT_LEGEND,
  rooms: LOT_ROOMS,
  start: LOT_START,
  windows: LOT_WINDOWS,
  spots: {
    ellieSpawn: t(4, 13),
    mailbox: t(3, 16),
    frontDoor: t(5, 15),
    fence: t(29, 9),
    birdBath: t(24, 7),
    gardenWall: t(25, 0),
    raceTrackStart: t(22, 3),
    raceTrackEnd: t(22, 10),
    deliveryBox: t(6, 14),
    'bruce.wall': t(27, 0),
    'bruce.fence': t(29, 9),
    'bruce.under_table': t(16, 12),
    'bruce.behind_tv': t(7, 8),
    'bruce.fridge_top': t(15, 8),
    'bruce.delivery_box': t(6, 14),
    georgeSpawn: t(4, 3),
    salemSpawn: t(8, 9),
    shadowSpawn: t(2, 3),
    peachesSpawn: t(3, 10),
  },
};
