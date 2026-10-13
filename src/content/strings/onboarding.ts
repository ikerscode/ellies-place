/**
 * First day: George's royal tour. Speech bubbles (70 characters or fewer).
 * Keys: onboard.<speaker>.<step>.<nn>, played in the order written here.
 * Each character teaches one thing (design/BRIEF.md section 14).
 */
export const onboarding = {
  // Skip controls
  'onboard.ui.skip': 'Skip the tour',
  'onboard.ui.skipConfirm': 'George will be offended. Skip anyway?',
  'onboard.ui.skipYes': 'Skip it',
  'onboard.ui.skipNo': 'Carry on',

  // George: moving and interacting
  'onboard.george.welcome.01': 'Ah. You have arrived. The court has been kept waiting.',
  'onboard.george.welcome.02': 'We are George. This is our flat. You may live in it.',
  'onboard.george.move.01': 'Click the floor and you walk there. Even peasants manage it.',
  'onboard.george.bed.01': 'This is your bed. It was mine. You may borrow it.',
  'onboard.ellie.bed.01': 'Thanks, George.',
  'onboard.george.interact.01': 'Click a thing to see what it does. Try the kettle.',
  'onboard.george.interact.02': 'Click us and you may offer a chin scratch. We may accept.',
  'onboard.george.handoff.01': 'Salem will explain the rest. Brace yourself.',

  // Salem: needs and the action queue
  'onboard.salem.hi.01': "{name}! You LIVE here now! I live here too! HI!",
  'onboard.salem.needs.01': "See the bars? That's how you're doing! I can't read them!",
  'onboard.salem.needs.02': "When one's low you go slow! Eat something! Or pet me!",
  'onboard.salem.queue.01': 'Pick lots of things and they wait in a line up top!',
  'onboard.salem.queue.02': "Changed your mind? Click one and it's gone! Like ham!",
  'onboard.salem.freeWill.01': "Do nothing for a bit and you'll find something to do! Clever!",
  'onboard.salem.handoff.01': "Peaches is by the records. She's very calm. I'm NOT!",

  // Peaches: the record player and mood
  'onboard.peaches.hi.01': 'Hey. No rush. Come and sit by the records.',
  'onboard.peaches.record.01': 'Click the player and put something on. Any station.',
  'onboard.peaches.record.02': "Shadow leaves for the heavy stuff. Don't take it personally.",
  'onboard.peaches.mood.01': "That little face up top is your mood. A song helps.",
  'onboard.peaches.mood.02': "Good mood, more Hearts. That's about it.",
  'onboard.peaches.handoff.01': "Shadow's got something to show you. He won't say so.",

  // Shadow: Build mode
  'onboard.shadow.hi.01': "Oh. It's you.",
  'onboard.shadow.build.01': 'Press B to build. Time stops while you do.',
  'onboard.shadow.build.02': 'Move things. Quietly.',
  'onboard.shadow.build.03': "Selling gives every Heart back. Don't sell my wardrobe.",
  'onboard.shadow.handoff.01': "Someone's at the door. It's the frog. It's always the frog.",

  // Pickle: the catalog
  'onboard.pickle.hi.01': "Ribbit! New neighbour! I'm Pickle. I deliver things.",
  'onboard.pickle.catalog.01': 'Open the catalog, pick a thing, and I bring it. Ribbit.',
  'onboard.pickle.catalog.02': 'You pay in Hearts. You earn those by having a nice day.',
  'onboard.pickle.catalog.03': 'Every order comes in a box. The box is for the black cat.',
  'onboard.pickle.handoff.01': "Got to hop. Other deliveries. There aren't any. Ribbit!",

  // Close
  'onboard.george.end.01': 'The tour is over. Your first wishes await. We will be watching.',
  'onboard.ellie.end.01': 'Right. Home, then.',
} as const satisfies Readonly<Record<string, string>>;
