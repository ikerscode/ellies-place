/**
 * Simulation tuning (design/spec/sim.md sections 1 to 3, 5, 8 to 13). Every number has its
 * spec row in the comment beside it. FROZEN rows 1 to 5, 15, 20, 23 and 27 rule where specs disagree.
 */
import type {
  CatNeed,
  CatTuning,
  Condition,
  DecayModifier,
  EllieNeed,
  NeedSpec,
  ResponseCurve,
  SimTuning,
  VisitorTuning,
} from '../../core';

const urgency = (scale: number, exponent: number): ResponseCurve => ({ kind: 'urgency', scale, exponent, base: 0.15 });
/** sim.md 5.2 curves. */
const BODY = urgency(3.0, 2.0);
const STEADY = urgency(2.0, 1.5);
const PERSONALITY = urgency(2.5, 1.5);

const asleep: Condition = { kind: 'asleep', who: 'actor' };
const awake: Condition = { kind: 'not', of: asleep };
const sitOrLie: Condition = {
  kind: 'all',
  of: [awake, { kind: 'any', of: [{ kind: 'posture', posture: 'sit' }, { kind: 'posture', posture: 'lie' }] }],
};
const exercise: Condition = { kind: 'doing', tag: 'exercise' };
const exerciseLight: Condition = { kind: 'doing', tag: 'exercise_light' };
const caffeinated: Condition = { kind: 'buff', id: 'caffeinated' };
const rainIndoors: Condition = { kind: 'all', of: [{ kind: 'weather', weather: 'rain' }, { kind: 'inRoom', who: 'actor', room: 'indoor' }] };

const mod = (m: DecayModifier): DecayModifier => m;

/** sim.md 2.2 and 2.3: Ellie's needs. Decay is per game hour awake. */
const ELLIE_NEEDS_SPEC: Record<EllieNeed, NeedSpec> = {
  energy: {
    start: 80,
    decayPerHour: 5.5,
    lowAt: 30,
    curve: BODY,
    gain: 1,
    modifiers: [
      mod({ when: exercise, multiplier: 3 }),
      mod({ when: exerciseLight, multiplier: 1.8 }),
      mod({ when: caffeinated, multiplier: 0.5 }),
      mod({ when: sitOrLie, multiplier: 0.8 }),
    ],
  },
  hunger: {
    start: 60,
    decayPerHour: 5.0,
    lowAt: 30,
    curve: BODY,
    gain: 1,
    modifiers: [
      mod({ when: asleep, multiplier: 0.4 }),
      mod({ when: exercise, multiplier: 1.5 }),
      mod({ when: exerciseLight, multiplier: 1.2 }),
    ],
  },
  fun: { start: 60, decayPerHour: 5.0, lowAt: 30, curve: STEADY, gain: 1, modifiers: [mod({ when: asleep, multiplier: 0.3 })] },
  fitness: { start: 55, decayPerHour: 0.75, lowAt: 30, curve: urgency(1.6, 1.2), gain: 1, modifiers: [mod({ when: asleep, multiplier: 0.5 })] },
  calm: {
    start: 70,
    decayPerHour: 2.5,
    lowAt: 30,
    curve: STEADY,
    gain: 1,
    modifiers: [
      mod({ when: exercise, multiplier: 0.5 }),
      mod({ when: rainIndoors, multiplier: 0.6 }),
      // Calm extras (sim.md 2.3): mess +0.5 each (cap 3), Salem's zoomies within 6 tiles +4, each of Energy, Hunger, Fun below 25 +1 (cap 3).
      mod({ when: awake, addPerHour: 0.5, perCount: { kind: 'mess', room: 'current' }, group: 'calm.mess', groupCap: 3 }),
      mod({ when: awake, addPerHour: 4, perCount: { kind: 'catsDoing', tag: 'zoomies', radius: 6 }, group: 'calm.zoomies', groupCap: 4 }),
      mod({ when: awake, addPerHour: 1, perCount: { kind: 'lowNeeds', needs: ['energy', 'hunger', 'fun'], below: 25 }, group: 'calm.low', groupCap: 3 }),
    ],
  },
  // Cosy follows the room score (home.md); no decay of its own. The start value is the sparse flat's score (sim.md 3.1 check: ~30).
  cosy: { start: 30, decayPerHour: 0, lowAt: 0, curve: urgency(1.0, 1.0), gain: 1 },
};

/** sim.md 8.2 and 8.3: cat needs. Per-cat multipliers live on CatDef.decayWeights. */
const CAT_NEEDS_SPEC: Record<CatNeed, NeedSpec> = {
  food: { start: 60, decayPerHour: 4.0, asleepDecayPerHour: 2.0, lowAt: 30, curve: BODY, gain: 1 },
  play: { start: 70, decayPerHour: 5.0, asleepDecayPerHour: 1.0, lowAt: 30, curve: STEADY, gain: 1 },
  affection: { start: 70, decayPerHour: 4.0, asleepDecayPerHour: 1.0, lowAt: 30, curve: STEADY, gain: 1 },
  nap: { start: 70, decayPerHour: 5.0, asleepDecayPerHour: 0, lowAt: 30, curve: urgency(2.5, 2.0), gain: 1 },
  royalty: { start: 60, decayPerHour: 4.0, asleepDecayPerHour: 2.0, lowAt: 30, curve: PERSONALITY, gain: 1 },
  chaos: { start: 60, decayPerHour: 6.0, asleepDecayPerHour: 3.0, lowAt: 30, curve: PERSONALITY, gain: 1 },
  // Shadow: 1.5/h alone, 4.0/h with another actor within 3 tiles (+2.5), doubled in a room playing Heavy.
  solitude: {
    start: 60,
    decayPerHour: 1.5,
    asleepDecayPerHour: 1.5,
    lowAt: 30,
    curve: PERSONALITY,
    gain: 1,
    modifiers: [
      mod({ when: { kind: 'catNear', radius: 3 }, addPerHour: 2.5 }),
      mod({ when: { kind: 'musicPlaying', station: 'heavy' }, multiplier: 2 }),
    ],
  },
  vibes: { start: 60, decayPerHour: 4.0, asleepDecayPerHour: 2.0, lowAt: 30, curve: PERSONALITY, gain: 1 },
};

const CATS: CatTuning = {
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
};

const VISITORS: VisitorTuning = {
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
};

export const TUNING: SimTuning = {
  time: {
    minutesPerTick: 0.05,
    startMinute: 9 * 60,
    startWeekday: 'thu',
    phases: { dawn: 300, day: 420, dusk: 1110, night: 1260 },
    nightDarkness: 0.65,
    lampsAtDarkness: 0.3,
    sleepFastForward: 10,
  },
  needs: { ellie: ELLIE_NEEDS_SPEC, cat: CAT_NEEDS_SPEC, cosyEasePerHour: 30 },
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
    ellieTagWeights: {
      coffee: 1.15,
      rusk_ritual: 1.3,
      cook_sushi: 1.2,
      gaming: 1.15,
      music_listen: 1.15,
      headbang: 1.2,
      stargaze: 1.1,
      train_hyrox: 1.15,
      garden_sit: 1.1,
      cat_social: 1.2,
      visitor: 1.1,
    },
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
      { from: 660, to: 960, factor: 1.3, tags: ['nap', 'nap_bed', 'nap_ellie_bed', 'nap_box'] },
      { from: 360, to: 480, factor: 1.3, tags: ['play_toy', 'zoomies', 'knock', 'follow_ellie'] },
      { from: 1080, to: 1260, factor: 1.3, tags: ['play_toy', 'zoomies', 'knock', 'follow_ellie'] },
      { from: 1380, to: 300, factor: 0.5, tags: 'allButNap' },
    ],
    idleScore: 0.3,
    wanderScore: 0.28,
  },
  cats: CATS,
  visitors: VISITORS,
  weather: { rainChance: 0.18, startFrom: 360, startTo: 1080, minMinutes: 120, maxMinutes: 360, outdoorFactor: 0.3, windowSitFactor: 1.5 },
  bubbles: {
    thoughtBelow: 30,
    thoughtGapTicks: [900, 1800],
    thoughtShowTicks: 60,
    speech: { afterEllie: 0.4, afterCat: 0.15, quirk: 0.8, verdict: 0.9, seesVisitor: 0.5 },
    globalCooldownTicks: 400,
    catCooldownTicks: 1200,
  },
  // sim.md 11 (FROZEN 27): left 06:30 to 11:00 (peak 08:00), back 09:00 to 16:30 (peak 12:45), right 14:30 to 19:00 (peak 17:30).
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
    rollMinute: 420,
    earliestMinute: 300,
    perCategory: 1,
    maxCatWishes: 2,
    cooldownDays: 2,
    unseenWeight: 2,
    unseenDays: 2,
    neverDoneWeight: 3,
  },
  // FROZEN 15: 30 game minutes (sim.md 12.3 said 45; void).
  delivery: { minutes: 30 },
  housewarming: {
    unlockIf: {
      kind: 'all',
      of: [
        { kind: 'cosy', room: 'home', atLeast: 60, reading: 'rated' },
        { kind: 'roomsCosy', atLeast: 40, count: 'all', reading: 'rated' },
        { kind: 'dayAtLeast', day: 5 },
        { kind: 'not', of: { kind: 'flag', flag: 'housewarming.held' } },
      ],
    },
  },
  // Numbers with no typed home yet. Queue and carrying (sim.md 6.1 and 7.1) are read with these defaults.
  extra: {
    'queue.cap': 4,
    'queue.agentCap': 1,
    'carry.handSlots': 1,
    'carry.boxWalkMul': 0.85,
    'carry.trinketCap': 99,
    'carry.setDownRadius': 3,
    'carry.sinkReturnTiles': 8,
    'carry.bookReturnTiles': 8,
    'cat.walkMulBelow20': 0.9,
    'cat.catNeedLowBelow': 20,
    'ellie.walkMulLowEnergy': 0.9,
    'ellie.lowEnergyBelow': 15,
    'ellie.meh': 45,
    'ellie.mopey': 25,
    'mess.lotCap': 12,
    'box.lotCap': 3,
    'coffee.diminishFrom': 3,
    'coffee.diminishedEnergy': 6,
    'sleep.chunkMinutes': 60,
    'sleep.maxHours': 10,
    'sleep.wakeEnergy': 98,
    'sleep.wakeFrom': 330,
    'sleep.wakeBy': 600,
    'gardenOpenFrom': 420,
    'gardenOpenTo': 1260,
    'trickle.goodMoodAt': 50,
  },
};
