/** Condition builders for "a cat is seen doing X" wishes (play.md 7.2 `observe`, `near`). */
import type { CatName, CatObservedState, Condition, Layer, Posture, Tag } from '../../../core/types';

export interface SeenOpts {
  readonly forMinutes?: number;
  readonly radius?: number;
  readonly layer?: Layer;
  readonly tag?: Tag;
}

/** `observe(cat, state)`: the cat is seen in that state while Ellie is awake and near (8 tiles by default). */
export function seen(cat: CatName | 'any', state: CatObservedState, o: SeenOpts = {}): Condition {
  return { kind: 'catState', cat, state, ...o };
}

/** Ellie's own posture right now (`shadow_near` needs her seated). */
export const posture = (p: Posture): Condition => ({ kind: 'posture', who: 'ellie', posture: p });
