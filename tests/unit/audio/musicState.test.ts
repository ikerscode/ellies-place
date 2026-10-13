import { describe, expect, it } from 'vitest';
import type { ActivityId, MusicContext } from '../../../src/core/types';
import {
  DUCK_GAIN,
  PHOTO_LEVEL,
  chooseTrack,
  crossfadeSeconds,
  duckEnvelope,
  duckReleaseAt,
  isGymActivity,
  planTransition,
} from '../../../src/audio/musicState';

const base: MusicContext = {
  mode: 'live',
  activity: null,
  room: 'living',
  phase: 'day',
  radio: null,
  weather: 'clear',
  raceDay: false,
  housewarming: false,
};
const ctx = (p: Partial<MusicContext>): MusicContext => ({ ...base, ...p });
const act = (s: string): ActivityId => s as ActivityId;

describe('music state machine: track choice', () => {
  it('home by day, night at night', () => {
    expect(chooseTrack(base).track).toBe('home');
    expect(chooseTrack(ctx({ phase: 'morning' })).track).toBe('home');
    expect(chooseTrack(ctx({ phase: 'evening' })).track).toBe('home');
    expect(chooseTrack(ctx({ phase: 'night' })).track).toBe('night');
  });

  it('title screen plays the title arrangement', () => {
    expect(chooseTrack(ctx({ mode: 'title', radio: 'heavy' })).track).toBe('title');
  });

  it('the radio beats the clock, and is muffled from the garden', () => {
    expect(chooseTrack(ctx({ radio: 'heavy', phase: 'night' }))).toEqual({ track: 'heavy', muffled: false, level: 1 });
    expect(chooseTrack(ctx({ radio: 'lofi', room: 'garden' }))).toEqual({ track: 'lofi', muffled: true, level: 1 });
    expect(chooseTrack(ctx({ radio: 'cosy', room: 'frontStep' })).muffled).toBe(true);
  });

  it('gym activities drive the gym track; others keep the room music', () => {
    expect(chooseTrack(ctx({ mode: 'activity', activity: act('gym.skiErg') })).track).toBe('gym');
    expect(chooseTrack(ctx({ mode: 'activity', activity: act('hyrox.wallBalls'), radio: 'cosy' })).track).toBe('gym');
    expect(chooseTrack(ctx({ mode: 'activity', activity: act('rusk.dunk') })).track).toBe('home');
    expect(chooseTrack(ctx({ mode: 'activity', activity: act('rusk.dunk'), radio: 'lofi' })).track).toBe('lofi');
    expect(isGymActivity(null)).toBe(false);
  });

  it('race day and housewarming outrank everything but the title', () => {
    expect(chooseTrack(ctx({ raceDay: true, radio: 'heavy' })).track).toBe('raceDay');
    expect(chooseTrack(ctx({ mode: 'activity', activity: act('hyrox.race') })).track).toBe('raceDay');
    expect(chooseTrack(ctx({ housewarming: true, raceDay: true })).track).toBe('housewarming');
  });

  it('photo mode sits the music back', () => {
    expect(chooseTrack(ctx({ mode: 'photo' })).level).toBe(PHOTO_LEVEL);
    expect(chooseTrack(ctx({ mode: 'build' })).level).toBe(1);
  });
});

describe('music state machine: transitions', () => {
  it('first context fades in from silence', () => {
    const { transition } = planTransition(null, base);
    expect(transition).toEqual({ kind: 'crossfade', from: 'none', to: 'home', seconds: 2 });
  });

  it('no-op when nothing audible changes (room to room indoors)', () => {
    const a = planTransition(null, base).next;
    expect(planTransition(a, ctx({ room: 'kitchen' })).transition.kind).toBe('none');
  });

  it('crossfades on a track change, adjusts on muffle or level', () => {
    const a = planTransition(null, ctx({ radio: 'lofi' })).next;
    expect(planTransition(a, ctx({ radio: 'heavy' })).transition).toEqual({ kind: 'crossfade', from: 'lofi', to: 'heavy', seconds: 0.6 });
    const out = planTransition(a, ctx({ radio: 'lofi', room: 'garden' }));
    expect(out.transition).toMatchObject({ kind: 'adjust', muffled: true, level: 1 });
    const photo = planTransition(a, ctx({ radio: 'lofi', mode: 'photo' }));
    expect(photo.transition).toMatchObject({ kind: 'adjust', muffled: false, level: PHOTO_LEVEL });
  });

  it('crossfade times', () => {
    expect(crossfadeSeconds('home', 'home')).toBe(0);
    expect(crossfadeSeconds('home', 'night')).toBe(4);
    expect(crossfadeSeconds('night', 'home')).toBe(4);
    expect(crossfadeSeconds('home', 'gym')).toBe(1);
    expect(crossfadeSeconds('raceDay', 'home')).toBe(1);
    expect(crossfadeSeconds('title', 'home')).toBe(3);
    expect(crossfadeSeconds('home', 'none')).toBe(1.5);
    expect(crossfadeSeconds('home', 'housewarming')).toBe(1.5);
    expect(crossfadeSeconds('gym', 'heavy')).toBe(0.6);
  });
});

describe('ducking', () => {
  it('envelope: attack, hold, release back to unity', () => {
    const e = duckEnvelope(10, 500);
    expect(e[0]).toEqual([10, 1]);
    expect(e[1]?.[1]).toBe(DUCK_GAIN);
    expect(e[2]?.[0]).toBeCloseTo(10.58, 9);
    expect(e[3]?.[1]).toBe(1);
  });

  it('overlapping ducks release at the latest end', () => {
    expect(duckReleaseAt([], 5)).toBeNull();
    expect(duckReleaseAt([4], 5)).toBeNull();
    expect(duckReleaseAt([6, 9, 7], 5)).toBe(9);
  });
});
