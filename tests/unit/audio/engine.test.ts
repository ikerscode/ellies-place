import { describe, expect, it } from 'vitest';
import type { MusicContext } from '../../../src/core/types';
import { ARRANGEMENTS, PLAYABLE_TRACKS } from '../../../src/audio/arrangements';
import { ALL_CUE_NAMES, FLOOR_KINDS, GYM_STATIONS, MEOWERS, SIMPLE_CUES, VOICES, type Cue } from '../../../src/audio/cues';
import { AudioEngine, shapeFor, songFor, volumesFrom } from '../../../src/audio/engine';
import { makeKit } from '../../../src/audio/instruments';
import { THEME_SONG } from '../../../src/audio/notes';
import { MEOW, PURR, SIMPLE, VOICE, isMinigameCue } from '../../../src/audio/sfx';
import { DEFAULT_SETTINGS } from '../../../src/core/types';
import { FakeContext, asCtx } from './fakeAudio';

const ctx = (p: Partial<MusicContext> = {}): MusicContext => ({
  mode: 'live',
  activity: null,
  room: 'living',
  phase: 'day',
  radio: null,
  weather: 'clear',
  raceDay: false,
  housewarming: false,
  ...p,
});

describe('sfx tables', () => {
  it('keeps game 1 cat signatures', () => {
    expect(MEOW.salem).toEqual([1.55, 0.32]);
    expect(MEOW.shadow).toEqual([0.7, 0.62]);
    expect(PURR.salem[0]).toBe(27);
    expect(PURR.shadow[1]).toBe(220);
    expect(VOICE.ellie).toEqual([76, 'sine']);
  });

  it('every simple cue has a recipe', () => {
    for (const n of SIMPLE_CUES) expect(typeof SIMPLE[n]).toBe('function');
  });

  it('minigame routing', () => {
    expect(isMinigameCue('gym.rep')).toBe(true);
    expect(isMinigameCue('rusk.dunk')).toBe(true);
    expect(isMinigameCue('ui.click')).toBe(false);
  });
});

describe('engine on a fake context', () => {
  it('builds the graph: four buses, reverb, limiter chain, ceiling', () => {
    const f = new FakeContext();
    new AudioEngine(asCtx(f));
    expect(f.count('conv')).toBe(1);
    expect(f.count('comp')).toBe(2);
    expect(f.count('shaper')).toBe(1);
    expect(f.count('analyser')).toBe(1);
  });

  it('plays every cue with every payload without throwing', () => {
    const f = new FakeContext();
    const e = new AudioEngine(asCtx(f));
    const cues: Cue[] = [];
    for (const n of SIMPLE_CUES) cues.push({ cue: n });
    for (const cat of MEOWERS) for (const c of ['meow', 'purr', 'mrrp', 'chirp', 'huff'] as const) cues.push({ cue: c, cat });
    for (const voice of VOICES) cues.push({ cue: 'blip', voice });
    for (const floor of FLOOR_KINDS) cues.push({ cue: 'step', floor, wet: true });
    for (const station of GYM_STATIONS) cues.push({ cue: 'gym.stroke', station });
    for (const grade of ['perfect', 'good', 'miss'] as const) cues.push({ cue: 'gym.hit', grade });
    for (const intensity of [0, 0.5, 1, 7]) cues.push({ cue: 'race.crowd', intensity });
    const seen = new Set(cues.map((c) => c.cue));
    for (const n of ALL_CUE_NAMES) expect(seen.has(n), n).toBe(true);
    const before = f.nodes.length;
    for (const c of cues) e.play(c, 1);
    expect(f.nodes.length).toBeGreaterThan(before + cues.length);
  });

  it('every arrangement schedules a full loop and its alt loop', () => {
    for (const t of PLAYABLE_TRACKS) {
      const f = new FakeContext();
      const k = makeKit(asCtx(f));
      const out = f.createGain();
      for (const loop of [0, 1]) {
        for (let bar = 0; bar < 8; bar++) {
          ARRANGEMENTS[t].play({ k, song: songFor(t, 1), bar, loop, t: bar, beat: 0.5, out: out as unknown as AudioNode });
        }
      }
      expect(f.count('osc'), t).toBeGreaterThan(16);
    }
  });

  it('radio decks walk a playlist; theme decks loop forever', () => {
    expect(songFor('home', 3)).toBe(THEME_SONG);
    expect(songFor('lofi', 0)).toBe(THEME_SONG);
    expect(songFor('lofi', 1)).not.toBe(THEME_SONG);
    expect(shapeFor('home', 0)).toEqual({ bpm: 76, bars: 8, loops: Infinity });
    expect(shapeFor('heavy', 0).loops).toBe(2);
    expect(shapeFor('heavy', 2).bpm).toBe(songFor('heavy', 2).bpm);
  });

  it('setMusic crossfades between decks and schedules bars on tick', () => {
    const f = new FakeContext();
    const e = new AudioEngine(asCtx(f));
    e.setMusic(ctx());
    expect(e.currentTrack).toBe('home');
    const n0 = f.count('osc');
    e.tick(0);
    expect(f.count('osc')).toBeGreaterThan(n0);
    f.currentTime = 10;
    e.setMusic(ctx({ phase: 'night' }));
    expect(e.currentTrack).toBe('night');
    e.setMusic(ctx({ phase: 'night', room: 'kitchen' }));
    expect(e.currentTrack).toBe('night');
    e.setMusic(ctx({ radio: 'lofi', room: 'garden' }));
    expect(e.currentTrack).toBe('lofi');
    e.tick(10);
    f.currentTime = 30;
    expect(() => e.tick(30)).not.toThrow();
  });

  it('ducks and releases, and holds for letters', () => {
    const f = new FakeContext();
    const e = new AudioEngine(asCtx(f));
    e.duck(500);
    expect(e.ducking).toBe(true);
    f.currentTime = 5;
    expect(e.ducking).toBe(false);
    e.hold();
    f.currentTime = 100;
    expect(e.ducking).toBe(true);
    e.release();
    f.currentTime = 102;
    expect(e.ducking).toBe(false);
  });

  it('volumes come from settings and clamp', () => {
    expect(volumesFrom(DEFAULT_SETTINGS)).toEqual({ music: 0.7, sfx: 0.8, ambience: 0.6 });
    const f = new FakeContext();
    const e = new AudioEngine(asCtx(f));
    e.setVolumes({ music: 3, sfx: -1 });
    expect(e.getVolumes()).toEqual({ music: 1, sfx: 0, ambience: 0.6 });
  });

  it('levels read the analyser', () => {
    const e = new AudioEngine(asCtx(new FakeContext()));
    expect(e.levels()).toEqual({ peak: 0.25, rms: 0.25 });
  });
});
