/**
 * The Ellie's Place palette (design/spec/art.md section 2). Values come from game 1
 * (reference/every-version-of-me.html) wherever game 1 had them.
 *
 * Material ramps run hi (lit, top-left) -> base -> lo (shade) -> deep (contact shadow).
 * Sprites use 2 or 3 steps of one ramp per material. Neon is for Neon-tagged items only.
 */

export const PAL = {
  ink: {
    /** The outline every sprite gets from makeSprite. Also the "black" inside sprites. */
    outline: '#1a1320',
    /** Lavender rim outline for black cats and Poe, so they read on dark floors. */
    rim: '#8f84ad',
    /** Off-outline for disabled UI icons. */
    dim: '#6f5a8c',
  },
  ui: {
    page: '#cfc6db',
    ink: '#efe6f5',
    box: '#221c2d',
    boxEdge: '#0f0b14',
    boxInner: '#3d3452',
    muted: '#9d90b3',
    paper: '#efe4d0',
    paperInk: '#2a2030',
  },
  plum: { hi: '#6b4f8a', base: '#5b3f7a', lo: '#46305f', deep: '#2e2230' },
  lavender: { hi: '#e6d6ff', base: '#c9a2ff', lo: '#8e6cc2', deep: '#6f5a8c' },
  wine: { hi: '#b0304f', base: '#8a2f52', lo: '#7a2c4a', deep: '#3a1f2e' },
  moss: { hi: '#4f7d5c', base: '#3f6b4f', lo: '#335a42', deep: '#233a33' },
  leaf: { hi: '#6fbf6a', base: '#4f8a3a', lo: '#2f5a3f', deep: '#1f3b2d' },
  /** Warm wood: floors, tables, frames. */
  wood: { hi: '#8a5a44', base: '#6b4a3a', lo: '#553a2d', deep: '#3e2c30' },
  /** Dark stained wood: shelves, wardrobes, goth furniture. */
  darkwood: { hi: '#5a4046', base: '#4a3438', lo: '#3a282c', deep: '#2a1d20' },
  /** Pale wood: cottage furniture, cat trees. */
  pine: { hi: '#e8d0a8', base: '#c49070', lo: '#a0704f', deep: '#7a5238' },
  stone: { hi: '#b3b0c2', base: '#9a97a8', lo: '#6b6878', deep: '#55526a' },
  steel: { hi: '#e6e6f0', base: '#cfc6d9', lo: '#8a8599', deep: '#4d4a5e' },
  bone: { hi: '#fbf5ee', base: '#efe4d0', lo: '#c9b8a8', deep: '#9a8a7c' },
  gold: { hi: '#e9c46a', base: '#d4a84f', lo: '#a8803a', deep: '#6b4f2a' },
  night: { hi: '#5b6f9e', base: '#3f5f8a', lo: '#2e3f66', deep: '#1f2a44' },
  rose: { hi: '#f7b7c3', base: '#e5718f', lo: '#d98fa0', deep: '#8e2c4a' },
  terracotta: { hi: '#c9785b', base: '#b5654a', lo: '#8a4a3a', deep: '#5e3329' },
  /** Lamp light and flames. */
  glow: { hi: '#fff3c4', base: '#ffd98a', lo: '#e8b04b', deep: '#ffb74d' },
  /** Neon accents: only on Neon-tagged items. */
  neon: { pink: '#ff8fb8', cyan: '#8fc8ff', green: '#5ccf86', yellow: '#ffe066' },
  /** Ellie (game 1 CONFIG.look). Fixed by design/ELLIE.md. */
  ellie: {
    hair: '#2a2233',
    hairLight: '#4b3d63',
    streak: '#5ccf86',
    tattoo: '#3b3350',
    noseRing: '#e6e6f0',
    skin: '#f3d6c6',
    eye: '#2a2233',
    cheek: '#d98fa0',
    dress: '#2d2a3b',
    dressShade: '#1d1b27',
    accent: '#8e6cc2',
    tights: '#3a3350',
    boots: '#15131c',
  },
  george: { fur: '#f0a04b', stripe: '#d9782f', eye: '#7cc36a', nose: '#f7b7a3' },
  salem: { fur: '#2a2433', sheen: '#4a4260', eye: '#f5d547', nose: '#7d6385' },
  shadow: { fur: '#29232f', sheen: '#48405a', eye: '#a8dd6a', nose: '#6d5a78' },
  peaches: { fur: '#fbf5ee', grey: '#9d99ab', cream: '#f2c79a', eye: '#e0a84a', nose: '#f7b7c3' },
  bruce: { fur: '#fbf7f2', point: '#f0a04b', mark: '#f6c89a', eye: '#7fb6e8', nose: '#f7b7c3' },
  poe: { feather: '#221d2c', sheen: '#4f4670', eye: '#d9d4e8', beak: '#57536a', leg: '#8a7f9a' },
  pickle: { skin: '#6fbf6a', belly: '#cfe8a8', eyeWhite: '#ffffff', eye: '#2a2233', mouth: '#2f5a3f' },
  /** Outfit and prop accents from game 1 that sit outside the ramps. */
  extra: {
    white: '#ffffff',
    chefShade: '#d9d2e3',
    bucket: '#8a9a6a',
    bucketBrim: '#6f7f52',
    headband: '#1a1520',
    firefly: '#e9f5a0',
    pearl: '#f4efe6',
    polaroidSky: '#6a5a9c',
    polaroidHill: '#3d6a5e',
    polaroidSun: '#f3e7b0',
    vinyl: '#1a1720',
    vinylSheen: '#5a5470',
    feather: '#8a7f9a',
    glass: '#8fc8a8',
    glassHi: '#e6fff0',
    cork: '#8a5a44',
    snow: '#bfe3f2',
    snowWarm: '#ffe0a3',
    starmap: '#2e3f66',
    fortune: '#e9b45a',
    coffee: '#6b4a3a',
    mug: '#8e6cc2',
  },
} as const;

/** Every colour in PAL, for palette-discipline tests. */
export function paletteColours(): ReadonlySet<string> {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.add(v.toLowerCase());
    else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x);
  };
  walk(PAL);
  return out;
}

/** Ellie's sprite palette (game 1 `EP`). The streak colour can change (BRIEF 10.8). */
export function elliePalette(opts: { readonly streak?: string } = {}): Readonly<Record<string, string>> {
  const L = PAL.ellie;
  return {
    h: L.hair,
    H: L.hairLight,
    g: opts.streak ?? L.streak,
    T: L.tattoo,
    r: L.noseRing,
    s: L.skin,
    e: L.eye,
    c: L.cheek,
    d: L.dress,
    D: L.dressShade,
    a: L.accent,
    t: L.tights,
    l: L.boots,
  };
}

export const ELLIE_PAL = elliePalette();
export const GEORGE_PAL = { f: PAL.george.fur, F: PAL.george.stripe, e: PAL.george.eye, p: PAL.george.nose, k: PAL.ink.outline };
export const SALEM_PAL = { f: PAL.salem.fur, H: PAL.salem.sheen, e: PAL.salem.eye, p: PAL.salem.nose };
export const SHADOW_PAL = { f: PAL.shadow.fur, H: PAL.shadow.sheen, e: PAL.shadow.eye, p: PAL.shadow.nose };
export const PEACHES_PAL = { f: PAL.peaches.fur, g: PAL.peaches.grey, c: PAL.peaches.cream, e: PAL.peaches.eye, p: PAL.peaches.nose };
export const BRUCE_PAL = { f: PAL.bruce.fur, o: PAL.bruce.point, m: PAL.bruce.mark, e: PAL.bruce.eye, p: PAL.bruce.nose };
export const POE_PAL = { k: PAL.poe.feather, K: PAL.poe.sheen, e: PAL.poe.eye, b: PAL.poe.beak, l: PAL.poe.leg };
export const PICKLE_PAL = { g: PAL.pickle.skin, G: PAL.pickle.belly, w: PAL.pickle.eyeWhite, k: PAL.pickle.eye, m: PAL.pickle.mouth };
