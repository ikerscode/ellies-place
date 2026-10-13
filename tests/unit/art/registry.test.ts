import { describe, expect, it } from 'vitest';
import type { ArtBatch } from '../../../src/core/types';
import { BATCH, PAL, framesByDir, paletteColours, validateBatches } from '../../../src/art/base';
import { E_DOWN, E_SIDE, E_UP } from '../../../src/art/base/ellie';

const modules = import.meta.glob<Record<string, unknown>>('../../../src/art/*/index.ts', { eager: true });
const ALL: ArtBatch[] = Object.values(modules)
  .map((m) => m['BATCH'])
  .filter((b): b is ArtBatch => typeof b === 'object' && b !== null && 'sprites' in b);

describe('sprite registry (every batch)', () => {
  it('finds the base batch', () => {
    expect(ALL.map((b) => b.id)).toContain('base');
  });

  it('has unique keys, equal-width rows, defined palette chars, equal frame sizes', () => {
    expect(validateBatches(ALL)).toEqual([]);
  });

  it('keys are unique across batches', () => {
    const keys = ALL.flatMap((b) => b.sprites.map((d) => String(d.key)));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every row of every frame has the width of its first row', () => {
    for (const d of ALL.flatMap((b) => b.sprites)) {
      for (const list of Object.values(framesByDir(d))) {
        for (const g of list ?? []) {
          const w = g[0]?.length ?? 0;
          for (const row of g) expect(row.length, String(d.key)).toBe(w);
        }
      }
    }
  });

  it('every palette character used is defined', () => {
    for (const d of ALL.flatMap((b) => b.sprites)) {
      const grids = [d.grid, ...Object.values(framesByDir(d)).flatMap((l) => l ?? [])];
      for (const g of grids) for (const ch of g.join('')) if (ch !== '.') expect(d.palette[ch], `${String(d.key)} '${ch}'`).toBeDefined();
    }
  });
});

describe('base batch', () => {
  const keys = BATCH.sprites.map((d) => String(d.key));

  it('ports every character from game 1', () => {
    for (const k of ['ellie.idle', 'ellie.walk', 'ellie.sit']) expect(keys).toContain(k);
    for (const c of ['george', 'salem', 'shadow', 'peaches']) {
      expect(keys).toContain(`cat.${c}.idle`);
      expect(keys).toContain(`cat.${c}.walk`);
      expect(keys).toContain(`cat.${c}.sleep`);
    }
    for (const k of ['visitor.bruce.idle', 'visitor.poe.idle', 'visitor.pickle.idle', 'visitor.pickle.ribbit', 'cat.george.groom']) expect(keys).toContain(k);
  });

  it('ports every game 1 outfit', () => {
    for (const o of ['crown', 'chefhat', 'bucket', 'headphones', 'catears', 'scarf', 'firefly', 'moon', 'star', 'feather', 'bow']) expect(keys).toContain(`outfit.${o}`);
  });

  it('keeps Ellie fixed: black hair, green streaks, nose ring, tattoos', () => {
    const ellie = BATCH.sprites.find((d) => String(d.key) === 'ellie.idle');
    expect(ellie?.palette['h']).toBe(PAL.ellie.hair);
    expect(ellie?.palette['g']).toBe(PAL.ellie.streak);
    expect(E_DOWN.join('')).toContain('r');
    expect(E_SIDE.join('')).toContain('r');
    // Streaks on both sides of the face (front view) and tattoos on both arms.
    expect(E_DOWN.slice(2, 9).every((row) => row.indexOf('g') >= 0 && row.indexOf('g') < 6 && row.lastIndexOf('g') >= 6)).toBe(true);
    for (const g of [E_DOWN, E_UP]) {
      const t = g.join('\n').split('\n').slice(9);
      expect(t.some((row) => row.indexOf('T') >= 0 && row.indexOf('T') < 3)).toBe(true);
      expect(t.some((row) => row.lastIndexOf('T') > 8)).toBe(true);
    }
  });

  it('gives black cats and Poe the lavender rim', () => {
    for (const k of ['cat.salem.idle', 'cat.shadow.idle', 'visitor.poe.idle']) {
      expect(BATCH.sprites.find((d) => String(d.key) === k)?.outline).toBe(PAL.ink.rim);
    }
    expect(BATCH.sprites.find((d) => String(d.key) === 'cat.george.idle')?.outline).toBeUndefined();
  });

  it('uses only palette colours', () => {
    const allowed = paletteColours();
    for (const d of BATCH.sprites) for (const hex of Object.values(d.palette)) expect(allowed.has(hex.toLowerCase()), `${String(d.key)} ${hex}`).toBe(true);
  });

  it('anchors actors at the bottom centre of their frame', () => {
    for (const d of BATCH.sprites.filter((s) => /^(ellie|cat|visitor)\./.test(String(s.key)))) {
      const byDir = framesByDir(d);
      const g = byDir.down?.[0] ?? byDir.side?.[0] ?? d.grid;
      expect(d.anchor.y, String(d.key)).toBe(g.length);
      expect(d.anchor.x, String(d.key)).toBe((g[0]?.length ?? 0) / 2);
    }
  });
});
