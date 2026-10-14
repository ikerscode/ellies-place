import { describe, expect, it } from 'vitest';
import { buildContentIndex, validateContent } from '../../../src/core/content';
import {
  asAspirationId,
  asInteractionId,
  asItemId,
  asMailId,
  asSpriteKey as sk,
  asStickerId,
  asStringKey as key,
  asWishId,
  type ContentDb,
} from '../../../src/core/types';
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

describe('content validation v3 (F38)', () => {
  it('catches what the v2 check let through: an empty cast, a bad seed, unknown ids in effects, a negative weight', () => {
    const base = makeFixtureContent();
    const db: ContentDb = {
      ...base,
      lot: { ...base.lot, rooms: [{ ...base.lot.rooms[0]!, seed: { tx: 0, ty: 0 } }], windows: [{ tile: { tx: 2, ty: 1 }, facing: 'up' }] },
      wishes: [
        {
          id: asWishId('bow'),
          title: key('wish.bow'),
          icon: sk('icon.wish'),
          category: 'george',
          size: 'small',
          offerIf: { kind: 'sticker', id: asStickerId('nope') },
          goal: { kind: 'aspirationTier', id: asAspirationId('asp.ghost'), atLeast: 1 },
          rewards: [{ kind: 'grantItem', item: asItemId('ghost_item') }, { kind: 'mail', id: asMailId('ghost_mail') }],
          weight: -1,
          mvp: true,
        },
      ],
    };
    const problems = validateContent(db, { complete: true });
    const has = (s: string): boolean => problems.some((p) => p.includes(s));
    expect(has('rooms: living seed (0,0) is not on a floor')).toBe(true);
    expect(has('lot.windows[0]')).toBe(true);
    expect(has('wishes: bow: unknown sticker nope')).toBe(true);
    expect(has('unknown aspiration asp.ghost')).toBe(true);
    expect(has('unknown item ghost_item')).toBe(true);
    expect(has('unknown mail ghost_mail')).toBe(true);
    expect(has('negative weight')).toBe(true);
    expect(has('visitors: missing bruce')).toBe(true);
    expect(has('hyrox: missing station skiErg')).toBe(true);
    expect(has('aspirations: missing asp.hyrox')).toBe(true);
    expect(has('lot.spots: missing mailbox')).toBe(true);
    expect(validateContent(base)).toEqual([]);
  });

  it('checks sprite and string keys against the registries', () => {
    const db = makeFixtureContent();
    const sprites = new Set<string>(['item.sofa_small', 'icon.int.sit']);
    const strings = { 'item.sofa_small.name': 'Sofa' };
    const problems = validateContent(db, { sprites, strings });
    expect(problems).toContain('items: lamp_small: sprite item.lamp_small is not in the art registry');
    expect(problems).toContain('items: sofa_small: string item.sofa_small.desc is missing');
    expect(problems.some((p) => p.includes('sprite item.sofa_small.r1 is not in the art registry'))).toBe(true);
    expect(problems.some((p) => p.includes('string int.sofa.sit is missing'))).toBe(true);
  });

  it('enforces the key spellings', () => {
    const db = makeFixtureContent();
    const sofa = db.items[0]!;
    const problems = validateContent({ ...db, items: [{ ...sofa, name: key('item.sofa.title') }, db.items[1]!] });
    expect(problems).toContain('items: sofa_small name: key item.sofa.title should be item.sofa_small.name');
  });
});
