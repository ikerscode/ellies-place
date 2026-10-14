/**
 * Mail (play.md 11): 31 rows, 11 MVP, plus the schedule rules and the personal-mail wiring.
 * Ids drop the `mail.` prefix (`pickle.welcome`; FROZEN 22), keys are `mail.<id>.subject` / `.body`.
 *
 * "Morning after X" rows use ever-counters and are sent once. Rows that repeat (delivery notes, receipts, new
 * stock, the Friday confirmation, race results) are `repeatable`; where the trigger is an event that happened
 * yesterday they read the pending counter `mailTrigger.<mailId>`, which the sim raises at the event and the
 * mail system lowers by one on send (contract request), so a "today" counter never misses a letter.
 */
import { STAT } from '../../../core/stats';
import { mailBodyKey, mailSubjectKey } from '../../../core/keys';
import { asMailId, asOutfitId, type Condition, type Effect, type MailDef, type MailSender, type PersonalConfig, type PersonalMail } from '../../../core/types';
import { all, any, bond, dayAtLeast, dayIs, didEver, flag, grant, item, not, progress, statEver, stat } from './helpers';
import { HOUSEWARMING_UNLOCK_IF } from './housewarming';
import { PICKLE_STOCK_DAYS_FULL } from './stock';

const Y = true;
const F = false;

const pending = (id: string): Condition => stat(`mailTrigger.${id}`, 1, 'ever');
const stipend = (amount: number): Effect => ({ kind: 'hearts', amount, reason: 'mail' });

interface Row {
  readonly id: string;
  readonly from: MailSender;
  readonly sendIf: Condition;
  readonly mvp: boolean;
  readonly attach?: readonly Effect[];
  readonly repeatable?: true;
}

const ROWS: readonly Row[] = [
  { id: 'pickle.welcome', from: 'pickle', sendIf: { kind: 'onboardingDone' }, mvp: Y },
  { id: 'pickle.delivery.a', from: 'pickle', sendIf: pending('pickle.delivery.a'), mvp: Y, repeatable: true },
  { id: 'pickle.delivery.b', from: 'pickle', sendIf: pending('pickle.delivery.b'), mvp: F, repeatable: true },
  { id: 'pickle.delivery.c', from: 'pickle', sendIf: pending('pickle.delivery.c'), mvp: F, repeatable: true },
  { id: 'pickle.delivery.d', from: 'pickle', sendIf: pending('pickle.delivery.d'), mvp: F, repeatable: true },
  { id: 'pickle.delivery.e', from: 'pickle', sendIf: pending('pickle.delivery.e'), mvp: F, repeatable: true },
  { id: 'pickle.delivery.f', from: 'pickle', sendIf: pending('pickle.delivery.f'), mvp: F, repeatable: true },
  // The item itself unlocks by its own `day:N` code; the letter only announces it.
  { id: 'pickle.new_stock', from: 'pickle', sendIf: any(...PICKLE_STOCK_DAYS_FULL.map(dayIs)), mvp: Y, repeatable: true },
  { id: 'pickle.salem_box', from: 'pickle', sendIf: statEver(STAT.salemBoxSits, 10), mvp: F },
  {
    id: 'pickle.housewarming_rsvp',
    from: 'pickle',
    sendIf: all(HOUSEWARMING_UNLOCK_IF, not(flag('housewarming.held'))),
    mvp: Y,
    attach: [{ kind: 'when', if: not({ kind: 'owns', item: item('garden_lantern') }), then: [grant('garden_lantern')] }],
  },
  { id: 'pickle.month', from: 'pickle', sendIf: dayAtLeast(30), mvp: F, attach: [stipend(30)] },
  { id: 'poe.receipt.a', from: 'poe', sendIf: pending('poe.receipt.a'), mvp: Y, repeatable: true },
  { id: 'poe.receipt.b', from: 'poe', sendIf: pending('poe.receipt.b'), mvp: F, repeatable: true },
  { id: 'poe.receipt.c', from: 'poe', sendIf: pending('poe.receipt.c'), mvp: F, repeatable: true },
  { id: 'poe.wanted', from: 'poe', sendIf: progress('trade', undefined, 5, 'ever'), mvp: F },
  { id: 'george.decree', from: 'george', sendIf: dayAtLeast(2), mvp: Y, attach: [stipend(10)] },
  {
    id: 'george.knighthood',
    from: 'george',
    sendIf: flag('george.knighted'),
    mvp: F,
    attach: [{ kind: 'unlock', what: { kind: 'outfit', id: asOutfitId('out.knight_sash') } }],
  },
  { id: 'george.fish_petition', from: 'george', sendIf: statEver(STAT.fishDenied, 5), mvp: F },
  { id: 'salem.paw_note', from: 'salem', sendIf: didEver('fridge.give_ham'), mvp: Y },
  { id: 'salem.box_review', from: 'salem', sendIf: statEver(STAT.salemBoxSits, 25), mvp: F },
  { id: 'shadow.note', from: 'shadow', sendIf: bond('shadow', 2), mvp: F },
  { id: 'shadow.lap', from: 'shadow', sendIf: statEver(STAT.shadowLapMinutes, 1), mvp: F },
  { id: 'peaches.playlist', from: 'peaches', sendIf: statEver(STAT.recordMinutes, 180), mvp: F },
  { id: 'peaches.sunbeams', from: 'peaches', sendIf: statEver('peaches.sunbeamCount', 10), mvp: F },
  { id: 'race.confirm', from: 'race', sendIf: { kind: 'weekday', days: ['fri'] }, mvp: Y, repeatable: true },
  { id: 'race.results', from: 'race', sendIf: pending('race.results'), mvp: Y, repeatable: true },
  { id: 'race.medal', from: 'race', sendIf: pending('race.medal'), mvp: F, repeatable: true },
  { id: 'bruce.not_here', from: 'bruce', sendIf: progress('bruceSpotted', undefined, 1, 'ever'), mvp: Y },
  { id: 'bruce.wall', from: 'bruce', sendIf: flag('bruce.onWall'), mvp: F },
  { id: 'critter.flyer', from: 'pickle', sendIf: dayAtLeast(4), mvp: F },
  // "All the guests" has no MailSender of its own: Pickle posts it.
  { id: 'housewarming.thanks', from: 'pickle', sendIf: flag('housewarming.held'), mvp: Y, attach: [grant('frame_polaroids')] },
];

export const mail: readonly MailDef[] = ROWS.map(
  (r): MailDef => ({
    id: asMailId(r.id),
    from: r.from,
    subject: mailSubjectKey(r.id),
    body: mailBodyKey(r.id),
    sendIf: r.sendIf,
    ...(r.attach ? { attachments: r.attach } : {}),
    ...(r.repeatable ? { repeatable: true } : {}),
    mvp: r.mvp,
  }),
);

/** Delivery schedule (play.md 11.1). The sim reads these; no number lives in code. */
export const MAIL_RULES = {
  /** Letters arrive at 08:00. A trigger that fires later waits for the next morning. */
  deliverAtMinute: 8 * 60,
  /** At most this many queued letters a morning; personal letters have no cap. */
  perMorning: 2,
  unreadCap: 30,
  archiveCap: 400,
  /** Priority order, first to last; ties go to the oldest trigger. */
  priority: ['personal', 'race', 'housewarming', 'event', 'cat', 'pickle'] as const,
  /** Which priority class a MailDef falls in. */
  classOf(id: string, from: MailSender): (typeof MAIL_RULES.priority)[number] {
    if (from === 'personal') return 'personal';
    if (from === 'race') return 'race';
    if (id.startsWith('housewarming.') || id === 'pickle.housewarming_rsvp') return 'housewarming';
    if (from === 'pickle') return id.startsWith('pickle.') ? 'pickle' : 'event';
    if (from === 'poe' || from === 'bruce') return 'event';
    return 'cat';
  },
} as const;

/** Pickle's delivery-note variants: `order count mod 6` picks a..f; Poe's receipts `trade count mod 3`. */
export const DELIVERY_VARIANTS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
export const RECEIPT_VARIANTS = ['a', 'b', 'c'] as const;

// ---- Personal mail (src/content/personal.ts, FROZEN 28) ---------------------------------

/**
 * Letters whose real calendar date has come and that she has not been sent, oldest first (ties by id, so
 * the order never depends on how the giver listed them). `today` is the player's local 'YYYY-MM-DD'
 * (`localDate(clock.wallNow())`); `sent` is `SimState`'s `personalSent` ids. No cap: they all deliver.
 * Ids that appear twice deliver once. Text is literal, never a string key.
 */
export function duePersonalMail(config: Pick<PersonalConfig, 'mail'>, today: string, sent: readonly string[]): PersonalMail[] {
  const done = new Set(sent);
  const seen = new Set<string>();
  const due: PersonalMail[] = [];
  for (const m of config.mail) {
    if (m.date > today || done.has(m.id) || seen.has(m.id)) continue;
    seen.add(m.id);
    due.push(m);
  }
  return due.sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.date < b.date ? -1 : 1));
}

/** Problems with the giver's letters (empty is fine): id and date shape, duplicates, body length (4 lines). */
export function personalMailProblems(config: Pick<PersonalConfig, 'mail'>): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const m of config.mail) {
    if (!/^[a-z0-9_-]+$/i.test(m.id)) out.push(`personal mail "${m.id}": id must be letters, digits, _ or -`);
    if (ids.has(m.id)) out.push(`personal mail "${m.id}": duplicate id`);
    ids.add(m.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) out.push(`personal mail "${m.id}": date must be YYYY-MM-DD`);
    if (m.body.split('\n').length > 4) out.push(`personal mail "${m.id}": more than 4 lines`);
  }
  return out;
}

