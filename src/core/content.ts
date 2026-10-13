/**
 * Builds lookup maps over the authored content tables and checks them.
 */
import { parseUnlockCode } from './rules';
import { ROOM_KINDS, asAspirationId, type ContentDb, type ContentIndex, type RoomKind } from './types';

function indexBy<K, V>(rows: readonly V[], key: (v: V) => K, table: string, problems: string[]): Map<K, V> {
  const m = new Map<K, V>();
  for (const row of rows) {
    const k = key(row);
    if (m.has(k)) problems.push(`${table}: duplicate id ${String(k)}`);
    m.set(k, row);
  }
  return m;
}

/** Problems found while indexing and cross-checking references. Empty means valid. */
export function validateContent(db: ContentDb): string[] {
  const problems: string[] = [];
  buildIndexInto(db, problems);
  return problems;
}

/** Builds the index; throws listing every problem if the content is inconsistent. */
export function buildContentIndex(db: ContentDb): ContentIndex {
  const problems: string[] = [];
  const index = buildIndexInto(db, problems);
  if (problems.length > 0) throw new Error(`content invalid:\n  ${problems.join('\n  ')}`);
  return index;
}

function buildIndexInto(db: ContentDb, problems: string[]): ContentIndex {
  const index: ContentIndex = {
    db,
    items: indexBy(db.items, (r) => r.id, 'items', problems),
    interactions: indexBy(db.interactions, (r) => r.id, 'interactions', problems),
    paints: indexBy(db.paints, (r) => r.id, 'paints', problems),
    setBonuses: indexBy(db.setBonuses, (r) => r.id, 'setBonuses', problems),
    cats: indexBy(db.cats, (r) => r.name, 'cats', problems),
    visitors: indexBy(db.visitors, (r) => r.name, 'visitors', problems),
    wishes: indexBy(db.wishes, (r) => r.id, 'wishes', problems),
    aspirations: indexBy(db.aspirations, (r) => r.id, 'aspirations', problems),
    outfits: indexBy(db.outfits, (r) => r.id, 'outfits', problems),
    mail: indexBy(db.mail, (r) => r.id, 'mail', problems),
    stickers: indexBy(db.stickers, (r) => r.id, 'stickers', problems),
    hyrox: indexBy(db.hyrox, (r) => r.station, 'hyrox', problems),
    rooms: indexBy(db.lot.rooms, (r) => r.id, 'rooms', problems),
  };

  for (const item of db.items) {
    for (const i of item.interactions) {
      if (!index.interactions.has(i)) problems.push(`items: ${item.id} references unknown interaction ${i}`);
    }
    for (const r of item.rotations) if (!(r in item.sprites) && !(item.flipFor && r in item.flipFor) && !(0 in item.sprites)) {
      problems.push(`items: ${item.id} has no sprite for rotation ${r}`);
    }
    if (item.footprint.w < 1 || item.footprint.h < 1) problems.push(`items: ${item.id} has an empty footprint`);
    if (item.price < 0) problems.push(`items: ${item.id} has a negative price`);
    if (item.maxCopies !== undefined && item.maxCopies < 1) problems.push(`items: ${item.id} has maxCopies below 1`);
    const unlock = parseUnlockCode(item.unlock);
    if (unlock === null) problems.push(`items: ${item.id} has a malformed unlock code ${item.unlock}`);
    else if (unlock.kind === 'aspiration' && db.aspirations.length > 0) {
      const asp = index.aspirations.get(asAspirationId(`asp.${unlock.aspiration}`));
      if (!asp) problems.push(`items: ${item.id} unlocks from unknown aspiration asp.${unlock.aspiration}`);
      else if (asp.tiers.length < unlock.tier) problems.push(`items: ${item.id} unlocks from missing tier ${item.unlock}`);
    }
    for (const t of item.tags) {
      if (t.startsWith('room.') && !ROOM_KINDS.includes(t.slice(5) as RoomKind)) problems.push(`items: ${item.id} has unknown room tag ${t}`);
    }
  }
  for (const it of db.interactions) {
    for (const f of it.autoFetch ?? []) {
      if (!index.interactions.has(f)) problems.push(`interactions: ${it.id} auto-fetches unknown interaction ${f}`);
    }
    if (it.window && (it.window.from < 0 || it.window.from >= 1440 || it.window.to < 0 || it.window.to > 1440)) {
      problems.push(`interactions: ${it.id} has a window outside 0..1440`);
    }
    if (it.tags.length === 0) problems.push(`interactions: ${it.id} has no tags`);
  }
  for (const a of db.aspirations) {
    a.tiers.forEach((t, i) => {
      if (t.gift && !index.items.has(t.gift)) problems.push(`aspirations: ${a.id} tier ${i + 1} gift ${t.gift} unknown`);
    });
  }
  const e = db.economy;
  if (!(e.priceScale > 0) || !(e.priceStep > 0)) problems.push('economy: priceScale and priceStep must be positive');
  if (e.trickle.some((r) => r.hearts < 0)) problems.push('economy: negative trickle');
  for (const s of db.hyrox) {
    if (!index.items.has(s.item)) problems.push(`hyrox: ${s.station} references unknown item ${s.item}`);
  }
  for (const p of db.lot.start) {
    if (!index.items.has(p.item)) problems.push(`lot.start: unknown item ${p.item}`);
  }
  if (db.lot.rows.length !== db.lot.h) problems.push(`lot: ${db.lot.rows.length} rows, expected ${db.lot.h}`);
  db.lot.rows.forEach((row, y) => {
    if (row.length !== db.lot.w) problems.push(`lot: row ${y} has ${row.length} columns, expected ${db.lot.w}`);
    for (const ch of row) if (!(ch in db.lot.legend)) problems.push(`lot: row ${y} uses unknown legend char '${ch}'`);
  });
  for (const room of db.lot.rooms) {
    if (!index.paints.has(room.wallPaint)) problems.push(`rooms: ${room.id} wall paint ${room.wallPaint} unknown`);
    if (!index.paints.has(room.floorPaint)) problems.push(`rooms: ${room.id} floor paint ${room.floorPaint} unknown`);
  }
  return index;
}
