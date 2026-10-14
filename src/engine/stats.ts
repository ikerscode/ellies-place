/**
 * Frame statistics for `frameStats()` and the debug overlay. Fixed-size rings, so recording a frame
 * never allocates; percentiles are computed on request only.
 */
import type { FrameStats } from '../core';

export class Ring {
  private readonly buf: Float64Array;
  private readonly scratch: Float64Array;
  private head = 0;
  private n = 0;

  constructor(readonly capacity: number) {
    this.buf = new Float64Array(capacity);
    this.scratch = new Float64Array(capacity);
  }

  push(v: number): void {
    this.buf[this.head] = v;
    this.head = (this.head + 1) % this.capacity;
    if (this.n < this.capacity) this.n++;
  }

  get count(): number {
    return this.n;
  }

  /** Most recent value (0 when empty). */
  get last(): number {
    return this.n === 0 ? 0 : (this.buf[(this.head - 1 + this.capacity) % this.capacity] ?? 0);
  }

  /** Oldest value still held (0 when empty). */
  get first(): number {
    return this.n === 0 ? 0 : (this.buf[(this.head - this.n + this.capacity) % this.capacity] ?? 0);
  }

  /** Nearest-rank percentile, p in 0..1. */
  percentile(p: number): number {
    if (this.n === 0) return 0;
    const view = this.scratch.subarray(0, this.n);
    for (let i = 0; i < this.n; i++) view[i] = this.buf[(this.head - this.n + i + this.capacity) % this.capacity] ?? 0;
    view.sort();
    const idx = Math.min(this.n - 1, Math.max(0, Math.ceil(p * this.n) - 1));
    return view[idx] ?? 0;
  }
}

export interface FrameRecorder {
  /** One rendered frame: when it started (clock ms), how long drawing took, and how long the sim steps took. */
  record(atMs: number, renderMs: number, simMs: number): void;
  stats(): FrameStats;
}

export function createFrameRecorder(window = 120): FrameRecorder {
  const render = new Ring(window);
  const sim = new Ring(window);
  const stamps = new Ring(window);
  let frames = 0;
  return {
    record(atMs, renderMs, simMs) {
      frames++;
      render.push(renderMs);
      sim.push(simMs);
      stamps.push(atMs);
    },
    stats() {
      const span = stamps.last - stamps.first;
      const fps = stamps.count > 1 && span > 0 ? ((stamps.count - 1) * 1000) / span : 0;
      return {
        frames,
        fps,
        renderP50Ms: render.percentile(0.5),
        renderP95Ms: render.percentile(0.95),
        simP50Ms: sim.percentile(0.5),
        simP95Ms: sim.percentile(0.95),
        lastRenderMs: render.last,
        lastSimMs: sim.last,
      };
    },
  };
}
