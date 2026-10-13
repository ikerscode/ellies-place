import { describe, expect, it } from 'vitest';
import { buildContentIndex, validateContent } from '../../../src/core/content';
import { asInteractionId, asItemId, type ContentDb } from '../../../src/core/types';
import { makeFixtureContent } from './fixtures';

describe('content index', () => {
  it('indexes a valid fixture', () => {
    const idx = buildContentIndex(makeFixtureContent());
    expect(idx.items.get(asItemId('sofa_small'))?.price).toBe(120);
    expect(idx.interactions.has(asInteractionId('sofa.sit'))).toBe(true);
    expect(idx.cats.size).toBe(4);
    expect(validateContent(makeFixtureContent())).toEqual([]);
  });

  it('reports duplicates, broken references and a bad lot', () => {
    const base = makeFixtureContent();
    const sofa = base.items[0];
    if (!sofa) throw new Error('fixture');
    const db: ContentDb = {
      ...base,
      items: [...base.items, { ...sofa, interactions: [asInteractionId('nope')] }],
      lot: { ...base.lot, rows: ['WWWWWW', 'W..?.W', 'W....D'] },
    };
    const problems = validateContent(db);
    expect(problems.some((p) => p.includes('duplicate id sofa_small'))).toBe(true);
    expect(problems.some((p) => p.includes('unknown interaction nope'))).toBe(true);
    expect(problems.some((p) => p.includes('3 rows, expected 4'))).toBe(true);
    expect(problems.some((p) => p.includes("unknown legend char '?'"))).toBe(true);
    expect(() => buildContentIndex(db)).toThrow(/content invalid/);
  });
});

describe('content validation v2', () => {
  it('rejects malformed unlock codes, unknown room tags, fetches, tiers and gifts', () => {
    const base = makeFixtureContent();
    const [sofa, lamp] = base.items;
    const ritual = base.interactions.find((i) => i.id === asInteractionId('grass.rusk_ritual'));
    const asp = base.aspirations[0];
    if (!sofa || !lamp || !ritual || !asp) throw new Error('fixture');
    const db: ContentDb = {
      ...base,
      items: [
        { ...sofa, unlock: 'someday' as never, tags: ['room.attic'] },
        { ...lamp, unlock: 'asp.home.3', maxCopies: 0 },
      ],
      interactions: base.interactions.map((i) => (i === ritual ? { ...ritual, autoFetch: [asInteractionId('nope.fetch')] } : i)),
      aspirations: [{ ...asp, tiers: [{ ...asp.tiers[0]!, gift: asItemId('ghost') }] }],
    };
    const problems = validateContent(db);
    const has = (s: string): boolean => problems.some((p) => p.includes(s));
    expect(has('malformed unlock code someday')).toBe(true);
    expect(has('unknown room tag room.attic')).toBe(true);
    expect(has('missing tier asp.home.3')).toBe(true);
    expect(has('maxCopies below 1')).toBe(true);
    expect(has('auto-fetches unknown interaction nope.fetch')).toBe(true);
    expect(has('gift ghost unknown')).toBe(true);
  });
});
