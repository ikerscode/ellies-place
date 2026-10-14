import { describe, expect, it } from 'vitest';
import { at, startHome, type Home } from './testHome';

function at_(h: Home, minuteOfDay: number): ReturnType<Home['world']['sunbeams']> {
  h.state.time.minuteOfDay = minuteOfDay;
  return h.world.sunbeams(h.state);
}

const roomsOf = (patches: ReturnType<Home['world']['sunbeams']>): string[] => [...new Set(patches.map((p) => p.room as string))].sort();
const tiles = (p: { tiles: readonly { tx: number; ty: number }[] } | undefined): string => (p ? p.tiles.map((t) => `${t.tx},${t.ty}`).join(' ') : '');

describe('sunbeams (sim.md 11)', () => {
  it('casts nothing at night or before the first beam starts', () => {
    const h = startHome();
    expect(at_(h, 3 * 60)).toEqual([]);
    expect(at_(h, 21 * 60)).toEqual([]);
    expect(at_(h, 385)).toEqual([]);
    expect(at_(h, 1141 + 5)).toEqual([]);
  });

  it('casts nothing in the rain', () => {
    const h = startHome();
    expect(at_(h, 780).length).toBeGreaterThan(0);
    h.state.environment.weather = 'rain';
    expect(at_(h, 780)).toEqual([]);
    h.state.environment.weather = 'cloudy';
    expect(at_(h, 780).length).toBeGreaterThan(0);
  });

  it('follows the sun: left windows in the morning, back windows at noon, right windows in the evening', () => {
    const h = startHome();
    expect(roomsOf(at_(h, 7 * 60 + 30))).toEqual(['bedroom', 'living']);
    expect(roomsOf(at_(h, 13 * 60))).toEqual(['bedroom', 'kitchen']);
    expect(roomsOf(at_(h, 17 * 60 + 30))).toEqual(['kitchen', 'living']);
  });

  it('overlaps the left and back beams mid-morning', () => {
    const h = startHome();
    const patches = at_(h, 10 * 60);
    expect(roomsOf(patches)).toEqual(['bedroom', 'kitchen', 'living']);
    expect(patches.filter((p) => p.room === 'bedroom')).toHaveLength(2);
  });

  it('never casts through south windows', () => {
    const h = startHome();
    for (let m = 330; m <= 1200; m += 15) {
      for (const p of at_(h, m)) {
        // The living room's south windows are at (8,10) and (9,10); a south beam would light the bottom row.
        if (p.room === 'living') expect(p.tiles.some((t) => t.ty === 9 && t.tx >= 6 && t.tx <= 9 && m >= 660 && m <= 840)).toBe(false);
      }
    }
    expect(roomsOf(at_(h, 12 * 60))).not.toContain('living');
  });

  it('lights nothing in the garden or on the front step', () => {
    const h = startHome();
    for (let m = 330; m <= 1200; m += 10) expect(roomsOf(at_(h, m))).not.toContain('garden');
    for (let m = 330; m <= 1200; m += 10) expect(roomsOf(at_(h, m))).not.toContain('front');
  });

  it('keeps every lit tile on floor inside the patch\'s own room', () => {
    const h = startHome();
    for (let m = 390; m <= 1140; m += 15) {
      for (const p of at_(h, m)) {
        expect(p.tiles.length).toBeGreaterThan(0);
        for (const t of p.tiles) {
          expect(h.world.roomAt(h.state, t)).toBe(p.room);
          expect(h.state.lot.tiles[t.ty * 20 + t.tx]).toBe('floor');
        }
      }
    }
  });

  it('shapes the back beam as the parallelogram: 2 deep at noon, slanting with the hour', () => {
    const h = startHome();
    const noon = at_(h, 12 * 60 + 45).find((p) => p.room === 'bedroom');
    expect(noon?.tiles.map((t) => t.ty).sort()).toEqual([1, 1, 2, 2]);
    const early = at_(h, 9 * 60).find((p) => p.room === 'bedroom');
    const deepest = Math.max(...(early?.tiles.map((t) => t.ty) ?? [0]));
    expect(deepest).toBeGreaterThanOrEqual(3);
    // Shear: slants right in the morning, left in the afternoon.
    const morningRight = Math.max(...(early?.tiles.map((t) => t.tx) ?? [0]));
    const late = at_(h, 16 * 60).find((p) => p.room === 'bedroom');
    expect(morningRight).toBeGreaterThan(Math.max(...(late?.tiles.map((t) => t.tx) ?? [0])));
  });

  it('matches known beams (regression)', () => {
    const h = startHome();
    const one = at_(h, 13 * 60);
    expect(tiles(one.find((p) => p.room === 'bedroom'))).toBe('1,1 2,1 1,2 2,2');
    expect(tiles(one.find((p) => p.room === 'kitchen'))).toBe('9,1 10,1 9,2 10,2');
    const eve = at_(h, 18 * 60 + 15);
    expect(tiles(eve.find((p) => p.room === 'living'))).toBe('11,7 12,7 8,8 9,8 10,8');
  });

  it('long side beams reach deep at dawn and short ones at the end of the morning', () => {
    const h = startHome();
    const dawn = at_(h, 390).find((p) => p.room === 'bedroom');
    expect(Math.max(...(dawn?.tiles.map((t) => t.tx) ?? [0]))).toBe(5);
    const late = at_(h, 660).find((p) => p.room === 'living');
    expect(Math.max(...(late?.tiles.map((t) => t.tx) ?? [0]))).toBeLessThanOrEqual(2);
  });

  it('fades in and out: strength is 0.1 + 0.35 x sin(pi p)', () => {
    const h = startHome();
    // Back beam: 09:00 to 16:30 (540 to 990), peak at p = 0.5 = 765.
    const start = at_(h, 540).find((p) => p.room === 'kitchen');
    const mid = at_(h, 765).find((p) => p.room === 'kitchen');
    const end = at_(h, 990).find((p) => p.room === 'kitchen' && p.strength < 0.2 && p.tiles.some((t) => t.tx <= 10));
    expect(start?.strength).toBeCloseTo(0.1, 6);
    expect(mid?.strength).toBeCloseTo(0.45, 6);
    expect(end?.strength).toBeCloseTo(0.1, 6);
  });

  it('recomputes on the 5-minute step and caches in between', () => {
    const h = startHome();
    const a = at_(h, 12 * 60);
    expect(at_(h, 12 * 60 + 4)).toBe(a);
    expect(at_(h, 12 * 60 + 5)).not.toBe(a);
    const b = at_(h, 12 * 60 + 5);
    h.state.time.day += 1;
    expect(h.world.sunbeams(h.state)).not.toBe(b);
  });

  it('is deterministic: the same state gives the same beams', () => {
    const one = startHome();
    const two = startHome();
    for (const m of [400, 500, 700, 900, 1100]) expect(at_(one, m)).toEqual(at_(two, m));
  });

  it('does not change the lot or consult furniture', () => {
    const h = startHome();
    const before = JSON.stringify(h.state.lot);
    at_(h, 600);
    expect(JSON.stringify(h.state.lot)).toBe(before);
    expect(h.world.roomAt(h.state, at(1, 3))).toBe('bedroom');
  });
});
