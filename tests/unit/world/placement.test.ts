import { describe, expect, it } from 'vitest';
import { asItemId, type MountRef, type PlacementCheck, type PlacementError, type Rotation } from '../../../src/core/types';
import { PLACEMENT_ERRORS } from '../../../src/core/keys';
import { act, at, buy, drop, mountFor, startHome, type Home } from './testHome';

function check(h: Home, id: string, tile: readonly [number, number], rotation: Rotation = 0, mount?: MountRef, extra: { moving?: number; source?: 'stored' | 'buy' } = {}): PlacementCheck {
  const def = h.content.items.get(asItemId(id));
  if (!def) throw new Error(`no item ${id}`);
  return h.world.check(h.state, {
    item: def.id,
    tile: at(tile[0], tile[1]),
    rotation,
    mount: mount ?? mountFor(def),
    ...(extra.moving !== undefined ? { moving: extra.moving as never } : {}),
    ...(extra.source ? { source: extra.source } : {}),
  });
}

const reason = (c: PlacementCheck): PlacementError | 'ok' => (c.ok ? 'ok' : c.reason);

describe('placement: where things may go', () => {
  it('accepts a sofa on living-room floor and reports its tiles', () => {
    const h = startHome();
    const c = check(h, 'sofa', [2, 7]);
    expect(c.ok).toBe(true);
    expect(c.tiles).toEqual([at(2, 7), at(3, 7), at(4, 7)]);
  });

  it('turns the footprint with the rotation: the anchor stays top left', () => {
    const h = startHome();
    expect(check(h, 'sofa', [2, 7], 1).tiles).toEqual([at(2, 7), at(2, 8), at(2, 9)]);
    expect(h.world.footprintTiles(asItemId('bed'), at(5, 1), 0)).toHaveLength(6);
    expect(h.world.footprintTiles(asItemId('bed'), at(5, 1), 3)).toEqual([at(5, 1), at(6, 1), at(7, 1), at(5, 2), at(6, 2), at(7, 2)]);
    expect(h.world.footprintTiles(asItemId('nothing'), at(5, 1), 0)).toEqual([]);
  });

  it('refuses tiles past the edge: outOfBounds', () => {
    const h = startHome();
    expect(reason(check(h, 'crate', [20, 2]))).toBe('outOfBounds');
    expect(reason(check(h, 'crate', [-1, 2]))).toBe('outOfBounds');
    expect(reason(check(h, 'sofa', [18, 11]))).toBe('outOfBounds');
  });

  it('refuses walls, fences and the front step for floor items: notFloor', () => {
    const h = startHome();
    expect(reason(check(h, 'crate', [0, 0]))).toBe('notFloor');
    expect(reason(check(h, 'crate', [19, 3]))).toBe('notFloor');
    expect(reason(check(h, 'crate', [4, 11]))).toBe('notFloor');
    expect(reason(check(h, 'crate', [3, 5]))).toBe('notFloor');
    expect(reason(check(h, 'sofa', [11, 9]))).toBe('notFloor');
  });

  it('keeps indoor items indoors and garden items in the garden', () => {
    const h = startHome();
    expect(reason(check(h, 'cat_tree', [15, 3]))).toBe('needsIndoor');
    expect(reason(check(h, 'cat_tree', [4, 11], 1))).toBe('needsIndoor');
    expect(reason(check(h, 'bench', [3, 7]))).toBe('needsOutdoor');
    expect(reason(check(h, 'bench', [3, 11]))).toBe('needsOutdoor');
    expect(check(h, 'bench', [15, 3]).ok).toBe(true);
    expect(check(h, 'crate', [15, 3]).ok).toBe(true);
  });

  it('puts the mailbox on the front step only: needsFrontStep', () => {
    const h = startHome();
    expect(reason(check(h, 'mailbox', [6, 7]))).toBe('needsFrontStep');
    expect(reason(check(h, 'mailbox', [15, 3]))).toBe('needsFrontStep');
    expect(check(h, 'mailbox', [3, 11]).ok).toBe(true);
  });

  it('hangs wall items on a back-wall run in one room: needsWall', () => {
    const h = startHome();
    expect(check(h, 'poster', [3, 0]).ok).toBe(true);
    expect(check(h, 'poster', [8, 5]).ok).toBe(true);
    expect(check(h, 'poster', [16, 0]).ok).toBe(true);
    expect(reason(check(h, 'poster', [3, 2]))).toBe('needsWall');
    expect(reason(check(h, 'poster', [5, 10]))).toBe('needsWall');
    expect(reason(check(h, 'poster', [1, 0]))).toBe('needsWall');
    expect(reason(check(h, 'poster', [3, 0], 0, { kind: 'floor' }))).toBe('needsWall');
    expect(check(h, 'banner', [3, 0]).ok).toBe(true);
    expect(reason(check(h, 'banner', [6, 0]))).toBe('needsWall');
    expect(check(h, 'banner', [3, 0]).tiles).toEqual([at(3, 0), at(4, 0)]);
  });

  it('allows one wall item per wall tile: blocked', () => {
    const h = startHome();
    buy(h, 'poster', [4, 0]);
    expect(reason(check(h, 'poster', [4, 0]))).toBe('blocked');
    expect(reason(check(h, 'banner', [3, 0]))).toBe('blocked');
    expect(check(h, 'banner', [5, 0]).ok).toBe(true);
  });

  it('sits window items in window tiles, one each: needsWindow', () => {
    const h = startHome();
    expect(check(h, 'curtain', [1, 0]).ok).toBe(true);
    expect(check(h, 'curtain', [8, 10]).ok).toBe(true);
    expect(reason(check(h, 'curtain', [3, 3]))).toBe('needsWindow');
    expect(reason(check(h, 'curtain', [3, 0]))).toBe('needsWindow');
    buy(h, 'curtain', [1, 0]);
    expect(reason(check(h, 'curtain', [1, 0]))).toBe('blocked');
  });

  it('lets rugs go anywhere walkable, one per tile: oneRugPerTile', () => {
    const h = startHome();
    expect(check(h, 'doormat', [4, 11]).ok).toBe(true);
    buy(h, 'rug', [2, 7]);
    expect(reason(check(h, 'rug', [3, 8]))).toBe('oneRugPerTile');
    expect(reason(check(h, 'doormat', [2, 7]))).toBe('oneRugPerTile');
    expect(check(h, 'rug', [4, 7]).ok).toBe(true);
    // A rug sits under furniture and on a door's inside tile.
    expect(check(h, 'sofa', [2, 7]).ok).toBe(true);
    expect(check(h, 'doormat', [3, 4]).ok).toBe(true);
    expect(reason(check(h, 'rug', [0, 0]))).toBe('notFloor');
  });

  it('stops floor items stacking: blocked', () => {
    const h = startHome();
    buy(h, 'crate', [5, 7]);
    expect(reason(check(h, 'crate', [5, 7]))).toBe('blocked');
    expect(reason(check(h, 'sofa', [3, 7]))).toBe('blocked');
    expect(check(h, 'sofa', [6, 7]).ok).toBe(true);
  });

  it('checks the rotation list: rotationNotAllowed', () => {
    const h = startHome();
    expect(reason(check(h, 'poster', [3, 0], 1))).toBe('rotationNotAllowed');
    expect(reason(check(h, 'rug', [2, 7], 2))).toBe('rotationNotAllowed');
    expect(check(h, 'rug', [2, 7], 1).ok).toBe(true);
  });
});

describe('placement: surfaces', () => {
  it('seats small decor in a free slot of a host, and reports the slot tile', () => {
    const h = startHome();
    const table = buy(h, 'table', [5, 7]);
    const c = check(h, 'lamp_table', [0, 0], 0, { kind: 'surface', parent: table, slot: 1 });
    expect(c.ok).toBe(true);
    expect(c.tiles).toEqual([at(6, 7)]);
  });

  it('turns slot tiles with the host', () => {
    const h = startHome();
    const table = buy(h, 'table', [5, 6], 1);
    // rotated a quarter turn the table is 1x2 and slot 1 sits on its second tile
    expect(check(h, 'lamp_table', [0, 0], 0, { kind: 'surface', parent: table, slot: 1 }).tiles).toEqual([at(5, 7)]);
  });

  it('needs a real host and slot: needsSurface', () => {
    const h = startHome();
    const table = buy(h, 'table', [5, 7]);
    expect(reason(check(h, 'lamp_table', [5, 7], 0, { kind: 'floor' }))).toBe('needsSurface');
    expect(reason(check(h, 'lamp_table', [0, 0], 0, { kind: 'surface', parent: table, slot: 5 }))).toBe('needsSurface');
    expect(reason(check(h, 'lamp_table', [0, 0], 0, { kind: 'surface', parent: 999 as never, slot: 0 }))).toBe('needsSurface');
    expect(reason(check(h, 'crate', [0, 0], 0, { kind: 'surface', parent: table, slot: 0 }))).toBe('notFloor');
  });

  it('refuses a second thing in a slot (surfaceFull) and things too big for it (tooBig)', () => {
    const h = startHome();
    const table = buy(h, 'table', [5, 7]);
    buy(h, 'lamp_table', [0, 0], 0, { kind: 'surface', parent: table, slot: 0 });
    expect(reason(check(h, 'plant_small', [0, 0], 0, { kind: 'surface', parent: table, slot: 0 }))).toBe('surfaceFull');
    expect(check(h, 'plant_small', [0, 0], 0, { kind: 'surface', parent: table, slot: 1 }).ok).toBe(true);
    expect(reason(check(h, 'tray', [0, 0], 0, { kind: 'surface', parent: table, slot: 1 }))).toBe('tooBig');
  });

  it('does not stack surface items on surface items', () => {
    const h = startHome();
    const table = buy(h, 'table', [5, 7]);
    const lamp = buy(h, 'lamp_table', [0, 0], 0, { kind: 'surface', parent: table, slot: 0 });
    expect(reason(check(h, 'plant_small', [0, 0], 0, { kind: 'surface', parent: lamp, slot: 0 }))).toBe('needsSurface');
  });

  it('hosts can be wall shelves too', () => {
    const h = startHome();
    const shelf = buy(h, 'shelf_wall', [5, 0]);
    expect(check(h, 'plant_small', [0, 0], 0, { kind: 'surface', parent: shelf, slot: 0 }).ok).toBe(true);
  });
});

describe('placement: doors and paths', () => {
  it('keeps the tiles beside every door free: blocksDoor', () => {
    const h = startHome();
    for (const t of [[3, 4], [3, 6], [10, 4], [10, 6], [12, 3], [14, 3], [4, 9]] as const) {
      expect(reason(check(h, 'crate', t)), `tile ${t.join(',')}`).toBe('blocksDoor');
    }
    expect(check(h, 'crate', [4, 4]).ok).toBe(true);
  });

  it('counts a big item that overlaps a door tile', () => {
    const h = startHome();
    expect(reason(check(h, 'sofa', [1, 6]))).toBe('blocksDoor');
    expect(reason(check(h, 'sofa', [9, 6]))).toBe('blocksDoor');
  });

  it('lets non-blocking items sit on a door tile', () => {
    const h = startHome();
    expect(check(h, 'cat_bed', [3, 6]).ok).toBe(true);
    expect(check(h, 'doormat', [3, 6]).ok).toBe(true);
  });

  it('refuses the piece that would cut a room off from Ellie: breaksPath', () => {
    const h = startHome();
    // A wall of crates across the living room (x = 6) would cut the kitchen and the garden off.
    buy(h, 'crate', [6, 6]);
    buy(h, 'crate', [6, 7]);
    buy(h, 'crate', [6, 8]);
    const last = check(h, 'crate', [6, 9]);
    expect(reason(last)).toBe('breaksPath');
    expect(last.tiles).toEqual([at(6, 9)]);
    // And dispatching it says why, in a key the UI can show.
    const r = act(h, { type: 'build.place', source: 'buy', request: { item: asItemId('crate'), tile: at(6, 9), rotation: 0, mount: { kind: 'floor' } } });
    expect(r).toEqual({ ok: false, reason: 'build.err.breaksPath' });
  });

  it('lets Ellie reach her bed: no walling it in', () => {
    const h = startHome();
    buy(h, 'bed', [1, 1]);
    for (const t of [[3, 1], [3, 2], [3, 3], [1, 4]] as const) buy(h, 'crate', t);
    expect(reason(check(h, 'crate', [2, 4]))).toBe('breaksPath');
    expect(check(h, 'crate', [5, 3]).ok).toBe(true);
  });

  it('will not drop a bed where nobody can reach it', () => {
    const h = startHome();
    for (const t of [[3, 1], [3, 2], [3, 3], [1, 4]] as const) buy(h, 'crate', t);
    buy(h, 'crate', [2, 4]);
    expect(reason(check(h, 'bed', [1, 1]))).toBe('breaksPath');
  });

  it('does not penalise a placement for a split that was already there', () => {
    const h = startHome();
    for (const y of [6, 7, 8, 9]) drop(h, 'crate', [6, y]);
    // The kitchen and the garden are already cut off, so a crate in the bedroom is fine.
    expect(check(h, 'crate', [5, 3]).ok).toBe(true);
  });

  it('moving a piece out of a gap is always allowed, moving it into one is not', () => {
    const h = startHome();
    const ids = [6, 7, 8].map((y) => buy(h, 'crate', [6, y]));
    const spare = buy(h, 'crate', [2, 8]);
    // spare into the last gap: breaks the path
    expect(reason(check(h, 'crate', [6, 9], 0, undefined, { moving: spare }))).toBe('breaksPath');
    // a gap piece moves away and back
    expect(check(h, 'crate', [6, 7], 0, undefined, { moving: ids[1] as number }).ok).toBe(true);
    expect(check(h, 'crate', [8, 8], 0, undefined, { moving: ids[1] as number }).ok).toBe(true);
  });

  it('keeps Ellie from being locked out when furniture lands on her spawn tile', () => {
    const h = startHome();
    expect(check(h, 'crate', [3, 7]).ok).toBe(true);
    expect(check(h, 'sofa', [2, 7]).ok).toBe(true);
  });
});

describe('placement: ownership and money', () => {
  it('only checks ownership when the request says where the copy comes from', () => {
    const h = startHome();
    expect(check(h, 'pricey', [2, 7]).ok).toBe(true);
    expect(reason(check(h, 'pricey', [2, 7], 0, undefined, { source: 'buy' }))).toBe('cannotAfford');
  });

  it('refuses stored placements with no stored copy: notOwned', () => {
    const h = startHome();
    expect(reason(check(h, 'crate', [2, 7], 0, undefined, { source: 'stored' }))).toBe('notOwned');
    h.state.inventory.storedFree[asItemId('crate')] = 1;
    expect(check(h, 'crate', [2, 7], 0, undefined, { source: 'stored' }).ok).toBe(true);
  });

  it('refuses buying what is locked, a fixture, or too dear', () => {
    const h = startHome();
    expect(reason(check(h, 'locked_thing', [2, 7], 0, undefined, { source: 'buy' }))).toBe('notOwned');
    h.state.unlocks.items[asItemId('locked_thing')] = true;
    expect(check(h, 'locked_thing', [2, 7], 0, undefined, { source: 'buy' }).ok).toBe(true);
    expect(reason(check(h, 'mailbox', [3, 11], 0, undefined, { source: 'buy' }))).toBe('notOwned');
    h.state.hearts.balance = 10;
    expect(reason(check(h, 'sofa', [2, 7], 0, undefined, { source: 'buy' }))).toBe('cannotAfford');
  });

  it('caps copies across the lot, the store and orders: maxCopies', () => {
    const h = startHome();
    buy(h, 'only_one', [2, 7]);
    expect(reason(check(h, 'only_one', [4, 7], 0, undefined, { source: 'buy' }))).toBe('maxCopies');
    const h2 = startHome();
    h2.state.inventory.stored[asItemId('only_one')] = 1;
    expect(reason(check(h2, 'only_one', [4, 7], 0, undefined, { source: 'buy' }))).toBe('maxCopies');
    const h3 = startHome();
    h3.state.inventory.orders.push({ id: 1, items: [asItemId('only_one')], placedTick: 0, arriveTick: 10 });
    expect(reason(check(h3, 'only_one', [4, 7], 0, undefined, { source: 'buy' }))).toBe('maxCopies');
  });

  it('answers an unknown item with a refusal and never throws', () => {
    const h = startHome();
    const c = h.world.check(h.state, { item: asItemId('ghost'), tile: at(2, 2), rotation: 0, mount: { kind: 'floor' } });
    expect(c.ok).toBe(false);
  });
});

describe('placement: every error has a key and a way to happen', () => {
  it('covers the whole PlacementError list', () => {
    const seen = new Set<string>(['fixed']);
    const h = startHome();
    const table = buy(h, 'table', [5, 7]);
    buy(h, 'lamp_table', [0, 0], 0, { kind: 'surface', parent: table, slot: 0 });
    buy(h, 'poster', [4, 0]);
    buy(h, 'rug', [8, 7]);
    buy(h, 'only_one', [10, 8]);
    const cases: PlacementCheck[] = [
      check(h, 'crate', [20, 2]),
      check(h, 'crate', [0, 0]),
      check(h, 'crate', [5, 7]),
      check(h, 'poster', [3, 2]),
      check(h, 'lamp_table', [5, 7], 0, { kind: 'floor' }),
      check(h, 'plant_small', [0, 0], 0, { kind: 'surface', parent: table, slot: 0 }),
      check(h, 'tray', [0, 0], 0, { kind: 'surface', parent: table, slot: 1 }),
      check(h, 'crate', [3, 4]),
      check(h, 'poster', [3, 0], 1),
      check(h, 'crate', [2, 2], 0, undefined, { source: 'stored' }),
      check(h, 'pricey', [2, 2], 0, undefined, { source: 'buy' }),
      check(h, 'cat_tree', [15, 3]),
      check(h, 'bench', [3, 7]),
      check(h, 'curtain', [3, 3]),
      check(h, 'mailbox', [6, 7]),
      check(h, 'rug', [8, 7]),
      check(h, 'only_one', [12, 8], 0, undefined, { source: 'buy' }),
    ];
    for (const c of cases) if (!c.ok) seen.add(c.reason);
    // breaksPath is exercised above with a long set-up; mark it seen by its own test.
    seen.add('breaksPath');
    expect([...PLACEMENT_ERRORS].filter((e) => !seen.has(e))).toEqual([]);
  });
});
