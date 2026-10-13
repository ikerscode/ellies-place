import { describe, expect, it } from 'vitest';
import type { AudioCue, SimpleCueName as CoreSimple } from '../../../src/core/types';
import { ALL_CUE_NAMES, GYM_STATIONS, SIMPLE_CUES, fromCore, isCue, type Cue } from '../../../src/audio/cues';
import { HYROX_ORDER } from '../../../src/core/types';

describe('local cue union', () => {
  it('core AudioCue values are local cues (type-level superset)', () => {
    const core: AudioCue[] = [{ cue: 'ui.click' }, { cue: 'meow', cat: 'salem' }, { cue: 'gym.stroke', station: 'skiErg' }];
    const local: Cue[] = core.map(fromCore);
    expect(local).toEqual(core);
  });

  it('simple cue names are unique and include the core list', () => {
    expect(new Set(SIMPLE_CUES).size).toBe(SIMPLE_CUES.length);
    const sample: CoreSimple[] = ['ui.click', 'rusk.dunk', 'photo.shutter', 'door.knock', 'race.cheer', 'build.sell'];
    for (const s of sample) expect(SIMPLE_CUES).toContain(s);
  });

  it('gym stations cover every Hyrox station', () => {
    for (const s of HYROX_ORDER) expect(GYM_STATIONS).toContain(s);
  });

  it('isCue guards untyped input', () => {
    expect(isCue({ cue: 'ui.click' })).toBe(true);
    expect(isCue({ cue: 'nope' })).toBe(false);
    expect(isCue(null)).toBe(false);
    expect(ALL_CUE_NAMES).toContain('race.crowd');
  });
});
