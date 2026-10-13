import { describe, expect, it } from 'vitest';
import { buildContentIndex, validateContent } from '../../../src/core/content';
import { asInteractionId, asItemId, type ContentDb } from '../../../src/core/types';
import { makeFixtureContent } from './fixtures';

describe('content index', () => {
  it('indexes a valid fixture', () => {
    const idx = buildContentIndex(makeFixtureContent());
    expect(idx.items.get(asItemId('sofa_small'))?.price).toBe(120);
    expect(idx.interactions.has(asInteractionId('sit'))).toBe(true);
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
