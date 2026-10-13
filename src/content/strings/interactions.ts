/**
 * Interaction petal labels (22 characters or fewer).
 * Keys: int.<interactionId>. Ids are provisional until the game designers
 * freeze design/spec/sim.md and play.md; rename keys to match then.
 */
export const interactions = {
  // Ellie: rest
  'int.sleep': 'Sleep',
  'int.nap': 'Nap',
  'int.bath': 'Take a bath',
  'int.read': 'Read',
  'int.sitSofa': 'Sit down',

  // Ellie: food and drink
  'int.makeCoffee': 'Make coffee',
  'int.grabRusk': 'Grab a rusk',
  'int.coffeeGrass': 'Coffee in the grass',
  'int.cookSushi': 'Roll veggie sushi',
  'int.makeToast': 'Make toast',
  'int.fridgeSnack': 'Fridge snack',

  // Ellie: fun
  'int.playConsole': 'Play Critterbound',
  'int.playHandheld': 'Quick game in bed',
  'int.watchTv': 'Watch telly',
  'int.recordHeavy': 'Put on Heavy',
  'int.recordLofi': 'Put on Lo-fi',
  'int.recordCosy': 'Put on Cosy',
  'int.listen': 'Listen',
  'int.dance': 'Dance',
  'int.headbang': 'Headbang',
  'int.stargaze': 'Stargaze',
  'int.lightLanterns': 'Light the lanterns',
  'int.takePhoto': 'Take a photo',
  'int.changeOutfit': 'Change outfit',

  // Ellie: training
  'int.train': 'Train',
  'int.raceBoard': 'Check the race board',
  'int.run': 'Go for a run',

  // Ellie: home
  'int.checkMail': 'Check the post',
  'int.openCatalog': 'Browse the catalog',
  'int.tidy': 'Tidy up',

  // Cats
  'int.pet': 'Pet',
  'int.pickUp': 'Pick up',
  'int.feed': 'Feed',
  'int.brush': 'Brush',
  'int.laser': 'Laser pointer',
  'int.featherWand': 'Feather wand',
  'int.giveHam': 'Sneak some ham',
  'int.bowToGeorge': 'Bow',
  'int.beKnighted': 'Kneel for the King',
  'int.sitNear': 'Sit nearby',
  'int.callOver': 'Call over',
  'int.photoCat': 'Take a photo',

  // Visitors
  'int.tradePoe': 'Trade with Poe',
  'int.signDelivery': 'Sign for it',
  'int.petBruce': 'Pet the not-cat',
} as const satisfies Readonly<Record<string, string>>;
