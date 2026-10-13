/**
 * Daily wish titles (40 characters or fewer) and aspirations.
 * Keys: wish.<wishId>; asp.<aspirationId>.name / .desc / .tier.<1-4>.
 * Aspiration ids follow design/spec/FROZEN.md section 3 #7; Home Maker tiers follow #8.
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
  'asp.hyrox.name': 'Hyrox Hero',
  'asp.hyrox.desc': 'Race on Saturdays and get a bit quicker each time.',
  'asp.hyrox.tier.1': 'Chalked up',
  'asp.hyrox.tier.2': 'First race done',
  'asp.hyrox.tier.3': 'Under the target time',
  'asp.hyrox.tier.4': 'PB streak',

  'asp.royalty.name': 'Cat Royalty',
  'asp.royalty.desc': 'Win over all four cats. Even Shadow. Especially Shadow.',
  'asp.royalty.tier.1': 'Tolerated',
  'asp.royalty.tier.2': 'Lap-approved',
  'asp.royalty.tier.3': 'One of the household',
  'asp.royalty.tier.4': 'Four cats, one bed',

  'asp.home.name': 'Home Maker',
  'asp.home.desc': 'Make the flat properly cosy, one room at a time.',
  'asp.home.tier.1': 'One cosy room',
  'asp.home.tier.2': 'A matching set',
  'asp.home.tier.3': 'Three rooms, three sets',
  'asp.home.tier.4': 'Cosy from the door to the garden',

  'asp.collect.name': 'Collector',
  'asp.collect.desc': "Trade with Poe, fill the catalogue and the album. Poe approves.",
  'asp.collect.tier.1': 'Shiny start',
  'asp.collect.tier.2': 'Regular at the bird bath',
  'asp.collect.tier.3': 'Half the catalogue',
  'asp.collect.tier.4': 'The full set',
} as const satisfies Readonly<Record<string, string>>;
