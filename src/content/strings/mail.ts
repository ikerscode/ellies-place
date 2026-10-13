/**
 * Mail from the front step. Subject 40 characters or fewer; body 4 lines or
 * fewer, each 56 characters or fewer, split with \n.
 * Keys: mail.<mailId>.subject / .body. Ids are provisional until sim.md freezes.
 * Personal mail is not here: the giver writes it in src/content/personal.ts.
 */
export const mail = {
  // Pickle's delivery notes
  'mail.pickleWelcome.subject': "Pickle's Deliveries: hello!",
  'mail.pickleWelcome.body':
    'Ribbit! New flat, new customer. Lovely.\nOrder from the catalogue and I hop it over.\nPay in Hearts. No flies accepted.\nPickle (and the box)',
  'mail.pickleFirstOrder.subject': 'Your first order!',
  'mail.pickleFirstOrder.body':
    'Delivered, signed for, slightly damp.\nThe box is free. The black cat has it now.\nRibbit. That one was a thank you.\nPickle',

  // Poe's trade receipts
  'mail.poeReceipt.subject': 'Receipt. Caw.',
  'mail.poeReceipt.body': 'One shiny thing received.\nOne nice thing given.\nNo refunds. Caw.\nPoe',

  // Notes "from" the cats
  'mail.georgeDecree.subject': 'A royal decree',
  'mail.georgeDecree.body':
    'By order of the King:\nthe pillow is ours on weekdays.\nWeekends are under review.\nGeorge, by the grace of George',
  'mail.salemNote.subject': 'HAM',
  'mail.salemNote.body': 'HAM\nham?\n(a pawprint, slightly smudged)\nSALEM',
  'mail.shadowNote.subject': 'Not a note',
  'mail.shadowNote.body': "This isn't a note. I don't write notes.\nThe floor under the bed is fine.\nDon't move the bed.\nS.",
  'mail.peachesNote.subject': 'Side B',
  'mail.peachesNote.body': "Flip the record when you get a sec.\nNo rush. Side B's the good one.\nPeaches",

  // Race entry confirmations
  'mail.raceEntry.subject': 'Race entry confirmed',
  'mail.raceEntry.body':
    "You're in for Saturday.\n8 runs, 8 stations, wall balls last.\nGeorge has agreed to judge. Nobody asked him.",
} as const satisfies Readonly<Record<string, string>>;
