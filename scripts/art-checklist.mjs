#!/usr/bin/env node
/**
 * Generates design/spec/art-checklist.md: every sprite key the four Wave 2 pixel artists draw.
 *
 * Inputs: design/spec/home.md (§4.4 catalog, §4.5 fixtures, §5 paints) and the hand-written
 * tables below (sizes, states, characters, icons). Output is deterministic.
 *
 *   node scripts/art-checklist.mjs           writes design/spec/art-checklist.md
 *   node scripts/art-checklist.mjs --check   exits 1 if the file on disk is stale
 *
 * Owner: pixel-artist (lead). If home.md's catalog changes, re-run this and commit the result.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = join(ROOT, 'design/spec/home.md');
const OUT = join(ROOT, 'design/spec/art-checklist.md');
const check = process.argv.includes('--check');

// ---------------------------------------------------------------------------
// 1. Parse home.md
// ---------------------------------------------------------------------------
const homeLines = readFileSync(HOME, 'utf8').split('\n');
const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
const unq = (s) => s.replace(/`/g, '');

const items = [];
const fixtures = [];
const wallPaints = [];
const floorPaints = [];
let section = '';
for (const line of homeLines) {
  if (line.startsWith('### 4.4')) section = 'catalog';
  else if (line.startsWith('### 4.5')) section = 'fixtures';
  else if (line.startsWith('### 5.1')) section = 'wall';
  else if (line.startsWith('### 5.2')) section = 'floor';
  else if (line.startsWith('## 6.')) section = '';
  if (!line.startsWith('|')) continue;
  const c = cells(line);
  if (section === 'catalog' && /^\d+$/.test(c[0])) {
    const [n, id, , category, fp, orient, placement, tags, price, unlock, art, inter, , , mvp] = c.map(unq);
    items.push({ n: Number(n), id, category, fp, orient: Number(orient), placement, tags, price, unlock, art, inter: inter.split(',').map((s) => s.trim()).filter((s) => s !== '-'), mvp: mvp === 'Y' });
  } else if (section === 'fixtures' && c[0].startsWith('`')) {
    const [id, , category, fp, orient, placement, tags, , , art, inter, , , mvp] = c.map(unq);
    fixtures.push({ n: 0, id, category, fp, orient: Number(orient), placement, tags, price: 'fixture', unlock: 'fixture', art, inter: inter.split(',').map((s) => s.trim()).filter((s) => s !== '-'), mvp: mvp === 'Y' });
  } else if ((section === 'wall' || section === 'floor') && c[0].startsWith('`')) {
    const [id, , pattern, colours, tag, unlock, def] = c.map(unq);
    (section === 'wall' ? wallPaints : floorPaints).push({ id, pattern, colours, tag, unlock, def });
  }
}
if (items.length !== 124) throw new Error(`expected 124 catalog items, parsed ${items.length}`);
if (fixtures.length !== 5) throw new Error(`expected 5 fixtures, parsed ${fixtures.length}`);
if (wallPaints.length !== 20 || floorPaints.length !== 16) throw new Error('expected 20 wall and 16 floor paints');
if (new Set(items.map((i) => i.id)).size !== 124) throw new Error('duplicate catalog id');

// ---------------------------------------------------------------------------
// 2. Furniture data: height, states, frames
// ---------------------------------------------------------------------------
/**
 * Size spec per id.
 *   number          floor item, r0 grid height in px (width is 16 * fw - 2)
 *   [w, h]          explicit grid (wall items, surface items, small floor items)
 *   'rug'           rug: 16 * fw by 16 * fh, no outline
 *   ['rug', w, h]   explicit rug size
 */
const SIZE = {
  sofa_basic: 24, chair_basic: 22, armchair_velvet: 24, beanbag_neon: [14, 14], floor_cushions: 12, sofa_coffin: 26,
  bed_double_basic: 54, bed_quilt_cottage: 54, bed_canopy_goth: 70, hammock_garden: 52,
  table_small_round: 32, table_coffee_low: 16, desk_simple: 22, nightstand_coffin: 18, sideboard_retro: 26, table_dining_long: 40, table_side_neon: [14, 18],
  wardrobe_basic: 40, wardrobe_gothic: 44, bookshelf_tall: 40, record_shelf: 22, shelf_wall_float: [14, 8], shelf_wall_bat: [14, 10], cabinet_curio: 38,
  counter_basic: 24, fridge_basic: 38, kettle_basic: [9, 9], rusk_tin: [8, 8], coffee_machine: [10, 12], stove_basic: 24, stove_range_cottage: 26, fridge_retro: 38,
  bath_basic: 26, sink_bath_basic: 24, cabinet_mirror_bath: [12, 14], bath_clawfoot: 28,
  gym_skierg: [14, 36], gym_rower: 50, gym_wallball_target: [12, 14], gym_kettlebell: [10, 10], gym_sandbag: [14, 10], gym_farmers_handles: 10, gym_mat: ['rug', 32, 16], gym_sled_track: ['rug', 16, 128], gym_treadmill: 52, gym_medal_rack: [14, 14], gym_trophy_podium: [14, 22],
  lamp_small_floor: [10, 22], lamp_candelabra: [12, 28], fairy_lights: [30, 8], garden_lantern: [10, 24], lamp_floor_arc: 32, sconce_iron: [8, 12], candles_cluster: [10, 8], garden_lantern_string: [46, 8], sign_neon_bat: [28, 12], lamp_stained_glass: [12, 24], sign_neon_cat: [28, 12], lamp_lava: [6, 12], garden_lantern_paper: [10, 22], lamp_moon_orb: [10, 18],
  plant_monstera: [14, 26], plant_snake: [10, 22], plant_succulent: [10, 8], plant_pothos_hanging: [12, 16], plant_herb_box: [12, 10], plant_fern_stand: [14, 26], garden_flowerbed: 14, plant_catnip: [10, 8], plant_black_rose: [10, 16],
  cat_bowls_basic: 8, cat_scratch_post: [10, 24], cat_toy_basket: [12, 10], cat_tree_small: [14, 34], cat_bed_round: [14, 9], cat_tunnel: 12, cat_wall_steps: [46, 16], cat_bed_coffin: 12, cat_tree_tower: [30, 58], cat_crown_cushion: [14, 10], cat_throne: 28, cat_window_perch: [14, 8], cat_cave_felt: [14, 14], cat_box_castle: [30, 34], cat_heated_pad: [14, 6], box_throne_salem: [14, 14], bruce_wall_cushion: [14, 8],
  poster_moth: [12, 14], poster_cat_loaf: [12, 14], frame_polaroids: [26, 12], painting_meadow: [14, 12], mirror_ornate: [12, 14], hanging_moon: [26, 14], portrait_four_cats: [26, 14], frame_grazie: [12, 12], portrait_george: [12, 14], poster_critterbound: [12, 14], raven_silhouette: [12, 14], plaque_sir_ellie: [12, 8], frame_zoomies: [12, 12], poster_peaches_rock: [12, 14],
  rug_round_plum: 'rug', rug_bat: 'rug', rug_braided: 'rug', rug_cat_face: 'rug', doormat_basic: ['rug', 16, 12], rug_neon_grid: 'rug',
  tv_small_unit: 28, console_home: [10, 6], record_player: 20, laptop: [10, 7], handheld_console: [8, 6], radio_retro: [10, 8], arcade_cabinet: 32,
  bench_garden: 20, garden_picnic_blanket: 'rug', garden_gargoyle: 18, garden_telescope: [14, 24],
  mirror_standing: 34, vase_bud: [8, 10], books_stack: [8, 8], vase_black_crackle: [8, 10], figurine_pickle: [8, 8], rusk_tin_gold: [8, 8],
  // fixtures
  race_board: [12, 14], garden_tree_old: [30, 46], garden_bird_bath: [14, 20], garden_washing_line: 24, front_mailbox: [10, 20],
};

/** Extra states per id. `on` and friends: { frames, rots: 'all' | 'front' } ('front' = r0 and r1 only; back views fall back to the plain key). */
const all = (frames = 1) => ({ frames, rots: 'all' });
const front = (frames = 1) => ({ frames, rots: 'front' });
const STATES = {
  bed_double_basic: { overhead: all() }, bed_quilt_cottage: { overhead: all() }, bed_canopy_goth: { overhead: all() },
  wardrobe_basic: { open: front() }, wardrobe_gothic: { open: front() },
  fridge_basic: { open: front() }, fridge_retro: { open: front() },
  kettle_basic: { on: all(2) }, coffee_machine: { on: all(3) }, stove_basic: { on: front(2) }, stove_range_cottage: { on: front(2) },
  bath_basic: { full: all(), overhead: all() }, bath_clawfoot: { full: all(), overhead: all() },
  gym_treadmill: { on: front(2) },
  lamp_small_floor: { on: all() }, lamp_candelabra: { on: all(2) }, fairy_lights: { on: all(2) }, garden_lantern: { on: all(2) },
  lamp_floor_arc: { on: all() }, sconce_iron: { on: all() }, candles_cluster: { on: all(2) }, garden_lantern_string: { on: all(2) },
  sign_neon_bat: { on: all(2) }, lamp_stained_glass: { on: all() }, sign_neon_cat: { on: all(2) }, lamp_lava: { on: all(4) },
  garden_lantern_paper: { on: all() }, lamp_moon_orb: { on: all() },
  cat_bowls_basic: { full: all() },
  cat_tunnel: { overhead: all() }, cat_cave_felt: { overhead: all() }, cat_box_castle: { overhead: all() }, box_throne_salem: { overhead: all() },
  tv_small_unit: { on: front(2) }, console_home: { on: all(2) }, record_player: { on: front(4) }, laptop: { on: all(2) }, radio_retro: { on: all(2) }, arcade_cabinet: { on: front(2) },
  garden_tree_old: { overhead: all() },
  front_mailbox: { on: all() },
};
/** Frames of the plain key (animation without a state). */
const BASE_FRAMES = { garden_bird_bath: 2, garden_washing_line: 2 };

const STATE_NOTE = {
  overhead: 'front layer drawn above actors (blanket, rim, canopy, box front)',
  open: 'door or lid open',
  full: 'water in the tub / food in the bowls',
  on: 'lit / running / playing',
};
const ITEM_NOTE = {
  bed_double_basic: 'Starts placed. `.overhead` = blanket over Ellie; also 4 cat slots (pillow, side, foot, corner).',
  bed_canopy_goth: 'Canopy drapes are part of the base; `.overhead` is the blanket only.',
  hammock_garden: 'Posts at both ends; sags. Peaches likes it.',
  sofa_basic: 'Starts placed. Seat top at Ellie row 10.',
  sofa_coffin: 'Black, so lavender rim outline. Cats hide behind it.',
  armchair_velvet: 'Wine velvet.',
  beanbag_neon: 'Neon tag: `PAL.neon` allowed.',
  floor_cushions: 'Flat low cushions, 2 wide.',
  table_small_round: 'Starts placed. 2 surface slots on the top face.',
  table_coffee_low: '2 surface slots.', desk_simple: '2 surface slots.', sideboard_retro: '3 slots.', table_dining_long: '4 slots.', table_side_neon: 'Neon tag; 1 slot.',
  nightstand_coffin: 'Coffin-shaped; 1 slot; lavender rim (dark).',
  wardrobe_basic: 'Starts placed. Shadow perches on top (layer 2).',
  wardrobe_gothic: 'Dark wood, rim outline.',
  bookshelf_tall: '2 slots on top.', record_shelf: 'Sleeves are plain coloured rectangles; no band names in the sprite (the UI draws text).',
  shelf_wall_float: '2 surface slots on top.', shelf_wall_bat: '2 slots; bat cut-out brackets.', cabinet_curio: 'Glass front, 3 slots on top.',
  counter_basic: 'Starts placed ×3. 1 slot on top. Drawn as a straight run that joins neighbours.',
  fridge_basic: 'Starts placed. Bruce sits on top.', fridge_retro: 'Rounded retro fridge (mint).',
  kettle_basic: 'Sits on a counter slot; `.on` = steam.', rusk_tin: 'Blue tin; recolour base for `rusk_tin_gold`.', coffee_machine: '`.on` = 3-frame steam.',
  stove_basic: 'Hob on top; `.on` = ring glow.', stove_range_cottage: 'Cooker with 2 slots; cream enamel.',
  bath_basic: 'Starts placed, 3 × 1 along the wall. `.full` adds bubbles; `.overhead` is the front rim over Ellie.',
  bath_clawfoot: 'Same pose points as `bath_basic`; clawed feet.',
  sink_bath_basic: 'Starts placed; faces west when rotated.', cabinet_mirror_bath: 'Wall cabinet; 1 slot.',
  gym_skierg: 'Pairs with `ellie.train.skierg`. Station 1.',
  gym_rower: 'Pairs with `ellie.train.rowing`. Station 5. 1 × 3 so draw the rail long.',
  gym_wallball_target: 'Wall target; the ball is `prop.wallball`. Pairs with `ellie.train.wallballs`. Station 8.',
  gym_kettlebell: 'Pairs with `ellie.train.kettlebell`.',
  gym_sandbag: 'Pairs with `ellie.train.sandbaglunges`. Station 7.',
  gym_farmers_handles: 'Two handles on the floor. `ellie.train.farmerscarry`. Station 6.',
  gym_mat: 'Rubber mat in plum; Ellie stretches on it. Station 4 (burpees) needs no item: `ellie.train.burpeebroadjump` plays on any free floor.',
  gym_sled_track: 'Turf lane 1 × 8 tiles, built from a repeated 16 × 16 module plus end caps. Stations 2 and 3 (sled push and pull): pairs with `ellie.train.sledpush` and `.sledpull`; the sled itself is drawn as a prop on the lane: `prop.sled`.',
  gym_treadmill: '`.on` = belt animation. Pairs with `ellie.train.run`.',
  gym_medal_rack: 'Pegs only; medals are overlaid from `icon.medal.*` (no state keys).',
  gym_trophy_podium: 'Gold, three steps.',
  lamp_small_floor: 'Starts placed. `.on` adds a warm shade (light r 3).',
  lamp_candelabra: 'Goth, `.on` flickers.', fairy_lights: '2 tiles wide, string along the wall.', garden_lantern: 'Port of game 1 lantern.',
  lamp_floor_arc: 'Arc lamp; `.on` all rotations.', sconce_iron: 'Iron wall sconce.', candles_cluster: 'Surface decor, 2 flicker frames.',
  garden_lantern_string: '3 wide, hangs on the garden wall.', sign_neon_bat: 'Neon; bat outline.', lamp_stained_glass: 'Coloured panes lit when `.on`.',
  sign_neon_cat: 'Neon; cat outline.', lamp_lava: '4-frame blobs.', garden_lantern_paper: 'Recolour of `garden_lantern` (paper white).', lamp_moon_orb: 'Dim moon orb on a stand.',
  plant_monstera: 'Plants never wilt: one grid.', plant_snake: 'Rim outline not needed.', plant_succulent: 'Surface decor.',
  plant_pothos_hanging: 'Wall plant, vines hang.', plant_herb_box: 'Wall box with herbs.', plant_fern_stand: 'Fern on a small stand.',
  garden_flowerbed: 'Outdoor; 2 tiles wide.', plant_catnip: 'Surface decor; Salem loves it.', plant_black_rose: 'Game 1 black rose; lavender rim.',
  cat_bowls_basic: 'Starts placed. 4 bowls in one item; `.full` = kibble in each.', cat_scratch_post: 'Sisal post.', cat_toy_basket: 'Basket with a feather wand tip and a laser pen.',
  cat_tree_small: 'Starts as a perch.', cat_bed_round: 'Plum round bed.', cat_tunnel: '`.overhead` = tunnel top over a hiding cat. 2 × 1.',
  cat_wall_steps: '3 wall steps, 3 layer-2 slots.', cat_bed_coffin: 'Coffin bed; rim outline.', cat_tree_tower: '2 × 2, three levels, the biggest cat piece.',
  cat_crown_cushion: 'George\'s cushion: a small crown on top.', cat_throne: 'George.', cat_window_perch: 'Sits on a window tile.',
  cat_cave_felt: 'Shadow\'s cave. `.overhead` = the flap over a hiding cat.', cat_box_castle: 'Salem. `.overhead` = front wall of the castle over a cat.',
  cat_heated_pad: 'Flat pad with a glow strip.', box_throne_salem: 'Cardboard box with a tiny throne; `.overhead` = front flap.', bruce_wall_cushion: 'Garden wall cushion, flame-point blue.',
  poster_moth: 'Abstract, no text.', poster_cat_loaf: 'A cat loaf, no text.', frame_polaroids: '3 small photos on a string. Callback to the polaroid keepsake.',
  painting_meadow: 'Cottage meadow.', mirror_ornate: 'Ornate gold frame.', hanging_moon: '2 wide crescent on a cord.', portrait_four_cats: '4 tiny cats in a frame.',
  frame_grazie: 'A plain frame with an empty blank panel: the UI draws `FRAMED_PRINT_TEXT`. No artwork text in the sprite. Max 1.',
  portrait_george: 'Regal pose; rim outline not needed.', poster_critterbound: 'Original creature art (Critterbound), no borrowed designs.', raven_silhouette: 'Lavender rim.',
  plaque_sir_ellie: 'Brass plaque; text drawn by the UI, so leave the face blank.', frame_zoomies: 'A blurry cat streak.', poster_peaches_rock: 'Peaches with headphones.',
  rug_round_plum: 'Starts as an option. 1 px border in `deep`.', rug_bat: 'Bat silhouette in lavender.', rug_braided: 'Oval braid look, cottage.', rug_cat_face: 'Cat face; cats nap on it.',
  doormat_basic: 'Starts placed; coir.', rug_neon_grid: 'Neon.',
  tv_small_unit: 'Starts placed. 2 × 1 unit, 2 slots (one holds the console). `.on` 2 frames.',
  console_home: 'Starts placed. Neon tag; original box, no recognisable console. `.on` 2 frames (light).', record_player: 'Starts placed. `.on` 4 frames (spinning). Lid is Peaches\' seat when off.',
  laptop: 'Plain silver, no logo. `.on` 2 frames.', handheld_console: 'Original shape (no brick). Sits on a slot; the carried version is `prop.handheld`.',
  radio_retro: 'Retro; `.on` 2 frames (dial).', arcade_cabinet: 'Original cabinet; screen shows Critterbound. `.on` 2 frames.',
  bench_garden: 'Wood slats.', garden_picnic_blanket: 'Check pattern, rug layer.', garden_gargoyle: 'Goth stone, rim not needed.', garden_telescope: 'Brass tube on a tripod.',
  mirror_standing: 'Starts placed. Faces east when rotated.', vase_bud: 'Base for `vase_black_crackle`.', books_stack: 'Small stack.',
  vase_black_crackle: 'Recolour of `vase_bud` (ink with crackle lines); rim outline.', figurine_pickle: 'Small Pickle figurine.', rusk_tin_gold: 'Recolour of `rusk_tin`.',
  race_board: 'Fixture. Corkboard; starts on the spare room wall.', garden_tree_old: 'Fixture. Canopy is the `.overhead` layer covering 4 × 4 tiles; George climbs.',
  garden_bird_bath: 'Fixture. 2 frames of water glint. Poe lands here.', garden_washing_line: 'Fixture, 4 tiles of line between two posts; 2 frames sway. Walkable under the line.',
  front_mailbox: 'Fixture. `.on` = flag up (mail waiting). Plain red box.',
};

// ---------------------------------------------------------------------------
// 3. Key builder for catalog items and fixtures
// ---------------------------------------------------------------------------
const dims = (it) => (it.fp === 'slot' ? null : it.fp.split('×').map(Number));

function batchOf(it) {
  if (it.category === 'kitchen' || it.category === 'bath' || it.category === 'gym') return 'C';
  if (['plants', 'catFurniture', 'cat', 'garden', 'front'].includes(it.category)) return 'D';
  return 'B';
}

function baseGrid(it) {
  const spec = SIZE[it.id];
  if (spec === undefined) throw new Error(`no size for ${it.id}`);
  const d = dims(it);
  const [fw, fh] = d ?? [1, 1];
  if (typeof spec === 'number') return { w: 16 * fw - 2, h: spec, rug: false };
  if (spec === 'rug') return { w: 16 * fw, h: 16 * fh, rug: true };
  if (spec[0] === 'rug') return { w: spec[1], h: spec[2], rug: true };
  return { w: spec[0], h: spec[1], rug: false, fixed: true };
}

function rotGrid(it, rot) {
  const g = baseGrid(it);
  const d = dims(it);
  if (rot === 'r0' || rot === 'r2' || !d) return { w: g.w, h: g.h, fw: d ? d[0] : 1, fh: d ? d[1] : 1 };
  const [fw, fh] = d;
  if (g.rug) return { w: g.h, h: g.w, fw: fh, fh: fw };
  if (g.fixed) return { w: g.w, h: g.h, fw: fh, fh: fw };
  return { w: 16 * fh - 2, h: g.h + 16 * (fw - fh), fw: fh, fh: fw };
}

/** All keys for one item, with size, frames and notes. */
function keysFor(it, firstOfBase) {
  const rots = it.orient === 4 ? ['r0', 'r1', 'r2'] : it.orient === 2 ? ['r0', 'r1'] : ['r0'];
  const st = STATES[it.id] ?? {};
  const rows = [];
  const suffix = (r) => (r === 'r0' ? '' : `.${r}`);
  const base = it.art.split('#')[0];
  const pal = it.art.includes('#') ? it.art.split('#')[1] : null;
  const recolour = firstOfBase[base] !== it.id ? firstOfBase[base] : null;
  for (const r of rots) {
    const g = rotGrid(it, r);
    const key = `item.${it.id}${suffix(r)}`;
    rows.push({ key, id: it.id, kind: 'plain', rot: r, ...g, frames: BASE_FRAMES[it.id] ?? 1, recolour, base, pal });
    for (const [state, cfg] of Object.entries(st)) {
      if (cfg.rots === 'front' && r === 'r2') continue;
      rows.push({ key: `${key}.${state}`, id: it.id, kind: state, rot: r, ...g, frames: cfg.frames, recolour, base, pal });
    }
  }
  return rows;
}

const allItems = [...items, ...fixtures];
const firstOfBase = {};
for (const it of allItems) {
  const b = it.art.split('#')[0];
  if (!(b in firstOfBase)) firstOfBase[b] = it.id;
}
const distinctBases = Object.keys(firstOfBase).length;
const catalogBases = new Set(items.map((i) => i.art.split('#')[0])).size;

const itemRows = [];
for (const it of allItems) {
  const batch = it.id === 'race_board' ? 'C' : batchOf(it);
  const keys = keysFor(it, firstOfBase);
  for (const k of keys) itemRows.push({ ...k, batch, mvp: it.mvp, item: it });
}

// ---------------------------------------------------------------------------
// 4. Characters (batch A)
// ---------------------------------------------------------------------------
/** [key, dirs, framesPerDir, size, fps, mvp, status, note]. status: done | partial | todo | proposed. */
const ELLIE = [
  ['ellie.idle', 'dus', 6, '12 × 16', 2, 'Y', 'done', 'Down and side 6 frames (5 open, 1 blink); up has 1 frame (could get 2).'],
  ['ellie.walk', 'dus', 4, '12 × 16', 6, 'Y', 'partial', 'Has 2 frames per dir; add 2 passing frames.'],
  ['ellie.sit', 'dus', 2, '12 × 15', 1, 'Y', 'partial', 'Has down, 1 frame. Add 2nd frame, side and up (chairs, sofa, bed edge, TV from behind).'],
  ['ellie.sit_floor', 'ds', 2, '14 × 12', 1, 'Y', 'todo', 'Cross-legged on grass or a rug (`grass.sit`).'],
  ['ellie.lie', 's', 2, '20 × 9', 1, 'Y', 'todo', 'Stargazing, sunbathing; breathing.'],
  ['ellie.sleep', 'd', 2, '12 × 10', 1, 'Y', 'todo', 'Head and shoulders on a pillow; bed `.overhead` draws the blanket.'],
  ['ellie.eat', 'ds', 4, '12 × 15', 4, 'Y', 'todo', 'Seated; hand to mouth; hand point down (6, 11), side (11, 10).'],
  ['ellie.drink', 'ds', 4, '12 × 15', 4, 'Y', 'todo', 'Mug to mouth, seated or standing.'],
  ['ellie.carry', 'dus', 4, '12 × 16', 6, 'Y', 'todo', 'Walk with both arms forward; prop at the hand point.'],
  ['ellie.use', 'dus', 2, '12 × 16', 4, 'Y', 'todo', 'Hands busy at counter, sink, lamp, laptop; up = back view.'],
  ['ellie.read', 'ds', 2, '12 × 15', 1, 'Y', 'todo', 'Seated with a book; page turn on frame 2.'],
  ['ellie.dance', 'd', 6, '14 × 16', 6, 'Y', 'todo', 'Arms up, sway, spin through side and up.'],
  ['ellie.headbang', 'ds', 4, '12 × 16', 8, 'Y', 'todo', 'Hair whips forward; streaks flash.'],
  ['ellie.pet', 'ds', 2, '12 × 14', 3, 'Y', 'todo', 'Crouched, hand out.'],
  ['ellie.bow', 'ds', 2, '12 × 16', 2, 'Y', 'todo', 'Bowing to George.'],
  ['ellie.kneel', 'ds', 2, '12 × 13', 2, 'Y', 'todo', 'Being knighted ("Sir Ellie").'],
  ['ellie.stretch', 'd', 4, '12 × 18', 4, 'Y', 'todo', 'Morning stretch, arms up (taller frame); also on the gym mat.'],
  ['ellie.bath', 'd', 2, '12 × 9', 1, 'Y', 'todo', 'Head and shoulders in the tub; bath `.overhead` rim over her.'],
  ['ellie.game', 'du', 2, '12 × 15', 4, 'Y', 'todo', 'Seated with a controller; up = back view facing the TV.'],
  ['ellie.handheld', 'd', 2, '12 × 10', 4, 'N', 'todo', 'In bed with the handheld (`handheld.play` is Full scope).'],
  ['ellie.photo', 'ds', 2, '12 × 16', 2, 'Y', 'todo', 'Camera raised.'],
  ['ellie.twirl', 'd', 4, '12 × 16', 6, 'N', 'todo', 'At the mirror: down, side, up, side mirrored (`mirror.admire` is Full scope).'],
  ['ellie.mope', 'dus', 4, '12 × 16', 4, 'Y', 'todo', 'Mopey walk, head low.'],
  ['ellie.cheer', 'd', 2, '12 × 18', 4, 'Y', 'todo', 'Arms up (race finish, perfect dunk).'],
  ['ellie.dunk', 'd', 4, '14 × 12', 4, 'Y', 'todo', 'Sitting in the grass, dunking a rusk.'],
  ['ellie.train.skierg', 's', 4, '14 × 16', 6, 'Y', 'todo', 'Station 1. Arms pull down from overhead.'],
  ['ellie.train.sledpush', 's', 4, '16 × 14', 6, 'Y', 'todo', 'Station 2. Leaning forward, arms locked.'],
  ['ellie.train.sledpull', 's', 4, '16 × 15', 6, 'Y', 'todo', 'Station 3. Leaning back, hand over hand on a rope.'],
  ['ellie.train.burpeebroadjump', 's', 6, '16 × 16', 8, 'Y', 'todo', 'Station 4. Down, chest to floor, up, jump forward, land.'],
  ['ellie.train.rowing', 's', 4, '18 × 10', 6, 'Y', 'todo', 'Station 5. Catch, drive, finish, recovery.'],
  ['ellie.train.farmerscarry', 'ds', 4, '14 × 16', 6, 'Y', 'todo', 'Station 6. Handle in each hand.'],
  ['ellie.train.sandbaglunges', 's', 4, '14 × 16', 4, 'Y', 'todo', 'Station 7. Bag on shoulders, lunge down and up.'],
  ['ellie.train.wallballs', 'd', 4, '12 × 20', 6, 'Y', 'todo', 'Station 8. Squat, throw up, catch (ball drawn in).'],
  ['ellie.train.run', 's', 4, '14 × 16', 8, 'Y', 'todo', 'Treadmill and the race 1 km runs.'],
  ['ellie.train.kettlebell', 'd', 4, '12 × 16', 6, 'Y', 'todo', 'Swing.'],
  ['ellie.hold_cat', 'ds', 2, '14 × 16', 2, 'Y', 'proposed', '`cat.pick_up` (MVP): holding a cat to her chest. Not in the old art.md list.'],
  ['ellie.wand', 'ds', 2, '14 × 16', 4, 'Y', 'proposed', '`cat.play_wand` and `cat.play_laser`: arm swinging a wand. Not in the old art.md list.'],
];

const CAT_ANIMS = [
  // anim, dirs, framesPerDir, fps, mvp, note
  ['idle', 'd', 2, 1.2, 'Y', 'Done for all 5 (game 1 grid + 1 px bob).'],
  ['walk', 'dus', 4, 6, 'Y', 'Done for all 5 as down, 2 frames. Add side and up, 4 frames each.'],
  ['sit', 'ds', 2, 1, 'Y', 'Tail flick on frame 2.'],
  ['loaf', 'ds', 2, 1, 'Y', 'Paws tucked, eyes half closed.'],
  ['sleep', 'd', 2, 0.8, 'Y', 'Done for all 5 as 1 frame (eyes closed). Add 2nd frame (curl or breathing).'],
  ['groom', 'ds', 4, 4, 'Y', 'George has down, 2 frames (game 1 paw lick). Others todo.'],
  ['zoomies', 's', 4, 10, 'Y', 'Stretched gallop, ears back.'],
  ['knock', 's', 4, 6, 'Y', 'One-shot: reach, tap, tap, swipe.'],
  ['eat', 'us', 2, 3, 'Y', 'Head down into the bowl.'],
  ['perch', 'd', 2, 1, 'Y', 'Sitting high, tail hanging over the edge.'],
  ['jump', 's', 2, 6, 'Y', 'One-shot: crouch, leap.'],
  ['pet', 'd', 2, 3, 'Y', 'Eyes closed, head pushed up.'],
  ['stretch', 's', 2, 2, 'Y', 'Front stretch.'],
  ['box', 'd', 2, 1, 'Y', 'In a delivery box; the box front is `.overhead`.'],
  ['lap', 'd', 2, 1, 'Y', 'On Ellie\'s lap (`ellie.lap_sit`, any cat). Shadow\'s is in art.md; the other four are proposed.'],
  ['scratch', 's', 2, 4, 'Y', 'Proposed. `scratcher.scratch` is MVP for all cats; not in the old art.md list.'],
  ['play', 's', 2, 6, 'Y', 'Proposed. `toy.play` and `cat.play_wand` pounce; not in the old art.md list.'],
];
const CATS = [
  ['cat.george', 'George', '12 × 12 / side 16 × 11'], ['cat.salem', 'Salem', '9 × 10 / side 13 × 9'],
  ['cat.shadow', 'Shadow', '14 × 14 / side 18 × 12'], ['cat.peaches', 'Peaches', '12 × 12 / side 15 × 11'],
  ['visitor.bruce', 'Bruce', '12 × 12 / side 16 × 11'],
];
const DONE_CAT = {
  idle: 'done', walk: 'partial', sleep: 'partial',
};
const proposedAnim = new Set(['scratch', 'play']);
const lapProposed = new Set(['cat.george', 'cat.salem', 'cat.peaches', 'visitor.bruce']);
// Bruce only needs the anims a visitor shows; flag the rest as N.
const BRUCE_NO = new Set(['loaf', 'groom', 'zoomies', 'knock', 'eat', 'perch', 'jump', 'pet', 'stretch', 'box', 'lap', 'scratch', 'play', 'sit']);

const EXTRAS = [
  ['cat.george.inspect', 'ds', 2, '12 × 12', 2, 'Y', 'todo', 'Leaning in, one stripe raised.'],
  ['cat.george.approve', 'd', 2, '12 × 12', 2, 'N', 'todo', 'Slow blink.'],
  ['cat.george.disapprove', 'd', 2, '12 × 12', 2, 'N', 'todo', 'Turned head.'],
  ['cat.salem.chatter', 'd', 2, '9 × 10', 6, 'N', 'todo', 'Mouth open, tail up.'],
  ['cat.salem.laser', 's', 4, '13 × 9', 10, 'Y', 'todo', 'Pounce at the dot.'],
  ['cat.shadow.eyes', 'd', 2, '8 × 3', 0.5, 'Y', 'todo', 'Only the eyes, for under the bed and the closet.'],
  ['cat.shadow.lap', 'd', 2, '14 × 10', 1, 'Y', 'todo', 'Loaf on Ellie\'s lap (drawn over `ellie.read`).'],
  ['cat.peaches.bop', 'd', 4, '12 × 12', 4, 'Y', 'todo', 'Head bob to music.'],
  ['cat.peaches.sunbeam', 'd', 2, '15 × 9', 0.5, 'Y', 'todo', 'Lying flat on her side in the sun.'],
  ['visitor.bruce.peek', 'd', 2, '12 × 7', 1, 'Y', 'todo', 'Head and paws over a fence or window sill.'],
  ['visitor.bruce.wall', 'd', 2, '12 × 8', 1, 'N', 'todo', 'Loaf on the garden wall (`bruce_wall_cushion`; full scope).'],
];
const VISITORS = [
  ['visitor.poe.idle', 's', 2, '12 × 11', 1.2, 'Y', 'done', 'Game 1 grid mirrored to face right.'],
  ['visitor.poe.hop', 's', 2, '12 × 11', 4, 'Y', 'todo', 'Small hop on the bird bath.'],
  ['visitor.poe.fly', 's', 4, '16 × 10', 8, 'Y', 'todo', 'Wings up, mid, down, mid.'],
  ['visitor.poe.trade', 's', 2, '12 × 11', 2, 'Y', 'todo', 'Head down, trinket in beak.'],
  ['visitor.pickle.idle', 'n', 2, '12 × 10', 1.2, 'Y', 'done', ''],
  ['visitor.pickle.ribbit', 'n', 2, '12 × 10', 3, 'Y', 'done', 'Game 1 throat puff.'],
  ['visitor.pickle.hop', 's', 3, '14 × 10', 6, 'Y', 'todo', 'Hop to the door.'],
  ['visitor.pickle.knock', 'd', 2, '12 × 12', 3, 'Y', 'todo', 'Holding the delivery box, knocking.'],
];
const OUTFITS_DONE = ['crown', 'chefhat', 'bucket', 'headphones', 'catears', 'scarf', 'firefly', 'moon', 'star', 'feather', 'bow'];
const OUTFITS_LATER = [
  ['beanie', 'head'], ['race_kit', 'top'], ['jumper', 'top'], ['band_tee', 'top'], ['boots', 'feet'], ['sunglasses', 'face'], ['choker', 'neck'],
  ['george_crown', 'head (George, 14 × 18)'], ['peaches_headphones', 'head (Peaches)'], ['salem_bow', 'neck (Salem)'],
];

const dirCount = (d) => (d === 'n' ? 1 : d.length);
const dirName = { d: 'down', u: 'up', s: 'side', n: 'none' };
const dirLabel = (d) => (d === 'n' ? 'frames' : d.split('').map((c) => dirName[c]).join(', '));

const aRows = [];
const pushA = (key, dirs, fpd, size, fps, mvp, status, note, group) => {
  const frames = dirCount(dirs) * fpd;
  aRows.push({ key, dirs, fpd, size, fps, mvp, status, note, frames, group });
};
for (const e of ELLIE) pushA(...e, 'Ellie');
for (const [base, name, size] of CATS) {
  for (const [anim, dirs, fpd, fps, mvp, note] of CAT_ANIMS) {
    const key = `${base}.${anim}`;
    let status = DONE_CAT[anim] ?? 'todo';
    if (anim === 'groom') status = base === 'cat.george' ? 'partial' : 'todo';
    if (anim === 'lap' && base === 'cat.shadow') status = 'todo';
    if (proposedAnim.has(anim) || (anim === 'lap' && lapProposed.has(base))) status = 'proposed';
    let m = mvp;
    if (base === 'visitor.bruce' && BRUCE_NO.has(anim)) m = 'N';
    let n = note;
    if (base === 'visitor.bruce' && ['idle', 'walk', 'sleep'].includes(anim)) n = anim === 'walk' ? 'Done as down, 2 frames. Add side, 4 frames (Bruce crosses the lot).' : 'Done.';
    if (base === 'visitor.bruce' && BRUCE_NO.has(anim)) n = 'Bruce is a visitor and does not need this; skip unless time allows.';
    // Bruce is a visitor: only idle, walk and sleep are listed in art.md.
    if (base === 'visitor.bruce' && BRUCE_NO.has(anim)) continue;
    pushA(key, dirs, fpd, size.split(' / ')[0], fps, m, status, n, name);
  }
}
for (const e of EXTRAS) pushA(...e, e[0].startsWith('visitor') ? 'Bruce' : e[0].split('.')[1][0].toUpperCase() + e[0].split('.')[1].slice(1));
for (const e of VISITORS) pushA(...e, e[0].includes('poe') ? 'Poe' : 'Pickle');
for (const id of OUTFITS_DONE) pushA(`outfit.${id}`, 'dus', 1, '14 × 20 overlay', 0, 'Y', 'done', 'Ported from game 1.', 'Outfits');
for (const [id, slot] of OUTFITS_LATER) pushA(`outfit.${id}`, 'dus', 1, '14 × 20 overlay', 0, 'N', 'todo', `Slot: ${slot}.`, 'Outfits');

// ---------------------------------------------------------------------------
// 5. Props (batch C), icons and fx (batch D)
// ---------------------------------------------------------------------------
/** [key, size, frames, mvp, note] */
const PROPS = [
  ['prop.mug', '8 × 8', 1, 'Y', 'Empty mug (also `mug_full` look via `prop.coffee`).'],
  ['prop.coffee', '8 × 10', 2, 'Y', 'Mug of coffee, 2 steam frames.'],
  ['prop.rusk', '6 × 4', 1, 'Y', 'Rusk; also drawn on the mug rim for `mug_rusk` (use `prop.coffee` plus this).'],
  ['prop.plate', '10 × 6', 1, 'Y', 'Plate; toast and food ride on it.'],
  ['prop.sushi', '12 × 6', 1, 'Y', 'Sushi plate.'],
  ['prop.trinket', '6 × 6', 1, 'Y', 'Shiny Trinket on the floor, 2-tone shine.'],
  ['prop.box', '14 × 12', 1, 'Y', 'Delivery box, closed.'],
  ['prop.box.open', '14 × 12', 1, 'Y', 'Delivery box, flaps open.'],
  ['prop.box.overhead', '14 × 6', 1, 'Y', 'Front of the box over a cat sitting inside.'],
  ['prop.book', '8 × 6', 1, 'Y', 'Carried book (with `ellie.read`).'],
  ['prop.ham', '8 × 6', 1, 'Y', 'Ham for Salem.'],
  ['prop.toy', '10 × 10', 1, 'Y', 'Feather wand.'],
  ['prop.controller', '8 × 5', 1, 'Y', 'Original pad shape.'],
  ['prop.handheld', '8 × 6', 1, 'N', 'Original shape, no brick.'],
  ['prop.wallball', '8 × 8', 1, 'Y', 'Medicine ball, plum leather.'],
  ['prop.sled', '14 × 12', 1, 'Y', 'Hyrox sled on the lane; Ellie pushes or pulls it (`gym_sled_track`). Proposed.'],
  ['prop.vase', '8 × 10', 1, 'Y', 'Vase for Salem to knock (surface decor).'],
  ['prop.vase.broken', '10 × 6', 1, 'Y', 'Knocked-over state (gentle, no shards).'],
  ['prop.record_sleeve', '10 × 10', 1, 'Y', 'Plain coloured sleeve, no text or artwork.'],
  ['prop.plant_tiny', '8 × 8', 1, 'N', 'Tiny pot.'],
  ['prop.skull_candle', '8 × 10', 1, 'N', 'Goth candle.'],
  ['prop.snow_globe', '10 × 10', 1, 'N', 'Game 1 globe, a keepsake.'],
  ['prop.fortune_cat_card', '8 × 10', 1, 'N', 'Collectible card.'],
  ['prop.camera', '10 × 8', 1, 'Y', 'Photo mode camera.'],
];

const sz = (n) => `${n} × ${n}`;
const NEEDS = [
  ['energy', 'crescent moon with a small zz'], ['hunger', 'rice ball'], ['fun', 'controller'], ['fitness', 'kettlebell'], ['calm', 'leaf over a water ring'], ['cosy', 'little house with a lamp (ui.md 5: the Cosy icon is a little house)'],
  ['food', 'fish-shaped kibble bowl'], ['play', 'feather wand'], ['affection', 'paw with a heart pad'], ['nap', 'curled cat'], ['royalty', 'crown'], ['chaos', 'falling cup'], ['solitude', 'closed door'], ['vibes', 'music note with a sun'],
];
const MOODS = ['mopey', 'low', 'okay', 'good', 'great'];
const THOUGHTS = ['ham', 'fish', 'bowl', 'box', 'sunbeam', 'music', 'crown', 'zz', 'laser', 'feather', 'lap', 'dark_spot', 'pillow', 'ellie', 'heart_paw', 'question', 'exclaim', 'angry', 'coffee', 'rusk', 'sushi', 'controller', 'kettlebell', 'record', 'bath', 'book', 'star', 'bed', 'plant', 'trinket'];
const UI = ['live', 'build', 'photo', 'journal', 'mail', 'catalog', 'settings', 'pause', 'play', 'speed2', 'speed3', 'place', 'move', 'rotate', 'sell', 'duplicate', 'eyedropper', 'undo', 'redo', 'paint_wall', 'paint_floor', 'close', 'hearts', 'queue_cancel', 'fullscreen', 'sound', 'mute', 'skip', 'lock', 'check'];
const CATEGORIES = ['seating', 'beds', 'tables', 'storage', 'kitchen', 'bath', 'gym', 'lighting', 'plants', 'cat_furniture', 'wall_decor', 'rugs', 'electronics', 'garden', 'decor', 'special'];
const STYLES = ['goth', 'cottage', 'neon', 'gym', 'cat', 'plant', 'retro'];
const HYROX = ['skierg', 'sledpush', 'sledpull', 'burpeebroadjump', 'rowing', 'farmerscarry', 'sandbaglunges', 'wallballs', 'run'];
const PHASES = ['dawn', 'day', 'dusk', 'night'];
const ASPS = [['hyrox', 'station dial or kettlebell'], ['royalty', 'crown'], ['home', 'little house'], ['collect', 'star jar']];
const SENDERS = [['pickle', 'frog face'], ['race', 'plain flag, no event branding'], ['poe', 'feather'], ['home', 'envelope with a paw']];
const EMOTES = ['happy', 'mopey', 'love', 'surprised', 'annoyed', 'sleepy', 'music'];

/**
 * Interaction petal and queue-card icons. Key = glyph key; `ids` = the interactions that use it.
 * New glyphs are `icon.int.*`; where an existing need, thought, ui or hyrox icon already fits, the interaction reuses it
 * (no new art). Each InteractionDef points at one of these keys.
 */
const INT_NEW = [
  ['sit', 'a cushion with a dent', ['sofa.sit', 'chair.sit', 'bench.sit'], 'Y'],
  ['grass', 'a tuft of grass with a blade-shadow', ['grass.sit'], 'Y'],
  ['cook', 'frying pan with a flip', ['counter.make_toast', 'cook_simple'], 'Y'],
  ['treat', 'treat jar', ['treat_jar.give'], 'N'],
  ['laptop', 'open laptop', ['laptop.browse', 'device.warm', 'use_laptop'], 'Y'],
  ['dance', 'two feet and a note', ['record_player.dance'], 'Y'],
  ['headbang', 'a hair swish with a horn sign', ['record_player.headbang', 'peaches.headbang_together'], 'Y'],
  ['wash', 'tap with a drip', ['sink.wash_up', 'freshen_up'], 'Y'],
  ['tidy', 'hand putting a cup back', ['mess.put_back', 'hang_washing'], 'Y'],
  ['lantern', 'lantern', ['lanterns.light', 'light_lantern'], 'Y'],
  ['race', 'chequered flag, no logo', ['race_board.race', 'open_race_board'], 'Y'],
  ['dress', 'hanger', ['wardrobe.dress', 'dress_up'], 'Y'],
  ['mirror', 'oval mirror with a glint', ['mirror.admire', 'admire_self'], 'N'],
  ['door', 'door with a knock mark', ['door.answer'], 'Y'],
  ['peek', 'an eye', ['bruce.spot', 'poe.watch', 'bird_bath.watch', 'bird_watch'], 'Y'],
  ['brush', 'hairbrush', ['cat.brush'], 'Y'],
  ['lift', 'two hands lifting a cat', ['cat.pick_up'], 'Y'],
  ['talk', 'speech bubble with a dot', ['cat.talk', 'cat.call'], 'Y'],
  ['scratch', 'three claw marks', ['scratcher.scratch'], 'Y'],
  ['groom', 'tongue and paw', ['self.groom'], 'Y'],
  ['default', 'neutral circle with a paw (ui.md fallback `icon.int.default`)', ['idle', 'any interaction without its own glyph'], 'Y'],
];
/** Interaction -> existing icon key (no new art). */
const INT_REUSE = [
  ['icon.thought.bed', ['bed.sleep']],
  ['icon.thought.zz', ['bed.nap', 'sofa.nap', 'spot.nap', 'cat_bed.nap', 'bed.cat_nap', 'box.nap']],
  ['icon.thought.coffee', ['kettle.make_coffee', 'mug.drink', 'make_tea']],
  ['icon.thought.rusk', ['rusk_tin.take', 'grass.rusk_ritual']],
  ['icon.need.hunger', ['fridge.snack']],
  ['icon.thought.sushi', ['counter.make_sushi']],
  ['icon.thought.bowl', ['bowls.fill', 'bowl.eat']],
  ['icon.thought.ham', ['fridge.give_ham']],
  ['icon.thought.controller', ['console.play', 'handheld.play', 'play_arcade']],
  ['icon.ui.catalog', ['laptop.catalog']],
  ['icon.thought.record', ['record_player.play', 'record_player.lid_sit', 'browse_records']],
  ['icon.ui.mute', ['record_player.stop']],
  ['icon.thought.music', ['record_player.listen', 'listen_radio']],
  ['icon.thought.book', ['bookshelf.read']],
  ['icon.thought.bath', ['bath.bathe']],
  ['icon.thought.trinket', ['trinket.pick_up', 'poe.trade']],
  ['icon.thought.box', ['box.flatten', 'box.sit']],
  ['icon.thought.star', ['grass.stargaze', 'decor.admire', 'race.cheer', 'stargaze']],
  ['icon.need.cosy', ['lamp.toggle', 'toggle_light']],
  ['icon.hyrox.run', ['front_door.run', 'run_treadmill']],
  ['icon.hyrox.<station>', ['gym.skierg.train', 'gym.sledpush.train', 'gym.sledpull.train', 'gym.burpeebroadjump.train', 'gym.rowing.train', 'gym.farmerscarry.train', 'gym.sandbaglunges.train', 'gym.wallballs.train']],
  ['icon.need.fitness', ['stretch']],
  ['icon.thought.plant', ['plant.water']],
  ['icon.ui.photo', ['camera.photo']],
  ['icon.thought.heart_paw', ['cat.pet']],
  ['icon.thought.feather', ['cat.play_wand', 'play_feather']],
  ['icon.thought.laser', ['cat.play_laser', 'play_laser']],
  ['icon.thought.crown', ['george.bow', 'perch.sit', 'spot.claim', 'bow_to_george']],
  ['icon.need.royalty', ['george.knight']],
  ['icon.thought.sunbeam', ['window.sit', 'sunbeam.bask']],
  ['icon.thought.dark_spot', ['hide.sit']],
  ['icon.need.chaos', ['self.zoomies', 'surface.knock']],
  ['icon.need.play', ['toy.play', 'garden.roll']],
  ['icon.need.vibes', ['music.vibe']],
  ['icon.need.affection', ['ellie.near']],
  ['icon.thought.ellie', ['ellie.follow']],
  ['icon.thought.exclaim', ['ellie.request']],
  ['icon.thought.lap', ['ellie.lap_sit']],
  ['icon.thought.question', ['furniture.inspect']],
  ['icon.ui.mail', ['check_mail']],
];

const FX = [
  ['heart', '5 × 5', 'pet burst; ParticleKind `heart`'], ['note', '5 × 6', 'music; `note`'], ['zz', '6 × 6', 'sleep; `zz`'], ['sparkle', '5 × 5', '`sparkle`'], ['dust', '4 × 4', '`dust`'], ['steam', '4 × 6', '`steam`'],
  ['rain', '2 × 4', 'ParticleKind `rain`'], ['star', '5 × 5', 'ParticleKind `star`'], ['confetti', '3 × 3', 'ParticleKind `confetti` (race finish); 3 colours as 3 frames'],
  ['sweat', '3 × 4', 'training'], ['star_shoot', '9 × 3', 'shooting star'], ['firefly', '3 × 3', 'garden at night'], ['leaf', '4 × 4', 'wind in the garden'],
];

// ---------------------------------------------------------------------------
// 6. Patterns, motifs, paints (batch D)
// ---------------------------------------------------------------------------
/** [key, frames, note] */
const PATTERNS = [
  ['pattern.floor.plain', 1, 'Flat colour with a faint texture.', 'Y'],
  ['pattern.floor.carpet', 1, 'Plain variant: woven speckle. Used by 3 carpet paints.', 'Y'],
  ['pattern.floor.rubber', 1, 'Plain variant: speckled rubber (`floor.plain.rubber`).', 'Y'],
  ['pattern.floor.stripes', 1, '', 'N'],
  ['pattern.floor.checks', 1, '', 'Y'],
  ['pattern.floor.wood', 1, 'Planks, 2 tones.', 'Y'],
  ['pattern.floor.herringbone', 1, 'Wood variant (`floor.wood.herringbone`).', 'Y'],
  ['pattern.floor.tiles', 1, 'Square tiles with grout (`floor.tiles.terracotta`).', 'Y'],
  ['pattern.floor.hex', 1, 'Tiles variant: hexagons (`floor.tiles.hex_white`).', 'Y'],
  ['pattern.floor.flags', 1, 'Tiles variant: irregular flagstones (`floor.patio.stone`).', 'Y'],
  ['pattern.floor.brick', 1, 'Tiles variant: bricks (`floor.patio.brick`).', 'Y'],
  ['pattern.wall.plain', 1, '', 'Y'],
  ['pattern.wall.stripes', 1, '', 'Y'],
  ['pattern.wall.band', 1, 'Stripes variant: one bold horizontal band (`wall.paper.race_stripe`).', 'Y'],
  ['pattern.wall.checks', 1, '', 'Y'],
  ['pattern.wall.wood', 1, 'Panelling.', 'Y'],
  ['pattern.wall.tiles', 1, 'Square wall tiles.', 'Y'],
  ['pattern.wall.wallpaper', 1, 'Plain paper base; the motif is stamped on top.', 'Y'],
  ['pattern.ground.grass', 2, 'Garden grass, 2 frames of wind. Dither allowed.', 'Y'],
  ['pattern.ground.path', 1, 'Garden path.', 'Y'],
  ['pattern.ground.soil', 1, 'Beds and planters.', 'Y'],
];
const MOTIFS = [
  ['rose', 'wall.paper.roses', 'Y'], ['bat', 'wall.paper.bats', 'Y'], ['fern', 'wall.paper.ferns', 'Y'], ['paw', 'wall.paper.paws', 'Y'],
  ['moonstar', 'wall.paper.moons', 'Y'], ['geo', 'wall.paper.geo', 'N'], ['grid', 'wall.paper.neon_grid', 'N'],
];
const PAINT_PATTERN = (p) => {
  const id = p.id;
  if (id.startsWith('wall.')) {
    if (id.startsWith('wall.plain')) return ['pattern.wall.plain', null];
    if (id.startsWith('wall.tiles')) return ['pattern.wall.tiles', null];
    if (id === 'wall.stripes.plum') return ['pattern.wall.stripes', null];
    if (id === 'wall.wood.oak_panel') return ['pattern.wall.wood', null];
    if (id === 'wall.check.wine') return ['pattern.wall.checks', null];
    if (id === 'wall.paper.race_stripe') return ['pattern.wall.band', null];
    const motif = { 'wall.paper.roses': 'rose', 'wall.paper.bats': 'bat', 'wall.paper.ferns': 'fern', 'wall.paper.paws': 'paw', 'wall.paper.moons': 'moonstar', 'wall.paper.geo': 'geo', 'wall.paper.neon_grid': 'grid' }[id];
    return ['pattern.wall.wallpaper', `motif.${motif}`];
  }
  if (id.startsWith('floor.carpet')) return ['pattern.floor.carpet', null];
  if (id === 'floor.plain.rubber') return ['pattern.floor.rubber', null];
  if (id.startsWith('floor.plain')) return ['pattern.floor.plain', null];
  if (id === 'floor.tiles.hex_white') return ['pattern.floor.hex', null];
  if (id === 'floor.patio.stone') return ['pattern.floor.flags', null];
  if (id === 'floor.patio.brick') return ['pattern.floor.brick', null];
  if (id === 'floor.wood.herringbone') return ['pattern.floor.herringbone', null];
  if (id.startsWith('floor.wood')) return ['pattern.floor.wood', null];
  if (id.startsWith('floor.tiles')) return ['pattern.floor.tiles', null];
  if (id.startsWith('floor.check')) return ['pattern.floor.checks', null];
  if (id.startsWith('floor.stripes')) return ['pattern.floor.stripes', null];
  throw new Error(`no pattern for ${id}`);
};
// MVP flag of paints: unlock != asp:collector
const paintMvp = (p) => !p.unlock.startsWith('asp:collector');

// ---------------------------------------------------------------------------
// 7. Render
// ---------------------------------------------------------------------------
const YN = (b) => (b ? 'Y' : 'N');
const px = (w, h) => `${w} × ${h}`;
const out = [];
const emit = (s = '') => out.push(s);

const batchStats = {};
const bump = (batch, label, keys, frames, mvpKeys, doneKeys, area = 0) => {
  batchStats[batch] ??= {};
  const s = (batchStats[batch][label] ??= { keys: 0, frames: 0, mvp: 0, done: 0, doneFrames: 0, area: 0 });
  s.keys += keys; s.frames += frames; s.mvp += mvpKeys; s.done += doneKeys; s.area += area;
};
/** Pixels of one grid from a size string like '12 × 16' or '14 × 20 overlay'. */
const areaOf = (size) => {
  const m = /(\d+) × (\d+)/.exec(size);
  return m ? Number(m[1]) * Number(m[2]) : 0;
};

emit('# Art checklist');
emit();
emit('Generated by `node scripts/art-checklist.mjs` from `design/spec/home.md` §4.4, §4.5 and §5 plus the tables in the script. Do not edit by hand: change `home.md` or the script and re-run it. Owner: pixel-artist (lead). `FROZEN.md` rows 21 and 22 rule on every key below.');
emit();
emit('## 0. Rules for every artist');
emit();
emit('- **Item key:** `item.<ItemId>` (rotation 0), `.r1` (facing left, side view), `.r2` (facing up, back view). Rotation 3 is `.r1` flipped by the engine, so you never draw it. Then `.on`, `.open`, `.full`, `.overhead` for states. Rotation comes before state: `item.record_player.r1.on`.');
emit('- **Orientations (home.md column):** `4` = keys base, `.r1`, `.r2`; `2` = base and `.r1`; `1` = base only.');
emit('- **State keys exist per rotation.** `front` states (`.open`, and `.on` on screens, stoves and the treadmill) are not drawn for `.r2` (back view): the engine falls back to the plain `.r2` key. `all` states are drawn for every rotation.');
emit('- **Sizes** are the grid in px before the compiler adds the 1 px outline (compiled size is +2 × +2). Floor items: width `16 × fw − 2`; r0 height is the target; for `.r1` the footprint swaps and the height becomes `h + 16 × (fw − fh)`. Treat heights as a target within ±4 px, and keep the front edge on the footprint bottom. Rugs, mats and patterns are 16 px per tile, no outline.');
emit('- **Base and recolour:** `base#palette` in `home.md` means one grid recoloured. Draw the row marked **draw**, then make each row marked **recolour of** with `recolor()` and a palette swap (and tweak details only if it needs them). Recolours share size, rotations and states with their base.');
emit('- **Palette, outline, light:** as `design/spec/art.md` §1 to §4: `PAL` colours only, top-left light, neon only on Neon-tagged items, lavender rim (`ink.rim`) on black or near-black subjects.');
emit('- **Status column:** `done` = already in `src/art/base/` and passing the registry tests; `partial` = a first version exists and the note says what is missing; `proposed` = not in the old `art.md` list, added because a sim.md interaction needs it; `todo`.');
emit('- **MVP flag** is the catalog flag for items. For non-item sprites it is the art lead\'s judgement from sim.md Scope columns: `Y` means an MVP interaction or screen shows it.');
emit('- **Counts:** a **key** is one registry entry; **frames** counts the drawn pixel grids behind it (directions × frames; left is a free flip, rotation 3 is a free flip).');
emit();
emit('Batches: **A** characters and animations (`src/art/base/`), **B** bedroom, living and lighting, **C** kitchen, bathroom, gym and props, **D** garden, plants, cat furniture, patterns, motifs, icons and fx. Folders `src/art/b/`, `c/`, `d/`.');
emit();

// ----- Batch A
emit('## Batch A: characters and animations');
emit();
emit('Owner of `src/art/base/` (the lead keeps the compiler). Anchors, hand points and poses: `art.md` §5 and §6, plus Ellie\'s design lock in `design/ELLIE.md`. Black cats and Poe use the lavender rim. Bruce only needs `idle`, `walk` and `sleep` (a visitor), so his other anims are not listed.');
emit();
let groupName = '';
const aGroups = [];
for (const r of aRows) {
  if (r.group !== groupName) { groupName = r.group; aGroups.push({ name: groupName, rows: [] }); }
  aGroups.at(-1).rows.push(r);
}
for (const g of aGroups) {
  emit(`### A: ${g.name}`);
  emit();
  emit('| Key | Dirs | Frames per dir | Total frames | Size (grid px) | fps | MVP | Status | Notes |');
  emit('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of g.rows) {
    emit(`| \`${r.key}\` | ${dirLabel(r.dirs)} | ${r.fpd} | ${r.frames} | ${r.size} | ${r.fps || '-'} | ${r.mvp} | ${r.status} | ${r.note} |`);
    const doneKey = r.status === 'done';
    bump('A', g.name, 1, r.frames, r.mvp === 'Y' ? 1 : 0, doneKey ? 1 : 0, areaOf(r.size) * r.frames);
    batchStats.A[g.name].doneFrames += doneKey ? r.frames : 0;
  }
  emit();
}

// ----- Item tables
function itemTable(batch, title, filter, intro) {
  emit(`### ${title}`);
  emit();
  if (intro) { emit(intro); emit(); }
  emit('| Key | Item | Footprint (tiles) | Grid px | Frames | MVP | Base and recolour | Status | Notes |');
  emit('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const rows = itemRows.filter((r) => r.batch === batch && filter(r));
  let lastId = '';
  for (const r of rows) {
    const it = r.item;
    const fp = it.fp === 'slot' ? 'surface slot' : `${r.fw}×${r.fh}`;
    const size = r.rug ? px(r.w, r.h) + ' (no outline)' : px(r.w, r.h);
    let baseNote = '';
    const fresh = r.id !== lastId;
    if (r.kind === 'plain' && r.rot === 'r0') {
      baseNote = r.recolour ? `recolour of \`item.${r.recolour}\` (\`${r.base}#${r.pal}\`)` : `**draw** \`${r.base}${r.pal ? '#' + r.pal : ''}\``;
    } else if (r.recolour) baseNote = 'recolour';
    else if (r.kind === 'plain') baseNote = 'same base';
    else baseNote = STATE_NOTE[r.kind] ?? '';
    const note = fresh && ITEM_NOTE[r.id] ? ITEM_NOTE[r.id] : '';
    lastId = r.id;
    emit(`| \`${r.key}\` | \`${r.id}\` (${it.n ? '#' + it.n : 'fixture'}) | ${fp} | ${size} | ${r.frames} | ${YN(r.mvp)} | ${baseNote} | todo | ${note} |`);
  }
  emit();
  const keys = rows.length;
  const frames = rows.reduce((a, r) => a + r.frames, 0);
  const mvpKeys = rows.filter((r) => r.mvp).length;
  const itemIds = new Set(rows.map((r) => r.id)).size;
  bump(batch, title, keys, frames, mvpKeys, 0, rows.reduce((a, r) => a + r.w * r.h * r.frames, 0));
  batchStats[batch][title].items = itemIds;
}

emit('## Batch B: bedroom, living room, lighting');
emit();
emit('Categories: seating, beds, tables, storage, lighting, electronics, wall decor, rugs, decor.');
emit();
const inCat = (...cats) => (r) => cats.includes(r.item.category);
itemTable('B', 'B: seating, beds, tables', inCat('seating', 'beds', 'tables'));
itemTable('B', 'B: storage and decor', inCat('storage', 'decor'));
itemTable('B', 'B: lighting', inCat('lighting'), 'The three garden lanterns (`garden_lantern`, `garden_lantern_string`, `garden_lantern_paper`) are in this table; move them to D if B is the heavier batch.');
itemTable('B', 'B: electronics', inCat('electronics'));
itemTable('B', 'B: wall decor and rugs', inCat('walldecor', 'rugs'));

emit('## Batch C: kitchen, bathroom, gym and props');
emit();
emit('All 8 Hyrox stations are covered. Station to item: 1 `gym_skierg`; 2 and 3 `gym_sled_track` (plus `prop.sled`); 4 burpee broad jump needs no item (the pose `ellie.train.burpeebroadjump` plays on free floor); 5 `gym_rower`; 6 `gym_farmers_handles`; 7 `gym_sandbag`; 8 `gym_wallball_target` (plus `prop.wallball`). `gym_kettlebell` and `gym_treadmill` are extra training pieces. The race board fixture is here too.');
emit();
itemTable('C', 'C: kitchen', inCat('kitchen'));
itemTable('C', 'C: bathroom', inCat('bath'));
itemTable('C', 'C: gym', inCat('gym'));

emit('### C: props and surface decor (not catalog items)');
emit();
emit('Anchor bottom centre, at most 12 × 12. These are carried or loose objects. `prop.*` keys have no rotations.');
emit();
emit('| Key | Size (grid px) | Frames | MVP | Status | Notes |');
emit('| --- | --- | --- | --- | --- | --- |');
for (const [k, size, frames, mvp, note] of PROPS) {
  emit(`| \`${k}\` | ${size} | ${frames} | ${mvp} | todo | ${note} |`);
  bump('C', 'C: props and surface decor (not catalog items)', 1, frames, mvp === 'Y' ? 1 : 0, 0, areaOf(size) * frames);
}
emit();

emit('## Batch D: garden, plants, cat furniture, patterns, motifs, icons, fx');
emit();
itemTable('D', 'D: plants', inCat('plants'));
itemTable('D', 'D: cat furniture', inCat('cat', 'catFurniture'));
itemTable('D', 'D: garden and front step', inCat('garden', 'front'));

emit('### D: wall and floor patterns');
emit();
emit('Each is 16 × 16, no outline, seamless on all sides, using palette characters `1`, `2`, `3` for `PaintDef.colors[0..2]` (`art.md` §1). The engine recolours a pattern per paint, so 36 paints need 21 pattern keys. The variants beyond the six `PaintPattern` names (`carpet`, `rubber`, `herringbone`, `hex`, `flags`, `brick`, `band`) need a rule from the architect or the data owner: see note P1 at the end.');
emit();
emit('| Key | Grid px | Frames | MVP | Status | Notes |');
emit('| --- | --- | --- | --- | --- | --- |');
for (const [k, frames, note, mvp] of PATTERNS) {
  emit(`| \`${k}\` | 16 × 16 | ${frames} | ${mvp} | todo | ${note} |`);
  bump('D', 'D: wall and floor patterns', 1, frames, mvp === 'Y' ? 1 : 0, 0, 256 * frames);
}
emit();
emit('### D: wallpaper motifs');
emit();
emit('Up to 8 × 8, stamped every 8 px, offset 4 on odd rows. The old art.md motif list (bat, moon, star, rose, mushroom, cat_face, leaf, skull) is void; these seven are the ones the paints use.');
emit();
emit('| Key | Grid px | Paint | MVP | Status |');
emit('| --- | --- | --- | --- | --- |');
for (const [m, paint, mvp] of MOTIFS) {
  emit(`| \`motif.${m}\` | 8 × 8 | \`${paint}\` | ${mvp} | todo |`);
  bump('D', 'D: wallpaper motifs', 1, 1, mvp === 'Y' ? 1 : 0, 0, 64);
}
emit();
emit('### D: the 36 paints (no sprites of their own)');
emit();
emit('A paint is a pattern key, up to 3 colours (in `home.md` §5) and an optional motif. Nothing to draw here; this is the lookup the data owner uses for `PaintDef.pattern`/`motif`. 18 paints are at start, 33 are MVP.');
emit();
emit('| Paint | Surface | Pattern key | Motif key | MVP |');
emit('| --- | --- | --- | --- | --- |');
for (const p of [...wallPaints, ...floorPaints]) {
  const [pk, mk] = PAINT_PATTERN(p);
  emit(`| \`${p.id}\` | ${p.id.startsWith('wall') ? 'wall' : 'floor'} | \`${pk}\` | ${mk ? '`' + mk + '`' : '-'} | ${YN(paintMvp(p))} |`);
}
emit();

emit('### D: need icons (`icon.need.<need>`, 10 × 10)');
emit();
emit('| Key | Size | MVP | Status | Glyph |');
emit('| --- | --- | --- | --- | --- |');
for (const [n, g] of NEEDS) { emit(`| \`icon.need.${n}\` | 10 × 10 | Y | todo | ${g} |`); bump('D', 'D: need icons', 1, 1, 1, 0, 100); }
emit();
emit('### D: mood icons (`icon.mood.<band>`, 10 × 10)');
emit();
emit('Ellie\'s face (black hair, one green streak) in five moods. Also the polaroid mood sticker on the HUD.');
emit();
emit('| Key | Size | MVP | Status |');
emit('| --- | --- | --- | --- |');
for (const m of MOODS) { emit(`| \`icon.mood.${m}\` | 10 × 10 | Y | todo |`); bump('D', 'D: mood icons', 1, 1, 1, 0, 100); }
emit();
emit('### D: thought icons (`icon.thought.<id>`, 10 × 10)');
emit();
emit('These also serve as petal and queue icons (see the interaction table), so draw them to read at 16 u in a bubble.');
emit();
emit('| Key | Size | MVP | Status |');
emit('| --- | --- | --- | --- |');
for (const t of THOUGHTS) { emit(`| \`icon.thought.${t}\` | 10 × 10 | Y | todo |`); bump('D', 'D: thought icons', 1, 1, 1, 0, 100); }
emit();
emit('### D: toolbar and mode icons (`icon.ui.<id>`, 12 × 12)');
emit();
emit('| Key | Size | MVP | Status |');
emit('| --- | --- | --- | --- |');
for (const u of UI) { emit(`| \`icon.ui.${u}\` | 12 × 12 | Y | todo |`); bump('D', 'D: toolbar and mode icons', 1, 1, 1, 0, 144); }
emit();
emit('### D: catalog category icons (`icon.cat.<category>`, 12 × 12)');
emit();
emit('One per `ItemCategory`. `icon.cat.cat_furniture` and `icon.cat.wall_decor` are the snake-case spellings of `catFurniture` and `wallDecor`. The `home.md` category `front` (mailbox) and the types.ts `special` category share this set.');
emit();
emit('| Key | Size | MVP | Status |');
emit('| --- | --- | --- | --- |');
for (const c of CATEGORIES) { emit(`| \`icon.cat.${c}\` | 12 × 12 | Y | todo |`); bump('D', 'D: catalog category icons', 1, 1, 1, 0, 144); }
emit();
emit('### D: style tag icons (`icon.style.<tag>`, 10 × 10)');
emit();
emit('| Key | Size | MVP | Status |');
emit('| --- | --- | --- | --- |');
for (const s of STYLES) { emit(`| \`icon.style.${s}\` | 10 × 10 | Y | todo |`); bump('D', 'D: style tag icons', 1, 1, 1, 0, 100); }
emit();
emit('### D: Hyrox, medal, phase, aspiration, sender and emote icons');
emit();
emit('The Hyrox icons double as the petal icon of `gym.<station>.train` and `front_door.run` (no extra art).');
emit();
emit('| Key | Size | MVP | Status | Notes |');
emit('| --- | --- | --- | --- | --- |');
for (const h of HYROX) { emit(`| \`icon.hyrox.${h}\` | 10 × 10 | Y | todo | ${h === 'run' ? 'Treadmill runs, the race run legs and `front_door.run`.' : 'Station glyph, readable without a label.'} |`); bump('D', 'D: Hyrox, medal, phase, aspiration, sender and emote icons', 1, 1, 1, 0, 100); }
for (const m of ['gold', 'silver', 'bronze']) { emit(`| \`icon.medal.${m}\` | 10 × 10 | Y | todo | Race medal; also overlaid on \`gym_medal_rack\`. |`); bump('D', 'D: Hyrox, medal, phase, aspiration, sender and emote icons', 1, 1, 1, 0, 100); }
for (const p of PHASES) { emit(`| \`icon.phase.${p}\` | 10 × 10 | Y | todo | HUD clock phase sprite (ui.md 5). |`); bump('D', 'D: Hyrox, medal, phase, aspiration, sender and emote icons', 1, 1, 1, 0, 100); }
for (const [a, g] of ASPS) { emit(`| \`icon.asp.${a}\` | 10 × 10 | Y | todo | Aspiration bud: ${g}. Proposed key (ui.md 22 says "the aspiration icon"). |`); bump('D', 'D: Hyrox, medal, phase, aspiration, sender and emote icons', 1, 1, 1, 0, 100); }
for (const [s, g] of SENDERS) { emit(`| \`icon.sender.${s}\` | 10 × 10 | Y | todo | Mail sender: ${g}. Proposed key (ui.md 14). |`); bump('D', 'D: Hyrox, medal, phase, aspiration, sender and emote icons', 1, 1, 1, 0, 100); }
for (const e of EMOTES) { emit(`| \`fx.emote.${e}\` | 7 × 7 | Y | todo | Engine-drawn emote (\`Emote\` type), no diamond shapes. Proposed key. |`); bump('D', 'D: Hyrox, medal, phase, aspiration, sender and emote icons', 1, 1, 1, 0, 100); }
emit();
emit('### D: new interaction glyphs (`icon.int.<glyph>`, 10 × 10)');
emit();
emit('`ui.md` §25 and `InteractionDef.icon` say every interaction has an icon. Instead of one icon per interaction id (about 90 ids), interactions share glyphs. `contracts.md` spells the family `icon.int.<glyph>` (`icon.int.sit`, fallback `icon.int.default`); the lead\'s brief wrote `icon.<interactionId>`, so the data owner maps each `InteractionDef.icon` to a glyph key from this section and the next one. The `home.md` ids in the list (`make_tea`, `stargaze` and so on) are mapped to the sim.md id by the data owner (FROZEN row 18); they use the same glyph.');
emit();
emit('| Key | Size | MVP | Status | Glyph | Used by |');
emit('| --- | --- | --- | --- | --- | --- |');
for (const [g, desc, ids, mvp] of INT_NEW) {
  emit(`| \`icon.int.${g}\` | 10 × 10 | ${mvp} | todo | ${desc} | ${ids.map((i) => '`' + i + '`').join(', ')} |`);
  bump('D', 'D: new interaction glyphs', 1, 1, mvp === 'Y' ? 1 : 0, 0, 100);
}
emit();
emit('### D: interactions that reuse an existing icon (no new art)');
emit();
emit('| Icon key | Interactions using it |');
emit('| --- | --- |');
for (const [k, ids] of INT_REUSE) emit(`| \`${k}\` | ${ids.map((i) => '`' + i + '`').join(', ')} |`);
emit();
emit('### D: fx particles (`fx.<id>`, at most 7 × 7)');
emit();
emit('| Key | Size | Frames | MVP | Status | Notes |');
emit('| --- | --- | --- | --- | --- | --- |');
for (const [id, size, note] of FX) {
  const frames = id === 'confetti' ? 3 : 1;
  emit(`| \`fx.${id}\` | ${size} | ${frames} | Y | todo | ${note} |`);
  bump('D', 'D: fx particles', 1, frames, 1, 0, 30 * frames);
}
emit();

// ----- Counts
const order = ['A', 'B', 'C', 'D'];
emit('## Counts');
emit();
emit('Sizes of the work, so the lead can balance the four artists. `keys` = registry entries, `frames` = pixel grids to draw (flips are free), `MVP keys` = keys flagged MVP, `done` = keys already finished in `src/art/base/` (batch A only; every `partial` still has work).');
emit();
emit('| Batch | Section | Items | Keys | Frames | Pixels drawn (kpx) | MVP keys | Done keys |');
emit('| --- | --- | --- | --- | --- | --- | --- | --- |');
const tot = {};
for (const b of order) {
  let k = 0, f = 0, m = 0, d = 0, i = 0, a = 0;
  for (const [label, s] of Object.entries(batchStats[b])) {
    emit(`| ${b} | ${label.replace(/^[A-D]: /, '')} | ${s.items ?? '-'} | ${s.keys} | ${s.frames} | ${(s.area / 1000).toFixed(1)} | ${s.mvp} | ${s.done} |`);
    k += s.keys; f += s.frames; m += s.mvp; d += s.done; i += s.items ?? 0; a += s.area;
  }
  tot[b] = { k, f, m, d, i, a };
  emit(`| **${b}** | **total** | **${i || '-'}** | **${k}** | **${f}** | **${(a / 1000).toFixed(1)}** | **${m}** | **${d}** |`);
}
const sum = (key) => order.reduce((a, b) => a + tot[b][key], 0);
emit(`| **All** | | **${sum('i')}** | **${sum('k')}** | **${sum('f')}** | **${(sum('a') / 1000).toFixed(1)}** | **${sum('m')}** | **${sum('d')}** |`);
emit();

// coverage statements
const catalogIds = new Set(itemRows.filter((r) => r.item.n > 0).map((r) => r.id));
for (const it of items) {
  const n = itemRows.filter((r) => r.key === `item.${it.id}`).length;
  if (n !== 1) throw new Error(`catalog id ${it.id} has ${n} plain keys`);
}
if (new Set(itemRows.map((r) => r.key)).size !== itemRows.length) throw new Error('duplicate item key');
if (catalogBases !== 118) console.warn(`warning: ${catalogBases} distinct catalog bases, home.md says 118`);
emit('### Coverage');
emit();
emit(`- Catalog items covered: ${catalogIds.size} of 124, each id exactly once as a plain \`item.<id>\` key (checked by the generator). Fixtures: ${new Set(itemRows.filter((r) => r.item.n === 0).map((r) => r.id)).size} of 5.`);
emit(`- Distinct base grids: ${catalogBases} for the 124 catalog items (home.md says 118) and ${distinctBases} with the fixtures (home.md says 123). Items that only recolour: ${124 - catalogBases}.`);
emit(`- Paints: 36 (20 wall, 16 floor) mapped to 21 pattern keys and 7 motifs. Hyrox stations: 8 (all with a pose key and an item or a stated "no item").`);
emit();

// per-batch item counts and balance
const itemsByBatch = {};
for (const r of itemRows) if (r.kind === 'plain' && r.rot === 'r0') (itemsByBatch[r.batch] ??= new Set()).add(r.id);
emit('### Items per batch');
emit();
emit('| Batch | Catalog items | Fixtures |');
emit('| --- | --- | --- |');
for (const b of order) {
  const ids = [...(itemsByBatch[b] ?? [])];
  const cat = ids.filter((id) => items.some((i) => i.id === id)).length;
  emit(`| ${b} | ${cat} | ${ids.length - cat} |`);
}
emit();

// ----- Suggested rebalance
const areaOfSection = (b, label) => batchStats[b][label]?.area ?? 0;
const laterOutfitArea = aRows.filter((r) => r.group === 'Outfits' && r.status === 'todo').reduce((a, r) => a + areaOf(r.size) * r.frames, 0);
const visitorArea = aRows.filter((r) => ['Bruce', 'Poe', 'Pickle'].includes(r.group)).reduce((a, r) => a + areaOf(r.size) * r.frames, 0);
const moves = [
  ['B: lighting', 'B', 'C', areaOfSection('B', 'B: lighting')],
  ['B: electronics', 'B', 'C', areaOfSection('B', 'B: electronics')],
  ['B: wall decor and rugs', 'B', 'D', areaOfSection('B', 'B: wall decor and rugs')],
  ['A: later outfits (10 overlays)', 'A', 'D', laterOutfitArea],
  ['A: Bruce, Poe and Pickle', 'A', 'D', visitorArea],
];
const after = Object.fromEntries(order.map((b) => [b, tot[b].a]));
for (const [, from, to, area] of moves) { after[from] -= area; after[to] += area; }
emit('### Suggested rebalance');
emit();
emit('By drawn pixels, B is the heaviest batch and C and D the lightest (D has the most keys, but icons are 10 × 10). If one artist falls behind, move these sections. They are independent of each other: no section depends on a sprite from another.');
emit();
emit('| Move | From | To | kpx moved |');
emit('| --- | --- | --- | --- |');
for (const [label, from, to, area] of moves) emit(`| ${label} | ${from} | ${to} | ${(area / 1000).toFixed(1)} |`);
emit();
emit('| Batch | kpx now | kpx after all moves |');
emit('| --- | --- | --- |');
for (const b of order) emit(`| ${b} | ${(tot[b].a / 1000).toFixed(1)} | ${(after[b] / 1000).toFixed(1)} |`);
emit();
emit('A\'s characters are the most intricate (animation consistency, rim outlines), so a lighter number there does not mean less time. Moving a section only changes who writes it; the key names stay.');
emit();

emit('## Notes, proposals and open points');
emit();
emit('- **P1 (pattern variants):** `PaintPattern` has six names but the paints need seven more looks (`carpet`, `rubber`, `herringbone`, `hex`, `flags`, `brick`, `band`). Proposal: `PaintDef` gets an optional `variant?: string` and the engine looks up `pattern.<surface>.<variant ?? pattern>`. Until the architect decides, the data owner may point `PaintDef.pattern` at the closest base name and the sprite key list stays as above.');
emit(`- **P2 (icon key family):** the checklist uses \`icon.int.<glyph>\` (contracts.md and ui.md) rather than \`icon.<interactionId>\`: interaction ids contain dots and share glyphs, so one key per id would be about 90 icons; this plan draws ${INT_NEW.length} new glyphs and reuses ${INT_REUSE.length} existing icon keys.`);
emit('- **P3 (states beyond the frozen four):** `item.front_mailbox.on` means flag up (mail waiting); `gym_medal_rack` has no state keys (medals are overlaid from `icon.medal.*`); `prop.vase.broken` and `prop.box.open` are prop keys, outside the item state rule.');
emit('- **P4 (lot structure tiles):** walls, doors, windows, the archway, hedge, fence and the garden wall are not in this list. `art.md` has no key family for them. If the engine does not draw them procedurally, the lead adds an `env.*` family and a batch D section.');
emit('- **P5 (new Ellie and cat anims):** `ellie.hold_cat`, `ellie.wand`, `cat.<n>.lap` (George, Salem, Peaches, Bruce excluded), `cat.<n>.scratch`, `cat.<n>.play` and `prop.sled` are added because MVP interactions in sim.md need them and `art.md` did not list them.');
emit('- **P6 (fallbacks):** the checklist assumes the atlas falls back from a missing state key or `.r2` state to the plain key, as `art.md` §4 does for missing directions. The architect should confirm `itemSpriteKey` plus `atlas.has` do this.');
emit();

const text = out.join('\n');
if (check) {
  const disk = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (disk !== text + '\n') {
    console.error('design/spec/art-checklist.md is stale: run node scripts/art-checklist.mjs');
    process.exit(1);
  }
  console.log('art-checklist.md is up to date');
} else {
  writeFileSync(OUT, text + '\n');
  console.log(`wrote ${OUT}`);
  for (const b of order) console.log(b, JSON.stringify(tot[b]));
  console.log('All', sum('k'), 'keys', sum('f'), 'frames');
}
