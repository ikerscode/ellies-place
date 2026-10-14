import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../../../src/core/content';
import { allocEntity, createEmptySimState, setC } from '../../../src/core/state';
import { asItemId, asRoomId, type PlaceableC, type SimState } from '../../../src/core/types';
import { FIXTURE_START, makeFixtureContent, makeFixtureWorld } from './fixtures';

function lotState(): SimState {
  const content = buildContentIndex(makeFixtureContent());
  const s = createEmptySimState(1, FIXTURE_START, { lot: { w: 6, h: 4, tiles: [], roomAt: [], rooms: {}, revision: 1 } });
  const { rows, legend } = content.db.lot;
  s.lot.tiles = rows.flatMap((r) => [...r].map((c) => legend[c] ?? 'void'));
  s.lot.roomAt = s.lot.tiles.map((t) => (t === 'floor' ? asRoomId('living') : null));
  return s;
}

describe('makeFixtureWorld', () => {
  it('answers roomAt, navGrid, slotPose, footprintTiles and sunbeams', () => {
    const content = buildContentIndex(makeFixtureContent());
    const world = makeFixtureWorld(content);
    const s = lotState();
    const sofa = allocEntity(s);
    const placeable: PlaceableC = {
      item: asItemId('sofa_small'),
      tile: { tx: 1, ty: 1 },
      rotation: 0,
      mount: { kind: 'floor' },
      placedTick: 0,
      origin: 'bought',
    };
    setC(s, 'placeable', sofa, placeable);

    expect(world.roomAt(s, { tx: 2, ty: 1 })).toBe('living');
    expect(world.roomAt(s, { tx: 0, ty: 0 })).toBeNull();
    const grid = world.navGrid(s);
    expect(grid.cost[0][1 * 6 + 3]).toBe(1);
    expect(grid.cost[0][1 * 6 + 1]).toBe(0);
    expect(grid.cost[0][0]).toBe(0);
    expect(world.navGrid(s)).toBe(grid);
    expect(world.footprintTiles(asItemId('sofa_small'), { tx: 1, ty: 1 }, 0)).toEqual([
      { tx: 1, ty: 1 },
      { tx: 2, ty: 1 },
    ]);
    expect(world.slotPose(s, sofa, 1)?.pos).toEqual({ x: 2.5, y: 1.5 });
    expect(world.slotPose(s, sofa, 5)).toBeNull();
    expect(world.sunbeams(s)).toEqual([]);
  });
});
