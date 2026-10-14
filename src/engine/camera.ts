/**
 * Camera: the view of the lot on the 480 x 270 logical canvas, plus the conversions between client (CSS)
 * pixels, logical pixels, tile units and stage-relative CSS pixels.
 *
 * - "Logical" pixels are canvas pixels: tile x 16 minus the camera offset.
 * - "World" in the contract is tile units (PointerInfo.world).
 * - `worldToScreen` answers CSS pixels relative to the stage (the canvas's parent), as ui.md section 7 wants, and is
 *   an arrow property so it can be passed around detached (`worldToScreen: engine.camera.worldToScreen`).
 * - A lot smaller than the view is centred; a larger one pans within its bounds.
 */
import { CANVAS_H, CANVAS_W, TILE_PX, type Camera, type TilePos, type Vec2 } from '../core';
import type { ScaleResult } from './scaling';

export interface RectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface CameraImpl extends Camera {
  setView(view: ScaleResult): void;
  /** The lot's size in logical pixels; recentres or reclamps the offset. */
  setBounds(lotPxW: number, lotPxH: number): void;
  /** Moves the view by logical pixels, clamped. */
  panBy(dx: number, dy: number): void;
  /** Sets the offset directly, clamped. */
  panTo(x: number, y: number): void;
  /** True when the lot is larger than the view in either axis (panning is possible). */
  readonly canPan: boolean;
  clientToLogical(clientX: number, clientY: number): Vec2;
  /** Tile under a logical pixel, or null outside the lot. */
  tileAtLogical(lx: number, ly: number): TilePos | null;
  /** Logical pixel to stage-relative CSS pixels. */
  logicalToStage(lx: number, ly: number): { x: number; y: number };
}

export function createCamera(getRect: () => RectLike): CameraImpl {
  let view: ScaleResult = { scale: 1, cssW: CANVAS_W, cssH: CANVAS_H, left: 0, top: 0, backingW: CANVAS_W, backingH: CANVAS_H, integer: true };
  let lotW = CANVAS_W;
  let lotH = CANVAS_H;
  const offset: Vec2 = { x: 0, y: 0 };
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  const bounds = (): void => {
    if (lotW <= CANVAS_W) minX = maxX = -Math.floor((CANVAS_W - lotW) / 2);
    else {
      minX = 0;
      maxX = lotW - CANVAS_W;
    }
    if (lotH <= CANVAS_H) minY = maxY = -Math.floor((CANVAS_H - lotH) / 2);
    else {
      minY = 0;
      maxY = lotH - CANVAS_H;
    }
    offset.x = Math.min(maxX, Math.max(minX, offset.x));
    offset.y = Math.min(maxY, Math.max(minY, offset.y));
  };
  bounds();

  const cam: CameraImpl = {
    get scale() {
      return view.scale;
    },
    offset,
    get canPan() {
      return maxX > minX || maxY > minY;
    },
    setView(v) {
      view = v;
    },
    setBounds(w, h) {
      lotW = w;
      lotH = h;
      bounds();
    },
    panBy(dx, dy) {
      cam.panTo(offset.x + dx, offset.y + dy);
    },
    panTo(x, y) {
      offset.x = Math.min(maxX, Math.max(minX, Math.round(x)));
      offset.y = Math.min(maxY, Math.max(minY, Math.round(y)));
    },
    clientToLogical(clientX, clientY) {
      const r = getRect();
      const w = r.width > 0 ? r.width : view.cssW;
      const h = r.height > 0 ? r.height : view.cssH;
      return { x: ((clientX - r.left) * CANVAS_W) / w, y: ((clientY - r.top) * CANVAS_H) / h };
    },
    screenToWorld(clientX, clientY) {
      const l = cam.clientToLogical(clientX, clientY);
      return { x: (l.x + offset.x) / TILE_PX, y: (l.y + offset.y) / TILE_PX };
    },
    tileAtLogical(lx, ly) {
      const tx = Math.floor((lx + offset.x) / TILE_PX);
      const ty = Math.floor((ly + offset.y) / TILE_PX);
      if (tx < 0 || ty < 0 || tx * TILE_PX >= lotW || ty * TILE_PX >= lotH) return null;
      return { tx, ty };
    },
    logicalToStage(lx, ly) {
      return { x: view.left + lx * view.scale, y: view.top + ly * (view.cssH / CANVAS_H) };
    },
    worldToScreen: (w) => cam.logicalToStage(w.x * TILE_PX - offset.x, w.y * TILE_PX - offset.y),
  };
  return cam;
}
