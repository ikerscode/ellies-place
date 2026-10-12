#!/usr/bin/env node
/**
 * Banned-pattern lint (design/TECH.md quality gates). Fails when it finds:
 *  1. Math.random or Date.now in src/sim/ (and src/core/, except the clock module).
 *  2. http://, https:// or //cdn in src/ (W3C XML namespace URIs are allowed).
 *  3. Em or en dashes in src/content/strings/.
 *  4. Explicit `any` in type positions anywhere in src/ (stricter than "exported types").
 *     A non-exported line may opt out with a trailing comment: // ep-lint-allow-any
 *
 * Comments are ignored for rules 1, 2 and 4; string literals are ignored for rule 4.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC = 'src';
const CODE_EXT = /\.(?:ts|tsx|mts|js|mjs)$/;
const TEXT_EXT = /\.(?:ts|tsx|mts|js|mjs|css|html|json)$/;
const CLOCK_ALLOW = new Set([join('src', 'core', 'clock.ts')]);
const NS_ALLOW = /^https?:\/\/www\.w3\.org\//;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Replaces comments with spaces, keeping line structure. Optionally blanks string contents too. */
function strip(src, { strings }) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') { out += ' '; i++; }
    } else if (c === '/' && d === '*') {
      out += '  '; i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      if (i < n) { out += '  '; i += 2; }
    } else if (c === '"' || c === "'" || c === '`') {
      const q = c;
      out += c; i++;
      while (i < n && src[i] !== q) {
        if (src[i] === '\\' && i + 1 < n) { out += strings ? '  ' : src[i] + src[i + 1]; i += 2; continue; }
        if (q !== '`' && src[i] === '\n') break;
        out += strings && src[i] !== '\n' ? ' ' : src[i];
        i++;
      }
      if (i < n && src[i] === q) { out += q; i++; }
    } else {
      out += c; i++;
    }
  }
  return out;
}

const problems = [];
const report = (file, lineNo, rule, text) =>
  problems.push(`${file}:${lineNo}  [${rule}]  ${text.trim().slice(0, 120)}`);

const files = walk(SRC).filter((f) => TEXT_EXT.test(f));

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const rawLines = raw.split('\n');
  const isCode = CODE_EXT.test(file);
  const noComments = isCode ? strip(raw, { strings: false }).split('\n') : rawLines;
  const noStrings = isCode ? strip(raw, { strings: true }).split('\n') : rawLines;
  const inSim = file.startsWith(join(SRC, 'sim') + sep);
  const inCore = file.startsWith(join(SRC, 'core') + sep);
  const inStrings = file.startsWith(join(SRC, 'content', 'strings') + sep);

  rawLines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const code = noComments[idx] ?? '';
    const bare = noStrings[idx] ?? '';

    // 1. Non-determinism in simulation code.
    if ((inSim || (inCore && !CLOCK_ALLOW.has(file))) && /\bMath\s*\.\s*random\b|\bDate\s*\.\s*now\b/.test(code)) {
      report(file, lineNo, 'no-nondeterminism', rawLine);
    }

    // 2. External URLs.
    for (const m of code.matchAll(/https?:\/\/[^\s"'`)]*|\/\/cdn\b/gi)) {
      if (!NS_ALLOW.test(m[0])) report(file, lineNo, 'no-external-url', rawLine);
    }

    // 3. Dashes in player-facing strings.
    if (inStrings && /[–—]/.test(rawLine)) {
      report(file, lineNo, 'no-em-en-dash', rawLine);
    }

    // 4. Explicit any.
    if (isCode && /\.(?:ts|tsx|mts)$/.test(file)) {
      const anyType =
        /(?::|\bas|<|,|\||&|=>|\bkeyof|\breadonly)\s*any\b(?!\s*[:=(])|\bany\s*(?:\[\]|[>|&,;)])/;
      if (anyType.test(bare)) {
        const allowed = /\/\/\s*ep-lint-allow-any\b/.test(rawLine) && !/^\s*export\b/.test(rawLine);
        if (!allowed) report(file, lineNo, 'no-explicit-any', rawLine);
      }
    }
  });
}

if (problems.length > 0) {
  console.error(`lint: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`lint: OK (${files.length} files checked)`);
