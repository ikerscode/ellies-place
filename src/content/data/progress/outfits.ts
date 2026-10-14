/**
 * Wardrobe outfits (play.md 6.2): 36 rows, 21 MVP. Slots follow FROZEN 32 (head, clip, neck, top, feet).
 * Ids keep the `out.` prefix (play.md 1.1 "in data tables the prefix is part of the id"); the sprite key is
 * `outfit.<id without prefix>` (art.md 2). All wear on Ellie. Start outfits: 5.
 * The unlock is a Condition the sim re-evaluates, so "start" is `always` and aspiration unlocks read the tier.
 */
import { STAT } from '../../../core/stats';
import { asOutfitId, asSetBonusId, type Condition, type OutfitDef, type OutfitSlot } from '../../../core/types';
import { ALWAYS, flag, key, progress, sprite, stat, statEver, tierAtLeast, bond } from './helpers';

type Row = readonly [id: string, slot: OutfitSlot, unlock: Condition, mvp: boolean];

const Y = true;
const F = false;
const trades = (n: number): Condition => progress('trade', undefined, n, 'ever');

const ROWS: readonly Row[] = [
  ['out.crown', 'head', flag('george.knighted'), Y],
  ['out.chefhat', 'head', statEver(STAT.sushiMade, 3), Y],
  ['out.bucket', 'head', bond('salem', 2), Y],
  ['out.headphones', 'head', bond('peaches', 2), Y],
  ['out.catears', 'head', ALWAYS, Y],
  ['out.beanie', 'head', ALWAYS, Y],
  ['out.sweatband', 'head', tierAtLeast('asp.hyrox', 1), Y],
  ['out.delivery_cap', 'head', progress('itemBought', undefined, 10, 'ever'), F],
  ['out.moonless_hood', 'head', bond('shadow', 2), F],
  ['out.flower_crown', 'head', { kind: 'setBonus', id: asSetBonusId('plant_corner') }, F],
  ['out.firefly', 'clip', stat('interaction.lanterns.light', 5, 'ever'), Y],
  ['out.moon', 'clip', statEver(STAT.stargazes, 1), Y],
  ['out.star', 'clip', statEver(STAT.starWishes, 1), F],
  ['out.feather', 'clip', trades(1), Y],
  // Comes in Pickle's first new-stock box (day 2): unlocked when that letter is read.
  ['out.bow', 'clip', progress('mailRead', 'pickle.new_stock', 1, 'ever'), F],
  ['out.paw_clip', 'clip', tierAtLeast('asp.royalty', 1), Y],
  ['out.sushi_clip', 'clip', statEver('sushi.fiveStar', 1), F],
  // 3 game hours of records.
  ['out.vinyl_clip', 'clip', statEver(STAT.recordMinutes, 180), F],
  ['out.scarf', 'neck', statEver(STAT.stargazes, 3), Y],
  ['out.bell_choker', 'neck', tierAtLeast('asp.royalty', 3), Y],
  ['out.spike_choker', 'neck', ALWAYS, Y],
  ['out.medal_ribbon', 'neck', progress('race', undefined, 1, 'ever'), F],
  // The morning after the knighting, with `mail.george.knighthood`.
  ['out.knight_sash', 'neck', progress('mailRead', 'george.knighthood', 1, 'ever'), F],
  ['out.bandana', 'neck', flag('critterbound.oldWrenBeaten'), F],
  ['out.tank_black', 'top', ALWAYS, Y],
  ['out.race_kit', 'top', tierAtLeast('asp.hyrox', 2), Y],
  ['out.cosy_jumper', 'top', tierAtLeast('asp.home', 2), Y],
  ['out.band_tee', 'top', statEver(STAT.headbangCount, 3), Y],
  ['out.gym_hoodie', 'top', tierAtLeast('asp.hyrox', 4), F],
  ['out.dungarees', 'top', tierAtLeast('asp.home', 4), F],
  ['out.pyjamas', 'top', statEver(STAT.nightsSlept, 3), F],
  ['out.raincoat', 'top', statEver('rain.gardenVisit', 1), F],
  ['out.boots', 'feet', ALWAYS, Y],
  ['out.trainers', 'feet', tierAtLeast('asp.hyrox', 3), Y],
  ['out.cat_slippers', 'feet', tierAtLeast('asp.royalty', 4), Y],
  // play.md says "Poe trade"; home.md's trade table has no socks, so it opens after her second trade.
  ['out.striped_socks', 'feet', trades(2), F],
];

export const outfits: readonly OutfitDef[] = ROWS.map(
  ([id, slot, unlock, mvp]): OutfitDef => ({
    id: asOutfitId(id),
    name: key(`${id}.name`),
    wearer: 'ellie',
    slot,
    sprite: sprite(`outfit.${id.slice(4)}`),
    unlock,
    mvp,
  }),
);

/** Start outfits (unlock `always`): the sim equips the default top and boots on a new game. */
export const DEFAULT_OUTFITS = { top: 'out.tank_black', feet: 'out.boots' } as const;
