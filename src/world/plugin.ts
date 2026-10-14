/**
 * The world's SimPlugin: the `build.*` action handlers, the starting furniture, the Cosy refresh and the
 * `world.changed` event. It keeps no state of its own: everything it decides is written to SimState
 * (the Build session lives in `SimState.lastBuild`, whose `closedTick` is the tick of the last edit).
 */
import {
  getC,
  placementErrorKey,
  priceOf,
  reasonKey,
  type ActionOf,
  type DispatchResult,
  type EntityId,
  type ItemDef,
  type ItemId,
  type ItemOrigin,
  type LastBuild,
  type PaintDef,
  type PlacementRequest,
  type ProgressEvent,
  type RoomId,
  type SimPlugin,
  type SimState,
  type StringKey,
  type SystemContext,
  type WorldChangeReason,
} from '../core';
import { buildLot } from './lot';
import { bumpRevision, childrenOf, deleteItem, refreshCosy, spawnItem, spawnStart, syncPlacements } from './edit';
import { checkPlacement } from './placement';
import { placedItems, roomOfPlaced, type Placed, type WorldEnv } from './shared';

/** `cosyLive` is refreshed every this many ticks, in the `triggers` phase (contracts 9). */
export const COSY_LIVE_EVERY_TICKS = 20;

/** home.md 5: outdoor rooms take patio floor paints only, and no wall paints. */
export const OUTDOOR_FLOOR_PAINT_PREFIX = 'floor.patio.';

const ok = (): DispatchResult => ({ ok: true });
const no = (reason: StringKey): DispatchResult => ({ ok: false, reason });

/** The Build session record. A new one starts when ticks have passed since the last edit (Build mode does not step the sim). */
function session(state: SimState): LastBuild {
  const lb = state.lastBuild;
  if (lb && lb.closedTick === state.time.tick) return lb;
  const fresh: LastBuild = { closedTick: state.time.tick, added: [], moved: [], removed: [], painted: [] };
  state.lastBuild = fresh;
  return fresh;
}

function noteAdded(state: SimState, id: EntityId): void {
  session(state).added.push(id);
}

function noteMoved(state: SimState, id: EntityId): void {
  const s = session(state);
  if (!s.added.includes(id) && !s.moved.includes(id)) s.moved.push(id);
}

/** An item left the lot: a copy added this session just cancels out, anything older is listed as removed. */
function noteRemoved(state: SimState, id: EntityId, item: ItemId): void {
  const s = session(state);
  const at = s.added.indexOf(id);
  if (at >= 0) s.added.splice(at, 1);
  else s.removed.push(item);
  const mv = s.moved.indexOf(id);
  if (mv >= 0) s.moved.splice(mv, 1);
}

function notePainted(state: SimState, room: RoomId): void {
  const s = session(state);
  if (!s.painted.includes(room)) s.painted.push(room);
}

export function createWorldPlugin(env: WorldEnv): SimPlugin {
  const { content } = env;

  const changed = (ctx: SystemContext, reason: WorldChangeReason, rooms: readonly (RoomId | null)[], entities: readonly EntityId[]): void => {
    const revision = bumpRevision(ctx.state);
    syncPlacements(env, ctx.state);
    refreshCosy(env, ctx.state, ['rated']);
    const unique: RoomId[] = [];
    for (const r of rooms) if (r !== null && !unique.includes(r)) unique.push(r);
    ctx.emit({ type: 'world.changed', change: { reason, revision, rooms: unique, entities: [...entities] } });
  };

  const progress = (ctx: SystemContext, kind: ProgressEvent['kind'], subject: string): void => {
    ctx.emit({ type: 'progress', event: { kind, subject, n: 1 } });
  };

  const roomOf = (state: SimState, id: EntityId): RoomId | null => {
    const all = placedItems(state, content);
    const byId = new Map<EntityId, Placed>(all.map((p) => [p.id, p]));
    const p = byId.get(id);
    return p ? roomOfPlaced(env, state, p, byId) : null;
  };

  const store = (state: SimState, item: ItemId, origin: ItemOrigin): void => {
    const table = origin === 'free' ? state.inventory.storedFree : state.inventory.stored;
    table[item] = (table[item] ?? 0) + 1;
  };

  /** Removes a host and sends its surface children to storage (F12). Returns the rooms it left. */
  const take = (ctx: SystemContext, id: EntityId): { rooms: (RoomId | null)[]; entities: EntityId[] } => {
    const state = ctx.state;
    const rooms: (RoomId | null)[] = [roomOf(state, id)];
    const entities: EntityId[] = [id];
    for (const child of childrenOf(state, env, id)) {
      store(state, child.def.id, child.pl.origin);
      noteRemoved(state, child.id, child.def.id);
      entities.push(child.id);
      deleteItem(state, child.id);
    }
    const pl = getC(state, 'placeable', id);
    if (pl) noteRemoved(state, id, pl.item);
    deleteItem(state, id);
    return { rooms, entities };
  };

  const place = (ctx: SystemContext, action: ActionOf<'build.place'>): DispatchResult => {
    const state = ctx.state;
    const { moving, ...rest } = action.request;
    void moving;
    const req: PlacementRequest = { ...rest, source: action.source };
    const chk = checkPlacement(env, state, req);
    if (!chk.ok) return no(placementErrorKey(chk.reason));
    const def = content.items.get(req.item) as ItemDef;
    let origin: ItemOrigin = 'bought';
    if (action.source === 'stored') {
      if ((state.inventory.storedFree[def.id] ?? 0) > 0) {
        origin = 'free';
        state.inventory.storedFree[def.id] = (state.inventory.storedFree[def.id] ?? 0) - 1;
        if ((state.inventory.storedFree[def.id] ?? 0) <= 0) delete state.inventory.storedFree[def.id];
      } else {
        state.inventory.stored[def.id] = (state.inventory.stored[def.id] ?? 0) - 1;
        if ((state.inventory.stored[def.id] ?? 0) <= 0) delete state.inventory.stored[def.id];
      }
    } else {
      const price = priceOf(def.price, content.db.economy);
      if (price > 0) {
        state.hearts.balance -= price;
        state.hearts.spent += price;
        ctx.emit({ type: 'hearts', delta: -price, balance: state.hearts.balance, reason: 'buy' });
      }
      progress(ctx, 'itemBought', def.id);
    }
    const tile = req.mount.kind === 'surface' ? (chk.tiles[0] ?? req.tile) : req.tile;
    const id = spawnItem(state, def, { tile, rotation: req.rotation, mount: req.mount }, origin);
    noteAdded(state, id);
    progress(ctx, 'itemPlaced', def.id);
    changed(ctx, 'place', [roomOf(state, id)], [id]);
    return ok();
  };

  const move = (ctx: SystemContext, action: ActionOf<'build.move'>): DispatchResult => {
    const state = ctx.state;
    const pl = getC(state, 'placeable', action.entity);
    if (!pl) return no(reasonKey('unknown'));
    const req: PlacementRequest = { item: pl.item, tile: action.request.tile, rotation: action.request.rotation, mount: action.request.mount, moving: action.entity };
    const chk = checkPlacement(env, state, req);
    if (!chk.ok) return no(placementErrorKey(chk.reason));
    const before = roomOf(state, action.entity);
    pl.tile = req.mount.kind === 'surface' ? (chk.tiles[0] ?? req.tile) : { tx: req.tile.tx, ty: req.tile.ty };
    pl.rotation = req.rotation;
    pl.mount = req.mount.kind === 'surface' ? { kind: 'surface', parent: req.mount.parent, slot: req.mount.slot } : { kind: req.mount.kind };
    noteMoved(state, action.entity);
    // syncPlacements (inside changed) re-seats surface children on the host's new pose.
    changed(ctx, 'move', [before, roomOf(state, action.entity)], [action.entity]);
    return ok();
  };

  const remove = (ctx: SystemContext, entity: EntityId, mode: 'sell' | 'store'): DispatchResult => {
    const state = ctx.state;
    const pl = getC(state, 'placeable', entity);
    const def = pl ? content.items.get(pl.item) : undefined;
    if (!pl || !def) return no(reasonKey('unknown'));
    if (def.fixture) return no(placementErrorKey('fixed'));
    // A free copy is never sold: selling one just puts it away (FROZEN 12).
    const sells = mode === 'sell' && pl.origin === 'bought';
    const origin = pl.origin;
    const { rooms, entities } = take(ctx, entity);
    if (sells) {
      const refund = priceOf(def.price, content.db.economy);
      if (refund > 0) {
        state.hearts.balance += refund;
        state.hearts.spent = Math.max(0, state.hearts.spent - refund);
        ctx.emit({ type: 'hearts', delta: refund, balance: state.hearts.balance, reason: 'sell' });
      }
      progress(ctx, 'itemSold', def.id);
    } else {
      store(state, def.id, origin);
    }
    changed(ctx, sells ? 'sell' : 'store', rooms, entities);
    return ok();
  };

  const paint = (ctx: SystemContext, action: ActionOf<'build.paint'>): DispatchResult => {
    const state = ctx.state;
    const rs = state.lot.rooms[action.room];
    const def: PaintDef | undefined = content.paints.get(action.paint);
    if (!rs || !def || def.surface !== action.surface) return no(reasonKey('unknown'));
    if (rs.outdoor) {
      if (action.surface === 'wall') return no(reasonKey('unknown'));
      if (!def.id.startsWith(OUTDOOR_FLOOR_PAINT_PREFIX)) return no(reasonKey('unknown'));
    }
    if (def.unlock !== 'start' && state.unlocks.paints[def.id] !== true) return no(reasonKey('locked'));
    const current = action.surface === 'wall' ? rs.wallPaint : rs.floorPaint;
    if (current === def.id) return ok();
    if (action.surface === 'wall') rs.wallPaint = def.id;
    else rs.floorPaint = def.id;
    notePainted(state, action.room);
    progress(ctx, 'paint', def.id);
    changed(ctx, 'paint', [action.room], []);
    return ok();
  };

  return {
    id: 'world',
    actions: {
      'build.place': place,
      'build.move': move,
      'build.sell': (ctx, a) => remove(ctx, a.entity, 'sell'),
      'build.store': (ctx, a) => remove(ctx, a.entity, 'store'),
      'build.paint': paint,
    },
    systems: {
      triggers: [
        (ctx) => {
          if (ctx.state.time.tick % COSY_LIVE_EVERY_TICKS === 0) refreshCosy(env, ctx.state, ['live']);
        },
      ],
    },
    init(ctx, reason) {
      const state = ctx.state;
      if (reason === 'newGame') {
        state.lot = buildLot(content);
        spawnStart(env, state, content.db.lot.start);
        bumpRevision(state);
      }
      syncPlacements(env, state);
      refreshCosy(env, state, ['rated', 'live']);
      ctx.emit({
        type: 'world.changed',
        change: { reason: reason === 'newGame' ? 'newGame' : 'load', revision: state.lot.revision, rooms: Object.keys(state.lot.rooms) as RoomId[], entities: [] },
      });
    },
  };
}
