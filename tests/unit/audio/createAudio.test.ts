import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../../../src/core/events';
import { DEFAULT_SETTINGS, type EpEvents } from '../../../src/core/types';
import { createAudio } from '../../../src/audio';
import { FakeContext } from './fakeAudio';

afterEach(() => {
  vi.unstubAllGlobals();
});

class StubContext extends FakeContext {
  state = 'suspended';
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

describe('createAudio', () => {
  it('does not create an AudioContext until unlock', async () => {
    const made: StubContext[] = [];
    vi.stubGlobal('AudioContext', class extends StubContext { constructor() { super(); made.push(this); } });
    const bus = createEventBus<EpEvents>();
    const a = createAudio({ bus, settings: () => DEFAULT_SETTINGS });
    bus.emit('audio.cue', { cue: 'ui.click' });
    bus.emit('music.context', { mode: 'live', activity: null, room: 'living', phase: 'night', radio: null, weather: 'clear', raceDay: false, housewarming: false });
    expect(made).toHaveLength(0);
    expect(a.unlocked).toBe(false);
    expect(a.levels()).toBeNull();
    await a.unlock();
    expect(made).toHaveLength(1);
    expect(a.unlocked).toBe(true);
    // The context sent before unlock is applied on unlock.
    expect(a.engine?.currentTrack).toBe('night');
    await a.unlock();
    expect(made).toHaveLength(1);
    bus.emit('audio.cue', { cue: 'meow', cat: 'peaches' });
    bus.emit('settings.changed', { ...DEFAULT_SETTINGS, musicVolume: 0.2 });
    expect(a.engine?.getVolumes().music).toBe(0.2);
    a.setVolumes({ sfx: 0.1 });
    expect(a.engine?.getVolumes().sfx).toBe(0.1);
    bus.emit('audio.cue', { cue: 'mail.open' });
    expect(a.engine?.ducking).toBe(true);
    a.dispose();
    expect(a.unlocked).toBe(false);
  });

  it('survives a missing Web Audio implementation', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const a = createAudio({ bus: createEventBus<EpEvents>(), settings: () => DEFAULT_SETTINGS });
    await a.unlock();
    expect(a.unlocked).toBe(false);
    a.play({ cue: 'ui.click' });
    a.dispose();
  });
});
