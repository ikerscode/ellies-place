import { describe, expect, it } from 'vitest';
import { findNonJson, hashState } from '../../../src/core/hash';
import { getC } from '../../../src/core/state';
import { asEntityId, asItemId, asPaintId, asRoomId, type EntityId, type MountRef, type SimEvent } from '../../../src/core/types';
import { act, at, buy, drop, mountFor, startHome, type Home } from './testHome';

const LIVING = asRoomId('living');
const GARDEN = asRoomId('garden');
const BED = asRoomId('bedroom');

const START = [
  { item: 'table', tile: [5, 7] as const },
  { item: 'lamp_table', tile: [5, 7] as const, onto: { index: 0, slot: 1 } },
  { item: 'sofa', tile: [6, 9] as const },
  { item: 'mailbox', tile: [3, 11] as const },
  { item: 'poster', tile: [4, 0] as const },
  { item: 'doormat', tile: [4, 11] as const },
] as const;

const place = (h: Home, id: string, tile: readonly [number, number], source: 'buy' | 'stored' = 'buy', rotation = 0 as 0 | 1 | 2 | 3, mount?: MountRef) => {
  const def = h.content.items.get(asItemId(id))!;
  return act(h, { type: 'build.place', source, request: { item: def.id, tile: at(tile[0], tile[1]), rotation, mount: mount ?? mountFor(def) } });
};

const eventsOf = <T extends SimEvent['type']>(h: Home, type: T): Extract<SimEvent, { type: T }>[] => h.events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);

describe('a new game', () => {
  it('builds the lot and spawns the start furniture in order', () => {
    const h = startHome(START);
    const items = Object.values(h.state.components.placeable).map((p) => p.item);
    expect(items).toEqual(['table', 'lamp_table', 'sofa', 'mailbox', 'poster', 'doormat']);
    expect(h.state.lot.revision).toBeGreaterThan(0);
    expect(Object.keys(h.state.components.placeable)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('resolves `onto` to the host entity and the slot\'s tile', () => {
    const h = startHome(START);
    const lamp = getC(h.state, 'placeable', asEntityId(2));
    expect(lamp?.mount).toEqual({ kind: 'surface', parent: 1, slot: 1 });
    expect(lamp?.tile).toEqual(at(6, 7));
  });

  it('gives each item the components the game reads', () => {
    const h = startHome(START);
    const lamp = asEntityId(2);
    expect(getC(h.state, 'meta', lamp)).toEqual({ kind: 'item', name: null, bornTick: 0 });
    expect(getC(h.state, 'light', lamp)).toEqual({ on: false });
    expect(getC(h.state, 'smartObject', lamp)?.flags).toEqual({ on: false });
    expect(getC(h.state, 'sprite', asEntityId(1))?.base).toBe('item.table');
    expect(getC(h.state, 'position', asEntityId(1))).toMatchObject({ pos: { x: 5, y: 7 }, layer: 0, facing: 'down', room: 'living' });
    expect(getC(h.state, 'position', lamp)).toMatchObject({ layer: 1, room: 'living' });
    expect(getC(h.state, 'position', asEntityId(5))?.room).toBe('bedroom'); // the wall item belongs to the room south of its wall tile
    expect(getC(h.state, 'position', asEntityId(6))?.room).toBe('front');
    expect(getC(h.state, 'placeable', asEntityId(3))?.origin).toBe('bought');
  });

  it('writes Cosy for every room and says the world changed', () => {
    const h = startHome(START);
    expect(h.state.lot.rooms[LIVING]?.cosyRated).toBeGreaterThan(0);
    expect(h.state.lot.rooms[asRoomId('front')]?.cosyRated).toBe(0);
    expect(h.state.lot.rooms[LIVING]?.cosyLive).toBeGreaterThan(0);
    const [ev] = eventsOf(h, 'world.changed');
    expect(ev?.change.reason).toBe('newGame');
    expect(ev?.change.revision).toBe(h.state.lot.revision);
    expect(ev?.change.rooms).toHaveLength(5);
  });

  it('rebuilds the lot on a new game and keeps it as saved on a load', () => {
    const h = startHome(START);
    const before = JSON.stringify(h.state);
    h.events.length = 0;
    h.plugin.init?.(h.ctx, 'load');
    expect(JSON.stringify(h.state)).toBe(before);
    expect(eventsOf(h, 'world.changed')[0]?.change.reason).toBe('load');
  });
});

describe('build.place', () => {
  it('buys: pays the shop price, puts the item down, and tells everyone', () => {
    const h = startHome();
    const balance = h.state.hearts.balance;
    const r = place(h, 'sofa', [3, 7]);
    expect(r).toEqual({ ok: true });
    expect(h.state.hearts.balance).toBe(balance - 95); // 60 x 1.6 = 96 -> 95
    expect(h.state.hearts.spent).toBe(95);
    const id = h.state.nextEntityId - 1;
    expect(getC(h.state, 'placeable', asEntityId(id))).toMatchObject({ item: 'sofa', tile: at(3, 7), origin: 'bought', mount: { kind: 'floor' } });
    expect(eventsOf(h, 'hearts').at(-1)).toMatchObject({ delta: -95, balance: balance - 95, reason: 'buy' });
    expect(eventsOf(h, 'progress').map((e) => e.event.kind)).toEqual(['itemBought', 'itemPlaced']);
    const ev = eventsOf(h, 'world.changed').at(-1);
    expect(ev?.change).toMatchObject({ reason: 'place', rooms: ['living'], entities: [id] });
    expect(h.state.lastBuild?.added).toEqual([id]);
  });

  it('places from storage, free copies first, without paying', () => {
    const h = startHome();
    h.state.inventory.stored[asItemId('crate')] = 1;
    h.state.inventory.storedFree[asItemId('crate')] = 1;
    const balance = h.state.hearts.balance;
    expect(place(h, 'crate', [5, 7], 'stored')).toEqual({ ok: true });
    expect(h.state.hearts.balance).toBe(balance);
    expect(h.state.inventory.storedFree[asItemId('crate')]).toBeUndefined();
    expect(h.state.inventory.stored[asItemId('crate')]).toBe(1);
    expect(getC(h.state, 'placeable', asEntityId(h.state.nextEntityId - 1))?.origin).toBe('free');
    expect(place(h, 'crate', [6, 7], 'stored')).toEqual({ ok: true });
    expect(h.state.inventory.stored[asItemId('crate')]).toBeUndefined();
    expect(getC(h.state, 'placeable', asEntityId(h.state.nextEntityId - 1))?.origin).toBe('bought');
  });

  it('puts a surface item at its slot tile whatever tile was asked for', () => {
    const h = startHome(START);
    const r = place(h, 'plant_small', [0, 0], 'buy', 0, { kind: 'surface', parent: asEntityId(1), slot: 0 });
    expect(r).toEqual({ ok: true });
    expect(getC(h.state, 'placeable', asEntityId(h.state.nextEntityId - 1))?.tile).toEqual(at(5, 7));
  });

  it('refuses with the placement error key and changes nothing', () => {
    const h = startHome(START);
    const before = hashState(h.state);
    expect(place(h, 'crate', [0, 0])).toEqual({ ok: false, reason: 'build.err.notFloor' });
    expect(place(h, 'crate', [3, 4])).toEqual({ ok: false, reason: 'build.err.blocksDoor' });
    expect(place(h, 'pricey', [8, 8])).toEqual({ ok: false, reason: 'build.err.cannotAfford' });
    expect(place(h, 'crate', [8, 8], 'stored')).toEqual({ ok: false, reason: 'build.err.notOwned' });
    expect(hashState(h.state)).toBe(before);
    expect(h.state.lastBuild).toBeNull();
    expect(eventsOf(h, 'world.changed')).toHaveLength(1); // only the new game
  });

  it('refreshes the room\'s rated Cosy straight away', () => {
    const h = startHome();
    const before = h.state.lot.rooms[LIVING]?.cosyRated ?? 0;
    place(h, 'sofa', [3, 7]);
    place(h, 'lamp_floor', [8, 7]);
    expect(h.state.lot.rooms[LIVING]?.cosyRated).toBeGreaterThan(before);
    expect(h.state.lot.rooms[LIVING]?.cosyRated).toBe(h.world.cosy(h.state, LIVING).score);
  });

  it('a free (stored) copy is not paid for, and a bought one pays exactly once', () => {
    const h = startHome();
    const balance = h.state.hearts.balance;
    place(h, 'doormat', [4, 11]);
    expect(h.state.hearts.balance).toBe(balance - 10); // 5 x 1.6 = 8 -> 10
  });
});

describe('build.move', () => {
  it('moves the same entity and mirrors the new pose', () => {
    const h = startHome(START);
    const sofa = asEntityId(3);
    const rev = h.state.lot.revision;
    expect(act(h, { type: 'build.move', entity: sofa, request: { item: asItemId('sofa'), tile: at(8, 7), rotation: 2, mount: { kind: 'floor' } } })).toEqual({ ok: true });
    expect(getC(h.state, 'placeable', sofa)).toMatchObject({ tile: at(8, 7), rotation: 2 });
    expect(getC(h.state, 'position', sofa)).toMatchObject({ pos: { x: 8, y: 7 }, facing: 'up', room: 'living' });
    expect(getC(h.state, 'sprite', sofa)?.base).toBe('item.sofa.r2');
    expect(h.state.lot.revision).toBe(rev + 1);
    expect(eventsOf(h, 'world.changed').at(-1)?.change).toMatchObject({ reason: 'move', entities: [3] });
    expect(h.state.lastBuild?.moved).toEqual([3]);
  });

  it('may land on its own old tiles', () => {
    const h = startHome(START);
    expect(act(h, { type: 'build.move', entity: asEntityId(3), request: { item: asItemId('sofa'), tile: at(7, 9), rotation: 0, mount: { kind: 'floor' } } })).toEqual({ ok: true });
  });

  it('carries surface children with their host', () => {
    const h = startHome(START);
    act(h, { type: 'build.move', entity: asEntityId(1), request: { item: asItemId('table'), tile: at(8, 7), rotation: 0, mount: { kind: 'floor' } } });
    const lamp = getC(h.state, 'placeable', asEntityId(2));
    expect(lamp?.tile).toEqual(at(9, 7));
    expect(lamp?.mount).toEqual({ kind: 'surface', parent: 1, slot: 1 });
    expect(getC(h.state, 'position', asEntityId(2))?.pos).toEqual({ x: 9, y: 7 });
    // and turn with it
    act(h, { type: 'build.move', entity: asEntityId(1), request: { item: asItemId('table'), tile: at(8, 7), rotation: 1, mount: { kind: 'floor' } } });
    expect(getC(h.state, 'placeable', asEntityId(2))?.tile).toEqual(at(8, 8));
  });

  it('moves a surface item to another host', () => {
    const h = startHome(START);
    const other = buy(h, 'table', [8, 8]);
    expect(act(h, { type: 'build.move', entity: asEntityId(2), request: { item: asItemId('lamp_table'), tile: at(0, 0), rotation: 0, mount: { kind: 'surface', parent: other, slot: 0 } } })).toEqual({ ok: true });
    expect(getC(h.state, 'placeable', asEntityId(2))?.tile).toEqual(at(8, 8));
  });

  it('lets fixtures move and turn', () => {
    const h = startHome(START);
    expect(act(h, { type: 'build.move', entity: asEntityId(4), request: { item: asItemId('mailbox'), tile: at(5, 11), rotation: 0, mount: { kind: 'floor' } } })).toEqual({ ok: true });
    expect(getC(h.state, 'placeable', asEntityId(4))?.tile).toEqual(at(5, 11));
  });

  it('reports the refusal and leaves everything as it was', () => {
    const h = startHome(START);
    const before = hashState(h.state);
    expect(act(h, { type: 'build.move', entity: asEntityId(3), request: { item: asItemId('sofa'), tile: at(5, 7), rotation: 0, mount: { kind: 'floor' } } })).toEqual({ ok: false, reason: 'build.err.blocked' });
    expect(act(h, { type: 'build.move', entity: asEntityId(99), request: { item: asItemId('sofa'), tile: at(8, 7), rotation: 0, mount: { kind: 'floor' } } })).toEqual({ ok: false, reason: 'ui.reason.unknown' });
    expect(hashState(h.state)).toBe(before);
  });

  it('lists a moved item once, and an item added this session only as added', () => {
    const h = startHome(START);
    const mv = (e: EntityId, x: number) => act(h, { type: 'build.move', entity: e, request: { item: asItemId('sofa'), tile: at(x, 8), rotation: 0, mount: { kind: 'floor' } } });
    mv(asEntityId(3), 6);
    mv(asEntityId(3), 8);
    expect(h.state.lastBuild?.moved).toEqual([3]);
    const fresh = buy(h, 'sofa', [5, 6]);
    mv(fresh, 4);
    expect(h.state.lastBuild?.moved).toEqual([3]);
    expect(h.state.lastBuild?.added).toEqual([fresh]);
  });
});

describe('build.sell and build.store', () => {
  it('sells a bought copy for the full price', () => {
    const h = startHome(START);
    const balance = h.state.hearts.balance;
    expect(act(h, { type: 'build.sell', entity: asEntityId(3) })).toEqual({ ok: true });
    expect(h.state.hearts.balance).toBe(balance + 95);
    expect(getC(h.state, 'placeable', asEntityId(3))).toBeUndefined();
    expect(getC(h.state, 'position', asEntityId(3))).toBeUndefined();
    expect(eventsOf(h, 'hearts').at(-1)).toMatchObject({ delta: 95, reason: 'sell' });
    expect(eventsOf(h, 'progress').at(-1)?.event).toMatchObject({ kind: 'itemSold', subject: 'sofa' });
    expect(h.state.lastBuild?.removed).toEqual(['sofa']);
    expect(eventsOf(h, 'world.changed').at(-1)?.change).toMatchObject({ reason: 'sell', rooms: ['living'], entities: [3] });
  });

  it('buying then selling returns every Heart, and an undone purchase leaves no trace in the session', () => {
    const h = startHome();
    const balance = h.state.hearts.balance;
    const e = buy(h, 'bed', [1, 1]);
    act(h, { type: 'build.sell', entity: e });
    expect(h.state.hearts.balance).toBe(balance);
    expect(h.state.hearts.spent).toBe(0);
    expect(h.state.lastBuild?.added).toEqual([]);
    expect(h.state.lastBuild?.removed).toEqual([]);
  });

  it('puts a free copy away instead of selling it', () => {
    const h = startHome();
    h.state.inventory.storedFree[asItemId('crate')] = 1;
    place(h, 'crate', [5, 7], 'stored');
    const e = asEntityId(h.state.nextEntityId - 1);
    const balance = h.state.hearts.balance;
    expect(act(h, { type: 'build.sell', entity: e })).toEqual({ ok: true });
    expect(h.state.hearts.balance).toBe(balance);
    expect(h.state.inventory.storedFree[asItemId('crate')]).toBe(1);
    expect(h.state.inventory.stored[asItemId('crate')]).toBeUndefined();
    expect(eventsOf(h, 'world.changed').at(-1)?.change.reason).toBe('store');
  });

  it('stores a bought copy, which can be placed again from storage as a bought copy', () => {
    const h = startHome(START);
    expect(act(h, { type: 'build.store', entity: asEntityId(3) })).toEqual({ ok: true });
    expect(h.state.inventory.stored[asItemId('sofa')]).toBe(1);
    const balance = h.state.hearts.balance;
    expect(place(h, 'sofa', [6, 9], 'stored')).toEqual({ ok: true });
    expect(h.state.hearts.balance).toBe(balance);
    expect(getC(h.state, 'placeable', asEntityId(h.state.nextEntityId - 1))?.origin).toBe('bought');
  });

  it('never sells or stores a fixture', () => {
    const h = startHome(START);
    const before = hashState(h.state);
    expect(act(h, { type: 'build.sell', entity: asEntityId(4) })).toEqual({ ok: false, reason: 'build.err.fixed' });
    expect(act(h, { type: 'build.store', entity: asEntityId(4) })).toEqual({ ok: false, reason: 'build.err.fixed' });
    expect(hashState(h.state)).toBe(before);
  });

  it('sends a sold host\'s surface items to storage, keeping their origin', () => {
    const h = startHome(START);
    getC(h.state, 'placeable', asEntityId(2))!.origin = 'free';
    const balance = h.state.hearts.balance;
    expect(act(h, { type: 'build.sell', entity: asEntityId(1) })).toEqual({ ok: true });
    expect(getC(h.state, 'placeable', asEntityId(1))).toBeUndefined();
    expect(getC(h.state, 'placeable', asEntityId(2))).toBeUndefined();
    expect(h.state.inventory.storedFree[asItemId('lamp_table')]).toBe(1);
    expect(h.state.hearts.balance).toBe(balance + 80); // 50 x 1.6 = 80: the table only
    expect(eventsOf(h, 'world.changed').at(-1)?.change.entities).toEqual([1, 2]);
    expect(h.state.lastBuild?.removed).toEqual(['lamp_table', 'table']);
    // No dangling parent anywhere.
    for (const p of Object.values(h.state.components.placeable)) if (p.mount.kind === 'surface') expect(getC(h.state, 'placeable', p.mount.parent)).toBeDefined();
  });

  it('answers a missing entity with a reason key', () => {
    const h = startHome();
    expect(act(h, { type: 'build.sell', entity: asEntityId(404) })).toEqual({ ok: false, reason: 'ui.reason.unknown' });
  });

  it('lets a sold sofa free its tiles for the nav grid', () => {
    const h = startHome(START);
    expect(h.world.navGrid(h.state).cost[0][9 * 20 + 6]).toBe(0);
    act(h, { type: 'build.sell', entity: asEntityId(3) });
    expect(h.world.navGrid(h.state).cost[0][9 * 20 + 6]).toBe(1);
  });
});

describe('build.paint', () => {
  const paint = (h: Home, room: string, surface: 'wall' | 'floor', id: string) => act(h, { type: 'build.paint', room: asRoomId(room), surface, paint: asPaintId(id) });

  it('repaints a room\'s walls or floor for free', () => {
    const h = startHome();
    const balance = h.state.hearts.balance;
    expect(paint(h, 'living', 'wall', 'wall.plain.plum')).toEqual({ ok: true });
    expect(paint(h, 'living', 'floor', 'floor.wood.walnut')).toEqual({ ok: true });
    expect(h.state.lot.rooms[LIVING]).toMatchObject({ wallPaint: 'wall.plain.plum', floorPaint: 'floor.wood.walnut' });
    expect(h.state.hearts.balance).toBe(balance);
    expect(h.state.lastBuild?.painted).toEqual(['living']);
    expect(eventsOf(h, 'world.changed').at(-1)?.change).toMatchObject({ reason: 'paint', rooms: ['living'], entities: [] });
    expect(eventsOf(h, 'progress').at(-1)?.event).toMatchObject({ kind: 'paint', subject: 'floor.wood.walnut' });
  });

  it('bumps the revision and lifts the room\'s Cosy when the new paint is not the default', () => {
    const h = startHome();
    const rev = h.state.lot.revision;
    const before = h.state.lot.rooms[BED]?.cosyRated ?? 0;
    paint(h, 'bedroom', 'wall', 'wall.plain.plum');
    expect(h.state.lot.revision).toBe(rev + 1);
    expect(h.state.lot.rooms[BED]?.cosyRated).toBeGreaterThan(before);
    paint(h, 'bedroom', 'wall', 'wall.plain.lavender'); // back to the default: the bonus goes
    expect(h.state.lot.rooms[BED]?.cosyRated).toBe(before);
  });

  it('does nothing, quietly, for the paint a room already has', () => {
    const h = startHome();
    const rev = h.state.lot.revision;
    const n = h.events.length;
    expect(paint(h, 'living', 'wall', 'wall.plain.dusk')).toEqual({ ok: true });
    expect(h.state.lot.revision).toBe(rev);
    expect(h.events.length).toBe(n);
    expect(h.state.lastBuild).toBeNull();
  });

  it('keeps locked paints locked until they unlock', () => {
    const h = startHome();
    expect(paint(h, 'living', 'wall', 'wall.paper.roses')).toEqual({ ok: false, reason: 'ui.reason.locked' });
    h.state.unlocks.paints[asPaintId('wall.paper.roses')] = true;
    expect(paint(h, 'living', 'wall', 'wall.paper.roses')).toEqual({ ok: true });
  });

  it('refuses a wall paint on a floor and unknown rooms or paints', () => {
    const h = startHome();
    expect(paint(h, 'living', 'floor', 'wall.plain.plum')).toEqual({ ok: false, reason: 'ui.reason.unknown' });
    expect(paint(h, 'nowhere', 'wall', 'wall.plain.plum')).toEqual({ ok: false, reason: 'ui.reason.unknown' });
    expect(paint(h, 'living', 'wall', 'wall.plain.nope')).toEqual({ ok: false, reason: 'ui.reason.unknown' });
  });

  it('paints the garden and the front step only with patio floors', () => {
    const h = startHome();
    expect(paint(h, 'garden', 'wall', 'wall.plain.plum')).toEqual({ ok: false, reason: 'ui.reason.unknown' });
    expect(paint(h, 'garden', 'floor', 'floor.wood.walnut')).toEqual({ ok: false, reason: 'ui.reason.unknown' });
    expect(paint(h, 'garden', 'floor', 'floor.patio.brick')).toEqual({ ok: false, reason: 'ui.reason.locked' });
    h.state.unlocks.paints[asPaintId('floor.patio.brick')] = true;
    expect(paint(h, 'garden', 'floor', 'floor.patio.brick')).toEqual({ ok: true });
    expect(paint(h, 'front', 'floor', 'floor.patio.brick')).toEqual({ ok: true });
  });
});

describe('Cosy upkeep', () => {
  it('refreshes cosyLive every 20 ticks in the triggers phase', () => {
    const h = startHome();
    const lamp = drop(h, 'lamp_floor', [3, 7]);
    h.state.time.minuteOfDay = 0;
    const system = h.plugin.systems?.triggers?.[0];
    expect(system).toBeDefined();
    h.state.time.tick = 20;
    system?.(h.ctx);
    const dark = h.state.lot.rooms[LIVING]?.cosyLive ?? -1;
    h.state.components.smartObject[String(lamp)]!.flags['on'] = true;
    h.state.time.tick = 21;
    system?.(h.ctx);
    expect(h.state.lot.rooms[LIVING]?.cosyLive).toBe(dark); // not a refresh tick
    h.state.time.tick = 40;
    system?.(h.ctx);
    expect(h.state.lot.rooms[LIVING]?.cosyLive).toBeGreaterThan(dark);
    expect(h.state.lot.rooms[LIVING]?.cosyLive).toBe(h.world.cosy(h.state, LIVING, 'live').score);
  });

  it('keeps rated and live apart: rated ignores lamp switches', () => {
    const h = startHome();
    const lamp = drop(h, 'lamp_floor', [3, 7]);
    h.state.time.minuteOfDay = 0;
    const rated = h.world.cosy(h.state, LIVING).score;
    h.state.components.smartObject[String(lamp)]!.flags['on'] = true;
    expect(h.world.cosy(h.state, LIVING).score).toBe(rated);
  });
});

describe('the Build session record', () => {
  it('starts a new record once time has passed, and keeps adding to it while the sim stands still', () => {
    const h = startHome();
    const a = buy(h, 'crate', [5, 7]);
    const b = buy(h, 'crate', [6, 7]);
    expect(h.state.lastBuild).toEqual({ closedTick: 0, added: [a, b], moved: [], removed: [], painted: [] });
    h.state.time.tick = 50;
    const c = buy(h, 'crate', [7, 7]);
    expect(h.state.lastBuild).toEqual({ closedTick: 50, added: [c], moved: [], removed: [], painted: [] });
  });

  it('records paint, moves and removals together', () => {
    const h = startHome(START);
    h.state.time.tick = 10;
    act(h, { type: 'build.paint', room: BED, surface: 'wall', paint: asPaintId('wall.plain.plum') });
    act(h, { type: 'build.move', entity: asEntityId(3), request: { item: asItemId('sofa'), tile: at(8, 7), rotation: 0, mount: { kind: 'floor' } } });
    act(h, { type: 'build.store', entity: asEntityId(1) });
    expect(h.state.lastBuild).toEqual({ closedTick: 10, added: [], moved: [3], removed: ['lamp_table', 'table'], painted: ['bedroom'] });
  });
});

describe('determinism and shape', () => {
  const script = (h: Home): void => {
    place(h, 'sofa', [3, 7]);
    place(h, 'lamp_floor', [8, 7]);
    place(h, 'plant_pot', [15, 3]);
    act(h, { type: 'build.paint', room: LIVING, surface: 'wall', paint: asPaintId('wall.plain.plum') });
    act(h, { type: 'build.move', entity: asEntityId(1), request: { item: asItemId('table'), tile: at(8, 8), rotation: 1, mount: { kind: 'floor' } } });
    act(h, { type: 'build.sell', entity: asEntityId(3) });
    h.state.time.tick = 20;
    h.plugin.systems?.triggers?.[0]?.(h.ctx);
  };

  it('gives the same state hash for the same inputs', () => {
    const a = startHome(START, 3);
    const b = startHome(START, 3);
    script(a);
    script(b);
    expect(hashState(a.state)).toBe(hashState(b.state));
    expect(a.events).toEqual(b.events);
  });

  it('keeps the state plain JSON', () => {
    const h = startHome(START);
    script(h);
    expect(findNonJson(h.state)).toEqual([]);
    expect(JSON.parse(JSON.stringify(h.state))).toEqual(h.state);
  });

  it('has no entity pointing at one that is gone', () => {
    const h = startHome(START);
    script(h);
    for (const [k, p] of Object.entries(h.state.components.placeable)) {
      expect(getC(h.state, 'position', asEntityId(Number(k)))).toBeDefined();
      if (p.mount.kind === 'surface') expect(getC(h.state, 'placeable', p.mount.parent)).toBeDefined();
    }
  });

  it('handles only build.* and has the id "world"', () => {
    const h = startHome();
    expect(h.plugin.id).toBe('world');
    expect(Object.keys(h.plugin.actions ?? {}).sort()).toEqual(['build.move', 'build.paint', 'build.place', 'build.sell', 'build.store']);
    void GARDEN;
  });
});
