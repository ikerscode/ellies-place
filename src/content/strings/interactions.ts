/**
 * Interaction petal labels (22 characters or fewer).
 * Keys: int.<interactionId>, with the ids from design/spec/sim.md section 4.3 (Ellie) and 8.6 (cats),
 * for example `int.bed.sleep`. A few labels have no sim.md row yet: `int.sofa.sit`, `int.tv.watch`,
 * `int.mailbox.check`, `int.cat.sit_near`, `int.cat.photo`, and the three `int.record_player.play.<station>`
 * petals. The data owner either adds the interaction or maps the label to another id.
 */
export const interactions = {
  // Ellie: rest
  'int.bed.sleep': 'Sleep',
  'int.bed.nap': 'Nap',
  'int.bath.bathe': 'Take a bath',
  'int.bookshelf.read': 'Read',
  'int.sofa.sit': 'Sit down',

  // Ellie: food and drink
  'int.kettle.make_coffee': 'Make coffee',
  'int.rusk_tin.take': 'Grab a rusk',
  'int.grass.rusk_ritual': 'Coffee in the grass',
  'int.counter.make_sushi': 'Roll veggie sushi',
  'int.counter.make_toast': 'Make toast',
  'int.fridge.snack': 'Fridge snack',

  // Ellie: fun
  'int.console.play': 'Play Critterbound',
  'int.handheld.play': 'Quick game in bed',
  'int.tv.watch': 'Watch telly',
  'int.record_player.play.heavy': 'Put on Heavy',
  'int.record_player.play.lofi': 'Put on Lo-fi',
  'int.record_player.play.cosy': 'Put on Cosy',
  'int.record_player.listen': 'Listen',
  'int.record_player.dance': 'Dance',
  'int.record_player.headbang': 'Headbang',
  'int.grass.stargaze': 'Stargaze',
  'int.lanterns.light': 'Light the lanterns',
  'int.camera.photo': 'Take a photo',
  'int.wardrobe.dress': 'Change outfit',

  // Ellie: training
  'int.gym.skiErg.train': 'Use the SkiErg',
  'int.gym.sledPush.train': 'Push the sled',
  'int.gym.sledPull.train': 'Pull the sled',
  'int.gym.burpeeBroadJump.train': 'Burpee broad jumps',
  'int.gym.rowing.train': 'Row',
  'int.gym.farmersCarry.train': 'Farmers carry',
  'int.gym.sandbagLunges.train': 'Sandbag lunges',
  'int.gym.wallBalls.train': 'Wall balls',
  'int.race_board.race': 'Check the race board',
  'int.front_door.run': 'Go for a run',

  // Ellie: home
  'int.mailbox.check': 'Check the post',
  'int.laptop.catalog': 'Browse the catalogue',
  'int.mess.put_back': 'Tidy up',

  // Cats
  'int.cat.pet': 'Pet',
  'int.cat.pick_up': 'Pick up',
  'int.bowls.fill': 'Feed',
  'int.cat.brush': 'Brush',
  'int.cat.play_laser': 'Laser pointer',
  'int.cat.play_wand': 'Feather wand',
  'int.fridge.give_ham': 'Sneak some ham',
  'int.george.bow': 'Bow',
  'int.george.knight': 'Kneel for the King',
  'int.cat.sit_near': 'Sit nearby',
  'int.cat.call': 'Call over',
  'int.cat.photo': 'Take a photo',

  // Visitors
  'int.poe.trade': 'Trade with Poe',
  'int.door.answer': 'Sign for it',
  'int.bruce.spot': 'Pet the not-cat',
} as const satisfies Readonly<Record<string, string>>;
