/**
 * Typed content tables (items, interactions, wishes, catalog, tuning...).
 * Owner: game-designer. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "content".
 */
import { notImplemented, type ContentDb } from '../../core';

export type { ContentDb, ContentIndex, SimTuning, ItemDef, InteractionDef, WishDef, AspirationDef, MailDef } from '../../core';

/** Returns every authored table. Index it once with buildContentIndex(). */
export function createContentDb(): ContentDb {
  return notImplemented('createContentDb');
}
