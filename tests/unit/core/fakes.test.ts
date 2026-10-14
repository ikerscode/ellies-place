import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../../../src/core/content';
import { asEntityId } from '../../../src/core/types';
import { addFakeActor, makeFakeAtlas, makeFakeAudio, makeFakeBus, makeFakeEngine, makeFakeSim, makeFakeUi, makeFakeWorld, makeMemoryStorage, rejected } from './fakes';
import { makeFixtureContent } from './fixtures';

const content = buildContentIndex(makeFixtureContent());

describe('fakes', () => {
  it('bus records emits and still delivers', () => {
    const f = makeFakeBus();
    const got: string[] = [];
    f.bus.on('ui.toast', (t) => got.push(t.key));
    f.bus.emit('mode.changed', { mode: 'build', prev: 'live' });
    f.bus.emit('ui.toast', { key: 'ui.toast.x' as never });
    expect(got).toEqual(['ui.toast.x']);
    expect(f.of('mode.changed')).toEqual([{ mode: 'build', prev: 'live' }]);
  });

  it('sim records dispatches, steers answers and emits to listeners', () => {
    const sim = makeFakeSim(content);
    const ellie = addFakeActor(sim, 'ellie', 'ellie', { tx: 2, ty: 1 });
    expect(sim.findEntity({ kind: 'ellie' })).toBe(ellie);
    expect(sim.dispatch({ type: 'walkTo', tile: { tx: 1, ty: 1 } })).toEqual({ ok: true });
    sim.dispatchResult = rejected('queueFull');
    expect(sim.dispatch({ type: 'queue.cancel', actionId: 1 }).ok).toBe(false);
    expect(sim.dispatched).toHaveLength(2);
    const seen: string[] = [];
    const off = sim.onEvent((e) => seen.push(e.type));
    sim.emit({ type: 'mode', mode: 'live' });
    off();
    sim.emit({ type: 'mode', mode: 'build' });
    expect(seen).toEqual(['mode']);
    sim.step(5);
    expect(sim.state.time.tick).toBe(5);
    expect(sim.stepsPerTick()).toBe(1);
    sim.newGame(9);
    expect(sim.state.time.tick).toBe(0);
    expect(sim.world.sunbeams(sim.state)).toEqual([]);
  });

  it('world answers checks and cosy', () => {
    const w = makeFakeWorld(content);
    const sofa = content.db.items[0]!;
    const res = w.check(makeFakeSim(content).state, { item: sofa.id, tile: { tx: 1, ty: 1 }, rotation: 0, mount: { kind: 'floor' } });
    expect(res).toMatchObject({ ok: true });
    expect(res.tiles).toHaveLength(2);
    w.checkResult = { ok: false, reason: 'blocked', tiles: [] };
    expect(w.check(makeFakeSim(content).state, { item: sofa.id, tile: { tx: 1, ty: 1 }, rotation: 0, mount: { kind: 'floor' } }).ok).toBe(false);
    expect(w.cosy(makeFakeSim(content).state, content.db.lot.rooms[0]!.id).reading).toBe('rated');
  });

  it('engine, ui, audio and storage record', () => {
    const e = makeFakeEngine(makeFakeAtlas());
    e.start();
    const off = e.addRenderHook('hints', () => {});
    expect(e.hooks).toHaveLength(1);
    off();
    expect(e.hooks).toHaveLength(0);
    e.particles.emit('heart', { x: 1, y: 1 }, 3);
    expect(e.particles.live).toBe(1);

    const ui = makeFakeUi();
    ui.open('journal', { tab: 'wishes' });
    expect(ui.isOpen('journal')).toBe(true);
    ui.close();
    expect(ui.isOpen()).toBe(false);
    expect(() => ui.region('catalog')).toThrow(/happy-dom/);
    ui.showMenu({ target: asEntityId(1), tile: null, anchor: { x: 0, y: 0 }, options: [] });
    expect(ui.menus).toHaveLength(1);

    const a = makeFakeAudio();
    a.play({ cue: 'ui.click' });
    a.setMusic({ mode: 'live', activity: null, room: null, phase: 'day', radio: null, weather: 'clear', raceDay: false, housewarming: false });
    expect(a.played).toHaveLength(1);
    expect(a.music).toHaveLength(1);

    const s = makeMemoryStorage();
    s.setItem('a', '1');
    expect(s.getItem('a')).toBe('1');
    s.failWrites = true;
    expect(() => s.setItem('b', '2')).toThrow();
    expect(s.length).toBe(1);
  });
});
