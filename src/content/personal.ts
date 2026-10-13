/**
 * Personal details for the one player this game is for (see design/ELLIE.md).
 * Owner: writer. The giver edits this file by hand; nothing else in the game
 * writes personal text.
 */
import type { PersonalConfig, PersonalMail } from '../core/types';

/**
 * The personal mail slot. Empty by default.
 *
 * How to fill it (for the giver):
 * - Add one object per letter. It turns up in the mailbox on the first
 *   morning on or after `date`, going by the Mac's real calendar.
 * - `date` is 'YYYY-MM-DD'. `subject` is one short line (40 characters is
 *   plenty). `body` is the letter itself; keep it to 4 short lines and split
 *   them with '\n'.
 * - The text is shown exactly as written. It is not a string key, so plain
 *   words are fine, and this is the only place that can hold them.
 * - Each letter arrives once. Delete one to stop it; already delivered ones
 *   stay in her inbox.
 *
 * Example (leave commented out, or copy and change it):
 *
 *   { date: '2026-12-25', subject: 'Happy Christmas', body: 'Line one.\nLine two.' },
 */
const mail: readonly PersonalMail[] = [];

export const PERSONAL: PersonalConfig = {
  /** Fills {name} in every string. */
  playerName: 'Ellie',
  /**
   * The optional framed print decor item. When true, a framed print reading
   * FRAMED_PRINT_TEXT can be found and hung. Set false to remove it entirely.
   */
  framedPrint: true,
  mail,
};

/**
 * The words on the framed print. This phrase appears nowhere else in the game
 * (design/ELLIE.md, tone rule 5), and only while `framedPrint` is true.
 */
export const FRAMED_PRINT_TEXT = 'Grazie per essere te stessa';
