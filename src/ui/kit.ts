/** The component kit (ui.md 21). Plain DOM, `ep-` classes, every text arrives as a StringKey. */
import type {
  ButtonOptions,
  CardOptions,
  MeterOptions,
  PanelOptions,
  SliderOptions,
  SpriteKey,
  StringKey,
  StringVars,
  TabsOptions,
  ToggleOptions,
  UiComponent,
  UiKit,
} from '../core';
import { h, clamp } from './dom';
import type { UiCtx } from './ctx';
import type { TooltipManager } from './tooltip';
import { S } from './uiKeys';

let uid = 1;
const nextId = (p: string): string => `${p}-${uid++}`;

export type MeterLevel = 'ok' | 'mid' | 'low';

/** Wax and bar colour band by fraction of max (ui.md 21.7). */
export function meterLevel(value: number, max: number): MeterLevel {
  const f = max <= 0 ? 0 : value / max;
  return f >= 0.5 ? 'ok' : f >= 0.25 ? 'mid' : 'low';
}

export function iconImg(ctx: UiCtx, key: SpriteKey | undefined, scale = 2): HTMLImageElement | null {
  if (!key) return null;
  const url = ctx.icon(key, scale);
  if (!url) return null;
  return h('img', '', { src: url, alt: '', draggable: false });
}

export type MeterVariant = 'bar' | 'candle';

export interface MeterComponent extends UiComponent {
  set(value: number): void;
  /** The icon holder, so callers can add a fallback glyph. */
  readonly iconEl: HTMLElement;
  /** Little extra brightness flash on the candle flame. */
  flash(): void;
}

export function createMeter(ctx: UiCtx, opts: MeterOptions, variant: MeterVariant = 'bar'): MeterComponent {
  const label = ctx.str(opts.label);
  const root = h('div', `ep-meter${variant === 'candle' ? ' ep-meter--candle' : ''}`, {
    role: 'meter',
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': opts.max,
    tabindex: variant === 'candle' ? 0 : null,
  });
  const iconEl = h('span', 'ep-meter__icon');
  const img = iconImg(ctx, opts.icon);
  if (img) iconEl.append(img);
  const fill = h('div', variant === 'candle' ? 'ep-candle__wax' : 'ep-meter__fill');
  let flashTimer: ReturnType<typeof setTimeout> | null = null;
  if (variant === 'candle') {
    const stick = h('div', 'ep-candle__stick', {}, fill, h('div', 'ep-candle__flame'));
    root.append(stick, iconEl);
  } else {
    root.append(iconEl, h('div', 'ep-meter__track', {}, fill));
  }
  const api: MeterComponent = {
    el: root,
    iconEl,
    set(value) {
      const v = clamp(value, 0, opts.max);
      const f = opts.max <= 0 ? 0 : v / opts.max;
      root.setAttribute('aria-valuenow', String(Math.round(v)));
      root.dataset['level'] = meterLevel(v, opts.max);
      if (variant === 'candle') fill.style.height = `${f * 100}%`;
      else fill.style.width = `${f * 100}%`;
    },
    flash() {
      root.classList.add('is-bright');
      if (flashTimer !== null) clearTimeout(flashTimer);
      flashTimer = setTimeout(() => root.classList.remove('is-bright'), 600);
    },
    destroy() {
      if (flashTimer !== null) clearTimeout(flashTimer);
      root.remove();
    },
  };
  api.set(opts.value);
  return api;
}

export function createKit(ctx: UiCtx, tips: TooltipManager): UiKit {
  const detachers = new WeakMap<HTMLElement, () => void>();

  function tip(target: HTMLElement, key: StringKey, vars?: StringVars): () => void {
    const off = tips.attach(target, () => ctx.str(key, vars));
    return off;
  }

  const button: UiKit['button'] = (o: ButtonOptions) => {
    const variant = o.variant ?? 'secondary';
    const el = h('button', `ep-btn ep-btn--${variant}`, { type: 'button' });
    const img = iconImg(ctx, o.icon);
    if (img) el.append(img);
    el.append(h('span', 'ep-btn__label', {}, ctx.str(o.label)));
    let disabled = o.disabled === true;
    const sync = (): void => {
      if (disabled) el.setAttribute('aria-disabled', 'true');
      else el.removeAttribute('aria-disabled');
    };
    sync();
    const onClick = (e: MouseEvent): void => {
      if (disabled) {
        ctx.cue('ui.nope');
        if (!ctx.reduced()) {
          el.classList.remove('ep-wiggle');
          void el.offsetWidth;
          el.classList.add('ep-wiggle');
        }
        return;
      }
      ctx.cue('ui.click');
      o.onClick();
      // Space after a mouse click must still reach the game (ui.md 20.1): keyboard clicks have detail 0.
      if (e.detail > 0) el.blur();
    };
    el.addEventListener('click', onClick);
    const off = o.tooltip ? tip(el, o.tooltip) : null;
    return {
      el,
      setDisabled(d) {
        disabled = d;
        sync();
      },
      destroy() {
        el.removeEventListener('click', onClick);
        off?.();
        el.remove();
      },
    };
  };

  const panel: UiKit['panel'] = (o: PanelOptions) => {
    const titleId = nextId('ep-title');
    const body = h('div', 'ep-panel__body');
    const titleText = h('span', '', { id: titleId }, ctx.str(o.title));
    const head = h('h2', 'ep-panel__title', {}, titleText);
    const el = h('section', `ep-panel${o.paper ? ' ep-paper' : ''}`, { role: 'dialog', 'aria-labelledby': titleId }, head, body);
    let closeBtn: ReturnType<typeof button> | null = null;
    if (o.closable) {
      closeBtn = button({ label: S.kitClose, variant: 'ghost', onClick: () => o.onClose?.() });
      closeBtn.el.setAttribute('aria-label', ctx.str(S.kitClose));
      head.append(closeBtn.el);
    }
    return {
      el,
      body,
      destroy() {
        closeBtn?.destroy();
        el.remove();
      },
    };
  };

  const tabs: UiKit['tabs'] = <T extends string>(o: TabsOptions<T>) => {
    const el = h('div', 'ep-tabs', { role: 'tablist' });
    const buttons = new Map<T, HTMLButtonElement>();
    let selected = o.selected;
    for (const t of o.tabs) {
      const b = h('button', 'ep-tab', { type: 'button', role: 'tab' }, ctx.str(t.label));
      const img = iconImg(ctx, t.icon);
      if (img) b.prepend(img);
      b.addEventListener('click', () => api.select(t.id, true));
      buttons.set(t.id, b);
      el.append(b);
    }
    const sync = (): void => {
      for (const [id, b] of buttons) {
        b.setAttribute('aria-selected', String(id === selected));
        b.tabIndex = id === selected ? 0 : -1;
      }
    };
    el.addEventListener('keydown', (e) => {
      const vertical = el.classList.contains('vertical');
      const next = vertical ? 'ArrowDown' : 'ArrowRight';
      const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
      const ids = o.tabs.map((t) => t.id);
      const i = ids.indexOf(selected);
      let to: T | undefined;
      if (e.key === next) to = ids[(i + 1) % ids.length];
      else if (e.key === prev) to = ids[(i - 1 + ids.length) % ids.length];
      else if (e.key === 'Home') to = ids[0];
      else if (e.key === 'End') to = ids[ids.length - 1];
      if (to === undefined) return;
      e.preventDefault();
      api.select(to, true);
      buttons.get(to)?.focus();
    });
    const api = {
      el,
      select(id: T, fromUser = false): void {
        if (id === selected && fromUser) return;
        selected = id;
        sync();
        if (fromUser) {
          ctx.cue('ui.tab');
          o.onSelect(id);
        }
      },
      destroy(): void {
        el.remove();
      },
    };
    sync();
    return api as ReturnType<UiKit['tabs']> & { select(id: T): void };
  };

  const slider: UiKit['slider'] = (o: SliderOptions) => {
    const id = nextId('ep-slider');
    const label = h('label', 'ep-slider__label', { for: id }, ctx.str(o.label));
    const input = h('input', '', { type: 'range', id, min: o.min, max: o.max, step: o.step, value: o.value });
    const val = h('span', 'ep-slider__value', {}, String(o.value));
    const el = h('div', 'ep-slider', {}, label, input, val);
    input.addEventListener('input', () => {
      val.textContent = input.value;
      o.onChange(Number(input.value));
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'PageUp' && e.key !== 'PageDown') return;
      e.preventDefault();
      const dir = e.key === 'PageUp' ? 1 : -1;
      const v = clamp(Number(input.value) + dir * 10 * o.step, o.min, o.max);
      input.value = String(v);
      input.dispatchEvent(new Event('input'));
    });
    return {
      el,
      set(v) {
        input.value = String(v);
        val.textContent = String(v);
      },
      destroy() {
        el.remove();
      },
    };
  };

  const toggle: UiKit['toggle'] = (o: ToggleOptions) => {
    let on = o.value;
    const knob = h('span', 'ep-toggle__knob');
    const el = h('button', 'ep-toggle', { type: 'button', role: 'switch' }, h('span', 'ep-toggle__pill', {}, knob), ctx.str(o.label));
    const sync = (): void => el.setAttribute('aria-checked', String(on));
    sync();
    el.addEventListener('click', (e) => {
      on = !on;
      sync();
      ctx.cue('ui.toggle');
      o.onChange(on);
      if (e.detail > 0) el.blur();
    });
    return {
      el,
      set(v) {
        on = v;
        sync();
      },
      destroy() {
        el.remove();
      },
    };
  };

  const card: UiKit['card'] = (o: CardOptions) => {
    const clickable = o.onClick !== undefined;
    const el = h(clickable ? 'button' : 'div', `ep-card${o.locked ? ' is-locked' : ''}`, clickable ? { type: 'button' } : {});
    const img = iconImg(ctx, o.icon);
    if (img) el.append(h('div', 'ep-card__icon', {}, img));
    el.append(h('div', 'ep-card__title', {}, ctx.str(o.title, o.vars)));
    if (o.body) el.append(h('div', 'ep-card__body', {}, ctx.str(o.body, o.vars)));
    if (o.locked) {
      el.setAttribute('aria-disabled', 'true');
      if (!clickable) el.tabIndex = 0;
    }
    if (clickable) {
      el.addEventListener('click', (e) => {
        if (o.locked) {
          ctx.cue('ui.nope');
          return;
        }
        ctx.cue('ui.click');
        o.onClick?.();
        if (e.detail > 0) el.blur();
      });
    }
    return {
      el,
      destroy() {
        el.remove();
      },
    };
  };

  const meter: UiKit['meter'] = (o) => createMeter(ctx, o, 'bar');

  const tooltip: UiKit['tooltip'] = (target, text, vars) => {
    const off = tip(target, text, vars);
    detachers.set(target, off);
    return {
      el: target,
      destroy() {
        off();
        detachers.delete(target);
      },
    };
  };

  return { panel, button, tabs, slider, toggle, card, meter, tooltip };
}
