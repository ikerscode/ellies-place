import { describe, expect, it } from 'vitest';
import {
  facingFromDelta,
  footprintTiles,
  inBounds,
  nextRotation,
  octile,
  rotateFacing,
  rotateOffset,
  rotateSize,
  spriteDirFor,
  spriteFor,
  tileFromIndex,
  tileIndex,
} from '../../../src/core/geometry';
import type { Rotation } from '../../../src/core/types';

describe('geometry', () => {
  it('rotates sizes', () => {
    expect(rotateSize({ w: 2, h: 1 }, 0)).toEqual({ w: 2, h: 1 });
    expect(rotateSize({ w: 2, h: 1 }, 1)).toEqual({ w: 1, h: 2 });
    expect(rotateSize({ w: 2, h: 1 }, 2)).toEqual({ w: 2, h: 1 });
    expect(rotateSize({ w: 2, h: 1 }, 3)).toEqual({ w: 1, h: 2 });
  });

  it('rotated offsets stay inside the rotated footprint', () => {
    const size = { w: 3, h: 2 };
    for (const rot of [0, 1, 2, 3] as Rotation[]) {
      const s = rotateSize(size, rot);
      for (let dy = 0; dy < size.h; dy++)
        for (let dx = 0; dx < size.w; dx++) {
          const r = rotateOffset(dx, dy, size, rot);
          expect(r.dx).toBeGreaterThanOrEqual(0);
          expect(r.dy).toBeGreaterThanOrEqual(0);
          expect(r.dx).toBeLessThan(s.w);
          expect(r.dy).toBeLessThan(s.h);
        }
    }
  });

  it('four quarter turns return to the start, offsets and facing agree', () => {
    const size = { w: 2, h: 1 };
    // A slot in front of a sofa (below it at rotation 0) facing down.
    let off = { dx: 0, dy: 1 };
    let sz = size;
    for (let i = 0; i < 4; i++) {
      off = rotateOffset(off.dx, off.dy, sz, 1);
      sz = rotateSize(sz, 1);
    }
    expect(off).toEqual({ dx: 0, dy: 1 });
    // At rotation 1 the front faces left, and the slot is left of the footprint.
    expect(rotateFacing('down', 1)).toBe('left');
    expect(rotateOffset(0, 1, size, 1).dx).toBeLessThan(0);
    expect(rotateFacing('down', 2)).toBe('up');
    expect(rotateFacing('down', 3)).toBe('right');
    expect(rotateFacing('right', 1)).toBe('down');
  });

  it('nextRotation cycles through allowed rotations only', () => {
    expect(nextRotation(0, [0, 1, 2, 3])).toBe(1);
    expect(nextRotation(3, [0, 1, 2, 3])).toBe(0);
    expect(nextRotation(0, [0, 2])).toBe(2);
    expect(nextRotation(2, [0, 2])).toBe(0);
    expect(nextRotation(0, [0])).toBe(0);
  });

  it('footprint tiles, bounds and indices', () => {
    expect(footprintTiles({ tx: 5, ty: 3 }, { w: 2, h: 1 }, 1)).toEqual([
      { tx: 5, ty: 3 },
      { tx: 5, ty: 4 },
    ]);
    expect(inBounds({ tx: 0, ty: 0 }, 30, 17)).toBe(true);
    expect(inBounds({ tx: 30, ty: 0 }, 30, 17)).toBe(false);
    expect(inBounds({ tx: 1.5, ty: 0 }, 30, 17)).toBe(false);
    expect(tileIndex({ tx: 4, ty: 2 }, 30)).toBe(64);
    expect(tileFromIndex(64, 30)).toEqual({ tx: 4, ty: 2 });
  });

  it('octile distance, facings and sprite dirs', () => {
    expect(octile({ tx: 0, ty: 0 }, { tx: 3, ty: 0 })).toBe(3);
    expect(octile({ tx: 0, ty: 0 }, { tx: 2, ty: 2 })).toBeCloseTo(2 * Math.SQRT2);
    expect(facingFromDelta(1, 0)).toBe('right');
    expect(facingFromDelta(0, -1)).toBe('up');
    expect(facingFromDelta(0, 0, 'left')).toBe('left');
    expect(spriteDirFor('left')).toEqual({ dir: 'side', flipX: true });
    expect(spriteDirFor('down')).toEqual({ dir: 'down', flipX: false });
    expect(spriteFor('cat.salem', 'sleep')).toBe('cat.salem.sleep');
  });
});
