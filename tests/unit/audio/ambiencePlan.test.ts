import { describe, expect, it } from 'vitest';
import type { MusicContext } from '../../../src/core/types';
import { SILENT_AMBIENCE, WINDOW_SHARE, ambiencePlan } from '../../../src/audio/ambiencePlan';

const base: MusicContext = {
  mode: 'live',
  activity: null,
  room: 'garden',
  phase: 'dawn',
  radio: null,
  weather: 'clear',
  raceDay: false,
  housewarming: false,
};
const ctx = (p: Partial<MusicContext>): MusicContext => ({ ...base, ...p });

describe('ambience plan', () => {
  it('birds by day, crickets at night', () => {
    expect(ambiencePlan(base)).toMatchObject({ birds: 1, crickets: 0, gardenAir: 1, roomTone: 0 });
    expect(ambiencePlan(ctx({ phase: 'night' }))).toMatchObject({ birds: 0, crickets: 1 });
  });

  it('indoors: room tone, outdoor sounds through the window', () => {
    const p = ambiencePlan(ctx({ room: 'bedroom' }));
    expect(p.roomTone).toBe(1);
    expect(p.gardenAir).toBe(0);
    expect(p.birds).toBeCloseTo(WINDOW_SHARE, 9);
  });

  it('rain quiets the birds and adds the rain bed', () => {
    const out = ambiencePlan(ctx({ weather: 'rain' }));
    expect(out.rain).toBe(1);
    expect(out.birds).toBeLessThan(0.2);
    expect(ambiencePlan(ctx({ weather: 'rain', room: 'kitchen' })).rain).toBeCloseTo(0.55, 9);
  });

  it('silent on the title screen', () => {
    expect(ambiencePlan(ctx({ mode: 'title' }))).toEqual(SILENT_AMBIENCE);
  });
});
