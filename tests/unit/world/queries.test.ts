/**
 * The real world must answer every WorldQueries question the way the shared fixture world does on the
 * fixture content (sim, cats and engine tests are written against that fixture), and then go further.
 */
import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../../../src/core/content';
import { allocEntity, createEmptySimState, setC } from '../../../src/core/state';
import { asItemId, asPaintId, asRoomId, type PlaceableC, type SimState } from '../../../src/core/types';
import { createWorld } from '../../../src/world';
import { FIXTURE_START, makeFixtureContent, makeFixtureWorld } from '../core/fixtures';

function lotState(): SimState {
  const content = buildContentIndex(makeFixtureContent());
  const s = createEmptySimState(1, FIXTURE_START, { lot: { w: 6, h: 4, tiles: [], roomAt: [], rooms: {}, revision: 1 } });
  const { rows, legend } = content.db.lot;
  s.lot.tiles = rows.flatMap((r) => [...r].map((c) => legend[c] ?? 'void'));
  s.lot.roomAt = s.lot.tiles.map((t) => (t === 'floor' ? asRoomId('living') : null));
  s.lot.rooms[asRoomId('living')] = { id: asRoomId('living'), kind: 'living', outdoor: false, wallPaint: asPaintId('wall.plain.plum'), floorPaint: asPaintId('floor.wood.oak'), scored: true, area: 8, cosyRated: 0, cosyLive: 0 };
  return s;
}

describe('WorldQueries parity with the shared fixture world', () => {
  const content = buildContentIndex(makeFixtureContent());
  const real = createWorld(content);
  const fixture = makeFixtureWorld(content);
  const s = lotState();
  const sofa = allocEntity(s);
  const placeable: PlaceableC = { item: asItemId('sofa_small'), tile: { tx: 1, ty: 1 }, rotation: 0, mount: { kind: 'floor' }, placedTick: 0, origin: 'bought' };
  setC(s, 'placeable', sofa, placeable);

  it('answers roomAt the same', () => {
    for (const t of [{ tx: 2, ty: 1 }, { tx: 0, ty: 0 }, { tx: 5, ty: 2 }]) expect(real.roomAt(s, t)).toBe(fixture.roomAt(s, t));
  });

  it('answers navGrid cost the same and caches by revision', () => {
    const a = real.navGrid(s);
    const b = fixture.navGrid(s);
    expect(a.w).toBe(b.w);
    expect(a.h).toBe(b.h);
    expect(a.cost[0]).toEqual(b.cost[0]);
    expect(real.navGrid(s)).toBe(a);
  });

  it('answers slotPose and footprintTiles the same', () => {
    expect(real.slotPose(s, sofa, 1)).toEqual(fixture.slotPose(s, sofa, 1));
    expect(real.slotPose(s, sofa, 5)).toBeNull();
    expect(real.footprintTiles(asItemId('sofa_small'), { tx: 1, ty: 1 }, 0)).toEqual(fixture.footprintTiles(asItemId('sofa_small'), { tx: 1, ty: 1 }, 0));
    expect(real.footprintTiles(asItemId('sofa_small'), { tx: 1, ty: 1 }, 1)).toEqual([{ tx: 1, ty: 1 }, { tx: 1, ty: 2 }]);
  });

  it('has no windows in this lot, so no sunbeams', () => {
    expect(real.sunbeams(s)).toEqual([]);
  });

  it('is a complete World: createLot, check, cosy and a plugin', () => {
    const lot = real.createLot();
    expect(lot.w).toBe(6);
    expect(lot.rooms[asRoomId('living')]?.area).toBe(8);
    expect(real.plugin().id).toBe('world');
    expect(real.cosy(s, asRoomId('living')).room).toBe('living');
    expect(real.check(s, { item: asItemId('sofa_small'), tile: { tx: 2, ty: 2 }, rotation: 0, mount: { kind: 'floor' } }).ok).toBe(true);
  });
});
