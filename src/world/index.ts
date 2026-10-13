/**
 * World: lot, rooms, placement rules, paint, cosy score, nav grid, sunbeams.
 * Owner: build-mode-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "world".
 */
import { notImplemented, type CreateWorld } from '../core';

export type { World, PlacementRequest, PlacementCheck, CosyReport, NavGrid, SunbeamPatch } from '../core';

/** Pure queries over SimState plus a SimPlugin that handles build.* actions. */
export const createWorld: CreateWorld = () => notImplemented('createWorld');
