#!/usr/bin/env node
/**
 * Build gate (run after `vite build`). Fails unless:
 *  - dist/ holds exactly one file, ellies-place.html
 *  - it has no http://, https:// or protocol-relative // URLs in src/href attributes or CSS url()
 *  - it loads no external script/stylesheet files at all (everything inline)
 *  - it is under 3 MB
 *  - both font families (Pixelify Sans, IM Fell English) are inlined as base64 WOFF2
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const FILE = 'ellies-place.html';
const MAX_BYTES = 3 * 1024 * 1024;
const FAMILIES = ['Pixelify Sans', 'IM Fell English'];

const errors = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(relative(DIST, p));
  }
  return out;
}

let files = [];
try {
  files = walk(DIST);
} catch {
  console.error(`check-dist: ${DIST}/ does not exist. Run vite build first.`);
  process.exit(1);
}

if (files.length !== 1 || files[0] !== FILE) {
  errors.push(`dist/ must hold exactly one file (${FILE}); found: ${files.join(', ') || '(none)'}`);
}

const path = join(DIST, FILE);
let html = '';
try {
  html = readFileSync(path, 'utf8');
} catch {
  errors.push(`${path} is missing`);
}

if (html) {
  const bytes = Buffer.byteLength(html, 'utf8');
  if (bytes >= MAX_BYTES) {
    errors.push(`${FILE} is ${(bytes / 1048576).toFixed(2)} MB; the limit is 3 MB`);
  }

  const lineOf = (index) => html.slice(0, index).split('\n').length;
  const snippet = (index) => html.slice(index, index + 80).replace(/\s+/g, ' ');

  const patterns = [
    { name: 'external src/href attribute', re: /\b(?:src|href|srcset|poster|action)\s*=\s*["']?\s*(?:https?:)?\/\//gi },
    { name: 'external CSS url()', re: /url\(\s*["']?\s*(?:https?:)?\/\//gi },
    { name: 'external CSS @import', re: /@import\s+(?:url\()?\s*["']?\s*(?:https?:)?\/\//gi },
    { name: 'external <script src>', re: /<script\b[^>]*\bsrc\s*=/gi },
    { name: 'external <link href> (non-data)', re: /<link\b[^>]*\bhref\s*=\s*["']?(?!data:)/gi },
  ];
  for (const { name, re } of patterns) {
    for (const m of html.matchAll(re)) {
      errors.push(`${name} at line ${lineOf(m.index)}: ${snippet(m.index)}`);
    }
  }

  // Fonts: each family needs an @font-face whose src is an inline base64 WOFF2.
  const faces = [...html.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1] ?? '');
  for (const family of FAMILIES) {
    const ok = faces.some((body) => {
      const fam = /font-family\s*:\s*["']?([^;"'}]+)/i.exec(body)?.[1]?.trim();
      return fam === family && /url\(\s*["']?data:font\/woff2;base64,/i.test(body);
    });
    if (!ok) errors.push(`font family "${family}" is not inlined as base64 WOFF2`);
  }

  // Informational: any other absolute URL strings (e.g. XML namespaces) are listed, not failed.
  const others = new Set([...html.matchAll(/https?:\/\/[^\s"'`)<>]+/g)].map((m) => m[0]));
  if (others.size > 0) {
    console.log(`check-dist: note, non-loading URL strings present: ${[...others].slice(0, 10).join(', ')}`);
  }

  if (errors.length === 0) {
    console.log(`check-dist: OK  ${FILE}  ${(bytes / 1024).toFixed(1)} KB, fonts inlined: ${FAMILIES.join(', ')}`);
  }
}

if (errors.length > 0) {
  console.error('check-dist: FAILED');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
