import { describe, expect, it } from 'vitest';
import { FRAMED_PRINT_TEXT, PERSONAL } from '../../../src/content/personal';
import { STRING_DOMAINS, STRINGS } from '../../../src/content/strings';
import { KEY_RE, badChars, badPlaceholders, bannedHits, lengthProblem } from './rules';

const entries = Object.entries(STRINGS);

/** Collects `key: problem` lines so one failure lists every offender. */
function problems(check: (key: string, text: string) => string | null): string[] {
  const out: string[] = [];
  for (const [k, v] of entries) {
    const p = check(k, v);
    if (p) out.push(`${k}: ${p}  <${v}>`);
  }
  return out;
}

describe('rules helpers', () => {
  it('catches banned patterns', () => {
    expect(bannedHits('Salem is in the box.')).toEqual([]);
    expect(bannedHits('A nap — then ham')).toContain('em or en dash');
    expect(bannedHits('Pages 1–2')).toContain('em or en dash');
    expect(bannedHits('Wait -- what')).toHaveLength(1);
    expect(bannedHits('Honestly? Fine.')).toHaveLength(1);
    expect(bannedHits("It's not just a sofa, it's a throne but better")).toHaveLength(1);
    expect(bannedHits('A vibrant, seamless room')).toHaveLength(2);
    expect(bannedHits('My favorite color')).toHaveLength(2);
    expect(bannedHits('Like in The Sims')).toHaveLength(1);
    expect(bannedHits('A wild Pokemon')).toHaveLength(1);
    expect(bannedHits('A love letter for you')).toHaveLength(1);
    expect(bannedHits("You've got this!")).toHaveLength(1);
    expect(bannedHits('Grazie per essere te stessa')).toHaveLength(1);
  });

  it('catches over-length lines per key prefix', () => {
    expect(lengthProblem('int.pet', 'Pet')).toBeNull();
    expect(lengthProblem('int.pet', 'Give the cat a long pet')).toMatch(/max 22/);
    expect(lengthProblem('cat.salem.box.01', 'x'.repeat(70))).toBeNull();
    expect(lengthProblem('cat.salem.box.01', 'x'.repeat(71))).toMatch(/max 70/);
    expect(lengthProblem('wish.bowToGeorge', 'x'.repeat(41))).toMatch(/max 40/);
    expect(lengthProblem('ui.toast.saved', 'x'.repeat(81))).toMatch(/max 80/);
    expect(lengthProblem('ui.hud.day', 'x'.repeat(33))).toMatch(/max 32/);
    expect(lengthProblem('mail.pickle.body', 'a\nb\nc\nd\ne')).toMatch(/5 lines/);
    expect(lengthProblem('mail.pickle.body', 'a\n' + 'x'.repeat(57))).toMatch(/max 56/);
    // {name} is measured as "Ellie", {cat} as "Peaches", {n} as "50".
    expect(lengthProblem('int.x', '{cat} {cat} {n}')).toBeNull();
    expect(lengthProblem('int.x', '{cat} {cat} {cat}')).toMatch(/23 chars/);
  });

  it('catches odd characters and placeholders', () => {
    expect(badChars('Café, plain')).toEqual([]);
    expect(badChars('’')).toHaveLength(1);
    expect(badPlaceholders('{name} {cat} {n}')).toEqual([]);
    expect(badPlaceholders('{player}')).toEqual(['player']);
  });
});

describe('string tables', () => {
  it('merge without duplicate keys and are not empty', () => {
    const total = Object.values(STRING_DOMAINS).reduce((s, t) => s + Object.keys(t).length, 0);
    expect(entries.length).toBe(total);
    expect(entries.length).toBeGreaterThan(200);
  });

  it('use stable dotted keys', () => {
    expect(entries.map(([k]) => k).filter((k) => !KEY_RE.test(k))).toEqual([]);
  });

  it('have no empty or padded strings', () => {
    expect(problems((_k, v) => (v.trim() === '' || v !== v.trim() ? 'empty or padded' : null))).toEqual([]);
  });

  it('contain no banned phrases, dashes or American spellings', () => {
    expect(problems((_k, v) => bannedHits(v).join(', ') || null)).toEqual([]);
  });

  it('use only ASCII (plus é) and the three placeholders', () => {
    expect(problems((_k, v) => badChars(v).join('') || null)).toEqual([]);
    expect(problems((_k, v) => badPlaceholders(v).join(', ') || null)).toEqual([]);
  });

  it('fit the length limits in design/spec/voice.md', () => {
    expect(problems(lengthProblem)).toEqual([]);
  });

  it('number variants 01, 02, ... with no gaps', () => {
    const groups = new Map<string, number[]>();
    for (const [k] of entries) {
      const m = /^(.*)\.(\d+)$/.exec(k);
      if (!m || m[2]?.length !== 2) continue;
      const list = groups.get(m[1] ?? '') ?? [];
      list.push(Number(m[2]));
      groups.set(m[1] ?? '', list);
    }
    const gaps = [...groups].filter(([, ns]) => ns.sort((a, b) => a - b).some((n, i) => n !== i + 1)).map(([g]) => g);
    expect(gaps).toEqual([]);
  });
});

describe('voices', () => {
  const lines = (prefix: string) => entries.filter(([k]) => k.startsWith(prefix));

  it('has at least 60 cat lines across all four cats, plus visitor lines', () => {
    const catLines = lines('cat.');
    expect(catLines.length).toBeGreaterThanOrEqual(60);
    for (const cat of ['george', 'salem', 'shadow', 'peaches']) {
      expect(lines(`cat.${cat}.`).length, cat).toBeGreaterThanOrEqual(15);
    }
    for (const v of ['bruce', 'poe', 'pickle']) {
      expect(lines(`visitor.${v}.`).length, v).toBeGreaterThanOrEqual(5);
    }
  });

  it('keeps George on the royal "we"', () => {
    const bad = [...lines('cat.george.'), ...lines('onboard.george.')].filter(([, v]) => /\b(I|I'm|I'll|me|my|mine)\b/.test(v));
    expect(bad.filter(([, v]) => !/It was mine/.test(v))).toEqual([]);
  });

  it('never lets Shadow get excited', () => {
    expect([...lines('cat.shadow.'), ...lines('onboard.shadow.')].filter(([, v]) => v.includes('!'))).toEqual([]);
  });

  it('ends every Poe line with "Caw."', () => {
    expect(lines('visitor.poe.').filter(([, v]) => !v.endsWith('Caw.'))).toEqual([]);
  });

  it('keeps Pickle to two ribbits a line', () => {
    expect(lines('visitor.pickle.').filter(([, v]) => (v.match(/ribbit/gi) ?? []).length > 2)).toEqual([]);
  });
});

describe('personal.ts', () => {
  it('ships an empty mail slot and the framed print on', () => {
    expect(PERSONAL.mail).toEqual([]);
    expect(PERSONAL.framedPrint).toBe(true);
    expect(PERSONAL.playerName).toBe('Ellie');
  });

  it('keeps the framed-print phrase out of the string tables', () => {
    expect(FRAMED_PRINT_TEXT).toBe('Grazie per essere te stessa');
    expect(entries.filter(([, v]) => v.includes(FRAMED_PRINT_TEXT))).toEqual([]);
  });
});
