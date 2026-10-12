/**
 * Minimal typed event bus. The event map type is defined in types.ts (EpEvents),
 * but the bus is generic so tests and modules can make their own.
 */
import type { EventBus } from './types';

export function createEventBus<M extends object>(): EventBus<M> {
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
      for (const h of [...set]) (h as (p: typeof payload) => void)(payload);
    },
    clear() {
      handlers.clear();
    },
  };
}
