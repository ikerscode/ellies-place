/**
 * Progression content: aspirations, daily wishes, stickers and secrets, mail, wardrobe outfits, Pickle's stock
 * days and the housewarming. One export, `progressData`, for data-core to spread into `createContentDb()`.
 * Owner: game-designer#data-progress. Strings live in src/content/strings (writer).
 */
import type { AspirationDef, MailDef, OutfitDef, StickerDef, WishDef } from '../../../core/types';
import { aspirations } from './aspirations';
import { HOUSEWARMING, HOUSEWARMING_UNLOCK_IF, housewarmingRewards } from './housewarming';
import { DELIVERY_VARIANTS, MAIL_RULES, RECEIPT_VARIANTS, duePersonalMail, mail, personalMailProblems } from './mail';
import { DEFAULT_OUTFITS, outfits } from './outfits';
import { BRUCE_RULES, secrets, type SecretDef } from './secrets';
import { PICKLE_STOCK_DAYS_FULL, PICKLE_STOCK_DAYS_MVP } from './stock';
import { FRAMED_PRINT_STICKER, MVP_STICKERS, STICKER_GIFT_MAP, stickers } from './stickers';
import { DAY_ONE_WISHES, RACE_DAY_WISH, WISH_MOOD_BOOST, wishes } from './wishes';

export interface ProgressData {
  /** Tables that go straight into `ContentDb`. */
  readonly wishes: readonly WishDef[];
  readonly aspirations: readonly AspirationDef[];
  readonly outfits: readonly OutfitDef[];
  readonly mail: readonly MailDef[];
  readonly stickers: readonly StickerDef[];
  /** Rules and side tables the sim and UI read (not part of `ContentDb`). */
  readonly secrets: readonly SecretDef[];
  readonly bruce: typeof BRUCE_RULES;
  readonly mailRules: typeof MAIL_RULES;
  readonly housewarming: typeof HOUSEWARMING;
  readonly housewarmingUnlockIf: typeof HOUSEWARMING_UNLOCK_IF;
  readonly housewarmingRewards: typeof housewarmingRewards;
  readonly pickleStockDays: { readonly full: readonly number[]; readonly mvp: readonly number[] };
  readonly dayOneWishes: readonly string[];
  readonly raceDayWish: string;
  readonly wishMoodBoost: typeof WISH_MOOD_BOOST;
  readonly defaultOutfits: typeof DEFAULT_OUTFITS;
  readonly mvpStickers: ReadonlySet<string>;
  readonly framedPrintSticker: string;
  readonly stickerGiftMap: typeof STICKER_GIFT_MAP;
  readonly deliveryVariants: typeof DELIVERY_VARIANTS;
  readonly receiptVariants: typeof RECEIPT_VARIANTS;
  readonly duePersonalMail: typeof duePersonalMail;
  readonly personalMailProblems: typeof personalMailProblems;
}

export const progressData: ProgressData = {
  wishes,
  aspirations,
  outfits,
  mail,
  stickers,
  secrets,
  bruce: BRUCE_RULES,
  mailRules: MAIL_RULES,
  housewarming: HOUSEWARMING,
  housewarmingUnlockIf: HOUSEWARMING_UNLOCK_IF,
  housewarmingRewards,
  pickleStockDays: { full: PICKLE_STOCK_DAYS_FULL, mvp: PICKLE_STOCK_DAYS_MVP },
  dayOneWishes: DAY_ONE_WISHES,
  raceDayWish: RACE_DAY_WISH,
  wishMoodBoost: WISH_MOOD_BOOST,
  defaultOutfits: DEFAULT_OUTFITS,
  mvpStickers: MVP_STICKERS,
  framedPrintSticker: FRAMED_PRINT_STICKER,
  stickerGiftMap: STICKER_GIFT_MAP,
  deliveryVariants: DELIVERY_VARIANTS,
  receiptVariants: RECEIPT_VARIANTS,
  duePersonalMail,
  personalMailProblems,
};

export type { SecretDef };
