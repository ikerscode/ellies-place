/**
 * Outfit overlays, ported from game 1's drawOutfit as rectangle data.
 *
 * Rects are in Ellie's grid coordinates (x 0..11, y 0 = top of her head; negative y is
 * above it). They become 14 x 20 overlay grids: overlay cell (x + 1, y + 7) sits on
 * Ellie's cell (x, y), so the anchor (7, 7) lands on her frame's top-centre
 * (design/spec/art.md 6). Overlays have no outline, as in game 1.
 */
import { NO_OUTLINE } from './compile';
import { def, rectsToGrids } from './grid';
import { PAL } from './palette';
import type { PixelRect, SpriteDef, SpriteDir } from './types';

export const OUTFIT_W = 14;
export const OUTFIT_H = 20;
/** Overlay offset of Ellie's grid origin. */
export const OUTFIT_OX = 1;
export const OUTFIT_OY = 7;
export const OUTFIT_ANCHOR = { x: 7, y: 7 } as const;

type ByDir = Readonly<Record<SpriteDir, readonly PixelRect[]>>;

const r = (c: string, x: number, y: number, w: number, h: number): PixelRect => ({ c, x, y, w, h });
const same = (rects: readonly PixelRect[]): ByDir => ({ down: rects, up: rects, side: rects });

/** Hair clips sit at a per-direction spot (game 1: down 9, up 1, right 2; y 1). */
const CLIP_X: Readonly<Record<SpriteDir, number>> = { down: 9, up: 1, side: 2 };
function clip(draw: (cx: number, cy: number) => readonly PixelRect[]): ByDir {
  return { down: draw(CLIP_X.down, 1), up: draw(CLIP_X.up, 1), side: draw(CLIP_X.side, 1) };
}

const X = PAL.extra;
const lav = PAL.lavender.base;
const band = X.headband;

/** game 1 drawOutfit, slot by slot. `side` is the right-facing version. */
export const OUTFIT_RECTS: Readonly<Record<string, ByDir>> = {
  crown: same([
    r(PAL.gold.hi, 3, -1, 6, 2),
    r(PAL.gold.hi, 3, -3, 1, 2),
    r(PAL.gold.hi, 5, -3, 2, 2),
    r(PAL.gold.hi, 8, -3, 1, 2),
    r(PAL.wine.hi, 5, 0, 2, 1),
  ]),
  chefhat: same([r(PAL.bone.hi, 2, -5, 8, 5), r(PAL.bone.hi, 3, -7, 6, 2), r(X.chefShade, 2, -1, 8, 1)]),
  bucket: same([r(X.bucket, 3, -3, 6, 3), r(X.bucketBrim, 1, 0, 10, 1)]),
  headphones: {
    down: [r(band, 2, -2, 8, 1), r(band, 1, -1, 1, 3), r(band, 10, -1, 1, 3), r(lav, 0, 2, 2, 4), r(lav, 10, 2, 2, 4)],
    up: [r(band, 2, -2, 8, 1), r(band, 1, -1, 1, 3), r(band, 10, -1, 1, 3), r(lav, 0, 2, 2, 4), r(lav, 10, 2, 2, 4)],
    side: [r(band, 2, -2, 8, 1), r(lav, 3, 2, 3, 4)],
  },
  catears: same([
    r(PAL.lavender.lo, 2, -2, 3, 2),
    r(PAL.lavender.lo, 2, -3, 2, 1),
    r(PAL.lavender.lo, 2, -4, 1, 1),
    r(PAL.rose.hi, 3, -2, 1, 1),
    r(PAL.lavender.lo, 7, -2, 3, 2),
    r(PAL.lavender.lo, 8, -3, 2, 1),
    r(PAL.lavender.lo, 9, -4, 1, 1),
    r(PAL.rose.hi, 8, -2, 1, 1),
  ]),
  scarf: {
    down: [r(PAL.wine.hi, 2, 8, 8, 2), r(PAL.wine.base, 3, 10, 2, 3)],
    up: [r(PAL.wine.hi, 2, 8, 8, 2)],
    side: [r(PAL.wine.hi, 4, 8, 6, 2), r(PAL.wine.base, 3, 10, 2, 2)],
  },
  firefly: clip((cx, cy) => [r(X.firefly, cx, cy, 2, 2)]),
  moon: clip((cx, cy) => [r(PAL.steel.hi, cx, cy, 2, 3), r(PAL.steel.hi, cx + 2, cy, 1, 1), r(PAL.steel.hi, cx + 2, cy + 2, 1, 1)]),
  star: clip((cx, cy) => [r(X.starClip, cx + 1, cy, 1, 3), r(X.starClip, cx, cy + 1, 3, 1)]),
  feather: clip((cx, cy) => [r(PAL.poe.sheen, cx + 2, cy - 2, 1, 1), r(PAL.poe.sheen, cx + 1, cy - 1, 1, 2), r(PAL.ink.rim, cx, cy + 1, 1, 2)]),
  bow: clip((cx, cy) => [r(PAL.rose.base, cx - 1, cy, 2, 2), r(PAL.rose.base, cx + 2, cy, 2, 2), r(PAL.wine.hi, cx + 1, cy, 1, 2)]),
};

export function outfitDef(id: string, rects: ByDir): SpriteDef {
  const { grids, palette } = rectsToGrids(OUTFIT_W, OUTFIT_H, rects, OUTFIT_OX, OUTFIT_OY);
  return def(`outfit.${id}`, null, palette, {
    dirs: { down: [grids.down], up: [grids.up], side: [grids.side] },
    anchor: OUTFIT_ANCHOR,
    outline: NO_OUTLINE,
  });
}

export const OUTFIT_SPRITES: readonly SpriteDef[] = Object.entries(OUTFIT_RECTS).map(([id, rects]) => outfitDef(id, rects));
