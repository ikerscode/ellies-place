/**
 * Interface labels (32 characters or fewer) and toasts or hints (80 or fewer).
 * Keys: ui.<area>.<thing>.
 */
export const ui = {
  // Title screen
  'ui.title.name': "Ellie's Place",
  'ui.title.tagline': 'Four cats. One flat. Many opinions.',
  'ui.title.newGame': 'Move in',
  'ui.title.continue': 'Go home',
  'ui.title.settings': 'Settings',
  'ui.title.credits': 'Credits',
  'ui.title.saveFound': 'Day {n}. The cats kept your spot.',
  'ui.title.newGameConfirm': 'Start over? The cats will forget.',
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
  'ui.hud.catalog': 'Catalog',
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

  // Bond levels, low to high
  'ui.bond.1': 'Wary',
  'ui.bond.2': 'Tolerated',
  'ui.bond.3': 'Friendly',
  'ui.bond.4': 'Trusted',
  'ui.bond.5': 'Family',

  // Mood, low to high
  'ui.mood.1': 'Mopey',
  'ui.mood.2': 'Meh',
  'ui.mood.3': 'Fine',
  'ui.mood.4': 'Content',
  'ui.mood.5': 'Glowing',

  // Modes
  'ui.mode.live': 'Live',
  'ui.mode.build': 'Build',
  'ui.mode.toggle': 'Live / Build (B)',

  // Speeds
  'ui.speed.pause': 'Pause',
  'ui.speed.1': 'x1',
  'ui.speed.2': 'x2',
  'ui.speed.3': 'x3',
  'ui.speed.sleeping': 'Sleeping',
  'ui.speed.realTime': 'Real time',

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
