/**
 * Every economy number in one table (FROZEN 13 and 16, play.md 8.2). balance-analyst tunes this in Wave 4.
 * Mood-scaled amounts are multiplied by the mood step (FROZEN 1) and rounded half up; the rest are flat.
 */
import { AUTO_PLAY_SCORE, PASS_SCORE, type EconomyTable } from '../../core';

export const ECONOMY: EconomyTable = {
  startHearts: 150,
  // Shop price = round(base x priceScale to the nearest 5), minimum 5, 0 stays 0 (FROZEN 13).
  priceScale: 1.6,
  priceStep: 5,
  passScore: PASS_SCORE,
  autoPlayScore: AUTO_PLAY_SCORE,
  wishHearts: { small: 15, medium: 25, large: 40 },
  wishFullSet: 15,
  // FROZEN 2: each awake game hour, +1 at mood 50 or more, +2 at 75 or more.
  trickle: [
    { atMood: 50, hearts: 1 },
    { atMood: 75, hearts: 2 },
  ],
  // 2 + 4 x score, full pay for 6 a day, then 1 each.
  minigame: { base: 2, perScore: 4, fullPayPerDay: 6, afterCap: 1 },
  // play.md 2.4 and 5.3: runs 2, kettlebell 1, stretch 1, photos 1 (first 3 a day), star wish 2.
  flat: { run: 2, treadmill: 2, kettlebell: 1, stretch: 1, photo: 1, starWish: 2 },
  photosPaidPerDay: 3,
  // FROZEN 3: 25 flat per level.
  bondLevelUp: 25,
  aspirationTierHearts: [50, 100, 175, 275],
  race: { finish: 40, overallPb: 30, stationSplitPb: 5 },
  medals: { finisher: 0, bronze: 50, silver: 100, gold: 150, royal: 200 },
  critterbound: { newCritter: 10, wandererFirstWin: 25, sparWin: 5, sparWinsPerDay: 3 },
  sticker: 15,
  starWishLuck: 10,
  housewarming: 200,
  // 10 + 20 s XP per result; 15 + 5 L to the next level; one curve to level 10 (375 XP in all).
  skillXp: { base: 10, perScore: 20, curveBase: 15, curvePerLevel: 5, maxLevel: 10 },
  maxHeartsPerDay: 2000,
};
