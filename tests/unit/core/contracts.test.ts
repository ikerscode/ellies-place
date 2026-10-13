/**
 * Contract smoke tests: every module exposes its entry point with the agreed
 * type, and the core interfaces can be implemented without casts.
 */
import { describe, expect, it } from 'vitest';
import { clearActivities, getActivity, listActivities, registerActivity } from '../../../src/activities';
import { createAudio } from '../../../src/audio';
import { createBuild } from '../../../src/build';
import { createContentDb } from '../../../src/content/data';
import { STRINGS } from '../../../src/content/strings';
import {
  asActivityId,
  asEntityId,
  createEventBus,
  forkRng,
  createRng,
  type Activity,
  type ActivityContext,
  type ActivityResult,
  type EpEvents,
  type PlayerAction,
  type SimPlugin,
  type CreateAudio,
  type CreateBuild,
  type CreateEngine,
  type CreateSave,
  type CreateSim,
  type CreateUi,
  type CreateWorld,
  type RegisterCats,
} from '../../../src/core';
import { createEngine } from '../../../src/engine';
import { createSave, MIGRATIONS } from '../../../src/save';
import { createSim } from '../../../src/sim';
import { registerCats } from '../../../src/sim/cats';
import { installTestHooks, isTestMode } from '../../../src/testing';
import { createUi } from '../../../src/ui';
import { createWorld } from '../../../src/world';

describe('module entry points', () => {
  it('exist with the contract types', () => {
    const entries: [string, unknown][] = [
      ['createEngine', createEngine satisfies CreateEngine],
      ['createSim', createSim satisfies CreateSim],
      ['registerCats', registerCats satisfies RegisterCats],
      ['createWorld', createWorld satisfies CreateWorld],
      ['createBuild', createBuild satisfies CreateBuild],
      ['createUi', createUi satisfies CreateUi],
      ['createAudio', createAudio satisfies CreateAudio],
      ['createSave', createSave satisfies CreateSave],
      ['createContentDb', createContentDb],
    ];
    for (const [name, fn] of entries) expect(typeof fn, name).toBe('function');
    expect(MIGRATIONS).toEqual([]);
    expect(typeof STRINGS).toBe('object');
  });

  it('test hooks only in test mode', () => {
    expect(isTestMode('?test=1')).toBe(true);
    expect(isTestMode('?test=0')).toBe(false);
    expect(isTestMode('')).toBe(false);
    expect(installTestHooks({} as never, '', {})).toBeNull();
  });
});

/** A complete minimal Activity: skip after two misses, results as data. */
function makeTapActivity(): Activity {
  let misses = 0;
  let hits = 0;
  let done: ActivityResult | null = null;
  const id = asActivityId('tap');
  const finish = (skipped: boolean): void => {
    done = {
      activity: id,
      completed: !skipped,
      skipped,
      score: skipped ? 0.5 : hits / 3,
      grade: 'okay',
      timeMs: null,
      effects: [{ kind: 'need', who: 'ellie', need: 'fun', delta: 10 }],
      progress: [{ kind: 'activity', subject: 'tap', n: 1 }],
    };
  };
  return {
    id,
    start(_ctx: ActivityContext) {
      misses = 0;
    },
    update() {},
    render() {},
    onInput(input) {
      if (input.type !== 'button' || !input.down) return;
      if (input.button === 'primary') hits++;
      else misses++;
      if (hits >= 3) finish(false);
    },
    canSkip: () => misses >= 2,
    skip: () => finish(true),
    result: () => done,
  };
}

describe('activity contract and registry', () => {
  it('registers, rejects duplicates and runs a minimal activity', () => {
    clearActivities();
    registerActivity({
      id: asActivityId('tap'),
      title: 'act.tap.title' as never,
      instructions: 'act.tap.howTo' as never,
      family: 'life',
      create: makeTapActivity,
    });
    expect(listActivities()).toHaveLength(1);
    expect(() =>
      registerActivity({ id: asActivityId('tap'), title: 'x' as never, instructions: 'x' as never, family: 'life', create: makeTapActivity }),
    ).toThrow(/already/);
    const a = getActivity(asActivityId('tap'))?.create({});
    if (!a) throw new Error('missing');
    a.onInput({ type: 'button', button: 'left', down: true });
    expect(a.canSkip()).toBe(false);
    a.onInput({ type: 'button', button: 'left', down: true });
    expect(a.canSkip()).toBe(true);
    a.skip();
    expect(a.result()?.skipped).toBe(true);
    clearActivities();
  });
});

describe('bus and actions', () => {
  it('carries world.changed and build.closed with typed payloads', () => {
    const bus = createEventBus<EpEvents>();
    const seen: string[] = [];
    bus.on('world.changed', (c) => seen.push(`${c.reason}:${c.revision}`));
    bus.on('build.closed', (c) => seen.push(`added:${c.added.length}`));
    bus.emit('world.changed', { reason: 'place', revision: 3, rooms: [], entities: [asEntityId(5)] });
    bus.emit('build.closed', { added: [asEntityId(5)], moved: [], removed: [], painted: [] });
    expect(seen).toEqual(['place:3', 'added:1']);
  });

  it('plugins type-check against action handlers', () => {
    const plugin: SimPlugin = {
      id: 'test',
      actions: {
        'build.sell': (_ctx, action) => (action.entity > 0 ? { ok: true } : { ok: false, reason: 'bad' }),
      },
    };
    const sell: PlayerAction = { type: 'build.sell', entity: asEntityId(1) };
    expect(plugin.actions?.['build.sell']?.({} as never, sell)).toEqual({ ok: true });
    expect(forkRng(createRng(1)).seed).toBeTypeOf('number');
  });
});
