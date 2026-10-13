/**
 * Art base: the makeSprite compiler, flipped, the palette, grid helpers, the registry
 * validator and every character sprite. Owner: pixel-artist (lead).
 * Other batches import helpers from here and export their own `BATCH: ArtBatch`.
 * See design/spec/art.md.
 */
import { CAT_SPRITES } from './cats';
import { ELLIE_SPRITES } from './ellie';
import { OUTFIT_SPRITES } from './outfits';
import type { ArtBatch } from './types';

export type { ArtBatch, SpriteDef, SpriteRegistry, Grid, Palette, Anchor, SpriteDir, SpriteKey } from '../../core/types';
export type { PixelRect } from './types';
export { PAL, paletteColours, elliePalette } from './palette';
export {
  NO_OUTLINE,
  rasterize,
  flipRaster,
  rasterToCanvas,
  makeSprite,
  flipped,
  framesByDir,
  resolveFacing,
  canvasAnchor,
  compileSprite,
  compileAll,
  drawRects,
  parseHex,
} from './compile';
export type { Raster, CanvasFactory, CompiledSprite } from './compile';
export { blank, pad, mirror, recolor, stamp, fill, lift, gridW, seq, def, rectsToGrids } from './grid';
export type { DefOptions } from './grid';
export { validateSprite, validateBatch, validateBatches, KEY_RE } from './validate';
export { OUTFIT_ANCHOR, OUTFIT_W, OUTFIT_H, OUTFIT_OX, OUTFIT_OY } from './outfits';
export { ELLIE_ANCHOR } from './ellie';

/** Every character and outfit sprite. */
export const BATCH: ArtBatch = {
  id: 'base',
  title: 'Base: Ellie, cats, visitors, outfits',
  sprites: [...ELLIE_SPRITES, ...CAT_SPRITES, ...OUTFIT_SPRITES],
};
