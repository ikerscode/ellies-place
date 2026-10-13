/**
 * The audio engine on one BaseAudioContext (a live AudioContext in the game,
 * an OfflineAudioContext in level tests). Owns the graph, the music decks,
 * the ambience layers and the duck. Timers live in index.ts; the engine only
 * does work when `tick()` is called.
 *
 * Graph (game 1's, plus a limiter and a hard ceiling):
 *
 *   decks -> music -> duck -> muffle -> level --+--> master(2.6) -> glue comp -> limiter -> ceiling -> analyser -> out
 *                                               +--> reverb send (0.7)
 *   sfx   ------------------------------------------+ (+ reverb send 0.25)
 *   mini  ------------------------------------------+ (+ reverb send 0.5)
 *   ambience beds and spots ------------------------+
 *   reverb (generated impulse, 2.8 s) -> 0.4 -> master
 */
import type { MusicContext, MusicTrack, Settings } from '../core/types';
import { AMB_TICK_MS, BED_GAIN, SILENT_AMBIENCE, SPOT_RATE, ambiencePlan, type AmbienceLevels } from './ambiencePlan';
import { ARRANGEMENTS, type PlayableTrack } from './arrangements';
import type { Cue } from './cues';
import { clamp01, fillBrown, fillImpulse, makeRand, makeSoftClipCurve, peakOf, rmsOf } from './dsp';
import { env, filter, gainNode, noiseHit, osc, tone, makeKit, type Kit } from './instruments';
import { THEME_SONG, type Song } from './notes';
import {
  DUCK_ATTACK_S,
  DUCK_GAIN,
  DUCK_RELEASE_S,
  isOutdoor,
  planTransition,
  type MusicDecision,
} from './musicState';
import { createDeckState, planBars, type DeckState, type TrackShape } from './scheduler';
import { playCue } from './sfx';
import { stationLoops, stationTrack, type StationId } from './songgen';

export interface Volumes {
  readonly music: number;
  readonly sfx: number;
  readonly ambience: number;
}

/** Bus trims at volume 1. Calibrated so default settings match game 1's mix. */
export const TRIM = { music: 0.85, ambience: 0.9, sfx: 1.25, mini: 1.2 } as const;
export const MASTER_GAIN = 2.6;
export const MUFFLE_HZ = 900;
export const OPEN_HZ = 20000;
export const MUFFLE_LEVEL = 0.6;

export const volumesFrom = (s: Pick<Settings, 'musicVolume' | 'sfxVolume' | 'ambienceVolume'>): Volumes => ({
  music: clamp01(s.musicVolume),
  sfx: clamp01(s.sfxVolume),
  ambience: clamp01(s.ambienceVolume),
});

interface Deck {
  readonly track: PlayableTrack;
  readonly gain: GainNode;
  readonly state: DeckState;
  /** Stop scheduling bars that start after this time (null while live). */
  stopAt: number | null;
}

const RADIO: ReadonlySet<MusicTrack> = new Set<MusicTrack>(['heavy', 'lofi', 'cosy']);
const isRadio = (t: MusicTrack): t is StationId => RADIO.has(t);

/** The song a deck plays for a playlist index. */
export function songFor(track: PlayableTrack, index: number): Song {
  return isRadio(track) ? stationTrack(track, index) : THEME_SONG;
}

/** Scheduler shape for a deck's playlist index. */
export function shapeFor(track: PlayableTrack, index: number): TrackShape {
  const song = songFor(track, index);
  return {
    bpm: song.bpm ?? ARRANGEMENTS[track].bpm,
    bars: song.chords.length,
    loops: isRadio(track) ? stationLoops(track) : Infinity,
  };
}

export class AudioEngine {
  readonly kit: Kit;
  readonly analyser: AnalyserNode;
  private readonly master: GainNode;
  private readonly musicBus: GainNode;
  private readonly duckGain: GainNode;
  private readonly muffle: BiquadFilterNode;
  private readonly levelGain: GainNode;
  private readonly sfxBus: GainNode;
  private readonly miniBus: GainNode;
  private readonly ambBus: GainNode;
  private readonly spotFilter: BiquadFilterNode;
  private readonly beds: { rain: GainNode; roomTone: GainNode; gardenAir: GainNode };
  private readonly bedSources: AudioBufferSourceNode[] = [];
  private readonly timeBuf: Float32Array<ArrayBuffer>;
  private readonly ambRand: () => number;
  private decks: Deck[] = [];
  private decision: MusicDecision | null = null;
  private context: MusicContext | null = null;
  private amb: AmbienceLevels = SILENT_AMBIENCE;
  private nextAmbTick = 0;
  private duckUntil = 0;
  private held = false;
  private volumes: Volumes;

  constructor(
    readonly ac: BaseAudioContext,
    volumes: Volumes = { music: 0.7, sfx: 0.8, ambience: 0.6 },
    seed = 0x0e11e,
  ) {
    this.volumes = volumes;
    const k = makeKit(ac, seed);
    this.kit = k;
    this.ambRand = makeRand(seed ^ 0xa3b1);

    // Output chain: master -> glue compressor -> limiter -> ceiling -> analyser -> destination.
    this.analyser = ac.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.connect(ac.destination);
    this.timeBuf = new Float32Array(this.analyser.fftSize);
    const ceiling = ac.createWaveShaper();
    ceiling.curve = makeSoftClipCurve() as Float32Array<ArrayBuffer>;
    ceiling.oversample = 'none'; // oversampling filters could ring past the ceiling
    ceiling.connect(this.analyser);
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;
    limiter.connect(ceiling);
    const glue = ac.createDynamicsCompressor();
    glue.threshold.value = -16;
    glue.ratio.value = 3;
    glue.connect(limiter);
    this.master = gainNode(k, glue, MASTER_GAIN);

    // Reverb with a generated impulse (game 1: 2.8 s, decay 2.6, return 0.4).
    const verb = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 2.8);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    const irRand = makeRand(seed ^ 0x5eb);
    for (let c = 0; c < 2; c++) fillImpulse(ir.getChannelData(c), 2.6, irRand);
    verb.buffer = ir;
    verb.connect(gainNode(k, this.master, 0.4));

    // Music: decks -> music -> duck -> muffle -> level -> master (+ reverb send).
    this.levelGain = gainNode(k, this.master, 1);
    this.levelGain.connect(gainNode(k, verb, 0.7));
    this.muffle = filter(k, 'lowpass', OPEN_HZ, 0.7, this.levelGain);
    this.duckGain = gainNode(k, this.muffle, 1);
    this.musicBus = gainNode(k, this.duckGain, volumes.music * TRIM.music);

    this.sfxBus = gainNode(k, this.master, volumes.sfx * TRIM.sfx);
    this.sfxBus.connect(gainNode(k, verb, 0.25));
    this.miniBus = gainNode(k, this.master, volumes.sfx * TRIM.mini);
    this.miniBus.connect(gainNode(k, verb, 0.5));

    // Ambience: three noise beds plus spot sounds through a window filter.
    this.ambBus = gainNode(k, this.master, volumes.ambience * TRIM.ambience);
    this.spotFilter = filter(k, 'lowpass', OPEN_HZ, 0.7, this.ambBus);
    const brown = ac.createBuffer(1, Math.floor(ac.sampleRate * 4), ac.sampleRate);
    fillBrown(brown.getChannelData(0), makeRand(seed ^ 0xb0));
    const bedOf = (buf: AudioBuffer, type: BiquadFilterType, hz: number, q: number): GainNode => {
      const g = gainNode(k, this.ambBus, 0);
      const f = filter(k, type, hz, q, g);
      const s = ac.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.connect(f);
      s.start();
      this.bedSources.push(s);
      return g;
    };
    this.beds = {
      rain: bedOf(k.noise, 'bandpass', 2600, 0.35),
      roomTone: bedOf(brown, 'lowpass', 180, 0.7),
      gardenAir: bedOf(k.noise, 'lowpass', 380, 0.7),
    };
  }

  get now(): number {
    return this.ac.currentTime;
  }

  get currentTrack(): MusicTrack {
    return this.decision?.track ?? 'none';
  }

  // ---- volumes --------------------------------------------------------------

  setVolumes(v: Partial<Volumes>): void {
    this.volumes = {
      music: clamp01(v.music ?? this.volumes.music),
      sfx: clamp01(v.sfx ?? this.volumes.sfx),
      ambience: clamp01(v.ambience ?? this.volumes.ambience),
    };
    const t = this.now;
    this.musicBus.gain.setTargetAtTime(this.volumes.music * TRIM.music, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx * TRIM.sfx, t, 0.1);
    this.miniBus.gain.setTargetAtTime(this.volumes.sfx * TRIM.mini, t, 0.1);
    this.ambBus.gain.setTargetAtTime(this.volumes.ambience * TRIM.ambience, t, 0.1);
  }

  getVolumes(): Volumes {
    return this.volumes;
  }

  // ---- sfx ------------------------------------------------------------------

  play(cue: Cue, at?: number): void {
    const wet = this.context !== null && this.context.weather === 'rain' && isOutdoor(this.context.room);
    playCue(this.kit, { sfx: this.sfxBus, mini: this.miniBus }, cue, at ?? this.now + 0.01, wet);
  }

  // ---- music ------------------------------------------------------------------

  setMusic(ctx: MusicContext): void {
    this.context = ctx;
    const { next, transition } = planTransition(this.decision, ctx);
    this.decision = next;
    const t = this.now;
    if (transition.kind === 'crossfade') this.crossfade(transition.to, transition.seconds, t);
    if (transition.kind !== 'none') this.applyMuffle(next, transition.kind === 'adjust' ? transition.seconds : 0.3, t);
    this.applyAmbience(ambiencePlan(ctx), t);
  }

  /** Starts `track` on a fresh deck and fades every other deck out. */
  crossfade(track: MusicTrack, seconds: number, t = this.now): void {
    const fade = Math.max(0.05, seconds);
    for (const d of this.decks) {
      if (d.stopAt !== null) continue;
      d.gain.gain.cancelScheduledValues(t);
      d.gain.gain.setValueAtTime(Math.max(0.0001, d.gain.gain.value), t);
      d.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
      d.stopAt = t + fade;
    }
    if (track === 'none') return;
    const g = gainNode(this.kit, this.musicBus, 0.0001);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + fade);
    this.decks.push({ track, gain: g, state: createDeckState(t + 0.1), stopAt: null });
  }

  private applyMuffle(d: MusicDecision, seconds: number, t: number): void {
    const tc = Math.max(0.02, seconds / 3);
    this.muffle.frequency.setTargetAtTime(d.muffled ? MUFFLE_HZ : OPEN_HZ, t, tc);
    this.levelGain.gain.setTargetAtTime(d.level * (d.muffled ? MUFFLE_LEVEL : 1), t, tc);
  }

  /** Ducks the music for `ms`; overlapping ducks extend the hold. */
  duck(ms: number, t = this.now): void {
    this.duckUntil = Math.max(this.duckUntil, t + DUCK_ATTACK_S + Math.max(0, ms) / 1000);
    this.rescheduleDuck(t);
  }

  /** Holds the duck until release() (an open letter). */
  hold(t = this.now): void {
    this.held = true;
    this.duck(0, t);
  }

  release(t = this.now): void {
    this.held = false;
    this.duckUntil = Math.max(this.duckUntil, t);
    this.rescheduleDuck(t);
  }

  get ducking(): boolean {
    return this.held || this.now < this.duckUntil + DUCK_RELEASE_S;
  }

  private rescheduleDuck(t: number): void {
    const g = this.duckGain.gain;
    const from = Math.max(DUCK_GAIN, Math.min(1, g.value));
    g.cancelScheduledValues(t);
    g.setValueAtTime(from, t);
    g.linearRampToValueAtTime(DUCK_GAIN, t + DUCK_ATTACK_S);
    if (this.held) return;
    const at = Math.max(this.duckUntil, t + DUCK_ATTACK_S);
    g.setValueAtTime(DUCK_GAIN, at);
    g.linearRampToValueAtTime(1, at + DUCK_RELEASE_S);
  }

  /** Schedules everything due: music bars (lookahead) and ambience spots. */
  tick(now = this.now, lookahead?: number): void {
    for (const d of this.decks) {
      const bars = planBars(d.state, now, (i) => shapeFor(d.track, i), lookahead);
      for (const b of bars) {
        if (d.stopAt !== null && b.t >= d.stopAt) continue;
        ARRANGEMENTS[d.track].play({
          k: this.kit,
          song: songFor(d.track, b.track),
          bar: b.bar,
          loop: b.loop,
          t: b.t,
          beat: b.beat,
          out: d.gain,
        });
      }
    }
    // Drop decks that have faded out, once their last notes have rung.
    this.decks = this.decks.filter((d) => {
      if (d.stopAt === null || now < d.stopAt + 4) return true;
      d.gain.disconnect();
      return false;
    });
    while (this.nextAmbTick <= now) {
      this.ambienceSpots(Math.max(this.nextAmbTick, now) + 0.05);
      this.nextAmbTick = Math.max(this.nextAmbTick, now) + AMB_TICK_MS / 1000;
    }
  }

  // ---- ambience ---------------------------------------------------------------

  private applyAmbience(p: AmbienceLevels, t: number): void {
    this.amb = p;
    this.beds.rain.gain.setTargetAtTime(p.rain * BED_GAIN.rain, t, 0.5);
    this.beds.roomTone.gain.setTargetAtTime(p.roomTone * BED_GAIN.roomTone, t, 0.6);
    this.beds.gardenAir.gain.setTargetAtTime(p.gardenAir * BED_GAIN.gardenAir, t, 0.6);
    this.spotFilter.frequency.setTargetAtTime(p.roomTone > 0 ? 2500 : OPEN_HZ, t, 0.3);
  }

  private ambienceSpots(t: number): void {
    const k = this.kit;
    const r = this.ambRand;
    const out = this.spotFilter;
    const a = this.amb;
    if (a.birds > 0 && r() < SPOT_RATE.birds * a.birds) {
      const n = 2 + Math.floor(r() * 3);
      const f = 2600 + r() * 1400;
      for (let i = 0; i < n; i++) tone(k, 'sine', f, f * (1.25 + r() * 0.3), t + i * (0.08 + r() * 0.05), 0.06, 0.012 * a.birds + 0.004, out, 0.01);
    }
    if (a.crickets > 0 && r() < SPOT_RATE.crickets * a.crickets) {
      const f = 4300 + r() * 500;
      for (let i = 0; i < 3; i++) {
        const g = gainNode(k, out, 0);
        env(g, t + i * 0.06, 0.005, 0.01 * Math.min(1, a.crickets + 0.3), 0.035);
        osc(k, 'sine', f, t + i * 0.06, 0.05, g);
      }
    }
    if (a.rain > 0 && r() < SPOT_RATE.drips * a.rain) {
      const g = gainNode(k, out, 0);
      env(g, t, 0.002, 0.03, 0.12);
      const o = osc(k, 'sine', 900 + r() * 600, t, 0.15, g);
      o.frequency.exponentialRampToValueAtTime(1900, t + 0.1);
    }
    if (a.roomTone > 0 && r() < 0.01) noiseHit(k, t, 0.006, 'bandpass', 1200, 0.03, 2, this.ambBus);
  }

  // ---- metering ---------------------------------------------------------------

  levels(): { peak: number; rms: number } {
    this.analyser.getFloatTimeDomainData(this.timeBuf);
    return { peak: peakOf(this.timeBuf), rms: rmsOf(this.timeBuf) };
  }

  dispose(): void {
    for (const s of this.bedSources) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    }
    for (const d of this.decks) d.gain.disconnect();
    this.decks = [];
    this.master.disconnect();
  }
}
