/**
 * Player-facing strings, keyed by id. No em or en dashes.
 * Owner: writer. Each domain file exports a `Record<string, string>` with dotted keys
 * (`cat.george.idle.01`); this index merges them with mergeStringTables([...]).
 * Voice and length rules: design/spec/voice.md.
 */
import { mergeStringTables } from '../../core/strings';
import type { StringTable } from '../../core/types';
import { cats, ellie, visitors } from './cats';
import { interactions } from './interactions';
import { mail } from './mail';
import { onboarding } from './onboarding';
import { ui } from './ui';
import { aspirations, wishes } from './wishes';

export type { StringTable, StringKey, StringVars, StringLookup } from '../../core/types';

/** The domain tables, in merge order. Tests walk these to check voice and length rules. */
export const STRING_DOMAINS: Readonly<Record<string, StringTable>> = {
  cats,
  visitors,
  ellie,
  ui,
  onboarding,
  interactions,
  wishes,
  aspirations,
  mail,
};

/** Every domain table merged. Throws at import on a duplicate key. */
export const STRINGS: StringTable = mergeStringTables(Object.values(STRING_DOMAINS));
