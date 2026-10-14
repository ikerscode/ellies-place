/**
 * World: lot, rooms, placement rules, paint, cosy score, nav grid, sunbeams.
 * Owner: build-mode-dev. Contract: design/spec/contracts.md section 9 ("World").
 *
 * Wiring: `const world = createWorld(content)`; pass `world` as `CreateSimOptions.world` and
 * `world.plugin()` first in `plugins`. Nothing outside src/world and src/build imports the other files.
 */
export { createWorld } from './world';
export { explainCosy, explainHint, type CosyExplanation } from './hints';
export { homeCosy } from './edit';
export { COSY, itemValue } from './cosy';
export { COSY_LIVE_EVERY_TICKS, OUTDOOR_FLOOR_PAINT_PREFIX } from './plugin';
export { isUnlocked } from './placement';

export type { World, WorldQueries, PlacementRequest, PlacementCheck, CosyReport, NavGrid, SunbeamPatch } from '../core';
