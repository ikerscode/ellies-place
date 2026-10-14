/**
 * Sunbeams (sim.md 11, FROZEN 27): parallelogram beams from left, back and right windows,
 * clipped to the room, recomputed every `recomputeMinutes` game minutes. Deterministic.
 */
import type { DeepReadonly, RoomId, SimState, SunBeamSpec, SunbeamPatch, TileKind, TilePos } from '../core';
import { INWARD, FLOORISH, roomAtTile, type WindowSpan, type WorldEnv } from './shared';

type St = DeepReadonly<SimState>;

export function depthAt(spec: SunBeamSpec, p: number): number {
  const d = spec.depth;
  return d.kind === 'linear' ? d.start + (d.end - d.start) * p : d.noon + (d.edge - d.noon) * (1 - Math.sin(Math.PI * p));
}

const SAMPLES = 4;

/** True when the point lies inside the beam parallelogram. */
function inside(span: WindowSpan, px: number, py: number, depth: number, shear: number): boolean {
  const a = span.tiles[0] as TilePos;
  const b = span.tiles[span.tiles.length - 1] as TilePos;
  if (span.facing === 'up') {
    const u = py - (a.ty + 1);
    if (u < 0 || u > depth) return false;
    const x = px - (shear * u) / depth;
    return x >= a.tx && x <= b.tx + 1;
  }
  const u = span.facing === 'left' ? px - (a.tx + 1) : a.tx - px;
  if (u < 0 || u > depth) return false;
  const y = py - (shear * u) / depth;
  return y >= a.ty && y <= b.ty + 1;
}

export function computeSunbeams(env: WorldEnv, state: St): SunbeamPatch[] {
  const sun = env.content.db.tuning.sun;
  if (state.environment.weather === 'rain') return [];
  const minute = Math.floor(state.time.minuteOfDay / sun.recomputeMinutes) * sun.recomputeMinutes;
  const { w, h } = state.lot;
  const out: SunbeamPatch[] = [];
  for (const span of env.spans) {
    if (span.facing === 'down') continue;
    const spec = sun.beams[span.facing];
    if (minute < spec.from || minute > spec.to) continue;
    const first = span.tiles[0] as TilePos;
    const d = INWARD[span.facing];
    const room = roomAtTile(state, first.tx + d.dx, first.ty + d.dy);
    if (!room) continue;
    const p = (minute - spec.from) / (spec.to - spec.from);
    const depth = depthAt(spec, p);
    if (depth <= 0) continue;
    const shear = spec.shear.start + (spec.shear.end - spec.shear.start) * p;
    const tiles: TilePos[] = [];
    const reach = Math.ceil(depth + Math.abs(shear)) + span.tiles.length + 1;
    const x0 = Math.max(0, first.tx - reach);
    const x1 = Math.min(w - 1, first.tx + reach);
    const y0 = Math.max(0, first.ty - reach);
    const y1 = Math.min(h - 1, first.ty + reach);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * w + tx;
        if (state.lot.roomAt[i] !== room || !FLOORISH.has(state.lot.tiles[i] as TileKind)) continue;
        let hit = 0;
        for (let sy = 0; sy < SAMPLES; sy++) {
          for (let sx = 0; sx < SAMPLES; sx++) {
            if (inside(span, tx + (sx + 0.5) / SAMPLES, ty + (sy + 0.5) / SAMPLES, depth, shear)) hit++;
          }
        }
        if (hit / (SAMPLES * SAMPLES) >= sun.minCoverage) tiles.push({ tx, ty });
      }
    }
    if (tiles.length === 0) continue;
    out.push({ room: room as RoomId, tiles, strength: sun.intensity.base + sun.intensity.amplitude * Math.sin(Math.PI * p) });
  }
  return out;
}

/** Rooms that get a window sunbeam at some time of day (a left, back or right window). */
export function sunRooms(env: WorldEnv, state: St): Set<RoomId> {
  const out = new Set<RoomId>();
  for (const span of env.spans) {
    if (span.facing === 'down') continue;
    const first = span.tiles[0] as TilePos;
    const d = INWARD[span.facing];
    const r = roomAtTile(state, first.tx + d.dx, first.ty + d.dy);
    if (r) out.add(r);
  }
  return out;
}
