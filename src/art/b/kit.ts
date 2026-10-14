/**
 * Drawing kit shared by batches B and C: a mutable canvas, 3/4 prisms (top face plus front
 * face, light from the top left), one global palette so every sprite uses the same
 * characters, and recolour helpers. Colours come from PAL only (design/spec/art.md 2).
 */
import { PAL, def, recolor } from '../base';
import type { DefOptions, Grid, Palette, SpriteDef } from '../base';

/** A material: the four characters of a PAL ramp. */
export interface Mat {
  readonly hi: string;
  readonly base: string;
  readonly lo: string;
  readonly deep: string;
}

const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=~;:?^';
const RAMP_NAMES = [
  'plum',
  'lavender',
  'wine',
  'moss',
  'leaf',
  'wood',
  'darkwood',
  'pine',
  'stone',
  'steel',
  'bone',
  'gold',
  'night',
  'rose',
  'terracotta',
  'glow',
] as const;
export type RampName = (typeof RAMP_NAMES)[number];

const pal: Record<string, string> = {};
let next = 0;
const take = (hex: string): string => {
  const ch = ALPHA[next++];
  if (!ch) throw new Error('kit: out of palette characters');
  pal[ch] = hex;
  return ch;
};

const ramps = {} as Record<RampName, Mat>;
for (const n of RAMP_NAMES) {
  const r = PAL[n];
  ramps[n] = { hi: take(r.hi), base: take(r.base), lo: take(r.lo), deep: take(r.deep) };
}
/** Material characters by PAL ramp name. */
export const M: Readonly<Record<RampName, Mat>> = ramps;

/** Single colours. `K` is ink.outline for seams and slots. */
export const S = {
  K: take(PAL.ink.outline),
  rim: take(PAL.ink.rim),
  pink: take(PAL.neon.pink),
  cyan: take(PAL.neon.cyan),
  green: take(PAL.neon.green),
  yellow: take(PAL.neon.yellow),
  white: take(PAL.extra.white),
  vinyl: take(PAL.extra.vinyl),
  vinylSheen: take(PAL.extra.vinylSheen),
  glass: take(PAL.extra.glass),
  glassHi: take(PAL.extra.glassHi),
  cork: take(PAL.extra.cork),
  snow: take(PAL.extra.snow),
  coffee: take(PAL.extra.coffee),
  mug: take(PAL.extra.mug),
  pearl: take(PAL.extra.pearl),
  fortune: take(PAL.extra.fortune),
  chef: take(PAL.extra.chefShade),
} as const;

/** The shared palette for every B and C sprite (unused entries are harmless). */
export const PALETTE: Palette = pal;

/** Mutable pixel canvas. Drawing outside is clipped. */
export class Cv {
  readonly rows: string[][];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.rows = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  }
  static from(g: Grid): Cv {
    const c = new Cv(g[0]?.length ?? 0, g.length);
    g.forEach((r, y) => [...r].forEach((ch, x) => c.px(x, y, ch)));
    return c;
  }
  px(x: number, y: number, ch: string): this {
    const row = this.rows[y];
    if (row && x >= 0 && x < this.w) row[x] = ch;
    return this;
  }
  get(x: number, y: number): string {
    return this.rows[y]?.[x] ?? '.';
  }
  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, ch);
    return this;
  }
  hl(x: number, y: number, w: number, ch: string): this {
    return this.rect(x, y, w, 1, ch);
  }
  vl(x: number, y: number, h: number, ch: string): this {
    return this.rect(x, y, 1, h, ch);
  }
  /** Removes the four corner pixels of a rectangle (a softened corner). */
  round(x: number, y: number, w: number, h: number): this {
    return this.px(x, y, '.')
      .px(x + w - 1, y, '.')
      .px(x, y + h - 1, '.')
      .px(x + w - 1, y + h - 1, '.');
  }
  /** Pastes a pattern; `.` is skipped. `map` swaps characters on the way in. */
  put(x: number, y: number, g: Grid): this {
    g.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && this.px(x + i, y + j, ch)));
    return this;
  }
  /** Clears every row above `y`. */
  clearAbove(y: number): this {
    for (let j = 0; j < Math.min(y, this.h); j++) this.rect(0, j, this.w, 1, '.');
    return this;
  }
  clone(): Cv {
    return Cv.from(this.grid());
  }
  grid(): Grid {
    return this.rows.map((r) => r.join(''));
  }
}

/**
 * A 3/4 block: `d` rows of top face over `z` rows of front face. Lit top-left: the top is
 * `hi` with a `base` right edge, the front is `base` with a `hi` catch-light, a `lo` right
 * edge and a `lo` bottom row.
 */
export function prism(c: Cv, x: number, y: number, w: number, d: number, z: number, m: Mat): void {
  c.rect(x, y, w, d, m.hi);
  c.vl(x + w - 1, y, d, m.base);
  c.rect(x, y + d, w, z, m.base);
  c.hl(x, y + d, w, m.hi);
  if (z > 2) {
    c.vl(x + w - 1, y + d, z, m.lo);
    c.hl(x, y + d + z - 1, w, m.lo);
  }
}

/** A prism whose corners are softened. */
export function softPrism(c: Cv, x: number, y: number, w: number, d: number, z: number, m: Mat): void {
  prism(c, x, y, w, d, z, m);
  c.round(x, y, w, d + z);
}

/** Legs under a front face: two short posts at the front corners. */
export function legs(c: Cv, x: number, y: number, w: number, len: number, m: Mat, inset = 0): void {
  c.vl(x + inset, y, len, m.lo);
  c.vl(x + w - 1 - inset, y, len, m.deep);
}

/** A plain wooden panel front with a seam and handle dots, for cupboards and drawers. */
export function seam(c: Cv, x: number, y: number, h: number, ch: string): void {
  c.vl(x, y, h, ch);
}

/** Swaps one ramp for another (`recolor` for materials). */
export function swapRamp(g: Grid, from: RampName, to: RampName): Grid {
  const a = M[from];
  const b = M[to];
  return recolor(g, { [a.hi]: b.hi, [a.base]: b.base, [a.lo]: b.lo, [a.deep]: b.deep });
}

/** Builds a def with the shared palette. Anchor defaults to the bottom centre. */
export function mk(key: string, grid: Grid, opts: DefOptions = {}): SpriteDef {
  return def(key, grid, PALETTE, opts);
}

/** A state with frames (first frame is the still). */
export function mkAnim(key: string, frames: readonly Grid[], fps: number, opts: DefOptions = {}): SpriteDef {
  return def(key, null, PALETTE, { ...opts, frames, fps });
}

/** Light pool pixels of a lit shade, flame pairs etc. live next to the items that use them. */
export const FLAME = [M.glow.hi, M.glow.base] as const;

/** Filled ellipse centred on (cx, cy) with radii rx, ry (cell centres). */
export function ell(c: Cv, cx: number, cy: number, rx: number, ry: number, ch: string): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / (rx + 0.3);
      const dy = (y + 0.5 - cy) / (ry + 0.3);
      if (dx * dx + dy * dy <= 1) c.px(x, y, ch);
    }
  }
}

/** Swaps rows and columns (a horizontal strip becomes a vertical one). */
export function transpose(g: Grid): Grid {
  const w = g[0]?.length ?? 0;
  return Array.from({ length: w }, (_, x) => g.map((r) => r[x] ?? '.').join(''));
}

/** 0 faces down, 1 faces left, 2 faces up. */
export type View = 0 | 1 | 2;

/** The sprite key suffix of a view. */
export const VIEW_SUFFIX: Readonly<Record<View, string>> = { 0: '', 1: '.r1', 2: '.r2' };

/** Registers a base key and its rotations from one builder: `build(view)`. */
export function rots(key: string, build: (v: View) => Grid, views: readonly View[], opts: DefOptions = {}): SpriteDef[] {
  return views.map((v) => mk(key + VIEW_SUFFIX[v], build(v), opts));
}

/** Registers a state per view with frames: `build(view)` returns the frames. */
export function rotsAnim(key: string, build: (v: View) => readonly Grid[], views: readonly View[], fps: number, opts: DefOptions = {}): SpriteDef[] {
  return views.map((v) => mkAnim(key + VIEW_SUFFIX[v], build(v), fps, opts));
}
