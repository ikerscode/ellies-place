/**
 * Small shared helpers for the sim core: entity lookups, scope, tiny maths.
 * Everything here is pure over the state it is given.
 */
import {
  asEntityId,
  entitiesWith,
  getC,
  tileOf,
  type ActorFilter,
  type AgentC,
  type CatName,
  type ContentIndex,
  type DeepReadonly,
  type EntityId,
  type EvalScope,
  type InteractionDef,
  type ItemDef,
  type SimState,
  type TilePos,
  type Who,
} from '../core';

/** Scope used by the evaluators: the public EvalScope plus an optional virtual standing tile (menu and scorer). */
export interface Scope extends EvalScope {
  /** Evaluate positional conditions for `actor` as if it stood on this tile (candidates not yet walked to). */
  readonly at?: TilePos;
}

/** Id given to a plain "walk there" queue entry (a floor click). It is not content: the sim handles it itself. */
export const WALK_ID = 'sim.walk';

/** Scratch keys kept in `AgentC.cooldowns` (always start with '@'; a real interaction id never does). */
export const SCRATCH = {
  fetchTarget: '@fetchTarget',
  fetchSlot: '@fetchSlot',
  nextDecide: '@nextDecide',
  last: '@last.',
  wait: '@wait',
  repath: '@repath',
} as const;

const ellieCache = new WeakMap<object, EntityId>();

/** Ellie's entity id, or null before a game exists. Cached per state object (derivable, never saved). */
export function ellieOf(state: DeepReadonly<SimState>): EntityId | null {
  const hit = ellieCache.get(state);
  if (hit !== undefined && getC(state, 'meta', hit)?.kind === 'ellie') return hit;
  for (const id of entitiesWith(state, 'meta')) {
    if (getC(state, 'meta', id)?.kind === 'ellie') {
      ellieCache.set(state, id);
      return id;
    }
  }
  return null;
}

export function catEntities(state: DeepReadonly<SimState>): EntityId[] {
  return entitiesWith(state, 'cat');
}

export function catEntity(state: DeepReadonly<SimState>, name: CatName): EntityId | null {
  for (const id of entitiesWith(state, 'cat')) if (getC(state, 'cat', id)?.cat === name) return id;
  return null;
}

export function catNameOf(state: DeepReadonly<SimState>, id: EntityId): CatName | null {
  return getC(state, 'cat', id)?.cat ?? null;
}

export function tileOfEntity(state: DeepReadonly<SimState>, id: EntityId): TilePos | null {
  const p = getC(state, 'position', id);
  return p ? tileOf(p.pos) : null;
}

export function roomOfEntity(state: DeepReadonly<SimState>, id: EntityId): string | null {
  return getC(state, 'position', id)?.room ?? null;
}

export function itemDefOf(content: ContentIndex, state: DeepReadonly<SimState>, id: EntityId): ItemDef | undefined {
  const pl = getC(state, 'placeable', id);
  return pl ? content.items.get(pl.item) : undefined;
}

/** Does an ActorFilter match this actor? */
export function actorMatches(state: DeepReadonly<SimState>, filter: ActorFilter, actor: EntityId): boolean {
  const meta = getC(state, 'meta', actor);
  if (!meta) return false;
  switch (filter.kind) {
    case 'anyone':
      return meta.kind === 'ellie' || meta.kind === 'cat' || meta.kind === 'visitor';
    case 'ellie':
      return meta.kind === 'ellie';
    case 'anyCat':
      return meta.kind === 'cat';
    case 'cat':
      return meta.kind === 'cat' && meta.name === filter.cat;
    case 'visitor':
      return meta.kind === 'visitor' && meta.name === filter.visitor;
  }
}

export function actorAllowed(state: DeepReadonly<SimState>, def: Pick<InteractionDef, 'actors'>, actor: EntityId): boolean {
  return def.actors.some((f) => actorMatches(state, f, actor));
}

/** Entities a `Who` names, from the point of view of `scope`. The default actor is Ellie. */
export function resolveWho(state: DeepReadonly<SimState>, who: Who, scope: EvalScope): EntityId[] {
  switch (who) {
    case 'actor': {
      const a = scope.actor ?? ellieOf(state);
      return a === null || a === undefined ? [] : [a];
    }
    case 'target':
      return scope.target === null || scope.target === undefined ? [] : [scope.target];
    case 'ellie': {
      const e = ellieOf(state);
      return e === null ? [] : [e];
    }
    case 'allCats':
      return catEntities(state);
    case 'catsInRoom': {
      const me = scope.actor ?? ellieOf(state);
      const room = me === null || me === undefined ? null : roomOfEntity(state, me);
      if (room === null) return [];
      return catEntities(state).filter((c) => roomOfEntity(state, c) === room);
    }
    default: {
      const c = catEntity(state, who);
      return c === null ? [] : [c];
    }
  }
}

export function agentOf(state: DeepReadonly<SimState>, id: EntityId): DeepReadonly<AgentC> | undefined {
  return getC(state, 'agent', id);
}

export const toEntity = (n: number): EntityId => asEntityId(n);

/** Linear interpolation helper that keeps the call sites short. */
export function clampN(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Octile-ish distance between two tile positions, used for cheap ordering (never for movement). */
export function tileDistance(a: TilePos, b: TilePos): number {
  const dx = Math.abs(a.tx - b.tx);
  const dy = Math.abs(a.ty - b.ty);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

/** Absolute game minutes since the start of day 1 (for crossing tests that span midnight). */
export function absMinutes(day: number, minuteOfDay: number): number {
  return (day - 1) * 1440 + minuteOfDay;
}
