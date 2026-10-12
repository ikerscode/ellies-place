/**
 * Injected clocks. Simulation code never reads real time directly; it is
 * handed a Clock. Tests and the soak runner use a manual clock.
 *
 * This is the only module in src/core allowed to touch Date.now / performance.now
 * (scripts/lint.mjs allowlists it).
 */

export interface Clock {
  /** Monotonic milliseconds, for frame timing and the fixed-step accumulator. */
  now(): number;
  /** Wall-clock epoch milliseconds, for the "real time" setting and save stamps. */
  wallNow(): number;
}

export interface ManualClock extends Clock {
  /** Moves both monotonic and wall time forward by `ms` (must be >= 0). */
  advance(ms: number): void;
  /** Sets the wall clock (epoch ms) without touching monotonic time. */
  setWall(epochMs: number): void;
}

export function createManualClock(startMs = 0, wallEpochMs = 0): ManualClock {
  let mono = startMs;
  let wall = wallEpochMs;
  return {
    now: () => mono,
    wallNow: () => wall,
    advance(ms: number) {
      if (!(ms >= 0) || !Number.isFinite(ms)) throw new RangeError(`advance needs ms >= 0, got ${ms}`);
      mono += ms;
      wall += ms;
    },
    setWall(epochMs: number) {
      wall = epochMs;
    },
  };
}

/** The real clock, used only by the app shell. */
export function createSystemClock(): Clock {
  const perf = typeof performance !== 'undefined' ? performance : undefined;
  return {
    now: () => (perf ? perf.now() : Date.now()),
    wallNow: () => Date.now(),
  };
}
