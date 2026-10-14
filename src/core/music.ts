/**
 * MusicContext from state (F27): the one place that decides what the music state machine hears,
 * so the integrator and the tests do not each derive it.
 */
import { entitiesWith, getC } from './state';
import type { ActivityId, DeepReadonly, MusicContext, RoomKind, SimState } from './types';
import { asActivityId } from './types';

/** The race activity. `raceDay` in MusicContext is true only while it runs, never merely on a Saturday. */
export const RACE_ACTIVITY_ID: ActivityId = asActivityId('act.race');

export interface MusicContextOptions {
  /** True on the title screen (the app knows; the state does not). */
  readonly title?: boolean;
}

/** Ellie's room kind, or null when she has no room (walking between, or not spawned). */
function ellieRoomKind(state: DeepReadonly<SimState>): RoomKind | null {
  for (const id of entitiesWith(state as SimState, 'meta')) {
    const meta = getC(state as SimState, 'meta', id);
    if (meta?.kind !== 'ellie') continue;
    const room = getC(state as SimState, 'position', id)?.room ?? null;
    return room === null ? null : (state.lot.rooms[room]?.kind ?? null);
  }
  return null;
}

export function musicContextOf(state: DeepReadonly<SimState>, opts: MusicContextOptions = {}): MusicContext {
  const activity = state.activity?.activity ?? null;
  const radio = state.environment.music?.station ?? null;
  return {
    mode: opts.title ? 'title' : state.mode,
    activity,
    room: ellieRoomKind(state),
    phase: state.time.phase,
    radio,
    weather: state.environment.weather,
    raceDay: activity !== null && activity === RACE_ACTIVITY_ID,
    housewarming: state.housewarming.status === 'happening',
  };
}
