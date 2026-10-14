/**
 * Placement validation (home.md 1.1, contracts 8): bounds, rotation, mount rules, blocking,
 * doors, ownership and path connectivity. `check` never changes state.
 */
import {
  footprintTiles as coreFootprint,
  inBounds,
  mountOf,
  priceOf,
  type DeepReadonly,
  type EntityId,
  type ItemDef,
  type PlacementCheck,
  type PlacementError,
  type PlacementRequest,
  type RoomId,
  type SimState,
  type TileKind,
  type TilePos,
} from '../core';
import { FLOORISH, WALKABLE, blocksWalking, isRug, placedItems, roomAtTile, slotTile, tilesOf, type Placed, type WorldEnv } from './shared';

type St = DeepReadonly<SimState>;

const fail = (reason: PlacementError, tiles: readonly TilePos[]): PlacementCheck => ({ ok: false, reason, tiles });

/** The room whose back wall a wall tile is (the south tile is room floor and not the front step). */
export function backWallRoom(state: St, tx: number, ty: number): RoomId | null {
  const kind = state.lot.tiles[ty * state.lot.w + tx];
  if (kind !== 'wall' && kind !== 'fence') return null;
  const room = roomAtTile(state, tx, ty + 1);
  if (!room) return null;
  const rs = state.lot.rooms[room];
  if (!rs || rs.kind === 'frontStep') return null;
  return room;
}

/** Walkable floor tiles beside a door tile: they must stay free (home.md 1.1). */
export function doorInsideTiles(state: St): Set<number> {
  const { w, h } = state.lot;
  const out = new Set<number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (state.lot.tiles[y * w + x] !== 'door') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds({ tx: nx, ty: ny }, w, h)) continue;
        if (FLOORISH.has(state.lot.tiles[ny * w + nx] as TileKind)) out.add(ny * w + nx);
      }
    }
  }
  return out;
}

/** Tile indexes blocked by walking-blocking floor items, skipping `exclude`. */
export function blockedTiles(state: St, placed: readonly Placed[], exclude?: EntityId): Set<number> {
  const out = new Set<number>();
  for (const p of placed) {
    if (p.id === exclude || !blocksWalking(p.def, p.pl.mount.kind)) continue;
    for (const t of tilesOf(p)) out.add(t.ty * state.lot.w + t.tx);
  }
  return out;
}

export interface Reach {
  readonly rooms: ReadonlySet<RoomId>;
  readonly startBlocked: boolean;
  readonly reached: ReadonlySet<number>;
}

/** Where Ellie starts: the spawn spot, else the first room's seed. */
export function startTile(env: WorldEnv): TilePos | null {
  const lot = env.content.db.lot;
  return lot.spots.ellieSpawn ?? lot.rooms[0]?.seed ?? null;
}

/** Four-neighbour flood from Ellie's start over walkable tiles that are not blocked. */
export function reachFrom(env: WorldEnv, state: St, blocked: ReadonlySet<number>): Reach {
  const { w, h } = state.lot;
  const reached = new Set<number>();
  const rooms = new Set<RoomId>();
  const st = startTile(env);
  if (!st || !inBounds(st, w, h)) return { rooms, startBlocked: true, reached };
  const s0 = st.ty * w + st.tx;
  const ok = (i: number): boolean => WALKABLE.has(state.lot.tiles[i] as TileKind) && !blocked.has(i);
  if (!ok(s0)) return { rooms, startBlocked: true, reached };
  const stack = [s0];
  reached.add(s0);
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const r = state.lot.roomAt[i];
    if (r) rooms.add(r as RoomId);
    const x = i % w;
    const y = (i - x) / w;
    const nb: number[] = [];
    if (x > 0) nb.push(i - 1);
    if (x < w - 1) nb.push(i + 1);
    if (y > 0) nb.push(i - w);
    if (y < h - 1) nb.push(i + w);
    for (const n of nb) {
      if (!reached.has(n) && ok(n)) {
        reached.add(n);
        stack.push(n);
      }
    }
  }
  return { rooms, startBlocked: false, reached };
}

interface Bed {
  readonly key: number;
  readonly tiles: readonly TilePos[];
}

function bedReached(state: St, bed: Bed, reach: Reach): boolean {
  const { w, h } = state.lot;
  for (const t of bed.tiles) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = t.tx + dx;
      const y = t.ty + dy;
      if (inBounds({ tx: x, ty: y }, w, h) && reach.reached.has(y * w + x)) return true;
    }
  }
  return false;
}

/**
 * True when putting `def` at `tiles` (and lifting `moving`) leaves Ellie unable to reach something she
 * could reach before: a room, her bed, or her own start tile. A world that is already split never
 * blocks unrelated placements.
 */
function breaksPath(env: WorldEnv, state: St, placed: readonly Placed[], def: ItemDef, tiles: readonly TilePos[], moving: EntityId | undefined): boolean {
  const before = reachFrom(env, state, blockedTiles(state, placed));
  const after = new Set(blockedTiles(state, placed, moving));
  for (const t of tiles) after.add(t.ty * state.lot.w + t.tx);
  const reachAfter = reachFrom(env, state, after);
  if (reachAfter.startBlocked && !before.startBlocked) return true;
  for (const r of before.rooms) if (!reachAfter.rooms.has(r)) return true;
  const beds: { b: Bed; wasReached: boolean | null }[] = [];
  for (const p of placed) {
    if (p.def.category !== 'beds' || p.pl.mount.kind !== 'floor' || p.id === moving) continue;
    const b: Bed = { key: p.id, tiles: tilesOf(p) };
    beds.push({ b, wasReached: bedReached(state, b, before) });
  }
  for (const { b, wasReached } of beds) if (wasReached && !bedReached(state, b, reachAfter)) return true;
  if (def.category === 'beds') {
    const nb: Bed = { key: -1, tiles };
    const mv = moving === undefined ? undefined : placed.find((p) => p.id === moving);
    const was = mv ? bedReached(state, { key: mv.id, tiles: tilesOf(mv) }, before) : false;
    const now = bedReached(state, nb, reachAfter);
    if (!now && (mv === undefined || was)) return true;
  }
  return false;
}

/** How many copies of an item exist anywhere: placed, stored or on order. */
function copiesOwned(state: St, placed: readonly Placed[], item: ItemDef): number {
  let n = placed.filter((p) => p.def.id === item.id).length;
  n += state.inventory.stored[item.id] ?? 0;
  n += state.inventory.storedFree[item.id] ?? 0;
  for (const o of state.inventory.orders) for (const i of o.items) if (i === item.id) n++;
  return n;
}

export function checkPlacement(env: WorldEnv, state: St, req: PlacementRequest): PlacementCheck {
  const { content } = env;
  const def = content.items.get(req.item);
  if (!def) return fail('notFloor', []);
  const { w, h } = state.lot;
  const placed = placedItems(state, content);
  const movingP = req.moving === undefined ? undefined : placed.find((p) => p.id === req.moving);
  if (req.moving !== undefined && !movingP) return fail('blocked', []);
  const others = placed.filter((p) => p.id !== req.moving);

  // Geometry of the footprint.
  let tiles: TilePos[];
  if (def.placement === 'surface') {
    tiles = [req.tile];
  } else {
    tiles = coreFootprint(req.tile, def.footprint, req.rotation);
  }
  if (!def.rotations.includes(req.rotation)) return fail('rotationNotAllowed', tiles);

  const expected = mountOf(def.placement);
  if (req.mount.kind !== expected) {
    const err: PlacementError =
      def.placement === 'wall' ? 'needsWall' : def.placement === 'window' ? 'needsWindow' : def.placement === 'surface' ? 'needsSurface' : 'notFloor';
    return fail(err, tiles);
  }

  if (req.mount.kind === 'surface') {
    const parent = req.mount.parent;
    const host = others.find((p) => p.id === parent);
    const slot = host?.def.surfaceSlots?.[req.mount.slot];
    if (!host || !slot || host.pl.mount.kind === 'surface') return fail('needsSurface', tiles);
    tiles = [slotTile(host, slot)];
    if (def.footprint.w > slot.maxW || def.footprint.h > slot.maxH) return fail('tooBig', tiles);
    const slotNo = req.mount.slot;
    if (others.some((p) => p.pl.mount.kind === 'surface' && p.pl.mount.parent === parent && p.pl.mount.slot === slotNo)) return fail('surfaceFull', tiles);
  } else {
    for (const t of tiles) if (!inBounds(t, w, h)) return fail('outOfBounds', tiles);
    const kindAt = (t: TilePos): TileKind => state.lot.tiles[t.ty * w + t.tx] as TileKind;
    const roomState = (t: TilePos) => {
      const r = roomAtTile(state, t.tx, t.ty);
      return r ? state.lot.rooms[r] : undefined;
    };
    switch (def.placement) {
      case 'floor':
        for (const t of tiles) {
          const rs = roomState(t);
          if (!FLOORISH.has(kindAt(t)) || !rs || rs.kind === 'frontStep') return fail('notFloor', tiles);
        }
        break;
      case 'in':
        for (const t of tiles) {
          const rs = roomState(t);
          if (!FLOORISH.has(kindAt(t)) || !rs) return fail('notFloor', tiles);
          if (rs.outdoor || rs.kind === 'frontStep') return fail('needsIndoor', tiles);
        }
        break;
      case 'out':
        for (const t of tiles) {
          const rs = roomState(t);
          if (!FLOORISH.has(kindAt(t)) || !rs) return fail('notFloor', tiles);
          if (!rs.outdoor || rs.kind !== 'garden') return fail('needsOutdoor', tiles);
        }
        break;
      case 'rug':
        for (const t of tiles) if (!FLOORISH.has(kindAt(t)) || !roomState(t)) return fail('notFloor', tiles);
        break;
      case 'front':
        for (const t of tiles) {
          const rs = roomState(t);
          if (!FLOORISH.has(kindAt(t)) || !rs || rs.kind !== 'frontStep') return fail('needsFrontStep', tiles);
        }
        break;
      case 'wall': {
        let room: RoomId | null = null;
        for (const t of tiles) {
          const r = backWallRoom(state, t.tx, t.ty);
          if (!r || (room !== null && r !== room)) return fail('needsWall', tiles);
          room = r;
        }
        break;
      }
      case 'window':
        for (const t of tiles) if (kindAt(t) !== 'window') return fail('needsWindow', tiles);
        break;
      case 'surface':
        return fail('needsSurface', tiles);
    }

    // Overlaps.
    const taken = (pred: (p: Placed) => boolean): boolean => {
      const set = new Set(tiles.map((t) => t.ty * w + t.tx));
      return others.some((p) => pred(p) && tilesOf(p).some((t) => set.has(t.ty * w + t.tx)));
    };
    if (isRug(def)) {
      if (taken((p) => isRug(p.def))) return fail('oneRugPerTile', tiles);
    } else if (req.mount.kind === 'floor') {
      if (taken((p) => p.pl.mount.kind === 'floor')) return fail('blocked', tiles);
    } else if (req.mount.kind === 'wall') {
      if (taken((p) => p.pl.mount.kind === 'wall')) return fail('blocked', tiles);
    } else if (req.mount.kind === 'window') {
      if (taken((p) => p.pl.mount.kind === 'window')) return fail('blocked', tiles);
    }

    if (blocksWalking(def, req.mount.kind)) {
      const doors = doorInsideTiles(state);
      if (tiles.some((t) => doors.has(t.ty * w + t.tx))) return fail('blocksDoor', tiles);
    }
  }

  // Ownership and money (only when the request says where the copy comes from).
  if (req.source === 'stored') {
    if ((state.inventory.stored[def.id] ?? 0) + (state.inventory.storedFree[def.id] ?? 0) <= 0) return fail('notOwned', tiles);
  } else if (req.source === 'buy') {
    if (def.fixture) return fail('notOwned', tiles);
    if (def.maxCopies !== undefined && copiesOwned(state, placed, def) >= def.maxCopies) return fail('maxCopies', tiles);
    if (state.hearts.balance < priceOf(def.price, content.db.economy)) return fail('cannotAfford', tiles);
  }

  if (blocksWalking(def, req.mount.kind) && breaksPath(env, state, placed, def, tiles, req.moving)) return fail('breaksPath', tiles);

  return { ok: true, tiles };
}
