/**
 * String table helpers. Text lives in src/content/strings/<domain>.ts as
 * `Record<string, string>` with dotted keys; these helpers merge and look up.
 */
import type { StringKey, StringLookup, StringTable, StringVars } from './types';

/** Fills {name}, {cat} and {n}. Unknown placeholders are left as written. */
export function formatString(template: string, vars?: StringVars): string {
  if (!vars) return template;
  return template.replace(/\{(name|cat|n)\}/g, (whole, k: 'name' | 'cat' | 'n') => {
    const v = vars[k];
    return v === undefined ? whole : String(v);
  });
}

/** Merges domain tables into one. Throws on a duplicate key, naming both. */
export function mergeStringTables(tables: readonly StringTable[]): StringTable {
  const out: Record<string, string> = {};
  for (const table of tables) {
    for (const [k, v] of Object.entries(table)) {
      if (Object.prototype.hasOwnProperty.call(out, k)) throw new Error(`duplicate string key: ${k}`);
      out[k] = v;
    }
  }
  return out;
}

export interface StringLookupOptions {
  /** Default value for {name} (from personal.ts). */
  readonly name?: string;
  /** Called once per missing key (dev logging, missing-strings report). */
  readonly onMissing?: (key: string) => void;
}

/** Builds a lookup. Missing keys render as `[key]` so they are visible but never crash. */
export function createStringLookup(table: StringTable, opts: StringLookupOptions = {}): StringLookup {
  const reported = new Set<string>();
  return (key: StringKey, vars?: StringVars) => {
    const raw = table[key];
    if (raw === undefined) {
      if (opts.onMissing && !reported.has(key)) {
        reported.add(key);
        opts.onMissing(key);
      }
      return `[${key}]`;
    }
    const merged: StringVars = opts.name !== undefined ? { name: opts.name, ...vars } : (vars ?? {});
    return formatString(raw, merged);
  };
}
