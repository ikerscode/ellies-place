/**
 * Grid, rotation and sprite-direction helpers shared by world, sim, engine and build.
 * Rotation is clockwise quarter turns seen from above; rotation 0 faces down.
 */
import type { AnimKey, Facing, Rotation, Size, SpriteDir, SpriteKey, TilePos, Vec2 } from './types';

const FACING_CW: readonly Facing[] = ['down', 'left', 'up', 'right'];

/** Footprint size after rotation (w and h swap on odd turns). */
export function rotateSize(size: Size, rot: Rotation): Size {
  return rot % 2 === 0 ? { w: size.w, h: size.h } : { w: size.h, h: size.w };
}

/**
 * Rotates a tile offset given at rotation 0 inside a w x h footprint.
 * Works for offsets outside the footprint too (slots in front of an item).
 */
export function rotateOffset(dx: number, dy: number, size: Size, rot: Rotation): { dx: number; dy: number } {
  const { w, h } = size;
  switch (rot) {
    case 0:
      return { dx, dy };
    case 1:
      return { dx: h - 1 - dy, dy: dx };
    case 2:
      return { dx: w - 1 - dx, dy: h - 1 - dy };
    case 3:
      return { dx: dy, dy: w - 1 - dx };
  }
}

/** Rotates a facing clockwise by `rot` quarter turns (down -> left -> up -> right). */
export function rotateFacing(facing: Facing, rot: Rotation): Facing {
  const i = FACING_CW.indexOf(facing);
  return FACING_CW[(i + rot) % 4] as Facing;
}

/** Next rotation clockwise among the allowed ones (R key). */
export function nextRotation(current: Rotation, allowed: readonly Rotation[]): Rotation {
  if (allowed.length === 0) return current;
  for (let step = 1; step <= 4; step++) {
    const r = ((current + step) % 4) as Rotation;
    if (allowed.includes(r)) return r;
  }
  return current;
}

/** Every tile a footprint covers, row by row. */
export function footprintTiles(origin: TilePos, size: Size, rot: Rotation): TilePos[] {
  const s = rotateSize(size, rot);
  const out: TilePos[] = [];
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) out.push({ tx: origin.tx + x, ty: origin.ty + y });
  return out;
}

export function inBounds(t: TilePos, w: number, h: number): boolean {
  return t.tx >= 0 && t.ty >= 0 && t.tx < w && t.ty < h && Number.isInteger(t.tx) && Number.isInteger(t.ty);
}

/** Row-major index of a tile. */
export function tileIndex(t: TilePos, w: number): number {
  return t.ty * w + t.tx;
}

export function tileFromIndex(i: number, w: number): TilePos {
  return { tx: i % w, ty: Math.floor(i / w) };
}

/** Centre of a tile in tile units. */
export function tileCenter(t: TilePos): Vec2 {
  return { x: t.tx + 0.5, y: t.ty + 0.5 };
}

/** The tile a position is in. */
export function tileOf(p: Vec2): TilePos {
  return { tx: Math.floor(p.x), ty: Math.floor(p.y) };
}

export function sameTile(a: TilePos, b: TilePos): boolean {
  return a.tx === b.tx && a.ty === b.ty;
}

/** Octile distance (8-direction grid). */
export function octile(a: TilePos, b: TilePos): number {
  const dx = Math.abs(a.tx - b.tx);
  const dy = Math.abs(a.ty - b.ty);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

/** Facing for a movement vector (ties prefer horizontal). */
export function facingFromDelta(dx: number, dy: number, fallback: Facing = 'down'): Facing {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Which drawn direction to use and whether to flip it (left is side flipped). */
export function spriteDirFor(facing: Facing): { dir: SpriteDir; flipX: boolean } {
  switch (facing) {
    case 'down':
      return { dir: 'down', flipX: false };
    case 'up':
      return { dir: 'up', flipX: false };
    case 'right':
      return { dir: 'side', flipX: false };
    case 'left':
      return { dir: 'side', flipX: true };
  }
}

/** Actor sprite key for an animation: spriteFor('cat.salem', 'sleep') is 'cat.salem.sleep'. */
export function spriteFor(base: SpriteKey | string, anim: AnimKey): SpriteKey {
  return `${base}.${anim}` as SpriteKey;
}
