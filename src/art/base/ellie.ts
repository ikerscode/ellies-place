/**
 * Ellie, ported from game 1 (E_DOWN, E_UP, E_SIDE, LEG_F, LEG_S, ELLIE.sit).
 * Her design is fixed by design/ELLIE.md: black hair (h, H) with green streaks (g) at the
 * front and both sides, nose ring (r), tattoos (T) on her arms and shoulders.
 *
 * Standing frames are 12 x 16 with the anchor at (6, 16). The head stays on rows 0..8 in
 * every upright frame so outfit overlays line up (design/spec/art.md 6).
 */
import { def, recolor, seq } from './grid';
import { ELLIE_PAL } from './palette';
import type { Grid, SpriteDef } from './types';

export const E_DOWN: Grid = [
  '...hhhhhh...',
  '..hHHhhhhhh.',
  '.hhghhhhghhh',
  '.hhghhhhghh.',
  '.hgssssssgh.',
  '.gssesssesg.',
  '.gcsssrsscg.',
  '.ghsssssshg.',
  '.ghhsaashhg.',
  'hsTsddddsTsh',
  '.sTddddddTs.',
  '.TsdDddDdsT.',
  '.sdDddddDds.',
  '.DDDDDDDDDD.',
];

export const E_UP: Grid = [
  '...hhhhhh...',
  '..hHHhhhhhh.',
  '.hhhhhhhhhhh',
  '.ghhhhhhhhg.',
  '.ghhhhhhhhg.',
  '.ghhhhhhhhg.',
  '.ghhhhhhhhg.',
  '.ghhhhhhhhg.',
  '.ghhhhhhhhg.',
  'hsThhhhhhTsh',
  '.sThhhhhhTs.',
  '.TsdDddDdsT.',
  '.sdDddddDds.',
  '.DDDDDDDDDD.',
];

/** Faces right (nose ring on the right edge). Left is this mirrored. */
export const E_SIDE: Grid = [
  '...hhhhhh...',
  '..hHHhhhhh..',
  '.hhhhhhhhgh.',
  '.hhhhhhghgh.',
  '.hhhhhgssss.',
  '.hhhhgsssess',
  '.hhhhgssscr.',
  '.hhhhgssss..',
  '.hhhhgaas...',
  '.hhhgdddsT..',
  '..hhhdddsT..',
  '...dDdddTs..',
  '..dDdddddsD.',
  '..DDDDDDDDD.',
];

/** Legs for the front and back views, two walk frames. */
export const LEG_F: readonly Grid[] = [
  ['...tt..tt...', '...ll..ll...'],
  ['..tt....tt..', '..ll....ll..'],
];
/** Legs for the side view, two walk frames. */
export const LEG_S: readonly Grid[] = [
  ['....tttt....', '....llll....'],
  ['...tt..tt...', '..ll...ll...'],
];

/** game 1 ELLIE.sit: the dress spreads and the boots poke out. */
export const E_SIT_LAP: Grid = ['.dDddddddDd.', 'DDDDDDDDDDDD', '.ll......ll.'];

const legs = (body: Grid, l: readonly Grid[], f: number): Grid => [...body, ...(l[f] ?? [])];

/** Eyes shut with skin (the darker shade rule: her skin is the lid). */
const blink = (g: Grid): Grid => g.map((row, y) => (y === 5 ? recolor([row], { e: 's' })[0] ?? row : row));

const down0 = legs(E_DOWN, LEG_F, 0);
const down1 = legs(E_DOWN, LEG_F, 1);
const up0 = legs(E_UP, LEG_F, 0);
const up1 = legs(E_UP, LEG_F, 1);
const side0 = legs(E_SIDE, LEG_S, 0);
const side1 = legs(E_SIDE, LEG_S, 1);

export const ELLIE_ANCHOR = { x: 6, y: 16 } as const;

export const ELLIE_SPRITES: readonly SpriteDef[] = [
  def('ellie.idle', down0, ELLIE_PAL, {
    anchor: ELLIE_ANCHOR,
    fps: 2,
    dirs: {
      down: seq([down0, blink(down0)], [5, 1]),
      up: [up0],
      side: seq([side0, blink(side0)], [5, 1]),
    },
  }),
  def('ellie.walk', down0, ELLIE_PAL, {
    anchor: ELLIE_ANCHOR,
    fps: 6,
    dirs: { down: [down0, down1], up: [up0, up1], side: [side0, side1] },
  }),
  def('ellie.sit', [...E_DOWN.slice(0, 12), ...E_SIT_LAP], ELLIE_PAL, { anchor: { x: 6, y: 15 }, fps: 1 }),
];
