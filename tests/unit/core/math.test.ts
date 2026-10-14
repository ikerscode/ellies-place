import { describe, expect, it } from 'vitest';
import {
  bandAtLeast,
  bondLevelOf,
  clamp100,
  clockText,
  darknessAt,
  effectiveSteps,
  MOOD_BAND_FLOORS,
  hourOf,
  lerpRange,
  minuteInRange,
  moodBandOf,
  phaseAt,
  weekdayOf,
} from '../../../src/core/math';
import { createEmptySimState } from '../../../src/core/state';

const PHASES = { dawn: 360, day: 660, dusk: 1080, night: 1320 } as const;
const BANDS = { mopey: 0, low: 20, okay: 40, good: 60, great: 80 } as const;

import { FIXTURE_START } from './fixtures';

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
    expect(phaseAt(360, PHASES)).toBe('dawn');
    expect(phaseAt(700, PHASES)).toBe('day');
    expect(phaseAt(1100, PHASES)).toBe('dusk');
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
    const s = createEmptySimState(1, FIXTURE_START);
    expect(effectiveSteps(s.time, 'live')).toBe(1);
    s.time.speed = 3;
    expect(effectiveSteps(s.time, 'live')).toBe(3);
    // Sleep fast-forward replaces speed (200 ticks/s at 10), it does not multiply it.
    s.time.fastForward = 10;
    expect(effectiveSteps(s.time, 'live')).toBe(10);
    expect(effectiveSteps(s.time, 'cutscene')).toBe(1);
    expect(effectiveSteps(s.time, 'build')).toBe(0);
    // FROZEN 17: the house keeps running at x1 behind an activity, whatever speed says.
    expect(effectiveSteps(s.time, 'activity')).toBe(1);
    s.time.speed = 3;
    expect(effectiveSteps(s.time, 'activity')).toBe(1);
    s.time.speed = 0;
    expect(effectiveSteps(s.time, 'activity')).toBe(1);
    s.time.speed = 3;
    s.time.realTime = true;
    expect(effectiveSteps(s.time, 'live')).toBe(3);
    s.time.realTime = false;
    s.time.speed = 0;
    expect(effectiveSteps(s.time, 'live')).toBe(0);
  });

  it('darkness follows the light phases', () => {
    const phases = { dawn: 300, day: 420, dusk: 1110, night: 1260 };
    expect(darknessAt(0, phases, 0.65)).toBeCloseTo(0.65);
    expect(darknessAt(360, phases, 0.65)).toBeCloseTo(0.325);
    expect(darknessAt(720, phases, 0.65)).toBe(0);
    expect(darknessAt(1185, phases, 0.65)).toBeCloseTo(0.325);
    expect(darknessAt(1300, phases, 0.65)).toBeCloseTo(0.65);
  });

  it('mood bands default to the frozen steps', () => {
    expect(MOOD_BAND_FLOORS).toEqual({ mopey: 0, low: 25, okay: 45, good: 65, great: 80 });
    expect(moodBandOf(24)).toBe('mopey');
    expect(moodBandOf(45)).toBe('okay');
    expect(moodBandOf(95)).toBe('great');
  });
});
