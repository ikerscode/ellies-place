/** Pure placement maths shared by tooltips, bubbles and the bloom (ui.md 2.4, 6.4, 7.3). */
import { clamp } from './dom';

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Placement {
  readonly x: number;
  readonly y: number;
  /** True when the box went below its anchor because there was no room above. */
  readonly below: boolean;
  /** Where the tail should point, as an x offset inside the box (clamped to the inner area). */
  readonly tailX: number;
  /** The anchor sat outside the bounds, so the box was pushed to the nearest edge. */
  readonly offscreen: boolean;
}

/**
 * Centres a box above an anchor point, flips it below when the top would be closer than `topRoom`
 * to the stage top, clamps it to the stage with `margin`, and reports where its tail should point.
 * `anchorX`/`anchorY` is the head point; `feetY` is where the box goes when flipped below.
 */
export function placeAbove(
  anchorX: number,
  anchorY: number,
  feetY: number,
  size: { readonly w: number; readonly h: number },
  stage: { readonly w: number; readonly h: number },
  opts: { readonly margin: number; readonly topRoom: number; readonly gap?: number; readonly tailInset?: number },
): Placement {
  const gap = opts.gap ?? 0;
  const inset = opts.tailInset ?? 0;
  let below = false;
  let y = anchorY - size.h - gap;
  if (y < opts.topRoom) {
    below = true;
    y = feetY + gap;
  }
  const maxX = Math.max(opts.margin, stage.w - size.w - opts.margin);
  const maxY = Math.max(opts.margin, stage.h - size.h - opts.margin);
  const x = clamp(anchorX - size.w / 2, opts.margin, maxX);
  const offscreen = anchorX < 0 || anchorX > stage.w || anchorY < 0 || anchorY > stage.h;
  const cy = clamp(y, opts.margin, maxY);
  const tailX = clamp(anchorX - x, Math.min(inset, size.w / 2), Math.max(size.w - inset, size.w / 2));
  return { x, y: cy, below, tailX, offscreen };
}

export function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? h : 0;
}

export function boxesIntersect(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
