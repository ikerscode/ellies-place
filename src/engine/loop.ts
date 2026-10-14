/**
 * Fixed-timestep accounting and the requestAnimationFrame driver (contracts 3, TECH "Architecture").
 *
 * The sim advances in fixed steps of one tick-length (50 ms, 20 per second). Each step runs
 * `sim.stepsPerTick()` ticks, so speed x2, x3 and sleep fast-forward change ticks per second and never the
 * step cadence. A frame runs at most `LIMITS.maxTicksPerFrame` ticks; the rest of the real time is dropped
 * (no spiral of death after a stall). The step count is decided one step at a time, because a tick can change
 * the answer (Ellie falls asleep and the fast-forward switches on).
 */
import { LIMITS, TICK_MS } from '../core';

/** A frame longer than this is treated as this long (a stalled tab never fast-forwards the house). */
export const MAX_FRAME_MS = 250;

export class FixedStepper {
  private acc = 0;
  private ticksThisFrame = 0;
  private lastTicksPerStep = 1;
  /** Real milliseconds thrown away because a frame hit the tick cap. */
  dropped = 0;

  constructor(
    private readonly stepMs: number = TICK_MS,
    private readonly maxTicks: number = LIMITS.maxTicksPerFrame,
    private readonly maxFrameMs: number = MAX_FRAME_MS,
  ) {}

  /** Starts a frame with `dtMs` of real time. */
  begin(dtMs: number): void {
    const dt = Number.isFinite(dtMs) ? Math.min(Math.max(dtMs, 0), this.maxFrameMs) : 0;
    this.acc += dt;
    this.ticksThisFrame = 0;
  }

  /**
   * Asks for the next fixed step. Returns the ticks to run (0 means a step passed with the sim not running:
   * paused, build or photo) or -1 when no step is due or the frame's tick budget is spent.
   */
  next(ticksPerStep: number): number {
    this.lastTicksPerStep = ticksPerStep;
    if (this.acc < this.stepMs) return -1;
    if (ticksPerStep <= 0) {
      this.acc -= this.stepMs;
      return 0;
    }
    if (this.ticksThisFrame > 0 && this.ticksThisFrame + ticksPerStep > this.maxTicks) {
      const keep = this.acc % this.stepMs;
      this.dropped += this.acc - keep;
      this.acc = keep;
      return -1;
    }
    this.acc -= this.stepMs;
    this.ticksThisFrame += ticksPerStep;
    return ticksPerStep;
  }

  /** Ticks run so far this frame. */
  get ticks(): number {
    return this.ticksThisFrame;
  }

  /** Interpolation between the previous step and the current one, 0..1 (1 while the sim is not stepping). */
  get alpha(): number {
    if (this.lastTicksPerStep <= 0) return 1;
    return Math.min(1, Math.max(0, this.acc / this.stepMs));
  }

  reset(): void {
    this.acc = 0;
    this.ticksThisFrame = 0;
  }
}

export interface FrameLoopDeps {
  now(): number;
  raf(cb: (t: number) => void): number;
  caf(id: number): void;
  isHidden(): boolean;
  /** Subscribes to tab visibility; returns unsubscribe. */
  onVisibility(cb: (hidden: boolean) => void): () => void;
  /** Called once per animation frame with the real milliseconds since the previous one. */
  frame(dtMs: number): void;
  /** Told when the loop pauses or resumes for visibility. */
  onPause?(paused: boolean): void;
}

export interface FrameLoop {
  start(): void;
  stop(): void;
  readonly running: boolean;
  /** True while stopped only because the tab is hidden. */
  readonly pausedForVisibility: boolean;
}

/** rAF driver. Hidden tabs cancel the callback, and the first frame after returning has dt 0 (no catch-up). */
export function createFrameLoop(deps: FrameLoopDeps): FrameLoop {
  let wanted = false;
  let handle: number | null = null;
  let last = 0;
  let unsub: (() => void) | null = null;
  let hiddenPause = false;

  const tick = (): void => {
    handle = null;
    if (!wanted || hiddenPause) return;
    const t = deps.now();
    const dt = t - last;
    last = t;
    try {
      deps.frame(dt);
    } finally {
      if (wanted && !hiddenPause && handle === null) handle = deps.raf(tick);
    }
  };

  const schedule = (): void => {
    last = deps.now();
    if (handle === null) handle = deps.raf(tick);
  };

  const cancel = (): void => {
    if (handle !== null) {
      deps.caf(handle);
      handle = null;
    }
  };

  return {
    start() {
      if (wanted) return;
      wanted = true;
      hiddenPause = deps.isHidden();
      unsub = deps.onVisibility((hidden) => {
        if (!wanted) return;
        if (hidden && !hiddenPause) {
          hiddenPause = true;
          cancel();
          deps.onPause?.(true);
        } else if (!hidden && hiddenPause) {
          hiddenPause = false;
          deps.onPause?.(false);
          schedule();
        }
      });
      if (!hiddenPause) schedule();
    },
    stop() {
      wanted = false;
      hiddenPause = false;
      cancel();
      unsub?.();
      unsub = null;
    },
    get running() {
      return wanted && !hiddenPause;
    },
    get pausedForVisibility() {
      return wanted && hiddenPause;
    },
  };
}
