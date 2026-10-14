/**
 * Pickle's new stock days (FROZEN 11). Items unlock by the code `day:N` (set by data-core's items table).
 * Full: 14 items on days 2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25. MVP: 3 items on days 3, 8, 15.
 * Day numbers are pacing hints (FROZEN 33): the letter and the unlock both read the same game day.
 */
export const PICKLE_STOCK_DAYS_FULL: readonly number[] = [2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25];
export const PICKLE_STOCK_DAYS_MVP: readonly number[] = [3, 8, 15];
