/**
 * Audio: game 1's procedural engine, arrangements, music state machine, ambience, sfx.
 * Owner: audio-dev. Contract: design/spec/contracts.md section "audio", spec: design/spec/audio.md.
 *
 * The AudioContext is created only inside unlock(), which the app calls from
 * the first user gesture. createAudio also arms its own one-shot gesture
 * listeners as a fallback. Before unlock, cues are dropped and the latest
 * MusicContext is kept so music starts in the right place.
 */
import type { AudioApi, AudioDeps, AudioLevels, MusicContext, Settings } from '../core';
import { fromCore, type Cue } from './cues';
import { AudioEngine, volumesFrom, type Volumes } from './engine';
import { LETTER_DUCK_MAX_MS, SHUTTER_DUCK_MS } from './musicState';
import { TICK_MS } from './scheduler';

export type { AudioApi, AudioDeps, AudioCue, MusicContext, MusicTrack } from '../core';
export type { Cue } from './cues';
export type { Volumes } from './engine';
export { AudioEngine } from './engine';

/** The contract API plus local conveniences. Assignable to AudioApi. */
export interface LocalAudioApi extends AudioApi {
  /** Accepts the local Cue union (a superset of AudioCue). */
  play(cue: Cue): void;
  /** Alias of setMusic. */
  setMusicState(ctx: MusicContext): void;
  /** Volumes 0..1 per bus; missing keys keep their value. */
  setVolumes(v: Partial<Volumes>): void;
  /** The live engine after unlock (null before). For tests and the meter page. */
  readonly engine: AudioEngine | null;
}

type AudioContextCtor = new () => AudioContext;

function findAudioContext(): AudioContextCtor | null {
  const g = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const;

export function createAudio(deps: AudioDeps): LocalAudioApi {
  let ac: AudioContext | null = null;
  let engine: AudioEngine | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let music: MusicContext | null = null;
  let volumes: Volumes = volumesFrom(deps.settings());
  let unlocking: Promise<void> | null = null;
  let disposed = false;
  let letterTimer: ReturnType<typeof setTimeout> | null = null;

  const target: EventTarget | null = typeof window !== 'undefined' ? window : null;
  const onGesture = (): void => {
    void api.unlock();
  };
  const disarm = (): void => {
    if (target) for (const ev of GESTURES) target.removeEventListener(ev, onGesture, true);
  };
  if (target) for (const ev of GESTURES) target.addEventListener(ev, onGesture, true);

  const releaseLetter = (): void => {
    if (letterTimer !== null) clearTimeout(letterTimer);
    letterTimer = null;
    engine?.release();
  };

  const play = (cue: Cue): void => {
    if (!engine || disposed) return;
    engine.play(cue);
    // Duck the music under the shutter and while a letter is open.
    if (cue.cue === 'photo.shutter') engine.duck(SHUTTER_DUCK_MS);
    else if (cue.cue === 'mail.open') {
      engine.hold();
      if (letterTimer !== null) clearTimeout(letterTimer);
      letterTimer = setTimeout(releaseLetter, LETTER_DUCK_MAX_MS);
    } else if (cue.cue === 'mail.close') releaseLetter();
  };

  const setMusic = (ctx: MusicContext): void => {
    music = ctx;
    engine?.setMusic(ctx);
  };

  const applySettings = (s: Settings): void => {
    volumes = volumesFrom(s);
    engine?.setVolumes(volumes);
  };

  const unsubs = [
    deps.bus.on('audio.cue', (c) => play(fromCore(c))),
    deps.bus.on('music.context', setMusic),
    deps.bus.on('settings.changed', applySettings),
    deps.bus.on('app.visibility', ({ hidden }) => {
      if (!ac) return;
      if (hidden) void ac.suspend().catch(() => undefined);
      else void ac.resume().catch(() => undefined);
    }),
  ];

  const api: LocalAudioApi = {
    get unlocked(): boolean {
      return engine !== null;
    },
    get engine(): AudioEngine | null {
      return engine;
    },
    unlock(): Promise<void> {
      if (disposed) return Promise.resolve();
      if (unlocking) return ac ? ac.resume().catch(() => undefined) : unlocking;
      const Ctor = findAudioContext();
      if (!Ctor) return (unlocking = Promise.resolve());
      try {
        ac = new Ctor();
        engine = new AudioEngine(ac, volumes);
      } catch {
        ac = null;
        engine = null;
        return (unlocking = Promise.resolve());
      }
      disarm();
      if (music) engine.setMusic(music);
      engine.tick();
      timer = setInterval(() => engine?.tick(), TICK_MS);
      unlocking = ac.resume().catch(() => undefined);
      return unlocking;
    },
    play,
    setMusic,
    setMusicState: setMusic,
    duck(ms: number): void {
      engine?.duck(ms);
    },
    applySettings,
    setVolumes(v: Partial<Volumes>): void {
      volumes = { ...volumes, ...v };
      engine?.setVolumes(volumes);
    },
    levels(): AudioLevels | null {
      return engine ? engine.levels() : null;
    },
    dispose(): void {
      disposed = true;
      disarm();
      for (const u of unsubs) u();
      if (timer !== null) clearInterval(timer);
      if (letterTimer !== null) clearTimeout(letterTimer);
      engine?.dispose();
      if (ac) void ac.close().catch(() => undefined);
      engine = null;
      ac = null;
    },
  };
  return api;
}

/** Compile-time check that createAudio matches the contract. */
export const CREATE_AUDIO_MATCHES_CONTRACT: import('../core').CreateAudio = createAudio;
