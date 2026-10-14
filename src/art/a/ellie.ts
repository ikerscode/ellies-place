/**
 * Ellie's poses (batch A). Everything is composed from the base heads and torsos in
 * src/art/base/ellie.ts (her design is locked, design/ELLIE.md): the head stays on rows
 * 0..8 so outfit overlays line up. Arms are drawn as short lines from the shoulders.
 */
import { E_DOWN, E_SIDE, E_UP, ELLIE_ANCHOR, LEG_F, LEG_S } from '../base/ellie';
import { def, mirror, seq } from '../base/grid';
import { ELLIE_PAL, PAL } from '../base/palette';
import type { Grid, SpriteDef } from '../base/types';
import { Cv, P } from './draw';

/** Ellie's palette plus the prop colours poses use. */
export const EP: Readonly<Record<string, string>> = {
  ...ELLIE_PAL,
  p: PAL.bone.hi,
  P: PAL.bone.lo,
  b: PAL.wine.base,
  B: PAL.wine.lo,
  m: PAL.lavender.base,
  M: PAL.lavender.lo,
  w: PAL.wood.base,
  W: PAL.wood.lo,
  o: PAL.gold.base,
  O: PAL.gold.lo,
  u: PAL.steel.base,
  U: PAL.steel.lo,
  i: PAL.ink.outline,
  n: PAL.leaf.base,
  N: PAL.leaf.lo,
  q: PAL.stone.base,
  Q: PAL.stone.lo,
  y: PAL.glow.base,
  k: PAL.terracotta.base,
  K: PAL.terracotta.lo,
};

type View = 'down' | 'up' | 'side';
type Pt = readonly [number, number];
/** An arm: shoulder to hand, figure-local coordinates. */
type Arm = readonly [Pt, Pt];

const SRC: Record<View, Grid> = { down: E_DOWN, up: E_UP, side: E_SIDE };

/** Head and torso without arms (rows 0..13); the arms are redrawn per pose. */
function torso(v: View): Grid {
  return SRC[v].map((row, y) => (y >= 9 ? [...row].map((ch) => (ch === 's' || ch === 'T' ? 'd' : ch)).join('') : row));
}

export const SHOULDERS: Record<View, readonly Pt[]> = { down: [[2, 10], [9, 10]], up: [[2, 10], [9, 10]], side: [[7, 10]] };

function drawArm(cv: Cv, [a, b]: Arm): void {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n;
    const y = a[1] + ((b[1] - a[1]) * i) / n;
    cv.px(x, y, i === n ? 's' : i % 2 === 0 ? 'T' : 's');
  }
}

interface FigOpts {
  readonly w?: number;
  readonly h?: number;
  readonly ox?: number;
  readonly oy?: number;
  readonly legs?: Grid;
  readonly arms?: readonly Arm[];
  /** Shear the upper body forward by k px per row above the waist. */
  readonly lean?: number;
  /** Head drop in px (the head and shoulders slide down over the body). */
  readonly dy?: number;
  readonly dx?: number;
  readonly rows?: number;
}

/** A standing figure: torso + legs + arms on a w x h canvas. */
function fig(v: View, o: FigOpts = {}): Cv {
  const w = o.w ?? 12;
  const h = o.h ?? 16;
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const cv = new Cv(w, h);
  const t = torso(v).slice(0, o.rows ?? 14);
  const lean = o.lean ?? 0;
  // body rows first, then the head slid by dy so it covers the shoulders
  t.forEach((row, y) => {
    const isHead = y <= 8;
    const sx = Math.round((13 - y) * lean) + (isHead ? (o.dx ?? 0) : 0);
    const sy = isHead ? (o.dy ?? 0) : 0;
    if (isHead) return;
    cv.put(ox + sx, oy + y + sy, [row]);
  });
  t.slice(0, 9).forEach((row, y) => {
    const sx = Math.round((13 - y) * lean) + (o.dx ?? 0);
    cv.put(ox + sx, oy + y + (o.dy ?? 0), [row]);
  });
  if (o.legs) cv.put(ox, oy + (o.rows ?? 14), o.legs);
  for (const a of o.arms ?? []) drawArm(cv, [[a[0][0] + ox, a[0][1] + oy], [a[1][0] + ox, a[1][1] + oy]]);
  return cv;
}

const F = (v: View, o?: FigOpts): Grid => fig(v, o).g;

const L_TOGETHER_F: Grid = ['....tttt....', '....llll....'];
const L_TOGETHER_S: Grid = LEG_S[0] ?? [];
const L_APART_S_A: Grid = ['...tt..tt...', '..ll...ll...'];
const L_APART_S_B: Grid = ['...tt..tt...', '...ll...ll..'];
const L_STAND: Record<View, Grid> = { down: LEG_F[0] ?? [], up: LEG_F[0] ?? [], side: L_TOGETHER_S };
const L_WALK: Record<View, readonly Grid[]> = {
  down: [LEG_F[0] ?? [], L_TOGETHER_F, LEG_F[1] ?? [], L_TOGETHER_F],
  up: [LEG_F[0] ?? [], L_TOGETHER_F, LEG_F[1] ?? [], L_TOGETHER_F],
  side: [L_APART_S_A, L_TOGETHER_S, L_APART_S_B, L_TOGETHER_S],
};

const A = ELLIE_ANCHOR;
const arm = (v: View, side: 0 | 1, to: Pt): Arm => [SHOULDERS[v][side] ?? [7, 10], to];

/** Arms swinging for a walk frame. */
function swing(v: View, k: number): Arm[] {
  if (v === 'side') return [arm(v, 0, [7 + (k === 0 ? 1 : k === 2 ? -1 : 0), 13])];
  const l = k === 0 ? 12 : k === 2 ? 14 : 13;
  const r = k === 0 ? 14 : k === 2 ? 12 : 13;
  return [
    [[2, 10], [1, Math.min(l, 13)]],
    [[9, 10], [10, Math.min(r, 13)]],
  ];
}

/** Prop (carried item) frames. */
const BOX: Grid = ['wwwwww', 'WwwwwW', 'WWWWWW'];

function walkFrames(v: View, hands: 'swing' | 'carry'): Grid[] {
  return [0, 1, 2, 3].map((k) => {
    const bob = k % 2 === 1 ? 0 : 0;
    const legs = L_WALK[v][k] ?? [];
    if (hands === 'swing') return F(v, { legs, arms: swing(v, k) });
    const cv = fig(v, {
      legs,
      arms:
        v === 'side'
          ? [arm(v, 0, [10, 11])]
          : v === 'up'
            ? [[[2, 10], [3, 12]], [[9, 10], [8, 12]]]
            : [[[2, 10], [4, 12]], [[9, 10], [7, 12]]],
    });
    void bob;
    return cv.g;
  });
}

const dirsOf = (f: (v: View) => Grid[]): Record<View, Grid[]> => ({ down: f('down'), up: f('up'), side: f('side') });

/** Seated base: head and torso to row 11 plus the dress spread over a seat. */
const LAP_D: Grid = ['.dDddddddDd.', 'DDDDDDDDDDDD', '.ll......ll.'];
const LAP_U: Grid = ['.dDddddddDd.', 'DDDDDDDDDDDD', '.ll......ll.'];
const LAP_S: Grid = ['..dDdddddddt', '..DDDDDDDDDl', '.........lll'];
const LAP: Record<View, Grid> = { down: LAP_D, up: LAP_U, side: LAP_S };

function sitFig(v: View, arms: readonly Arm[], o: { dy?: number; hand?: (cv: Cv) => void } = {}): Grid {
  const cv = fig(v, { rows: 12, h: 15, dy: o.dy ?? 0 });
  cv.put(0, 12, LAP[v]);
  for (const a of arms) drawArm(cv, a);
  o.hand?.(cv);
  return cv.g;
}

const sitRest = (v: View): Arm[] => (v === 'side' ? [[[7, 10], [8, 12]]] : [[[2, 10], [3, 12]], [[9, 10], [8, 12]]]);

const blinkRow = (g: Grid, y: number): Grid => g.map((row, j) => (j === y ? [...row].map((c) => (c === 'e' ? 's' : c)).join('') : row));

/** Hand-to-mouth cycle for eating and drinking while seated. */
function mouthCycle(v: 'down' | 'side', item: Grid, itemDx: number): Grid[] {
  const hand: Pt[] =
    v === 'down'
      ? [
          [6, 11],
          [7, 9],
          [7, 8],
          [7, 9],
        ]
      : [
          [9, 11],
          [10, 9],
          [10, 7],
          [10, 9],
        ];
  return hand.map((h) => {
    const shoulder: Arm = v === 'down' ? [[9, 10], h] : [[7, 10], h];
    const other: Arm[] = v === 'down' ? [[[2, 10], [4, 12]]] : [];
    return sitFig(v, [...other, shoulder], {
      hand: (cv) => cv.put(h[0] + itemDx, h[1] - item.length + 1, item),
    });
  });
}

const BOWL: Grid = ['pp', 'PP'];
const MUG: Grid = ['mm', 'mM'];

/** Fixed-size frame lists. */
function reach(v: View, to: Pt, extra?: FigOpts): Grid {
  return F(v, { legs: L_STAND[v], arms: [arm(v, v === 'side' ? 0 : 1, to)], ...extra });
}

/** Wide side-view pose helper for training stations. */
function sideFig(w: number, h: number, ox: number, oy: number, legs: Grid, arms: readonly Arm[], o: FigOpts = {}): Cv {
  return fig('side', { w, h, ox, oy, legs, arms, ...o });
}

const E = (key: string, frames: Partial<Record<View, readonly Grid[]>>, fps: number, anchor = A): SpriteDef =>
  def(key, null, EP, { anchor, fps, dirs: frames });

// ---- poses -------------------------------------------------------------------------

const sitFrames = (v: View): Grid[] => {
  const a = sitFig(v, sitRest(v));
  return [a, v === 'up' ? sitFig(v, sitRest(v), { dy: 0 }).map((r, y) => (y === 11 ? r : r)) : blinkRow(sitFig(v, sitRest(v)), 5)];
};

/** The lying pose, 20 x 9: stargazing on her back, head left, feet right. */
const LIE_A: Grid = P(20, [
  '..hhhhh.............',
  '.hhHhhhhh...........',
  'hhghsssssddddddd....',
  'hhgsesssdddDDdddtt..',
  'hhgsssrsTddDDDddtll.',
  'hhgsscssTTdddDDdttll',
  '.hhhhsssdddddDDD.ttl',
  '..hhh...DDDDDD......',
  '....................',
]);
const LIE_B: Grid = LIE_A.map((r, y) => (y === 3 || y === 4 ? r : r)).map((r, y) => (y === 7 ? '..hhh....DDDDD.......' : r)).map((r) => r.slice(0, 20));

const SLEEP_A: Grid = P(12, [
  '...hhhhhh...',
  '..hHHhhhhhh.',
  '.hhghhhhghhh',
  '.hgsssssssgh',
  '.gsssssssssg',
  '.gcsssrsscg.',
  'hhbbbbbbbbbh',
  'hbbBbbbbBbbh',
  'bbBBBBBBBBBb',
  'BBBBBBBBBBBB',
]);
const SLEEP_B: Grid = SLEEP_A.map((r, y) => (y === 7 ? 'hbbbbbbbbbbh' : y === 8 ? 'bBBbbbbbbBBb' : r));

const SIT_FLOOR_D: Grid = (() => {
  const cv = new Cv(14, 12);
  E_DOWN.slice(0, 11).forEach((row, y) => cv.put(1, y, [row]));
  cv.put(0, 10, ['.ssTddddddTss.'.slice(0, 14)]);
  cv.put(0, 11, ['.lttttttttttl.'.slice(0, 14)]);
  cv.put(0, 11, ['.llttttttttll.'.slice(0, 14)]);
  return cv.g;
})();
const SIT_FLOOR_S: Grid = (() => {
  const cv = new Cv(14, 12);
  E_SIDE.slice(0, 11).forEach((row, y) => cv.put(1, y, [row]));
  cv.put(0, 11, ['..lttttttttl..']);
  cv.put(0, 10, ['....ddddsTdd..']);
  return cv.g;
})();

const dance = (): Grid[] => {
  const base = (dx: number, up: number, flip = false): Grid => {
    const cv = fig('down', { w: 14, h: 16, ox: 1 + dx, legs: LEG_F[dx === 0 ? 0 : 1] ?? [] });
    const arms: Arm[] =
      up === 0
        ? [[[3, 10], [1, 6]], [[10, 10], [12, 6]]]
        : up === 1
          ? [[[3, 10], [2, 4]], [[10, 10], [11, 4]]]
          : [[[3, 10], [0, 9]], [[10, 10], [13, 9]]];
    for (const a of arms) drawArm(cv, a);
    return flip ? mirror(cv.g) : cv.g;
  };
  return [base(0, 0), base(1, 1), base(0, 2), base(-1, 1), base(0, 0, true), base(1, 2)];
};

const headbang = (v: 'down' | 'side'): Grid[] => {
  const legs = L_STAND[v];
  const arms: Arm[] = v === 'side' ? [[[7, 10], [9, 12]]] : [[[2, 10], [1, 13]], [[9, 10], [10, 13]]];
  const hornHand: Arm[] = v === 'down' ? [[[9, 10], [11, 7]]] : [];
  const mk = (dy: number, dx: number, hair: boolean): Grid => {
    const cv = fig(v, { legs, arms: [...arms.slice(0, v === 'down' ? 1 : 1), ...hornHand], dy, dx });
    if (hair) {
      cv.put(0, 8 + dy, v === 'down' ? ['.g........g.'] : ['gg..........']);
      cv.put(0, 9 + dy, v === 'down' ? ['..g......g..'] : ['.gh.........']);
    }
    return cv.g;
  };
  return [mk(0, 0, false), mk(2, v === 'side' ? 1 : 0, true), mk(0, 0, false), mk(2, v === 'side' ? 1 : -1, true)];
};

const stretch = (): Grid[] => {
  const mk = (a: Arm[], lean = 0): Grid => {
    const cv = fig('down', { w: 12, h: 18, oy: 2, legs: LEG_F[0] ?? [], lean });
    for (const x of a) drawArm(cv, x);
    return cv.g;
  };
  return [
    mk([[[2, 12], [0, 10]], [[9, 12], [11, 10]]]),
    mk([[[2, 12], [0, 6]], [[9, 12], [11, 6]]]),
    mk([[[2, 12], [2, 1]], [[9, 12], [9, 1]]]),
    mk([[[2, 12], [0, 5]], [[9, 12], [11, 5]]]),
  ];
};

/** Low pose helpers (pet, kneel). */
function crouch(v: 'down' | 'side', hand: Pt, k: number): Grid {
  const cv = new Cv(12, 14);
  const t = torso(v).slice(0, 12);
  t.forEach((row, y) => cv.put(0, y, [row]));
  cv.put(0, 12, v === 'down' ? ['.tt......tt.', '.ll......ll.'] : ['...tttttt...', '...ll...ll..']);
  if (k) cv.put(0, 11, ['..dDddddDd..']);
  drawArm(cv, [SHOULDERS[v][v === 'down' ? 1 : 0] ?? [7, 10], hand]);
  if (v === 'down') drawArm(cv, [[2, 10], [3, 12]]);
  return cv.g;
}

function kneel(v: 'down' | 'side', k: number): Grid {
  const cv = new Cv(12, 13);
  torso(v).slice(0, 12).forEach((row, y) => cv.put(0, y + (k && y < 9 ? 1 : 0) - (k && y < 9 ? 1 : 0), [row]));
  if (v === 'down') {
    cv.put(0, 11, ['.dDddddddDd.']);
    cv.put(0, 12, ['.ll.tt..ll..'].map((r) => r.slice(0, 12).padEnd(12, '.')));
    drawArm(cv, [[2, 10], [3, 12]]);
    drawArm(cv, [[9, 10], [k ? 10 : 8, k ? 7 : 12]]);
  } else {
    cv.put(0, 11, ['..dDdddddtt.']);
    cv.put(0, 12, ['..ll....lll.']);
    drawArm(cv, [[7, 10], [k ? 10 : 8, k ? 8 : 12]]);
  }
  return cv.g;
}

const BALL: Grid = ['pp', 'pP'];

function trainPoses(): SpriteDef[] {
  const out: SpriteDef[] = [];
  const skierg = [0, 1, 2, 3].map((k) => {
    const pull = [0, 1, 2, 1][k] ?? 0;
    const hy = 2 + pull * 4;
    const cv = sideFig(14, 16, 1, 0, L_TOGETHER_S, [[[7, 10], [10, hy]]], { dy: pull > 1 ? 1 : 0 });
    cv.put(11, 0, ['uu']);
    cv.line(11, 1, 11, 15, 'U');
    return cv.g;
  });
  out.push(E('ellie.train.skierg', { side: skierg }, 6));
  const push = [0, 1, 2, 3].map((k) =>
    sideFig(16, 14, 1, 0, k % 2 ? L_APART_S_A : L_APART_S_B, [[[7, 10], [11, 11]]], { lean: 0.35, rows: 12 }).put(12, 6, ['UUU', 'uuu', 'UUU']).g,
  );
  out.push(E('ellie.train.sledpush', { side: push }, 6));
  const pull = [0, 1, 2, 3].map((k) => {
    const cv = sideFig(16, 15, 0, 1, k % 2 ? L_APART_S_A : L_APART_S_B, [[[7, 10], [11 - (k % 2), 10]]], { lean: -0.3, rows: 13 });
    cv.line(11, 10, 15, 11, 'W');
    return cv.g;
  });
  out.push(E('ellie.train.sledpull', { side: pull }, 6));
  const burpee = [
    sideFig(16, 16, 2, 0, L_TOGETHER_S, [[[7, 10], [8, 13]]]).g,
    sideFig(16, 16, 2, 5, L_APART_S_A, [[[7, 10], [10, 14]]], { lean: 0.3, rows: 9 }).g,
    P(16, ['', '', '', '', '', '', '', '', '', '', '', '...........hhhhh.', '.......hhhhhhhssse', '.ttttddddddddsTss.'.slice(0, 16), '.lltttDDDDDDDhhh', '................'].map((r) => r)),
    sideFig(16, 16, 2, 4, L_APART_S_A, [[[7, 10], [11, 12]]], { lean: 0.3, rows: 10 }).g,
    sideFig(16, 16, 4, 0, L_APART_S_B, [[[7, 10], [11, 6]]]).g,
    sideFig(16, 16, 3, 0, L_TOGETHER_S, [[[7, 10], [9, 13]]]).g,
  ];
  out.push(E('ellie.train.burpeebroadjump', { side: burpee }, 8));
  const row = [0, 1, 2, 3].map((k) => {
    const cv = new Cv(18, 10);
    cv.put(0, 0, P(18, ['..hhhh', '.hhHhhgsss', '.hhhhhgsess', '.hhhhhgsssr', '.hhhhggddsTT']).map((r) => r));
    const lx = [11, 9, 7, 9][k] ?? 9;
    cv.rect(2, 5, 7, 3, 'd').rect(2, 7, 7, 1, 'D');
    cv.line(7, 6, lx, 6, 's');
    cv.put(9, 6, ['tt', 'll']);
    cv.rect(0, 8, 18, 1, 'Q').rect(lx - 2, 8, 3, 1, 'u');
    return cv.g;
  });
  out.push(E('ellie.train.rowing', { side: row }, 6, { x: 9, y: 10 }));
  const farm = (v: 'down' | 'side'): Grid[] =>
    [0, 1, 2, 3].map((k) => {
      const legs = v === 'down' ? (LEG_F[k % 2 ? 1 : 0] ?? []) : (k % 2 ? L_APART_S_A : L_TOGETHER_S);
      const arms: Arm[] = v === 'down' ? [[[2, 10], [1, 14]], [[9, 10], [10, 14]]] : [[[7, 10], [8, 14]]];
      const cv = fig(v, { w: 14, h: 16, ox: 1, legs, arms });
      if (v === 'down') cv.put(0, 14, ['ww']).put(12, 14, ['ww']);
      else cv.put(9, 14, ['ww']);
      return cv.g;
    });
  out.push(E('ellie.train.farmerscarry', { down: farm('down'), side: farm('side') }, 6, { x: 7, y: 16 }));
  const lunge = [0, 1, 2, 3].map((k) => {
    const d = [0, 1, 2, 1][k] ?? 0;
    const cv = sideFig(14, 16, 1, d, d ? L_APART_S_A : L_TOGETHER_S, [[[7, 10], [8, 9]]], { rows: 14 });
    cv.put(2, 9 + d, ['kkkkkkkk']);
    return fit16(cv.g);
  });
  out.push(E('ellie.train.sandbaglunges', { side: lunge }, 4, { x: 7, y: 16 }));
  const wall = [0, 1, 2, 3].map((k) => {
    const sq = k === 0 ? 3 : k === 1 ? 0 : k === 2 ? 0 : 2;
    const ballY = k === 0 ? 11 : k === 1 ? 7 : k === 2 ? 0 : 6;
    const cv = fig('down', { w: 12, h: 20, oy: 4 + (sq ? 1 : 0) + (k === 0 ? 1 : 0), legs: LEG_F[sq ? 1 : 0] ?? [] });
    cv.put(0, 0, new Cv(12, 4).g);
    for (const a of [[[2, 14], [4, ballY + 3]], [[9, 14], [7, ballY + 3]]] as Arm[]) drawArm(cv, a);
    cv.put(4, Math.max(0, ballY), BALL).px(5, Math.max(0, ballY), 'p');
    return cv.g;
  });
  out.push(E('ellie.train.wallballs', { down: wall }, 6, { x: 6, y: 20 }));
  const run = [0, 1, 2, 3].map((k) => {
    const legs: Grid[] = [
      ['..tt..tt....', '.ll....ll...'],
      ['....tttt....', '....llll....'],
      ['....tt.tt...', '....ll..ll..'],
      ['....tttt....', '....llll....'],
    ];
    return sideFig(14, 16, 1, 0, legs[k] ?? [], [[[7, 10], [k % 2 ? 9 : 6, 12]]], { lean: 0.2 }).g;
  });
  out.push(E('ellie.train.run', { side: run }, 8, { x: 7, y: 16 }));
  const kb = [0, 1, 2, 3].map((k) => {
    const up = [0, 1, 2, 1][k] ?? 0;
    const cv = fig('down', { legs: LEG_F[1] ?? [], arms: [[[2, 10], [4, 12 - up * 2]], [[9, 10], [7, 12 - up * 2]]] });
    cv.put(4, 13 - up * 2 + 0, ['KK', 'kk']);
    return cv.g;
  });
  out.push(E('ellie.train.kettlebell', { down: kb }, 6));
  return out;
}

/** Re-crops a taller training frame to 16 rows from the bottom. */
function fit16(g: Grid): Grid {
  return g.length === 16 ? g : g.slice(g.length - 16);
}

// ---- the list ------------------------------------------------------------------------

const mopeFrames = (v: View): Grid[] =>
  [0, 1, 2, 3].map((k) =>
    F(v, { legs: L_WALK[v][k] ?? [], arms: v === 'side' ? [arm(v, 0, [7, 13])] : [[[2, 10], [2, 13]], [[9, 10], [9, 13]]], dy: 1 }),
  );

export const ELLIE_POSES: readonly SpriteDef[] = [
  E('ellie.walk', dirsOf((v) => walkFrames(v, 'swing')), 6),
  E('ellie.carry', dirsOf((v) => walkFrames(v, 'carry')), 6),
  E('ellie.use', dirsOf((v) => [F(v, { legs: L_STAND[v], arms: v === 'side' ? [arm(v, 0, [10, 11])] : v === 'up' ? [[[2, 10], [3, 12]], [[9, 10], [8, 12]]] : [[[2, 10], [4, 12]], [[9, 10], [6, 12]]] }), F(v, { legs: L_STAND[v], arms: v === 'side' ? [arm(v, 0, [10, 10])] : v === 'up' ? [[[2, 10], [4, 11]], [[9, 10], [7, 11]]] : [[[2, 10], [5, 11]], [[9, 10], [7, 12]]] })]), 4),
  E('ellie.mope', dirsOf(mopeFrames), 4),
  E('ellie.sit', dirsOf(sitFrames), 1, { x: 6, y: 15 }),
  E('ellie.sit_floor', { down: [SIT_FLOOR_D, blinkRow(SIT_FLOOR_D, 5)], side: [SIT_FLOOR_S, blinkRow(SIT_FLOOR_S, 5)] }, 1, { x: 7, y: 12 }),
  E('ellie.lie', { side: [LIE_A, LIE_B] }, 1, { x: 10, y: 9 }),
  E('ellie.sleep', { down: [SLEEP_A, SLEEP_B] }, 1, { x: 6, y: 10 }),
  E('ellie.eat', { down: mouthCycle('down', BOWL, 0), side: mouthCycle('side', BOWL, 0) }, 4, { x: 6, y: 15 }),
  E('ellie.drink', { down: mouthCycle('down', MUG, 0), side: mouthCycle('side', MUG, 0) }, 4, { x: 6, y: 15 }),
  E(
    'ellie.read',
    {
      down: [0, 1].map((k) => sitFig('down', [[[2, 10], [3, 10]], [[9, 10], [8, 10]]], { hand: (cv) => cv.put(3, 10, k ? ['bbPbbbpb', 'bbPbbpPb'] : ['bbbbbbbb', 'bbbbbbbb']) })),
      side: [0, 1].map((k) => sitFig('side', [[[7, 10], [9, 11]]], { hand: (cv) => cv.put(8, 10, k ? ['pP', 'pP', 'bb'] : ['bb', 'bb'])})),
    },
    1,
    { x: 6, y: 15 },
  ),
  E('ellie.dance', { down: dance() }, 6, { x: 7, y: 16 }),
  E('ellie.headbang', { down: headbang('down'), side: headbang('side') }, 8),
  E('ellie.pet', { down: [crouch('down', [10, 12], 0), crouch('down', [11, 11], 1)], side: [crouch('side', [10, 12], 0), crouch('side', [11, 11], 1)] }, 3, { x: 6, y: 14 }),
  E('ellie.bow', { down: [F('down', { legs: L_STAND.down, arms: swing('down', 1), dy: 1 }), F('down', { legs: L_STAND.down, arms: [[[2, 10], [2, 13]], [[9, 10], [9, 13]]], dy: 3 })], side: [F('side', { legs: L_STAND.side, arms: swing('side', 1), dy: 1 }), F('side', { legs: L_STAND.side, arms: [arm('side', 0, [8, 14])], dy: 3, dx: 1, lean: 0.15 })] }, 2),
  E('ellie.kneel', { down: [kneel('down', 0), kneel('down', 1)], side: [kneel('side', 0), kneel('side', 1)] }, 2, { x: 6, y: 13 }),
  E('ellie.stretch', { down: stretch() }, 4, { x: 6, y: 18 }),
  E('ellie.bath', { down: [P(12, ['...hhhhhh...', '..hHHhhhhhh.', '.hhghhhhghhh', '.hgssssssgh.', '.gssesssesg.', '.gcsssrsscg.', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'WWWWWWWWWWWW']).concat([['............'][0] ?? '']), P(12, ['...hhhhhh...', '..hHHhhhhhh.', '.hhghhhhghhh', '.hgssssssgh.', '.gssesssesg.', '.gcsssrsscg.', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'WWWWWWWWWWWW', '............']).map((r, y) => (y === 5 ? '.gcsssrsscg.' : r))].map((g, i) => (i ? g.map((r, y) => (y === 3 ? '.hgssssssgh.' : r)) : g)) }, 1, { x: 6, y: 10 }),
  E(
    'ellie.game',
    {
      down: [0, 1].map((k) => sitFig('down', [[[2, 10], [4, 11]], [[9, 10], [7, 11]]], { hand: (cv) => cv.put(4, 10, k ? ['KKkkKK'] : ['kKkkKk']) })),
      up: [sitFig('up', [[[2, 10], [3, 12]], [[9, 10], [8, 12]]]), sitFig('up', [[[2, 10], [3, 11]], [[9, 10], [8, 12]]])],
    },
    4,
    { x: 6, y: 15 },
  ),
  E('ellie.handheld', { down: [0, 1].map((k) => P(12, ['...hhhhhh...', '..hHHhhhhhh.', '.hhghhhhghhh', '.hgsssssssh.', '.gssesssessg', 'hgcsssrsscgh', 'bbbbssssbbbb', 'bbbBsKkKsBbb', 'bBBBBkKkBBBb', 'BBBBBBBBBBBB']).map((r, y) => (y === 8 && k ? 'bBBBBKkKBBBb' : r))) }, 4, { x: 6, y: 10 }),
  E('ellie.photo', { down: [reach('down', [8, 8]), reach('down', [8, 7])].map((g) => over(g, 4, 6, ['uuuu', 'UKKU'])), side: [reach('side', [10, 6]), reach('side', [10, 6])].map((g, i) => over(g, 9, 4, i ? ['uuu', 'UKu'] : ['uuu', 'UKU'])) }, 2),
  E('ellie.twirl', { down: [F('down', { legs: LEG_F[0] ?? [], arms: [[[2, 10], [0, 12]], [[9, 10], [11, 8]]] }), F('side', { legs: L_TOGETHER_S, arms: [arm('side', 0, [10, 8])] }), F('up', { legs: LEG_F[0] ?? [], arms: [[[2, 10], [0, 8]], [[9, 10], [11, 12]]] }), mirror(F('side', { legs: L_TOGETHER_S, arms: [arm('side', 0, [10, 8])] }))] }, 6),
  E('ellie.cheer', { down: [F('down', { h: 18, oy: 2, legs: LEG_F[0] ?? [], arms: [[[2, 12], [0, 4]], [[9, 12], [11, 4]]] }), F('down', { h: 18, oy: 1, legs: LEG_F[1] ?? [], arms: [[[2, 11], [0, 3]], [[9, 11], [11, 3]]] })] }, 4, { x: 6, y: 18 }),
  E('ellie.dunk', { down: [0, 1, 2, 3].map((k) => { const cv = new Cv(14, 12); E_DOWN.slice(0, 11).forEach((row, y) => cv.put(1, y, [row])); cv.put(0, 11, ['.llttttttttll.']); const hx = [9, 8, 7, 8][k] ?? 8; const hy = [8, 9, 10, 9][k] ?? 9; cv.put(hx, hy, ['pp']).px(hx + 1, hy - 1, 'k'); cv.put(4, 10, ['uuuu']); return cv.g; }) }, 4, { x: 7, y: 12 }),
  E('ellie.hold_cat', { down: [0, 1].map((k) => { const cv = fig('down', { w: 14, h: 16, ox: 1, legs: LEG_F[0] ?? [], arms: [[[2, 10], [4, 12]], [[9, 10], [7, 12]]] }); cv.put(4, 10 + k, ['ffff', 'ffff']); return cv.g; }), side: [0, 1].map((k) => { const cv = fig('side', { w: 14, h: 16, ox: 1, legs: L_TOGETHER_S, arms: [arm('side', 0, [9, 12])] }); cv.put(8, 10 + k, ['ffff', 'ffff']); return cv.g; }) }, 2, { x: 7, y: 16 }),
  E('ellie.wand', { down: [reach('down', [11, 6], { w: 14 }), reach('down', [11, 9], { w: 14 })], side: [reach('side', [11, 6], { w: 14 }), reach('side', [11, 10], { w: 14 })] }, 4, { x: 6, y: 16 }),
  ...trainPoses(),
];

/** Convenience for tests. */
export const ellieSeq = seq;

function over(g: Grid, x: number, y: number, patch: Grid): Grid {
  return new Cv(g[0]?.length ?? 0, g.length, g).put(x, y, patch).g;
}
