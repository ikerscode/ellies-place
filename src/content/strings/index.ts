/**
 * Player-facing strings, keyed by id. No em or en dashes.
 * Owner: writer. Each domain file exports a `Record<string, string>` with dotted keys
 * (`cat.george.idle.01`); this index merges them with mergeStringTables([...]).
 */
import type { StringTable } from '../../core/types';

export type { StringTable, StringKey, StringVars, StringLookup } from '../../core/types';

/** Every domain table merged. Wave 1 stub: empty until the writer lands the domains. */
export const STRINGS: StringTable = {};
