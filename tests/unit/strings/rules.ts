/**
 * Voice and length rules for player-facing strings (design/spec/voice.md).
 * Pure functions so the test can run them on the real tables and on bad samples.
 */

/** Typical values used to fill placeholders before measuring length. */
export const SAMPLE_VARS: Readonly<Record<string, string>> = { name: 'Ellie', cat: 'Peaches', n: '50' };

export function fill(text: string): string {
  return text.replace(/\{(name|cat|n)\}/g, (_w, k: string) => SAMPLE_VARS[k] ?? '');
}

/** Banned phrases and patterns, each with a reason shown on failure. */
export const BANNED: readonly { readonly re: RegExp; readonly why: string }[] = [
  // Punctuation
  { re: /[–—]/, why: 'em or en dash' },
  { re: /--/, why: 'double hyphen standing in for a dash' },
  { re: /…/, why: 'ellipsis character (use three full stops)' },
  { re: /[‘’“”]/, why: 'curly quote (straight quotes only)' },
  // AI-sounding stock phrases
  { re: /\bhonestly\?/i, why: '"Honestly?"' },
  { re: /\bhere'?s the thing\b/i, why: '"Here\'s the thing"' },
  { re: /\ba testament to\b/i, why: '"a testament to"' },
  { re: /\bnot (just|only) [^.!?]{1,40}\bbut\b/i, why: '"not just X but Y"' },
  { re: /\belevat(e|es|ed|ing)\b/i, why: '"elevate"' },
  { re: /\bseamless(ly)?\b/i, why: '"seamless"' },
  { re: /\bvibrant\b/i, why: '"vibrant"' },
  { re: /\btapestr(y|ies)\b/i, why: '"tapestry"' },
  { re: /\bjourney\b/i, why: '"journey" (only allowed when literal; reword)' },
  { re: /\bdelv(e|es|ing)\b/i, why: '"delve"' },
  { re: /\bembark/i, why: '"embark"' },
  { re: /\bunleash/i, why: '"unleash"' },
  { re: /\bnestled\b/i, why: '"nestled"' },
  // Motivational-poster endings
  { re: /you'?ve got this/i, why: 'motivational poster' },
  { re: /believe in yourself/i, why: 'motivational poster' },
  { re: /every step counts/i, why: 'motivational poster' },
  { re: /you deserve (it|this)/i, why: 'motivational poster' },
  // Romance (design/ELLIE.md, tone rule 2)
  { re: /\blove letter/i, why: 'romance' },
  { re: /\bi love you\b/i, why: 'romance' },
  { re: /\bmy love\b/i, why: 'romance' },
  { re: /\b(darling|sweetheart|valentine)/i, why: 'romance' },
  { re: /\bkiss/i, why: 'romance' },
  { re: /\bconfess/i, why: 'romance' },
  // IP (design/BRIEF.md section 20)
  { re: /\bsims\b|\bsimlish\b|\bplumbob/i, why: 'The Sims IP' },
  { re: /pok[eé]/i, why: 'Pokemon IP' },
  { re: /\bnintendo\b/i, why: 'Nintendo IP' },
  { re: /gotta catch|\bsul sul\b/i, why: 'IP catchphrase' },
  { re: /\bmoodlets?\b/i, why: 'internal term (say "mood boost")' },
  // The framed-print phrase lives only in personal.ts
  { re: /grazie per essere/i, why: 'framed-print phrase (personal.ts only)' },
  // American spellings
  { re: /\bcolor/i, why: 'American spelling (colour)' },
  { re: /\bfavorit/i, why: 'American spelling (favourite)' },
  { re: /\bcoz(y|ier|iest)\b/i, why: 'American spelling (cosy)' },
  { re: /\bcenter/i, why: 'American spelling (centre)' },
  { re: /\bgray\b/i, why: 'American spelling (grey)' },
  { re: /\bmom\b/i, why: 'American word (mum)' },
  { re: /\bcand(y|ies)\b/i, why: 'American word (sweets)' },
  { re: /\bcookies?\b/i, why: 'American word (biscuit)' },
  { re: /\brealiz/i, why: 'American spelling (realise)' },
  { re: /\bapartment/i, why: 'American word (flat)' },
  { re: /\bcatalogs?\b/i, why: 'American spelling (catalogue)' },
];

/** Returns the reasons a line breaks the banned list, or [] if it is clean. */
export function bannedHits(text: string): string[] {
  return BANNED.filter((b) => b.re.test(text)).map((b) => b.why);
}

/** ASCII plus the one allowed accent (é, as in café). */
export function badChars(text: string): string[] {
  return [...text].filter((ch) => ch !== '\n' && ch !== 'é' && (ch < ' ' || ch > '~'));
}

/** Placeholders other than {name}, {cat} and {n}. */
export function badPlaceholders(text: string): string[] {
  return [...text.matchAll(/\{([^}]*)\}/g)].map((m) => m[1] ?? '').filter((p) => !['name', 'cat', 'n'].includes(p));
}

export type LimitRule =
  | { readonly kind: 'chars'; readonly max: number; readonly what: string }
  | { readonly kind: 'lines'; readonly maxLines: number; readonly maxPerLine: number; readonly what: string };

/** The length limit for a key, from the table in design/spec/voice.md. */
export function limitFor(key: string): LimitRule {
  const parts = key.split('.');
  const [domain, second] = parts;
  const last = parts[parts.length - 1];
  if (domain === 'int') return { kind: 'chars', max: 22, what: 'interaction label' };
  if (domain === 'wish') {
    if (parts.length === 2 || last === 'title') return { kind: 'chars', max: 40, what: 'wish title' };
    return { kind: 'chars', max: 80, what: 'wish text' };
  }
  if (domain === 'asp') {
    if (last === 'desc') return { kind: 'chars', max: 80, what: 'aspiration blurb' };
    return { kind: 'chars', max: 40, what: 'aspiration title' };
  }
  if (domain === 'mail') {
    if (last === 'body') return { kind: 'lines', maxLines: 4, maxPerLine: 56, what: 'mail body' };
    return { kind: 'chars', max: 40, what: 'mail subject' };
  }
  if (domain === 'item') {
    if (last === 'name') return { kind: 'chars', max: 28, what: 'item name' };
    return { kind: 'chars', max: 80, what: 'item blurb' };
  }
  if (domain === 'cat' || domain === 'visitor' || domain === 'ellie') {
    return { kind: 'chars', max: 70, what: 'speech bubble' };
  }
  if (last !== undefined && (last.endsWith('Confirm') || last === 'tagline')) {
    return { kind: 'chars', max: 80, what: 'prompt or tagline' };
  }
  if (domain === 'onboard') {
    if (second === 'ui') return { kind: 'chars', max: 32, what: 'UI label' };
    return { kind: 'chars', max: 70, what: 'speech bubble' };
  }
  if (domain === 'ui') {
    if (second === 'toast' || second === 'hint') return { kind: 'chars', max: 80, what: 'toast or hint' };
    return { kind: 'chars', max: 32, what: 'UI label' };
  }
  return { kind: 'chars', max: 80, what: 'default text' };
}

/** Returns a description of the length problem, or null if the line fits. */
export function lengthProblem(key: string, text: string): string | null {
  const rule = limitFor(key);
  const filled = fill(text);
  if (rule.kind === 'chars') {
    if (filled.includes('\n')) return `${rule.what} must be one line`;
    return filled.length > rule.max ? `${rule.what} is ${filled.length} chars (max ${rule.max})` : null;
  }
  const lines = filled.split('\n');
  if (lines.length > rule.maxLines) return `${rule.what} has ${lines.length} lines (max ${rule.maxLines})`;
  const long = lines.find((l) => l.length > rule.maxPerLine);
  return long ? `${rule.what} line is ${long.length} chars (max ${rule.maxPerLine})` : null;
}

/** Dotted keys: a lower-case domain, then camelCase or snake_case segments. */
export const KEY_RE = /^[a-z][a-zA-Z]*(\.[a-zA-Z0-9_]+)+$/;

/** Real band names: allowed only as record sleeve text (BRIEF section 20). */
export const BAND_RE = /deftones|pierce the veil|suicide ?boys/i;

/** Keys allowed to carry a band name: the record sleeves. */
export function bandNameAllowed(key: string): boolean {
  return key.startsWith('record.sleeve.');
}
