/**
 * Every string and sprite key the Wave 2 UI uses. The UI holds no text: it only holds keys.
 * Keys marked NEW are not in src/content/strings yet (see reports/contract-requests/ui-dev.md).
 */
import { asSpriteKey as sp, asStringKey as k } from '../core';

export const S = {
  day: k('ui.hud.day'),
  hearts: k('ui.hud.hearts'),
  queue: k('ui.hud.queue'),
  queueEmpty: k('ui.hud.queueEmpty'),
  queueCancel: k('ui.hud.queueCancel'),
  freeWill: k('ui.hud.freeWill'),
  journal: k('ui.hud.journal'),
  catalog: k('ui.hud.catalog'),
  photo: k('ui.hud.photo'),
  mood: k('ui.hud.mood'),
  raceDay: k('ui.hud.raceDay'),
  sleeping: k('ui.speed.sleeping'),
  realTime: k('ui.speed.realTime'),
  modeLive: k('ui.mode.live'),
  modeBuild: k('ui.mode.build'),
  // NEW
  queueLabel: k('ui.hud.queue.label'),
  queueCard: k('ui.hud.queue.card'),
  needsLabel: k('ui.hud.needs.label'),
  wishesLabel: k('ui.hud.wishes.label'),
  wishNone: k('ui.wish.none'),
  wishDone: k('ui.wish.done'),
  wishReward: k('ui.wish.reward'),
  wishAllDone: k('ui.wish.allDone'),
  heartsTip: k('ui.hud.hearts.tip'),
  moodTip: k('ui.hud.mood.tip'),
  cosyRoom: k('ui.hud.cosy.room'),
  carrying: k('ui.hud.carrying'),
  hudHidden: k('ui.hud.hidden'),
  catTabsLabel: k('ui.hud.cats.label'),
  catAsleep: k('ui.hud.cats.asleep'),
  bloomMore: k('ui.bloom.more'),
  bloomBack: k('ui.bloom.back'),
  bloomEmpty: k('ui.bloom.empty'),
  kitClose: k('ui.kit.close'),
  srSay: k('ui.sr.say'),
  toastSaveFailed: k('ui.toast.saveFailed'),
  toastMerged: k('ui.toast.merged'),
  toastWishDone: k('ui.toast.wishDone'),
} as const;

export const SPR = {
  heart: sp('icon.heart'),
  phase: (p: string) => sp(`icon.phase.${p}`),
  need: (n: string) => sp(`icon.need.${n}`),
  portrait: (band: string) => sp(`portrait.ellie.${band}`),
  portraitFallback: sp('ellie.idle'),
  portraitCat: (cat: string) => sp(`portrait.cat.${cat}`),
  mode: (m: string) => sp(`icon.mode.${m}`),
  intDefault: sp('icon.int.default'),
  speed: (s: number) => sp(`icon.speed.${s}`),
} as const;
