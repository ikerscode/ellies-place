/**
 * Accessibility plumbing (ui.md 22): text size, text speed, reduced motion, and the pure maths behind them.
 */
import type { Settings, TextSize, TextSpeed } from '../core';

export const TEXT_SCALE: Readonly<Record<TextSize, number>> = { small: 0.9, normal: 1, large: 1.2 };

/** Multiplier on how long bubbles and toasts stay (ui.md 7.1). Slow holds longer. */
export const HOLD_FACTOR: Readonly<Record<TextSpeed, number>> = { slow: 1.5, normal: 1, fast: 0.75, instant: 0.75 };

/** Characters per second for the typewriter (ui.md 7.5). Infinity shows everything at once. */
export const TYPE_CPS: Readonly<Record<TextSpeed, number>> = { slow: 30, normal: 55, fast: 110, instant: Infinity };

export const textScaleOf = (s: Pick<Settings, 'textSize'>): number => TEXT_SCALE[s.textSize];
export const holdFactorOf = (s: Pick<Settings, 'textSpeed'>): number => HOLD_FACTOR[s.textSpeed];

/** Speech bubble hold time in ms: clamp(1800 + 55 x characters, 2200, 7000) x text speed factor. */
export function speechHoldMs(characters: number, settings: Pick<Settings, 'textSpeed'>): number {
  const base = Math.min(7000, Math.max(2200, 1800 + 55 * characters));
  return base * holdFactorOf(settings);
}

/** Computed font floors (ui.md 3.2) in CSS px for a canvas scale `u` and a text scale `ts`. Used by a unit test. */
export function fontSizes(u: number, ts: number): Readonly<Record<'xs' | 's' | 'm' | 'l' | 'xl', number>> {
  return {
    xs: Math.max(u * 4.5 * ts, 11),
    s: Math.max(u * 5 * ts, 12 * ts, 12),
    m: Math.max(u * 5.6 * ts, 13 * ts, 12),
    l: Math.max(u * 7 * ts, 16 * ts),
    xl: Math.max(u * 10 * ts, 22 * ts),
  };
}

export interface ScaleVars {
  readonly '--u': string;
  readonly '--b1': string;
  readonly '--b2': string;
  readonly '--ts': string;
}

/** The custom properties `setScale` writes (ui.md 2.3). */
export function scaleVars(scale: number, settings: Pick<Settings, 'textSize'>): ScaleVars {
  return {
    '--u': `${scale}px`,
    '--b1': `${Math.max(1, Math.round(scale * 0.8))}px`,
    '--b2': `${Math.max(2, Math.round(scale * 1.2))}px`,
    '--ts': String(textScaleOf(settings)),
  };
}

/** True when motion should be reduced, given the setting and what the system says. */
export function reducedMotion(settings: Pick<Settings, 'reducedMotion'>, systemReduces: boolean): boolean {
  return settings.reducedMotion === 'on' || (settings.reducedMotion === 'system' && systemReduces);
}

/** Sets scale, text size and motion attributes on a UI root. */
export function applyDisplay(root: HTMLElement, scale: number, settings: Settings, reduce: boolean): void {
  const vars = scaleVars(scale, settings);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  if (reduce) root.setAttribute('data-motion', 'reduce');
  else root.removeAttribute('data-motion');
}
