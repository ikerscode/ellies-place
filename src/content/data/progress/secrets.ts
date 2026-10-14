/**
 * Secret item unlocks (home.md 7.2) and Bruce's rules (play.md 10.2). A secret is a flag `secret.<id>`; the
 * matching `secret:<id>` item unlock gives a free first copy (FROZEN 12). Most secrets are set by a sticker
 * reward (stickers.ts); `pickle20` has no sticker, so the sim evaluates this table (contract request).
 */
import { secretFlagKey } from '../../../core/stats';
import { BRUCE_SPOTS, type BruceSpot, type Condition, type ItemId } from '../../../core/types';
import { didEver, flag, item, photo, statEver, progress, all } from './helpers';
import { STAT } from '../../../core/stats';

export interface SecretDef {
  readonly id: string;
  /** `secret.<id>`. */
  readonly flag: string;
  readonly goal: Condition;
  /** The free item the flag unlocks (`secret:<id>` in home.md). */
  readonly item: ItemId;
  /** Needs `PERSONAL.framedPrint`. */
  readonly onlyIfFramedPrint?: true;
}

const def = (id: string, goal: Condition, it: string, extra: { onlyIfFramedPrint?: true } = {}): SecretDef => ({
  id,
  flag: secretFlagKey(id),
  goal,
  item: item(it),
  ...extra,
});

export const secrets: readonly SecretDef[] = [
  def('bruce_all5', all(...BRUCE_SPOTS.map((s) => progress('bruceSpotted', s, 1, 'ever'))), 'bruce_wall_cushion'),
  def('housewarming', flag('housewarming.held'), 'frame_grazie', { onlyIfFramedPrint: true }),
  def('knighted', flag('george.knighted'), 'plaque_sir_ellie'),
  def('zoomies_photo', photo('zoomies_3am', 'ever'), 'frame_zoomies'),
  def('headbang_peaches', didEver('peaches.headbang_together'), 'poster_peaches_rock'),
  def('salem_boxes50', statEver(STAT.salemBoxSits, 50), 'box_throne_salem'),
  def('dunks10', statEver(STAT.perfectDunks, 10), 'rusk_tin_gold'),
  def('pickle20', statEver('delivery.received', 20), 'figurine_pickle'),
];

/** Bruce (play.md 10.2): from day 2, at most once a game day, one of 5 places, x3 weight for places not yet spotted. */
export const BRUCE_RULES = {
  fromDay: 2,
  maxPerDay: 1,
  visitMinutes: 120,
  unspottedWeight: 3,
  spots: BRUCE_SPOTS as readonly BruceSpot[],
  /** After all five he lives on the garden wall 08:00 to 20:00 (flag `bruce.onWall`). */
  wallFromMinute: 8 * 60,
  wallToMinute: 20 * 60,
} as const;
