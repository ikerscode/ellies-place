/**
 * createWorld: the World the app injects as WorldQueries into the sim, the cats and the engine, and the
 * source of the world plugin. Queries are pure over the state they get and cache on the lot object plus
 * `lot.revision` (sunbeams also on the 5-minute step of the clock).
 */
import {
  getC,
  rotateFacing,
  rotateOffset,
  tileCenter,
  footprintTiles as coreFootprint,
  inBounds,
  type ContentIndex,
  type CosyReading,
  type CosyReport,
  type CreateWorld,
  type DeepReadonly,
  type EntityId,
  type ItemId,
  type Layer,
  type NavGrid,
  type PlacementCheck,
  type PlacementRequest,
  type RoomId,
  type Rotation,
  type SimPlugin,
  type SimState,
  type SunbeamPatch,
  type TilePos,
  type World,
} from '../core';
import { computeCosy } from './cosy';
import { buildLot } from './lot';
import { buildNavGrid } from './nav';
import { createWorldPlugin } from './plugin';
import { checkPlacement } from './placement';
import { makeEnv } from './shared';
import { computeSunbeams } from './sun';

type St = DeepReadonly<SimState>;

interface Cache {
  nav: NavGrid | null;
  sun: { readonly key: string; readonly value: readonly SunbeamPatch[] } | null;
}

export const createWorld: CreateWorld = (content: ContentIndex): World => {
  const env = makeEnv(content);
  // Keyed by the LotState object: a loaded or new state brings a new object, so a stale grid is never served.
  const caches = new WeakMap<object, Cache>();
  const cacheOf = (state: St): Cache => {
    let c = caches.get(state.lot);
    if (!c) {
      c = { nav: null, sun: null };
      caches.set(state.lot, c);
    }
    return c;
  };

  const world: World = {
    createLot: () => buildLot(content),

    roomAt(state: St, tile: TilePos): RoomId | null {
      if (!inBounds(tile, state.lot.w, state.lot.h)) return null;
      return (state.lot.roomAt[tile.ty * state.lot.w + tile.tx] as RoomId | null | undefined) ?? null;
    },

    navGrid(state: St): NavGrid {
      const c = cacheOf(state);
      if (c.nav && c.nav.revision === state.lot.revision && c.nav.w === state.lot.w && c.nav.h === state.lot.h) return c.nav;
      c.nav = buildNavGrid(content, state);
      return c.nav;
    },

    slotPose(state: St, entity: EntityId, slot: number) {
      const pl = getC(state, 'placeable', entity);
      const def = pl ? content.items.get(pl.item) : undefined;
      const sd = def?.slots[slot];
      if (!pl || !def || !sd) return null;
      const o = rotateOffset(sd.dx, sd.dy, def.footprint, pl.rotation);
      return {
        pos: tileCenter({ tx: pl.tile.tx + o.dx, ty: pl.tile.ty + o.dy }),
        facing: rotateFacing(sd.facing, pl.rotation),
        layer: sd.layer as Layer,
      };
    },

    footprintTiles(item: ItemId, tile: TilePos, rotation: Rotation): readonly TilePos[] {
      const def = content.items.get(item);
      return def ? coreFootprint(tile, def.footprint, rotation) : [];
    },

    sunbeams(state: St): readonly SunbeamPatch[] {
      const c = cacheOf(state);
      const step = content.db.tuning.sun.recomputeMinutes;
      const key = `${state.lot.revision}|${state.time.day}|${Math.floor(state.time.minuteOfDay / step)}|${state.environment.weather}`;
      if (c.sun && c.sun.key === key) return c.sun.value;
      const value = computeSunbeams(env, state);
      c.sun = { key, value };
      return value;
    },

    check(state: St, req: PlacementRequest): PlacementCheck {
      return checkPlacement(env, state, req);
    },

    cosy(state: St, room: RoomId, reading: CosyReading = 'rated'): CosyReport {
      return computeCosy(env, state, room, reading);
    },

    plugin(): SimPlugin {
      return createWorldPlugin(env);
    },
  };
  return world;
};
