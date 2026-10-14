/**
 * Mail from the front step. Subject 40 characters or fewer; body 4 lines or
 * fewer, each 56 characters or fewer, split with \n.
 * Keys: mail.<mailId>.subject / .body, with the ids from design/spec/play.md section 11.2 minus the
 * `mail.` prefix (`mail.pickle.welcome.subject`). `peaches.playlist` is the nearest row for the Side B note.
 * Personal mail is not here: the giver writes it in src/content/personal.ts.
 */
export const mail = {
  // Pickle's delivery notes
  'mail.pickle.welcome.subject': "Pickle's Deliveries: hello!",
  'mail.pickle.welcome.body':
    'Ribbit! New flat, new customer. Lovely.\nOrder from the catalogue and I hop it over.\nPay in Hearts. No flies accepted.\nPickle (and the box)',
  'mail.pickle.delivery.a.subject': 'Your first order!',
  'mail.pickle.delivery.a.body':
    'Delivered, signed for, slightly damp.\nThe box is free. The black cat has it now.\nRibbit. That one was a thank you.\nPickle',

  // Poe's trade receipts
  'mail.poe.receipt.a.subject': 'Receipt. Caw.',
  'mail.poe.receipt.a.body': 'One shiny thing received.\nOne nice thing given.\nNo refunds. Caw.\nPoe',

  // Notes "from" the cats
  'mail.george.decree.subject': 'A royal decree',
  'mail.george.decree.body':
    'By order of the King:\nthe pillow is ours on weekdays.\nWeekends are under review.\nGeorge, by the grace of George',
  'mail.salem.paw_note.subject': 'HAM',
  'mail.salem.paw_note.body': 'HAM\nham?\n(a pawprint, slightly smudged)\nSALEM',
  'mail.shadow.note.subject': 'Not a note',
  'mail.shadow.note.body': "This isn't a note. I don't write notes.\nThe floor under the bed is fine.\nDon't move the bed.\nS.",
  'mail.peaches.playlist.subject': 'Side B',
  'mail.peaches.playlist.body': "Flip the record when you get a sec.\nNo rush. Side B's the good one.\nPeaches",

  // Race entry confirmations
  'mail.race.confirm.subject': 'Race entry confirmed',
  'mail.race.confirm.body':
    "You're in for Saturday.\n8 runs, 8 stations, wall balls last.\nGeorge has agreed to judge. Nobody asked him.",
} as const satisfies Readonly<Record<string, string>>;
