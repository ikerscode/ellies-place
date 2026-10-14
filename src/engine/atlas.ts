/**
 * Sprite atlas (contracts 18): every registered batch, compiled with `compileSprite` the first time a key is
 * drawn (a boot that compiles a thousand sprites nobody has seen yet is wasted time; `warmUp()` does it all).
 *
 * - Contract answers stay strict: `frame()` is null and `has()` false for an unknown key.
 * - Drawing is forgiving: `draw()` and the renderer's `frameOrPlaceholder()` show a magenta checker square at the
 *   anchor and warn once per key, so a missing sprite is loud on screen and quiet in the console.
 * - Frames are cached per key, facing and index (no per-frame allocation after the first draw).
 * - A sprite with no side view mirrors its front view for `left`, so cats still turn around.
 */
import { asSpriteKey, type ArtBatch, type Facing, type SpriteAtlas, type SpriteDef, type SpriteKey, type AtlasFrame } from '../core';
import { compileSprite, framesByDir, type CanvasFactory, type CompiledSprite } from '../art/base/compile';

export interface EngineAtlas extends SpriteAtlas {
  def(key: SpriteKey): SpriteDef | undefined;
  /** Like `frame`, but a magenta placeholder (and one console warning per key) for unknown keys. */
  frameOrPlaceholder(key: SpriteKey, facing: Facing, timeMs: number): AtlasFrame;
  /** Compiles every sprite now. */
  warmUp(): void;
  /** Keys that were asked for and missing, in first-seen order. */
  missing(): readonly string[];
}

export interface AtlasOptions {
  readonly make?: CanvasFactory;
  /** Console warning sink (default `console.warn`). */
  readonly warn?: (message: string) => void;
}

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];
const PLACEHOLDER_SIZE = 12;

const defaultMake: CanvasFactory = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

interface Entry {
  readonly compiled: CompiledSprite;
  readonly fps: number;
  readonly hasSide: boolean;
  /** [facing index][frame index] */
  readonly frames: (AtlasFrame | undefined)[][];
}

export function createAtlas(batches: readonly ArtBatch[], opts: AtlasOptions = {}): EngineAtlas {
  const make = opts.make ?? defaultMake;
  const warn = opts.warn ?? ((m: string) => console.warn(m));
  const defs = new Map<SpriteKey, SpriteDef>();
  for (const b of batches) {
    for (const s of b.sprites) {
      if (defs.has(s.key)) warn(`[engine] sprite key "${s.key}" is registered twice (batch ${b.id}); the later one wins`);
      defs.set(s.key, s);
    }
  }
  const entries = new Map<SpriteKey, Entry>();
  const missingKeys: string[] = [];
  const missingSet = new Set<string>();
  const urls = new Map<string, string>();
  let keyList: readonly SpriteKey[] | null = null;
  let placeholder: AtlasFrame | null = null;

  const entryOf = (key: SpriteKey): Entry | null => {
    const hit = entries.get(key);
    if (hit) return hit;
    const def = defs.get(key);
    if (!def) return null;
    const e: Entry = {
      compiled: compileSprite(def, make),
      fps: def.fps ?? 6,
      hasSide: framesByDir(def).side !== undefined,
      frames: FACINGS.map(() => []),
    };
    entries.set(key, e);
    return e;
  };

  const frameAt = (e: Entry, facing: Facing, index: number): AtlasFrame => {
    const fi = facing === 'down' ? 0 : facing === 'up' ? 1 : facing === 'left' ? 2 : 3;
    const row = e.frames[fi] as (AtlasFrame | undefined)[];
    const hit = row[index];
    if (hit) return hit;
    const image = e.compiled.frame(facing, index);
    const a = e.compiled.anchor(facing);
    const f: AtlasFrame = { image, sx: 0, sy: 0, w: image.width, h: image.height, ax: a.x, ay: a.y, flipX: facing === 'left' && !e.hasSide };
    row[index] = f;
    return f;
  };

  const indexFor = (e: Entry, facing: Facing, timeMs: number): number => {
    const n = e.compiled.count(facing);
    if (n <= 1) return 0;
    const t = timeMs > 0 && Number.isFinite(timeMs) ? timeMs : 0;
    return Math.floor((t / 1000) * e.fps) % n;
  };

  const makePlaceholder = (): AtlasFrame => {
    if (placeholder) return placeholder;
    const c = make(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#ff00ff';
      g.fillRect(0, 0, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
      g.fillStyle = '#1a1320';
      for (let y = 0; y < PLACEHOLDER_SIZE; y += 4) {
        for (let x = 0; x < PLACEHOLDER_SIZE; x += 4) {
          if (((x + y) / 4) % 2 === 0) g.fillRect(x, y, 4, 4);
        }
      }
    }
    placeholder = { image: c, sx: 0, sy: 0, w: PLACEHOLDER_SIZE, h: PLACEHOLDER_SIZE, ax: PLACEHOLDER_SIZE / 2, ay: PLACEHOLDER_SIZE, flipX: false };
    return placeholder;
  };

  const noteMissing = (key: string): void => {
    if (missingSet.has(key)) return;
    missingSet.add(key);
    missingKeys.push(key);
    warn(`[engine] missing sprite "${key}" (drawing a magenta placeholder)`);
  };

  const atlas: EngineAtlas = {
    has: (key) => defs.has(key),
    def: (key) => defs.get(key),
    frame(key, facing, timeMs) {
      const e = entryOf(key);
      return e ? frameAt(e, facing, indexFor(e, facing, timeMs)) : null;
    },
    frameOrPlaceholder(key, facing, timeMs) {
      const e = entryOf(key);
      if (e) return frameAt(e, facing, indexFor(e, facing, timeMs));
      noteMissing(key);
      return makePlaceholder();
    },
    frameCount(key, facing) {
      return entryOf(key)?.compiled.count(facing) ?? 0;
    },
    keys() {
      keyList ??= [...defs.keys()];
      return keyList;
    },
    draw(ctx, key, x, y, facing = 'down', timeMs = 0) {
      drawFrame(ctx, atlas.frameOrPlaceholder(key, facing, timeMs), x, y, false);
    },
    toDataUrl(key, scale = 1) {
      const cacheKey = `${key}@${scale}`;
      const cached = urls.get(cacheKey);
      if (cached !== undefined) return cached;
      const f = atlas.frame(key, 'down', 0);
      if (!f) return null;
      const s = Math.max(1, Math.round(scale));
      const c = make(f.w * s, f.h * s);
      const g = c.getContext('2d');
      if (!g) return null;
      g.imageSmoothingEnabled = false;
      g.drawImage(f.image, f.sx, f.sy, f.w, f.h, 0, 0, f.w * s, f.h * s);
      const url = c.toDataURL();
      urls.set(cacheKey, url);
      return url;
    },
    warmUp() {
      for (const k of defs.keys()) entryOf(k);
    },
    missing: () => missingKeys,
  };
  return atlas;
}

/**
 * Draws an atlas frame with its anchor at (x, y), rounded to whole logical pixels. `mirror` flips it around the
 * anchor (an item at rotation 3 is the `.r1` sprite mirrored), and a frame that asks for `flipX` is flipped too;
 * both together cancel out.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, f: AtlasFrame, x: number, y: number, mirror: boolean): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (mirror !== f.flipX) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(-1, 1);
    ctx.drawImage(f.image, f.sx, f.sy, f.w, f.h, -(f.w - f.ax), -f.ay, f.w, f.h);
    ctx.restore();
  } else {
    ctx.drawImage(f.image, f.sx, f.sy, f.w, f.h, px - f.ax, py - f.ay, f.w, f.h);
  }
}

export { asSpriteKey };
