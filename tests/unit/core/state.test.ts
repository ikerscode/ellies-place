import { describe, expect, it } from 'vitest';
import { findNonJson, hashState } from '../../../src/core/hash';
import { nextU32 } from '../../../src/core/rng';
import {
  allocEntity,
  cloneState,
  componentKeys,
  createEmptySimState,
  emptyLot,
  entitiesWith,
  getC,
  hasC,
  notImplemented,
  removeC,
  removeEntity,
  setC,
} from '../../../src/core/state';
import { SKILL_IDS, asSpriteKey } from '../../../src/core/types';

describe('state skeleton', () => {
  it('is JSON-clean and survives a round-trip with the same hash', () => {
    const s = createEmptySimState(42, { lot: emptyLot(30, 17) });
    expect(findNonJson(s)).toEqual([]);
    const copy = cloneState(s);
    expect(copy).toEqual(s);
    expect(hashState(copy)).toBe(hashState(s));
    expect(s.lot.tiles).toHaveLength(30 * 17);
    expect(Object.keys(s.records.hyrox.skill)).toEqual([...SKILL_IDS]);
  });

  it('same seed gives the same state; rng advances change the hash', () => {
    const a = createEmptySimState(7);
    const b = createEmptySimState(7);
    expect(hashState(a)).toBe(hashState(b));
    nextU32(b.rng);
    expect(hashState(a)).not.toBe(hashState(b));
  });

  it('has a table for every component key', () => {
    const s = createEmptySimState(1);
    expect(Object.keys(s.components).sort()).toEqual([...componentKeys()].sort());
  });

  it('entity store add, read, iterate and remove', () => {
    const s = createEmptySimState(1);
    const a = allocEntity(s);
    const b = allocEntity(s);
    expect([a, b]).toEqual([1, 2]);
    setC(s, 'sprite', b, { base: asSpriteKey('ellie'), anim: 'idle', animStartTick: 0, flipX: false, hidden: false });
    setC(s, 'sprite', a, { base: asSpriteKey('cat.salem'), anim: 'idle', animStartTick: 0, flipX: false, hidden: false });
    setC(s, 'light', a, { on: true });
    expect(entitiesWith(s, 'sprite')).toEqual([1, 2]);
    expect(getC(s, 'light', a)).toEqual({ on: true });
    expect(hasC(s, 'light', b)).toBe(false);
    removeC(s, 'light', a);
    expect(hasC(s, 'light', a)).toBe(false);
    removeEntity(s, b);
    expect(entitiesWith(s, 'sprite')).toEqual([1]);
    expect(findNonJson(s)).toEqual([]);
  });

  it('notImplemented throws with the name', () => {
    expect(() => notImplemented('createThing')).toThrow(/createThing/);
  });
});
