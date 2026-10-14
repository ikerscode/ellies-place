/**
 * Gate 2 for the real content (F38): the authored tables must be complete and every sprite and string key
 * they mention must exist. While `createContentDb` is still the Wave 1 stub this shows as TODO rather than a
 * silent pass; the data owner's first working `createContentDb` turns it on.
 */
import { describe, expect, it } from 'vitest';
import { createContentDb } from '../../../src/content/data';
import { STRINGS } from '../../../src/content/strings';
import { validateContent } from '../../../src/core/content';
import type { ArtBatch, ContentDb } from '../../../src/core/types';

const modules = import.meta.glob<Record<string, unknown>>('../../../src/art/*/index.ts', { eager: true });
const batches: ArtBatch[] = Object.values(modules)
  .map((m) => m['BATCH'])
  .filter((b): b is ArtBatch => typeof b === 'object' && b !== null && 'sprites' in b);

function tryDb(): ContentDb | null {
  try {
    return createContentDb();
  } catch (e) {
    if (e instanceof Error && /not implemented/.test(e.message)) return null;
    throw e;
  }
}

const db = tryDb();

describe('real content', () => {
  if (db === null) {
    it.todo('createContentDb is still a stub: complete content, every sprite key and every string key resolve');
    return;
  }
  it('is complete and every sprite and string key resolves', () => {
    const sprites = new Set(batches.flatMap((b) => b.sprites.map((s) => String(s.key))));
    expect(validateContent(db, { complete: true, sprites, strings: STRINGS })).toEqual([]);
  });
});
