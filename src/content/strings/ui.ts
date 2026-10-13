/**
 * Interface labels (32 characters or fewer) and toasts or hints (80 or fewer).
 * Keys: ui.<area>.<thing>.
 */
export const ui = {
  // Title screen
  'ui.title.name': "Ellie's Place",
  'ui.title.tagline': 'Your place. The cats have notes.',
  'ui.title.newGame': 'Move in',
  'ui.title.continue': 'Go home',
  'ui.title.settings': 'Settings',
  'ui.title.credits': 'Credits',
  'ui.title.saveFound': 'Day {n}. The cats kept your spot.',
  'ui.title.newGameConfirm': 'Start over? Everything goes back in the boxes.',
  'ui.title.newGameYes': 'Start fresh',
  'ui.title.newGameNo': 'Keep my place',

  // HUD
  'ui.hud.day': 'Day {n}',
  'ui.hud.hearts': '{n} Hearts',
  'ui.hud.queue': 'Up next',
  'ui.hud.queueEmpty': 'Nothing planned',
  'ui.hud.queueCancel': 'Click to cancel',
  'ui.hud.freeWill': '{name} is choosing',
  'ui.hud.journal': 'Journal',
  'ui.hud.catalog': 'Catalogue',
  'ui.hud.photo': 'Photo',
  'ui.hud.mood': 'Mood',
  'ui.hud.raceDay': 'Race day',

  // Week
  'ui.day.mon': 'Monday',
  'ui.day.tue': 'Tuesday',
  'ui.day.wed': 'Wednesday',
  'ui.day.thu': 'Thursday',
  'ui.day.fri': 'Friday',
  'ui.day.sat': 'Saturday',
  'ui.day.sun': 'Sunday',

  // Ellie's needs
  'ui.need.energy': 'Energy',
  'ui.need.hunger': 'Hunger',
  'ui.need.fun': 'Fun',
  'ui.need.fitness': 'Fitness',
  'ui.need.calm': 'Calm',
  'ui.need.cosy': 'Cosy',

  // Cat needs
  'ui.catNeed.food': 'Food',
  'ui.catNeed.play': 'Play',
  'ui.catNeed.affection': 'Affection',
  'ui.catNeed.nap': 'Nap',
  'ui.catNeed.royalty': 'Royalty',
  'ui.catNeed.chaos': 'Chaos',
  'ui.catNeed.solitude': 'Solitude',
  'ui.catNeed.vibes': 'Vibes',

  // Bond levels (BondLevel 0..4), low to high
  'ui.bond.0': 'Wary',
  'ui.bond.1': 'Tolerated',
  'ui.bond.2': 'Friendly',
  'ui.bond.3': 'Trusted',
  'ui.bond.4': 'Family',

  // Mood bands (MoodBand), low to high
  'ui.mood.mopey': 'Mopey',
  'ui.mood.low': 'Meh',
  'ui.mood.okay': 'Alright',
  'ui.mood.good': 'Content',
  'ui.mood.great': 'Glowing',

  // Times of day (DayPhase)
  'ui.phase.morning': 'Morning',
  'ui.phase.day': 'Afternoon',
  'ui.phase.evening': 'Evening',
  'ui.phase.night': 'Night',

  // Modes (GameMode)
  'ui.mode.live': 'Live',
  'ui.mode.build': 'Build',
  'ui.mode.activity': 'Playing',
  'ui.mode.photo': 'Photo',
  'ui.mode.cutscene': 'Watching',
  'ui.mode.toggle': 'Live or Build (B)',

  // Speeds (Speed 0..3)
  'ui.speed.0': 'Pause',
  'ui.speed.1': 'x1',
  'ui.speed.2': 'x2',
  'ui.speed.3': 'x3',
  'ui.speed.sleeping': 'Sleeping',
  'ui.speed.realTime': 'Real time',

  // Build mode tools
  'ui.build.title': 'Build',
  'ui.build.place': 'Place',
  'ui.build.move': 'Move',
  'ui.build.rotate': 'Rotate (R)',
  'ui.build.sell': 'Sell (Delete)',
  'ui.build.duplicate': 'Duplicate',
  'ui.build.eyedropper': 'Eyedropper',
  'ui.build.undo': 'Undo',
  'ui.build.redo': 'Redo',
  'ui.build.paintWall': 'Paint walls',
  'ui.build.paintFloor': 'Paint floor',
  'ui.build.store': 'Put away',
  'ui.build.done': 'Back to living',
  'ui.build.cosy': 'Cosy {n}',
  'ui.build.price': '{n} Hearts',
  'ui.build.free': 'Free',

  // Why a placement won't go (PlacementError)
  'ui.toast.place.outOfBounds': "That's past the edge of the flat.",
  'ui.toast.place.blocked': "Something's already there.",
  'ui.toast.place.notFloor': 'That needs floor under it.',
  'ui.toast.place.needsWall': 'That one hangs on a wall.',
  'ui.toast.place.needsSurface': 'That sits on a table or a shelf.',
  'ui.toast.place.surfaceFull': 'No room on there. Salem would knock it off anyway.',
  'ui.toast.place.tooBig': "It won't fit. Not even if George sits on it.",
  'ui.toast.place.blocksDoor': 'That would block the door.',
  'ui.toast.place.breaksPath': "Nobody could get past that. The cats checked.",
  'ui.toast.place.rotationNotAllowed': "It doesn't turn that way.",
  'ui.toast.place.notOwned': 'Order that one from Pickle first.',
  'ui.toast.place.cannotAfford': 'Not enough Hearts yet.',
  'ui.toast.place.fixed': "That one's part of the flat. It stays.",

  // Cosy meter parts (CosyFactor)
  'ui.cosy.title': 'Cosy',
  'ui.cosy.value': 'Nice things',
  'ui.cosy.variety': 'Variety',
  'ui.cosy.lighting': 'Lighting',
  'ui.cosy.plants': 'Plants',
  'ui.cosy.sets': 'Matching sets',
  'ui.cosy.cats': 'Happy cats',
  'ui.cosy.paint': 'Walls and floor',
  'ui.cosy.clutter': 'Mess',

  // Styles (StyleTag)
  'ui.style.goth': 'Goth',
  'ui.style.cottage': 'Cottage',
  'ui.style.neon': 'Neon',
  'ui.style.gym': 'Gym',
  'ui.style.cat': 'Cat',
  'ui.style.plant': 'Plant',
  'ui.style.retro': 'Retro',

  // Catalog
  'ui.catalog.title': "Pickle's Deliveries",
  'ui.catalog.order': 'Order',
  'ui.catalog.owned': 'Owned: {n}',
  'ui.catalog.locked': 'Not yet',
  'ui.catalog.arriving': 'On its way',
  'ui.toast.ordered': 'Ordered. Pickle is hopping over with it.',
  'ui.toast.delivered': 'Knock knock. Pickle left a box on the step.',

  // Item categories (ItemCategory)
  'ui.category.seating': 'Seating',
  'ui.category.beds': 'Beds',
  'ui.category.tables': 'Tables',
  'ui.category.storage': 'Storage',
  'ui.category.kitchen': 'Kitchen',
  'ui.category.bath': 'Bathroom',
  'ui.category.gym': 'Gym',
  'ui.category.lighting': 'Lighting',
  'ui.category.plants': 'Plants',
  'ui.category.catFurniture': 'Cat furniture',
  'ui.category.wallDecor': 'Wall decor',
  'ui.category.rugs': 'Rugs',
  'ui.category.electronics': 'Electronics',
  'ui.category.garden': 'Garden',
  'ui.category.decor': 'Bits and bobs',
  'ui.category.special': 'Special',

  // Journal tabs (JournalTab)
  'ui.journal.title': 'Journal',
  'ui.journal.wishes': 'Wishes',
  'ui.journal.aspirations': 'Aspirations',
  'ui.journal.collection': 'Collection',
  'ui.journal.cats': 'The cats',
  'ui.journal.photos': 'Photos',
  'ui.journal.stickers': 'Stickers',
  'ui.journal.records': 'Race records',
  'ui.journal.mail': 'Post',
  'ui.journal.settings': 'Settings',
  'ui.journal.secret': '???',

  // Record player stations (RadioStation)
  'ui.radio.heavy': 'Heavy',
  'ui.radio.lofi': 'Lo-fi',
  'ui.radio.cosy': 'Cosy',
  'ui.radio.off': 'Off',

  // Hyrox stations (HyroxStation), in race order
  'ui.hyrox.skiErg': 'SkiErg',
  'ui.hyrox.sledPush': 'Sled push',
  'ui.hyrox.sledPull': 'Sled pull',
  'ui.hyrox.burpeeBroadJump': 'Burpee broad jumps',
  'ui.hyrox.rowing': 'Rowing',
  'ui.hyrox.farmersCarry': 'Farmers carry',
  'ui.hyrox.sandbagLunges': 'Sandbag lunges',
  'ui.hyrox.wallBalls': 'Wall balls',

  // Settings
  'ui.settings.title': 'Settings',
  'ui.settings.music': 'Music',
  'ui.settings.sound': 'Sound effects',
  'ui.settings.ambience': 'Ambience',
  'ui.settings.freeWill': 'Free will',
  'ui.settings.realTime': "Follow the Mac's clock",
  'ui.settings.tour': 'Replay the tour',
  'ui.settings.on': 'On',
  'ui.settings.off': 'Off',
  'ui.settings.back': 'Back',

  // Common buttons
  'ui.button.ok': 'OK',
  'ui.button.cancel': 'Cancel',
  'ui.button.skip': 'Skip',
  'ui.button.close': 'Close',
  'ui.button.next': 'Next',

  // Toasts
  'ui.toast.saved': 'Saved. The cats will pretend they did it.',
  'ui.toast.queueFull': 'Four things is plenty. Let one finish first.',
  'ui.toast.heartsEarned': '+{n} Hearts',
  'ui.toast.boxClaimed': 'Salem is in the box. Salem lives in the box now.',
  'ui.toast.buildPaused': 'Time stops while you build. The cats wait, mostly.',
  'ui.toast.skipOffer': "If it's being difficult, there's a Skip button. No judgement.",
  'ui.toast.skipped': 'Skipped. Nobody has to know.',
  'ui.toast.sold': 'Sold back for {n} Hearts. Full refund, always.',
  'ui.toast.raceDay': "It's Saturday. Race day, if you fancy it.",
  'ui.toast.lowEnergy': '{name} is dragging her feet. Bed would help.',
  'ui.toast.lowHunger': '{name} keeps opening the fridge and closing it again.',
  'ui.toast.lowFun': '{name} has counted the ceiling tiles. Twice.',
  'ui.toast.lowCalm': '{name} needs a minute. Grass and a coffee, maybe.',
  'ui.toast.bruceSpotted': 'Bruce was here. Bruce says he was not here.',

  // Hints
  'ui.hint.move': 'Click the floor to walk there.',
  'ui.hint.interact': 'Click a thing, a cat or {name} to see what she can do.',
  'ui.hint.queue': 'Actions wait up top. Click one to cancel it.',
  'ui.hint.build': 'Press B to build. R rotates, Delete sells.',
  'ui.hint.undo': 'Changed your mind? Ctrl or Cmd and Z.',
} as const satisfies Readonly<Record<string, string>>;
