/**
 * The housewarming (play.md 12, FROZEN 9). `unlockIf` is the trigger data-core copies into
 * `tuning.housewarming.unlockIf`; the flow, beats and rewards are here for the sim's scripted event.
 * Hearts (200) come from ECONOMY.housewarming. The framed print gift is only added when `PERSONAL.framedPrint`.
 */
import { asMailId, asStickerId, type Condition, type Effect, type StringKey } from '../../../core/types';
import { all, flag, grant, key, not, setFlag } from './helpers';

/** FROZEN 9: Home Cosy (rated) >= 60, every scored room >= 40, day >= 5, not yet held. */
export const HOUSEWARMING_UNLOCK_IF: Condition = all(
  { kind: 'cosy', room: 'home', atLeast: 60, reading: 'rated' },
  { kind: 'roomsCosy', atLeast: 40, count: 'all', reading: 'rated' },
  { kind: 'dayAtLeast', day: 5 },
  not(flag('housewarming.held')),
);

export interface HousewarmingBeat {
  readonly id: string;
  /** Minute of the evening (18:30 = 1110). */
  readonly at: number;
  /** Line keys (`hw.pickle.<n>` families list their first variant; the sim picks by `n`). */
  readonly lines: readonly StringKey[];
}

const at = (h: number, m: number): number => h * 60 + m;

export const HOUSEWARMING = {
  unlockIf: HOUSEWARMING_UNLOCK_IF,
  /** Buttons on `mail.pickle.housewarming_rsvp`; "Not tonight" leaves `hw.journal.throw` in the journal. */
  rsvp: { tonight: key('hw.rsvp.tonight'), later: key('hw.rsvp.later'), journalThrow: key('hw.journal.throw') },
  /** The party starts here on the evening she chose. Speed is locked to x1 from 19:00 until the credits end. */
  startMinute: at(18, 30),
  lockSpeedFromMinute: at(19, 0),
  /** A sleeping Ellie wakes for it. */
  wakesEllie: true,
  beats: [
    { id: 'ready', at: at(18, 30), lines: [key('hw.ready')] },
    { id: 'pickle', at: at(19, 0), lines: [key('hw.pickle.01'), key('hw.pickle.02')] },
    { id: 'poe', at: at(19, 20), lines: [key('hw.poe.01'), key('hw.poe.02')] },
    { id: 'bruce', at: at(19, 40), lines: [key('hw.bruce.01'), key('hw.bruce.02')] },
    { id: 'lanterns', at: at(20, 0), lines: [key('hw.lanterns')] },
    { id: 'photo', at: at(20, 20), lines: [key('hw.photo.caption')] },
    { id: 'dance', at: at(20, 40), lines: [] },
    { id: 'stars', at: at(21, 0), lines: [] },
    { id: 'credits', at: at(21, 15), lines: [key('hw.credits.01'), key('hw.credits.02'), key('hw.credits.03')] },
  ] as readonly HousewarmingBeat[],
  /** Guests leave one by one: `hw.bye.<guest>`. */
  goodbyes: [key('hw.bye.pickle'), key('hw.bye.poe'), key('hw.bye.bruce')] as readonly StringKey[],
  photoAutoTakeSeconds: 10,
} as const;

/**
 * Non-Hearts rewards when the night ends (play.md 12.3). `framedPrint` adds Pickle's separate gift (from 19:00 in
 * the flow; here it is the grant). Calm +30, Fun +30; the sticker and the peach streak; the thanks letter next morning
 * carries `keepsake_polaroid` (mapped to `frame_polaroids`).
 */
export function housewarmingRewards(framedPrint: boolean): readonly Effect[] {
  return [
    { kind: 'need', who: 'ellie', need: 'calm', delta: 30 },
    { kind: 'need', who: 'ellie', need: 'fun', delta: 30 },
    { kind: 'sticker', id: asStickerId('stk.housewarming') },
    setFlag('streak.peach'),
    setFlag('housewarming.held'),
    { kind: 'mail', id: asMailId('housewarming.thanks'), delayDays: 1 },
    ...(framedPrint ? [grant('frame_grazie')] : []),
  ];
}
