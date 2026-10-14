/**
 * Injected clocks. Simulation code never reads real time directly; it is
 * handed a Clock. Tests and the soak runner use a manual clock.
 *
 * This is the only module in src/core allowed to touch Date.now / performance.now
 * (scripts/lint.mjs allowlists it): `new Date` is allowed here for localDate.
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

/**
 * The player's local calendar date, 'YYYY-MM-DD', for a wall-clock time. Personal mail
 * compares this with `PersonalMail.date` (the Mac's own calendar, not UTC). Lives here
 * because this is the one core file allowed to build a `Date`.
 */
export function localDate(wallMs: number): string {
  const d = new Date(wallMs);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
