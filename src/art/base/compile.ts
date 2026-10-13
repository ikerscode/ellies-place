/**
 * The sprite compiler, ported from game 1's makeSprite and flipped.
 *
 * `rasterize` is pure (it runs in Node for tests). `makeSprite` and `compileSprite`
 * need a DOM canvas and run in the browser at boot.
 */
import type { Facing } from '../../core/types';
import { PAL } from './palette';
import type { Anchor, Grid, Palette, PixelRect, SpriteDef, SpriteDir } from './types';

/** RGBA pixels of a compiled sprite: the grid plus a 1 px outline on every side. */
export interface Raster {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;
}

export function parseHex(hex: string): readonly [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`bad colour ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Game 1 makeSprite as pure data: the output is (w + 2) x (h + 2). An outline pixel is
 * drawn wherever an empty cell touches a filled one on its 4 sides. Characters missing
 * from the palette leave a hole (the registry tests forbid that).
 */
export function rasterize(rows: Grid, pal: Palette, outline: string = PAL.ink.outline): Raster {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const W = w + 2;
  const H = h + 2;
  const data = new Uint8ClampedArray(W * H * 4);
  const on = (x: number, y: number): boolean => {
    if (y < 0 || y >= h || x < 0 || x >= w) return false;
    const ch = rows[y]?.[x];
    return ch !== undefined && ch !== '.';
  };
  const put = (px: number, py: number, rgb: readonly [number, number, number]): void => {
    const i = (py * W + px) * 4;
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  };
  const out = parseHex(outline);
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) put(x + 1, y + 1, out);
    }
  }
  const cache = new Map<string, readonly [number, number, number]>();
  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === undefined || ch === '.') continue;
      const hex = pal[ch];
      if (!hex) continue;
      let rgb = cache.get(hex);
      if (!rgb) {
        rgb = parseHex(hex);
        cache.set(hex, rgb);
      }
      put(x + 1, y + 1, rgb);
    }
  }
  return { w: W, h: H, data };
}

/** Mirrors a raster left to right (pure twin of `flipped`). */
export function flipRaster(r: Raster): Raster {
  const data = new Uint8ClampedArray(r.data.length);
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const s = (y * r.w + x) * 4;
      const d = (y * r.w + (r.w - 1 - x)) * 4;
      data[d] = r.data[s] ?? 0;
      data[d + 1] = r.data[s + 1] ?? 0;
      data[d + 2] = r.data[s + 2] ?? 0;
      data[d + 3] = r.data[s + 3] ?? 0;
    }
  }
  return { w: r.w, h: r.h, data };
}

export type CanvasFactory = (w: number, h: number) => HTMLCanvasElement;

const domCanvas: CanvasFactory = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  g.imageSmoothingEnabled = false;
  return g;
}

export function rasterToCanvas(r: Raster, make: CanvasFactory = domCanvas): HTMLCanvasElement {
  const c = make(r.w, r.h);
  const img = new ImageData(new Uint8ClampedArray(r.data), r.w, r.h);
  ctx2d(c).putImageData(img, 0, 0);
  return c;
}

/** Game 1 makeSprite: grid + palette -> canvas with a 1 px outline. */
export function makeSprite(rows: Grid, pal: Palette, outline: string = PAL.ink.outline, make: CanvasFactory = domCanvas): HTMLCanvasElement {
  return rasterToCanvas(rasterize(rows, pal, outline), make);
}

/** Game 1 flipped: a left-right mirrored copy. */
export function flipped(src: HTMLCanvasElement, make: CanvasFactory = domCanvas): HTMLCanvasElement {
  const f = make(src.width, src.height);
  const g = ctx2d(f);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return f;
}

/** The frame lists of a def, by drawn direction. Non-directional sprites use `down`. */
export function framesByDir(def: SpriteDef): Readonly<Partial<Record<SpriteDir, readonly Grid[]>>> {
  if (def.dirs) return def.dirs;
  return { down: def.frames && def.frames.length > 0 ? def.frames : [def.grid] };
}

/** Anchor in compiled-canvas pixels (the outline adds 1). Mirrored for a flipped frame. */
export function canvasAnchor(def: SpriteDef, gridW: number, mirror: boolean): Anchor {
  const x = mirror ? gridW - def.anchor.x : def.anchor.x;
  return { x: x + 1, y: def.anchor.y + 1 };
}

export interface CompiledSprite {
  readonly key: SpriteDef['key'];
  readonly fps: number;
  /** Number of frames for a facing (after fallbacks). */
  count(facing: Facing): number;
  /** The canvas for a facing and frame (frame wraps). Left is side flipped. */
  frame(facing: Facing, index: number): HTMLCanvasElement;
  /** Anchor in canvas pixels for a facing: draw at (worldX - anchor.x, worldY - anchor.y). */
  anchor(facing: Facing): Anchor;
}

/** Which drawn direction serves a facing, and whether it is mirrored. */
export function resolveFacing(def: SpriteDef, facing: Facing): { readonly dir: SpriteDir; readonly mirror: boolean } {
  const d = framesByDir(def);
  if (facing === 'left' || facing === 'right') {
    if (d.side) return { dir: 'side', mirror: facing === 'left' };
    return { dir: d.down ? 'down' : 'up', mirror: false };
  }
  if (d[facing]) return { dir: facing, mirror: false };
  if (d.down) return { dir: 'down', mirror: false };
  return { dir: d.up ? 'up' : 'side', mirror: false };
}

/** Compiles every frame of a def to canvases (flipped frames are made lazily). */
export function compileSprite(def: SpriteDef, make: CanvasFactory = domCanvas): CompiledSprite {
  const outline = def.outline ?? PAL.ink.outline;
  const byDir = framesByDir(def);
  const plain = new Map<SpriteDir, HTMLCanvasElement[]>();
  const mirrored = new Map<SpriteDir, HTMLCanvasElement[]>();
  const widths = new Map<SpriteDir, number>();
  for (const dir of ['down', 'up', 'side'] as const) {
    const list = byDir[dir];
    if (!list || list.length === 0) continue;
    plain.set(dir, list.map((g) => makeSprite(g, def.palette, outline, make)));
    widths.set(dir, list[0]?.[0]?.length ?? 0);
  }
  const pick = (facing: Facing): HTMLCanvasElement[] => {
    const { dir, mirror } = resolveFacing(def, facing);
    const base = plain.get(dir) ?? [];
    if (!mirror) return base;
    let m = mirrored.get(dir);
    if (!m) {
      m = base.map((c) => flipped(c, make));
      mirrored.set(dir, m);
    }
    return m;
  };
  return {
    key: def.key,
    fps: def.fps ?? 6,
    count: (facing) => pick(facing).length,
    frame(facing, index) {
      const list = pick(facing);
      const n = list.length;
      const c = list[((index % n) + n) % n];
      if (!c) throw new Error(`sprite ${def.key} has no frames`);
      return c;
    },
    anchor(facing) {
      const { dir, mirror } = resolveFacing(def, facing);
      return canvasAnchor(def, widths.get(dir) ?? 0, mirror);
    },
  };
}

/** Compiles a whole registry, keyed by sprite key. */
export function compileAll(defs: readonly SpriteDef[], make: CanvasFactory = domCanvas): ReadonlyMap<string, CompiledSprite> {
  const out = new Map<string, CompiledSprite>();
  for (const d of defs) out.set(d.key, compileSprite(d, make));
  return out;
}

/** Draws overlay rects (grid coordinates) at a grid origin, mirrored across `gridW` if asked. */
export function drawRects(
  g: CanvasRenderingContext2D,
  rects: readonly PixelRect[],
  ox: number,
  oy: number,
  opts: { readonly scale?: number; readonly mirrorW?: number } = {},
): void {
  const s = opts.scale ?? 1;
  for (const r of rects) {
    const x = opts.mirrorW === undefined ? r.x : opts.mirrorW - r.x - r.w;
    g.fillStyle = r.c;
    g.fillRect(ox + x * s, oy + r.y * s, r.w * s, r.h * s);
  }
}
