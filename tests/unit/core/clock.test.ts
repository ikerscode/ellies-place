import { describe, expect, it } from 'vitest';
import { createManualClock, createSystemClock } from '../../../src/core/clock';

describe('clock', () => {
  it('manual clock only moves when told to', () => {
    const c = createManualClock(100, 1_000_000);
    expect(c.now()).toBe(100);
    expect(c.wallNow()).toBe(1_000_000);
    c.advance(50);
    expect(c.now()).toBe(150);
    expect(c.wallNow()).toBe(1_000_050);
    c.setWall(5);
    expect(c.wallNow()).toBe(5);
    expect(c.now()).toBe(150);
  });

  it('manual clock rejects negative or non-finite steps', () => {
    const c = createManualClock();
    expect(() => c.advance(-1)).toThrow(RangeError);
    expect(() => c.advance(Number.NaN)).toThrow(RangeError);
    expect(() => c.advance(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(c.now()).toBe(0);
  });

  it('system clock is monotonic and has a plausible wall time', () => {
    const c = createSystemClock();
    const a = c.now();
    const b = c.now();
    expect(b).toBeGreaterThanOrEqual(a);
    expect(c.wallNow()).toBeGreaterThan(1_600_000_000_000);
  });
});
