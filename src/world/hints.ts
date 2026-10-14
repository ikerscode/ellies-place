/**
 * Turns a CosyReport's hints into player text. The hint vars carry ids (a set id, a need key, an item
 * category) because StringVars only holds `name`, `cat` and `n`; this resolves each to its own string first.
 * Every string it reads lives in src/content/strings.
 */
import { asStringKey, categoryKey, type ContentIndex, type CosyHint, type CosyReport, type StringLookup, type StringVars } from '../core';

export interface CosyExplanation {
  readonly key: string;
  readonly text: string;
  /** Estimated score gain if followed. */
  readonly gain: number;
}

/** Resolves the ids inside one hint's vars, then the hint itself. */
export function explainHint(hint: CosyHint, t: StringLookup, content: ContentIndex): CosyExplanation {
  const v = hint.vars;
  const k = String(hint.key);
  let vars: StringVars | undefined = v;
  if (v) {
    if (k.endsWith('set_near')) {
      vars = { name: t(asStringKey(`set.${String(v.name)}.name`)), n: t(asStringKey(String(v.n))) };
    } else if (k.endsWith('set_idea')) {
      vars = { name: t(asStringKey(`set.${String(v.name)}.name`)) };
    } else if (k.includes('.variety.')) {
      vars = { n: t(categoryKey(String(v.n) as Parameters<typeof categoryKey>[0])) };
    } else if (v.cat !== undefined) {
      const def = content.cats.get(v.cat as Parameters<typeof content.cats.get>[0]);
      vars = { cat: def ? t(def.displayName) : v.cat };
    }
  }
  return { key: k, text: t(hint.key, vars), gain: hint.gain };
}

/** The (up to) two hints of a report as text, best first. "Add a lamp for the evenings." */
export function explainCosy(report: CosyReport, t: StringLookup, content: ContentIndex): readonly CosyExplanation[] {
  return report.hints.slice(0, 2).map((h) => explainHint(h, t, content));
}
