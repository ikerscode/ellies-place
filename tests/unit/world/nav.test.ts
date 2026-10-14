import { describe, expect, it } from 'vitest';
import { asEntityId, asItemId } from '../../../src/core/types';
import { at, buy, drop, startHome } from './testHome';

const W = 20;
const idx = (x: number, y: number): number => y * W + x;

describe('the nav grid', () => {
  it('opens floor, doors and grass and closes walls, windows and fences', () => {
    const h = startHome();
    const g = h.world.navGrid(h.state);
    expect(g.w).toBe(20);
    expect(g.h).toBe(12);
    expect(g.cost[0][idx(2, 2)]).toBe(1);
    expect(g.cost[0][idx(3, 5)]).toBe(1);
    expect(g.cost[0][idx(16, 5)]).toBe(1);
    expect(g.cost[0][idx(0, 0)]).toBe(0);
    expect(g.cost[0][idx(1, 0)]).toBe(0);
    expect(g.cost[0][idx(19, 3)]).toBe(0);
    expect(g.cost[1].every((c) => c === 0)).toBe(true);
    expect(g.cost[2].every((c) => c === 0)).toBe(true);
  });

  it('closes tiles under blocking furniture and leaves rugs and soft things open', () => {
    const h = startHome();
    buy(h, 'sofa', [2, 7]);
    buy(h, 'rug', [6, 7]);
    buy(h, 'cat_bed', [9, 8]);
    const g = h.world.navGrid(h.state);
    for (const x of [2, 3, 4]) expect(g.cost[0][idx(x, 7)]).toBe(0);
    expect(g.cost[0][idx(5, 7)]).toBe(1);
    expect(g.cost[0][idx(6, 7)]).toBe(1);
    expect(g.cost[0][idx(9, 8)]).toBe(1);
  });

  it('does not block under surface decor or hung things', () => {
    const h = startHome();
    const table = buy(h, 'table', [5, 7]);
    buy(h, 'lamp_table', [0, 0], 0, { kind: 'surface', parent: table, slot: 0 });
    buy(h, 'poster', [4, 0]);
    const g = h.world.navGrid(h.state);
    expect(g.cost[0][idx(4, 0)]).toBe(0); // still a wall tile
    expect(g.cost[0][idx(5, 7)]).toBe(0); // the table
    expect(g.cost[0][idx(7, 7)]).toBe(1);
  });

  it('gives cats layers: surfaces on a sofa, perches on a wardrobe, jumps between', () => {
    const h = startHome();
    buy(h, 'sofa', [2, 7]);
    buy(h, 'wardrobe', [8, 7]);
    const g = h.world.navGrid(h.state);
    expect(g.cost[1][idx(3, 7)]).toBe(1);
    expect(g.cost[1][idx(8, 7)]).toBe(0);
    expect(g.cost[2][idx(8, 7)]).toBe(1);
    expect(g.cost[2][idx(9, 7)]).toBe(1);
    const up = g.jumps.find((j) => j.from.tx === 2 && j.from.ty === 8 && j.to.tx === 2 && j.to.ty === 7);
    expect(up).toMatchObject({ fromLayer: 0, toLayer: 1 });
    const perch = g.jumps.find((j) => j.from.tx === 8 && j.from.ty === 6 && j.to.tx === 8 && j.to.ty === 7);
    expect(perch).toMatchObject({ fromLayer: 0, toLayer: 2 });
    const down = g.jumps.find((j) => j.from.tx === 9 && j.from.ty === 7 && j.to.tx === 9 && j.to.ty === 8);
    expect(down).toMatchObject({ fromLayer: 2, toLayer: 0, cost: 1 });
    // Every jump lands on an open tile of its layer.
    for (const j of g.jumps) {
      expect(g.cost[j.toLayer][idx(j.to.tx, j.to.ty)]).toBeGreaterThan(0);
      expect(g.cost[j.fromLayer][idx(j.from.tx, j.from.ty)]).toBeGreaterThan(0);
    }
  });

  it('is cached by revision and rebuilt when it changes', () => {
    const h = startHome();
    const a = h.world.navGrid(h.state);
    expect(h.world.navGrid(h.state)).toBe(a);
    buy(h, 'crate', [5, 7]);
    const b = h.world.navGrid(h.state);
    expect(b).not.toBe(a);
    expect(b.revision).toBe(h.state.lot.revision);
    expect(b.cost[0][idx(5, 7)]).toBe(0);
    expect(a.cost[0][idx(5, 7)]).toBe(1);
  });

  it('never serves one game another game\'s grid', () => {
    const one = startHome();
    const two = startHome();
    drop(two, 'crate', [5, 7]);
    two.state.lot.revision = one.state.lot.revision;
    expect(one.world.navGrid(one.state).cost[0][idx(5, 7)]).toBe(1);
    expect(two.world.navGrid(two.state).cost[0][idx(5, 7)]).toBe(0);
  });

  it('leaves boxes and mess to the sim', () => {
    const h = startHome();
    const id = drop(h, 'crate', [5, 7]);
    h.state.components.meta[String(id)] = { kind: 'box', name: null, bornTick: 0 };
    h.state.lot.revision += 1;
    expect(h.world.navGrid(h.state).cost[0][idx(5, 7)]).toBe(1);
  });
});

describe('slot poses and footprints', () => {
  it('puts a slot at the centre of its tile, facing where the item faces', () => {
    const h = startHome();
    const sofa = buy(h, 'sofa', [2, 7]);
    expect(h.world.slotPose(h.state, sofa, 0)).toEqual({ pos: { x: 2.5, y: 7.5 }, facing: 'down', layer: 0 });
    expect(h.world.slotPose(h.state, sofa, 1)).toEqual({ pos: { x: 3.5, y: 7.5 }, facing: 'down', layer: 0 });
  });

  it('turns slots with the item', () => {
    const h = startHome();
    const sofa = buy(h, 'sofa', [2, 7], 1);
    // a quarter turn: 1x3 down the column, slot 1 on the second tile, facing left
    expect(h.world.slotPose(h.state, sofa, 1)).toEqual({ pos: { x: 2.5, y: 8.5 }, facing: 'left', layer: 0 });
    const back = buy(h, 'sofa', [6, 7], 2);
    expect(h.world.slotPose(h.state, back, 0)).toEqual({ pos: { x: 8.5, y: 7.5 }, facing: 'up', layer: 0 });
    expect(h.world.slotPose(h.state, back, 1)?.pos).toEqual({ x: 7.5, y: 7.5 });
  });

  it('answers null for no such slot, no such item, or a thing that is not placed', () => {
    const h = startHome();
    const sofa = buy(h, 'sofa', [2, 7]);
    expect(h.world.slotPose(h.state, sofa, 2)).toBeNull();
    expect(h.world.slotPose(h.state, sofa, -1)).toBeNull();
    expect(h.world.slotPose(h.state, asEntityId(999), 0)).toBeNull();
    const crate = buy(h, 'crate', [5, 7]);
    expect(h.world.slotPose(h.state, crate, 0)).toBeNull();
  });

  it('lists footprint tiles for any rotation', () => {
    const h = startHome();
    expect(h.world.footprintTiles(asItemId('table'), at(5, 7), 0)).toEqual([at(5, 7), at(6, 7)]);
    expect(h.world.footprintTiles(asItemId('table'), at(5, 7), 1)).toEqual([at(5, 7), at(5, 8)]);
    expect(h.world.footprintTiles(asItemId('table'), at(5, 7), 2)).toEqual([at(5, 7), at(6, 7)]);
  });
});
