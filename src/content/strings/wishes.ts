/**
 * Daily wish titles (40 characters or fewer) and aspirations.
 * Keys: wish.<wishId> (ids from design/spec/play.md section 7.3, without the `wish.` prefix, so `wish.bow_george`);
 * asp.<id>.name / .desc and asp.<id>.tier.<1-4> (+ .goal, .reward). Aspiration ids: hyrox, royalty, home, collect.
 */
export const wishes = {
  // Food and the ritual
  'wish.make_sushi': 'Make vegetarian sushi',
  'wish.coffee_rusk_grass': 'Coffee and a rusk in the grass',
  'wish.perfect_dunk': 'Dunk a rusk without losing it',
  'wish.toast': 'Toast before anything else',

  // Cats
  'wish.shadow_near': 'Get Shadow to sit near you',
  'wish.bow_george': 'Bow to George',
  'wish.laser_salem': 'Let Salem win at laser pointer',
  'wish.photo_all_four': 'Take a photo of all four cats',
  'wish.peaches_sunbeam': 'Find Peaches in a sunbeam',
  'wish.serve_george_first': 'Feed George first. He will check.',
  'wish.salem_box': 'Find Salem in a box',

  // Music and games
  'wish.play_heavy': 'Play something heavy',
  'wish.headbang': 'Headbang to a whole song',
  'wish.win_spar': 'Win a battle in Critterbound',

  // Hyrox
  'wish.train_any': 'Train at any station',
  'wish.station_pb': 'Beat a station PB',
  'wish.wallballs_great': 'Nail the wall balls. Yes, really.',

  // Home
  'wish.cosy_up': 'Make a room a bit cosier',
  'wish.lamps_on': 'Lamps on after dark',
  'wish.stargaze': 'Spot a shooting star',
} as const satisfies Readonly<Record<string, string>>;

/** Aspirations: four tiers each (design/BRIEF.md section 11). Rewards are Hearts plus the tier's gift item (play.md section 7.4). */
export const aspirations = {
  'asp.hyrox.name': 'Hyrox Hero',
  'asp.hyrox.desc': 'Race on Saturdays and get a bit quicker each time.',
  'asp.hyrox.tier.1': 'Chalked up',
  'asp.hyrox.tier.1.goal': 'Finish 5 training sessions at any stations.',
  'asp.hyrox.tier.1.reward': '50 Hearts and a PB board for the wall.',
  'asp.hyrox.tier.2': 'First race done',
  'asp.hyrox.tier.2.goal': 'Finish a race on a Saturday.',
  'asp.hyrox.tier.2.reward': '100 Hearts and a medal display.',
  'asp.hyrox.tier.3': 'Under the target time',
  'asp.hyrox.tier.3.goal': 'Finish a race in under 1:30:00.',
  'asp.hyrox.tier.3.reward': '175 Hearts and a trophy shelf.',
  'asp.hyrox.tier.4': 'PB streak',
  'asp.hyrox.tier.4.goal': 'Set a PB in 3 races. Every station skill at 5.',
  'asp.hyrox.tier.4.reward': '275 Hearts, a champion banner and a title.',

  'asp.royalty.name': 'Cat Royalty',
  'asp.royalty.desc': 'Win over all four cats. Even Shadow. Especially Shadow.',
  'asp.royalty.tier.1': 'Cat friend',
  'asp.royalty.tier.1.goal': 'Get any one cat to Friendly.',
  'asp.royalty.tier.1.reward': '50 Hearts and a round cat bed.',
  'asp.royalty.tier.2': 'Court of four',
  'asp.royalty.tier.2.goal': 'Get all four cats to Friendly at once.',
  'asp.royalty.tier.2.reward': '100 Hearts and a tall cat tree.',
  'asp.royalty.tier.3': 'Royal favour',
  'asp.royalty.tier.3.goal': 'Be knighted by George. Let Shadow sit on your lap.',
  'asp.royalty.tier.3.reward': '175 Hearts and a cushion fit for a King.',
  'asp.royalty.tier.4': 'Four on the bed',
  'asp.royalty.tier.4.goal': 'All four cats at Family, all on your bed at 3 a.m.',
  'asp.royalty.tier.4.reward': '275 Hearts, a family portrait and a title.',

  'asp.home.name': 'Home Maker',
  'asp.home.desc': 'Make the flat properly cosy, one room at a time.',
  'asp.home.tier.1': 'One cosy room',
  'asp.home.tier.1.goal': 'Get any room to Cosy 45.',
  'asp.home.tier.1.reward': '50 Hearts and a pothos plant.',
  'asp.home.tier.2': 'A matching set',
  'asp.home.tier.2.goal': 'Finish your first matching set.',
  'asp.home.tier.2.reward': '100 Hearts and string lights.',
  'asp.home.tier.3': 'Three rooms, three sets',
  'asp.home.tier.3.goal': 'Three rooms at Cosy 65 and three sets done.',
  'asp.home.tier.3.reward': '175 Hearts and a lantern arch.',
  'asp.home.tier.4': 'Cosy from the door to the garden',
  'asp.home.tier.4.goal': 'Get the whole place to Cosy 80.',
  'asp.home.tier.4.reward': '275 Hearts, a stained glass lamp and a title.',

  'asp.collect.name': 'Collector',
  'asp.collect.desc': "Trade with Poe, fill the catalogue and the album. Poe approves.",
  'asp.collect.tier.1': 'First finds',
  'asp.collect.tier.1.goal': 'Trade with Poe once and take 5 photos.',
  'asp.collect.tier.1.reward': '50 Hearts and a curio shelf.',
  'asp.collect.tier.2': 'Curator',
  'asp.collect.tier.2.goal': 'Own half the catalogue and take 20 photos.',
  'asp.collect.tier.2.reward': '100 Hearts and frames for a photo wall.',
  'asp.collect.tier.3': "Poe's rival",
  'asp.collect.tier.3.goal': 'Trade with Poe 8 times and collect 15 stickers.',
  'asp.collect.tier.3.reward': '175 Hearts and a gilded perch for Poe.',
  'asp.collect.tier.4': 'The whole collection',
  'asp.collect.tier.4.goal': 'Own nearly everything. 50 photos. All 6 critters.',
  'asp.collect.tier.4.reward': '275 Hearts, a golden photo frame and a title.',
} as const satisfies Readonly<Record<string, string>>;
