/** Toasts (ui.md 8.1): a lane of up to 3, merging, hover pause, click dismiss, queued while busy. */
import type { StringKey, ToastSpec } from '../core';
import { h } from './dom';
import type { UiCtx } from './ctx';
import { iconImg } from './kit';
import { S } from './uiKeys';

export const TOAST_MAX_VISIBLE = 3;
export const TOAST_MAX_WAITING = 5;
export const TOAST_MERGE_MS = 2000;
export const TOAST_LEAVE_MS = 220;
export const TOAST_HOLD_MS = { info: 4000, hearts: 3500, unlock: 5000, gentle: 3500 } as const;

interface Live {
  readonly spec: ToastSpec;
  readonly key: StringKey;
  readonly el: HTMLElement;
  readonly textEl: HTMLElement;
  readonly countEl: HTMLElement;
  count: number;
  /** ms of hold left. */
  left: number;
  /** ms since it was shown or last merged. */
  age: number;
  hovered: boolean;
  leaving: number | null;
}

export interface ToastManager {
  push(spec: ToastSpec): void;
  /** Activities and the credits set this: toasts wait and play after. */
  setBusy(busy: boolean): void;
  update(dtMs: number): void;
  readonly visibleCount: number;
  readonly waitingCount: number;
  destroy(): void;
}

export function createToastManager(ctx: UiCtx, lane: HTMLElement): ToastManager {
  const live: Live[] = [];
  let waiting: ToastSpec[] = [];
  let busy = false;

  const retire = (t: Live): void => {
    if (t.leaving !== null) return;
    t.leaving = ctx.reduced() ? 0 : TOAST_LEAVE_MS;
    t.el.classList.add('is-leaving');
  };

  const show = (spec: ToastSpec): void => {
    const tone = spec.tone ?? 'info';
    const textEl = h('span', 'ep-toast__text', {}, ctx.str(spec.key, spec.vars));
    const countEl = h('span', 'ep-toast__count');
    const el = h('div', `ep-chip ep-toast ep-toast--${tone}`, {}, textEl, countEl);
    const img = iconImg(ctx, spec.icon);
    if (img) el.prepend(img);
    const t: Live = { spec, key: spec.key, el, textEl, countEl, count: 1, left: TOAST_HOLD_MS[tone] * ctx.holdFactor(), age: 0, hovered: false, leaving: null };
    el.addEventListener('pointerenter', () => {
      t.hovered = true;
    });
    el.addEventListener('pointerleave', () => {
      t.hovered = false;
    });
    el.addEventListener('click', () => retire(t));
    live.push(t);
    lane.append(el);
    ctx.cue(tone === 'unlock' ? 'ui.unlock' : 'ui.toast');
    // Older ones slide out when the lane is full.
    const active = live.filter((x) => x.leaving === null);
    for (let i = 0; i < active.length - TOAST_MAX_VISIBLE; i++) {
      const old = active[i];
      if (old) retire(old);
    }
  };

  return {
    push(spec) {
      const same = live.find((t) => t.leaving === null && t.key === spec.key && t.age <= TOAST_MERGE_MS && sameVars(t.spec, spec));
      if (same) {
        same.count++;
        same.age = 0;
        same.left = TOAST_HOLD_MS[spec.tone ?? 'info'] * ctx.holdFactor();
        same.countEl.textContent = ctx.str(S.toastMerged, { n: same.count });
        return;
      }
      if (busy) {
        waiting.push(spec);
        if (waiting.length > TOAST_MAX_WAITING) waiting = waiting.slice(waiting.length - TOAST_MAX_WAITING);
        return;
      }
      show(spec);
    },
    setBusy(b) {
      busy = b;
      if (!b) {
        const q = waiting;
        waiting = [];
        for (const s of q) show(s);
      }
    },
    update(dt) {
      for (const t of [...live]) {
        t.age += dt;
        if (t.leaving !== null) {
          t.leaving -= dt;
          if (t.leaving <= 0) {
            t.el.remove();
            live.splice(live.indexOf(t), 1);
          }
          continue;
        }
        if (t.hovered) continue;
        t.left -= dt;
        if (t.left <= 0) retire(t);
      }
    },
    get visibleCount() {
      return live.filter((t) => t.leaving === null).length;
    },
    get waitingCount() {
      return waiting.length;
    },
    destroy() {
      for (const t of live) t.el.remove();
      live.length = 0;
      waiting = [];
    },
  };
}

function sameVars(a: ToastSpec, b: ToastSpec): boolean {
  return JSON.stringify(a.vars ?? null) === JSON.stringify(b.vars ?? null);
}
