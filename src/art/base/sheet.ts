/**
 * Dev-only contact sheet (never part of the build). Finds every src/art/<batch>/index.ts
 * that exports `BATCH` and draws one canvas per batch: every sprite, every direction and
 * frame, scaled x4 and labelled, on a 16 px tile checker with the anchor marked.
 * Left is drawn as side mirrored. Outfit overlays are drawn over Ellie's idle frame.
 * Contract with scripts/art-sheet.mjs: [data-sheet] elements + window.__SHEET_READY__.
 */
import { canvasAnchor, flipRaster, framesByDir, rasterize, type Raster } from './compile';
import { PAL } from './palette';
import type { ArtBatch, Grid, SpriteDef, SpriteDir } from './types';

declare global {
  interface Window {
    __SHEET_READY__?: boolean;
  }
}

const S = 4;
const MAX_W = 1800;
const PAD = 16;
const GAP = 8;
const LABEL_H = 30;
const TITLE_H = 40;

interface View {
  readonly label: string;
  readonly raster: Raster;
  readonly anchor: { x: number; y: number };
  readonly under?: Raster;
  readonly underAt?: { x: number; y: number };
}

interface Block {
  readonly def: SpriteDef;
  readonly views: readonly View[];
  readonly w: number;
  readonly h: number;
}

function isBatch(v: unknown): v is ArtBatch {
  return typeof v === 'object' && v !== null && 'id' in v && 'sprites' in v && Array.isArray((v as ArtBatch).sprites);
}

const modules = import.meta.glob<Record<string, unknown>>('../*/index.ts', { eager: true });
const batches: ArtBatch[] = Object.values(modules)
  .map((m) => m['BATCH'])
  .filter(isBatch)
  .sort((a, b) => (a.id === 'base' ? -1 : b.id === 'base' ? 1 : a.id.localeCompare(b.id)));

const ellieIdle = batches.flatMap((b) => b.sprites).find((d) => String(d.key) === 'ellie.idle');

function ellieUnder(dir: SpriteDir, mirror: boolean): Raster | undefined {
  if (!ellieIdle) return undefined;
  const g = framesByDir(ellieIdle)[dir]?.[0];
  if (!g) return undefined;
  const r = rasterize(g, ellieIdle.palette, ellieIdle.outline);
  return mirror ? flipRaster(r) : r;
}

function views(d: SpriteDef): View[] {
  const out: View[] = [];
  const byDir = framesByDir(d);
  const outfit = String(d.key).startsWith('outfit.');
  const add = (dir: SpriteDir, list: readonly Grid[], mirror: boolean, name: string): void => {
    list.forEach((g, i) => {
      let raster = rasterize(g, d.palette, d.outline);
      if (mirror) raster = flipRaster(raster);
      const anchor = canvasAnchor(d, g[0]?.length ?? 0, mirror);
      const label = list.length > 1 ? `${name}${i}` : name;
      if (outfit && ellieIdle) {
        const under = ellieUnder(dir, mirror);
        // The overlay anchor sits on the wearer's top-centre (wearer canvas (7, 1)), so the
        // wearer's canvas origin is at overlay canvas (anchor - (7, 1)).
        if (under) out.push({ label, raster, anchor, under, underAt: { x: anchor.x - 7, y: anchor.y - 1 } });
        return;
      }
      out.push({ label, raster, anchor });
    });
  };
  for (const dir of ['down', 'up', 'side'] as const) {
    const list = byDir[dir];
    if (list && list.length > 0) add(dir, list, false, dir === 'side' ? 'right' : dir);
  }
  const side = byDir.side;
  if (side && side.length > 0) add('side', side, true, 'left');
  return out;
}

function block(d: SpriteDef, g: CanvasRenderingContext2D): Block {
  const vs = views(d);
  const framesW = vs.reduce((s, v) => s + v.raster.w * S + GAP, -GAP);
  const label = `${String(d.key)}  ${d.grid[0]?.length ?? 0}x${d.grid.length}${d.fps ? `  ${d.fps}fps` : ''}`;
  const w = Math.max(framesW, Math.ceil(g.measureText(label).width), 120);
  const h = LABEL_H + Math.max(...vs.map((v) => Math.max(v.raster.h, v.under && v.underAt ? v.under.h + v.underAt.y : 0) * S));
  return { def: d, views: vs, w, h };
}

function toCanvas(r: Raster): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = r.w;
  c.height = r.h;
  c.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.w, r.h), 0, 0);
  return c;
}

function checker(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ox: number, oy: number): void {
  const T = 16 * S;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  for (let ty = Math.floor((y - oy) / T) - 1; ty * T + oy < y + h; ty++) {
    for (let tx = Math.floor((x - ox) / T) - 1; tx * T + ox < x + w; tx++) {
      g.fillStyle = (tx + ty) % 2 === 0 ? '#3a2b44' : '#45334f';
      g.fillRect(ox + tx * T, oy + ty * T, T, T);
    }
  }
  g.restore();
}

function drawView(g: CanvasRenderingContext2D, v: View, x: number, y: number, h: number): number {
  const w = v.raster.w * S;
  const ax = x + v.anchor.x * S;
  const ay = y + v.anchor.y * S;
  // Tile checker aligned so a tile corner sits on the anchor's ground line.
  checker(g, x, y, w, h, ax, ay);
  if (v.under && v.underAt) g.drawImage(toCanvas(v.under), x + v.underAt.x * S, y + v.underAt.y * S, v.under.w * S, v.under.h * S);
  g.drawImage(toCanvas(v.raster), x, y, w, v.raster.h * S);
  g.fillStyle = PAL.neon.cyan;
  g.fillRect(ax - 6, ay - 1, 12, 2);
  g.fillRect(ax - 1, ay - 6, 2, 12);
  g.fillStyle = PAL.ui.muted;
  g.font = '10px monospace';
  g.fillText(v.label, x, y + h + 11);
  return w;
}

function sheet(b: ArtBatch): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  g.font = '12px monospace';
  const blocks = b.sprites.map((d) => block(d, g));
  // Flow layout.
  const placed: { b: Block; x: number; y: number }[] = [];
  let x = PAD;
  let y = TITLE_H;
  let rowH = 0;
  let maxX = 0;
  for (const bl of blocks) {
    if (x > PAD && x + bl.w > MAX_W) {
      x = PAD;
      y += rowH + 14 + GAP * 2;
      rowH = 0;
    }
    placed.push({ b: bl, x, y });
    x += bl.w + GAP * 3;
    maxX = Math.max(maxX, x);
    rowH = Math.max(rowH, bl.h);
  }
  c.width = Math.max(maxX + PAD, 400);
  c.height = y + rowH + 14 + PAD;
  c.dataset['sheet'] = b.id;
  g.imageSmoothingEnabled = false;
  g.fillStyle = PAL.ui.box;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = PAL.ui.ink;
  g.font = 'bold 16px monospace';
  g.fillText(`${b.id}: ${b.title}  (${b.sprites.length} sprites, x${S})`, PAD, 24);
  for (const p of placed) {
    g.font = '12px monospace';
    g.fillStyle = PAL.lavender.hi;
    const d = p.b.def;
    g.fillText(`${String(d.key)}  ${d.grid[0]?.length ?? 0}x${d.grid.length}${d.fps ? `  ${d.fps}fps` : ''}`, p.x, p.y + 14);
    let vx = p.x;
    const vh = p.b.h - LABEL_H;
    for (const v of p.b.views) vx += drawView(g, v, vx, p.y + LABEL_H - 8, vh) + GAP;
  }
  return c;
}

for (const b of batches) document.body.appendChild(sheet(b));
window.__SHEET_READY__ = true;

export {};
