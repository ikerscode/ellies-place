import { describe, expect, it } from 'vitest';
import {
  canSetPb,
  clampNeed,
  heartsMultiplierOf,
  isUnlockCode,
  knownFlag,
  moodStepOf,
  mountOf,
  needFactor,
  parseUnlockCode,
  priceOf,
  resultScore,
  rotationsFor,
  roundHalfUp,
  scaleHearts,
  secretFlag,
  trickleBase,
  unlockGivesFreeCopy,
} from '../../../src/core/rules';
import { ASPIRATION_IDS, MOOD_STEPS, NEED_FLOORS, PASS_SCORE } from '../../../src/core/types';
import { FIXTURE_ECONOMY } from './fixtures';

describe('mood steps and Hearts (FROZEN 1, 2)', () => {
  it('maps mood to the six stepped multipliers', () => {
    expect(MOOD_STEPS.map((s) => s.hearts)).toEqual([0.8, 0.9, 1.0, 1.15, 1.3, 1.5]);
    expect(heartsMultiplierOf(0)).toBe(0.8);
    expect(heartsMultiplierOf(24.9)).toBe(0.8);
    expect(heartsMultiplierOf(25)).toBe(0.9);
    expect(heartsMultiplierOf(64)).toBe(1.0);
    expect(heartsMultiplierOf(65)).toBe(1.15);
    expect(heartsMultiplierOf(91)).toBe(1.3);
    expect(heartsMultiplierOf(92)).toBe(1.5);
    expect(moodStepOf(95)).toMatchObject({ step: 5, band: 'great' });
  });

  it('rounds scaled Hearts half up despite float noise', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(scaleHearts(10, 70)).toBe(12); // 11.5
    expect(scaleHearts(15, 10)).toBe(12);
    expect(scaleHearts(40, 100)).toBe(60);
  });

  it('trickle pays 1 from mood 50 and 2 from mood 75', () => {
    expect(trickleBase(49, FIXTURE_ECONOMY)).toBe(0);
    expect(trickleBase(50, FIXTURE_ECONOMY)).toBe(1);
    expect(trickleBase(80, FIXTURE_ECONOMY)).toBe(2);
  });
});

describe('need floors', () => {
  it('clamps Fitness at 20 and cat needs at 10', () => {
    expect(NEED_FLOORS.fitness).toBe(20);
    expect(clampNeed('fitness', 5)).toBe(20);
    expect(clampNeed('chaos', -3)).toBe(10);
    expect(clampNeed('energy', -3)).toBe(0);
    expect(clampNeed('fun', 140)).toBe(100);
  });
});

describe('minigame results (FROZEN 4)', () => {
  it('uses PASS_SCORE and factor 0.8 for skips, 1.0 for auto-play, 0.8 + 0.4 s when played', () => {
    expect(resultScore({ skipped: true, score: 0.9 })).toBe(PASS_SCORE);
    expect(resultScore({ skipped: false, score: 0.9 })).toBe(0.9);
    expect(needFactor({ skipped: true, score: 1 })).toBe(0.8);
    expect(needFactor({ skipped: false, score: 0.6, auto: true })).toBe(1.0);
    expect(needFactor({ skipped: false, score: 1 })).toBeCloseTo(1.2);
    expect(needFactor({ skipped: false, score: 0 })).toBeCloseTo(0.8);
    expect(canSetPb({ skipped: true })).toBe(false);
    expect(canSetPb({ skipped: false, auto: true })).toBe(false);
    expect(canSetPb({ skipped: false })).toBe(true);
  });
});

describe('prices (FROZEN 13)', () => {
  it('scales, rounds to 5, keeps 0 and never goes under 5', () => {
    expect(priceOf(60, FIXTURE_ECONOMY)).toBe(95); // 96 -> 95
    expect(priceOf(15, FIXTURE_ECONOMY)).toBe(25); // 24 -> 25
    expect(priceOf(1, FIXTURE_ECONOMY)).toBe(5);
    expect(priceOf(0, FIXTURE_ECONOMY)).toBe(0);
  });
});

describe('unlock codes', () => {
  it('parses every home.md family with the FROZEN aspiration ids and day:N', () => {
    expect(parseUnlockCode('start')).toEqual({ kind: 'start' });
    expect(parseUnlockCode('fixture')).toEqual({ kind: 'fixture' });
    expect(parseUnlockCode('day:15')).toEqual({ kind: 'day', day: 15 });
    expect(parseUnlockCode('asp.home.3')).toEqual({ kind: 'aspiration', aspiration: 'home', tier: 3 });
    expect(parseUnlockCode('bond:shadow:4')).toEqual({ kind: 'bond', cat: 'shadow', level: 4 });
    expect(parseUnlockCode('poe:2')).toEqual({ kind: 'poe', trinkets: 2 });
    expect(parseUnlockCode('secret:bruce_all5')).toEqual({ kind: 'secret', secret: 'bruce_all5' });
  });

  it('rejects old and malformed codes', () => {
    for (const bad of ['asp:homemaker:2', 'asp.homemaker.2', 'asp.home.5', 'day:0', 'day:x', 'bond:bruce:2', 'poe:0', 'secret:', 'always']) {
      expect(isUnlockCode(bad), bad).toBe(false);
    }
  });

  it('gives a free first copy only for secrets and Poe trades (FROZEN 12)', () => {
    expect(unlockGivesFreeCopy('secret:dunks10')).toBe(true);
    expect(unlockGivesFreeCopy('poe:3')).toBe(true);
    expect(unlockGivesFreeCopy('asp.hyrox.1')).toBe(false);
    expect(unlockGivesFreeCopy('day:3')).toBe(false);
    expect(secretFlag('dunks10')).toBe('secret.dunks10');
  });

  it('lists the four aspiration ids', () => {
    expect(ASPIRATION_IDS).toEqual(['asp.hyrox', 'asp.royalty', 'asp.home', 'asp.collect']);
  });
});

describe('placement helpers', () => {
  it('maps orientations and placement codes', () => {
    expect(rotationsFor(4)).toEqual([0, 1, 2, 3]);
    expect(rotationsFor(2)).toEqual([0, 1]);
    expect(rotationsFor(1)).toEqual([0]);
    expect(mountOf('in')).toBe('floor');
    expect(mountOf('out')).toBe('floor');
    expect(mountOf('rug')).toBe('rug');
    expect(mountOf('window')).toBe('window');
    expect(mountOf('front')).toBe('floor');
    expect(knownFlag('salem', 'like', 'box_sit')).toBe('known.salem.like.box_sit');
  });
});
