/**
 * The four cats and the visitors, ported from game 1 (CAT_STRIPED, CAT_SMALL, CAT_BIG,
 * CAT_CALICO, SPR.bruce, SPR.poe, SPR.pickle, SPR.shadowSleep, George's paw lick and
 * Pickle's throat puff from drawCat).
 *
 * Wave 1 has idle (game 1's 1 px breathing bob), a front-view walk (paw lifts), sleep
 * (eyes closed) and the game 1 extras. Side and up views come later (design/spec/art.md 5).
 */
import { def, fill, gridW, lift, mirror, pad, recolor } from './grid';
import { BRUCE_PAL, GEORGE_PAL, PAL, PEACHES_PAL, PICKLE_PAL, POE_PAL, SALEM_PAL, SHADOW_PAL } from './palette';
import type { Grid, Palette, SpriteDef } from './types';

/** George: ginger, striped. */
export const CAT_STRIPED: Grid = [
  '.f........f.',
  '.ff......ff.',
  '.fpffffffpf.',
  '.fFffFFffFf.',
  'ffeffffffeff',
  'fffffppfffff',
  '.ffffffffff.',
  '..ffFffFff.f',
  '.fFffFffFfff',
  '.ffffffffff.',
  '.fFffffffFf.',
  '..ff....ff..',
];

/** Peaches: dilute calico. */
export const CAT_CALICO: Grid = [
  '.g........c.',
  '.gg......cc.',
  '.gpffffffpc.',
  '.gggfffcccf.',
  'ffeffffffeff',
  'fffffppfffff',
  '.ffffffffff.',
  '..ffggfcff.c',
  '.fgggffccfcc',
  '.ffggffccff.',
  '.ffffffffff.',
  '..ff....ff..',
];

/** Salem: small and black. */
export const CAT_SMALL: Grid = [
  '.f.....f.',
  '.ff...ff.',
  '.fHHfffff',
  'ffeffffef',
  'ffffpffff',
  '.fffffff.',
  '..fffff.f',
  '.ffffffff',
  '.fffffff.',
  '..ff.ff..',
];

/** Shadow: big and black. */
export const CAT_BIG: Grid = [
  '.f..........f.',
  '.ff........ff.',
  '.fpfHHHfffpff.',
  '.ffffffffffff.',
  'fffeeffffeefff',
  'ffffffppffffff',
  '.ffffffffffff.',
  '..ffffffffff..',
  '.ffffffffffff.',
  'ffffffffffffff',
  'ffffffffffffff',
  '.ffffffffffff.',
  '.ffffffffffff.',
  '..fff....fff..',
];

/** Bruce: flame point Siamese (orange ears and tail tip, light orange marks, blue eyes). */
export const CAT_BRUCE: Grid = [
  '.o........o.',
  '.oo......oo.',
  '.opffffffpo.',
  '.ffffffffff.',
  'ffeffffffeff',
  'ffffmppmffff',
  '.ffffffffff.',
  '..ffffffff.o',
  '.ffmfffffffo',
  '.ffffffmfff.',
  '.ffffffffff.',
  '..ff....ff..',
];

/** Poe as drawn in game 1, facing left (beak on the left). */
export const POE_LEFT: Grid = [
  '....kkkk....',
  '...kkkkkk...',
  '..kkekkkkk..',
  'bbkkkkkkkk..',
  '..kkkkkkkkk.',
  '..kkkKKkkkkk',
  '...kkKKKkkkk',
  '...kkkKKkkk.',
  '....kkkkkk..',
  '.....l..l...',
  '....ll.ll...',
];

export const PICKLE: Grid = [
  '..gg....gg..',
  '.gwkg..gwkg.',
  '.gggggggggg.',
  'gggggggggggg',
  'ggmmmmmmmmgg',
  'gggggggggggg',
  '.gGGGGGGGGg.',
  '.gGGGGGGGGg.',
  '..gg....gg..',
];

/** Idle: a 1 px breathing bob (game 1 drawCat, 1.2 Hz). One spare row on top. */
function bob(g: Grid): Grid[] {
  const base = pad(g, { top: 1 });
  return [base, lift(base)];
}

/** Front-view walk: the right paw lifts, then the left (last row is the feet). */
function pawWalk(g: Grid): Grid[] {
  const w = gridW(g);
  const last = g.length - 1;
  const half = Math.ceil(w / 2);
  const feet = g[last] ?? '';
  const keep = (from: number, to: number): string => [...feet].map((ch, x) => (x >= from && x < to ? ch : '.')).join('');
  return [
    [...g.slice(0, last), keep(0, half)],
    [...g.slice(0, last), keep(half, w)],
  ];
}

interface CatArt {
  readonly base: string;
  readonly grid: Grid;
  readonly palette: Palette;
  /** Lid colour for closed eyes (the darker fur shade). */
  readonly lid: string;
  readonly outline?: string;
}

const RIM = PAL.ink.rim;

export const CAT_ART: readonly CatArt[] = [
  { base: 'cat.george', grid: CAT_STRIPED, palette: GEORGE_PAL, lid: 'F' },
  { base: 'cat.salem', grid: CAT_SMALL, palette: SALEM_PAL, lid: 'H', outline: RIM },
  { base: 'cat.shadow', grid: CAT_BIG, palette: SHADOW_PAL, lid: 'H', outline: RIM },
  { base: 'cat.peaches', grid: CAT_CALICO, palette: PEACHES_PAL, lid: 'g' },
  { base: 'visitor.bruce', grid: CAT_BRUCE, palette: BRUCE_PAL, lid: 'm' },
];

function catSprites(c: CatArt): SpriteDef[] {
  const o = c.outline !== undefined ? { outline: c.outline } : {};
  const h = c.grid.length;
  const w = gridW(c.grid);
  const idle = bob(c.grid);
  return [
    def(`${c.base}.idle`, null, c.palette, { ...o, frames: idle, fps: 1.2, anchor: { x: w / 2, y: h + 1 } }),
    def(`${c.base}.walk`, null, c.palette, { ...o, dirs: { down: pawWalk(c.grid) }, fps: 6 }),
    def(`${c.base}.sleep`, recolor(c.grid, { e: c.lid }), c.palette, { ...o, fps: 0.8 }),
  ];
}

/** George's paw lick (game 1 drawCat): the paw rises to the mouth and back. */
function georgeGroom(): SpriteDef {
  const lick = (k: number): Grid => fill(fill(CAT_STRIPED, 3, 5 - k, 4, 3, 'k'), 4, 5 - k, 2, 2, 'f');
  return def('cat.george.groom', null, GEORGE_PAL, { dirs: { down: [lick(0), lick(1)] }, fps: 6 });
}

/** Poe faces right in the registry (side), so left is game 1's drawing. */
export const POE_SIDE: Grid = mirror(POE_LEFT);

/** Pickle with a spare row above for the bob. Anchor on his feet. */
const PICKLE_FRAME = pad(PICKLE, { top: 1 });
const PICKLE_ANCHOR = { x: 6, y: 10 } as const;

export const CAT_SPRITES: readonly SpriteDef[] = [
  ...CAT_ART.flatMap(catSprites),
  georgeGroom(),
  def('visitor.poe.idle', null, POE_PAL, { dirs: { side: bob(POE_SIDE) }, fps: 1.2, outline: RIM }),
  def('visitor.pickle.idle', null, PICKLE_PAL, { frames: [PICKLE_FRAME, lift(PICKLE_FRAME)], fps: 1.2, anchor: PICKLE_ANCHOR }),
  def('visitor.pickle.ribbit', null, PICKLE_PAL, {
    // game 1: the throat puffs out and fills the gap between his feet
    frames: [PICKLE_FRAME, fill(PICKLE_FRAME, 4, 7, 5, 3, 'G')],
    fps: 3,
    anchor: PICKLE_ANCHOR,
  }),
];
