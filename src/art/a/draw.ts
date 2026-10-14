/**
 * Small drawing kit shared by batches A and D: a character canvas (`Cv`), one shared
 * palette (`SP`, one character per PAL step) and ASCII helpers. Everything is pure.
 * Colours come from PAL only (design/spec/art.md 2).
 */
import { PAL } from '../base/palette';
import type { Grid, Palette } from '../base/types';

export interface Ramp {
  readonly hi: string;
  readonly base: string;
  readonly lo: string;
  readonly deep: string;
}

const RAMP_CHARS = {
  plum: 'abcd',
  lavender: 'efgh',
  wine: 'ijkl',
  moss: 'mnop',
  leaf: 'qrst',
  wood: 'uvwx',
  darkwood: 'yzAB',
  pine: 'CDEF',
  stone: 'GHIJ',
  steel: 'KLMN',
  bone: 'OPQR',
  gold: 'STUV',
  night: 'WXYZ',
  rose: '0123',
  terracotta: '4567',
  glow: '89!@',
} as const;

type RampName = keyof typeof RAMP_CHARS;

/** Character names for every ramp step: `R.wood.base` is the char for warm wood. */
export const R = Object.fromEntries(
  (Object.keys(RAMP_CHARS) as RampName[]).map((n) => {
    const [hi, base, lo, deep] = [...RAMP_CHARS[n]];
    return [n, { hi, base, lo, deep }];
  }),
) as Record<RampName, Ramp>;

/** Single-character colours outside the ramps. */
export const K = {
  ink: '#',
  rim: '~',
  white: '*',
  pink: '$',
  cyan: '%',
  green: '^',
  yellow: '&',
  paper: '=',
  paperInk: '+',
  muted: '-',
  box: '_',
} as const;

/** The shared palette: every ramp step plus the K extras. */
export const SP: Palette = (() => {
  const p: Record<string, string> = {
    '#': PAL.ink.outline,
    '~': PAL.ink.rim,
    '*': PAL.extra.white,
    $: PAL.neon.pink,
    '%': PAL.neon.cyan,
    '^': PAL.neon.green,
    '&': PAL.neon.yellow,
    '=': PAL.ui.paper,
    '+': PAL.ui.paperInk,
    '-': PAL.ui.muted,
    _: PAL.ui.box,
  };
  for (const n of Object.keys(RAMP_CHARS) as RampName[]) {
    const src = PAL[n] as Ramp;
    const [hi, base, lo, deep] = [...RAMP_CHARS[n]];
    p[hi as string] = src.hi;
    p[base as string] = src.base;
    p[lo as string] = src.lo;
    p[deep as string] = src.deep;
  }
  return p;
})();

/** Right-pads short rows with `.` so hand-typed pictures cannot go ragged. */
export function P(w: number, rows: readonly string[]): Grid {
  return rows.map((r) => {
    if (r.length > w) throw new Error(`P: row '${r}' is ${r.length} wide, max ${w}`);
    return r + '.'.repeat(w - r.length);
  });
}

/** Mutable character canvas. `g` is the finished grid. */
export class Cv {
  private readonly rows: string[][];
  constructor(
    readonly w: number,
    readonly h: number,
    init?: Grid,
  ) {
    this.rows = init ? init.map((r) => [...r]) : Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  }

  get g(): Grid {
    return this.rows.map((r) => r.join(''));
  }

  px(x: number, y: number, c: string): this {
    const row = this.rows[Math.round(y)];
    const ix = Math.round(x);
    if (row && ix >= 0 && ix < this.w) row[ix] = c;
    return this;
  }

  at(x: number, y: number): string {
    return this.rows[y]?.[x] ?? '.';
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  /** Lit box: hi on the top row and left column, lo on the bottom row and right column. */
  box(x: number, y: number, w: number, h: number, r: Ramp): this {
    this.rect(x, y, w, h, r.base);
    this.rect(x, y, w, 1, r.hi);
    this.rect(x, y, 1, h, r.hi);
    this.rect(x, y + h - 1, w, 1, r.lo);
    this.rect(x + w - 1, y, 1, h, r.lo);
    this.px(x, y + h - 1, r.lo);
    this.px(x + w - 1, y, r.hi);
    return this;
  }

  /** Filled ellipse centred at (cx, cy); radii in px. */
  ell(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i - cx) / (rx + 0.25);
        const dy = (j - cy) / (ry + 0.25);
        if (dx * dx + dy * dy <= 1) this.px(i, j, c);
      }
    }
    return this;
  }

  /** Ellipse with a lit top-left and a shaded bottom-right. */
  ball(cx: number, cy: number, rx: number, ry: number, r: Ramp): this {
    this.ell(cx, cy, rx, ry, r.base);
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i - cx) / (rx + 0.25);
        const dy = (j - cy) / (ry + 0.25);
        if (dx * dx + dy * dy > 1) continue;
        if (dx + dy < -0.75) this.px(i, j, r.hi);
        else if (dx + dy > 0.8) this.px(i, j, r.lo);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
    return this;
  }

  /** Pastes a picture; `.` is transparent unless `opaque`. */
  put(x: number, y: number, patch: Grid, opaque = false): this {
    patch.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch !== '.' || opaque) this.px(x + i, y + j, ch);
      }),
    );
    return this;
  }

  /** Replaces one character everywhere. */
  swap(from: string, to: string): this {
    for (const row of this.rows) for (let i = 0; i < row.length; i++) if (row[i] === from) row[i] = to;
    return this;
  }
}

/** Overlays `patch` on `g` at (x, y) and returns the new grid. */
export function over(g: Grid, x: number, y: number, patch: Grid, opaque = false): Grid {
  return new Cv(g[0]?.length ?? 0, g.length, g).put(x, y, patch, opaque).g;
}

/** Applies a character swap to a grid. */
export function sw(g: Grid, map: Readonly<Record<string, string>>): Grid {
  return g.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

/** Shifts a picture down by `n` rows inside the same frame (top rows blank, bottom cut). */
export function drop(g: Grid, n: number): Grid {
  const w = g[0]?.length ?? 0;
  return [...Array.from({ length: n }, () => '.'.repeat(w)), ...g.slice(0, g.length - n)];
}

/** Shifts a picture sideways by `n` px (positive = right), keeping the frame size. */
export function shiftX(g: Grid, n: number): Grid {
  const w = g[0]?.length ?? 0;
  return g.map((row) => (n >= 0 ? '.'.repeat(n) + row.slice(0, w - n) : row.slice(-n) + '.'.repeat(-n)));
}

/** Crops or pads to exactly w x h, anchored at the bottom centre. */
export function fit(g: Grid, w: number, h: number): Grid {
  const gw = g[0]?.length ?? 0;
  const rows = g.length >= h ? g.slice(g.length - h) : [...Array.from({ length: h - g.length }, () => '.'.repeat(gw)), ...g];
  const dx = Math.floor((w - gw) / 2);
  return rows.map((row) => {
    let r = row;
    if (dx > 0) r = '.'.repeat(dx) + r;
    else if (dx < 0) r = r.slice(-dx);
    return r.length >= w ? r.slice(0, w) : r + '.'.repeat(w - r.length);
  });
}
