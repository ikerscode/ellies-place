import { describe, expect, it } from 'vitest';
import {
  bandAtLeast,
  bondLevelOf,
  clamp100,
  clockText,
  effectiveSteps,
  hourOf,
  lerpRange,
  minuteInRange,
  moodBandOf,
  phaseAt,
  weekdayOf,
} from '../../../src/core/math';
import { createEmptySimState } from '../../../src/core/state';

const PHASES = { morning: 360, day: 660, evening: 1080, night: 1320 } as const;
const BANDS = { mopey: 0, low: 20, okay: 40, good: 60, great: 80 } as const;

describe('math helpers', () => {
  it('clamps and lerps', () => {
    expect(clamp100(-5)).toBe(0);
    expect(clamp100(120)).toBe(100);
    expect(lerpRange([0.8, 1.5], 0)).toBeCloseTo(0.8);
    expect(lerpRange([0.8, 1.5], 100)).toBeCloseTo(1.5);
    expect(lerpRange([0.8, 1.5], 50)).toBeCloseTo(1.15);
  });

  it('bond levels and mood bands', () => {
    const t = [20, 40, 60, 80] as const;
    expect(bondLevelOf(0, t)).toBe(0);
    expect(bondLevelOf(20, t)).toBe(1);
    expect(bondLevelOf(79.9, t)).toBe(3);
    expect(bondLevelOf(100, t)).toBe(4);
    expect(moodBandOf(0, BANDS)).toBe('mopey');
    expect(moodBandOf(59, BANDS)).toBe('okay');
    expect(moodBandOf(95, BANDS)).toBe('great');
    expect(bandAtLeast('good', 'okay')).toBe(true);
    expect(bandAtLeast('low', 'okay')).toBe(false);
  });

  it('phases wrap past midnight', () => {
    expect(phaseAt(0, PHASES)).toBe('night');
    expect(phaseAt(359, PHASES)).toBe('night');
    expect(phaseAt(360, PHASES)).toBe('morning');
    expect(phaseAt(700, PHASES)).toBe('day');
    expect(phaseAt(1100, PHASES)).toBe('evening');
    expect(phaseAt(1439, PHASES)).toBe('night');
  });

  it('weekdays, ranges and clock text', () => {
    expect(weekdayOf(1, 'mon')).toBe('mon');
    expect(weekdayOf(6, 'mon')).toBe('sat');
    expect(weekdayOf(8, 'mon')).toBe('mon');
    expect(weekdayOf(2, 'sun')).toBe('mon');
    expect(minuteInRange(1400, 1320, 360)).toBe(true);
    expect(minuteInRange(100, 1320, 360)).toBe(true);
    expect(minuteInRange(700, 1320, 360)).toBe(false);
    expect(minuteInRange(700, 600, 800)).toBe(true);
    expect(hourOf(61)).toBe(1);
    expect(clockText(7 * 60 + 5)).toBe('07:05');
    expect(clockText(1440 + 30)).toBe('00:30');
  });

  it('effective steps pause outside live mode', () => {
    const s = createEmptySimState(1);
    expect(effectiveSteps(s.time, 'live')).toBe(1);
    s.time.speed = 3;
    s.time.fastForward = 4;
    expect(effectiveSteps(s.time, 'live')).toBe(12);
    expect(effectiveSteps(s.time, 'build')).toBe(0);
    expect(effectiveSteps(s.time, 'activity')).toBe(0);
    s.time.speed = 0;
    expect(effectiveSteps(s.time, 'live')).toBe(0);
  });
});
