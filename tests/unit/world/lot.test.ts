import { describe, expect, it } from 'vitest';
import { asRoomId } from '../../../src/core/types';
import { at, startHome } from './testHome';

describe('the lot', () => {
  const h = startHome();
  const { state, world } = h;

  it('is built from the authored rows', () => {
    expect(state.lot.w).toBe(20);
    expect(state.lot.h).toBe(12);
    expect(state.lot.tiles).toHaveLength(240);
    expect(state.lot.tiles[0]).toBe('wall');
    expect(state.lot.tiles[1 * 20 + 1]).toBe('floor');
    expect(state.lot.tiles[1 * 20 + 15]).toBe('grass');
    expect(state.lot.tiles[5 * 20 + 3]).toBe('door');
    expect(state.lot.tiles[0 * 20 + 1]).toBe('window');
  });

  it('finds every room by flood fill from its seed', () => {
    const area = (id: string): number => state.lot.rooms[asRoomId(id)]?.area ?? -1;
    expect(area('bedroom')).toBe(24);
    expect(area('kitchen')).toBe(20);
    expect(area('living')).toBe(48);
    expect(area('garden')).toBe(5 * 11);
    expect(area('front')).toBe(3);
  });

  it('gives each floor tile exactly one room and walls, doors and fences none', () => {
    expect(world.roomAt(state, at(2, 2))).toBe('bedroom');
    expect(world.roomAt(state, at(9, 4))).toBe('kitchen');
    expect(world.roomAt(state, at(12, 9))).toBe('living');
    expect(world.roomAt(state, at(14, 3))).toBe('garden');
    expect(world.roomAt(state, at(18, 11))).toBe('garden');
    expect(world.roomAt(state, at(4, 11))).toBe('front');
    expect(world.roomAt(state, at(7, 2))).toBeNull();
    expect(world.roomAt(state, at(3, 5))).toBeNull();
    expect(world.roomAt(state, at(19, 3))).toBeNull();
    expect(world.roomAt(state, at(-1, 2))).toBeNull();
    expect(world.roomAt(state, at(40, 2))).toBeNull();
  });

  it('sums the room areas to every roomed tile', () => {
    const roomed = state.lot.roomAt.filter((r) => r !== null).length;
    const total = Object.values(state.lot.rooms).reduce((n, r) => n + r.area, 0);
    expect(total).toBe(roomed);
  });

  it('carries the room defaults, scoring and paint', () => {
    const bedroom = state.lot.rooms[asRoomId('bedroom')];
    expect(bedroom?.wallPaint).toBe('wall.plain.lavender');
    expect(bedroom?.floorPaint).toBe('floor.carpet.plum');
    expect(bedroom?.scored).toBe(true);
    expect(state.lot.rooms[asRoomId('front')]?.scored).toBe(false);
    expect(state.lot.rooms[asRoomId('garden')]?.outdoor).toBe(true);
  });

  it('createLot matches what init wrote into the state', () => {
    expect(world.createLot().tiles).toEqual(state.lot.tiles);
    expect(world.createLot().roomAt).toEqual(state.lot.roomAt);
  });
});
