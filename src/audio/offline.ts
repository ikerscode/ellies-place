/**
 * Offline rendering for level checks (browser only: needs OfflineAudioContext).
 * Renders a track or a cue through the full master chain and returns the
 * measured peak and RMS of the output. Used by the measurement harness and
 * available to qa-engineer's Playwright specs.
 */
import type { MusicContext, MusicTrack } from '../core/types';
import { PLAYABLE_TRACKS, type PlayableTrack } from './arrangements';
import { ALL_CUE_NAMES, type Cue } from './cues';
import { AudioEngine } from './engine';
import { peakOf, rmsOf } from './dsp';

export interface RenderLevels {
  readonly peak: number;
  readonly rms: number;
}

const SR = 44100;

async function measure(seconds: number, setup: (e: AudioEngine) => void): Promise<RenderLevels> {
  const ac = new OfflineAudioContext(2, Math.ceil(seconds * SR), SR);
  // Full volume everywhere: the worst case for the ceiling.
  const e = new AudioEngine(ac, { music: 1, sfx: 1, ambience: 1 });
  setup(e);
  const buf = await ac.startRendering();
  let peak = 0;
  let rms = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    peak = Math.max(peak, peakOf(d));
    rms = Math.max(rms, rmsOf(d));
  }
  return { peak, rms };
}

const ctxFor = (track: PlayableTrack): MusicContext => ({
  mode: track === 'title' ? 'title' : 'live',
  activity: null,
  room: 'living',
  phase: track === 'night' ? 'night' : 'day',
  radio: track === 'heavy' || track === 'lofi' || track === 'cosy' ? track : null,
  weather: 'clear',
  raceDay: track === 'raceDay',
  housewarming: track === 'housewarming',
});

/** Renders `seconds` of one track (all bars scheduled up front). */
export function renderTrack(track: MusicTrack, seconds = 30): Promise<RenderLevels> {
  return measure(seconds, (e) => {
    if (track === 'none') return;
    if (track === 'gym') e.crossfade('gym', 0.05, 0);
    else e.setMusic(ctxFor(track));
    e.tick(0, seconds);
  });
}

/** Renders one cue (2.5 s). */
export function renderCue(cue: Cue): Promise<RenderLevels> {
  return measure(2.5, (e) => e.play(cue, 0.05));
}

/** Every playable track's levels, for the report. */
export async function renderAllTracks(seconds = 30): Promise<Record<string, RenderLevels>> {
  const out: Record<string, RenderLevels> = {};
  for (const t of PLAYABLE_TRACKS) out[t] = await renderTrack(t, seconds);
  return out;
}

/** Worst sfx peak over every cue name (payload cues use a representative payload). */
export async function renderAllCues(): Promise<Record<string, RenderLevels>> {
  const sample = (n: string): Cue => {
    switch (n) {
      case 'meow':
      case 'purr':
      case 'mrrp':
      case 'chirp':
      case 'huff':
        return { cue: n, cat: 'george' };
      case 'blip':
        return { cue: 'blip', voice: 'ellie' };
      case 'step':
        return { cue: 'step', floor: 'wood' };
      case 'gym.stroke':
        return { cue: 'gym.stroke', station: 'burpeeBroadJump' };
      case 'gym.hit':
        return { cue: 'gym.hit', grade: 'perfect' };
      case 'race.crowd':
        return { cue: 'race.crowd', intensity: 1 };
      default:
        return { cue: n } as Cue;
    }
  };
  const out: Record<string, RenderLevels> = {};
  for (const n of ALL_CUE_NAMES) out[n] = await renderCue(sample(n));
  return out;
}
