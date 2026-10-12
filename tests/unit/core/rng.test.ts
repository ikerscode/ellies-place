import { describe, expect, it } from 'vitest';
import { chance, cloneRng, createRng, nextFloat, nextInt, nextU32, pick } from '../../../src/core/rng';

describe('rng (mulberry32)', () => {
  it('matches the reference mulberry32 sequence', () => {
    // Reference implementation, inlined, to pin the algorithm.
    function ref(seed: number) {
      let a = seed;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    for (const seed of [0, 1, 42, 123456789, 0xffffffff]) {
      const r = ref(seed);
      const s = createRng(seed);
      for (let i = 0; i < 50; i++) expect(nextFloat(s)).toBe(r());
    }
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const a = createRng(7);
    const b = createRng(7);
    const c = createRng(8);
    const sa = Array.from({ length: 20 }, () => nextU32(a));
    const sb = Array.from({ length: 20 }, () => nextU32(b));
    const sc = Array.from({ length: 20 }, () => nextU32(c));
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
  });

  it('state survives a JSON round-trip mid-stream', () => {
    const s = createRng(99);
    for (let i = 0; i < 10; i++) nextU32(s);
    const restored = JSON.parse(JSON.stringify(s)) as typeof s;
    expect(restored).toEqual(s);
    for (let i = 0; i < 10; i++) expect(nextU32(restored)).toBe(nextU32(s));
  });

  it('keeps state as a uint32 and normalises seeds', () => {
    const s = createRng(-1);
    expect(s.seed).toBe(0xffffffff);
    for (let i = 0; i < 100; i++) {
      nextU32(s);
      expect(Number.isInteger(s.a)).toBe(true);
      expect(s.a).toBeGreaterThanOrEqual(0);
      expect(s.a).toBeLessThan(2 ** 32);
    }
    expect(() => createRng(Number.NaN)).toThrow(RangeError);
  });

  it('cloneRng gives an independent copy', () => {
    const s = createRng(5);
    const c = cloneRng(s);
    const first = nextU32(s);
    expect(nextU32(c)).toBe(first);
    nextU32(c);
    expect(c.a).not.toBe(s.a);
  });

  it('nextFloat stays in [0, 1)', () => {
    const s = createRng(3);
    for (let i = 0; i < 10_000; i++) {
      const f = nextFloat(s);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('nextInt is inclusive, in range and covers every value', () => {
    const s = createRng(11);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = nextInt(s, -2, 3);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(-2);
      expect(n).toBeLessThanOrEqual(3);
      seen.add(n);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([-2, -1, 0, 1, 2, 3]);
    expect(nextInt(s, 4, 4)).toBe(4);
    expect(() => nextInt(s, 5, 4)).toThrow(RangeError);
    expect(() => nextInt(s, 0.5, 4)).toThrow(RangeError);
  });

  it('pick returns elements of the array and throws when empty', () => {
    const s = createRng(13);
    const cats = ['george', 'salem', 'shadow', 'peaches'] as const;
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const c = pick(s, cats);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    expect(counts.size).toBe(4);
    for (const n of counts.values()) expect(n).toBeGreaterThan(800);
    expect(() => pick(s, [])).toThrow(RangeError);
  });

  it('chance respects 0 and 1', () => {
    const s = createRng(17);
    for (let i = 0; i < 100; i++) {
      expect(chance(s, 0)).toBe(false);
      expect(chance(s, 1)).toBe(true);
    }
  });
});
