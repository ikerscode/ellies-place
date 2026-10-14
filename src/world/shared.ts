/**
 * Shared helpers for the world model: the per-content environment, placed-item views
 * and tile arithmetic. Pure; nothing here holds state beyond derived lookups.
 */
import {
  entitiesWith,
  type LotDef,
  footprintTiles as coreFootprint,
  getC,
  inBounds,
  rotateOffset,
  type ContentIndex,
  type DeepReadonly,
  type EntityId,
  type Facing,
  type ItemDef,
  type ItemId,
  type PlaceableC,
  type RoomId,
  type SimState,
  type SurfaceSlotDef,
  type TileKind,
  type TilePos,
} from '../core';

/** Tiles that can belong to a room (flood fill runs over these). */
export const FLOORISH: ReadonlySet<TileKind> = new Set<TileKind>(['floor', 'grass', 'path']);
/** Tiles an actor can stand on. */
export const WALKABLE: ReadonlySet<TileKind> = new Set<TileKind>(['floor', 'door', 'grass', 'path', 'gate']);

type St = DeepReadonly<SimState>;

/** What a window facing means for the tile just inside it (facing is OUTWARD, FROZEN 27). */
export const INWARD: Readonly<Record<Facing, { readonly dx: number; readonly dy: number }>> = {
  up: { dx: 0, dy: 1 },
  down: { dx: 0, dy: -1 },
  left: { dx: 1, dy: 0 },
  right: { dx: -1, dy: 0 },
};

export interface WorldEnv {
  readonly content: ContentIndex;
  /** Windows that can cast a beam, grouped into spans. Static per content. */
  readonly spans: readonly WindowSpan[];
  /** Everything an item "offers": tags, styles, category, interaction tags and ids, slot kinds, `wall`, `lighting`. */
  readonly traits: ReadonlyMap<ItemId, ReadonlySet<string>>;
  /** Window tile index (ty * w + tx) to its outward facing. */
  readonly windowFacing: ReadonlyMap<number, Facing>;
}

export function makeEnv(content: ContentIndex): WorldEnv {
  const traits = new Map<ItemId, ReadonlySet<string>>();
  for (const def of content.items.values()) {
    const t = new Set<string>();
    for (const x of def.tags) t.add(x);
    for (const x of def.styles) t.add(x);
    t.add(def.category);
    if (def.placement === 'wall') t.add('wall');
    if (def.light) t.add('lighting');
    for (const s of def.slots) t.add(s.kind);
    for (const iid of def.interactions) {
      t.add(iid);
      const idef = content.interactions.get(iid);
      if (idef) for (const x of idef.tags) t.add(x);
    }
    traits.set(def.id, t);
  }
  const windowFacing = new Map<number, Facing>();
  const lot = content.db.lot;
  for (const w of lot.windows) windowFacing.set(w.tile.ty * lot.w + w.tile.tx, w.facing);
  return { content, traits, windowFacing, spans: windowSpans(content.db.lot) };
}

export interface Placed {
  readonly id: EntityId;
  readonly pl: DeepReadonly<PlaceableC>;
  readonly def: ItemDef;
}

/** Every placed item whose definition is known, in ascending entity id. */
export function placedItems(state: St, content: ContentIndex): Placed[] {
  const out: Placed[] = [];
  for (const id of entitiesWith(state, 'placeable')) {
    const pl = getC(state, 'placeable', id);
    if (!pl) continue;
    // Delivery boxes and mess are the sim's: they never count for Cosy, blocking or placement.
    const kind = getC(state, 'meta', id)?.kind;
    if (kind === 'box' || kind === 'mess' || kind === 'trinket') continue;
    const def = content.items.get(pl.item);
    if (def) out.push({ id, pl, def });
  }
  return out;
}

export const tileIdx = (state: St, t: TilePos): number => t.ty * state.lot.w + t.tx;

export function roomAtTile(state: St, tx: number, ty: number): RoomId | null {
  if (!inBounds({ tx, ty }, state.lot.w, state.lot.h)) return null;
  return (state.lot.roomAt[ty * state.lot.w + tx] as RoomId | null | undefined) ?? null;
}

export const tilesOf = (p: Placed): TilePos[] => coreFootprint(p.pl.tile, p.def.footprint, p.pl.rotation);

/** The tile a surface slot sits on, given its host. */
export function slotTile(host: Placed, slot: DeepReadonly<SurfaceSlotDef>): TilePos {
  const o = rotateOffset(slot.dx, slot.dy, host.def.footprint, host.pl.rotation);
  return { tx: host.pl.tile.tx + o.dx, ty: host.pl.tile.ty + o.dy };
}

/** The floor tile just inside a window tile, or null when it is not a window. */
export function windowInside(env: WorldEnv, state: St, t: TilePos): TilePos | null {
  const f = env.windowFacing.get(tileIdx(state, t));
  if (!f) return null;
  const d = INWARD[f];
  return { tx: t.tx + d.dx, ty: t.ty + d.dy };
}

/** The room a placed item belongs to (home.md 1: anchor tile, wall items by the south tile, surface items by host). */
export function roomOfPlaced(env: WorldEnv, state: St, p: Placed, byId: ReadonlyMap<EntityId, Placed>): RoomId | null {
  const m = p.pl.mount;
  switch (m.kind) {
    case 'wall':
      return roomAtTile(state, p.pl.tile.tx, p.pl.tile.ty + 1);
    case 'window': {
      const inside = windowInside(env, state, p.pl.tile);
      return inside ? roomAtTile(state, inside.tx, inside.ty) : null;
    }
    case 'surface': {
      const host = byId.get(m.parent);
      return host && host.pl.mount.kind !== 'surface' ? roomOfPlaced(env, state, host, byId) : roomAtTile(state, p.pl.tile.tx, p.pl.tile.ty);
    }
    default:
      return roomAtTile(state, p.pl.tile.tx, p.pl.tile.ty);
  }
}

/** True when the item blocks walking at its footprint (floor mount, `blocksPath` not false). */
export const blocksWalking = (def: ItemDef, mountKind: string): boolean => mountKind === 'floor' && def.blocksPath !== false;

export function isRug(def: ItemDef): boolean {
  return def.placement === 'rug';
}

/** Adjacent window tiles with the same facing are one window span. */
export interface WindowSpan {
  readonly facing: Facing;
  /** Window tiles, in order along the wall. */
  readonly tiles: readonly TilePos[];
}

/** Groups `lot.windows` into spans (vertical runs for side walls, horizontal for back walls). Deterministic. */
export function windowSpans(lot: LotDef): WindowSpan[] {
  const key = (t: TilePos): number => t.ty * lot.w + t.tx;
  const facingAt = new Map<number, Facing>();
  for (const w of lot.windows) facingAt.set(key(w.tile), w.facing);
  const used = new Set<number>();
  const out: WindowSpan[] = [];
  for (const w of [...lot.windows].sort((a, b) => key(a.tile) - key(b.tile))) {
    if (used.has(key(w.tile))) continue;
    const horizontal = w.facing === 'up' || w.facing === 'down';
    const tiles: TilePos[] = [w.tile];
    used.add(key(w.tile));
    for (;;) {
      const last = tiles[tiles.length - 1] as TilePos;
      const next = horizontal ? { tx: last.tx + 1, ty: last.ty } : { tx: last.tx, ty: last.ty + 1 };
      if (facingAt.get(key(next)) !== w.facing || used.has(key(next))) break;
      tiles.push(next);
      used.add(key(next));
    }
    out.push({ facing: w.facing, tiles });
  }
  return out;
}
