/**
 * Small builders so the progression tables read like the spec rows (play.md 7.2 condition language).
 * Pure; no state. Owner: game-designer#data-progress.
 */
import { statInteraction, statPhotoTag, statProgress } from '../../../core/stats';
import {
  asAspirationId,
  asItemId,
  asSpriteKey,
  asStringKey,
  type BondLevel,
  type CatName,
  type Condition,
  type Effect,
  type HyroxStation,
  type InteractionId,
  type ItemId,
  type OutfitId,
  type ProgressKind,
  type SpriteKey,
  type StatKey,
  type StringKey,
} from '../../../core/types';

export const ALWAYS: Condition = { kind: 'always' };
export const all = (...of: Condition[]): Condition => ({ kind: 'all', of });
export const any = (...of: Condition[]): Condition => ({ kind: 'any', of });
export const not = (of: Condition): Condition => ({ kind: 'not', of });

export const key = (s: string): StringKey => asStringKey(s);
export const sprite = (s: string): SpriteKey => asSpriteKey(s);
export const item = (s: string): ItemId => asItemId(s);

/** A counter reached `atLeast`, today (since the morning roll) unless `scope` says ever. */
export const stat = (k: StatKey, atLeast = 1, scope: 'ever' | 'today' = 'today'): Condition => ({ kind: 'stat', stat: k, atLeast, scope });
export const statEver = (k: StatKey, atLeast = 1): Condition => stat(k, atLeast, 'ever');
/** An interaction completed (a skip pass counts), `interaction.<id>`. */
export const did = (id: InteractionId | string, n = 1): Condition => stat(statInteraction(id), n, 'today');
export const didEver = (id: InteractionId | string, n = 1): Condition => stat(statInteraction(id), n, 'ever');
/** A progress counter (`<kind>.<subject>`) today or ever. */
export const progress = (kind: ProgressKind, subject?: string, atLeast = 1, scope: 'ever' | 'today' = 'today'): Condition =>
  stat(statProgress(kind, subject), atLeast, scope);
export const photo = (tag: string, scope: 'ever' | 'today' = 'today'): Condition => stat(statPhotoTag(tag), 1, scope);

export const bond = (cat: CatName, atLeast: BondLevel): Condition => ({ kind: 'bond', cat, atLeast });
export const owns = (id: string, atLeast = 1): Condition => ({ kind: 'owns', item: item(id), atLeast });
export const hearts = (atLeast: number): Condition => ({ kind: 'hearts', atLeast });
export const dayAtLeast = (day: number): Condition => ({ kind: 'dayAtLeast', day });
/** Exactly game day `n`: no `dayIs` kind exists, so it is "from n and not from n+1". */
export const dayIs = (n: number): Condition => all(dayAtLeast(n), not(dayAtLeast(n + 1)));
/** The clock is in [from, to) minutes of the day (offers: "rolled before 10:00" is 0..600). */
export const between = (from: number, to: number): Condition => ({ kind: 'timeBetween', from, to });
export const hhmm = (h: number, m = 0): number => h * 60 + m;
export const notRaining: Condition = not({ kind: 'weather', weather: 'rain' });
export const flag = (f: string, value = true): Condition => ({ kind: 'flag', flag: f, value });
export const tierAtLeast = (id: string, atLeast: number): Condition => ({ kind: 'aspirationTier', id: asAspirationId(id), atLeast });
export const wearing = (outfit: OutfitId): Condition => ({ kind: 'wearing', who: 'ellie', outfit });

export const stations = (...ids: HyroxStation[]): readonly HyroxStation[] => ids;

export const setFlag = (f: string, value = true): Effect => ({ kind: 'flag', flag: f, value });
export const grant = (id: string, count = 1): Effect => ({ kind: 'grantItem', item: item(id), count });
