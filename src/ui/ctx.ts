import type { AudioCue, SimpleCueName, SpriteKey, StringKey, StringVars, UiDeps } from '../core';

/** What every UI part shares. */
export interface UiCtx {
  readonly deps: UiDeps;
  str(key: StringKey, vars?: StringVars): string;
  /** `<img>`-ready data URL for a sprite, or null when the atlas is not ready or has no such key. */
  icon(key: SpriteKey, scale?: number): string | null;
  cue(name: SimpleCueName): void;
  cueRaw(cue: AudioCue): void;
  /** True when motion is reduced right now. */
  reduced(): boolean;
  /** Bubble and toast hold factor from text speed. */
  holdFactor(): number;
  /** CSS px per logical pixel. */
  scale(): number;
}
