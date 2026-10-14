import { describe, expect, it } from 'vitest';
import { createManualClock, localDate } from '../../../src/core/clock';
import { buildContentIndex } from '../../../src/core/content';
import { createEventBus, createEventQueue } from '../../../src/core/events';
import { hashState } from '../../../src/core/hash';
import { minutesToTicks, phaseAt, timeAtTick } from '../../../src/core/math';
import { RACE_ACTIVITY_ID, musicContextOf } from '../../../src/core/music';
import { isAutonomousSource, itemSpriteKey, itemSpriteKeys } from '../../../src/core/rules';
import { FLAG, RECORD, STAT, progressStats, statInteraction } from '../../../src/core/stats';
import { allocEntity, createEmptySimState, normaliseLoadedState, setC } from '../../../src/core/state';
import { TICKS_PER_GAME_DAY, asActivityId, asEntityId, asInteractionId, asItemId, asRoomId, asSpriteKey, type SimEvent } from '../../../src/core/types';
import { fillMissing, migrationChainProblems, reconcileState, validateSimState } from '../../../src/core/validate';
import { FIXTURE_START, FIXTURE_TUNING, makeFixtureContent } from './fixtures';

describe('time from ticks (F4)', () => {
  it('is exact at every minute and hour boundary, unlike accumulating 0.05', () => {
    const t = FIXTURE_TUNING.time;
    let acc = t.startMinute;
    let driftWrong = 0;
    for (let tick = 0; tick < TICKS_PER_GAME_DAY; tick++) {
      const exact = timeAtTick(tick, t).minuteOfDay;
      if (tick % 20 === 0) {
        expect(Number.isInteger(exact)).toBe(true);
        if (Math.floor(acc) !== exact) driftWrong++;
      }
      acc += 0.05;
    }
    // accumulation is late at some whole-minute boundaries; derivation never is
    expect(driftWrong).toBeGreaterThan(0);
    expect(timeAtTick(1200, t).minuteOfDay).toBe(600);
  });

  it('starts day 1 at 09:00 on a Thursday and rolls over midnight', () => {
    const t = FIXTURE_TUNING.time;
    expect(timeAtTick(0, t)).toMatchObject({ day: 1, minuteOfDay: 540, weekday: 'thu', phase: 'day' });
    const next = timeAtTick(15 * 60 * 20, t); // 15 hours later: 00:00 day 2
    expect(next).toMatchObject({ day: 2, minuteOfDay: 0, weekday: 'fri', phase: 'night' });
    expect(timeAtTick(1, t).minuteOfDay).toBeCloseTo(540.05, 10);
  });

  it('converts minutes to integer ticks', () => {
    expect(minutesToTicks(90)).toBe(1800);
    expect(minutesToTicks(0.05)).toBe(1);
    expect(phaseAt(1200, FIXTURE_TUNING.time.phases)).toBe('dusk');
  });
});

describe('events (F6)', () => {
  it('skips a handler unsubscribed during emit and survives a throwing handler', () => {
    const errors: string[] = [];
    const bus = createEventBus<{ ping: number }>({ onError: (_e, type) => errors.push(type) });
    const seen: string[] = [];
    let offB = (): void => {};
    bus.on('ping', () => {
      seen.push('a');
      offB();
    });
    offB = bus.on('ping', () => seen.push('b'));
    bus.on('ping', () => {
      throw new Error('ui exploded');
    });
    bus.on('ping', () => seen.push('d'));
    bus.emit('ping', 1);
    expect(seen).toEqual(['a', 'd']);
    expect(errors).toEqual(['ping']);
  });

  it('buffers sim events until flush, in order, including ones pushed while flushing', () => {
    const got: string[] = [];
    const q = createEventQueue((e) => {
      got.push(e.type);
      if (e.type === 'mode') q.push({ type: 'time.hour', day: 1, hour: 1 });
    });
    const toast: SimEvent = { type: 'mode', mode: 'live' };
    q.push(toast);
    q.push({ type: 'housewarming', status: 'ready' });
    expect(got).toEqual([]);
    expect(q.size).toBe(2);
    q.flush();
    expect(got).toEqual(['mode', 'housewarming', 'time.hour']);
    expect(q.size).toBe(0);
  });

  it('a throwing sim listener does not drop the rest', () => {
    const got: string[] = [];
    let first = true;
    const q = createEventQueue(
      (e) => {
        if (first) {
          first = false;
          throw new Error('x');
        }
        got.push(e.type);
      },
      () => {},
    );
    q.push({ type: 'mode', mode: 'live' });
    q.push({ type: 'mode', mode: 'build' });
    q.flush();
    expect(got).toEqual(['mode']);
  });
});

describe('item sprite keys (F14)', () => {
  const lamp = { id: asItemId('lamp_floor'), rotations: [0] as const, states: ['on'] as const };
  const player = { id: asItemId('record_player'), rotations: [0, 1, 2, 3] as const, states: ['on', 'overhead'] as const };

  it('derives rotation then state, flipping rotation 3', () => {
    expect(itemSpriteKey(lamp, 0, {}).key).toBe('item.lamp_floor');
    expect(itemSpriteKey(lamp, 0, { on: true }).key).toBe('item.lamp_floor.on');
    expect(itemSpriteKey(lamp, 0, { on: false }).key).toBe('item.lamp_floor');
    const r3 = itemSpriteKey(player, 3, { on: true });
    expect(r3).toMatchObject({ key: 'item.record_player.r1.on', flipX: true, overhead: 'item.record_player.r1.overhead' });
    expect(itemSpriteKey(player, 2, {}).key).toBe('item.record_player.r2');
  });

  it('ignores a state the item does not have and falls back when the atlas lacks it', () => {
    expect(itemSpriteKey(lamp, 0, { open: true }).key).toBe('item.lamp_floor');
    const has = (k: string): boolean => k !== 'item.record_player.r2.on';
    expect(itemSpriteKey(player, 2, { on: true }, (k) => has(k)).key).toBe('item.record_player.r2');
    expect(itemSpriteKey(lamp, 0, {}, () => false).overhead).toBeNull();
  });

  it('lists every key an item needs', () => {
    expect(itemSpriteKeys(lamp)).toEqual(['item.lamp_floor', 'item.lamp_floor.on'].map(asSpriteKey));
    const keys = itemSpriteKeys(player);
    expect(keys).toContain('item.record_player.r1.overhead');
    expect(keys).toHaveLength(9);
  });
});

describe('small rules', () => {
  it('autonomy comes from the source (N13)', () => {
    expect(isAutonomousSource('freeWill')).toBe(true);
    expect(isAutonomousSource('ai')).toBe(true);
    expect(isAutonomousSource('player')).toBe(false);
    expect(isAutonomousSource('script')).toBe(false);
  });

  it('stat names have one spelling (F20)', () => {
    expect(STAT.salemBoxSits).toBe('boxSat.salem');
    expect(progressStats({ kind: 'boxSat', subject: 'salem' })).toEqual(['boxSat', 'boxSat.salem']);
    expect(progressStats({ kind: 'photo' })).toEqual(['photo']);
    expect(statInteraction(asInteractionId('sofa.sit'))).toBe('interaction.sofa.sit');
    expect(FLAG.bruceOnWall).toBe('bruce.onWall');
    expect(RECORD.raceTotalMs).toBe('race.totalMs');
  });

  it('localDate formats the local calendar date (F35)', () => {
    const noon = new Date(2026, 11, 25, 12, 0, 0).getTime();
    expect(localDate(noon)).toBe('2026-12-25');
    expect(localDate(createManualClock(0, noon).wallNow())).toBe('2026-12-25');
  });
});

describe('musicContextOf (F27)', () => {
  it('reads mode, room, radio and housewarming from state; raceDay only inside the race', () => {
    const content = buildContentIndex(makeFixtureContent());
    const s = createEmptySimState(1, FIXTURE_START);
    s.lot.rooms[asRoomId('living')] = {
      id: asRoomId('living'),
      kind: 'living',
      outdoor: false,
      wallPaint: content.db.lot.rooms[0]!.wallPaint,
      floorPaint: content.db.lot.rooms[0]!.floorPaint,
      scored: true,
      area: 4,
      cosyRated: 0,
      cosyLive: 0,
    };
    const ellie = allocEntity(s);
    setC(s, 'meta', ellie, { kind: 'ellie', name: 'ellie', bornTick: 0 });
    setC(s, 'position', ellie, { pos: { x: 1, y: 1 }, prev: { x: 1, y: 1 }, layer: 0, facing: 'down', room: asRoomId('living') });
    expect(musicContextOf(s)).toMatchObject({ mode: 'live', room: 'living', radio: null, raceDay: false, housewarming: false, phase: 'day' });
    expect(musicContextOf(s, { title: true }).mode).toBe('title');
    s.environment.music = { station: 'heavy', source: asEntityId(9), untilTick: 100 };
    s.housewarming.status = 'happening';
    s.activity = { activity: RACE_ACTIVITY_ID, params: {}, actor: ellie, interaction: null, actionId: null, startedTick: 0, rngSeed: 5 };
    s.mode = 'activity';
    expect(musicContextOf(s)).toMatchObject({ radio: 'heavy', raceDay: true, housewarming: true, activity: 'act.race' });
    s.activity = { ...s.activity, activity: asActivityId('act.train.skierg') };
    expect(musicContextOf(s).raceDay).toBe(false);
  });
});

describe('load normalisation and validation (F34, F36)', () => {
  it('drops the session and its action, restores a soft-paused speed, goes back to live', () => {
    const s = createEmptySimState(1, FIXTURE_START);
    const ellie = allocEntity(s);
    setC(s, 'agent', ellie, {
      kind: 'ellie', name: 'ellie', queue: [], carrying: null, idleTicks: 0, asleep: false, cooldowns: {}, lastPick: null,
      current: { id: 4, interaction: asInteractionId('x'), target: null, tile: null, source: 'player', queuedTick: 0, phase: 'activity', slot: null, startedTick: 0, elapsedMinutes: 0, totalMinutes: null, fetch: [] },
    });
    s.activity = { activity: asActivityId('a'), params: {}, actor: ellie, interaction: null, actionId: 4, startedTick: 0, rngSeed: 1 };
    s.mode = 'activity';
    s.time.speed = 0;
    s.time.lastSpeed = 2;
    s.time.fastForward = 10;
    normaliseLoadedState(s);
    expect(s.mode).toBe('live');
    expect(s.activity).toBeNull();
    expect(s.time).toMatchObject({ speed: 2, fastForward: 1 });
    expect(s.components.agent[String(ellie)]?.current).toBeNull();
  });

  it('validates shape, fills additive fields and reconciles dropped content', () => {
    const content = buildContentIndex(makeFixtureContent());
    const good = createEmptySimState(3, FIXTURE_START);
    expect(validateSimState(JSON.parse(JSON.stringify(good)), FIXTURE_START)).toEqual([]);

    const old = JSON.parse(JSON.stringify(good)) as Record<string, unknown>;
    delete old.lastBuild;
    delete (old.time as Record<string, unknown>).lastSpeed;
    (old.hearts as Record<string, unknown>).balance = 'lots';
    const problems = validateSimState(old, FIXTURE_START);
    expect(problems).toContain('state.lastBuild: missing');
    expect(problems).toContain('state.time.lastSpeed: missing');
    expect(problems.some((p) => p.startsWith('state.hearts.balance'))).toBe(true);
    expect(validateSimState(5, FIXTURE_START)).toEqual(['state: not an object']);

    const s = JSON.parse(JSON.stringify(good)) as typeof good;
    delete (s as unknown as Record<string, unknown>).lastBuild;
    s.inventory.stored[asItemId('ghost')] = 2;
    s.inventory.stored[asItemId('sofa_small')] = 1;
    s.unlocks.outfits[asOutfit('gone')] = true;
    const notes = reconcileState(s, content);
    expect(s.lastBuild).toBeNull();
    expect(s.inventory.stored).toEqual({ sofa_small: 1 });
    expect(notes).toContain('inventory.stored: dropped ghost');
    expect(notes).toContain('unlocks.outfits: dropped gone');
    expect(hashState(fillMissing(s, FIXTURE_START))).toBe(hashState(s));
  });

  it('checks the migration chain', () => {
    const step = (from: number): { from: number; to: number; migrate: (r: never) => never } => ({ from, to: from + 1, migrate: (r) => r });
    expect(migrationChainProblems([], 1)).toEqual([]);
    expect(migrationChainProblems([step(1), step(2)], 3)).toEqual([]);
    expect(migrationChainProblems([step(1)], 3)).toEqual(['no migration from 2 to 3']);
    expect(migrationChainProblems([{ ...step(1), to: 3 }], 3).length).toBeGreaterThan(0);
    expect(migrationChainProblems([step(1), step(1)], 2)).toEqual(['migration from 1: defined twice']);
  });
});

function asOutfit(s: string): never {
  return s as never;
}
