/**
 * The daily wishes pool (play.md 7.3): 60 rows, 30 MVP. Hearts come from ECONOMY.wishHearts[size]
 * (15 / 25 / 40 -> small / medium / large); the only non-Hearts reward is the mood boost, +8 for
 * 90 minutes for every size (FROZEN 26; play.md's +5/+8/+12 is void). The swap is cut (FROZEN 26).
 * "Today" counters count since the morning roll. Counters that the spec names but `core/stats.ts`
 * does not define carry the `wish.*`-free names listed in reports/contract-requests/data-progress.md.
 */
import { STAT } from '../../../core/stats';
import { wishTitleKey } from '../../../core/keys';
import { HYROX_ORDER, asWishId, type Condition, type Effect, type WishCategory, type WishDef, type WishSize } from '../../../core/types';
import { ALWAYS, all, any, between, bond, dayAtLeast, did, hearts, hhmm, key, not, notRaining, owns, photo, progress, sprite, stat, statEver } from './helpers';
import { posture, seen } from './wishConds';

/** The mood boost every wish gives (sim.md 3.2 `moodlet.wish_done`: +8 for 90 game minutes). */
export const WISH_MOOD_BOOST: Effect = {
  kind: 'feeling',
  id: 'moodlet.wish_done',
  label: key('ui.feeling.wish_done'),
  icon: sprite('icon.wish.boost'),
  mood: 8,
  minutes: 90,
};

/** The three fixed day-1 wishes, rolled at the end of onboarding (play.md 7.1). */
export const DAY_ONE_WISHES = ['bow_george', 'coffee_rusk_grass', 'play_heavy'] as const;
/** On Saturdays this wish takes one extra slot outside the caps (play.md 7.1). */
export const RACE_DAY_WISH = 'race_today';

interface Row {
  readonly id: string;
  readonly cat: WishCategory;
  readonly size: WishSize;
  readonly offer: Condition;
  readonly goal: Condition;
  readonly mvp: boolean;
}

const S = 'small' as const;
const M = 'medium' as const;
const L = 'large' as const;
const Y = true;
const F = false;

const trainAny: Condition = any(...HYROX_ORDER.map((s) => did(`gym.${s}.train`)));

const ROWS: readonly Row[] = [
  // george
  { id: 'bow_george', cat: 'george', size: S, offer: ALWAYS, goal: did('george.bow'), mvp: Y },
  { id: 'serve_george_first', cat: 'george', size: S, offer: between(0, hhmm(10)), goal: stat('bowls.georgeFirst'), mvp: F },
  { id: 'george_approves', cat: 'george', size: M, offer: hearts(10), goal: stat('george.approvals'), mvp: Y },
  { id: 'george_perch', cat: 'george', size: M, offer: { kind: 'ownedCount', atLeast: 1, tag: 'perch' }, goal: seen('george', 'nap', { forMinutes: 30, layer: 2 }), mvp: F },
  { id: 'george_pillow', cat: 'george', size: S, offer: ALWAYS, goal: stat('george.pillowNight'), mvp: F },
  // salem
  { id: 'laser_salem', cat: 'salem', size: S, offer: ALWAYS, goal: did('cat.play_laser'), mvp: Y },
  { id: 'ham_salem', cat: 'salem', size: S, offer: ALWAYS, goal: did('fridge.give_ham'), mvp: Y },
  { id: 'salem_box', cat: 'salem', size: S, offer: any(statEver('itemBought'), statEver(STAT.salemBoxSits)), goal: seen('salem', 'in_box'), mvp: Y },
  { id: 'salem_zoomies', cat: 'salem', size: S, offer: ALWAYS, goal: seen('salem', 'zoomies'), mvp: F },
  { id: 'feather_salem', cat: 'salem', size: S, offer: ALWAYS, goal: did('cat.play_wand'), mvp: F },
  // shadow
  { id: 'shadow_near', cat: 'shadow', size: M, offer: ALWAYS, goal: all(seen('shadow', 'near', { forMinutes: 10, radius: 2 }), posture('sit')), mvp: Y },
  { id: 'shadow_spot', cat: 'shadow', size: S, offer: ALWAYS, goal: seen('shadow', 'hiding', { tag: 'solitude' }), mvp: F },
  { id: 'shadow_lap', cat: 'shadow', size: L, offer: bond('shadow', 3), goal: all(did('bookshelf.read'), stat(STAT.shadowLapMinutes, 10)), mvp: F },
  { id: 'shadow_pet', cat: 'shadow', size: S, offer: bond('shadow', 1), goal: stat('pet.shadowStayed'), mvp: F },
  // peaches
  { id: 'peaches_sunbeam', cat: 'peaches', size: S, offer: all(between(0, hhmm(15)), notRaining), goal: seen('peaches', 'sunbeam'), mvp: Y },
  { id: 'peaches_music', cat: 'peaches', size: S, offer: ALWAYS, goal: stat('music.peachesMinutes', 10), mvp: Y },
  { id: 'peaches_brush', cat: 'peaches', size: S, offer: ALWAYS, goal: stat('brush.peaches'), mvp: F },
  { id: 'peaches_headbang', cat: 'peaches', size: L, offer: bond('peaches', 2), goal: did('peaches.headbang_together'), mvp: F },
  // cats
  { id: 'feed_all', cat: 'cats', size: S, offer: ALWAYS, goal: stat('bowls.allFed'), mvp: Y },
  { id: 'photo_all_four', cat: 'cats', size: L, offer: dayAtLeast(2), goal: photo('all_four'), mvp: Y },
  { id: 'cats_one_room', cat: 'cats', size: M, offer: dayAtLeast(3), goal: stat('cats.allInRoom'), mvp: F },
  { id: 'play_each', cat: 'cats', size: L, offer: ALWAYS, goal: stat('play.allFour'), mvp: F },
  { id: 'cat_gift', cat: 'cats', size: M, offer: hearts(35), goal: stat('order.styleCat'), mvp: F },
  // food
  { id: 'make_sushi', cat: 'food', size: M, offer: ALWAYS, goal: did('counter.make_sushi'), mvp: Y },
  { id: 'sushi_great', cat: 'food', size: L, offer: statEver(STAT.sushiMade), goal: stat('sushi.great'), mvp: F },
  { id: 'sushi_inari', cat: 'food', size: S, offer: statEver(STAT.sushiMade), goal: stat('sushi.inari'), mvp: F },
  { id: 'coffee_rusk_grass', cat: 'food', size: M, offer: ALWAYS, goal: did('grass.rusk_ritual'), mvp: Y },
  { id: 'perfect_dunk', cat: 'food', size: M, offer: statEver(STAT.ritualsDone), goal: stat(STAT.perfectDunks), mvp: Y },
  { id: 'morning_coffee', cat: 'food', size: S, offer: between(0, hhmm(8, 30)), goal: all(did('mug.drink'), between(0, hhmm(9))), mvp: F },
  { id: 'latte_art', cat: 'food', size: M, offer: owns('coffee_machine'), goal: stat('coffee.latte'), mvp: F },
  { id: 'eat_table', cat: 'food', size: S, offer: ALWAYS, goal: stat('eat.atTable'), mvp: F },
  { id: 'toast', cat: 'food', size: S, offer: between(0, hhmm(10)), goal: all(did('counter.make_toast'), between(0, hhmm(11))), mvp: F },
  // hyrox
  { id: 'train_any', cat: 'hyrox', size: S, offer: ALWAYS, goal: trainAny, mvp: Y },
  { id: 'train_two', cat: 'hyrox', size: M, offer: { kind: 'ownedCount', atLeast: 1, category: 'gym' }, goal: stat('train.stations', 2), mvp: F },
  { id: 'station_pb', cat: 'hyrox', size: M, offer: any(...HYROX_ORDER.map((s) => ({ kind: 'recordAtLeast', record: `train.points.${s}`, value: 1 }) as Condition)), goal: progress('pb'), mvp: Y },
  { id: 'go_run', cat: 'hyrox', size: S, offer: ALWAYS, goal: any(did('front_door.run'), did('gym.treadmill.run')), mvp: Y },
  { id: 'race_today', cat: 'hyrox', size: L, offer: { kind: 'weekday', days: ['sat'] }, goal: progress('race'), mvp: Y },
  { id: 'skill_up', cat: 'hyrox', size: M, offer: ALWAYS, goal: stat('skill.levelUp'), mvp: F },
  { id: 'wallballs_great', cat: 'hyrox', size: M, offer: owns('gym_wallball_target'), goal: stat('train.great.wallBalls'), mvp: F },
  // music
  { id: 'play_heavy', cat: 'music', size: S, offer: ALWAYS, goal: stat('music.heavyMinutes', 10), mvp: Y },
  { id: 'headbang', cat: 'music', size: S, offer: ALWAYS, goal: did('record_player.headbang'), mvp: Y },
  { id: 'dance_cosy', cat: 'music', size: S, offer: ALWAYS, goal: stat('dance.cosy'), mvp: F },
  // games (Critterbound is full scope: these two are gated on the flag its activity sets)
  { id: 'play_critterbound', cat: 'games', size: S, offer: { kind: 'flag', flag: 'critterbound.enabled', value: true }, goal: stat('critterbound.session60'), mvp: Y },
  { id: 'befriend_critter', cat: 'games', size: M, offer: all({ kind: 'flag', flag: 'critterbound.enabled', value: true }, { kind: 'flag', flag: 'critterbound.starter', value: true }, not(stat('critterbound.crew6', 1, 'ever'))), goal: stat('critterbound.befriended'), mvp: Y },
  { id: 'win_spar', cat: 'games', size: M, offer: all({ kind: 'flag', flag: 'critterbound.enabled', value: true }, not(stat('critterbound.wanderers3', 1, 'ever'))), goal: stat('critterbound.sparWin'), mvp: F },
  { id: 'handheld_bed', cat: 'games', size: S, offer: owns('handheld_console'), goal: stat('handheld.inBed'), mvp: F },
  // photo
  { id: 'photo_cat', cat: 'photo', size: S, offer: ALWAYS, goal: photo('cat'), mvp: Y },
  { id: 'photo_night', cat: 'photo', size: S, offer: ALWAYS, goal: photo('night'), mvp: F },
  { id: 'photo_outfit', cat: 'photo', size: S, offer: statEver('outfitWorn'), goal: all(photo('ellie'), photo('outfit')), mvp: F },
  // home
  { id: 'order_something', cat: 'home', size: S, offer: hearts(10), goal: progress('itemBought'), mvp: Y },
  { id: 'cosy_up', cat: 'home', size: M, offer: not({ kind: 'roomsCosy', atLeast: 90, count: 'all' }), goal: stat('cosy.up10'), mvp: Y },
  { id: 'plant', cat: 'home', size: S, offer: any({ kind: 'ownedCount', atLeast: 1, tag: 'plant' }, hearts(25)), goal: stat('place.plant'), mvp: F },
  { id: 'lamps_on', cat: 'home', size: S, offer: { kind: 'ownedCount', atLeast: 3, tag: 'light' }, goal: stat('lamps.onAfter20'), mvp: F },
  // evening
  { id: 'stargaze', cat: 'evening', size: M, offer: notRaining, goal: did('grass.stargaze'), mvp: Y },
  { id: 'lanterns', cat: 'evening', size: S, offer: owns('garden_lantern'), goal: did('lanterns.light'), mvp: Y },
  { id: 'bath', cat: 'evening', size: S, offer: ALWAYS, goal: did('bath.bathe'), mvp: Y },
  { id: 'read', cat: 'evening', size: S, offer: ALWAYS, goal: stat(STAT.readMinutes, 30), mvp: F },
  // style
  { id: 'wear_outfit', cat: 'style', size: S, offer: ALWAYS, goal: progress('outfitWorn'), mvp: Y },
  // visitors
  { id: 'spot_bruce', cat: 'visitors', size: M, offer: dayAtLeast(3), goal: did('bruce.spot'), mvp: Y },
  { id: 'poe_trade', cat: 'visitors', size: M, offer: stat('trinkets', 1, 'ever'), goal: did('poe.trade'), mvp: Y },
];

export const wishes: readonly WishDef[] = ROWS.map(
  (r): WishDef => ({
    id: asWishId(r.id),
    title: wishTitleKey(r.id),
    icon: sprite(`icon.wish.${r.cat}`),
    category: r.cat,
    size: r.size,
    offerIf: r.offer,
    goal: r.goal,
    rewards: [WISH_MOOD_BOOST],
    weight: 1,
    mvp: r.mvp,
  }),
);
