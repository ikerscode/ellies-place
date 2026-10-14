/**
 * Aspirations (play.md 7.4): 4 x 4 tiers. MVP ships Hyrox Hero, Cat Royalty and Home Maker; Collector is full scope.
 * Tier Hearts come from ECONOMY.aspirationTierHearts (50 / 100 / 175 / 275), never from rewards.
 *
 * - Home Maker conditions follow FROZEN 8 (home.md 6.6), not play.md.
 * - Each tier's `gift` is one free copy: the home.md item unlocked by that tier that is closest to the
 *   gift play.md names (FROZEN 10). Pickle's `day:N` stock (FROZEN 11) may later take some of them out of the
 *   tier lists; a gift is a `grantItem`, so it still arrives.
 */
import { RECORD, STAT } from '../../../core/stats';
import { aspDescKey, aspNameKey, aspTierGoalKey, aspTierKey, aspTierRewardKey } from '../../../core/keys';
import {
  HYROX_ORDER,
  asAspirationId,
  asOutfitId,
  asTitleId,
  type AspirationDef,
  type AspirationKey,
  type AspirationTierDef,
  type AspirationTierNo,
  type Condition,
  type Effect,
} from '../../../core/types';
import { all, item, progress, sprite, statEver } from './helpers';

const outfit = (id: string): Effect => ({ kind: 'unlock', what: { kind: 'outfit', id: asOutfitId(id) } });
const title = (id: string): Effect => ({ kind: 'unlock', what: { kind: 'title', id: asTitleId(id) } });

interface TierRow {
  readonly goal: Condition;
  readonly gift: string;
  readonly rewards?: readonly Effect[];
}

const skillAtLeast5: Condition = all(...HYROX_ORDER.map((s): Condition => ({ kind: 'skill', skill: s, atLeast: 5 })));

/** play.md 7.4 Hyrox Hero. Gifts: pb_board / medal_hooks / trophy_shelf / champion_banner mapped to home.md ids. */
const HYROX: readonly TierRow[] = [
  { goal: statEver('train.sessions', 5), gift: 'gym_farmers_handles', rewards: [outfit('out.sweatband')] },
  { goal: progress('race', undefined, 1, 'ever'), gift: 'gym_sled_track', rewards: [outfit('out.race_kit')] },
  { goal: { kind: 'recordAtMost', record: RECORD.raceTotalMs, value: 90 * 60 * 1000 }, gift: 'gym_medal_rack', rewards: [outfit('out.trainers')] },
  // Overall PBs are counted from the start; the tier still pays only after tier 3 (the sim gates tiers in order).
  { goal: all(statEver('pb.raceTotal', 3), skillAtLeast5), gift: 'gym_trophy_podium', rewards: [outfit('out.gym_hoodie'), title('title.hyrox_hero')] },
];

/** play.md 7.4 Cat Royalty. */
const ROYALTY: readonly TierRow[] = [
  { goal: { kind: 'bond', cat: 'any', atLeast: 2 }, gift: 'cat_bed_round', rewards: [outfit('out.paw_clip')] },
  { goal: { kind: 'bond', cat: 'all', atLeast: 2 }, gift: 'cat_wall_steps' },
  {
    goal: all({ kind: 'flag', flag: 'george.knighted', value: true }, statEver(STAT.shadowLapMinutes, 1)),
    gift: 'cat_tree_tower',
    rewards: [outfit('out.bell_choker')],
  },
  // `sleep.catsOnBed` holds the most cats seen on her bed at one 03:00 check (contract request).
  { goal: all({ kind: 'bond', cat: 'all', atLeast: 4 }, statEver(STAT.catsOnBed, 4)), gift: 'portrait_four_cats', rewards: [outfit('out.cat_slippers'), title('title.cat_royalty')] },
];

/** play.md 7.4 Home Maker with FROZEN 8 thresholds. */
const HOME: readonly TierRow[] = [
  { goal: { kind: 'cosy', room: 'any', atLeast: 45, reading: 'rated' }, gift: 'plant_pothos_hanging' },
  { goal: { kind: 'setBonusCount', atLeast: 1 }, gift: 'garden_lantern_string', rewards: [outfit('out.cosy_jumper')] },
  { goal: all({ kind: 'roomsCosy', atLeast: 65, count: 3, reading: 'rated' }, { kind: 'setBonusCount', atLeast: 3 }), gift: 'lamp_floor_arc' },
  { goal: { kind: 'cosy', room: 'home', atLeast: 80, reading: 'rated' }, gift: 'lamp_stained_glass', rewards: [outfit('out.dungarees'), title('title.home_maker')] },
];

/** play.md 7.4 Collector (full scope). Gifts map to home.md items unlocked by the same tier. */
const COLLECT: readonly TierRow[] = [
  { goal: all(progress('trade', undefined, 1, 'ever'), statEver('photo', 5)), gift: 'frame_polaroids' },
  { goal: all({ kind: 'ownedCount', atLeast: 62, distinct: true }, statEver('photo', 20)), gift: 'lamp_lava' },
  { goal: all(progress('trade', undefined, 8, 'ever'), statEver('stickers.earned', 15)), gift: 'garden_telescope' },
  { goal: all({ kind: 'ownedCount', atLeast: 118, distinct: true }, statEver('photo', 50), statEver('critterbound.crew6')), gift: 'arcade_cabinet', rewards: [title('title.collector')] },
];

const tierDef = (a: AspirationKey, row: TierRow, i: number): AspirationTierDef => {
  const n = (i + 1) as AspirationTierNo;
  return {
    title: aspTierKey(a, n),
    goalText: aspTierGoalKey(a, n),
    rewardText: aspTierRewardKey(a, n),
    goal: row.goal,
    rewards: row.rewards ?? [],
    gift: item(row.gift),
  };
};

const def = (a: AspirationKey, tiers: readonly TierRow[], mvp: boolean): AspirationDef => ({
  id: asAspirationId(`asp.${a}`),
  name: aspNameKey(a),
  desc: aspDescKey(a),
  icon: sprite(`icon.asp.${a}`),
  tiers: tiers.map((t, i) => tierDef(a, t, i)),
  mvp,
});

export const aspirations: readonly AspirationDef[] = [
  def('hyrox', HYROX, true),
  def('royalty', ROYALTY, true),
  def('home', HOME, true),
  def('collect', COLLECT, false),
];

