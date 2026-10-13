/**
 * Sprite registry types. Every art batch (src/art/<batch>/index.ts) exports
 * `export const BATCH: ArtBatch` built from these. See design/spec/art.md.
 */
import type { SpriteKey } from '../../core/types';

/** Equal-width rows, one character per pixel, `.` is transparent. */
export type Grid = readonly string[];

/** Palette map: one grid character to one `#rrggbb` colour. */
export type Palette = Readonly<Record<string, string>>;

/** Drawn directions. Left is `side` flipped; `side` always faces right. */
export type SpriteDir = 'down' | 'up' | 'side';

/**
 * Anchor in grid lattice coordinates (between pixels, before the outline is added):
 * the point that sits on the entity's ground position. For a character that is the
 * bottom centre of the feet, e.g. `{ x: 6, y: 16 }` for a 12 x 16 grid.
 */
export interface Anchor {
  readonly x: number;
  readonly y: number;
}

export interface SpriteDef {
  /** Dotted lower-case key, e.g. `ellie.walk`, `cat.salem.idle`, `item.bed_single`. */
  readonly key: SpriteKey;
  /** The still or first frame. Always present; used when there are no frames or dirs. */
  readonly grid: Grid;
  readonly palette: Palette;
  readonly anchor: Anchor;
  /** Frames of a non-directional animation (or state variants). All the same size. */
  readonly frames?: readonly Grid[];
  /** Per-direction frame lists. All frames of one direction are the same size. */
  readonly dirs?: Readonly<Partial<Record<SpriteDir, readonly Grid[]>>>;
  /** Outline colour; defaults to PAL.ink.outline. Black cats and Poe use PAL.ink.rim. */
  readonly outline?: string;
  /** Playback speed in frames per second (default 6). */
  readonly fps?: number;
}

/** What each batch module exports as `BATCH`. */
export interface ArtBatch {
  /** Short id, also the contact sheet file name: reports/art/<id>.png. */
  readonly id: string;
  readonly title: string;
  readonly sprites: readonly SpriteDef[];
}

/** One filled rectangle in grid coordinates (overlays such as outfits). */
export interface PixelRect {
  readonly c: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
