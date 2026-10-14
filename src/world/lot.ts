/** The lot: tiles from content.lot, rooms by flood fill from each RoomDef seed. */
import { emptyLot, inBounds, type ContentIndex, type LotState, type RoomId, type RoomState, type TileKind } from '../core';
import { FLOORISH } from './shared';

export function buildLot(content: ContentIndex): LotState {
  const def = content.db.lot;
  const lot = emptyLot(def.w, def.h);
  for (let y = 0; y < def.h; y++) {
    const row = def.rows[y] ?? '';
    for (let x = 0; x < def.w; x++) {
      const ch = row[x] ?? ' ';
      lot.tiles[y * def.w + x] = (def.legend[ch] as TileKind | undefined) ?? 'void';
    }
  }
  for (const room of def.rooms) {
    let area = 0;
    const seed = room.seed;
    if (inBounds(seed, def.w, def.h)) {
      const stack = [seed.ty * def.w + seed.tx];
      while (stack.length > 0) {
        const i = stack.pop() as number;
        if (lot.roomAt[i] !== null && lot.roomAt[i] !== undefined) continue;
        if (!FLOORISH.has(lot.tiles[i] as TileKind)) continue;
        lot.roomAt[i] = room.id as RoomId;
        area++;
        const x = i % def.w;
        const y = (i - x) / def.w;
        if (x > 0) stack.push(i - 1);
        if (x < def.w - 1) stack.push(i + 1);
        if (y > 0) stack.push(i - def.w);
        if (y < def.h - 1) stack.push(i + def.w);
      }
    }
    const rs: RoomState = {
      id: room.id,
      kind: room.kind,
      outdoor: room.outdoor,
      wallPaint: room.wallPaint,
      floorPaint: room.floorPaint,
      scored: room.scored,
      area,
      cosyRated: 0,
      cosyLive: 0,
    };
    lot.rooms[room.id] = rs;
  }
  return lot;
}
