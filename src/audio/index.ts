/**
 * Audio: game 1's procedural engine, arrangements, music state machine, ambience, sfx.
 * Owner: audio-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "audio". src/audio may keep a local Cue
 * union that is a superset of core AudioCue.
 */
import { notImplemented, type CreateAudio } from '../core';

export type { AudioApi, AudioDeps, AudioCue, MusicContext, MusicTrack } from '../core';

/** Listens to 'audio.cue' and 'music.context' on the bus; unlock() on first gesture. */
export const createAudio: CreateAudio = () => notImplemented('createAudio');
