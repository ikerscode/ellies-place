/**
 * Every string key code builds from a contract enum must exist in the string tables (review B3).
 * A ratchet: `KNOWN_MISSING` lists what the writer still owes (the Wave 1 keys use older spellings);
 * the writer deletes entries as keys land, and the test fails if an entry is stale, so the list only shrinks.
 */
import { describe, expect, it } from 'vitest';
import { STRINGS } from '../../../src/content/strings';
import { requiredEnumKeys } from '../../../src/core/keys';
import { KNOWN_MISSING } from './keyCoverage.allow';

describe('enum-keyed strings', () => {
  const required = requiredEnumKeys();
  const missing = required.filter((k) => !(k in STRINGS));

  it('has every required key, except the writer allowlist', () => {
    const allowed = new Set<string>(KNOWN_MISSING);
    const unexpected = missing.filter((k) => !allowed.has(k));
    expect(unexpected).toEqual([]);
  });

  it('keeps the allowlist honest (delete an entry when its key lands)', () => {
    const stale = KNOWN_MISSING.filter((k) => !missing.includes(k as never));
    expect(stale).toEqual([]);
  });
});
