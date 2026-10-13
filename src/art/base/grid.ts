/**
 * Pure grid helpers and the `def` builder every art batch uses (design/spec/art.md 9).
 * Nothing here touches the DOM.
 */
import { asSpriteKey } from '../../core/types';
import type { Anchor, Grid, Palette, PixelRect, SpriteDef, SpriteDir } from './types';

/** Width of a grid (its first row). */
export function gridW(g: Grid): number {
  return g[0]?.length ?? 0;
}

/** A transparent grid. */
export function blank(w: number, h: number): Grid {
  return Array.from({ length: h }, () => '.'.repeat(w));
}

/** Adds transparent margins. */
export function pad(g: Grid, m: { readonly top?: number; readonly right?: number; readonly bottom?: number; readonly left?: number }): Grid {
  const l = '.'.repeat(m.left ?? 0);
  const r = '.'.repeat(m.right ?? 0);
  const rows = g.map((row) => l + row + r);
  const w = gridW(g) + (m.left ?? 0) + (m.right ?? 0);
  return [...blank(w, m.top ?? 0), ...rows, ...blank(w, m.bottom ?? 0)];
}

/** Left-right mirror (the grid twin of `flipped`). */
export function mirror(g: Grid): Grid {
  return g.map((row) => [...row].reverse().join(''));
}

/** Replaces characters: `recolor(g, { e: 'f' })` closes a cat's eyes. */
export function recolor(g: Grid, map: Readonly<Record<string, string>>): Grid {
  return g.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

/**
 * Pastes `patch` at (x, y). `.` in the patch is skipped (keeps what is under it) unless
 * `opaque` is set. Cells outside the grid are dropped.
 */
export function stamp(g: Grid, x: number, y: number, patch: Grid, opaque = false): Grid {
  const out = g.map((row) => [...row]);
  patch.forEach((prow, py) => {
    const row = out[y + py];
    if (!row) return;
    [...prow].forEach((ch, px) => {
      const cx = x + px;
      if (cx < 0 || cx >= row.length) return;
      if (ch === '.' && !opaque) return;
      row[cx] = ch;
    });
  });
  return out.map((r) => r.join(''));
}

/** Fills a rectangle with one character. */
export function fill(g: Grid, x: number, y: number, w: number, h: number, ch: string): Grid {
  return stamp(g, x, y, Array.from({ length: h }, () => ch.repeat(w)), true);
}

/** Moves the picture up by `n` rows inside the same frame size (a 1 px bob). */
export function lift(g: Grid, n = 1): Grid {
  return [...g.slice(n), ...blank(gridW(g), n)];
}

/**
 * Turns game 1 style fillRect data into grids plus one shared palette: one character per
 * distinct colour, assigned in order of first use from `a`..`z`. Each entry of `layers`
 * becomes one grid of size w x h; rect (x, y) lands on grid cell (x + ox, y + oy).
 */
export function rectsToGrids<K extends string>(
  w: number,
  h: number,
  layers: Readonly<Record<K, readonly PixelRect[]>>,
  ox = 0,
  oy = 0,
): { grids: Record<K, Grid>; palette: Palette } {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const byColour = new Map<string, string>();
  const grids = {} as Record<K, Grid>;
  for (const name of Object.keys(layers) as K[]) {
    let g = blank(w, h);
    for (const r of layers[name]) {
      const c = r.c.toLowerCase();
      let ch = byColour.get(c);
      if (!ch) {
        ch = chars[byColour.size];
        if (!ch) throw new Error('rectsToGrids: too many colours');
        byColour.set(c, ch);
      }
      g = fill(g, r.x + ox, r.y + oy, r.w, r.h, ch);
    }
    grids[name] = g;
  }
  const palette: Record<string, string> = {};
  for (const [c, ch] of byColour) palette[ch] = c;
  return { grids, palette };
}

export interface DefOptions {
  /** Default: bottom centre of the first frame. */
  readonly anchor?: Anchor;
  readonly frames?: readonly Grid[];
  readonly dirs?: Readonly<Partial<Record<SpriteDir, readonly Grid[]>>>;
  readonly outline?: string;
  readonly fps?: number;
}

/** First frame of a def's animation: dirs.down, else the first dir, else frames, else grid. */
function firstFrame(grid: Grid | null, opts: DefOptions): Grid {
  const d = opts.dirs;
  const fromDirs = d ? (d.down?.[0] ?? d.side?.[0] ?? d.up?.[0]) : undefined;
  const g = fromDirs ?? opts.frames?.[0] ?? grid;
  if (!g) throw new Error('def: no grid');
  return g;
}

/**
 * Builds a SpriteDef. Pass `grid: null` with `dirs` or `frames` to use their first frame
 * as the still. Anchor defaults to the bottom centre (actors and floor items).
 */
export function def(key: string, grid: Grid | null, palette: Palette, opts: DefOptions = {}): SpriteDef {
  const g = firstFrame(grid, opts);
  return {
    key: asSpriteKey(key),
    grid: g,
    palette,
    anchor: opts.anchor ?? { x: gridW(g) / 2, y: g.length },
    ...(opts.frames ? { frames: opts.frames } : {}),
    ...(opts.dirs ? { dirs: opts.dirs } : {}),
    ...(opts.outline !== undefined ? { outline: opts.outline } : {}),
    ...(opts.fps !== undefined ? { fps: opts.fps } : {}),
  };
}

/** Repeats a frame list: `seq([a, b], [5, 1])` gives a, a, a, a, a, b. */
export function seq(frames: readonly Grid[], counts: readonly number[]): Grid[] {
  const out: Grid[] = [];
  frames.forEach((f, i) => {
    for (let n = 0; n < (counts[i] ?? 1); n++) out.push(f);
  });
  return out;
}
