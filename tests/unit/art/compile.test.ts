import { describe, expect, it } from 'vitest';
import { asSpriteKey } from '../../../src/core/types';
import {
  NO_OUTLINE,
  PAL,
  blank,
  canvasAnchor,
  def,
  fill,
  flipRaster,
  framesByDir,
  lift,
  mirror,
  pad,
  parseHex,
  rasterize,
  recolor,
  rectsToGrids,
  resolveFacing,
  seq,
  stamp,
  validateBatch,
  validateSprite,
} from '../../../src/art/base';
import { OUTFIT_SPRITES } from '../../../src/art/base/outfits';

const px = (r: { w: number; data: Uint8ClampedArray }, x: number, y: number): number[] => {
  const i = (y * r.w + x) * 4;
  return [r.data[i] ?? 0, r.data[i + 1] ?? 0, r.data[i + 2] ?? 0, r.data[i + 3] ?? 0];
};

describe('rasterize (game 1 makeSprite)', () => {
  const pal = { a: '#ff0000' };

  it('adds a 1 px outline on the 4 sides, not the corners', () => {
    const r = rasterize(['a'], pal);
    expect([r.w, r.h]).toEqual([3, 3]);
    const out = [...parseHex(PAL.ink.outline), 255];
    expect(px(r, 1, 1)).toEqual([255, 0, 0, 255]);
    for (const [x, y] of [[0, 1], [2, 1], [1, 0], [1, 2]] as const) expect(px(r, x, y)).toEqual(out);
    for (const [x, y] of [[0, 0], [2, 2]] as const) expect(px(r, x, y)[3]).toBe(0);
  });

  it('uses a custom outline and can skip it', () => {
    expect(px(rasterize(['a'], pal, PAL.ink.rim), 0, 1)).toEqual([...parseHex(PAL.ink.rim), 255]);
    expect(px(rasterize(['a'], pal, NO_OUTLINE), 0, 1)[3]).toBe(0);
  });

  it('flips left to right', () => {
    const r = flipRaster(rasterize(['a.'], pal, NO_OUTLINE));
    expect(px(r, 2, 1)[3]).toBe(255);
    expect(px(r, 1, 1)[3]).toBe(0);
  });

  it('rejects bad colours', () => {
    expect(() => parseHex('red')).toThrow();
  });
});

describe('grid helpers', () => {
  it('pad, mirror, recolor, stamp, fill, lift, seq', () => {
    expect(pad(['ab'], { top: 1, left: 1 })).toEqual(['...', '.ab']);
    expect(mirror(['ab.'])).toEqual(['.ba']);
    expect(recolor(['ea'], { e: 'f' })).toEqual(['fa']);
    expect(stamp(['...', '...'], 1, 1, ['x.y'])).toEqual(['...', '.x.']);
    expect(fill(blank(3, 2), 0, 0, 2, 1, 'k')).toEqual(['kk.', '...']);
    expect(lift(['...', 'aaa'])).toEqual(['aaa', '...']);
    expect(seq([['a'], ['b']], [2, 1])).toEqual([['a'], ['a'], ['b']]);
  });

  it('rectsToGrids shares one palette across layers', () => {
    const { grids, palette } = rectsToGrids(3, 2, { one: [{ c: '#112233', x: 0, y: 0, w: 1, h: 1 }], two: [{ c: '#445566', x: 1, y: 0, w: 1, h: 2 }, { c: '#112233', x: 2, y: 1, w: 1, h: 1 }] }, 0, 0);
    expect(grids.one).toEqual(['a..', '...']);
    expect(grids.two).toEqual(['.b.', '.ba']);
    expect(palette).toEqual({ a: '#112233', b: '#445566' });
  });

  it('def defaults the anchor to the bottom centre and takes the first frame as the still', () => {
    const d = def('item.test', null, { a: '#000000' }, { dirs: { side: [['aaaa', 'aaaa']] } });
    expect(d.anchor).toEqual({ x: 2, y: 2 });
    expect(d.grid).toEqual(['aaaa', 'aaaa']);
  });
});

describe('facing resolution', () => {
  const g = ['aa'];
  const full = def('t.full', g, { a: '#000000' }, { dirs: { down: [g], up: [g], side: [g] } });
  const downOnly = def('t.down', g, { a: '#000000' });
  const sideOnly = def('t.side', null, { a: '#000000' }, { dirs: { side: [g] } });

  it('left is side mirrored', () => {
    expect(resolveFacing(full, 'left')).toEqual({ dir: 'side', mirror: true });
    expect(resolveFacing(full, 'right')).toEqual({ dir: 'side', mirror: false });
  });

  it('falls back to down, never mirroring a fallback', () => {
    expect(resolveFacing(downOnly, 'left')).toEqual({ dir: 'down', mirror: false });
    expect(resolveFacing(downOnly, 'up')).toEqual({ dir: 'down', mirror: false });
    expect(resolveFacing(sideOnly, 'down')).toEqual({ dir: 'side', mirror: false });
  });

  it('mirrors the anchor for a flipped frame and adds the outline offset', () => {
    const d = def('t.anchor', ['aaaa'], { a: '#000000' }, { anchor: { x: 1, y: 1 } });
    expect(canvasAnchor(d, 4, false)).toEqual({ x: 2, y: 2 });
    expect(canvasAnchor(d, 4, true)).toEqual({ x: 4, y: 2 });
  });

  it('framesByDir puts non-directional frames under down', () => {
    expect(framesByDir(downOnly)).toEqual({ down: [g] });
  });
});

describe('validator', () => {
  const ok = def('t.ok', ['ab'], { a: '#000000', b: '#ffffff' });

  it('accepts a good sprite', () => {
    expect(validateSprite(ok)).toEqual([]);
  });

  it('catches ragged rows, unknown chars, bad keys, bad colours, size mismatch, duplicates', () => {
    expect(validateSprite({ ...ok, grid: ['ab', 'a'] }).join()).toMatch(/row 1/);
    expect(validateSprite({ ...ok, grid: ['az'] }).join()).toMatch(/'z'/);
    expect(validateSprite({ ...ok, key: asSpriteKey('Bad Key') }).join()).toMatch(/key/);
    expect(validateSprite({ ...ok, palette: { a: 'red', b: '#ffffff' } }).join()).toMatch(/#rrggbb/);
    expect(validateSprite({ ...ok, frames: [['ab'], ['abb']] }).join()).toMatch(/expected/);
    expect(validateBatch({ id: 'x', title: 'x', sprites: [ok, ok] }).join()).toMatch(/duplicate/);
  });
});

describe('outfit overlays', () => {
  it('are 14 x 20, anchored at (7, 7), with no outline', () => {
    for (const d of OUTFIT_SPRITES) {
      expect(d.outline).toBe(NO_OUTLINE);
      expect(d.anchor).toEqual({ x: 7, y: 7 });
      for (const list of Object.values(framesByDir(d))) for (const g of list ?? []) expect([g[0]?.length, g.length]).toEqual([14, 20]);
    }
  });

  it('puts the crown above the head (rows 4..7 of the overlay)', () => {
    const crown = OUTFIT_SPRITES.find((d) => String(d.key) === 'outfit.crown');
    const g = crown?.dirs?.down?.[0] ?? [];
    const rows = g.map((row, y) => (/[^.]/.test(row) ? y : -1)).filter((y) => y >= 0);
    expect(rows).toEqual([4, 5, 6, 7]);
  });
});
