/** Per-layer movement costs and cat jumps (contracts 9). Derived from the lot and placed items. */
import type { ContentIndex, DeepReadonly, Layer, NavGrid, NavJump, SimState, TileKind } from '../core';
import { WALKABLE, blocksWalking, placedItems, tilesOf } from './shared';

export function buildNavGrid(content: ContentIndex, state: DeepReadonly<SimState>): NavGrid {
  const { w, h } = state.lot;
  const n = w * h;
  const c0 = new Array<number>(n).fill(0);
  const c1 = new Array<number>(n).fill(0);
  const c2 = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) c0[i] = WALKABLE.has(state.lot.tiles[i] as TileKind) ? 1 : 0;

  const top = new Array<number>(n).fill(0);
  for (const p of placedItems(state, content)) {
    if (p.pl.mount.kind !== 'floor') continue;
    const blocks = blocksWalking(p.def, 'floor');
    for (const t of tilesOf(p)) {
      if (t.tx < 0 || t.ty < 0 || t.tx >= w || t.ty >= h) continue;
      const i = t.ty * w + t.tx;
      if (blocks) c0[i] = 0;
      const tl = p.def.topLayer;
      if (tl === 1 && (top[i] as number) < 1) top[i] = 1;
      if (tl === 2) top[i] = 2;
    }
  }
  for (let i = 0; i < n; i++) {
    if (top[i] === 1) c1[i] = 1;
    else if (top[i] === 2) c2[i] = 1;
  }

  const jumps: NavJump[] = [];
  const at = (tx: number, ty: number) => ({ tx, ty });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const layer = top[i] as 0 | Layer;
      if (layer === 0) continue;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (c0[j] === 1) {
          jumps.push({ from: at(nx, ny), fromLayer: 0, to: at(x, y), toLayer: layer, cost: layer === 1 ? 2 : 3 });
          jumps.push({ from: at(x, y), fromLayer: layer, to: at(nx, ny), toLayer: 0, cost: 1 });
        }
        if (layer === 2 && top[j] === 1) {
          jumps.push({ from: at(nx, ny), fromLayer: 1, to: at(x, y), toLayer: 2, cost: 2 });
          jumps.push({ from: at(x, y), fromLayer: 2, to: at(nx, ny), toLayer: 1, cost: 1 });
        }
      }
    }
  }
  return { w, h, revision: state.lot.revision, cost: [c0, c1, c2], jumps };
}
