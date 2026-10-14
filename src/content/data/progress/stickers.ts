/**
 * Stickers (play.md 10.3): 36 rows, 19 MVP. Each pays ECONOMY.sticker (15) flat. Names are `stk.<id>.name`
 * and the pre-earned hint is `stk.<id>.hint` (`StickerDef.desc`). Secret rows (play.md "S") show "?" until earned.
 *
 * The secret-item stickers (Bruce on the wall, Sir Ellie, ...) also set the matching `secret.<id>` flag, which is
 * what `secret:<id>` unlock codes read (home.md 7.2). Gift items map to home.md ids; where play.md's
 * gift is not in home.md the nearest home.md item is used (see `STICKER_GIFT_MAP`).
 * Row 36 (the framed print) only counts when `PERSONAL.framedPrint` is true: consumers filter on `FRAMED_PRINT_STICKER`.
 */
import { STAT, secretFlagKey } from '../../../core/stats';
import { HYROX_ORDER, BRUCE_SPOTS, asStickerId, type Condition, type Effect, type StickerDef } from '../../../core/types';
import { all, any, didEver, grant, item, key, photo, progress, setFlag, sprite, statEver } from './helpers';

const Y = true;
const F = false;
const S = true;
const N = false;

/** play.md gift name -> home.md item id actually granted (FROZEN 10 spirit, FROZEN 21: home.md ids win). */
export const STICKER_GIFT_MAP = {
  bruce_wall_cushion: 'bruce_wall_cushion',
  cardboard_castle: 'cat_box_castle',
  vintage_rusk_tin: 'rusk_tin_gold',
  star_map_print: 'poster_moth',
  wish_jar: 'vase_bud',
  critter_plush_set: 'cat_toy_basket',
  critterbound_poster: 'poster_critterbound',
  shiny_display_case: 'cabinet_curio',
} as const;

export const FRAMED_PRINT_STICKER = 'stk.grazie_print';

const secret = (id: string): Effect => setFlag(secretFlagKey(id));
const spotted = (spot: string): Condition => progress('bruceSpotted', spot, 1, 'ever');
const skillsAt5: Condition = all(...HYROX_ORDER.map((s): Condition => ({ kind: 'skill', skill: s, atLeast: 5 })));
const raced = (medal: string): Condition => progress('race', medal, 1, 'ever');

type Row = readonly [id: string, goal: Condition, secret: boolean, mvp: boolean, rewards?: readonly Effect[]];

const ROWS: readonly Row[] = [
  ['stk.bruce_fence', spotted('bruce.fence'), S, Y],
  ['stk.bruce_table', spotted('bruce.under_table'), S, Y],
  ['stk.bruce_tv', spotted('bruce.behind_tv'), S, Y],
  ['stk.bruce_fridge', spotted('bruce.fridge_top'), S, Y],
  ['stk.bruce_box', spotted('bruce.delivery_box'), S, Y],
  ['stk.bruce_all', all(...BRUCE_SPOTS.map(spotted)), N, Y, [secret('bruce_all5'), setFlag('bruce.onWall')]],
  ['stk.salem_50_boxes', statEver(STAT.salemBoxSits, 50), N, Y, [secret('salem_boxes50'), grant(STICKER_GIFT_MAP.cardboard_castle)]],
  ['stk.rusk_10', statEver(STAT.perfectDunks, 10), N, Y, [secret('dunks10')]],
  ['stk.peaches_headbang', didEver('peaches.headbang_together'), N, Y, [secret('headbang_peaches')]],
  ['stk.shadow_lap', statEver(STAT.shadowLapMinutes, 1), N, Y],
  ['stk.george_knight', { kind: 'flag', flag: 'george.knighted', value: true }, N, Y, [secret('knighted')]],
  ['stk.zoomies_photo', photo('zoomies_3am', 'ever'), S, Y, [secret('zoomies_photo')]],
  ['stk.first_race', progress('race', undefined, 1, 'ever'), N, Y],
  ['stk.medal_gold', any(raced('gold'), raced('royal')), N, F],
  ['stk.royal_medal', raced('royal'), S, F],
  ['stk.all_stations_5', skillsAt5, N, F],
  ['stk.sushi_perfect', statEver('sushi.score90'), N, Y],
  ['stk.fish_denied_10', statEver(STAT.fishDenied, 10), N, Y],
  ['stk.cat_constellation', statEver('constellation.cat'), S, Y],
  ['stk.heart_constellation', statEver('constellation.heart'), S, F, [grant(STICKER_GIFT_MAP.star_map_print), setFlag('streak.frost')]],
  ['stk.wish_star_10', statEver(STAT.starWishes, 10), N, F, [grant(STICKER_GIFT_MAP.wish_jar)]],
  ['stk.critter_starter', { kind: 'flag', flag: 'critterbound.starter', value: true }, N, Y],
  ['stk.critter_all6', statEver('critterbound.crew6'), N, F, [grant(STICKER_GIFT_MAP.critter_plush_set), setFlag('streak.teal')]],
  ['stk.critter_champion', statEver('critterbound.wanderers3'), N, F, [grant(STICKER_GIFT_MAP.critterbound_poster)]],
  ['stk.poe_10', progress('trade', undefined, 10, 'ever'), N, F, [grant(STICKER_GIFT_MAP.shiny_display_case)]],
  ['stk.photo_all_four', photo('all_four', 'ever'), N, Y],
  ['stk.bruce_photo', photo('bruce', 'ever'), S, F],
  ['stk.housewarming', { kind: 'flag', flag: 'housewarming.held', value: true }, N, Y, [secret('housewarming')]],
  ['stk.salem_ham_10', didEver('fridge.give_ham', 10), N, F],
  ['stk.peaches_sunbeams', statEver('peaches.sunbeamRooms', 3), N, F],
  ['stk.game1_wardrobe', statEver('outfit.game1Worn', 11), N, F],
  ['stk.wishes_50', { kind: 'wishesDone', atLeast: 50, scope: 'ever' }, N, F],
  ['stk.cosy_100', { kind: 'cosy', room: 'any', atLeast: 100, reading: 'rated' }, N, F],
  ['stk.all_on_bed', statEver(STAT.catsOnBed, 4), N, F],
  ['stk.salem_reads', statEver('mail.salemSat'), S, F],
  [FRAMED_PRINT_STICKER, { kind: 'placed', item: item('frame_grazie'), atLeast: 1 }, S, F],
];

export const stickers: readonly StickerDef[] = ROWS.map(
  ([id, goal, isSecret, , rewards]): StickerDef => ({
    id: asStickerId(id),
    name: key(`${id}.name`),
    desc: key(`${id}.hint`),
    icon: sprite(`icon.sticker.${id.slice(4)}`),
    goal,
    secret: isSecret,
    ...(rewards ? { rewards } : {}),
  }),
);

/** MVP flags by sticker id (`StickerDef` has none; play.md 10.3 "MVP" column). */
export const MVP_STICKERS: ReadonlySet<string> = new Set(ROWS.filter((r) => r[3]).map((r) => r[0]));
