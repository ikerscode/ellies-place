/**
 * Daily wish titles (40 characters or fewer) and aspirations.
 * Keys: wish.<wishId>; asp.<aspirationId>.name / .desc / .tier.<1-4>.
 * Ids are provisional until the game designers freeze sim.md and play.md.
 */
export const wishes = {
  // Food and the ritual
  'wish.makeSushi': 'Make vegetarian sushi',
  'wish.coffeeGrass': 'Coffee and a rusk in the grass',
  'wish.perfectDunk': 'Dunk a rusk without losing it',
  'wish.toastBreakfast': 'Toast before anything else',

  // Cats
  'wish.shadowNear': 'Get Shadow to sit near you',
  'wish.bowToGeorge': 'Bow to George',
  'wish.salemLaser': 'Let Salem win at laser pointer',
  'wish.photoAllCats': 'Take a photo of all four cats',
  'wish.peachesSunbeam': 'Find Peaches in a sunbeam',
  'wish.feedGeorgeFirst': 'Feed George first. He will check.',
  'wish.salemBox': 'Give Salem a fresh box',

  // Music and games
  'wish.playHeavy': 'Play something heavy',
  'wish.headbang': 'Headbang to a whole song',
  'wish.critterboundWin': 'Win a battle in Critterbound',

  // Hyrox
  'wish.trainStation': 'Train at any station',
  'wish.beatStationPb': 'Beat a station PB',
  'wish.wallBalls': 'Do wall balls. Yes, really.',

  // Home
  'wish.newDecor': 'Put something new in the living room',
  'wish.lampsAtNight': 'Get the lamps on before dark',
  'wish.stargaze': 'Spot a shooting star',
} as const satisfies Readonly<Record<string, string>>;

/** Aspirations: four tiers each (design/BRIEF.md section 11). */
export const aspirations = {
  'asp.hyroxHero.name': 'Hyrox Hero',
  'asp.hyroxHero.desc': 'Race on Saturdays and get a bit quicker each time.',
  'asp.hyroxHero.tier.1': 'Chalked up',
  'asp.hyroxHero.tier.2': 'First race done',
  'asp.hyroxHero.tier.3': 'Under the target time',
  'asp.hyroxHero.tier.4': 'PB streak',

  'asp.catRoyalty.name': 'Cat Royalty',
  'asp.catRoyalty.desc': 'Win over all four cats. Even Shadow. Especially Shadow.',
  'asp.catRoyalty.tier.1': 'Tolerated',
  'asp.catRoyalty.tier.2': 'Lap-approved',
  'asp.catRoyalty.tier.3': 'One of the household',
  'asp.catRoyalty.tier.4': 'Four cats, one bed',

  'asp.homeMaker.name': 'Home Maker',
  'asp.homeMaker.desc': 'Make the flat properly cosy, one room at a time.',
  'asp.homeMaker.tier.1': 'Unpacked',
  'asp.homeMaker.tier.2': 'One cosy room',
  'asp.homeMaker.tier.3': 'A matching set',
  'asp.homeMaker.tier.4': 'Every room cosy',

  'asp.collector.name': 'Collector',
  'asp.collector.desc': "Trade with Poe, fill the catalog and the album. Poe approves.",
  'asp.collector.tier.1': 'Shiny start',
  'asp.collector.tier.2': 'Regular at the bird bath',
  'asp.collector.tier.3': 'Half the catalog',
  'asp.collector.tier.4': 'The full set',
} as const satisfies Readonly<Record<string, string>>;
