import { describe, expect, it } from 'vitest';
import { createStringLookup, formatString, mergeStringTables } from '../../../src/core/strings';
import { asStringKey } from '../../../src/core/types';

describe('strings', () => {
  it('fills known placeholders and leaves others alone', () => {
    expect(formatString('{name} and {cat} x{n} {other}', { name: 'Ellie', cat: 'Salem', n: 3 })).toBe(
      'Ellie and Salem x3 {other}',
    );
    expect(formatString('no vars {n}')).toBe('no vars {n}');
  });

  it('merges domain tables and rejects duplicate keys', () => {
    const t = mergeStringTables([{ 'a.b': '1' }, { 'c.d': '2' }]);
    expect(t).toEqual({ 'a.b': '1', 'c.d': '2' });
    expect(() => mergeStringTables([{ 'a.b': '1' }, { 'a.b': '2' }])).toThrow(/a\.b/);
  });

  it('lookup uses the default name and reports missing keys once', () => {
    const missing: string[] = [];
    const t = createStringLookup({ 'cat.salem.hi.01': 'HI {name}!' }, { name: 'Ellie', onMissing: (k) => missing.push(k) });
    expect(t(asStringKey('cat.salem.hi.01'))).toBe('HI Ellie!');
    expect(t(asStringKey('cat.salem.hi.01'), { name: 'Sir Ellie' })).toBe('HI Sir Ellie!');
    expect(t(asStringKey('nope'))).toBe('[nope]');
    t(asStringKey('nope'));
    expect(missing).toEqual(['nope']);
  });
});
