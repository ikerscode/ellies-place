/**
 * Seeded PRNG (mulberry32) with an explicit, JSON-serialisable state object.
 *
 * The state lives inside SimState, so a save/load round-trip resumes the exact
 * same random sequence. Every function here advances `state` in place.
 * Simulation code must use this instead of Math.random().
 */

export interface RngState {
  /** The seed this stream started from (kept for debugging and replays). */
  readonly seed: number;
  /** Current mulberry32 state as an unsigned 32-bit integer. */
  a: number;
}

const UINT32 = 4294967296;

/** Normalises any finite number to an unsigned 32-bit seed. */
function toU32(n: number): number {
  if (!Number.isFinite(n)) throw new RangeError(`rng seed must be finite, got ${n}`);
  return Math.trunc(n) >>> 0;
}

export function createRng(seed: number): RngState {
  const s = toU32(seed);
  return { seed: s, a: s };
}

/** Returns an independent copy, so the original stream is not advanced. */
export function cloneRng(state: RngState): RngState {
  return { seed: state.seed, a: state.a };
}

/** Next raw value in [0, 2^32). */
export function nextU32(state: RngState): number {
  const a = (state.a + 0x6d2b79f5) | 0;
  state.a = a >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/** Next float in [0, 1). */
export function nextFloat(state: RngState): number {
  return nextU32(state) / UINT32;
}

/** Next integer in [min, max], both inclusive. */
export function nextInt(state: RngState, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError(`nextInt bounds must be integers, got ${min}..${max}`);
  }
  if (max < min) throw new RangeError(`nextInt max < min (${min}..${max})`);
  return min + Math.floor(nextFloat(state) * (max - min + 1));
}

/** True with probability p (clamped to [0, 1]). Always advances the stream once. */
export function chance(state: RngState, p: number): boolean {
  return nextFloat(state) < p;
}

/** Uniformly picks one element. Throws on an empty array. */
export function pick<T>(state: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('pick from empty array');
  const i = nextInt(state, 0, items.length - 1);
  return items[i] as T;
}

/**
 * Derives an independent child stream (for an activity or a plugin) from the parent.
 * Advances the parent exactly once, so forking is itself deterministic.
 */
export function forkRng(state: RngState, salt = 0): RngState {
  const base = nextU32(state);
  // Mix the salt in with a different odd constant so sibling forks differ.
  const mixed = (Math.imul((base ^ toU32(salt)) >>> 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  return createRng(mixed);
}
