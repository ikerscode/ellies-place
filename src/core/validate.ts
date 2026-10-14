/**
 * Save-side checks that live in core so save, app and tests share them (F36):
 * a structural validator for a loaded state, reconciliation with the current content,
 * and the migration chain check.
 */
import { createEmptySimState, entitiesWith, getC, removeEntity } from './state';
import type { ContentDb, ContentIndex, Migration, SimState } from './types';
import { SAVE_VERSION } from './types';

type StartContent = Pick<ContentDb, 'tuning' | 'economy'>;

function kind(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function shape(template: unknown, value: unknown, path: string, out: string[]): void {
  if (out.length >= 40) return;
  const tk = kind(template);
  const vk = kind(value);
  if (template === null) return; // a nullable slot: any JSON is allowed, deeper checks belong to the content owner
  if (tk === 'array') {
    if (vk !== 'array') out.push(`${path}: expected an array, got ${vk}`);
    return;
  }
  if (tk === 'number') {
    if (vk !== 'number' || !Number.isFinite(value as number)) out.push(`${path}: expected a finite number, got ${vk === 'number' ? String(value) : vk}`);
    return;
  }
  if (tk === 'object') {
    if (vk !== 'object') {
      out.push(`${path}: expected an object, got ${vk}`);
      return;
    }
    const keys = Object.keys(template as object);
    // An empty template object is a free-form map (components, stats, flags, inventory...): contents are unchecked.
    for (const key of keys) {
      const v = (value as Record<string, unknown>)[key];
      if (v === undefined) out.push(`${path}.${key}: missing`);
      else shape((template as Record<string, unknown>)[key], v, `${path}.${key}`, out);
    }
    return;
  }
  if (tk !== vk) out.push(`${path}: expected ${tk}, got ${vk}`);
}

/**
 * Structural problems in a parsed state, measured against a fresh `createEmptySimState`: every fixed
 * field present with the right JSON type. Free-form maps (components, stats, flags...) are not
 * walked. Empty means usable. Import runs `fillMissing` first (additive fields), so what is left
 * here is damage, not age.
 */
export function validateSimState(raw: unknown, content: StartContent): string[] {
  const out: string[] = [];
  if (kind(raw) !== 'object') return ['state: not an object'];
  shape(createEmptySimState(0, content), raw, 'state', out);
  return out;
}

/** Copies missing keys (recursively, for fixed-shape objects) from a template into a value. Returns the value. */
function fill(template: unknown, value: unknown): unknown {
  if (kind(template) !== 'object' || kind(value) !== 'object') return value;
  const t = template as Record<string, unknown>;
  const v = value as Record<string, unknown>;
  for (const key of Object.keys(t)) {
    if (v[key] === undefined) v[key] = JSON.parse(JSON.stringify(t[key])) as unknown;
    else fill(t[key], v[key]);
  }
  return v;
}

/** Fills fields added since the save was written from `createEmptySimState`. Mutates and returns `raw`. */
export function fillMissing(raw: SimState, content: StartContent): SimState {
  return fill(createEmptySimState(0, content), raw) as SimState;
}

/**
 * Brings a loaded state in line with the content of THIS build (F36): fills additive fields, then drops
 * ids the content no longer has (a removed item, wish, outfit, mail or interaction) from unlocks, stock,
 * wishes, aspirations, stickers, wardrobe, the inbox, placed items and agents' queues, instead of crashing later.
 * Mutates `state`; returns one note per thing dropped, for a log line.
 */
export function reconcileState(state: SimState, content: ContentIndex): string[] {
  const notes: string[] = [];
  fillMissing(state, content.db);
  const prune = (label: string, map: Record<string, unknown>, known: (id: string) => boolean): void => {
    for (const id of Object.keys(map)) {
      if (!known(id)) {
        delete map[id];
        notes.push(`${label}: dropped ${id}`);
      }
    }
  };
  const items = new Set<string>(content.items.keys());
  const wishes = new Set<string>(content.wishes.keys());
  const outfits = new Set<string>(content.outfits.keys());
  const interactions = new Set<string>(content.interactions.keys());
  const paints = new Set<string>(content.paints.keys());
  const mails = new Set<string>(content.mail.keys());
  const stickers = new Set<string>(content.stickers.keys());
  const asps = new Set<string>(content.aspirations.keys());

  prune('unlocks.items', state.unlocks.items, (i) => items.has(i));
  prune('unlocks.outfits', state.unlocks.outfits, (i) => outfits.has(i));
  prune('unlocks.paints', state.unlocks.paints, (i) => paints.has(i));
  prune('unlocks.interactions', state.unlocks.interactions, (i) => interactions.has(i));
  prune('inventory.stored', state.inventory.stored, (i) => items.has(i));
  prune('inventory.storedFree', state.inventory.storedFree, (i) => items.has(i));
  prune('inventory.freeOrigin', state.inventory.freeOrigin, (i) => items.has(i));
  prune('wishes.history', state.wishes.history, (i) => wishes.has(i));
  prune('wishes.lastDone', state.wishes.lastDone, (i) => wishes.has(i));
  prune('wishes.offered', state.wishes.offered, (i) => wishes.has(i));
  prune('aspirations.tiers', state.aspirations.tiers, (i) => asps.has(i));
  prune('stickers.earned', state.stickers.earned, (i) => stickers.has(i));
  prune('mail.sent', state.mail.sent, (i) => mails.has(i));

  const before = state.wishes.active.length;
  state.wishes.active = state.wishes.active.filter((w) => wishes.has(w.id));
  if (state.wishes.active.length !== before) notes.push('wishes.active: dropped unknown wishes');

  const inbox = state.mail.inbox.length;
  state.mail.inbox = state.mail.inbox.filter((m) => m.ref.kind === 'personal' || mails.has(m.ref.id));
  if (state.mail.inbox.length !== inbox) notes.push('mail.inbox: dropped unknown letters');

  for (const worn of Object.values(state.wardrobe.worn)) {
    for (const slot of Object.keys(worn) as (keyof typeof worn)[]) {
      const id = worn[slot];
      if (id !== undefined && !outfits.has(id)) {
        delete worn[slot];
        notes.push(`wardrobe: dropped ${id}`);
      }
    }
  }

  for (const id of entitiesWith(state, 'placeable')) {
    const pl = getC(state, 'placeable', id);
    if (pl && !items.has(pl.item)) {
      removeEntity(state, id);
      notes.push(`placeable: removed ${pl.item}`);
    }
  }

  for (const id of entitiesWith(state, 'agent')) {
    const agent = getC(state, 'agent', id);
    if (!agent) continue;
    const q = agent.queue.length;
    agent.queue = agent.queue.filter((a) => interactions.has(a.interaction));
    if (agent.queue.length !== q) notes.push(`agent ${id}: dropped queued actions`);
    if (agent.current && !interactions.has(agent.current.interaction)) {
      agent.current = null;
      notes.push(`agent ${id}: dropped current action`);
    }
  }
  return notes;
}

/**
 * Problems in a migration list (F36): steps must be single-version (`to = from + 1`), unique, and form an
 * unbroken chain from 1 up to `current`. A save at any older version then reaches `current` by folding.
 */
export function migrationChainProblems(migrations: readonly Migration[], current: number = SAVE_VERSION): string[] {
  const out: string[] = [];
  const byFrom = new Map<number, Migration>();
  for (const m of migrations) {
    if (m.to !== m.from + 1) out.push(`migration ${m.from} to ${m.to}: must step exactly one version`);
    if (byFrom.has(m.from)) out.push(`migration from ${m.from}: defined twice`);
    byFrom.set(m.from, m);
  }
  for (let v = 1; v < current; v++) if (!byFrom.has(v)) out.push(`no migration from ${v} to ${v + 1}`);
  for (const m of migrations) if (m.from >= current) out.push(`migration from ${m.from}: at or above the current version ${current}`);
  return out;
}
