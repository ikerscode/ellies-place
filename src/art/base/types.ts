/**
 * Art-local types. The sprite registry shapes (SpriteDef, ArtBatch, Grid, Palette,
 * Anchor, SpriteDir, SpriteKey) are the contract in src/core/types.ts and are only
 * re-exported here. See design/spec/art.md.
 */
export type { Anchor, ArtBatch, Grid, Palette, SpriteDef, SpriteDir, SpriteKey, SpriteRegistry } from '../../core/types';

/** One filled rectangle in grid coordinates (overlays such as outfits). */
export interface PixelRect {
  readonly c: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
