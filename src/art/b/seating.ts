/** Batch B: seating, beds, tables (design/spec/art-checklist.md "B: seating, beds, tables"). */
import { PAL } from '../base';
import type { Grid, SpriteDef } from '../base';
import { Cv, M, S, ell, legs, mk, prism, rots, type Mat, type View } from './kit';

/** Sofa and armchair. `fw` tiles wide when facing down; `H` is the r0 height. */
export function sofa(v: View, fw: number, H: number, m: Mat, aw = 5): Grid {
  if (v === 1) {
    const h1 = H + 16 * (fw - 1);
    const z = 8;
    const d = h1 - z;
    const c = new Cv(14, h1);
    c.rect(0, 0, 14, d, m.hi);
    c.rect(9, 0, 5, d, m.base);
    c.vl(9, 1, d - 2, m.hi);
    c.vl(13, 0, d, m.lo);
    const seams = Math.max(1, fw - 1);
    for (let i = 1; i <= seams; i++) {
      const y = 5 + Math.round(((d - 10) * i) / (seams + 1));
      if (fw > 1) c.hl(0, y, 9, m.lo);
    }
    c.rect(0, 0, 14, 5, m.hi);
    c.hl(0, 4, 14, m.lo);
    c.rect(0, d - 5, 14, 5, m.hi);
    c.hl(0, d - 1, 14, m.lo);
    c.rect(0, d, 14, z, m.base);
    c.hl(0, d, 14, m.hi);
    c.hl(0, h1 - 1, 14, m.lo);
    c.vl(13, d, z, m.lo);
    c.round(0, 0, 14, h1);
    return c.grid();
  }
  const W = 16 * fw - 2;
  const c = new Cv(W, H);
  if (v === 2) {
    prism(c, 0, 0, W, 3, H - 3, m);
    const seamN = Math.max(1, Math.round(W / 15));
    for (let i = 1; i <= seamN; i++) c.vl(Math.round((W * i) / (seamN + 1)), 5, H - 9, m.lo);
    c.hl(aw, H - 6, W - aw * 2, m.lo);
    c.round(0, 0, W, H);
    return c.grid();
  }
  const backZ = H - 17;
  prism(c, 0, 0, W, 3, backZ, m);
  prism(c, aw, 10, W - aw * 2, 4, H - 14, m);
  const cushions = Math.max(1, fw - 1);
  for (let i = 1; i < cushions; i++) c.vl(aw + Math.round(((W - aw * 2) * i) / cushions), 14, H - 16, m.lo);
  if (fw > 1) for (let i = 1; i < cushions; i++) c.vl(Math.round((W * i) / cushions), 3, backZ - 1, m.lo);
  prism(c, 0, 8, aw, 4, H - 12, m);
  prism(c, W - aw, 8, aw, 4, H - 12, m);
  c.round(0, 0, W, H);
  return c.grid();
}

/** Wooden chair: back with slats, seat, legs. */
export function chair(v: View, m: Mat = M.wood): Grid {
  const c = new Cv(14, 22);
  if (v === 0) {
    c.rect(1, 0, 12, 10, m.base);
    c.hl(1, 0, 12, m.hi);
    c.vl(1, 0, 10, m.hi);
    c.rect(3, 2, 8, 2, m.lo);
    c.rect(3, 5, 8, 2, m.lo);
    prism(c, 0, 10, 14, 4, 3, m);
    legs(c, 0, 17, 14, 5, m, 1);
    c.vl(4, 17, 3, m.deep);
    c.vl(9, 17, 3, m.deep);
  } else if (v === 1) {
    c.rect(10, 0, 4, 16, m.base);
    c.vl(10, 0, 16, m.hi);
    c.vl(13, 0, 16, m.lo);
    c.rect(0, 9, 11, 5, m.hi);
    c.rect(0, 14, 11, 3, m.base);
    c.hl(0, 14, 11, m.hi);
    c.hl(0, 16, 11, m.lo);
    c.vl(1, 17, 5, m.lo);
    c.vl(9, 17, 5, m.deep);
    c.vl(12, 16, 6, m.deep);
  } else {
    c.rect(1, 0, 12, 15, m.base);
    c.hl(1, 0, 12, m.hi);
    c.vl(1, 0, 15, m.hi);
    c.vl(12, 0, 15, m.lo);
    c.rect(3, 3, 8, 8, m.lo);
    c.hl(0, 15, 14, m.lo);
    c.vl(1, 16, 6, m.lo);
    c.vl(12, 16, 6, m.deep);
  }
  c.round(0, 0, 14, 22);
  return c.grid();
}

function beanbag(): Grid {
  const c = new Cv(14, 14);
  ell(c, 7, 8, 6.5, 5.5, S.pink);
  ell(c, 7, 3.5, 3.5, 3, S.pink);
  c.rect(10, 8, 3, 4, M.rose.lo);
  c.hl(3, 12, 8, M.rose.lo);
  c.hl(5, 13, 5, M.rose.lo);
  c.rect(4, 2, 3, 2, M.rose.hi);
  c.px(3, 5, M.rose.hi);
  c.px(8, 6, M.rose.lo);
  c.vl(7, 6, 3, M.rose.lo);
  return c.grid();
}

export interface BedStyle {
  readonly blanket: Mat;
  readonly frame: Mat;
  readonly stripe?: Mat;
}

/** Y of the first row covered by the blanket (r0, r2) and the first column (r1). */
export const BED_BLANKET_Y = 19;

/** A bed. Returns the full picture and the blanket layer drawn above sleepers. */
export function bed(v: View, st: BedStyle, top = 0): { base: Grid; over: Grid } {
  const { blanket: bl, frame: fr } = st;
  const bone = M.bone;
  if (v === 0) {
    const c = new Cv(30, 54 + top);
    const y = top;
    prism(c, 0, y, 30, 2, 8, fr);
    c.rect(0, y + 10, 30, 34, fr.base);
    c.vl(0, y + 10, 34, fr.hi);
    c.rect(1, y + 10, 28, 34, bone.hi);
    for (const px of [3, 16]) {
      c.rect(px, y + 11, 11, 6, bone.hi);
      c.hl(px, y + 16, 11, bone.lo);
      c.vl(px + 10, y + 11, 6, bone.base);
      c.vl(px, y + 11, 6, S.white);
    }
    c.rect(1, y + 19, 28, 3, bone.hi);
    c.hl(1, y + 21, 28, bone.base);
    c.rect(1, y + 22, 28, 22, bl.hi);
    if (st.stripe) for (let i = 0; i < 5; i++) c.hl(1, y + 26 + i * 4, 28, st.stripe.base);
    c.vl(28, y + 22, 22, bl.base);
    c.rect(0, y + 44, 30, 10, fr.base);
    c.hl(0, y + 44, 30, fr.hi);
    c.rect(1, y + 44, 28, 4, bl.base);
    c.hl(1, y + 47, 28, bl.lo);
    c.hl(0, y + 53, 30, fr.lo);
    c.vl(29, y + 44, 10, fr.lo);
    c.rect(0, y + 51, 3, 3, fr.deep);
    c.rect(27, y + 51, 3, 3, fr.deep);
    c.round(0, y, 30, 54);
    const over = c.clone().clearAbove(y + BED_BLANKET_Y);
    return { base: c.grid(), over: over.grid() };
  }
  if (v === 1) {
    const c = new Cv(46, 38 + top);
    const y = top;
    c.rect(40, y, 6, 38, fr.base);
    c.vl(40, y, 30, fr.hi);
    c.rect(41, y + 2, 4, 26, fr.lo);
    c.rect(40, y + 30, 6, 8, fr.base);
    c.hl(40, y + 30, 6, fr.hi);
    c.rect(0, y + 4, 40, 26, fr.base);
    c.rect(0, y + 5, 40, 25, bone.hi);
    c.rect(33, y + 6, 6, 14, bone.hi);
    c.vl(33, y + 6, 14, S.white);
    c.hl(33, y + 19, 6, bone.lo);
    c.rect(27, y + 5, 5, 25, bone.hi);
    c.vl(31, y + 5, 25, bone.base);
    c.rect(0, y + 5, 27, 25, bl.hi);
    if (st.stripe) for (let i = 0; i < 6; i++) c.vl(2 + i * 4, y + 5, 25, st.stripe.base);
    c.hl(0, y + 29, 27, bl.base);
    c.rect(0, y + 30, 40, 8, fr.base);
    c.hl(0, y + 30, 40, fr.hi);
    c.rect(0, y + 30, 27, 4, bl.base);
    c.hl(0, y + 33, 27, bl.lo);
    c.hl(0, y + 37, 46, fr.lo);
    c.rect(0, y + 35, 3, 3, fr.deep);
    c.rect(37, y + 35, 3, 3, fr.deep);
    c.round(0, y, 46, 38);
    const over = c.clone();
    for (let j = 0; j < c.h; j++) for (let i = 32; i < 46; i++) if (j < y + 30) over.px(i, j, '.');
    return { base: c.grid(), over: over.grid() };
  }
  const c = new Cv(30, 54 + top);
  const y = top;
  prism(c, 0, y, 30, 2, 5, fr);
  c.rect(0, y + 7, 30, 30, fr.base);
  c.vl(0, y + 7, 30, fr.hi);
  c.rect(1, y + 7, 28, 30, bl.hi);
  if (st.stripe) for (let i = 0; i < 6; i++) c.hl(1, y + 11 + i * 4, 28, st.stripe.base);
  c.vl(28, y + 7, 30, bl.base);
  c.rect(1, y + 7, 28, 3, bl.base);
  c.rect(1, y + 30, 28, 7, bone.hi);
  for (const px of [3, 16]) {
    c.rect(px, y + 31, 11, 6, bone.hi);
    c.hl(px, y + 36, 11, bone.lo);
  }
  prism(c, 0, y + 37, 30, 2, 15, fr);
  c.rect(3, y + 41, 24, 8, fr.lo);
  c.rect(4, y + 42, 22, 6, fr.base);
  c.hl(0, y + 53, 30, fr.deep);
  c.round(0, y, 30, 54);
  const over = c.clone().clearAbove(y + 7);
  for (let j = y + 30; j < c.h; j++) for (let i = 0; i < 30; i++) over.px(i, j, '.');
  return { base: c.grid(), over: over.grid() };
}

const PLAIN: BedStyle = { blanket: M.plum, frame: M.wood };
export const QUILT: BedStyle = { blanket: M.rose, frame: M.pine, stripe: M.bone };
const CANOPY: BedStyle = { blanket: M.wine, frame: M.darkwood };

/** Canopy bed: the bed 16 px lower, posts, rails and drapes (part of the base). */
function canopy(v: View): { base: Grid; over: Grid } {
  const { base, over } = bed(v, CANOPY, 16);
  const c = Cv.from(base);
  const dk = M.darkwood;
  const dr = M.wine;
  if (v === 1) {
    c.rect(0, 0, 46, 2, dk.hi);
    c.rect(0, 2, 46, 1, dk.lo);
    for (const x of [0, 44]) c.rect(x, 0, 2, 38, dk.base);
    c.rect(0, 36, 46, 2, dk.base);
    c.hl(0, 36, 46, dk.hi);
    for (let i = 0; i < 10; i++) c.vl(3 + i * 4, 3, 24 - (i % 2) * 2, i % 2 ? dr.lo : dr.base);
    c.rect(2, 3, 42, 1, dr.hi);
    for (const x of [0, 44]) c.rect(x, 36, 2, 18, dk.base);
    c.vl(0, 38, 16, dk.hi);
  } else {
    c.rect(0, 0, 30, 2, dk.hi);
    c.hl(0, 2, 30, dk.lo);
    for (const x of [0, 28]) c.rect(x, 0, 2, 38, dk.base);
    c.vl(0, 0, 38, dk.hi);
    c.rect(0, 36, 30, 2, dk.base);
    c.hl(0, 36, 30, dk.hi);
    for (const x of [2, 24]) {
      for (let j = 0; j < 4; j++) c.vl(x + j, 3, 33 - (j % 2) * 3, j % 2 ? dr.lo : dr.base);
      c.rect(x, 3, 4, 1, dr.hi);
    }
    for (const x of [0, 28]) c.rect(x, 36, 2, 34, dk.base);
    c.vl(0, 38, 32, dk.hi);
    c.rect(0, 66, 2, 4, dk.deep);
    c.rect(28, 66, 2, 4, dk.deep);
  }
  return { base: c.grid(), over };
}

function roundTable(m: Mat): Grid {
  const c = new Cv(30, 32);
  ell(c, 15, 10, 14.5, 9.5, m.hi);
  ell(c, 15, 12, 14.5, 9.5, m.base);
  ell(c, 15, 10, 14.5, 9.5, m.hi);
  for (let x = 2; x < 28; x++) if (c.get(x, 18) === m.hi) c.px(x, 18, m.base);
  ell(c, 15, 10, 11, 6.5, m.hi);
  c.rect(14, 4, 6, 2, m.base);
  c.rect(13, 21, 5, 8, m.lo);
  c.vl(13, 21, 8, m.base);
  c.hl(9, 29, 13, m.lo);
  c.hl(10, 28, 11, m.base);
  c.hl(8, 30, 15, m.deep);
  c.hl(9, 31, 13, m.deep);
  return c.grid();
}

function coffeeTable(v: View): Grid {
  const m = M.wood;
  if (v === 1) {
    const c = new Cv(14, 32);
    prism(c, 0, 0, 14, 24, 3, m);
    c.rect(2, 2, 10, 20, m.hi);
    c.vl(1, 27, 5, m.lo);
    c.vl(12, 27, 5, m.deep);
    c.vl(1, 27, 0, m.lo);
    return c.grid();
  }
  const c = new Cv(30, 16);
  prism(c, 0, 0, 30, 9, 3, m);
  c.rect(2, 1, 26, 7, m.hi);
  c.hl(2, 7, 26, m.base);
  legs(c, 0, 12, 30, 4, m, 1);
  c.vl(2, 12, 3, m.lo);
  c.vl(27, 12, 3, m.deep);
  return c.grid();
}

function coffinNightstand(v: View): Grid {
  const m = M.darkwood;
  const c = new Cv(14, 18);
  const row = [4, 3, 2, 1, 1, 1];
  row.forEach((x0, j) => c.hl(x0, j, 14 - x0 * 2 + (j < 3 ? 0 : 0), m.hi));
  c.rect(1, 6, 12, 10, m.base);
  c.hl(1, 6, 12, m.hi);
  c.vl(12, 6, 10, m.lo);
  c.hl(1, 15, 12, m.lo);
  if (v === 0) {
    c.rect(3, 8, 8, 5, m.lo);
    c.rect(4, 9, 6, 3, m.base);
    c.px(6, 10, M.gold.base);
    c.px(7, 10, M.gold.base);
    c.px(6, 8, M.lavender.lo);
    c.px(7, 8, M.lavender.lo);
  } else if (v === 1) {
    c.rect(3, 8, 8, 5, m.base);
    c.vl(1, 6, 10, M.gold.lo);
  } else {
    c.rect(3, 8, 8, 6, m.lo);
  }
  c.rect(1, 16, 2, 2, m.deep);
  c.rect(11, 16, 2, 2, m.deep);
  return c.grid();
}

function sideboard(v: View): Grid {
  const m = M.wood;
  const W = v === 1 ? 14 : 30;
  const H = v === 1 ? 42 : 26;
  const c = new Cv(W, H);
  if (v === 1) {
    prism(c, 0, 0, W, 24, 15, m);
    c.rect(2, 2, 10, 20, m.hi);
    c.vl(1, 24, 15, m.base);
    c.rect(3, 26, 8, 10, m.lo);
    c.rect(3, 26, 1, 10, M.gold.base);
    c.vl(1, 39, 3, m.deep);
    c.vl(12, 39, 3, m.deep);
    return c.grid();
  }
  prism(c, 0, 0, 30, 9, 14, m);
  c.rect(2, 1, 26, 7, m.hi);
  c.hl(2, 7, 26, m.base);
  if (v === 0) {
    c.vl(10, 10, 12, m.lo);
    c.vl(20, 10, 12, m.lo);
    c.rect(11, 12, 8, 7, m.lo);
    c.rect(3, 12, 5, 2, m.hi);
    for (const x of [8, 12, 17, 21]) c.px(x, 15, M.gold.base);
    c.rect(2, 11, 8, 10, m.base);
    c.rect(21, 11, 7, 10, m.base);
    c.rect(11, 11, 9, 10, m.base);
    c.vl(10, 10, 12, m.deep);
    c.vl(20, 10, 12, m.deep);
    for (const x of [8, 12, 17, 22]) c.px(x, 15, M.gold.base);
  } else {
    c.rect(2, 11, 26, 10, m.lo);
  }
  c.vl(2, 23, 3, m.lo);
  c.vl(27, 23, 3, m.deep);
  c.rect(1, 23, 3, 3, m.deep);
  c.rect(26, 23, 3, 3, m.deep);
  c.rect(2, 23, 1, 3, m.lo);
  return c.grid();
}

export function mvpSeating(): SpriteDef[] {
  const out: SpriteDef[] = [];
  out.push(...rots('item.sofa_basic', (v) => sofa(v, 3, 24, M.plum), [0, 1, 2]));
  out.push(...rots('item.chair_basic', (v) => chair(v), [0, 1, 2]));
  out.push(...rots('item.armchair_velvet', (v) => sofa(v, 1, 24, M.wine, 3), [0, 1, 2]));
  out.push(mk('item.beanbag_neon', beanbag()));
  const beds: [string, BedStyle][] = [['item.bed_double_basic', PLAIN]];
  for (const [key, st] of beds) {
    for (const v of [0, 1, 2] as const) {
      const b = bed(v, st);
      const sfx = v === 0 ? '' : v === 1 ? '.r1' : '.r2';
      out.push(mk(key + sfx, b.base), mk(key + sfx + '.overhead', b.over));
    }
  }
  for (const v of [0, 1, 2] as const) {
    const b = canopy(v);
    const sfx = v === 0 ? '' : v === 1 ? '.r1' : '.r2';
    out.push(mk('item.bed_canopy_goth' + sfx, b.base), mk('item.bed_canopy_goth' + sfx + '.overhead', b.over));
  }
  out.push(mk('item.table_small_round', roundTable(M.wood)));
  out.push(...rots('item.table_coffee_low', coffeeTable, [0, 1]));
  out.push(...rots('item.nightstand_coffin', coffinNightstand, [0, 1, 2], { outline: PAL.ink.rim }));
  out.push(...rots('item.sideboard_retro', sideboard, [0, 1, 2]));
  return out;
}
