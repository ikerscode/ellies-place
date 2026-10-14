/** One shared tooltip element (ui.md 21.8): 350 ms hover delay, instant on focus, hides on leave, blur, Esc. */
import { h } from './dom';
import { placeAbove } from './place';

export const TOOLTIP_DELAY_MS = 350;
let nextId = 1;

export interface TooltipManager {
  readonly el: HTMLElement;
  /** Shows `text()` for `target`. Returns a detach function. */
  attach(target: HTMLElement, text: () => string): () => void;
  hide(): void;
  /** True while a tooltip is showing (the Esc stack closes it first). */
  readonly visible: boolean;
  destroy(): void;
}

export function createTooltipManager(layer: HTMLElement, stageRect: () => { w: number; h: number; left: number; top: number }, scale: () => number): TooltipManager {
  const el = h('div', 'ep-tooltip', { role: 'tooltip', id: `ep-tip-${nextId++}` });
  layer.append(el);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let current: HTMLElement | null = null;

  const hide = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    el.classList.remove('is-on');
    current?.removeAttribute('aria-describedby');
    current = null;
  };

  const show = (target: HTMLElement, text: string): void => {
    if (!text) return;
    current?.removeAttribute('aria-describedby');
    current = target;
    el.textContent = text;
    target.setAttribute('aria-describedby', el.id);
    el.classList.add('is-on');
    const st = stageRect();
    const r = target.getBoundingClientRect();
    const u = scale();
    const p = placeAbove(r.left - st.left + r.width / 2, r.top - st.top, r.bottom - st.top, { w: el.offsetWidth, h: el.offsetHeight }, st, {
      margin: 4 * u,
      topRoom: 4 * u,
      gap: 2 * u,
    });
    el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && el.classList.contains('is-on')) hide();
  };
  window.addEventListener('keydown', onKey);

  return {
    el,
    attach(target, text) {
      const enter = (): void => {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => show(target, text()), TOOLTIP_DELAY_MS);
      };
      const focus = (): void => {
        // Keyboard focus shows at once; mouse focus (focus-visible false) waits for hover.
        if (target.matches(':focus-visible')) show(target, text());
      };
      const leave = (): void => {
        if (current === target || timer !== null) hide();
      };
      target.addEventListener('pointerenter', enter);
      target.addEventListener('pointerleave', leave);
      target.addEventListener('focus', focus);
      target.addEventListener('blur', leave);
      return () => {
        target.removeEventListener('pointerenter', enter);
        target.removeEventListener('pointerleave', leave);
        target.removeEventListener('focus', focus);
        target.removeEventListener('blur', leave);
        if (current === target) hide();
      };
    },
    hide,
    get visible() {
      return el.classList.contains('is-on');
    },
    destroy() {
      hide();
      window.removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
