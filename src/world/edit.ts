/**
 * The writes of the world: spawning, moving and removing placed items, and keeping the derived
 * fields (position mirror, room cosy, revision) fresh. Only the world plugin and its tests call these.
 */
import {
  allocEntity,
  getC,
  itemSpriteKey,
  mountOf,
  removeEntity,
  rotateFacing,
  setC,
  type EntityId,
  type Facing,
  type ItemDef,
  type ItemId,
  type ItemOrigin,
  type JsonPrimitive,
  type MountRef,
  type RoomId,
  type Rotation,
  type SimState,
  type StartPlacement,
  type TilePos,
} from '../core';
import { buildScene, computeCosy } from './cosy';
import { placedItems, roomOfPlaced, slotTile, type Placed, type WorldEnv } from './shared';

/** The Cosy readings to refresh. */
export type Reading = 'rated' | 'live';

export function bumpRevision(state: SimState): number {
  state.lot.revision += 1;
  return state.lot.revision;
}

function lightStart(def: ItemDef, flags: Readonly<Record<string, JsonPrimitive>>): boolean {
  const flag = def.light?.flag;
  return flag === undefined ? true : flags[flag] === true;
}

function copyMount(m: MountRef): MountRef {
  return m.kind === 'surface' ? { kind: 'surface', parent: m.parent, slot: m.slot } : { kind: m.kind };
}

/** Creates the entity for a placed item with every component the rest of the game expects. */
export function spawnItem(
  state: SimState,
  def: ItemDef,
  at: { readonly tile: TilePos; readonly rotation: Rotation; readonly mount: MountRef },
  origin: ItemOrigin,
  flagOverrides?: Readonly<Record<string, JsonPrimitive>>,
): EntityId {
  const id = allocEntity(state);
  const flags: Record<string, JsonPrimitive> = { ...(def.flags ?? {}), ...(flagOverrides ?? {}) };
  setC(state, 'meta', id, { kind: 'item', name: null, bornTick: state.time.tick });
  setC(state, 'placeable', id, {
    item: def.id,
    tile: { tx: at.tile.tx, ty: at.tile.ty },
    rotation: at.rotation,
    mount: copyMount(at.mount),
    placedTick: state.time.tick,
    origin,
  });
  setC(state, 'smartObject', id, { reservations: {}, flags });
  if (def.light) setC(state, 'light', id, { on: lightStart(def, flags) });
  const ref = itemSpriteKey(def, at.rotation, flags);
  setC(state, 'sprite', id, { base: ref.key, anim: 'idle', animStartTick: state.time.tick, flipX: ref.flipX, hidden: false });
  const here = { x: at.tile.tx, y: at.tile.ty };
  setC(state, 'position', id, { pos: here, prev: { ...here }, layer: 0, facing: 'down', room: null });
  return id;
}

/** Deletes an item entity outright (the caller has dealt with refunds and storage). */
export function deleteItem(state: SimState, id: EntityId): void {
  removeEntity(state, id);
}

/** Surface children of a host, in entity order. */
export function childrenOf(state: SimState, env: WorldEnv, host: EntityId): Placed[] {
  return placedItems(state, env.content).filter((p) => p.pl.mount.kind === 'surface' && p.pl.mount.parent === host);
}

/**
 * Re-derives the tile of every surface item from its host (after a host moved or turned) and mirrors
 * `placeable` into `position` (pos, layer, facing, room) and `sprite`. The world is the only writer of both.
 */
export function syncPlacements(env: WorldEnv, state: SimState): void {
  const placed = placedItems(state, env.content);
  const byId = new Map<EntityId, Placed>(placed.map((p) => [p.id, p]));
  for (const p of placed) {
    const m = p.pl.mount;
    if (m.kind !== 'surface') continue;
    const host = byId.get(m.parent);
    const slot = host?.def.surfaceSlots?.[m.slot];
    if (!host || !slot) continue;
    const mut = getC(state, 'placeable', p.id);
    if (mut) mut.tile = slotTile(host, slot);
  }
  const fresh = placedItems(state, env.content);
  const byId2 = new Map<EntityId, Placed>(fresh.map((p) => [p.id, p]));
  for (const p of fresh) {
    const room: RoomId | null = roomOfPlaced(env, state, p, byId2);
    const facing: Facing = rotateFacing('down', p.pl.rotation);
    const layer = p.pl.mount.kind === 'surface' ? 1 : 0;
    const x = p.pl.tile.tx;
    const y = p.pl.tile.ty;
    const pos = getC(state, 'position', p.id);
    if (pos) {
      pos.pos = { x, y };
      pos.prev = { x, y };
      pos.layer = layer;
      pos.facing = facing;
      pos.room = room;
    } else {
      setC(state, 'position', p.id, { pos: { x, y }, prev: { x, y }, layer, facing, room });
    }
    const sprite = getC(state, 'sprite', p.id);
    if (sprite) {
      const ref = itemSpriteKey(p.def, p.pl.rotation, getC(state, 'smartObject', p.id)?.flags);
      sprite.base = ref.key;
      sprite.flipX = ref.flipX;
    }
  }
}

/** Recomputes `cosyRated` and/or `cosyLive` for every room and writes them into `lot.rooms`. */
export function refreshCosy(env: WorldEnv, state: SimState, readings: readonly Reading[]): void {
  const scene = buildScene(env, state);
  for (const id of Object.keys(state.lot.rooms)) {
    const rs = state.lot.rooms[id as RoomId];
    if (!rs) continue;
    if (!rs.scored) {
      rs.cosyRated = 0;
      rs.cosyLive = 0;
      continue;
    }
    if (readings.includes('rated')) rs.cosyRated = computeCosy(env, state, id as RoomId, 'rated', false, 0, scene).score;
    if (readings.includes('live')) rs.cosyLive = computeCosy(env, state, id as RoomId, 'live', false, 0, scene).score;
  }
}

/** Floor-area-weighted mean of `cosyRated` over the scored rooms (home.md 6.1). 0 with no scored rooms. */
export function homeCosy(state: { readonly lot: { readonly rooms: Readonly<Record<string, { readonly scored: boolean; readonly area: number; readonly cosyRated: number }>> } }): number {
  let sum = 0;
  let area = 0;
  for (const rs of Object.values(state.lot.rooms)) {
    if (!rs.scored) continue;
    sum += rs.cosyRated * rs.area;
    area += rs.area;
  }
  return area === 0 ? 0 : sum / area;
}

/** Spawns the authored starting furniture in `LotDef.start` order, resolving `onto` parents. Returns the new ids. */
export function spawnStart(env: WorldEnv, state: SimState, start: readonly StartPlacement[]): EntityId[] {
  const ids: (EntityId | null)[] = [];
  const out: EntityId[] = [];
  for (const sp of start) {
    const def = env.content.items.get(sp.item as ItemId);
    if (!def) {
      ids.push(null);
      continue;
    }
    let tile = sp.tile;
    let mount: MountRef;
    if (sp.onto) {
      const parent = ids[sp.onto.index] ?? null;
      const hostC = parent === null ? undefined : getC(state, 'placeable', parent);
      const hostDef = hostC ? env.content.items.get(hostC.item) : undefined;
      const slot = hostDef?.surfaceSlots?.[sp.onto.slot];
      if (parent === null || !hostC || !hostDef || !slot) {
        ids.push(null);
        continue;
      }
      mount = { kind: 'surface', parent, slot: sp.onto.slot };
      tile = slotTile({ id: parent, pl: hostC, def: hostDef }, slot);
    } else {
      const kind = mountOf(def.placement);
      mount = { kind: kind === 'surface' ? 'floor' : kind };
    }
    const id = spawnItem(state, def, { tile, rotation: sp.rotation, mount }, 'bought', sp.flags);
    ids.push(id);
    out.push(id);
  }
  syncPlacements(env, state);
  return out;
}
