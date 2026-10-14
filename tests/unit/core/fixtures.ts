/**
 * A tiny but complete ContentDb, for unit tests in any module until the real
 * tables land in src/content/data. Import it, do not copy it.
 * Numbers are close to sim.md and play.md but the data module is the source of truth.
 */
import { entitiesWith, getC } from '../../../src/core/state';
import { footprintTiles, rotateFacing, rotateOffset, tileCenter } from '../../../src/core/geometry';
import {
  AUTO_PLAY_SCORE,
  PASS_SCORE,
  asActivityId,
  asAspirationId,
  asCatalogCategoryId,
  asInteractionId,
  asItemId,
  asPaintId,
  asRoomId,
  asSpriteKey as sk,
  asStringKey as key,
  type CatDef,
  type CatName,
  type ContentDb,
  type ContentIndex,
  type EconomyTable,
  type Layer,
  type NavGrid,
  type NeedSpec,
  type RaceModel,
  type SimTuning,
  type TileKind,
  type WorldQueries,
} from '../../../src/core/types';

const need = (decayPerHour: number, gain = 1): NeedSpec => ({
  start: 80,
  decayPerHour,
  lowAt: 30,
  curve: { kind: 'urgency', scale: 3, exponent: 2, base: 0.15 },
  gain,
});

export const FIXTURE_TUNING: SimTuning = {
  time: {
    minutesPerTick: 0.05,
    startMinute: 9 * 60,
    startWeekday: 'thu',
    phases: { dawn: 300, day: 420, dusk: 1110, night: 1260 },
    nightDarkness: 0.65,
    lampsAtDarkness: 0.3,
    sleepFastForward: 10,
  },
  needs: {
    ellie: {
      energy: need(6),
      hunger: need(8),
      fun: need(7),
      fitness: need(1),
      calm: need(3),
      cosy: need(0),
    },
    cat: {
      food: need(6),
      play: need(5),
      affection: need(4),
      nap: need(5),
      royalty: need(4),
      chaos: need(5),
      solitude: need(3),
      vibes: need(4),
    },
    cosyEasePerHour: 30,
  },
  mood: {
    weights: { energy: 0.2, hunger: 0.2, fun: 0.2, fitness: 0.08, calm: 0.2, cosy: 0.12 },
    lowestPull: 0.2,
    lowestOf: ['energy', 'hunger', 'fun', 'calm'],
    moodletCap: 25,
    smoothingPerMinute: 5,
    walk: { atLow: 0.75, lowMood: 20, highMood: 60, floor: 0.7 },
  },
  bond: { thresholds: [20, 40, 60, 80], dailySoftCap: 10, overCapFactor: 0.3, maxLossPerDay: 2 },
  ai: {
    topK: 3,
    noise: [0.85, 1.15],
    distanceD0: { ellie: 15, cat: 12 },
    bondWeight: [0.7, 1.3],
    freeWillIdleTicks: 160,
    catIdleGapTicks: [40, 120],
    catCommitMinutes: 3,
    maxCandidates: 60,
    minScore: 0.25,
    urgency: { below: 20, factor: 2.5 },
    ellieTagWeights: { coffee: 1.15, rusk_ritual: 1.3, cat_social: 1.2 },
    repeatCap: { fromUse: 3, factor: 0.5 },
    recency: [
      { withinMinutes: 60, factor: 0.5 },
      { withinMinutes: 180, factor: 0.8 },
    ],
    bedtime: [
      { from: 1320, to: 120, factor: 2.5 },
      { from: 1260, to: 1320, factor: 1.5 },
      { from: 120, to: 300, factor: 1.5 },
      { from: 540, to: 1140, factor: 0.3 },
    ],
    lateNight: { from: 1410, to: 300, factor: 0.6, exempt: ['read', 'stargaze', 'lanterns', 'lamp'] },
    lowEnergySleep: { below: 10, factor: 2 },
    wishFactor: 1.3,
    catCircadian: [
      { from: 660, to: 960, factor: 1.3, tags: ['nap', 'nap_bed', 'nap_box'] },
      { from: 360, to: 480, factor: 1.3, tags: ['play_toy', 'zoomies', 'knock', 'follow_ellie'] },
      { from: 1080, to: 1260, factor: 1.3, tags: ['play_toy', 'zoomies', 'knock', 'follow_ellie'] },
      { from: 1380, to: 300, factor: 0.5, tags: 'allButNap' },
    ],
    idleScore: 0.3,
    wanderScore: 0.28,
  },
  cats: {
    accept: { base: 0.55, perTag: 0.4, bondDivisor: 250, lowBelow: 50, lowBonus: 0.15, min: 0.25, max: 1, asleepFactor: 0.5 },
    request: { below: 35, cooldownMinutes: 120, boost: 1.5, boostMinutes: 30 },
    happiness: { meanWeight: 0.6, personalityWeight: 0.4, likedStyleBonus: 5 },
    shadowGates: { pickUpBond: 40, lapBond: 60 },
    buildReaction: { george: 1, salemVase: 0.5, salemBox: 0.8, peachesPerItem: 0.6, peachesMaxItems: 2, shadow: 0.7 },
    zoomies: { chance: 0.7, from: 165, to: 210, minMinutes: 3, maxMinutes: 6, speed: 7, daytimeCooldownMinutes: 90 },
    george: {
      pillowChance: 0.6,
      pillowFromBond: 1,
      pillowFrom: 1260,
      pillowTo: 180,
      pillowGiveUp: 1350,
      sitsOnChance: 0.15,
      sitsOnRadius: 10,
      sitsOnRoyaltyBelow: 70,
      sitsOnEveryMinutes: 120,
      claimChance: 0.3,
      claimRadius: 8,
      claimRoyaltyBelow: 60,
      verdictApproveChance: 0.6,
      verdictBondBonus: 0.2,
      verdictApproveCost: 150,
      verdictMaxItems: 3,
    },
    salem: {
      followMinutes: 10,
      followFactor: 2,
      boxFactor: 3,
      boxMinutes: 60,
      boxChaosBelow: 95,
      knocksPerDay: 3,
      knockTrinketChance: 0.35,
      knockTrinketsPerDay: 2,
    },
    shadow: {
      trustMinutes: 10,
      trustRadius: 6,
      trustPerStep: 1,
      trustPerDay: 6,
      lapChance: 0.25,
      lapEveryMinutes: 10,
      softMoodBelow: 35,
      softFactor: 4,
      softMinutes: 30,
      softCooldownMinutes: 180,
      crowdActors: 3,
      crowdRadius: 3,
      crowdFactor: 0.5,
    },
    peaches: { sunbeamRecheckMinutes: 10, sunbeamSearchRadius: 4, ritualFactor: 3, lidFactor: 1.5 },
  },
  visitors: {
    bruce: {
      firstDay: 2,
      firstFrom: 660,
      firstTo: 900,
      hourlyChance: 0.08,
      fromHour: 7,
      toHour: 21,
      maxPerDay: 2,
      minGapHours: 4,
      spotWeights: {
        'bruce.fence': 0.35,
        'bruce.under_table': 0.2,
        'bruce.behind_tv': 0.15,
        'bruce.fridge_top': 0.15,
        'bruce.delivery_box': 0.15,
      },
      newSpotBoost: 1.5,
      windowPeekChance: 0.1,
      stayMin: 45,
      stayMax: 90,
      movesInAfterAllFound: 10,
      movesInAfterAny: 15,
      wallFrom: 480,
      wallTo: 1200,
      movedInHourlyChance: 0.04,
    },
    poe: {
      firstDay: 3,
      firstFrom: 600,
      firstTo: 840,
      dailyChance: 0.6,
      forceTrinkets: 3,
      forceAfterDays: 2,
      arriveFrom: 540,
      arriveTo: 960,
      stayMinutes: 90,
      afterTradeMinutes: 10,
    },
    pickle: { stayMinutes: 15, answerFun: 3 },
  },
  weather: { rainChance: 0.18, startFrom: 360, startTo: 1080, minMinutes: 120, maxMinutes: 360, outdoorFactor: 0.3, windowSitFactor: 1.5 },
  bubbles: {
    thoughtBelow: 30,
    thoughtGapTicks: [900, 1800],
    thoughtShowTicks: 60,
    speech: { afterEllie: 0.4, afterCat: 0.15, quirk: 0.8, verdict: 0.9, seesVisitor: 0.5 },
    globalCooldownTicks: 400,
    catCooldownTicks: 1200,
  },
  sun: {
    beams: {
      left: { from: 390, to: 660, peak: 480, depth: { kind: 'linear', start: 5, end: 2 }, shear: { start: 1, end: 1 } },
      up: { from: 540, to: 990, peak: 765, depth: { kind: 'arch', edge: 4, noon: 2 }, shear: { start: 3, end: -3 } },
      right: { from: 870, to: 1140, peak: 1050, depth: { kind: 'linear', start: 2, end: 5 }, shear: { start: 1, end: 1 } },
    },
    minCoverage: 0.5,
    recomputeMinutes: 5,
    intensity: { base: 0.1, amplitude: 0.35 },
    grassFrom: 420,
    grassTo: 1140,
  },
  clutter: { messClearHours: 36, boxClearHours: 48 },
  movement: { ellieTilesPerSecond: 3, jumpTicks: 6 },
  wishes: {
    perDay: 3,
    rollMinute: 7 * 60,
    earliestMinute: 5 * 60,
    perCategory: 1,
    maxCatWishes: 2,
    cooldownDays: 2,
    unseenWeight: 2,
    unseenDays: 2,
    neverDoneWeight: 3,
  },
  delivery: { minutes: 30 },
  housewarming: {
    unlockIf: {
      kind: 'all',
      of: [
        { kind: 'cosy', room: 'home', atLeast: 60 },
        { kind: 'roomsCosy', atLeast: 40, count: 'all' },
        { kind: 'dayAtLeast', day: 5 },
        { kind: 'not', of: { kind: 'flag', flag: 'housewarming.held' } },
      ],
    },
  },
  extra: {},
};

export const FIXTURE_ECONOMY: EconomyTable = {
  startHearts: 150,
  priceScale: 1.6,
  priceStep: 5,
  passScore: PASS_SCORE,
  autoPlayScore: AUTO_PLAY_SCORE,
  wishHearts: { small: 15, medium: 25, large: 40 },
  wishFullSet: 15,
  trickle: [
    { atMood: 50, hearts: 1 },
    { atMood: 75, hearts: 2 },
  ],
  minigame: { base: 2, perScore: 4, fullPayPerDay: 6, afterCap: 1 },
  flat: { run: 3, kettlebell: 2, stretch: 1, photo: 2, starWish: 3 },
  photosPaidPerDay: 3,
  bondLevelUp: 25,
  aspirationTierHearts: [50, 100, 175, 275],
  race: { finish: 40, overallPb: 30, stationSplitPb: 5 },
  medals: { bronze: 50, silver: 100, gold: 150, royal: 200 },
  critterbound: { newCritter: 10, wandererFirstWin: 25, sparWin: 5, sparWinsPerDay: 3 },
  sticker: 15,
  starWishLuck: 10,
  housewarming: 200,
  skillXp: { base: 10, perScore: 20, curveBase: 15, curvePerLevel: 5, maxLevel: 10 },
  maxHeartsPerDay: 2000,
};

export const FIXTURE_RACE: RaceModel = {
  station: { skill: 0.45, fitness: 0.35, score: 0.2, fresh: 0.03 },
  run: { fitness: 0.8, experience: 0.2, experienceRaces: 5, fresh: 0.03, coffee: 0.02, worstSeconds: 450, bestSeconds: 230 },
  freshEnergy: 60,
  coffeeHours: 3,
  medals: [
    { id: 'royal', underSeconds: 3600 },
    { id: 'gold', underSeconds: 4080 },
    { id: 'silver', underSeconds: 4800 },
    { id: 'bronze', underSeconds: 5700 },
    { id: 'finisher', underSeconds: null },
  ],
};

/** What createEmptySimState needs from content. */
export const FIXTURE_START = { tuning: FIXTURE_TUNING, economy: FIXTURE_ECONOMY } as const;

const cat = (name: CatName, personalityNeed: CatDef['personalityNeed']): CatDef => ({
  name,
  displayName: key(`cat.${name}.name`),
  sprite: sk(`cat.${name}`),
  personalityNeed,
  needWeights: {},
  decayWeights: {},
  tagWeights: {},
  likes: [],
  dislikes: [],
  walkSpeed: 3,
  runSpeed: 5,
  bondRate: 1,
  startBond: 30,
});

const ROWS = ['WWWWWW', 'W....W', 'W....D', 'WWWWWW'];

export function makeFixtureContent(): ContentDb {
  return {
    tuning: FIXTURE_TUNING,
    economy: FIXTURE_ECONOMY,
    lot: {
      w: 6,
      h: 4,
      rows: ROWS,
      legend: { W: 'wall', '.': 'floor', D: 'door' },
      rooms: [
        {
          id: asRoomId('living'),
          name: key('room.living'),
          kind: 'living',
          outdoor: false,
          seed: { tx: 1, ty: 1 },
          wallPaint: asPaintId('wall.plain.plum'),
          floorPaint: asPaintId('floor.wood.oak'),
          scored: true,
          cosyTarget: 160,
          plantTarget: 3,
        },
      ],
      start: [{ item: asItemId('sofa_small'), tile: { tx: 1, ty: 1 }, rotation: 0 }],
      spots: { ellieSpawn: { tx: 3, ty: 2 }, frontDoor: { tx: 5, ty: 2 } },
      windows: [],
    },
    items: [
      {
        id: asItemId('sofa_small'),
        name: key('item.sofa_small.name'),
        desc: key('item.sofa_small.desc'),
        category: 'seating',
        styles: ['goth'],
        tags: ['warm', 'room.living'],
        price: 120,
        valueOverride: 6,
        placement: 'in',
        footprint: { w: 2, h: 1 },
        rotations: [0, 1, 2, 3],
                topLayer: 1,
        slots: [
          { id: 'seatL', kind: 'sit', dx: 0, dy: 0, facing: 'down', layer: 0, for: [{ kind: 'anyone' }] },
          { id: 'seatR', kind: 'sit', dx: 1, dy: 0, facing: 'down', layer: 0, for: [{ kind: 'anyone' }] },
        ],
        interactions: [asInteractionId('sofa.sit')],
        unlock: 'start',
        mvp: true,
      },
      {
        id: asItemId('lamp_small'),
        name: key('item.lamp_small.name'),
        desc: key('item.lamp_small.desc'),
        category: 'lighting',
        styles: ['cottage'],
        tags: ['lamp'],
        price: 30,
        placement: 'surface',
        footprint: { w: 1, h: 1 },
        rotations: [0],
        states: ['on'],
        slots: [],
        light: { radius: 3, color: '#ffd9a0', intensity: 0.8, flag: 'on' },
        flags: { on: true },
        interactions: [asInteractionId('lamp.toggle')],
        unlock: 'asp.home.1',
        mvp: true,
      },
    ],
    interactions: [
      {
        id: asInteractionId('sofa.sit'),
        label: key('int.sit'),
        icon: sk('icon.int.sit'),
        target: 'object',
        actors: [{ kind: 'ellie' }, { kind: 'anyCat' }],
        tags: ['sit', 'nap'],
        posture: 'sit',
        adverts: [
          { for: { kind: 'ellie' }, needs: { energy: 5, calm: 5 } },
          { for: { kind: 'anyCat' }, needs: { nap: 10 } },
        ],
        slotKinds: ['sit'],
        duration: { kind: 'fixed', minutes: 30 },
        perHour: { energy: 6 },
        anims: { ellie: { loop: 'sit' }, cat: { loop: 'lie' } },
        requires: [],
        effects: [{ kind: 'stat', stat: 'int.sit', delta: 1 }],
        autonomous: true,
        mvp: true,
      },
      {
        id: asInteractionId('lamp.toggle'),
        label: key('int.lamp.toggle'),
        icon: sk('icon.int.lamp'),
        target: 'object',
        actors: [{ kind: 'ellie' }],
        tags: ['lamp'],
        adverts: [{ for: { kind: 'ellie' }, needs: { calm: 1 } }],
        duration: { kind: 'instant' },
        anims: { ellie: { loop: 'use' } },
        requires: [],
        effects: [{ kind: 'objectFlag', flag: 'on', value: true }],
        autonomous: true,
        cue: { cue: 'lamp.on' },
        mvp: true,
      },
      {
        id: asInteractionId('kettle.make_coffee'),
        label: key('int.kettle.make_coffee'),
        icon: sk('icon.int.coffee'),
        target: 'object',
        actors: [{ kind: 'ellie' }],
        tags: ['coffee'],
        adverts: [],
        duration: { kind: 'fixed', minutes: 5 },
        anims: { ellie: { loop: 'use' } },
        requires: [],
        effects: [{ kind: 'carry', carry: 'mug' }],
        autonomous: false,
        mvp: true,
      },
      {
        id: asInteractionId('grass.rusk_ritual'),
        label: key('int.dunkRusk'),
        icon: sk('icon.int.rusk'),
        target: 'tile',
        actors: [{ kind: 'ellie' }],
        tags: ['rusk_ritual', 'garden_sit', 'coffee', 'eat'],
        posture: 'sit',
        window: { from: 390, to: 1200 },
        autoFetch: [asInteractionId('kettle.make_coffee')],
        adverts: [{ for: { kind: 'ellie' }, needs: { calm: 30, hunger: 10 } }],
        duration: { kind: 'activity', activity: asActivityId('rusk_dunk') },
        anims: { ellie: { loop: 'sit' } },
        requires: [
          { when: { kind: 'carrying', carry: 'rusk' }, reason: key('ui.reason.needsItem') },
          { when: { kind: 'inRoom', who: 'actor', room: 'outdoor' }, reason: key('ui.reason.notNow') },
        ],
        effects: [],
        autonomous: false,
        mvp: true,
      },
    ],
    paints: [
      {
        id: asPaintId('wall.plain.plum'),
        name: key('paint.wall.plain.plum'),
        surface: 'wall',
        variant: 'plain', template: sk('pattern.wall.plain'), sound: 'wood',
        colors: ['#4a2b4f'],
        styles: ['goth'],
        price: 0,
        cosy: 1,
        unlock: 'start',
      },
      {
        id: asPaintId('floor.wood.oak'),
        name: key('paint.floor.wood.oak'),
        surface: 'floor',
        variant: 'wood', template: sk('pattern.floor.wood'), sound: 'wood',
        colors: ['#8a5a3b', '#6e4630'],
        styles: ['cottage'],
        price: 0,
        cosy: 1,
        unlock: 'start',
      },
    ],
    setBonuses: [],
    catalog: [
      {
        id: asCatalogCategoryId('comfy'),
        label: key('ui.catalog.comfy'),
        icon: sk('icon.catalog.comfy'),
        categories: ['seating', 'beds'],
      },
    ],
    cats: [cat('george', 'royalty'), cat('salem', 'chaos'), cat('shadow', 'solitude'), cat('peaches', 'vibes')],
    visitors: [],
    wishes: [],
    aspirations: [
      {
        id: asAspirationId('asp.home'),
        name: key('asp.home.name'),
        desc: key('asp.home.desc'),
        icon: sk('icon.asp.home'),
        tiers: [
          {
            title: key('asp.home.tier.1'),
            goal: { kind: 'cosy', room: 'any', atLeast: 45 },
            rewards: [{ kind: 'feeling', id: 'moodlet.aspiration_tier', label: key('moodlet.aspiration_tier'), mood: 12, minutes: 240 }],
            gift: asItemId('lamp_small'),
          },
        ],
        mvp: true,
      },
    ],
    outfits: [],
    mail: [],
    stickers: [],
    hyrox: [],
    race: FIXTURE_RACE,
    onboarding: [],
  };
}

const WALKABLE: ReadonlySet<TileKind> = new Set<TileKind>(['floor', 'door', 'grass', 'path', 'gate']);

/**
 * A small real implementation of WorldQueries over any SimState, for sim, cats
 * and engine unit tests until src/world lands: tiles from `state.lot`, floor
 * items block, slots from the item's SlotDef, no sunbeams. Navigation is cached
 * by `lot.revision` like the real one.
 */
export function makeFixtureWorld(content: ContentIndex): WorldQueries {
  let cached: NavGrid | null = null;
  const world: WorldQueries = {
    roomAt: (state, tile) => state.lot.roomAt[tile.ty * state.lot.w + tile.tx] ?? null,
    navGrid: (state) => {
      if (cached && cached.revision === state.lot.revision && cached.w === state.lot.w && cached.h === state.lot.h) return cached;
      const { w, h } = state.lot;
      const floor = state.lot.tiles.map((t) => (WALKABLE.has(t) ? 1 : 0));
      for (const id of entitiesWith(state as never, 'placeable')) {
        const pl = getC(state as never, 'placeable', id);
        const def = pl ? content.items.get(pl.item) : undefined;
        if (!pl || !def || def.placement === 'rug' || def.blocksPath === false || pl.mount.kind !== 'floor') continue;
        for (const t of footprintTiles(pl.tile, def.footprint, pl.rotation)) {
          const i = t.ty * w + t.tx;
          if (i >= 0 && i < floor.length) floor[i] = 0;
        }
      }
      const zero = new Array<number>(w * h).fill(0);
      cached = { w, h, revision: state.lot.revision, cost: [floor, zero, zero], jumps: [] };
      return cached;
    },
    slotPose: (state, entity, slot) => {
      const pl = getC(state as never, 'placeable', entity);
      const def = pl ? content.items.get(pl.item) : undefined;
      const sd = def?.slots[slot];
      if (!pl || !def || !sd) return null;
      const o = rotateOffset(sd.dx, sd.dy, def.footprint, pl.rotation);
      return {
        pos: tileCenter({ tx: pl.tile.tx + o.dx, ty: pl.tile.ty + o.dy }),
        facing: rotateFacing(sd.facing, pl.rotation),
        layer: sd.layer as Layer,
      };
    },
    footprintTiles: (item, tile, rotation) => {
      const def = content.items.get(item);
      return def ? footprintTiles(tile, def.footprint, rotation) : [];
    },
    sunbeams: () => [],
  };
  return world;
}
