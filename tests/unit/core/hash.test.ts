import { describe, expect, it } from 'vitest';
import { findNonJson, hashState, hashString, stableStringify } from '../../../src/core/hash';

describe('hash', () => {
  it('stableStringify ignores key order', () => {
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: null }] })).toBe(stableStringify({ a: [1, { c: null, d: 2 }], b: 1 }));
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('rejects non-JSON values', () => {
    expect(() => stableStringify({ a: Number.NaN })).toThrow(/\$\.a/);
    expect(() => stableStringify({ a: undefined })).toThrow(/undefined/);
    expect(() => stableStringify({ m: new Map() })).toThrow(/non-plain/);
    expect(() => stableStringify({ f: () => 1 })).toThrow();
  });

  it('hashes are stable, 16 hex chars, and sensitive to change', () => {
    const h = hashString('hello');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(hashString('hello')).toBe(h);
    expect(hashString('hellp')).not.toBe(h);
    expect(hashState({ x: 1, y: 2 })).toBe(hashState({ y: 2, x: 1 }));
    expect(hashState({ x: 1 })).not.toBe(hashState({ x: 2 }));
  });

  it('findNonJson lists bad paths', () => {
    expect(findNonJson({ a: 1, b: [1, 'x', null, true] })).toEqual([]);
    expect(findNonJson({ a: Number.POSITIVE_INFINITY, b: [Number.NaN], c: { d: undefined } })).toEqual([
      '$.a',
      '$.b[0]',
      '$.c.d',
    ]);
  });
});
