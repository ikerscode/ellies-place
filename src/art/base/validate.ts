/**
 * Registry checks shared by every batch's unit test (design/spec/art.md 9):
 * key format, unique keys, equal-width rows, every palette character defined,
 * valid colours, equal frame sizes per animation.
 */
import { NO_OUTLINE, framesByDir } from './compile';
import type { ArtBatch, Grid, SpriteDef } from './types';

export const KEY_RE = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

function gridProblems(where: string, g: Grid, palette: SpriteDef['palette']): string[] {
  const out: string[] = [];
  if (g.length === 0) return [`${where}: empty grid`];
  const w = g[0]?.length ?? 0;
  if (w === 0) out.push(`${where}: zero-width grid`);
  g.forEach((row, y) => {
    if (row.length !== w) out.push(`${where}: row ${y} is ${row.length} wide, expected ${w}`);
    for (const ch of row) {
      if (ch !== '.' && palette[ch] === undefined) out.push(`${where}: row ${y} uses '${ch}', not in the palette`);
    }
  });
  if (!g.some((row) => /[^.]/.test(row))) out.push(`${where}: grid is fully transparent`);
  return out;
}

function sizeOf(g: Grid): string {
  return `${g[0]?.length ?? 0}x${g.length}`;
}

/** Problems with one sprite def; [] when it is fine. */
export function validateSprite(d: SpriteDef): string[] {
  const out: string[] = [];
  const k = String(d.key);
  if (!KEY_RE.test(k)) out.push(`${k}: key must be dotted lower case [a-z0-9_.]`);
  for (const [ch, hex] of Object.entries(d.palette)) {
    if (ch.length !== 1 || ch === '.') out.push(`${k}: bad palette character '${ch}'`);
    if (!HEX_RE.test(hex)) out.push(`${k}: palette '${ch}' is '${hex}', not #rrggbb`);
  }
  if (d.outline !== undefined && d.outline !== NO_OUTLINE && !HEX_RE.test(d.outline)) out.push(`${k}: bad outline '${d.outline}'`);
  if (d.fps !== undefined && !(d.fps > 0 && Number.isFinite(d.fps))) out.push(`${k}: fps must be > 0`);
  if (!Number.isFinite(d.anchor.x) || !Number.isFinite(d.anchor.y)) out.push(`${k}: anchor must be finite`);
  out.push(...gridProblems(`${k} grid`, d.grid, d.palette));
  if (d.frames && d.frames.length === 0) out.push(`${k}: frames is empty`);
  if (d.dirs && Object.keys(d.dirs).length === 0) out.push(`${k}: dirs is empty`);
  const byDir = framesByDir(d);
  for (const [dir, list] of Object.entries(byDir)) {
    if (!list || list.length === 0) {
      out.push(`${k} ${dir}: no frames`);
      continue;
    }
    const size = sizeOf(list[0] ?? []);
    list.forEach((g, i) => {
      out.push(...gridProblems(`${k} ${dir}[${i}]`, g, d.palette));
      if (sizeOf(g) !== size) out.push(`${k} ${dir}[${i}]: ${sizeOf(g)}, expected ${size} like frame 0`);
    });
  }
  return out;
}

/** Problems across batches (including duplicate keys between them); [] when all is fine. */
export function validateBatches(batches: readonly ArtBatch[]): string[] {
  const out: string[] = [];
  const seenKeys = new Map<string, string>();
  const seenIds = new Set<string>();
  for (const b of batches) {
    if (!/^[a-z0-9_-]+$/.test(b.id)) out.push(`batch '${b.id}': id must be [a-z0-9_-]`);
    if (seenIds.has(b.id)) out.push(`batch '${b.id}': duplicate batch id`);
    seenIds.add(b.id);
    for (const d of b.sprites) {
      const k = String(d.key);
      const prev = seenKeys.get(k);
      if (prev !== undefined) out.push(`${k}: duplicate key (batches ${prev} and ${b.id})`);
      seenKeys.set(k, b.id);
      out.push(...validateSprite(d));
    }
  }
  return out;
}

export function validateBatch(batch: ArtBatch): string[] {
  return validateBatches([batch]);
}
