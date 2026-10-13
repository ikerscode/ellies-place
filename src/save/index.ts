/**
 * Save: versioned localStorage, backup slot, migrations, autosave, export and import, photos.
 * Owner: save-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "save".
 */
import { notImplemented, type CreateSave, type Migration } from '../core';

export type { SaveApi, SaveDeps, SaveFile, LoadResult, SaveResult, ImportResult, StorageLike } from '../core';

/** Upgrade steps, from each version to the next. Empty while SAVE_VERSION is 1. */
export const MIGRATIONS: readonly Migration[] = [];

/** Every storage call is wrapped; with storage null the game still plays. */
export const createSave: CreateSave = () => notImplemented('createSave');
