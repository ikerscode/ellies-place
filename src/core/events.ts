/**
 * Minimal typed event bus. The event map type is defined in types.ts (EpEvents),
 * but the bus is generic so tests and modules can make their own.
 */
import type { EventBus, SimEvent, SimEventSink } from './types';

export interface EventBusOptions {
  /**
   * Called when a handler throws. The other handlers still run (a UI exception must never
   * stop the audio or the autosave). Default: `console.error`.
   */
  readonly onError?: (error: unknown, type: string) => void;
}

export function createEventBus<M extends object>(opts: EventBusOptions = {}): EventBus<M> {
  const onError =
    opts.onError ??
    ((error: unknown, type: string): void => {
      console.error(`event handler for "${type}" threw`, error);
    });
  const handlers = new Map<keyof M, Set<(payload: never) => void>>();
  return {
    on(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler as (payload: never) => void);
      return () => {
        set.delete(handler as (payload: never) => void);
      };
    },
    emit(type, payload) {
      const set = handlers.get(type);
      if (!set) return;
      for (const h of [...set]) {
        // A handler unsubscribed by an earlier handler in this same emit must not run.
        if (!set.has(h)) continue;
        try {
          (h as (p: typeof payload) => void)(payload);
        } catch (e) {
          onError(e, String(type));
        }
      }
    },
    clear() {
      handlers.clear();
    },
  };
}

export interface EventQueue {
  /** The sink systems call as `ctx.emit`: buffers, delivers nothing yet. */
  readonly push: SimEventSink;
  /**
   * Delivers everything buffered, in order, to the sink given at creation. Events pushed
   * while flushing (a listener that dispatches) are delivered in the same flush. A throwing
   * sink is reported and does not lose the rest.
   */
  flush(): void;
  readonly size: number;
}

/**
 * The buffer behind `SystemContext.emit` (F6): `Sim.step` creates one, systems push into it,
 * and `flush()` runs after the last system of the tick. `dispatch` outside a step applies
 * at once and flushes its own events straight away.
 */
export function createEventQueue(sink: SimEventSink, onError?: (error: unknown) => void): EventQueue {
  const queue: SimEvent[] = [];
  const report =
    onError ??
    ((e: unknown): void => {
      console.error('sim event listener threw', e);
    });
  return {
    push(event) {
      queue.push(event);
    },
    flush() {
      for (let i = 0; i < queue.length; i++) {
        try {
          sink(queue[i] as SimEvent);
        } catch (e) {
          report(e);
        }
      }
      queue.length = 0;
    },
    get size() {
      return queue.length;
    },
  };
}
