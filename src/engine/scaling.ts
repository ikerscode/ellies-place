/**
 * Display scaling (TECH "Display"): the logical canvas is 480 x 270.
 * - The scale is the largest integer that fits the viewport.
 * - If that is under 3 but the exact fit is at least 2.5, use the fractional fit (a 1440 x 800 browser gives
 *   2.96) and let nearest-neighbour sampling carry it.
 * - Below that, integer again; under 1 only the exact fit works.
 * The canvas is centred (letterboxed) in the stage.
 */
import { CANVAS_H, CANVAS_W } from '../core';

export const MIN_FRACTIONAL_SCALE = 2.5;
export const COMFORT_SCALE = 3;

export interface ScaleResult {
  /** CSS pixels per logical pixel (cssW / CANVAS_W). */
  readonly scale: number;
  readonly cssW: number;
  readonly cssH: number;
  /** Offset of the canvas inside the stage, CSS px. */
  readonly left: number;
  readonly top: number;
  /** Backing store size in device pixels. */
  readonly backingW: number;
  readonly backingH: number;
  readonly integer: boolean;
}

export function chooseScale(viewW: number, viewH: number): number {
  const fit = Math.min(viewW / CANVAS_W, viewH / CANVAS_H);
  if (!(fit > 0) || !Number.isFinite(fit)) return 1;
  const whole = Math.floor(fit + 1e-9);
  if (whole >= COMFORT_SCALE) return whole;
  if (fit >= MIN_FRACTIONAL_SCALE) return Math.floor(fit * 100) / 100;
  if (whole >= 1) return whole;
  return Math.floor(fit * 100) / 100 || fit;
}

export function computeScale(viewW: number, viewH: number, dpr = 1): ScaleResult {
  const scale = chooseScale(viewW, viewH);
  const cssW = Math.max(1, Math.floor(CANVAS_W * scale + 1e-6));
  const cssH = Math.max(1, Math.floor(CANVAS_H * scale + 1e-6));
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  return {
    scale: cssW / CANVAS_W,
    cssW,
    cssH,
    left: Math.max(0, Math.floor((viewW - cssW) / 2)),
    top: Math.max(0, Math.floor((viewH - cssH) / 2)),
    backingW: Math.max(1, Math.round(cssW * ratio)),
    backingH: Math.max(1, Math.round(cssH * ratio)),
    integer: Number.isInteger(scale),
  };
}
